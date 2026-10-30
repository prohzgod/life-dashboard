// Life Dashboard · Glass v2 tokens — generated. Mirrors tokens.css; use CSS vars in components,
// these values only where JS needs raw numbers (charts, canvas, theme picker UI).
export const colors = {
  "light": {
    "ink": "#16171B",
    "ink-2": "#474A55",
    "ink-3": "#5C606C",
    "glass": "rgba(255,255,255,0.56)",
    "glass-2": "rgba(255,255,255,0.74)",
    "line": "rgba(255,255,255,0.78)",
    "well": "rgba(22,23,27,0.05)",
    "well-line": "rgba(22,23,27,0.10)",
    "inverse": "#16171B",
    "on-inverse": "#FFFFFF",
    "hatch": "rgba(22,23,27,0.14)",
    "panel": "linear-gradient(160deg,#25252E 0%,#141419 100%)",
    "on-panel": "#F5F4F7",
    "on-panel-2": "#B9B8C4",
    "panel-well": "rgba(255,255,255,0.09)",
    "warn-bg": "#FFE7D6",
    "warn-ink": "#9A3A0B",
    "good": "#1F7A4D",
    "danger": "#B42318",
    "focus": "#16171B",
    "on-accent": "#16171B"
  },
  "dark": {
    "ink": "#F4F2F8",
    "ink-2": "#CBC8D6",
    "ink-3": "#A4A1B2",
    "glass": "rgba(255,255,255,0.07)",
    "glass-2": "rgba(255,255,255,0.11)",
    "line": "rgba(255,255,255,0.12)",
    "well": "rgba(255,255,255,0.06)",
    "well-line": "rgba(255,255,255,0.16)",
    "inverse": "#F4F2F8",
    "on-inverse": "#16171B",
    "hatch": "rgba(255,255,255,0.16)",
    "panel": "linear-gradient(160deg,rgba(255,255,255,0.15) 0%,rgba(255,255,255,0.05) 100%)",
    "on-panel": "#F5F4F7",
    "on-panel-2": "#C3C0CE",
    "panel-well": "rgba(255,255,255,0.09)",
    "warn-bg": "rgba(255,145,77,0.16)",
    "warn-ink": "#FFB68A",
    "good": "#7FE0AE",
    "danger": "#FF9C94",
    "focus": "#F4F2F8",
    "on-accent": "#16171B"
  }
} as const;

export type ColorToken = keyof typeof colors.light;
export const cssVar = (t: ColorToken | string): string => `var(--${t})`;

export const accents = {
  "tangerine": {
    "name": "Cam",
    "value": "#FF7A45"
  },
  "butter": {
    "name": "Vàng bơ",
    "value": "#FFD25C"
  },
  "lime": {
    "name": "Chanh",
    "value": "#CFF26B"
  },
  "lavender": {
    "name": "Oải hương",
    "value": "#B9A6FF"
  }
} as const;
export type AccentId = keyof typeof accents;

export const backgrounds = {
  "dawn": {
    "name": "Bình minh",
    "theme": "light",
    "paint": "radial-gradient(1100px 760px at 0% 0%, #FFD8C6 0%, rgba(255,216,198,0) 62%), radial-gradient(1000px 720px at 100% 4%, #DCD5FF 0%, rgba(220,213,255,0) 58%), radial-gradient(1200px 820px at 55% 106%, #FFEABF 0%, rgba(255,234,191,0) 60%), #F4F1EE",
    "paintPhone": "radial-gradient(520px 520px at 0% 0%, #FFD8C6 0%, rgba(255,216,198,0) 70%), radial-gradient(480px 560px at 100% 18%, #DCD5FF 0%, rgba(220,213,255,0) 65%), radial-gradient(560px 700px at 30% 62%, #FFEABF 0%, rgba(255,234,191,0) 62%), radial-gradient(520px 640px at 100% 96%, #FFD3D6 0%, rgba(255,211,214,0) 62%), #F4F1EE",
    "overrides": {}
  },
  "mist": {
    "name": "Sương mai",
    "theme": "light",
    "paint": "radial-gradient(1100px 760px at 0% 0%, #D3E6FF 0%, rgba(211,230,255,0) 60%), radial-gradient(1000px 720px at 100% 0%, #D3F2E7 0%, rgba(211,242,231,0) 58%), radial-gradient(1200px 820px at 50% 110%, #E7E0FF 0%, rgba(231,224,255,0) 60%), #EEF2F5",
    "paintPhone": "radial-gradient(520px 520px at 0% 0%, #D3E6FF 0%, rgba(211,230,255,0) 70%), radial-gradient(480px 560px at 100% 20%, #D3F2E7 0%, rgba(211,242,231,0) 65%), radial-gradient(560px 700px at 20% 70%, #E7E0FF 0%, rgba(231,224,255,0) 62%), #EEF2F5",
    "overrides": {}
  },
  "photo": {
    "name": "Ảnh của bạn",
    "theme": "light",
    "paint": "#EADFEF",
    "paintPhone": "#EADFEF",
    "overrides": {
      "glass": "rgba(255,255,255,0.54)",
      "glass-2": "rgba(255,255,255,0.72)",
      "ink-3": "#4E5260",
      "blur": "28px",
      "bg-veil": "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 40%)"
    }
  },
  "night": {
    "name": "Đêm",
    "theme": "dark",
    "paint": "radial-gradient(1000px 700px at 0% 0%, #3B2D5C 0%, rgba(59,45,92,0) 62%), radial-gradient(900px 650px at 100% 8%, #173A57 0%, rgba(23,58,87,0) 58%), radial-gradient(1100px 760px at 60% 110%, #4A2A3B 0%, rgba(74,42,59,0) 60%), #0F0F16",
    "paintPhone": "radial-gradient(520px 560px at 0% 0%, #3B2D5C 0%, rgba(59,45,92,0) 70%), radial-gradient(480px 560px at 100% 26%, #173A57 0%, rgba(23,58,87,0) 65%), radial-gradient(560px 700px at 20% 72%, #4A2A3B 0%, rgba(74,42,59,0) 62%), #0F0F16",
    "overrides": {
      "blur": "24px"
    }
  }
} as const;
export type BackgroundId = keyof typeof backgrounds;

