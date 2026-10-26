# Prompts for cloud sessions

Every prompt builds against the approved designs in `design/screens/` and `design/mockups/` (see `design/README.md`). After building a screen, Claude should run the app, take a Playwright screenshot of it at the design's size in both themes, and compare it with the design screenshot before finishing.

Start each one as a new task on claude.ai/code with this repository selected. Use **Plan** mode for the first one so you can approve the approach, then **Accept edits** for the rest. Review the diff, then **Create PR** and merge before starting the next.

## 1 · Foundations

Read CLAUDE.md, docs/PRODUCT.md and docs/DESIGN.md. Set up phase 1 "Foundations": a Vite + React + TypeScript app with the scripts listed in CLAUDE.md, ESLint, Vitest and Playwright. Import design/tokens.css globally. Build the app shell: the midnight sidebar (Plan / Grow / Remember / Modules groups, Quick capture button, search button, sync status card, space switcher, Settings), React Router routes for every screen in PRODUCT.md with a designed empty state each, and a light / dark / system theme switch stored per device. Make it an installable PWA that loads offline. Build the base components from DESIGN.md (Button, Chip, Checkbox, Switch, Segmented, PaceBar, Card, StatTile) with a /dev/components page that shows them in both themes. Add a GitHub Actions workflow that runs lint, typecheck and tests.

## 2 · Local data

Implement the Dexie schema from docs/PRODUCT.md "Data model" with repositories in src/data/ (no Dexie calls in components), ULID ids, soft delete and spaceId on every record. Seed first launch with the default Personal space, 8 life areas, one sample yearly goal with a quarterly child goal, 3 suggested habits, the Journal / Areas / Projects folders and a Sunday weekly review. Add Settings › Export & import: full JSON export and import. Unit-test the repositories with fake-indexeddb.

## 3 · Today, tasks and habits

Build Today exactly as described in PRODUCT.md, wired to real data: agenda strip (placeholder until Calendar), today's tasks with check-off, quick add with natural-language parsing (dates, "every …" repeat rules stored as RRULE, #area, !priority) shown as chips before saving, habit tiles with never-miss-twice streaks and consistency %, daily check-in, weekly focus with PaceBar, on-this-day card. Then build Inbox & tasks with views, Accept triage, Upcoming and the detail drawer. Put streak, recurrence and parsing logic in src/domain/ with unit tests.

## 4 · Library

Build the Library: react-arborist tree with drag-and-drop using parentId + fractional sortKey, system folders, favourites, trash; BlockNote editor with page properties, checklists, image galleries (paste or drop images, stored as Blobs with client-side thumbnails), [[page]] links and @goal mentions saved to the links table, a backlinks rail and full-text search. The Journal auto-creates a page per day with the check-in at the top.

## 5 · Goals, review and progress

Build Goals (tree, pace calculation per PRODUCT.md "Pace rules", detail panel with progress-vs-pace chart and milestones), the 5-step Weekly review pre-filled with the week's stats, and Progress (Day/Week/Month/Year, year in pixels, habit heatmap, wheel of life with ECharts). All pace and stats maths in src/domain/ with tests.

## 6 · Mobile layout

Build the mobile layouts from design/screens/Mobile*.png for widths below 768px: the tab bar (Home · Today · + · Tasks · Library) replacing the sidebar, the bento Home with the homeWidgets table (S/M/L sizes, reorder by drag, hide, Add to Home sheet, pinned Library pages), Edit Home, Pin to Home in the Library page menu, the avatar → Profile page with per-field Shown/Blurred and Blur all, Edit profile, and the pushed screens with "‹ Home" back buttons. Check every mobile screen at 390×844 (profile screens 390×1290) in both themes against its screenshot.

## Later

Calendar (ICS import + time blocks), Vision board, Settings privacy (app lock, encryption, backups), sync, then the Finance, Health and Assistant modules, one session each.
