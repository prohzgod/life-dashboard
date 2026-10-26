import { applyThemePreference, readThemePreference, setThemePreference, THEME_STORAGE_KEY } from './theme';

describe('theme preference', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('follows the system setting when nothing is saved', () => {
    expect(readThemePreference()).toBe('system');
  });

  it('ignores unknown stored values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    expect(readThemePreference()).toBe('system');
  });

  it('saves light and dark and sets data-theme on <html>', () => {
    setThemePreference('dark');
    expect(readThemePreference()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    setThemePreference('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('clears the saved value and the attribute for system', () => {
    setThemePreference('dark');
    setThemePreference('system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('can apply to any root element', () => {
    const root = document.createElement('div');
    applyThemePreference('dark', root);
    expect(root.getAttribute('data-theme')).toBe('dark');
  });
});
