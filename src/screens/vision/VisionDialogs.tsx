import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useState, type FormEvent } from 'react';
import {
  addLibraryPhotos,
  addWordsCard,
  areasRepo,
  goalsRepo,
  listPhotos,
  moveVisionCard,
  removeVisionCard,
  updateVisionCard,
  VisionError,
  type Attachment,
  type VisionCardView,
} from '@/data';
import { Button, Segmented } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { cx } from '@/components/ui/cx';
import { useAttachmentUrl } from '@/screens/library/editor/useAttachmentUrl';
import styles from './Vision.module.css';

function useChoices() {
  return useLiveQuery(async () => {
    const [areas, goals] = await Promise.all([areasRepo.listOrdered(), goalsRepo.list((g) => g.status === 'active' && g.horizon !== 'vision')]);
    return { areas, goals: goals.sort((a, b) => a.title.localeCompare(b.title)) };
  }, []);
}

function ErrorLine({ text }: { text: string }) {
  return text ? (
    <p className={styles.formError} role="alert">
      {text}
    </p>
  ) : null;
}

/** New words, or edit any card: words or caption, area, size, style and a pinned goal. */
export function CardDialog({ open, onClose, card, position }: { open: boolean; onClose: () => void; card?: VisionCardView; position?: { index: number; count: number } }) {
  const title = card ? (card.kind === 'words' ? 'Edit words' : 'Edit picture') : 'Add words';
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      {open && <CardForm key={card?.id ?? 'new'} card={card} position={position} onDone={onClose} />}
    </Dialog>
  );
}

function CardForm({ card, position, onDone }: { card?: VisionCardView; position?: { index: number; count: number }; onDone: () => void }) {
  const id = useId();
  const choices = useChoices();
  const words = !card || card.kind === 'words';
  const [form, setForm] = useState({ text: card?.text ?? '', areaId: card?.areaId ?? '', goalId: card?.goalId ?? '', size: card?.size ?? 'S', bold: card?.bold ?? false });
  const [error, setError] = useState('');
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const fields = { text: form.text, areaId: form.areaId || null, goalId: form.goalId || null, size: form.size, bold: words && form.bold };
    try {
      if (card) await updateVisionCard(card.id, fields);
      else await addWordsCard(fields);
      onDone();
    } catch (err) {
      setError(err instanceof VisionError ? err.message : 'That didn’t save. Try again.');
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label htmlFor={`${id}-text`}>{words ? 'Words' : 'Caption'}</label>
        <textarea
          id={`${id}-text`}
          data-autofocus
          rows={words ? 3 : 2}
          value={form.text}
          onChange={(e) => set('text', e.target.value)}
          placeholder={words ? 'Strong body, quiet mind.' : 'Kyoto in spring'}
        />
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor={`${id}-area`}>Area</label>
          <select id={`${id}-area`} value={form.areaId} onChange={(e) => set('areaId', e.target.value)}>
            <option value="">No area</option>
            {choices?.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-goal`}>Pinned goal</label>
          <select id={`${id}-goal`} value={form.goalId} onChange={(e) => set('goalId', e.target.value)}>
            <option value="">None</option>
            {choices?.goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Size</span>
          <Segmented
            label="Size"
            value={form.size}
            onChange={(v) => set('size', v)}
            options={[
              { value: 'S', label: 'Regular' },
              { value: 'L', label: 'Tall' },
            ]}
          />
        </div>
        {words && (
          <label className={styles.check}>
            <input type="checkbox" checked={form.bold} onChange={(e) => set('bold', e.target.checked)} />
            Dark card
          </label>
        )}
      </div>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        {card && position && (
          <>
            <Button
              variant="quiet"
              size="sm"
              disabled={position.index === 0}
              onClick={async () => {
                await moveVisionCard(card.id, position.index - 1);
                onDone();
              }}
            >
              Move earlier
            </Button>
            <Button
              variant="quiet"
              size="sm"
              disabled={position.index >= position.count - 1}
              onClick={async () => {
                await moveVisionCard(card.id, position.index + 1);
                onDone();
              }}
            >
              Move later
            </Button>
            <Button
              variant="quiet"
              size="sm"
              className={styles.dangerButton}
              onClick={async () => {
                await removeVisionCard(card.id);
                onDone();
              }}
            >
              Remove from board
            </Button>
          </>
        )}
        <span className={styles.spacer} />
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary">
          {card ? 'Save' : 'Add to board'}
        </Button>
      </div>
    </form>
  );
}

/** Pin a goal to a card, or make a words card for it. */
export function PinGoalDialog({ open, onClose, cards }: { open: boolean; onClose: () => void; cards: VisionCardView[] }) {
  return (
    <Dialog open={open} onClose={onClose} title="Pin a goal">
      {open && <PinGoalForm cards={cards} onDone={onClose} />}
    </Dialog>
  );
}

function PinGoalForm({ cards, onDone }: { cards: VisionCardView[]; onDone: () => void }) {
  const id = useId();
  const choices = useChoices();
  const [goalId, setGoalId] = useState('');
  const [cardId, setCardId] = useState('new');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const goal = choices?.goals.find((g) => g.id === goalId);
    if (!goal) return setError('Choose a goal.');
    if (cardId === 'new') await addWordsCard({ text: goal.title, goalId: goal.id, areaId: goal.areaId });
    else await updateVisionCard(cardId, { goalId: goal.id });
    onDone();
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <p className={styles.quiet}>A pinned goal shows its progress on the card, and the card links to it.</p>
      <div className={styles.field}>
        <label htmlFor={`${id}-goal`}>Goal</label>
        <select id={`${id}-goal`} data-autofocus value={goalId} onChange={(e) => setGoalId(e.target.value)}>
          <option value="">Choose a goal</option>
          {choices?.goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-card`}>On</label>
        <select id={`${id}-card`} value={cardId} onChange={(e) => setCardId(e.target.value)}>
          <option value="new">A new card with the goal’s name</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.text || 'Picture'}
            </option>
          ))}
        </select>
      </div>
      {choices && choices.goals.length === 0 && <p className={styles.quiet}>You have no active goals yet. Set one in Goals first.</p>}
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <span className={styles.spacer} />
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary">
          Pin goal
        </Button>
      </div>
    </form>
  );
}

