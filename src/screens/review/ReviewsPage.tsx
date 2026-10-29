import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { loadReviewsHub, type ReviewKind, type ReviewSlot } from '@/data';
import { PageHeader } from '@/components/shell/PageHeader';
import { ButtonLink, Card } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { formatDayShort } from '@/lib/format';
import { useToday } from '@/lib/useToday';
import styles from './Reviews.module.css';

const KIND: Record<ReviewKind, { title: string; about: string }> = {
  week: { title: 'Weekly review', about: 'Five calm steps, about 15 minutes' },
  month: { title: 'Monthly review', about: 'Four steps, about 20 minutes' },
  quarter: { title: 'Quarterly review', about: 'Four steps and your life areas, about 30 minutes' },
  year: { title: 'Yearly review', about: 'Four steps, your life areas and a word, about 45 minutes' },
};

const linkTo = (slot: ReviewSlot) => (slot.kind === 'week' ? '/review' : `/review/${slot.kind}?start=${slot.start}`);

function stateText(slot: ReviewSlot): string {
  if (slot.state === 'done') return 'Done. The next one opens later.';
  if (slot.inProgress) return 'Started. Pick up where you left off.';
  if (slot.state === 'ready') return 'Ready when you are.';
  return 'Not over yet. You can start early.';
}

/** Every review in one place: what's due now, and the ones you've finished. */
export function ReviewsPage() {
  const today = useToday();
  const hub = useLiveQuery(() => loadReviewsHub(today), [today]);
  if (!hub) return null;
  // The first review that's ready gets the ultramarine field: it's the one to do next.
  const firstReady = hub.slots.find((s) => s.state === 'ready');

  return (
    <>
      <PageHeader title="Reviews" subtitle="Look back, notice what mattered, and set up what comes next." />
      <ul className={styles.slots} aria-label="Your reviews">
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
                <ButtonLink to={linkTo(slot)} variant={lead ? 'primary' : 'secondary'} className={styles.slotAction} aria-label={`${slot.inProgress ? 'Continue' : 'Start'} ${KIND[slot.kind].title.toLowerCase()}, ${slot.name}`}>
                  {slot.inProgress ? 'Continue' : 'Start'}
                </ButtonLink>
              )}
            </li>
          );
        })}
      </ul>

      <Card title="Finished reviews" meta={hub.past.length ? `the last ${hub.past.length}` : undefined}>
        {hub.past.length === 0 ? (
          <p className={styles.quiet}>Reviews you finish land here, and in your journal.</p>
        ) : (
          <ul className={styles.past}>
            {hub.past.map((r) => (
              <li key={r.id} className={styles.pastRow}>
                <span className={styles.pastKind}>{KIND[r.kind].title}</span>
                <span className={styles.pastName}>{r.name}</span>
                <span className={styles.quiet}>Finished {formatDayShort(r.completedAt.slice(0, 10))}</span>
                <Link to={`/library/day/${r.journalDay}`} className={styles.pastLink}>
                  Journal page
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
