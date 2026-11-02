import Dexie, { type Table } from 'dexie';

type Marked = { dirty?: 0 | 1 };
type SyncTransaction = { syncApply?: boolean };

/**
 * Marks every changed row as needing to sync. The flag lives on the row and is set by a hook, so it
 * joins the writer's transaction and catches writes that skip the repositories, like the seeds.
 * A row arriving from the server is the one write that stays clean; see applyingPull.
 */
export function installDirtyTracking(tables: ReadonlyArray<Table<Marked, string>>) {
  for (const table of tables) {
    table.hook('creating', (_key, row, tx) => {
      if ((tx as unknown as SyncTransaction).syncApply) return;
      if (row.dirty === undefined) row.dirty = 1;
    });
    table.hook('updating', (changes, _key, _row, tx) => {
      if ((tx as unknown as SyncTransaction).syncApply || 'dirty' in (changes as object)) return undefined;
      return { dirty: 1 };
    });
  }
}

/** Marks the running transaction as writing rows from the server, which must stay clean. */
export function markAsPull() {
  (Dexie.currentTransaction as unknown as SyncTransaction).syncApply = true;
}
