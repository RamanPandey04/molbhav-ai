import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { fail, ok } from '@/lib/shared/api';
import { counterofferInput, uuid } from '@/lib/shared/validation';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail('INVALID_ID','Invalid quote ID',400);
  const auth = await authenticated();
  if (auth.error) return auth.error;
  let body: unknown; try { body = await request.json(); } catch { return fail('INVALID_JSON','Invalid JSON body',400); }
  const parsed = counterofferInput.safeParse(body);
  if (!parsed.success) return fail('INVALID_INPUT','Invalid counteroffer action',400,parsed.error.flatten());
  const v = parsed.data;
  if (v.action === 'PROPOSE' && auth.role !== 'MERCHANT') return fail('FORBIDDEN','Merchant role required',403);
  if (v.action !== 'PROPOSE' && auth.role !== 'SUPPLIER') return fail('FORBIDDEN','Supplier role required',403);
  const { data, error } = await auth.db!.rpc('decide_counteroffer',{
    p_quote_id:id,p_action:v.action,p_counteroffer_id:v.action === 'PROPOSE' ? null : v.counterofferId,
    p_unit_price_paise:v.action === 'PROPOSE' ? v.quotedUnitPricePaise : null,
    p_freight_paise:v.action === 'PROPOSE' ? v.freightPaise : null,
    p_handling_paise:v.action === 'PROPOSE' ? v.handlingPaise : null,
  });
  if (error) return databaseFailure(error,'Could not process counteroffer');
  return ok({ counterofferId:data,action:v.action },v.action === 'PROPOSE' ? 201 : 200);
}
