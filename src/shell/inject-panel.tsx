/** Inject a flight delay, a gate change, or take a screen offline / online (from the simulation bar). */
import { useMemo, useState } from 'react';

import { useI18n } from '../i18n';
import { api, qs } from '../lib/api';
import type { FlightView, ScreenView } from '../lib/types';
import { useApi } from '../lib/use-api';
import { Button, Field, Segmented, Select } from '../ui/controls';
import { Loading } from '../ui/display';
import { useToast } from '../ui/overlay';
import { flightLabel } from './sim-bar';

type Kind = 'delay' | 'gate' | 'offline' | 'online';

const HOUR = 3_600_000;

export function InjectPanel({ nowMs, onDone }: { nowMs: number | undefined; onDone: () => void }) {
  const { t } = useI18n();
  const [kind, setKind] = useState<Kind>('delay');
  return (
    <div className="inject">
      <h4 className="inject__title">{t('sim.inject.title')}</h4>
      <Segmented
        size="sm"
        label={t('sim.inject.title')}
        value={kind}
        onChange={setKind}
        options={[
          { value: 'delay', label: t('sim.inject.delay') },
          { value: 'gate', label: t('sim.inject.gate') },
          { value: 'offline', label: t('sim.inject.screenOffline') },
          { value: 'online', label: t('sim.inject.screenOnline') },
        ]}
      />
      {kind === 'delay' || kind === 'gate' ? (
        <FlightForm kind={kind} nowMs={nowMs} onDone={onDone} />
      ) : (
        <ScreenForm online={kind === 'online'} onDone={onDone} />
      )}
    </div>
  );
}

function FlightForm({
  kind,
  nowMs,
  onDone,
}: {
  kind: 'delay' | 'gate';
  nowMs: number | undefined;
  onDone: () => void;
}) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  // The window is fixed when the form opens, so the list does not refetch on every clock tick.
  const [from] = useState(() => nowMs ?? Date.now());
  const query = qs({
    direction: 'D',
    from: new Date(from).toISOString(),
    to: new Date(from + 4 * HOUR).toISOString(),
    limit: 300,
  });
  const path = '/api/flights' + query;
  const flights = useApi<FlightView[]>(path);
  const departures = useMemo(
    () =>
      (flights.data ?? [])
        .filter((f) => !['departed', 'cancelled', 'gate_closed'].includes(f.status) && f.gate)
        .sort((a, b) => Date.parse(a.scheduledTime) - Date.parse(b.scheduledTime)),
    [flights.data],
  );
  const [flightId, setFlightId] = useState('');
  const [minutes, setMinutes] = useState(45);
  const [gate, setGate] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = departures.find((f) => f.id === flightId) ?? departures[0];

  if (!flights.data) return <Loading />;
  if (departures.length === 0) return <p className="muted small">{t('sim.inject.noFlights')}</p>;

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      if (kind === 'delay') {
        await api.post('/api/sim/inject/delay', { flightId: selected.id, minutes });
        toast(t('sim.inject.done.delay', { flight: flightLabel(selected.id), minutes }), 'good');
      } else {
        await api.post('/api/sim/inject/gate-change', {
          flightId: selected.id,
          gate: gate.trim().toUpperCase(),
        });
        toast(
          t('sim.inject.done.gate', { flight: flightLabel(selected.id), gate: gate.trim().toUpperCase() }),
          'good',
        );
      }
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="inject__form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field label={t('sim.inject.flight')}>
        {(id) => (
          <Select id={id} value={selected?.id ?? ''} onChange={(e) => setFlightId(e.target.value)}>
            {departures.map((f) => (
              <option key={f.id} value={f.id}>
                {[
                  `${f.airlineIata}${f.flightNumber} → ${f.destination}`,
                  f.delayMinutes > 0
                    ? `${fmt.time(f.scheduledTime)} → ${fmt.time(f.estimatedTime ?? f.scheduledTime)} (+${f.delayMinutes})`
                    : fmt.time(f.scheduledTime),
                  `${f.terminal} ${f.gate ?? ''}`,
                ].join(' · ')}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {kind === 'delay' ? (
        <Field label={t('sim.inject.minutes')} hint={t('sim.inject.hint.delay')}>
          {(id) => (
            <input
              id={id}
              className="input"
              type="number"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          )}
        </Field>
      ) : (
        <Field label={t('sim.inject.newGate')} hint={t('sim.inject.hint.gate')}>
          {(id) => (
            <input
              id={id}
              className="input ltr"
              value={gate}
              maxLength={5}
              placeholder={selected?.gate ?? ''}
              onChange={(e) => setGate(e.target.value)}
              required
            />
          )}
        </Field>
      )}
      <div className="inject__actions">
        <Button type="submit" variant="primary" icon="bolt" busy={busy}>
          {t('sim.inject.submit')}
        </Button>
      </div>
    </form>
  );
}

function ScreenForm({ online, onDone }: { online: boolean; onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const screens = useApi<ScreenView[]>('/api/screens');
  const [screenId, setScreenId] = useState('SCR-T2-D-01');
  const [busy, setBusy] = useState(false);
  if (!screens.data) return <Loading />;
  const sorted = [...screens.data].sort((a, b) => a.id.localeCompare(b.id));

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(online ? '/api/sim/inject/screen-online' : '/api/sim/inject/screen-offline', {
        screenId,
      });
      toast(
        t(online ? 'sim.inject.done.screenOnline' : 'sim.inject.done.screenOffline', { screen: screenId }),
        'good',
      );
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="inject__form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field label={t('sim.inject.screen')} hint={online ? undefined : t('sim.inject.hint.screen')}>
        {(id) => (
          <Select id={id} value={screenId} onChange={(e) => setScreenId(e.target.value)}>
            {sorted.map((s) => (
              <option key={s.id} value={s.id}>
                {`${s.id} · ${s.name}`}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="inject__actions">
        <Button type="submit" variant={online ? 'primary' : 'danger'} icon="monitor" busy={busy}>
          {t('sim.inject.submit')}
        </Button>
      </div>
    </form>
  );
}
