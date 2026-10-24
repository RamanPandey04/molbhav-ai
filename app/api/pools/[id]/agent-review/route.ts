import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { AgenticOrgError, runConfiguredAgent } from '@/lib/agenticorg/client';
import { AgentWorkflowError, assessAgentRun, buildDealAgentInputs } from '@/lib/agenticorg/workflow';
import { fail, ok } from '@/lib/shared/api';
import { uuid } from '@/lib/shared/validation';

// Sends the latest persisted evaluation to the AgenticOrg agent. The response is advisory only.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail('INVALID_ID','Invalid pool ID',400);
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'ADMIN') return fail('FORBIDDEN','Admin role required',403);
  const { data, error } = await auth.db!.from('pool_evaluations').select('id,pool_id,pool_version,selected_quote_id,decision,reason_codes,snapshot,created_at').eq('pool_id',id).order('created_at',{ ascending:false }).limit(1).maybeSingle();
  if (error) return databaseFailure(error,'Could not load evaluation');
  if (!data) return fail('NOT_FOUND','No evaluation found',404);
  try {
    const run = await runConfiguredAgent(buildDealAgentInputs(data), { poolId: id });
    return ok({ ...assessAgentRun(run, data), agentOutput: run.output, confidence: run.confidence, reviewedAt: new Date().toISOString() });
  } catch (e) {
    if (e instanceof AgentWorkflowError) return fail(e.code, e.message, 422);
    if (e instanceof AgenticOrgError) {
      const status = e.code === 'NOT_CONFIGURED' ? 503 : e.code === 'TIMEOUT' ? 504 : 502;
      return fail(e.code, e.message, status);
    }
    throw e;
  }
}
