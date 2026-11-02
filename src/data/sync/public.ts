import { accountApi, SyncAuthError, SyncRequestError, type Account } from './api';
import { countUnsynced, syncNow } from './engine';
import { hasOwnData, linkDevice, signOutDevice, type LinkChoice } from './link';
import { getMeta, META } from './meta';
import { readSyncState, setSyncState, subscribeSyncState, type SyncState } from './state';

export { countUnsynced, linkDevice, readSyncState, setSyncState, signOutDevice, subscribeSyncState, syncNow, hasOwnData, SyncAuthError, SyncRequestError };
export type { Account, LinkChoice, SyncState };
export { accountApi };

export type SyncInfo = { accountId: string | null; email: string | null; lastAt: string | null; unsynced: number };

/** What the screens show about sync. Read through useLiveQuery, so it follows changes. */
export async function loadSyncInfo(): Promise<SyncInfo> {
  const [accountId, email, lastAt, unsynced] = await Promise.all([getMeta<string>(META.accountId), getMeta<string>(META.email), getMeta<string>(META.lastAt), countUnsynced()]);
  return { accountId: accountId ?? null, email: email ?? null, lastAt: lastAt ?? null, unsynced };
}
