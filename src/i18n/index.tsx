/**
 * Translations and formatting. `useI18n()` gives `t(key, vars)`, the text direction and a formatter bound to
 * the airport's time zone and currency. The language is remembered per browser.
 */
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAppConfig } from '../app/config';
import { type Formatter, type Lang, createFormatter, interpolate } from '../lib/format';
import { readPref, writePref } from '../lib/prefs';
import { ar } from './ar';
import { type MessageKey, en } from './en';

export type { MessageKey } from './en';

const DICTIONARIES = new Map<Lang, ReadonlyMap<string, string>>([
  ['en', new Map(Object.entries(en))],
  ['ar', new Map(Object.entries(ar))],
]);

export const LANGUAGES: readonly { id: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { id: 'en', label: 'English', dir: 'ltr' },
  { id: 'ar', label: 'العربية', dir: 'rtl' },
];

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

interface I18nValue {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (lang: Lang) => void;
  t: Translate;
  /** Translate a key built at run time (falls back to `fallback`, then the key). */
  tx: (key: string, fallback?: string) => string;
  fmt: Formatter;
}

const I18nContext = createContext<I18nValue | null>(null);

const isLang = (v: unknown): v is Lang => v === 'en' || v === 'ar';

export function I18nProvider({ children }: { children: ReactNode }) {
  const { brand, config } = useAppConfig();
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = readPref('lang');
    return isLang(saved) ? saved : brand.defaultLanguage;
  });
  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    writePref('lang', next);
  }, []);
  const dir = LANGUAGES.find((l) => l.id === lang)?.dir ?? 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const value = useMemo<I18nValue>(() => {
    const dict = DICTIONARIES.get(lang) ?? new Map<string, string>();
    const fallback = DICTIONARIES.get('en') ?? new Map<string, string>();
    const tx = (key: string, alt?: string) => dict.get(key) ?? fallback.get(key) ?? alt ?? key;
    return {
      lang,
      dir,
      setLang,
      t: (key, vars) => interpolate(tx(key), vars),
      tx,
      fmt: createFormatter(lang, config.airport.utcOffsetMinutes, config.currency),
    };
  }, [lang, dir, setLang, config.airport.utcOffsetMinutes, config.currency]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n outside I18nProvider');
  return value;
}
