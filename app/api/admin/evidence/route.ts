import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { administration } from '@/lib/release/admin';
import { csvCell } from '@/lib/release/validation';
import { fail, ok } from '@/lib/shared/api';

export async function GET(request: Request) {
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'ADMIN') return fail('FORBIDDEN', 'Admin role required', 403);
  const db = administration();
  const [metrics, buyers, payments, runs, approvals, events] = await Promise.all([
    auth.db!.rpc('release_evidence_metrics'),
    db.from('onboarding_leads').select('*').order('display_name'),
    db.from('manual_payments').select('*').order('created_at', { ascending: false }).limit(200),
    db.from('agent_runs').select('*').order('created_at', { ascending: false }).limit(100),
    db.from('approvals').select('*').order('created_at', { ascending: false }).limit(200),
    db.from('audit_events').select('*').order('created_at', { ascending: false }).limit(200),
  ]);
  for (const r of [metrics, buyers, payments, runs, approvals, events])
    if (r.error) return databaseFailure(r.error, 'Could not load evidence');
  const generatedAt = new Date().toISOString();
  if (new URL(request.url).searchParams.get('format') === 'csv') {
    const lines: unknown[][] = [['record_type', 'identifier', 'status_or_metric', 'value', 'timestamp']];
    for (const [key, value] of Object.entries(metrics.data ?? {})) lines.push(['metric', key, key, value, generatedAt]);
    for (const b of buyers.data ?? []) lines.push(['pending_buyer', b.id, b.onboarding_status, b.display_name, b.created_at]);
    for (const p of payments.data ?? []) lines.push(['manual_payment', p.id, p.status, p.amount_paise, p.verified_at ?? p.created_at]);
    for (const r of runs.data ?? []) lines.push(['agent_run', r.id, r.provider_status ?? r.error_code ?? r.status, r.provider_run_id ?? '', r.created_at]);
    for (const a of approvals.data ?? []) lines.push(['approval', a.id, a.decision, a.actor_role, a.created_at]);
    return new Response(lines.map(row => row.map(csvCell).join(',')).join('\r\n'), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="molbhav-evidence.csv"', 'Cache-Control': 'no-store' },
    });
  }
  return ok({
    generatedAt, metrics: metrics.data, buyers: buyers.data,
    manualPayments: payments.data, agentRuns: runs.data, approvals: approvals.data, auditEvents: events.data,
    recordLimit: 200, paymentCompliance: 'MANUAL_PHONEPE_ONLY_PINE_LABS_UNSATISFIED',
  });
}
