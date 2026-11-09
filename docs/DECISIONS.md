# Decisions

Choices that shape the product, and why. Newest first. When a decision changes, add a new entry and mark the old one as replaced.

## 001: Local-only for now, with backend and sync kept but switched off

- **Date:** 2026-11-09
- **Status:** Active

### Context

The app is local-first and already works with no account or network. An optional backend was built for sync between devices: NestJS on Render, Neon Postgres and Cloudflare R2. It's more to run and pay for than one person's data needs today, and synced data is readable by the server because it isn't end-to-end encrypted.

We also asked whether a JSON, Markdown or HTML file could replace the database.

### Decision

1. **The database stays IndexedDB (Dexie), on the device.** Images and files stay on the device as Blobs.
2. **A file is the backup and the way between devices, not the live database.** You export on one device and import on another.
3. **`server/` and `shared/` stay in the repo, unused.** Accounts and sync are switched off with one build flag.

### Why a file isn't the live database

- A web app can't quietly write to a file on disk. The File System Access API only works in Chromium browsers, not in Safari on iPhone or in Firefox.
- Every small change would rewrite the whole file, and screens would lose indexed queries and live updates (`useLiveQuery`).
- Images would have to be stored as text inside the file, or in a folder the browser can't reliably reach.

### What this means

- There's no automatic sync. Moving data between devices is a manual export and import.
- The backup file can become the only other copy of your data, so backups matter more.
- Sign-in, the Account and sync settings tab and its Profile row are hidden. `/settings/sync` redirects to Privacy.
- The app makes no calls to `/api` while the flag is off.
- A device that had already signed in keeps its data but stops syncing.

### What is still in place

- `server/`, `shared/`, `src/data/sync/`, `render.yaml`, the `/api` rewrite in `vercel.json` and `docs/DEPLOY.md`.
- Rows are still marked `dirty` on every change, and every record keeps `updatedAt` and `deletedAt`.
- Tests: `npm run server:test` and the unit tests still cover sync. `npm run test:e2e` builds with the flag on, so `e2e/sync.spec.ts` keeps running.
- New tables must still join `SYNC_TABLES` and `dataTableNames`, so sync can come back without gaps.

### How to turn it back on

1. Check that Render, Neon and R2 are set up, following `docs/DEPLOY.md`.
2. Set `VITE_SYNC_ENABLED=true` in the Vercel project and redeploy. It's read at build time.
3. Run the "Check it on the real thing" list in `docs/DEPLOY.md`.

### Revisit when

- Manual export and import becomes a chore, for example when you use two devices every day.
- You want the backend to come back with end-to-end encryption.

### Follow-up work (not done yet)

- [ ] **Backups as ZIP:** `data.json` plus an `images/` folder, still accepting old JSON files. Today all images go into one text string in memory, which is likely to fail on a phone with a large library.
- [ ] **Keep data on the device:** asking the browser to keep data is a switch in Settings › Privacy that's off until you turn it on. Ask automatically, because the browser may otherwise clear the data when space runs low.
- [ ] **Backup reminder:** for example "Last backup 12 days ago".

### Still to decide

- **Back-and-forth between two devices:** import currently replaces everything on the receiving device, which suits moving to a new device. If you'll switch back and forth, import should merge by the newest `updatedAt` instead.
