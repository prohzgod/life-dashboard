# Backend and Device Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anyone can create an account with its own private data and see it on any of their devices, while the app keeps working fully offline.

**Architecture:** IndexedDB stays the copy every screen reads and writes. A sync engine in `src/data/sync/` pushes changed rows to a NestJS API and pulls other devices' rows, which `useLiveQuery` then shows on its own. Postgres stores each row as JSONB in one `records` table, so a new app field needs no server migration. Files go straight between the browser and R2 through presigned URLs.

**Tech Stack:** NestJS 11, Drizzle ORM + `pg`, Neon Postgres, Cloudflare R2 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`), argon2, `@nestjs/throttler`, zod, PGlite (tests and e2e only). Hosting: Vercel (app), Render (API), Neon, R2.

**Spec:** The decisions below, agreed in conversation on 2026-11-02. There is no separate spec file.

## Decisions

| Topic | Decision |
|---|---|
| Who can read data | The server can. There is no end-to-end encryption of synced rows |
| In transit | TLS everywhere: browser to Vercel, Vercel to Render, API to Neon (`sslmode=require`), browser to R2 |
| At rest | Whatever Neon and R2 provide by default. The encrypted backup feature stays as it is |
| Users | Open sign-up. Each account has its own data and never sees another's. The app still shows one person's data at a time, with no shared spaces |
| Login | Email and password (argon2id), giving an opaque session token in an httpOnly cookie, stored hashed |
| Domains | Vercel rewrites `/api/*` to Render, so the app and API share an origin. No CORS, no third-party cookies |
| Conflicts | Only possible between one account's own devices. Last write wins per row, on `updatedAt`, with no conflict screen and no saved history |
| Sync order | A server sequence number, never client time |
| Same-thing duplicates | Rows with the same natural key merge; the lowest ULID wins on every device |
| Switching accounts on a device | A device holds one account's data. Another account signing in replaces it, after a warning, and never merges or uploads it |
| Storage limit | 1 GB of files per account (`USER_FILE_QUOTA_BYTES`), so open sign-up can't run up the R2 bill |

**Not in this plan:** page history, realtime push, email verification, account deletion, purging soft-deleted R2 files, password reset by email, syncing `meta` (device settings stay per device).

## Global Constraints

- The app must load and work with no network and with no account. Sync is opt-in, and nothing about signing out loses data on the device unless the person asks.
- Components never call Dexie or the API directly. All of it lives in `src/data/`; pure logic lives in `src/domain/` with unit tests.
- Every string is in `src/i18n/en/*.ts` and `src/i18n/vi/*.ts`, Vietnamese in sentence case using "bạn". No emoji. Copy is plain and kind.
- Timestamps are UTC ISO strings. IDs are client ULIDs. Changing a Dexie index means adding `version(10)`, never editing an old version.
- UI follows Glass v2 and tokens, checked at 390, 834, 1280 and 1440 wide on dawn, photo and night.
- Run `npm run lint`, `npm run typecheck` and `npm test` before each commit.

## Review Focus

1. **A device whose clock is wrong.** A clock ahead must not make that device win forever: the server clamps `updatedAt` to its own time plus 5 minutes (Task 4).
2. **The same day edited offline on two devices.** Each creates its own daily entry, journal page or habit log. They must end as one row on both devices, not two (Task 8).
3. **A new device, or restoring a backup while signed in.** A new device must not add a second set of seeded areas and goals (Task 9). A restored backup must beat newer server rows, and rows missing from the file must not come back (Task 9).
4. **The connection dies mid-sync, or Render is asleep.** Pushing again must be harmless and nothing may be marked clean without a reply (Task 4, Task 7). A cold start can take about a minute, so requests wait up to 90 seconds and the app stays usable (Task 7).
5. **Two accounts on one device.** Account B signing in where account A's data sits must never upload A's rows into B or show them to B (Task 9). **A session that expires:** Unsynced work stays on the device and the app asks you to sign in again, with no error loop (Task 7, Task 11).

---

### Task 0: Commit the outstanding work

The dashboard layout, scrollbars, `[[` menus, More dropdown and animation work are uncommitted. Sync must start from a clean tree. This needs the person's go-ahead.

- [ ] **Step 1:** Run `npm run lint && npm run typecheck && npm test`. Expected: all pass.
- [ ] **Step 2:** Commit the five changes as separate commits. Leave `.claude/settings.json` and `.hallmark/` out.
- [ ] **Step 3:** `git checkout -b backend-sync`.

### Task 1: Workspaces and the shared contract

**Files:**
- Create: `shared/package.json`, `shared/src/index.ts`, `shared/src/sync.ts`, `api/package.json`, `api/tsconfig.json`, `api/vitest.config.ts`
- Modify: `package.json` (add `"workspaces": ["shared", "api"]`, scripts `api:dev`, `api:test`), `tsconfig.app.json` and `vite.config.ts` (alias `@shared`), `eslint.config.js`
- Test: `src/data/syncTables.test.ts`

The app stays at the repo root so the Vercel setup doesn't change.

**Interfaces:**
- Produces, in `shared/src/sync.ts`:

```ts
export const SYNC_TABLES = [/* same names as dataTableNames in src/data/db.ts */] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

