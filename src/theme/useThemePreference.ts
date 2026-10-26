import { useSyncExternalStore } from 'react';
import { readThemePreference, setThemePreference, subscribeThemePreference, type ThemePreference } from './theme';

export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void] {
  const preference = useSyncExternalStore(subscribeThemePreference, readThemePreference, () => 'system' as const);
  return [preference, setThemePreference];
}
