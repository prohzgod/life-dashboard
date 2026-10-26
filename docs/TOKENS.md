# Design tokens · Midnight & Brass

One source of truth, four formats:

| File | Use it for |
| --- | --- |
| `tokens.json` | Source of truth (also loads into the design canvas and design system page) |
| `tokens.css` | Import once in the app. CSS variables for every token, light + dark, plus `.text-*` type classes |
| `tokens.ts` | Typed values for charts, canvas drawing and logic (`colors.light.primary`, `typography.body`, `layout.tabbarHeight`) |
| `tokens.dtcg.json` | W3C Design Tokens format for Figma plugins / Style Dictionary |

Theme: set `data-theme="light"` or `"dark"` on `<html>`; with neither, the system setting decides. The same attribute on any element themes just that subtree (used by `/dev/components` to show both themes side by side).

## Colors

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#EEF0F3` | `#0D111D` | Page background behind cards (the porcelain ground). |
| `--surface` | `#FCFCFD` | `#171C2B` | Cards, panels and inputs on `bg`. |
| `--raised` | `#FFFFFF` | `#313A56` | The selected pill in a segmented control, the active row in a list. Sits on `sunken-2` or `subtle`. |
| `--sunken` | `#F2F4F7` | `#1C2234` | Tiles and wells inside a card (habit tiles, stat tiles, info notes). |
| `--sunken-2` | `#E6E9EF` | `#252C42` | Chips, segmented-control tracks, progress tracks on `surface`. |
| `--subtle` | `#F6F7F9` | `#131827` | Secondary panes (tree, filters) and quiet input fields. |
| `--track` | `#E1E5EC` | `#2A3249` | Empty part of progress bars and missed-day squares. |
| `--line` | `#DCE1E8` | `#2B334B` | Card borders and input borders. |
| `--line-soft` | `#EAEDF2` | `#212839` | Dividers between rows inside a card. |
| `--line-strong` | `#BEC5D2` | `#46506F` | Secondary-button borders, empty checkboxes, dashed drop zones, switch track when off. |
| `--control` | `#858DA0` | `#737D9C` | Borders of empty checkboxes and radio buttons, switch track when off (3:1 on `surface`). |
| `--ink` | `#141926` | `#ECEEF4` | Headlines and body text on `surface`, `bg`, `sunken`. |
| `--ink-2` | `#444B5D` | `#B8BECD` | Secondary text and icons on `surface`, `bg`, `sunken`, `sunken-2`. |
| `--ink-3` | `#5F6679` | `#959CAF` | Captions, metadata and timestamps on `surface`, `bg`, `sunken`, `sunken-2`. |
| `--ink-4` | `#8E95A7` | `#6A7290` | Decorative strokes only: chart guides, arrows, drag handles. Never for text. |
| `--inverse` | `#18203A` | `#EAE6DC` | High-emphasis dark block: chat bubbles, the current step, quote cards, pace ticks. |
| `--on-inverse` | `#F6F3EC` | `#161B2A` | Text on `inverse`. |
| `--on-inverse-2` | `#B6BDD0` | `#4F566A` | Secondary text on `inverse`. |
| `--inverse-accent` | `#D4B57C` | `#7A5B22` | Eyebrow labels on `inverse`. |
| `--primary` | `#22305A` | `#D4B57C` | Primary buttons, checked boxes, the active habit, focus ring. Midnight in light, brass in dark. |
| `--primary-hover` | `#19244A` | `#E3C994` | Hover state of `primary` fills. |
| `--on-primary` | `#F7F4EC` | `#161B2A` | Text and icons on `primary`. |
| `--on-primary-2` | `#C3CAE0` | `#4E4128` | Secondary text on `primary`. |
| `--primary-soft` | `#E5E9F4` | `#2C2B2C` | Selected states, time blocks, suggestion chips. |
| `--primary-softer` | `#F3F5FA` | `#1B2030` | Today's column, quiet highlights. |
| `--primary-ink` | `#1B2750` | `#E8D1A3` | Text on `primary-soft` and `primary-softer`. |
| `--primary-line` | `#AAB6D6` | `#76623D` | Borders of selected items and dashed time blocks. |
| `--link` | `#2D4585` | `#D9BC86` | Links and text buttons on `surface` and `bg`. |
| `--accent` | `#A8844A` | `#D4B57C` | Brass: sparing highlights such as the word of the year, today's marker and the logo. Fills and marks, not body text. |
| `--accent-soft` | `#F3ECDF` | `#2E2A24` | Brass-tinted fill behind `accent-ink` text. |
| `--accent-ink` | `#6B5020` | `#E8D1A3` | Text on `accent-soft`. |
| `--success` | `#2B6A52` | `#79C4A2` | On-pace text and saved/synced status on `surface`. Always paired with a word. |
| `--success-soft` | `#E0EEE7` | `#18302A` | Fill behind success chips. |
| `--warning` | `#92530E` | `#E6AB69` | Behind-pace and overdue text on `surface`. Always paired with a word. |
| `--warning-soft` | `#F7EBDA` | `#35291B` | Offline banner, behind-pace chips, recovery-kit warning. |
| `--warning-ink` | `#613708` | `#F2CA94` | Text on `warning-soft`. |
| `--danger` | `#9E344B` | `#EE91A4` | Over-budget bars, destructive actions. |
| `--danger-soft` | `#F6E2E6` | `#3A2029` | Fill behind danger and high-priority chips. |
| `--danger-ink` | `#72213A` | `#F6BDC8` | Text on `danger-soft`. |
| `--health` | `#3E7D63` | `#76C3A1` | Health area: dots, bars and charts. |
| `--health-soft` | `#E2EFE8` | `#192E27` | Health area tint (chips, image placeholders). |
| `--health-ink` | `#1E4B3A` | `#AADDC6` | Text on `health-soft`. |
| `--career` | `#3A5A9A` | `#8FA9E2` | Career area; also work calendar events and sleep bars. |
| `--career-soft` | `#E3E9F5` | `#1C2644` | Career tint; work events. |
| `--career-ink` | `#203766` | `#C4D3F4` | Text on `career-soft`. |
| `--finance` | `#A8742A` | `#E1B173` | Finance area: budgets, savings bars. |
| `--finance-soft` | `#F6EBDA` | `#33291C` | Finance tint. |
| `--finance-muted` | `#E4D2B2` | `#56472F` | Past months in finance charts. |
| `--finance-ink` | `#633F0C` | `#F1CF9D` | Text on `finance-soft`. |
| `--family` | `#A04E66` | `#E69BB0` | Family area and shared-space markers; the 'now' line in calendars. |
| `--family-soft` | `#F6E3E9` | `#3A2231` | Family tint; family events. |
| `--family-ink` | `#6B243D` | `#F5C4D2` | Text on `family-soft`. |
| `--growth` | `#6A56A8` | `#B4A4E9` | Growth area: learning, writing. |
| `--growth-soft` | `#ECE7F7` | `#29243F` | Growth tint; personal events. |
| `--growth-ink` | `#42326C` | `#D9D0F7` | Text on `growth-soft`. |
| `--home` | `#2F7C84` | `#7DC7CD` | Home area. |
| `--home-soft` | `#DEEFF1` | `#16303A` | Home tint. |
| `--home-ink` | `#1A4A50` | `#B1E1E4` | Text on `home-soft`. |
| `--fun` | `#8F6F10` | `#DDBB5B` | Fun and travel area. |
| `--fun-soft` | `#F4EDD3` | `#312A17` | Fun tint. |
| `--fun-ink` | `#574409` | `#EED88F` | Text on `fun-soft`. |
| `--viz-soft` | `#AFBEDC` | `#3F4F7A` | Second series in charts (below target, earlier period). |
| `--mood-1` | `#9A3550` | `#D9728D` | Mood scale 1 (awful), year in pixels. |
| `--mood-2` | `#DDA7AC` | `#7A4A5A` | Mood scale 2 (low). |
| `--mood-3` | `#E1E4EB` | `#2E3650` | Mood scale 3 (okay). |
| `--mood-4` | `#9DB1D8` | `#4F6DB2` | Mood scale 4 (good). |
| `--mood-5` | `#2C437F` | `#AFC4F4` | Mood scale 5 (great). |
| `--heat-0` | `#E4E7EE` | `#1F2638` | Habit heatmap: none done. |
| `--heat-1` | `#C9D3E8` | `#2B3A60` | Habit heatmap: a few. |
| `--heat-2` | `#93A7D2` | `#3F5A98` | Habit heatmap: half. |
| `--heat-3` | `#5470AE` | `#7090D2` | Habit heatmap: most. |
| `--heat-4` | `#22305A` | `#BACCF5` | Habit heatmap: all done. |
| `--nav-bg` | `#131A2E` | `#090C16` | Sidebar background (midnight in both themes). |
| `--nav-surface` | `#1D2542` | `#161C30` | Active item and search field in the sidebar. |
| `--nav-line` | `#29314F` | `#1E2539` | Borders inside the sidebar. |
| `--nav-ink` | `#EEF0F6` | `#EEF0F6` | Active item and titles on `nav-bg`. |
| `--nav-ink-2` | `#AFB6CA` | `#AFB6CA` | Inactive items on `nav-bg`. |
| `--nav-ink-3` | `#8189A3` | `#7E86A0` | Group labels and hints on `nav-bg`. |
| `--nav-success` | `#79C4A2` | `#79C4A2` | Saved and synced status dot on `nav-bg`. |
| `--nav-accent` | `#D4B57C` | `#D4B57C` | Brass in the sidebar: active icon, Quick capture button. |
| `--on-nav-accent` | `#131A2E` | `#131A2E` | Text on `nav-accent`. |

