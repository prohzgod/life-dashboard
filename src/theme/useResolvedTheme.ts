import { useSyncExternalStore } from 'react';
import { readLook, resolveAppearance, subscribeLook } from './appearance';
import { useThemePreference } from './useThemePreference';

const query = '(prefers-color-scheme: dark)';

function subscribe(callback: () => void) {
  const media = window.matchMedia?.(query);
  media?.addEventListener('change', callback);
  return () => media?.removeEventListener('change', callback);
}

/** The theme actually showing: the saved choice, or the system's when set to System. Night is always dark. */
export function useResolvedTheme(): 'light' | 'dark' {
  const [preference] = useThemePreference();
  const look = useSyncExternalStore(subscribeLook, readLook, readLook);
  const systemDark = useSyncExternalStore(subscribe, () => window.matchMedia?.(query).matches ?? false, () => false);
  return resolveAppearance(preference, look, systemDark).theme;
}
