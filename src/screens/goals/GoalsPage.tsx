import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadGoalBoard } from '@/data';
import { year } from '@/domain/days';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { PageHeader } from '@/components/shell/PageHeader';
import { useToday } from '@/lib/useToday';
import { GoalDetail } from './GoalDetail';
import { GoalForm } from './GoalForm';
import { GoalTree } from './GoalTree';
import { VisionCard } from './VisionCard';
import { useIsMobile } from '@/lib/useMediaQuery';
import { MobileGoals } from './MobileGoals';
import { useT } from '@/i18n';
import styles from './Goals.module.css';

export function GoalsPage() {
  const { goals: t, screens } = useT();
  const today = useToday();
  const { id } = useParams();
  const navigate = useNavigate();
  const [areaId, setAreaId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const board = useLiveQuery(() => loadGoalBoard(today), [today]);

  const live = board?.views.filter((v) => v.goal.status === 'active' || v.goal.status === 'paused') ?? [];
  const selectedId = id ?? live.find((v) => !v.goal.parentGoalId)?.goal.id ?? null;
  const selected = board?.views.find((v) => v.goal.id === selectedId) ?? null;
  const thisYear = board?.views.filter((v) => year(v.goal.endDate) === year(today)) ?? [];
  const isMobile = useIsMobile();
  const form = (
    <GoalForm open={creating} onClose={() => setCreating(false)} today={today} goals={board?.views.map((v) => v.goal) ?? []} areas={board?.areas ?? []} onCreated={(goalId) => navigate(`/goals/${goalId}`)} />
  );

  if (isMobile) {
    if (!board) return null;
    const chosen = id ? board.views.find((v) => v.goal.id === id) : null;
    return (
      <>
        {chosen ? <GoalDetail key={chosen.goal.id} view={chosen} board={board} today={today} /> : <MobileGoals board={board} today={today} onCreate={() => setCreating(true)} />}
        {form}
      </>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <PageHeader
          title={screens.goals.title}
          subtitle={t.page.subtitle}
          actions={
            <Button variant="primary" icon={<Icon name="plus" size={16} strokeWidth={2.2} />} onClick={() => setCreating(true)}>
              {t.page.newGoal}
            </Button>
          }
        />
        <div className={styles.filters} role="group" aria-label={t.page.filter}>
          <button type="button" aria-pressed={areaId === null} className={cx(styles.filter, areaId === null && styles.filterOn)} onClick={() => setAreaId(null)}>
            {t.page.allAreas}
          </button>
          {board?.areas.map((a) => (
            <button key={a.id} type="button" aria-pressed={areaId === a.id} className={cx(styles.filter, areaId === a.id && styles.filterOn)} onClick={() => setAreaId(areaId === a.id ? null : a.id)}>
              <span className={styles.dot} style={{ background: `var(--${a.color})` }} aria-hidden="true" />
              {a.name}
            </button>
          ))}
        </div>
        <VisionCard today={today} vision={board?.vision ?? null} />
        {board && (
          <GoalTree
            views={live}
            areas={board.areas}
            areaId={areaId}
            selectedId={selectedId}
            onSelect={(goalId) => navigate(`/goals/${goalId}`)}
            footer={t.page.yearFooter(thisYear.filter((v) => v.goal.status === 'done').length, thisYear.filter((v) => v.goal.status === 'dropped').length)}
          />
        )}
      </div>
      {board && (selected ? <GoalDetail key={selected.goal.id} view={selected} board={board} today={today} /> : <EmptyDetail onCreate={() => setCreating(true)} />)}
      {form}
    </div>
  );
}

function EmptyDetail({ onCreate }: { onCreate: () => void }) {
  const t = useT().goals.page;
  return (
    <aside className={styles.detail} aria-label={t.details}>
      <p className={styles.quiet}>{t.pick}</p>
      <Button onClick={onCreate}>{t.setGoal}</Button>
    </aside>
  );
}
