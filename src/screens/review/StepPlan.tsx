import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import type { Day } from '@/domain/days';
import { goalsRepo, loadGoalBoard, readAnswers, setWeekFocus, type Review } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button, Card } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import styles from './Review.module.css';

type Pick = { key: string; parentGoalId: string | null; title: string };

/** Step 4: pick 1–3 things to focus on next week. They become Today's "This week's focus". */
export function StepPlan({ review, today, nextWeek }: { review: Review; today: Day; nextWeek: number }) {
  const data = useLiveQuery(async () => {
    const board = await loadGoalBoard(today);
    const existing = (await Promise.all(readAnswers(review).focusGoalIds.map((id) => goalsRepo.get(id)))).filter((g) => !!g);
    return { board, existing };
  }, [today, review.id]);
  if (!data) return null;
  return <Planner key={data.existing.map((g) => g.id).join()} review={review} data={data} nextWeek={nextWeek} />;
}

function Planner({ review, data, nextWeek }: { review: Review; data: { board: Awaited<ReturnType<typeof loadGoalBoard>>; existing: Array<{ id: string; title: string; parentGoalId: string | null }> }; nextWeek: number }) {
  const [picks, setPicks] = useState<Pick[]>(() => data.existing.map((g) => ({ key: g.id, parentGoalId: g.parentGoalId, title: g.title })));
  const [own, setOwn] = useState('');
  const [saved, setSaved] = useState(data.existing.length > 0);
  const candidates = data.board.views.filter((v) => v.goal.status === 'active' && v.goal.horizon !== 'week');
  const full = picks.length >= 3;
  const toggle = (goalId: string, title: string) => {
    setSaved(false);
    setPicks((p) => (p.some((x) => x.parentGoalId === goalId) ? p.filter((x) => x.parentGoalId !== goalId) : p.length >= 3 ? p : [...p, { key: goalId, parentGoalId: goalId, title }]));
  };

  return (
    <Card title={`Plan week ${nextWeek}`} meta={`${picks.length} of 3 picked`} className={styles.card}>
      <p className={styles.lead}>Choose up to three things that would make next week a good one. Name each as something you can do this week.</p>
      <ul className={styles.picks}>
        {candidates.map(({ goal, pace }) => {
          const pick = picks.find((p) => p.parentGoalId === goal.id);
          const area = data.board.areas.find((a) => a.id === goal.areaId);
          return (
            <li key={goal.id} className={cx(styles.pick, pick && styles.picked)}>
              <label className={styles.pickToggle}>
                <input type="checkbox" checked={!!pick} disabled={!pick && full} onChange={() => toggle(goal.id, goal.title)} />
                {area && <span className={styles.dot} style={{ background: `var(--${area.color})` }} aria-hidden="true" />}
                <span className={styles.pickTitle}>{goal.title}</span>
                <span className={pace.state === 'behind' ? styles.stalled : styles.quiet}>{pace.sentence}</span>
              </label>
              {pick && (
                <input
                  className={styles.pickName}
                  aria-label={`This week for ${goal.title}`}
                  value={pick.title}
                  onChange={(e) => {
                    setSaved(false);
                    setPicks((p) => p.map((x) => (x.key === pick.key ? { ...x, title: e.target.value } : x)));
                  }}
                />
              )}
            </li>
          );
        })}
        {picks
          .filter((p) => !p.parentGoalId)
          .map((p) => (
            <li key={p.key} className={cx(styles.pick, styles.picked)}>
              <span className={styles.pickToggle}>
                <Icon name="flag" size={14} />
                <span className={styles.pickTitle}>{p.title}</span>
                <button type="button" className={styles.remove} aria-label={`Remove ${p.title}`} onClick={() => setPicks((all) => all.filter((x) => x.key !== p.key))}>
                  <Icon name="close" size={12} />
                </button>
              </span>
            </li>
          ))}
      </ul>
      <form
        className={styles.ownRow}
        onSubmit={(e) => {
          e.preventDefault();
          if (!own.trim() || full) return;
          setSaved(false);
          setPicks((p) => [...p, { key: `own-${Date.now()}`, parentGoalId: null, title: own.trim() }]);
          setOwn('');
        }}
      >
        <input aria-label="Your own focus item" placeholder={full ? 'Three is plenty' : 'Or add your own, e.g. “Draft essay #9”'} value={own} disabled={full} onChange={(e) => setOwn(e.target.value)} />
        <Button size="sm" type="submit" disabled={full || !own.trim()}>
          Add
        </Button>
      </form>
      <div className={styles.planActions}>
        <span className={styles.quiet} role="status">
          {saved ? 'Saved. These show on Today next week.' : ''}
        </span>
        <Button
          variant="primary"
          disabled={!picks.length}
          onClick={async () => {
            await setWeekFocus(review, picks);
            setSaved(true);
          }}
        >
          Set focus for week {nextWeek}
        </Button>
      </div>
    </Card>
  );
}
