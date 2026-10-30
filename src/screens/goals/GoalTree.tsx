import { useState } from 'react';
import type { GoalView, LifeArea } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { cx } from '@/components/ui/cx';
import { goalNow, goalStatusLine, goalTypeChip } from '@/lib/goalText';
import { useT } from '@/i18n';
import styles from './Goals.module.css';

type Props = {
  views: GoalView[];
  areas: LifeArea[];
  areaId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  footer: string;
};

const HORIZON_ORDER = ['year', 'quarter', 'month', 'week'];

export function GoalTree({ views, areas, areaId, selectedId, onSelect, footer }: Props) {
  const t = useT().goals.tree;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const byId = new Map(views.map((v) => [v.goal.id, v]));
  const shown = views.filter((v) => !areaId || v.goal.areaId === areaId);
  const childrenOf = (id: string | null) =>
    shown
      .filter((v) => (id === null ? !v.goal.parentGoalId || !byId.has(v.goal.parentGoalId) || !shown.includes(byId.get(v.goal.parentGoalId)!) : v.goal.parentGoalId === id))
      .sort((a, b) => HORIZON_ORDER.indexOf(a.goal.horizon) - HORIZON_ORDER.indexOf(b.goal.horizon) || a.goal.endDate.localeCompare(b.goal.endDate));

  const rows: Array<{ view: GoalView; depth: number; hasChildren: boolean }> = [];
  const walk = (parent: string | null, depth: number) => {
    for (const view of childrenOf(parent)) {
      const kids = childrenOf(view.goal.id);
      rows.push({ view, depth, hasChildren: kids.length > 0 });
      if (!collapsed.has(view.goal.id)) walk(view.goal.id, depth + 1);
    }
  };
  walk(null, 0);

  const toggle = (id: string) => setCollapsed((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])));

  return (
    <section className={styles.tree} aria-label={t.label}>
      <div className={cx(styles.treeRow, styles.treeHead)} aria-hidden="true">
        <span />
        <span>{t.goal}</span>
        <span>{t.progress}</span>
        <span className={styles.right}>{t.now}</span>
      </div>
      {rows.length === 0 && <p className={styles.quiet}>{areaId ? t.emptyArea : t.empty}</p>}
      <ul className={styles.plainList}>
        {rows.map(({ view, depth, hasChildren }) => {
          const { goal, progress, pace } = view;
          const area = areas.find((a) => a.id === goal.areaId);
          const status = goalStatusLine(goal, progress, pace);
          const top = depth === 0;
          const percent = progress.percent ?? 0;
          return (
            <li
              key={goal.id}
              className={cx(styles.treeRow, top && styles.topRow, goal.id === selectedId && styles.selectedRow)}
              style={{ paddingLeft: 12 + depth * 24 }}
            >
              {hasChildren ? (
                <button type="button" className={styles.chevron} aria-expanded={!collapsed.has(goal.id)} aria-label={t.toggle(collapsed.has(goal.id), goal.title)} onClick={() => toggle(goal.id)}>
                  <Icon name={collapsed.has(goal.id) ? 'chevronRight' : 'chevronDown'} size={14} strokeWidth={2} />
                </button>
              ) : (
                <span />
              )}
              <div className={styles.goalText}>
                <div className={styles.goalTitleRow}>
                  {top && area && <span className={styles.dot} style={{ background: `var(--${area.color})` }} aria-hidden="true" />}
                  <button type="button" className={cx(styles.goalTitle, !top && styles.childTitle)} onClick={() => onSelect(goal.id)} aria-current={goal.id === selectedId ? 'true' : undefined}>
                    {goal.title}
                  </button>
                  <span className={styles.typeChip}>{goalTypeChip(goal)}</span>
                </div>
                <span className={cx(styles.status, styles[status.tone])}>{status.text}</span>
              </div>
              <div
                className={cx(styles.bar, top && styles.barTop)}
                role="progressbar"
                aria-label={t.progressOf(goal.title)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percent)}
                aria-valuetext={`${Math.round(percent)}%${pace.expected !== null && pace.state !== 'upcoming' ? t.expected(Math.round(pace.expected)) : ''}`}
              >
                <div className={styles.fill} style={{ width: `${percent}%`, background: area ? `var(--${area.color})` : undefined }} />
                {pace.expected !== null && (pace.state === 'on-pace' || pace.state === 'behind') && <div className={styles.tick} style={{ left: `${pace.expected}%` }} />}
              </div>
              <span className={cx(styles.now, top && styles.nowTop)}>{goalNow(goal, progress)}</span>
            </li>
          );
        })}
      </ul>
      <div className={styles.treeFoot}>
        <span>{t.tick}</span>
        <span>{footer}</span>
      </div>
    </section>
  );
}
