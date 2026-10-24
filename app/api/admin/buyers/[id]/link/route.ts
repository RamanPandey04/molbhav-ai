import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { buyerLink } from '@/lib/release/validation';
import { fail, ok } from '@/lib/shared/api';
import { uuid } from '@/lib/shared/validation';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail('INVALID_ID', 'Invalid onboarding ID', 400);
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'ADMIN') return fail('FORBIDDEN', 'Admin role required', 403);
  const parsed = buyerLink.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_INPUT', 'Confirmed buyer identity, contact consent and evidence required', 400);
  const v = parsed.data;
  const { data, error } = await auth.db!.rpc('link_onboarding_buyer', {
    p_lead: id, p_buyer: v.buyerId, p_evidence: v.identityEvidence,
    p_consent: v.contactConsentConfirmed, p_external: v.externalUserConfirmed,
  });
  return error ? databaseFailure(error, 'Could not link genuine buyer') : ok(data);
}
