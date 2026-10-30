import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ensureJournalPage, getNode, listLibraryNodes } from '@/data';
import { isDay } from '@/domain/days';
import { EmptyState } from '@/components/shell/EmptyState';
import { useToday } from '@/lib/useToday';
import { useIsMobile } from '@/lib/useMediaQuery';
import { FolderView } from './FolderView';
import { LibraryTree } from './LibraryTree';
import { PageView } from './PageView';
import { PhotosView } from './PhotosView';
import { TrashView } from './TrashView';
import { useT } from '@/i18n';
import styles from './Library.module.css';

type Mode = 'home' | 'day' | 'node' | 'trash' | 'photos';

export function LibraryPage({ mode }: { mode: Mode }) {
  const params = useParams();
  const currentId = mode === 'node' ? (params.nodeId ?? null) : null;
  const isMobile = useIsMobile();
  // Phones: the Library tab is the tree itself; pages, Trash and photos open full-screen over it.
  if (isMobile && mode === 'home') {
    return (
      <div className={styles.page}>
        <LibraryTree currentId={null} section={null} mobile />
      </div>
    );
  }
  return (
    <div className={styles.page}>
      {!isMobile && <LibraryTree currentId={currentId} section={mode === 'trash' || mode === 'photos' ? mode : null} />}
      {mode === 'home' && <JournalRedirect />}
      {mode === 'day' && <JournalRedirect day={params.day} />}
      {mode === 'trash' && <TrashView />}
      {mode === 'photos' && <PhotosView />}
      {mode === 'node' && currentId && <NodeView key={currentId} id={currentId} />}
    </div>
  );
}

/** /library and /library/day/:day open that day's Journal page, creating it on first visit. */
function JournalRedirect({ day }: { day?: string }) {
  const today = useToday();
  const target = day && isDay(day) ? day : today;
  const [pageId, setPageId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    ensureJournalPage(target).then(
      (page) => live && setPageId(page.id),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [target]);
  if (pageId) return <Navigate to={`/library/${pageId}`} replace />;
  if (failed) return <Missing />;
  return <main className={styles.main} aria-busy="true" />;
}

function NodeView({ id }: { id: string }) {
  const data = useLiveQuery(async () => ({ node: (await getNode(id)) ?? null, all: await listLibraryNodes() }), [id]);
  if (!data) return <main className={styles.main} aria-busy="true" />;
  if (!data.node) return <Missing />;
  return data.node.kind === 'folder' ? <FolderView node={data.node} all={data.all} /> : <PageView node={data.node} all={data.all} />;
}

function Missing() {
  const t = useT().library;
  return (
    <main className={styles.main}>
      <div className={styles.missing}>
        <EmptyState icon="library" heading={t.missingHeading} body={t.missingBody} />
      </div>
    </main>
  );
}
