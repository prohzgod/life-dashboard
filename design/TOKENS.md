# Glass v2 — design tokens

Generated from one source into `tokens.css`, `tokens.ts` and `tokens.dtcg.json`. Change values there, not by hand in components.

Theme is three attributes on `<html>`: `data-theme` (light|dark), `data-bg` (dawn|mist|photo|night — night implies dark), `data-accent` (tangerine|butter|lime|lavender). Default: light · dawn · tangerine. "Auto" follows `prefers-color-scheme`: light → dawn, dark → night.

## Colors

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ink` | `#16171B` | `#F4F2F8` | Main text, icons, headings |
| `--ink-2` | `#474A55` | `#CBC8D6` | Secondary text, inactive nav labels |
| `--ink-3` | `#5C606C` | `#A4A1B2` | Tertiary text, timestamps, done tasks, unchecked ring |
| `--glass` | `rgba(255,255,255,0.56)` | `rgba(255,255,255,0.07)` | Card / nav / header surface (with backdrop blur) |
| `--glass-2` | `rgba(255,255,255,0.74)` | `rgba(255,255,255,0.11)` | Raised surface inside a card: inputs, tiles, active rows, round buttons |
| `--line` | `rgba(255,255,255,0.78)` | `rgba(255,255,255,0.12)` | 1px border on glass surfaces (the 'glass edge') |
| `--well` | `rgba(22,23,27,0.05)` | `rgba(255,255,255,0.06)` | Recessed rows: task rows, past events, chips |
| `--well-line` | `rgba(22,23,27,0.10)` | `rgba(255,255,255,0.16)` | Borders of wells, progress tracks, ring track, dashed boxes |
| `--inverse` | `#16171B` | `#F4F2F8` | Strong fill: active nav pill, primary button, done check, current event |
| `--on-inverse` | `#FFFFFF` | `#16171B` | Text/icons on inverse |
| `--hatch` | `rgba(22,23,27,0.14)` | `rgba(255,255,255,0.16)` | Diagonal stripes = remaining part of a progress bar |
| `--panel` | `linear-gradient(160deg,#25252E 0%,#141419 100%)` | `linear-gradient(160deg,rgba(255,255,255,0.15) 0%,rgba(255,255,255,0.05) 100%)` | The ONE dark feature card per screen (Daily check-in) |
| `--on-panel` | `#F5F4F7` | `#F5F4F7` | Text on panel |
| `--on-panel-2` | `#B9B8C4` | `#C3C0CE` | Secondary text on panel |
| `--panel-well` | `rgba(255,255,255,0.09)` | `rgba(255,255,255,0.09)` | Controls inside panel |
| `--warn-bg` | `#FFE7D6` | `rgba(255,145,77,0.16)` | Behind-schedule / missed / high-priority background |
| `--warn-ink` | `#9A3A0B` | `#FFB68A` | Text on warn-bg, missed-day dashed ring |
| `--good` | `#1F7A4D` | `#7FE0AE` | Positive delta text (ahead of plan, streak kept) |
| `--danger` | `#B42318` | `#FF9C94` | Destructive actions, errors |
| `--focus` | `#16171B` | `#F4F2F8` | 2px focus outline, 2px offset |
| `--on-accent` | `#16171B` | `#16171B` | Text/icons on accent: ALWAYS dark |

### Accent (one at a time, user-selectable)

| `data-accent` | Name | Value |
|---|---|---|
| `tangerine` | Cam | `#FF7A45` |
| `butter` | Vàng bơ | `#FFD25C` |
| `lime` | Chanh | `#CFF26B` |
| `lavender` | Oải hương | `#B9A6FF` |

