import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Day } from '@/domain/days';
import { getAttachment, getDailyEntry, saveDailyEntry, savePhotoOfTheDay, type DailyEntry } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Card } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { useT } from '@/i18n';
import { prepareImage } from '@/lib/images';
import { useObjectUrl } from '@/lib/useObjectUrl';
import styles from './Today.module.css';

export function CheckInCard({ today }: { today: Day }) {
  const t = useT().today.checkIn;
  const entry = useLiveQuery(async () => (await getDailyEntry(today)) ?? null, [today]);
  const photo = useLiveQuery(async () => (entry?.photoId ? ((await getAttachment(entry.photoId)) ?? null) : null), [entry?.photoId]);
  const photoUrl = useObjectUrl(photo?.thumbBlob ?? photo?.blob);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = (fields: Parameters<typeof saveDailyEntry>[1]) => void saveDailyEntry(today, fields);

  return (
    <Card title={t.title} meta={t.meta} className={cx(styles.card, styles.checkIn)}>
      <Scale label={t.mood} options={t.moods} value={entry?.mood ?? null} onChange={(mood) => save({ mood })} />
      <Scale label={t.energy} options={t.energies} value={entry?.energy ?? null} onChange={(energy) => save({ energy })} />
      {entry !== undefined && <SleepRow key={`${today}-${entry?.sleepMinutes ?? 'none'}`} minutes={entry?.sleepMinutes ?? null} onSave={(sleepMinutes) => save({ sleepMinutes })} />}
      <div className={styles.lineRow}>
        {entry !== undefined && <LineField key={`${today}-${entry?.id ?? 'new'}`} entry={entry} onSave={(line) => save({ line })} />}
        <button
          type="button"
          className={styles.photoButton}
          aria-label={photoUrl ? t.changePhoto : t.addPhoto}
          onClick={() => fileRef.current?.click()}
        >
          {photoUrl ? <img src={photoUrl} alt="" className={styles.photoThumb} /> : <Icon name="camera" size={18} />}
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

function Scale({ label, options, value, onChange }: { label: string; options: string[]; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className={styles.scale} role="group" aria-label={label}>
      <span className={styles.scaleLabel}>{label}</span>
      <div className={styles.scaleOptions}>
        {options.map((option, i) => {
          const selected = value === i + 1;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              className={cx(styles.scaleOption, selected && styles.scaleSelected)}
              onClick={() => onChange(selected ? null : i + 1)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
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

  if (editing) {
    return (
      <form className={styles.sleep} onSubmit={submit}>
        <span className={styles.sleepLabel}>
          <Icon name="moon" size={16} />
          {t.sleep}
        </span>
        <span className={styles.sleepInputs}>
          <input aria-label={t.hoursSlept} type="number" min={0} max={24} value={hours} onChange={(e) => setHours(e.target.value)} autoFocus />
          {t.h}
          <input aria-label={t.minutes} type="number" min={0} max={59} step={5} value={mins} onChange={(e) => setMins(e.target.value)} />
          {t.m}
          <button type="submit" className={styles.sleepSave}>
            {t.save}
          </button>
        </span>
      </form>
    );
  }
  return (
    <div className={styles.sleep}>
      <span className={styles.sleepLabel}>
        <Icon name="moon" size={16} />
        {t.sleep} {minutes !== null ? <strong className={styles.sleepValue}>{`${Math.floor(minutes / 60)}${t.h} ${String(minutes % 60).padStart(2, '0')}${t.m}`}</strong> : <span className={styles.sleepNone}>{t.notLogged}</span>}
      </span>
      <button type="button" className={styles.sleepEdit} onClick={() => setEditing(true)}>
        {minutes === null ? t.add : t.edit}
      </button>
    </div>
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
    <input
      className={styles.lineInput}
      aria-label={t.lineLabel}
      placeholder={t.linePlaceholder}
      value={value}
      maxLength={280}
      onChange={(e) => {
        const text = e.target.value;
        setValue(text);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => commit(text), 500);
      }}
      onBlur={() => commit(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit(value);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