Also: `--scrim` (sheet backdrop) and `--glass` (caption over images).

## Fonts

- `--font-display`: Cormorant Garamond 500 / 600 / italic 500. Titles, big numbers, quotes. Never below 18px.
- `--font-sans`: Jost 400–700. Everything you read or tap.

## Type scale

| Style | Font | Size / line | Weight | Tracking | Use |
| --- | --- | --- | --- | --- | --- |
| `text-display-xl` | Cormorant | 64/64 | 500 | -0.01em | Covers, empty states, year in review |
| `text-display-l` | Cormorant | 46/50 | 500 | -0.01em | Library page title (desktop) |
| `text-display-m` | Cormorant | 38/42 | 500 | -0.01em | Desktop screen titles |
| `text-mobile-title` | Cormorant | 41/44 | 500 | -0.01em | Mobile tab-root titles (Today, Tasks, Library); Home greeting uses 38/42 |
| `text-mobile-page-title` | Cormorant | 36/40 | 500 | 0 | Mobile detail titles (goal, page, task, review step) |
| `text-title` | Cormorant | 28/32 | 600 | 0 | Detail-panel titles, quote cards, sheet titles (26 on mobile) |
| `text-numeral` | Cormorant | 36/40 | 500 | 0 | Big stat numbers; lining + tabular figures |
| `text-heading` | Jost | 16/24 | 600 | 0 | Card and section headings |
| `text-body-l` | Jost | 16/25 | 400 | 0 | Mobile editor text, form inputs (16px avoids iOS zoom) |
| `text-body` | Jost | 15/24 | 400 | 0 | Running text, task titles, list rows |
| `text-body-s` | Jost | 13/20 | 400 | 0 | Secondary lines, table cells, buttons |
| `text-caption` | Jost | 12/16 | 500 | 0 | Metadata, chart labels, status lines |
| `text-label` | Jost | 11/16 | 600 | 0.12em | Uppercase eyebrows and group labels |
| `text-tab-label` | Jost | 11/14 | 500 | 0 | Mobile tab bar labels (700 when active) |

