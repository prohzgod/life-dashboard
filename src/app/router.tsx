import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { DevComponentsPage } from '@/screens/dev/DevComponentsPage';
import { NotFoundPage } from '@/screens/NotFoundPage';
import { ScreenPage } from '@/screens/ScreenPage';
import { SettingsPage } from '@/screens/settings/SettingsPage';

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <ScreenPage screen="today" /> },
      { path: 'inbox', element: <ScreenPage screen="inbox" /> },
      { path: 'tasks', element: <ScreenPage screen="tasks" /> },
      { path: 'tasks/:id', element: <ScreenPage screen="tasks" /> },
      { path: 'calendar', element: <ScreenPage screen="calendar" /> },
      { path: 'goals', element: <ScreenPage screen="goals" /> },
      { path: 'goals/:id', element: <ScreenPage screen="goals" /> },
      { path: 'progress', element: <ScreenPage screen="progress" /> },
      { path: 'review', element: <ScreenPage screen="review" /> },
      { path: 'library', element: <ScreenPage screen="library" /> },
      { path: 'library/:nodeId', element: <ScreenPage screen="library" /> },
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
