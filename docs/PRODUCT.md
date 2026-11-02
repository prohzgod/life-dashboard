# Life Dashboard: product spec

## The idea

One calm place that connects the whole "life loop":

**Life areas → Goals (year → quarter → week) → Weekly plan → Today (tasks, habits, check-in) → Journal & notes → Review → back to Goals.**

Everything can link to everything: a task to a goal, a journal photo to a goal, a note to an area.

## Principles

1. Capture in under 3 seconds (⌘N anywhere, mobile capture button). Sort it later in the Inbox.
2. Opinionated defaults: 8 life areas, a sample goal, 3 suggested habits and a Sunday weekly review are created on first launch.
3. Forgive, don't punish: "never miss twice" streaks (one missed day keeps the streak, two in a row break it), consistency % shown before streak count, one-click "reschedule all overdue".
4. Pace, not pass/fail: every goal shows progress next to where it should be today (expected = elapsed time ÷ total time).
5. Nothing is required: a task can exist without a goal, a note without a folder.
6. Private by default: data lives on the device; money and health can be hidden; export is always available.

## Languages

Vietnamese (the default) and English, picked in Settings › General and saved on the device. All copy, dates, numbers and money follow it; starter content (areas, sample goal, habits, folders, budgets) is created in the language active on first launch. Quick capture understands both ("ngày mai lúc 18:00 #tàichính !cao", "tomorrow 6pm #finance !high").

## Navigation

Desktop: a 248px midnight sidebar.
- **Plan:** Today (home), Inbox, Tasks, Calendar
- **Grow:** Goals, Progress, Reviews
- **Remember:** Library & journal, Vision board
- **Modules (optional):** Finance, Health, Assistant
- Footer: sync status ("Saved on this device · Synced with 2 devices"), Settings.
- Everywhere: Quick capture ⌘N, command palette / search ⌘K.

Mobile (below 768px): tab bar **Home · Today · ＋ capture · Tasks · Library**. The app opens on Home.
- **Home** is a customizable bento grid of live widgets: Today (always on), Goals, Calendar, Weekly review, Progress, Sleep, Finance, Vision, Ask AI, Steps, plus any **pinned** Library page, goal or habit. Widgets come in S / M / L sizes, can be reordered, resized and hidden in **Edit Home**; hidden widgets keep their data and are re-added from the "Add to Home" sheet (Widgets · From Library · Goals & habits). Turning a module off removes its widgets.
- **Pin to Home**: the "…" menu on a Library page (and on goals/habits) has a Pin to Home switch.
- **Profile**: the avatar in the top-right of every tab root opens Profile, which holds Settings (Privacy & data, Appearance, Home & modules, Notifications, Backup & export) and "Lock app now".
- Profile fields: photo or initial, display name, quote/motto, gender, birthday (age derived), pronouns, what you do, home city, email, phone, plus custom fields. Every field has its own Shown / Blurred setting; blurred values render with a blur until tapped, "Blur all" blurs every field, and blurred fields are never read by the Assistant.
- Screens not in the tab bar are pushed from Home tiles with a "‹ Home" back button. Weekly review and the Library editor are full-screen (no tab bar).

## Screens

