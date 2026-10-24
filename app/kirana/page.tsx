"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api, errorMessage, PILOT_POOL_ID } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { focusFirstError, formatDateTime } from "@/lib/format";
import { poolStatus } from "@/lib/status";
import { ErrorState, Field, Loading, Notice, Section, StatusLine } from "@/components/ui";
import { PoolLedger } from "@/components/PoolLedger";
import { PoolBar } from "@/components/PoolBar";
import { RoleApproval } from "@/components/Proposal";
import { PageHead } from "@/components/PageHead";
import { RoleGate } from "@/components/RoleGate";
import type { PoolDetail } from "@/lib/shared/types";

export default function KiranaPage() {
  return (
    <RoleGate allow={["KIRANA"]}>
      <Console />
    </RoleGate>
  );
}

function Console() {
  const { data: pool, error, loading, reload, setData } = useApi(() => api.getPool(PILOT_POOL_ID), []);
  if (loading) return <Loading label="Loading your pool…" />;
  if (error || !pool) return <div><ErrorState message={error?.message ?? "Not found."} onRetry={reload} /></div>;
  return (
    <div>
      <PageHead title="Kirana console" />
      <div className="mt-4"><StatusLine status={poolStatus(pool)} /></div>

      <Section title="Your stock">
        <RestockForm pool={pool} onSaved={setData} />
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

function RestockForm({ pool, onSaved }: { pool: PoolDetail; onSaved: (p: PoolDetail) => void }) {
  const [indep, setIndep] = useState("");
  const [alloc, setAlloc] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setIndep(String(pool.restock?.independentQty ?? ""));
    setAlloc(String(pool.restock?.allocatedStockToBuyers ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.restock?.confirmedAt]);

  const toInt = (s: string) => (/^\d+$/.test(s.trim()) ? parseInt(s, 10) : null);
  const r = toInt(indep);
  const a = toInt(alloc);
  const errors = {
    indep: r == null ? "Enter a number. Use 0 for none." : null,
    alloc: a == null ? "Enter a number. Use 0 for none." : a > pool.buyerDemandQty ? `Can't exceed ${pool.buyerDemandQty} reserved.` : null,
  };
  const invalid = !!(errors.indep || errors.alloc);
  const preview = !invalid && r != null && a != null ? Math.max(0, pool.buyerDemandQty - a) + r : null;
  const locked = ["APPROVED", "LOCKED", "CLOSED"].includes(pool.status);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setErr(null);
    setSaved(false);
    if (invalid || r == null || a == null) {
      focusFirstError([{ id: "indep", error: errors.indep }, { id: "alloc", error: errors.alloc }]);
      return;
    }
    setBusy(true);
    try {
      const updated = await api.saveRestock({ poolId: pool.poolId, merchantId: pool.merchant.id, independentQty: r, allocatedStockToBuyers: a });
      onSaved(updated);
      setSaved(true);
    } catch (x) {
      setErr(errorMessage(x));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      <Field id="indep" label="Your own restock (units)" error={touched ? errors.indep : null}
        hint="Not counting neighbours' reservations.">
        <input id="indep" inputMode="numeric" className="field" value={indep} onChange={(e) => setIndep(e.target.value)} />
      </Field>
      <Field id="alloc" label="Stock you hold for buyers (units)" error={touched ? errors.alloc : null}
        hint={`Buyers reserved ${pool.buyerDemandQty}.`}>
        <input id="alloc" inputMode="numeric" className="field" value={alloc} onChange={(e) => setAlloc(e.target.value)} />
      </Field>

      <div className="rounded-xl bg-sign-wash p-4" aria-live="polite">
        <p className="text-sm text-ink-soft">New units to buy</p>
        <p className="text-3xl font-extrabold tabular-nums">{preview ?? "–"}</p>
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
