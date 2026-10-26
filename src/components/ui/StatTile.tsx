import type { ReactNode } from 'react';
import styles from './StatTile.module.css';
import { cx } from './cx';

type StatTileProps = {
  label: ReactNode;
  value: ReactNode;
  /** Small unit after the value, e.g. "/ 5". */
  unit?: ReactNode;
  caption?: ReactNode;
  /** "surface" stands alone on the page; "sunken" sits inside a card. */
  tone?: 'surface' | 'sunken';
  className?: string;
};

export function StatTile({ label, value, unit, caption, tone = 'surface', className }: StatTileProps) {
  return (
    <div className={cx(styles.tile, styles[tone], className)}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>
        {value}
        {unit && <span className={styles.unit}> {unit}</span>}
      </span>
      {caption && <span className={styles.caption}>{caption}</span>}
    </div>
  );
}
