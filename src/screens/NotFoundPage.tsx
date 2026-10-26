import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/shell/EmptyState';
import { PageHeader } from '@/components/shell/PageHeader';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState
        icon="search"
        heading="Nothing lives at this address"
        body="It may have moved, or the link has a typo. Your data is safe."
        action={
          <Link to="/" className={styles.link}>
            Back to Today
          </Link>
        }
      />
    </>
  );
}
