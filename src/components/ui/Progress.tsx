import styles from './Progress.module.css';
import { cx } from './cx';

/**
 * How full: `accent` for today, `inverse` for the week, `glass` for the month, `outline` for the
 * year (Glass v2 rule 7). What remains is hatched.
 */
export type ProgressTone = 'accent' | 'inverse' | 'glass' | 'outline';

type CapsuleProps = {
  label: string;
  /** Quiet text on the right of the label: "2/5 tasks". */
  meta?: string;
  percent: number;
  tone?: ProgressTone;
  className?: string;
};

/** A 44px pill with its percentage inside, under a label line. */
export function ProgressCapsule({ label, meta, percent, tone = 'inverse', className }: CapsuleProps) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={cx(styles.capsule, className)}>
      <div className={styles.capsuleHead}>
        <span className={styles.capsuleLabel}>{label}</span>
        {meta && <span className={styles.capsuleMeta}>{meta}</span>}
      </div>
      <div className={styles.track} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-valuetext={meta ? `${value}%, ${meta}` : `${value}%`}>
        {/* A fill too short for its label still shows the label, on the hatching. */}
        <div className={cx(styles.fill, styles[tone], value < 18 && styles.short)} style={{ width: `${Math.max(value, 0)}%` }}>
          <span className={styles.value}>{value}%</span>
        </div>
      </div>
    </div>
  );
}

type HatchBarProps = {
  /** 0–1. */
  value: number;
  /** 0–1: where you should be by now, a 3px accent tick. */
  planned?: number;
  tone?: Exclude<ProgressTone, 'outline'>;
  label: string;
  valueText?: string;
  className?: string;
};

/** A thin (16px) progress bar with hatching for what remains. */
export function HatchBar({ value, planned, tone = 'inverse', label, valueText, className }: HatchBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={cx(styles.bar, className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={valueText}
    >
      <div className={cx(styles.barFill, styles[tone])} style={{ width: `${pct}%` }} />
      {planned !== undefined && <span className={styles.tick} style={{ left: `${Math.max(0, Math.min(1, planned)) * 100}%` }} aria-hidden="true" />}
    </div>
  );
}
