import { useLiveQuery } from 'dexie-react-hooks';
import { useSyncExternalStore } from 'react';
import { loadSyncInfo, readSyncState, subscribeSyncState, SYNC_ENABLED } from '@/data';
import { useT } from '@/i18n';

/** Whether this device syncs, how it's going, and which account. */
export function useSyncStatus() {
  const state = useSyncExternalStore(subscribeSyncState, readSyncState);
  const info = useLiveQuery(loadSyncInfo);
  return { state, info };
}

const useIsSyncing = () => !!useLiveQuery(loadSyncInfo)?.accountId && SYNC_ENABLED;

/** "Saved on this device" only while that's the whole truth. */
export function useSavedLabel(): string {
  const t = useT().sync;
  return useIsSyncing() ? t.savedSyncing : t.savedHere;
}

export function useStoredLabel(): string {
  const t = useT().sync;
  return useIsSyncing() ? t.storedSyncing : t.storedHere;
}
