import type { Area } from '@design/tokens';
import { paceStatus } from '@/domain/pace';
import styles from './PaceBar.module.css';
import { cx } from './cx';

type PaceBarProps = {
  label: string;
  /** Progress so far, 0–100. */
  progress: number;
  /** Where the goal should be today, 0–100. Drawn as the tick. */
  expected: number;
  area?: Area;
  /** Plain sentence under the bar, e.g. "Behind by about 2 weeks". Defaults to "On pace" / "Behind pace". */
  statusText?: string;
  /** What to show on the right; defaults to the rounded percent. */
  valueText?: string;
  className?: string;
};

export function PaceBar({ label, progress, expected, area, statusText, valueText, className }: PaceBarProps) {
  const status = paceStatus(progress, expected);
  const fill = clampPercent(progress);
  const tick = clampPercent(expected);
  const value = valueText ?? `${Math.round(progress)}%`;
  const sentence = statusText ?? (status === 'on-pace' ? 'On pace' : 'Behind pace');

  return (
    <div className={cx(styles.pace, className)}>
      <div className={styles.header}>
        <span>{label}</span>
        <span className={styles.value}>{value}</span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fill)}
        aria-valuetext={`${value}, expected ${Math.round(tick)}% by today. ${sentence}`}
      >
        <div className={styles.fill} style={{ width: `${fill}%`, background: area ? `var(--${area})` : undefined }} />
        <div className={styles.tick} style={{ left: `${tick}%` }} aria-hidden="true" />
      </div>
      <span className={cx(styles.status, status === 'on-pace' ? styles.onPace : styles.behind)}>{sentence}</span>
    </div>
  );
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}
