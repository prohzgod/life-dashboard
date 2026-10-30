import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import type { WidgetKind } from '@/domain/home';
import { goalsRepo, habitsRepo, listLibraryNodes, pinToHome, setWidgetHidden, unpinFromHome, type HomeData, type LinkTarget } from '@/data';
import { Icon, type IconName } from '@/components/icons/Icon';
import { Segmented, Sheet } from '@/components/ui';
import { useT } from '@/i18n';
import styles from './EditHome.module.css';

const ICONS: Record<Exclude<WidgetKind, 'pinned'>, IconName> = {
  today: 'today',
  goals: 'goals',
  calendar: 'calendar',
  review: 'review',
  progress: 'progress',
  sleep: 'moon',
  finance: 'finance',
  vision: 'vision',
  assistant: 'assistant',
  steps: 'health',
};

const TABS = ['widgets', 'library', 'goals'] as const;

/** Bring hidden widgets back, or pin a page, goal or habit. */
export function AddToHomeSheet({ open, onClose, data }: { open: boolean; onClose: () => void; data: HomeData }) {
  const { home, goals } = useT();
  const t = home.add;
  const [tab, setTab] = useState<(typeof TABS)[number]>('widgets');
  const hidden = data.widgets.filter((w) => w.hidden).length;
  const pinned = (type: LinkTarget, id: string) => data.widgets.some((w) => w.kind === 'pinned' && w.refType === type && w.refId === id);
  const sources = useLiveQuery(async () => {
    const [nodes, goals, habits] = await Promise.all([listLibraryNodes(), goalsRepo.list((g) => g.status === 'active' && g.horizon !== 'vision'), habitsRepo.list((h) => h.archivedAt === null)]);
    return { pages: nodes.filter((n) => n.kind === 'page' && !n.isSystem).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), goals, habits };
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title={home.edit.add} className={styles.sheet}>
      <span className={styles.sheetMeta}>{home.edit.hidden(hidden)}</span>
      <Segmented label={t.from} options={TABS.map((v) => ({ value: v, label: t.tabs[v] }))} value={tab} onChange={setTab} className={styles.tabs} />
      <ul className={styles.list}>
        {tab === 'widgets' &&
          data.widgets
            .filter((w) => w.kind !== 'pinned')
            .map((w) => {
              const kind = w.kind as Exclude<WidgetKind, 'pinned'>;
              return (
                <Row
                  key={w.id}
                  icon={ICONS[kind]}
                  title={home.widgets[kind].title}
                  sub={w.hidden ? t.hiddenDescription(home.widgets[kind].description) : home.widgets[kind].description}
                  on={!w.hidden}
                  onAdd={() => setWidgetHidden(w.id, false)}
                />
              );
            })}
        {tab === 'library' &&
          (sources?.pages.length ? (
            sources.pages.map((p) => (
              <Row key={p.id} icon="page" title={p.title} sub={t.page} on={pinned('node', p.id)} onAdd={() => pinToHome('node', p.id)} onRemove={() => unpinFromHome('node', p.id)} />
            ))
          ) : (
            <li className={styles.empty}>{t.pagesEmpty}</li>
          ))}
        {tab === 'goals' && (
          <>
            {sources?.goals.map((g) => (
              <Row key={g.id} icon="goals" title={g.title} sub={t.goalOf(goals.horizons[g.horizon])} on={pinned('goal', g.id)} onAdd={() => pinToHome('goal', g.id)} onRemove={() => unpinFromHome('goal', g.id)} />
            ))}
            {sources?.habits.map((h) => (
              <Row key={h.id} icon="review" title={h.title} sub={t.habit} on={pinned('habit', h.id)} onAdd={() => pinToHome('habit', h.id)} onRemove={() => unpinFromHome('habit', h.id)} />
            ))}
          </>
        )}
      </ul>
    </Sheet>
  );
}

function Row({ icon, title, sub, on, onAdd, onRemove }: { icon: IconName; title: string; sub: string; on: boolean; onAdd: () => Promise<unknown>; onRemove?: () => Promise<unknown> }) {
  const t = useT().home.add;
  return (
    <li className={styles.row}>
      <span className={styles.rowIcon}>
        <Icon name={icon} size={18} />
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={styles.rowSub}>{sub}</span>
      </span>
      {on ? (
        onRemove ? (
          <button type="button" className={styles.onHome} onClick={() => void onRemove()} aria-label={t.removeFrom(title)}>
            {t.onHome}
          </button>
        ) : (
          <span className={styles.onHome}>{t.onHome}</span>
        )
      ) : (
        <button type="button" className={styles.add} aria-label={t.addTo(title)} onClick={() => void onAdd()}>
          <Icon name="plus" size={18} strokeWidth={2.2} />
        </button>
      )}
    </li>
  );
}
