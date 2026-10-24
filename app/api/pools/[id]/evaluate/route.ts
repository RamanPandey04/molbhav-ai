import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { evaluatePricing } from '@/lib/domain/pricing';
import { fail, ok } from '@/lib/shared/api';
import { uuid } from '@/lib/shared/validation';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail('INVALID_ID','Invalid pool ID',400);
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'ADMIN') return fail('FORBIDDEN','Admin role required',403);
  const key = request.headers.get('Idempotency-Key');
  if (!key || key.length < 8 || key.length > 128) return fail('INVALID_IDEMPOTENCY_KEY','Idempotency-Key must be 8-128 characters',400);
  const db = auth.db!;
  const previous = await db.from('pool_evaluations').select('*').eq('created_by',auth.user!.id).eq('idempotency_key',key).maybeSingle();
  if (previous.error) return databaseFailure(previous.error);
  if (previous.data) return previous.data.pool_id === id ? ok(previous.data) : fail('IDEMPOTENCY_CONFLICT','Key belongs to another pool',409);
  const expired = await db.rpc('expire_quotes');
  if (expired.error) return databaseFailure(expired.error,'Could not expire quotes');
  const poolResult = await db.rpc('get_live_pool',{ p_id:id });
  if (poolResult.error) return databaseFailure(poolResult.error,'Could not refresh pool');
  const pool = poolResult.data?.[0];
  if (!pool) return fail('NOT_FOUND','Pool not found',404);
  if (pool.status !== 'OPEN') return fail('POOL_CLOSED','Pool is closed',409);
  const [merchants, demands, restocks, terms, quotes] = await Promise.all([
    db.from('merchants').select('id,owner_id,active').eq('zone_id',pool.zone_id),
    db.from('buyer_demands').select('id,buyer_id,merchant_id,quantity,allocated_existing_stock,max_unit_price_paise,delivery_deadline,fulfillment_terms,status,expires_at').eq('product_id',pool.product_id),
    db.from('merchant_restock_requests').select('id,merchant_id,quantity,needed_by,status,expires_at').eq('product_id',pool.product_id),
    db.from('merchant_product_terms').select('merchant_id,baseline_unit_paise,consumer_unit_paise,minimum_margin_paise').eq('product_id',pool.product_id),
    db.from('supplier_quotes').select('id,supplier_id,exact_sku_id,min_order_quantity,max_available_quantity,quoted_unit_price_paise,freight_paise,handling_paise,delivery_deadline,expires_at,status,version').eq('pool_id',id),
  ]);
  for (const result of [merchants,demands,restocks,terms,quotes]) if (result.error) return databaseFailure(result.error,'Could not load pricing inputs');
  const result = evaluatePricing({ poolId:id,poolVersion:pool.version,productId:pool.product_id,
    merchants:merchants.data ?? [],demands:demands.data ?? [],restocks:restocks.data ?? [],terms:terms.data ?? [],quotes:quotes.data ?? [] });
  const current = await db.rpc('get_live_pool',{ p_id:id });
  if (current.error) return databaseFailure(current.error);
  if (current.data?.[0]?.version !== pool.version) return fail('STALE_POOL','Pool changed during evaluation; retry',409);
  const { data, error } = await db.from('pool_evaluations').insert({ pool_id:id,pool_version:pool.version,selected_quote_id:result.selectedQuoteId,decision:result.decision,reason_codes:result.reasonCodes,
    snapshot:result.snapshot ?? { quantity:result.quantity,comparisons:result.comparisons },created_by:auth.user!.id,idempotency_key:key }).select('*').single();
  if (error?.code === '23505') {
    const retry = await db.from('pool_evaluations').select('*').eq('created_by',auth.user!.id).eq('idempotency_key',key).single();
    if (retry.error || !retry.data) return databaseFailure(retry.error ?? error);
    return retry.data.pool_id === id ? ok(retry.data) : fail('IDEMPOTENCY_CONFLICT','Key belongs to another pool',409);
  }
  if (error) return databaseFailure(error,'Could not save evaluation');
  return ok({ ...data,comparisons:result.comparisons },201);
}
