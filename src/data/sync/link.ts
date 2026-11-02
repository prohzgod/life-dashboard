import type { Table } from 'dexie';
import { SYNC_TABLES, type PullResponse, type SyncRow } from '@shared';
import { linkAction } from '@/domain/syncLink';
import { clearBackgroundPhoto } from '../appearance';
import { dataTableNames, db, type DataTableName } from '../db';
import { initData, resetInitForTests } from '../init';
import { accountApi, realApi, type Account, type SyncApi } from './api';
import { markAsPull } from './dirtyHooks';
import { countUnsynced, syncNow, writePulledRow } from './engine';
import { getMeta, META } from './meta';
import { setSyncState } from './state';

const OWN_DATA_GRACE_MS = 60_000;
const tableOf = (name: DataTableName) => db[name] as unknown as Table<{ id: string; updatedAt: string; dirty?: number }, string>;

/** Whether anything here is yours rather than what the app seeded on its first start. */
export async function hasOwnData(): Promise<boolean> {
  if (await getMeta('importedAt')) return true;
  const seededAt = await getMeta<string>('seededAt');
  if (!seededAt) return true;
  const after = new Date(new Date(seededAt).getTime() + OWN_DATA_GRACE_MS).toISOString();
  for (const name of dataTableNames) {
    if ((await tableOf(name).where('updatedAt').above(after).count()) > 0) return true;
  }
  return false;
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
  resetInitForTests();
  await initData();
}

/** Swaps what's on this device for an account's rows, in one step, once they have all arrived. */
async function replaceWith(account: Account, rows: SyncRow[], cursor: number): Promise<void> {
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
    await db.meta.delete('importedAt');
  });
  await reinitialize();
}

/** Adopts this device's rows into the account: they all go up on the next sync. */
async function adopt(account: Account): Promise<void> {
  await db.transaction('rw', allTables(), async () => {
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
export async function linkDevice(account: Account, choice?: LinkChoice, api: SyncApi = realApi): Promise<'linked' | 'ask' | 'confirmReplace'> {
  if (choice === 'combine') {
    await adopt(account);
  } else if (choice === 'useAccount' || choice === 'replaceOther') {
    const { rows, cursor } = await pullEverything(api);
    await clearOtherAccountExtras(choice);
    await replaceWith(account, rows, cursor);
  } else {
    const ownerId = (await getMeta<string>(META.ownerId)) ?? null;
    const first = ownerId && ownerId !== account.id ? null : await api.pull(0);
    const action = linkAction({ serverHasData: !!first?.rows.length, deviceHasOwnData: await hasOwnData(), ownerId, accountId: account.id });
    if (action === 'replaceOtherAccount') return 'confirmReplace';
    if (action === 'ask') return 'ask';
    if (action === 'useAccount') {
      const { rows, cursor } = await pullEverything(api, first ?? undefined);
      await replaceWith(account, rows, cursor);
    } else if (action === 'upload') {
      await adopt(account);
    } else {
      await db.meta.bulkPut([
        { key: META.accountId, value: account.id },
        { key: META.email, value: account.email },
      ]);
    }
  }
  void syncNow(api);
  return 'linked';
}

async function clearOtherAccountExtras(choice: LinkChoice) {
  if (choice === 'replaceOther') await clearBackgroundPhoto();
}

/**
 * Signs out. It sends what it can first; if changes would be lost by removing the data, it stops and
 * says so unless `force`. Kept data stays marked as that account's, so another can't adopt it.
 */
export async function signOutDevice(options: { removeData: boolean; force?: boolean }, api: SyncApi = realApi, logout: () => Promise<unknown> = accountApi.signOut): Promise<'done' | 'unsynced'> {
  await syncNow(api);
  if (options.removeData && !options.force && (await countUnsynced()) > 0) return 'unsynced';
  await logout().catch(() => {});
  if (options.removeData) {
    await db.transaction('rw', allTables(), async () => {
      for (const name of dataTableNames) await tableOf(name).clear();
      await db.syncPending.clear();
      await db.meta.bulkDelete([...Object.values(META), 'seededAt', 'importedAt']);
    });
    await clearBackgroundPhoto();
    await reinitialize();
  } else {
    await db.meta.bulkDelete([META.accountId, META.email]);
  }
  setSyncState('off');
  return 'done';
}
