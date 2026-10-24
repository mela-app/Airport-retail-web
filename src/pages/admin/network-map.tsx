/**
 * The network map: the MQI floor plan (two terminals, piers, halls), zones shaded by live passenger presence,
 * labelled gate stands, and every screen as a dot coloured by its status (offline and degraded screens pulse).
 * A toolbar filters screens by status and zooms to one terminal; the side panel ranks the busiest zones and
 * lists the screens that need attention. Click a screen to open its player.
 */
import { type CSSProperties, useState } from 'react';

import { useI18n } from '../../i18n';
import { useNavigate } from '../../lib/router';
import type { Locations } from '../../lib/types';
import { useApi } from '../../lib/use-api';
import { useWidth } from '../../ui/charts';
import { Segmented } from '../../ui/controls';
import { Loading } from '../../ui/display';
import { Icon } from '../../ui/icon';

const PLAN = { x: 0, y: 0, width: 1600, height: 900 };
const STATUSES = ['online', 'degraded', 'offline'] as const;
type ScreenStatus = (typeof STATUSES)[number];

interface ScreenPresence {
  screenId: string;
  zoneId: string;
  position: { x: number; y: number };
  pax: number;
  status: ScreenStatus;
}

interface ZonePresence {
  /** `international`: percentage of the zone's passengers on international flights (0–100). */
  zones: {
    zoneId: string;
    name: string;
    terminalId: string;
    kind: string;
    pax: number;
    international: number;
  }[];
}

type Box = { x: number; y: number; width: number; height: number };

const STATUS_FILL = new Map<ScreenStatus, string>([
  ['online', 'var(--status-good)'],
  ['degraded', 'var(--status-warning)'],
  ['offline', 'var(--status-critical)'],
]);

/** Screen dot radius plus its ring, in plan units. */
const DOT_REACH = 10;

let measureContext: CanvasRenderingContext2D | null | undefined;
/** Rendered width of a label's text (CSS pixels at the given size and weight). */
function textWidth(text: string, size: number, weight: number): number {
  if (measureContext === undefined) measureContext = document.createElement('canvas').getContext('2d');
  if (!measureContext) return text.length * size * 0.56;
  measureContext.font = weight + ' ' + size + 'px ' + getComputedStyle(document.body).fontFamily;
  return measureContext.measureText(text).width;
}

interface ZoneLabel {
  x: number;
  y: number;
  /** The label's background inside its zone (null when the label sits outside the zone). */
  chip: Box | null;
  /** A short zone: smaller label without the passenger count (the side panel has it). */
  compact: boolean;
}

/** Zones shorter than this get a compact label, leaving room for their screens. */
const COMPACT_ZONE_HEIGHT = 60;

/**
 * Where a zone's label goes. Piers are labelled in the free strip above them and bus lounges (full of gate
 * stands) below them; other zones get a chip in their top-left corner, and screen dots under it are moved out.
 * `k` scales the label font (1 / zoom), so the layout matches what the CSS draws.
 */
function placeLabel(
  zone: Locations['zones'][number],
  text: { name: string; pax: string },
  k: number,
): ZoneLabel {
  const { x, y, width, height } = zone.area;
  if (zone.kind === 'pier') return { x: x + 2, y: y - 9, chip: null, compact: false };
  if (zone.kind === 'bus_lounge') return { x: x + 2, y: y + height + 6 + 15 * k, chip: null, compact: false };
  if (height < COMPACT_ZONE_HEIGHT) {
    const chip = { x: x + 4, y: y + 4, width: textWidth(text.name, 13, 700) * k + 10 * k, height: 19 * k };
    return { x: x + 4 + 5 * k, y: y + 4 + 14 * k, chip, compact: true };
  }
  const textW = (textWidth(text.name, 17, 700) + textWidth(text.pax, 15, 600)) * k;
  const chip = { x: x + 5, y: y + 5, width: Math.min(width - 10, textW + 14 * k), height: 24 * k };
  return { x: x + 5 + 7 * k, y: y + 5 + 17.5 * k, chip, compact: false };
}

