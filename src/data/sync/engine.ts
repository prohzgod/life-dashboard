import { MAX_BATCH_BYTES, MAX_ROW_BYTES, SYNC_TABLES, type SyncRow } from '@shared';
import { batchByBytes, decideApply, rowBytes, toWireRow } from '@/domain/sync';
import { db, normalizeEvent, normalizeGoal, normalizeMetric, normalizeNode, normalizeTask } from '../db';
import { markAsPull } from './dirtyHooks';
import { listDirty, markClean, type DirtyRow } from './dirty';
import { SyncAuthError, realApi, type SyncApi } from './api';
import { getMeta, META, setMeta } from './meta';
import { setSyncState } from './state';

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

/** Writes rows from the server. `force` is for rows the server already chose over this device's. */
async function applyRows(rows: SyncRow[], force: boolean, cursor?: number): Promise<void> {
  const tables = [...new Set(rows.map((r) => r.table))].map(anyTable);
  await db.transaction('rw', [...tables, db.meta], async () => {
    markAsPull();
    for (const row of rows) {
      const table = anyTable(row.table);
      if (force || decideApply(await table.get(row.id)) === 'apply') await table.put(toLocal(row));
    }
    if (cursor !== undefined) await db.meta.put({ key: META.cursor, value: cursor });
  });
}

async function push(api: SyncApi): Promise<{ pushed: number; skipped: number }> {
  let pushed = 0;
  let skipped = 0;
  for (const table of SYNC_TABLES) {
    const dirty = await listDirty(table);
    const rows = dirty.map((record) => toWireRow(table, record as DirtyRow & Record<string, unknown>));
    const fits = rows.filter((row) => rowBytes(row) <= MAX_ROW_BYTES);
    skipped += rows.length - fits.length;
    for (const batch of batchByBytes(fits, MAX_BATCH_BYTES)) {
      const { accepted, winners } = await api.push(batch);
      const sent = new Map(batch.map((row) => [row.id, row]));
      for (const id of accepted) await markClean(table, id, sent.get(id)!.updatedAt);
      if (winners.length) await applyRows(winners, true);
      pushed += accepted.length;
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
    await setMeta(META.lastAt, new Date().toISOString());
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
