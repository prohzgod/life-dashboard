import { useState } from 'react';
import { Link } from 'react-router-dom';
import { year, type Day } from '@/domain/days';
import type { GoalBoard } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { cx } from '@/components/ui/cx';
import { goalNow, goalStatusLine } from '@/lib/goalText';
import styles from './MobileGoals.module.css';

/** Goals on phones: the year's vision, then one card per top-level goal. */
export function MobileGoals({ board, today, onCreate }: { board: GoalBoard; today: Day; onCreate: () => void }) {
  const [areaId, setAreaId] = useState<string | null>(null);
  const live = board.views.filter((v) => (v.goal.status === 'active' || v.goal.status === 'paused') && v.goal.horizon !== 'week');
  const top = live.filter((v) => !v.goal.parentGoalId || !live.some((p) => p.goal.id === v.goal.parentGoalId));
  const shown = top.filter((v) => !areaId || v.goal.areaId === areaId);
  const areasInUse = board.areas.filter((a) => top.some((v) => v.goal.areaId === a.id));
  const completed = board.views.filter((v) => v.goal.status === 'done' && year(v.goal.endDate) === year(today)).length;
  const nested = live.length - top.length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Goals</h1>
        <button type="button" className={styles.add} aria-label="New goal" onClick={onCreate}>
          <Icon name="plus" size={20} />
        </button>
      </header>

      {board.vision?.title && (
        <section className={styles.vision} aria-label={`${year(today)} vision`}>
          <span className={styles.eyebrow}>
            {year(today)}
            {board.vision.wordOfYear ? ` · ${board.vision.wordOfYear}` : ''}
          </span>
          <p className={styles.statement}>{board.vision.title}</p>
        </section>
      )}

      {areasInUse.length > 1 && (
        <div className={styles.chips} role="group" aria-label="Filter by area">
          <button type="button" aria-pressed={!areaId} className={cx(styles.chip, !areaId && styles.chipOn)} onClick={() => setAreaId(null)}>
            All
          </button>
          {areasInUse.map((a) => (
            <button key={a.id} type="button" aria-pressed={areaId === a.id} className={cx(styles.chip, areaId === a.id && styles.chipOn)} onClick={() => setAreaId(areaId === a.id ? null : a.id)}>
              <span className={styles.dot} style={{ background: `var(--${a.color})` }} aria-hidden="true" />
              {a.name}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 && <p className={styles.empty}>No goals yet. Tap + to set one for this year.</p>}
      <ul className={styles.list}>
        {shown.map(({ goal, progress, pace }) => {
          const area = board.areas.find((a) => a.id === goal.areaId);
          const status = goalStatusLine(goal, progress, pace);
          return (
            <li key={goal.id}>
              <Link to={`/goals/${goal.id}`} className={styles.card}>
                <span className={styles.cardTop}>
                  <span className={styles.areaLine}>
                    {area && <span className={styles.dot} style={{ background: `var(--${area.color})` }} aria-hidden="true" />}
                    {area ? `${area.name} · ` : ''}
                    {goal.horizon}
                  </span>
                  <span className={styles.now}>{goalNow(goal, progress)}</span>
                </span>
                <span className={styles.goalTitle}>{goal.title}</span>
                <span className={styles.bar} aria-hidden="true">
                  <span className={styles.fill} style={{ width: `${progress.percent ?? 0}%`, background: area ? `var(--${area.color})` : undefined }} />
                  {pace.expected !== null && (pace.state === 'on-pace' || pace.state === 'behind') && <span className={styles.tick} style={{ left: `${pace.expected}%` }} />}
                </span>
                <span className={cx(styles.status, styles[status.tone])}>{status.text}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {(nested > 0 || completed > 0) && (
        <p className={styles.foot}>
          {nested > 0 ? `${nested} more inside these` : ''}
          {nested > 0 && completed > 0 ? ' · ' : ''}
          {completed > 0 ? `${completed} completed this year` : ''}
        </p>
      )}
    </div>
  );
}
