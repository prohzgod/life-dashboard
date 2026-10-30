import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/icons/Icon';
import styles from './WarnNote.module.css';
import { cx } from './cx';

/** A soft orange note: behind schedule, a missed day, something overdue. Kind words, never alarms. */
export function WarnNote({ children, icon = 'clock', className }: { children: ReactNode; icon?: IconName; className?: string }) {
  return (
    <p className={cx(styles.note, className)}>
      <Icon name={icon} size={18} strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}
