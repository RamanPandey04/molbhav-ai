"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { SessionProvider, useSession } from "@/lib/session";
import { USE_FIXTURES, PILOT_POOL_ID } from "@/lib/api/client";
import { SCENARIOS, getScenario, setScenario, type Scenario } from "@/lib/fixtures/store";
import type { Role } from "@/lib/shared/types";

const PAYMENT_MODE = process.env.NEXT_PUBLIC_PAYMENT_MODE === "LIVE" ? "LIVE" : "UAT";
const POOL = `/pool/${PILOT_POOL_ID || "pilot"}`;

const NAV: Record<Role, { href: string; label: string }[]> = {
  BUYER: [{ href: "/", label: "Join the pool" }, { href: POOL, label: "Pool status" }],
  KIRANA: [{ href: "/kirana", label: "Kirana console" }, { href: POOL, label: "Pool status" }],
  SUPPLIER: [{ href: "/supplier", label: "Supplier console" }, { href: POOL, label: "Pool status" }],
  ADMIN: [{ href: "/deal-room", label: "AI Deal Room" }, { href: POOL, label: "Pool status" }],
};
const ROLE_LABEL: Record<Role, string> = { BUYER: "Buyer", KIRANA: "Kirana owner", SUPPLIER: "Supplier", ADMIN: "Admin" };

function SampleBar() {
  const { role, setRole } = useSession();
  const [scenario, setLocal] = useState<Scenario>("quoted_ready");
  useEffect(() => setLocal(getScenario()), []);
  return (
    <div className="bg-ink text-white print:hidden" data-testid="sample-bar">
      <details className="group">
        <summary className="mx-auto flex min-h-[40px] max-w-3xl cursor-pointer list-none items-center gap-2 px-4 py-1.5 text-[14px]">
          <span className="h-2 w-2 shrink-0 rounded-full bg-turmeric" aria-hidden />
          <span className="min-w-0 flex-1"><strong className="font-semibold">Sample data.</strong> <span className="text-white/70">Not real.</span></span>
          <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold group-open:bg-white group-open:text-ink">Controls</span>
        </summary>
        <div className="mx-auto grid max-w-3xl gap-3 px-4 pb-4 pt-1 text-ink sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[15px] font-semibold text-white">Viewing as</span>
            <select className="field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[15px] font-semibold text-white">Scenario</span>
            <select className="field" value={scenario} onChange={(e) => { setScenario(e.target.value as Scenario); window.location.reload(); }}>
              {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <span className="mt-1.5 block text-[15px] text-white/70">{SCENARIOS.find((s) => s.id === scenario)?.hint}</span>
          </label>
        </div>
      </details>
    </div>
  );
}

function Header() {
  const { role } = useSession();
  const path = usePathname();
  return (
    <header className="border-b border-ink/[.08] bg-white print:hidden">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pt-3.5">
        <Link href="/" className="leading-none" aria-label="Molbhav.AI home">
          <span className="block font-display text-[28px] text-ink">Molbhav<span className="text-turmeric-deep">.AI</span></span>
          <span className="mt-0.5 block text-[13px] font-medium text-ink-faint" lang="hi">मोलभाव · पड़ोस की ताक़त</span>
        </Link>
        <span className={clsx("rounded-full px-3 py-1 text-[13px] font-semibold", PAYMENT_MODE === "UAT" ? "bg-turmeric-wash text-slate-warn" : "bg-leaf-wash text-leaf")}>
          {PAYMENT_MODE === "UAT" ? "Test payments" : "Live payments"}
        </span>
      </div>
      <nav aria-label="Main" className="mx-auto mt-2 flex max-w-3xl items-center gap-6 overflow-x-auto px-4">
        {NAV[role].map((l) => {
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
        <span className="ml-auto shrink-0 text-sm text-ink-faint">{ROLE_LABEL[role]}</span>
      </nav>
    </header>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {USE_FIXTURES && <SampleBar />}
      <Header />
      <main className="mx-auto min-h-[70vh] max-w-3xl px-4 pb-16">{children}</main>
      <footer className="print:hidden">
        <p className="mx-auto max-w-3xl px-4 pb-10 pt-2 text-sm leading-relaxed text-ink-faint">
          Estimates until everyone approves. Joining isn't buying.
        </p>
      </footer>
    </SessionProvider>
  );
}
