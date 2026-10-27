import type { SuggestionMenuProps } from '@blocknote/react';
import { cx } from '@/components/ui/cx';
import styles from './Editor.module.css';

export type LinkItem = { key: string; label: string; hint: string; run: () => void };

/** The [[ and @ menus. Renders nothing when there's nothing to offer. */
export function LinkSuggestionMenu({ items, selectedIndex, onItemClick }: SuggestionMenuProps<LinkItem>) {
  if (!items.length) return null;
  return (
    <div className={styles.suggest} role="listbox" aria-label="Suggestions">
      {items.map((item, i) => (
        <button
          key={item.key}
          type="button"
          role="option"
          aria-selected={i === selectedIndex}
          className={cx(styles.suggestItem, i === selectedIndex && styles.suggestActive)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onItemClick?.(item)}
        >
          <span className={styles.suggestTitle}>{item.label}</span>
          <span className={styles.suggestHint}>{item.hint}</span>
        </button>
      ))}
    </div>
  );
}
