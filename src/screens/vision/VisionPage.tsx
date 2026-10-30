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
import { useT } from '@/i18n';
import styles from './Vision.module.css';

type Open = { kind: 'card'; card?: VisionCardView } | { kind: 'pin' } | { kind: 'library' } | { kind: 'link' } | null;

/** /vision: the year's board of words and pictures, by area, with goals pinned to them. */
export function VisionPage() {
  const t = useT().vision;
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
    if (!images.length) return setMessage(t.notPictures);
    const prepared = await Promise.all(images.map(async (f) => ({ ...(await prepareImage(f, 900)), name: f.name })));
    await addImageCards(prepared, { areaId: areaFilter });
    setMessage(t.added(images.length));
  }

  async function addFromLink(url: string): Promise<string | null> {
    try {
      const blob = await fetchImage(url);
      const name = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '');
      await addImageCards([{ ...(await prepareImage(blob, 900)), name }], { areaId: areaFilter });
      setMessage(t.added(1));
      return null;
    } catch (err) {
      return err instanceof VisionError ? err.message : t.addFailed;
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
      aria-label={t.choose}
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
          <Link to="/" className={styles.phoneBack} aria-label={t.backHome}>
            <Icon name="chevronLeft" size={18} />
            {t.home}
          </Link>
          <h1 className={styles.phoneTitle}>{t.title}</h1>
          <button type="button" className={styles.roundButton} aria-label={t.addToBoard} onClick={() => setSheet(true)}>
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
        <Sheet open={sheet} onClose={() => setSheet(false)} title={t.addToBoard}>
          <div className={styles.sheetActions}>
            <Button
              variant="primary"
              icon={<Icon name="image" size={16} />}
              onClick={() => {
                setSheet(false);
                fileRef.current?.click();
              }}
            >
              {t.addPictures}
            </Button>
            <Button
              onClick={() => {
                setSheet(false);
                setOpen({ kind: 'card' });
              }}
            >
              {t.addWords}
            </Button>
            <Button
              onClick={() => {
                setSheet(false);
                setOpen({ kind: 'library' });
              }}
            >
              {t.fromLibrary}
            </Button>
            <Button
              onClick={() => {
                setSheet(false);
                setOpen({ kind: 'pin' });
              }}
            >
              {t.pinGoal}
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
            <h1 className={styles.title}>{t.title}</h1>
          </div>
          {word}
        </div>
        <div className={styles.actions}>
          <Segmented
            label={t.layout}
            value={layout}
            onChange={(v) => setParam('layout', v === 'canvas' ? 'canvas' : null)}
            options={[
              { value: 'grid', label: t.layouts.grid },
              { value: 'canvas', label: t.layouts.canvas },
            ]}
          />
          <Menu
            label={t.showing(filterName ?? t.allAreas)}
            className={styles.filter}
            trigger={
              <span className={styles.filterLabel}>
                {filterName ?? t.allAreas}
                <Icon name="chevronDown" size={14} />
              </span>
            }
            items={[{ label: t.allAreas, onSelect: () => setParam('area', null) }, ...(areas ?? []).map((a) => ({ label: a.name, onSelect: () => setParam('area', a.id) }))]}
          />
          <Button onClick={() => setOpen({ kind: 'card' })}>{t.addWords}</Button>
          <Button onClick={() => setOpen({ kind: 'pin' })}>{t.pinGoal}</Button>
          <Button variant="primary" onClick={() => fileRef.current?.click()}>
            {t.addImages}
          </Button>
        </div>
      </header>

      {board && all.length === 0 && <Empty onWords={() => setOpen({ kind: 'card' })} onImages={() => fileRef.current?.click()} />}
      {board && all.length > 0 && cards.length === 0 && <p className={styles.quiet}>{t.nothingFor(filterName ?? '')}</p>}

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
  const t = useT().vision;
  if (phone) {
    return (
      <div className={styles.phoneWord}>
        <span>{t.phoneWord(year)}</span>
        {word ? (
          <Link to="/goals" className={styles.wordPill}>
            {word}
          </Link>
        ) : (
          <Link to="/goals" className={styles.textLink}>
            {t.chooseOne}
          </Link>
        )}
      </div>
    );
  }
  return (
    <Link to="/goals" className={styles.wordChip}>
      {word ? (
        <>
          {t.wordOfYear} <strong>{word}</strong>
        </>
      ) : (
        t.chooseWord
      )}
    </Link>
  );
}

function DropZone({ onFiles, onLink, onLibrary, className }: { onFiles: (files: FileList) => void; onLink: () => void; onLibrary: () => void; className?: string }) {
  const t = useT().vision;
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
        {t.dropImages}{' '}
        <button type="button" className={styles.inlineButton} onClick={onLink}>
          {t.pasteLink}
        </button>
        {t.or}{' '}
        <button type="button" className={styles.inlineButton} onClick={onLibrary}>
          {t.pickPhotos}
        </button>
      </span>
    </div>
  );
}

function Empty({ onWords, onImages }: { onWords: () => void; onImages: () => void }) {
  const t = useT().vision;
  return (
    <section className={styles.empty} aria-label={t.empty.label}>
      <h2 className={styles.emptyTitle}>{t.empty.title}</h2>
      <p className={styles.quiet}>{t.empty.body}</p>
      <div className={styles.emptyActions}>
        <Button variant="primary" onClick={onImages}>
          {t.addImages}
        </Button>
        <Button onClick={onWords}>{t.addWords}</Button>
      </div>
    </section>
  );
}
