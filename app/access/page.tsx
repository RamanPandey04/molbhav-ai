"use client";
import { PageHead } from "@/components/PageHead";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { getToken, setToken, USE_FIXTURES } from "@/lib/api/client";
import { useSession } from "@/lib/session";
import type { Role } from "@/lib/shared/types";
import { Field, Notice } from "@/components/ui";

/** Interim sign-in for kirana, supplier and admin: paste the access token you were given. Replace with real auth when Raman ships it. */
export default function AccessPage() {
  const { role, setRole } = useSession();
  const [token, setLocal] = useState(() => (typeof window === "undefined" ? "" : getToken() ?? ""));
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <PageHead title="Sign in" tag="Team access" />
      {USE_FIXTURES && <Notice tone="warn" className="mt-4" title="Sample mode. Pick a role in the top bar." />}
      <form className="mt-5 space-y-5" onSubmit={(e) => { e.preventDefault(); setToken(token.trim() || null); setSaved(true); }}>
        <Field id="role" label="I am a">
          <select id="role" className="field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="BUYER">Buyer</option>
            <option value="KIRANA">Kirana owner</option>
            <option value="SUPPLIER">Supplier</option>
            <option value="ADMIN">Admin</option>
          </select>
        </Field>
        <Field id="token" label="Access token">
          <input id="token" type="password" autoComplete="off" className="field" value={token} onChange={(e) => setLocal(e.target.value)} />
        </Field>
        <button className="btn-primary"><KeyRound size={16} aria-hidden /> Save and continue</button>
        {saved && <Notice tone="good" title="Saved" />}
      </form>
    </div>
  );
}
