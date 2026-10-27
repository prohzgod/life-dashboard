import styles from './Ring.module.css';

type RingProps = {
  /** 0–100 */
  percent: number;
  size: number;
  stroke?: number;
  /** CSS color for the arc, e.g. var(--health). */
  color?: string;
  children?: React.ReactNode;
  label?: string;
};

/** A circular progress ring with optional content in the middle. */
export function Ring({ percent, size, stroke = 6, color = 'var(--primary)', children, label }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = Math.min(100, Math.max(0, percent));
  return (
    <span className={styles.ring} style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && <span className={styles.center}>{children}</span>}
    </span>
  );
}
