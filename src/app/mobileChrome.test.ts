import { mobileChrome } from './mobileChrome';

describe('mobileChrome', () => {
  it('maps tab roots', () => {
    expect(mobileChrome('/')).toEqual({ tab: 'home', back: null, hideTabBar: false });
    expect(mobileChrome('/today').tab).toBe('today');
    expect(mobileChrome('/inbox').tab).toBe('tasks');
    expect(mobileChrome('/tasks', '?view=upcoming').tab).toBe('tasks');
    expect(mobileChrome('/menu')).toEqual({ tab: 'menu', back: null, hideTabBar: false });
  });

  it('files the screens without a tab of their own under Menu', () => {
    for (const path of ['/library', '/library/trash', '/calendar', '/reviews', '/vision', '/finance', '/health', '/assistant']) {
      expect(mobileChrome(path).tab).toBe('menu');
    }
  });

  it('keeps Profile and Settings under Home, where the avatar opens them', () => {
    expect(mobileChrome('/profile').tab).toBe('home');
    expect(mobileChrome('/settings/privacy').tab).toBe('home');
  });

  it('pushes other screens from Menu with a back link', () => {
    expect(mobileChrome('/goals')).toEqual({ tab: 'menu', back: { label: 'Menu', to: '/menu' }, hideTabBar: false });
    expect(mobileChrome('/goals/abc').back).toEqual({ label: 'Goals', to: '/goals' });
    expect(mobileChrome('/progress').back?.label).toBe('Menu');
    expect(mobileChrome('/settings/privacy').back).toBeNull(); // draws its own "‹ Profile" header
  });

  it('hides the tab bar for full-screen flows and the page editor', () => {
    expect(mobileChrome('/review').hideTabBar).toBe(true);
    expect(mobileChrome('/home/edit').hideTabBar).toBe(true);
    expect(mobileChrome('/profile/edit').hideTabBar).toBe(true);
    expect(mobileChrome('/library/01ABC').hideTabBar).toBe(true);
    expect(mobileChrome('/library/trash').hideTabBar).toBe(false);
    expect(mobileChrome('/library/day/2026-10-27').hideTabBar).toBe(false);
  });
});
