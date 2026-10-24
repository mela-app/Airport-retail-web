/**
 * Small SVG charts: line/area with a crosshair tooltip, columns, a heat grid and a sparkline.
 * Marks carry the series colour (CSS variables, so both themes work); text always uses ink colours.
 * Lines are 2 px, columns at most 24 px wide with 4 px rounded tops, gridlines are hairlines.
 */
import { type ReactNode, useEffect, useRef, useState } from 'react';

/** Width of an element, kept up to date. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry?.contentRect.width ?? 0)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** "Nice" axis ticks from 0 to at least `max`. */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

export interface Series {
  id: string;
  label: string;
  /** A CSS colour, normally `var(--series-n)`. */
  color: string;
  values: readonly { x: number; y: number }[];
}

const PAD = { top: 12, right: 16, bottom: 26, left: 44 };

export function LineChart({
  series,
  height = 220,
  area = false,
  xFormat,
  yFormat,
  label,
}: {
  series: readonly Series[];
  height?: number;
  area?: boolean;
  xFormat: (x: number) => string;
  yFormat: (y: number) => string;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const xs = [...new Set(series.flatMap((s) => s.values.map((v) => v.x)))].sort((a, b) => a - b);
  const maxY = Math.max(0, ...series.flatMap((s) => s.values.map((v) => v.y)));
  const ticks = niceTicks(maxY);
  const top = ticks.at(-1) ?? 1;
  const w = Math.max(0, width - PAD.left - PAD.right);
  const h = height - PAD.top - PAD.bottom;
  const x0 = xs.at(0) ?? 0;
  const x1 = xs.at(-1) ?? 1;
  const sx = (x: number) => PAD.left + (x1 === x0 ? w / 2 : ((x - x0) / (x1 - x0)) * w);
  const sy = (y: number) => PAD.top + h - (y / top) * h;
  const xTicks = xs.filter((_, i) => i % Math.max(1, Math.ceil(xs.length / 6)) === 0);
  const hoverX = hover === null ? null : xs.at(hover);

  return (
    <div className="chart" ref={ref}>
      {series.length > 1 ? (
        <Legend items={series.map((s) => ({ label: s.label, color: s.color, kind: 'line' }))} />
      ) : null}
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = e.clientX - rect.left;
            let best = 0;
            let dist = Infinity;
            for (const [i, x] of xs.entries()) {
              const d = Math.abs(sx(x) - px);
              if (d < dist) {
                dist = d;
                best = i;
              }
            }
            setHover(best);
          }}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((tv) => (
            <g key={tv}>
              <line className="chart__grid" x1={PAD.left} x2={PAD.left + w} y1={sy(tv)} y2={sy(tv)} />
              <text className="chart__tick" x={PAD.left - 8} y={sy(tv)} dy="0.32em" textAnchor="end">
                {yFormat(tv)}
              </text>
            </g>
          ))}
          {xTicks.map((x) => (
            <text key={x} className="chart__tick" x={sx(x)} y={height - 6} textAnchor="middle">
              {xFormat(x)}
            </text>
          ))}
          {series.map((s) => {
            const pts = s.values.map((v) => `${sx(v.x)},${sy(v.y)}`);
            if (pts.length === 0) return null;
            const first = s.values.at(0);
            const last = s.values.at(-1);
            return (
              <g key={s.id}>
                {area && first && last ? (
                  <polygon
                    points={`${sx(first.x)},${sy(0)} ${pts.join(' ')} ${sx(last.x)},${sy(0)}`}
                    fill={s.color}
                    opacity={0.1}
                  />
                ) : null}
                <polyline
                  points={pts.join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {last ? (
                  <circle cx={sx(last.x)} cy={sy(last.y)} r={4} fill={s.color} className="chart__dot" />
                ) : null}
              </g>
            );
          })}
          {hoverX !== null && hoverX !== undefined ? (
            <g>
              <line
                className="chart__crosshair"
                x1={sx(hoverX)}
                x2={sx(hoverX)}
                y1={PAD.top}
                y2={PAD.top + h}
              />
              {series.map((s) => {
                const v = s.values.find((p) => p.x === hoverX);
                return v ? (
                  <circle key={s.id} cx={sx(v.x)} cy={sy(v.y)} r={4} fill={s.color} className="chart__dot" />
                ) : null;
              })}
            </g>
          ) : null}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      {hoverX !== null && hoverX !== undefined && width > 0 ? (
        <Tooltip x={sx(hoverX)} width={width} title={xFormat(hoverX)}>
          {series.map((s) => {
            const v = s.values.find((p) => p.x === hoverX);
            return v ? <TooltipRow key={s.id} color={s.color} label={s.label} value={yFormat(v.y)} /> : null;
          })}
        </Tooltip>
      ) : null}
    </div>
  );
}

