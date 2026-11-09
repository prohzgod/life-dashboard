import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { canAnimate } from '@/lib/motion';
import { changesView } from './routeMotion';
import { LazyLibraryPage } from '@/screens/library/LazyLibraryPage';
import {
  LazyCalendarPage,
  LazyDevComponentsPage,
  LazyEditHomePage,
  LazyEditProfilePage,
  LazyFinancePage,
  LazyGoalsPage,
  LazyHealthPage,
  LazyPeriodReviewPage,
  LazyProfilePage,
  LazyProgressPage,
  LazyReviewPage,
  LazyReviewsPage,
  LazySettingsPage,
  LazyTasksPage,
  LazyVisionPage,
} from '@/screens/LazyScreens';
import { NotFoundPage } from '@/screens/NotFoundPage';
import { ScreenPage } from '@/screens/ScreenPage';
import { TodayPage } from '@/screens/today/TodayPage';
import { HomeRoute } from '@/screens/home/HomeRoute';
import { MenuPage } from '@/screens/menu/MenuPage';
import { TaskRedirect } from '@/screens/tasks/TaskRedirect';

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: 'today', element: <TodayPage /> },
      { path: 'menu', element: <MenuPage /> },
      { path: 'home/edit', element: <LazyEditHomePage /> },
      { path: 'profile', element: <LazyProfilePage /> },
      { path: 'profile/edit', element: <LazyEditProfilePage /> },
      { path: 'inbox', element: <LazyTasksPage /> },
      { path: 'tasks', element: <LazyTasksPage /> },
      { path: 'tasks/:id', element: <TaskRedirect /> },
      { path: 'calendar', element: <LazyCalendarPage /> },
      { path: 'goals', element: <LazyGoalsPage /> },
      { path: 'goals/:id', element: <LazyGoalsPage /> },
      { path: 'progress', element: <LazyProgressPage /> },
      { path: 'review', element: <LazyReviewPage /> },
      { path: 'review/:period', element: <LazyPeriodReviewPage /> },
      { path: 'reviews', element: <LazyReviewsPage /> },
      { path: 'library', element: <LazyLibraryPage mode="home" /> },
      { path: 'library/trash', element: <LazyLibraryPage mode="trash" /> },
      { path: 'library/photos', element: <LazyLibraryPage mode="photos" /> },
      { path: 'library/day/:day', element: <LazyLibraryPage mode="day" /> },
      { path: 'library/:nodeId', element: <LazyLibraryPage mode="node" /> },
      { path: 'vision', element: <LazyVisionPage /> },
      { path: 'finance', element: <LazyFinancePage /> },
      { path: 'health', element: <LazyHealthPage /> },
      { path: 'assistant', element: <ScreenPage screen="assistant" /> },
      { path: 'settings', element: <Navigate to="/settings/privacy" replace /> },
      { path: 'settings/:tab', element: <LazySettingsPage /> },
      { path: 'dev/components', element: <LazyDevComponentsPage /> },
      { path: 'kit', element: <LazyDevComponentsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);

// Every change of view is one crossfade of the window, however it was asked for (a link, a tab, code).
const navigate = router.navigate.bind(router) as (to: unknown, options?: object) => Promise<void>;
router.navigate = ((to: unknown, options?: object) =>
  navigate(to, typeof to !== 'number' && to !== null && canAnimate() && changesView(window.location.href, to as string) ? { ...options, viewTransition: true } : options)) as typeof router.navigate;
