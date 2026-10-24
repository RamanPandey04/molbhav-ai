"use client";
import Link from "next/link";
import { Lock } from "lucide-react";
import type { Role } from "@/lib/juhi/types";
import { useSession } from "@/lib/juhi/session";
import { Loading } from "@/components/ui";

const NAME: Record<Role, string> = { BUYER: "buyers", KIRANA: "kirana owners", SUPPLIER: "suppliers", ADMIN: "the admin team" };

/** Hides a screen from the wrong role. UX only: the API must enforce this independently. */
export function RoleGate({ allow, children, allowGuest = false }: { allow: Role[]; children: React.ReactNode; allowGuest?: boolean }) {
  const { role, ready, session } = useSession();
  if (!ready) return <Loading label="Checking your account…" />;
  if (!session && allowGuest) return <>{children}</>;
  if (role && allow.includes(role)) return <>{children}</>;
  return (
    <div className="mt-8 rounded-2xl bg-white p-6 shadow-card">
      <Lock size={22} className="text-ink-faint" aria-hidden />
      <h1 className="mt-3 text-2xl font-bold">This screen is for {allow.map((r) => NAME[r]).join(" and ")}</h1>
      <p className="mt-1.5 max-w-prose text-ink-soft">
        {!session ? "Sign in to continue." : role ? `You're signed in as ${NAME[role]}. Sign in with the right account to continue.` : "Your account has no role yet. Roles are assigned by the team."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {!session && <Link href="/access" className="btn-primary">Sign in</Link>}
        <Link href="/" className="btn-ghost">Back to the buyer page</Link>
      </div>
    </div>
  );
}
