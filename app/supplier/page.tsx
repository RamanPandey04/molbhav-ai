"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api, errorMessage, PILOT_POOL_ID } from "@/lib/juhi/client";
import { useApi, useNow } from "@/lib/juhi/hooks";
import { focusFirstError, formatDateTime, formatMoney, rupeesToMinor } from "@/lib/juhi/format";
import { DataClassChip, ErrorState, Field, Loading, Notice, Rows, Section } from "@/components/ui";
import { RoleApproval } from "@/components/Proposal";
import { PageHead } from "@/components/PageHead";
import { RoleGate } from "@/components/RoleGate";
import type { Catalog, PoolDetail, SupplierQuote } from "@/lib/juhi/types";

export default function SupplierPage() {
  return (
    <RoleGate allow={["SUPPLIER"]}>
      <Console />
    </RoleGate>
  );
}

function Console() {
  const { data, error, loading, reload } = useApi(async () => {
    const [pool, catalog] = await Promise.all([api.getPool(PILOT_POOL_ID), api.getCatalog()]);
    return { pool, catalog };
  }, []);
  if (loading) return <Loading label="Loading the request…" />;
  if (error || !data) return <div><ErrorState message={error?.message ?? "Not found."} onRetry={reload} /></div>;
  const { pool, catalog } = data;
  const quote = pool.quotes[0];
  return (
    <div>
      <PageHead title="Supplier console">
        <strong>{pool.eligibleProcurementQty} units</strong> of {pool.product.name}, {pool.product.packSize}
      </PageHead>
      <div className="mt-3"><DataClassChip value={pool.dataClass} /></div>

      {quote && (
        <Section title="Your quote on file">
          <QuoteSummary q={quote} />
        </Section>
      )}

      <Section title={quote ? "Change your quote" : "Send a quote"}>
        {quote && <Notice tone="warn" className="mb-4" title="Changing the quote cancels approvals" />}
        <QuoteForm pool={pool} catalog={catalog} onSaved={reload} />
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
        { label: "Supplier", value: q.supplierName },
        { label: "Price per unit", value: formatMoney(q.unitPriceMinor), strong: true },
        { label: "Minimum order", value: `${q.minQty} units` },
        { label: "Available", value: `${q.availableQty} units` },
        { label: "Freight for the order", value: formatMoney(q.freightTotalMinor) },
        { label: "Handling and other charges", value: formatMoney(q.otherCostsMinor) },
        { label: "Deliver by", value: q.deliveryDeadline ? formatDateTime(q.deliveryDeadline) : "–" },
        { label: "Status", value: q.status },
        { label: "Quote valid until", value: formatDateTime(q.expiresAt) },
      ]}
    />
  );
}

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function QuoteForm({ pool, catalog, onSaved }: { pool: PoolDetail; catalog: Catalog; onSaved: () => void }) {
  const now = useNow();
  const [f, setF] = useState(() => ({ supplier: catalog.suppliers.length === 1 ? catalog.suppliers[0].id : "", unit: "", min: "", avail: "", freight: "", other: "0", deliver: "", until: toLocalInput(new Date(Date.now() + 48 * 3600_000)) }));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
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
  const deliver = f.deliver ? new Date(f.deliver) : null;
  const until = f.until ? new Date(f.until) : null;
  const errors = {
    supplier: f.supplier ? null : "Choose your business.",
    unit: unit == null ? "Enter an amount." : null,
    min: min == null || min < 1 ? "Enter a number." : null,
    avail: avail == null || avail < 1 ? "Enter a number." : min != null && avail < min ? "Must be at least the minimum." : null,
    freight: freight == null ? "Enter freight. Use 0 for none." : null,
    other: other == null ? "Enter a rupee amount, or 0." : null,
    deliver: !deliver || isNaN(deliver.getTime()) ? "Choose a date." : deliver.getTime() <= now ? "Must be in the future." : null,
    until: !until || isNaN(until.getTime()) ? "Choose a date." : until.getTime() <= now ? "Must be in the future." : null,
  };
  const invalid = Object.values(errors).some(Boolean);
  const e = (k: keyof typeof errors) => (touched ? errors[k] : null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setTouched(true);
    setErr(null);
    setDone(false);
    if (invalid) {
      focusFirstError((["supplier", "unit", "freight", "min", "avail", "other", "deliver", "until"] as const).map((id) => ({ id, error: errors[id] })));
      return;
    }
    setBusy(true);
    try {
      await api.submitQuote({
        poolId: pool.poolId, supplierId: f.supplier, exactSkuId: pool.skuId, minOrderQuantity: min!, maxAvailableQuantity: avail!,
        quotedUnitPricePaise: unit!, freightPaise: freight!, handlingPaise: other!, deliveryDeadline: deliver!.toISOString(), expiresAt: until!.toISOString(),
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
      <Field id="supplier" label="Your business" error={e("supplier")} hint="The server only accepts a business you own.">
        <select id="supplier" className="field" value={f.supplier} onChange={set("supplier")}>
          <option value="">Choose…</option>
          {catalog.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="unit" label="Price per unit (₹)" error={e("unit")}><input id="unit" inputMode="decimal" className="field" value={f.unit} onChange={set("unit")} /></Field>
        <Field id="freight" label="Freight, total (₹)" error={e("freight")}><input id="freight" inputMode="decimal" className="field" value={f.freight} onChange={set("freight")} /></Field>
        <Field id="min" label="Minimum order (units)" error={e("min")}><input id="min" inputMode="numeric" className="field" value={f.min} onChange={set("min")} /></Field>
        <Field id="avail" label="Units available" error={e("avail")}><input id="avail" inputMode="numeric" className="field" value={f.avail} onChange={set("avail")} /></Field>
        <Field id="other" label="Handling and other charges (₹)" error={e("other")}><input id="other" inputMode="decimal" className="field" value={f.other} onChange={set("other")} /></Field>
        <Field id="deliver" label="Deliver by" error={e("deliver")}><input id="deliver" type="datetime-local" className="field" value={f.deliver} onChange={set("deliver")} /></Field>
      </div>
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
