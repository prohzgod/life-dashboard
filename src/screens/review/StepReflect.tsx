import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { weekday, type Day } from '@/domain/days';
import { getAttachment, loadWeekData, readAnswers, saveReviewAnswers, type Review, type ReviewAnswers } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button, Card } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { formatMinutes } from '@/lib/format';
import { useObjectUrl } from '@/lib/useObjectUrl';
import { intlLocale, useT } from '@/i18n';
import styles from './Review.module.css';

/** Step 3: the week at a glance, three questions, and a draft summary written from the numbers. */
export function StepReflect({ review, today }: { review: Review; today: Day }) {
  const { format, reviews } = useT();
  const t = reviews.reflect;
  const DAYS = format.weekdaysShort;
  const LONG_DAYS = format.weekdaysLong;
  const data = useLiveQuery(() => loadWeekData(review.periodStart, today), [review.periodStart, today]);
  const photo = useLiveQuery(async () => (data?.bestDay?.photoId ? ((await getAttachment(data.bestDay.photoId)) ?? null) : null), [data?.bestDay?.photoId]);
  const photoUrl = useObjectUrl(photo?.thumbBlob ?? photo?.blob);
  const answers = readAnswers(review);
  if (!data) return null;
  const { summary, moves, draft, bestDay } = data;
  const best = summary.days.reduce((b, d) => ((d.mood ?? 0) + (d.energy ?? 0) > (b.mood ?? 0) + (b.energy ?? 0) ? d : b), summary.days[0]!);

  return (
    <div className={styles.split}>
      <Card title={t.glance} meta={t.auto} className={styles.card}>
        <div className={styles.glance}>
          <Glance label={t.tasksDone} value={summary.tasksDone} extra={summary.tasksDelta > 0 ? `+${summary.tasksDelta}` : undefined} />
          <Glance label={t.habits} value={summary.habitConsistency === null ? '–' : `${Math.round(summary.habitConsistency * 100)}%`} />
          <Glance label={t.mood} value={summary.avgMood === null ? '–' : summary.avgMood.toLocaleString(intlLocale(), { maximumFractionDigits: 1, minimumFractionDigits: 1 })} />
          <Glance label={t.sleep} value={summary.avgSleepMinutes === null ? '–' : formatMinutes(Math.round(summary.avgSleepMinutes))} />
          <Glance label={t.journal} value={`${summary.journalDays} / 7`} />
        </div>

        <div className={styles.bars} role="img" aria-label={t.barsLabel(summary.days.map((d) => t.barDay(DAYS[weekday(d.day)]!, String(d.mood ?? t.none), String(d.energy ?? t.none))).join('; '))}>
          <div className={styles.barsLegend} aria-hidden="true">
            <span><span className={cx(styles.swatch, styles.moodSwatch)} />{t.mood}</span>
            <span><span className={cx(styles.swatch, styles.energySwatch)} />{t.energy}</span>
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

        <Question id="wentWell" label={t.wentWell} placeholder={t.wentWellPlaceholder} review={review} value={answers.wentWell} />
        <Question id="drained" label={t.drained} placeholder={t.drainedPlaceholder} review={review} value={answers.drained} />
        <Question id="differently" label={t.differently} placeholder={t.differentlyPlaceholder} review={review} value={answers.differently} />
      </Card>

      <div className={styles.column}>
        <section className={cx(styles.card, styles.bestDay)} aria-label={t.bestDayLabel}>
          <div className={styles.bestPhoto}>
            {photoUrl ? <img src={photoUrl} alt="" /> : <><Icon name="image" size={20} /><span>{t.photo}</span></>}
          </div>
          <div className={styles.bestText}>
            <span className={styles.eyebrow}>{t.bestDayLabel}</span>
            {bestDay ? (
              <>
                <p className={styles.bestLine}>
                  {LONG_DAYS[weekday(bestDay.day)]}
                  {bestDay.line ? `: ${bestDay.line}` : '.'}
                </p>
                <span className={styles.quiet}>{t.bestMeta(bestDay.mood ?? 0, bestDay.energy, bestDay.sleepMinutes ? formatMinutes(bestDay.sleepMinutes) : null)}</span>
              </>
            ) : (
              <p className={styles.quiet}>{t.bestEmpty}</p>
            )}
          </div>
        </section>

        <Card title={t.moved} className={styles.card}>
          {moves.length === 0 && <p className={styles.quiet}>{t.noMoves}</p>}
          <ul className={styles.moves}>
            {moves.map((m) => (
              <li key={m.id}>
                <span>{m.title}</span>
                {m.stalled ? (
                  <span className={styles.stalled}>{t.stalled}</span>
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
              <Icon name="assistant" size={16} /> {t.draft}
            </span>
          }
          action={<span className={styles.optional}>{t.optional}</span>}
          className={styles.card}
        >
          <p className={styles.draft}>{answers.summary || draft}</p>
          {answers.summary ? (
            <p className={styles.quiet}>{t.inReview}</p>
          ) : (
            <div className={styles.draftActions}>
              <Button size="sm" variant="primary" onClick={() => void saveReviewAnswers(review.id, { summary: draft })}>
                {t.insert}
              </Button>
            </div>
          )}
          <p className={styles.quiet}>{t.privateWeek}</p>
        </Card>
      </div>
    </div>
  );
}

export function Glance({ label, value, extra }: { label: string; value: string | number; extra?: string }) {
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
export function Question({ id, label, placeholder, review, value }: { id: keyof Pick<ReviewAnswers, 'wentWell' | 'drained' | 'differently'>; label: string; placeholder: string; review: Review; value: string }) {
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
