import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { fail, ok } from '@/lib/shared/api';
import { uuid } from '@/lib/shared/validation';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail('INVALID_ID','Invalid quote ID',400);
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'SUPPLIER') return fail('FORBIDDEN','Supplier role required',403);
  const supplier = await auth.db!.from('suppliers').select('id').eq('owner_id',auth.user!.id);
  if (supplier.error) return databaseFailure(supplier.error);
  const ids = (supplier.data ?? []).map(s => s.id);
  if (!ids.length) return fail('NOT_FOUND','Quote not found',404);
  const quote = await auth.db!.from('supplier_quotes').select('id,pool_id,supplier_id,exact_sku_id,min_order_quantity,max_available_quantity,quoted_unit_price_paise,freight_paise,handling_paise,delivery_deadline,expires_at,quoted_by,status,version,created_at').eq('id',id).in('supplier_id',ids).maybeSingle();
  if (quote.error) return databaseFailure(quote.error);
  if (!quote.data) return fail('NOT_FOUND','Quote not found',404);
  const counteroffers = await auth.db!.from('quote_counteroffers').select('id,merchant_id,proposed_unit_price_paise,proposed_freight_paise,proposed_handling_paise,status,created_at,responded_at').eq('quote_id',id).order('created_at',{ ascending:false });
  if (counteroffers.error) return databaseFailure(counteroffers.error);
  return ok({ ...quote.data,effectiveStatus:quote.data.expires_at <= new Date().toISOString() ? 'EXPIRED' : quote.data.status,counteroffers:counteroffers.data });
}
