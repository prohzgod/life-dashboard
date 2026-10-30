/*
 * Colour themes for Life Dashboard. Each theme is five seed colours per mode; every other colour
 * token (lines, soft fills, the mood and heat ramps, the nav) is worked out from them in
 * src/theme/palette.ts, with contrast checks. "grid" is the default and uses tokens.css as it is.
 *
 *   paper    the sheet (--bg)
 *   surface  panels and cards, a step off the paper (--surface)
 *   ink      text and the primary control (--ink)
 *   field    the one colour that floods a block, links and progress (--inverse, --primary-ink)
 *   mark     the one accent for what needs you (--accent, --danger, --warning)
 */

export type ThemeSeeds = { paper: string; surface: string; ink: string; field: string; mark: string };
export type PresetId = 'grid' | 'leica' | 'nature' | 'focus' | 'ocean' | 'rose';

export const presets: Record<PresetId, { light: ThemeSeeds; dark: ThemeSeeds }> = {
  // White poster paper, blue-black ink, ultramarine, Swiss red. The same values as tokens.css.
  grid: {
    light: { paper: '#F8F7F3', surface: '#EDECE7', ink: '#0F141E', field: '#1F40BE', mark: '#D9241B' },
    dark: { paper: '#0B0F18', surface: '#141823', ink: '#EDEBE7', field: '#678DEE', mark: '#F45B4B' },
  },
  // A camera body: silver and black, one red dot.
  leica: {
    light: { paper: '#F3F2EF', surface: '#E5E4E0', ink: '#111111', field: '#1B1B1B', mark: '#E20612' },
    dark: { paper: '#0D0D0D', surface: '#191919', ink: '#ECEAE6', field: '#D6D3CC', mark: '#FF3B30' },
  },
  // Sand paper, forest green, terracotta.
  nature: {
    light: { paper: '#F5F2EA', surface: '#E9E4D6', ink: '#1E2A1F', field: '#2F6B3F', mark: '#C25E28' },
    dark: { paper: '#0F1510', surface: '#18201A', ink: '#E9E7DD', field: '#7DB88A', mark: '#E58A55' },
  },
  // Quiet slate, low contrast around the edges, one amber mark.
  focus: {
    light: { paper: '#F4F5F7', surface: '#E8EAEE', ink: '#1A1F2B', field: '#3A4A63', mark: '#C96A04' },
    dark: { paper: '#0E1116', surface: '#161A21', ink: '#E3E6EB', field: '#8FA3C2', mark: '#F0A43A' },
  },
  // Sea glass and deep teal, a coral mark.
  ocean: {
    light: { paper: '#F2F6F7', surface: '#E2EBED', ink: '#0E2229', field: '#0F6E80', mark: '#D94F28' },
    dark: { paper: '#08151A', surface: '#0F1F25', ink: '#E2EEF0', field: '#5CC2D2', mark: '#FF7A59' },
  },
  // Warm blush paper, raspberry, marigold.
  rose: {
    light: { paper: '#FBF5F2', surface: '#F1E6E1', ink: '#2A1A1C', field: '#A93A55', mark: '#C9760F' },
    dark: { paper: '#160E10', surface: '#21161A', ink: '#F1E6E6', field: '#E58FA3', mark: '#F5B04A' },
  },
};

export const presetIds = Object.keys(presets) as PresetId[];

/** Ink for a custom theme, picked to read on its paper. */
export const customInk = { light: '#14161C', dark: '#ECEAE6' };
/** Papers a custom theme falls back to for the mode you didn't pick a background for. */
export const customPaper = { light: '#F8F7F3', dark: '#0B0F18' };