/** A row on the wire. `payload` is the whole record minus `dirty` and any Blob fields. */
export type SyncRow = { table: SyncTable; id: string; updatedAt: string; deletedAt: string | null; payload: Record<string, unknown> };

export type PushRequest = { rows: SyncRow[] };
/** `winners`: rows where the server's version is the one to keep, because yours lost or its time was corrected. */
export type PushResponse = { accepted: string[]; winners: SyncRow[] };
export type PullResponse = { rows: SyncRow[]; cursor: number; hasMore: boolean };

export type FileKind = 'original' | 'thumb';
export type PresignRequest = { items: { attachmentId: string; kind: FileKind; mime: string; size: number; mode: 'put' | 'get' }[] };
export type PresignResponse = { items: { attachmentId: string; kind: FileKind; url: string }[] };

export const MAX_BATCH_BYTES = 1_000_000;
export const MAX_ROW_BYTES = 4_000_000;
export const MAX_FILE_BYTES = 50_000_000;
export const PULL_PAGE_SIZE = 500;
```

- [ ] **Step 1: Write the failing test** `SYNC_TABLES matches the app's data tables`: `expect([...SYNC_TABLES].sort()).toEqual([...dataTableNames].sort())`.
- [ ] **Step 2:** Run `npx vitest run src/data/syncTables.test.ts`. Expected: FAIL, cannot resolve `@shared`.
- [ ] **Step 3:** Add the workspaces, alias and contract. Keep `test.include` in the root `vite.config.ts` as `src/**`, so API tests only run through `api:test`.
- [ ] **Step 4:** Run the test, `npm run typecheck`, and `npm run build`. Expected: all pass.
- [ ] **Step 5:** Commit: `Workspaces and the sync contract`.

### Task 2: API skeleton, database and deploy files

**Files:**
- Create: `api/src/main.ts`, `api/src/app.module.ts`, `api/src/health.controller.ts`, `api/src/db/schema.ts`, `api/src/db/db.module.ts`, `api/src/db/migrate.ts`, `api/drizzle/*`, `api/test/harness.ts`, `api/test/health.test.ts`, `render.yaml`, `api/.env.example`

**Interfaces:**
- Produces: tables `users(id, email unique, password_hash, created_at)`; `sessions(token_hash pk, user_id, device_name, created_at, last_seen_at)`; `records(user_id, table_name, id, payload jsonb, updated_at timestamptz, deleted_at timestamptz, seq bigint, primary key (user_id, table_name, id))` with an index on `(user_id, seq)`; sequence `records_seq`.
- Produces: `DB` injection token; `createTestApp(): Promise<{ app, db, close }>` in `api/test/harness.ts`, backed by PGlite. `DB_DRIVER=pglite` selects it at runtime too, for e2e.
- Global route prefix `api`. Env: `DATABASE_URL` (Neon pooled, `sslmode=require`), `USER_FILE_QUOTA_BYTES`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `PORT`, `DB_DRIVER`, `FILES_DRIVER`.

