import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Tree, type NodeRendererProps, type TreeApi } from 'react-arborist';
import { Link, useNavigate } from 'react-router-dom';
import { ancestors, buildTree, canMove, dropIndexWithoutSelf, isJournalManaged, type TreeItem } from '@/domain/library';
import { createNode, journalDayOf, LibraryError, listLibraryNodes, listPhotos, moveNode, searchLibrary, type LibraryNode } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { cx } from '@/components/ui/cx';
import { useToday } from '@/lib/useToday';
import { plural } from '@/lib/format';
import styles from './Library.module.css';

type Row = { id: string; name: string; node: LibraryNode; children: Row[] };

function toRows(items: Array<TreeItem<LibraryNode>>): Row[] {
  return items.map((item) => ({ id: item.id, name: item.title, node: item, children: toRows(item.children) }));
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 256, height: 480 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

type Props = { currentId: string | null; section: 'trash' | 'photos' | null };

export function LibraryTree({ currentId, section }: Props) {
  const navigate = useNavigate();
  const today = useToday();
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [boxRef, size] = useElementSize<HTMLDivElement>();
  const treeRef = useRef<TreeApi<Row> | undefined>(undefined);

  const nodes = useLiveQuery(listLibraryNodes);
  const photoCount = useLiveQuery(async () => (await listPhotos()).length);
  const results = useLiveQuery(() => (query.trim() ? searchLibrary(query) : Promise.resolve(null)), [query]);
  const rows = useMemo(() => toRows(buildTree(nodes ?? [])), [nodes]);
  const favourites = (nodes ?? []).filter((n) => n.favoritedAt).sort((a, b) => a.title.localeCompare(b.title));
  const current = nodes?.find((n) => n.id === currentId);

  // Open the way to the current page, and the Journal down to this month.
  const loaded = !!nodes;
  const initialOpen = useMemo(() => {
    if (!nodes) return {};
    const open: Record<string, boolean> = {};
    for (const n of nodes) {
      if (n.systemKey === 'journal' || n.systemKey === `journal:${today.slice(0, 4)}` || n.systemKey === `journal:${today.slice(0, 7)}`) open[n.id] = true;
    }
    if (currentId) for (const a of ancestors(nodes, currentId)) open[a.id] = true;
    return open;
    // Only on first load; afterwards the tree keeps its own open state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Reveal and mark the open page. (The tree's own lookup only sees visible rows, so let
  // scrollTo open the folders first; select without taking focus from the page.)
  const exists = !!currentId && !!nodes?.some((n) => n.id === currentId);
  useEffect(() => {
    const tree = treeRef.current;
    if (!tree || !currentId || !exists) return;
    void tree.scrollTo(currentId)?.then(() => tree.select(currentId, { focus: false }));
  }, [currentId, exists, rows]);

  async function create(kind: 'page' | 'folder') {
    // New items go inside the open folder or page. From the Journal they start at the top level.
    const parentId = current && !isJournalManaged(current) ? current.id : null;
    try {
      const node = await createNode({ parentId, kind });
      navigate(`/library/${node.id}`);
    } catch (error) {
      setMessage(error instanceof LibraryError ? error.message : 'That didn’t work. Try again.');
    }
  }

  return (
    <aside className={styles.tree} aria-label="Library tree">
      <div className={styles.treeHeader}>
        <h1 className={styles.treeTitle}>Library</h1>
        <div className={styles.treeActions}>
          <button type="button" className={styles.iconButton} aria-label="New page" title="New page" onClick={() => void create('page')}>
            <Icon name="newPage" size={18} />
          </button>
          <button type="button" className={styles.iconButton} aria-label="New folder" title="New folder" onClick={() => void create('folder')}>
            <Icon name="newFolder" size={18} />
          </button>
        </div>
      </div>

      <label className={styles.filter}>
        <Icon name="search" size={15} />
        <input type="search" aria-label="Search pages" placeholder="Search pages and notes" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      {results ? (
        <div className={styles.results} role="region" aria-label="Search results">
          {results.length === 0 && <p className={styles.treeNote}>No pages match “{query.trim()}”.</p>}
          <ul className={styles.plainList}>
            {results.map((hit) => (
              <li key={hit.id}>
                <Link to={`/library/${hit.id}`} className={styles.result} onClick={() => setQuery('')}>
                  <span className={styles.resultTitle}>{hit.title}</span>
                  {hit.snippet && <span className={styles.resultSnippet}>{hit.snippet}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          {favourites.length > 0 && (
            <nav aria-labelledby="favourites-label" className={styles.favourites}>
              <h2 id="favourites-label" className={styles.sectionLabel}>
                Favourites
              </h2>
              {favourites.map((n) => (
                <Link key={n.id} to={`/library/${n.id}`} className={cx(styles.favourite, n.id === currentId && styles.rowActive)} aria-current={n.id === currentId ? 'page' : undefined}>
                  <Icon name="star" size={14} />
                  {n.title}
                </Link>
              ))}
            </nav>
          )}
          <h2 className={styles.sectionLabel}>Personal space</h2>
          <div ref={boxRef} className={styles.treeBox}>
            {nodes && (
              <Tree<Row>
                ref={treeRef}
                data={rows}
                width={size.width}
                height={size.height}
                rowHeight={30}
                indent={18}
                padding={0}
                openByDefault={false}
                initialOpenState={initialOpen}
                selection={currentId ?? undefined}
                disableEdit
                disableMultiSelection
                disableDrag={(row) => row.node.isSystem}
                disableDrop={({ parentNode, dragNodes }) =>
                  dragNodes.some((d) => !canMove(nodes, d.data.node, parentNode.isRoot ? null : parentNode.id).ok)
                }
                onActivate={(row) => navigate(`/library/${row.id}`)}
                onMove={async ({ dragIds, parentId, parentNode, index }) => {
                  const id = dragIds[0];
                  if (!id) return;
                  const siblings = (parentNode?.children ?? treeRef.current?.root.children ?? []).map((c) => c.id);
                  try {
                    await moveNode(id, parentId, dropIndexWithoutSelf(siblings, id, index));
                    setMessage('');
                  } catch (error) {
                    setMessage(error instanceof LibraryError ? error.message : 'That move didn’t work.');
                  }
                }}
              >
                {(props) => <TreeRow {...props} today={today} />}
              </Tree>
            )}
          </div>
          <nav className={styles.specials} aria-label="More">
            <Link to="/library/photos" className={cx(styles.special, section === 'photos' && styles.rowActive)} aria-current={section === 'photos' ? 'page' : undefined}>
              <Icon name="image" size={16} />
              <span className={styles.grow}>All photos</span>
              {!!photoCount && <span className={styles.count}>{photoCount.toLocaleString()}</span>}
            </Link>
            <Link to="/library/trash" className={cx(styles.special, section === 'trash' && styles.rowActive)} aria-current={section === 'trash' ? 'page' : undefined}>
              <Icon name="trash" size={16} />
              Trash
            </Link>
          </nav>
        </>
      )}

      <p className={styles.treeNote} role="status">
        {message || `Drag to move or nest. On this device: ${plural((nodes ?? []).filter((n) => n.kind === 'page').length, 'page')}${photoCount ? `, ${plural(photoCount, 'image')}` : ''}.`}
      </p>
    </aside>
  );
}

function TreeRow({ node, style, dragHandle, today }: NodeRendererProps<Row> & { today: string }) {
  const data = node.data.node;
  const day = journalDayOf(data);
  const hasChildren = node.children !== null && node.children.length > 0;
  const top = node.level === 0;
  return (
    <div
      ref={dragHandle}
      style={style}
      className={cx(styles.row, node.isSelected && styles.rowActive, node.willReceiveDrop && styles.rowDrop, top && styles.rowTop)}
    >
      {hasChildren ? (
        <button
          type="button"
          className={styles.chevron}
          aria-label={node.isOpen ? `Collapse ${data.title}` : `Expand ${data.title}`}
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            node.toggle();
          }}
        >
          <Icon name={node.isOpen ? 'chevronDown' : 'chevronRight'} size={14} strokeWidth={2} />
        </button>
      ) : (
        <span className={styles.chevronSpacer} />
      )}
      {(top || !day) && <Icon name={data.kind === 'folder' ? 'folder' : 'page'} size={15} className={styles.rowIcon} />}
      <span className={styles.rowLabel}>{day === today ? `${data.title.split(' ').slice(0, 2).join(' ')} · today` : data.title}</span>
      {day === today && <span className={styles.todayDot} aria-hidden="true" />}
    </div>
  );
}

