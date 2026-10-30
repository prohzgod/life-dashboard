import { useState } from 'react';
import { makeDay, type Day } from '@/domain/days';
import type { HabitData } from '@/domain/review';
import { habitHeatmap } from '@/domain/stats';
import { summarizeHabit } from '@/domain/habits';
import { Card } from '@/components/ui';
import { formatDayShort } from '@/lib/format';
import { useT } from '@/i18n';
import styles from './Progress.module.css';

export function HabitHeatmapCard({ year, habits, today }: { year: number; habits: HabitData[]; today: Day }) {
  const { format, progress } = useT();
  const t = progress.heatmap;
  const [habitId, setHabitId] = useState('all');
  const chosen = habitId === 'all' ? habits : habits.filter((h) => h.id === habitId);
  const weeks = habitHeatmap(chosen, makeDay(year, 1, 1), makeDay(year, 12, 31), today);
  const longest = chosen
    .map((h) => ({ title: h.title, streak: summarizeHabit(h.input, h.logs, today).streak }))
    .sort((a, b) => b.streak - a.streak)[0];

  return (
    <Card
      title={habitId === 'all' ? t.all(habits.length) : t.one(chosen[0]?.title ?? '')}
      className={styles.wide}
      action={
        <select className={styles.select} aria-label={t.which} value={habitId} onChange={(e) => setHabitId(e.target.value)}>
          <option value="all">{t.allHabits}</option>
          {habits.map((h) => (
            <option key={h.id} value={h.id}>
              {h.title}
            </option>
          ))}
        </select>
      }
    >
      <div className={styles.heatScroll}>
        <div className={styles.heatMonths} aria-hidden="true" style={{ gridTemplateColumns: `20px repeat(${weeks.length}, 12px)` }}>
          <span />
          {weeks.map((week, i) => {
            const first = week.find(Boolean);
            const label = first && Number(first.day.slice(8)) <= 7 ? format.monthsShort[Number(first.day.slice(5, 7)) - 1] : '';
            return <span key={i}>{label}</span>;
          })}
        </div>
        <div className={styles.heat} role="img" aria-label={t.label(year)} style={{ gridTemplateColumns: `20px repeat(${weeks.length}, 12px)` }}>
          {t.rows.map((r, row) => (
            <div key={row} className={styles.heatRowWrap}>
              <span className={styles.heatDay}>{r}</span>
              {weeks.map((week, w) => {
                const cell = week[row];
                return (
                  <span
                    key={w}
                    className={`${styles.heatCell} ${cell ? styles[`heat${cell.level}`] : styles.heatEmpty}`}
                    title={cell ? t.cell(formatDayShort(cell.day), cell.done, cell.scheduled) : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.heatFoot}>
        <span className={styles.legend} aria-hidden="true">
          {t.fewer}
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`${styles.legendSwatch} ${styles[`heat${l}`]}`} />
          ))}
          {t.allDone}
        </span>
        {longest && longest.streak > 1 && (
          <span>
            {t.bestStreak(longest.title, longest.streak)}
          </span>
        )}
      </div>
    </Card>
  );
}
