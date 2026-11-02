import type { SyncRow, SyncTable } from '@shared';

type LocalRow = { id: string; updatedAt: string; deletedAt: string | null; [field: string]: unknown };

/** A local record as it goes on the wire: no sync flag, and no file bytes (those go to file storage). */
export function toWireRow(table: SyncTable, record: LocalRow): SyncRow {
  const payload: Record<string, unknown> = { ...record };
  delete payload.dirty;
  if (table === 'attachments') {
    payload.hasThumb = !!record.thumbBlob;
    delete payload.blob;
    delete payload.thumbBlob;
  }
  return { table, id: record.id, updatedAt: record.updatedAt, deletedAt: record.deletedAt ?? null, payload };
}

export function rowBytes(row: SyncRow): number {
  return new TextEncoder().encode(JSON.stringify(row)).length;
}

/** Splits rows into requests under `limit` bytes. A row bigger than that goes alone. */
export function batchByBytes(rows: SyncRow[], limit: number): SyncRow[][] {
  const batches: SyncRow[][] = [];
  let current: SyncRow[] = [];
  let size = 0;
  for (const row of rows) {
    const bytes = rowBytes(row);
    if (current.length && size + bytes > limit) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(row);
    size += bytes;
  }
  if (current.length) batches.push(current);
  return batches;
}

/** A local row with changes still to send stays as it is: the next push settles which one wins. */
export function decideApply(local: { dirty?: unknown } | undefined): 'apply' | 'keep' {
  return local?.dirty === 1 ? 'keep' : 'apply';
}
