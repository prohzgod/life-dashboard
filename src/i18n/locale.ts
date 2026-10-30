import { en } from './en';
import { vi } from './vi';

export type Locale = 'vi' | 'en';
export type Messages = typeof en;

export const LOCALES: readonly Locale[] = ['vi', 'en'];
/** Vietnamese until you pick another language. */
export const DEFAULT_LOCALE: Locale = 'vi';
export const LOCALE_STORAGE_KEY = 'life-dashboard:locale';

const catalogs: Record<Locale, Messages> = { vi, en };
/** The BCP 47 tag handed to Intl for numbers, currencies and dates. */
const INTL_TAGS: Record<Locale, string> = { vi: 'vi-VN', en: 'en-US' };

const listeners = new Set<() => void>();
/** Read from storage once; copy is looked up on every render. */
let current: Locale | null = null;

function isLocale(value: unknown): value is Locale {
  return value === 'vi' || value === 'en';
}

function storedLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** The language chosen on this device. */
export function readLocale(): Locale {
  return (current ??= storedLocale());
}

/** Sets `lang` on <html> so screen readers and hyphenation use the right language. */
export function applyLocale(locale: Locale, root: HTMLElement = document.documentElement) {
  root.setAttribute('lang', locale);
}

export function setLocale(locale: Locale) {
  current = locale;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage can be blocked (private mode); the language still applies for this visit.
  }
  if (typeof document !== 'undefined') applyLocale(locale);
  listeners.forEach((listener) => listener());
}

export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== LOCALE_STORAGE_KEY) return;
    current = storedLocale();
    applyLocale(current);
    listener();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

/** The current language's copy, for code outside components (formatters, seed, notifications). */
export function messages(locale: Locale = readLocale()): Messages {
  return catalogs[locale];
}

export function intlLocale(locale: Locale = readLocale()): string {
  return INTL_TAGS[locale];
}
