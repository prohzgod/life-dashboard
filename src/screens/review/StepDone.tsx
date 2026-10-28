import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, type Day } from '@/domain/days';
import { completeWeeklyReview, goalsRepo, readAnswers, type Review } from '@/data';
import { Button, Card } from '@/components/ui';
import { formatDayShort } from '@/lib/format';
import styles from './Review.module.css';

/** Step 5: look it over, then save it to the week's Sunday journal page. */
export function StepDone({ review, today }: { review: Review; today: Day }) {
  const answers = readAnswers(review);
  const focus = useLiveQuery(async () => (await Promise.all(answers.focusGoalIds.map((id) => goalsRepo.get(id)))).filter((g) => !!g), [answers.focusGoalIds.join()]);
  const [busy, setBusy] = useState(false);
  const sunday = addDays(review.periodStart, 6);

  const rows = [
    ['Summary', answers.summary],
    ['What went well', answers.wentWell],
    ['What drained you', answers.drained],
    ['Next week you’ll', answers.differently],
  ].filter(([, v]) => v);

  return (
    <Card title={review.completedAt ? 'Review saved' : 'Wrap up'} className={styles.card}>
      {review.completedAt ? (
        <p className={styles.lead}>
          Saved to your journal for Sunday {formatDayShort(sunday).slice(4)}. Have a good week.{' '}
          <Link to={`/library/day/${sunday}`} className={styles.headerLink}>
            Open journal page
          </Link>
        </p>
      ) : (
        <p className={styles.lead}>Here’s what goes into your journal for Sunday {formatDayShort(sunday).slice(4)}.</p>
      )}
      {rows.length === 0 && !focus?.length && <p className={styles.quiet}>Nothing written this time, and that’s fine. Finishing still counts the week as reviewed.</p>}
      <dl className={styles.recap}>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        {!!focus?.length && (
          <div>
            <dt>Focus</dt>
            <dd>{focus.map((g) => g.title).join(', ')}</dd>
          </div>
        )}
      </dl>
      {!review.completedAt && (
        <div className={styles.planActions}>
          <span />
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await completeWeeklyReview(review.id, today);
            }}
          >
            Finish review
          </Button>
        </div>
      )}
    </Card>
  );
}
