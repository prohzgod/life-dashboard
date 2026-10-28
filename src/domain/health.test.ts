import {
  dailyAverage,
  dayValue,
  formatDuration,
  formatSleep,
  lastTimeToday,
  latestWithChange,
  parseDuration,
  sleepMoodPattern,
  sleepNights,
  sleepSummary,
  workoutMonth,
} from './health';

const at = (day: string, h = 9, m = 0) => new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).toISOString();

describe('sleep', () => {
  const entries = [
    { day: '2026-09-29', sleepMinutes: 450, mood: 4 },
    { day: '2026-09-28', sleepMinutes: 400, mood: 3 },
    { day: '2026-09-20', sleepMinutes: null, mood: 3 },
  ];

  it('lists the last 14 nights, oldest first, with gaps', () => {
    const nights = sleepNights(entries, '2026-09-29');
    expect(nights).toHaveLength(14);
    expect(nights[0]).toEqual({ day: '2026-09-16', label: '16', minutes: null });
    expect(nights.at(-1)).toEqual({ day: '2026-09-29', label: '29', minutes: 450 });
    expect(sleepSummary(nights)).toEqual({ average: 425, met: 1, logged: 2 });
    expect(formatSleep(424)).toBe('7h 04m');
  });

  it('compares mood after rested and short nights, once there are enough', () => {
    expect(sleepMoodPattern(entries)).toBeNull();
    const many = [
      ...Array.from({ length: 6 }, (_, i) => ({ day: `2026-08-0${i + 1}`, sleepMinutes: 450, mood: 4 })),
      ...Array.from({ length: 5 }, (_, i) => ({ day: `2026-08-1${i}`, sleepMinutes: 380, mood: 3 })),
    ];
    expect(sleepMoodPattern(many)).toMatchObject({ rested: 4, short: 3, diff: 1, restedDays: 6, shortDays: 5 });
  });
});

describe('metrics', () => {
  const water = [
    { at: at('2026-09-29', 8), value: 1 },
    { at: at('2026-09-29', 11, 5), value: 2 },
    { at: at('2026-09-28', 9), value: 6 },
  ];

  it('totals, averages or takes the last reading per day', () => {
    expect(dayValue(water, '2026-09-29', 'sum')).toBe(3);
    expect(dayValue(water, '2026-09-29', 'average')).toBe(1.5);
    expect(dayValue(water, '2026-09-29', 'last')).toBe(2);
    expect(dayValue(water, '2026-09-27', 'sum')).toBeNull();
    expect(dailyAverage(water, '2026-09-29', 'sum')).toBe(4.5);
    expect(lastTimeToday(water, '2026-09-29')).toBe('11:05');
  });

  it('shows the latest reading and the change over the window', () => {
    const weight = [
      { at: at('2026-07-02'), value: 69.6 },
      { at: at('2026-08-15'), value: 69 },
      { at: at('2026-09-28'), value: 68.4 },
    ];
    const w = latestWithChange(weight, '2026-09-29')!;
    expect(w.latest).toBe(68.4);
    expect(w.change).toBeCloseTo(-1.2);
    expect(w.since!.getMonth()).toBe(6);
    expect(latestWithChange([{ at: at('2026-09-28'), value: 58 }], '2026-09-29')).toEqual({ latest: 58, change: null, since: null });
    expect(latestWithChange([], '2026-09-29')).toBeNull();
  });
});

describe('workouts', () => {
  it('sum up a month', () => {
    const w = [
      { day: '2026-09-29', kind: 'run' as const, distanceKm: 5.2, durationSec: 1720 },
      { day: '2026-09-26', kind: 'run' as const, distanceKm: 12.1, durationSec: 4325 },
      { day: '2026-09-24', kind: 'yoga' as const, distanceKm: null, durationSec: 3600 },
      { day: '2026-08-30', kind: 'run' as const, distanceKm: 8, durationSec: 2800 },
    ];
    expect(workoutMonth(w, '2026-09')).toEqual({ count: 3, runKm: 17.3, byKind: { run: 2, yoga: 1 } });
  });

  it('read and write durations', () => {
    expect(formatDuration(1720)).toBe('28:40');
    expect(formatDuration(4325)).toBe('1:12:05');
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(parseDuration('28:40')).toBe(1720);
    expect(parseDuration('1:12:05')).toBe(4325);
    expect(parseDuration('45')).toBe(2700);
    expect(parseDuration('12:75')).toBeNull();
    expect(parseDuration('soon')).toBeNull();
  });
});
