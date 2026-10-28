import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ancestors } from '@/domain/library';
import { journalDayOf, LibraryError, pinnedWidget, pinToHome, renameNode, savePageContent, toggleFavorite, trashNode, unpinFromHome, type LibraryNode } from '@/data';
import { useLiveQuery } from 'dexie-react-hooks';
import { Toast } from '@/components/ui/Toast';
import { useIsMobile } from '@/lib/useMediaQuery';
import { PageOptionsSheet } from './PageOptionsSheet';
import { Icon } from '@/components/icons/Icon';
import { Menu } from '@/components/ui';
import { dayToDate } from '@/domain/days';
import { PageEditor } from './editor/PageEditor';
import { JournalCheckIn } from './JournalCheckIn';
import { PageProperties } from './PageProperties';
import { PageRail } from './PageRail';
import styles from './Library.module.css';

const LONG_DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function PageView({ node, all }: { node: LibraryNode; all: LibraryNode[] }) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const day = journalDayOf(node);
  const trail = ancestors(all, node.id);
  const isMobile = useIsMobile();
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const pinned = useLiveQuery(async () => !!(await pinnedWidget('node', node.id)), [node.id]);

  async function setPinned(pin: boolean) {
    if (pin) await pinToHome('node', node.id);
    else await unpinFromHome('node', node.id);
    setToast(pin ? 'Pinned to Home' : 'Removed from Home');
  }

  async function trash() {
    try {
      await trashNode(node.id);
      navigate(node.parentId ? `/library/${node.parentId}` : '/library');
    } catch (e) {
      setError(e instanceof LibraryError ? e.message : 'That didn’t work.');
    }
  }

  return (
    <>
      <main className={styles.main}>
        <div className={styles.topBar}>
          {isMobile ? (
            <Link to={trail.at(-1) ? `/library/${trail.at(-1)!.id}` : '/library'} className={styles.mobileBack} aria-label={`Back to ${trail.at(-1)?.title ?? 'Library'}`}>
              <Icon name="chevronLeft" size={20} strokeWidth={2.2} />
              {trail.at(-1)?.title ?? 'Library'}
            </Link>
          ) : (
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
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
          )}
          <div className={styles.topActions}>
            <span className={styles.saved} role="status">
              <span className={saving ? styles.savingDot : styles.savedDot} aria-hidden="true" />
              {saving ? 'Saving…' : 'Saved on this device'}
            </span>
            {isMobile ? (
              <button type="button" className={styles.optionsButton} aria-label="Page options" onClick={() => setSheet(true)}>
                <Icon name="more" size={18} strokeWidth={3} />
              </button>
            ) : (
              <Menu
                label="Page options"
                trigger={<Icon name="more" size={18} strokeWidth={3} />}
                items={[
                  { label: pinned ? 'Unpin from Home' : 'Pin to Home', onSelect: () => void setPinned(!pinned) },
                  { label: node.favoritedAt ? 'Remove from favourites' : 'Add to favourites', onSelect: () => void toggleFavorite(node.id) },
                  { label: 'Move to Trash', danger: true, disabled: node.isSystem, onSelect: () => void trash() },
                ]}
              />
            )}
          </div>
        </div>
        <article className={styles.article}>
          {day ? (
            <h1 className={styles.pageTitle}>{LONG_DATE.format(dayToDate(day))}</h1>
          ) : (
            <TitleInput key={node.title} node={node} />
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <PageProperties node={node} />
          {day && <JournalCheckIn day={day} />}
          <PageEditor key={node.id} node={node} onSave={(doc) => void savePageContent(node.id, doc)} onSaving={setSaving} />
        </article>
      </main>
      {!isMobile && <PageRail node={node} />}
      <PageOptionsSheet
        open={sheet}
        onClose={() => setSheet(false)}
        node={node}
        parentTitle={trail.at(-1)?.title ?? null}
        onPin={(pin) => void setPinned(pin)}
        onTrash={() => {
          setSheet(false);
          void trash();
        }}
      />
      {toast && (
        <Toast onDone={clearToast}>
          <Icon name="pin" size={15} />
          {toast}
          {toast === 'Pinned to Home' && (
            <>
              {', '}
              <Link to="/">View</Link>
            </>
          )}
        </Toast>
      )}
    </>
  );
}

function TitleInput({ node }: { node: LibraryNode }) {
  const [value, setValue] = useState(node.title === 'Untitled' ? '' : node.title);
  return (
    <input
      className={styles.pageTitle}
      aria-label="Page title"
      placeholder="Untitled"
      value={value}
      autoFocus={node.title === 'Untitled'}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void renameNode(node.id, value || 'Untitled')}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}