export function ColumnChart({
  points,
  color = 'var(--series-1)',
  height = 200,
  yFormat,
  label,
  valueLabel,
  highlight,
}: {
  points: readonly { key: string; label: string; value: number }[];
  color?: string;
  height?: number;
  yFormat: (y: number) => string;
  label: string;
  valueLabel: string;
  /** Key of a column to emphasise (e.g. the current hour). */
  highlight?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const ticks = niceTicks(Math.max(0, ...points.map((p) => p.value)));
  const top = ticks.at(-1) ?? 1;
  const w = Math.max(0, width - PAD.left - PAD.right);
  const h = height - PAD.top - PAD.bottom;
  const band = points.length > 0 ? w / points.length : 0;
  const bar = Math.max(2, Math.min(24, band - 2));
  const sy = (y: number) => PAD.top + h - (y / top) * h;
  const every = Math.max(1, Math.ceil(points.length / 12));
  const hovered = hover === null ? undefined : points.at(hover);

  return (
    <div className="chart" ref={ref}>
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((tv) => (
            <g key={tv}>
              <line className="chart__grid" x1={PAD.left} x2={PAD.left + w} y1={sy(tv)} y2={sy(tv)} />
              <text className="chart__tick" x={PAD.left - 8} y={sy(tv)} dy="0.32em" textAnchor="end">
                {yFormat(tv)}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const cx = PAD.left + band * i + band / 2;
            const y = sy(p.value);
            const hgt = PAD.top + h - y;
            const r = Math.min(4, hgt / 2, bar / 2);
            const x = cx - bar / 2;
            const d =
              hgt <= 0
                ? ''
                : `M${x},${PAD.top + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + bar - r}Q${x + bar},${y} ${x + bar},${y + r}V${PAD.top + h}Z`;
            return (
              <g
                key={p.key}
                onPointerEnter={() => setHover(i)}
                tabIndex={0}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <rect x={PAD.left + band * i} y={PAD.top} width={band} height={h} fill="transparent" />
                {d ? (
                  <path
                    d={d}
                    fill={color}
                    opacity={
                      hover === null || hover === i
                        ? highlight === undefined || highlight === p.key
                          ? 1
                          : 0.55
                        : 0.4
                    }
                  />
                ) : null}
                {i % every === 0 ? (
                  <text className="chart__tick" x={cx} y={height - 6} textAnchor="middle">
                    {p.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      {hovered && hover !== null ? (
        <Tooltip x={PAD.left + band * hover + band / 2} width={width} title={hovered.label}>
          <TooltipRow color={color} label={valueLabel} value={yFormat(hovered.value)} />
        </Tooltip>
      ) : null}
    </div>
  );
}

export interface HeatCell {
  value: number;
  /** Shown in the tooltip; the value formatter is used when absent. */
  text?: string;
  /** Overrides the sequential colour (e.g. a status). */
  className?: string;
}

/** Rows × columns of cells coloured on the sequential ramp (value / max). */
export function HeatGrid({
  rows,
  columns,
  format,
  label,
  max,
  rowLabelWidth = 120,
  cellHeight = 22,
}: {
  rows: readonly { key: string; label: string; cells: readonly HeatCell[] }[];
  columns: readonly string[];
  format: (v: number) => string;
  label: string;
  max?: number;
  rowLabelWidth?: number;
  cellHeight?: number;
}) {
  const [tip, setTip] = useState<{ row: string; col: string; text: string; x: number; y: number } | null>(
    null,
  );
  const top = max ?? Math.max(0, ...rows.flatMap((r) => r.cells.map((c) => c.value)));
  const step = (v: number) => (top > 0 ? Math.min(7, Math.max(1, Math.ceil((v / top) * 7))) : 1);
  return (
    <div className="heat" role="table" aria-label={label} onPointerLeave={() => setTip(null)}>
      <div
        className="heat__row heat__row--head"
        role="row"
        style={{ gridTemplateColumns: `${rowLabelWidth}px repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        <span role="columnheader" />
        {columns.map((c) => (
          <span key={c} className="heat__col" role="columnheader">
            {c}
          </span>
        ))}
      </div>
      {rows.map((r) => (
        <div
          key={r.key}
          className="heat__row"
          role="row"
          style={{
            gridTemplateColumns: `${rowLabelWidth}px repeat(${columns.length}, minmax(0, 1fr))`,
            height: cellHeight,
          }}
        >
          <span className="heat__label" role="rowheader" title={r.label}>
            {r.label}
          </span>
          {r.cells.map((c, i) => {
            const col = columns.at(i) ?? '';
            const text = c.text ?? format(c.value);
            return (
              <span
                key={col}
                role="cell"
                tabIndex={-1}
                className={
                  c.className
                    ? `heat__cell ${c.className}`
                    : `heat__cell heat__cell--${c.value > 0 ? step(c.value) : 0}`
                }
                aria-label={`${r.label}, ${col}: ${text}`}
                onPointerEnter={(e) => {
                  const host = e.currentTarget.closest('.heat')?.getBoundingClientRect();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTip({
                    row: r.label,
                    col,
                    text,
                    x: rect.left - (host?.left ?? 0) + rect.width / 2,
                    y: rect.top - (host?.top ?? 0),
                  });
                }}
              />
            );
          })}
        </div>
      ))}
      {tip ? (
        <div className="chart__tooltip heat__tooltip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.text}</strong>
          <span>
            {tip.row} · {tip.col}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function Sparkline({
  values,
  color = 'var(--series-1)',
  width = 96,
  height = 28,
}: {
  values: readonly number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const pts = values.map(
    (v, i) => `${(i / (values.length - 1)) * (width - 4) + 2},${height - 2 - (v / max) * (height - 4)}`,
  );
  const last = pts.at(-1)?.split(',') ?? ['0', '0'];
  return (
    <svg width={width} height={height} aria-hidden="true" className="sparkline">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        opacity={0.7}
      />
      <circle cx={Number(last[0])} cy={Number(last[1])} r={2.5} fill={color} />
    </svg>
  );
}

export function Legend({
  items,
}: {
  items: readonly { label: string; color: string; kind?: 'line' | 'box' }[];
}) {
  return (
    <ul className="legend">
      {items.map((i) => (
        <li key={i.label}>
          <span
            className={i.kind === 'line' ? 'legend__line' : 'legend__box'}
            style={{ background: i.color }}
            aria-hidden="true"
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function Tooltip({
  x,
  width,
  title,
  children,
}: {
  x: number;
  width: number;
  title: string;
  children: ReactNode;
}) {
  const left = Math.min(Math.max(8, x + 12), Math.max(8, width - 180));
  return (
    <div className="chart__tooltip" style={{ left, top: 8 }} role="status">
      <span className="chart__tooltip-title">{title}</span>
      {children}
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span className="chart__tooltip-row">
      <span className="legend__line" style={{ background: color }} aria-hidden="true" />
      <strong>{value}</strong>
      <span className="muted">{label}</span>
    </span>
  );
}
