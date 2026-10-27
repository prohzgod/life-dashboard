import { useEffect, type ReactNode } from 'react';
import styles from './Toast.module.css';

/** A short note at the top of the screen that goes away by itself. */
export function Toast({ children, onDone, ms = 3500 }: { children: ReactNode; onDone: () => void; ms?: number }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, ms);
    return () => window.clearTimeout(timer);
  }, [onDone, ms]);
  return (
    <div className={styles.toast} role="status">
      {children}
    </div>
  );
}