- [ ] **Step 1: Write the failing test** `GET /api/health returns ok without signing in`: status 200, body `{ status: 'ok' }`, and it runs one `select 1`.
- [ ] **Step 2:** Run `npm run api:test`. Expected: FAIL.
- [ ] **Step 3:** Build the module, schema and first migration. `main.ts` uses `helmet`, a JSON body limit of 5 MB, and `trust proxy` of 1 hop for Vercel's forwarding. `render.yaml` runs one web service: build `npm ci && npm run build -w shared -w api`, start `node api/dist/db/migrate.js && node api/dist/main.js`, health check `/api/health`, secrets marked `sync: false`.
- [ ] **Step 4:** Run `npm run api:test`. Expected: PASS.
- [ ] **Step 5:** Commit: `NestJS API skeleton with Postgres schema and Render blueprint`.

### Task 3: Accounts and sign in

**Files:**
- Create: `api/src/auth/auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `session.guard.ts`, `api/test/auth.test.ts`

**Interfaces:**
- Produces: `POST /api/auth/register {email, password, deviceName}`, `POST /api/auth/login {email, password, deviceName}`, `POST /api/auth/logout`, `GET /api/auth/me` returning `{ email }`. `SessionGuard` sets `request.userId`.
- Cookie: `ld_session`, 32 random bytes, stored as SHA-256 only, `HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=7776000` (90 days, renewed on use, at most once a day). `Secure` is off only when `NODE_ENV=test`.

- [ ] **Step 1: Write the failing tests:**
  - `anyone can register, once per email`: a second email works; the same email in another case gets 409.
  - `a new account sees none of another's rows or sessions`.
  - `rejects a wrong password with the same reply as an unknown email`: both 401 with equal bodies.
  - `stores the password and token hashed`: `password_hash` starts with `$argon2id$`, and `sessions.token_hash` differs from the cookie value.
  - `logout ends the session`: `GET /api/auth/me` then gives 401.
  - `limits login attempts`: the 11th attempt within a minute gets 429.
- [ ] **Step 2:** Run `npm run api:test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Password minimum is 10 characters. Validate bodies with zod. Throttle `login` and `register` to 10 a minute per IP.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `Single-account sign in with hashed session cookies`.

### Task 4: Push and pull

**Files:**
- Create: `api/src/sync/sync.module.ts`, `sync.controller.ts`, `sync.service.ts`, `api/test/sync.test.ts`

**Interfaces:**
- Consumes: `SessionGuard`; contract types from Task 1.
- Produces: `POST /api/sync/push` (`PushRequest` to `PushResponse`), `GET /api/sync/pull?cursor=<n>` (`PullResponse`). Both need a session.

Each push runs in one transaction that starts with `pg_advisory_xact_lock(hashtext(userId))`. This keeps sequence numbers in commit order, so a pull can't step past a row that hasn't committed yet.

- [ ] **Step 1: Write the failing tests:**
  - `requires a session`: 401 for both routes.
  - `a newer row replaces an older one and gets a new seq`.
  - `an older row loses and comes back in winners`: `accepted` lacks it, `winners` holds the server's row. This matters because the client's cursor may already be past that row.
  - `pushing the same row twice changes nothing`: `seq` is unchanged and no error.
  - `a soft delete travels like any other change`: pull returns the row with `deletedAt` set.
  - `clamps a clock that runs ahead`: a row dated 1 day ahead is stored at about server time and returned in `winners`.
  - `keeps a row dated within 5 minutes ahead as sent`.
  - `pull pages in seq order`: 501 rows give `hasMore: true` then `false`, with no repeats.
  - `one user cannot read another's rows`: insert a second user directly; pull as the first returns none of theirs.
  - `rejects an unknown table and a row over MAX_ROW_BYTES`: 400 and 413.
- [ ] **Step 2:** Run `npm run api:test`. Expected: FAIL.
- [ ] **Step 3:** Implement. A tie on `updatedAt` keeps the server's row. On each accepted write, set the row's `payload.updatedAt` to the stored value.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `Sync push and pull, ordered by a server sequence`.

### Task 5: File links

