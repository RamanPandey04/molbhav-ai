/**
 * Typed client for the real Molbhav route handlers. No fixtures, no sample API.
 * Every call sends the current Supabase access token; writes send a UUID Idempotency-Key.
 * Raw backend rows (snake_case, or camelCase from get_proposal_details) are normalised here
 * into Juhi's UI types so the original components render unchanged.
 */
import type {
  Activity, Approval, ApprovalStatus, ApiEnvelope, Catalog, DemandReservation, ManualPayment, PersistedAgentRun,
  PoolDetail, Proposal, ProposalStatus, RawRow, RecordedEvent, SupplierQuote,
} from "@/lib/juhi/types";
import { getAccessToken } from "@/lib/juhi/supabase-browser";

/** The configured pilot pool. Real ID, never a fictional one. */
export const PILOT_POOL_ID = process.env.NEXT_PUBLIC_PILOT_POOL_ID || "1f9762fd-5e4f-4ccb-81fb-85bd1391704d";
export const QR_SRC = "/payments/phonepe-juhi.png";
export const MANUAL_AMOUNT_PAISE = 100;
export const MANUAL_RECIPIENT = "Juhi Dugar";

export class ApiFailure extends Error {
  constructor(public code: string, message: string, public status: number | null = null) {
    super(message);
    this.name = "ApiFailure";
  }
}

const newKey = () => crypto.randomUUID();

async function request<T>(method: "GET" | "POST" | "PATCH", path: string, body?: unknown, opts: { idempotencyKey?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = await getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", credentials: "include" });
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
    throw new ApiFailure(json?.error?.code ?? `HTTP_${res.status}`, json?.error?.message ?? "Something went wrong on the server. Try again in a moment.", res.status);
  }
  return json.data;
}

/* ---------- normalisers ---------- */
const str = (o: unknown, k: string): string | null => {
  const v = o && typeof o === "object" ? (o as RawRow)[k] : undefined;
  return typeof v === "string" ? v : null;
};
const num = (o: unknown, k: string): number | null => {
  const v = o && typeof o === "object" ? (o as RawRow)[k] : undefined;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};
const rows = (v: unknown): RawRow[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as RawRow[]) : []);
export const shortId = (id: string) => id.slice(0, 8);

export function normQuote(q: RawRow, supplierNames?: Map<string, string>): SupplierQuote {
  if (typeof q.quoteId === "string") return q as unknown as SupplierQuote;
  const supplierId = str(q, "supplier_id") ?? "";
  return {
    quoteId: str(q, "id") ?? "",
    supplierId,
    supplierName: str(q, "supplier_name") ?? supplierNames?.get(supplierId) ?? `Supplier ${shortId(supplierId)}`,
    quotedBy: str(q, "quoted_by_name") ?? str(q, "supplier_name") ?? supplierNames?.get(supplierId) ?? `Supplier ${shortId(supplierId)}`,
    skuId: str(q, "exact_sku_id") ?? "",
    minQty: num(q, "min_order_quantity") ?? 0,
    availableQty: num(q, "max_available_quantity") ?? 0,
    unitPriceMinor: num(q, "quoted_unit_price_paise") ?? 0,
    freightTotalMinor: num(q, "freight_paise") ?? 0,
    otherCostsMinor: num(q, "handling_paise") ?? 0,
    taxBasis: null,
    leadTimeDays: null,
    deliveryDeadline: str(q, "delivery_deadline"),
    expiresAt: str(q, "expires_at") ?? "",
    status: str(q, "status") ?? "UNKNOWN",
  };
}

const PROPOSAL_STATUS: Record<string, ProposalStatus> = { PENDING: "AWAITING_APPROVAL", APPROVED: "APPROVED", REJECTED: "REJECTED", EXPIRED: "EXPIRED" };

