import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addDays, isoWeek, type Day } from '@/domain/days';
import { minutesLeft } from '@/domain/review';
import { openWeeklyReview, readAnswers, reviewsRepo, saveReviewAnswers, type Review } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { useToday } from '@/lib/useToday';
import { useIsMobile } from '@/lib/useMediaQuery';
import { formatDayShort } from '@/lib/format';
import { StepClear } from './StepClear';
import { StepCurrent } from './StepCurrent';
import { StepDone } from './StepDone';
import { StepPlan } from './StepPlan';
import { StepReflect } from './StepReflect';
import styles from './Review.module.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function ReviewPage() {
  const today = useToday();
  const [reviewId, setReviewId] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void openWeeklyReview(today).then((r) => live && setReviewId(r.id));
    return () => {
      live = false;
    };
  }, [today]);
  const review = useLiveQuery(async () => (reviewId ? ((await reviewsRepo.get(reviewId)) ?? null) : null), [reviewId]);
  if (!review) return <div aria-busy="true" />;
  return <ReviewFlow review={review} today={today} />;
}

function weekRange(weekStart: Day): string {
  const end = addDays(weekStart, 6);
  const [sm, em] = [Number(weekStart.slice(5, 7)), Number(end.slice(5, 7))];
  const startText = sm === em ? String(Number(weekStart.slice(8))) : `${Number(weekStart.slice(8))} ${MONTHS[sm - 1]}`;
  return `${startText} – ${Number(end.slice(8))} ${MONTHS[em - 1]}`;
}

function ReviewFlow({ review, today }: { review: Review; today: Day }) {
  const navigate = useNavigate();
  const answers = readAnswers(review);
  const step = review.completedAt ? 5 : answers.step;
  const nextWeek = isoWeek(addDays(review.periodStart, 7));
  const steps = [
    { title: 'Get clear', hint: 'Inbox to zero' },
    { title: 'Get current', hint: 'Calendar, goals, habits' },
    { title: 'Reflect', hint: 'Wins, drains, lessons' },
    { title: `Plan week ${nextWeek}`, hint: 'Pick 1–3 focus items' },
    { title: 'Done', hint: 'Saved to your journal' },
  ];
  const go = (n: number) => void saveReviewAnswers(review.id, { step: Math.min(5, Math.max(1, n)) });
  const nextLabel = ['Next: get current', 'Next: reflect', `Next: plan week ${nextWeek}`, 'Next: wrap up'][step - 1];
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className={styles.page}>
        <header className={styles.mobileTop}>
          <Link to="/" className={styles.close} aria-label="Close and finish later">
            <Icon name="close" size={18} />
          </Link>
          <span className={styles.left}>{review.completedAt ? 'Saved to your journal' : `About ${minutesLeft(step)} min left`}</span>
          <Link to="/" className={styles.headerLink}>
            {review.completedAt ? 'Done' : 'Save'}
          </Link>
        </header>
        <ol className={styles.dashes} aria-label="Review steps">
          {steps.map((s, i) => (
            <li key={s.title} aria-current={i + 1 === step ? 'step' : undefined}>
              <button type="button" className={cx(styles.dash, (review.completedAt || i + 1 <= step) && styles.dashOn)} disabled={!!review.completedAt} onClick={() => go(i + 1)} aria-label={`Step ${i + 1}: ${s.title}`} />
            </li>
          ))}
        </ol>
        <div className={styles.mobileHeading}>
          <span className={styles.eyebrow}>
            Step {step} of 5 · week {isoWeek(review.periodStart)}
          </span>
          <h1 className={styles.mobileTitle}>{steps[step - 1]!.title}</h1>
        </div>
        <div className={styles.body}>
          {step === 1 && <StepClear today={today} />}
          {step === 2 && <StepCurrent today={today} />}
          {step === 3 && <StepReflect review={review} today={today} />}
          {step === 4 && <StepPlan review={review} today={today} nextWeek={nextWeek} />}
          {step === 5 && <StepDone review={review} today={today} />}
        </div>
        {!review.completedAt && (
          <footer className={styles.mobileFooter}>
            <Button disabled={step === 1} onClick={() => go(step - 1)}>
              Back
            </Button>
            {step < 5 && (
              <Button variant="primary" className={styles.next} onClick={() => go(step + 1)}>
                {nextLabel}
              </Button>
            )}
          </footer>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>
            Week {isoWeek(review.periodStart)} · {weekRange(review.periodStart)}
          </span>
          <h1 className={styles.title}>Weekly review</h1>
        </div>
        <div className={styles.headerSide}>
          {!review.completedAt && <span className={styles.left}>About {minutesLeft(step)} min left</span>}
          {review.completedAt ? (
            <Link to="/" className={styles.headerLink}>
              Back to Today
            </Link>
          ) : (
            <Button size="sm" onClick={() => navigate('/')}>
              Save and finish later
            </Button>
          )}
        </div>
      </header>

      <ol className={styles.steps} aria-label="Review steps">
        {steps.map((s, i) => {
          const n = i + 1;
          const state = review.completedAt || n < step ? 'done' : n === step ? 'current' : 'todo';
          return (
            <li key={s.title} aria-current={state === 'current' ? 'step' : undefined}>
              <button type="button" className={cx(styles.step, styles[state])} disabled={!!review.completedAt} onClick={() => go(n)}>
                <span className={styles.stepMark} aria-hidden="true">
                  {state === 'done' ? <Icon name="check" size={14} strokeWidth={2.4} /> : n}
                </span>
                <span className={styles.stepText}>
                  <span className={styles.stepTitle}>{s.title}</span>
                  <span className={styles.stepHint}>{state === 'done' ? `${s.hint} · done` : s.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className={styles.body}>
        {step === 1 && <StepClear today={today} />}
        {step === 2 && <StepCurrent today={today} />}
        {step === 3 && <StepReflect review={review} today={today} />}
        {step === 4 && <StepPlan review={review} today={today} nextWeek={nextWeek} />}
        {step === 5 && <StepDone review={review} today={today} />}
      </div>

      {!review.completedAt && (
        <footer className={styles.footer}>
          <Button disabled={step === 1} onClick={() => go(step - 1)}>
            Back
          </Button>
          <span className={styles.footerNote}>
            Step {step} of 5 · you can skip any step
            {step === 1 ? '' : ` · reviewing ${formatDayShort(review.periodStart)} – ${formatDayShort(addDays(review.periodStart, 6))}`}
          </span>
          {step < 5 ? (
            <Button variant="primary" onClick={() => go(step + 1)}>
              {nextLabel}
            </Button>
          ) : (
            <span />
          )}
        </footer>
      )}
    </div>
  );
}
