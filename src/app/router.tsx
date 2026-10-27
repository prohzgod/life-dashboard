import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { DevComponentsPage } from '@/screens/dev/DevComponentsPage';
import { LazyLibraryPage } from '@/screens/library/LazyLibraryPage';
import { LazyGoalsPage, LazyProgressPage } from '@/screens/LazyScreens';
import { ReviewPage } from '@/screens/review/ReviewPage';
import { NotFoundPage } from '@/screens/NotFoundPage';
import { ScreenPage } from '@/screens/ScreenPage';
import { SettingsPage } from '@/screens/settings/SettingsPage';
import { TasksPage } from '@/screens/tasks/TasksPage';
import { TodayPage } from '@/screens/today/TodayPage';
import { TaskRedirect } from '@/screens/tasks/TaskRedirect';

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'inbox', element: <TasksPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'tasks/:id', element: <TaskRedirect /> },
      { path: 'calendar', element: <ScreenPage screen="calendar" /> },
      { path: 'goals', element: <LazyGoalsPage /> },
      { path: 'goals/:id', element: <LazyGoalsPage /> },
      { path: 'progress', element: <LazyProgressPage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'library', element: <LazyLibraryPage mode="home" /> },
      { path: 'library/trash', element: <LazyLibraryPage mode="trash" /> },
      { path: 'library/photos', element: <LazyLibraryPage mode="photos" /> },
      { path: 'library/day/:day', element: <LazyLibraryPage mode="day" /> },
      { path: 'library/:nodeId', element: <LazyLibraryPage mode="node" /> },
      { path: 'vision', element: <ScreenPage screen="vision" /> },
      { path: 'finance', element: <ScreenPage screen="finance" /> },
      { path: 'health', element: <ScreenPage screen="health" /> },
      { path: 'assistant', element: <ScreenPage screen="assistant" /> },
      { path: 'settings', element: <Navigate to="/settings/privacy" replace /> },
      { path: 'settings/:tab', element: <SettingsPage /> },
      { path: 'dev/components', element: <DevComponentsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
