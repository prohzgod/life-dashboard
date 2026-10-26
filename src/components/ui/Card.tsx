import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';
import { cx } from './cx';

type CardProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title?: ReactNode;
  /** Quiet text next to the title, e.g. "2 of 6 done". */
  meta?: ReactNode;
  /** Right-aligned action in the header, usually a quiet button or link. */
  action?: ReactNode;
};

export function Card({ title, meta, action, className, children, ...rest }: CardProps) {
  const hasHeader = title || meta || action;
  return (
    <section className={cx(styles.card, className)} {...rest}>
      {hasHeader && (
        <header className={styles.header}>
          <div className={styles.titleRow}>
            {title && <h2 className={styles.title}>{title}</h2>}
            {meta && <span className={styles.meta}>{meta}</span>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
