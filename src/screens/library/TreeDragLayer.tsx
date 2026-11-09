import { useContext } from 'react';
import { createPortal } from 'react-dom';
import type { CursorProps, DragPreviewProps } from 'react-arborist';
import { Icon } from '@/components/icons/Icon';
import { TreeLookup } from './treeDnd';
import styles from './Library.module.css';

/** A glass pill under your finger with the page or folder you're moving. */
export function TreeDragPreview({ offset, id, isDragging }: DragPreviewProps) {
  const lookup = useContext(TreeLookup);
  const item = id ? lookup.get(id) : undefined;
  if (!isDragging || !offset || !item) return null;
  // On body: inside the glass card, whose blur makes it the frame for fixed elements, it would trail far from the finger.
  return createPortal(
    <div className={styles.dragLayer}>
      <div className={styles.dragPreview} style={{ transform: `translate(${offset.x + 12}px, ${offset.y - 8}px)` }}>
        <Icon name={item.kind === 'folder' ? 'folder' : item.kind === 'image' ? 'image' : 'page'} size={16} />
        <span>{item.title}</span>
      </div>
    </div>,
    document.body,
  );
}

/** Where it will land between rows: an accent line. */
export function TreeCursor({ top, left, indent }: CursorProps) {
  return <div className={styles.dropLine} style={{ top: top - 2, left, right: indent }} aria-hidden="true" />;
}
