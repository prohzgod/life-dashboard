import { fonts } from '@design/tokens';

/** The colours a chart may use, resolved for the theme and accent showing (see useThemeColors). */
export type ChartColors = {
  ink: string;
  'ink-2': string;
  'ink-3': string;
  /** Grid and axis lines. */
  line: string;
  /** Alternating bands (radar). */
  fill: string;
  fill2: string;
  /** Lines and points: the strong fill. */
  strong: string;
  /** Today, the one thing that needs you. */
  accent: string;
};

export const chartFont = fonts.sans;
