import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Day } from '@/domain/days';
import { getAttachment, getDailyEntry, saveDailyEntry, savePhotoOfTheDay, type DailyEntry } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Card, EnergyMeter, MoodPicker } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { useT } from '@/i18n';
import { prepareImage } from '@/lib/images';
import { useObjectUrl } from '@/lib/useObjectUrl';
import styles from './Today.module.css';

/** The daily check-in: the screen's one dark panel. Mood, energy, sleep, one line and a photo. */
export function CheckInCard({ today, className }: { today: Day; className?: string }) {
  const t = useT().today.checkIn;
  const entry = useLiveQuery(async () => (await getDailyEntry(today)) ?? null, [today]);
  const photo = useLiveQuery(async () => (entry?.photoId ? ((await getAttachment(entry.photoId)) ?? null) : null), [entry?.photoId]);
  const photoUrl = useObjectUrl(photo?.thumbBlob ?? photo?.blob);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = (fields: Parameters<typeof saveDailyEntry>[1]) => void saveDailyEntry(today, fields);

  return (
    <Card title={t.title} meta={t.meta} variant="panel" className={cx(styles.checkIn, className)}>
      <MoodPicker label={t.mood} options={t.moods} value={entry?.mood ?? null} onChange={(mood) => save({ mood })} />
      <EnergyMeter label={t.energy} options={t.energies} value={entry?.energy ?? null} onChange={(energy) => save({ energy })} />
      {entry !== undefined && <SleepRow key={`${today}-${entry?.sleepMinutes ?? 'none'}`} minutes={entry?.sleepMinutes ?? null} onSave={(sleepMinutes) => save({ sleepMinutes })} />}
      <div className={styles.note}>
        {entry !== undefined && <LineField key={`${today}-${entry?.id ?? 'new'}`} entry={entry} onSave={(line) => save({ line })} />}
        <span className={styles.noteStatus}>{t.autosave}</span>
        <button type="button" className={styles.photoButton} aria-label={photoUrl ? t.changePhoto : t.addPhoto} onClick={() => fileRef.current?.click()}>
          {photoUrl ? <img src={photoUrl} alt="" className={styles.photoThumb} /> : <Icon name="camera" size={21} />}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="visually-hidden"
          tabIndex={-1}
          aria-label={t.choosePhoto}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) await savePhotoOfTheDay(today, await prepareImage(file));
          }}
        />
      </div>
    </Card>
  );
}

function SleepRow({ minutes, onSave }: { minutes: number | null; onSave: (minutes: number | null) => void }) {
  const t = useT().today.checkIn;
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState(minutes === null ? '' : String(Math.floor(minutes / 60)));
  const [mins, setMins] = useState(minutes === null ? '' : String(minutes % 60));

  function submit(event: FormEvent) {
    event.preventDefault();
    const h = Number(hours || 0);
    const m = Number(mins || 0);
    onSave(hours === '' && mins === '' ? null : Math.min(24 * 60, Math.max(0, Math.round(h * 60 + m))));
    setEditing(false);
  }

  return (
    <form className={styles.sleep} onSubmit={submit}>
      <Icon name="moon" size={22} />
      <div className={styles.sleepText}>
        <span className={styles.sleepLabel}>{t.sleep}</span>
        {editing ? (
          <span className={styles.sleepInputs}>
            <input aria-label={t.hoursSlept} type="number" min={0} max={24} value={hours} onChange={(e) => setHours(e.target.value)} autoFocus />
            {t.h}
            <input aria-label={t.minutes} type="number" min={0} max={59} step={5} value={mins} onChange={(e) => setMins(e.target.value)} />
            {t.m}
          </span>
        ) : minutes !== null ? (
          <strong className={styles.sleepValue}>{`${Math.floor(minutes / 60)}${t.h} ${String(minutes % 60).padStart(2, '0')}${t.m}`}</strong>
        ) : (
          <span className={styles.sleepNone}>{t.notLogged}</span>
        )}
      </div>
      {editing ? (
        <button type="submit" className={styles.sleepButton}>
          {t.save}
        </button>
      ) : (
        <button type="button" className={styles.sleepButton} onClick={() => setEditing(true)}>
          {minutes === null ? t.add : t.edit}
        </button>
      )}
    </form>
  );
}

/** Saves as you go (half a second after you stop typing), and on Enter or leaving the field. */
function LineField({ entry, onSave }: { entry: DailyEntry | null; onSave: (line: string) => void }) {
  const t = useT().today.checkIn;
  const [value, setValue] = useState(entry?.line ?? '');
  const saved = useRef(entry?.line ?? '');
  const timer = useRef<number | undefined>(undefined);

  const commit = (text: string) => {
    window.clearTimeout(timer.current);
    if (text.trim() === saved.current) return;
    saved.current = text.trim();
    onSave(text.trim());
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <textarea
      className={styles.noteInput}
      aria-label={t.lineLabel}
      placeholder={t.linePlaceholder}
      value={value}
      maxLength={280}
      rows={3}
      onChange={(e) => {
        const text = e.target.value;
        setValue(text);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => commit(text), 500);
      }}
      onBlur={() => commit(value)}
      onKeyDown={(e) => {
        // One line: Enter saves rather than starting a new one.
        if (e.key === 'Enter') {
          e.preventDefault();
          commit(value);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
