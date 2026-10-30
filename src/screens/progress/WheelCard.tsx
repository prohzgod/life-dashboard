import { useState } from 'react';
import type { Day } from '@/domain/days';
import { saveAreaRatings, type WheelOfLife } from '@/data';
import { Chart } from '@/components/charts/Chart';
import { chartFont } from '@/components/charts/chartTheme';
import { Button, Card } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { formatDayMonth, formatDayShort } from '@/lib/format';
import { useT } from '@/i18n';
import styles from './Progress.module.css';

/** How each life area feels, 1–10, now against about a quarter ago. */
export function WheelCard({ wheel, today }: { wheel: WheelOfLife; today: Day }) {
  const t = useT().progress.wheel;
  const [rating, setRating] = useState(false);
  const rated = wheel.now.size > 0;
  const label = rated
    ? t.label(formatDayShort(wheel.ratedOn!), wheel.areas.map((a) => `${a.name} ${wheel.now.get(a.id) ?? t.notRated}`).join(', '))
    : t.notRatedYet;

  return (
    <Card
      title={t.title}
      meta={rated ? t.rated(formatDayMonth(wheel.ratedOn!)) : undefined}
      action={
        <Button variant="quiet" size="sm" onClick={() => setRating(true)}>
          {rated ? t.rateAgain : t.rate}
        </Button>
      }
    >
      {rated ? (
        <>
          <Chart
            height={260}
            label={label}
            option={(c) => ({
              textStyle: { fontFamily: chartFont },
              animation: false,
              radar: {
                indicator: wheel.areas.map((a) => ({ name: `${a.name} ${wheel.now.get(a.id) ?? '–'}`, max: 10 })),
                radius: '62%',
                splitNumber: 5,
                axisName: { color: c['ink-2'], fontSize: 12 },
                splitLine: { lineStyle: { color: c.line } },
                splitArea: { areaStyle: { color: [c.fill, c.fill2] } },
                axisLine: { lineStyle: { color: c.line } },
              },
              series: [
                {
                  type: 'radar',
                  symbol: 'none',
                  data: [
                    ...(wheel.before.size
                      ? [{ name: t.before, value: wheel.areas.map((a) => wheel.before.get(a.id) ?? 0), lineStyle: { type: 'dashed', color: c['ink-3'], width: 1.5 } }]
                      : []),
                    { name: t.now, value: wheel.areas.map((a) => wheel.now.get(a.id) ?? 0), lineStyle: { color: c.strong, width: 2 }, areaStyle: { color: c.accent, opacity: 0.4 } },
                  ],
                },
              ],
            })}
          />
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.lineSolid} /> {t.now}
            </span>
            {wheel.beforeOn && (
              <span className={styles.legendItem}>
                <span className={styles.lineDashed} /> {formatDayMonth(wheel.beforeOn)}
              </span>
            )}
          </div>
        </>
      ) : (
        <p className={styles.quiet}>{t.empty}</p>
      )}
      <Dialog open={rating} onClose={() => setRating(false)} title={t.question}>
        {rating && <RateAreas wheel={wheel} today={today} onDone={() => setRating(false)} />}
      </Dialog>
    </Card>
  );
}

function RateAreas({ wheel, today, onDone }: { wheel: WheelOfLife; today: Day; onDone: () => void }) {
  const t = useT().progress.wheel;
  const [scores, setScores] = useState(() => new Map(wheel.areas.map((a) => [a.id, wheel.now.get(a.id) ?? 5])));
  return (
    <form
      className={styles.rateForm}
      onSubmit={async (e) => {
        e.preventDefault();
        await saveAreaRatings(today, scores);
        onDone();
      }}
    >
      {wheel.areas.map((a, i) => (
        <label key={a.id} className={styles.rateRow}>
          <span className={styles.rateName}>
            <span className={styles.dot} style={{ background: `var(--${a.color})` }} aria-hidden="true" />
            {a.name}
          </span>
          <input
            type="range"
            min={1}
            max={10}
            value={scores.get(a.id)}
            data-autofocus={i === 0 || undefined}
            onChange={(e) => setScores(new Map(scores).set(a.id, Number(e.target.value)))}
            style={{ accentColor: `var(--${a.color})` }}
          />
          <output className={styles.rateValue}>{scores.get(a.id)}</output>
        </label>
      ))}
      <div className={styles.rateActions}>
        <Button onClick={onDone}>{t.cancel}</Button>
        <Button type="submit" variant="primary">
          {t.save}
        </Button>
      </div>
    </form>
  );
}
