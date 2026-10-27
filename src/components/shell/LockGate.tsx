import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { shouldLock } from '@/domain/privacy';
import { checkUnlock, getPrivacyState, runAutomaticBackup } from '@/data';
import { confirmBiometric } from '@/lib/biometric';
import { Icon } from '../icons/Icon';
import { Button } from '../ui';
import { lockIsOn, lockNow, rememberLockIsOn, unlock, useLocked } from './lock';
import styles from './LockGate.module.css';

const BACKUP_CHECK_MS = 30 * 60_000;

/**
 * Hides the app behind your passcode when a lock is set: on every fresh start, after the time
 * away you chose, and when you lock it yourself. Also blurs the screen in the app switcher, and
 * runs the daily backup while the app is open.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const state = useLiveQuery(getPrivacyState);
  const locked = useLocked();
  const hiddenAt = useRef<number | null>(null);
  const lock = state?.lock;

  // Without a passcode there's nothing to lock. Keep the quick flag in step with the database.
  useEffect(() => {
    if (!lock) return;
    rememberLockIsOn(Boolean(lock.passcode));
    if (!lock.passcode) unlock();
  }, [lock]);

  useEffect(() => {
    const root = document.documentElement;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
        if (lock?.blurInSwitcher) root.dataset.privacyBlur = 'on';
      } else {
        delete root.dataset.privacyBlur;
        if (lock?.passcode && shouldLock(hiddenAt.current, Date.now(), lock.after)) lockNow();
        hiddenAt.current = null;
        void runAutomaticBackup();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [lock]);

  useEffect(() => {
    void runAutomaticBackup();
    const timer = window.setInterval(() => void runAutomaticBackup(), BACKUP_CHECK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const lockOn = state ? Boolean(state.lock.passcode) : lockIsOn();
  if (lockOn && locked) return <LockScreen credentialId={state?.lock.credentialId ?? null} />;
  return <>{children}</>;
}

const MAX_TRIES = 5;
const WAIT_MS = 30_000;

function LockScreen({ credentialId }: { credentialId: string | null }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [tries, setTries] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(0);
  const waiting = waitUntil > now;

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [waiting]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (waiting) return;
    if (await checkUnlock(passcode)) {
      unlock();
      return;
    }
    const next = tries + 1;
    setTries(next);
    setPasscode('');
    if (next >= MAX_TRIES) {
      const at = Date.now();
      setNow(at);
      setWaitUntil(at + WAIT_MS);
      setTries(0);
      setError('That passcode isn’t right. Wait 30 seconds, then try again.');
    } else setError('That passcode isn’t right.');
  }

  return (
    <main className={styles.screen} aria-labelledby="lock-title">
      <form className={styles.panel} onSubmit={submit}>
        <span className={styles.mark} aria-hidden="true">
          <Icon name="lock" size={22} />
        </span>
        <h1 id="lock-title" className={styles.title}>
          Life Dashboard is locked
        </h1>
        <label className={styles.field}>
          <span>Passcode</span>
          <input type="password" autoComplete="current-password" autoFocus value={passcode} onChange={(e) => setPasscode(e.target.value)} disabled={waiting} />
        </label>
        <p className={styles.error} role="alert">
          {waiting ? `Try again in ${Math.ceil((waitUntil - now) / 1000)} seconds.` : error}
        </p>
        <Button type="submit" variant="primary" disabled={waiting || !passcode}>
          Unlock
        </Button>
        {credentialId && (
          <Button
            icon={<Icon name="lock" size={16} />}
            onClick={async () => {
              if (await confirmBiometric(credentialId)) unlock();
              else setError('Your device didn’t confirm it. Use your passcode instead.');
            }}
          >
            Unlock with Touch ID or Face ID
          </Button>
        )}
        <p className={styles.hint}>
          The lock hides your screen. Forgot the passcode? Clearing this site’s data in your browser removes the lock and everything stored here; restore from a backup afterwards.
        </p>
      </form>
    </main>
  );
}
