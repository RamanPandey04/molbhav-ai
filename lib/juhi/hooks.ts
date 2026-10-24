"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ApiFailure } from "@/lib/juhi/client";

export interface Loadable<T> {
  data: T | null;
  error: ApiFailure | null;
  loading: boolean;
  reload: () => void;
  setData: (d: T) => void;
}

/** Fetch on mount / when deps change. Optional polling while `pollWhile(data)` is true. */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[], opts?: { pollWhile?: (d: T) => boolean; everyMs?: number }): Loadable<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  const pollRef = useRef(opts?.pollWhile);
  useLayoutEffect(() => {
    fnRef.current = fn;
    pollRef.current = opts?.pollWhile;
  });
  const every = opts?.everyMs ?? 1500;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async (first: boolean) => {
      if (first) setLoading(true);
      try {
        const d = await fnRef.current();
        if (cancelled) return;
        setData(d);
        setError(null);
        if (pollRef.current?.(d)) timer = setTimeout(() => run(false), every);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof ApiFailure ? e : new ApiFailure("UNKNOWN", "Something went wrong. Try again."));
      } finally {
        if (!cancelled && first) setLoading(false);
      }
    };
    run(true);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}

/** Current time as state, refreshed every 30 s, so validation stays pure during render. */
export function useNow(everyMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}
