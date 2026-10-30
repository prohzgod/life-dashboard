import { useSyncExternalStore } from 'react';
import { DEFAULT_LOCALE, messages, readLocale, setLocale, subscribeLocale, type Locale, type Messages } from './locale';

export * from './locale';

export function useLocale(): [Locale, (locale: Locale) => void] {
  const locale = useSyncExternalStore(subscribeLocale, readLocale, () => DEFAULT_LOCALE);
  return [locale, setLocale];
}

/** The current language's copy: `const t = useT(); t.today.title`. */
export function useT(): Messages {
  return messages(useLocale()[0]);
}
