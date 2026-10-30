# Grid: design rules

Swiss style for a tool you open every morning: white poster paper, a blue-black ink, one ultramarine that floods a field, and one Swiss red that marks the thing that needs you. Structure comes from scale, space and changes of paper, never from strokes; soft, very round shapes keep it friendly. The theme is Hallmark's **Grid**; it replaced Midnight & Brass in October 2026 (see `docs/REDESIGN-DRAFT.md`).

Tokens live in `design/tokens.json` (source of truth, a usage note per token) and `design/tokens.css` (CSS variables, light and dark). Token names kept from the first design (`--surface`, `--primary`, `--career-soft`…) so components didn't change; what they mean now is below.

## Colour: three roles and the paper

- **Paper.** `--bg` is the sheet. Panels and cards are `--surface` (a step darker), with no border and no shadow. Wells, tracks and filled controls use `--sunken`; segmented tracks `--sunken-2`; side panes `--subtle`.
- **Ink.** `--ink` for headings, body and the primary control (`--primary` is the ink block, `--on-primary` its text). `--ink-2` secondary text, `--ink-3` captions, `--ink-4` decoration and disabled text only.
- **Field, the ultramarine.** `--inverse` / `--on-inverse` flood a block: the year field on Today, the current review step, the Weekly review tile. Also `--link`, progress fills and "done" (`--success` resolves to it). At most one field per screen region; two fields never touch.
- **Mark, the Swiss red.** `--accent`, `--danger` and `--warning` all resolve to it: behind pace, over budget, today's marker, the wordmark square, text selection. One red field per page at most, and **never red on the ultramarine**.
- **Data.** Life areas (`--health` … `--fun`), mood (`--mood-1…5`) and heatmaps (`--heat-0…4`) are names only: they all resolve to the one ultramarine ramp, by choice. Areas are told apart by their name, never by colour.
- Dark mode keeps the roles: a blue-black sheet, warm white ink, the ultramarine and the red lifted for contrast.

## Colour themes

Settings › Appearance offers colour themes beside light and dark: **Grid** (the default, exactly `tokens.css`), **Leica**, **Nature**, **Focus**, **Ocean**, **Rosé**, and **Your own** (pick a background, a main colour and an accent). Each theme is five seeds per mode in `design/themes.ts` (paper, surface, ink, field, mark), so the three roles above survive any theme. `src/theme/palette.ts` derives every other colour token from the seeds, nudges colours until text reads (body 7:1, captions and links 4.5:1, tested for every preset), and writes a `<style id="palette">` that overrides the tokens in both modes. index.html replays the saved CSS before first paint. Components keep using the CSS variables and never know which theme is on; charts read `useThemeColors()`.

To add a theme: add its seeds to `design/themes.ts`, a name and one-line description in `settings.appearance` (en and vi), and check it at both sizes in light and dark.

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

State only: 120ms hovers, 200ms toggles, a 320ms rise for sheets, all on `--ease`. Width is never animated. `prefers-reduced-motion` turns it all off.

## Checking a screen

- Look at it at 1440×960 and 390×844, in light and dark, with real data seeded.
- If the Hallmark skill is installed, lint with `node ~/.claude/skills/hallmark/scripts/sloplint.mjs src --scope app`: it should report 0 FAIL and 0 REFLEX. Every CSS module starts with the Hallmark stamp line; the full stamp and its record of reworded and dropped items is at the top of `src/styles/global.css`.
