# Design tokens · Grid

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
| `--bg` | `#F8F7F3` | `#0B0F18` | The sheet: page background, white poster paper. |
| `--surface` | `#EDECE7` | `#141823` | Panels and cards on `bg`, a step darker. No border, no shadow. |
| `--raised` | `#F8F7F3` | `#282E3B` | The selected segment in a segmented control. |
| `--sunken` | `#E2DFDA` | `#1F2430` | Filled controls (secondary buttons, options), wells and tracks inside panels. |
| `--sunken-2` | `#D6D4CE` | `#282E3B` | Segmented-control tracks and pressed fills. |
| `--subtle` | `#EDECE7` | `#141823` | Side panes (tree, filters, calendar options). |
| `--track` | `#E2DFDA` | `#1F2430` | Empty part of progress bars, empty day squares, disabled fills. |
| `--line` | `#D8D6D0` | `#303540` | Hairlines between table rows; the edge of floating layers. |
| `--line-soft` | `#E4E3DE` | `#222630` | Quiet dividers between list rows. |
| `--line-strong` | `#BAB7B0` | `#4D535E` | Dashed drop zones and the add tile. |
| `--control` | `#7D8088` | `#70747E` | The 1px line under inputs; empty checkboxes and switches. |
| `--ink` | `#0F141E` | `#EDEBE7` | Headlines, body text and the primary control. |
| `--ink-2` | `#2C303B` | `#C9C7C2` | Secondary text and icons. |
| `--ink-3` | `#575B64` | `#9B9EA6` | Captions and labels. |
| `--ink-4` | `#83868E` | `#656972` | Decoration and disabled text only (not for reading). |
| `--inverse` | `#1F40BE` | `#678DEE` | The field: the ultramarine that floods a block (Today's year, the current review step, the Weekly review tile, chart ticks). |
| `--on-inverse` | `#F8F7F3` | `#0B0F18` | Text and figures on the field. |
| `--on-inverse-2` | `#C2D1F3` | `#222D47` | Quiet text and tracks on the field. |
| `--inverse-accent` | `#F8F7F3` | `#0B0F18` | Labels on the field (never red on blue). |
| `--primary` | `#0F141E` | `#EDEBE7` | The primary control: a square ink block. Checked states, focus ring. |
| `--primary-hover` | `#2C303B` | `#C9C7C2` | Primary control on hover. |
| `--on-primary` | `#F8F7F3` | `#0B0F18` | Text on the primary control. |
| `--on-primary-2` | `#BAB7B0` | `#4D535E` | Quiet text on the primary control. |
| `--primary-soft` | `#DAE5FD` | `#1F2C4C` | A pale ultramarine fill: the selected row, a time block, the current day. |
| `--primary-softer` | `#EBF0FB` | `#171F30` | The palest ultramarine tint: today's column. |
| `--primary-ink` | `#1F40BE` | `#A0BDFF` | Ultramarine text on `primary-soft`. |
| `--primary-line` | `#9CB6F2` | `#3D5590` | Dashed edge of a time block. |
| `--link` | `#1F40BE` | `#8DAFFE` | Links and quiet buttons (ultramarine). |
| `--accent` | `#D9241B` | `#F45B4B` | The Swiss red mark: the wordmark square, today's marker, the one thing that needs you, text selection. |
| `--accent-soft` | `#FDE3DE` | `#451E19` | A pale red fill behind `accent-ink` text. |
| `--accent-ink` | `#9E1710` | `#FEAC9F` | Red text on `accent-soft`. |
| `--success` | `#1F40BE` | `#8DAFFE` | Done and on pace: resolves to the ultramarine. |
| `--success-soft` | `#DAE5FD` | `#1F2C4C` | Pale ultramarine behind done states. |
| `--warning` | `#D9241B` | `#F45B4B` | Behind pace: resolves to the red mark. |
| `--warning-soft` | `#FDE3DE` | `#451E19` | Pale red behind warnings. |
| `--warning-ink` | `#9E1710` | `#FEAC9F` | Red text on `warning-soft`. |
| `--danger` | `#D9241B` | `#F45B4B` | Over budget, errors, destructive actions: the red mark. |
| `--danger-soft` | `#FDE3DE` | `#451E19` | Pale red behind errors. |
| `--danger-ink` | `#9E1710` | `#FEAC9F` | Red text on `danger-soft`. |
| `--health` | `#1F40BE` | `#678DEE` | Area colour for Health: the ultramarine, like every area (areas are told apart by name). |
| `--health-soft` | `#EBF0FB` | `#1F2C4C` | Pale fill for Health chips and events. |
| `--health-ink` | `#0F141E` | `#EDEBE7` | Text on `health-soft`. |
| `--career` | `#1F40BE` | `#678DEE` | Area colour for Career: the ultramarine, like every area (areas are told apart by name). |
| `--career-soft` | `#EBF0FB` | `#1F2C4C` | Pale fill for Career chips and events. |
| `--career-ink` | `#0F141E` | `#EDEBE7` | Text on `career-soft`. |
| `--finance` | `#1F40BE` | `#678DEE` | Area colour for Finance: the ultramarine, like every area (areas are told apart by name). |
| `--finance-soft` | `#EBF0FB` | `#1F2C4C` | Pale fill for Finance chips and events. |
| `--finance-muted` | `#DAE5FD` | `#1F2C4C` | Past months in the spending chart. |
| `--finance-ink` | `#0F141E` | `#EDEBE7` | Text on `finance-soft`. |
| `--family` | `#1F40BE` | `#678DEE` | Area colour for Family: the ultramarine, like every area (areas are told apart by name). |
| `--family-soft` | `#EBF0FB` | `#1F2C4C` | Pale fill for Family chips and events. |
| `--family-ink` | `#0F141E` | `#EDEBE7` | Text on `family-soft`. |
| `--growth` | `#1F40BE` | `#678DEE` | Area colour for Growth: the ultramarine, like every area (areas are told apart by name). |
| `--growth-soft` | `#EBF0FB` | `#1F2C4C` | Pale fill for Growth chips and events. |
| `--growth-ink` | `#0F141E` | `#EDEBE7` | Text on `growth-soft`. |
| `--home` | `#1F40BE` | `#678DEE` | Area colour for Home: the ultramarine, like every area (areas are told apart by name). |
| `--home-soft` | `#EBF0FB` | `#1F2C4C` | Pale fill for Home chips and events. |
| `--home-ink` | `#0F141E` | `#EDEBE7` | Text on `home-soft`. |
| `--fun` | `#1F40BE` | `#678DEE` | Area colour for Fun: the ultramarine, like every area (areas are told apart by name). |
| `--fun-soft` | `#EBF0FB` | `#1F2C4C` | Pale fill for Fun chips and events. |
| `--fun-ink` | `#0F141E` | `#EDEBE7` | Text on `fun-soft`. |
| `--viz-soft` | `#9CB6F2` | `#334673` | Second chart series, short nights. |
| `--mood-1` | `#E2DFDA` | `#1F2430` | Mood 1 of 5 on the ultramarine ramp (pale = low, deep = great). |
| `--mood-2` | `#BBCBEC` | `#2C4072` | Mood 2 of 5 on the ultramarine ramp (pale = low, deep = great). |
| `--mood-3` | `#84A3EA` | `#405EAD` | Mood 3 of 5 on the ultramarine ramp (pale = low, deep = great). |
| `--mood-4` | `#4A72DE` | `#5E84E3` | Mood 4 of 5 on the ultramarine ramp (pale = low, deep = great). |
| `--mood-5` | `#1F40BE` | `#96B6FE` | Mood 5 of 5 on the ultramarine ramp (pale = low, deep = great). |
| `--heat-0` | `#E2DFDA` | `#1F2430` | Heatmap step 0 on the ultramarine ramp. |
| `--heat-1` | `#BBCBEC` | `#2C4072` | Heatmap step 1 on the ultramarine ramp. |
| `--heat-2` | `#84A3EA` | `#405EAD` | Heatmap step 2 on the ultramarine ramp. |
| `--heat-3` | `#4A72DE` | `#5E84E3` | Heatmap step 3 on the ultramarine ramp. |
| `--heat-4` | `#1F40BE` | `#96B6FE` | Heatmap step 4 on the ultramarine ramp. |
| `--nav-bg` | `#EDECE7` | `#141823` | Sidebar background (paper, a step darker). |
| `--nav-surface` | `#E2DFDA` | `#1F2430` | Active sidebar item. |
| `--nav-line` | `#D8D6D0` | `#303540` | Sidebar dividers. |
| `--nav-ink` | `#0F141E` | `#EDEBE7` | Sidebar text. |
| `--nav-ink-2` | `#2C303B` | `#C9C7C2` | Secondary sidebar text. |
| `--nav-ink-3` | `#575B64` | `#9B9EA6` | Sidebar group labels. |
| `--nav-success` | `#1F40BE` | `#8DAFFE` | The saved-on-this-device square. |
| `--nav-accent` | `#0F141E` | `#EDEBE7` | Quick capture: the ink block. |
| `--on-nav-accent` | `#F8F7F3` | `#0B0F18` | Text on Quick capture. |
Also: `--scrim` (sheet backdrop) and `--glass` (caption over images).

## Fonts

- `--font-display`: Radio Canada Big 400 / 700. Titles, big figures, the wordmark; set at 700 in sentence case with −0.03em tracking.
- `--font-sans`: Radio Canada 400–700. Everything you read or tap. Labels are sentence case and untracked.

Both are bundled with `@fontsource` (no network needed).

## Type scale

| Style | Font | Size / line | Weight | Tracking | Use |
| --- | --- | --- | --- | --- | --- |
| `text-display-xl` | Radio Canada Big | 64/64 | 700 | -0.03em | Covers, empty states, year in review |
| `text-display-l` | Radio Canada Big | 46/50 | 700 | -0.03em | Library page title (desktop) |
| `text-display-m` | Radio Canada Big | 38/42 | 700 | -0.03em | Desktop screen titles |
| `text-mobile-title` | Radio Canada Big | 41/44 | 700 | -0.03em | Mobile tab-root titles; Home greeting uses 38/42 |
| `text-mobile-page-title` | Radio Canada Big | 36/40 | 700 | -0.03em | Mobile detail titles |
| `text-title` | Radio Canada Big | 28/32 | 700 | -0.03em | Detail-panel and sheet titles |
| `text-numeral` | Radio Canada Big | 36/40 | 700 | -0.03em | Big figures; lining + tabular |
| `text-heading` | Radio Canada | 16/24 | 600 | 0 | Panel and section headings |
| `text-body-l` | Radio Canada | 16/25 | 400 | 0 | Mobile editor text, form inputs |
| `text-body` | Radio Canada | 15/24 | 400 | 0 | Running text, task titles, list rows |
| `text-body-s` | Radio Canada | 13/20 | 400 | 0 | Secondary lines, table cells, buttons |
| `text-caption` | Radio Canada | 12/16 | 500 | 0 | Metadata, chart labels, status lines |
| `text-label` | Radio Canada | 11/16 | 600 | 0 | Group labels, sentence case |
| `text-tab-label` | Radio Canada | 11/14 | 500 | 0 | Mobile tab bar labels (700 when active) |

## Spacing (4px grid)

`--space-1` 4px · `--space-2` 8px · `--space-3` 12px · `--space-4` 16px · `--space-5` 20px · `--space-6` 24px · `--space-8` 32px · `--space-12` 48px

## Radius

Very round. Buttons, inputs, chips, segmented controls and switches are pills.

| Token | Value | Use |
| --- | --- | --- |
| `--radius-xs` | 8px | Tiny marks: tags inside a row, keyboard hints |
| `--radius-sm` | 12px | Small insets, menu items, list rows |
| `--radius-md` | 16px | Textareas, wells inside a panel, small cards |
| `--radius-well` | 20px | Larger wells and empty states |
| `--radius-lg` | 24px | Panels and cards |
| `--radius-tile` | 24px | Phone Home tiles |
| `--radius-xl` | 28px | Big blocks and floating panes (sidebar, side panes) |
| `--radius-pill` | 999px | Buttons, inputs, chips, segmented, switches, the tab bar |

## Shadows

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--shadow-sm` | `none` | `none` | Nothing: panels on the page sit flat. |
| `--shadow-md` | soft 12/32 drop | deeper drop plus a 1px edge | Things that float: the sidebar, the phone tab bar, menus, dialogs, sheets. |
| `--shadow-primary` | soft 8/20 drop | darker drop | Under the phone capture button. |

## Layout & sizes

| Token | Value | Use |
| --- | --- | --- |
| `--sidebar-width` | 248px | Desktop sidebar |
| `--desktop-padding` | 32px | Desktop content padding |
| `--desktop-gap` | 24px | Gap between desktop cards |
| `--mobile-gutter` | 18px | Mobile side padding |
| `--mobile-topbar-height` | 56px | Mobile pushed-screen top bar |
| `--tabbar-height` | 84px | Mobile tab bar incl. 20px home-indicator space |
| `--float-inset` | 12px | Gap between a floating nav (sidebar, tab bar) and the window edge |
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
