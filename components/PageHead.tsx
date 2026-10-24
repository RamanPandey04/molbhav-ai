"use client";
import clsx from "clsx";
import type { Role } from "@/lib/shared/types";
import { useSession } from "@/lib/session";

const DOT: Record<Role, string> = { BUYER: "bg-turmeric", KIRANA: "bg-leaf", SUPPLIER: "bg-sign", ADMIN: "bg-ink" };
const TAG: Record<Role, string> = { BUYER: "Buyer", KIRANA: "Kirana owner", SUPPLIER: "Supplier", ADMIN: "Admin" };

/** Page title block. A small dot colour tells you which role's screen this is. */
export function PageHead({ title, children, tag }: { title: React.ReactNode; children?: React.ReactNode; tag?: string }) {
  const { role } = useSession();
  return (
    <div className="pb-1 pt-7">
      <p className="flex items-center gap-2 text-[15px] font-semibold text-ink-soft">
        <span className={clsx("h-2.5 w-2.5 rounded-full", DOT[role])} aria-hidden /> {tag ?? TAG[role]}
      </p>
      <h1 className="mt-1.5 text-[34px] leading-[1.1]">{title}</h1>
      {children && <div className="mt-2.5 max-w-[44ch] text-[17px] leading-snug text-ink-soft [&_strong]:text-ink">{children}</div>}
    </div>
  );
}
