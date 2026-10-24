"use client";
import { PageHead } from "@/components/PageHead";
import { STATUS_META } from "@/lib/status";
import type { UiStatus } from "@/lib/shared/types";
import { ModeBadge, Notice, StatusStamp } from "@/components/ui";
import { PoolBar } from "@/components/PoolBar";

export default function StatesPage() {
  const all = Object.keys(STATUS_META) as UiStatus[];
  return (
    <div>
      <PageHead title="Status reference" tag="For the team" />
      <ul className="mt-5 divide-y divide-paper-rule border-y border-paper-rule">
        {all.map((s) => (
          <li key={s} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
            <span className="w-52 shrink-0"><StatusStamp status={s} /></span>
            <span className="min-w-0 flex-1 text-ink-soft">{STATUS_META[s].plain}</span>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-xl font-bold">Payment mode</h2>
      <div className="mt-3 flex flex-wrap gap-3"><ModeBadge mode="UAT" /><ModeBadge mode="LIVE" /></div>
      <h2 className="mt-8 text-xl font-bold">Pool meter</h2>
      <div className="mt-3 space-y-8">
        <PoolBar qty={36} moq={50} />
        <PoolBar qty={56} moq={50} />
      </div>
      <h2 className="mt-8 text-xl font-bold">Notices</h2>
      <div className="mt-3 space-y-3">
        <Notice tone="info" title="Info">Neutral guidance.</Notice>
        <Notice tone="warn" title="Careful">Something the person should read first.</Notice>
        <Notice tone="bad" title="Problem">Says what went wrong and what to do.</Notice>
        <Notice tone="good" title="Done">Confirms a completed action by its own name.</Notice>
      </div>
    </div>
  );
}
