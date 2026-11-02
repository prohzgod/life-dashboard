import { db, type DataTableName } from '../db';
import type { BaseRecord } from '../types';
import { markAsPull } from './dirtyHooks';

export type DirtyRow = BaseRecord & { dirty?: 0 | 1 };

const tableOf = (name: DataTableName) => db[name] as unknown as import('dexie').Table<DirtyRow, string>;

export function listDirty(table: DataTableName, limit?: number): Promise<DirtyRow[]> {
  const rows = tableOf(table).where('dirty').equals(1);
  return (limit === undefined ? rows : rows.limit(limit)).toArray();
}

export function countDirty(table: DataTableName): Promise<number> {
  return tableOf(table).where('dirty').equals(1).count();
}

/** Clears the flag only if the row is still the version that was pushed. */
export async function markClean(table: DataTableName, id: string, updatedAt: string): Promise<void> {
  await tableOf(table)
    .where('id')
    .equals(id)
    .filter((row) => row.updatedAt === updatedAt)
    .modify({ dirty: 0 });
}

/** Runs writes of rows from the server: they don't count as local changes. */
export function applyingPull<T>(tables: DataTableName[], write: () => Promise<T>): Promise<T> {
  return db.transaction('rw', tables.map(tableOf), () => {
    markAsPull();
    return write();
  });
}
