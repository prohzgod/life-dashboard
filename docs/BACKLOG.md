# Backlog

Everything planned but not built yet, gathered from the "Later" list in `docs/PROMPTS.md` and the gaps noted when each feature was finished. Newest notes at the bottom of each section. Tick items off (or delete them) as they ship.

## Still on the Later list

- [ ] **Sync between devices**: my devices end-to-end encrypted, or my own server; device list; the "if edits clash" rule (keep both, ask me). Needs a relay or server. Every table already has `spaceId`, timestamps and soft delete for it.
- [ ] **Assistant module**: chat about your own data, on-device model first or your own API key, per-area read permissions (Health and Finance off by default), suggested actions that change nothing until tapped. Decide which model it uses before building.

## Product gaps

- [ ] **Family shared space**: a second space beside Personal; the space switcher in the sidebar; the Family calendar in Calendar.
- [ ] **Monthly, quarterly and yearly reviews** (only the weekly review exists).
- [ ] **Notifications and reminders**: task `reminderAt` is stored but nothing fires; Settings › Notifications.
- [ ] **Settings tabs**: General, Spaces & sharing and Modules are still placeholders. Modules on/off should remove a module's widgets without deleting data.

## Export and import

- [ ] Markdown + images as a zip.
- [ ] CSV export (habits, metrics, money, transactions).
- [ ] Imports from Notion, Obsidian, Day One.

## Privacy

- [ ] Private journal with its own passphrase.
- [ ] Encrypting the database itself on the device (decided against for now: risk of losing data with a lost passphrase).
- [ ] Recovery kit as a PDF (it's a .txt file today).
- [ ] "Keep full-size photos for" (prune originals, keep thumbnails).

## Phones

- [ ] Capture sheet: Expense and Photo tabs.
- [ ] Library editor: the bottom formatting toolbar.
- [ ] Settings home: the design's grouped list (sections already open as their own screens).

## Calendar

- [ ] Refresh linked calendars in the background (today: by hand; many providers block reading links directly).
- [ ] Repeating imported events can't be edited (they're read-only by design; editing would need two-way sync).
- [ ] The Weekly review shown as its own filled block.

## Vision board

- [ ] Drag to reorder in the grid (today: Move earlier / later).

## Finance

- [ ] Recurring transactions created automatically (the "Recurring" source exists, nothing repeats).
- [ ] Reading the amount off a receipt photo.

## Health

- [ ] Apple Health / Health Connect import (needs the phone companion app).
- [ ] A chart per custom metric over time.
- [ ] Metrics that power habits and goals.

## Design

- [ ] **Ink redesign** (Hallmark): the plan is in `docs/REDESIGN-DRAFT.md`.
