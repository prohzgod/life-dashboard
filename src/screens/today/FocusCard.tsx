import { useLiveQuery } from 'dexie-react-hooks';
import type { Day } from '@/domain/days';
import { metricProgress } from '@/domain/progress';
import { goalsRepo, listFocusGoals } from '@/data';
import { AnimatedNumber, ArrowLink, Card, HatchBar, WarnNote } from '@/components/ui';
import { useT } from '@/i18n';
import { readPace } from '@/lib/paceText';
import styles from './Today.module.css';

const round = (n: number) => Math.round(n * 10) / 10;

/** This week's focus: the first goal set large, with where you should be by now. */
export function FocusCard({ today, className }: { today: Day; className?: string }) {
  const t = useT().today.focus;
  const data = useLiveQuery(async () => {
    const [focus, allGoals] = await Promise.all([listFocusGoals(today), goalsRepo.list()]);
    return { ...focus, allGoals };
  }, [today]);

  return (
    <Card title={t.title} className={className} action={<ArrowLink to="/goals" label={t.open} />}>
      {data && data.goals.length === 0 && <p className={styles.quietEmpty}>{t.empty}</p>}
      {data?.goals.map((goal, i) => {
        const progress = metricProgress(goal) ?? 0;
        const pace = readPace(progress, goal.startDate, goal.endDate, today);
        const parent = data.allGoals.find((g) => g.id === goal.parentGoalId);
        const metric = goal.currentValue !== null && goal.targetValue !== null && goal.startValue !== null;
        const unit = goal.unit ? ` ${goal.unit}` : '';
        const behind = pace.status !== 'on-pace';
        return (
          <div key={goal.id} className={i === 0 ? styles.focusGoal : styles.focusGoalSmall}>
            <p className={styles.focusTitle}>{goal.title}</p>
            {i === 0 && (
              <div className={styles.focusFigure}>
                <AnimatedNumber value={metric ? goal.currentValue! : Math.round(progress)} className={styles.numeralL} />
                <span className={styles.focusOf}>{metric ? `/ ${goal.targetValue}${unit}` : '%'}</span>
                {metric && <span className={styles.focusPlanned}>{t.planned(`${round(goal.startValue! + (pace.expected / 100) * (goal.targetValue! - goal.startValue!))}${unit}`)}</span>}
              </div>
            )}
            <HatchBar value={progress / 100} planned={pace.expected / 100} label={goal.title} valueText={`${Math.round(progress)}%`} />
            {behind ? (
              <WarnNote>{parent ? `${parent.title}: ${pace.sentence.toLowerCase()}` : pace.sentence}</WarnNote>
            ) : (
              i === 0 && <p className={styles.focusOk}>{pace.sentence}</p>
            )}
          </div>
        );
      })}
      {data && data.goals.length > 0 && !data.fromReview && <p className={styles.focusHint}>{t.hint}</p>}
    </Card>
  );
}
