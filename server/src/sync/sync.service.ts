import { Inject, Injectable, PayloadTooLargeException } from '@nestjs/common';
import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm';
import { PULL_PAGE_SIZE, type PullResponse, type PushResponse, type SyncRow, type SyncTable } from '@life-dashboard/shared';
import { DATA_QUOTA_BYTES } from '../config';
import { DB, type Db } from '../db/db';
import { records } from '../db/schema';

const MAX_AHEAD_MS = 5 * 60_000;
/** A device clock further off than this gets corrected. Below it, ordinary delays would shift times for nothing. */
const SKEW_TOLERANCE_MS = 60_000;

/** Postgres can't store a NUL character in JSON, and one stray character mustn't stop a row syncing. */
function withoutNul<T>(value: T): T {
  if (typeof value === 'string') return value.replaceAll('\u0000', '') as T;
  if (Array.isArray(value)) return value.map(withoutNul) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withoutNul(v)])) as T;
  return value;
}

const toRow = (r: typeof records.$inferSelect): SyncRow => ({
  table: r.tableName as SyncTable,
  id: r.id,
  updatedAt: String(r.payload.updatedAt),
  deletedAt: (r.payload.deletedAt as string | null) ?? null,
  payload: r.payload,
});

@Injectable()
export class SyncService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(DATA_QUOTA_BYTES) private readonly dataQuotaBytes: number,
  ) {}

  /**
   * Last write wins, per row. Pushes for one account run one at a time and take their sequence numbers
   * while holding the lock, so numbers follow commit order and a pull can't step past a row not yet committed.
   */
  async push(userId: string, rows: SyncRow[], clientNow?: string): Promise<PushResponse> {
    const accepted: string[] = [];
    const winners: SyncRow[] = [];
    if (!rows.length) return { accepted, winners };
    const measured = clientNow ? Date.now() - new Date(clientNow).getTime() : 0;
    const skew = Math.abs(measured) > SKEW_TOLERANCE_MS ? measured : 0;
    const incoming = rows.reduce((sum, row) => sum + Buffer.byteLength(JSON.stringify(row.payload)), 0);
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
      const [usage] = await tx
        .select({ used: sql<string>`coalesce(sum(pg_column_size(${records.payload})), 0)` })
        .from(records)
        .where(eq(records.userId, userId));
      if (Number(usage?.used ?? 0) + incoming > this.dataQuotaBytes) throw new PayloadTooLargeException('This account’s storage is full.');
      const found = await tx
        .select()
        .from(records)
        .where(and(eq(records.userId, userId), inArray(records.id, rows.map((r) => r.id))));
      const current = new Map(found.map((r) => [`${r.tableName}:${r.id}`, r]));

      for (const row of rows) {
        const key = `${row.table}:${row.id}`;
        const existing = current.get(key);
        const now = Date.now();
        const corrected = new Date(row.updatedAt).getTime() + skew;
        const clamped = corrected > now + MAX_AHEAD_MS;
        // Either correction is a new time for the row, so the device hears back about it.
        const rewritten = clamped || skew !== 0;
        const updatedAt = clamped ? new Date(now).toISOString() : skew ? new Date(corrected).toISOString() : row.updatedAt;
        // A tie keeps the server's row, which also makes pushing the same row twice harmless.
        if (existing && new Date(updatedAt).getTime() <= new Date(existing.updatedAt).getTime()) {
          if (String(existing.payload.updatedAt) !== row.updatedAt || row.deletedAt !== (existing.payload.deletedAt ?? null) || rewritten) winners.push(toRow(existing));
          else accepted.push(row.id);
          continue;
        }
        const payload = withoutNul({ ...row.payload, id: row.id, updatedAt, deletedAt: row.deletedAt });
        const values = { userId, tableName: row.table, id: row.id, payload, updatedAt, deletedAt: row.deletedAt, seq: sql`nextval('records_seq')` };
        const [saved] = await tx
          .insert(records)
          .values(values)
          .onConflictDoUpdate({ target: [records.userId, records.tableName, records.id], set: { payload, updatedAt, deletedAt: row.deletedAt, seq: sql`nextval('records_seq')` } })
          .returning();
        current.set(key, saved!);
        if (rewritten) winners.push(toRow(saved!));
        else accepted.push(row.id);
      }
    });
    return { accepted, winners };
  }

  async pull(userId: string, cursor: number): Promise<PullResponse> {
    const found = await this.db
      .select()
      .from(records)
      .where(and(eq(records.userId, userId), gt(records.seq, cursor)))
      .orderBy(asc(records.seq))
      .limit(PULL_PAGE_SIZE + 1);
    const page = found.slice(0, PULL_PAGE_SIZE);
    return { rows: page.map(toRow), cursor: page.at(-1)?.seq ?? cursor, hasMore: found.length > PULL_PAGE_SIZE };
  }
}
