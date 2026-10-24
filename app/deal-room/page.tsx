"use client";
import { useEffect, useState } from "react";
import { Bot, Loader2, TriangleAlert } from "lucide-react";
import { api, errorMessage, PILOT_POOL_ID } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { formatDateTime, formatMoney, isExpired } from "@/lib/format";
import { poolStatus } from "@/lib/status";
import { ErrorState, Loading, Notice, Rows, Section, StatusLine } from "@/components/ui";
import { AgentOutcome, AgentTrace } from "@/components/AgentTrace";
import { ApprovalList } from "@/components/ApprovalList";
import { ProposalTerms } from "@/components/Proposal";
import { PageHead } from "@/components/PageHead";
import { RoleGate } from "@/components/RoleGate";
import type { AgentRun } from "@/lib/shared/types";

export default function DealRoomPage() {
  return (
    <RoleGate allow={["ADMIN"]}>
      <DealRoom />
    </RoleGate>
  );
}

function DealRoom() {
  const pool = useApi(() => api.getPool(PILOT_POOL_ID), []);
  const [runId, setRunId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState<string | null>(null);

  useEffect(() => {
    if (pool.data?.latestAgentRunId && !runId) setRunId(pool.data.latestAgentRunId);
  }, [pool.data?.latestAgentRunId, runId]);

  const run = useApi<AgentRun | null>(() => (runId ? api.getAgentRun(runId) : Promise.resolve(null)), [runId], {
    pollWhile: (r) => r?.status === "RUNNING",
    everyMs: 1000,
  });

  // When a run finishes, the pool (proposal, status) has changed on the server.
  const runStatusNow = run.data?.status;
  useEffect(() => {
    if (runStatusNow && runStatusNow !== "RUNNING") pool.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runStatusNow]);

  if (pool.loading) return <Loading label="Loading the deal room…" />;
  if (pool.error || !pool.data) return <div><ErrorState message={pool.error?.message ?? "Not found."} onRetry={pool.reload} /></div>;
  const p = pool.data;
  const r = run.data;
  const expired = isExpired(p.expiresAt) || p.status === "EXPIRED";
  const running = r?.status === "RUNNING";
  const stale = r && r.status !== "RUNNING" && r.poolVersion !== p.version;

  async function start() {
    setStarting(true);
    setStartErr(null);
    try {
      const started = await api.startAgentRun(p.poolId);
      setRunId(started.providerRunId);
    } catch (e) {
      setStartErr(errorMessage(e));
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <PageHead title="AI Deal Room" />
      <div className="mt-4"><StatusLine status={poolStatus(p)} /></div>

      <Section title="Pool">
        <Rows
          rows={[
            { label: "Units", value: `${p.eligibleProcurementQty} of ${p.minimumOrderQty}` },
            { label: "Quote", value: p.quotes[0] ? `${formatMoney(p.quotes[0].unitPriceMinor)} per unit` : "None" },
            { label: "From", value: p.quotes[0] ? p.quotes[0].quotedBy : "–" },
          ]}
        />
      </Section>

      <Section title="Agent run" aside={r && <span className="text-sm text-ink-soft">Started {formatDateTime(r.startedAt)}</span>}>
        <button className="btn-primary w-full sm:w-auto" onClick={start} disabled={starting || running || expired}>
          {starting || running ? <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Bot size={18} aria-hidden />}
          {running ? "Agent is working…" : r ? "Run the agent again" : "Run the agent"}
        </button>
        {expired && <p className="field-hint">Pool closed.</p>}
        {startErr && <Notice tone="bad" className="mt-4" title="Agent didn't start">{startErr}</Notice>}

        {run.error && <div className="mt-4"><ErrorState message={run.error.message} onRetry={run.reload} title="Couldn't load the run" /></div>}

        {!r && !run.error && !starting && (
          <p className="mt-4 text-ink-soft">No run yet.</p>
        )}

        {r && (
          <div className="mt-6 space-y-6">
            {stale && (
              <Notice tone="warn" title={`Pool changed since this run (v${r.poolVersion} → v${p.version}). Run again.`} />
            )}
            <AgentOutcome run={r} />
            <AgentTrace run={r} />
            <p className="flex items-start gap-2 text-sm text-ink-soft">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
              {r.isVerifiedRealRevenue ? "Counted as revenue by the server." : "Not counted as revenue."}
            </p>
          </div>
        )}
      </Section>

      {p.proposal && (
        <Section title="Proposal">
          <ProposalTerms proposal={p.proposal} />
          <div className="mt-5"><ApprovalList approvals={p.proposal.approvals} /></div>
          {p.proposal.status === "INVALIDATED" && (
            <Notice tone="warn" className="mt-4" title="Approvals cleared. Run the agent again." />
          )}
        </Section>
      )}
    </div>
  );
}
