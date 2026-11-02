import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** False where the visitor asked for less motion, or where nothing can animate (jsdom). */
export function canAnimate(): boolean {
  if (typeof window === 'undefined' || typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** The CSS animations on the element itself (and its ::backdrop), not on anything inside it. */
function ownAnimations(element: Element | null): Animation[] {
  if (!element || typeof element.getAnimations !== 'function') return [];
  return element.getAnimations({ subtree: true }).filter((a) => (a.effect as KeyframeEffect | null)?.target === element);
}

/**
 * Keeps something on screen while its closing animation plays. `present` says whether to render it;
 * `closing` is true for that last stretch, for a `data-closing` attribute that starts the animation.
 * With no animation to wait for (reduced motion, tests) it goes at once.
 */
export function usePresence(open: boolean, ref: RefObject<Element | null>): { present: boolean; closing: boolean } {
  const [present, setPresent] = useState(open);
  if (open && !present) setPresent(true);
  const closing = present && !open;

  useEffect(() => {
    if (!closing) return;
    const running = ownAnimations(ref.current);
    if (!running.length) {
      setPresent(false);
      return;
    }
    let current = true;
    void Promise.allSettled(running.map((a) => a.finished)).then(() => {
      if (current) setPresent(false);
    });
    return () => {
      current = false;
    };
  }, [closing, ref]);

  return { present: open || present, closing };
}

/** The latest value seen while `live` was true: what an overlay keeps showing as it closes. */
export function useLastWhile<T>(live: boolean, value: T): T {
  const [kept, setKept] = useState(value);
  if (live && kept !== value) setKept(value);
  return live ? value : kept;
}

/** True once `value` has changed since mount: for effects that must not play on first paint. */
export function useHasChanged<T>(value: T): boolean {
  const [previous, setPrevious] = useState(value);
  const [changed, setChanged] = useState(false);
  if (value !== previous) {
    setPrevious(value);
    setChanged(true);
  }
  return changed;
}

/**
 * Rows of a list glide to their new place when the list reorders or a row comes or goes, instead of
 * jumping. Returns a ref for the list; each direct child is tracked by its element.
 */
export function useFlipList<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const tops = useRef(new Map<Element, number>());
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const animate = canAnimate();
    const next = new Map<Element, number>();
    for (const child of Array.from(list.children) as HTMLElement[]) {
      const top = child.offsetTop;
      next.set(child, top);
      const before = tops.current.get(child);
      if (animate && before !== undefined && before !== top) {
        child.animate([{ translate: `0 ${before - top}px` }, { translate: '0 0' }], { duration: 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
      }
    }
    tops.current = next;
  });
  return ref;
}
