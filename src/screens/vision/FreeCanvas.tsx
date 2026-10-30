import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { CANVAS, canvasHeight, clampRect, packCanvas, type CanvasRect } from '@/domain/vision';
import { saveCanvasLayout, setCanvasRect, type VisionCardView } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { VisionCard } from './VisionCard';
import { useT } from '@/i18n';
import styles from './Vision.module.css';

type Drag = { id: string; mode: 'move' | 'resize'; startX: number; startY: number; from: CanvasRect };

/**
 * Cards placed anywhere: drag the handle to move, the corner to resize; arrow keys do the same
 * (Shift for bigger steps). The board is 1200 px wide and scales to fit the window.
 */
export function FreeCanvas({ cards, onEdit }: { cards: VisionCardView[]; onEdit: (card: VisionCardView) => void }) {
  const t = useT().vision.canvas;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [drag, setDrag] = useState<Drag | null>(null);
  // Positions moved here win over the saved ones, so quick key presses build on each other before the save comes back.
  const [moved, setMoved] = useState<Record<string, CanvasRect>>({});

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setScale(Math.min(1, el.clientWidth / CANVAS.width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const packed = packCanvas(cards.map((c) => c.size));
  const rects = cards.map((c, i) => moved[c.id] ?? c.canvas ?? packed[i]!);
  const height = canvasHeight(rects);

  const place = (id: string, rect: CanvasRect) => setMoved((m) => ({ ...m, [id]: rect }));

  async function save(id: string, rect: CanvasRect) {
    // The first time a card moves, pin every card where it is, so the rest don't reshuffle later.
    if (cards.some((c) => !c.canvas)) await saveCanvasLayout(cards.map((c, i) => ({ id: c.id, rect: c.id === id ? rect : rects[i]! })));
    else await setCanvasRect(id, rect);
  }

  function start(event: PointerEvent, id: string, mode: Drag['mode'], from: CanvasRect) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setDrag({ id, mode, startX: event.clientX, startY: event.clientY, from });
  }

  function move(event: PointerEvent) {
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / scale;
    const dy = (event.clientY - drag.startY) / scale;
    const { from } = drag;
    const rect = drag.mode === 'move' ? { ...from, x: from.x + dx, y: from.y + dy } : { ...from, w: from.w + dx, h: from.h + dy };
    place(drag.id, clampRect(rect));
  }

  async function end() {
    if (!drag) return;
    const { id } = drag;
    setDrag(null);
    const rect = moved[id];
    if (rect) await save(id, rect);
  }

  function onKey(event: KeyboardEvent, id: string, mode: Drag['mode'], from: CanvasRect) {
    const step = event.shiftKey ? 64 : 8;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (!d) return;
    event.preventDefault();
    const [dx, dy] = d as [number, number];
    const rect = clampRect(mode === 'move' ? { ...from, x: from.x + dx, y: from.y + dy } : { ...from, w: from.w + dx, h: from.h + dy });
    place(id, rect);
    void save(id, rect);
  }

  return (
    <div ref={wrapRef} className={styles.canvasWrap} style={{ height: height * scale }}>
      <div className={styles.canvas} style={{ width: CANVAS.width, height, transform: `scale(${scale})` }} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        {cards.map((card, i) => {
          const rect = rects[i]!;
          const name = card.text || t.picture;
          return (
            <div key={card.id} className={styles.placed} style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: drag?.id === card.id ? 2 : 1 }}>
              <VisionCard card={card} onEdit={() => onEdit(card)} className={styles.placedCard} />
              <button
                type="button"
                className={styles.moveHandle}
                aria-label={t.move(name)}
                onPointerDown={(e) => start(e, card.id, 'move', rect)}
                onKeyDown={(e) => onKey(e, card.id, 'move', rect)}
              >
                <Icon name="grip" size={16} />
              </button>
              <button
                type="button"
                className={styles.resizeHandle}
                aria-label={t.resize(name)}
                onPointerDown={(e) => start(e, card.id, 'resize', rect)}
                onKeyDown={(e) => onKey(e, card.id, 'resize', rect)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
