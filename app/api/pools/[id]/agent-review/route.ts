import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { AgenticOrgError, runConfiguredAgent } from '@/lib/agenticorg/client';
import { AgentWorkflowError, assessAgentRun, buildDealAgentInputs } from '@/lib/agenticorg/workflow';
import { fail, ok } from '@/lib/shared/api';
import { uuid } from '@/lib/shared/validation';
import { administration } from '@/lib/release/admin';
import { financialSnapshot, providerEvents, redactProvider } from '@/lib/release/agent-log';

// Sends the latest persisted evaluation to the AgenticOrg agent. The response is advisory only.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail('INVALID_ID','Invalid pool ID',400);
  const auth = await authenticated();
  if (auth.error) return auth.error;
  if (auth.role !== 'ADMIN') return fail('FORBIDDEN','Admin role required',403);
  const { data, error } = await auth.db!.from('pool_evaluations').select('id,pool_id,pool_version,selected_quote_id,decision,reason_codes,snapshot,created_at').eq('pool_id',id).order('created_at',{ ascending:false }).limit(1).maybeSingle();
  if (error) return databaseFailure(error,'Could not load evaluation');
  if (!data) return fail('NOT_FOUND','No evaluation found',404);
  const current = await auth.db!.rpc('get_live_pool',{p_id:id});
  if (current.error) return databaseFailure(current.error);
  if (!current.data?.[0]) return fail('NOT_FOUND','Pool not found',404);
  if (current.data[0].version !== data.pool_version)
    return fail('STALE_EVALUATION','Pool changed. Run deterministic evaluation again before agent review.',409);
  const admin = administration();
  const key = request.headers.get('Idempotency-Key') ?? crypto.randomUUID();
  if (key.length<8 || key.length>128) return fail('INVALID_IDEMPOTENCY_KEY','Use an 8–128 character key',400);
  const prior = await admin.from('agent_runs').select('*').eq('actor_id',auth.user!.id).eq('idempotency_key',key).maybeSingle();
  if (prior.error) return databaseFailure(prior.error);
  if (prior.data) {
    if (prior.data.pool_id!==id) return fail('IDEMPOTENCY_CONFLICT','Key belongs to a different pool',409);
    if (prior.data.error_code) return fail(prior.data.error_code,'The saved attempt was blocked or failed; no new provider call was made',503,{runId:prior.data.id});
    return ok(prior.data.output ?? {runId:prior.data.id,status:prior.data.status,providerRunId:prior.data.provider_run_id,errorCode:prior.data.error_code},200);
  }
  const events = [{source:'BACKEND',type:'EVALUATION_LOADED',timestamp:new Date().toISOString(),evaluationId:data.id}];
  const input = buildDealAgentInputs({...data,snapshot:financialSnapshot(data.snapshot)});
  const started = await admin.from('agent_runs').insert({
    pool_id:id,actor_id:auth.user!.id,evaluation_id:data.id,status:'STARTED',input,
    data_class:auth.dataClass,idempotency_key:key,backend_events:events,
  }).select('id').single();
  if (started.error) return databaseFailure(started.error,'Could not persist agent attempt');
  const runId = started.data.id;
  try {
    if (!process.env.AGENTICORG_API_KEY || !process.env.AGENTICORG_AGENT_ID)
      throw new AgenticOrgError('NOT_CONFIGURED','AgenticOrg configuration is missing');
    // Teammate handoff warned that checkout tools were enabled. A prompt is not
    // permission enforcement; only a provider owner can confirm the safe scope.
    if (process.env.AGENTICORG_READ_ONLY_CONFIRMED!=='true')
      throw new AgenticOrgError('SAFETY_CONFIGURATION_REQUIRED','Confirm checkout tools are removed or provider-enforced read-only Shadow mode before running this advisory agent');
    events.push({source:'BACKEND',type:'PROVIDER_CALL_STARTED',timestamp:new Date().toISOString(),evaluationId:data.id});
    const run = await runConfiguredAgent(input, { poolId:id,advisoryOnly:true });
    const finishedAt = new Date().toISOString();
    events.push({source:'BACKEND',type:'PROVIDER_RESPONSE_RECEIVED',timestamp:finishedAt,evaluationId:data.id});
    const latest = await auth.db!.rpc('get_live_pool',{p_id:id});
    const result = {
      ...assessAgentRun(run,data),runId,
      agentOutput:redactProvider(run.output),confidence:run.confidence,reviewedAt:finishedAt,
      evaluationStale:!!latest.error || latest.data?.[0]?.version!==data.pool_version,
      providerEvents:providerEvents(run.raw),backendEvents:events,
      humanApprovalRequired:true,paymentStateChanged:false,
    };
    const saved = await admin.from('agent_runs').update({
      status:run.status==='completed'?'SUCCEEDED':run.status==='hitl_triggered'?'STARTED':'FAILED',
      provider_status:run.status,provider_run_id:run.providerRunId,output:result,
      provider_events:result.providerEvents,backend_events:events,completed_at:run.status==='hitl_triggered'?null:finishedAt,
    }).eq('id',runId);
    if (saved.error) return databaseFailure(saved.error,'Provider replied but execution evidence could not be saved');
    return ok(result);
  } catch (e) {
    const code = e instanceof AgentWorkflowError || e instanceof AgenticOrgError ? e.code : 'INTERNAL_ERROR';
    const saved = await admin.from('agent_runs').update({
      status:'FAILED',error_code:code,completed_at:new Date().toISOString(),
      backend_events:[...events,{source:'BACKEND',type:'REQUEST_BLOCKED_OR_FAILED',timestamp:new Date().toISOString(),evaluationId:data.id}],
      output:{runId,providerRunId:null,errorCode:code},
    }).eq('id',runId);
    if (saved.error) return databaseFailure(saved.error,'Could not persist failure evidence');
    if (e instanceof AgentWorkflowError) return fail(e.code,e.message,422,{runId});
    if (e instanceof AgenticOrgError) {
      const status = e.code==='NOT_CONFIGURED'||e.code==='SAFETY_CONFIGURATION_REQUIRED' ? 503 : e.code==='TIMEOUT'?504:502;
      return fail(e.code,e.message,status,{runId});
    }
    throw e;
  }
}
