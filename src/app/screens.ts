import type { IconName } from '@/components/icons/Icon';

export type ScreenKey =
  | 'today'
  | 'inbox'
  | 'tasks'
  | 'calendar'
  | 'goals'
  | 'progress'
  | 'review'
  | 'library'
  | 'vision'
  | 'finance'
  | 'health'
  | 'assistant';

export type Screen = {
  key: ScreenKey;
  /** Label in the sidebar. */
  navLabel: string;
  /** The h1 on the page. */
  title: string;
  path: string;
  icon: IconName;
  /** Optional badge in the sidebar, e.g. the weekly review day. */
  badge?: string;
  /** Other paths that light this item up in the sidebar, e.g. a review in progress. */
  activeFor?: string;
  /** Show a live count of open work next to it. */
  countKey?: 'today' | 'inbox';
  empty: { heading: string; body: string };
};

export type NavGroup = { label: string; hint?: string; screens: Screen[] };

const screen = (s: Screen) => s;

export const screens = {
  today: screen({
    key: 'today',
    navLabel: 'Today',
    title: 'Today',
    path: '/',
    icon: 'today',
    countKey: 'today',
    empty: {
      heading: 'Your day will gather here',
      body: 'Tasks for today, your habits, a short check-in and this week’s focus, all on one page.',
    },
  }),
  inbox: screen({
    key: 'inbox',
    navLabel: 'Inbox',
    title: 'Inbox',
    path: '/inbox',
    icon: 'inbox',
    countKey: 'inbox',
    empty: {
      heading: 'Nothing waiting',
      body: 'Anything you capture lands here first. Sort it when you have a minute.',
    },
  }),
  tasks: screen({
    key: 'tasks',
    navLabel: 'Tasks',
    title: 'Tasks',
    path: '/tasks',
    icon: 'tasks',
    empty: {
      heading: 'No tasks yet',
      body: 'Tasks can stand alone or move a goal forward. Upcoming, Anytime and Someday views will live here.',
    },
  }),
  calendar: screen({
    key: 'calendar',
    navLabel: 'Calendar',
    title: 'Calendar',
    path: '/calendar',
    icon: 'calendar',
    empty: {
      heading: 'Your week at a glance',
      body: 'Events from your calendars and time blocks for your tasks will show on a week grid.',
    },
  }),
  goals: screen({
    key: 'goals',
    navLabel: 'Goals',
    title: 'Goals',
    path: '/goals',
    icon: 'goals',
    empty: {
      heading: 'Start with what matters this year',
      body: 'Break a year goal into quarters and weeks, and see where you should be today.',
    },
  }),
  progress: screen({
    key: 'progress',
    navLabel: 'Progress',
    title: 'Progress',
    path: '/progress',
    icon: 'progress',
    empty: {
      heading: 'Patterns take a few days',
      body: 'Once you check in and tick off habits, your year in pixels and habit heatmap fill in here.',
    },
  }),
  review: screen({
    key: 'review',
    navLabel: 'Reviews',
    title: 'Reviews',
    path: '/reviews',
    activeFor: '/review',
    icon: 'review',
    badge: 'Sun',
    empty: {
      heading: 'Your first review is on Sunday',
      body: 'Five calm steps: get clear, get current, reflect, plan next week, done.',
    },
  }),
  library: screen({
    key: 'library',
    navLabel: 'Library & journal',
    title: 'Library & journal',
    path: '/library',
    icon: 'library',
    empty: {
      heading: 'A home for notes and photos',
      body: 'Journal pages, reading notes and images, in folders you can rearrange.',
    },
  }),
  vision: screen({
    key: 'vision',
    navLabel: 'Vision board',
    title: 'Vision board',
    path: '/vision',
    icon: 'vision',
    empty: {
      heading: 'Pictures of where you’re headed',
      body: 'Pin images and quotes for each life area, and link them to the goals they stand for.',
    },
  }),
  finance: screen({
    key: 'finance',
    navLabel: 'Finance',
    title: 'Finance',
    path: '/finance',
    icon: 'finance',
    empty: {
      heading: 'Money, kept private',
      body: 'Budgets, savings goals and spending. Amounts stay hidden until you choose to show them.',
    },
  }),
  health: screen({
    key: 'health',
    navLabel: 'Health',
    title: 'Health',
    path: '/health',
    icon: 'health',
    empty: {
      heading: 'Sleep, steps and how you feel',
      body: 'Log what you like by hand, or connect a phone later. Only you can see it.',
    },
  }),
  assistant: screen({
    key: 'assistant',
    navLabel: 'Assistant',
    title: 'Assistant',
    path: '/assistant',
    icon: 'assistant',
    empty: {
      heading: 'Ask about your own data',
      body: 'Runs on this device by default. It only reads the areas you allow and changes nothing until you tap.',
    },
  }),
} satisfies Record<ScreenKey, Screen>;

export const navGroups: NavGroup[] = [
  { label: 'Plan', screens: [screens.today, screens.inbox, screens.tasks, screens.calendar] },
  { label: 'Grow', screens: [screens.goals, screens.progress, screens.review] },
  { label: 'Remember', screens: [screens.library, screens.vision] },
  { label: 'Modules', hint: 'optional', screens: [screens.finance, screens.health, screens.assistant] },
];
