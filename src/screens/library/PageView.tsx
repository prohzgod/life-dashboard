import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ancestors } from '@/domain/library';
import { journalDayOf, LibraryError, pinnedWidget, pinToHome, renameNode, savePageContent, toggleFavorite, trashNode, unpinFromHome, type LibraryNode } from '@/data';
import { useLiveQuery } from 'dexie-react-hooks';
import { Toast } from '@/components/ui/Toast';
import { useIsMobile } from '@/lib/useMediaQuery';
import { useSavedLabel } from '@/lib/useSyncStatus';
import { PageOptionsSheet } from './PageOptionsSheet';
import { Icon } from '@/components/icons/Icon';
import { Menu } from '@/components/ui';
import { PageEditor } from './editor/PageEditor';
import { JournalCheckIn } from './JournalCheckIn';
import { PageProperties } from './PageProperties';
import { PageRail } from './PageRail';
import { MobileTopBar } from './MobileTopBar';
import { LOCALES, messages, useT } from '@/i18n';
import { formatDayLong } from '@/lib/format';
import styles from './Library.module.css';

export function PageView({ node, all }: { node: LibraryNode; all: LibraryNode[] }) {
  const { library } = useT();
  const t = library.page;
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const day = journalDayOf(node);
  const trail = ancestors(all, node.id);
  const isMobile = useIsMobile();
  const [sheet, setSheet] = useState(false);
  const savedLabel = useSavedLabel();
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const pinned = useLiveQuery(async () => !!(await pinnedWidget('node', node.id)), [node.id]);

  async function setPinned(pin: boolean) {
    if (pin) await pinToHome('node', node.id);
    else await unpinFromHome('node', node.id);
    setToast(pin ? t.pinned : t.unpinned);
  }

  async function trash() {
    try {
      await trashNode(node.id);
      navigate(node.parentId ? `/library/${node.parentId}` : '/library');
    } catch (e) {
      setError(e instanceof LibraryError ? e.message : library.failed);
    }
  }

  return (
    <>
      <div className={styles.main}>
        {isMobile ? (
          <MobileTopBar parent={trail.at(-1)}>
            <button type="button" className={styles.optionsButton} aria-label={t.options} onClick={() => setSheet(true)}>
              <Icon name="more" size={18} strokeWidth={3} />
            </button>
          </MobileTopBar>
        ) : (
        <div className={styles.topBar}>
          <nav aria-label={library.breadcrumb} className={styles.breadcrumb}>
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
          <div className={styles.topActions}>
            <span className={styles.saved} role="status">
              <span className={saving ? styles.savingDot : styles.savedDot} aria-hidden="true" />
              {saving ? t.saving : savedLabel}
            </span>
            <Menu
                label={t.options}
                trigger={<Icon name="more" size={18} strokeWidth={3} />}
                items={[
                  { label: pinned ? library.options.unpin : library.options.pin, onSelect: () => void setPinned(!pinned) },
                  { label: node.favoritedAt ? library.options.removeFavourite : library.options.addFavourite, onSelect: () => void toggleFavorite(node.id) },
                  { label: library.moveToTrash, danger: true, disabled: node.isSystem, onSelect: () => void trash() },
                ]}
              />
          </div>
        </div>
        )}
        <article className={styles.article}>
          {day ? (
            <h1 className={styles.pageTitle}>{formatDayLong(day)}</h1>
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
      </div>
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
          {toast === t.pinned && (
            <>
              {', '}
              <Link to="/">{t.view}</Link>
            </>
          )}
        </Toast>
      )}
    </>
  );
}

function TitleInput({ node }: { node: LibraryNode }) {
  const { library, seed } = useT();
  // New pages are named "Untitled" in the language they were made in.
  const untitled = LOCALES.some((locale) => messages(locale).seed.untitled === node.title);
  const [value, setValue] = useState(untitled ? '' : node.title);
  return (
    <input
      className={styles.pageTitle}
      aria-label={library.page.title}
      placeholder={seed.untitled}
      value={value}
      autoFocus={untitled}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void renameNode(node.id, value || seed.untitled)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}
