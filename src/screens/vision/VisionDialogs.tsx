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
import { useT } from '@/i18n';
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
  const t = useT().vision.dialog;
  const title = card ? (card.kind === 'words' ? t.editWords : t.editPicture) : t.addWords;
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      {open && <CardForm key={card?.id ?? 'new'} card={card} position={position} onDone={onClose} />}
    </Dialog>
  );
}

function CardForm({ card, position, onDone }: { card?: VisionCardView; position?: { index: number; count: number }; onDone: () => void }) {
  const t = useT().vision.dialog;
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
      setError(err instanceof VisionError ? err.message : t.saveFailed);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label htmlFor={`${id}-text`}>{words ? t.words : t.caption}</label>
        <textarea
          id={`${id}-text`}
          data-autofocus
          rows={words ? 3 : 2}
          value={form.text}
          onChange={(e) => set('text', e.target.value)}
          placeholder={words ? t.wordsPlaceholder : t.captionPlaceholder}
        />
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor={`${id}-area`}>{t.area}</label>
          <select id={`${id}-area`} value={form.areaId} onChange={(e) => set('areaId', e.target.value)}>
            <option value="">{t.noArea}</option>
            {choices?.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-goal`}>{t.pinnedGoal}</label>
          <select id={`${id}-goal`} value={form.goalId} onChange={(e) => set('goalId', e.target.value)}>
            <option value="">{t.none}</option>
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
          <span className={styles.fieldLabel}>{t.size}</span>
          <Segmented
            label={t.size}
            value={form.size}
            onChange={(v) => set('size', v)}
            options={[
              { value: 'S', label: t.sizes.S },
              { value: 'L', label: t.sizes.L },
            ]}
          />
        </div>
        {words && (
          <label className={styles.check}>
            <input type="checkbox" checked={form.bold} onChange={(e) => set('bold', e.target.checked)} />
            {t.dark}
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
              {t.earlier}
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
              {t.later}
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
              {t.remove}
            </Button>
          </>
        )}
        <span className={styles.spacer} />
        <Button onClick={onDone}>{t.cancel}</Button>
        <Button type="submit" variant="primary">
          {card ? t.save : t.add}
        </Button>
      </div>
    </form>
  );
}

/** Pin a goal to a card, or make a words card for it. */
export function PinGoalDialog({ open, onClose, cards }: { open: boolean; onClose: () => void; cards: VisionCardView[] }) {
  const t = useT().vision.dialog;
  return (
    <Dialog open={open} onClose={onClose} title={t.pinGoal}>
      {open && <PinGoalForm cards={cards} onDone={onClose} />}
    </Dialog>
  );
}

function PinGoalForm({ cards, onDone }: { cards: VisionCardView[]; onDone: () => void }) {
  const t = useT().vision.dialog;
  const id = useId();
  const choices = useChoices();
  const [goalId, setGoalId] = useState('');
  const [cardId, setCardId] = useState('new');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const goal = choices?.goals.find((g) => g.id === goalId);
    if (!goal) return setError(t.chooseGoal);
    if (cardId === 'new') await addWordsCard({ text: goal.title, goalId: goal.id, areaId: goal.areaId });
    else await updateVisionCard(cardId, { goalId: goal.id });
    onDone();
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <p className={styles.quiet}>{t.pinHint}</p>
      <div className={styles.field}>
        <label htmlFor={`${id}-goal`}>{t.goal}</label>
        <select id={`${id}-goal`} data-autofocus value={goalId} onChange={(e) => setGoalId(e.target.value)}>
          <option value="">{t.chooseGoalOption}</option>
          {choices?.goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-card`}>{t.on}</label>
        <select id={`${id}-card`} value={cardId} onChange={(e) => setCardId(e.target.value)}>
          <option value="new">{t.newCard}</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.text || t.photo}
            </option>
          ))}
        </select>
      </div>
      {choices && choices.goals.length === 0 && <p className={styles.quiet}>{t.noGoals}</p>}
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <span className={styles.spacer} />
        <Button onClick={onDone}>{t.cancel}</Button>
        <Button type="submit" variant="primary">
          {t.pin}
        </Button>
      </div>
    </form>
  );
}

/** Pick pictures already in your Library. */
export function LibraryPhotosDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT().vision.dialog;
  return (
    <Dialog open={open} onClose={onClose} title={t.libraryTitle}>
      {open && <LibraryPhotosForm onDone={onClose} />}
    </Dialog>
  );
}

function LibraryPhotosForm({ onDone }: { onDone: () => void }) {
  const t = useT().vision.dialog;
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
      {photos && photos.length === 0 && <p className={styles.quiet}>{t.noPhotos}</p>}
      <ul className={styles.photoGrid} aria-label={t.libraryPhotos}>
        {photos?.map((p) => (
          <li key={p.id}>
            <PhotoChoice photo={p} picked={picked.includes(p.id)} onToggle={() => toggle(p.id)} />
          </li>
        ))}
      </ul>
      <div className={styles.formActions}>
        <span className={styles.spacer} />
        <Button onClick={onDone}>{t.cancel}</Button>
        <Button type="submit" variant="primary" disabled={!picked.length}>
          {picked.length ? t.addN(picked.length) : t.add}
        </Button>
      </div>
    </form>
  );
}

function PhotoChoice({ photo, picked, onToggle }: { photo: Attachment; picked: boolean; onToggle: () => void }) {
  const t = useT().vision.dialog;
  const src = useAttachmentUrl(`attachment://${photo.id}`, true);
  return (
    <button type="button" className={cx(styles.photoChoice, picked && styles.photoPicked)} aria-pressed={picked} aria-label={photo.caption || t.photo} onClick={onToggle}>
      {src && <img src={src} alt="" />}
    </button>
  );
}

/** Paste the link to a picture. */
export function ImageLinkDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (url: string) => Promise<string | null> }) {
  const t = useT().vision.dialog;
  const id = useId();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} title={t.linkTitle}>
      {open && (
        <form
          className={styles.form}
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (!/^https?:\/\//i.test(url.trim())) return setError(t.pasteHttps);
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
            <label htmlFor={`${id}-url`}>{t.pictureLink}</label>
            <input id={`${id}-url`} data-autofocus type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/kyoto.jpg" />
          </div>
          <p className={styles.quiet}>{t.copied}</p>
          <ErrorLine text={error} />
          <div className={styles.formActions}>
            <span className={styles.spacer} />
            <Button onClick={onClose}>{t.cancel}</Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? t.copying : t.addPicture}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
