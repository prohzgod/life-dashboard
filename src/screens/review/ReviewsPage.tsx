import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { loadReviewsHub, type ReviewKind, type ReviewSlot } from '@/data';
import { PageHeader } from '@/components/shell/PageHeader';
import { ButtonLink, Card } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { formatDayShort } from '@/lib/format';
import { useToday } from '@/lib/useToday';
import { messages, useT } from '@/i18n';
import styles from './Reviews.module.css';

const linkTo = (slot: ReviewSlot) => (slot.kind === 'week' ? '/review' : `/review/${slot.kind}?start=${slot.start}`);

function stateText(slot: ReviewSlot): string {
  const t = messages().reviews.hub;
  if (slot.state === 'done') return t.done;
  if (slot.inProgress) return t.started;
  if (slot.state === 'ready') return t.ready;
  return t.early;
}

/** Every review in one place: what's due now, and the ones you've finished. */
export function ReviewsPage() {
  const { reviews, screens } = useT();
  const t = reviews.hub;
  const KIND: Record<ReviewKind, { title: string; about: string }> = reviews.kinds;
  const today = useToday();
  const hub = useLiveQuery(() => loadReviewsHub(today), [today]);
  if (!hub) return null;
  // The first review that's ready gets the ultramarine field: it's the one to do next.
  const firstReady = hub.slots.find((s) => s.state === 'ready');

  return (
    <>
      <PageHeader title={screens.review.title} subtitle={t.subtitle} />
      <ul className={styles.slots} aria-label={t.label}>
        {hub.slots.map((slot) => {
          const lead = slot === firstReady;
          return (
            <li key={slot.kind} className={cx(styles.slot, lead && styles.lead, slot.state === 'done' && styles.done)}>
              <div className={styles.slotText}>
                <h2 className={styles.slotTitle}>{KIND[slot.kind].title}</h2>
                <span className={styles.slotName}>{slot.name}</span>
                <span className={styles.slotState}>{stateText(slot)}</span>
              </div>
              <span className={styles.slotAbout}>{KIND[slot.kind].about}</span>
              {slot.state !== 'done' && (
                <ButtonLink to={linkTo(slot)} variant={lead ? 'primary' : 'secondary'} className={styles.slotAction} aria-label={t.action(slot.inProgress, KIND[slot.kind].title, slot.name)}>
                  {slot.inProgress ? t.continue : t.start}
                </ButtonLink>
              )}
            </li>
          );
        })}
      </ul>

      <Card title={t.finished} meta={hub.past.length ? t.lastN(hub.past.length) : undefined}>
        {hub.past.length === 0 ? (
          <p className={styles.quiet}>{t.finishedEmpty}</p>
        ) : (
          <ul className={styles.past}>
            {hub.past.map((r) => (
              <li key={r.id} className={styles.pastRow}>
                <span className={styles.pastKind}>{KIND[r.kind].title}</span>
                <span className={styles.pastName}>{r.name}</span>
                <span className={styles.quiet}>{t.finishedOn(formatDayShort(r.completedAt.slice(0, 10)))}</span>
                <Link to={`/library/day/${r.journalDay}`} className={styles.pastLink}>
                  {t.journalPage}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
