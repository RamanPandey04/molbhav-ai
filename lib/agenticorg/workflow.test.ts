import { describe, expect, it } from 'vitest';
import { assessAgentRun, buildDealAgentInputs, type TrustedEvaluation } from './workflow';

const evaluation: TrustedEvaluation = {
  id: 'evaluation-test-only', pool_id: 'pool-test-only', pool_version: 3,
  selected_quote_id: 'quote-test-only', decision: 'PROPOSE',
  reason_codes: ['APPROVAL_REQUIRED'], snapshot: { quantity: 10 },
  created_at: '2026-10-24T10:00:00Z',
};

describe('AgenticOrg deal boundary (synthetic tests only)', () => {
  it('passes the backend decision and explicit human approval policy to the agent', () => {
    expect(buildDealAgentInputs(evaluation)).toMatchObject({
      poolVersion: 3, backendDecision: 'PROPOSE', quoteId: 'quote-test-only',
      approvalPolicy: expect.stringContaining('termsHash'),
    });
  });

  it('rejects inconsistent backend evaluation inputs', () => {
    expect(() => buildDealAgentInputs({ ...evaluation, selected_quote_id: null }))
      .toThrow('Selected quote');
  });

  it('never treats agent output as a money or approval decision', () => {
    const result = assessAgentRun({
      status: 'completed', providerRunId: null, confidence: null, raw: {},
      output: { decision: 'PAID_LIVE', summary: 'Approved and paid' },
    }, evaluation);
    expect(result).toMatchObject({ authoritativeDecision: 'PROPOSE', agentAgrees: false, advisorySummary: null, providerRunId: null });
  });

  it('keeps NO_DEAL as a valid trusted outcome', () => {
    const noDeal = { ...evaluation, decision: 'NO_DEAL' as const, selected_quote_id: null, reason_codes: ['MOQ_NOT_MET'] };
    expect(buildDealAgentInputs(noDeal).backendDecision).toBe('NO_DEAL');
    expect(assessAgentRun({ status: 'completed', providerRunId: 'real-if-returned', confidence: null, raw: {}, output: { decision: 'NO_DEAL', summary: 'MOQ not met' } }, noDeal))
      .toMatchObject({ authoritativeDecision: 'NO_DEAL', agentAgrees: true });
  });
});
