import { useSyncExternalStore } from 'react';
import { useThemePreference } from './useThemePreference';

const query = '(prefers-color-scheme: dark)';

function subscribe(callback: () => void) {
  const media = window.matchMedia?.(query);
  media?.addEventListener('change', callback);
  return () => media?.removeEventListener('change', callback);
}

/** The theme actually showing: the saved choice, or the system's when set to System. */
export function useResolvedTheme(): 'light' | 'dark' {
  const [preference] = useThemePreference();
  const systemDark = useSyncExternalStore(subscribe, () => window.matchMedia?.(query).matches ?? false, () => false);
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}
