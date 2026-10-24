"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, normDemand, PILOT_POOL_ID } from "@/lib/juhi/client";
import { useApi } from "@/lib/juhi/hooks";
import { demandStatus, manualPaymentStatus } from "@/lib/juhi/status";
import { formatDateTime, formatMoney } from "@/lib/juhi/format";
import { DataClassChip, ErrorState, Loading, Notice, Rows, Section, StatusLine, StatusStamp } from "@/components/ui";
import { PoolSnapshot } from "@/components/PoolSnapshot";
import { PageHead } from "@/components/PageHead";
import { RoleGate } from "@/components/RoleGate";
import type { DemandReservation, ManualPayment, PoolDetail } from "@/lib/juhi/types";

export default function ReservationPage() {
  return (
    <RoleGate allow={["BUYER"]}>
      <Suspense fallback={<Loading label="Finding your reservation…" />}>
        <Reservation />
      </Suspense>
    </RoleGate>
  );
}

function Reservation() {
  const { id } = useParams<{ id: string }>();
  const res = useApi(async () => {
    const [raw, activity, payments] = await Promise.all([api.getDemand(id), api.getActivity(), api.listManualPayments()]);
    const row = activity.demands.find((x) => x.id === id);
    const poolId = (typeof row?.pool_id === "string" && row.pool_id) || PILOT_POOL_ID;
    const d = normDemand({ ...row, ...raw }, poolId);
    const p = await api.getPool(d.poolId);
    return { d, p, payments: payments.filter((m) => m.demand_id === id), dataClass: activity.dataClass };
  }, [id]);

  if (res.loading) return <Loading label="Finding your reservation…" />;
  if (res.error || !res.data) return <div><ErrorState message={res.error?.message ?? "Not found."} onRetry={res.reload} title="Couldn't load your reservation" /></div>;
  return <View {...res.data} />;
}

function View({ d, p, payments, dataClass }: { d: DemandReservation; p: PoolDetail; payments: ManualPayment[]; dataClass: string }) {
  const status = demandStatus(d, p);
  const proposal = p.proposal;
  return (
    <div>
      <PageHead title={<span data-testid="reservation-code" className="break-all">Request {d.demandId.slice(0, 8)}</span>} tag="Your reservation">
        Keep this link to check back.
      </PageHead>
      <p className="mt-2 break-all text-sm text-ink-soft">Demand ID {d.demandId}</p>
      <div className="mt-3"><DataClassChip value={dataClass} /></div>

      <div className="mt-6"><StatusLine status={status} /></div>

      <div className="mt-5 space-y-3">
        {proposal && proposal.status === "AWAITING_APPROVAL" ? (
          <div className="rounded-2xl bg-leaf-wash p-5">
            <p className="text-xl font-bold">A deal is waiting for approvals</p>
            <p className="mt-1 text-[17px]">{proposal.pooledQty} units pooled. Saving estimated by the server: <strong>{formatMoney(proposal.estimatedSavingsMinor)}</strong></p>
            <Link href={`/checkout/${proposal.proposalId}?demand=${d.demandId}`} className="btn-primary mt-3">Review offer</Link>
          </div>
        ) : (
          <Link href={`/checkout/manual?demand=${d.demandId}`} className="btn-ghost">Report a ₹1 PhonePe payment</Link>
        )}
        {payments.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3">
            <StatusStamp status={manualPaymentStatus(m)} size="sm" />
            <Link href={`/orders/${m.id}`} className="font-semibold text-sign underline">Payment report {m.id.slice(0, 8)}</Link>
          </div>
        ))}
      </div>

      <Section title="Your request">
        <Rows
          rows={[
            { label: "Item", value: `${p.product.name}, ${p.product.packSize}` },
            { label: "Quantity", value: d.qty },
            { label: "Your top price", value: formatMoney(d.maxPriceMinor) },
            { label: "Pickup", value: p.merchant.name },
            { label: "Open until", value: d.expiresAt ? formatDateTime(d.expiresAt) : "–" },
          ]}
        />
      </Section>

      {d.poolId !== p.poolId && <Notice tone="warn" className="mt-4" title="Showing the pilot pool" />}
      <Section title="The pool right now" bare>
        <PoolSnapshot pool={p} />
        <Link href={`/pool/${p.poolId}`} className="btn-ghost mt-4">How this is counted</Link>
      </Section>
    </div>
  );
}
