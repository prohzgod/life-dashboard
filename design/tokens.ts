/* Midnight & Brass design tokens for Life Dashboard. Generated from tokens.json. Use CSS variables in components; use this file for charts, canvas and logic. */

export type ThemeName = 'light' | 'dark';

export const colors = {
  light: {
    "bg": '#EEF0F3',
    "surface": '#FCFCFD',
    "raised": '#FFFFFF',
    "sunken": '#F2F4F7',
    "sunken-2": '#E6E9EF',
    "subtle": '#F6F7F9',
    "track": '#E1E5EC',
    "line": '#DCE1E8',
    "line-soft": '#EAEDF2',
    "line-strong": '#BEC5D2',
    "control": '#858DA0',
    "ink": '#141926',
    "ink-2": '#444B5D',
    "ink-3": '#5F6679',
    "ink-4": '#8E95A7',
    "inverse": '#18203A',
    "on-inverse": '#F6F3EC',
    "on-inverse-2": '#B6BDD0',
    "inverse-accent": '#D4B57C',
    "primary": '#22305A',
    "primary-hover": '#19244A',
    "on-primary": '#F7F4EC',
    "on-primary-2": '#C3CAE0',
    "primary-soft": '#E5E9F4',
    "primary-softer": '#F3F5FA',
    "primary-ink": '#1B2750',
    "primary-line": '#AAB6D6',
    "link": '#2D4585',
    "accent": '#A8844A',
    "accent-soft": '#F3ECDF',
    "accent-ink": '#6B5020',
    "success": '#2B6A52',
    "success-soft": '#E0EEE7',
    "warning": '#92530E',
    "warning-soft": '#F7EBDA',
    "warning-ink": '#613708',
    "danger": '#9E344B',
    "danger-soft": '#F6E2E6',
    "danger-ink": '#72213A',
    "health": '#3E7D63',
    "health-soft": '#E2EFE8',
    "health-ink": '#1E4B3A',
    "career": '#3A5A9A',
    "career-soft": '#E3E9F5',
    "career-ink": '#203766',
    "finance": '#A8742A',
    "finance-soft": '#F6EBDA',
    "finance-muted": '#E4D2B2',
    "finance-ink": '#633F0C',
    "family": '#A04E66',
    "family-soft": '#F6E3E9',
    "family-ink": '#6B243D',
    "growth": '#6A56A8',
    "growth-soft": '#ECE7F7',
    "growth-ink": '#42326C',
    "home": '#2F7C84',
    "home-soft": '#DEEFF1',
    "home-ink": '#1A4A50',
    "fun": '#8F6F10',
    "fun-soft": '#F4EDD3',
    "fun-ink": '#574409',
    "viz-soft": '#AFBEDC',
    "mood-1": '#9A3550',
    "mood-2": '#DDA7AC',
    "mood-3": '#E1E4EB',
    "mood-4": '#9DB1D8',
    "mood-5": '#2C437F',
    "heat-0": '#E4E7EE',
    "heat-1": '#C9D3E8',
    "heat-2": '#93A7D2',
    "heat-3": '#5470AE',
    "heat-4": '#22305A',
    "nav-bg": '#131A2E',
    "nav-surface": '#1D2542',
    "nav-line": '#29314F',
    "nav-ink": '#EEF0F6',
    "nav-ink-2": '#AFB6CA',
    "nav-ink-3": '#8189A3',
    "nav-success": '#79C4A2',
    "nav-accent": '#D4B57C',
    "on-nav-accent": '#131A2E',
  },
  dark: {
    "bg": '#0D111D',
    "surface": '#171C2B',
    "raised": '#313A56',
    "sunken": '#1C2234',
    "sunken-2": '#252C42',
    "subtle": '#131827',
    "track": '#2A3249',
    "line": '#2B334B',
    "line-soft": '#212839',
    "line-strong": '#46506F',
    "control": '#737D9C',
    "ink": '#ECEEF4',
    "ink-2": '#B8BECD',
    "ink-3": '#959CAF',
    "ink-4": '#6A7290',
    "inverse": '#EAE6DC',
    "on-inverse": '#161B2A',
    "on-inverse-2": '#4F566A',
    "inverse-accent": '#7A5B22',
    "primary": '#D4B57C',
    "primary-hover": '#E3C994',
    "on-primary": '#161B2A',
    "on-primary-2": '#4E4128',
    "primary-soft": '#2C2B2C',
    "primary-softer": '#1B2030',
    "primary-ink": '#E8D1A3',
    "primary-line": '#76623D',
    "link": '#D9BC86',
    "accent": '#D4B57C',
    "accent-soft": '#2E2A24',
    "accent-ink": '#E8D1A3',
    "success": '#79C4A2',
    "success-soft": '#18302A',
    "warning": '#E6AB69',
    "warning-soft": '#35291B',
    "warning-ink": '#F2CA94',
    "danger": '#EE91A4',
    "danger-soft": '#3A2029',
    "danger-ink": '#F6BDC8',
    "health": '#76C3A1',
    "health-soft": '#192E27',
    "health-ink": '#AADDC6',
    "career": '#8FA9E2',
    "career-soft": '#1C2644',
    "career-ink": '#C4D3F4',
    "finance": '#E1B173',
    "finance-soft": '#33291C',
    "finance-muted": '#56472F',
    "finance-ink": '#F1CF9D',
    "family": '#E69BB0',
    "family-soft": '#3A2231',
    "family-ink": '#F5C4D2',
    "growth": '#B4A4E9',
    "growth-soft": '#29243F',
    "growth-ink": '#D9D0F7',
    "home": '#7DC7CD',
    "home-soft": '#16303A',
    "home-ink": '#B1E1E4',
    "fun": '#DDBB5B',
    "fun-soft": '#312A17',
    "fun-ink": '#EED88F',
    "viz-soft": '#3F4F7A',
    "mood-1": '#D9728D',
    "mood-2": '#7A4A5A',
    "mood-3": '#2E3650',
    "mood-4": '#4F6DB2',
    "mood-5": '#AFC4F4',
    "heat-0": '#1F2638',
    "heat-1": '#2B3A60',
    "heat-2": '#3F5A98',
    "heat-3": '#7090D2',
    "heat-4": '#BACCF5',
    "nav-bg": '#090C16',
    "nav-surface": '#161C30',
    "nav-line": '#1E2539',
    "nav-ink": '#EEF0F6',
    "nav-ink-2": '#AFB6CA',
    "nav-ink-3": '#7E86A0',
    "nav-success": '#79C4A2',
    "nav-accent": '#D4B57C',
    "on-nav-accent": '#131A2E',
  },
} as const;

