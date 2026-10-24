/**
 * Today's departures on a time axis: the boarding window as a bar, the scheduled time as a tick, a delay as
 * a warning segment from scheduled to estimated time, and a "now" line.
 */
import { useI18n } from '../../i18n';
import { useWidth } from '../../ui/charts';
import type { AirlineOverview } from '../../lib/analytics-types';

type Flight = AirlineOverview['flights'][number];

const HOUR = 3_600_000;
const ROW = 30;
const LABEL = 150;

export function FlightTimeline({ flights, nowMs }: { flights: readonly Flight[]; nowMs: number }) {
  const { t, fmt, tx } = useI18n();
  const [ref, measured] = useWidth<HTMLDivElement>();
  const from = Math.floor((nowMs - HOUR) / HOUR) * HOUR;
  const to = from + 9 * HOUR;
  const rows = flights
    .filter((f) => f.direction === 'D' && f.boardingAt)
    .filter((f) => {
      const etd = Date.parse(f.estimatedTime ?? f.scheduledTime);
      return etd >= from && Date.parse(f.boardingAt ?? '') <= to;
    })
    .slice(0, 14);
  const width = Math.max(480, measured);
  const plot = width - LABEL - 16;
  const x = (ms: number) => LABEL + ((Math.min(Math.max(ms, from), to) - from) / (to - from)) * plot;
  const height = rows.length * ROW + 30;
  const hours = Array.from({ length: 10 }, (_, i) => from + i * HOUR);

  if (rows.length === 0) return <p className="muted small">{t('airline.timeline.none')}</p>;
  return (
    <div className="timeline" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={t('airline.timeline.title')}>
        {hours.map((h) => (
          <g key={h}>
            <line className="chart__grid" x1={x(h)} x2={x(h)} y1={0} y2={height - 22} />
            <text className="chart__tick" x={x(h)} y={height - 6} textAnchor="middle">
              {fmt.time(h)}
            </text>
          </g>
        ))}
        {rows.map((f, i) => {
          const y = i * ROW + 6;
          const std = Date.parse(f.scheduledTime);
          const etd = Date.parse(f.estimatedTime ?? f.scheduledTime);
          const b0 = Date.parse(f.boardingAt ?? f.scheduledTime);
          const b1 = Date.parse(f.gateCloseAt ?? f.scheduledTime);
          const delayed = f.delayMinutes > 0;
          return (
            <g key={f.id}>
              <text className="timeline__label" x={0} y={y + 12}>
                <tspan className="timeline__flight">{f.flight}</tspan>
                <tspan className="timeline__meta" dx={6}>
                  {`${f.other} · ${f.gate ?? '–'}`}
                </tspan>
              </text>
              <rect
                x={x(b0)}
                y={y + 2}
                width={Math.max(3, x(b1) - x(b0))}
                height={14}
                rx={4}
                className={f.inBoardingWindow ? 'timeline__window is-now' : 'timeline__window'}
              >
                <title>{`${f.flight} ${t('airline.timeline.boarding')} ${fmt.time(b0)}–${fmt.time(b1)} · ${tx(`flight.status.${f.status}`, f.status)}`}</title>
              </rect>
              {delayed ? (
                <line className="timeline__delay" x1={x(std)} x2={x(etd)} y1={y + 9} y2={y + 9}>
                  <title>{t('airline.timeline.delay', { flight: f.flight, minutes: f.delayMinutes })}</title>
                </line>
              ) : null}
              <line className="timeline__std" x1={x(std)} x2={x(std)} y1={y} y2={y + 18} />
              <circle
                className={delayed ? 'timeline__etd is-delayed' : 'timeline__etd'}
                cx={x(etd)}
                cy={y + 9}
                r={4}
              />
            </g>
          );
        })}
        <line className="timeline__now" x1={x(nowMs)} x2={x(nowMs)} y1={0} y2={height - 22} />
      </svg>
      <ul className="legend">
        <li>
          <span className="legend__box" style={{ background: 'var(--series-1)' }} aria-hidden="true" />
          {t('airline.timeline.boarding')}
        </li>
        <li>
          <span className="legend__line" style={{ background: 'var(--status-warning)' }} aria-hidden="true" />
          {t('airline.timeline.delayLegend')}
        </li>
        <li>
          <span
            className="legend__line"
            style={{ background: 'var(--status-critical)' }}
            aria-hidden="true"
          />
          {t('airline.timeline.now')}
        </li>
      </ul>
    </div>
  );
}
