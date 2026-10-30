import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import type { Day } from '@/domain/days';
import { onThisDay } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { cx } from '@/components/ui/cx';
import { year } from '@/domain/days';
import { useT } from '@/i18n';
import { useObjectUrl } from '@/lib/useObjectUrl';
import styles from './Today.module.css';

export function OnThisDayCard({ today }: { today: Day }) {
  const t = useT().today.memory;
  const memory = useLiveQuery(() => onThisDay(today), [today]);
  const photoUrl = useObjectUrl(memory?.photo?.thumbBlob ?? memory?.photo?.blob);
  if (memory === undefined) return null;

  return (
    <section className={cx(styles.card, styles.memory)} aria-label={t.label}>
      <div className={styles.memoryPhoto}>
        {photoUrl ? (
          <img src={photoUrl} alt={t.photoAlt} className={styles.memoryImage} />
        ) : (
          <>
            <Icon name="image" size={20} />
            <span className={styles.memoryPhotoLabel}>{t.photo}</span>
          </>
        )}
      </div>
      <div className={styles.memoryText}>
        <span className={styles.memoryEyebrow}>{t.eyebrow(memory ? year(memory.entry.day) : null)}</span>
        {memory ? (
          <>
            <p className={styles.memoryQuote}>{memory.entry.line ? `“${memory.entry.line}”` : t.photoOnly}</p>
            <Link to={`/library/day/${memory.entry.day}`} className={styles.cardLink}>
              {t.open}
            </Link>
          </>
        ) : (
          <p className={styles.memoryEmpty}>{t.empty}</p>
        )}
      </div>
    </section>
  );
}
