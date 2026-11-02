import type { Table } from 'dexie';
import { SYNC_TABLES, type PullResponse, type SyncRow } from '@shared';
import { NATURAL_KEYS } from '@/domain/syncDuplicates';
import { linkAction } from '@/domain/syncLink';
import { clearBackgroundPhoto } from '../appearance';
import { dataTableNames, db, type DataTableName } from '../db';
import { initData, resetInitForTests } from '../init';
import { accountApi, apiFor, realApi, type UserAccount, type SyncApi } from './api';
import { markAsPull } from './dirtyHooks';
import { countUnsynced, syncNow, whileSyncPaused, writePulledRow } from './engine';
import { getMeta, META } from './meta';
import { readSyncState, setSyncState } from './state';

/** On a device set up before the list of seed rows existed: seeds were all written within moments of this. */
const SEED_WINDOW_MS = 5_000;
type AnyRow = { id: string; createdAt: string; updatedAt: string; dirty?: number };
const tableOf = (name: DataTableName) => db[name] as unknown as Table<AnyRow, string>;

/** The rows first start wrote that you've never changed, as `table:id`. */
async function untouchedSeeds(): Promise<Map<string, AnyRow & { table: DataTableName }>> {
  const list = await getMeta<string[]>('seedRows');
  const seededAt = await getMeta<string>('seededAt');
  const known = list && new Set(list);
  const limit = seededAt ? new Date(seededAt).getTime() + SEED_WINDOW_MS : 0;
  const seeds = new Map<string, AnyRow & { table: DataTableName }>();
  for (const table of dataTableNames) {
    for (const row of await tableOf(table).toArray()) {
      const key = `${table}:${row.id}`;
      const fromFirstStart = known ? known.has(key) : new Date(row.createdAt).getTime() <= limit;
      if (fromFirstStart && row.createdAt === row.updatedAt) seeds.set(key, { ...row, table });
    }
  }
  return seeds;
}

/** Whether anything here is yours rather than what the app seeded on its first start. */
export async function hasOwnData(): Promise<boolean> {
  if (await getMeta('importedAt')) return true;
  if (!(await getMeta('seededAt'))) return true;
  const seeds = await untouchedSeeds();
  for (const table of dataTableNames) {
    for (const id of await tableOf(table).toCollection().primaryKeys()) {
      if (!seeds.has(`${table}:${String(id)}`)) return true;
    }
  }
  return false;
}

/**
 * When combining with an account that has its own, starter rows you never touched would appear twice.
 * This drops them, except rows that merge by name anyway and any that something of yours points at.
 */
async function dropUntouchedSeeds(): Promise<void> {
  const seeds = await untouchedSeeds();
  const text = (row: unknown) => JSON.stringify(row, (_key, value: unknown) => (value instanceof Blob ? undefined : value));
  let yours = '';
  for (const table of dataTableNames) {
    for (const row of await tableOf(table).toArray()) if (!seeds.has(`${table}:${row.id}`)) yours += text(row);
  }
  const droppable = new Map([...seeds].filter(([, row]) => NATURAL_KEYS[row.table]?.key(row as never) == null));
  // A kept row's own references count too, so keep looking until nothing changes.
  for (let changed = true; changed; ) {
    changed = false;
    for (const [key, row] of droppable) {
      if (yours.includes(row.id)) {
        yours += text(row);
        droppable.delete(key);
        changed = true;
      }
    }
  }
  for (const row of droppable.values()) await tableOf(row.table).delete(row.id);
}

/** Every row of the account, carrying on from a first page already fetched. */
async function pullEverything(api: SyncApi, first?: PullResponse): Promise<{ rows: SyncRow[]; cursor: number }> {
  let page = first ?? (await api.pull(0));
  const rows = [...page.rows];
  while (page.hasMore) {
    page = await api.pull(page.cursor);
    rows.push(...page.rows);
  }
  return { rows, cursor: page.cursor };
}

const allTables = () => [...dataTableNames.map(tableOf), db.syncPending, db.meta];

/** Runs first start again: fresh seeds if this device was emptied, and anything an account's data lacks. */
async function reinitialize() {
  // Inside the swap's transaction, so screens reading live never catch the device with nothing on it.
  markAsPull(false);
  resetInitForTests();
  await initData();
}

