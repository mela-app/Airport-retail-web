import { useI18n } from '../i18n';
import type { SegmentShare } from '../lib/types';

/** Horizontal bars of segment shares (largest first). Text stays in ink colours; the bar carries the value. */
export function Bars({ title, rows, limit = 5 }: { title: string; rows: SegmentShare[]; limit?: number }) {
  const { tx, fmt } = useI18n();
  const sorted = [...rows].sort((a, b) => b.share - a.share).slice(0, limit);
  return (
    <div className="bars">
      <span className="why__label">{title}</span>
      {sorted.map((r) => (
        <div className="bars__row" key={r.segment}>
          <span className="bars__label">{tx(`segment.${r.segment}`, r.segment)}</span>
          <span className="bars__track" aria-hidden="true">
            <span className="bars__fill" style={{ width: `${Math.round(r.share * 100)}%` }} />
          </span>
          <span className="bars__value num">{fmt.percent(r.share)}</span>
        </div>
      ))}
    </div>
  );
}
