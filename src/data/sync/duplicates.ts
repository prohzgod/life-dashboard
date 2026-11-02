import type { Table } from 'dexie';
import { dataTableNames, db, type DataTableName } from '../db';
import { justAfter, mergeDuplicates, NATURAL_KEYS, pickWinner } from '@/domain/syncDuplicates';

type Row = { id: string; updatedAt: string; deletedAt: string | null; createdAt: string; [field: string]: unknown };

const tableOf = (name: DataTableName) => db[name] as unknown as Table<Row, string>;

/** Merges rows that mean one thing, after a pull brought in another device's. Returns how many sets it merged. */
export async function resolveDuplicates(): Promise<number> {
  return db.transaction('rw', dataTableNames.map(tableOf), async () => {
    let merged = 0;
    for (const name of dataTableNames) {
      const natural = NATURAL_KEYS[name];
      if (!natural) continue;
      const groups = new Map<string, Row[]>();
      for (const row of await tableOf(name).toArray()) {
        if (row.deletedAt !== null) continue;
        const key = natural.key(row);
        if (key === null) continue;
        groups.set(key, [...(groups.get(key) ?? []), row]);
      }
      for (const rows of groups.values()) {
        if (rows.length < 2) continue;
        merged++;
        const { winner: { id: winnerId } } = pickWinner(rows);
        const { winner, losers } = mergeDuplicates(rows);
        if (winner) await tableOf(name).put(winner);
        for (const loser of losers) await tableOf(name).put(loser);
        const loserIds = new Set(losers.map((l) => l.id));
        for (const { table, field } of natural.references) {
          await tableOf(table)
            .filter((row) => loserIds.has(row[field] as string))
            .modify((row: Row) => {
              row[field] = winnerId;
              row.updatedAt = justAfter(row.updatedAt);
            });
        }
      }
    }
    return merged;
  });
}
