import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

type PageHeaderProps = {
  title: string;
  /** Small uppercase line above the title, e.g. the date. */
  eyebrow?: ReactNode;
  /** Quiet line under the title. */
  subtitle?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, eyebrow, subtitle, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