/**
 * The drawn positions of one zone's screens: those under the label chip move below it, or, when the zone is too
 * short, to the right of it in a row (kept apart, in their left-to-right order).
 */
function placeDots<T extends { screenId: string; position: { x: number; y: number } }>(
  screens: readonly T[],
  chip: Box | null,
  zone: Box | undefined,
): Map<string, { x: number; y: number }> {
  const out = new Map(screens.map((s) => [s.screenId, s.position]));
  if (!chip || !zone) return out;
  const r = DOT_REACH;
  const covered = screens
    .filter(
      (s) =>
        s.position.x + r > chip.x &&
        s.position.x - r < chip.x + chip.width &&
        s.position.y + r > chip.y &&
        s.position.y - r < chip.y + chip.height,
    )
    .sort((a, b) => a.position.x - b.position.x);
  const below = chip.y + chip.height + r;
  const fitsBelow = below + r - 4 <= zone.y + zone.height;
  let nextX = chip.x + chip.width + r;
  for (const s of covered) {
    if (fitsBelow) {
      out.set(s.screenId, { x: s.position.x, y: below });
    } else {
      out.set(s.screenId, { x: nextX, y: zone.y + zone.height / 2 });
      nextX += 2 * r + 4;
    }
  }
  return out;
}

/** The part of the plan to show: everything, or one terminal with room for its label. */
function viewBoxFor(locations: Locations, terminal: string): Box {
  const tm = locations.terminals.find((x) => x.id === terminal);
  if (!tm) return PLAN;
  const pad = 24;
  return {
    x: tm.outline.x - pad,
    y: tm.outline.y - 56,
    width: tm.outline.width + 2 * pad,
    height: tm.outline.height + 56 + pad,
  };
}

