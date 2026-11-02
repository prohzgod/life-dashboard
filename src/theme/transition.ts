import { flushSync } from 'react-dom';
import { canAnimate } from '@/lib/motion';

/** Runs a change of theme, background or accent as one crossfade of the whole window, nav included. */
export function withThemeTransition(change: () => void) {
  if (!canAnimate() || typeof document.startViewTransition !== 'function') {
    change();
    return;
  }
  const root = document.documentElement;
  root.dataset.wholeFade = '';
  const done = document.startViewTransition(() => flushSync(change));
  void done.finished.finally(() => delete root.dataset.wholeFade);
}
