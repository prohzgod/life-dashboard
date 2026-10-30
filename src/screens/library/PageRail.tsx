import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { listBacklinks, listNodeAttachments, type LibraryNode } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { timeAgo } from '@/lib/format';
import { useT } from '@/i18n';
import styles from './Library.module.css';

function size(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** What links here, what's attached, and where it's stored. */
export function PageRail({ node }: { node: LibraryNode }) {
  const { library } = useT();
  const t = library.rail;
  const backlinks = useLiveQuery(() => listBacklinks(node.id), [node.id]);
  const attachments = useLiveQuery(() => listNodeAttachments(node.id), [node.id]);

  return (
    <aside className={styles.rail} aria-label={t.label}>
      <section className={styles.railSection} aria-labelledby="linked-from">
        <h2 id="linked-from" className={styles.railHeading}>
          {t.linkedFrom} <span className={styles.railCount}>{backlinks?.length ?? 0}</span>
        </h2>
        {backlinks?.length === 0 && <p className={styles.railEmpty}>{t.noLinks}</p>}
        {backlinks?.map(({ node: from, snippet }) => (
          <Link key={from.id} to={`/library/${from.id}`} className={styles.backlink}>
            <span className={styles.backlinkTitle}>{from.title}</span>
            {snippet && <span className={styles.backlinkSnippet}>“{snippet}”</span>}
          </Link>
        ))}
      </section>

      {attachments && attachments.length > 0 && (
        <section className={styles.railSection} aria-labelledby="attachments">
          <h2 id="attachments" className={styles.railHeading}>
            {t.attachments}
          </h2>
          <ul className={styles.plainList}>
            {attachments.map((a) => (
              <li key={a.id} className={styles.attachment}>
                <Icon name={a.mime.startsWith('image/') ? 'image' : 'paperclip'} size={15} />
                <span className={styles.grow}>{a.caption || (a.mime.startsWith('image/') ? t.image : t.file)}</span>
                <span className={styles.railCount}>{size(a.size)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.stored}>
        <span className={styles.storedTitle}>
          <Icon name="lock" size={14} />
          {t.stored}
        </span>
        <span>{library.edited(timeAgo(node.updatedAt))}</span>
      </div>
    </aside>
  );
}
