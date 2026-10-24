"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Role } from "@/lib/shared/types";

/**
 * UI-side role hint ONLY. It hides screens and buttons that don't belong to a role.
 * It is NOT security: Raman's API must authorise every mutating call from the caller's token.
 */
interface SessionValue {
  role: Role;
  setRole: (r: Role) => void;
  ready: boolean;
}
const Ctx = createContext<SessionValue>({ role: "BUYER", setRole: () => {}, ready: false });
const KEY = "molbhav.role";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("BUYER");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const r = sessionStorage.getItem(KEY) as Role | null;
      if (r) setRoleState(r);
    } catch {
      /* default role */
    }
    setReady(true);
  }, []);
  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    try {
      sessionStorage.setItem(KEY, r);
    } catch {
      /* ignore */
    }
  }, []);
  return <Ctx.Provider value={{ role, setRole, ready }}>{children}</Ctx.Provider>;
}
export const useSession = () => useContext(Ctx);