**Files:**
- Create: `api/src/files/files.module.ts`, `files.controller.ts`, `file-store.ts`, `r2-file-store.ts`, `memory-file-store.ts`, `api/test/files.test.ts`

**Interfaces:**
- Produces: `POST /api/files/presign` (`PresignRequest` to `PresignResponse`), and `FileStore { presignPut(key, mime, size): Promise<string>; presignGet(key): Promise<string> }`.
- Object key: `users/{userId}/attachments/{attachmentId}/{kind}`. Links last 15 minutes. `FILES_DRIVER=memory` serves bytes from the API itself, for e2e.

- [ ] **Step 1: Write the failing tests:**
  - `builds keys only under the signed-in user`: use a fake `FileStore` and assert the key. An `attachmentId` containing `/` or `..` gets 400.
  - `refuses a file over MAX_FILE_BYTES`: 413.
  - `refuses an upload past the account's quota`: live `attachments` payload sizes plus the new size over `USER_FILE_QUOTA_BYTES` gets 413, and another account is unaffected.
  - `a get link can't reach another account's file`: the key always comes from the session, never the request.
  - `requires a session`: 401.
- [ ] **Step 2:** Run `npm run api:test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Point the S3 client at `https://<account>.r2.cloudflarestorage.com`, region `auto`, with `requestChecksumCalculation: 'WHEN_REQUIRED'`, because the SDK's default checksum parameters break R2 presigned PUTs. Sign `ContentType` and `ContentLength`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `Presigned R2 links for attachments`.

### Task 6: Track what changed on this device

**Files:**
- Modify: `src/data/db.ts` (`version(10)`), `src/data/backup.ts`, `src/data/types.ts`
- Create: `src/data/sync/dirty.ts`, `src/data/sync/dirty.test.ts`

A flag on the row itself, set by Dexie hooks, joins the writer's transaction automatically and catches the direct writes in `seed.ts`, `calendar.ts` and `library.ts`.

**Interfaces:**
- Produces: `dirty: 0 | 1` on every synced row, indexed. New tables `syncPending: 'id'` (pulled attachment rows waiting for their files) and `syncFiles: 'id'` (uploads still to do). `installDirtyTracking(db)`: `creating` sets `dirty = 1` unless the row already has a `dirty`; `updating` adds `{ dirty: 1 }` unless the change itself sets `dirty`. `listDirty(table, limit)`, and `markClean(table, id, updatedAt)`, which only clears when `updatedAt` still matches.

- [ ] **Step 1: Write the failing tests:**
  - `a new row is dirty`, `an edit makes a clean row dirty`, `a soft delete makes it dirty`.
  - `a row written with dirty: 0 stays clean` (how pulled rows arrive).
  - `markClean leaves a row edited since the push dirty`.
  - `upgrading from version 9 keeps rows and marks them dirty`.
  - `exports leave dirty out`: `exportAll()` rows have no `dirty`; `importReplacingAll` ignores one in a file.
