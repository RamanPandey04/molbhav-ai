import { describe, expect, it } from 'vitest';
import { evaluatePricing, type PricingQuote } from './pricing';

const now = new Date('2026-10-24T00:00:00Z');
const future = '2026-11-01T00:00:00Z';
const quote: PricingQuote = { id:'q1',supplier_id:'s1',exact_sku_id:'p1',min_order_quantity:10,max_available_quantity:100,quoted_unit_price_paise:80,freight_paise:7,handling_paise:4,delivery_deadline:future,expires_at:future,status:'SUBMITTED',version:1 };
const base = {
  poolId:'pool',poolVersion:1,productId:'p1',now,
  merchants:[{ id:'m1',owner_id:'u1',active:true },{ id:'m2',owner_id:'u2',active:true }],
  demands:[
    { id:'d1',buyer_id:'b1',merchant_id:'m1',quantity:7,allocated_existing_stock:2,max_unit_price_paise:130,delivery_deadline:future,fulfillment_terms:'PICKUP',status:'ACTIVE',expires_at:future },
    { id:'d2',buyer_id:'b2',merchant_id:'m2',quantity:5,allocated_existing_stock:0,max_unit_price_paise:130,delivery_deadline:future,fulfillment_terms:'DELIVERY',status:'ACTIVE',expires_at:future },
  ],
  restocks:[{ id:'r1',merchant_id:'m1',quantity:3,needed_by:future,status:'ACTIVE',expires_at:future }],
  terms:[{ merchant_id:'m1',baseline_unit_paise:110,consumer_unit_paise:130,minimum_margin_paise:5 },{ merchant_id:'m2',baseline_unit_paise:110,consumer_unit_paise:130,minimum_margin_paise:5 }],
  quotes:[quote],
};

describe('evaluatePricing', () => {
  it('uses one procurement quantity and reconciles fixed cost allocations', () => {
    const result = evaluatePricing(base);
    expect(result.decision).toBe('PROPOSE');
    expect(result.quantity).toBe(13);
    const snapshot = result.snapshot!;
    expect(snapshot.landedTotalPaise).toBe(1051);
    const allocations = snapshot.merchantAllocations as { fixedPaise:number; landedPaise:number }[];
    expect(allocations.reduce((sum,a) => sum+a.fixedPaise,0)).toBe(11);
    expect(allocations.reduce((sum,a) => sum+a.landedPaise,0)).toBe(1051);
    expect(snapshot.savingsPaise).toBe(379);
  });
  it('returns NO_DEAL when MOQ is not met', () => {
    expect(evaluatePricing({ ...base,quotes:[{ ...quote,min_order_quantity:14 }] }).reasonCodes).toContain('MOQ_NOT_MET');
  });
  it('returns NO_DEAL for negative savings', () => {
    expect(evaluatePricing({ ...base,quotes:[{ ...quote,quoted_unit_price_paise:120 }] }).reasonCodes).toContain('NO_NET_SAVINGS');
  });
  it('checks stock, delivery, buyer budget, and retailer margin', () => {
    expect(evaluatePricing({ ...base,quotes:[{ ...quote,max_available_quantity:12 }] }).reasonCodes).toContain('SUPPLIER_STOCK_INSUFFICIENT');
    expect(evaluatePricing({ ...base,quotes:[{ ...quote,delivery_deadline:'2026-11-02T00:00:00Z' }] }).reasonCodes).toContain('DELIVERY_TOO_LATE');
    expect(evaluatePricing({ ...base,demands:[{ ...base.demands[0],max_unit_price_paise:100 },base.demands[1]] }).reasonCodes).toContain('BUYER_BUDGET_EXCEEDED');
    expect(evaluatePricing({ ...base,terms:[{ ...base.terms[0],minimum_margin_paise:100 },base.terms[1]] }).reasonCodes).toContain('RETAILER_MARGIN_TOO_LOW');
  });
  it('excludes expired demand and restock', () => {
    const result = evaluatePricing({ ...base,demands:[{ ...base.demands[0],expires_at:'2026-10-01T00:00:00Z' },base.demands[1]],restocks:[{ ...base.restocks[0],expires_at:'2026-10-01T00:00:00Z' }] });
    expect(result.quantity).toBe(5);
    expect(result.reasonCodes).toContain('MOQ_NOT_MET');
  });
});
