import { MAX_BATCH_BYTES, MAX_ROW_BYTES, SYNC_TABLES, type SyncRow } from '@shared';
import { batchByBytes, decideApply, rowBytes, toWireRow } from '@/domain/sync';
import type { Attachment } from '../types';
import { db, normalizeEvent, normalizeGoal, normalizeMetric, normalizeNode, normalizeTask } from '../db';
import { resolveDuplicates } from './duplicates';
import { markAsPull } from './dirtyHooks';
import { countDirty, listDirty, markClean, type DirtyRow } from './dirty';
import { SyncAuthError, SyncRequestError, realApi, type SyncApi } from './api';
import { downloadPendingFiles, uploadFiles } from './files';
import { getMeta, META, setMeta } from './meta';
import { readSyncState, setSyncState } from './state';

export type SyncResult = { status: 'done' | 'offline' | 'signedOut' | 'failed'; pushed: number; pulled: number; skipped: number };

const TABLES_HASH = SYNC_TABLES.join(',');

const NORMALIZE: Partial<Record<SyncRow['table'], (row: never) => unknown>> = {
  tasks: normalizeTask,
  nodes: normalizeNode,
  goals: normalizeGoal,
  events: normalizeEvent,
  metrics: normalizeMetric,
};

const anyTable = (name: SyncRow['table']) => db[name] as unknown as import('dexie').Table<DirtyRow, string>;

function toLocal(row: SyncRow): DirtyRow {
  const local = { ...row.payload, id: row.id, updatedAt: row.updatedAt, deletedAt: row.deletedAt, dirty: 0 };
  const normalize = NORMALIZE[row.table];
  return (normalize ? normalize(local as never) : local) as DirtyRow;
}

/** Writes one row from the server, inside a pull transaction. `force` is for rows the server already chose over this device's. */
export async function writePulledRow(row: SyncRow, force: boolean): Promise<void> {
  const table = anyTable(row.table);
  const local = await table.get(row.id);
  if (!force && decideApply(local) === 'keep') return;
  if (row.table !== 'attachments') {
    await table.put(toLocal(row));
    return;
  }
  // Attachments come without their bytes. One already here keeps its own; a new one waits for its
  // files, because screens expect every attachment to have them.
  const incoming = toLocal(row) as DirtyRow & { hasThumb?: boolean };
  delete incoming.hasThumb;
  if (local) {
    const { blob, thumbBlob } = local as unknown as Attachment;
    await table.put({ ...incoming, blob, thumbBlob } as DirtyRow);
    await db.syncPending.delete(row.id);
  } else if (row.deletedAt !== null) {
    await db.syncPending.delete(row.id);
  } else {
    await db.syncPending.put({ ...incoming, hasThumb: row.payload.hasThumb } as never);
  }
}

/** How many rows here still need sending. */
export async function countUnsynced(): Promise<number> {
  const counts = await Promise.all(SYNC_TABLES.map((table) => countDirty(table)));
  return counts.reduce((a, b) => a + b, 0);
}

async function applyRows(rows: SyncRow[], force: boolean, cursor?: number): Promise<void> {
  const tables = [...new Set(rows.map((r) => r.table))].map(anyTable);
  await db.transaction('rw', [...tables, db.meta, db.syncPending], async () => {
    markAsPull();
    for (const row of rows) await writePulledRow(row, force);
    if (cursor !== undefined) await db.meta.put({ key: META.cursor, value: cursor });
  });
}

/** Sends rows. If the server refuses a batch, it narrows down to the row at fault so the rest still go. */
async function pushBatch(table: SyncRow['table'], batch: SyncRow[], api: SyncApi): Promise<{ pushed: number; skipped: number }> {
  let reply;
  try {
    reply = await api.push(batch);
  } catch (error) {
    const refused = error instanceof SyncRequestError && error.status !== 429;
    if (!refused) throw error;
    if (batch.length === 1) return { pushed: 0, skipped: 1 };
    const middle = Math.ceil(batch.length / 2);
    const first = await pushBatch(table, batch.slice(0, middle), api);
    const second = await pushBatch(table, batch.slice(middle), api);
    return { pushed: first.pushed + second.pushed, skipped: first.skipped + second.skipped };
  }
  const sent = new Map(batch.map((row) => [row.id, row]));
  for (const id of reply.accepted) await markClean(table, id, sent.get(id)!.updatedAt);
  // A winner settles the version that was sent. Anything typed since then is newer, and stays to go out next.
  const unchanged = [];
  for (const winner of reply.winners) {
    if ((await anyTable(table).get(winner.id))?.updatedAt === sent.get(winner.id)?.updatedAt) unchanged.push(winner);
  }
  if (unchanged.length) await applyRows(unchanged, true);
  return { pushed: reply.accepted.length, skipped: 0 };
}