/** get_proposal_details (camelCase, snapshot in paise) → Juhi Proposal. */
export function normProposal(p: RawRow): Proposal {
  if (typeof p.proposalId === "string") return p as unknown as Proposal;
  const snap = (p.snapshot && typeof p.snapshot === "object" ? p.snapshot : {}) as RawRow;
  const raw = str(p, "status") ?? "PENDING";
  const status = PROPOSAL_STATUS[raw] ?? "AWAITING_APPROVAL";
  const recorded = rows(p.approvals);
  const approval = (role: "SUPPLIER" | "KIRANA" | "BUYER"): Approval => {
    const backendRole = role === "KIRANA" ? "MERCHANT" : role;
    const mine = recorded.filter((a) => str(a, "actorRole") === backendRole);
    const last = mine[mine.length - 1];
    const action = str(last, "action");
    const st: ApprovalStatus = action === "APPROVED" ? "APPROVED" : action === "REJECTED" ? "REJECTED" : raw === "EXPIRED" ? "EXPIRED" : "PENDING";
    return { approvalId: `${str(p, "id")}-${role}`, role, status: st, actorName: last ? `${mine.length} ${role === "KIRANA" ? "kirana" : role.toLowerCase()} participant${mine.length > 1 ? "s" : ""}` : null, decidedAt: str(last, "timestamp") };
  };
  const allocs = rows(snap.merchantAllocations);
  return {
    proposalId: str(p, "id") ?? "",
    poolId: str(p, "poolId") ?? str(snap, "poolId") ?? "",
    quoteId: str(snap, "quoteId") ?? "",
    version: num(snap, "poolVersion") ?? 0,
    status,
    pooledQty: num(snap, "quantity") ?? 0,
    landedTotalMinor: num(snap, "landedTotalPaise") ?? 0,
    baselineTotalMinor: num(snap, "baselineTotalPaise") ?? 0,
    estimatedSavingsMinor: num(snap, "savingsPaise") ?? 0,
    proposedCustomerPriceMinor: allocs.length ? num(allocs[0], "consumerUnitPricePaise") : null,
    rationale: "",
    termsHash: str(p, "termsHash") ?? "",
    approvals: [approval("SUPPLIER"), approval("KIRANA"), approval("BUYER")],
    invalidatedReason: null,
    expiresAt: str(p, "expiresAt"),
  };
}

export function normPool(raw: RawRow): PoolDetail {
  const quotes = rows(raw.quotes).map((q) => normQuote(q));
  const proposal = raw.proposal && typeof raw.proposal === "object" ? normProposal(raw.proposal as RawRow) : null;
  return { ...(raw as unknown as PoolDetail), quotes, proposal, dataClass: str(raw, "dataClass") ?? str(raw, "data_class") ?? "UNLABELLED" };
}

function normEvents(v: unknown, source: "BACKEND" | "PROVIDER"): RecordedEvent[] {
  return rows(v).map((e) => ({
    source,
    type: str(e, "type") ?? str(e, "event") ?? str(e, "kind") ?? "EVENT",
    name: str(e, "name") ?? str(e, "tool") ?? str(e, "toolName") ?? undefined,
    summary: str(e, "summary") ?? str(e, "message") ?? undefined,
    occurredAt: str(e, "timestamp") ?? str(e, "occurredAt") ?? str(e, "occurred_at") ?? str(e, "at"),
  }));
}

export function normAgentRun(r: RawRow): PersistedAgentRun {
  return {
    id: str(r, "id") ?? "",
    poolId: str(r, "pool_id") ?? "",
    evaluationId: str(r, "evaluation_id"),
    status: str(r, "status") ?? "UNKNOWN",
    providerRunId: str(r, "provider_run_id"),
    providerStatus: str(r, "provider_status"),
    errorCode: str(r, "error_code"),
    dataClass: str(r, "data_class") ?? "UNLABELLED",
    createdAt: str(r, "created_at") ?? "",
    completedAt: str(r, "completed_at"),
    backendEvents: normEvents(r.backend_events, "BACKEND"),
    providerEvents: normEvents(r.provider_events, "PROVIDER"),
  };
}

/** Raw buyer_demands row → Juhi DemandReservation. Uses the exact demand UUID. */
export function normDemand(d: RawRow, poolId: string | null): DemandReservation {
  const id = str(d, "id") ?? "";
  const s = str(d, "effectiveStatus") ?? str(d, "status") ?? "ACTIVE";
  const status: DemandReservation["status"] = s === "EXPIRED" ? "EXPIRED" : s === "CANCELLED" ? "CANCELLED" : s === "FULFILLED" ? "FULFILLED" : "RESERVED";
  return {
    demandId: id, reservationCode: id, poolId: str(d, "pool_id") ?? poolId ?? "",
    productId: str(d, "product_id") ?? "", merchantId: str(d, "merchant_id") ?? "",
    qty: num(d, "quantity") ?? 0, maxPriceMinor: num(d, "max_unit_price_paise") ?? 0,
    status, createdAt: str(d, "created_at") ?? "", expiresAt: str(d, "expires_at") ?? "",
    finalOffer: null, paymentMode: null, orderId: null,
  };
}

