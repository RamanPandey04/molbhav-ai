import { z } from 'zod';
import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { fail, ok } from '@/lib/shared/api';
import { uuid } from '@/lib/shared/validation';
const input = z.object({ termsHash:z.string().regex(/^[a-f0-9]{64}$/) });
export async function decide(request: Request, id: string, action: 'APPROVED' | 'REJECTED') {
  if (!uuid.safeParse(id).success) return fail('INVALID_ID','Invalid proposal ID',400);
  const auth = await authenticated();
  if (auth.error) return auth.error;
  let body: unknown; try { body = await request.json(); } catch { return fail('INVALID_JSON','Invalid JSON body',400); }
  const parsed = input.safeParse(body);
  if (!parsed.success) return fail('INVALID_INPUT','Valid termsHash required',400,parsed.error.flatten());
  const { data, error } = await auth.db!.rpc('decide_proposal',{ p_proposal_id:id,p_terms_hash:parsed.data.termsHash,p_action:action });
  if (error) return databaseFailure(error,'Could not record approval');
  if (data === 'EXPIRED') return fail('PROPOSAL_EXPIRED','Proposal expired',409);
  const details = await auth.db!.rpc('get_proposal_details',{ p_id:id });
  if (details.error) return databaseFailure(details.error,'Could not load proposal');
  return ok(details.data);
}
