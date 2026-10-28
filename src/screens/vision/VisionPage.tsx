import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GRID_ROWS, twoColumns } from '@/domain/vision';
import { addImageCards, areasRepo, fetchImage, loadVisionBoard, VisionError, type VisionCardView } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button, Menu, Segmented, Sheet } from '@/components/ui';
import { Toast } from '@/components/ui/Toast';
import { cx } from '@/components/ui/cx';
import { prepareImage } from '@/lib/images';
import { useIsMobile } from '@/lib/useMediaQuery';
import { useToday } from '@/lib/useToday';
import { FreeCanvas } from './FreeCanvas';
import { VisionCard } from './VisionCard';
import { CardDialog, ImageLinkDialog, LibraryPhotosDialog, PinGoalDialog } from './VisionDialogs';
import styles from './Vision.module.css';

type Open = { kind: 'card'; card?: VisionCardView } | { kind: 'pin' } | { kind: 'library' } | { kind: 'link' } | null;

/** /vision: the year's board of words and pictures, by area, with goals pinned to them. */
export function VisionPage() {
  const today = useToday();
  const phone = useIsMobile();
  const [params, setParams] = useSearchParams();
  const layout = !phone && params.get('layout') === 'canvas' ? 'canvas' : 'grid';
  const areaFilter = params.get('area');
  const board = useLiveQuery(() => loadVisionBoard(today), [today]);
  const areas = useLiveQuery(() => areasRepo.listOrdered(), []);
  const [open, setOpen] = useState<Open>(null);
  // The phone's + sheet has its own state: closing it must not close the dialog it opens.
  const [sheet, setSheet] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  async function addFiles(files: Iterable<File>) {
    const images = [...files].filter((f) => f.type.startsWith('image/'));
    if (!images.length) return setMessage('Those aren’t pictures. Try a JPEG, PNG or HEIC.');
    const prepared = await Promise.all(images.map(async (f) => ({ ...(await prepareImage(f, 900)), name: f.name })));
    await addImageCards(prepared, { areaId: areaFilter });
    setMessage(images.length === 1 ? 'Added a picture to your board.' : `Added ${images.length} pictures to your board.`);
  }

  async function addFromLink(url: string): Promise<string | null> {
    try {
      const blob = await fetchImage(url);
      const name = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '');
      await addImageCards([{ ...(await prepareImage(blob, 900)), name }], { areaId: areaFilter });
      setMessage('Added a picture to your board.');
      return null;
    } catch (err) {
      return err instanceof VisionError ? err.message : 'That picture couldn’t be added.';
    }
  }

  // Paste a picture (or a link to one) anywhere on the board, outside text fields.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"], dialog')) return;
      const files = [...(event.clipboardData?.files ?? [])];
      if (files.length) {
        event.preventDefault();
        void addFiles(files);
        return;
      }
      const text = event.clipboardData?.getData('text/plain').trim() ?? '';
      if (/^https?:\/\/\S+$/i.test(text)) {
        event.preventDefault();
        void addFromLink(text).then((problem) => problem && setMessage(problem));
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  });

  const cards = (board?.cards ?? []).filter((c) => !areaFilter || c.areaId === areaFilter);
  const all = board?.cards ?? [];
  const editing = open?.kind === 'card' ? open.card : undefined;
  const filterName = areas?.find((a) => a.id === areaFilter)?.name;

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      multiple
      hidden
      aria-label="Choose pictures for the board"
      onChange={(e) => {
        if (e.target.files) void addFiles(e.target.files);
        e.target.value = '';
      }}
    />
  );

  const dialogs = (
    <>
      <CardDialog open={open?.kind === 'card'} onClose={() => setOpen(null)} card={editing} position={editing ? { index: all.findIndex((c) => c.id === editing.id), count: all.length } : undefined} />
      <PinGoalDialog open={open?.kind === 'pin'} onClose={() => setOpen(null)} cards={all} />
      <LibraryPhotosDialog open={open?.kind === 'library'} onClose={() => setOpen(null)} />
      <ImageLinkDialog open={open?.kind === 'link'} onClose={() => setOpen(null)} onAdd={addFromLink} />
      {message && <Toast onDone={() => setMessage('')}>{message}</Toast>}
      {fileInput}
    </>
  );

  const word = board && (
    <WordOfYear word={board.word} year={board.year} phone={phone} />
  );

  if (phone) {
    const [left, right] = twoColumns(cards);
    return (
      <div className={styles.phone}>
        <header className={styles.phoneHeader}>
          <Link to="/" className={styles.phoneBack} aria-label="Back to Home">
            <Icon name="chevronLeft" size={18} />
            Home
          </Link>
          <h1 className={styles.phoneTitle}>Vision board</h1>
          <button type="button" className={styles.roundButton} aria-label="Add to board" onClick={() => setSheet(true)}>
            <Icon name="plus" size={20} />
          </button>
        </header>
        {word}
        {board && cards.length === 0 && <Empty onWords={() => setOpen({ kind: 'card' })} onImages={() => fileRef.current?.click()} />}
        <div className={styles.columns}>
          {[left, right].map((col, i) => (
            <div key={i} className={styles.column}>
              {col.map((card) => (
                <VisionCard key={card.id} card={card} phone onEdit={() => setOpen({ kind: 'card', card })} />
              ))}
            </div>
          ))}
        </div>
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Add to board">
          <div className={styles.sheetActions}>
            <Button
              variant="primary"
              icon={<Icon name="image" size={16} />}
              onClick={() => {
                setSheet(false);
                fileRef.current?.click();
              }}
            >
              Add pictures
            </Button>
            <Button
              onClick={() => {
                setSheet(false);
                setOpen({ kind: 'card' });
              }}
            >
              Add words
            </Button>
            <Button
              onClick={() => {
                setSheet(false);
                setOpen({ kind: 'library' });
              }}
            >
              Pick from your Library
            </Button>
            <Button
              onClick={() => {
                setSheet(false);
                setOpen({ kind: 'pin' });
              }}
            >
              Pin a goal
            </Button>
          </div>
        </Sheet>
        {dialogs}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.titleBlock}>
            <span className={styles.eyebrow}>{board?.year}</span>
            <h1 className={styles.title}>Vision board</h1>
          </div>
          {word}
        </div>
        <div className={styles.actions}>
          <Segmented
            label="Layout"
            value={layout}
            onChange={(v) => setParam('layout', v === 'canvas' ? 'canvas' : null)}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'canvas', label: 'Free canvas' },
            ]}
          />
          <Menu
            label={`Showing ${filterName ?? 'All areas'}`}
            className={styles.filter}
            trigger={
              <span className={styles.filterLabel}>
                {filterName ?? 'All areas'}
                <Icon name="chevronDown" size={14} />
              </span>
            }
            items={[{ label: 'All areas', onSelect: () => setParam('area', null) }, ...(areas ?? []).map((a) => ({ label: a.name, onSelect: () => setParam('area', a.id) }))]}
          />
          <Button onClick={() => setOpen({ kind: 'card' })}>Add words</Button>
          <Button onClick={() => setOpen({ kind: 'pin' })}>Pin a goal</Button>
          <Button variant="primary" onClick={() => fileRef.current?.click()}>
            Add images
          </Button>
        </div>
      </header>

      {board && all.length === 0 && <Empty onWords={() => setOpen({ kind: 'card' })} onImages={() => fileRef.current?.click()} />}
      {board && all.length > 0 && cards.length === 0 && <p className={styles.quiet}>Nothing on the board for {filterName} yet.</p>}

      {layout === 'grid' ? (
        <div className={styles.grid}>
          {cards.map((card) => (
            <VisionCard key={card.id} card={card} onEdit={() => setOpen({ kind: 'card', card })} style={{ gridRow: `span ${GRID_ROWS[card.size]}` }} />
          ))}
          <DropZone onFiles={addFiles} onLink={() => setOpen({ kind: 'link' })} onLibrary={() => setOpen({ kind: 'library' })} className={styles.gridDrop} />
        </div>
      ) : (
        <>
          <FreeCanvas cards={cards} onEdit={(card) => setOpen({ kind: 'card', card })} />
          <DropZone onFiles={addFiles} onLink={() => setOpen({ kind: 'link' })} onLibrary={() => setOpen({ kind: 'library' })} />
        </>
      )}
      {dialogs}
    </div>
  );
}

