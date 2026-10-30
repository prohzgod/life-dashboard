import { useSyncExternalStore } from 'react';
import type { ColorToken } from '@design/tokens';
import { DEFAULT_PALETTE, paletteColors, readPalette, setPalette, subscribePalette, type PaletteChoice } from './palette';
import { useResolvedTheme } from './useResolvedTheme';

export function usePalette(): [PaletteChoice, (choice: PaletteChoice) => void] {
  const choice = useSyncExternalStore(subscribePalette, readPalette, () => DEFAULT_PALETTE);
  return [choice, setPalette];
}

/** The colours showing right now, for code that can't use CSS variables (charts). */
export function useThemeColors(): Record<ColorToken, string> {
  const [choice] = usePalette();
  return paletteColors(choice, useResolvedTheme());
}
