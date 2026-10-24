import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { manualReview } from '@/lib/release/validation';
import { fail, ok } from '@/lib/shared/api';
import { uuid } from '@/lib/shared/validation';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail('INVALID_ID', 'Invalid report ID', 400);
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'ADMIN') return fail('FORBIDDEN', 'Admin role required', 403);
  const parsed = manualReview.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_INPUT', 'Verification evidence is incomplete', 400, parsed.error.flatten());
  const v = parsed.data;
  const { data, error } = await auth.db!.rpc('review_manual_payment', {
    p_id: id, p_decision: v.decision, p_notes: v.evidenceNotes, p_evidence: v.evidenceReference,
    p_matched_amount: v.matchedAmountPaise ?? null, p_matched_recipient: v.matchedRecipient ?? null,
    p_matched_reference: v.matchedTransactionReference ?? null,
  });
  return error ? databaseFailure(error, 'Could not review payment evidence') : ok(data);
}
