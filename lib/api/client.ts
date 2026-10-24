/**
 * Typed API client for Raman's route handlers (docs/ARCHITECTURE.md §7).
 *
 * While NEXT_PUBLIC_USE_FIXTURES !== "false" every call is answered by SAMPLE fixtures
 * and the UI shows a permanent "sample data" banner. Flip the env var to talk to the real backend.
 * Responses use the `{ data, error }` envelope.
 */
import type {
  AgentRun, ApiEnvelope, CheckoutResult, CreateDemandInput, DecisionInput, DemandReservation,
  Order, PoolDetail, Proposal, QuoteInput, RestockInput, SupplierQuote,
} from "@/lib/shared/types";
import { fixtureApi, FixtureFailure } from "@/lib/fixtures/store";

export const USE_FIXTURES = process.env.NEXT_PUBLIC_USE_FIXTURES !== "false";
export const PILOT_POOL_ID = process.env.NEXT_PUBLIC_PILOT_POOL_ID ?? (USE_FIXTURES ? "sample-pool" : "");

export class ApiFailure extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ApiFailure";
  }
}

const TOKEN_KEY = "molbhav.token";
export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(t: string | null) {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...extraHeaders };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  } catch {
    throw new ApiFailure("NETWORK", "Can't reach the server. Check your connection and try again.");
  }
  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok || !json || json.error || json.data === null) {
    throw new ApiFailure(json?.error?.code ?? `HTTP_${res.status}`, json?.error?.message ?? "Something went wrong on the server. Try again in a moment.");
  }
  return json.data;
}

/** Normalises fixture failures into ApiFailure so screens handle one error type. */
async function fx<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof FixtureFailure) throw new ApiFailure(e.code, e.message);
    throw e;
  }
}

export const api = {
  getPool: (id: string): Promise<PoolDetail> =>
    USE_FIXTURES ? fx(() => fixtureApi.getPool(id)) : request("GET", `/api/pools/${id}`),

  /** ASK: not in the frozen route list. Needed for the buyer's status link. */
  getDemand: (id: string): Promise<DemandReservation> =>
    USE_FIXTURES ? fx(() => fixtureApi.getDemand(id)) : request("GET", `/api/demands/${id}`),

  createDemand: (input: CreateDemandInput): Promise<DemandReservation> => {
    const { idempotencyKey, ...body } = input;
    return USE_FIXTURES ? fx(() => fixtureApi.createDemand(input)) : request("POST", "/api/demands", body, { "Idempotency-Key": idempotencyKey });
  },

  saveRestock: (input: RestockInput): Promise<PoolDetail> =>
    USE_FIXTURES ? fx(() => fixtureApi.saveRestock(input)) : request("POST", "/api/merchant/restock", input),

  submitQuote: (input: QuoteInput): Promise<SupplierQuote> =>
    USE_FIXTURES ? fx(() => fixtureApi.submitQuote(input)) : request("POST", "/api/supplier/quotes", input),

  startAgentRun: (poolId: string): Promise<AgentRun> =>
    USE_FIXTURES
      ? fx(() => fixtureApi.startAgentRun(poolId))
      : request("POST", "/api/agent/runs", { poolId, purpose: "evaluate_and_negotiate" }),

  getAgentRun: (id: string): Promise<AgentRun> =>
    USE_FIXTURES ? fx(() => fixtureApi.getAgentRun(id)) : request("GET", `/api/agent/runs/${id}`),

  /** Role is derived server-side from the caller's auth; `role` is only used by fixtures. */
  decide: (proposalId: string, input: DecisionInput): Promise<Proposal> =>
    USE_FIXTURES
      ? fx(() => fixtureApi.decide(proposalId, input))
      : request("POST", `/api/proposals/${proposalId}/decision`, { decision: input.decision, termsHash: input.termsHash }),

  createCheckout: (proposalId: string, buyerDemandId: string): Promise<CheckoutResult> =>
    USE_FIXTURES
      ? fx(() => fixtureApi.createCheckout(proposalId, buyerDemandId))
      : request("POST", "/api/checkout", { proposalId, buyerDemandId }),

  getOrder: (id: string): Promise<Order> =>
    USE_FIXTURES ? fx(() => fixtureApi.getOrder(id)) : request("GET", `/api/orders/${id}`),
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiFailure) return e.message;
  return "Something went wrong. Try again.";
}
