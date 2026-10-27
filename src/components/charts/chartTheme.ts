import { fonts, type ColorToken } from '@design/tokens';

/** One theme's colors from design/tokens.ts, by token name. */
export type ChartColors = Record<ColorToken, string>;

export const chartFont = fonts.sans;
