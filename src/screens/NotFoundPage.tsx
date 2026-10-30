import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/shell/EmptyState';
import { PageHeader } from '@/components/shell/PageHeader';
import { useT } from '@/i18n';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  const t = useT().shell.notFound;
  return (
    <>
      <PageHeader title={t.title} />
      <EmptyState
        icon="search"
        heading={t.heading}
        body={t.body}
        action={
          <Link to="/" className={styles.link}>
            {t.back}
          </Link>
        }
      />
    </>
  );
}
