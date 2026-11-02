# Design rules

> **Glass v2 replaced Grid's look on 30 October 2026.** The visual source of truth is now `design/v2/README.md` (with its screenshots and mockups) and the tokens in `design/tokens.css`. The rules below are kept for layout, copy and accessibility; where they talk about paper, ultramarine, the red mark, Radio Canada or square fields, read Glass v2 instead: glass cards on a background, one accent you choose, the near-black `--inverse` as the strong fill, Be Vietnam Pro.

## Glass v2 in short

- **Background**: one fixed layer behind everything (`.app-bg`, `src/app/AppBackground.tsx`): Dawn, Morning mist, your photo, or Night. Never put gradients on cards.
- **Glass card**: `--glass` + `backdrop-filter: blur(var(--blur)) saturate(var(--saturate))` + 1px `--line` + `--radius-card` + `--shadow-card`, padding `--card-pad`. Inside a card, `--glass-2` (raised) or `--well` (recessed); never blur twice.
- **One dark `--panel` per screen** (Today: the Daily check-in).
- **One accent** (`--accent`, chosen in Settings › Appearance): today/now, the selected choice, badges, the + button. Text on it is always `--on-accent`.
- **Strong fill = `--inverse`**: active nav item, primary button, done checks, the current event, chart bars.
- **Big numbers are light (300)**, labels 500, titles 600. Everything is rounded: pills for controls, 22–32px for surfaces. Progress is a pill with diagonal `.hatch` stripes for what remains.
- Settings › Appearance: background, accent, and light/dark/auto. Saved on this device; applied before first paint by `index.html`. Night is always dark.

The older token names (`--surface`, `--primary`, `--sunken`, `--career-soft` …) still work: `design/tokens.css` maps each onto a Glass v2 value.

# Grid (before October 30, 2026)

## Colour: three roles and the paper

- **Paper.** `--bg` is the sheet. Panels and cards are `--surface` (a step darker), with no border and no shadow. Wells, tracks and filled controls use `--sunken`; segmented tracks `--sunken-2`; side panes `--subtle`.
- **Ink.** `--ink` for headings, body and the primary control (`--primary` is the ink block, `--on-primary` its text). `--ink-2` secondary text, `--ink-3` captions, `--ink-4` decoration and disabled text only.
- **Field, the ultramarine.** `--inverse` / `--on-inverse` flood a block: the year field on Today, the current review step, the Weekly review tile. Also `--link`, progress fills and "done" (`--success` resolves to it). At most one field per screen region; two fields never touch.
- **Mark, the Swiss red.** `--accent`, `--danger` and `--warning` all resolve to it: behind pace, over budget, today's marker, the wordmark square, text selection. One red field per page at most, and **never red on the ultramarine**.
- **Data.** Life areas (`--health` … `--fun`), mood (`--mood-1…5`) and heatmaps (`--heat-0…4`) are names only: they all resolve to the one ultramarine ramp, by choice. Areas are told apart by their name, never by colour.
- Dark mode keeps the roles: a blue-black sheet, warm white ink, the ultramarine and the red lifted for contrast.

## Type

- `--font-display` **Radio Canada Big** 700, sentence case, tight tracking (−0.03em): screen titles, big figures, the wordmark. Figures may run larger than the head beside them.
- `--font-sans` **Radio Canada** 400–700: body 15/24, secondary 13/20, captions 12/16. Labels, captions, table heads and nav groups are a step smaller, **sentence case, never capitals, never tracked**.
- Both are bundled with `@fontsource`, so they work offline.

## Shape and surfaces

