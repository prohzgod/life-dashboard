import { singular, formatDayLong, formatDayRelative, formatDayShort, formatMinutes, numberWord, timeAgo } from './format';

describe('format', () => {
  it('formats days', () => {
    expect(formatDayShort('2026-10-01')).toBe('Thu 1 Oct');
    expect(formatDayLong('2026-09-29')).toBe('Tuesday, 29 September 2026');
    expect(formatDayRelative('2026-10-27', '2026-10-26')).toBe('Tomorrow');
    expect(formatDayRelative('2026-10-25', '2026-10-26')).toBe('Yesterday');
    expect(formatDayRelative('2026-10-30', '2026-10-26')).toBe('Fri 30 Oct');
  });

  it('formats durations and counts', () => {
    expect(formatMinutes(10)).toBe('10 min');
    expect(formatMinutes(95)).toBe('1h 35m');
    expect(formatMinutes(120)).toBe('2h');
    expect(numberWord(3)).toBe('Three');
    expect(numberWord(12)).toBe('12');
  });

  it('says how long ago', () => {
    const now = new Date('2026-10-26T12:00:00Z');
    expect(timeAgo('2026-10-26T11:59:40Z', now)).toBe('just now');
    expect(timeAgo('2026-10-26T11:15:00Z', now)).toBe('45 min ago');
    expect(timeAgo('2026-10-25T12:00:00Z', now)).toBe('yesterday');
    expect(timeAgo('2026-10-22T12:00:00Z', now)).toBe('4 days ago');
  });
});

it('makes habit units singular', () => {
  expect(singular('glasses')).toBe('glass');
  expect(singular('pages')).toBe('page');
  expect(singular('boxes')).toBe('box');
  expect(singular('km')).toBe('km');
});
