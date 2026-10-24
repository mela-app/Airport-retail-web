/**
 * White-label configuration, read at start-up from `/brand.json` (replace that file, or mount another one in
 * Docker, to rebrand without rebuilding). Unknown or invalid values fall back to the defaults.
 */
import type { Lang } from '../lib/format';

export interface Brand {
  productName: string;
  operatorName: string;
  airportName: string;
  airportCode: string;
  /** Accent colour for primary actions and the active navigation (`#rrggbb`). */
  accent: string;
  /** Text colour on the accent (`#rrggbb`). */
  accentInk: string;
  defaultLanguage: Lang;
}

export const DEFAULT_BRAND: Brand = {
  productName: 'Meridian Media',
  operatorName: 'Meridian Airport Company',
  airportName: 'Meridian International',
  airportCode: 'MQI',
  accent: '#2a78d6',
  accentInk: '#ffffff',
  defaultLanguage: 'en',
};

const HEX = '0123456789abcdef';

/** `#rrggbb` only: the value ends up in a CSS custom property. */
export function isHexColor(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length === 7 &&
    value.startsWith('#') &&
    [...value.slice(1).toLowerCase()].every((c) => HEX.includes(c))
  );
}

const text = (value: unknown, max: number): string | undefined =>
  typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : undefined;

export function parseBrand(raw: unknown): Brand {
  if (!raw || typeof raw !== 'object') return DEFAULT_BRAND;
  const r = new Map(Object.entries(raw));
  const lang = r.get('defaultLanguage');
  return {
    productName: text(r.get('productName'), 60) ?? DEFAULT_BRAND.productName,
    operatorName: text(r.get('operatorName'), 80) ?? DEFAULT_BRAND.operatorName,
    airportName: text(r.get('airportName'), 80) ?? DEFAULT_BRAND.airportName,
    airportCode: text(r.get('airportCode'), 4) ?? DEFAULT_BRAND.airportCode,
    accent: isHexColor(r.get('accent')) ? (r.get('accent') as string) : DEFAULT_BRAND.accent,
    accentInk: isHexColor(r.get('accentInk')) ? (r.get('accentInk') as string) : DEFAULT_BRAND.accentInk,
    defaultLanguage: lang === 'ar' || lang === 'en' ? lang : DEFAULT_BRAND.defaultLanguage,
  };
}

/** Apply the accent to the page (the design tokens derive hover and tint colours from it). */
export function applyBrand(brand: Brand): void {
  const root = document.documentElement;
  root.style.setProperty('--brand-accent', brand.accent);
  root.style.setProperty('--brand-accent-ink', brand.accentInk);
  document.title = brand.productName;
}
