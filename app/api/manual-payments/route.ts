import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { manualReport } from '@/lib/release/validation';
import { fail, ok } from '@/lib/shared/api';

export async function GET() {
  const auth = await authenticated();
  if (auth.error) return auth.error;
  const { data, error } = await auth.db!.from('manual_payments').select('*').order('created_at', { ascending: false }).limit(100);
  return error ? databaseFailure(error) : ok(data);
}

export async function POST(request: Request) {
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'BUYER') return fail('FORBIDDEN', 'Buyer role required', 403);
  const key = request.headers.get('Idempotency-Key');
  if (!key || key.length < 8 || key.length > 128) return fail('INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key must be 8–128 characters', 400);
  const body = await request.json().catch(() => null);
  const parsed = manualReport.safeParse(body);
  if (!parsed.success) return fail('INVALID_INPUT', 'Invalid manual payment report', 400, parsed.error.flatten());
  const v = parsed.data;
  const { data, error } = await auth.db!.rpc('report_manual_payment', {
    p_demand_id: v.demandId ?? null, p_order_id: v.orderId ?? null,
    p_reference: v.transactionReference ?? null, p_claimed_paid_at: v.claimedPaidAt ?? null, p_key: key,
  });
  return error ? databaseFailure(error, 'Could not report manual payment') : ok(data, 201);
}
