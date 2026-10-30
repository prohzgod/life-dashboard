import { Fragment, type ReactNode } from 'react';
import { useLocale } from '@/i18n';

/**
 * Re-mounts the app when you change language, so copy read outside components
 * (formatters, screen labels, memoised text) is read again in the new language.
 */
export function LocaleRoot({ children }: { children: ReactNode }) {
  const [locale] = useLocale();
  return <Fragment key={locale}>{children}</Fragment>;
}
