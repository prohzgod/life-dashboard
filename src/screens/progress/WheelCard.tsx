import { useState } from 'react';
import type { Day } from '@/domain/days';
import { saveAreaRatings, type WheelOfLife } from '@/data';
import { Chart } from '@/components/charts/Chart';
import { chartFont } from '@/components/charts/chartTheme';
import { Button, Card } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { formatDayShort } from '@/lib/format';
import styles from './Progress.module.css';

/** How each life area feels, 1–10, now against about a quarter ago. */
export function WheelCard({ wheel, today }: { wheel: WheelOfLife; today: Day }) {
  const [rating, setRating] = useState(false);
  const rated = wheel.now.size > 0;
  const label = rated
    ? `Wheel of life, rated ${formatDayShort(wheel.ratedOn!)}: ${wheel.areas.map((a) => `${a.name} ${wheel.now.get(a.id) ?? 'not rated'}`).join(', ')}.`
    : 'Wheel of life, not rated yet';

  return (
    <Card
      title="Wheel of life"
      meta={rated ? `rated ${formatDayShort(wheel.ratedOn!).slice(4)}` : undefined}
      action={
        <Button variant="quiet" size="sm" onClick={() => setRating(true)}>
          {rated ? 'Rate again' : 'Rate your areas'}
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
                splitArea: { areaStyle: { color: [c.surface, c.sunken] } },
                axisLine: { lineStyle: { color: c.line } },
              },
              series: [
                {
                  type: 'radar',
                  symbol: 'none',
                  data: [
                    ...(wheel.before.size
                      ? [{ name: 'Before', value: wheel.areas.map((a) => wheel.before.get(a.id) ?? 0), lineStyle: { type: 'dashed', color: c['ink-3'], width: 1.5 } }]
                      : []),
                    { name: 'Now', value: wheel.areas.map((a) => wheel.now.get(a.id) ?? 0), lineStyle: { color: c.inverse, width: 2 }, areaStyle: { color: c['viz-soft'], opacity: 0.45 } },
                  ],
                },
              ],
            })}
          />
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.lineSolid} /> Now
            </span>
            {wheel.beforeOn && (
              <span className={styles.legendItem}>
                <span className={styles.lineDashed} /> {formatDayShort(wheel.beforeOn).slice(4)}
              </span>
            )}
          </div>
        </>
      ) : (
        <p className={styles.quiet}>Give each area of life a score from 1 to 10. Do it again in a few months to see what shifted.</p>
      )}
      <Dialog open={rating} onClose={() => setRating(false)} title="How does each area feel right now?">
        {rating && <RateAreas wheel={wheel} today={today} onDone={() => setRating(false)} />}
      </Dialog>
    </Card>
  );
}

function RateAreas({ wheel, today, onDone }: { wheel: WheelOfLife; today: Day; onDone: () => void }) {
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
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary">
          Save ratings
        </Button>
      </div>
    </form>
  );
}
