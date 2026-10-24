"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api, normDemand, PILOT_POOL_ID } from "@/lib/juhi/client";
import { useApi } from "@/lib/juhi/hooks";
import { formatDateTime, formatMoney } from "@/lib/juhi/format";
import { manualPaymentStatus } from "@/lib/juhi/status";
import { DataClassChip, ErrorState, Loading, Notice, StatusStamp } from "@/components/ui";
import { ConfirmAction } from "@/components/ConfirmAction";
import { ApprovalList } from "@/components/ApprovalList";
import { ProposalTerms } from "@/components/Proposal";
import { PhonePeQr, ReportPaymentForm } from "@/components/ManualPayment";
import { PageHead } from "@/components/PageHead";
import { RoleGate } from "@/components/RoleGate";

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
  const router = useRouter();
  const { proposalId } = useParams<{ proposalId: string }>();
  const demandId = useSearchParams().get("demand") ?? "";
  const res = useApi(async () => {
    const [raw, activity, payments] = await Promise.all([api.getDemand(demandId), api.getActivity(), api.listManualPayments()]);
    const row = activity.demands.find((x) => x.id === demandId);
    const d = normDemand({ ...row, ...raw }, (typeof row?.pool_id === "string" && row.pool_id) || PILOT_POOL_ID);
    const p = await api.getPool(d.poolId);
    const proposal = proposalId && proposalId !== "manual" ? await api.getProposal(proposalId) : null;
    return { d, p, proposal, payments: payments.filter((m) => m.demand_id === demandId), dataClass: activity.dataClass };
  }, [demandId, proposalId]);

  if (!demandId) return <div><ErrorState title="No reservation selected" message="Open this page from your reservation link." /></div>;
  if (res.loading) return <Loading label="Loading your offer…" />;
  if (res.error || !res.data) return <div><ErrorState message={res.error?.message ?? "Not found."} onRetry={res.reload} /></div>;

  const { d, p, proposal, payments, dataClass } = res.data;
  const mine = proposal?.approvals.find((a) => a.role === "BUYER");

  return (
    <div>
      <PageHead title="Your offer"><span className="break-all">Request {d.demandId.slice(0, 8)}</span></PageHead>
      <div className="mt-3"><DataClassChip value={dataClass} /></div>

      <div className="mt-5 rounded-2xl bg-white p-5 shadow-card" aria-label="Offer slip">
        <p className="text-lg font-bold">{p.merchant.name}</p>
        <dl className="mt-3 border-y border-dashed border-ink/40 py-3 text-[17px]">
          <Line k={`${[p.product.brand, p.product.name].filter(Boolean).join(" ")}, ${p.product.packSize}`} v="" />
          <Line k={`${d.qty} units, your top price ${formatMoney(d.maxPriceMinor)} each`} v="" />
        </dl>
        <p className="mt-3 text-[15px] text-ink-soft">Pickup {p.merchant.name}{d.expiresAt ? `, request open until ${formatDateTime(d.expiresAt)}` : ""}</p>
      </div>

      <div className="mt-5 space-y-4">
        {!proposal ? (
          <Notice tone="info" title="No offer yet. Waiting for approvals." />
        ) : (
          <div className="card space-y-4">
            <ProposalTerms proposal={proposal} />
            <ApprovalList approvals={proposal.approvals} />
            {proposal.status === "AWAITING_APPROVAL" && mine?.status === "PENDING" ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <ConfirmAction label="Accept terms" confirmLabel="Confirm" variant="yellow"
                  summary={<>Accept these exact terms? Terms hash <strong className="break-all">{proposal.termsHash.slice(0, 12)}</strong></>}
                  onConfirm={async () => { await api.decide(proposal.proposalId, { decision: "APPROVE", termsHash: proposal.termsHash }); res.reload(); }} />
                <ConfirmAction label="Reject" variant="danger" confirmLabel="Reject" summary={<>Reject this deal?</>}
                  onConfirm={async () => { await api.decide(proposal.proposalId, { decision: "REJECT", termsHash: proposal.termsHash }); res.reload(); }} />
              </div>
            ) : mine && mine.status !== "PENDING" ? (
              <Notice tone={mine.status === "APPROVED" ? "good" : "bad"} title={mine.status === "APPROVED" ? "Buyer approval recorded" : mine.status === "REJECTED" ? "Buyer rejection recorded" : "Expired before a decision"} />
            ) : null}
          </div>
        )}
      </div>

      <section className="mt-8 space-y-4" aria-labelledby="pay-h">
        <h2 id="pay-h" className="text-[22px]">Manual payment</h2>
        <PhonePeQr />
        {payments.length > 0 && (
          <ul className="space-y-2">
            {payments.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3">
                <StatusStamp status={manualPaymentStatus(m)} size="sm" />
                <Link href={`/orders/${m.id}`} className="font-semibold text-sign underline">See report {m.id.slice(0, 8)}</Link>
              </li>
            ))}
          </ul>
        )}
        <div className="card">
          <ReportPaymentForm demandId={d.demandId} onSaved={(m) => router.push(`/orders/${m.id}`)} />
        </div>
      </section>
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