- [ ] **Step 2:** Run `npx vitest run src/data/sync/dirty.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. Register hooks in the `LifeDb` constructor on `dataTableNames` only, never on `meta`.
- [ ] **Step 4:** Run `npm test`. Expected: all pass. Fix any existing test that compared a stored row exactly by leaving `dirty` out of the comparison.
- [ ] **Step 5:** Commit: `Mark rows that still need syncing`.

### Task 7: The sync engine

**Files:**
- Create: `src/domain/sync.ts`, `src/domain/sync.test.ts`, `src/data/sync/api.ts`, `src/data/sync/engine.ts`, `src/data/sync/engine.test.ts`, `src/data/sync/state.ts`

**Interfaces:**
- Produces: `toWireRow(table, record): SyncRow` (drops `dirty` and Blob fields); `batchByBytes(rows, MAX_BATCH_BYTES): SyncRow[][]`; `decideApply(local, incoming): 'apply' | 'keep'`.
- Produces: `syncNow(): Promise<SyncResult>`, `SyncResult = { status: 'done' | 'offline' | 'signedOut' | 'failed'; pushed: number; pulled: number }`.
- Produces: `useSyncStatus()` data in `state.ts`: `{ state: 'off' | 'syncing' | 'synced' | 'offline' | 'needsSignIn' | 'failed'; lastAt: string | null; unsynced: number }`.
- `meta` keys: `sync.accountId`, `sync.cursor`, `sync.tablesHash`, `sync.lastAt`.

Order: push all dirty rows in batches, then pull pages until `hasMore` is false. `decideApply` keeps the local row when it's dirty and returns `keep`; the next push settles it. Pulled rows are written with `dirty: 0` after running the same `normalizeTask`, `normalizeNode`, `normalizeGoal`, `normalizeEvent` and `normalizeMetric` that import uses. `winners` from a push are applied the same way, ignoring `decideApply`, since those rows have already lost.

- [ ] **Step 1: Write the failing tests** with a fake API:
  - `pushes dirty rows and marks them clean only after the reply`.
  - `a failed push leaves rows dirty and the cursor alone`: the fake rejects; `dirty` stays 1 and `status` is `'failed'`.
  - `a pulled row never makes the row dirty`, so it isn't pushed back.
  - `a dirty local row isn't overwritten by a pull`.
  - `applies winners over a dirty row and clears it`.
  - `a row over MAX_ROW_BYTES is skipped and reported, and the rest still sync`.
  - `a 401 stops, keeps everything dirty, and reports needsSignIn`.
  - `waits up to 90 seconds for a sleeping server`: the abort signal uses 90 000 ms.
  - `normalizes a pulled row from an older device`: a task without `time` arrives with `time: null`.
  - `re-pulls from 0 when SYNC_TABLES changes`: a stored hash that differs resets `sync.cursor`.
  - `runs one sync at a time`: two `syncNow()` calls make one push.
- [ ] **Step 2:** Run `npx vitest run src/domain/sync.test.ts src/data/sync/engine.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. Use `navigator.locks` where it exists so only one tab syncs, and an in-memory guard otherwise.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `Sync engine: push, pull, and last write wins`.

### Task 8: Merge rows that mean the same thing

Two offline devices can each create "today's" entry under different IDs, and every device runs the `ensure*` seeds. Lookups like `checkIns.ts` assume one row per day, so duplicates would hide data.

**Files:**
- Create: `src/domain/syncDuplicates.ts`, `src/domain/syncDuplicates.test.ts`, `src/data/sync/duplicates.ts`, `src/data/sync/duplicates.test.ts`
- Modify: `src/data/sync/engine.ts`

**Interfaces:**
- Produces: `NATURAL_KEYS: Partial<Record<SyncTable, { key(row): string | null; references: { table: SyncTable; field: string }[] }>>`; `pickWinner(rows): { winner; losers }` (lowest ULID); `resolveDuplicates(): Promise<number>`, which runs after each pull, in one transaction.

Keys and references (confirm the `ensure*` rows while writing the map, reading `ensureCalendars`, `ensureBudgets`, `ensureHomeWidgets`):

| Table | Key | Repoint on merge |
|---|---|---|
| `nodes` | `systemKey` | `nodes.parentId`, `attachments.nodeId`, `dailyEntries.journalNodeId` |
| `metrics` | `systemKey` | `metricEntries.metricId` |
| `dailyEntries` | `day` | none |
| `habitLogs` | `habitId + day` | none |
| `reviews` | `period + periodStart` | none |
| `profile` | constant, one row | none |
| `calendars` | the seeded Personal calendar | `events.calendarId` |
| `budgets` | seeded category | `transactions.categoryId` |
| `homeWidgets` | `kind`, except `pinned` | none |

- [ ] **Step 1: Write the failing tests:**
  - `picks the same winner in any order` (domain).
  - `merges two entries for one day into the lowest ID`: one live row remains; the other is soft-deleted.
  - `keeps the newer content`: when the loser is newer, its user fields move to the winner and the winner's `updatedAt` is that later time.
  - `repoints children`: pages under a losing `journal:2026` folder move to the winner.
  - `leaves ordinary rows alone`: two tasks with one title both stay.
  - `two devices end up the same`: run the resolver on both orders of the same rows and compare live rows.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. Merges are normal writes, so they go out dirty and other devices converge.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `Merge same-day and seeded rows after a pull`.

### Task 9: First sign-in, and restoring a backup

**Files:**
- Create: `src/data/sync/link.ts`, `src/data/sync/link.test.ts`, `src/domain/syncLink.ts`, `src/domain/syncLink.test.ts`
- Modify: `src/data/backup.ts`, `src/data/seed.ts` (only if a marker is missing)

**Interfaces:**
- Produces: `linkAction({ serverHasData, deviceHasOwnData, deviceAccountId, accountId }): 'upload' | 'useAccount' | 'ask' | 'replaceOtherAccount'`; `hasOwnData(): Promise<boolean>`, true when any row's `updatedAt` is over 60 seconds after `meta.seededAt`, ignoring automatic `ensure*` rows; `linkDevice(choice?: 'useAccount' | 'combine'): Promise<void>`; `unlinkDevice({ removeData: boolean }): Promise<void>`.

- [ ] **Step 1: Write the failing tests:**
  - `another account's data is never uploaded`: `deviceAccountId` set and different gives `replaceOtherAccount` first, even with an empty server. After it, the server received none of those rows and none remain on the device; the account starts from fresh seeds or its own data.
  - `the same account signing back in carries on`: same `deviceAccountId` keeps data and cursor, with no prompt.
  - `signing out pushes first and warns if it can't`: unsynced rows are reported before removal.
  - `linkAction`: no server data gives `upload`; server data with an untouched device gives `useAccount`; server data with own data gives `ask`.
  - `a new device doesn't add a second set of seeded rows`: after `useAccount`, row counts equal the server's and the seeded areas are gone.
  - `useAccount replaces only once everything has downloaded`: a failure on page 2 leaves local data untouched.
  - `combine keeps both and dedupes`: both sets are present and natural keys are merged.
  - `a restored backup beats newer server rows`: when linked, imported rows get `updatedAt = now`.
  - `rows missing from a restored backup don't come back`: when linked, rows present before import and absent from the file stay as soft-deleted rows.
  - `import when not linked keeps original timestamps`, matching today's behaviour.
  - `signing out keeps the data unless asked`: `removeData: false` leaves rows and clears `sync.*`; `true` deletes the database.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. `useAccount` pulls all pages into memory first, then clears and writes in one transaction.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `First sign-in on a device, and restores that survive sync`.

