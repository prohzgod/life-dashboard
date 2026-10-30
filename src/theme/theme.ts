import { applyAppearance } from './appearance';

export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'life-dashboard:theme';

const listeners = new Set<() => void>();

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** The theme chosen on this device. Defaults to following the system setting. */
export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Sets `data-theme` (and the background that goes with it) on <html>; "system" follows the OS. */
export function applyThemePreference(preference: ThemePreference, root: HTMLElement = document.documentElement) {
  applyAppearance(root, preference);
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this visit.
  }
  applyThemePreference(preference);
  listeners.forEach((listener) => listener());
}

export function subscribeThemePreference(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyThemePreference(readThemePreference());
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
