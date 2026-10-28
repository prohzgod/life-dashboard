import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import type { Day } from '@/domain/days';
import { getAttachment, getDailyEntry } from '@/data';
import { useObjectUrl } from '@/lib/useObjectUrl';
import { useToday } from '@/lib/useToday';
import styles from './Library.module.css';

const MOODS = ['Awful', 'Low', 'Okay', 'Good', 'Great'];
const ENERGIES = ['Drained', 'Low', 'Okay', 'Good', 'Charged'];

/** The day's check-in, shown at the top of its Journal page. */
export function JournalCheckIn({ day }: { day: Day }) {
  const today = useToday();
  const entry = useLiveQuery(async () => (await getDailyEntry(day)) ?? null, [day]);
  const photo = useLiveQuery(async () => (entry?.photoId ? ((await getAttachment(entry.photoId)) ?? null) : null), [entry?.photoId]);
  const photoUrl = useObjectUrl(photo?.thumbBlob ?? photo?.blob);
  if (entry === undefined) return null;

  const facts = [
    entry?.mood ? `Mood ${MOODS[entry.mood - 1]}` : null,
    entry?.energy ? `Energy ${ENERGIES[entry.energy - 1]}` : null,
    entry?.sleepMinutes != null ? `Sleep ${Math.floor(entry.sleepMinutes / 60)}h ${String(entry.sleepMinutes % 60).padStart(2, '0')}m` : null,
  ].filter(Boolean);

  return (
    <section className={styles.checkIn} aria-label="Check-in">
      {photoUrl && <img src={photoUrl} alt="Photo of the day" className={styles.checkInPhoto} />}
      <div className={styles.checkInText}>
        <span className={styles.checkInLabel}>Check-in</span>
        {entry && (facts.length > 0 || entry.line) ? (
          <>
            {facts.length > 0 && <span className={styles.checkInFacts}>{facts.join(', ')}</span>}
            {entry.line && <p className={styles.checkInLine}>“{entry.line}”</p>}
          </>
        ) : (
          <span className={styles.checkInFacts}>{day === today ? 'No check-in yet today.' : 'No check-in that day.'}</span>
        )}
        {day === today && (
          <Link to="/" className={styles.quietLink}>
            {entry ? 'Edit on Today' : 'Check in on Today'}
          </Link>
        )}
      </div>
    </section>
  );
}