### Task 10: Photos and files

**Files:**
- Create: `src/data/sync/files.ts`, `src/data/sync/files.test.ts`
- Modify: `src/data/sync/engine.ts`, `src/domain/sync.ts`

Screens read `attachment.blob` as always there, so `Attachment` keeps its type. A pulled attachment waits in `syncPending` and only reaches `attachments` once its bytes are down. Its row is pushed only after its upload succeeds, so another device never sees a row with no file behind it.

**Interfaces:**
- Produces: `uploadPendingFiles(): Promise<void>`, `downloadPendingFiles(): Promise<void>`. On the wire, attachment payloads carry `hasThumb: boolean` and no blobs.

- [ ] **Step 1: Write the failing tests** with a fake API and `fetch`:
  - `uploads before pushing the row`: call order is PUT, PUT (thumb), then push.
  - `a failed upload holds the row back and retries next sync`.
  - `downloads, then adds the attachment`: `attachments.get(id).blob` has the right size and type.
  - `a failed download leaves it pending, and the rest of the sync still finishes`.
  - `a file over MAX_FILE_BYTES stays on this device and is reported`: the row isn't pushed.
  - `a soft-deleted attachment syncs without any file transfer`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement, at most 3 transfers at once. Downloads run after the pull so they can't hold up rows.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `Sync photos and files through R2`.

### Task 11: Screens and honest copy

**Files:**
- Create: `src/screens/settings/SyncSettings.tsx`, `SyncSettings.module.css`, `SyncSettings.test.tsx`, `src/data/sync/useAutoSync.ts`, `src/i18n/en/sync.ts`, `src/i18n/vi/sync.ts`
- Modify: `src/screens/settings/SettingsPage.tsx` (tab `sync`), `src/screens/profile/ProfilePage.tsx` (a row for phones), `src/components/shell/AppShell.tsx`, `src/components/shell/TopNav.tsx`, `src/screens/home/HomePage.tsx`, i18n index, `src/i18n/*/settings.ts`, the privacy and library strings that claim data stays on the device

