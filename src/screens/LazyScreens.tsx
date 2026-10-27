import { lazy, Suspense } from 'react';

// Goals and Progress draw charts with ECharts, so they load on first visit (and are precached for offline).
const GoalsPage = lazy(() => import('./goals/GoalsPage').then((m) => ({ default: m.GoalsPage })));
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
