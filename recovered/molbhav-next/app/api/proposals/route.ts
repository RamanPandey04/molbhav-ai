import { z } from 'zod';
import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { fail, ok } from '@/lib/shared/api';
import { uuid } from '@/lib/shared/validation';
const input = z.object({ evaluationId:uuid });
export async function POST(request: Request) {
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'ADMIN') return fail('FORBIDDEN','Admin role required',403);
  let body: unknown; try { body = await request.json(); } catch { return fail('INVALID_JSON','Invalid JSON body',400); }
  const parsed = input.safeParse(body);
  if (!parsed.success) return fail('INVALID_INPUT','Invalid evaluation ID',400,parsed.error.flatten());
  const { data, error } = await auth.db!.rpc('create_proposal',{ p_evaluation_id:parsed.data.evaluationId });
  if (error) return databaseFailure(error,'Could not create proposal');
  const details = await auth.db!.rpc('get_proposal_details',{ p_id:data });
  if (details.error) return databaseFailure(details.error,'Could not read proposal');
  return ok(details.data,201);
}
