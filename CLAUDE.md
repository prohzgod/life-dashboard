# Life Dashboard

A personal life dashboard: goals, tasks, habits, a daily check-in, reviews (day / week / month / year) and a Library of notes and images in a tree. **Offline-first and local-first**: each account holds one person's data, with no shared spaces, and the app works fully with no account or network. Optional modules: Calendar, Finance, Health, AI assistant, Vision board, plus privacy/encryption and backup.

Read these before starting any task:
- `design/v2/README.md`: **Glass v2, the visual source of truth.** Frosted-glass cards on a gradient or photo background, a floating pill nav (≥768px) and a floating tab bar (<768px), one accent, Be Vietnam Pro. Its screenshots (`design/v2/screens/`) show how things look; its mockups (`design/v2/mockups/`) give exact sizes. Where it and an older doc disagree about looks, it wins.
- `docs/PRODUCT.md`: scope, screens, data model, build phases.
- `docs/DESIGN.md`: the earlier Grid rules. Layout, copy and accessibility rules still apply; colours, type and surfaces now come from Glass v2.
- `design/TOKENS.md`: every token. `design/tokens.css` holds the Glass v2 values plus the older token names (`--surface`, `--primary`, `--sunken` …) mapped onto them, so older screens follow the new look; prefer the Glass v2 names (`--glass`, `--glass-2`, `--well`, `--inverse`, `--accent`) in new code. Use `design/tokens.ts` for charts and logic.
- `docs/RESTYLE_PROMPTS.md`: the steps of the Glass v2 restyle.
- Theme is three attributes on `<html>`: `data-theme` (light|dark), `data-bg` (dawn|mist|photo|night) and `data-accent` (tangerine|butter|lime|lavender), set by `src/theme/appearance.ts` and, before first paint, by `index.html`. Night is always dark. Your own background photo is a Blob in `meta` (`src/data/appearance.ts`). Never hard-code a colour.
- Check new screens at 390, 834, 1280 and 1440 wide, on dawn, photo and night.

## Stack (decided)

- React 18 + TypeScript (strict) + Vite. Installable PWA via `vite-plugin-pwa`; the app must load and work with no network.
- Routing: React Router.
- Local data: **Dexie (IndexedDB)** with `dexie-react-hooks` (`useLiveQuery`). Images and attachments are stored as Blobs in IndexedDB, with thumbnails generated on the client.
- All data access goes through repository modules in `src/data/` (never call Dexie from components), so a sync engine and encryption can be added later without touching the UI.
- Rich text: BlockNote. Tree view: react-arborist. Charts: Apache ECharts (`echarts-for-react`).
- Styling: CSS Modules + the CSS variables in `design/tokens.css`. No Tailwind, no UI kit, no hard-coded hex colors in components.
- Tests: Vitest + Testing Library for logic and components; Playwright for main flows.
- Languages: Vietnamese (default) and English, with a small typed i18n layer in `src/i18n/` (no library). BlockNote uses its own `vi`/`en` dictionaries.
- Package manager: npm, with workspaces: the app at the root, `api/` and `shared/`.
- Backend (optional sync): NestJS on Render, Neon Postgres (Drizzle, hand-written SQL in `api/drizzle/`), Cloudflare R2. The contract lives in `shared/src/sync.ts`. Vercel rewrites `/api/*` to Render, so there's one origin. See `docs/DEPLOY.md`.
- Sync: IndexedDB stays the copy screens read. `src/data/sync/` pushes rows marked `dirty` and pulls others' by a server sequence; last write wins per row. Server rows are JSONB in one `records` table, so a new app field needs no migration, but a new table must join `SYNC_TABLES` and `dataTableNames`.

## Rules

- Every color, radius, shadow, space and font comes from a token (`var(--glass)`, `var(--radius-card)` …). If a token is missing, add it to `design/tokens.css` (and `design/tokens.ts` if code needs it), don't inline a value.
- Every screen must work in light and dark and on every background (`data-theme`, `data-bg`, `data-accent` on `<html>`). Glass surfaces: `--glass` + backdrop blur + 1px `--line` + `--radius-card`; inside a card use `--glass-2` or `--well`, never blur twice. One dark `--panel` per screen at most.
- IDs are ULIDs created on the client. Timestamps are UTC ISO strings; habit and journal days are local `YYYY-MM-DD` strings.
- Every record has `createdAt`, `updatedAt` and `deletedAt` (soft delete), so sync can be added later. There is no `spaceId`: each device holds one account's data, and every server query is scoped to the session's account, never to anything in the request.
- The tree uses `parentId` + a fractional-index `sortKey` (package `fractional-indexing`), so a drag-and-drop move updates one row.
- Progress and pace calculations live in `src/domain/` as pure, unit-tested functions.
- Accessibility: real buttons, links and inputs; visible focus (2px `--focus` outline, 2px offset); 44px touch targets; text contrast 4.5:1, also over the photo background.
- Copy is plain, kind and second person ("Rolled over from yesterday", not "OVERDUE!"). No emoji in the UI.
- No hard-coded UI text. Every string lives in `src/i18n/en/*.ts` and the matching `src/i18n/vi/*.ts` (typed as `Messages`, so a missing key fails typecheck). Components read it with `useT()`; formatters, domain and data code with `messages()`. Dates, numbers and money go through `src/lib/format.ts`, `src/lib/money.ts` or `intlLocale()`, never a hard-coded `'en-US'`. Vietnamese copy uses "bạn" and sentence case.
- Anything stored as text that the app later looks up (seeded names, the weekly review task) must match in either language: compare against `LOCALES.map((l) => messages(l)…)`, or store a key instead.
- Keep commits small and run `npm run lint`, `npm run typecheck` and `npm test` before pushing.

## Commands (create these in the first task)

- `npm run dev`, `npm run build`, `npm run preview`
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`
- `npm run api:dev`, `npm run api:test`, `npm run api:typecheck`
