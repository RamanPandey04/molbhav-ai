"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Role } from "@/lib/juhi/types";
import { getBrowserSupabase } from "@/lib/juhi/supabase-browser";

/**
 * Real Supabase session. Role is read from actor_profiles (MERCHANT is shown as KIRANA).
 * Role only hides screens; the API authorises every call from the bearer token.
 */
interface SessionValue {
  role: Role | null;
  ready: boolean;
  session: Session | null;
  email: string | null;
  configured: boolean;
  roleError: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signOut: () => Promise<string | null>;
}
const Ctx = createContext<SessionValue | null>(null);

const toUiRole = (r: unknown): Role | null =>
  r === "MERCHANT" ? "KIRANA" : r === "BUYER" || r === "SUPPLIER" || r === "ADMIN" ? r : null;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [roleFor, setRoleFor] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfigured(false);
      setSessionReady(true);
      return;
    }
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setSessionReady(true); });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id ?? null;
  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb || !uid) return;
    let cancelled = false;
    sb.from("actor_profiles").select("role").eq("user_id", uid).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      setRoleError(error ? error.message : null);
      setRole(error ? null : toUiRole(data?.role));
      setRoleFor(uid);
    });
    return () => { cancelled = true; };
  }, [uid]);

  const ready = sessionReady && (!uid || roleFor === uid);
  const effectiveRole = uid && roleFor === uid ? role : null;

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = getBrowserSupabase();
    if (!sb) return "Sign-in isn't configured on this site.";
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);
  const signUp = useCallback(async (email: string, password: string) => {
    const sb = getBrowserSupabase();
    if (!sb) return { error: "Sign-in isn't configured on this site.", needsConfirm: false };
    const { data, error } = await sb.auth.signUp({ email, password });
    return { error: error ? error.message : null, needsConfirm: !error && !data.session };
  }, []);
  const signOut = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return null;
    const { error } = await sb.auth.signOut();
    return error ? error.message : null;
  }, []);

  return (
    <Ctx.Provider value={{ role: effectiveRole, ready, session, email: session?.user.email ?? null, configured, roleError, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used inside SessionProvider");
  return v;
}
