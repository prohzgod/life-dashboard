import type { TaskView } from '@/domain/tasks';

export const VIEW_LABELS: Record<TaskView, string> = {
  inbox: 'Inbox',
  today: 'Today',
  upcoming: 'Upcoming',
  anytime: 'Anytime',
  someday: 'Someday / maybe',
  logbook: 'Logbook',
};
