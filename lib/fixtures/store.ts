/**
 * SAMPLE / DEVELOPMENT DATA ONLY.
 * Everything in this file is invented so the UI can be built before Raman's APIs exist.
 * Every record carries `isSample: true` or a "SAMPLE" prefix, and the UI shows a permanent banner while this is active.
 * None of it may ever be shown, screenshotted or counted as traction, quotes, agent runs or payments.
 */
import type {
  AgentRun,
  Approval,
  ApprovalRole,
  DecisionInput,
  DemandReservation,
  CreateDemandInput,
  Order,
  PoolDetail,
  Proposal,
  QuoteInput,
  RestockInput,
  SupplierQuote,
  TimelineEvent,
  CheckoutResult,
} from "@/lib/shared/types";

export type Scenario =
  | "open_below_moq"
  | "quoted_ready"
  | "no_deal"
  | "agent_error"
  | "approved"
  | "payment_pending"
  | "paid_uat"
  | "payment_failed";

export const SCENARIOS: { id: Scenario; label: string; hint: string }[] = [
  { id: "open_below_moq", label: "Open, no quote yet", hint: "Pool below MOQ, no supplier quote. Agent run → BLOCKED." },
  { id: "quoted_ready", label: "Quoted, ready for agent", hint: "MOQ met, quote on file. Agent run → PROPOSE, then approvals." },
  { id: "no_deal", label: "Quote on file, MOQ not met", hint: "Agent run → NO_DEAL with reason codes." },
  { id: "agent_error", label: "Agent provider error", hint: "Agent run fails midway. Shows an honest error." },
  { id: "approved", label: "Supplier + kirana approved", hint: "Buyer can review final terms and pay." },
  { id: "payment_pending", label: "Payment pending", hint: "Redirect came back; backend has not verified yet." },
  { id: "paid_uat", label: "Paid (UAT test)", hint: "Backend-verified test payment. Labelled UAT." },
  { id: "payment_failed", label: "Payment failed", hint: "Provider declined." },
];

interface FixtureState {
  scenario: Scenario;
  pool: PoolDetail;
  demand: DemandReservation | null;
  runs: Record<string, AgentRun & { _startedMs: number; _steps: { at: number; ev: Omit<TimelineEvent, "occurredAt"> }[] }>;
  order: (Order & { _createdMs: number }) | null;
}

const KEY = "molbhav.fixtures.v1";
const minutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

const PRODUCT = {
  id: "sample-sku",
  brand: "SAMPLE BRAND",
  name: "Dish-wash bar",
  sku: "SAMPLE-DWB-250",
  packSize: "250 g bar",
  unit: "bar",
  retailBaselineMinor: 3000,
};

function quote(): SupplierQuote {
  return {
    quoteId: "sample-quote-1",
    supplierId: "sample-supplier",
    supplierName: "SAMPLE Distributor (not a real supplier)",
    quotedBy: "Sample Person",
    skuId: PRODUCT.id,
    minQty: 50,
    availableQty: 200,
    unitPriceMinor: 1700,
    freightTotalMinor: 30000,
    otherCostsMinor: 0,
    taxBasis: "SAMPLE: GST invoice, tax included",
    leadTimeDays: 2,
    expiresAt: minutes(60 * 36),
    status: "SUBMITTED",
  };
}

function approvals(statuses: [string, string, string]): Approval[] {
  const roles: ApprovalRole[] = ["SUPPLIER", "KIRANA", "BUYER"];
  const names = ["Sample Person (supplier)", "Sample Person (kirana)", "Sample Person (buyer)"];
  return roles.map((role, i) => ({
    approvalId: `sample-appr-${role.toLowerCase()}`,
    role,
    status: statuses[i] as Approval["status"],
    actorName: statuses[i] === "APPROVED" ? names[i] : null,
    decidedAt: statuses[i] === "APPROVED" ? minutes(-20 + i * 5) : null,
  }));
}

