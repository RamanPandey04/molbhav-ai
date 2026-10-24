"use client";
import clsx from "clsx";
import { AlertTriangle, Check, FlaskConical, Info, Loader2, RefreshCw, ShieldCheck, Inbox } from "lucide-react";
import type { PaymentMode, UiStatus } from "@/lib/shared/types";
import { STATUS_META, type Tone } from "@/lib/status";

const TONE: Record<Tone, { pill: string; dot: string }> = {
  ink: { pill: "bg-ink/[.08] text-ink", dot: "bg-ink-soft" },
  sign: { pill: "bg-sign-wash text-sign-deep", dot: "bg-sign" },
  turmeric: { pill: "bg-turmeric-wash text-slate-warn", dot: "bg-turmeric" },
  leaf: { pill: "bg-leaf-wash text-leaf", dot: "bg-leaf" },
  stamp: { pill: "bg-stamp-wash text-stamp", dot: "bg-stamp" },
};

/** A truthful status as a pill. Each UiStatus has its own word and tone; none collapse into "Success". */
export function StatusStamp({ status, size = "md", className }: { status: UiStatus; size?: "sm" | "md" | "lg"; animate?: boolean; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span
      data-status={status}
      className={clsx(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full font-semibold",
        size === "sm" && "px-2.5 py-0.5 text-[13px]",
        size === "md" && "px-3 py-1 text-[15px]",
        size === "lg" && "px-4 py-1.5 text-[17px]",
        TONE[m.tone].pill,
        className,
      )}
    >
      <span className={clsx("h-2 w-2 rounded-full", TONE[m.tone].dot)} aria-hidden />
      {m.label}
    </span>
  );
}

export function StatusLine({ status }: { status: UiStatus }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <StatusStamp status={status} />
      <p className="text-sm text-ink-soft">{STATUS_META[status].plain}</p>
    </div>
  );
}

export function ModeBadge({ mode, className }: { mode: PaymentMode; className?: string }) {
  return mode === "UAT" ? (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full bg-turmeric-wash px-3 py-1 text-sm font-semibold text-slate-warn", className)}>
      <FlaskConical size={15} aria-hidden /> Test mode: no real money
    </span>
  ) : (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full bg-leaf px-3 py-1 text-sm font-semibold text-white", className)}>
      <ShieldCheck size={15} aria-hidden /> Live payment
    </span>
  );
}

export function SampleChip({ className }: { className?: string }) {
  return <span className={clsx("inline-flex rounded-full bg-stamp-wash px-2.5 py-0.5 text-xs font-semibold text-stamp", className)}>Sample data</span>;
}

type NoticeTone = "info" | "warn" | "bad" | "good";
const NOTICE: Record<NoticeTone, { cls: string; Icon: typeof Info }> = {
  info: { cls: "bg-sign-wash text-ink [&>svg]:text-sign", Icon: Info },
  warn: { cls: "bg-turmeric-wash text-ink [&>svg]:text-turmeric-deep", Icon: AlertTriangle },
  bad: { cls: "bg-stamp-wash text-ink [&>svg]:text-stamp", Icon: AlertTriangle },
  good: { cls: "bg-leaf-wash text-ink [&>svg]:text-leaf", Icon: Check },
};
export function Notice({ tone = "info", title, children, className }: { tone?: NoticeTone; title?: string; children?: React.ReactNode; className?: string }) {
  const { cls, Icon } = NOTICE[tone];
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={clsx("flex gap-3 rounded-xl p-4 text-[15px]", cls, className)}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={clsx(title && "mt-0.5", "text-ink-soft [&_strong]:text-ink")}>{children}</div>}
      </div>
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2.5 py-10 text-ink-soft">
      <Loader2 size={20} className="animate-spin motion-reduce:animate-none" aria-hidden /> {label}
    </div>
  );
}

export function ErrorState({ message, onRetry, title = "Couldn't load this" }: { message: string; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="rounded-2xl bg-stamp-wash p-5">
      <p className="font-display text-xl text-stamp">{title}</p>
      <p className="mt-1 text-ink-soft">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-4">
          <RefreshCw size={16} aria-hidden /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-6 text-center">
      <Inbox className="mx-auto text-ink-faint" size={28} aria-hidden />
      <p className="mt-2 font-display text-xl">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-ink-soft">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- forms ---------- */
export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      {children}
      {error ? <p id={`${id}-err`} className="field-error">{error}</p> : hint ? <p id={`${id}-hint`} className="field-hint">{hint}</p> : null}
    </div>
  );
}

/** A titled block. Content sits on a white card unless `bare`. */
export function Section({ title, aside, children, className, bare }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string; bare?: boolean }) {
  return (
    <section className={clsx("mt-8", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[22px]">{title}</h2>
        {aside}
      </div>
      {bare ? children : <div className="card">{children}</div>}
    </section>
  );
}

/** Label/value pair rows with ledger rules between them. */
export function Rows({ rows }: { rows: { label: string; value: React.ReactNode; strong?: boolean }[] }) {
  return (
    <dl>
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-4 border-b border-paper-rule py-3 last:border-b-0 first:pt-0 last:pb-0">
          <dt className="text-ink-soft">{r.label}</dt>
          <dd className={clsx("text-right tabular-nums", r.strong ? "text-lg font-bold" : "font-semibold")}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
