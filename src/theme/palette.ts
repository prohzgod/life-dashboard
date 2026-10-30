import { colors, type ColorToken, type ThemeName } from '@design/tokens';
import { customInk, customPaper, presets, type PresetId, type ThemeSeeds } from '@design/themes';

/** The colour theme chosen on this device: a preset, or your own three colours. */
export type PaletteChoice = { id: PresetId } | { id: 'custom'; background: string; main: string; mark: string };

export const PALETTE_STORAGE_KEY = 'life-dashboard:palette';
/** The CSS for the chosen theme, kept so index.html can paint it before the app loads. */
export const PALETTE_CSS_KEY = 'life-dashboard:palette-css';
export const DEFAULT_PALETTE: PaletteChoice = { id: 'grid' };

// ---- Colour maths (sRGB hex) ----

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** `a` moved `t` (0–1) of the way towards `b`. */
export function mix(a: string, b: string, t: number): string {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([0, 1, 2].map((i) => x[i]! + (y[i]! - x[i]!) * t) as Rgb);
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.18;
}

/** `color`, moved towards `towards` until it reads at `ratio` on `on`. */
function readable(color: string, on: string, towards: string, ratio = 4.5): string {
  let out = color;
  for (let t = 0.1; contrast(out, on) < ratio && t <= 1; t += 0.1) out = mix(color, towards, t);
  return out;
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---- Seeds → every colour token ----

/** The colour tokens plus the theme-dependent shadows, scrim and glass. */
export type ThemeTokens = Record<ColorToken | 'shadow-sm' | 'shadow-md' | 'shadow-primary' | 'scrim' | 'glass', string>;

/** Every colour token for one mode, worked out from five seeds. */
export function deriveColors(s: ThemeSeeds, mode: ThemeName): ThemeTokens {
  const dark = mode === 'dark';
  const { paper, surface, ink, mark } = s;
  // Fields that sit too close to the paper (black on a dark sheet) still need to read as a block.
  const field = contrast(s.field, paper) < 2 ? mix(s.field, ink, 0.45) : s.field;
  const toward = (t: number) => mix(surface, ink, t);
  const sunken = dark ? mix(paper, ink, 0.09) : toward(0.07);
  const line = toward(dark ? 0.14 : 0.1);
  const ink2 = mix(ink, paper, 0.16);
  const ink3 = mix(ink, paper, dark ? 0.38 : 0.36);
  const onField = contrast(paper, field) >= contrast(ink, field) ? paper : ink;
  const fieldText = readable(field, paper, ink);
  const soft = mix(paper, field, dark ? 0.22 : 0.15);
  const softer = mix(paper, field, dark ? 0.12 : 0.08);
  const fieldLine = mix(paper, field, dark ? 0.4 : 0.42);
  const markText = readable(dark ? mix(mark, ink, 0.25) : mix(mark, ink, 0.3), mix(paper, mark, 0.16), ink);
  const markSoft = mix(paper, mark, dark ? 0.2 : 0.14);
  const ramp = [sunken, mix(sunken, field, 0.3), mix(sunken, field, 0.55), mix(sunken, field, 0.8), dark ? mix(field, ink, 0.25) : field];
  const area = { base: field, soft: softer, ink };

  return {
    bg: paper,
    surface,
    raised: dark ? toward(0.1) : paper,
    sunken,
    'sunken-2': dark ? toward(0.1) : toward(0.13),
    subtle: surface,
    track: sunken,
    line,
    'line-soft': toward(dark ? 0.06 : 0.05),
    'line-strong': toward(dark ? 0.26 : 0.24),
    control: mix(paper, ink, dark ? 0.45 : 0.52),
    ink,
    'ink-2': ink2,
    'ink-3': readable(ink3, paper, ink),
    'ink-4': mix(ink, paper, dark ? 0.6 : 0.5),
    inverse: field,
    'on-inverse': onField,
    'on-inverse-2': mix(onField, field, 0.3),
    'inverse-accent': onField,
    primary: ink,
    'primary-hover': ink2,
    'on-primary': paper,
    'on-primary-2': toward(dark ? 0.26 : 0.24),
    'primary-soft': soft,
    'primary-softer': softer,
    'primary-ink': fieldText,
    'primary-line': fieldLine,
    link: fieldText,
    accent: mark,
    'accent-soft': markSoft,
    'accent-ink': markText,
    success: fieldText,
    'success-soft': soft,
    warning: mark,
    'warning-soft': markSoft,
    'warning-ink': markText,
    danger: mark,
    'danger-soft': markSoft,
    'danger-ink': markText,
    health: area.base,
    'health-soft': area.soft,
    'health-ink': area.ink,
    career: area.base,
    'career-soft': area.soft,
    'career-ink': area.ink,
    finance: area.base,
    'finance-soft': area.soft,
    'finance-muted': soft,
    'finance-ink': area.ink,
    family: area.base,
    'family-soft': area.soft,
    'family-ink': area.ink,
    growth: area.base,
    'growth-soft': area.soft,
    'growth-ink': area.ink,
    home: area.base,
    'home-soft': area.soft,
    'home-ink': area.ink,
    fun: area.base,
    'fun-soft': area.soft,
    'fun-ink': area.ink,
    'viz-soft': fieldLine,
    'mood-1': ramp[0]!,
    'mood-2': ramp[1]!,
    'mood-3': ramp[2]!,
    'mood-4': ramp[3]!,
    'mood-5': ramp[4]!,
    'heat-0': ramp[0]!,
    'heat-1': ramp[1]!,
    'heat-2': ramp[2]!,
    'heat-3': ramp[3]!,
    'heat-4': ramp[4]!,
    'nav-bg': surface,
    'nav-surface': sunken,
    'nav-line': line,
    'nav-ink': ink,
    'nav-ink-2': ink2,
    'nav-ink-3': ink3,
    'nav-success': fieldText,
    'nav-accent': ink,
    'on-nav-accent': paper,
    'shadow-sm': 'none',
    'shadow-md': dark ? `0 14px 34px -12px rgba(0,0,0,0.75), 0 0 0 1px ${line}` : `0 12px 32px -12px ${rgba(ink, 0.28)}, 0 2px 6px ${rgba(ink, 0.06)}`,
    'shadow-primary': dark ? '0 8px 20px -6px rgba(0,0,0,0.6)' : `0 8px 20px -6px ${rgba(ink, 0.35)}`,
    scrim: dark ? 'rgba(0,0,0,0.6)' : rgba(mix(ink, field, 0.15), 0.5),
    glass: rgba(dark ? toward(0.05) : paper, 0.94),
  };
}

/** The seeds for each mode of a custom theme: your background in its own mode, a quiet paper in the other. */
export function customSeeds(c: { background: string; main: string; mark: string }): Record<ThemeName, ThemeSeeds> {
  const bgMode: ThemeName = isDark(c.background) ? 'dark' : 'light';
  const seedsFor = (mode: ThemeName): ThemeSeeds => {
    const paper = mode === bgMode ? c.background : mix(customPaper[mode], c.main, 0.05);
    const ink = mix(customInk[mode], c.main, 0.08);
    const surface = mix(paper, ink, mode === 'dark' ? 0.06 : 0.055);
    // The main colour, lifted or deepened so it holds up on this mode's paper.
    const field = mode === bgMode ? c.main : readable(c.main, paper, ink, 3);
    return { paper, surface, ink, field, mark: mode === bgMode ? c.mark : readable(c.mark, paper, ink, 3) };
  };
  return { light: seedsFor('light'), dark: seedsFor('dark') };
}

export function seedsOf(choice: PaletteChoice): Record<ThemeName, ThemeSeeds> {
  return choice.id === 'custom' ? customSeeds(choice) : presets[choice.id];
}

/** The colours charts and other code read, for the chosen theme and mode. */
export function paletteColors(choice: PaletteChoice, mode: ThemeName): Record<ColorToken, string> {
  return choice.id === 'grid' ? colors[mode] : deriveColors(seedsOf(choice)[mode], mode);
}

/** CSS that overrides tokens.css in both modes. Empty for Grid, which is tokens.css itself. */
export function paletteCss(choice: PaletteChoice): string {
  if (choice.id === 'grid') return '';
  const seeds = seedsOf(choice);
  const block = (mode: ThemeName) =>
    Object.entries(deriveColors(seeds[mode], mode))
      .map(([k, v]) => `--${k}:${v};`)
      .join('') + `color-scheme:${mode};`;
  const light = block('light');
  const dark = block('dark');
  // Selectors one step stronger than tokens.css, so they win in either mode.
  return `:root[data-palette]{${light}}@media (prefers-color-scheme: dark){:root[data-palette]:not([data-theme="light"]){${dark}}}:root[data-palette][data-theme="dark"]{${dark}}`;
}

// ---- Saved on this device ----

const listeners = new Set<() => void>();
let current: PaletteChoice | null = null;

function isHex(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
}

function parse(raw: string | null): PaletteChoice {
  try {
    const v = JSON.parse(raw ?? 'null') as Partial<{ id: string; background: string; main: string; mark: string }> | null;
    if (v?.id === 'custom' && isHex(v.background) && isHex(v.main) && isHex(v.mark)) return { id: 'custom', background: v.background, main: v.main, mark: v.mark };
    if (v && v.id && v.id in presets) return { id: v.id as PresetId };
  } catch {
    // A damaged value falls back to the default.
  }
  return DEFAULT_PALETTE;
}

export function readPalette(): PaletteChoice {
  if (current) return current;
  try {
    current = parse(localStorage.getItem(PALETTE_STORAGE_KEY));
  } catch {
    current = DEFAULT_PALETTE;
  }
  return current;
}

/** Puts the theme on the page: a <style> overriding the tokens, and the browser's theme colour. */
export function applyPalette(choice: PaletteChoice, root: HTMLElement = document.documentElement) {
  const css = paletteCss(choice);
  let style = document.getElementById('palette') as HTMLStyleElement | null;
  if (css) {
    if (!style) {
      style = document.createElement('style');
      style.id = 'palette';
      document.head.appendChild(style);
    }
    style.textContent = css;
    root.setAttribute('data-palette', choice.id);
  } else {
    style?.remove();
    root.removeAttribute('data-palette');
  }
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((m) => {
    const mode: ThemeName = m.media.includes('dark') ? 'dark' : 'light';
    m.content = paletteColors(choice, mode).bg;
  });
}

export function setPalette(choice: PaletteChoice) {
  current = choice;
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(choice));
    const css = paletteCss(choice);
    if (css) localStorage.setItem(PALETTE_CSS_KEY, css);
    else localStorage.removeItem(PALETTE_CSS_KEY);
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this visit.
  }
  if (typeof document !== 'undefined') applyPalette(choice);
  listeners.forEach((l) => l());
}

export function subscribePalette(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== PALETTE_STORAGE_KEY) return;
    current = parse(e.newValue);
    applyPalette(current);
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