## Spacing (4px grid)

`--space-1` 4px · `--space-2` 8px · `--space-3` 12px · `--space-4` 16px · `--space-5` 20px · `--space-6` 24px · `--space-8` 32px · `--space-12` 48px

## Radius

| Token | Value | Use |
| --- | --- | --- |
| `--radius-xs` | 6px | Checkboxes, kbd hints |
| `--radius-sm` | 8px | Chips, segmented pills |
| `--radius-md` | 10px | Buttons, inputs, nav items |
| `--radius-well` | 14px | Stat tiles, habit tiles, wells |
| `--radius-lg` | 18px | Cards and panels |
| `--radius-tile` | 20px | Bento tiles on mobile Home |
| `--radius-xl` | 24px | Bottom sheets, large media |
| `--radius-pill` | 999px | Status pills, avatars, FAB |

## Shadows

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--shadow-sm` | `0 1px 2px rgba(20,25,38,0.06), 0 1px 1px rgba(20,25,38,0.03)` | `0 1px 2px rgba(0,0,0,0.45)` | Cards and the raised segmented pill. |
| `--shadow-md` | `0 12px 32px -14px rgba(20,25,38,0.22), 0 2px 6px rgba(20,25,38,0.05)` | `0 14px 34px -14px rgba(0,0,0,0.7)` | Popovers, sheets and menus. |
| `--shadow-primary` | `0 8px 20px -6px rgba(34,48,90,0.45)` | `0 8px 20px -6px rgba(0,0,0,0.6)` | The floating capture button. |

## Layout & sizes

| Token | Value | Use |
| --- | --- | --- |
| `--sidebar-width` | 248px | Desktop sidebar |
| `--desktop-padding` | 32px | Desktop content padding |
| `--desktop-gap` | 24px | Gap between desktop cards |
| `--mobile-gutter` | 18px | Mobile side padding |
| `--mobile-topbar-height` | 56px | Mobile pushed-screen top bar |
| `--tabbar-height` | 84px | Mobile tab bar incl. 20px home-indicator space |
| `--fab-size` | 56px | Centre capture button |
| `--touch-min` | 44px | Minimum touch target |
| `--bento-columns` | 4 | Mobile Home grid columns |
| `--bento-gap` | 9px | Mobile Home grid gap |
| `--bento-row` | 70px | Mobile Home row height (Edit mode 64) |
| `--breakpoint-mobile` | 768px | Below this width use the mobile layouts |

## Motion

| Token | Value | Use |
| --- | --- | --- |
| `--dur-fast` | `120ms` | Hovers |
| `--dur` | `200ms` | Toggles, checkboxes |
| `--dur-slow` | `320ms` | Sheets, page pushes |
| `--ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | All transitions |
