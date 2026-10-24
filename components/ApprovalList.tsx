import clsx from "clsx";
import { Check, Clock, X } from "lucide-react";
import type { Approval } from "@/lib/juhi/types";
import { formatDateTime } from "@/lib/juhi/format";

const ROLE_TEXT = { SUPPLIER: "Supplier", KIRANA: "Kirana owner", BUYER: "Buyer" } as const;

export function ApprovalList({ approvals }: { approvals: Approval[] }) {
  return (
    <ul className="divide-y divide-paper-rule border-y border-paper-rule">
      {approvals.map((a) => (
        <li key={a.approvalId} className="flex items-center gap-3 py-3">
          <span
            className={clsx(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full",
              a.status === "APPROVED" && "bg-leaf text-white",
              a.status === "REJECTED" && "bg-stamp text-white",
              a.status === "PENDING" && "border border-dashed border-ink-faint text-ink-faint",
              a.status === "EXPIRED" && "bg-ink/10 text-ink-soft",
            )}
          >
            {a.status === "APPROVED" ? <Check size={16} aria-hidden /> : a.status === "REJECTED" ? <X size={16} aria-hidden /> : <Clock size={15} aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{ROLE_TEXT[a.role]}</p>
            <p className="text-sm text-ink-soft">
              {a.status === "PENDING" && "Waiting for a decision"}
              {a.status === "EXPIRED" && "Expired before a decision"}
              {(a.status === "APPROVED" || a.status === "REJECTED") && `${a.status === "APPROVED" ? "Approved" : "Rejected"} by ${a.actorName ?? "unknown"}${a.decidedAt ? `, ${formatDateTime(a.decidedAt)}` : ""}`}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
