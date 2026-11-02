import { describe, expect, it } from 'vitest';
import { changesView } from './routeMotion';

const at = 'http://app.test/tasks?view=today';

describe('changesView', () => {
  it('is true for another screen or another view of one', () => {
    expect(changesView(at, '/goals')).toBe(true);
    expect(changesView(at, '?view=upcoming')).toBe(true);
    expect(changesView(at, { pathname: '/library', search: '' })).toBe(true);
  });

  it('is false for the same place', () => {
    expect(changesView(at, '/tasks?view=today')).toBe(false);
    expect(changesView(at, { search: '?view=today' })).toBe(false);
  });

  it('ignores opening or closing a task panel', () => {
    expect(changesView(at, '?view=today&task=1')).toBe(false);
    expect(changesView('http://app.test/tasks?view=today&task=1', '?view=today')).toBe(false);
  });
});
