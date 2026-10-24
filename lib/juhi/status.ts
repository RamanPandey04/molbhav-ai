import type { DemandReservation, ManualPayment, PoolDetail, UiStatus } from "@/lib/juhi/types";
import { isExpired } from "@/lib/juhi/format";

export type Tone = "ink" | "sign" | "turmeric" | "leaf" | "stamp";

export const STATUS_META: Record<UiStatus, { label: string; tone: Tone; plain: string }> = {
  OPEN: { label: "Open", tone: "sign", plain: "Collecting requests." },
  QUOTE_PENDING: { label: "Quote pending", tone: "turmeric", plain: "Waiting for a supplier quote." },
  QUOTED: { label: "Quote received", tone: "sign", plain: "Quote in. Not a deal yet." },
  AWAITING_APPROVAL: { label: "Awaiting approval", tone: "turmeric", plain: "Waiting for approvals." },
  OFFER_READY: { label: "Offer ready", tone: "leaf", plain: "Ready for the buyer." },
  NO_DEAL: { label: "No deal", tone: "ink", plain: "Numbers don't work. No charge." },
  BLOCKED: { label: "Blocked", tone: "stamp", plain: "Missing info. Agent stopped." },
  PAYMENT_PENDING: { label: "Payment pending", tone: "turmeric", plain: "Not paid yet." },
  PAID_UAT: { label: "Test payment verified", tone: "turmeric", plain: "Test only. No real money moved." },
  PAID_LIVE: { label: "Payment verified", tone: "leaf", plain: "Confirmed by the server." },
  FAILED: { label: "Payment failed", tone: "stamp", plain: "Nothing was charged." },
  EXPIRED: { label: "Expired", tone: "ink", plain: "Time's up." },
  CLOSED: { label: "Closed", tone: "ink", plain: "Closed." },
  AGENT_ERROR: { label: "Agent error", tone: "stamp", plain: "Nothing was proposed." },
  REPORTED: { label: "Payment reported", tone: "turmeric", plain: "You said you paid. No reference yet. Not verified." },
  PENDING_VERIFICATION: { label: "Awaiting manual check", tone: "turmeric", plain: "Reference received. A person still has to check it." },
  MANUALLY_CONFIRMED: { label: "Manually confirmed", tone: "leaf", plain: "A person matched your UPI receipt. Not a gateway payment." },
  PAYMENT_REJECTED: { label: "Report rejected", tone: "stamp", plain: "The payment report didn't match." },
};

export function poolStatus(pool: PoolDetail): UiStatus {
  if (pool.status === "EXPIRED" || isExpired(pool.expiresAt)) return "EXPIRED";
  if (pool.status === "REJECTED") return "NO_DEAL";
  if (pool.status === "CLOSED") return "CLOSED";
  if (pool.proposal?.status === "INVALIDATED" || pool.proposal?.status === "EXPIRED") return "QUOTED";
  if (pool.proposal?.status === "AWAITING_APPROVAL") return "AWAITING_APPROVAL";
  if (pool.proposal?.status === "APPROVED") return "OFFER_READY";
  if (pool.status === "PROPOSED") return "AWAITING_APPROVAL";
  if (pool.status === "APPROVED" || pool.status === "LOCKED") return "OFFER_READY";
  if (pool.quotes.length > 0) return "QUOTED";
  return pool.minimumOrderQty != null && pool.eligibleProcurementQty >= pool.minimumOrderQty ? "QUOTE_PENDING" : "OPEN";
}

export function demandStatus(d: DemandReservation, pool?: PoolDetail | null): UiStatus {
  switch (d.status) {
    case "PAYMENT_PENDING":
      return "PAYMENT_PENDING";
    case "PAID":
    case "FULFILLED":
      return "CLOSED"; // payment state comes only from manual payment reports
    case "FAILED":
      return "FAILED";
    case "EXPIRED":
    case "CANCELLED":
      return "EXPIRED";
    case "OFFERED":
    case "ACCEPTED":
      return "OFFER_READY";
    default:
      return pool ? poolStatus(pool) : "OPEN";
  }
}

/** Manual PhonePe report → UI status. Never shows a gateway-paid state. */
export function manualPaymentStatus(p: Pick<ManualPayment, "status">): UiStatus {
  switch (p.status) {
    case "PENDING_VERIFICATION": return "PENDING_VERIFICATION";
    case "MANUALLY_CONFIRMED": return "MANUALLY_CONFIRMED";
    case "REJECTED": return "PAYMENT_REJECTED";
    default: return "REPORTED";
  }
}

/** Plain-language versions of backend reason codes. Unknown codes are shown as-is rather than hidden. */
export const REASON_TEXT: Record<string, string> = {
  MOQ_MET: "Pool meets the supplier minimum",
  MOQ_NOT_MET: "Pool is below the supplier minimum",
  POTENTIAL_SAVINGS_POSITIVE: "Landed cost is below the usual cost",
  NEGATIVE_SAVINGS: "Landed cost is higher than the usual cost",
  QUOTE_EXPIRED: "Quote has expired",
  SKU_MISMATCH: "Quote is for a different product or pack size",
  NO_AUTHENTIC_QUOTE: "No real supplier quote on file",
  BUYER_CAP_EXCEEDED: "Offer is above a buyer's price limit",
  MARGIN_BELOW_FLOOR: "Kirana margin would be too low",
  POOL_SNAPSHOT_STALE: "Pool changed after the run started",
  APPROVAL_REQUIRED: "Needs human approval",
  NO_ELIGIBLE_DEMAND: "No eligible demand in the pool",
  NO_SUPPLIER_QUOTE: "No supplier quote on file",
  NO_NET_SAVINGS: "No saving over the usual cost",
  MISSING_BASELINE: "Usual price not on file for a kirana",
};
