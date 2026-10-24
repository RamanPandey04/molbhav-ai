"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { formatDateTime, formatMoney } from "@/lib/format";
import { orderStatus } from "@/lib/status";
import { ErrorState, Loading, ModeBadge, Notice, Rows, SampleChip, StatusStamp } from "@/components/ui";
import { PageHead } from "@/components/PageHead";
import { RoleGate } from "@/components/RoleGate";

export default function OrderPage() {
  return (
    <RoleGate allow={["BUYER"]}>
      <Suspense fallback={<Loading />}>
        <Order />
      </Suspense>
    </RoleGate>
  );
}

const FULFILL = { NOT_STARTED: "Not started", READY_FOR_PICKUP: "Ready for pickup", PICKED_UP: "Picked up", CANCELLED: "Cancelled" } as const;

function Order() {
  const { id } = useParams<{ id: string }>();
  const returned = useSearchParams().get("returned") === "1";
  const { data: o, error, loading, reload } = useApi(() => api.getOrder(id), [id], {
    pollWhile: (x) => orderStatus(x) === "PAYMENT_PENDING",
    everyMs: 2000,
  });

  if (loading) return <Loading label="Checking your payment…" />;
  if (error || !o) return <div><ErrorState message={error?.message ?? "Not found."} onRetry={reload} title="Couldn't load this order" /></div>;

  const status = orderStatus(o);
  const pay = o.payment;
  return (
    <div>
      <PageHead title="Order status" />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <StatusStamp status={status} size="lg" animate />
        {pay && <ModeBadge mode={pay.mode} />}
        {o.isSample && <SampleChip />}
      </div>

      <div className="mt-5 space-y-3">
        {status === "PAYMENT_PENDING" && <Notice tone="warn" title={returned ? "Back from payment. Waiting for confirmation." : "Waiting for confirmation."}>This page updates by itself.</Notice>}
        {status === "FAILED" && <Notice tone="bad" title="Payment failed">{pay?.failureReason ?? "Not confirmed by the provider."}</Notice>}
        {status === "EXPIRED" && <Notice tone="warn" title="Payment link expired" />}
        {status === "PAID_UAT" && <Notice tone="warn" title="Test payment. No real money moved." />}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-card">
        <Rows
          rows={[
            { label: "Amount", value: `${o.qty} × ${formatMoney(o.unitPriceMinor)} = ${formatMoney(o.amountMinor)}`, strong: true },
            { label: "Pickup", value: o.pickupMerchantName },
            { label: "Collect by", value: formatDateTime(o.pickupWindowEnd) },
            { label: "Pickup status", value: FULFILL[o.fulfillment] },
            ...(pay ? [{ label: "Reference", value: pay.providerReference ?? "Not issued yet" }, { label: "Confirmed", value: pay.verifiedAt ? formatDateTime(pay.verifiedAt) : "Not yet" }] : []),
          ]}
        />
      </div>
    </div>
  );
}
