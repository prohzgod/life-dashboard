import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import type { Day } from '@/domain/days';
import { metricProgress } from '@/domain/progress';
import { areasRepo, goalsRepo, listFocusGoals } from '@/data';
import { Card, PaceBar } from '@/components/ui';
import { useT } from '@/i18n';
import { readPace } from '@/lib/paceText';
import styles from './Today.module.css';

export function FocusCard({ today }: { today: Day }) {
  const t = useT().today.focus;
  const data = useLiveQuery(async () => {
    const [focus, areas, allGoals] = await Promise.all([listFocusGoals(today), areasRepo.list(), goalsRepo.list()]);
    return { ...focus, areas, allGoals };
  }, [today]);

  return (
    <Card
      title={t.title}
      className={styles.card}
      action={
        <Link to="/goals" className={styles.cardLink}>
          {t.goals}
        </Link>
      }
    >
      {data && data.goals.length === 0 && <p className={styles.quietEmpty}>{t.empty}</p>}
      {data?.goals.map((goal) => {
        const progress = metricProgress(goal) ?? 0;
        const pace = readPace(progress, goal.startDate, goal.endDate, today);
        const area = data.areas.find((a) => a.id === goal.areaId);
        const parent = data.allGoals.find((g) => g.id === goal.parentGoalId);
        const value =
          goal.currentValue !== null && goal.targetValue !== null
            ? `${goal.currentValue} / ${goal.targetValue}${goal.unit ? ` ${goal.unit}` : ''}`
            : undefined;
        return (
          <PaceBar
            key={goal.id}
            label={goal.title}
            progress={progress}
            expected={pace.expected}
            area={area?.color}
            valueText={value}
            statusText={parent ? `${parent.title}, ${pace.sentence.toLowerCase()}` : pace.sentence}
          />
        );
      })}
      {data && data.goals.length > 0 && !data.fromReview && (
        <p className={styles.focusHint}>{t.hint}</p>
      )}
    </Card>
  );
}
