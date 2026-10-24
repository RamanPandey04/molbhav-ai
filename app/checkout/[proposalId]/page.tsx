"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { api, errorMessage } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ErrorState, Loading, ModeBadge, Notice, SampleChip } from "@/components/ui";
import { PageHead } from "@/components/PageHead";
import { RoleGate } from "@/components/RoleGate";

const MODE = process.env.NEXT_PUBLIC_PAYMENT_MODE === "LIVE" ? "LIVE" : "UAT";

export default function CheckoutPage() {
  return (
    <RoleGate allow={["BUYER"]}>
      <Suspense fallback={<Loading />}>
        <Checkout />
      </Suspense>
    </RoleGate>
  );
}

function Checkout() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const demandId = useSearchParams().get("demand") ?? "";
  const res = useApi(async () => {
    const d = await api.getDemand(demandId);
    const p = await api.getPool(d.poolId);
    return { d, p };
  }, [demandId]);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!demandId) return <div><ErrorState title="No reservation selected" message="Open this page from your reservation link." /></div>;
  if (res.loading) return <Loading label="Loading your offer…" />;
  if (res.error || !res.data) return <div><ErrorState message={res.error?.message ?? "Not found."} onRetry={res.reload} /></div>;

  const { d, p } = res.data;
  const offer = d.finalOffer;
  const proposal = p.proposal;
  const overLimit = offer ? offer.unitPriceMinor > d.maxPriceMinor : false;
  const stale = !proposal || proposal.status === "INVALIDATED" || proposal.proposalId !== proposalId || (offer && offer.termsHash !== proposal.termsHash);

  let blocker: React.ReactNode = null;
  if (d.orderId && ["PAYMENT_PENDING", "PAID", "FULFILLED", "FAILED"].includes(d.status))
    blocker = (
      <Notice tone="info" title="Payment already started">
        <Link href={`/orders/${d.orderId}`} className="font-semibold text-sign underline">See status</Link>
      </Notice>
    );
  else if (!offer || d.status !== "OFFERED")
    blocker = <Notice tone="info" title="No offer yet. Waiting for approvals." />;
  else if (stale)
    blocker = <Notice tone="warn" title="Terms changed. Check your reservation." />;
  else if (overLimit)
    blocker = <Notice tone="warn" title={`Above your limit (${formatMoney(d.maxPriceMinor)}). You won't be charged.`} />;

  async function pay() {
    if (!offer) return;
    setBusy(true);
    setErr(null);
    try {
      await api.decide(offer.proposalId, { decision: "APPROVE", termsHash: offer.termsHash, role: "BUYER" });
      const c = await api.createCheckout(offer.proposalId, d.demandId);
      window.location.assign(c.checkoutUrl);
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHead title="Your offer">{d.reservationCode}</PageHead>

      {offer && (
        <div className="mt-5 rounded-2xl bg-white p-5 shadow-card" aria-label="Offer slip">
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-bold">{p.merchant.name}</p>
            {d.isSample && <SampleChip />}
          </div>
          <dl className="mt-3 border-y border-dashed border-ink/40 py-3 text-[17px]">
            <Line k={`${p.product.brand} ${p.product.name}, ${p.product.packSize}`} v="" />
            <Line k={`${d.qty} × ${formatMoney(offer.unitPriceMinor)}`} v={formatMoney(offer.totalMinor)} />
          </dl>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-xl font-bold">Total to pay</p>
            <p className="text-3xl font-bold tracking-tight tabular-nums" data-testid="total">{formatMoney(offer.totalMinor)}</p>
          </div>
          <p className="mt-3 text-[15px] text-ink-soft">Pickup {offer.pickupMerchantName}, by {formatDateTime(offer.pickupWindowEnd)}</p>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {blocker}
        {!blocker && offer && (
          <>
            <ModeBadge mode={MODE} />
            <label className="flex min-h-[48px] cursor-pointer items-start gap-3 rounded-xl border border-ink/15 bg-white p-4">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#1B3FD1]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span className="text-sm leading-snug">
                I accept {formatMoney(offer.totalMinor)} and the pickup time.
              </span>
            </label>
            {err && <Notice tone="bad" title="Couldn't start payment">{err}</Notice>}
            <button className="btn-yellow w-full text-lg" disabled={!agree || busy} onClick={pay}>
              {busy ? <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Lock size={17} aria-hidden />}
              {busy ? "Opening Pine Labs…" : "Accept and pay"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <dt>{k}</dt>
      <dd className="tabular-nums font-semibold">{v}</dd>
    </div>
  );
}
