import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SIZE_SPAN, WIDGET_INFO, WIDGET_SIZES } from '@/domain/home';
import { loadHomeData, moveWidget, resetHome, setWidgetHidden, setWidgetSize, type HomeData, type HomeWidget } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { useToday } from '@/lib/useToday';
import { AddToHomeSheet } from './AddToHomeSheet';
import styles from './EditHome.module.css';

/** Edit Home: drag to reorder, S, M, L to resize, − to hide. Hidden widgets keep their data. */
export function EditHomePage() {
  const today = useToday();
  const navigate = useNavigate();
  const data = useLiveQuery(() => loadHomeData(today), [today]);
  // A dragged order shows straight away; it belongs to the data it was made from, so fresh data replaces it.
  const [pending, setPending] = useState<{ ids: string[]; base: HomeData | undefined } | null>(null);
  const [adding, setAdding] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visible = data?.widgets.filter((w) => !w.hidden) ?? [];
  const ids = pending && pending.base === data ? pending.ids : visible.map((w) => w.id);
  const byId = new Map(visible.map((w) => [w.id, w]));
  const hiddenCount = data?.widgets.filter((w) => w.hidden).length ?? 0;

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setPending({ ids: next, base: data });
    void moveWidget(String(active.id), next.indexOf(String(active.id)));
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Button variant="quiet" onClick={() => void resetHome()}>
          Reset
        </Button>
        <h1 className={styles.title}>Edit Home</h1>
        <Button variant="primary" className={styles.done} onClick={() => navigate('/')}>
          Done
        </Button>
      </header>
      <p className={styles.intro}>Drag to reorder. Tap a size to resize, or the minus to hide. Hidden widgets keep their data.</p>

      {data && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <ul className={styles.grid} aria-label="Widgets on Home">
              {ids
                .map((id) => byId.get(id))
                .filter((w): w is HomeWidget => !!w)
                .map((w) => (
                  <EditTile key={w.id} widget={w} data={data} />
                ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <button type="button" className={styles.addButton} onClick={() => setAdding(true)}>
        <Icon name="plus" size={18} />
        <span className={styles.addText}>Add to Home</span>
        <span className={styles.hiddenCount}>{hiddenCount ? `${hiddenCount} hidden` : 'pages, goals, habits'}</span>
      </button>
      {data && <AddToHomeSheet open={adding} onClose={() => setAdding(false)} data={data} />}
    </div>
  );
}

function EditTile({ widget, data }: { widget: HomeWidget; data: HomeData }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  const pin = data.pins.get(widget.id);
  const title = widget.kind === 'pinned' && pin && pin.kind !== 'missing' ? pin.title : WIDGET_INFO[widget.kind].title;
  const subtitle = widget.kind === 'pinned' ? (pin?.kind === 'goal' ? 'Goal' : pin?.kind === 'habit' ? 'Habit' : 'From Library') : WIDGET_INFO[widget.kind].description;
  const span = SIZE_SPAN[widget.size];
  const inverse = widget.kind === 'review';

  return (
    <li
      ref={setNodeRef}
      className={cx(styles.tile, styles[`size${widget.size}`], inverse && styles.inverse, isDragging && styles.dragging)}
      style={{ gridColumn: `span ${span.cols}`, gridRow: `span ${span.rows}`, transform: CSS.Transform.toString(transform), transition }}
    >
      <button type="button" className={styles.remove} aria-label={`Hide ${title}`} onClick={() => void setWidgetHidden(widget.id, true)}>
        <Icon name="minus" size={14} strokeWidth={2.6} />
      </button>
      <span className={styles.text}>
        <span className={styles.tileTitle}>
          {widget.kind === 'pinned' && <Icon name="pin" size={13} />}
          {title}
        </span>
        {widget.size !== 'S' && <span className={styles.tileSub}>{subtitle}</span>}
      </span>
      <span className={styles.controls}>
        <span className={styles.sizes} role="radiogroup" aria-label={`${title} size`}>
          {WIDGET_SIZES[widget.kind].map((size) => (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={widget.size === size}
              aria-label={`${{ S: 'Small', M: 'Medium', L: 'Large' }[size]}`}
              className={cx(styles.size, widget.size === size && styles.sizeOn)}
              onClick={() => void setWidgetSize(widget.id, size)}
            >
              {size}
            </button>
          ))}
        </span>
        <button type="button" ref={setActivatorNodeRef} className={styles.handle} aria-label={`Move ${title}`} {...attributes} {...listeners}>
          <Icon name="grip" size={18} strokeWidth={2.6} />
        </button>
      </span>
    </li>
  );
}
