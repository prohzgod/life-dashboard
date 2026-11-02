const whenIdle = (run: () => void) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(run) : window.setTimeout(run, 1500));

/**
 * Loads the screens that arrive separately (the editor, the charts) once the browser has a moment.
 * A crossfade waits for its new screen, so a first visit would otherwise hang on the download.
 */
export function preloadScreens() {
  const loaders = [() => import('@/screens/library/LibraryPage'), () => import('@/screens/goals/GoalsPage'), () => import('@/screens/progress/ProgressPage'), () => import('@/screens/review/PeriodReviewPage')];
  const next = () => {
    const load = loaders.shift();
    if (!load) return;
    // Failing here is fine: the screen tries again when you open it.
    void load()
      .catch(() => {})
      .finally(() => whenIdle(next));
  };
  whenIdle(next);
}
