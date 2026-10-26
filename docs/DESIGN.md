# Midnight & Brass: design rules

Calm porcelain pages, deep midnight ink, one line of brass. Tokens live in `design/tokens.json` (source of truth, with a usage note per token) and `design/tokens.css` (CSS variables, light + dark).

## Color

- Page `--bg`; cards `--surface` + `1px solid var(--line)` + `--radius-lg` + `--shadow-sm`. Wells inside cards `--sunken`; chips, tracks and segmented controls `--sunken-2`; secondary panes `--subtle`.
- Text: `--ink` titles and body, `--ink-2` secondary, `--ink-3` captions. `--ink-4` is for decorative strokes only.
- `--primary` is midnight in light and brass in dark: the one primary button per screen, checked states, focus ring. Text on it: `--on-primary`.
- `--accent` (brass) is a sparing highlight: logo, word of the year, today's marker. Not for body text.
- `--inverse` / `--on-inverse`: chat bubbles, the current review step, quote cards, the pace tick.
- Life areas each have a base, `-soft` and `-ink`: `health`, `career`, `finance`, `family`, `growth`, `home`, `fun`. Base for dots, bars and charts; soft + ink for chips and tints.
- Status: `--success`, `--warning`, `--danger` (with `-soft` / `-ink`), always paired with a word.
- Sidebar is midnight in both themes: use only `--nav-*` tokens inside it. Active item: `--nav-surface` background, brass icon.
- Charts: `--mood-1…5`, `--heat-0…4`, `--viz-soft` for a second series.

## Type

- `--font-display` Cormorant Garamond (500/600, italic): screen titles 38px, editor page titles 46px, big numbers 36px with `font-variant-numeric: lining-nums tabular-nums`, quote cards. Never below 18px.
- `--font-sans` Jost: card headings 16/24 600, body 15/24, secondary 13/20, captions 12/16, labels 11/16 600 uppercase with 0.12em tracking.

## Layout and shape

- Desktop: 248px sidebar, content padding 32px, 24px between cards, 20px inside cards. Screens were designed at 1440×960.
- Mobile (390×844): 18px gutters (`--mobile-gutter`), 84px tab bar (`--tabbar-height`) Home · Today · + · Tasks · Library with a centered 56px capture button; 44px avatar at the top-right of every tab root opens Profile. Home is a 4-column bento grid (`--bento-columns`, `--bento-gap` 9px, rows ~70px, `--radius-tile` 20px). Pushed screens use a 56px top bar with "‹ Back". Blurred personal values use `filter: blur(6px)` and an eye-off icon button. The capture button uses `--shadow-primary`; bottom sheets use `--radius-xl`.
- Radius: `--radius-lg` cards, `--radius-md` buttons and inputs, `--radius-sm` chips and segmented pills, `--radius-pill` status pills, `--radius-xs` checkboxes.

## Components to build first

- **Button**: primary / secondary (border `--line-strong`) / quiet (`--link` text), 40px (32px small).
- **Chip**: tones neutral, primary, success, warning, danger, accent and each area; optional dot.
- **Checkbox**: 22px, `--control` border, checked fills `--primary`; done label goes `--ink-3` with strike-through.
- **Switch**: 42×24, off `--control`, on `--primary`.
- **Segmented control**: `--sunken-2` track, selected pill `--raised` + `--shadow-sm`.
- **PaceBar**: 8px track `--track`, fill in the area color, 2×16px `--inverse` tick at the expected %, status line in `--success` or `--warning`.
- **Card**, **StatTile** (label, display numeral, caption), **NavItem**, **HabitTile** (name, check button, 7 day squares, meta), **TaskRow**.

## Icons and motion

- Inline line icons on a 24px grid, 1.7–2px round strokes, `currentColor`. No emoji.
- Motion: 120ms hovers, 200ms toggles, 320ms sheets, `--ease`. Respect `prefers-reduced-motion`.
