import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { fail, ok } from '@/lib/shared/api';
import { uuid } from '@/lib/shared/validation';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail('INVALID_ID','Invalid proposal ID',400);
  const auth = await authenticated();
  if (auth.error) return auth.error;
  const { data, error } = await auth.db!.rpc('get_proposal_details',{ p_id:id });
  if (error) return databaseFailure(error,'Could not load proposal');
  if (!data) return fail('NOT_FOUND','Proposal not found',404);
  return ok(data);
}
