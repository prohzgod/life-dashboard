import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { localizeSeedContent } from '@/data';
import { useLocale } from '@/i18n';

/**
 * Re-mounts the app when you change language, so copy read outside components
 * (formatters, screen labels, memoised text) is read again in the new language.
 * Starter content the app made (Journal folders, the sample goal and habits…) is renamed to match.
 */
export function LocaleRoot({ children }: { children: ReactNode }) {
  const [locale] = useLocale();
  const shown = useRef(locale);
  useEffect(() => {
    if (locale === shown.current) return;
    shown.current = locale;
    void localizeSeedContent();
  }, [locale]);
  return <Fragment key={locale}>{children}</Fragment>;
}
