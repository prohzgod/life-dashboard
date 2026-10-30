import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import type { Day } from '@/domain/days';
import { getAttachment, getDailyEntry } from '@/data';
import { useObjectUrl } from '@/lib/useObjectUrl';
import { useToday } from '@/lib/useToday';
import { useT } from '@/i18n';
import styles from './Library.module.css';

/** The day's check-in, shown at the top of its Journal page. */
export function JournalCheckIn({ day }: { day: Day }) {
  const { library, today: todayText } = useT();
  const t = library.checkIn;
  const MOODS = todayText.checkIn.moods;
  const ENERGIES = todayText.checkIn.energies;
  const today = useToday();
  const entry = useLiveQuery(async () => (await getDailyEntry(day)) ?? null, [day]);
  const photo = useLiveQuery(async () => (entry?.photoId ? ((await getAttachment(entry.photoId)) ?? null) : null), [entry?.photoId]);
  const photoUrl = useObjectUrl(photo?.thumbBlob ?? photo?.blob);
  if (entry === undefined) return null;

  const facts = [
    entry?.mood ? t.mood(MOODS[entry.mood - 1]!) : null,
    entry?.energy ? t.energy(ENERGIES[entry.energy - 1]!) : null,
    entry?.sleepMinutes != null ? t.sleep(Math.floor(entry.sleepMinutes / 60), String(entry.sleepMinutes % 60).padStart(2, '0')) : null,
  ].filter(Boolean);

  return (
    <section className={styles.checkIn} aria-label={t.label}>
      {photoUrl && <img src={photoUrl} alt={todayText.memory.photoAlt} className={styles.checkInPhoto} />}
      <div className={styles.checkInText}>
        <span className={styles.checkInLabel}>{t.label}</span>
        {entry && (facts.length > 0 || entry.line) ? (
          <>
            {facts.length > 0 && <span className={styles.checkInFacts}>{facts.join(', ')}</span>}
            {entry.line && <p className={styles.checkInLine}>“{entry.line}”</p>}
          </>
        ) : (
          <span className={styles.checkInFacts}>{day === today ? t.noneToday : t.noneThatDay}</span>
        )}
        {day === today && (
          <Link to="/" className={styles.quietLink}>
            {entry ? t.edit : t.checkIn}
          </Link>
        )}
      </div>
    </section>
  );
}
