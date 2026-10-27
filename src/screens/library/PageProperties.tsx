import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { areasRepo, goalsRepo, setNodeProperties, setNodeTags, tagsForNode, type LibraryNode } from '@/data';
import styles from './Library.module.css';

/** Area, goal and tags for a page, as chips you can change in place. */
export function PageProperties({ node }: { node: LibraryNode }) {
  const data = useLiveQuery(async () => {
    const [areas, goals, tags] = await Promise.all([areasRepo.listOrdered(), goalsRepo.list((g) => g.status !== 'dropped'), tagsForNode(node.id)]);
    return { areas, goals, tags };
  }, [node.id]);
  if (!data) return <div className={styles.props} />;
  const area = data.areas.find((a) => a.id === node.areaId);

  return (
    <div className={styles.props}>
      <label
        className={styles.propChip}
        style={area ? { background: `var(--${area.color}-soft)`, color: `var(--${area.color}-ink)`, fontWeight: 600 } : undefined}
      >
        <span className={styles.propLabel}>Area:</span>
        <select aria-label="Area" value={node.areaId ?? ''} onChange={(e) => void setNodeProperties(node.id, { areaId: e.target.value || null })}>
          <option value="">None</option>
          {data.areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.propChip}>
        <span className={styles.propLabel}>Goal:</span>
        <select aria-label="Goal" value={node.goalId ?? ''} onChange={(e) => void setNodeProperties(node.id, { goalId: e.target.value || null })}>
          <option value="">None</option>
          {data.goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </label>
      <TagsChip key={data.tags.map((t) => t.name).join(' ')} names={data.tags.map((t) => t.name)} onSave={(names) => void setNodeTags(node.id, names)} />
      <span className={styles.propChip}>Personal space</span>
    </div>
  );
}

function TagsChip({ names, onSave }: { names: string[]; onSave: (names: string[]) => void }) {
  const [value, setValue] = useState(names.map((n) => `#${n}`).join(' '));
  return (
    <label className={styles.propChip}>
      <input
        aria-label="Tags"
        placeholder="#add tags"
        value={value}
        size={Math.max(9, value.length)}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onSave(value.split(/[\s,]+/).filter(Boolean))}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </label>
  );
}
