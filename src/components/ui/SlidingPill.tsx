import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

type SlidingPillProps = {
  /** Finds the active item among the parent's descendants. The parent must be positioned. */
  selector: string;
  className?: string;
  /** `li` when the parent is a list. */
  as?: 'span' | 'li';
};

/**
 * The highlight behind the active item of a nav or switch. It slides from one item to the next and
 * fits each item's width. Layout offsets are used rather than getBoundingClientRect, so an item
 * shrinking under a press doesn't throw it off.
 */
export function SlidingPill({ selector, className, as = 'span' }: SlidingPillProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const liRef = useRef<HTMLLIElement>(null);
  const placed = useRef(false);

  const place = useCallback(() => {
    const pill = spanRef.current ?? liRef.current;
    const parent = pill?.parentElement;
    if (!pill || !parent) return;
    const on = parent.querySelector<HTMLElement>(selector);
    if (!on || !on.offsetWidth) {
      pill.style.opacity = '0';
      placed.current = false;
      return;
    }
    let x = 0;
    let y = 0;
    for (let el: HTMLElement | null = on; el && el !== parent; el = el.offsetParent as HTMLElement | null) {
      x += el.offsetLeft;
      y += el.offsetTop;
    }
    // Appearing (first paint, or back from a screen with nothing active) is not a move.
    if (!placed.current) pill.style.transition = 'none';
    pill.style.opacity = '1';
    pill.style.width = `${on.offsetWidth}px`;
    pill.style.height = `${on.offsetHeight}px`;
    pill.style.transform = `translate(${x}px, ${y}px)`;
    if (!placed.current) {
      void pill.offsetWidth;
      pill.style.transition = '';
      placed.current = true;
    }
  }, [selector]);

  // After every render of the owner: what's active, a badge or a label may all have changed.
  useLayoutEffect(place);

  useEffect(() => {
    const parent = (spanRef.current ?? liRef.current)?.parentElement;
    window.addEventListener('resize', place);
    void document.fonts?.ready.then(place);
    const observer = typeof ResizeObserver === 'undefined' || !parent ? null : new ResizeObserver(place);
    if (parent) observer?.observe(parent);
    return () => {
      window.removeEventListener('resize', place);
      observer?.disconnect();
    };
  }, [place]);

  return as === 'li' ? <li ref={liRef} className={className} aria-hidden="true" role="presentation" /> : <span ref={spanRef} className={className} aria-hidden="true" />;
}
