import styles from './WeekDots.module.css';
import { cx } from './cx';

export type DotState = 'done' | 'missed' | 'today' | 'todayDone' | 'future' | 'open';

/**
 * A week of habit days: done = strong fill, missed = dashed warning ring, today = accent with an
 * ink ring, future = a well. `label` says the same in words for screen readers.
 */
export function WeekDots({ days, label, className }: { days: ReadonlyArray<{ key: string; letter: string; state: DotState }>; label: string; className?: string }) {
  return (
    <div className={cx(styles.week, className)} role="img" aria-label={label}>
      {days.map((d) => (
        <span key={d.key} className={cx(styles.day, (d.state === 'today' || d.state === 'todayDone') && styles.isToday)} aria-hidden="true">
          <span className={cx(styles.dot, styles[d.state])} />
          {d.letter}
        </span>
      ))}
    </div>
  );
}
