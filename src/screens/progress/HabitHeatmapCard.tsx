import { useState } from 'react';
import { makeDay, type Day } from '@/domain/days';
import type { HabitData } from '@/domain/review';
import { habitHeatmap } from '@/domain/stats';
import { summarizeHabit } from '@/domain/habits';
import { Card } from '@/components/ui';
import { formatDayShort } from '@/lib/format';
import styles from './Progress.module.css';

const ROWS = ['M', '', 'W', '', 'F', '', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function HabitHeatmapCard({ year, habits, today }: { year: number; habits: HabitData[]; today: Day }) {
  const [habitId, setHabitId] = useState('all');
  const chosen = habitId === 'all' ? habits : habits.filter((h) => h.id === habitId);
  const weeks = habitHeatmap(chosen, makeDay(year, 1, 1), makeDay(year, 12, 31), today);
  const longest = chosen
    .map((h) => ({ title: h.title, streak: summarizeHabit(h.input, h.logs, today).streak }))
    .sort((a, b) => b.streak - a.streak)[0];

  return (
    <Card
      title={habitId === 'all' ? `Habits · all ${habits.length} combined` : `Habits · ${chosen[0]?.title ?? ''}`}
      className={styles.wide}
      action={
        <select className={styles.select} aria-label="Which habits" value={habitId} onChange={(e) => setHabitId(e.target.value)}>
          <option value="all">All habits</option>
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
            const label = first && Number(first.day.slice(8)) <= 7 ? MONTHS[Number(first.day.slice(5, 7)) - 1] : '';
            return <span key={i}>{label}</span>;
          })}
        </div>
        <div className={styles.heat} role="img" aria-label={`Habit days in ${year}, from none to all done`} style={{ gridTemplateColumns: `20px repeat(${weeks.length}, 12px)` }}>
          {ROWS.map((r, row) => (
            <div key={row} className={styles.heatRowWrap}>
              <span className={styles.heatDay}>{r}</span>
              {weeks.map((week, w) => {
                const cell = week[row];
                return (
                  <span
                    key={w}
                    className={`${styles.heatCell} ${cell ? styles[`heat${cell.level}`] : styles.heatEmpty}`}
                    title={cell ? `${formatDayShort(cell.day)}: ${cell.done} of ${cell.scheduled} done` : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.heatFoot}>
        <span className={styles.legend} aria-hidden="true">
          Fewer
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`${styles.legendSwatch} ${styles[`heat${l}`]}`} />
          ))}
          All done
        </span>
        {longest && longest.streak > 1 && (
          <span>
            Current best streak: {longest.title.toLowerCase()}, {longest.streak} days
          </span>
        )}
      </div>
    </Card>
  );
}