function WordOfYear({ word, year, phone }: { word: string | null; year: number; phone: boolean }) {
  if (phone) {
    return (
      <div className={styles.phoneWord}>
        <span>{year}, word of the year</span>
        {word ? (
          <Link to="/goals" className={styles.wordPill}>
            {word}
          </Link>
        ) : (
          <Link to="/goals" className={styles.textLink}>
            Choose one
          </Link>
        )}
      </div>
    );
  }
  return (
    <Link to="/goals" className={styles.wordChip}>
      {word ? (
        <>
          Word of the year: <strong>{word}</strong>
        </>
      ) : (
        'Choose a word of the year'
      )}
    </Link>
  );
}

function DropZone({ onFiles, onLink, onLibrary, className }: { onFiles: (files: FileList) => void; onLink: () => void; onLibrary: () => void; className?: string }) {
  const [over, setOver] = useState(false);
  const stop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <div
      className={cx(styles.drop, over && styles.dropOver, className)}
      onDragOver={(e) => {
        stop(e);
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        stop(e);
        setOver(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      <Icon name="plus" size={18} />
      <span>
        Drop images,{' '}
        <button type="button" className={styles.inlineButton} onClick={onLink}>
          paste a link
        </button>
        , or{' '}
        <button type="button" className={styles.inlineButton} onClick={onLibrary}>
          pick photos from your Library
        </button>
      </span>
    </div>
  );
}

function Empty({ onWords, onImages }: { onWords: () => void; onImages: () => void }) {
  return (
    <section className={styles.empty} aria-label="Empty board">
      <h2 className={styles.emptyTitle}>Picture the year you want</h2>
      <p className={styles.quiet}>Add a few words for each part of your life, pictures that pull you forward, and pin the goals that get you there.</p>
      <div className={styles.emptyActions}>
        <Button variant="primary" onClick={onImages}>
          Add images
        </Button>
        <Button onClick={onWords}>Add words</Button>
      </div>
    </section>
  );
}
