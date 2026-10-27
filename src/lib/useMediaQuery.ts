import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia?.(query);
      media?.addEventListener('change', callback);
      return () => media?.removeEventListener('change', callback);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}

/** Phones: below 768px the app uses the tab bar and mobile layouts (DESIGN.md). */
export const MOBILE_QUERY = '(max-width: 767px)';

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
