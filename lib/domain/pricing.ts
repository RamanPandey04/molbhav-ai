import { aggregateDemand } from './aggregation';
import type { AgentDecision } from '@/lib/shared/types';

export type PricingDemand = { id: string; buyer_id: string; merchant_id: string; quantity: number; allocated_existing_stock: number; max_unit_price_paise: number | null; delivery_deadline: string | null; fulfillment_terms: string; status: string; expires_at: string };
export type PricingRestock = { id: string; merchant_id: string; quantity: number; needed_by: string | null; status: string; expires_at: string };
export type PricingMerchant = { id: string; owner_id: string; active: boolean };
export type PricingTerms = { merchant_id: string; baseline_unit_paise: number; consumer_unit_paise: number; minimum_margin_paise: number };
export type PricingQuote = { id: string; supplier_id: string; exact_sku_id: string; min_order_quantity: number; max_available_quantity: number; quoted_unit_price_paise: number; freight_paise: number; handling_paise: number; delivery_deadline: string; expires_at: string; status: string; version: number };
export type ReasonCode = 'MOQ_NOT_MET' | 'SUPPLIER_STOCK_INSUFFICIENT' | 'QUOTE_EXPIRED' | 'DELIVERY_TOO_LATE' | 'NO_NET_SAVINGS' | 'BUYER_BUDGET_EXCEEDED' | 'RETAILER_MARGIN_TOO_LOW' | 'APPROVAL_REQUIRED' | 'MISSING_BASELINE' | 'MISSING_BUYER_TERMS' | 'MISSING_DELIVERY_TERMS' | 'NO_ELIGIBLE_DEMAND' | 'NO_SUPPLIER_QUOTE' | 'FINANCIAL_OVERFLOW';
export type QuoteComparison = { quoteId: string; reasonCodes: ReasonCode[]; landedTotalPaise: number | null; savingsPaise: number | null };
export type PricingResult = { decision: AgentDecision; reasonCodes: ReasonCode[]; quantity: number; selectedQuoteId: string | null; comparisons: QuoteComparison[]; snapshot: Record<string, unknown> | null };

const paise = (value: number) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid integer paise');
  return BigInt(value);
};
const safe = (value: bigint) => {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error('Financial overflow');
  return Number(value);
};

function allocateFixed(total: bigint, rows: { merchantId: string; quantity: number }[], quantity: number) {
  let remainder = total;
  return rows.map((row, index) => {
    const share = index === rows.length - 1 ? remainder : total * BigInt(row.quantity) / BigInt(quantity);
    remainder -= share;
    return { merchantId: row.merchantId, share };
  });
}

