import { useLiveQuery } from 'dexie-react-hooks';
import { listTrash, restoreNode } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { useT } from '@/i18n';
import styles from './Library.module.css';

export function TrashView() {
  const t = useT().library.trash;
  const trashed = useLiveQuery(listTrash);
  return (
    <main className={styles.main}>
      <article className={styles.article}>
        <h1 className={styles.pageTitle}>{t.title}</h1>
        <p className={styles.lead}>{t.lead}</p>
        {trashed?.length === 0 && <p className={styles.railEmpty}>{t.empty}</p>}
        <ul className={styles.folderList}>
          {trashed?.map((n) => (
            <li key={n.id} className={styles.folderItem}>
              <Icon name={n.kind === 'folder' ? 'folder' : 'page'} size={16} />
              <span className={styles.grow}>{n.title}</span>
              <span className={styles.railCount}>{t.deleted(timeAgo(n.deletedAt!))}</span>
              <Button size="sm" icon={<Icon name="restore" size={14} />} onClick={() => void restoreNode(n.id)} aria-label={t.restoreItem(n.title)}>
                {t.restore}
              </Button>
            </li>
          ))}
        </ul>
      </article>
    </main>
  );
}
