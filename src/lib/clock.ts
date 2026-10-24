/**
 * The simulation clock in the browser. The server publishes the clock once a second; between messages the
 * time is extrapolated from the speed, so a 60x clock moves smoothly instead of jumping a minute at a time.
 */
import { useEffect, useState } from 'react';

import { live, useLive } from './live';
import type { ClockState } from './types';

/** Simulation time now, from the last clock message. */
export function simNowMs(state: ClockState, receivedAt: number, wallNow = performance.now()): number {
  const base = Date.parse(state.now);
  if (!state.playing) return base;
  const end = Date.parse(state.end);
  return Math.min(end, base + (wallNow - receivedAt) * state.speed);
}

export interface SimClock {
  state: ClockState | undefined;
  /** Current simulation time (ms since epoch), or undefined before the first clock message. */
  nowMs: number | undefined;
}

/** Re-renders every `tickMs` real milliseconds while the clock plays. */
export function useSimClock(tickMs = 250): SimClock {
  const [last, setLast] = useState(live.lastClock);
  const [, setTick] = useState(0);
  useLive('clock', () => setLast(live.lastClock));
  const playing = last?.state.playing ?? false;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTick((t) => t + 1), tickMs);
    return () => clearInterval(id);
  }, [playing, tickMs]);
  return {
    state: last?.state,
    nowMs: last ? simNowMs(last.state, last.receivedAt) : undefined,
  };
}
