import { useCallback } from 'react';
import { useLocaleStore } from './localeStore';
import { translations } from './translations';

function getNested(
  obj: Record<string, unknown>,
  path: string
): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(
  str: string,
  vars: Record<string, string | number>
): string {
  return str.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => String(vars[key] ?? `{{${key}}}`)
  );
}

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const str = getNested(
        translations[locale] as unknown as Record<string, unknown>,
        key
      );
      const result =
        str ??
        getNested(
          translations.en as unknown as Record<string, unknown>,
          key
        ) ??
        key;
      return vars ? interpolate(result, vars) : result;
    },
    [locale]
  );

  const formatDelay = useCallback(
    (seconds: number): string => {
      if (seconds < 60) {
        return `${seconds} ${seconds > 1 ? t('time.seconds') : t('time.second')}`;
      }
      if (seconds < 3600) {
        const m = Math.floor(seconds / 60);
        return `${m} ${m > 1 ? t('time.minutes') : t('time.minute')}`;
      }
      if (seconds < 86400) {
        const h = Math.floor(seconds / 3600);
        return `${h} ${h > 1 ? t('time.hours') : t('time.hour')}`;
      }
      const d = Math.floor(seconds / 86400);
      return `${d} ${d > 1 ? t('time.days') : t('time.day')}`;
    },
    [t]
  );

  return { t, formatDelay, locale, setLocale };
}

export { useLocaleStore } from './localeStore';
export type { Locale } from './translations';
