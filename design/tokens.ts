/* Grid design tokens for Life Dashboard. Generated from tokens.json. Use CSS variables in components; use this file for charts, canvas and logic. */

export type ThemeName = 'light' | 'dark';

export const colors = {
  light: {
    "bg": '#F8F7F3',
    "surface": '#EDECE7',
    "raised": '#F8F7F3',
    "sunken": '#E2DFDA',
    "sunken-2": '#D6D4CE',
    "subtle": '#EDECE7',
    "track": '#E2DFDA',
    "line": '#D8D6D0',
    "line-soft": '#E4E3DE',
    "line-strong": '#BAB7B0',
    "control": '#7D8088',
    "ink": '#0F141E',
    "ink-2": '#2C303B',
    "ink-3": '#575B64',
    "ink-4": '#83868E',
    "inverse": '#1F40BE',
    "on-inverse": '#F8F7F3',
    "on-inverse-2": '#C2D1F3',
    "inverse-accent": '#F8F7F3',
    "primary": '#0F141E',
    "primary-hover": '#2C303B',
    "on-primary": '#F8F7F3',
    "on-primary-2": '#BAB7B0',
    "primary-soft": '#DAE5FD',
    "primary-softer": '#EBF0FB',
    "primary-ink": '#1F40BE',
    "primary-line": '#9CB6F2',
    "link": '#1F40BE',
    "accent": '#D9241B',
    "accent-soft": '#FDE3DE',
    "accent-ink": '#9E1710',
    "success": '#1F40BE',
    "success-soft": '#DAE5FD',
    "warning": '#D9241B',
    "warning-soft": '#FDE3DE',
    "warning-ink": '#9E1710',
    "danger": '#D9241B',
    "danger-soft": '#FDE3DE',
    "danger-ink": '#9E1710',
    "health": '#1F40BE',
    "health-soft": '#EBF0FB',
    "health-ink": '#0F141E',
    "career": '#1F40BE',
    "career-soft": '#EBF0FB',
    "career-ink": '#0F141E',
    "finance": '#1F40BE',
    "finance-soft": '#EBF0FB',
    "finance-muted": '#DAE5FD',
    "finance-ink": '#0F141E',
    "family": '#1F40BE',
    "family-soft": '#EBF0FB',
    "family-ink": '#0F141E',
    "growth": '#1F40BE',
    "growth-soft": '#EBF0FB',
    "growth-ink": '#0F141E',
    "home": '#1F40BE',
    "home-soft": '#EBF0FB',
    "home-ink": '#0F141E',
    "fun": '#1F40BE',
    "fun-soft": '#EBF0FB',
    "fun-ink": '#0F141E',
    "viz-soft": '#9CB6F2',
    "mood-1": '#E2DFDA',
    "mood-2": '#BBCBEC',
    "mood-3": '#84A3EA',
    "mood-4": '#4A72DE',
    "mood-5": '#1F40BE',
    "heat-0": '#E2DFDA',
    "heat-1": '#BBCBEC',
    "heat-2": '#84A3EA',
    "heat-3": '#4A72DE',
    "heat-4": '#1F40BE',
    "nav-bg": '#EDECE7',
    "nav-surface": '#E2DFDA',
    "nav-line": '#D8D6D0',
    "nav-ink": '#0F141E',
    "nav-ink-2": '#2C303B',
    "nav-ink-3": '#575B64',
    "nav-success": '#1F40BE',
    "nav-accent": '#0F141E',
    "on-nav-accent": '#F8F7F3',
  },
  dark: {
    "bg": '#0B0F18',
    "surface": '#141823',
    "raised": '#282E3B',
    "sunken": '#1F2430',
    "sunken-2": '#282E3B',
    "subtle": '#141823',
    "track": '#1F2430',
    "line": '#303540',
    "line-soft": '#222630',
    "line-strong": '#4D535E',
    "control": '#70747E',
    "ink": '#EDEBE7',
    "ink-2": '#C9C7C2',
    "ink-3": '#9B9EA6',
    "ink-4": '#656972',
    "inverse": '#678DEE',
    "on-inverse": '#0B0F18',
    "on-inverse-2": '#222D47',
    "inverse-accent": '#0B0F18',
    "primary": '#EDEBE7',
    "primary-hover": '#C9C7C2',
    "on-primary": '#0B0F18',
    "on-primary-2": '#4D535E',
    "primary-soft": '#1F2C4C',
    "primary-softer": '#171F30',
    "primary-ink": '#A0BDFF',
    "primary-line": '#3D5590',
    "link": '#8DAFFE',
    "accent": '#F45B4B',
    "accent-soft": '#451E19',
    "accent-ink": '#FEAC9F',
    "success": '#8DAFFE',
    "success-soft": '#1F2C4C',
    "warning": '#F45B4B',
    "warning-soft": '#451E19',
    "warning-ink": '#FEAC9F',
    "danger": '#F45B4B',
    "danger-soft": '#451E19',
    "danger-ink": '#FEAC9F',
    "health": '#678DEE',
    "health-soft": '#1F2C4C',
    "health-ink": '#EDEBE7',
    "career": '#678DEE',
    "career-soft": '#1F2C4C',
    "career-ink": '#EDEBE7',
    "finance": '#678DEE',
    "finance-soft": '#1F2C4C',
    "finance-muted": '#1F2C4C',
    "finance-ink": '#EDEBE7',
    "family": '#678DEE',
    "family-soft": '#1F2C4C',
    "family-ink": '#EDEBE7',
    "growth": '#678DEE',
    "growth-soft": '#1F2C4C',
    "growth-ink": '#EDEBE7',
    "home": '#678DEE',
    "home-soft": '#1F2C4C',
    "home-ink": '#EDEBE7',
    "fun": '#678DEE',
    "fun-soft": '#1F2C4C',
    "fun-ink": '#EDEBE7',
    "viz-soft": '#334673',
    "mood-1": '#1F2430',
    "mood-2": '#2C4072',
    "mood-3": '#405EAD',
    "mood-4": '#5E84E3',
    "mood-5": '#96B6FE',
    "heat-0": '#1F2430',
    "heat-1": '#2C4072',
    "heat-2": '#405EAD',
    "heat-3": '#5E84E3',
    "heat-4": '#96B6FE',
    "nav-bg": '#141823',
    "nav-surface": '#1F2430',
    "nav-line": '#303540',
    "nav-ink": '#EDEBE7',
    "nav-ink-2": '#C9C7C2',
    "nav-ink-3": '#9B9EA6',
    "nav-success": '#8DAFFE',
    "nav-accent": '#EDEBE7',
    "on-nav-accent": '#0B0F18',
  },
} as const;

