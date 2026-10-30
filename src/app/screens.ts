import type { IconName } from '@/components/icons/Icon';
import { messages } from '@/i18n';

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

/** Labels are read when used, so they follow the language you picked. */
const screen = (key: ScreenKey, path: string, icon: IconName, hasBadge: boolean, extra: Pick<Screen, 'activeFor' | 'countKey'> = {}): Screen => ({
  key,
  path,
  icon,
  ...extra,
  get navLabel() {
    return messages().screens[key].navLabel;
  },
  get title() {
    return messages().screens[key].title;
  },
  get badge() {
    const s = messages().screens[key];
    return hasBadge && 'badge' in s ? s.badge : undefined;
  },
  get empty() {
    const s = messages().screens[key];
    return { heading: s.emptyHeading, body: s.emptyBody };
  },
});

export const screens = {
  today: screen('today', '/', 'today', false, { countKey: 'today' }),
  inbox: screen('inbox', '/inbox', 'inbox', false, { countKey: 'inbox' }),
  tasks: screen('tasks', '/tasks', 'tasks', false),
  calendar: screen('calendar', '/calendar', 'calendar', false),
  goals: screen('goals', '/goals', 'goals', false),
  progress: screen('progress', '/progress', 'progress', false),
  review: screen('review', '/reviews', 'review', true, { activeFor: '/review' }),
  library: screen('library', '/library', 'library', false),
  vision: screen('vision', '/vision', 'vision', false),
  finance: screen('finance', '/finance', 'finance', false),
  health: screen('health', '/health', 'health', false),
  assistant: screen('assistant', '/assistant', 'assistant', false),
} satisfies Record<ScreenKey, Screen>;

export function navGroups(): NavGroup[] {
  const g = messages().screens.groups;
  return [
    { label: g.plan, screens: [screens.today, screens.inbox, screens.tasks, screens.calendar] },
    { label: g.grow, screens: [screens.goals, screens.progress, screens.review] },
    { label: g.remember, screens: [screens.library, screens.vision] },
    { label: g.modules, hint: g.optional, screens: [screens.finance, screens.health, screens.assistant] },
  ];
}
