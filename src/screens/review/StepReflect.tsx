import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { weekday, type Day } from '@/domain/days';
import { getAttachment, loadWeekData, readAnswers, saveReviewAnswers, type Review, type ReviewAnswers } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button, Card } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { formatMinutes } from '@/lib/format';
import { useObjectUrl } from '@/lib/useObjectUrl';
import styles from './Review.module.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Step 3: the week at a glance, three questions, and a draft summary written from the numbers. */
export function StepReflect({ review, today }: { review: Review; today: Day }) {
  const data = useLiveQuery(() => loadWeekData(review.periodStart, today), [review.periodStart, today]);
  const photo = useLiveQuery(async () => (data?.bestDay?.photoId ? ((await getAttachment(data.bestDay.photoId)) ?? null) : null), [data?.bestDay?.photoId]);
  const photoUrl = useObjectUrl(photo?.thumbBlob ?? photo?.blob);
  const answers = readAnswers(review);
  if (!data) return null;
  const { summary, moves, draft, bestDay } = data;
  const best = summary.days.reduce((b, d) => ((d.mood ?? 0) + (d.energy ?? 0) > (b.mood ?? 0) + (b.energy ?? 0) ? d : b), summary.days[0]!);

  return (
    <div className={styles.split}>
      <Card title="Your week at a glance" meta="filled in automatically" className={styles.card}>
        <div className={styles.glance}>
          <Glance label="Tasks done" value={summary.tasksDone} extra={summary.tasksDelta > 0 ? `+${summary.tasksDelta}` : undefined} />
          <Glance label="Habits" value={summary.habitConsistency === null ? '–' : `${Math.round(summary.habitConsistency * 100)}%`} />
          <Glance label="Mood" value={summary.avgMood === null ? '–' : summary.avgMood.toFixed(1)} />
          <Glance label="Sleep" value={summary.avgSleepMinutes === null ? '–' : formatMinutes(Math.round(summary.avgSleepMinutes))} />
          <Glance label="Journal" value={`${summary.journalDays} / 7`} />
        </div>

        <div className={styles.bars} role="img" aria-label={`Mood and energy by day: ${summary.days.map((d) => `${DAYS[weekday(d.day)]} mood ${d.mood ?? 'none'}, energy ${d.energy ?? 'none'}`).join('; ')}`}>
          <div className={styles.barsLegend} aria-hidden="true">
            <span><span className={cx(styles.swatch, styles.moodSwatch)} />Mood</span>
            <span><span className={cx(styles.swatch, styles.energySwatch)} />Energy</span>
          </div>
          <div className={styles.barGrid} aria-hidden="true">
            {summary.days.map((d) => (
              <div key={d.day} className={styles.barDay}>
                <div className={styles.barPair}>
                  <span className={cx(styles.bar, styles.moodBar)} style={{ height: `${((d.mood ?? 0) / 5) * 100}%` }} />
                  <span className={cx(styles.bar, styles.energyBar)} style={{ height: `${((d.energy ?? 0) / 5) * 100}%` }} />
                </div>
                <span className={cx(styles.barLabel, d === best && best.mood !== null && styles.barLabelBest)}>{DAYS[weekday(d.day)]}</span>
              </div>
            ))}
          </div>
        </div>

        <Question id="wentWell" label="What went well?" placeholder="A win, however small…" review={review} value={answers.wentWell} />
        <Question id="drained" label="What drained you?" placeholder="Nothing to fix yet, just notice it…" review={review} value={answers.drained} />
        <Question id="differently" label="What will you do differently next week?" placeholder="One small change is enough…" review={review} value={answers.differently} />
      </Card>

      <div className={styles.column}>
        <section className={cx(styles.card, styles.bestDay)} aria-label="Best day">
          <div className={styles.bestPhoto}>
            {photoUrl ? <img src={photoUrl} alt="" /> : <><Icon name="image" size={20} /><span>Photo</span></>}
          </div>
          <div className={styles.bestText}>
            <span className={styles.eyebrow}>Best day</span>
            {bestDay ? (
              <>
                <p className={styles.bestLine}>
                  {LONG_DAYS[weekday(bestDay.day)]}
                  {bestDay.line ? `: ${bestDay.line}` : '.'}
                </p>
                <span className={styles.quiet}>
                  Mood {bestDay.mood}
                  {bestDay.energy ? `, energy ${bestDay.energy}` : ''}
                  {bestDay.sleepMinutes ? `, ${formatMinutes(bestDay.sleepMinutes)} sleep` : ''}
                </span>
              </>
            ) : (
              <p className={styles.quiet}>Check in on Today, and your best day shows up here.</p>
            )}
          </div>
        </section>

        <Card title="Goals that moved" className={styles.card}>
          {moves.length === 0 && <p className={styles.quiet}>No goal changed this week. That’s information too.</p>}
          <ul className={styles.moves}>
            {moves.map((m) => (
              <li key={m.id}>
                <span>{m.title}</span>
                {m.stalled ? (
                  <span className={styles.stalled}>no progress, 2 weeks</span>
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
          <p className={styles.quiet}>Written on this device from this week’s numbers. Nothing leaves this device.</p>
        </Card>
      </div>
    </div>
  );
}

function Glance({ label, value, extra }: { label: string; value: string | number; extra?: string }) {
  return (
    <div className={styles.glanceTile}>
      <span className={styles.glanceLabel}>{label}</span>
      <span className={styles.glanceValue}>
        {value} {extra && <span className={styles.glanceExtra}>{extra}</span>}
      </span>
    </div>
  );
}

/** A reflection question that saves as you type. */
function Question({ id, label, placeholder, review, value }: { id: keyof Pick<ReviewAnswers, 'wentWell' | 'drained' | 'differently'>; label: string; placeholder: string; review: Review; value: string }) {
  const [text, setText] = useState(value);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const save = (next: string) => {
    window.clearTimeout(timer.current);
    if (next !== value) void saveReviewAnswers(review.id, { [id]: next });
  };
  return (
    <label className={styles.question}>
      <span className={styles.questionLabel}>{label}</span>
      <textarea
        rows={2}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => save(next), 600);
        }}
        onBlur={() => save(text)}
      />
    </label>
  );
}