export type ColorToken = keyof typeof colors.light;

/** CSS variable reference for a color token, e.g. cssVar('primary') -> 'var(--primary)' */
export const cssVar = (name: ColorToken | string) => `var(--${name})`;

export const areas = ['health', 'career', 'finance', 'family', 'growth', 'home', 'fun'] as const;
export type Area = (typeof areas)[number];

export const fonts = {
  display: "'Radio Canada Big', ui-sans-serif, system-ui, sans-serif",
  sans: "'Radio Canada', ui-sans-serif, system-ui, sans-serif",
} as const;

export const typography = {
  "display-xl": { family: fonts.display, size: 64, lineHeight: 64, weight: 700, letterSpacing: '-0.03em' }, // Covers, empty states, year in review
  "display-l": { family: fonts.display, size: 46, lineHeight: 50, weight: 700, letterSpacing: '-0.03em' }, // Library page title (desktop)
  "display-m": { family: fonts.display, size: 38, lineHeight: 42, weight: 700, letterSpacing: '-0.03em' }, // Desktop screen titles
  "mobile-title": { family: fonts.display, size: 41, lineHeight: 44, weight: 700, letterSpacing: '-0.03em' }, // Mobile tab-root titles (Today, Tasks, Library); Home greeting uses 38/42
  "mobile-page-title": { family: fonts.display, size: 36, lineHeight: 40, weight: 700, letterSpacing: '-0.03em' }, // Mobile detail titles (goal, page, task, review step)
  "title": { family: fonts.display, size: 28, lineHeight: 32, weight: 700, letterSpacing: '-0.03em' }, // Detail-panel titles, quote cards, sheet titles (26 on mobile)
  "numeral": { family: fonts.display, size: 36, lineHeight: 40, weight: 700, letterSpacing: '-0.03em' }, // Big stat numbers; lining + tabular figures
  "heading": { family: fonts.sans, size: 16, lineHeight: 24, weight: 600, letterSpacing: '0' }, // Card and section headings
  "body-l": { family: fonts.sans, size: 16, lineHeight: 25, weight: 400, letterSpacing: '0' }, // Mobile editor text, form inputs (16px avoids iOS zoom)
  "body": { family: fonts.sans, size: 15, lineHeight: 24, weight: 400, letterSpacing: '0' }, // Running text, task titles, list rows
  "body-s": { family: fonts.sans, size: 13, lineHeight: 20, weight: 400, letterSpacing: '0' }, // Secondary lines, table cells, buttons
  "caption": { family: fonts.sans, size: 12, lineHeight: 16, weight: 500, letterSpacing: '0' }, // Metadata, chart labels, status lines
  "label": { family: fonts.sans, size: 11, lineHeight: 16, weight: 600, letterSpacing: '0' }, // Group labels and captions, sentence case
  "tab-label": { family: fonts.sans, size: 11, lineHeight: 14, weight: 500, letterSpacing: '0' }, // Mobile tab bar labels (700 when active)
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  12: 48,
} as const;

