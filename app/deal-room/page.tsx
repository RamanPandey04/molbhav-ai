"use client";
import { useState } from "react";
import { Bot, Loader2, TriangleAlert } from "lucide-react";
import { api, errorMessage, normAgentRun, PILOT_POOL_ID, type Evaluation } from "@/lib/juhi/client";
import { useApi } from "@/lib/juhi/hooks";
import { formatDateTime, formatMoney } from "@/lib/juhi/format";
import { poolStatus, REASON_TEXT } from "@/lib/juhi/status";
import { DataClassChip, ErrorState, Loading, Notice, Rows, Section, StatusLine } from "@/components/ui";
import { AgentOutcome, AgentTrace } from "@/components/AgentTrace";
import { ApprovalList } from "@/components/ApprovalList";
import { ProposalTerms } from "@/components/Proposal";
import { PageHead } from "@/components/PageHead";
import { RoleGate } from "@/components/RoleGate";

export default function DealRoomPage() {
  return (
    <RoleGate allow={["ADMIN"]}>
      <DealRoom />
    </RoleGate>
  );
}

function DealRoom() {
  const res = useApi(async () => {
    const [pool, activity] = await Promise.all([api.getPool(PILOT_POOL_ID), api.getActivity()]);
    const evaluation = await api.getEvaluation(pool.poolId).catch(() => null);
    const runs = activity.agentRuns.map(normAgentRun).filter((r) => r.poolId === pool.poolId);
    return { pool, runs, evaluation };
  }, []);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setErr(null);
    try {
      await fn();
      res.reload();
    } catch (x) {
      setErr(errorMessage(x));
    } finally {
      setBusy(null);
    }
  }

  if (res.loading) return <Loading label="Opening the deal room…" />;
  if (res.error || !res.data) return <div><ErrorState message={res.error?.message ?? "Not found."} onRetry={res.reload} /></div>;
  const { pool: p, runs, evaluation } = res.data;
  const latest = runs[0] ?? null;
  const spin = (l: string) => busy === l && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />;

  return (
    <div>
      <PageHead title="Deal room">{p.product.name}, {p.product.packSize}</PageHead>
      <div className="mt-4 flex flex-wrap items-center gap-3"><StatusLine status={poolStatus(p)} /><DataClassChip value={p.dataClass} /></div>

      <Section title="Deterministic evaluation">
        <EvaluationView e={evaluation} poolVersion={p.version} />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button className="btn-primary" disabled={!!busy} onClick={() => act("eval", () => api.evaluate(p.poolId))}>{spin("eval")} Evaluate now</button>
          {evaluation?.decision === "PROPOSE" && !p.proposal && (
            <button className="btn-yellow" disabled={!!busy} onClick={() => act("prop", () => api.createProposal(evaluation.id))}>{spin("prop")} Create proposal</button>
          )}
        </div>
      </Section>

      <Section title="Agent review">
        <p className="text-ink-soft">Advisory only. The agent can&apos;t set prices, approve or take payments.</p>
        <button className="btn-ghost mt-3" disabled={!!busy || !evaluation} onClick={() => act("agent", () => api.agentReview(p.poolId))}>
          {busy === "agent" ? spin("agent") : <Bot size={16} aria-hidden />} Ask the agent to review
        </button>
        {!evaluation && <p className="field-hint">Run an evaluation first.</p>}
      </Section>

      {err && <Notice tone="bad" className="mt-4" title="The server refused this"><span className="inline-flex items-center gap-1.5"><TriangleAlert size={15} aria-hidden /> {err}</span></Notice>}

      <Section title="Saved agent runs">
        {!latest ? <p className="text-ink-soft">No agent run has been saved for this pool.</p> : (
          <div className="space-y-6">
            <AgentOutcome run={latest} />
            <AgentTrace run={latest} />
            {runs.length > 1 && (
              <ul className="space-y-1 text-sm text-ink-soft">
                {runs.slice(1).map((r) => <li key={r.id}>{r.createdAt ? formatDateTime(r.createdAt) : "–"} · {r.errorCode ?? r.providerStatus ?? r.status}</li>)}
              </ul>
            )}
          </div>
        )}
      </Section>

      <Section title="Proposal">
        {!p.proposal ? <p className="text-ink-soft">No proposal yet.</p> : (
          <div className="space-y-4">
            <ProposalTerms proposal={p.proposal} />
            <ApprovalList approvals={p.proposal.approvals} />
            {p.proposal.expiresAt && <p className="text-sm text-ink-soft">Expires {formatDateTime(p.proposal.expiresAt)}</p>}
          </div>
        )}
      </Section>
    </div>
  );
}

function EvaluationView({ e, poolVersion }: { e: Evaluation | null; poolVersion: number }) {
  if (!e) return <p className="text-ink-soft">No evaluation saved yet.</p>;
  const s = e.snapshot ?? {};
  const n = (k: string) => (typeof s[k] === "number" ? formatMoney(s[k] as number) : "–");
  return (
    <div className="space-y-3">
      <Rows rows={[
        { label: "Decision", value: e.decision, strong: true },
        { label: "Saved", value: formatDateTime(e.created_at) },
        { label: "Pool version", value: `${e.pool_version}${e.pool_version !== poolVersion ? " (pool has changed since)" : ""}` },
        { label: "Landed total", value: n("landedTotalPaise") },
        { label: "Usual total", value: n("baselineTotalPaise") },
        { label: "Saving", value: n("savingsPaise") },
      ]} />
      {e.reason_codes.length > 0 && <ul className="list-disc pl-5 text-ink-soft">{e.reason_codes.map((c) => <li key={c}>{REASON_TEXT[c] ?? c}</li>)}</ul>}
    </div>
  );
}
