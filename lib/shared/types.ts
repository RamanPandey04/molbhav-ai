/**
 * Molbhav.AI — UI-side contract types.
 *
 * Source of truth is Raman's `lib/shared` export. Until that lands, this file mirrors
 * docs/ARCHITECTURE.md §4–§8 and docs/TEAM_EXECUTION_PLAN.md §05 ("Shared minimum data contract").
 * When Raman publishes the real types, delete this file and re-point the `@/lib/shared/types` imports.
 *
 * All money is integer INR paise ("minor units"). Never floats.
 */

export type Role = "BUYER" | "KIRANA" | "SUPPLIER" | "ADMIN";
export type PaymentMode = "UAT" | "LIVE";

/* ---------- envelope ---------- */
export interface ApiError {
  code: string;
  message: string;
}
export interface ApiEnvelope<T> {
  data: T | null;
  error: ApiError | null;
}

/* ---------- catalogue ---------- */
export interface Product {
  id: string;
  brand: string;
  name: string;
  sku: string;
  packSize: string; // "250 g bar"
  unit: string;
  /** Verified normal retail price for one unit, only used for "below normal price" claims. */
  retailBaselineMinor: number | null;
}

export interface MerchantInfo {
  id: string;
  name: string;
  zoneName: string;
  verified: boolean;
  pickupWindowEnd: string; // ISO
}

/* ---------- pool ---------- */
export type PoolStatus =
  | "OPEN"
  | "QUOTED"
  | "PROPOSED"
  | "APPROVED"
  | "LOCKED"
  | "CLOSED"
  | "EXPIRED"
  | "REJECTED";

/** Fields exactly as named in the frozen "Pool summary" contract. */
export interface PoolSummary {
  poolId: string;
  zoneId: string;
  skuId: string;
  buyerDemandQty: number;
  independentRestockQty: number;
  inventoryAllocatedQty: number;
  eligibleProcurementQty: number;
  minimumOrderQty: number;
  expiresAt: string;
  status: PoolStatus;
  version: number;
}

export interface SupplierQuote {
  quoteId: string;
  supplierId: string;
  supplierName: string;
  quotedBy: string; // identifiable human
  skuId: string;
  minQty: number;
  availableQty: number;
  unitPriceMinor: number;
  freightTotalMinor: number;
  otherCostsMinor: number;
  taxBasis: string; // "GST invoice, 18% included"
  leadTimeDays: number;
  expiresAt: string;
  status: "SUBMITTED" | "COUNTER_PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
}

export interface MerchantRestock {
  independentQty: number;
  allocatedStockToBuyers: number;
  confirmedBy: string | null;
  confirmedAt: string | null;
}

/** GET /api/pools/:id — summary plus the extras the screens need (see README "Contract asks"). */
export interface PoolDetail extends PoolSummary {
  product: Product;
  merchant: MerchantInfo;
  restock: MerchantRestock | null;
  quotes: SupplierQuote[];
  proposal: Proposal | null;
  latestAgentRunId: string | null;
  /** Server-labelled estimate for buyers, null until a quote exists. */
  estimatedUnitPriceMinor: number | null;
  /** True when served from fixtures — never from the backend. */
  isSample?: boolean;
}

/* ---------- demand / reservation ---------- */
export type DemandStatus =
  | "INTEREST"
  | "RESERVED"
  | "OFFERED"
  | "ACCEPTED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "FULFILLED"
  | "EXPIRED"
  | "CANCELLED"
  | "FAILED";

export interface FinalOffer {
  proposalId: string;
  termsHash: string;
  unitPriceMinor: number;
  totalMinor: number;
  pickupWindowEnd: string;
  pickupMerchantName: string;
}

export interface DemandReservation {
  demandId: string;
  reservationCode: string; // human-readable e.g. MB-4F2K
  poolId: string;
  productId: string;
  merchantId: string;
  qty: number;
  maxPriceMinor: number;
  status: DemandStatus;
  createdAt: string;
  expiresAt: string;
  finalOffer: FinalOffer | null;
  /** Set once a payment exists. Lets the UI split PAID into test vs live without a second call. */
  paymentMode: PaymentMode | null;
  /** Set once a checkout exists, so the status link can find the order. */
  orderId: string | null;
  isSample?: boolean;
}

export interface CreateDemandInput {
  productId: string;
  merchantId: string;
  qty: number;
  maxPriceMinor: number;
  buyerContactOrSession: string;
  displayName: string;
  consent: true;
  idempotencyKey: string;
}