export function evaluatePricing(input: {
  poolId: string; poolVersion: number; productId: string; merchants: PricingMerchant[];
  demands: PricingDemand[]; restocks: PricingRestock[]; terms: PricingTerms[]; quotes: PricingQuote[];
  now?: Date;
}): PricingResult {
  const now = input.now ?? new Date();
  const activeMerchants = input.merchants.filter(m => m.active).sort((a,b) => a.id.localeCompare(b.id));
  const merchantIds = new Set(activeMerchants.map(m => m.id));
  const demands = input.demands.filter(d => merchantIds.has(d.merchant_id) && d.status === 'ACTIVE' && Date.parse(d.expires_at) > now.getTime());
  const restocks = input.restocks.filter(r => merchantIds.has(r.merchant_id) && r.status === 'ACTIVE' && Date.parse(r.expires_at) > now.getTime());
  const aggregate = aggregateDemand(
    demands.map(d => ({ merchantId: d.merchant_id, quantity: d.quantity, allocatedExistingStock: d.allocated_existing_stock, status: d.status, expiresAt: d.expires_at })),
    restocks.map(r => ({ merchantId: r.merchant_id, quantity: r.quantity, status: r.status, expiresAt: r.expires_at })), now);
  const quantity = aggregate.poolQuantity;
  const blocked = (reason: ReasonCode): PricingResult => ({ decision: 'BLOCKED', reasonCodes: [reason], quantity, selectedQuoteId: null, comparisons: [], snapshot: null });
  if (quantity === 0) return { decision: 'NO_DEAL', reasonCodes: ['NO_ELIGIBLE_DEMAND'], quantity, selectedQuoteId: null, comparisons: [], snapshot: null };
  const participating = aggregate.merchants.filter(m => m.merchantProcurement > 0);
  const terms = new Map(input.terms.map(t => [t.merchant_id,t]));
  if (participating.some(m => !terms.has(m.merchantId))) return blocked('MISSING_BASELINE');
  if (demands.some(d => d.max_unit_price_paise === null)) return blocked('MISSING_BUYER_TERMS');
  if (demands.some(d => !d.delivery_deadline) || restocks.some(r => !r.needed_by)) return blocked('MISSING_DELIVERY_TERMS');
  if (!input.quotes.length) return { decision: 'NO_DEAL', reasonCodes: ['NO_SUPPLIER_QUOTE'], quantity, selectedQuoteId: null, comparisons: [], snapshot: null };

  const buyerIds = [...new Set(demands.map(d => d.buyer_id))].sort();
  const merchantOwnerIds = [...new Set(activeMerchants.filter(m => participating.some(p => p.merchantId === m.id)).map(m => m.owner_id))].sort();
  const deadline = Math.min(...demands.map(d => Date.parse(d.delivery_deadline!)), ...restocks.map(r => Date.parse(r.needed_by!)));
  let baselineTotal: bigint;
  try { baselineTotal = participating.reduce((sum,m) => sum + paise(terms.get(m.merchantId)!.baseline_unit_paise) * BigInt(m.merchantProcurement),0n); }
  catch { return blocked('FINANCIAL_OVERFLOW'); }

  const comparisons: QuoteComparison[] = [];
  const viable: { quote: PricingQuote; landed: bigint; savings: bigint; allocation: { merchantId: string; fixedPaise: number; landedPaise: number; consumerUnitPricePaise: number; baselineUnitPaise: number; minimumMarginPaise: number }[] }[] = [];
  for (const q of [...input.quotes].sort((a,b) => a.id.localeCompare(b.id))) {
    const reasons: ReasonCode[] = [];
    if (q.expires_at && (Date.parse(q.expires_at) <= now.getTime() || q.status === 'EXPIRED' || q.status === 'REJECTED')) reasons.push('QUOTE_EXPIRED');
    if (quantity < q.min_order_quantity) reasons.push('MOQ_NOT_MET');
    if (quantity > q.max_available_quantity) reasons.push('SUPPLIER_STOCK_INSUFFICIENT');
    if (Date.parse(q.delivery_deadline) > deadline) reasons.push('DELIVERY_TOO_LATE');
    try {
      const unit = paise(q.quoted_unit_price_paise);
      const fixed = paise(q.freight_paise) + paise(q.handling_paise);
      const landed = unit * BigInt(quantity) + fixed;
      const savings = baselineTotal - landed;
      if (savings <= 0n) reasons.push('NO_NET_SAVINGS');
      const shares = allocateFixed(fixed,participating.map(m => ({ merchantId: m.merchantId, quantity: m.merchantProcurement })),quantity);
      const allocation = participating.map((m,index) => {
        const t = terms.get(m.merchantId)!;
        const total = unit * BigInt(m.merchantProcurement) + shares[index].share;
        const consumerCost = m.merchantProcurement ? total * BigInt(m.consumerNeeded) / BigInt(m.merchantProcurement) : 0n;
        const allocatedStock = demands.filter(d => d.merchant_id === m.merchantId).reduce((sum,d) => sum + d.allocated_existing_stock,0);
        const consumerDemand = demands.filter(d => d.merchant_id === m.merchantId).reduce((sum,d) => sum + d.quantity,0);
        const margin = paise(t.consumer_unit_paise) * BigInt(consumerDemand) - consumerCost - paise(t.baseline_unit_paise) * BigInt(allocatedStock);
        if (margin < paise(t.minimum_margin_paise) * BigInt(consumerDemand)) reasons.push('RETAILER_MARGIN_TOO_LOW');
        if (demands.some(d => d.merchant_id === m.merchantId && t.consumer_unit_paise > d.max_unit_price_paise!)) reasons.push('BUYER_BUDGET_EXCEEDED');
        return { merchantId: m.merchantId, fixedPaise: safe(shares[index].share), landedPaise: safe(total), consumerUnitPricePaise: t.consumer_unit_paise, baselineUnitPaise: t.baseline_unit_paise, minimumMarginPaise: t.minimum_margin_paise };
      });
      comparisons.push({ quoteId: q.id, reasonCodes: [...new Set(reasons)], landedTotalPaise: safe(landed), savingsPaise: safe(savings) });
      if (!reasons.length) viable.push({ quote:q,landed,savings,allocation });
    } catch { comparisons.push({ quoteId: q.id, reasonCodes: [...new Set([...reasons,'FINANCIAL_OVERFLOW' as ReasonCode])], landedTotalPaise:null,savingsPaise:null }); }
  }
  viable.sort((a,b) => a.landed < b.landed ? -1 : a.landed > b.landed ? 1 : a.quote.id.localeCompare(b.quote.id));
  if (!viable.length) return { decision:'NO_DEAL',reasonCodes:[...new Set(comparisons.flatMap(c => c.reasonCodes))].sort(),quantity,selectedQuoteId:null,comparisons,snapshot:null };
  const best = viable[0];
  const snapshot = {
    poolId: input.poolId, poolVersion: input.poolVersion, productId: input.productId, quantity,
    quoteId: best.quote.id, quoteVersion: best.quote.version, supplierId: best.quote.supplier_id,
    exactSkuId: best.quote.exact_sku_id, quotedUnitPricePaise: best.quote.quoted_unit_price_paise,
    minOrderQuantity: best.quote.min_order_quantity, maxAvailableQuantity: best.quote.max_available_quantity,
    freightPaise: best.quote.freight_paise, handlingPaise: best.quote.handling_paise,
    landedTotalPaise: safe(best.landed), baselineTotalPaise: safe(baselineTotal), savingsPaise: safe(best.savings),
    deliveryDeadline: best.quote.delivery_deadline, quoteExpiresAt: best.quote.expires_at,
    merchantIds: participating.map(m => m.merchantId), merchantOwnerIds, buyerIds,
    merchantAllocations: best.allocation,
    buyerTerms: demands.map(d => ({ demandId:d.id,buyerId:d.buyer_id,merchantId:d.merchant_id,quantity:d.quantity,maxUnitPricePaise:d.max_unit_price_paise,deliveryDeadline:d.delivery_deadline,fulfillmentTerms:d.fulfillment_terms })).sort((a,b) => a.demandId.localeCompare(b.demandId)),
    restockTerms: restocks.map(r => ({ restockId:r.id,merchantId:r.merchant_id,quantity:r.quantity,neededBy:r.needed_by })).sort((a,b) => a.restockId.localeCompare(b.restockId)),
  };
  return { decision:'PROPOSE',reasonCodes:['APPROVAL_REQUIRED'],quantity,selectedQuoteId:best.quote.id,comparisons,snapshot };
}
