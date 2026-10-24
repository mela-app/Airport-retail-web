/**
 * Everything the app needs before it can render: the white-label brand, the API's public settings (airport
 * time zone, currency, public URL for QR codes) and the advertisers behind the company switcher.
 */
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { api } from '../lib/api';
import { useLive } from '../lib/live';
import type { Advertiser, PublicConfig } from '../lib/types';
import { type Brand, applyBrand, parseBrand } from './brand';

interface AppConfig {
  brand: Brand;
  config: PublicConfig;
  advertisers: Advertiser[];
}

const ConfigContext = createContext<AppConfig | null>(null);

/** Shown before the translations are available. */
const STARTUP_TEXT = { en: 'Waiting for the API to start…', ar: 'بانتظار تشغيل الواجهة البرمجية…' };

async function loadBrand(): Promise<Brand> {
  try {
    const res = await fetch('/brand.json', { cache: 'no-cache' });
    return parseBrand(res.ok ? await res.json() : null);
  } catch {
    return parseBrand(null);
  }
}

export function AppConfigProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [value, setValue] = useState<AppConfig>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadBrand(),
      api.get<PublicConfig>('/api/config/public'),
      api.get<Advertiser[]>('/api/advertisers'),
    ])
      .then(([brand, config, advertisers]) => {
        if (cancelled) return;
        applyBrand(brand);
        setValue({ brand, config, advertisers });
        setError(undefined);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        // The API may still be starting (it generates the mock world on first run): keep trying.
        setTimeout(() => setAttempt((a) => a + 1), 2000);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Vendors can be added or renamed in master data.
  useLive('catalog', (data) => {
    if ((data as { entity?: string }).entity !== 'advertiser') return;
    api
      .get<Advertiser[]>('/api/advertisers')
      .then((advertisers) => setValue((v) => (v ? { ...v, advertisers } : v)))
      .catch(() => undefined);
  });

  if (!value) return <>{error ? <StartupNotice error={error} /> : fallback}</>;
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

function StartupNotice({ error }: { error: string }) {
  return (
    <div className="startup" role="status">
      <div className="startup__card">
        <div className="spinner" aria-hidden="true" />
        <p>{STARTUP_TEXT.en}</p>
        <p lang="ar" dir="rtl">
          {STARTUP_TEXT.ar}
        </p>
        <p className="muted small">{error}</p>
      </div>
    </div>
  );
}

export function useAppConfig(): AppConfig {
  const value = useContext(ConfigContext);
  if (!value) throw new Error('useAppConfig outside AppConfigProvider');
  return value;
}
