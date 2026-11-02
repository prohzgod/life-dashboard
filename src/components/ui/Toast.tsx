import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePresence } from '@/lib/motion';
import styles from './Toast.module.css';

/** A short note at the top of the screen that goes away by itself. */
export function Toast({ children, onDone, ms = 3500 }: { children: ReactNode; onDone: () => void; ms?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [showing, setShowing] = useState(true);
  const { present, closing } = usePresence(showing, ref);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowing(false), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);

  useEffect(() => {
    if (!present) onDone();
  }, [present, onDone]);

  if (!present) return null;
  return (
    <div ref={ref} className={styles.toast} role="status" data-closing={closing || undefined}>
      {children}
    </div>
  );
}