/* ---------- inputs ---------- */
export interface DemandInput {
  merchantId: string; productId: string; quantity: number; maxUnitPricePaise: number;
  deliveryDeadline: string; expiresAt: string; fulfillmentTerms: string; consentConfirmed: true; idempotencyKey: string;
}
export interface RestockInput { merchantId: string; productId: string; quantity: number; neededBy: string; expiresAt: string }
export interface QuoteInput {
  poolId: string; supplierId: string; exactSkuId: string; minOrderQuantity: number; maxAvailableQuantity: number;
  quotedUnitPricePaise: number; freightPaise: number; handlingPaise: number; deliveryDeadline: string; expiresAt: string;
}
export interface Evaluation { id: string; pool_id: string; pool_version: number; decision: "PROPOSE" | "NO_DEAL" | "BLOCKED"; reason_codes: string[]; snapshot: RawRow | null; created_at: string }

export const api = {
  /** Juhi PoolDetail populated from real Supabase records. */
  getPool: async (id: string): Promise<PoolDetail> => normPool(await request<RawRow>("GET", `/api/ui/pools/${encodeURIComponent(id)}`)),
  getCatalog: (): Promise<Catalog> => request("GET", "/api/catalog"),
  getActivity: (): Promise<Activity> => request("GET", "/api/activity"),

  getDemand: (id: string): Promise<RawRow> => request("GET", `/api/demands/${encodeURIComponent(id)}`),
  createDemand: ({ idempotencyKey, ...body }: DemandInput): Promise<RawRow> =>
    request("POST", "/api/demands", body, { idempotencyKey }),

  saveRestock: (input: RestockInput): Promise<RawRow> => request("POST", "/api/merchant/restock", input, { idempotencyKey: newKey() }),
  submitQuote: (input: QuoteInput): Promise<RawRow> => request("POST", "/api/supplier/quotes", input, { idempotencyKey: newKey() }),

  evaluate: (poolId: string): Promise<Evaluation> => request("POST", `/api/pools/${encodeURIComponent(poolId)}/evaluate`, undefined, { idempotencyKey: newKey() }),
  getEvaluation: (poolId: string): Promise<Evaluation> => request("GET", `/api/pools/${encodeURIComponent(poolId)}/evaluation`),
  createProposal: async (evaluationId: string): Promise<Proposal> =>
    normProposal(await request<RawRow>("POST", "/api/proposals", { evaluationId }, { idempotencyKey: newKey() })),
  getProposal: async (id: string): Promise<Proposal> => normProposal(await request<RawRow>("GET", `/api/proposals/${encodeURIComponent(id)}`)),
  /** Advisory only. Real failures (e.g. SAFETY_CONFIGURATION_REQUIRED) are thrown as ApiFailure. */
  agentReview: (poolId: string): Promise<RawRow> => request("POST", `/api/pools/${encodeURIComponent(poolId)}/agent-review`, undefined, { idempotencyKey: newKey() }),

  /** Approve or reject the exact terms hash. Role is derived server-side. */
  decide: async (proposalId: string, input: { decision: "APPROVE" | "REJECT"; termsHash: string }): Promise<Proposal> =>
    normProposal(await request<RawRow>("POST", `/api/proposals/${encodeURIComponent(proposalId)}/${input.decision === "APPROVE" ? "approve" : "reject"}`, { termsHash: input.termsHash }, { idempotencyKey: newKey() })),

  listManualPayments: async (): Promise<ManualPayment[]> => rows(await request<unknown>("GET", "/api/manual-payments")) as unknown as ManualPayment[],
  reportManualPayment: (body: { demandId?: string; orderId?: string; transactionReference?: string; claimedPaidAt?: string }, idempotencyKey: string): Promise<ManualPayment> =>
    request("POST", "/api/manual-payments", body, { idempotencyKey }),
  updateManualPayment: (id: string, body: { transactionReference: string; claimedPaidAt: string }): Promise<ManualPayment> =>
    request("PATCH", `/api/manual-payments/${encodeURIComponent(id)}`, body),
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiFailure) return e.code.startsWith("HTTP_") || e.code === "NETWORK" ? e.message : `${e.message} (${e.code})`;
  return "Something went wrong. Try again.";
}
