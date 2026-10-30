import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ancestors, isJournalManaged } from '@/domain/library';
import { createNode, LibraryError, renameNode, trashNode, type LibraryNode } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button, Menu } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { useT } from '@/i18n';
import styles from './Library.module.css';

export function FolderView({ node, all }: { node: LibraryNode; all: LibraryNode[] }) {
  const t = useT().library;
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const children = all.filter((n) => n.parentId === node.id).sort((a, b) => (a.sortKey < b.sortKey ? -1 : 1));
  const journalFolder = isJournalManaged(node);
  const trail = ancestors(all, node.id);

  async function add(kind: 'page' | 'folder') {
    try {
      const created = await createNode({ parentId: node.id, kind });
      navigate(`/library/${created.id}`);
    } catch (e) {
      setError(e instanceof LibraryError ? e.message : t.failed);
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.topBar}>
        <nav aria-label={t.breadcrumb} className={styles.breadcrumb}>
          {trail.map((a) => (
            <span key={a.id}>
              <Link to={`/library/${a.id}`}>{a.title}</Link>
              <span aria-hidden="true"> / </span>
            </span>
          ))}
          <span className={styles.crumbCurrent} aria-current="page">
            {node.title}
          </span>
        </nav>
        {!node.isSystem && (
          <Menu
            label={t.folderOptions}
            trigger={<Icon name="more" size={18} strokeWidth={3} />}
            items={[
              {
                label: t.moveToTrash,
                danger: true,
                onSelect: async () => {
                  await trashNode(node.id);
                  navigate('/library');
                },
              },
            ]}
          />
        )}
      </div>
      <article className={styles.article}>
        {node.isSystem ? (
          <h1 className={styles.pageTitle}>{node.title}</h1>
        ) : (
          <input
            key={node.title}
            className={styles.pageTitle}
            aria-label={t.folderName}
            defaultValue={node.title}
            onBlur={(e) => void renameNode(node.id, e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        )}
        {!journalFolder && (
          <div className={styles.folderActions}>
            <Button size="sm" variant="primary" icon={<Icon name="newPage" size={14} />} onClick={() => void add('page')}>
              {t.newPageHere}
            </Button>
            <Button size="sm" icon={<Icon name="newFolder" size={14} />} onClick={() => void add('folder')}>
              {t.newFolder}
            </Button>
          </div>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {children.length ? (
          <ul className={styles.folderList}>
            {(journalFolder ? [...children].reverse() : children).map((child) => (
              <li key={child.id}>
                <Link to={`/library/${child.id}`} className={styles.folderItem}>
                  <Icon name={child.kind === 'folder' ? 'folder' : 'page'} size={16} />
                  <span className={styles.grow}>{child.title}</span>
                  <span className={styles.railCount}>{child.kind === 'folder' ? t.folder : t.edited(timeAgo(child.updatedAt))}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.railEmpty}>{journalFolder ? t.daysAppear : t.folderEmpty}</p>
        )}
      </article>
    </main>
  );
}
