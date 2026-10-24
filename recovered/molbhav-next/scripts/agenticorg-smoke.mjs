/** Explicit, read-only connectivity/run probe. Never stores the key or prints provider output. */
import { runAgenticOrg } from '../lib/agenticorg/client.ts';

const agentId = process.env.AGENTICORG_AGENT_ID;
const apiKey = process.env.AGENTICORG_API_KEY;
const inputsJson = process.env.AGENTICORG_INPUTS_JSON;

if (!agentId || !apiKey || !inputsJson) {
  console.error('Set AGENTICORG_AGENT_ID, AGENTICORG_API_KEY and AGENTICORG_INPUTS_JSON for an explicitly safe test run.');
  process.exitCode = 2;
} else {
  try {
    const inputs = JSON.parse(inputsJson);
    if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) {
      throw new Error('AGENTICORG_INPUTS_JSON must be an object');
    }
    const result = await runAgenticOrg({ agentId, apiKey, inputs });
    console.log(JSON.stringify({
      status: result.status,
      providerRunId: result.providerRunId,
      // Output may include customer data or unverified claims; inspect only in the authorized workspace.
      outputReceived: result.output !== undefined && result.output !== null,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      code: error?.code ?? 'TEST_FAILED',
      message: error?.message ?? 'AgenticOrg test failed',
      httpStatus: error?.httpStatus ?? null,
    }));
    process.exitCode = 1;
  }
}
