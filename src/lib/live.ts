/**
 * The live connection: one Server-Sent Events stream per browser tab, shared by every view (and by both panes
 * of split-screen mode). Components subscribe to topics with `useLive`; `useApi` refetches on them.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react';

import type { ClockState } from './types';

export const TOPICS = [
  'clock',
  'flight',
  'flights_reloaded',
  'queue',
  'screen',
  'incident',
  'feeds',
  'sim',
  'decisions',
  'delivery',
  'presence',
  'model',
  'catalog',
  'claims',
] as const;
export type Topic = (typeof TOPICS)[number];

export type LiveStatus = 'connecting' | 'live' | 'reconnecting';
type Listener = (data: unknown) => void;

class LiveConnection {
  private source: EventSource | null = null;
  private readonly listeners = new Map<Topic, Set<Listener>>();
  private readonly statusListeners = new Set<() => void>();
  private statusNow: LiveStatus = 'connecting';
  lastClock: { state: ClockState; receivedAt: number } | null = null;

  start(): void {
    if (this.source || typeof EventSource === 'undefined') return;
    const source = new EventSource('/api/stream');
    this.source = source;
    source.onopen = () => this.setStatus('live');
    source.onerror = () => this.setStatus('reconnecting');
    for (const topic of TOPICS) {
      source.addEventListener(topic, (event) => this.dispatch(topic, (event as MessageEvent<string>).data));
    }
  }

  private dispatch(topic: Topic, raw: string): void {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (topic === 'clock') this.lastClock = { state: data as ClockState, receivedAt: performance.now() };
    for (const listener of this.listeners.get(topic) ?? []) listener(data);
  }

  on(topic: Topic, listener: Listener): () => void {
    this.start();
    const set = this.listeners.get(topic) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(topic, set);
    return () => set.delete(listener);
  }

  private setStatus(status: LiveStatus): void {
    if (status === this.statusNow) return;
    this.statusNow = status;
    for (const l of this.statusListeners) l();
  }

  status = (): LiveStatus => this.statusNow;

  onStatus = (listener: () => void): (() => void) => {
    this.start();
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  };

  /** Pretend a message arrived (after a command whose result we already know, e.g. play/pause). */
  local(topic: Topic, data: unknown): void {
    this.dispatch(topic, JSON.stringify(data));
  }
}

export const live = new LiveConnection();

/** Call `handler` for every message of the given topics. The latest handler is always used. */
export function useLive(
  topics: Topic | readonly Topic[],
  handler: (data: unknown, topic: Topic) => void,
): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  const key = typeof topics === 'string' ? topics : topics.join(',');
  useEffect(() => {
    const list = key.split(',') as Topic[];
    const offs = list.map((topic) => live.on(topic, (data) => ref.current(data, topic)));
    return () => {
      for (const off of offs) off();
    };
  }, [key]);
}

export function useLiveStatus(): LiveStatus {
  return useSyncExternalStore(live.onStatus, live.status, () => 'connecting');
}
