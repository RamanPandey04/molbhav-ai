import { authenticated } from '@/lib/api/auth';
import { fail, ok } from '@/lib/shared/api';
import { demandInput, validFutureExpiry } from '@/lib/shared/validation';
import { sameInstant } from '@/lib/shared/time';

export async function POST(request: Request) {
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'BUYER') return fail('FORBIDDEN','Buyer role required',403);
  const key = request.headers.get('Idempotency-Key');
  if (!key || key.length < 8 || key.length > 128) return fail('INVALID_IDEMPOTENCY_KEY','Idempotency-Key must be 8-128 characters',400);
  let body: unknown;
  try { body = await request.json(); } catch { return fail('INVALID_JSON','Invalid JSON body',400); }
  const parsed = demandInput.safeParse(body);
  if (!parsed.success) return fail('INVALID_INPUT','Invalid demand',400,parsed.error.flatten());
  if (!validFutureExpiry(parsed.data.expiresAt)) return fail('INVALID_EXPIRY','Expiry must be within 30 days',400);
  if (Date.parse(parsed.data.deliveryDeadline) <= Date.now()) return fail('INVALID_DELIVERY_DEADLINE','Delivery deadline must be in the future',400);
  const { data, error } = await auth.db!.from('buyer_demands').insert({
    buyer_id: auth.user!.id, merchant_id: parsed.data.merchantId, product_id: parsed.data.productId,
    quantity: parsed.data.quantity, allocated_existing_stock: 0,
    expires_at: parsed.data.expiresAt, idempotency_key: key,
    max_unit_price_paise: parsed.data.maxUnitPricePaise, delivery_deadline: parsed.data.deliveryDeadline,
    fulfillment_terms: parsed.data.fulfillmentTerms,
  }).select('id,buyer_id,merchant_id,product_id,quantity,allocated_existing_stock,max_unit_price_paise,delivery_deadline,fulfillment_terms,status,expires_at,created_at').single();
  if (error?.code === '23505') {
    const previous = await auth.db!.from('buyer_demands').select('id,buyer_id,merchant_id,product_id,quantity,allocated_existing_stock,max_unit_price_paise,delivery_deadline,fulfillment_terms,status,expires_at,created_at').eq('buyer_id',auth.user!.id).eq('idempotency_key',key).single();
    if (previous.error || !previous.data) return fail('DB_ERROR','Could not resolve idempotent request',500);
    const p = previous.data;
    if (p.merchant_id !== parsed.data.merchantId || p.product_id !== parsed.data.productId || p.quantity !== parsed.data.quantity || !sameInstant(p.expires_at,parsed.data.expiresAt) || p.max_unit_price_paise !== parsed.data.maxUnitPricePaise || !sameInstant(p.delivery_deadline,parsed.data.deliveryDeadline) || p.fulfillment_terms !== parsed.data.fulfillmentTerms)
      return fail('IDEMPOTENCY_CONFLICT','Key was used with a different demand',409);
    return ok(p);
  }
  if (error) return fail(error.code === '23503' ? 'INVALID_REFERENCE' : 'DB_ERROR','Could not create demand',error.code === '23503' ? 400 : 500);
  return ok(data,201);
}
