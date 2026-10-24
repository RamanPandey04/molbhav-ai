"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useNow } from "@/lib/juhi/hooks";
import { api, errorMessage, MANUAL_AMOUNT_PAISE, MANUAL_RECIPIENT, QR_SRC } from "@/lib/juhi/client";
import { formatMoney } from "@/lib/juhi/format";
import type { ManualPayment } from "@/lib/juhi/types";
import { Field, ManualBadge, Notice } from "@/components/ui";

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/** The exact PhonePe QR plus the honest rules around it. */
export function PhonePeQr() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xl font-bold">Pay {formatMoney(MANUAL_AMOUNT_PAISE)} via PhonePe</p>
        <ManualBadge />
      </div>
      <p className="mt-1 text-[17px]">Payment recipient: <strong>{MANUAL_RECIPIENT}</strong></p>
      <p className="text-sm text-ink-soft">Manual UPI payment · {MANUAL_AMOUNT_PAISE} paise</p>
      <div className="mt-4 max-w-[280px] rounded-xl border border-paper-rule p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={QR_SRC} alt={`PhonePe UPI QR code for ${MANUAL_RECIPIENT}`} className="h-auto w-full" />
      </div>
      <Notice tone="warn" className="mt-4" title="This QR doesn't set the amount">
        Enter {formatMoney(MANUAL_AMOUNT_PAISE)} yourself. A person checks each report by hand against the UPI receipt. This is not a Pine Labs payment and nothing is confirmed automatically.
      </Notice>
    </div>
  );
}

/** Report a manual payment for a demand. Reference and time are optional and only what the buyer actually has. */
export function ReportPaymentForm({ demandId, onSaved }: { demandId: string; onSaved: (p: ManualPayment) => void }) {
  const now = useNow();
  const [ref, setRef] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [key] = useState(() => crypto.randomUUID());
  const [paid, setPaid] = useState(false);
  const paidAtErr = paidAt && (isNaN(new Date(paidAt).getTime()) || new Date(paidAt).getTime() > now) ? "Can't be in the future." : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (paidAtErr) return;
    setBusy(true);
    setErr(null);
    try {
      const body: { demandId: string; transactionReference?: string; claimedPaidAt?: string } = { demandId };
      if (ref.trim()) body.transactionReference = ref.trim();
      if (paidAt) body.claimedPaidAt = new Date(paidAt).toISOString();
      onSaved(await api.reportManualPayment(body, key));
    } catch (x) {
      setErr(errorMessage(x));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field id="ref" label="UPI transaction reference" hint="From your PhonePe receipt. Leave empty if you don't have it yet.">
        <input id="ref" className="field" autoComplete="off" value={ref} onChange={(e) => setRef(e.target.value)} />
      </Field>
      <Field id="paidAt" label="When you paid" error={paidAtErr} hint="Optional.">
        <input id="paidAt" type="datetime-local" max={toLocalInput(new Date(now))} className="field" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
      </Field>
      <label className="flex min-h-[48px] cursor-pointer items-start gap-3 rounded-xl border border-ink/15 bg-white p-4">
        <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#1B3FD1]" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
        <span className="text-sm leading-snug">I sent {formatMoney(MANUAL_AMOUNT_PAISE)} to {MANUAL_RECIPIENT} with PhonePe. I understand this is checked by hand.</span>
      </label>
      {err && <Notice tone="bad" title="Couldn't save your report">{err}</Notice>}
      <button className="btn-yellow w-full text-lg" disabled={busy || !paid}>
        {busy && <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden />} {busy ? "Saving…" : "Report my payment"}
      </button>
      <p className="text-sm text-ink-soft">Without a reference your report is saved as reported. With one it waits for a manual check.</p>
    </form>
  );
}