/** Swaps what's on this device for an account's rows, in one step, once they have all arrived. */
async function replaceWith(account: UserAccount, rows: SyncRow[], cursor: number): Promise<void> {
  await db.transaction('rw', allTables(), async () => {
    markAsPull();
    for (const name of dataTableNames) await tableOf(name).clear();
    await db.syncPending.clear();
    for (const row of rows) await writePulledRow(row, true);
    await db.meta.bulkPut([
      { key: META.accountId, value: account.id },
      { key: META.ownerId, value: account.id },
      { key: META.email, value: account.email },
      { key: META.cursor, value: cursor },
      { key: META.tablesHash, value: SYNC_TABLES.join(',') },
    ]);
    // Keep "seeded" if the account has rows, so first start doesn't add samples beside them.
    if (!rows.length) await db.meta.delete('seededAt');
    await db.meta.bulkDelete(['importedAt', 'seedRows']);
    await reinitialize();
  });
}

/** Adopts this device's rows into the account: they all go up on the next sync. */
async function adopt(account: UserAccount, dropSeeds: boolean): Promise<void> {
  await db.transaction('rw', allTables(), async () => {
    if (dropSeeds) await dropUntouchedSeeds();
    for (const name of dataTableNames) await tableOf(name).toCollection().modify({ dirty: 1 });
    await db.meta.bulkPut([
      { key: META.accountId, value: account.id },
      { key: META.ownerId, value: account.id },
      { key: META.email, value: account.email },
      { key: META.cursor, value: 0 },
    ]);
  });
}

export type LinkChoice = 'useAccount' | 'combine' | 'replaceOther';

/**
 * Connects this device to an account after signing in. Returns what still needs asking: 'ask' when
 * both have data, 'confirmReplace' when the data here belongs to another account.
 */
export async function linkDevice(account: UserAccount, choice?: LinkChoice, api: SyncApi = apiFor(account.id)): Promise<'linked' | 'ask' | 'confirmReplace'> {
  // No sync may run while this device changes hands, or it could send one account's rows as another's.
  const outcome = await whileSyncPaused(async () => {
    if (choice === 'combine') {
      await adopt(account, true);
    } else if (choice === 'useAccount' || choice === 'replaceOther') {
      const { rows, cursor } = await pullEverything(api);
      if (choice === 'replaceOther') await clearBackgroundPhoto();
      await replaceWith(account, rows, cursor);
    } else {
      const ownerId = (await getMeta<string>(META.ownerId)) ?? null;
      const first = ownerId && ownerId !== account.id ? null : await api.pull(0);
      const action = linkAction({ serverHasData: !!first?.rows.length, deviceHasOwnData: await hasOwnData(), ownerId, accountId: account.id });
      if (action === 'replaceOtherAccount') return 'confirmReplace' as const;
      if (action === 'ask') return 'ask' as const;
      if (action === 'useAccount') {
        const { rows, cursor } = await pullEverything(api, first ?? undefined);
        await replaceWith(account, rows, cursor);
      } else if (action === 'upload') {
        await adopt(account, false);
      } else {
        await db.meta.bulkPut([
          { key: META.accountId, value: account.id },
          { key: META.email, value: account.email },
        ]);
      }
    }
    return 'linked' as const;
  });
  if (outcome === 'linked') {
    setSyncState('off');
    void syncNow(api);
  }
  return outcome;
}

/**
 * Signs out. It sends what it can first; if changes would be lost by removing the data, it stops and
 * says so unless `force`. Kept data stays marked as that account's, so another can't adopt it.
 */
export async function signOutDevice(options: { removeData: boolean; force?: boolean }, api: SyncApi = realApi, logout: () => Promise<unknown> = accountApi.signOut): Promise<'done' | 'unsynced'> {
  // A session that has ended can't send anything; don't let that count as nothing to send.
  if (readSyncState() !== 'needsSignIn') await syncNow(api);
  if (options.removeData && !options.force && (await countUnsynced()) > 0) return 'unsynced';
  await logout().catch(() => {});
  if (options.removeData) {
    await db.transaction('rw', allTables(), async () => {
      for (const name of dataTableNames) await tableOf(name).clear();
      await db.syncPending.clear();
      await db.meta.bulkDelete([...Object.values(META), 'seededAt', 'seedRows', 'importedAt']);
      await clearBackgroundPhoto();
      await reinitialize();
    });
  } else {
    await db.meta.bulkDelete([META.accountId, META.email]);
  }
  setSyncState('off');
  return 'done';
}
