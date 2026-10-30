# Life Dashboard

A personal life dashboard: goals, tasks, habits, a daily check-in, reviews (day / week / month / year) and a Library of notes and images in a tree. **Offline-first and local-first**, for one person: there are no shared spaces. Optional modules: Calendar, Finance, Health, AI assistant, Vision board, plus privacy/encryption and backup.

Read these before starting any task:
- `docs/PRODUCT.md`: scope, screens, data model, build phases.
- `docs/DESIGN.md`: the Grid visual rules (white paper, blue-black ink, ultramarine fields, one Swiss red mark; very round corners, a floating sidebar and tab bar, sentence case).
- `design/TOKENS.md`: every design token (colors light/dark, fonts, type scale, spacing, radius, shadows, layout sizes, motion). Import `design/tokens.css` once; use `design/tokens.ts` for charts and logic; `design/tokens.json` is the source of truth.
- `design/README.md`: there are no mockups any more; the running app is the reference. Build new screens from the rules in `docs/DESIGN.md` and the patterns of the existing screens, and check them at 1440×960 and 390×844 in both themes.

## Stack (decided)

- React 18 + TypeScript (strict) + Vite. Installable PWA via `vite-plugin-pwa`; the app must load and work with no network.
- Routing: React Router.
- Local data: **Dexie (IndexedDB)** with `dexie-react-hooks` (`useLiveQuery`). Images and attachments are stored as Blobs in IndexedDB, with thumbnails generated on the client.
- All data access goes through repository modules in `src/data/` (never call Dexie from components), so a sync engine and encryption can be added later without touching the UI.
- Rich text: BlockNote. Tree view: react-arborist. Charts: Apache ECharts (`echarts-for-react`).
- Styling: CSS Modules + the CSS variables in `design/tokens.css`. No Tailwind, no UI kit, no hard-coded hex colors in components.
- Tests: Vitest + Testing Library for logic and components; Playwright for main flows.
- Package manager: npm.

## Rules

- Every color, radius, shadow, space and font comes from a token (`var(--surface)`, `var(--radius-lg)` …). If a token is missing, add it to `design/tokens.json` and `design/tokens.css`, don't inline a value.
- Every screen must work in both themes (`data-theme="light"` / `"dark"` on `<html>`, plus system preference).
- IDs are ULIDs created on the client. Timestamps are UTC ISO strings; habit and journal days are local `YYYY-MM-DD` strings.
- Every record has `createdAt`, `updatedAt` and `deletedAt` (soft delete), so sync can be added later. There is no `spaceId`: the app holds one person's data.
- The tree uses `parentId` + a fractional-index `sortKey` (package `fractional-indexing`), so a drag-and-drop move updates one row.
- Progress and pace calculations live in `src/domain/` as pure, unit-tested functions.
- Accessibility: real buttons, links and inputs; visible focus (2px `--primary` outline, 2px offset); 44px touch targets on mobile; text contrast 4.5:1.
- Copy is plain, kind and second person ("Rolled over from yesterday", not "OVERDUE!"). No emoji in the UI.
- Keep commits small and run `npm run lint`, `npm run typecheck` and `npm test` before pushing.

## Commands (create these in the first task)

- `npm run dev`, `npm run build`, `npm run preview`
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`
