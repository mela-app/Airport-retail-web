/**
 * Number, money and time formatting. Times are always shown in the airport's local time (a fixed UTC offset
 * from the API), whatever the viewer's own time zone; Arabic uses Latin digits, as airport signage does.
 */

export type Lang = 'en' | 'ar';

const LOCALES = new Map<Lang, string>([
  ['en', 'en-GB'],
  ['ar', 'ar-u-nu-latn'],
]);

export interface Formatter {
  lang: Lang;
  number: (value: number, digits?: number) => string;
  compact: (value: number) => string;
  money: (value: number, options?: { compact?: boolean }) => string;
  percent: (share: number, digits?: number) => string;
  /** `HH:MM` airport time. */
  time: (at: string | number | Date) => string;
  /** `HH:MM:SS` airport time. */
  timeSeconds: (at: string | number | Date) => string;
  /** Weekday and date in airport time, e.g. "Fri 16 Oct". */
  day: (at: string | number | Date) => string;
}

export function createFormatter(lang: Lang, utcOffsetMinutes: number, currency: string): Formatter {
  const locale = LOCALES.get(lang) ?? 'en-GB';
  const shift = (at: string | number | Date) => new Date(new Date(at).getTime() + utcOffsetMinutes * 60_000);
  const hm = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  });
  const hms = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  });
  const dayFmt = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const compactFmt = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  const moneyFmt = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 });
  const moneyCompact = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  return {
    lang,
    number: (value, digits = 0) =>
      new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(
        value,
      ),
    compact: (value) => compactFmt.format(value),
    money: (value, options) => (options?.compact ? moneyCompact : moneyFmt).format(value),
    percent: (share, digits = 0) =>
      new Intl.NumberFormat(locale, {
        style: 'percent',
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(share),
    time: (at) => hm.format(shift(at)),
    timeSeconds: (at) => hms.format(shift(at)),
    day: (at) => dayFmt.format(shift(at)),
  };
}

/** Replace `{name}` placeholders. */
export function interpolate(template: string, vars: Record<string, string | number> = {}): string {
  const values = new Map(Object.entries(vars));
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const v = values.get(name);
    return v === undefined ? whole : String(v);
  });
}

/** `1:22:10` or `04:05` for a duration in milliseconds. */
export function countdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
