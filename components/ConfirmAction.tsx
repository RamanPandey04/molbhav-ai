"use client";
import { useState } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { errorMessage } from "@/lib/juhi/client";
import { Notice } from "@/components/ui";

/**
 * Two-step button for anything that commits someone: first click shows exactly what they're agreeing to.
 * The caller's `onConfirm` does the API call; errors are shown inline and never swallowed.
 */
export function ConfirmAction({
  label, confirmLabel, summary, onConfirm, variant = "primary", disabled, disabledReason, doneMessage,
}: {
  label: string;
  confirmLabel: string;
  summary: React.ReactNode;
  onConfirm: () => Promise<void>;
  variant?: "primary" | "danger" | "yellow";
  disabled?: boolean;
  disabledReason?: string;
  doneMessage?: string;
}) {
  const [stage, setStage] = useState<"idle" | "confirm" | "busy" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);

  if (stage === "done" && doneMessage) return <Notice tone="good">{doneMessage}</Notice>;
  if (stage === "idle" || stage === "done")
    return (
      <div>
        <button className={clsx(variant === "primary" ? "btn-primary" : variant === "yellow" ? "btn-yellow" : "btn-danger", "w-full sm:w-auto")} disabled={disabled} onClick={() => { setErr(null); setStage("confirm"); }}>
          {label}
        </button>
        {disabled && disabledReason && <p className="field-hint">{disabledReason}</p>}
      </div>
    );
  return (
    <div className="rounded-2xl border border-ink/15 bg-white p-4 shadow-card" role="group" aria-label="Confirm">
      <div className="text-ink">{summary}</div>
      {err && <p className="field-error" role="alert">{err}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className={clsx(variant === "danger" ? "btn-danger" : variant === "yellow" ? "btn-yellow" : "btn-primary")}
          disabled={stage === "busy"}
          onClick={async () => {
            setStage("busy");
            setErr(null);
            try {
              await onConfirm();
              setStage("done");
            } catch (e) {
              setErr(errorMessage(e));
              setStage("confirm");
            }
          }}
        >
          {stage === "busy" && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />} {confirmLabel}
        </button>
        <button className="btn-ghost" disabled={stage === "busy"} onClick={() => setStage("idle")}>Go back</button>
      </div>
    </div>
  );
}
