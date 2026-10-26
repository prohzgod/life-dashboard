import type { Table } from 'dexie';
import { newId, nowIso } from './ids';
import { getCurrentSpaceId } from './session';
import type { BaseRecord } from './types';

/** What callers pass to create(): the record without its bookkeeping fields. */
export type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord> & Partial<Pick<BaseRecord, 'id' | 'spaceId'>>;
/** What callers pass to update(): any user fields, never the bookkeeping ones. */
export type RecordPatch<T extends BaseRecord> = Partial<Omit<T, keyof BaseRecord>>;

type Options = {
  /** Scope reads to the current space. Off for tables that span spaces (spaces itself, profile). */
  scoped?: boolean;
};

/**
 * Create, read, update and soft-delete for one table. Every read skips deleted rows
 * unless it says otherwise, and every write stamps ULID, space and timestamps.
 */
export function createRepository<T extends BaseRecord>(table: Table<T, string>, { scoped = true }: Options = {}) {
  const visible = (record: T | undefined): record is T =>
    !!record && record.deletedAt === null && (!scoped || record.spaceId === getCurrentSpaceId());

  function stamp(input: NewRecord<T>, now: string): T {
    return {
      ...input,
      id: input.id ?? newId(),
      spaceId: input.spaceId ?? getCurrentSpaceId(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    } as T;
  }

  async function all(): Promise<T[]> {
    return scoped ? table.where('spaceId').equals(getCurrentSpaceId()).toArray() : table.toArray();
  }

  return {
    async create(input: NewRecord<T>): Promise<T> {
      const record = stamp(input, nowIso());
      await table.add(record);
      return record;
    },

    async bulkCreate(inputs: ReadonlyArray<NewRecord<T>>): Promise<T[]> {
      const now = nowIso();
      const records = inputs.map((input) => stamp(input, now));
      await table.bulkAdd(records);
      return records;
    },

    async get(id: string): Promise<T | undefined> {
      const record = await table.get(id);
      return visible(record) ? record : undefined;
    },

    /** Every live record, optionally filtered. */
    async list(filter?: (record: T) => boolean): Promise<T[]> {
      const records = (await all()).filter((r) => r.deletedAt === null);
      return filter ? records.filter(filter) : records;
    },

    /** Records on an index, e.g. `where('goalId', id)`. */
    async where(index: string, value: string | number): Promise<T[]> {
      const records = await table.where(index).equals(value).toArray();
      return records.filter(visible);
    },

    async update(id: string, patch: RecordPatch<T>): Promise<T> {
      const current = await table.get(id);
      if (!visible(current)) throw new Error(`No ${table.name} record with id ${id}`);
      const next = { ...current, ...patch, id: current.id, spaceId: current.spaceId, createdAt: current.createdAt, deletedAt: null, updatedAt: nowIso() };
      await table.put(next);
      return next;
    },

    /** Soft delete: the row stays (for Trash and sync) with `deletedAt` set. */
    async remove(id: string): Promise<void> {
      const current = await table.get(id);
      if (!visible(current)) return;
      const now = nowIso();
      await table.put({ ...current, deletedAt: now, updatedAt: now });
    },

    async restore(id: string): Promise<void> {
      const current = await table.get(id);
      if (!current || current.deletedAt === null || (scoped && current.spaceId !== getCurrentSpaceId())) return;
      await table.put({ ...current, deletedAt: null, updatedAt: nowIso() });
    },

    /** Soft-deleted records, newest first, for Trash. */
    async listDeleted(): Promise<T[]> {
      const records = (await all()).filter((r) => r.deletedAt !== null);
      return records.sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));
    },

    async count(): Promise<number> {
      return (await all()).filter((r) => r.deletedAt === null).length;
    },
  };
}

export type Repository<T extends BaseRecord> = ReturnType<typeof createRepository<T>>;
