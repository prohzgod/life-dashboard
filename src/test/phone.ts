import { MOBILE_QUERY } from '@/lib/useMediaQuery';

/** Makes the app render its phone layout in jsdom (matchMedia reports a narrow screen). */
export function pretendToBeAPhone() {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: query === MOBILE_QUERY,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}