| Screen | What it shows |
| --- | --- |
| Today | Date + year progress; agenda strip (calendar events, time blocks); today's tasks with an add field that understands natural language; 4 habit tiles with the last 7 days; daily check-in (mood 1–5, energy 1–5, sleep, one line, photo of the day); this week's 1–3 focus items with pace; "on this day" memory |
| Inbox & tasks | Views (Inbox, Today, Upcoming, Anytime, Someday, Logbook), areas, tags; Inbox items with a suggested destination and Accept; Upcoming grouped by day; task detail drawer (area, goal / key result, do-on date, deadline, repeat rule, reminder, priority, estimate, tags, subtasks, notes, attachments) |
| Goals | Vision statement + word of the year; goal tree (year → quarter → week → habits/tasks) with progress bar and a "where you should be today" tick; detail panel with why it matters, progress chart vs pace line, milestones, linked habits/tasks/notes/journal, a catch-up suggestion |
| Progress | Day / Week / Month / Year tabs; stat tiles; year in pixels (mood per day); wheel of life radar (now vs last quarter); habit heatmap; patterns ("days after 7h+ sleep are rated 0.9 higher") |
| Library | Tree (Journal › year › month › day, Areas, Projects, Reading notes, Recipes, All photos, Trash) with drag-and-drop; block editor page with properties (area, goal, tags), checklists, image galleries, `[[links]]`, `@mentions`; right rail with backlinks, attachments, "stored on this device, encrypted", version history |
| Reviews | One page for every review: the week, month, quarter and year that's due (the one to do next in the ultramarine field), with Start or Continue, and the reviews you've finished with their journal pages. A finished period stays on offer for a while (2 weeks for a month, a month for a quarter, 2 months for a year), and the current one opens early in its last days |
| Monthly, quarterly, yearly review | 4 steps: Look back (stats against the period before, mood by day or month, goals that moved, a draft summary) → Reflect (three questions; quarters and years also rate the wheel of life) → Plan the next period (up to 3 goals of that horizon; the year also sets next year's word) → Done, written to the journal page for the period's last day |
| Weekly review | 5 steps: Get clear (inbox to zero) → Get current → Reflect → Plan next week (pick 1–3 focus items) → Done. Pre-filled with the week's stats, mood/energy per day, best day, goals that moved; optional on-device AI draft summary |
| Calendar | Week grid with events from read-only Google/iCloud calendars, your own events, time blocks created from tasks (dashed), drag unscheduled tasks onto the week |
| Vision board | Grid or free canvas of images and quote cards per area, each can pin a goal with its progress |
| Finance (module) | Spent vs budget, income, savings rate, net worth hidden by default; budget per category; savings goals linked to Goals; transactions (manual, receipt photo, CSV import); 6-month trend |
| Health (module) | Sources (Apple Health / Health Connect via a future phone app, manual); sleep, steps, resting HR, weight, workouts; sleep chart vs 7h target; sleep → mood pattern; custom metrics (water, coffee, any number/scale/yes-no) |
| Assistant (module) | Chat about your own data; on-device model by default or your own API key; per-area read permissions (Journal, Tasks, Notes, Photos on; Health, Finance off); suggested actions that change nothing until tapped |
| Settings | Storage on device; sync (this device only / my devices end-to-end encrypted / my own server), device list, conflict rule; end-to-end encryption, recovery kit, private journal passphrase; app lock and screen privacy; automatic encrypted backups, restore; export (Markdown + images zip, JSON, CSV) and import; modules on/off |

## Data model (IndexedDB tables)

All tables: `id` (ULID), `createdAt`, `updatedAt`, `deletedAt`. The app holds one person's data, so there are no spaces.

- `areas` (name, color token, icon, sortKey), `areaRatings` (areaId, date, score 1–10)
- `goals` (areaId, parentGoalId, title, why, horizon: vision | year | quarter | month | week, type: target | average | milestone | habit | okr | qualitative, progressMethod, startValue, targetValue, currentValue, unit, startDate, endDate, status, commitment: committed | aspirational)
- `keyResults` (goalId, title, start/target/current, weight)
- `milestones` (goalId, title, dueDate, doneAt)
- `tasks` (areaId, goalId, keyResultId, parentTaskId, title, notes, status, priority, doOn, dueAt, estimateMin, rrule, reminderAt, completedAt, sortKey)
- `habits` (areaId, goalId, title, kind: yesno | count | duration | negative, target, schedule, cue, archivedAt) and `habitLogs` (habitId, day, value, status: done | skipped | missed)
- `metrics` (name, unit, valueType, aggregation, target) and `metricEntries` (metricId, at, value, source)
- `dailyEntries` (day, mood, energy, sleepMinutes, line, photoId, journalNodeId)
- `nodes` (parentId, kind: folder | page | image | file | gallery, title, contentJson, contentText, sortKey, icon, isSystem)
- `attachments` (nodeId, blob, thumbBlob, mime, size, width, height, takenAt, caption)
- `links` (fromType, fromId, toType, toId) for backlinks; `tags` and `taggings`
- `homeWidgets` (kind: today | goals | calendar | review | progress | sleep | finance | vision | assistant | steps | pinned, size: S | M | L, sortKey, hidden, refType, refId for pinned items)
- `profile` (single row: displayName, quote, gender, birthday, pronouns, occupation, city, email, phone, photoAttachmentId, customFields[], visibility: { field: shown | blurred })
- `reviews` (period: day | week | month | quarter | year, periodStart, answers, autoSummary, completedAt)
- `calendars` (name, color, source: local | ics, url for subscribed links, readOnly, visible, lastSyncedAt); every space has a local Personal calendar
- `events` (calendarId, source, uid + recurrenceId from iCalendar so re-imports update in place, title, start, end, allDay, readOnly, location, notes); timed events in UTC ISO, all-day events as local days with an exclusive end. Time blocks are tasks with `doOn` + `time`, lasting `estimateMin` (30 min if unset)
- Modules later: `transactions`, `budgets`, `workouts`, `visionCards`, `assistantChats`

## Pace rules (src/domain)

- expected% = clamp((today − start) ÷ (end − start)) × 100
- On pace if progress ≥ expected − 3 points; otherwise "Behind", with a plain sentence ("Behind by about 2 weeks", "$1,600 behind pace").
- Progress methods: task count, weighted tasks, metric ((current − start) ÷ (target − start)), key-result average, milestones, habit consistency, manual, roll-up of child goals.
- Stretch (aspirational) OKRs: a 0.6–0.7 score counts as a win.

## Build phases

1. **Foundations:** Vite + React + TS app shell, tokens, fonts, sidebar + routing for every screen (empty states), light/dark/system theme, PWA offline, Dexie schema + repositories, seed data, JSON export/import.
2. **Core loop (MVP):** Today, Inbox & tasks (recurrence, natural-language capture), Habits (never-miss-twice), daily check-in, Goals (tree, pace, detail), Library (tree, BlockNote, images, backlinks, search), Weekly review, Progress (year in pixels, heatmap, wheel of life).
3. **Depth:** monthly/quarterly/yearly reviews, OKRs, custom metrics, Calendar (ICS import, time blocks), Vision board, "on this day".
4. **Privacy & data:** app lock, end-to-end encryption, automatic backups, Markdown + images export, sync between devices.
5. **Modules:** Finance, Health (phone companion app), Assistant (on-device first).

Success test after phase 2: used daily for 30 days and 4 weekly reviews completed.

## Accounts and sync

Optional. An account keeps one person's data on all their devices; each account is private to its owner. Rows sync by last write wins, and rows that mean one thing (a day's entry, a journal folder) merge. The server can read synced data: it's encrypted in transit, not end to end. A device holds one account's data at a time, and another account signing in replaces it after a warning. Deployment is in `docs/DEPLOY.md`.