- **Very round.** Panels and cards `--radius-lg` (24px), tiles and big blocks `--radius-xl` (28px), wells `--radius-well`, small insets `--radius-sm`/`--radius-md`. Buttons, inputs, chips, segmented controls and switches are **pills** (`--radius-pill`); multi-line text boxes take `--radius-md` or `--radius-lg`.
- **Shadows only on things that float**: `--shadow-md` on the sidebar, the phone tab bar, menus, dialogs and sheets; `--shadow-primary` under the capture button. Panels on the page have none.
- **No strokes** around panels or controls. The only lines: hairlines between table rows and the 1px edge a floating layer gets in dark mode.
- **Dashes mean something**: a time block from a task, a drop zone, the "add" tile, a target line on a chart. Nothing else is dashed.
- Spacing on the 4px scale (`--space-*`).

## Controls

- **Primary button**: an ink pill with paper text. One per screen.
- **Secondary button**: a `--sunken` fill, no outline. **Quiet**: link-coloured text, underline on hover.
- Every button moves 1px down while pressed. **Disabled** shows on three channels: a `--track` fill, `--ink-4` text and the not-allowed cursor (never opacity alone).
- **Inputs**: a `--sunken` pill, no line; textareas round to `--radius-md`.
- **Focus**: a 2px `--primary` outline, 2px offset, appearing at once.
- **Switch and segmented**: pills; **checkbox**: a softly rounded square. On and checked fill with ink.

## Layout

- Desktop: a **floating sidebar**, a 248px rounded panel inset `--float-inset` (12px) from the window, with the **wordmark** (a red square exactly two lines tall beside "Life / Dashboard"), content padding 32px, panels 20px inside. Library, Tasks and Calendar are fixed-height pages whose side panes float the same way (inset 12px, `--radius-xl`) and scroll on their own.
- Phones (below 768px): 18px gutters, the **floating tab bar**, a pill inset 12px from the sides and the bottom (Home, Today, +, Tasks, Library; `--tabbar-height` reserves its room), the bento Home, pushed screens with "‹ Back to …" headers, 44px touch targets.
- Heads hang flush left from the column; nothing is centred except empty-state copy inside its own panel.

## Copy

Plain, kind, second person, exact. No dashes as punctuation ("Thu 1 Jan to Thu 31 Dec"), and no middle dots joining a run of facts: use commas or separate lines ("4 days left, $660 under budget"). No emoji.

## Motion

Motion shows where things came from and that the app heard you. Tokens are in `design/TOKENS.md`.

- **Screens** crossfade, with a view transition on every change of view (`src/app/router.tsx`). Nothing slides or flies in, and the nav and tab bar hold still. Never fade an ancestor of glass by hand: opacity below 1 switches off the backdrop blur inside it, and the cards pop when the fade ends.
- **Navs and switches** share `SlidingPill`, so the highlight travels between items.
- **Overlays** (dialogs, sheets, menus, toasts) animate out as well as in, through `usePresence`. Entering takes 200 to 320ms on `--ease`, leaving is shorter on `--ease-exit`. A dialog or sheet closes for real the moment you dismiss it, so focus returns and the page works while it animates away; never leave the page inert for the length of an animation.
- **Presses** shrink anything pressable to `--press-scale` and spring back. **Choices** (a tick, a mood) pop with `--ease-spring`, only when you just made them, never on first paint.
- **Numbers** count to a new value with `AnimatedNumber`; values that aren't plain numbers rise into place. Rings and bars draw on first paint, then move to each new value.
- **Scrolling** settles cards into place as they enter the view, by movement only, so nothing below the fold is ever faint.
- Animate `transform`, `opacity` and colours. Width or height only on something that doesn't push its neighbours (a pill, a bar fill).
- `prefers-reduced-motion` turns all of it off, including the wait for an overlay to close.

## Checking a screen

- Look at it at 1440×960 and 390×844, in light and dark, with real data seeded.
- If the Hallmark skill is installed, lint with `node ~/.claude/skills/hallmark/scripts/sloplint.mjs src --scope app`: it should report 0 FAIL and 0 REFLEX. Every CSS module starts with the Hallmark stamp line; the full stamp and its record of reworded and dropped items is at the top of `src/styles/global.css`.
