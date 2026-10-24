import { describe, expect, it } from 'vitest';

import { DEFAULT_BRAND, isHexColor, parseBrand } from '../src/app/brand';
import { pagePath, resolveRoute } from '../src/app/roles';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { simNowMs } from '../src/lib/clock';
import { createFormatter, interpolate } from '../src/lib/format';
import { hrefOf, matchPath, parseLocation } from '../src/lib/router';

describe('router', () => {
  it('parses locations and normalises trailing slashes', () => {
    const loc = parseLocation('/retailer/campaigns/?as=adv-aurelia');
    expect(loc.path).toBe('/retailer/campaigns');
    expect(loc.query.get('as')).toBe('adv-aurelia');
    expect(loc.href).toBe('/retailer/campaigns?as=adv-aurelia');
  });

  it('matches patterns with parameters and optional segments', () => {
    expect(matchPath('/claim/:token', '/claim/abc')?.get('token')).toBe('abc');
    expect(matchPath('/claim/:token', '/claim')).toBeNull();
    expect(matchPath('/passenger/:screen?', '/passenger')?.size).toBe(0);
    expect(matchPath('/admin', '/admin/extra')).toBeNull();
  });

  it('builds hrefs and drops empty values', () => {
    expect(hrefOf('/split', { left: '/admin', right: undefined })).toBe('/split?left=%2Fadmin');
    expect(parseLocation(hrefOf('/split', { left: '/airline?as=adv-air-XH' })).query.get('left')).toBe(
      '/airline?as=adv-air-XH',
    );
  });
});

describe('roles', () => {
  it('resolves dashboards, sub-pages and the passenger screen', () => {
    expect(resolveRoute('/admin')?.page).toBe('overview');
    expect(resolveRoute('/retailer/promos')?.page).toBe('promos');
    expect(resolveRoute('/passenger/SCR-T2-D-01')?.rest).toEqual(['SCR-T2-D-01']);
    expect(resolveRoute('/admin/overview')).toBeNull();
    expect(resolveRoute('/admin/unknown')).toBeNull();
    expect(resolveRoute('/nobody')).toBeNull();
    expect(pagePath('media', 'overview')).toBe('/media');
  });
});

describe('formatting', () => {
  const fmt = createFormatter('en', 240, 'USD');
  it('shows times in airport time whatever the viewer time zone', () => {
    expect(fmt.time('2026-10-16T10:10:00Z')).toBe('14:10');
    expect(fmt.timeSeconds('2026-10-16T10:10:05Z')).toBe('14:10:05');
    expect(fmt.day('2026-10-16T21:00:00Z')).toContain('17');
  });
  it('uses Latin digits in Arabic', () => {
    expect(createFormatter('ar', 240, 'USD').time('2026-10-16T10:10:00Z')).toBe('14:10');
  });
  it('formats money and shares', () => {
    expect(fmt.money(1240)).toBe('US$1,240');
    expect(fmt.percent(0.38)).toBe('38%');
  });
  it('interpolates placeholders', () => {
    expect(interpolate('{flight} delayed {minutes} min', { flight: 'XH501', minutes: 45 })).toBe(
      'XH501 delayed 45 min',
    );
    expect(interpolate('{missing}')).toBe('{missing}');
  });
});

describe('simulation clock', () => {
  const state = {
    now: '2026-10-16T10:10:00.000Z',
    playing: true,
    speed: 60,
    start: '2026-10-16T00:00:00.000Z',
    end: '2026-10-16T20:00:00.000Z',
  };
  it('extrapolates between clock messages at the current speed', () => {
    expect(simNowMs(state, 1000, 2000) - Date.parse(state.now)).toBe(60_000);
    expect(simNowMs({ ...state, playing: false }, 1000, 2000)).toBe(Date.parse(state.now));
  });
  it('never runs past the end of the day', () => {
    expect(simNowMs(state, 0, 1e9)).toBe(Date.parse(state.end));
  });
});

describe('white-label brand', () => {
  it('accepts valid values and falls back on invalid ones', () => {
    const brand = parseBrand({
      productName: 'Harbor Ads',
      accent: '#123abc',
      accentInk: 'red',
      defaultLanguage: 'ar',
    });
    expect(brand.productName).toBe('Harbor Ads');
    expect(brand.accent).toBe('#123abc');
    expect(brand.accentInk).toBe(DEFAULT_BRAND.accentInk);
    expect(brand.defaultLanguage).toBe('ar');
    expect(parseBrand('nonsense')).toEqual(DEFAULT_BRAND);
  });
  it('only accepts #rrggbb colours (they end up in CSS)', () => {
    expect(isHexColor('#2a78d6')).toBe(true);
    expect(isHexColor('#2a78d')).toBe(false);
    expect(isHexColor('url(x)')).toBe(false);
    expect(isHexColor('#2a78dg')).toBe(false);
  });
});

describe('translations', () => {
  it('Arabic covers every English key with the same placeholders', () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const arabic = new Map(Object.entries(ar));
    for (const [key, text] of Object.entries(en)) {
      const translated = arabic.get(key);
      expect(translated, key).toBeTruthy();
      expect(placeholders(translated ?? ''), key).toEqual(placeholders(text));
    }
  });
});
