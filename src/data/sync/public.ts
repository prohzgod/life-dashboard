import { accountApi, SyncAuthError, SyncRequestError, type UserAccount } from './api';
import { countUnsynced, syncNow } from './engine';
import { hasOwnData, linkDevice, signOutDevice, type LinkChoice } from './link';
import { getMeta, META } from './meta';
import { readSyncState, setSyncState, subscribeSyncState, type SyncState } from './state';

export { countUnsynced, linkDevice, readSyncState, setSyncState, signOutDevice, subscribeSyncState, syncNow, hasOwnData, SyncAuthError, SyncRequestError };
export type { UserAccount, LinkChoice, SyncState };
export { accountApi };

export type SyncInfo = { accountId: string | null; email: string | null; lastAt: string | null; unsynced: number; stuck: number };

/** What the screens show about sync. Read through useLiveQuery, so it follows changes. */
export async function loadSyncInfo(): Promise<SyncInfo> {
  const [accountId, email, lastAt, unsynced, stuck] = await Promise.all([getMeta<string>(META.accountId), getMeta<string>(META.email), getMeta<string>(META.lastAt), countUnsynced(), getMeta<number>(META.stuck)]);
  return { accountId: accountId ?? null, email: email ?? null, lastAt: lastAt ?? null, unsynced, stuck: stuck ?? 0 };
}
