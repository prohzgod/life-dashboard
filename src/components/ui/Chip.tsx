import type { HTMLAttributes } from 'react';
import type { Area } from '@design/tokens';
import styles from './Chip.module.css';
import { cx } from './cx';

export type ChipTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent' | Area;

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: ChipTone;
  dot?: boolean;
};

/** Small label. Status tones always carry a word, never color alone. */
export function Chip({ tone = 'neutral', dot = false, className, children, ...rest }: ChipProps) {
  return (
    <span className={cx(styles.chip, styles[tone], className)} {...rest}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
