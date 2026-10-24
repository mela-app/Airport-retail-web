/**
 * The network map: the MQI floor plan (two terminals, piers, halls), zones shaded by live passenger presence,
 * gates, and every screen as a dot coloured by its status. Click a screen to open its player.
 */
import { useState } from 'react';

import { useI18n } from '../../i18n';
import { useNavigate } from '../../lib/router';
import type { Locations } from '../../lib/types';
import { useApi } from '../../lib/use-api';
import { useWidth } from '../../ui/charts';
import { Segmented } from '../../ui/controls';
import { Loading } from '../../ui/display';

const PLAN = { width: 1600, height: 900 };

interface ScreenPresence {
  screenId: string;
  zoneId: string;
  position: { x: number; y: number };
  pax: number;
  status: 'online' | 'degraded' | 'offline';
}

interface ZonePresence {
  zones: { zoneId: string; pax: number }[];
}

const STATUS_FILL = new Map([
  ['online', 'var(--status-good)'],
  ['degraded', 'var(--status-warning)'],
  ['offline', 'var(--status-critical)'],
]);

export function NetworkMap() {
  const { t, fmt, tx } = useI18n();
  const navigate = useNavigate();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [heat, setHeat] = useState<'on' | 'off'>('on');
  const [hover, setHover] = useState<ScreenPresence | null>(null);
  const locations = useApi<Locations>('/api/locations', { topics: ['catalog'] });
  const screens = useApi<ScreenPresence[]>('/api/presence/screens', {
    topics: ['screen', 'presence', 'flights_reloaded'],
    debounceMs: 800,
  });
  const zones = useApi<ZonePresence>('/api/presence/zones', {
    topics: ['presence', 'flights_reloaded'],
    debounceMs: 800,
  });
  const zonePax = new Map((zones.data?.zones ?? []).map((z) => [z.zoneId, z.pax]));
  const maxPax = Math.max(1, ...zonePax.values());
  const scale = width > 0 ? width / PLAN.width : 1;
  const height = Math.round(PLAN.height * scale);
  const counts = new Map<string, number>();
  for (const s of screens.data ?? []) counts.set(s.status, (counts.get(s.status) ?? 0) + 1);

  return (
    <div className="netmap" ref={ref}>
      <div className="netmap__bar">
        <ul className="legend">
          {(['online', 'degraded', 'offline'] as const).map((s) => (
            <li key={s}>
              <span className="legend__dot" style={{ background: STATUS_FILL.get(s) }} aria-hidden="true" />
              {`${tx(`common.status.${s}`, s)} ${fmt.number(counts.get(s) ?? 0)}`}
            </li>
          ))}
          {heat === 'on' ? (
            <li>
              <span className="legend__ramp" aria-hidden="true" />
              {t('admin.map.presence')}
            </li>
          ) : null}
        </ul>
        <Segmented
          size="sm"
          label={t('admin.map.heat')}
          value={heat}
          onChange={setHeat}
          options={[
            { value: 'on', label: t('admin.map.heatOn') },
            { value: 'off', label: t('admin.map.heatOff') },
          ]}
        />
      </div>
      {!locations.data || width === 0 ? (
        <Loading />
      ) : (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${PLAN.width} ${PLAN.height}`}
          role="img"
          aria-label={t('admin.map.title')}
          className="netmap__svg"
        >
          {locations.data.terminals.map((tm) => (
            <g key={tm.id}>
              <rect
                className="netmap__terminal"
                x={tm.outline.x}
                y={tm.outline.y}
                width={tm.outline.width}
                height={tm.outline.height}
                rx={18}
              />
              <text className="netmap__terminal-label" x={tm.outline.x + 16} y={tm.outline.y - 14}>
                {tm.name}
              </text>
            </g>
          ))}
          {locations.data.zones.map((z) => {
            const pax = zonePax.get(z.id) ?? 0;
            const level =
              heat === 'on' && pax > 0 ? Math.min(7, Math.max(1, Math.ceil((pax / maxPax) * 7))) : 0;
            return (
              <g key={z.id}>
                <rect
                  className={`netmap__zone netmap__zone--${level}`}
                  x={z.area.x}
                  y={z.area.y}
                  width={z.area.width}
                  height={z.area.height}
                  rx={8}
                >
                  <title>{`${z.name}: ${fmt.number(pax)} pax`}</title>
                </rect>
                <text className="netmap__zone-label" x={z.area.x + 8} y={z.area.y + 18}>
                  {z.name.replace(/^T[12] /, '')}
                </text>
              </g>
            );
          })}
          {locations.data.gates.map((g) => (
            <circle
              key={g.id}
              className={g.active === false ? 'netmap__gate is-closed' : 'netmap__gate'}
              cx={g.position.x}
              cy={g.position.y}
              r={4}
            >
              <title>{`${t('player.fids.gate')} ${g.code}`}</title>
            </circle>
          ))}
          {(screens.data ?? []).map((s) => (
            <circle
              key={s.screenId}
              className={hover?.screenId === s.screenId ? 'netmap__screen is-hover' : 'netmap__screen'}
              cx={s.position.x}
              cy={s.position.y}
              r={s.status === 'online' ? 7 : 10}
              fill={STATUS_FILL.get(s.status)}
              tabIndex={0}
              role="link"
              aria-label={`${s.screenId}: ${tx(`common.status.${s.status}`, s.status)}, ${fmt.number(s.pax)} pax`}
              onPointerEnter={() => setHover(s)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(s)}
              onBlur={() => setHover(null)}
              onClick={() => navigate(`/passenger/${s.screenId}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/passenger/${s.screenId}`);
              }}
            />
          ))}
        </svg>
      )}
      {hover && width > 0 ? (
        <div
          className="chart__tooltip"
          style={{
            left: Math.min(width - 190, hover.position.x * scale + 12),
            top: hover.position.y * scale + 40,
          }}
        >
          <strong>{hover.screenId}</strong>
          <span>{`${tx(`common.status.${hover.status}`, hover.status)} · ${fmt.number(hover.pax)} pax`}</span>
          <span className="muted xsmall">{t('admin.map.clickHint')}</span>
        </div>
      ) : null}
    </div>
  );
}