function proposal(status: Proposal["status"], appr: Approval[]): Proposal {
  return {
    proposalId: "sample-proposal-1",
    poolId: "sample-pool",
    quoteId: "sample-quote-1",
    version: 1,
    status,
    pooledQty: 56,
    landedTotalMinor: 125200,
    baselineTotalMinor: 134400,
    estimatedSavingsMinor: 9200,
    proposedCustomerPriceMinor: 2600,
    rationale:
      "SAMPLE rationale: the pool meets the supplier's 50-unit minimum, and landed cost after freight is lower than the kirana's usual distributor cost. The kirana decides what share of the saving reaches buyers.",
    termsHash: "sample-terms-hash-v1",
    approvals: appr,
    invalidatedReason: null,
  };
}

function demand(status: DemandReservation["status"], withOffer: boolean, qty = 4): DemandReservation {
  return {
    demandId: "sample-demand-1",
    reservationCode: "SAMPLE-4F2K",
    poolId: "sample-pool",
    productId: PRODUCT.id,
    merchantId: "sample-kirana",
    qty,
    maxPriceMinor: 2800,
    status,
    createdAt: minutes(-90),
    expiresAt: minutes(60 * 70),
    finalOffer: withOffer
      ? {
          proposalId: "sample-proposal-1",
          termsHash: "sample-terms-hash-v1",
          unitPriceMinor: 2600,
          totalMinor: 2600 * qty,
          pickupWindowEnd: minutes(60 * 72),
          pickupMerchantName: "SAMPLE Kirana (not a real shop)",
        }
      : null,
    paymentMode: null,
    orderId: null,
    isSample: true,
  };
}

function completedPropose(status: AgentRun["status"] = "COMPLETED"): AgentRun & { _startedMs: number; _steps: never[] } {
  const t = (m: number): string => minutes(m);
  return {
    providerRunId: "SAMPLE-run-0001",
    poolId: "sample-pool",
    poolVersion: 4,
    status,
    decision: "PROPOSE",
    reasonCodes: ["MOQ_MET", "POTENTIAL_SAVINGS_POSITIVE"],
    evaluatedQuoteId: "sample-quote-1",
    proposalId: "sample-proposal-1",
    summary: "SAMPLE: An offer is feasible if the supplier accepts the quoted tier.",
    errorMessage: null,
    isVerifiedRealRevenue: false,
    startedAt: t(-60),
    isSample: true,
    timeline: [
      { type: "RUN_STARTED", summary: "Run started by admin", occurredAt: t(-60) },
      { type: "TOOL_CALLED", name: "get_pool_context", occurredAt: t(-60) },
      { type: "TOOL_CALLED", name: "get_supplier_quotes", occurredAt: t(-59) },
      { type: "TOOL_CALLED", name: "evaluate_deal", summary: "MOQ met: 56 of 50. Estimated saving ₹92.", occurredAt: t(-59) },
      { type: "DECISION", summary: "PROPOSE", occurredAt: t(-58) },
      { type: "APPROVAL_REQUESTED", role: "SUPPLIER", occurredAt: t(-58) },
      { type: "APPROVAL_RECORDED", role: "SUPPLIER", summary: "Approved", occurredAt: t(-30) },
    ],
    _startedMs: Date.now() - 3_600_000,
    _steps: [],
  };
}

