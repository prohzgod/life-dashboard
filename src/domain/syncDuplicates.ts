import type { SyncTable } from '@shared';

type Row = { id: string; updatedAt: string; deletedAt: string | null; createdAt?: string; [field: string]: unknown };
type Fields = Record<string, unknown>;

export type NaturalKey = {
  /** What makes two rows the same thing, or null if this row has no such identity. */
  key(row: Fields): string | null;
  /** Fields elsewhere that point at this table, to repoint when rows merge. */
  references: { table: SyncTable; field: string }[];
};

const NODE_REFERENCES: NaturalKey['references'] = [
  { table: 'nodes', field: 'parentId' },
  { table: 'attachments', field: 'nodeId' },
  { table: 'dailyEntries', field: 'journalNodeId' },
  { table: 'links', field: 'fromId' },
  { table: 'links', field: 'toId' },
  { table: 'taggings', field: 'targetId' },
  { table: 'homeWidgets', field: 'refId' },
];

/**
 * Rows that mean one thing however many devices made them: a day's entry, a journal folder, the
 * things every device seeds on its first start. Lookups expect one of each, so a second would hide data.
 */
export const NATURAL_KEYS: Partial<Record<SyncTable, NaturalKey>> = {
  nodes: { key: (r) => (r.systemKey ? String(r.systemKey) : null), references: NODE_REFERENCES },
  metrics: { key: (r) => (r.systemKey ? String(r.systemKey) : null), references: [{ table: 'metricEntries', field: 'metricId' }] },
  dailyEntries: { key: (r) => String(r.day), references: [] },
  habitLogs: { key: (r) => `${String(r.habitId)}|${String(r.day)}`, references: [] },
  reviews: { key: (r) => `${String(r.period)}|${String(r.periodStart)}`, references: [] },
  profile: { key: () => 'profile', references: [] },
  calendars: { key: (r) => (r.source === 'local' ? String(r.name) : null), references: [{ table: 'events', field: 'calendarId' }] },
  budgets: { key: (r) => `${String(r.kind)}|${String(r.name)}`, references: [{ table: 'transactions', field: 'categoryId' }] },
  homeWidgets: { key: (r) => (r.kind === 'pinned' ? null : String(r.kind)), references: [] },
};

/** The lowest ULID, so every device picks the same one without talking to the others. */
export function pickWinner<T extends Row>(rows: readonly T[]): { winner: T; losers: T[] } {
  const sorted = [...rows].sort((a, b) => (a.id < b.id ? -1 : 1));
  return { winner: sorted[0]!, losers: sorted.slice(1) };
}

/** A moment just after `iso`, so a merge outranks the rows it merges and two devices stamp the same time. */
export function justAfter(iso: string): string {
  return new Date(new Date(iso).getTime() + 1).toISOString();
}

const BOOKKEEPING = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt', 'dirty']);
const isEmpty = (value: unknown) => value === null || value === undefined || value === '';

/**
 * What to write for a set of rows that are one thing. Where they disagree the newest wins, under the
 * winner's id, and what only an older row knew is kept. (One device logs your mood, the other a line.)
 * Nothing here reads the clock, so devices merging the same rows produce the same result.
 */
export function mergeDuplicates<T extends Row>(rows: readonly T[]): { winner: T | null; losers: T[] } {
  const { winner, losers } = pickWinner(rows);
  const byAge = [...rows].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() || (a.id < b.id ? -1 : 1));
  const newest = byAge[0]!;
  const stamp = justAfter(newest.updatedAt);
  const merged: Record<string, unknown> = { ...newest };
  for (const older of byAge.slice(1)) {
    for (const [field, value] of Object.entries(older)) {
      if (!BOOKKEEPING.has(field) && isEmpty(merged[field]) && !isEmpty(value)) merged[field] = value;
    }
  }
  const unchanged = newest.id === winner.id && Object.keys(merged).every((field) => merged[field] === (winner as Record<string, unknown>)[field]);
  return {
    winner: unchanged ? null : ({ ...merged, id: winner.id, createdAt: winner.createdAt, updatedAt: stamp, deletedAt: null } as unknown as T),
    losers: losers.map((loser) => ({ ...loser, updatedAt: stamp, deletedAt: stamp })),
  };
}
