import { messages } from '@/i18n';

export type Tab = 'home' | 'today' | 'tasks' | 'menu';

export type MobileChrome = {
  /** Which tab is highlighted. */
  tab: Tab;
  /** A "‹ Back" link above the screen; null when the screen draws its own. */
  back: { label: string; to: string } | null;
  /** Full-screen flows (review, editor, edit forms) hide the tab bar. */
  hideTabBar: boolean;
};

/** How the phone layout frames each route: tab, back link, tab bar. */
export function mobileChrome(pathname: string, search = ''): MobileChrome {
  const params = new URLSearchParams(search);
  const p = pathname.replace(/\/+$/, '') || '/';

  if (p === '/') return { tab: 'home', back: null, hideTabBar: false };
  if (p === '/menu') return { tab: 'menu', back: null, hideTabBar: false };
  if (p === '/today') return { tab: 'today', back: null, hideTabBar: false };
  if (p === '/inbox' || p === '/tasks' || p.startsWith('/tasks/')) {
    // A task's details read as a pushed screen; the screen draws its own back link.
    return { tab: 'tasks', back: null, hideTabBar: false };
  }
  if (p === '/library' || p.startsWith('/library/')) {
    const editing = /^\/library\/(?!trash$|photos$|day\/)[^/]+$/.test(p);
    return { tab: 'menu', back: null, hideTabBar: editing && params.get('view') !== 'tree' };
  }
  if (p === '/home/edit') return { tab: 'home', back: null, hideTabBar: true };
  if (p === '/profile') return { tab: 'home', back: null, hideTabBar: false };
  if (p === '/profile/edit') return { tab: 'home', back: null, hideTabBar: true };
  // Each settings section is a pushed screen with its own "‹ Profile" header.
  if (p.startsWith('/settings')) return { tab: 'home', back: null, hideTabBar: false };
  // The calendar draws its own header; Menu is one tap away in the tab bar.
  if (p === '/calendar') return { tab: 'menu', back: null, hideTabBar: false };
  // These draw their own "‹ Menu" header with a button beside it.
  if (p === '/vision' || p === '/finance' || p === '/health') return { tab: 'menu', back: null, hideTabBar: false };
  if (p === '/review' || p.startsWith('/review/')) return { tab: 'menu', back: null, hideTabBar: true };
  if (/^\/goals\/[^/]+$/.test(p)) return { tab: 'menu', back: { label: messages().screens.goals.title, to: '/goals' }, hideTabBar: false };
  return { tab: 'menu', back: { label: messages().shell.menu, to: '/menu' }, hideTabBar: false };
}
