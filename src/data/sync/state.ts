export type SyncState = 'off' | 'syncing' | 'synced' | 'offline' | 'needsSignIn' | 'failed';

let state: SyncState = 'off';
const listeners = new Set<() => void>();

export const readSyncState = () => state;

export function setSyncState(next: SyncState) {
  if (state === next) return;
  state = next;
  listeners.forEach((listener) => listener());
}

export function subscribeSyncState(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
