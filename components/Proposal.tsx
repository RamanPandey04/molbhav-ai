"use client";
import type { PoolDetail, Proposal } from "@/lib/juhi/types";
import { api } from "@/lib/juhi/client";
import { formatMoney } from "@/lib/juhi/format";
import { ApprovalList } from "@/components/ApprovalList";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Notice, Rows, StatusStamp } from "@/components/ui";
import type { UiStatus } from "@/lib/juhi/types";

export function proposalUiStatus(p: Proposal): UiStatus {
  switch (p.status) {
    case "APPROVED": return "OFFER_READY";
    case "REJECTED": return "NO_DEAL";
    case "INVALIDATED": return "QUOTED";
    case "EXPIRED": return "EXPIRED";
    default: return "AWAITING_APPROVAL";
  }
}

export function ProposalTerms({ proposal }: { proposal: Proposal }) {
  const perUnit = proposal.pooledQty > 0 ? Math.round(proposal.landedTotalMinor / proposal.pooledQty) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">Version {proposal.version}</p>
        <StatusStamp status={proposalUiStatus(proposal)} size="sm" />
      </div>
      <Rows
        rows={[
          { label: "Units", value: proposal.pooledQty },
          { label: "All-in cost", value: `${formatMoney(proposal.landedTotalMinor)} (about ${formatMoney(perUnit)} each)` },
          { label: "Usual cost", value: formatMoney(proposal.baselineTotalMinor) },
          { label: "Estimated saving", value: formatMoney(proposal.estimatedSavingsMinor), strong: true },
          { label: "Buyer price per unit", value: proposal.proposedCustomerPriceMinor != null ? formatMoney(proposal.proposedCustomerPriceMinor) : "Not shown to your role", strong: true },
        ]}
      />
    </div>
  );
}

const ROLE_VERB: Record<"SUPPLIER" | "KIRANA", { approve: string; what: (p: Proposal) => React.ReactNode }> = {
  SUPPLIER: {
    approve: "Accept order",
    what: (p) => <>Accept <strong>{p.pooledQty} units</strong> at your quoted price?</>,
  },
  KIRANA: {
    approve: "Approve",
    what: (p) => <>Approve {p.proposedCustomerPriceMinor != null && <><strong>{formatMoney(p.proposedCustomerPriceMinor)} per unit</strong> for buyers and </>} <strong>{p.pooledQty} units</strong> from the supplier?</>,
  },
};

/** The one place a supplier or kirana commits. Server re-checks role, terms hash and snapshot freshness. */
export function RoleApproval({ role, pool, onChanged }: { role: "SUPPLIER" | "KIRANA"; pool: PoolDetail; onChanged: () => void }) {
  const p = pool.proposal;
  if (!p) return <Notice tone="info" title="No proposal yet" />;
  if (p.status === "EXPIRED")
    return <Notice tone="warn" title="This proposal expired. Needs a new proposal." />;
  if (p.status === "INVALIDATED")
    return <Notice tone="warn" title="Terms changed. Needs a new proposal." />;
  const mine = p.approvals.find((a) => a.role === role);
  const supplier = p.approvals.find((a) => a.role === "SUPPLIER");
  const waitingOnSupplier = role === "KIRANA" && supplier?.status !== "APPROVED";
  const verb = ROLE_VERB[role];

  return (
    <div className="space-y-4">
      <ProposalTerms proposal={p} />
      <ApprovalList approvals={p.approvals} />
      {mine?.status === "PENDING" ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <ConfirmAction
            label={verb.approve}
            confirmLabel="Confirm"
            summary={verb.what(p)}
            disabled={waitingOnSupplier}
            disabledReason="Supplier goes first."
            onConfirm={async () => {
              await api.decide(p.proposalId, { decision: "APPROVE", termsHash: p.termsHash });
              onChanged();
            }}
          />
          <ConfirmAction
            label="Reject"
            variant="danger"
            confirmLabel="Reject"
            summary={<>Reject this deal?</>}
            onConfirm={async () => {
              await api.decide(p.proposalId, { decision: "REJECT", termsHash: p.termsHash });
              onChanged();
            }}
          />
        </div>
      ) : (
        mine && <Notice tone={mine.status === "APPROVED" ? "good" : "bad"} title={mine.status === "APPROVED" ? "You approved these terms" : "You rejected these terms"} />
      )}
    </div>
  );
}
