"use client";
import clsx from "clsx";
import { Bot, CircleAlert, Wrench, Flag, Play, Server } from "lucide-react";
import type { PersistedAgentRun, RecordedEvent } from "@/lib/juhi/types";
import { formatDateTime, formatTime } from "@/lib/juhi/format";
import { DataClassChip, StatusStamp } from "@/components/ui";

const TOOL_TEXT: Record<string, string> = {
  get_pool_context: "Read the pool",
  get_supplier_quotes: "Read supplier quotes",
  evaluate_deal: "Ran the pricing check",
  prepare_counteroffer: "Drafted a counteroffer",
  submit_counteroffer_for_review: "Sent the counteroffer for review",
  create_deal_proposal: "Saved a proposal",
  request_human_approval: "Asked a person to approve",
  read_approval_status: "Checked approval status",
};

const BACKEND_TEXT: Record<string, string> = {
  EVALUATION_LOADED: "Loaded the saved evaluation",
  PROVIDER_CALL_STARTED: "Called the AgenticOrg provider",
  PROVIDER_RESPONSE_RECEIVED: "Provider responded",
  REQUEST_BLOCKED_OR_FAILED: "Blocked or failed before a result",
};

function describe(e: RecordedEvent): { title: string; Icon: typeof Bot; tone: string } {
  if (/FAIL|ERROR|BLOCK/.test(e.type)) return { title: BACKEND_TEXT[e.type] ?? `Failed${e.name ? ` in ${e.name}` : ""}`, Icon: CircleAlert, tone: "bg-stamp text-white" };
  if (e.source === "BACKEND") {
    if (e.type === "EVALUATION_LOADED") return { title: BACKEND_TEXT[e.type], Icon: Play, tone: "bg-ink text-white" };
    return { title: BACKEND_TEXT[e.type] ?? e.type, Icon: Server, tone: "bg-ink text-white" };
  }
  if (e.type === "DECISION") return { title: `Decision: ${e.summary ?? ""}`.trim(), Icon: Flag, tone: "bg-turmeric text-ink" };
  return { title: e.name ? TOOL_TEXT[e.name] ?? `Called ${e.name}` : e.type, Icon: Wrench, tone: "bg-sign text-white" };
}

function Timeline({ events, label, empty }: { events: RecordedEvent[]; label: string; empty: string }) {
  return (
    <ol className="mt-3" aria-label={label}>
      {events.length === 0 && <li className="text-ink-soft">{empty}</li>}
      {events.map((e, i) => {
        const d = describe(e);
        const last = i === events.length - 1;
        return (
          <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-paper-rule" aria-hidden />}
            <span className={clsx("z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full", d.tone)}>
              <d.Icon size={15} aria-hidden />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-semibold leading-snug">{d.title}</p>
              {e.summary && e.type !== "DECISION" && <p className="text-sm text-ink-soft">{e.summary}</p>}
              <p className="text-xs text-ink-faint">{e.occurredAt ? formatTime(e.occurredAt) : "No timestamp recorded"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Renders only what the backend saved. Backend and provider events are kept apart; gaps are never filled. */
export function AgentTrace({ run }: { run: PersistedAgentRun }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-sm font-semibold text-white">
          <Bot size={15} aria-hidden /> AgenticOrg agent
        </span>
        <DataClassChip value={run.dataClass} />
        <span className="text-sm text-ink-soft">
          Run ID <span className="font-semibold text-ink" data-testid="run-id">{run.providerRunId ?? "none issued by the provider"}</span>
        </span>
      </div>

      <p className="mt-5 text-[15px] font-semibold">Recorded by our server</p>
      <Timeline events={run.backendEvents} label="Backend events" empty="No backend events saved." />

      <p className="mt-5 text-[15px] font-semibold">Reported by the provider</p>
      <Timeline events={run.providerEvents} label="Provider events" empty="No provider tool trace was recorded for this run." />
    </div>
  );
}

export function AgentOutcome({ run }: { run: PersistedAgentRun }) {
  return (
    <div className="space-y-3">
      {run.errorCode ? <StatusStamp status="AGENT_ERROR" size="lg" /> : (
        <span className="inline-flex items-center gap-2 rounded-full bg-sign-wash px-4 py-1.5 text-[17px] font-semibold text-sign-deep">
          {run.providerStatus ?? run.status}
        </span>
      )}
      <p className="max-w-prose text-[17px] leading-snug">
        {run.errorCode ? `Stopped with ${run.errorCode}. Nothing was proposed by the agent.` : "Advisory only. It can't change prices, terms, approvals or payments."}
      </p>
      <p className="text-sm text-ink-soft">Saved {run.createdAt ? formatDateTime(run.createdAt) : "at an unknown time"}{run.completedAt ? `, finished ${formatDateTime(run.completedAt)}` : ""}.</p>
    </div>
  );
}
