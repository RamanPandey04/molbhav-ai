import { authenticated } from '@/lib/api/auth';
import { fail, ok } from '@/lib/shared/api';
import { restockInput, uuid, validFutureExpiry } from '@/lib/shared/validation';
import { sameInstant } from '@/lib/shared/time';

async function ownsMerchant(db: NonNullable<Awaited<ReturnType<typeof authenticated>>['db']>, userId: string, merchantId: string) {
  const { data, error } = await db.from('merchants').select('id').eq('id',merchantId).eq('owner_id',userId).eq('active',true).maybeSingle();
  return !error && !!data;
}

export async function GET(request: Request) {
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'MERCHANT') return fail('FORBIDDEN','Merchant role required',403);
  const merchantId = new URL(request.url).searchParams.get('merchantId');
  if (!merchantId || !uuid.safeParse(merchantId).success) return fail('INVALID_ID','Valid merchantId is required',400);
  if (!await ownsMerchant(auth.db!,auth.user!.id,merchantId)) return fail('FORBIDDEN','Merchant access denied',403);
  const { data, error } = await auth.db!.from('merchant_restock_requests').select('id,merchant_id,product_id,quantity,needed_by,status,expires_at,created_at').eq('merchant_id',merchantId).order('created_at',{ ascending: false });
  if (error) return fail('DB_ERROR','Could not load restock requests',500);
  return ok(data!.map(r => ({ ...r, effectiveStatus: r.status === 'ACTIVE' && Date.parse(r.expires_at) <= Date.now() ? 'EXPIRED' : r.status })));
}

export async function POST(request: Request) {
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'MERCHANT') return fail('FORBIDDEN','Merchant role required',403);
  const key = request.headers.get('Idempotency-Key');
  if (!key || key.length < 8 || key.length > 128) return fail('INVALID_IDEMPOTENCY_KEY','Idempotency-Key must be 8-128 characters',400);
  let body: unknown;
  try { body = await request.json(); } catch { return fail('INVALID_JSON','Invalid JSON body',400); }
  const parsed = restockInput.safeParse(body);
  if (!parsed.success) return fail('INVALID_INPUT','Invalid restock request',400,parsed.error.flatten());
  if (!validFutureExpiry(parsed.data.expiresAt)) return fail('INVALID_EXPIRY','Expiry must be within 30 days',400);
  if (Date.parse(parsed.data.neededBy) <= Date.now()) return fail('INVALID_DELIVERY_DEADLINE','Needed-by date must be in the future',400);
  if (!await ownsMerchant(auth.db!,auth.user!.id,parsed.data.merchantId)) return fail('FORBIDDEN','Merchant access denied',403);
  const { data, error } = await auth.db!.from('merchant_restock_requests').insert({ merchant_id: parsed.data.merchantId, product_id: parsed.data.productId, quantity: parsed.data.quantity, expires_at: parsed.data.expiresAt, needed_by: parsed.data.neededBy, idempotency_key: key }).select('id,merchant_id,product_id,quantity,needed_by,status,expires_at,created_at').single();
  if (error?.code === '23505') {
    const previous = await auth.db!.from('merchant_restock_requests').select('id,merchant_id,product_id,quantity,needed_by,status,expires_at,created_at').eq('merchant_id',parsed.data.merchantId).eq('idempotency_key',key).single();
    if (previous.error || !previous.data) return fail('DB_ERROR','Could not resolve idempotent request',500);
    const p = previous.data;
    if (p.product_id !== parsed.data.productId || p.quantity !== parsed.data.quantity || !sameInstant(p.expires_at,parsed.data.expiresAt) || !sameInstant(p.needed_by,parsed.data.neededBy)) return fail('IDEMPOTENCY_CONFLICT','Key was used with a different restock request',409);
    return ok(p);
  }
  if (error) return fail(error.code === '23503' ? 'INVALID_REFERENCE' : 'DB_ERROR','Could not create restock request',error.code === '23503' ? 400 : 500);
  return ok(data,201);
}
