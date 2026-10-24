/**
 * Data loading for views: fetch a path, keep the previous data while refreshing (no flicker), and refetch when
 * the given live topics fire, debounced, so a change on the server shows up within the 2-second target.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from './api';
import { type Topic, useLive } from './live';

export interface ApiState<T> {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  reload: () => void;
}

export interface UseApiOptions {
  /** Refetch when any of these live topics fires. */
  topics?: readonly Topic[];
  /** Debounce for live refetches (default 300 ms). */
  debounceMs?: number;
  /** Also refetch on this interval (real milliseconds). */
  pollMs?: number;
  /** Only refetch for live messages this returns true for (e.g. decisions about one screen). */
  when?: (data: unknown, topic: Topic) => boolean;
}

export function useApi<T>(path: string | null, options: UseApiOptions = {}): ApiState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (path === null) {
      setLoading(false);
      return;
    }
    const ctl = new AbortController();
    setLoading(true);
    api
      .get<T>(path, ctl.signal)
      .then((d) => {
        setData(d);
        setError(undefined);
      })
      .catch((e: unknown) => {
        if (!ctl.signal.aborted) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!ctl.signal.aborted) setLoading(false);
      });
    return () => ctl.abort();
  }, [path, version]);

  // A different resource: drop the old data rather than show it under the new heading.
  const shown = useRef(path);
  useEffect(() => {
    if (shown.current !== path) {
      shown.current = path;
      setData(undefined);
    }
  }, [path]);

  const debounce = options.debounceMs ?? 300;
  const { when } = options;
  useLive(options.topics ?? [], (data, topic) => {
    if (when && !when(data, topic)) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(reload, debounce);
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  const { pollMs } = options;
  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(reload, pollMs);
    return () => clearInterval(id);
  }, [pollMs, reload]);

  return { data, error, loading, reload };
}
