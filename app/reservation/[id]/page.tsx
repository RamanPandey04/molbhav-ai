"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { demandStatus } from "@/lib/status";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ErrorState, Loading, Notice, Rows, SampleChip, Section, StatusLine } from "@/components/ui";
import { PoolSnapshot } from "@/components/PoolSnapshot";
import { PageHead } from "@/components/PageHead";
import { RoleGate } from "@/components/RoleGate";
import type { DemandReservation, PoolDetail } from "@/lib/shared/types";

export default function ReservationPage() {
  return (
    <RoleGate allow={["BUYER"]}>
      <Reservation />
    </RoleGate>
  );
}

function Reservation() {
  const { id } = useParams<{ id: string }>();
  const res = useApi(async () => {
    const d = await api.getDemand(id);
    const p = await api.getPool(d.poolId);
    return { d, p };
  }, [id], { pollWhile: ({ d }) => d.status === "PAYMENT_PENDING", everyMs: 3000 });

  if (res.loading) return <Loading label="Finding your reservation…" />;
  if (res.error || !res.data) return <div><ErrorState message={res.error?.message ?? "Not found."} onRetry={res.reload} title="Couldn't load your reservation" /></div>;
  const { d, p } = res.data;
  return <View d={d} p={p} />;
}

function View({ d, p }: { d: DemandReservation; p: PoolDetail }) {
  const status = demandStatus(d, p);
  return (
    <div>
      <PageHead title={<span data-testid="reservation-code">{d.reservationCode}</span>} tag="Your reservation">
        Keep this link to check back.
      </PageHead>

      <div className="mt-6"><StatusLine status={status} /></div>

      <div className="mt-5">
        {d.status === "OFFERED" && d.finalOffer ? (
          <div className="rounded-2xl bg-leaf-wash p-5">
            <p className="text-xl font-bold">Your offer is ready</p>
            <p className="mt-1 text-[17px]">{d.qty} × {formatMoney(d.finalOffer.unitPriceMinor)} = <strong>{formatMoney(d.finalOffer.totalMinor)}</strong></p>
            <Link href={`/checkout/${d.finalOffer.proposalId}?demand=${d.demandId}`} className="btn-primary mt-3">Review offer</Link>
          </div>
        ) : d.status === "PAYMENT_PENDING" || d.status === "PAID" || d.status === "FAILED" ? (
          d.orderId ? <Link href={`/orders/${d.orderId}`} className="btn-ghost">See payment status</Link> : null
        ) : null}
      </div>

      <Section title="Your request">
        <Rows
          rows={[
            { label: "Item", value: `${p.product.name}, ${p.product.packSize}` },
            { label: "Quantity", value: d.qty },
            { label: "Your top price", value: formatMoney(d.maxPriceMinor) },
            { label: "Pickup", value: p.merchant.name },
          ]}
        />
      </Section>

      <Section title="The pool right now" bare>
        <PoolSnapshot pool={p} />
        <Link href={`/pool/${p.poolId}`} className="btn-ghost mt-4">How this is counted</Link>
      </Section>
    </div>
  );
}
