import { authenticated } from '@/lib/api/auth';
import { fail, ok } from '@/lib/shared/api';
import { uuid } from '@/lib/shared/validation';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail('INVALID_ID','Invalid demand ID',400);
  const auth = await authenticated();
  if (auth.error) return auth.error;
  const { data, error } = await auth.db!.from('buyer_demands').select('id,buyer_id,merchant_id,product_id,quantity,allocated_existing_stock,status,expires_at,created_at').eq('id',id).eq('buyer_id',auth.user!.id).maybeSingle();
  if (error) return fail('DB_ERROR','Could not load demand',500);
  if (!data) return fail('NOT_FOUND','Demand not found',404);
  return ok({ ...data, effectiveStatus: data.status === 'ACTIVE' && Date.parse(data.expires_at) <= Date.now() ? 'EXPIRED' : data.status });
}
