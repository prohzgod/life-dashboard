import { useSyncExternalStore } from 'react';
import { accents, colors } from '@design/tokens';
import type { ChartColors } from '@/components/charts/chartTheme';
import { readLook, setLook, subscribeLook, type Look } from './appearance';
import { useResolvedTheme } from './useResolvedTheme';

export function useLook(): [Look, (look: Look) => void] {
  const look = useSyncExternalStore(subscribeLook, readLook, readLook);
  return [look, setLook];
}

/** The colours showing right now, for code that can't use CSS variables (charts). */
export function useThemeColors(): ChartColors {
  const [look] = useLook();
  const c = colors[useResolvedTheme()];
  return {
    ink: c.ink,
    'ink-2': c['ink-2'],
    'ink-3': c['ink-3'],
    line: c['well-line'],
    fill: c.well,
    fill2: c['well-line'],
    strong: c.inverse,
    accent: accents[look.accent].value,
  };
}
