import type { PoolSummary } from "@/lib/juhi/types";

/** Shows exactly how the eligible quantity is derived (ARCHITECTURE §5), so nobody has to trust a bare number. */
export function PoolLedger({ pool }: { pool: PoolSummary }) {
  const lines: { label: string; sub?: string; value: string; strong?: boolean }[] = [
    { label: "Buyer reservations", sub: "Neighbours who asked to join", value: String(pool.buyerDemandQty) },
    { label: "Stock the kirana already holds for them", sub: "Not bought again", value: `−${pool.inventoryAllocatedQty}` },
    { label: "Kirana's own restock", sub: "Counted separately, never double-counted", value: `+${pool.independentRestockQty}` },
    { label: "New units to buy", value: String(pool.eligibleProcurementQty), strong: true },
  ];
  return (
    <dl>
      {lines.map((l) => (
        <div key={l.label} className={`flex items-end justify-between gap-4 py-3 ${l.strong ? "border-t border-ink/20 pt-3.5" : "border-b border-paper-rule"}`}>
          <dt className={l.strong ? "font-bold" : ""}>
            {l.label}
            {l.sub && <span className="block text-sm text-ink-soft">{l.sub}</span>}
          </dt>
          <dd className={`tabular-nums ${l.strong ? "text-2xl font-bold" : "text-lg font-semibold"}`}>{l.value}</dd>
        </div>
      ))}
    </dl>
  );
}
