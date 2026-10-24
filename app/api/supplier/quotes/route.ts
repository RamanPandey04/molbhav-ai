import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { fail, ok } from '@/lib/shared/api';
import { quoteInput, validFutureExpiry } from '@/lib/shared/validation';

const fields = 'id,pool_id,supplier_id,exact_sku_id,min_order_quantity,max_available_quantity,quoted_unit_price_paise,freight_paise,handling_paise,delivery_deadline,expires_at,quoted_by,status,version,created_at';
export async function GET() {
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'SUPPLIER') return fail('FORBIDDEN','Supplier role required',403);
  const suppliers = await auth.db!.from('suppliers').select('id').eq('owner_id',auth.user!.id);
  if (suppliers.error) return databaseFailure(suppliers.error,'Could not load suppliers');
  const ids = (suppliers.data ?? []).map(s => s.id);
  if (!ids.length) return ok([]);
  const { data, error } = await auth.db!.from('supplier_quotes').select(fields).in('supplier_id',ids).order('created_at',{ ascending:false });
  if (error) return databaseFailure(error,'Could not load quotes');
  return ok(data);
}

export async function POST(request: Request) {
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'SUPPLIER') return fail('FORBIDDEN','Supplier role required',403);
  const key = request.headers.get('Idempotency-Key');
  if (!key || key.length < 8 || key.length > 128) return fail('INVALID_IDEMPOTENCY_KEY','Idempotency-Key must be 8-128 characters',400);
  let body: unknown; try { body = await request.json(); } catch { return fail('INVALID_JSON','Invalid JSON body',400); }
  const parsed = quoteInput.safeParse(body);
  if (!parsed.success) return fail('INVALID_INPUT','Invalid quote',400,parsed.error.flatten());
  const v = parsed.data;
  if (!validFutureExpiry(v.expiresAt) || Date.parse(v.deliveryDeadline) <= Date.now()) return fail('INVALID_EXPIRY','Quote expiry and delivery deadline must be in the future',400);
  const supplier = await auth.db!.from('suppliers').select('id').eq('id',v.supplierId).eq('owner_id',auth.user!.id).eq('active',true).maybeSingle();
  if (supplier.error || !supplier.data) return fail('FORBIDDEN','Supplier access denied',403);
  const pool = await auth.db!.from('pools').select('id,product_id,status').eq('id',v.poolId).maybeSingle();
  if (pool.error || !pool.data || pool.data.product_id !== v.exactSkuId || pool.data.status !== 'OPEN') return fail('INVALID_POOL','Pool and SKU must match an open pool',400);
  const insert = { pool_id:v.poolId,supplier_id:v.supplierId,exact_sku_id:v.exactSkuId,min_order_quantity:v.minOrderQuantity,max_available_quantity:v.maxAvailableQuantity,quoted_unit_price_paise:v.quotedUnitPricePaise,freight_paise:v.freightPaise,handling_paise:v.handlingPaise,delivery_deadline:v.deliveryDeadline,expires_at:v.expiresAt,quoted_by:auth.user!.id,idempotency_key:key };
  const { data, error } = await auth.db!.from('supplier_quotes').insert(insert).select(fields).single();
  if (error?.code === '23505') {
    const previous = await auth.db!.from('supplier_quotes').select(fields).eq('supplier_id',v.supplierId).eq('idempotency_key',key).single();
    if (previous.error || !previous.data) return databaseFailure(previous.error ?? error);
    const q = previous.data;
    if (q.pool_id !== v.poolId || q.exact_sku_id !== v.exactSkuId || q.min_order_quantity !== v.minOrderQuantity || q.max_available_quantity !== v.maxAvailableQuantity || q.quoted_unit_price_paise !== v.quotedUnitPricePaise || q.freight_paise !== v.freightPaise || q.handling_paise !== v.handlingPaise || q.delivery_deadline !== v.deliveryDeadline || q.expires_at !== v.expiresAt) return fail('IDEMPOTENCY_CONFLICT','Key was used with different quote terms',409);
    return ok(q);
  }
  if (error) return databaseFailure(error,'Could not submit quote');
  return ok(data,201);
}