export const fonts = { sans: "'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', sans-serif" } as const;

export const typography = {
  "display": {
    "size": "clamp(38px, 4.4vw, 62px)",
    "lineHeight": "1.06",
    "weight": 500,
    "tracking": "-0.035em"
  },
  "display-mobile": {
    "size": "34px",
    "lineHeight": "1.1",
    "weight": 500,
    "tracking": "-0.035em"
  },
  "numeral-xl": {
    "size": "64px",
    "lineHeight": "1",
    "weight": 300,
    "tracking": "-0.045em"
  },
  "numeral-l": {
    "size": "48px",
    "lineHeight": "1",
    "weight": 300,
    "tracking": "-0.04em"
  },
  "numeral-m": {
    "size": "30px",
    "lineHeight": "1",
    "weight": 300,
    "tracking": "-0.03em"
  },
  "numeral-s": {
    "size": "24px",
    "lineHeight": "1.1",
    "weight": 300,
    "tracking": "-0.03em"
  },
  "title": {
    "size": "20px",
    "lineHeight": "1.3",
    "weight": 600,
    "tracking": "-0.015em"
  },
  "heading": {
    "size": "16px",
    "lineHeight": "1.35",
    "weight": 600,
    "tracking": "0"
  },
  "body": {
    "size": "15px",
    "lineHeight": "1.5",
    "weight": 400,
    "tracking": "0"
  },
  "label": {
    "size": "13px",
    "lineHeight": "1.4",
    "weight": 500,
    "tracking": "0"
  },
  "caption": {
    "size": "12px",
    "lineHeight": "1.4",
    "weight": 400,
    "tracking": "0"
  },
  "micro": {
    "size": "11px",
    "lineHeight": "1.3",
    "weight": 600,
    "tracking": "0"
  }
} as const;

export const space = {
  "0": 0,
  "1": 4,
  "1h": 6,
  "2": 8,
  "2h": 10,
  "3": 12,
  "3h": 14,
  "4": 16,
  "4h": 18,
  "5": 20,
  "6": 24,
  "7": 28,
  "8": 32,
  "10": 40,
  "11": 44,
  "12": 48
} as const;
export const radius = {
  "sm": "12px",
  "md": "18px",
  "row": "22px",
  "tile": "24px",
  "tile-lg": "28px",
  "card": "32px",
  "pill": "999px"
} as const;
export const shadows = {
  "card": {
    "light": "0 24px 60px -30px rgba(46,34,74,0.30)",
    "dark": "0 24px 60px -30px rgba(0,0,0,0.65)"
  },
  "tabbar": {
    "light": "0 18px 40px -16px rgba(20,16,40,0.35)",
    "dark": "0 18px 40px -16px rgba(0,0,0,0.6)"
  },
  "fab": {
    "light": "0 8px 20px -8px rgba(20,16,40,0.45)",
    "dark": "0 8px 20px -8px rgba(0,0,0,0.6)"
  }
} as const;
export const layout = {
  "page-max": "1360px",
  "page-gutter": "clamp(16px, 3vw, 40px)",
  "page-gutter-phone": "18px",
  "card-gap": "20px",
  "card-pad": "24px",
  "control-h": "56px",
  "control-h-sm": "40px",
  "icon-btn": "48px",
  "check": "40px",
  "touch-min": "44px",
  "nav-item-h": "44px",
  "tabbar-h": "76px",
  "tabbar-inset": "14px",
  "tabbar-bottom": "22px",
  "fab": "60px",
  "bp-tablet": "768px",
  "bp-desktop": "1200px"
} as const;
export const glass = {
  "blur": "22px",
  "saturate": "150%"
} as const;
export const motion = {
  "dur-fast": "120ms",
  "dur-base": "200ms",
  "dur-slow": "320ms",
  "ease": "cubic-bezier(0.2, 0.8, 0.2, 1)"
} as const;

/** Chart colors: series = inverse, today/highlight = accent, future = well-line. */
export const chart = { series: cssVar('inverse'), highlight: cssVar('accent'), muted: cssVar('well-line'), grid: cssVar('well-line') } as const;

// ---- App extras (not part of the generated pack) ----

/** The seven life areas. In Glass v2 they share the strong fill; the area's name tells them apart. */
export const areas = ['health', 'career', 'finance', 'family', 'growth', 'home', 'fun'] as const;
export type Area = (typeof areas)[number];
