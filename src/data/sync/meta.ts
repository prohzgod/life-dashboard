import { db } from '../db';

/** Sync's bookkeeping. It belongs to this device, so it lives in `meta` and never syncs. */
export const META = {
  accountId: 'sync.accountId',
  email: 'sync.email',
  cursor: 'sync.cursor',
  tablesHash: 'sync.tablesHash',
  lastAt: 'sync.lastAt',
} as const;

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}
