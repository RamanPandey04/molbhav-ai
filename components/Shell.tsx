"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { SessionProvider, useSession } from "@/lib/juhi/session";
import { PILOT_POOL_ID } from "@/lib/juhi/client";
import type { Role } from "@/lib/juhi/types";

const POOL = `/pool/${PILOT_POOL_ID}`;

const NAV: Record<Role, { href: string; label: string }[]> = {
  BUYER: [{ href: "/", label: "Join the pool" }, { href: POOL, label: "Pool status" }],
  KIRANA: [{ href: "/kirana", label: "Kirana console" }, { href: POOL, label: "Pool status" }],
  SUPPLIER: [{ href: "/supplier", label: "Supplier console" }, { href: POOL, label: "Pool status" }],
  ADMIN: [{ href: "/deal-room", label: "AI Deal Room" }, { href: POOL, label: "Pool status" }],
};
const ROLE_LABEL: Record<Role, string> = { BUYER: "Buyer", KIRANA: "Kirana owner", SUPPLIER: "Supplier", ADMIN: "Admin" };

function Header() {
  const { role, session, ready } = useSession();
  const path = usePathname();
  const links = NAV[role ?? "BUYER"];
  return (
    <header className="border-b border-ink/[.08] bg-white print:hidden">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pt-3.5">
        <Link href="/" className="leading-none" aria-label="Molbhav.AI home">
          <span className="block font-display text-[28px] text-ink">Molbhav<span className="text-turmeric-deep">.AI</span></span>
          <span className="mt-0.5 block text-[13px] font-medium text-ink-faint" lang="hi">मोलभाव · पड़ोस की ताक़त</span>
        </Link>
        <span className="rounded-full bg-turmeric-wash px-3 py-1 text-[13px] font-semibold text-slate-warn">
          Manual UPI
        </span>
      </div>
      <nav aria-label="Main" className="mx-auto mt-2 flex max-w-3xl items-center gap-6 overflow-x-auto px-4">
        {links.map((l) => {
          const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <Link
              key={l.href + l.label} href={l.href} aria-current={active ? "page" : undefined}
              className={clsx("flex min-h-[46px] items-center whitespace-nowrap border-b-[3px] text-[16px] font-semibold", active ? "border-turmeric text-ink" : "border-transparent text-ink-soft hover:text-ink")}
            >
              {l.label}
            </Link>
          );
        })}
        <Link href="/access" aria-current={path === "/access" ? "page" : undefined} className="ml-auto shrink-0 text-sm text-ink-faint hover:text-ink">
          {!ready ? "" : session ? (role ? ROLE_LABEL[role] : "No role yet") : "Sign in"}
        </Link>
      </nav>
    </header>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Header />
      <main className="mx-auto min-h-[70vh] max-w-3xl px-4 pb-16">{children}</main>
      <footer className="print:hidden">
        <p className="mx-auto max-w-3xl px-4 pb-10 pt-2 text-sm leading-relaxed text-ink-faint">
          Estimates until everyone approves. Joining isn&apos;t buying.
        </p>
      </footer>
    </SessionProvider>
  );
}
