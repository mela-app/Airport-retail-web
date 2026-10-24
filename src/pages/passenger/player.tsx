/**
 * Passenger simulator: what one screen shows right now, full-screen in 16:9 or 9:16, with the departures
 * strip, the promo QR code and its countdown, and a "Why this ad?" panel. It follows the shared clock: when
 * the engine re-plans this screen, the new ad appears within the same second.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAppConfig } from '../../app/config';
import { DEFAULT_SCREEN } from '../../app/roles';
import { Creative, type Format } from '../../creative/creative';
import { useI18n } from '../../i18n';
import { qs } from '../../lib/api';
import { countdown } from '../../lib/format';
import { useSimClock } from '../../lib/clock';
import { useNavigate } from '../../lib/router';
import type { FlightView, ScreenNow, ScreenView } from '../../lib/types';
import { useApi } from '../../lib/use-api';
import { Button, Segmented, Select } from '../../ui/controls';
import { ErrorState, Loading } from '../../ui/display';
import { Icon } from '../../ui/icon';
import { QrCode } from '../../ui/qr-code';
import type { PageProps } from '../registry';
import { WhyPanel } from './why-panel';

const HOUR = 3_600_000;

export function PassengerPlayer({ rest }: PageProps) {
  const screenId = rest.at(0) ?? DEFAULT_SCREEN;
  const navigate = useNavigate();
  const { t } = useI18n();
  const screens = useApi<ScreenView[]>('/api/screens', { topics: ['catalog'] });
  const now = useApi<ScreenNow>(`/api/screens/${encodeURIComponent(screenId)}/now`, {
    topics: ['decisions', 'screen', 'catalog'],
    debounceMs: 100,
    when: (data, topic) => {
      if (topic === 'decisions')
        return ((data as { changes?: { screenId: string }[] }).changes ?? []).some(
          (c) => c.screenId === screenId,
        );
      if (topic === 'screen') return (data as { id?: string }).id === screenId;
      return true;
    },
  });
  const portraitScreen = now.data?.screen.orientation === 'portrait';
  const [format, setFormat] = useState<Format | null>(null);
  const shownFormat: Format = format ?? (portraitScreen ? '9:16' : '16:9');
  const [why, setWhy] = useState(true);
  const stage = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => {
    const groups = new Map<string, ScreenView[]>();
    for (const s of [...(screens.data ?? [])].sort((a, b) => a.id.localeCompare(b.id))) {
      const key = `${s.terminalId} · ${s.zoneId}`;
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    return [...groups];
  }, [screens.data]);

  return (
    <div className="player-page">
      <div className="player-toolbar">
        <label className="player-toolbar__field">
          <span className="field__label">{t('player.screen.label')}</span>
          <Select
            value={screenId}
            onChange={(e) => navigate(`/passenger/${encodeURIComponent(e.target.value)}`)}
          >
            {grouped.length === 0 ? <option value={screenId}>{screenId}</option> : null}
            {grouped.map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map((s) => (
                  <option key={s.id} value={s.id}>
                    {`${s.name} · ${s.id}`}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </label>
        <Segmented
          label={t('player.screen.format')}
          value={shownFormat}
          onChange={setFormat}
          options={[
            { value: '16:9', label: '16:9', title: t('player.screen.landscape') },
            { value: '9:16', label: '9:16', title: t('player.screen.portrait') },
          ]}
        />
        <span className="spacer" />
        <Button
          icon="info"
          variant={why ? 'primary' : 'secondary'}
          aria-pressed={why}
          onClick={() => setWhy((w) => !w)}
        >
          {t('player.why.toggle')}
        </Button>
        <Button
          icon="monitor"
          onClick={() => {
            void stage.current?.requestFullscreen?.().catch(() => undefined);
          }}
        >
          {t('player.screen.fullscreen')}
        </Button>
      </div>

      <div className={why ? 'player-layout player-layout--why' : 'player-layout'}>
        <div className="player-stage" ref={stage}>
          {now.data ? (
            <ScreenFace data={now.data} format={shownFormat} />
          ) : now.error ? (
            <ErrorState message={now.error} onRetry={now.reload} />
          ) : (
            <Loading />
          )}
        </div>
        {why && now.data ? <WhyPanel data={now.data} /> : null}
      </div>
    </div>
  );
}

/** The physical screen: the ad (or house / offline state), the QR code, and the departures strip. */
function ScreenFace({ data, format }: { data: ScreenNow; format: Format }) {
  const { t, lang, fmt } = useI18n();
  const { brand } = useAppConfig();
  const offline = data.status?.status === 'offline';
  const replan = useReplanMarker(data);

  return (
    <div className={format === '9:16' ? 'screen screen--portrait' : 'screen screen--landscape'}>
      <div className="screen__ad">
        {offline ? (
          <div className="screen__offline" role="status">
            <Icon name="monitor" size={48} />
            <strong>{t('player.state.offline')}</strong>
            <span>{t('player.state.offlineHint', { time: fmt.time(data.status?.since ?? Date.now()) })}</span>
          </div>
        ) : data.creative ? (
          <Creative
            key={data.creative.id}
            className="screen__creative"
            creative={data.creative}
            lang={lang}
            format={format}
            overlay={data.claim ? <PromoQr claim={data.claim} /> : null}
          />
        ) : (
          <div className="screen__house">
            <strong>{t('player.state.house', { airport: brand.airportName })}</strong>
            <span>{t('player.state.houseHint')}</span>
          </div>
        )}
        {replan ? (
          <span className="screen__replan" key={replan}>
            <Icon name="refresh" size={14} />
            {t('player.state.replanned', { time: fmt.time(replan) })}
          </span>
        ) : null}
      </div>
      <Fids screen={data.screen} />
    </div>
  );
}

