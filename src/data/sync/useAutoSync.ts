import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef } from 'react';
import { countUnsynced, syncNow } from './engine';

const AFTER_WRITE_MS = 2_000;
const WHILE_VISIBLE_MS = 60_000;
const AFTER_FAILURE_MS = 5 * 60_000;

/** Keeps a signed-in device in sync: on start, on reconnecting, on coming back to the tab, and soon after you change something. */
export function useAutoSync() {
  const unsynced = useLiveQuery(countUnsynced);
  const retryAt = useRef(0);

  useEffect(() => {
    const sync = async () => {
      const { status } = await syncNow();
      retryAt.current = status === 'failed' ? Date.now() + AFTER_FAILURE_MS : 0;
    };
    const syncIfDue = () => {
      if (document.visibilityState === 'visible' && Date.now() >= retryAt.current) void sync();
    };
    void sync();
    const online = () => {
      retryAt.current = 0;
      void sync();
    };
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', syncIfDue);
    const timer = window.setInterval(syncIfDue, WHILE_VISIBLE_MS);
    return () => {
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', syncIfDue);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!unsynced || Date.now() < retryAt.current) return;
    const timer = window.setTimeout(() => void syncNow(), AFTER_WRITE_MS);
    return () => window.clearTimeout(timer);
  }, [unsynced]);
}
