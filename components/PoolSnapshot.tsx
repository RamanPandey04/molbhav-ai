import type { PoolDetail } from "@/lib/shared/types";
import { formatDateTime } from "@/lib/format";
import { poolStatus } from "@/lib/status";
import { PoolBar } from "@/components/PoolBar";
import { StatusStamp } from "@/components/ui";

/** The rate board: one big number everybody in the neighbourhood is adding to. */
export function PoolSnapshot({ pool }: { pool: PoolDetail }) {
  const q = pool.eligibleProcurementQty;
  const short = pool.minimumOrderQty - q;
  return (
    <div className="rounded-3xl bg-ink p-6 text-white">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-medium text-white/70">Pooled</p>
        <StatusStamp status={poolStatus(pool)} />
      </div>
      <p className="mt-1 flex items-end gap-3 leading-none">
        <span className="font-display text-[76px] leading-[0.9] text-turmeric tabular-nums" data-testid="pool-qty">{q}</span>
        <span className="pb-2 text-[17px] text-white/85">units</span>
      </p>
      <div className="mt-5">
        <PoolBar qty={q} moq={pool.minimumOrderQty} onDark />
      </div>
      <p className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[18px] font-semibold">{short > 0 ? `${short} more to reach the minimum` : "Minimum reached"}</span>
        <span className="text-[15px] text-white/70">Closes {formatDateTime(pool.expiresAt)}</span>
      </p>
    </div>
  );
}
