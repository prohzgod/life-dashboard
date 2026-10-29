import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { addDays, isoWeek, type Day } from '@/domain/days';
import { minutesLeft } from '@/domain/review';
import { openWeeklyReview, readAnswers, reviewsRepo, saveReviewAnswers, type Review } from '@/data';
import { useToday } from '@/lib/useToday';
import { formatDayShort } from '@/lib/format';
import { StepClear } from './StepClear';
import { StepCurrent } from './StepCurrent';
import { StepDone } from './StepDone';
import { StepPlan } from './StepPlan';
import { StepReflect } from './StepReflect';
import { ReviewFrame } from './ReviewFrame';

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

  return (
    <ReviewFrame
      title="Weekly review"
      eyebrow={`Week ${isoWeek(review.periodStart)}, ${weekRange(review.periodStart)}`}
      shortName={`week ${isoWeek(review.periodStart)}`}
      steps={steps}
      step={step}
      finished={!!review.completedAt}
      minutesLeft={minutesLeft(step)}
      nextLabels={['Next: get current', 'Next: reflect', `Next: plan week ${nextWeek}`, 'Next: wrap up']}
      footerExtra={step === 1 ? undefined : `reviewing ${formatDayShort(review.periodStart)} – ${formatDayShort(addDays(review.periodStart, 6))}`}
      onGo={(n) => void saveReviewAnswers(review.id, { step: n })}
    >
      {step === 1 && <StepClear today={today} />}
      {step === 2 && <StepCurrent today={today} />}
      {step === 3 && <StepReflect review={review} today={today} />}
      {step === 4 && <StepPlan review={review} today={today} nextWeek={nextWeek} />}
      {step === 5 && <StepDone review={review} today={today} />}
    </ReviewFrame>
  );
}