function build(scenario: Scenario): FixtureState {
  const q = quote();
  const base: PoolDetail = {
    poolId: "sample-pool",
    zoneId: "sample-zone",
    skuId: PRODUCT.id,
    buyerDemandQty: 38,
    independentRestockQty: 24,
    inventoryAllocatedQty: 6,
    eligibleProcurementQty: 56,
    minimumOrderQty: 50,
    expiresAt: minutes(60 * 72),
    status: "QUOTED",
    version: 4,
    product: PRODUCT,
    merchant: {
      id: "sample-kirana",
      name: "SAMPLE Kirana (not a real shop)",
      zoneName: "SAMPLE Locality",
      verified: false,
      pickupWindowEnd: minutes(60 * 72),
    },
    restock: { independentQty: 24, allocatedStockToBuyers: 6, confirmedBy: "Sample Person", confirmedAt: minutes(-120) },
    quotes: [q],
    proposal: null,
    latestAgentRunId: null,
    estimatedUnitPriceMinor: 2600,
    isSample: true,
  };
  const state: FixtureState = { scenario, pool: base, demand: demand("RESERVED", false), runs: {}, order: null };

  switch (scenario) {
    case "open_below_moq":
      Object.assign(state.pool, {
        buyerDemandQty: 22, independentRestockQty: 18, inventoryAllocatedQty: 4, eligibleProcurementQty: 36,
        status: "OPEN", quotes: [], estimatedUnitPriceMinor: null,
        restock: { independentQty: 18, allocatedStockToBuyers: 4, confirmedBy: "Sample Person", confirmedAt: minutes(-120) },
      });
      break;
    case "no_deal":
      Object.assign(state.pool, {
        buyerDemandQty: 30, independentRestockQty: 16, inventoryAllocatedQty: 5, eligibleProcurementQty: 41,
        restock: { independentQty: 16, allocatedStockToBuyers: 5, confirmedBy: "Sample Person", confirmedAt: minutes(-120) },
      });
      break;
    case "approved":
    case "payment_pending":
    case "paid_uat":
    case "payment_failed": {
      const p = proposal("APPROVED", approvals(["APPROVED", "APPROVED", "PENDING"]));
      state.pool.proposal = p;
      state.pool.status = "APPROVED";
      state.pool.latestAgentRunId = "SAMPLE-run-0001";
      state.runs["SAMPLE-run-0001"] = completedPropose();
      state.demand = demand("OFFERED", true);
      if (scenario !== "approved") {
        const status = scenario === "payment_pending" ? "PENDING" : scenario === "paid_uat" ? "VERIFIED_PAID" : "FAILED";
        state.demand = demand(scenario === "paid_uat" ? "PAID" : scenario === "payment_failed" ? "FAILED" : "PAYMENT_PENDING", true);
        p.approvals[2] = { ...p.approvals[2], status: "APPROVED", actorName: "Sample Person (buyer)", decidedAt: minutes(-10) };
        state.order = {
          orderId: "SAMPLE-order-1",
          demandId: "sample-demand-1",
          proposalId: p.proposalId,
          qty: 4,
          unitPriceMinor: 2600,
          amountMinor: 10400,
          pickupMerchantName: "SAMPLE Kirana (not a real shop)",
          pickupWindowEnd: minutes(60 * 72),
          fulfillment: "NOT_STARTED",
          isSample: true,
          _createdMs: Date.now() - 600_000, // already settled in these scenarios
          payment: {
            paymentAttemptId: "sample-pay-1",
            merchantOrderId: "SAMPLE-MO-1",
            providerReference: status === "PENDING" ? null : "SAMPLE-PL-REF-1",
            mode: "UAT",
            status,
            verifiedAt: status === "VERIFIED_PAID" ? minutes(-5) : null,
            failureReason: status === "FAILED" ? "Sample: card declined by issuer." : null,
          },
        };
      }
      break;
    }
    case "agent_error":
    case "quoted_ready":
      break;
  }
  return state;
}

/* ------------------------------------------------------------------ */
let mem: FixtureState | null = null;

function load(): FixtureState {
  if (mem) return mem;
  try {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem(KEY) : null;
    if (raw) {
      mem = JSON.parse(raw) as FixtureState;
      return mem;
    }
  } catch {
    /* storage unavailable: fall through to a fresh state */
  }
  mem = build("quoted_ready");
  return mem;
}
function save() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(mem));
  } catch {
    /* in-memory only */
  }
}

export function getScenario(): Scenario {
  return load().scenario;
}
export function setScenario(s: Scenario) {
  mem = build(s);
  save();
}

const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export class FixtureFailure extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

function recompute(s: FixtureState) {
  const p = s.pool;
  const c = p.buyerDemandQty;
  const a = Math.min(p.inventoryAllocatedQty, c);
  p.eligibleProcurementQty = Math.max(0, c - a) + p.independentRestockQty;
  p.version += 1;
}