export const radius = {
  xs: 8, // Checkboxes, kbd hints
  sm: 12, // Chips, segmented pills
  md: 16, // Wells, notes, nav items (buttons and inputs are pills)
  well: 20, // Stat tiles, habit tiles, wells
  lg: 24, // Panels and cards
  tile: 24, // Bento tiles on mobile Home
  xl: 28, // Bottom sheets, large media
  pill: 999, // Status pills, avatars, FAB
} as const;

export const shadows = {
  light: {
    sm: 'none',
    md: '0 12px 32px -12px rgba(15,20,30,0.28), 0 2px 6px rgba(15,20,30,0.06)',
    primary: '0 8px 20px -6px rgba(15,20,30,0.35)',
  },
  dark: {
    sm: 'none',
    md: '0 14px 34px -12px rgba(0,0,0,0.75), 0 0 0 1px #303540',
    primary: '0 8px 20px -6px rgba(0,0,0,0.6)',
  },
} as const;

export const layout = {
  sidebarWidth: 248, // Desktop sidebar
  desktopPadding: 32, // Desktop content padding
  desktopGap: 24, // Gap between desktop cards
  mobileGutter: 18, // Mobile side padding
  mobileTopbarHeight: 56, // Mobile pushed-screen top bar
  tabbarHeight: 84, // Mobile tab bar incl. 20px home-indicator space
  floatInset: 12, // Gap between a floating nav (sidebar, tab bar) and the window edge
  fabSize: 56, // Centre capture button
  touchMin: 44, // Minimum touch target
  bentoColumns: 4, // Mobile Home grid columns
  bentoGap: 9, // Mobile Home grid gap
  bentoRow: 70, // Mobile Home row height (Edit mode 64)
  breakpointMobile: 768, // Below this width use the mobile layouts
} as const;

export const motion = {
  durFast: '120ms', // Hovers
  dur: '200ms', // Toggles, checkboxes
  durSlow: '320ms', // Sheets, page pushes
  ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)', // All transitions
} as const;
