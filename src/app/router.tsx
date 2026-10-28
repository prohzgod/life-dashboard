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
import { HomeRoute } from '@/screens/home/HomeRoute';
import { EditHomePage } from '@/screens/home/EditHomePage';
import { ProfilePage } from '@/screens/profile/ProfilePage';
import { EditProfilePage } from '@/screens/profile/EditProfilePage';
import { TaskRedirect } from '@/screens/tasks/TaskRedirect';
import { CalendarPage } from '@/screens/calendar/CalendarPage';
import { VisionPage } from '@/screens/vision/VisionPage';
import { FinancePage } from '@/screens/finance/FinancePage';

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: 'today', element: <TodayPage /> },
      { path: 'home/edit', element: <EditHomePage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'profile/edit', element: <EditProfilePage /> },
      { path: 'inbox', element: <TasksPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'tasks/:id', element: <TaskRedirect /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'goals', element: <LazyGoalsPage /> },
      { path: 'goals/:id', element: <LazyGoalsPage /> },
      { path: 'progress', element: <LazyProgressPage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'library', element: <LazyLibraryPage mode="home" /> },
      { path: 'library/trash', element: <LazyLibraryPage mode="trash" /> },
      { path: 'library/photos', element: <LazyLibraryPage mode="photos" /> },
      { path: 'library/day/:day', element: <LazyLibraryPage mode="day" /> },
      { path: 'library/:nodeId', element: <LazyLibraryPage mode="node" /> },
      { path: 'vision', element: <VisionPage /> },
      { path: 'finance', element: <FinancePage /> },
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
