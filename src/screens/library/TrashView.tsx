import { useLiveQuery } from 'dexie-react-hooks';
import { listTrash, restoreNode } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import styles from './Library.module.css';

export function TrashView() {
  const trashed = useLiveQuery(listTrash);
  return (
    <main className={styles.main}>
      <article className={styles.article}>
        <h1 className={styles.pageTitle}>Trash</h1>
        <p className={styles.lead}>Pages you delete wait here, with everything that was inside them. Restore brings them back where they were.</p>
        {trashed?.length === 0 && <p className={styles.railEmpty}>Trash is empty.</p>}
        <ul className={styles.folderList}>
          {trashed?.map((n) => (
            <li key={n.id} className={styles.folderItem}>
              <Icon name={n.kind === 'folder' ? 'folder' : 'page'} size={16} />
              <span className={styles.grow}>{n.title}</span>
              <span className={styles.railCount}>Deleted {timeAgo(n.deletedAt!)}</span>
              <Button size="sm" icon={<Icon name="restore" size={14} />} onClick={() => void restoreNode(n.id)} aria-label={`Restore ${n.title}`}>
                Restore
              </Button>
            </li>
          ))}
        </ul>
      </article>
    </main>
  );
}
