import { MAX_FILE_BYTES, type PresignRequest } from '@shared';
import { db } from '../db';
import type { Attachment } from '../types';
import { SyncAuthError, type SyncApi } from './api';
import { markAsPull } from './dirtyHooks';

const MAX_AT_ONCE = 3;

type Stored = Pick<Attachment, 'id' | 'blob' | 'thumbBlob' | 'mime' | 'size' | 'deletedAt'>;

async function inGroups<T>(items: T[], work: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += MAX_AT_ONCE) await Promise.all(items.slice(i, i + MAX_AT_ONCE).map(work));
}

async function upload(row: Stored, api: SyncApi): Promise<void> {
  const parts: { kind: 'original' | 'thumb'; blob: Blob; mime: string }[] = [{ kind: 'original', blob: row.blob, mime: row.mime }];
  if (row.thumbBlob) parts.push({ kind: 'thumb', blob: row.thumbBlob, mime: row.thumbBlob.type || 'image/jpeg' });
  const { items } = await api.presign(parts.map((p) => ({ attachmentId: row.id, kind: p.kind, mime: p.mime, size: p.blob.size, mode: 'put' })));
  await Promise.all(
    items.map(async ({ kind, url }) => {
      const part = parts.find((p) => p.kind === kind)!;
      const response = await fetch(url, { method: 'PUT', body: part.blob, headers: { 'Content-Type': part.mime } });
      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    }),
  );
}

/**
 * Sends the files of these rows. Only rows whose files arrived may be pushed, so another device never
 * sees an attachment with nothing behind it. The rest stay dirty and try again next sync.
 */
export async function uploadFiles<T extends Stored>(rows: T[], api: SyncApi): Promise<{ ready: T[]; tooBig: number }> {
  const ready: T[] = [];
  let tooBig = 0;
  await inGroups(rows, async (row) => {
    if (row.deletedAt !== null) {
      ready.push(row);
      return;
    }
    if (row.size > MAX_FILE_BYTES) {
      tooBig++;
      return;
    }
    try {
      await upload(row, api);
      ready.push(row);
    } catch (error) {
      if (error instanceof SyncAuthError) throw error;
    }
  });
  return { ready, tooBig };
}

async function download(pending: Attachment & { hasThumb?: boolean }, api: SyncApi): Promise<void> {
  const wanted: PresignRequest['items'] = [{ attachmentId: pending.id, kind: 'original', mime: pending.mime, size: 0, mode: 'get' }];
  if (pending.hasThumb) wanted.push({ attachmentId: pending.id, kind: 'thumb', mime: 'image/jpeg', size: 0, mode: 'get' });
  const { items } = await api.presign(wanted);
  const blobs = new Map<string, Blob>();
  await Promise.all(
    items.map(async ({ kind, url }) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      blobs.set(kind, await response.blob());
    }),
  );
  const row: Attachment & { hasThumb?: boolean } = { ...pending };
  delete row.hasThumb;
  await db.transaction('rw', db.attachments, db.syncPending, async () => {
    markAsPull();
    await db.attachments.put({ ...row, blob: blobs.get('original')!, thumbBlob: blobs.get('thumb') ?? null, dirty: 0 } as Attachment);
    await db.syncPending.delete(pending.id);
  });
}

/** Fetches files for attachments from other devices. One that fails waits for the next sync and holds nothing up. */
export async function downloadPendingFiles(api: SyncApi): Promise<void> {
  await inGroups(await db.syncPending.toArray(), async (pending) => {
    try {
      await download(pending, api);
    } catch (error) {
      if (error instanceof SyncAuthError) throw error;
    }
  });
}
