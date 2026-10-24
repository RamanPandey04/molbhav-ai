import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { manualAmendment } from '@/lib/release/validation';
import { fail, ok } from '@/lib/shared/api';
import { uuid } from '@/lib/shared/validation';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail('INVALID_ID', 'Invalid report ID', 400);
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'BUYER') return fail('FORBIDDEN', 'Buyer role required', 403);
  const parsed = manualAmendment.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_INPUT', 'Actual reference and claimed payment timestamp required', 400);
  const { data, error } = await auth.db!.rpc('amend_manual_payment', {
    p_id: id, p_reference: parsed.data.transactionReference, p_paid_at: parsed.data.claimedPaidAt,
  });
  return error ? databaseFailure(error) : ok(data);
}