export const fixtureApi = {
  async getPool(_id: string): Promise<PoolDetail> {
    await wait();
    return clone(load().pool);
  },

  async getDemand(_id: string): Promise<DemandReservation> {
    await wait();
    const d = load().demand;
    if (!d) throw new FixtureFailure("NOT_FOUND", "We couldn't find this reservation.");
    // In payment scenarios the offer is attached; otherwise reflect the live proposal.
    return clone(d);
  },

  async createDemand(input: CreateDemandInput): Promise<DemandReservation> {
    await wait(600);
    const s = load();
    const d = demand("RESERVED", false, input.qty);
    d.demandId = "sample-demand-" + Math.random().toString(36).slice(2, 7);
    d.reservationCode = "SAMPLE-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    d.maxPriceMinor = input.maxPriceMinor;
    d.createdAt = new Date().toISOString();
    s.demand = d;
    s.pool.buyerDemandQty += input.qty;
    recompute(s);
    save();
    return clone(d);
  },

  async saveRestock(input: RestockInput): Promise<PoolDetail> {
    await wait();
    const s = load();
    if (input.allocatedStockToBuyers > s.pool.buyerDemandQty)
      throw new FixtureFailure("ALLOCATION_TOO_HIGH", "Allocated stock can't exceed the buyer reservations (" + s.pool.buyerDemandQty + ").");
    s.pool.independentRestockQty = input.independentQty;
    s.pool.inventoryAllocatedQty = input.allocatedStockToBuyers;
    s.pool.restock = {
      independentQty: input.independentQty,
      allocatedStockToBuyers: input.allocatedStockToBuyers,
      confirmedBy: "Sample Person",
      confirmedAt: new Date().toISOString(),
    };
    recompute(s);
    save();
    return clone(s.pool);
  },

  async submitQuote(input: QuoteInput): Promise<SupplierQuote> {
    await wait();
    const s = load();
    const q: SupplierQuote = {
      quoteId: "sample-quote-" + Math.random().toString(36).slice(2, 6),
      supplierId: input.supplierId ?? "sample-supplier",
      supplierName: "SAMPLE Distributor (not a real supplier)",
      quotedBy: input.quotedBy,
      skuId: s.pool.skuId,
      minQty: input.minQty,
      availableQty: input.availableQty,
      unitPriceMinor: input.unitPriceMinor,
      freightTotalMinor: input.freightTotalMinor,
      otherCostsMinor: input.otherCostsMinor,
      taxBasis: input.taxBasis,
      leadTimeDays: input.leadTimeDays,
      expiresAt: input.expiresAt,
      status: "SUBMITTED",
    };
    s.pool.quotes = [q];
    s.pool.status = "QUOTED";
    if (s.pool.proposal) s.pool.proposal = { ...s.pool.proposal, status: "INVALIDATED", invalidatedReason: "The supplier changed the quote. Approvals were cleared." };
    recompute(s);
    save();
    return clone(q);
  },

  async startAgentRun(_poolId: string): Promise<AgentRun> {
    await wait(500);
    const s = load();
    const id = "SAMPLE-run-" + Math.random().toString(36).slice(2, 6);
    const now = Date.now();
    const pool = s.pool;
    const hasQuote = pool.quotes.length > 0;
    const moqMet = pool.eligibleProcurementQty >= pool.minimumOrderQty;
    const steps: { at: number; ev: Omit<TimelineEvent, "occurredAt"> }[] = [
      { at: 0, ev: { type: "RUN_STARTED", summary: "Run started by admin" } },
      { at: 500, ev: { type: "TOOL_CALLED", name: "get_pool_context", summary: `Pool v${pool.version}: ${pool.eligibleProcurementQty} eligible units.` } },
      { at: 1100, ev: { type: "TOOL_CALLED", name: "get_supplier_quotes", summary: hasQuote ? "1 quote on file." : "0 verified quotes." } },
    ];
    let decision: AgentRun["decision"] = "BLOCKED";
    let reasons: string[] = ["NO_AUTHENTIC_QUOTE"];
    let summary = "SAMPLE: No supplier quote on file, so there is nothing to evaluate. Ask the supplier for a real quote.";
    let err: string | null = null;
    let status: AgentRun["status"] = "COMPLETED";
    let proposalId: string | null = null;

    if (s.scenario === "agent_error") {
      steps.push({ at: 1700, ev: { type: "ERROR", name: "evaluate_deal", summary: "AgenticOrg returned 503 (sample)." } });
      status = "ERROR";
      decision = null;
      reasons = [];
      summary = "The run stopped before a decision.";
      err = "AgenticOrg returned 503 while calling evaluate_deal. This is a sample error. Nothing was proposed or changed.";
    } else if (hasQuote) {
      steps.push({
        at: 1700,
        ev: { type: "TOOL_CALLED", name: "evaluate_deal", summary: moqMet ? `MOQ met: ${pool.eligibleProcurementQty} of ${pool.minimumOrderQty}. Estimated saving ₹92.` : `MOQ not met: ${pool.eligibleProcurementQty} of ${pool.minimumOrderQty}.` },
      });
      if (moqMet) {
        decision = "PROPOSE";
        reasons = ["MOQ_MET", "POTENTIAL_SAVINGS_POSITIVE"];
        summary = "SAMPLE: An offer is feasible if the supplier accepts the quoted tier.";
        proposalId = "sample-proposal-1";
        steps.push({ at: 2300, ev: { type: "TOOL_CALLED", name: "create_deal_proposal", summary: "Proposal v1 saved." } });
        steps.push({ at: 2700, ev: { type: "DECISION", summary: "PROPOSE" } });
        steps.push({ at: 3000, ev: { type: "APPROVAL_REQUESTED", role: "SUPPLIER" } });
      } else {
        decision = "NO_DEAL";
        reasons = ["MOQ_NOT_MET"];
        summary = `SAMPLE: Pool is ${pool.minimumOrderQty - pool.eligibleProcurementQty} units short of the supplier minimum. No checkout was created.`;
        steps.push({ at: 2300, ev: { type: "DECISION", summary: "NO_DEAL" } });
      }
    } else {
      steps.push({ at: 1700, ev: { type: "DECISION", summary: "BLOCKED" } });
    }

    const run = {
      providerRunId: id,
      poolId: pool.poolId,
      poolVersion: pool.version,
      status: "RUNNING" as AgentRun["status"],
      decision: null as AgentRun["decision"],
      reasonCodes: [] as string[],
      evaluatedQuoteId: hasQuote ? pool.quotes[0].quoteId : null,
      proposalId: null as string | null,
      summary: "Running…",
      errorMessage: null as string | null,
      timeline: [] as TimelineEvent[],
      isVerifiedRealRevenue: false,
      startedAt: new Date(now).toISOString(),
      isSample: true,
      _startedMs: now,
      _steps: steps,
      // final values, applied once all steps have elapsed
      _final: { decision, reasons, summary, err, status, proposalId },
    };
    s.runs[id] = run as unknown as FixtureState["runs"][string];
    pool.latestAgentRunId = id;
    save();
    return clone(run) as AgentRun;
  },

  async getAgentRun(id: string): Promise<AgentRun> {
    await wait(250);
    const s = load();
    const r = s.runs[id] as unknown as (FixtureState["runs"][string] & { _final?: any }) | undefined;
    if (!r) throw new FixtureFailure("NOT_FOUND", "We couldn't find this agent run.");
    if (r._final) {
      const elapsed = Date.now() - r._startedMs;
      const visible = r._steps.filter((st) => st.at <= elapsed);
      r.timeline = visible.map((st) => ({ ...st.ev, occurredAt: new Date(r._startedMs + st.at).toISOString() }));
      if (visible.length === r._steps.length) {
        const f = r._final;
        r.status = f.status;
        r.decision = f.decision;
        r.reasonCodes = f.reasons;
        r.summary = f.summary;
        r.errorMessage = f.err;
        r.proposalId = f.proposalId;
        if (f.proposalId && !s.pool.proposal) {
          s.pool.proposal = proposal("AWAITING_APPROVAL", approvals(["PENDING", "PENDING", "PENDING"]));
          s.pool.status = "PROPOSED";
          s.demand = s.demand ? { ...s.demand, status: "RESERVED" } : s.demand;
        }
        delete r._final;
        save();
      }
    }
    return clone(r) as AgentRun;
  },

  async decide(proposalId: string, input: DecisionInput): Promise<Proposal> {
    await wait(500);
    const s = load();
    const p = s.pool.proposal;
    if (!p || p.proposalId !== proposalId) throw new FixtureFailure("NOT_FOUND", "We couldn't find this proposal.");
    if (p.status === "INVALIDATED") throw new FixtureFailure("PROPOSAL_INVALIDATED", "The terms changed. Ask for a new proposal.");
    if (input.termsHash !== p.termsHash) throw new FixtureFailure("TERMS_CHANGED", "The terms changed while you were reviewing. Reload to see the latest.");
    const a = p.approvals.find((x) => x.role === input.role);
    if (!a) throw new FixtureFailure("FORBIDDEN", "You can't decide on behalf of this role.");
    a.status = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
    a.actorName = "Sample Person";
    a.decidedAt = new Date().toISOString();
    const run = s.pool.latestAgentRunId ? s.runs[s.pool.latestAgentRunId] : null;
    if (run) run.timeline.push({ type: "APPROVAL_RECORDED", role: input.role, summary: a.status === "APPROVED" ? "Approved" : "Rejected", occurredAt: a.decidedAt });
    if (input.decision === "REJECT") {
      p.status = "REJECTED";
      s.pool.status = "REJECTED";
    } else if (p.approvals.filter((x) => x.role !== "BUYER").every((x) => x.status === "APPROVED")) {
      p.status = "APPROVED";
      s.pool.status = "APPROVED";
      if (s.demand) {
        s.demand = demand("OFFERED", true, s.demand.qty);
      }
    }
    save();
    return clone(p);
  },

  async createCheckout(proposalId: string, demandId: string): Promise<CheckoutResult> {
    await wait(700);
    const s = load();
    const d = s.demand;
    const p = s.pool.proposal;
    if (!d || !p || p.proposalId !== proposalId) throw new FixtureFailure("NOT_FOUND", "We couldn't find these terms.");
    if (p.status !== "APPROVED") throw new FixtureFailure("NOT_APPROVED", "Checkout opens only after supplier and kirana approve.");
    s.order = {
      orderId: "SAMPLE-order-" + Math.random().toString(36).slice(2, 6),
      demandId,
      proposalId,
      qty: d.qty,
      unitPriceMinor: p.proposedCustomerPriceMinor,
      amountMinor: d.qty * p.proposedCustomerPriceMinor,
      pickupMerchantName: s.pool.merchant.name,
      pickupWindowEnd: s.pool.merchant.pickupWindowEnd,
      fulfillment: "NOT_STARTED",
      isSample: true,
      _createdMs: Date.now(),
      payment: {
        paymentAttemptId: "sample-pay-" + Math.random().toString(36).slice(2, 6),
        merchantOrderId: "SAMPLE-MO-" + Math.random().toString(36).slice(2, 6),
        providerReference: null,
        mode: "UAT",
        status: "PENDING",
        verifiedAt: null,
        failureReason: null,
      },
    };
    s.demand = { ...d, status: "PAYMENT_PENDING", paymentMode: "UAT", orderId: s.order.orderId };
    save();
    return { checkoutUrl: `/orders/${s.order.orderId}?returned=1`, paymentAttemptId: s.order.payment!.paymentAttemptId, mode: "UAT" };
  },

  async getOrder(id: string): Promise<Order> {
    await wait(250);
    const s = load();
    const o = s.order;
    if (!o || o.orderId !== id) throw new FixtureFailure("NOT_FOUND", "We couldn't find this order.");
    // Simulate the backend webhook arriving ~6 s after checkout was created.
    if (o.payment?.status === "PENDING" && Date.now() - o._createdMs > 6000) {
      o.payment = { ...o.payment, status: "VERIFIED_PAID", providerReference: "SAMPLE-PL-REF-" + o.orderId.slice(-4), verifiedAt: new Date().toISOString() };
      if (s.demand) s.demand = { ...s.demand, status: "PAID" };
      save();
    }
    return clone(o);
  },
};
