import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { isDay, type Day } from '@/domain/days';
import { nextPeriodName, periodEnd, periodMinutesLeft, periodName, type ReviewPeriod } from '@/domain/periods';
import {
  completePeriodReview,
  goalsRepo,
  loadGoalBoard,
  loadPeriodData,
  loadWheelOfLife,
  openPeriodReview,
  PERIOD_QUESTIONS,
  readAnswers,
  reviewsRepo,
  saveReviewAnswers,
  setNextYearWord,
  setPeriodFocus,
  type Review,
} from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button, Card } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { formatDayShort, formatMinutes } from '@/lib/format';
import { useToday } from '@/lib/useToday';
import { WheelCard } from '../progress/WheelCard';
import { ReviewFrame } from './ReviewFrame';
import { Planner } from './StepPlan';
import { Glance, Question } from './StepReflect';
import styles from './Review.module.css';

const KIND: Record<ReviewPeriod, string> = { month: 'Monthly review', quarter: 'Quarterly review', year: 'Yearly review' };
const UNIT: Record<ReviewPeriod, string> = { month: 'month', quarter: 'quarter', year: 'year' };

const isPeriod = (value: string | undefined): value is ReviewPeriod => value === 'month' || value === 'quarter' || value === 'year';

/** /review/month, /review/quarter and /review/year; ?start=YYYY-MM-DD opens a particular one. */
export function PeriodReviewPage() {
  const { period } = useParams();
  const [params] = useSearchParams();
  const today = useToday();
  const start = params.get('start');
  const [reviewId, setReviewId] = useState<string | null>(null);
  const valid = isPeriod(period);

  useEffect(() => {
    if (!valid) return;
    let live = true;
    void openPeriodReview(period, today, start && isDay(start) ? start : undefined).then((r) => live && setReviewId(r.id));
    return () => {
      live = false;
    };
  }, [valid, period, today, start]);
  const review = useLiveQuery(async () => (reviewId ? ((await reviewsRepo.get(reviewId)) ?? null) : null), [reviewId]);

  if (!valid) return <Navigate to="/reviews" replace />;
  if (!review || review.period !== period) return <div aria-busy="true" />;
  return <PeriodFlow review={review} period={period} today={today} />;
}

function PeriodFlow({ review, period, today }: { review: Review; period: ReviewPeriod; today: Day }) {
  const answers = readAnswers(review);
  const step = review.completedAt ? 4 : Math.min(answers.step, 4);
  const name = periodName(review.periodStart, period);
  const next = nextPeriodName(review.periodStart, period);
  const steps = [
    { title: 'Look back', hint: 'The numbers, filled in for you' },
    { title: 'Reflect', hint: period === 'month' ? 'Wins, drains, changes' : 'Wins, lessons, your life areas' },
    { title: `Plan ${next}`, hint: period === 'year' ? 'Up to 3 goals and a word' : 'Pick up to 3 goals' },
    { title: 'Done', hint: 'Saved to your journal' },
  ];

  return (
    <ReviewFrame
      title={KIND[period]}
      eyebrow={`${name}, ${formatDayShort(review.periodStart)} to ${formatDayShort(periodEnd(review.periodStart, period))}`}
      shortName={name}
      steps={steps}
      step={step}
      finished={!!review.completedAt}
      minutesLeft={periodMinutesLeft(period, step)}
      nextLabels={['Next: reflect', `Next: plan ${next}`, 'Next: wrap up']}
      onGo={(n) => void saveReviewAnswers(review.id, { step: n })}
    >
      {step === 1 && <StepLookBack review={review} period={period} today={today} />}
      {step === 2 && <StepThink review={review} period={period} today={today} />}
      {step === 3 && <StepPlanNext review={review} period={period} today={today} />}
      {step === 4 && <StepFinish review={review} period={period} />}
    </ReviewFrame>
  );
}

