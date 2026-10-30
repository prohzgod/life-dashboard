import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, type Day } from '@/domain/days';
import { completeWeeklyReview, goalsRepo, readAnswers, type Review } from '@/data';
import { Button, Card } from '@/components/ui';
import { formatDayMonth } from '@/lib/format';
import { useT } from '@/i18n';
import styles from './Review.module.css';

/** Step 5: look it over, then save it to the week's Sunday journal page. */
export function StepDone({ review, today }: { review: Review; today: Day }) {
  const t = useT().reviews.done;
  const answers = readAnswers(review);
  const focus = useLiveQuery(async () => (await Promise.all(answers.focusGoalIds.map((id) => goalsRepo.get(id)))).filter((g) => !!g), [answers.focusGoalIds.join()]);
  const [busy, setBusy] = useState(false);
  const sunday = addDays(review.periodStart, 6);

  const rows = [
    [t.summary, answers.summary],
    [t.wentWell, answers.wentWell],
    [t.drained, answers.drained],
    [t.nextWeek, answers.differently],
  ].filter(([, v]) => v);

  return (
    <Card title={review.completedAt ? t.saved : t.wrap} className={styles.card}>
      {review.completedAt ? (
        <p className={styles.lead}>
          {t.savedSunday(formatDayMonth(sunday))}{' '}
          <Link to={`/library/day/${sunday}`} className={styles.headerLink}>
            {t.open}
          </Link>
        </p>
      ) : (
        <p className={styles.lead}>{t.willGoSunday(formatDayMonth(sunday))}</p>
      )}
      {rows.length === 0 && !focus?.length && <p className={styles.quiet}>{t.nothing}</p>}
      <dl className={styles.recap}>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        {!!focus?.length && (
          <div>
            <dt>{t.focus}</dt>
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
            {t.finish}
          </Button>
        </div>
      )}
    </Card>
  );
}