**Interfaces:**
- Consumes: `syncNow`, `useSyncStatus`, `linkDevice`, `unlinkDevice`, plus `signIn`, `register` and `signOut` added to `src/data/sync/api.ts`.
- `useAutoSync()` runs in `Shell`: on start, on `online`, when the tab becomes visible, 2 seconds after the last local write, and every 60 seconds while visible. Backs off to 5 minutes after failures.

- [ ] **Step 1: Write the failing tests:**
  - `shows a sign-in form when signed out, with the app fully usable`.
  - `asks what to do when both have data`: shows both choices, and no data changes until one is picked.
  - `says what each status means`: synced with a time, offline, needs sign-in, and failed with a retry button.
  - `sign out offers removing this account's data from the device, or keeping it`.
  - `warns before another account replaces this device's data`: names the unsynced count, and changes nothing until confirmed.
  - `tells the truth about the server`: the sync screen says the server can read synced data, in both languages.
  - `offline and "saved on this device" wording only changes once signed in`: signed out still reads as today.
- [ ] **Step 2:** Run `npx vitest run src/screens/settings/SyncSettings.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Implement. Copy guide: "Synced 2 minutes ago", "Saved here. It will sync when you're back online.", "Sign in again to keep syncing. Your changes are safe on this device.", "Synced data is sent over an encrypted connection. The server can read it, so don't rely on this for secrets." Use `Segmented`, `Card`, `Dialog`, `Toast`; add nothing to the kit.
- [ ] **Step 4:** Run `npm test`. Expected: all pass. Check the screen at all four widths on dawn, photo and night.
- [ ] **Step 5:** Commit: `Account and sync screen, with copy that matches reality`.

### Task 12: Deploy and prove it across two devices

**Files:**
- Create: `vercel.json`, `e2e/sync.spec.ts`, `docs/DEPLOY.md`
- Modify: `vite.config.ts` (dev proxy, `navigateFallbackDenylist: [/^\/api\//]`), `playwright.config.ts`, `CLAUDE.md`, `docs/PRODUCT.md`

`vercel.json` rewrites `/api/:path*` to `https://<render-service>.onrender.com/api/:path*` first, then everything else to `/index.html`, which also fixes deep links.

- [ ] **Step 1: Write the failing e2e** in `e2e/sync.spec.ts`, against the API with `DB_DRIVER=pglite` and `FILES_DRIVER=memory`, using two browser contexts as two devices:
  - `a task added on one device appears on the other`.
  - `the same day checked in on both becomes one entry`.
  - `a photo added on one shows on the other`.
  - `a device offline keeps working and catches up`: `context.setOffline(true)`, add a task, go online, and the other device gets it.
  - `two accounts stay apart`: a task added under one account never appears for another, on the same browser after switching.
  - `refreshing a deep link serves the app, and /api isn't caught by the service worker`.
- [ ] **Step 2:** Run `npx playwright test e2e/sync.spec.ts`. Expected: FAIL.
- [ ] **Step 3:** Add the config so all five pass. Run the whole suite. Expected: all pass, apart from the known flaky Library drag test.
- [ ] **Step 4:** Write `docs/DEPLOY.md`: create the Neon project (pooled URL), the private R2 bucket with CORS for GET and PUT from the Vercel origin, the Render blueprint and env vars, the Vercel project. Update the `CLAUDE.md` stack section with the API, its commands and the rule that server rows are JSONB. Update `docs/PRODUCT.md`.
- [ ] **Step 5:** With the person, who owns these accounts: deploy, register, and sync a real phone and laptop. Check `/api/health`, the `Set-Cookie` flags through the Vercel rewrite, a large Library page push through the rewrite (confirm Vercel's body limit against `MAX_BATCH_BYTES`), and a cold start on Render.
- [ ] **Step 6:** Commit: `Deploy config, two-device e2e and docs`.
