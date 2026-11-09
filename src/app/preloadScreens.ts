const whenIdle = (run: () => void) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(run) : window.setTimeout(run, 1500));

/** Long enough for the first screen to finish drawing and respond to touch. */
const START_AFTER_MS = 4000;

/**
 * Loads the screens that arrive separately once the first one has settled.
 * A crossfade waits for its new screen, so a first visit would otherwise hang on the download.
 * Skipped when you've asked your browser to save data.
 */
export function preloadScreens() {
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
  const loaders = [
    () => import('@/screens/tasks/TasksPage'),
    () => import('@/screens/calendar/CalendarPage'),
    () => import('@/screens/settings/SettingsPage'),
    () => import('@/screens/profile/ProfilePage'),
    () => import('@/screens/finance/FinancePage'),
    () => import('@/screens/health/HealthPage'),
    () => import('@/screens/vision/VisionPage'),
    () => import('@/screens/review/ReviewsPage'),
    () => import('@/screens/review/ReviewPage'),
    () => import('@/screens/goals/GoalsPage'),
    () => import('@/screens/progress/ProgressPage'),
    () => import('@/screens/review/PeriodReviewPage'),
    () => import('@/screens/library/LibraryPage'),
  ];
  const next = () => {
    const load = loaders.shift();
    if (!load) return;
    // Failing here is fine: the screen tries again when you open it.
    void load()
      .catch(() => {})
      .finally(() => whenIdle(next));
  };
  window.setTimeout(() => whenIdle(next), START_AFTER_MS);
}