async function push(api: SyncApi): Promise<{ pushed: number; skipped: number }> {
  let pushed = 0;
  let skipped = 0;
  for (const table of SYNC_TABLES) {
    let dirty = await listDirty(table);
    if (table === 'attachments' && dirty.length) {
      const { ready, tooBig } = await uploadFiles(dirty as unknown as Attachment[], api);
      dirty = ready as unknown as DirtyRow[];
      skipped += tooBig;
    }
    const rows = dirty.map((record) => toWireRow(table, record as DirtyRow & Record<string, unknown>));
    const fits = rows.filter((row) => rowBytes(row) <= MAX_ROW_BYTES);
    skipped += rows.length - fits.length;
    for (const batch of batchByBytes(fits, MAX_BATCH_BYTES)) {
      const result = await pushBatch(table, batch, api);
      pushed += result.pushed;
      skipped += result.skipped;
    }
  }
  return { pushed, skipped };
}

async function pull(api: SyncApi): Promise<number> {
  let pulled = 0;
  let cursor = (await getMeta<number>(META.cursor)) ?? 0;
  for (;;) {
    const page = await api.pull(cursor);
    await applyRows(page.rows, false, page.cursor);
    pulled += page.rows.length;
    cursor = page.cursor;
    if (!page.hasMore) return pulled;
  }
}

async function run(api: SyncApi): Promise<SyncResult> {
  const empty = { pushed: 0, pulled: 0, skipped: 0 };
  if (paused) return { status: 'done', ...empty };
  // Nothing can work until you sign in again, and retrying would pull the sign-in form out from under you.
  if (readSyncState() === 'needsSignIn') return { status: 'signedOut', ...empty };
  if (!(await getMeta(META.accountId))) {
    setSyncState('off');
    return { status: 'signedOut', ...empty };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setSyncState('offline');
    return { status: 'offline', ...empty };
  }
  setSyncState('syncing');
  try {
    // A new app version may sync tables it skipped before, so it reads everything once more.
    if ((await getMeta(META.tablesHash)) !== TABLES_HASH) {
      await setMeta(META.cursor, 0);
      await setMeta(META.tablesHash, TABLES_HASH);
    }
    // Push first: a row changed here reaches the server before its older copy could arrive.
    const { pushed, skipped } = await push(api);
    const pulled = await pull(api);
    if (pulled) await resolveDuplicates();
    await downloadPendingFiles(api);
    await setMeta(META.lastAt, new Date().toISOString());
    await setMeta(META.stuck, skipped);
    setSyncState('synced');
    return { status: 'done', pushed, pulled, skipped };
  } catch (error) {
    if (error instanceof SyncAuthError) {
      setSyncState('needsSignIn');
      return { status: 'signedOut', ...empty };
    }
    setSyncState(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'failed');
    return { status: 'failed', ...empty };
  }
}

let running: Promise<SyncResult> | null = null;
let paused = 0;

/** Runs a change of account on this device with no sync under way, in this tab or another. */
export async function whileSyncPaused<T>(work: () => Promise<T>): Promise<T> {
  paused++;
  try {
    await running;
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    return await (locks ? locks.request('life-dashboard-sync', work) : work());
  } finally {
    paused--;
  }
}

/** Sends this device's changes and fetches the others'. Only one runs at a time, across tabs too. */
export function syncNow(api: SyncApi = realApi): Promise<SyncResult> {
  running ??= (async () => {
    try {
      const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
      if (!locks) return await run(api);
      return await locks.request('life-dashboard-sync', { ifAvailable: true }, (lock) => (lock ? run(api) : { status: 'done' as const, pushed: 0, pulled: 0, skipped: 0 }));
    } finally {
      running = null;
    }
  })();
  return running;
}
