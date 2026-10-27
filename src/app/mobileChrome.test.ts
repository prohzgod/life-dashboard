import { mobileChrome } from './mobileChrome';

describe('mobileChrome', () => {
  it('maps tab roots', () => {
    expect(mobileChrome('/')).toEqual({ tab: 'home', back: null, hideTabBar: false });
    expect(mobileChrome('/today').tab).toBe('today');
    expect(mobileChrome('/inbox').tab).toBe('tasks');
    expect(mobileChrome('/tasks', '?view=upcoming').tab).toBe('tasks');
    expect(mobileChrome('/library').tab).toBe('library');
  });

  it('pushes other screens from Home with a back link', () => {
    expect(mobileChrome('/goals')).toEqual({ tab: 'home', back: { label: 'Home', to: '/' }, hideTabBar: false });
    expect(mobileChrome('/goals/abc').back).toEqual({ label: 'Goals', to: '/goals' });
    expect(mobileChrome('/progress').back?.label).toBe('Home');
    expect(mobileChrome('/settings/privacy').back).toEqual({ label: 'Profile', to: '/profile' });
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
