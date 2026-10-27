import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { WIDGET_INFO, type WidgetKind } from '@/domain/home';
import { goalsRepo, habitsRepo, listLibraryNodes, pinToHome, setWidgetHidden, unpinFromHome, type HomeData, type LinkTarget } from '@/data';
import { Icon, type IconName } from '@/components/icons/Icon';
import { Segmented, Sheet } from '@/components/ui';
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

const TABS = [
  { value: 'widgets', label: 'Widgets' },
  { value: 'library', label: 'From Library' },
  { value: 'goals', label: 'Goals & habits' },
] as const;

/** Bring hidden widgets back, or pin a page, goal or habit. */
export function AddToHomeSheet({ open, onClose, data }: { open: boolean; onClose: () => void; data: HomeData }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('widgets');
  const hidden = data.widgets.filter((w) => w.hidden).length;
  const pinned = (type: LinkTarget, id: string) => data.widgets.some((w) => w.kind === 'pinned' && w.refType === type && w.refId === id);
  const sources = useLiveQuery(async () => {
    const [nodes, goals, habits] = await Promise.all([listLibraryNodes(), goalsRepo.list((g) => g.status === 'active' && g.horizon !== 'vision'), habitsRepo.list((h) => h.archivedAt === null)]);
    return { pages: nodes.filter((n) => n.kind === 'page' && !n.isSystem).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), goals, habits };
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="Add to Home" className={styles.sheet}>
      <span className={styles.sheetMeta}>{hidden} hidden</span>
      <Segmented label="Add from" options={TABS} value={tab} onChange={setTab} className={styles.tabs} />
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
                  title={WIDGET_INFO[kind].title}
                  sub={w.hidden ? `Hidden · ${WIDGET_INFO[kind].description.toLowerCase()}` : WIDGET_INFO[kind].description}
                  on={!w.hidden}
                  onAdd={() => setWidgetHidden(w.id, false)}
                />
              );
            })}
        {tab === 'library' &&
          (sources?.pages.length ? (
            sources.pages.map((p) => (
              <Row key={p.id} icon="page" title={p.title} sub="Page" on={pinned('node', p.id)} onAdd={() => pinToHome('node', p.id)} onRemove={() => unpinFromHome('node', p.id)} />
            ))
          ) : (
            <li className={styles.empty}>Pages you write in the Library can be pinned here.</li>
          ))}
        {tab === 'goals' && (
          <>
            {sources?.goals.map((g) => (
              <Row key={g.id} icon="goals" title={g.title} sub={`${g.horizon[0]!.toUpperCase()}${g.horizon.slice(1)} goal`} on={pinned('goal', g.id)} onAdd={() => pinToHome('goal', g.id)} onRemove={() => unpinFromHome('goal', g.id)} />
            ))}
            {sources?.habits.map((h) => (
              <Row key={h.id} icon="review" title={h.title} sub="Habit" on={pinned('habit', h.id)} onAdd={() => pinToHome('habit', h.id)} onRemove={() => unpinFromHome('habit', h.id)} />
            ))}
          </>
        )}
      </ul>
    </Sheet>
  );
}

function Row({ icon, title, sub, on, onAdd, onRemove }: { icon: IconName; title: string; sub: string; on: boolean; onAdd: () => Promise<unknown>; onRemove?: () => Promise<unknown> }) {
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
          <button type="button" className={styles.onHome} onClick={() => void onRemove()} aria-label={`Remove ${title} from Home`}>
            On Home
          </button>
        ) : (
          <span className={styles.onHome}>On Home</span>
        )
      ) : (
        <button type="button" className={styles.add} aria-label={`Add ${title} to Home`} onClick={() => void onAdd()}>
          <Icon name="plus" size={18} strokeWidth={2.2} />
        </button>
      )}
    </li>
  );
}
