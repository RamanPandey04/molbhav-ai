import { describe, expect, it } from 'vitest';
import { aggregateDemand } from './aggregation';

const future = '2026-11-01T00:00:00Z';
const past = '2026-10-01T00:00:00Z';
const now = new Date('2026-10-24T00:00:00Z');

describe('aggregateDemand', () => {
  it('subtracts allocated stock once per merchant and adds independent restock once', () => {
    const result = aggregateDemand([
      { merchantId: 'a', quantity: 10, allocatedExistingStock: 3, status: 'ACTIVE', expiresAt: future },
      { merchantId: 'a', quantity: 5, allocatedExistingStock: 2, status: 'ACTIVE', expiresAt: future },
      { merchantId: 'b', quantity: 7, allocatedExistingStock: 0, status: 'ACTIVE', expiresAt: future },
    ], [
      { merchantId: 'a', quantity: 4, status: 'ACTIVE', expiresAt: future },
      { merchantId: 'b', quantity: 2, status: 'ACTIVE', expiresAt: future },
    ], now);
    expect(result).toEqual({ merchants: [
      { merchantId: 'a', consumerNeeded: 10, independentRestock: 4, merchantProcurement: 14 },
      { merchantId: 'b', consumerNeeded: 7, independentRestock: 2, merchantProcurement: 9 },
    ], poolQuantity: 23 });
  });
  it('excludes expired and cancelled requests and floors shortfall at zero', () => {
    expect(aggregateDemand([
      { merchantId: 'a', quantity: 4, allocatedExistingStock: 4, status: 'ACTIVE', expiresAt: future },
      { merchantId: 'a', quantity: 9, allocatedExistingStock: 0, status: 'ACTIVE', expiresAt: past },
      { merchantId: 'a', quantity: 8, allocatedExistingStock: 0, status: 'CANCELLED', expiresAt: future },
    ], [{ merchantId: 'a', quantity: 3, status: 'ACTIVE', expiresAt: future }], now).poolQuantity).toBe(3);
  });
});
