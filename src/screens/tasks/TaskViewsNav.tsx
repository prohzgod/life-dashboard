import { NavLink, useSearchParams } from 'react-router-dom';
import { SlidingPill } from '@/components/ui';
import type { TaskView } from '@/domain/tasks';
import type { LifeArea } from '@/data';
import { cx } from '@/components/ui/cx';
import { useT } from '@/i18n';
import styles from './Tasks.module.css';

type Props = {
  counts: Record<TaskView, number>;
  active: TaskView | null;
  areaId: string | null;
  tagId: string | null;
  areas: LifeArea[];
  tags: Array<{ id: string; name: string; count: number }>;
};

export function TaskViewsNav({ counts, active, areaId, tagId, areas, tags }: Props) {
  const t = useT().tasks;
  const [params] = useSearchParams();
  // Keep the open task when switching lists, so the drawer stays put.
  const task = params.get('task');
  const withTask = (query: string) => (task ? `${query}${query.includes('?') ? '&' : '?'}task=${task}` : query);

  return (
    <aside className={styles.nav} aria-label={t.nav.label}>
      <SlidingPill selector={`.${styles.navActive}`} className={styles.navPill} />
      <nav className={styles.navGroup} aria-labelledby="views-label">
        <h2 id="views-label" className={styles.navLabel}>
          {t.nav.views}
        </h2>
        {(Object.keys(t.views) as TaskView[]).map((view) => (
          <NavLink
            key={view}
            to={withTask(view === 'inbox' ? '/inbox' : `/tasks?view=${view}`)}
            aria-current={active === view ? 'page' : undefined}
            className={cx(styles.navItem, active === view && styles.navActive)}
          >
            <span className={styles.grow}>{t.views[view]}</span>
            {view !== 'logbook' && counts[view] > 0 && (
              <span className={cx(styles.navCount, view === 'inbox' && styles.navCountInbox)}>{counts[view]}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <nav className={styles.navGroup} aria-labelledby="areas-label">
        <h2 id="areas-label" className={styles.navLabel}>
          {t.nav.areas}
        </h2>
        {areas.map((area) => (
          <NavLink
            key={area.id}
            to={withTask(`/tasks?area=${area.id}`)}
            aria-current={areaId === area.id ? 'page' : undefined}
            className={cx(styles.navItem, styles.navArea, areaId === area.id && styles.navActive)}
          >
            <span className={styles.areaDot} style={{ background: `var(--${area.color})` }} aria-hidden="true" />
            {area.name}
          </NavLink>
        ))}
      </nav>

      {tags.length > 0 && (
        <nav className={styles.navGroup} aria-labelledby="tags-label">
          <h2 id="tags-label" className={styles.navLabel}>
            {t.nav.tags}
          </h2>
          <div className={styles.tagCloud}>
            {tags.map((tag) => (
              <NavLink
                key={tag.id}
                to={withTask(`/tasks?tag=${tag.id}`)}
                aria-current={tagId === tag.id ? 'page' : undefined}
                className={cx(styles.tag, tagId === tag.id && styles.tagActive)}
              >
                #{tag.name}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </aside>
  );
}
