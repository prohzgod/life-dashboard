import Dexie, { type Table } from 'dexie';

type Marked = { dirty?: 0 | 1 };
type SyncTransaction = { syncApply?: boolean };

/**
 * Marks every changed row as needing to sync. The flag lives on the row and is set by a hook, so it
 * joins the writer's transaction and catches writes that skip the repositories, like the seeds.
 * Only sync's own transactions may leave a row clean (see markAsPull). A plain write carrying
 * `dirty: 0` is just a stale copy, and trusting it would lose the edit.
 */
export function installDirtyTracking(tables: ReadonlyArray<Table<Marked, string>>) {
  for (const table of tables) {
    table.hook('creating', (_key, row, tx) => {
      if (!(tx as unknown as SyncTransaction).syncApply) row.dirty = 1;
    });
    table.hook('updating', (_changes, _key, _row, tx) => ((tx as unknown as SyncTransaction).syncApply ? undefined : { dirty: 1 }));
  }
}

/** Marks the running transaction as sync's own: rows from the server, or a row now confirmed sent. */
export function markAsPull(on = true) {
  (Dexie.currentTransaction as unknown as SyncTransaction).syncApply = on;
}