Text on accent is always `--on-accent` (#16171B). Accent is used sparingly: today's progress, the selected mood, today's bar/dot, badges, the ⌘N key, the + button.

### Backgrounds

| `data-bg` | Name | Theme | Notes |
|---|---|---|---|
| `dawn` | Bình minh | light | gradient only |
| `mist` | Sương mai | light | gradient only |
| `photo` | Ảnh của bạn | light | `--glass: rgba(255,255,255,0.54)`, `--glass-2: rgba(255,255,255,0.72)`, `--ink-3: #4E5260`, `--blur: 28px`, `--bg-veil: linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 40%)` |
| `night` | Đêm | dark | `--blur: 24px` |

The background is one fixed layer behind the app (`.app-bg`): veil → photo → gradient paint. Phones use a smaller gradient (in the max-width 767px block). For `photo`, the user picks an image from their Vision board or uploads one; store it in IndexedDB as a Blob and set `--bg-image` to an object URL.

## Typography — Be Vietnam Pro

Designed for Vietnamese diacritics. Bundle it with `@fontsource/be-vietnam-pro` (300–700); never load Google Fonts at runtime — the app is offline-first.

| Style | Size | Line | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `.text-display` | clamp(38px, 4.4vw, 62px) | 1.06 | 500 | -0.035em | Greeting on desktop/tablet (second sentence in ink-3) |
| `.text-display-mobile` | 34px | 1.1 | 500 | -0.035em | Greeting on phone (2 lines) |
| `.text-numeral-xl` | 64px | 1 | 300 | -0.045em | Hero numbers: 83% · 303 · 44 (unit like % at 30px, tracking 0) |
| `.text-numeral-l` | 48px | 1 | 300 | -0.04em | Card hero number: 6 / 10 km, 20 việc |
| `.text-numeral-m` | 30px | 1 | 300 | -0.03em | Tile number: 12 / 20 |
| `.text-numeral-s` | 24px | 1.1 | 300 | -0.03em | Phone stat tiles |
| `.text-title` | 20px | 1.3 | 600 | -0.015em | Card titles (phone 19px) |
| `.text-heading` | 16px | 1.35 | 600 | 0 | Tile titles, logo word |
| `.text-body` | 15px | 1.5 | 400 | 0 | Task titles (500), inputs, buttons (500) |
| `.text-label` | 13px | 1.4 | 500 | 0 | Date line, capsule labels, chips, links |
| `.text-caption` | 12px | 1.4 | 400 | 0 | Meta lines: #tag · time |
| `.text-micro` | 11px | 1.3 | 600 | 0 | Badges, tab-bar labels, weekday letters |

Numbers use `font-variant-numeric: tabular-nums` where they update (times, counters).

## Spacing

| Token | Value |
|---|---|
| `--space-0` | 0px |
| `--space-1` | 4px |
| `--space-1h` | 6px |
| `--space-2` | 8px |
| `--space-2h` | 10px |
| `--space-3` | 12px |
| `--space-3h` | 14px |
| `--space-4` | 16px |
| `--space-4h` | 18px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-7` | 28px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-11` | 44px |
| `--space-12` | 48px |

## Radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 12px | Energy bars, small marks |
| `--radius-md` | 18px | Warn box, inline notices |
| `--radius-row` | 22px | Task rows, event blocks, sleep row |
| `--radius-tile` | 24px | Tiles inside a card, phone stat tiles, textarea |
| `--radius-tile-lg` | 28px | Phone habit tiles |
| `--radius-card` | 32px | Every card; phone year card |
| `--radius-pill` | 999px | Buttons, inputs, nav, chips, progress, avatars |

## Glass

| Token | Value | Use |
|---|---|---|
| `--blur` | 22px | Glass backdrop blur (photo 28px, night 24px) |
| `--saturate` | 150% | Glass backdrop saturate() |

Fallbacks are built in: no `backdrop-filter` support or `prefers-reduced-transparency` → near-opaque surfaces.

## Shadows

| Token | Light | Dark | Use |
|---|---|---|---|
| `--shadow-card` | `0 24px 60px -30px rgba(46,34,74,0.30)` | `0 24px 60px -30px rgba(0,0,0,0.65)` | Every glass card |
| `--shadow-tabbar` | `0 18px 40px -16px rgba(20,16,40,0.35)` | `0 18px 40px -16px rgba(0,0,0,0.6)` | Floating phone tab bar |
| `--shadow-fab` | `0 8px 20px -8px rgba(20,16,40,0.45)` | `0 8px 20px -8px rgba(0,0,0,0.6)` | Center + button |

## Layout

| Token | Value | Use |
|---|---|---|
| `--page-max` | 1360px | Max content width |
| `--page-gutter` | clamp(16px, 3vw, 40px) | Side padding (desktop 40, tablet ~25) |
| `--page-gutter-phone` | 18px | Phone side padding |
| `--card-gap` | 20px | Gap between cards (phone 16) |
| `--card-pad` | 24px | Card padding (phone 20) |
| `--control-h` | 56px | Primary buttons, inputs, logo pill |
| `--control-h-sm` | 40px | Small buttons, arrow buttons, chips-as-buttons |
| `--icon-btn` | 48px | Header round icon buttons (phone 44) |
| `--check` | 40px | Task check circle (phone 44) |
| `--touch-min` | 44px | Minimum tap target |
| `--nav-item-h` | 44px | Top nav pill item height |
| `--tabbar-h` | 76px | Phone floating tab bar height |
| `--tabbar-inset` | 14px | Tab bar left/right inset |
| `--tabbar-bottom` | 22px | Tab bar bottom offset (+ safe-area-inset-bottom) |
| `--fab` | 60px | Center + button in tab bar |
| `--bp-tablet` | 768px | ≥ this: top pill nav + bento page. Below: phone layout + tab bar |
| `--bp-desktop` | 1200px | ≥ this: 3-column bento row |

## Motion

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | `120ms` | Press, toggle |
| `--dur-base` | `200ms` | Hover, chip select, check |
| `--dur-slow` | `320ms` | Card enter, theme/background crossfade |
| `--ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Default easing |

## Contrast (WCAG 2.1, computed on the real surfaces)

| Pair | Ratio | Needs |
|---|---|---|
| ink on glass · dawn | 17.02:1 | 4.5:1 ✓ |
| ink on glass · photo (darkest hill behind) | 11.61:1 | 4.5:1 ✓ |
| ink on glass · night | 14.61:1 | 4.5:1 ✓ |
| ink-2 on glass · dawn | 8.39:1 | 4.5:1 ✓ |
| ink-2 on glass · photo (darkest hill behind) | 5.72:1 | 4.5:1 ✓ |
| ink-2 on glass · night | 9.87:1 | 4.5:1 ✓ |
| ink-3 on glass · dawn | 5.96:1 | 4.5:1 ✓ |
| ink-3 on glass · photo (darkest hill behind) | 5.04:1 | 4.5:1 ✓ |
| ink-3 on glass · night | 6.43:1 | 4.5:1 ✓ |
| on-panel-2 on panel | 8.55:1 | 4.5:1 ✓ |
| warn-ink on warn-bg · light | 5.92:1 | 4.5:1 ✓ |
| warn-ink on warn-bg · night | 7.1:1 | 4.5:1 ✓ |
| on-accent on tangerine #FF7A45 | 6.93:1 | 4.5:1 ✓ |
| on-accent on butter #FFD25C | 12.47:1 | 4.5:1 ✓ |
| on-accent on lime #CFF26B | 14.13:1 | 4.5:1 ✓ |
| on-accent on lavender #B9A6FF | 8.5:1 | 4.5:1 ✓ |
| on-inverse on inverse · light | 17.91:1 | 4.5:1 ✓ |
| on-inverse on inverse · night | 16.12:1 | 4.5:1 ✓ |
| ink-3 ring (non-text, 3:1) on glass-2 · dawn | 6.09:1 | 3.0:1 ✓ |

## Older token names

Screens built before Glass v2 use the Grid token names. `design/tokens.css` keeps them, each pointing at a Glass v2 value, so they follow the new look and every background and accent:

| Older name | Now |
|---|---|
| `--bg` | `--paper` (the solid colour under the background layer) |
| `--surface`, `--subtle` | `--glass` |
| `--raised` | `--glass-2` |
| `--sunken`, `--success-soft`, area `-soft` | `--well` |
| `--sunken-2`, `--track`, `--line-soft` | `--well-line` |
| `--primary`, `--success`, area colours | `--inverse` |
| `--on-primary` | `--on-inverse` |
| `--primary-soft`, `--accent-soft` | the accent at 24% |
| `--primary-ink`, `--link`, `--accent-ink`, area `-ink` | `--ink` |
| `--warning`, `--warning-soft` | `--warn-ink`, `--warn-bg` |
| `--mood-1…5`, `--heat-0…4` | from `--well-line` up to the accent |
| `--font-display` | `--font-sans` (Be Vietnam Pro) |
| `--radius-lg` / `--radius-well` / `--radius-xl` | `--radius-card` / `--radius-row` / `--radius-tile-lg` |
| `--shadow-md` | `--shadow-card` |

Two names changed meaning: `--line` is now the white glass edge (use `--well-line` for a divider), and `--inverse` is the near-black strong fill (it was the ultramarine field). Added for the app: `--paper`, and `--glass-float` (`--float`) for menus, dialogs and sheets, which need a near-opaque surface.
