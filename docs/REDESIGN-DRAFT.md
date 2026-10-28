# Redesign plan (done, with Grid instead of Ink)

Status: **done on 2026-10-28.** The plan below was drafted with Ink; when it resumed, three new themes were dealt and **Grid** was chosen, data colours became one ultramarine ramp ("Ink only"), and the old mockups were deleted. The rules now live in `docs/DESIGN.md`; this file is kept as the record of the plan.

Planned with the Hallmark skill (`/hallmark redesign`), full depth, whole app, theme replaced. The "before" record lives in `.hallmark/` (before.txt, before.json, screenshots).

## Before

25 FAIL, 213 REFLEX, 11 WARN (sloplint, app scope). The main problems:

- Labels: 14 uppercase, tracked labels (gate 67).
- Copy: middle-dot meta strings (63) and dashes in copy (19).
- Spacing: off the 4px scale in 212 places (24b).
- States: no `:active` styles (26b); focus shown with a border on `QuickAddField` (39a); disabled shown by opacity alone on Button, Switch, the Progress step button and the Privacy file row.
- Motion: `PaceBar` animates `width` (10a).
- Layout: double sticky `top:0` in Library and Tasks (56); `Dialog` sized with `100vw` (34).

What already works and carries over: the plain, kind copy; true dark mode; the information on each screen.

## Keeps

- All wiring: 56 links, 34 fields and 242 handlers. Every route, test, data call and line of copy also stays. Lines that a copy gate flags get listed before and after.
- Token names, so components keep working. Only the values change.

## Theme: Ink (dealt 2/3, seed `personal-offline-first-life-dashboard-8201·e1adc7df·2026-10-27·r0`)

- **Palette:** white paper and a hueless black. One teal, used only for in, on or done. Hairline rules, state pills, no resting shadows.
- **Type:** Epilogue 700 for heads and 400 for text. IBM Plex Mono only for times and figures in columns. Load both through `@fontsource` so they work offline.
- **Dark mode:** derive it from the light values using Hallmark's `dark-mode.md`.
- **Data colours:** the area, mood and heatmap colours stay, muted, and appear only as small marks and in charts. This needs a recorded waiver of Ink's "never a second colour" rule. *Open question.*

## Composition

- **Shell:** the midnight sidebar becomes a `paper-2` sidebar. A sidebar is earned here, with 13 destinations. Group labels go to sentence case. The phone tab bar stays, restyled.
- **Signature:** Today becomes one ruled ledger. The agenda and today's plan sit under a single ink rule, with times in a mono column, tasks and habits checked inline, and teal only on what is done.
- **Every screen:** Today, Inbox/Tasks, Goals, Progress, Review, Library, Settings, Home bento, Profile, Calendar and the placeholders.
  - Cards at rest become ruled sections, and lists become ruled rows.
  - Each data region gets loading, empty, error and full states wherever the logic exists. Where it doesn't, the missing state is listed for the owner instead.

## Files

- **Edit:**
  - Tokens: `design/tokens.{json,css,ts}` and `design/TOKENS.md`.
  - Fonts: `src/main.tsx`.
  - Styles and markup: all 47 CSS files under `src/`, plus markup where the composition changes.
  - Docs: `docs/DESIGN.md` (rewritten as the locked Ink system), `design/README.md`, `CLAUDE.md` and `.claude/skills/run-build-prompt/SKILL.md`.
- **Dependencies:** add `@fontsource/epilogue` and `@fontsource/ibm-plex-mono`; remove Jost and Cormorant Garamond.
- **Create:** none.
- **Delete:** none. The old mockups would be marked superseded. *Open question: keep or delete.*

## Phases (each ends with a stop for review)

1. Tokens, fonts, the shell, shared components and Today, with before/after screenshots in light and dark.
2. Every other screen, desktop and phone. Then run `sloplint --kept` against the before record, followed by lint, typecheck, unit and e2e.
3. Docs, then one commit when asked.

## Open questions

1. Is Ink approved, or should the themes be re-dealt?
2. Should the data colours stay muted?
3. Should the old mockups be kept as superseded, or deleted?
