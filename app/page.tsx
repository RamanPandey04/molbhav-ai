"use client";
import { api, PILOT_POOL_ID } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { poolStatus } from "@/lib/status";
import { ErrorState, Loading, Notice, EmptyState } from "@/components/ui";
import { PoolSnapshot } from "@/components/PoolSnapshot";
import { ProductSlip } from "@/components/ProductSlip";
import { JoinForm } from "@/components/JoinForm";
import { ShareCard } from "@/components/ShareCard";
import { RoleGate } from "@/components/RoleGate";

export default function BuyerPage() {
  return (
    <RoleGate allow={["BUYER"]}>
      <BuyerHome />
    </RoleGate>
  );
}

function BuyerHome() {
  const { data: pool, error, loading, reload } = useApi(() => (PILOT_POOL_ID ? api.getPool(PILOT_POOL_ID) : Promise.reject(null)), []);

  return (
    <>
      <section className="pb-2 pt-9">
        <h1 className="text-[2.35rem] leading-[1.05] sm:text-6xl">Your neighbourhood. One buying power.</h1>
        <p className="mt-3 text-[19px] text-ink-soft">Pool with neighbours. Get a better rate.</p>
        <a href="#join" className="btn-yellow mt-6 w-full sm:w-auto">Join the pool</a>
      </section>

      {loading && <Loading label="Checking the pool…" />}
      {!PILOT_POOL_ID && !loading && (
        <EmptyState title="No pool is open yet">The team hasn't set the pilot pool for this site. Check back soon.</EmptyState>
      )}
      {error && PILOT_POOL_ID && <ErrorState message={error.message} onRetry={reload} title="Couldn't load the pool" />}

      {pool && (
        <div className="mt-5 space-y-5">
          <ProductSlip product={pool.product} merchant={pool.merchant} />
          <PoolSnapshot pool={pool} />

          <section aria-labelledby="how" className="pt-4">
            <h2 id="how" className="text-[26px]">How it works</h2>
            <ol className="mt-3 divide-y divide-paper-rule rounded-2xl border border-ink/[.07] bg-white shadow-card">
              {["Tell us how many", "Supplier and kirana approve", "See the final price. Pay only if you accept."].map((t, i) => (
                <li key={t} className="flex items-center gap-4 p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[15px] font-bold text-turmeric" aria-hidden>{i + 1}</span>
                  <p className="text-[17px] font-semibold leading-snug">{t}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="join" aria-labelledby="join-h" className="scroll-mt-4 pt-3">
            <h2 id="join-h" className="mb-3 text-[26px]">Join the pool</h2>
            {["EXPIRED", "CLOSED", "NO_DEAL"].includes(poolStatus(pool)) ? (
              <Notice tone="warn" title="This pool is closed" />
            ) : (
              <div className="card"><JoinForm pool={pool} /></div>
            )}
          </section>

          <ShareCard />
        </div>
      )}
    </>
  );
}
