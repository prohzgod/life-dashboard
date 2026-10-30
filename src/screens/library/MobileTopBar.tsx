import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LibraryNode } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { useT } from '@/i18n';
import styles from './Library.module.css';

/**
 * Phones: a pill back to the parent folder (or the Library), a round Home button, and the page's
 * options. Pages and folders open full-screen without the tab bar, so this is always the way out.
 */
export function MobileTopBar({ parent, children }: { parent: LibraryNode | undefined; children?: ReactNode }) {
  const t = useT();
  const label = parent?.title ?? t.library.page.library;
  return (
    <div className={styles.mobileBar}>
      <Link to={parent ? `/library/${parent.id}` : '/library'} className={styles.mobileBack} aria-label={t.library.page.backTo(label)}>
        <Icon name="chevronLeft" size={20} strokeWidth={2.2} />
        <span className={styles.mobileBackText}>{label}</span>
      </Link>
      <span className={styles.mobileBarActions}>
        <Link to="/" className={styles.optionsButton} aria-label={t.shell.home}>
          <Icon name="home" size={19} />
        </Link>
        {children}
      </span>
    </div>
  );
}
