/** Server-side AgenticOrg transport for the Pine Labs hackathon tenant. */

export type AgenticOrgRunStatus =
  | 'completed'
  | 'failed'
  | 'hitl_triggered'
  | 'budget_exceeded';

export type AgenticOrgRun = {
  status: AgenticOrgRunStatus;
  providerRunId: string | null;
  output: unknown;
  confidence: number | null;
  raw: Record<string, unknown>;
};

export class AgenticOrgError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;

  constructor(
    code: string,
    message: string,
    httpStatus?: number,
  ) {
    super(message);
    this.name = 'AgenticOrgError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export type RunAgentOptions = {
  agentId: string;
  inputs: Record<string, unknown>;
  context?: Record<string, unknown>;
  signal?: AbortSignal;
  apiKey?: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
};

const EVENT_BASE_URL = 'https://agenticorg.hackathon.pinelabs.com';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RUN_STATUSES = new Set<AgenticOrgRunStatus>([
  'completed', 'failed', 'hitl_triggered', 'budget_exceeded',
]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function runAgenticOrg(options: RunAgentOptions): Promise<AgenticOrgRun> {
  if (typeof window !== 'undefined') {
    throw new AgenticOrgError('SERVER_ONLY', 'AgenticOrg runs must execute on the server');
  }
  if (!UUID.test(options.agentId)) {
    throw new AgenticOrgError('INVALID_AGENT_ID', 'AgenticOrg requires an agent UUID');
  }
  if (!record(options.inputs)) {
    throw new AgenticOrgError('INVALID_INPUTS', 'Agent inputs must be an object');
  }
  const apiKey = options.apiKey ?? process.env.AGENTICORG_API_KEY;
  if (!apiKey) {
    throw new AgenticOrgError('NOT_CONFIGURED', 'AgenticOrg API key is not configured');
  }
  const baseUrl = options.baseUrl ?? process.env.AGENTICORG_BASE_URL ?? EVENT_BASE_URL;
  let url: URL;
  try {
    url = new URL(`/api/v1/agents/${options.agentId}/run`, baseUrl);
  } catch {
    throw new AgenticOrgError('INVALID_BASE_URL', 'AgenticOrg base URL is invalid');
  }
  if (url.protocol !== 'https:') {
    throw new AgenticOrgError('INSECURE_BASE_URL', 'AgenticOrg base URL must use HTTPS');
  }
  if (url.hostname !== 'agenticorg.hackathon.pinelabs.com') {
    throw new AgenticOrgError('UNTRUSTED_BASE_URL', 'AgenticOrg event key can only be sent to the event host');
  }

  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        action: 'process',
        inputs: options.inputs,
        context: options.context ?? {},
      }),
      cache: 'no-store',
      signal: options.signal ?? AbortSignal.timeout(120_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      throw new AgenticOrgError('TIMEOUT', 'AgenticOrg run timed out');
    }
    throw new AgenticOrgError('NETWORK_ERROR', 'Could not reach AgenticOrg');
  }
  if (!response.ok) {
    // Provider bodies may contain sensitive inputs; never forward them to the UI.
    throw new AgenticOrgError('PROVIDER_ERROR', `AgenticOrg returned HTTP ${response.status}`, response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AgenticOrgError('INVALID_RESPONSE', 'AgenticOrg returned invalid JSON');
  }
  if (!record(payload) || !RUN_STATUSES.has(payload.status as AgenticOrgRunStatus)) {
    throw new AgenticOrgError('INVALID_RESPONSE', 'AgenticOrg run status is missing or unknown');
  }
  const providerRunId = typeof payload.run_id === 'string'
    ? payload.run_id
    : typeof payload.runId === 'string'
      ? payload.runId
      : null;
  return {
    status: payload.status as AgenticOrgRunStatus,
    providerRunId,
    output: payload.output,
    confidence: typeof payload.confidence === 'number' && Number.isFinite(payload.confidence)
      ? payload.confidence
      : null,
    raw: payload,
  };
}

/** Uses server environment variables; called only after the authenticated backend authorizes a run. */
export function runConfiguredAgent(
  inputs: Record<string, unknown>,
  context: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<AgenticOrgRun> {
  const agentId = process.env.AGENTICORG_AGENT_ID;
  if (!agentId) {
    throw new AgenticOrgError('NOT_CONFIGURED', 'AgenticOrg agent ID is not configured');
  }
  return runAgenticOrg({ agentId, inputs, context, signal });
}
