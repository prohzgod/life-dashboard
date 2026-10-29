import { lazy, Suspense } from 'react';

// Goals and Progress draw charts with ECharts, so they load on first visit (and are precached for offline).
const GoalsPage = lazy(() => import('./goals/GoalsPage').then((m) => ({ default: m.GoalsPage })));
// The longer reviews show the wheel of life chart.
const PeriodReviewPage = lazy(() => import('./review/PeriodReviewPage').then((m) => ({ default: m.PeriodReviewPage })));
const ProgressPage = lazy(() => import('./progress/ProgressPage').then((m) => ({ default: m.ProgressPage })));

export function LazyGoalsPage() {
  return (
    <Suspense fallback={null}>
      <GoalsPage />
    </Suspense>
  );
}

export function LazyProgressPage() {
  return (
    <Suspense fallback={null}>
      <ProgressPage />
    </Suspense>
  );
}

export function LazyPeriodReviewPage() {
  return (
    <Suspense fallback={null}>
      <PeriodReviewPage />
    </Suspense>
  );
}
