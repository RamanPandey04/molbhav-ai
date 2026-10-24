"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api, errorMessage, PILOT_POOL_ID } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { focusFirstError, formatDateTime, formatMoney, rupeesToMinor } from "@/lib/format";
import { ErrorState, Field, Loading, Notice, Rows, Section } from "@/components/ui";
import { RoleApproval } from "@/components/Proposal";
import { PageHead } from "@/components/PageHead";
import { RoleGate } from "@/components/RoleGate";
import type { PoolDetail, SupplierQuote } from "@/lib/shared/types";

export default function SupplierPage() {
  return (
    <RoleGate allow={["SUPPLIER"]}>
      <Console />
    </RoleGate>
  );
}

function Console() {
  const { data: pool, error, loading, reload } = useApi(() => api.getPool(PILOT_POOL_ID), []);
  if (loading) return <Loading label="Loading the request…" />;
  if (error || !pool) return <div><ErrorState message={error?.message ?? "Not found."} onRetry={reload} /></div>;
  const quote = pool.quotes[0];
  return (
    <div>
      <PageHead title="Supplier console">
        <strong>{pool.eligibleProcurementQty} units</strong> of {pool.product.name}, {pool.product.packSize}
      </PageHead>

      {quote && (
        <Section title="Your quote on file">
          <QuoteSummary q={quote} />
        </Section>
      )}

      <Section title={quote ? "Change your quote" : "Send a quote"}>
        {quote && <Notice tone="warn" className="mb-4" title="Changing the quote cancels approvals" />}
        <QuoteForm pool={pool} onSaved={reload} />
      </Section>

      <Section title="Order">
        <RoleApproval role="SUPPLIER" pool={pool} onChanged={reload} />
      </Section>
    </div>
  );
}

function QuoteSummary({ q }: { q: SupplierQuote }) {
  return (
    <Rows
      rows={[
        { label: "Quoted by", value: q.quotedBy },
        { label: "Price per unit", value: formatMoney(q.unitPriceMinor), strong: true },
        { label: "Minimum order", value: `${q.minQty} units` },
        { label: "Available", value: `${q.availableQty} units` },
        { label: "Freight for the order", value: formatMoney(q.freightTotalMinor) },
        { label: "Delivery", value: `${q.leadTimeDays} days` },
        { label: "Quote valid until", value: formatDateTime(q.expiresAt) },
      ]}
    />
  );
}

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function QuoteForm({ pool, onSaved }: { pool: PoolDetail; onSaved: () => void }) {
  const [f, setF] = useState({ by: "", unit: "", min: "", avail: "", freight: "", other: "0", tax: "", lead: "", until: toLocalInput(new Date(Date.now() + 48 * 3600_000)) });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const int = (s: string) => (/^\d+$/.test(s.trim()) ? parseInt(s, 10) : null);
  const unit = rupeesToMinor(f.unit);
  const freight = f.freight.trim() === "0" ? 0 : rupeesToMinor(f.freight);
  const other = f.other.trim() === "0" || f.other.trim() === "" ? 0 : rupeesToMinor(f.other);
  const min = int(f.min);
  const avail = int(f.avail);
  const lead = int(f.lead);
  const until = f.until ? new Date(f.until) : null;
  const errors = {
    by: f.by.trim().length < 2 ? "Enter a name." : null,
    unit: unit == null ? "Enter an amount." : null,
    min: min == null || min < 1 ? "Enter a number." : null,
    avail: avail == null || avail < 1 ? "Enter a number." : min != null && avail < min ? "Must be at least the minimum." : null,
    freight: freight == null ? "Enter freight. Use 0 for none." : null,
    other: other == null ? "Enter a rupee amount, or 0." : null,
    tax: f.tax.trim().length < 3 ? "For example: GST invoice, tax included." : null,
    lead: lead == null ? "Enter delivery time in days." : null,
    until: !until || isNaN(until.getTime()) ? "Choose a date." : until.getTime() <= Date.now() ? "Must be in the future." : null,
  };
  const invalid = Object.values(errors).some(Boolean);
  const e = (k: keyof typeof errors) => (touched ? errors[k] : null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setTouched(true);
    setErr(null);
    setDone(false);
    if (invalid) {
      focusFirstError((["by", "unit", "freight", "min", "avail", "other", "lead", "tax", "until"] as const).map((id) => ({ id, error: errors[id] })));
      return;
    }
    setBusy(true);
    try {
      await api.submitQuote({
        poolId: pool.poolId, quotedBy: f.by.trim(), minQty: min!, availableQty: avail!, unitPriceMinor: unit!,
        freightTotalMinor: freight!, otherCostsMinor: other!, taxBasis: f.tax.trim(), leadTimeDays: lead!, expiresAt: until!.toISOString(),
      });
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
      <Field id="by" label="Your name" error={e("by")}>
        <input id="by" className="field" value={f.by} onChange={set("by")} autoComplete="name" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="unit" label="Price per unit (₹)" error={e("unit")}><input id="unit" inputMode="decimal" className="field" value={f.unit} onChange={set("unit")} /></Field>
        <Field id="freight" label="Freight, total (₹)" error={e("freight")}><input id="freight" inputMode="decimal" className="field" value={f.freight} onChange={set("freight")} /></Field>
        <Field id="min" label="Minimum order (units)" error={e("min")}><input id="min" inputMode="numeric" className="field" value={f.min} onChange={set("min")} /></Field>
        <Field id="avail" label="Units available" error={e("avail")}><input id="avail" inputMode="numeric" className="field" value={f.avail} onChange={set("avail")} /></Field>
        <Field id="other" label="Other charges (₹)" error={e("other")}><input id="other" inputMode="decimal" className="field" value={f.other} onChange={set("other")} /></Field>
        <Field id="lead" label="Delivery time (days)" error={e("lead")}><input id="lead" inputMode="numeric" className="field" value={f.lead} onChange={set("lead")} /></Field>
      </div>
      <Field id="tax" label="Invoice and tax" error={e("tax")}><input id="tax" className="field" value={f.tax} onChange={set("tax")} /></Field>
      <Field id="until" label="Valid until" error={e("until")}>
        <input id="until" type="datetime-local" className="field" value={f.until} onChange={set("until")} />
      </Field>
      {err && <Notice tone="bad" title="Couldn't save the quote">{err}</Notice>}
      {done && <Notice tone="good" title="Quote saved" />}
      <button className="btn-primary w-full sm:w-auto" disabled={busy}>
        {busy && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />} Save quote
      </button>
    </form>
  );
}