/** Pick pictures already in your Library. */
export function LibraryPhotosDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Photos from your Library">
      {open && <LibraryPhotosForm onDone={onClose} />}
    </Dialog>
  );
}

function LibraryPhotosForm({ onDone }: { onDone: () => void }) {
  const photos = useLiveQuery(() => listPhotos(), []);
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <form
      className={styles.form}
      onSubmit={async (e) => {
        e.preventDefault();
        await addLibraryPhotos(picked);
        onDone();
      }}
    >
      {photos && photos.length === 0 && <p className={styles.quiet}>No photos in your Library yet. Pictures you add to pages and galleries show up here.</p>}
      <ul className={styles.photoGrid} aria-label="Library photos">
        {photos?.map((p) => (
          <li key={p.id}>
            <PhotoChoice photo={p} picked={picked.includes(p.id)} onToggle={() => toggle(p.id)} />
          </li>
        ))}
      </ul>
      <div className={styles.formActions}>
        <span className={styles.spacer} />
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!picked.length}>
          {picked.length ? `Add ${picked.length} to board` : 'Add to board'}
        </Button>
      </div>
    </form>
  );
}

function PhotoChoice({ photo, picked, onToggle }: { photo: Attachment; picked: boolean; onToggle: () => void }) {
  const src = useAttachmentUrl(`attachment://${photo.id}`, true);
  return (
    <button type="button" className={cx(styles.photoChoice, picked && styles.photoPicked)} aria-pressed={picked} aria-label={photo.caption || 'Photo'} onClick={onToggle}>
      {src && <img src={src} alt="" />}
    </button>
  );
}

/** Paste the link to a picture. */
export function ImageLinkDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (url: string) => Promise<string | null> }) {
  const id = useId();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} title="Add a picture from a link">
      {open && (
        <form
          className={styles.form}
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (!/^https?:\/\//i.test(url.trim())) return setError('Paste a link starting with https://');
            setBusy(true);
            const problem = await onAdd(url);
            setBusy(false);
            if (problem) setError(problem);
            else {
              setUrl('');
              onClose();
            }
          }}
        >
          <div className={styles.field}>
            <label htmlFor={`${id}-url`}>Picture link</label>
            <input id={`${id}-url`} data-autofocus type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/kyoto.jpg" />
          </div>
          <p className={styles.quiet}>The picture is copied onto this device, so the board works offline.</p>
          <ErrorLine text={error} />
          <div className={styles.formActions}>
            <span className={styles.spacer} />
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Copying…' : 'Add picture'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