/* ---------- proposal + approvals ---------- */
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
export type ApprovalRole = "SUPPLIER" | "KIRANA" | "BUYER";

export interface Approval {
  approvalId: string;
  role: ApprovalRole;
  status: ApprovalStatus;
  actorName: string | null;
  decidedAt: string | null;
}

export type ProposalStatus =
  | "DRAFT"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "INVALIDATED";

export interface Proposal {
  proposalId: string;
  poolId: string;
  quoteId: string;
  version: number;
  status: ProposalStatus;
  pooledQty: number;
  landedTotalMinor: number;
  baselineTotalMinor: number;
  estimatedSavingsMinor: number;
  proposedCustomerPriceMinor: number;
  rationale: string;
  termsHash: string;
  approvals: Approval[];
  invalidatedReason: string | null;
}

/* ---------- agent ---------- */
export type AgentRunStatus = "RUNNING" | "COMPLETED" | "ERROR";
export type AgentDecision = "PROPOSE" | "NO_DEAL" | "BLOCKED";

export type TimelineEventType =
  | "RUN_STARTED"
  | "TOOL_CALLED"
  | "TOOL_RESULT"
  | "DECISION"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_RECORDED"
  | "ERROR";

export interface TimelineEvent {
  type: TimelineEventType;
  name?: string; // tool name
  role?: ApprovalRole;
  summary?: string;
  occurredAt: string; // server timestamp
}

export interface AgentRun {
  providerRunId: string;
  poolId: string;
  poolVersion: number;
  status: AgentRunStatus;
  decision: AgentDecision | null;
  reasonCodes: string[];
  evaluatedQuoteId: string | null;
  proposalId: string | null;
  summary: string;
  errorMessage: string | null;
  timeline: TimelineEvent[];
  isVerifiedRealRevenue: boolean;
  startedAt: string;
  isSample?: boolean;
}

/* ---------- checkout / order ---------- */
export type PaymentStatus = "CREATED" | "PENDING" | "VERIFIED_PAID" | "FAILED" | "EXPIRED";
export type FulfillmentStatus = "NOT_STARTED" | "READY_FOR_PICKUP" | "PICKED_UP" | "CANCELLED";

export interface PaymentAttempt {
  paymentAttemptId: string;
  merchantOrderId: string;
  providerReference: string | null;
  mode: PaymentMode;
  status: PaymentStatus;
  verifiedAt: string | null;
  failureReason: string | null;
}

export interface Order {
  orderId: string;
  demandId: string;
  proposalId: string;
  qty: number;
  unitPriceMinor: number;
  amountMinor: number;
  pickupMerchantName: string;
  pickupWindowEnd: string;
  payment: PaymentAttempt | null;
  fulfillment: FulfillmentStatus;
  isSample?: boolean;
}

export interface CheckoutResult {
  checkoutUrl: string;
  paymentAttemptId: string;
  mode: PaymentMode;
}

/* ---------- decision ---------- */
export interface DecisionInput {
  decision: "APPROVE" | "REJECT";
  termsHash: string;
  role: ApprovalRole;
}

/* ---------- quote / restock inputs ---------- */
export interface RestockInput {
  poolId: string;
  merchantId: string;
  independentQty: number;
  allocatedStockToBuyers: number;
}

export interface QuoteInput {
  poolId: string;
  /** Omit in real mode: the server derives the supplier from the caller's auth. */
  supplierId?: string;
  quotedBy: string;
  minQty: number;
  availableQty: number;
  unitPriceMinor: number;
  freightTotalMinor: number;
  otherCostsMinor: number;
  taxBasis: string;
  leadTimeDays: number;
  expiresAt: string;
}

/* ---------- UI status vocabulary ---------- */
/**
 * One word per real situation. These must never collapse into a generic "Success".
 * (START_HERE.md lists OPEN/QUOTED/NO_DEAL/PENDING_APPROVAL/PAYMENT_PENDING/PAID/FAILED; the execution plan lists
 *  QUOTE_PENDING/AWAITING_APPROVAL/PAID_UAT/PAID_LIVE. This is the union of both — PAID is always split by mode.)
 */
export type UiStatus =
  | "OPEN"
  | "QUOTE_PENDING"
  | "QUOTED"
  | "AWAITING_APPROVAL"
  | "OFFER_READY"
  | "NO_DEAL"
  | "BLOCKED"
  | "PAYMENT_PENDING"
  | "PAID_UAT"
  | "PAID_LIVE"
  | "FAILED"
  | "EXPIRED"
  | "CLOSED"
  | "AGENT_ERROR";
