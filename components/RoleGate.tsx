"use client";
import Link from "next/link";
import { Lock } from "lucide-react";
import type { Role } from "@/lib/shared/types";
import { useSession } from "@/lib/session";
import { USE_FIXTURES } from "@/lib/api/client";

const NAME: Record<Role, string> = { BUYER: "buyers", KIRANA: "kirana owners", SUPPLIER: "suppliers", ADMIN: "the admin team" };

/** Hides a screen from the wrong role. UX only: the API must enforce this independently. */
export function RoleGate({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { role, ready } = useSession();
  if (!ready) return null;
  if (allow.includes(role)) return <>{children}</>;
  return (
    <div className="mt-8 rounded-2xl bg-white p-6 shadow-card">
      <Lock size={22} className="text-ink-faint" aria-hidden />
      <h1 className="mt-3 text-2xl font-bold">This screen is for {allow.map((r) => NAME[r]).join(" and ")}</h1>
      <p className="mt-1.5 max-w-prose text-ink-soft">
        You're signed in as {NAME[role]}. {USE_FIXTURES ? "Use the role picker in the sample bar at the top to look at this screen." : "Sign in with the right account to continue."}
      </p>
      <Link href="/" className="btn-ghost mt-4">Back to the buyer page</Link>
    </div>
  );
}
