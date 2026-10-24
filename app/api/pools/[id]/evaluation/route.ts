import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { fail, ok } from '@/lib/shared/api';
import { uuid } from '@/lib/shared/validation';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail('INVALID_ID','Invalid pool ID',400);
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'ADMIN') return fail('FORBIDDEN','Admin role required',403);
  const { data, error } = await auth.db!.from('pool_evaluations').select('id,pool_id,pool_version,selected_quote_id,decision,reason_codes,snapshot,created_at').eq('pool_id',id).order('created_at',{ ascending:false }).limit(1).maybeSingle();
  if (error) return databaseFailure(error,'Could not load evaluation');
  if (!data) return fail('NOT_FOUND','No evaluation found',404);
  return ok(data);
}
