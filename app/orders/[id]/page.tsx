"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, errorMessage } from "@/lib/juhi/client";
import { useApi, useNow } from "@/lib/juhi/hooks";
import { formatDateTime, formatMoney } from "@/lib/juhi/format";
import { manualPaymentStatus } from "@/lib/juhi/status";
import type { ManualPayment } from "@/lib/juhi/types";
import { DataClassChip, ErrorState, Field, Loading, ManualBadge, Notice, Rows, StatusStamp } from "@/components/ui";
import { PageHead } from "@/components/PageHead";
import { RoleGate } from "@/components/RoleGate";

export default function OrderPage() {
  return (
    <RoleGate allow={["BUYER", "ADMIN"]}>
      <Suspense fallback={<Loading />}>
        <Order />
      </Suspense>
    </RoleGate>
  );
}

/** Status of one manual PhonePe report. Orders only exist after an approved deal; none is invented here. */
function Order() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useApi(async () => {
    const [payments, activity] = await Promise.all([api.listManualPayments(), api.getActivity()]);
    return { m: payments.find((x) => x.id === id) ?? null, orders: activity.orders };
  }, [id]);

  if (loading) return <Loading label="Checking your payment…" />;
  if (error || !data) return <div><ErrorState message={error?.message ?? "Not found."} onRetry={reload} title="Couldn't load this payment" /></div>;
  const m = data.m;
  if (!m) return <div><ErrorState title="Payment report not found" message="It isn't in your account's reports." onRetry={reload} /></div>;
  const status = manualPaymentStatus(m);
  const editable = m.status === "REPORTED" || m.status === "PENDING_VERIFICATION";
  const order = m.order_id ? data.orders.find((o) => o.id === m.order_id) : null;

  return (
    <div>
      <PageHead title="Payment status" />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <StatusStamp status={status} size="lg" />
        <ManualBadge />
        <DataClassChip value={m.data_class} />
      </div>

      <div className="mt-5 space-y-3">
        {status === "REPORTED" && <Notice tone="warn" title="Reported. Not verified.">Add your UPI reference so a person can check it.</Notice>}
        {status === "PENDING_VERIFICATION" && <Notice tone="warn" title="Waiting for a manual check." />}
        {status === "MANUALLY_CONFIRMED" && <Notice tone="good" title="A person matched your UPI receipt.">Manual confirmation, not a payment gateway.</Notice>}
        {status === "PAYMENT_REJECTED" && <Notice tone="bad" title="This report didn't match a receipt." />}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-card">
        <Rows
          rows={[
            { label: "Amount", value: formatMoney(m.amount_paise), strong: true },
            { label: "Paid to", value: m.recipient_name },
            { label: "Method", value: "PhonePe, manual UPI" },
            { label: "Reference", value: m.transaction_reference ?? "Not given yet" },
            { label: "You said you paid", value: m.claimed_paid_at ? formatDateTime(m.claimed_paid_at) : "Not given" },
            { label: "Checked", value: m.verified_at ? formatDateTime(m.verified_at) : "Not yet" },
            { label: "Order", value: order ? String(order.status ?? order.id) : "No order yet" },
          ]}
        />
        {m.demand_id && <Link href={`/reservation/${m.demand_id}`} className="btn-ghost mt-4">Back to your request</Link>}
      </div>

      {editable && (
        <section className="mt-8">
          <h2 className="mb-3 text-[22px]">Add or fix details</h2>
          <div className="card"><UpdateForm m={m} onSaved={reload} /></div>
        </section>
      )}
    </div>
  );
}

const toLocalInput = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

function UpdateForm({ m, onSaved }: { m: ManualPayment; onSaved: () => void }) {
  const now = useNow();
  const [ref, setRef] = useState(m.transaction_reference ?? "");
  const [paidAt, setPaidAt] = useState(m.claimed_paid_at ? toLocalInput(m.claimed_paid_at) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const errors = {
    ref: ref.trim().length < 4 ? "Enter the reference from your receipt." : null,
    paidAt: !paidAt || isNaN(new Date(paidAt).getTime()) ? "Choose when you paid." : new Date(paidAt).getTime() > now ? "Can't be in the future." : null,
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setDone(false);
    if (errors.ref || errors.paidAt) return;
    setBusy(true);
    try {
      await api.updateManualPayment(m.id, { transactionReference: ref.trim(), claimedPaidAt: new Date(paidAt).toISOString() });
      setDone(true);
      onSaved();
    } catch (x) {
      setErr(errorMessage(x));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field id="ref" label="UPI transaction reference" error={ref ? errors.ref : null}>
        <input id="ref" className="field" autoComplete="off" value={ref} onChange={(e) => setRef(e.target.value)} />
      </Field>
      <Field id="paidAt" label="When you paid" error={paidAt ? errors.paidAt : null}>
        <input id="paidAt" type="datetime-local" className="field" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
      </Field>
      {err && <Notice tone="bad" title="Couldn't save">{err}</Notice>}
      {done && <Notice tone="good" title="Saved" />}
      <button className="btn-primary w-full sm:w-auto" disabled={busy || !!errors.ref || !!errors.paidAt}>
        {busy && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />} Save details
      </button>
    </form>
  );
}