export function NetworkMap() {
  const { t, fmt, tx } = useI18n();
  const navigate = useNavigate();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [heat, setHeat] = useState<'on' | 'off'>('on');
  const [terminal, setTerminal] = useState('all');
  const [shown, setShown] = useState<ReadonlySet<ScreenStatus>>(new Set(STATUSES));
  const [hover, setHover] = useState<ScreenPresence | null>(null);
  const [focusZone, setFocusZone] = useState<string | null>(null);
  const locations = useApi<Locations>('/api/locations', { topics: ['catalog'] });
  const screens = useApi<ScreenPresence[]>('/api/presence/screens', {
    topics: ['screen', 'presence', 'flights_reloaded'],
    debounceMs: 800,
  });
  const zones = useApi<ZonePresence>('/api/presence/zones', {
    topics: ['presence', 'flights_reloaded'],
    debounceMs: 800,
  });

  // Everything below follows the terminal selection (all, T1 or T2).
  const inView = (terminalId: string | undefined) => terminal === 'all' || terminalId === terminal;
  const plan = locations.data
    ? {
        terminals: locations.data.terminals.filter((x) => inView(x.id)),
        zones: locations.data.zones.filter((x) => inView(x.terminalId)),
        gates: locations.data.gates.filter((x) => inView(x.terminalId)),
      }
    : null;
  const zoneTerminal = new Map((locations.data?.zones ?? []).map((z) => [z.id, z.terminalId]));
  const zoneRows = (zones.data?.zones ?? []).filter((z) => inView(z.terminalId));
  const zonePax = new Map(zoneRows.map((z) => [z.zoneId, z.pax]));
  const maxPax = Math.max(1, ...zonePax.values());
  const zoneNames = new Map((locations.data?.zones ?? []).map((z) => [z.id, z.name]));
  const all = (screens.data ?? []).filter((s) => inView(zoneTerminal.get(s.zoneId)));
  const counts = new Map<ScreenStatus, number>();
  for (const s of all) counts.set(s.status, (counts.get(s.status) ?? 0) + 1);
  const attention = all.filter((s) => s.status !== 'online');
  const busiest = [...zoneRows].sort((a, b) => b.pax - a.pax).slice(0, 6);

  const view = locations.data ? viewBoxFor(locations.data, terminal) : PLAN;
  // The whole plan fills the width; a single terminal is fitted, centred, into a somewhat taller canvas.
  const height = Math.round(((width * PLAN.height) / PLAN.width) * (terminal === 'all' ? 1 : 1.3));
  const scale = width > 0 ? Math.min(width / view.width, height / view.height) : 1;
  const offsetX = (width - view.width * scale) / 2;
  const offsetY = (height - view.height * scale) / 2;
  const zoom = width > 0 ? scale / (width / PLAN.width) : 1;

  // Label layout, then the screens' drawn positions (out from under the label chips).
  const labels = new Map(
    (plan?.zones ?? []).map((z) => {
      const pax = zonePax.get(z.id) ?? 0;
      const text = {
        name: z.name.replace(/^T[12] /, ''),
        pax: heat === 'on' && pax > 0 ? ' · ' + fmt.compact(pax) : '',
      };
      return [z.id, { ...text, ...placeLabel(z, text, 1 / zoom) }];
    }),
  );
  const zoneBoxes = new Map((plan?.zones ?? []).map((z) => [z.id, z.area]));
  // Bus lounges have gate stands along their top and bottom edges: their screens are drawn on the middle line.
  const busLounges = new Set((plan?.zones ?? []).filter((z) => z.kind === 'bus_lounge').map((z) => z.id));
  const drawnAt = new Map<string, { x: number; y: number }>();
  for (const zoneId of new Set(all.map((s) => s.zoneId)))
    for (const [id, p] of placeDots(
      all.filter((s) => s.zoneId === zoneId),
      labels.get(zoneId)?.chip ?? null,
      zoneBoxes.get(zoneId),
    ))
      drawnAt.set(id, p);
  const placed = all.map((s) => {
    const position = drawnAt.get(s.screenId) ?? s.position;
    const zone = zoneBoxes.get(s.zoneId);
    return busLounges.has(s.zoneId) && zone
      ? { ...s, position: { x: position.x, y: zone.y + zone.height / 2 } }
      : { ...s, position };
  });

  const toggleStatus = (s: ScreenStatus) =>
    setShown((prev) => {
      const next = new Set(prev);
      if (next.has(s) && next.size > 1) next.delete(s);
      else next.add(s);
      return next;
    });
  const open = (screenId: string) => navigate(`/passenger/${screenId}`);

  return (
    <div className="netmap">
      <div className="netmap__toolbar">
        <div className="netmap__chips" role="group" aria-label={t('admin.map.filter')}>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`netmap__chip netmap__chip--${s}${shown.has(s) ? ' is-on' : ''}`}
              aria-pressed={shown.has(s)}
              onClick={() => toggleStatus(s)}
            >
              <span className="netmap__chip-dot" aria-hidden="true" />
              <span>{tx(`common.status.${s}`, s)}</span>
              <span className="netmap__chip-count num">{fmt.number(counts.get(s) ?? 0)}</span>
            </button>
          ))}
        </div>
        <div className="netmap__controls">
          <Segmented
            size="sm"
            label={t('admin.map.terminal')}
            value={terminal}
            onChange={setTerminal}
            options={[
              { value: 'all', label: t('admin.map.allTerminals') },
              ...(locations.data?.terminals ?? []).map((tm) => ({ value: tm.id, label: tm.id })),
            ]}
          />
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
      </div>

      <div className="netmap__body">
        <div className="netmap__canvas" ref={ref}>
          {!plan || width === 0 ? (
            <Loading />
          ) : (
            <svg
              width={width}
              height={height}
              viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
              role="img"
              aria-label={t('admin.map.title')}
              className="netmap__svg"
              direction="ltr"
              // Labels keep their on-screen size when zoomed into one terminal.
              style={{ '--zoom': zoom } as CSSProperties}
            >
              <defs>
                <pattern id="netmap-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="1.5" cy="1.5" r="1.5" className="netmap__grid-dot" />
                </pattern>
              </defs>
              <rect
                x={PLAN.x - 200}
                y={PLAN.y - 200}
                width={PLAN.width + 400}
                height={PLAN.height + 400}
                fill="url(#netmap-grid)"
              />

              {plan.terminals.map((tm) => (
                <g key={tm.id}>
                  <rect
                    className="netmap__terminal"
                    x={tm.outline.x}
                    y={tm.outline.y}
                    width={tm.outline.width}
                    height={tm.outline.height}
                    rx={22}
                  />
                  <text className="netmap__terminal-label" x={tm.outline.x + 4} y={tm.outline.y - 16}>
                    {tm.name}
                  </text>
                </g>
              ))}

              {plan.zones.map((z) => {
                const pax = zonePax.get(z.id) ?? 0;
                const intensity = heat === 'on' ? pax / maxPax : 0;
                const classes = ['netmap__zone'];
                if (z.side === 'landside') classes.push('is-landside');
                if (focusZone === z.id) classes.push('is-focus');
                return (
                  <g key={z.id}>
                    <rect
                      className={classes.join(' ')}
                      x={z.area.x}
                      y={z.area.y}
                      width={z.area.width}
                      height={z.area.height}
                      rx={12}
                    />
                    {intensity > 0 ? (
                      <rect
                        className="netmap__heat"
                        x={z.area.x}
                        y={z.area.y}
                        width={z.area.width}
                        height={z.area.height}
                        rx={12}
                        fillOpacity={0.08 + 0.6 * intensity}
                      />
                    ) : null}
                    <title>{`${z.name}: ${t('admin.map.pax', { n: fmt.number(pax) })}`}</title>
                  </g>
                );
              })}

              {plan.gates.map((g) => (
                <g key={g.id} className={g.active === false ? 'netmap__gate is-closed' : 'netmap__gate'}>
                  <rect x={g.position.x - 14} y={g.position.y - 8} width={28} height={16} rx={4} />
                  <text x={g.position.x} y={g.position.y + 3.5}>
                    {g.code}
                  </text>
                  <title>{`${t('player.fids.gate')} ${g.code}`}</title>
                </g>
              ))}

              {placed.map((s) => {
                const visible = shown.has(s.status);
                const isHover = hover?.screenId === s.screenId;
                return (
                  <g
                    key={s.screenId}
                    className={`netmap__screen netmap__screen--${s.status}${visible ? '' : ' is-muted'}${isHover ? ' is-hover' : ''}`}
                  >
                    {s.status !== 'online' && visible ? (
                      <circle className="netmap__halo" cx={s.position.x} cy={s.position.y} r={16} />
                    ) : null}
                    <circle
                      className="netmap__dot"
                      cx={s.position.x}
                      cy={s.position.y}
                      r={isHover ? 10 : 7}
                      fill={STATUS_FILL.get(s.status)}
                      tabIndex={visible ? 0 : -1}
                      role="link"
                      aria-label={`${s.screenId}: ${tx(`common.status.${s.status}`, s.status)}, ${t('admin.map.pax', { n: fmt.number(s.pax) })}`}
                      onPointerEnter={() => setHover(s)}
                      onPointerLeave={() => setHover(null)}
                      onFocus={() => setHover(s)}
                      onBlur={() => setHover(null)}
                      onClick={() => open(s.screenId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') open(s.screenId);
                      }}
                    />
                  </g>
                );
              })}

              {/* Labels on top: on a chip inside the zone (dots were moved out from under it), or outside
                  the zone with a halo (piers above, bus lounges below). */}
              <g className="netmap__labels" aria-hidden="true">
                {[...labels].map(([zoneId, l]) => (
                  <g key={zoneId}>
                    {l.chip ? (
                      <rect
                        className="netmap__label-chip"
                        x={l.chip.x}
                        y={l.chip.y}
                        width={l.chip.width}
                        height={l.chip.height}
                        rx={6 / zoom}
                      />
                    ) : null}
                    <text
                      className={
                        'netmap__zone-label' +
                        (l.chip ? ' is-chipped' : '') +
                        (l.compact ? ' is-compact' : '')
                      }
                      x={l.x}
                      y={l.y}
                    >
                      {l.name}
                      {l.pax && !l.compact ? <tspan className="netmap__zone-pax">{l.pax}</tspan> : null}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          )}

          {width > 0 ? (
            <div className="netmap__legend" aria-hidden="true">
              {heat === 'on' ? (
                <span className="netmap__legend-item">
                  <span className="netmap__ramp" />
                  {t('admin.map.presence')}
                </span>
              ) : null}
              <span className="netmap__legend-item">
                <span className="netmap__legend-dash" />
                {t('admin.map.landside')}
              </span>
              <span className="netmap__legend-item">
                <span className="netmap__legend-gate">A1</span>
                {t('player.fids.gate')}
              </span>
              <span className="netmap__legend-item netmap__legend-hint">{t('admin.map.clickHint')}</span>
            </div>
          ) : null}

          {hover && width > 0 ? (
            <div
              className="netmap__tip"
              style={{
                left: Math.max(8, Math.min(width - 228, offsetX + (hover.position.x - view.x) * scale + 14)),
                top: Math.max(8, offsetY + (hover.position.y - view.y) * scale - 12),
              }}
            >
              <div className="netmap__tip-head">
                <strong>{hover.screenId}</strong>
                <span className={`netmap__badge netmap__badge--${hover.status}`}>
                  {tx(`common.status.${hover.status}`, hover.status)}
                </span>
              </div>
              <span className="muted small">{zoneNames.get(hover.zoneId) ?? hover.zoneId}</span>
              <span className="netmap__tip-pax">
                <Icon name="users" size={14} />
                {t('admin.map.pax', { n: fmt.number(hover.pax) })}
              </span>
              <span className="netmap__tip-hint">{t('admin.map.clickHint')}</span>
            </div>
          ) : null}
        </div>

        <aside className="netmap__side">
          <section className="netmap__panel">
            <h3 className="netmap__panel-title">
              <Icon name="users" size={16} />
              {t('admin.map.busiest')}
            </h3>
            <ol className="netmap__ranks">
              {busiest.map((z) => (
                <li
                  key={z.zoneId}
                  className={focusZone === z.zoneId ? 'is-focus' : undefined}
                  onPointerEnter={() => setFocusZone(z.zoneId)}
                  onPointerLeave={() => setFocusZone(null)}
                >
                  <div className="netmap__rank-head">
                    <span className="netmap__rank-name">{z.name}</span>
                    <span className="num">{fmt.compact(z.pax)}</span>
                  </div>
                  <div className="netmap__rank-bar">
                    <span style={{ width: `${Math.round((z.pax / maxPax) * 100)}%` }} />
                  </div>
                  <span className="netmap__rank-sub">
                    {t('admin.map.intl', { pct: fmt.percent(z.international / 100) })}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="netmap__panel">
            <h3 className="netmap__panel-title">
              <Icon name="alert" size={16} />
              {t('admin.map.attention')}
              {attention.length > 0 ? <span className="netmap__count">{attention.length}</span> : null}
            </h3>
            {attention.length === 0 ? (
              <p className="netmap__healthy">
                <Icon name="check" size={16} />
                {t('admin.map.allOnline', { n: fmt.number(all.length) })}
              </p>
            ) : (
              <ul className="netmap__alerts">
                {attention.map((s) => (
                  <li key={s.screenId}>
                    <button type="button" onClick={() => open(s.screenId)}>
                      <span className={`netmap__badge netmap__badge--${s.status}`}>
                        {tx(`common.status.${s.status}`, s.status)}
                      </span>
                      <span className="netmap__alert-name">
                        <strong>{s.screenId}</strong>
                        <span className="muted xsmall">{zoneNames.get(s.zoneId) ?? s.zoneId}</span>
                      </span>
                      <Icon name="chevron-right" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
