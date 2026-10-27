import { useSyncExternalStore } from 'react';

/**
 * Whether the screen is locked right now. Memory only: a fresh start begins locked
 * (when a passcode is set) because nothing here survives a reload.
 */
let locked = true;
const listeners = new Set<() => void>();

function set(value: boolean) {
  if (locked === value) return;
  locked = value;
  for (const listener of listeners) listener();
}

export const lockNow = () => set(true);
export const unlock = () => set(false);

export function useLocked(): boolean {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => locked,
    () => locked,
  );
}

/** For tests. */
export function resetLockForTests(value = true) {
  locked = value;
}

const FLAG = 'life-dashboard:locked-by-passcode';

/**
 * Whether a passcode is set, kept in localStorage too so the very first render already knows:
 * the lock screen shows at once, and an unlocked app never waits on the database.
 */
export function lockIsOn(): boolean {
  try {
    return localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}

export function rememberLockIsOn(on: boolean) {
  try {
    if (on) localStorage.setItem(FLAG, '1');
    else localStorage.removeItem(FLAG);
  } catch {
    // Private mode: the database still holds the passcode, so the lock still applies once it loads.
  }
}
