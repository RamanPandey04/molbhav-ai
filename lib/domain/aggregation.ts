export type MerchantDemand = { merchantId: string; quantity: number; allocatedExistingStock: number; status: string; expiresAt: string };
export type MerchantRestock = { merchantId: string; quantity: number; status: string; expiresAt: string };

export function aggregateDemand(demands: MerchantDemand[], restocks: MerchantRestock[], now: Date = new Date()) {
  const byMerchant = new Map<string, { eligibleConsumerDemand: number; allocatedExistingStock: number; independentRestock: number }>();
  const row = (id: string) => {
    if (!byMerchant.has(id)) byMerchant.set(id, { eligibleConsumerDemand: 0, allocatedExistingStock: 0, independentRestock: 0 });
    return byMerchant.get(id)!;
  };
  for (const d of demands) if (d.status === 'ACTIVE' && Date.parse(d.expiresAt) > now.getTime()) {
    row(d.merchantId).eligibleConsumerDemand += d.quantity;
    row(d.merchantId).allocatedExistingStock += d.allocatedExistingStock;
  }
  for (const r of restocks) if (r.status === 'ACTIVE' && Date.parse(r.expiresAt) > now.getTime()) {
    row(r.merchantId).independentRestock += r.quantity;
  }
  const merchants = [...byMerchant].sort(([a],[b]) => a.localeCompare(b)).map(([merchantId, v]) => ({
    merchantId, consumerNeeded: Math.max(0, v.eligibleConsumerDemand - v.allocatedExistingStock),
    independentRestock: v.independentRestock,
    merchantProcurement: Math.max(0, v.eligibleConsumerDemand - v.allocatedExistingStock) + v.independentRestock,
  }));
  return { merchants, poolQuantity: merchants.reduce((sum,m) => sum + m.merchantProcurement, 0) };
}
