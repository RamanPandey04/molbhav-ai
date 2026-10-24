"use client";
import clsx from "clsx";
import { Bot, Check, CircleAlert, Hourglass, Wrench, Flag, UserCheck, Play } from "lucide-react";
import type { AgentRun, TimelineEvent } from "@/lib/shared/types";
import { formatTime } from "@/lib/format";
import { REASON_TEXT, runStatus } from "@/lib/status";
import { SampleChip, StatusStamp } from "@/components/ui";

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

const DECISION_TEXT: Record<string, string> = { PROPOSE: "propose a deal", NO_DEAL: "no deal", BLOCKED: "blocked, missing information" };

function describe(e: TimelineEvent): { title: string; Icon: typeof Bot; tone: string } {
  switch (e.type) {
    case "RUN_STARTED":
      return { title: "Run started", Icon: Play, tone: "bg-ink text-white" };
    case "TOOL_CALLED":
    case "TOOL_RESULT":
      return { title: TOOL_TEXT[e.name ?? ""] ?? `Called ${e.name}`, Icon: Wrench, tone: "bg-sign text-white" };
    case "DECISION":
      return { title: `Decision: ${DECISION_TEXT[e.summary ?? ""] ?? e.summary ?? ""}`.trim(), Icon: Flag, tone: "bg-turmeric text-ink" };
    case "APPROVAL_REQUESTED":
      return { title: `Approval requested from ${e.role?.toLowerCase() ?? "a person"}`, Icon: Hourglass, tone: "bg-turmeric-wash text-slate-warn border border-turmeric-deep" };
    case "APPROVAL_RECORDED":
      return { title: `${cap(e.role)} ${e.summary?.toLowerCase() ?? "decided"}`, Icon: UserCheck, tone: "bg-leaf text-white" };
    case "ERROR":
      return { title: `Failed${e.name ? ` in ${e.name}` : ""}`, Icon: CircleAlert, tone: "bg-stamp text-white" };
  }
}
const cap = (s?: string) => (s ? s[0] + s.slice(1).toLowerCase() : "Someone");

/** Renders only what the backend recorded. If the timeline is empty we say so; we never fill gaps. */
export function AgentTrace({ run }: { run: AgentRun }) {
  const running = run.status === "RUNNING";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-sm font-semibold text-white">
          <Bot size={15} aria-hidden /> AgenticOrg agent
        </span>
        {run.isSample && <SampleChip />}
        <span className="text-sm text-ink-soft">
          Run ID <span className="font-semibold text-ink" data-testid="run-id">{run.providerRunId}</span>
        </span>
      </div>

      <ol className="mt-5" aria-label="Agent timeline">
        {run.timeline.length === 0 && <li className="text-ink-soft">No events recorded yet.</li>}
        {run.timeline.map((e, i) => {
          const d = describe(e);
          const last = i === run.timeline.length - 1 && !running;
          return (
            <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
              {!last && <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-paper-rule" aria-hidden />}
              <span className={clsx("z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full", d.tone)}>
                <d.Icon size={15} aria-hidden />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-semibold leading-snug">{d.title}</p>
                {e.summary && e.type !== "DECISION" && e.type !== "APPROVAL_RECORDED" && e.type !== "RUN_STARTED" && <p className="text-sm text-ink-soft">{e.summary}</p>}
                <p className="text-xs text-ink-faint">{formatTime(e.occurredAt)}</p>
              </div>
            </li>
          );
        })}
        {running && (
          <li className="flex items-center gap-3 text-ink-soft" role="status">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-dashed border-ink-faint">
              <Hourglass size={14} className="animate-pulse motion-reduce:animate-none" aria-hidden />
            </span>
            Agent is working…
          </li>
        )}
      </ol>
    </div>
  );
}

export function AgentOutcome({ run }: { run: AgentRun }) {
  if (run.status === "RUNNING") return null;
  return (
    <div className="space-y-3">
      <StatusStamp status={runStatus(run)} animate size="lg" />
      <p className="max-w-prose text-[17px] leading-snug">{run.status === "ERROR" ? run.errorMessage : run.summary}</p>
      {run.reasonCodes.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Reasons">
          {run.reasonCodes.map((c) => (
            <li key={c} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm shadow-card" title={c}>
              <Check size={13} className="text-ink-faint" aria-hidden /> {REASON_TEXT[c] ?? c}
            </li>
          ))}
        </ul>
      )}
      {run.status === "COMPLETED" && run.timeline.some((e) => e.name === "evaluate_deal") && (
        <p className="text-sm text-ink-soft">Sums done by the server, not the agent.</p>
      )}
    </div>
  );
}
