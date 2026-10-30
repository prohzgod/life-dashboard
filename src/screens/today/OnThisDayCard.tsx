import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import type { Day } from '@/domain/days';
import { onThisDay } from '@/data';
import { Card } from '@/components/ui';
import { year } from '@/domain/days';
import { useT } from '@/i18n';
import { useObjectUrl } from '@/lib/useObjectUrl';
import styles from './Today.module.css';

/** A line or photo from this date in an earlier year. Shows only when there is one. */
export function OnThisDayCard({ today, className }: { today: Day; className?: string }) {
  const t = useT().today.memory;
  const memory = useLiveQuery(() => onThisDay(today), [today]);
  const photoUrl = useObjectUrl(memory?.photo?.thumbBlob ?? memory?.photo?.blob);
  if (!memory) return null;

  return (
    <Card title={t.eyebrow(year(memory.entry.day))} className={className} aria-label={t.label}>
      {photoUrl && <img src={photoUrl} alt={t.photoAlt} className={styles.memoryImage} />}
      <p className={styles.memoryQuote}>{memory.entry.line ? `“${memory.entry.line}”` : t.photoOnly}</p>
      <Link to={`/library/day/${memory.entry.day}`} className={styles.pillLink}>
        {t.open}
      </Link>
    </Card>
  );
}
