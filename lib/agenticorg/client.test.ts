import { describe, expect, it } from 'vitest';
import { AgenticOrgError, runAgenticOrg } from './client';

const agentId = '91a6dcbe-0d46-4bbd-8a5e-60153859624e';

describe('AgenticOrg transport', () => {
  it('uses the event run endpoint and keeps a missing provider run ID missing', async () => {
    let calledUrl = '';
    let calledBody: unknown;
    const result = await runAgenticOrg({
      agentId,
      apiKey: 'test-only-key',
      inputs: { poolId: 'pool-test' },
      fetcher: async (url, init) => {
        calledUrl = String(url);
        calledBody = JSON.parse(String(init?.body));
        return Response.json({ status: 'hitl_triggered', output: { approval: 'pending' } });
      },
    });
    expect(calledUrl).toBe(`https://agenticorg.hackathon.pinelabs.com/api/v1/agents/${agentId}/run`);
    expect(calledBody).toEqual({ action: 'process', inputs: { poolId: 'pool-test' }, context: {} });
    expect(result.status).toBe('hitl_triggered');
    expect(result.providerRunId).toBeNull();
  });

  it('preserves a real provider run ID only when returned', async () => {
    const result = await runAgenticOrg({
      agentId,
      apiKey: 'test-only-key',
      inputs: { task: 'test' },
      fetcher: async () => Response.json({ status: 'completed', run_id: 'provider-returned-id', output: {} }),
    });
    expect(result.providerRunId).toBe('provider-returned-id');
  });

  it('rejects invalid agent identifiers and provider failures', async () => {
    await expect(runAgenticOrg({ agentId: 'ap_processor', apiKey: 'test-only-key', inputs: {} }))
      .rejects.toMatchObject({ code: 'INVALID_AGENT_ID' } satisfies Partial<AgenticOrgError>);
    await expect(runAgenticOrg({
      agentId, apiKey: 'test-only-key', inputs: {},
      fetcher: async () => new Response('private provider body', { status: 403 }),
    })).rejects.toMatchObject({ code: 'PROVIDER_ERROR', httpStatus: 403 });
    await expect(runAgenticOrg({
      agentId, apiKey: 'test-only-key', inputs: {}, baseUrl: 'https://untrusted.example',
    })).rejects.toMatchObject({ code: 'UNTRUSTED_BASE_URL' });
  });
});