/** When the ad changes while the view is open, show a short "re-planned" marker with the decision time. */
function useReplanMarker(data: ScreenNow): string | null {
  const previous = useRef<string | null | undefined>(undefined);
  const [marker, setMarker] = useState<string | null>(null);
  const creativeId = data.creative?.id ?? null;
  const decidedAt = data.run?.decidedAt ?? null;
  useEffect(() => {
    if (previous.current !== undefined && previous.current !== creativeId && decidedAt) {
      setMarker(decidedAt);
      const id = setTimeout(() => setMarker(null), 6000);
      previous.current = creativeId;
      return () => clearTimeout(id);
    }
    previous.current = creativeId;
    return undefined;
  }, [creativeId, decidedAt]);
  return marker;
}

/** The promo QR with a countdown in simulation time (it expires when the linked flight's gate closes). */
function PromoQr({ claim }: { claim: NonNullable<ScreenNow['claim']> }) {
  const { t } = useI18n();
  const { nowMs } = useSimClock(1000);
  const left = Math.max(0, Date.parse(claim.expiresAt) - (nowMs ?? Date.now()));
  return (
    <div className="promo-qr">
      <QrCode value={claim.url} size={132} label={t('player.qr.scan')} />
      <div className="promo-qr__text">
        <strong>{t('player.qr.scan')}</strong>
        <span className="num ltr">{t('player.qr.validFor', { time: countdown(left) })}</span>
      </div>
    </div>
  );
}

/** Departures from the gates this screen faces, as on a flight information display. */
function Fids({ screen }: { screen: ScreenView }) {
  const { t, fmt, tx } = useI18n();
  const { nowMs } = useSimClock(15_000);
  // Re-anchor the window every 15 simulated minutes, not on every tick.
  const anchor = Math.floor((nowMs ?? 0) / (15 * 60_000)) * 15 * 60_000;
  const path =
    nowMs === undefined
      ? null
      : '/api/flights' +
        qs({
          direction: 'D',
          terminal: screen.terminalId,
          from: new Date(anchor - HOUR).toISOString(),
          to: new Date(anchor + 4 * HOUR).toISOString(),
        });
  const flights = useApi<FlightView[]>(path, { topics: ['flight', 'flights_reloaded'], debounceMs: 400 });
  const gates = new Set(screen.nearestGateIds);
  const rows = (flights.data ?? [])
    .filter((f) => f.gateId && gates.has(f.gateId) && !['departed', 'cancelled'].includes(f.status))
    .filter((f) => Date.parse(f.estimatedTime ?? f.scheduledTime) >= (nowMs ?? 0) - 10 * 60_000)
    .slice(0, 4);

  return (
    <div className="fids" aria-label={t('player.fids.title')}>
      <div className="fids__head">
        <Icon name="plane" size={14} />
        <span>{t('player.fids.title')}</span>
      </div>
      {rows.length === 0 ? (
        <div className="fids__empty">{t('player.fids.none')}</div>
      ) : (
        <table className="fids__table">
          <thead>
            <tr>
              <th>{t('player.fids.flight')}</th>
              <th>{t('player.fids.to')}</th>
              <th>{t('player.fids.time')}</th>
              <th>{t('player.fids.gate')}</th>
              <th>{t('player.fids.remark')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => {
              const delayed = f.delayMinutes > 0 && f.estimatedTime;
              return (
                <tr key={f.id} className={`fids__row fids__row--${f.status}`}>
                  <td className="ltr num">{`${f.airlineIata}${f.flightNumber}`}</td>
                  <td>{f.otherCity ?? f.destination}</td>
                  <td className="ltr num">{fmt.time(f.scheduledTime)}</td>
                  <td className="ltr num">{f.gate}</td>
                  <td className="fids__remark">
                    {delayed
                      ? t('player.fids.newTime', { time: fmt.time(f.estimatedTime ?? f.scheduledTime) })
                      : tx(`flight.status.${f.status}`, f.status)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
