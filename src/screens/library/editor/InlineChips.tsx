import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { areasRepo, getNode, goalsRepo } from '@/data';
import styles from './Editor.module.css';

/** [[Page]] link. Shows the page's current title, so renames carry through. */
export function PageLinkChip({ id, title }: { id: string; title: string }) {
  const node = useLiveQuery(() => getNode(id), [id]);
  const missing = node === undefined ? false : !node;
  return (
    <Link to={`/library/${id}`} className={missing ? `${styles.pageLink} ${styles.missing}` : styles.pageLink} contentEditable={false}>
      {node?.title ?? title}
    </Link>
  );
}

/** @Goal mention, tinted with the goal's area. */
export function GoalMentionChip({ id, title }: { id: string; title: string }) {
  const data = useLiveQuery(async () => {
    const goal = await goalsRepo.get(id);
    const area = goal?.areaId ? await areasRepo.get(goal.areaId) : undefined;
    return { goal, area };
  }, [id]);
  const area = data?.area?.color;
  return (
    <Link
      to={`/goals/${id}`}
      className={styles.goalMention}
      style={area ? { background: `var(--${area}-soft)`, color: `var(--${area}-ink)` } : undefined}
      contentEditable={false}
    >
      {data?.goal?.title ?? title}
    </Link>
  );
}
