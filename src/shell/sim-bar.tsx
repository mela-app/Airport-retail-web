/**
 * The simulation bar, shown on every role: airport time and day, play/pause, speed, jump to a time, the
 * worked-example preset, reset and event injection. Commands go to the API; every open view follows through
 * the live stream, so all roles (and both split-screen panes) move together.
 */
import { useState } from 'react';

import { type MessageKey, useI18n } from '../i18n';
import { api } from '../lib/api';
import { useSimClock } from '../lib/clock';
import { live, useLive } from '../lib/live';
import type { ClockState, SimEvent, SimState } from '../lib/types';
import { useApi } from '../lib/use-api';
import { Button, IconButton, Segmented, Select } from '../ui/controls';
import { Icon } from '../ui/icon';
import { Popover, useToast } from '../ui/overlay';
import { InjectPanel } from './inject-panel';

const SPEEDS = ['1', '10', '60'] as const;
/** Every quarter hour of the day, plus the worked example's 14:10. */
const JUMP_TIMES = Array.from(
  { length: 96 },
  (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`,
)
  .concat('14:10')
  .sort();

export function SimBar() {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const { state, nowMs } = useSimClock();
  const sim = useApi<SimState>('/api/sim', { topics: ['flights_reloaded'] });
  const [busy, setBusy] = useState<string>();
  const [lastAction, setLastAction] = useState<SimEvent>();

  useLive('sim', (data) => setLastAction(data as SimEvent));

  const run = async (key: string, action: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    try {
      const result = await action();
      if (result && typeof result === 'object' && 'playing' in result)
        live.local('clock', result as ClockState);
      if (done) toast(done, 'good');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(undefined);
    }
  };

  const playing = state?.playing ?? false;
  const speed = String(state?.speed ?? 1);
  const day = sim.data?.day;

  const jump = (localTime: string) =>
    run('jump', () => api.post('/api/sim/jump', { localTime }), t('sim.done.jump', { time: localTime }));

  return (
    <div className="simbar" role="region" aria-label={t('sim.bar.label')}>
      <div className="simbar__inner">
        <div className="simbar__clock" aria-live="off">
          <span className={playing ? 'simbar__state is-playing' : 'simbar__state'}>
            <Icon name={playing ? 'dot' : 'pause'} size={10} />
            {playing ? t('sim.bar.playing') : t('sim.bar.paused')}
          </span>
          <span className="simbar__time num ltr" title={t('sim.bar.airportTime')}>
            {nowMs !== undefined ? fmt.timeSeconds(nowMs) : '--:--:--'}
          </span>
          <span className="simbar__day">
            <span>{nowMs !== undefined ? fmt.day(nowMs) : ''}</span>
            {day?.schoolHoliday ? <span className="simbar__tag">{t('sim.bar.schoolHoliday')}</span> : null}
            {day?.festival ? <span className="simbar__tag">{day.festival}</span> : null}
          </span>
        </div>

        <div className="simbar__controls">
          <Button
            variant="primary"
            icon={playing ? 'pause' : 'play'}
            busy={busy === 'play'}
            onClick={() =>
              run(
                'play',
                () => api.post(playing ? '/api/sim/pause' : '/api/sim/play'),
                t(playing ? 'sim.done.pause' : 'sim.done.play'),
              )
            }
          >
            {playing ? t('sim.bar.pause') : t('sim.bar.play')}
          </Button>
          <Segmented
            label={t('sim.bar.speed')}
            value={SPEEDS.find((s) => s === speed) ?? '1'}
            options={SPEEDS.map((s) => ({ value: s, label: `${s}x` }))}
            onChange={(s) =>
              run(
                'speed',
                () => api.post('/api/sim/speed', { speed: Number(s) }),
                t('sim.done.speed', { speed: s }),
              )
            }
          />
          <Select
            className="simbar__jump"
            aria-label={t('sim.bar.jump')}
            value=""
            disabled={busy === 'jump'}
            onChange={(e) => {
              if (e.target.value) void jump(e.target.value);
            }}
          >
            <option value="">{t('sim.bar.jump')}…</option>
            {JUMP_TIMES.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </Select>
          <Button
            icon="sparkle"
            title={t('sim.bar.workedExampleHint')}
            busy={busy === 'worked'}
            onClick={() =>
              run('worked', () => api.post('/api/sim/scenario/worked-example'), t('sim.done.workedExample'))
            }
          >
            {t('sim.bar.workedExample')}
          </Button>
          <Popover
            label={t('sim.inject.title')}
            align="end"
            trigger={({ toggle, ...aria }) => (
              <Button icon="bolt" variant="secondary" onClick={toggle} aria-expanded={aria['aria-expanded']}>
                {t('sim.bar.inject')}
              </Button>
            )}
          >
            {(close) => <InjectPanel nowMs={nowMs} onDone={close} />}
          </Popover>
          <IconButton
            icon="skip-back"
            label={t('sim.bar.reset')}
            busy={busy === 'reset'}
            onClick={() => run('reset', () => api.post('/api/sim/reset'), t('sim.done.reset'))}
          />
        </div>

        <div className="simbar__activity small" aria-live="polite">
          {lastAction ? <ActivityLine event={lastAction} /> : null}
        </div>
      </div>
    </div>
  );
}

const ACTION_KEYS = new Map<string, MessageKey>([
  ['inject_delay', 'sim.inject.done.delay'],
  ['inject_gate_change', 'sim.inject.done.gate'],
  ['inject_screen_offline', 'sim.inject.done.screenOffline'],
  ['inject_screen_online', 'sim.inject.done.screenOnline'],
  ['worked_example', 'sim.done.workedExample'],
  ['reset', 'sim.done.reset'],
  ['play', 'sim.done.play'],
  ['pause', 'sim.done.pause'],
]);

function ActivityLine({ event }: { event: SimEvent }) {
  const { t, fmt } = useI18n();
  const key = ACTION_KEYS.get(event.action);
  if (!key) return null;
  const d = new Map(Object.entries(event.detail));
  const text = t(key, {
    flight: flightLabel(String(d.get('flightId') ?? '')),
    minutes: Number(d.get('minutes') ?? 0),
    gate: String(d.get('gate') ?? ''),
    screen: String(d.get('screenId') ?? ''),
  });
  return (
    <span className="activity" title={text}>
      <Icon name="bolt" size={13} />
      <span className="num ltr">{fmt.time(event.at)}</span>
      <span>{text}</span>
    </span>
  );
}

/** `XH501-D-20261016` → `XH501`. */
export const flightLabel = (flightId: string) => flightId.split('-')[0] ?? flightId;
