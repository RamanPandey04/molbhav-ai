"use client";
import { api, PILOT_POOL_ID } from "@/lib/juhi/client";
import { useApi } from "@/lib/juhi/hooks";
import { poolStatus } from "@/lib/juhi/status";
import { DataClassChip, ErrorState, Loading, Notice, EmptyState } from "@/components/ui";
import { PoolSnapshot } from "@/components/PoolSnapshot";
import { ProductSlip } from "@/components/ProductSlip";
import { JoinForm } from "@/components/JoinForm";
import { ShareCard } from "@/components/ShareCard";
import { RoleGate } from "@/components/RoleGate";

export default function BuyerPage() {
  return (
    <RoleGate allow={["BUYER"]} allowGuest>
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
        <p className="mt-3 max-w-3xl text-[19px] text-ink-soft">Why should every home and kirana pay more by buying alone? Molbhav.AI brings compatible neighbourhood demand together, compares wholesale offers and leaves final terms to the people involved.</p>
        <div className="mt-6 flex flex-wrap gap-3"><a href="#join" className="btn-yellow w-full sm:w-auto">Explore Buying Pools</a><a href="/demo" className="btn-yellow w-full sm:w-auto">Try Interactive Demo — SAMPLE DATA</a></div>
      </section>

      {loading && <Loading label="Checking the pool…" />}
      {!PILOT_POOL_ID && !loading && (
        <EmptyState title="No pool is open yet">The team hasn&apos;t set the pilot pool for this site. Check back soon.</EmptyState>
      )}
      {error && PILOT_POOL_ID && <ErrorState message={error.message} onRetry={reload} title="Couldn't load the pool" />}

      {pool && (
        <div className="mt-5 space-y-5">
          <DataClassChip value={pool.dataClass} />
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
          <section className="card mt-6 space-y-4 p-5 sm:p-7">
            <p className="font-mono text-sm font-bold uppercase tracking-wider text-turmeric-deep">Why neighbourhood buying?</p>
            <h2 className="text-3xl">Small buyers pay more when every order stands alone.</h2>
            <p className="text-lg text-ink-soft">Large chains negotiate against bigger orders. A household or local kirana may need the same exact product, but not enough of it to meet a wholesaler’s minimum by themselves. Molbhav brings compatible demand together without asking a household to buy a wholesale quantity.</p>
            <div className="grid gap-3 sm:grid-cols-3">{[
              ["Fragmented household demand","Compatible product requests can pool by neighbourhood."],
              ["Kirana negotiating power","Independent replenishment can join consumer demand as its own quantity."],
              ["Wholesale minimums","Quotes are evaluated against real minimum order and available-stock terms."],
            ].map(([title,description])=><article key={title} className="rounded-xl border border-paper-rule bg-white p-4"><h3 className="font-bold">{title}</h3><p className="mt-1 text-ink-soft">{description}</p></article>)}</div>
          </section>
          <section className="space-y-4 py-7">
            <h2 className="text-3xl">A familiar purchase, with neighbourhood buying power.</h2>
            <p className="text-lg text-ink-soft">Households order their normal quantity. Kiranas separately decide how much stock they need. Pooling compatible demand makes one larger purchasing opportunity; it does not make each buyer personally responsible for wholesale quantities.</p>
            <ol className="grid gap-2 sm:grid-cols-5">{[
              "Choose the exact product and your quantity.","Compatible neighbouring demand joins the same pool.","Kiranas add separate restocking requirements.","Eligible supplier quotes are compared, including MOQ and landed cost.","Every supplier, kirana and buyer approval stays with a human."
            ].map((step,i)=><li key={step} className="card p-4"><span className="font-mono text-turmeric-deep">STEP 0{i+1}</span><p className="mt-2 font-semibold">{step}</p></li>)}</ol>
            <div className="grid gap-3 sm:grid-cols-3">{[
              ["CUSTOMERS","Better prices when a real qualifying offer exists. Familiar local stores."],
              ["KIRANAS","Their independent stock needs stay separate from household purchases."],
              ["WHOLESALERS","One consolidated opportunity with visible quantity, MOQ and deadlines."],
            ].map(([title,description])=><article key={title} className="card p-4"><h3 className="text-xl font-bold">{title}</h3><p>{description}</p></article>)}</div>
          </section>
          <section className="card space-y-4 p-5 sm:p-7">
            <p className="font-mono text-sm font-bold uppercase tracking-wider text-leaf">A reviewable procurement workflow</p>
            <h2 className="text-3xl">What the AI can—and cannot—decide.</h2>
            <p>Molbhav’s deterministic backend checks exact SKU, pooled eligible quantity, minimum order, stock, landed cost and approved margin limits. An AgenticOrg review can advise on that saved calculation; it does not change prices, sign offers, approve proposals or mark payments paid.</p>
            <p>Joining a pool is a reservation, not a completed purchase. A buyer sees the final terms before approval; deal savings and supplier economics are not shown as proven revenue.</p>
            <a className="btn-yellow w-fit" href="/deal-room">Explore the real deal room</a>
          </section>
          <section className="card space-y-3 p-5 sm:p-7">
            <h2 className="text-3xl">A sustainable model, only when the maths works.</h2>
            <p className="text-ink-soft">Molbhav could earn a mutually agreed platform fee on a successfully coordinated purchase, provided the complete deal remains beneficial to its participants. No proposed fee or sample calculation is presented as revenue.</p>
            <h2 className="pt-2 text-2xl">Frequently asked</h2>
            {[
              ["Do I have to buy wholesale quantities?","No. A buyer joins with their own household quantity; a kirana’s independent restock is tracked separately."],
              ["Who delivers my purchase?","Delivery and pickup depend on the supplier and kirana terms. Check the approved proposal; do not assume delivery."],
              ["How are discounts calculated?","The server uses saved integer-paise quotes, freight, handling, baseline and approved deal terms."],
              ["What if the pool misses MOQ?","That supplier is not eligible. There may be no deal; the buyer is not charged automatically."],
              ["Can my kirana participate?","An authenticated kirana must be provisioned for the correct business. New owners are not granted another store’s access."],
              ["Does AI make payment decisions?","No. Humans approve the proposal and verify any manual PhonePe report against genuine receipt evidence."],
              ["What if a supplier rejects?","The deal does not advance as an approved purchase; another real quote would be required."],
            ].map(([question,answer])=><details key={question} className="border-t border-paper-rule py-3"><summary className="cursor-pointer font-semibold">{question}</summary><p className="mt-2 text-ink-soft">{answer}</p></details>)}
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