export type ColorToken = keyof typeof colors.light;

/** CSS variable reference for a color token, e.g. cssVar('primary') -> 'var(--primary)' */
export const cssVar = (name: ColorToken | string) => `var(--${name})`;

export const areas = ['health', 'career', 'finance', 'family', 'growth', 'home', 'fun'] as const;
export type Area = (typeof areas)[number];

export const fonts = {
  display: "'Cormorant Garamond', 'Iowan Old Style', Georgia, serif",
  sans: "'Jost', 'Avenir Next', system-ui, sans-serif",
} as const;

export const typography = {
  "display-xl": { family: fonts.display, size: 64, lineHeight: 64, weight: 500, letterSpacing: '-0.01em' }, // Covers, empty states, year in review
  "display-l": { family: fonts.display, size: 46, lineHeight: 50, weight: 500, letterSpacing: '-0.01em' }, // Library page title (desktop)
  "display-m": { family: fonts.display, size: 38, lineHeight: 42, weight: 500, letterSpacing: '-0.01em' }, // Desktop screen titles
  "mobile-title": { family: fonts.display, size: 41, lineHeight: 44, weight: 500, letterSpacing: '-0.01em' }, // Mobile tab-root titles (Today, Tasks, Library); Home greeting uses 38/42
  "mobile-page-title": { family: fonts.display, size: 36, lineHeight: 40, weight: 500, letterSpacing: '0' }, // Mobile detail titles (goal, page, task, review step)
  "title": { family: fonts.display, size: 28, lineHeight: 32, weight: 600, letterSpacing: '0' }, // Detail-panel titles, quote cards, sheet titles (26 on mobile)
  "numeral": { family: fonts.display, size: 36, lineHeight: 40, weight: 500, letterSpacing: '0' }, // Big stat numbers; lining + tabular figures
  "heading": { family: fonts.sans, size: 16, lineHeight: 24, weight: 600, letterSpacing: '0' }, // Card and section headings
  "body-l": { family: fonts.sans, size: 16, lineHeight: 25, weight: 400, letterSpacing: '0' }, // Mobile editor text, form inputs (16px avoids iOS zoom)
  "body": { family: fonts.sans, size: 15, lineHeight: 24, weight: 400, letterSpacing: '0' }, // Running text, task titles, list rows
  "body-s": { family: fonts.sans, size: 13, lineHeight: 20, weight: 400, letterSpacing: '0' }, // Secondary lines, table cells, buttons
  "caption": { family: fonts.sans, size: 12, lineHeight: 16, weight: 500, letterSpacing: '0' }, // Metadata, chart labels, status lines
  "label": { family: fonts.sans, size: 11, lineHeight: 16, weight: 600, letterSpacing: '0.12em', uppercase: true }, // Uppercase eyebrows and group labels
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
  xs: 6, // Checkboxes, kbd hints
  sm: 8, // Chips, segmented pills
  md: 10, // Buttons, inputs, nav items
  lg: 18, // Cards and panels
  tile: 20, // Bento tiles on mobile Home
  xl: 24, // Bottom sheets, large media
  pill: 999, // Status pills, avatars, FAB
} as const;

export const shadows = {
  light: {
    sm: '0 1px 2px rgba(20,25,38,0.06), 0 1px 1px rgba(20,25,38,0.03)',
    md: '0 12px 32px -14px rgba(20,25,38,0.22), 0 2px 6px rgba(20,25,38,0.05)',
    primary: '0 8px 20px -6px rgba(34,48,90,0.45)',
  },
  dark: {
    sm: '0 1px 2px rgba(0,0,0,0.45)',
    md: '0 14px 34px -14px rgba(0,0,0,0.7)',
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
