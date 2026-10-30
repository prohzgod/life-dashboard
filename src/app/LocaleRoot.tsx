import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { localizeSystemNodes } from '@/data';
import { useLocale } from '@/i18n';

/**
 * Re-mounts the app when you change language, so copy read outside components
 * (formatters, screen labels, memoised text) is read again in the new language.
 * The folders the app made (Journal and its years, months and days) are renamed to match.
 */
export function LocaleRoot({ children }: { children: ReactNode }) {
  const [locale] = useLocale();
  const shown = useRef(locale);
  useEffect(() => {
    if (locale === shown.current) return;
    shown.current = locale;
    void localizeSystemNodes();
  }, [locale]);
  return <Fragment key={locale}>{children}</Fragment>;
}
