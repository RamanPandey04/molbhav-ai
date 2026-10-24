"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api, errorMessage, PILOT_POOL_ID } from "@/lib/juhi/client";
import { useApi, useNow } from "@/lib/juhi/hooks";
import { focusFirstError } from "@/lib/juhi/format";
import { poolStatus } from "@/lib/juhi/status";
import { DataClassChip, ErrorState, Field, Loading, Notice, Section, StatusLine } from "@/components/ui";
import { PoolLedger } from "@/components/PoolLedger";
import { PoolBar } from "@/components/PoolBar";
import { RoleApproval } from "@/components/Proposal";
import { PageHead } from "@/components/PageHead";
import { RoleGate } from "@/components/RoleGate";
import type { Catalog, PoolDetail } from "@/lib/juhi/types";

export default function KiranaPage() {
  return (
    <RoleGate allow={["KIRANA"]}>
      <Console />
    </RoleGate>
  );
}

function Console() {
  const { data, error, loading, reload } = useApi(async () => {
    const [pool, catalog] = await Promise.all([api.getPool(PILOT_POOL_ID), api.getCatalog()]);
    return { pool, catalog };
  }, []);
  if (loading) return <Loading label="Loading your pool…" />;
  if (error || !data) return <div><ErrorState message={error?.message ?? "Not found."} onRetry={reload} /></div>;
  const { pool, catalog } = data;
  return (
    <div>
      <PageHead title="Kirana console" />
      <div className="mt-4 flex flex-wrap items-center gap-3"><StatusLine status={poolStatus(pool)} /><DataClassChip value={pool.dataClass} /></div>

      <Section title="Your stock">
        <RestockForm pool={pool} catalog={catalog} onSaved={reload} />
      </Section>

      <Section title="Pool">
        <PoolBar qty={pool.eligibleProcurementQty} moq={pool.minimumOrderQty} />
        <div className="mt-5"><PoolLedger pool={pool} /></div>
      </Section>

      <Section title="Deal terms">
        <RoleApproval role="KIRANA" pool={pool} onChanged={reload} />
      </Section>
    </div>
  );
}

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function RestockForm({ pool, catalog, onSaved }: { pool: PoolDetail; catalog: Catalog; onSaved: () => void }) {
  const now = useNow();
  // Kiranas in this pool's zone. The server only accepts a store you own.
  const stores = catalog.merchants.filter((m) => m.zone_id === pool.zoneId);
  const [merchantId, setMerchantId] = useState(stores.some((s) => s.id === pool.merchant.id) ? pool.merchant.id : stores[0]?.id ?? "");
  const [indep, setIndep] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [until, setUntil] = useState(() => toLocalInput(new Date(Math.min(Date.now() + 48 * 3600_000, new Date(pool.expiresAt).getTime()))));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [touched, setTouched] = useState(false);

  const toInt = (s: string) => (/^\d+$/.test(s.trim()) ? parseInt(s, 10) : null);
  const r = toInt(indep);
  const future = (v: string) => (!v || isNaN(new Date(v).getTime()) ? "Choose a date." : new Date(v).getTime() <= now ? "Must be in the future." : null);
  const errors = {
    merchant: merchantId ? null : "Choose your store.",
    indep: r == null || r < 1 ? "Enter how many units you need." : null,
    neededBy: future(neededBy),
    until: future(until),
  };
  const invalid = Object.values(errors).some(Boolean);
  const locked = ["APPROVED", "LOCKED", "CLOSED"].includes(pool.status);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setErr(null);
    setSaved(false);
    if (invalid || r == null) {
      focusFirstError([{ id: "merchant", error: errors.merchant }, { id: "indep", error: errors.indep }, { id: "neededBy", error: errors.neededBy }, { id: "until", error: errors.until }]);
      return;
    }
    setBusy(true);
    try {
      await api.saveRestock({ merchantId, productId: pool.product.id, quantity: r, neededBy: new Date(neededBy).toISOString(), expiresAt: new Date(until).toISOString() });
      setSaved(true);
      setIndep("");
      onSaved();
    } catch (x) {
      setErr(errorMessage(x));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      <Field id="merchant" label="Your store" error={touched ? errors.merchant : null}>
        <select id="merchant" className="field" value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
          {stores.length === 0 && <option value="">No kirana in this zone</option>}
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field id="indep" label="Your own restock (units)" error={touched ? errors.indep : null}
        hint="Not counting neighbours' reservations.">
        <input id="indep" inputMode="numeric" className="field" value={indep} onChange={(e) => setIndep(e.target.value)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="neededBy" label="Needed by" error={touched ? errors.neededBy : null}>
          <input id="neededBy" type="datetime-local" className="field" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
        </Field>
        <Field id="until" label="Request open until" error={touched ? errors.until : null}>
          <input id="until" type="datetime-local" className="field" value={until} onChange={(e) => setUntil(e.target.value)} />
        </Field>
      </div>

      <div className="rounded-xl bg-sign-wash p-4" aria-live="polite">
        <p className="text-sm text-ink-soft">New units to buy, right now</p>
        <p className="text-3xl font-extrabold tabular-nums">{pool.eligibleProcurementQty}</p>
        <p className="text-sm text-ink-soft">Counted by the server after you save.</p>
      </div>

      {locked && <Notice tone="warn" title="Changing this cancels approvals" />}
      {err && <Notice tone="bad" title="Couldn't save">{err}</Notice>}
      {saved && <Notice tone="good" title="Saved" />}
      <button className="btn-primary w-full sm:w-auto" disabled={busy}>
        {busy && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />} Save my stock
      </button>
    </form>
  );
}
