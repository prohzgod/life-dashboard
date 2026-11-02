// @vitest-environment node
import { MAX_BATCH_BYTES, type SyncRow } from '@shared';
import { batchByBytes, decideApply, toWireRow } from './sync';

const base = { id: '1', createdAt: 'a', updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: null };

describe('toWireRow', () => {
  it('drops the dirty flag', () => {
    const row = toWireRow('tasks', { ...base, title: 'x', dirty: 1 });
    expect(row).toMatchObject({ table: 'tasks', id: '1', updatedAt: base.updatedAt, deletedAt: null });
    expect(row.payload).toEqual({ ...base, title: 'x' });
  });

  it('sends attachments without their bytes, saying whether there is a thumbnail', () => {
    const row = toWireRow('attachments', { ...base, blob: new Blob(['x']), thumbBlob: new Blob(['y']), size: 1 });
    expect(row.payload).toEqual({ ...base, size: 1, hasThumb: true });
    expect(toWireRow('attachments', { ...base, blob: new Blob(['x']), thumbBlob: null }).payload.hasThumb).toBe(false);
  });
});

describe('batchByBytes', () => {
  const row = (id: string, size: number): SyncRow => ({ table: 'tasks', id, updatedAt: 'x', deletedAt: null, payload: { text: 'a'.repeat(size) } });

  it('keeps every batch under the limit', () => {
    const batches = batchByBytes([row('1', 600_000), row('2', 600_000), row('3', 100)], MAX_BATCH_BYTES);
    expect(batches.map((b) => b.map((r) => r.id))).toEqual([['1'], ['2', '3']]);
  });

  it('gives a row larger than the limit its own batch', () => {
    expect(batchByBytes([row('1', 100), row('2', 2_000_000)], MAX_BATCH_BYTES)).toHaveLength(2);
  });

  it('makes nothing from nothing', () => {
    expect(batchByBytes([], MAX_BATCH_BYTES)).toEqual([]);
  });
});

describe('decideApply', () => {
  it('applies when there is no local row or it is clean', () => {
    expect(decideApply(undefined)).toBe('apply');
    expect(decideApply({ dirty: 0 })).toBe('apply');
  });

  it('keeps a local row with changes still to send', () => {
    expect(decideApply({ dirty: 1 })).toBe('keep');
  });
});
