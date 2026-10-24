"use client";
import { PageHead } from "@/components/PageHead";
import { useState } from "react";
import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { useSession } from "@/lib/juhi/session";
import { Field, Loading, Notice } from "@/components/ui";

const ROLE_TEXT = { BUYER: "Buyer", KIRANA: "Kirana owner", SUPPLIER: "Supplier", ADMIN: "Admin" } as const;
const HOME = { BUYER: "/", KIRANA: "/kirana", SUPPLIER: "/supplier", ADMIN: "/deal-room" } as const;

/** Email and password sign-in through Supabase. New accounts are buyers; other roles are assigned by the team. */
export default function AccessPage() {
  const { ready, configured, session, email: signedInAs, role, roleError, signIn, signUp, signOut } = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const err = await signIn(email.trim(), password);
      setMsg(err ? { tone: "bad", text: err } : { tone: "good", text: "Signed in." });
    } else {
      const r = await signUp(email.trim(), password);
      setMsg(r.error ? { tone: "bad", text: r.error } : { tone: "good", text: r.needsConfirm ? "Check your email to confirm, then sign in." : "Buyer account created." });
    }
    setPassword("");
    setBusy(false);
  }

  if (!ready) return <Loading label="Checking your account…" />;
  return (
    <div>
      <section className="card mb-5 mt-5 space-y-3">
        <h2 className="text-2xl font-bold">How would you like to explore Molbhav?</h2>
        <p className="text-ink-soft">Try the isolated sample demo without creating a test account. Real kirana, supplier and administrator tools require an account the team has provisioned for that role.</p>
        <div className="grid gap-2 sm:grid-cols-2">{[
          ["Buyer","Join a compatible neighbourhood pool.","/"],
          ["Kirana","Review restocking and approval tools.","/kirana"],
          ["Wholesaler","See the supplier quote workspace.","/supplier"],
          ["AI Deal Room","Review a saved deterministic procurement evaluation.","/deal-room"],
        ].map(([name,copy,href])=><Link key={name} href={href} className="rounded-xl border border-paper-rule bg-white p-3 hover:border-turmeric"><b>{name}</b><p className="text-ink-soft">{copy}</p></Link>)}</div>
        <Link className="btn-yellow inline-block" href="/demo">Explore Interactive Demo — SAMPLE DATA only</Link>
      </section>
      <PageHead title={session ? "Your account" : mode === "in" ? "Sign in" : "Create a buyer account"} tag="Account" />
      {!configured && <Notice tone="bad" className="mt-4" title="Sign-in isn't configured on this site" />}
      {session ? (
        <div className="mt-5 space-y-4">
          <div className="card">
            <p className="text-ink-soft">Signed in as</p>
            <p className="text-lg font-bold">{signedInAs}</p>
            <p className="mt-2 text-ink-soft">Role: <strong className="text-ink">{role ? ROLE_TEXT[role] : "not assigned yet"}</strong></p>
            {roleError && <p className="field-error">Couldn&apos;t read your role: {roleError}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {role && <Link href={HOME[role]} className="btn-primary">Continue</Link>}
            <button className="btn-ghost" onClick={async () => { const err = await signOut(); setMsg(err ? { tone: "bad", text: err } : { tone: "good", text: "Signed out." }); }}>
              <LogOut size={16} aria-hidden /> Sign out
            </button>
          </div>
        </div>
      ) : (
        <form className="mt-5 space-y-5" onSubmit={submit}>
          <Field id="email" label="Email">
            <input id="email" type="email" autoComplete="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field id="password" label="Password" hint={mode === "up" ? "At least 8 characters." : undefined}>
            <input id="password" type="password" required minLength={mode === "up" ? 8 : undefined} autoComplete={mode === "in" ? "current-password" : "new-password"} className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <button className="btn-primary w-full sm:w-auto" disabled={busy || !configured}><KeyRound size={16} aria-hidden /> {mode === "in" ? "Sign in" : "Create buyer account"}</button>
          <p className="text-ink-soft">
            {mode === "in" ? "New here? " : "Have an account? "}
            <button type="button" className="font-semibold text-sign underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }}>
              {mode === "in" ? "Create a buyer account" : "Sign in"}
            </button>
          </p>
          <p className="text-sm text-ink-soft">New accounts are buyer accounts. Kirana, supplier and admin access is set up by the team.</p>
        </form>
      )}
      {msg && <Notice tone={msg.tone} className="mt-4" title={msg.text} />}
    </div>
  );
}
