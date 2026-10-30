import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { addDays, dayToDate, isoWeek, type Day } from '@/domain/days';
import { minutesLeft } from '@/domain/review';
import { openWeeklyReview, readAnswers, reviewsRepo, saveReviewAnswers, type Review } from '@/data';
import { useToday } from '@/lib/useToday';
import { messages, useT } from '@/i18n';
import { formatDayShort } from '@/lib/format';
import { StepClear } from './StepClear';
import { StepCurrent } from './StepCurrent';
import { StepDone } from './StepDone';
import { StepPlan } from './StepPlan';
import { StepReflect } from './StepReflect';
import { ReviewFrame } from './ReviewFrame';

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
  const { format } = messages();
  return `${format.dayMonth(dayToDate(weekStart))} – ${format.dayMonth(dayToDate(addDays(weekStart, 6)))}`;
}

function ReviewFlow({ review, today }: { review: Review; today: Day }) {
  const answers = readAnswers(review);
  const step = review.completedAt ? 5 : answers.step;
  const { reviews } = useT();
  const t = reviews.week;
  const nextWeek = isoWeek(addDays(review.periodStart, 7));
  const steps = [t.steps.clear, t.steps.current, t.steps.reflect, t.steps.plan(nextWeek), t.steps.done];

  return (
    <ReviewFrame
      title={reviews.kinds.week.title}
      eyebrow={t.eyebrow(isoWeek(review.periodStart), weekRange(review.periodStart))}
      shortName={t.short(isoWeek(review.periodStart))}
      steps={steps}
      step={step}
      finished={!!review.completedAt}
      minutesLeft={minutesLeft(step)}
      nextLabels={[t.next.current, t.next.reflect, t.next.plan(nextWeek), t.next.wrap]}
      footerExtra={step === 1 ? undefined : t.reviewing(formatDayShort(review.periodStart), formatDayShort(addDays(review.periodStart, 6)))}
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
