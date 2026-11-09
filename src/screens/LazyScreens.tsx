import { lazy, Suspense, type ComponentType } from 'react';

/** A screen that downloads on first visit (and is precached for offline), so the first load stays small. */
function lazyScreen<Name extends string>(load: () => Promise<Record<Name, ComponentType>>, name: Name) {
  const Screen = lazy(() => load().then((m): { default: ComponentType } => ({ default: m[name] })));
  return function LazyScreen() {
    return (
      <Suspense fallback={null}>
        <Screen />
      </Suspense>
    );
  };
}

// Goals, Progress and the longer reviews draw charts with ECharts.
export const LazyGoalsPage = lazyScreen(() => import('./goals/GoalsPage'), 'GoalsPage');
export const LazyProgressPage = lazyScreen(() => import('./progress/ProgressPage'), 'ProgressPage');
export const LazyPeriodReviewPage = lazyScreen(() => import('./review/PeriodReviewPage'), 'PeriodReviewPage');
export const LazyTasksPage = lazyScreen(() => import('./tasks/TasksPage'), 'TasksPage');
export const LazyCalendarPage = lazyScreen(() => import('./calendar/CalendarPage'), 'CalendarPage');
export const LazyVisionPage = lazyScreen(() => import('./vision/VisionPage'), 'VisionPage');
export const LazyFinancePage = lazyScreen(() => import('./finance/FinancePage'), 'FinancePage');
export const LazyHealthPage = lazyScreen(() => import('./health/HealthPage'), 'HealthPage');
export const LazySettingsPage = lazyScreen(() => import('./settings/SettingsPage'), 'SettingsPage');
export const LazyReviewPage = lazyScreen(() => import('./review/ReviewPage'), 'ReviewPage');
export const LazyReviewsPage = lazyScreen(() => import('./review/ReviewsPage'), 'ReviewsPage');
export const LazyProfilePage = lazyScreen(() => import('./profile/ProfilePage'), 'ProfilePage');
export const LazyEditProfilePage = lazyScreen(() => import('./profile/EditProfilePage'), 'EditProfilePage');
export const LazyEditHomePage = lazyScreen(() => import('./home/EditHomePage'), 'EditHomePage');
export const LazyDevComponentsPage = lazyScreen(() => import('./dev/DevComponentsPage'), 'DevComponentsPage');
