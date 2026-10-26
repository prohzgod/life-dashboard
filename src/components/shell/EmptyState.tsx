import type { ReactNode } from 'react';
import { Icon, type IconName } from '../icons/Icon';
import styles from './EmptyState.module.css';

type EmptyStateProps = {
  icon: IconName;
  heading: string;
  body: string;
  action?: ReactNode;
  /** Without the card frame, for use inside a dialog or another card. */
  bare?: boolean;
};

export function EmptyState({ icon, heading, body, action, bare }: EmptyStateProps) {
  return (
    <div className={bare ? styles.bare : styles.card}>
      <span className={styles.icon}>
        <Icon name={icon} size={22} />
      </span>
      <h2 className={styles.heading}>{heading}</h2>
      <p className={styles.body}>{body}</p>
      {action}
    </div>
  );
}
