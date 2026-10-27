import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import type { Day } from '@/domain/days';
import { onThisDay } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { cx } from '@/components/ui/cx';
import { year } from '@/domain/days';
import { useObjectUrl } from '@/lib/useObjectUrl';
import styles from './Today.module.css';

export function OnThisDayCard({ today }: { today: Day }) {
  const memory = useLiveQuery(() => onThisDay(today), [today]);
  const photoUrl = useObjectUrl(memory?.photo?.thumbBlob ?? memory?.photo?.blob);
  if (memory === undefined) return null;

  return (
    <section className={cx(styles.card, styles.memory)} aria-label="On this day">
      <div className={styles.memoryPhoto}>
        {photoUrl ? (
          <img src={photoUrl} alt="Photo of the day" className={styles.memoryImage} />
        ) : (
          <>
            <Icon name="image" size={20} />
            <span className={styles.memoryPhotoLabel}>Photo</span>
          </>
        )}
      </div>
      <div className={styles.memoryText}>
        <span className={styles.memoryEyebrow}>On this day{memory ? ` · ${year(memory.entry.day)}` : ''}</span>
        {memory ? (
          <>
            <p className={styles.memoryQuote}>{memory.entry.line ? `“${memory.entry.line}”` : 'A photo from this day.'}</p>
            <Link to="/library" className={styles.cardLink}>
              Open journal entry
            </Link>
          </>
        ) : (
          <p className={styles.memoryEmpty}>A year from now, today’s line and photo will show up here.</p>
        )}
      </div>
    </section>
  );
}
