import { useLiveQuery } from 'dexie-react-hooks';
import { pinnedWidget, toggleFavorite, type LibraryNode } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button, Sheet, Switch } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import styles from './PageOptionsSheet.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  node: LibraryNode;
  parentTitle: string | null;
  onPin: (pinned: boolean) => void;
  onTrash: () => void;
};

/** Phones: the page's "…" sheet, with Pin to Home at the top. */
export function PageOptionsSheet({ open, onClose, node, parentTitle, onPin, onTrash }: Props) {
  const pinned = useLiveQuery(async () => !!(await pinnedWidget('node', node.id)), [node.id]);
  return (
    <Sheet open={open} onClose={onClose} title={`Options for ${node.title}`} hideTitle className={styles.sheet}>
      <div className={styles.card}>
        <div className={styles.head}>
          <span className={styles.icon}>
            <Icon name="note" size={18} />
          </span>
          <span className={styles.headText}>
            <span className={styles.title}>{node.title}</span>
            <span className={styles.sub}>
              {parentTitle ? `${parentTitle}, ` : ''}edited {timeAgo(node.updatedAt)}
            </span>
          </span>
        </div>
        <div className={styles.pin}>
          <Icon name="pin" size={18} />
          <span className={styles.headText}>
            <span id="pin-label" className={styles.pinTitle}>
              Pin to Home
            </span>
            <span className={styles.sub}>Shows as a Medium tile with checklist progress</span>
          </span>
          <Switch checked={!!pinned} onChange={onPin} labelledBy="pin-label" />
        </div>
        <ul className={styles.rows}>
          <li>
            <button type="button" className={styles.row} onClick={() => void toggleFavorite(node.id).then(onClose)}>
              <Icon name="star" size={18} />
              {node.favoritedAt ? 'Remove from favourites' : 'Add to favourites'}
            </button>
          </li>
          {!node.isSystem && (
            <li>
              <button type="button" className={`${styles.row} ${styles.danger}`} onClick={onTrash}>
                <Icon name="trash" size={18} />
                Move to Trash
              </button>
            </li>
          )}
        </ul>
      </div>
      <Button className={styles.cancel} onClick={onClose}>
        Cancel
      </Button>
    </Sheet>
  );
}