/** Step 1: the period's numbers, mood over time, goals that moved, and a draft summary. */
function StepLookBack({ review, period, today }: { review: Review; period: ReviewPeriod; today: Day }) {
  const data = useLiveQuery(() => loadPeriodData(period, review.periodStart, today), [period, review.periodStart, today]);
  const answers = readAnswers(review);
  if (!data) return null;
  const { summary, moves, draft, bestDay } = data;
  const unit = UNIT[period];

  return (
    <div className={styles.split}>
      <Card title={`Your ${unit} at a glance`} meta="filled in automatically" className={styles.card}>
        <div className={styles.glance}>
          <Glance label="Tasks done" value={summary.tasksDone} extra={summary.tasksDelta > 0 ? `+${summary.tasksDelta}` : undefined} />
          <Glance label="Habits" value={summary.habitConsistency === null ? '–' : `${Math.round(summary.habitConsistency * 100)}%`} />
          <Glance label="Mood" value={summary.avgMood === null ? '–' : summary.avgMood.toFixed(1)} />
          <Glance label="Sleep" value={summary.avgSleepMinutes === null ? '–' : formatMinutes(Math.round(summary.avgSleepMinutes))} />
          <Glance label="Check-ins" value={`${summary.checkInDays} / ${summary.daysSoFar}`} />
        </div>

        <div
          className={styles.bars}
          role="img"
          aria-label={`Average mood by ${period === 'month' ? 'day' : 'month'}: ${summary.buckets.map((b) => `${b.label} ${b.mood === null ? 'none' : b.mood.toFixed(1)}`).join('; ')}`}
        >
          <div className={styles.barsLegend} aria-hidden="true">
            <span>
              <span className={cx(styles.swatch, styles.moodSwatch)} />
              {period === 'month' ? 'Mood by day' : 'Mood'}
            </span>
            {period !== 'month' && (
              <span>
                <span className={cx(styles.swatch, styles.energySwatch)} />
                Energy
              </span>
            )}
          </div>
          <div className={cx(styles.barGrid, period === 'month' && styles.barGridDense)} style={{ gridTemplateColumns: `repeat(${summary.buckets.length}, minmax(0, 1fr))` }} aria-hidden="true">
            {summary.buckets.map((b, i) => (
              <div key={b.start} className={styles.barDay}>
                <div className={styles.barPair}>
                  <span className={cx(styles.bar, styles.moodBar)} style={{ height: `${((b.mood ?? 0) / 5) * 100}%` }} />
                  {period !== 'month' && <span className={cx(styles.bar, styles.energyBar)} style={{ height: `${((b.energy ?? 0) / 5) * 100}%` }} />}
                </div>
                <span className={styles.barLabel}>{period === 'month' && i % 5 !== 0 ? '' : b.label}</span>
              </div>
            ))}
          </div>
        </div>
        {bestDay && (
          <p className={styles.quiet}>
            Your best day was {formatDayShort(bestDay.day)}
            {bestDay.line ? `: ${bestDay.line}` : '.'}
          </p>
        )}
      </Card>

      <div className={styles.column}>
        <Card title="Goals that moved" className={styles.card}>
          {moves.length === 0 && <p className={styles.quiet}>No goal changed this {unit}. That’s information too.</p>}
          <ul className={styles.moves}>
            {moves.map((m) => (
              <li key={m.id}>
                <span>{m.title}</span>
                {m.stalled ? (
                  <span className={styles.stalled}>no progress this {unit}</span>
                ) : (
                  <span className={styles.moved}>
                    +{Math.round(m.delta)}% → {Math.round(m.after ?? 0)}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title={
            <span className={styles.draftTitle}>
              <Icon name="assistant" size={16} /> Draft summary
            </span>
          }
          action={<span className={styles.optional}>Optional</span>}
          className={styles.card}
        >
          <p className={styles.draft}>{answers.summary || draft}</p>
          {answers.summary ? (
            <p className={styles.quiet}>In your review. It goes into your journal when you finish.</p>
          ) : (
            <div className={styles.draftActions}>
              <Button size="sm" variant="primary" onClick={() => void saveReviewAnswers(review.id, { summary: draft })}>
                Insert into review
              </Button>
            </div>
          )}
          <p className={styles.quiet}>Written on this device from this {unit}’s numbers. Nothing leaves this device.</p>
        </Card>
      </div>
    </div>
  );
}

/** Step 2: three questions; quarters and years also rate the life areas. */
function StepThink({ review, period, today }: { review: Review; period: ReviewPeriod; today: Day }) {
  const answers = readAnswers(review);
  const questions = PERIOD_QUESTIONS[period];
  const wheel = useLiveQuery(() => (period === 'month' ? Promise.resolve(null) : loadWheelOfLife()), [period]);

  return (
    <div className={period === 'month' ? undefined : styles.split}>
      <Card title="Reflect" meta="a few lines is plenty" className={styles.card}>
        <Question id="wentWell" label={questions.wentWell} placeholder="A win, however small…" review={review} value={answers.wentWell} />
        <Question id="drained" label={questions.drained} placeholder={period === 'month' ? 'Nothing to fix yet, just notice it…' : 'What would you tell yourself at the start?'} review={review} value={answers.drained} />
        <Question id="differently" label={questions.differently} placeholder="One clear change is enough…" review={review} value={answers.differently} />
      </Card>
      {wheel && (
        <div className={styles.column}>
          <WheelCard wheel={wheel} today={today} />
        </div>
      )}
    </div>
  );
}

/** Step 3: up to three goals for the next period; the year also picks next year's word. */
function StepPlanNext({ review, period, today }: { review: Review; period: ReviewPeriod; today: Day }) {
  const data = useLiveQuery(async () => {
    const board = await loadGoalBoard(today);
    const existing = (await Promise.all(readAnswers(review).focusGoalIds.map((id) => goalsRepo.get(id)))).filter((g) => !!g);
    return { board, existing };
  }, [today, review.id]);
  if (!data) return null;
  const next = nextPeriodName(review.periodStart, period);
  // Goals for the next period can follow a bigger one: a month's follow the quarter's and year's.
  const bigger: Record<ReviewPeriod, ReadonlyArray<string>> = { month: ['year', 'quarter'], quarter: ['year'], year: [] };

  return (
    <Planner
      key={data.existing.map((g) => g.id).join()}
      data={data}
      offer={(h) => bigger[period].includes(h)}
      copy={{
        title: `Plan ${next}`,
        lead:
          period === 'year'
            ? `Choose up to three goals for ${next}. You can shape them on Goals afterwards.`
            : `Choose up to three goals for ${next}. Name each as something you can finish within the ${UNIT[period]}.`,
        nameLabel: (title) => `In ${next} for ${title}`,
        ownPlaceholder: period === 'year' ? 'A goal for the year, e.g. “Run a marathon”' : 'Or add your own, e.g. “Finish the garden plan”',
        saved: `Saved. These are your goals for ${next}.`,
        button: `Set goals for ${next}`,
      }}
      onSave={(picks) => setPeriodFocus(review, picks)}
    >
      {period === 'year' && <WordOfYear review={review} next={next} />}
    </Planner>
  );
}

function WordOfYear({ review, next }: { review: Review; next: string }) {
  const saved = readAnswers(review).word;
  const [word, setWord] = useState(saved);
  return (
    <label className={styles.question}>
      <span className={styles.questionLabel}>Your word for {next}</span>
      <input className={styles.wordInput} value={word} placeholder="One word to come back to, e.g. “Steady”" onChange={(e) => setWord(e.target.value)} onBlur={() => word.trim() !== saved && void setNextYearWord(review, word)} />
    </label>
  );
}

/** Step 4: look it over, then save it to the journal page for the period's last day. */
function StepFinish({ review, period }: { review: Review; period: ReviewPeriod }) {
  const answers = readAnswers(review);
  const questions = PERIOD_QUESTIONS[period];
  const focus = useLiveQuery(async () => (await Promise.all(answers.focusGoalIds.map((id) => goalsRepo.get(id)))).filter((g) => !!g), [answers.focusGoalIds.join()]);
  const [busy, setBusy] = useState(false);
  const last = periodEnd(review.periodStart, period);
  const next = nextPeriodName(review.periodStart, period);

  const rows = [
    ['Summary', answers.summary],
    [questions.wentWell, answers.wentWell],
    [questions.drained, answers.drained],
    [questions.differently, answers.differently],
    ['Word of the year', answers.word],
  ].filter(([, v]) => v);

  return (
    <Card title={review.completedAt ? 'Review saved' : 'Wrap up'} className={styles.card}>
      {review.completedAt ? (
        <p className={styles.lead}>
          Saved to your journal for {formatDayShort(last)}.{' '}
          <Link to={`/library/day/${last}`} className={styles.headerLink}>
            Open journal page
          </Link>
        </p>
      ) : (
        <p className={styles.lead}>Here’s what goes into your journal for {formatDayShort(last)}.</p>
      )}
      {rows.length === 0 && !focus?.length && <p className={styles.quiet}>Nothing written this time, and that’s fine. Finishing still counts the {UNIT[period]} as reviewed.</p>}
      <dl className={styles.recap}>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        {!!focus?.length && (
          <div>
            <dt>Goals for {next}</dt>
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
              await completePeriodReview(review.id);
            }}
          >
            Finish review
          </Button>
        </div>
      )}
    </Card>
  );
}
