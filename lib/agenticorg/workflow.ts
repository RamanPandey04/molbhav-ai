import type { AgenticOrgRun } from './client';

/** Mirrors Raman's current pool_evaluations read contract; no monetary decisions are made here. */
export type TrustedEvaluation = {
  id: string;
  pool_id: string;
  pool_version: number;
  selected_quote_id: string | null;
  decision: 'PROPOSE' | 'NO_DEAL' | 'BLOCKED';
  reason_codes: string[];
  snapshot: Record<string, unknown>;
  created_at: string;
};

export class AgentWorkflowError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'AgentWorkflowError';
  }
}

/** Only an authenticated backend should call this with a fresh, persisted evaluation. */
export function buildDealAgentInputs(evaluation: TrustedEvaluation) {
  if (!evaluation.id || !evaluation.pool_id || !Number.isSafeInteger(evaluation.pool_version) || evaluation.pool_version < 0) {
    throw new AgentWorkflowError('INVALID_EVALUATION', 'A persisted evaluation and pool version are required');
  }
  if (evaluation.decision === 'PROPOSE' ? !evaluation.selected_quote_id : evaluation.selected_quote_id !== null) {
    throw new AgentWorkflowError('INCONSISTENT_EVALUATION', 'Selected quote does not match the backend decision');
  }
  if (!Array.isArray(evaluation.reason_codes) || !evaluation.reason_codes.every(code => typeof code === 'string')) {
    throw new AgentWorkflowError('INVALID_REASON_CODES', 'Backend reason codes are required');
  }
  return {
    task: 'Explain the trusted backend evaluation to a human. Do not recalculate money or grant approval.',
    evaluationId: evaluation.id,
    poolId: evaluation.pool_id,
    poolVersion: evaluation.pool_version,
    quoteId: evaluation.selected_quote_id,
    backendDecision: evaluation.decision,
    backendReasonCodes: evaluation.reason_codes,
    backendSnapshot: evaluation.snapshot,
    evaluatedAt: evaluation.created_at,
    approvalPolicy: 'PROPOSE is a draft only. Supplier, kirana and buyer must approve current termsHash in Molbhav before any commitment. No payment is verified by this run.',
  };
}

/** Provider text is advisory. A mismatched or incomplete result cannot alter the saved decision. */
export function assessAgentRun(run: AgenticOrgRun, evaluation: TrustedEvaluation) {
  const output = run.output;
  const record = output !== null && typeof output === 'object' && !Array.isArray(output)
    ? output as Record<string, unknown> : null;
  const reportedDecision = record?.decision;
  const agrees = run.status === 'completed' && reportedDecision === evaluation.decision;
  return {
    providerRunId: run.providerRunId,
    providerStatus: run.status,
    evaluationId: evaluation.id,
    authoritativeDecision: evaluation.decision,
    agentAgrees: agrees,
    // Never promote provider output into terms, approval or payment state.
    advisorySummary: agrees && typeof record?.summary === 'string' ? record.summary : null,
  };
}
