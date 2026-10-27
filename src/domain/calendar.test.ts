import {
  addMonths,
  blockSpan,
  clockLabel,
  coversDay,
  habitsOnDay,
  layoutColumns,
  monthGrid,
  parseClock,
  rangeLabel,
  snapMinutes,
  spanOnDay,
  startsIn,
  weekDays,
} from './calendar';

const local = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m).toISOString();

describe('clock helpers', () => {
  it('parses and formats times', () => {
    expect(parseClock('09:30')).toBe(570);
    expect(parseClock('7:05')).toBe(425);
    expect(parseClock('24:00')).toBeNull();
    expect(parseClock('noon')).toBeNull();
    expect(clockLabel(570)).toBe('09:30');
  });

  it('snaps to quarter hours inside the day', () => {
    expect(snapMinutes(576)).toBe(570);
    expect(snapMinutes(583)).toBe(585);
    expect(snapMinutes(-20)).toBe(0);
    expect(snapMinutes(1439)).toBe(1425);
  });
});

describe('spanOnDay', () => {
  it('gives the minutes of an event on its day', () => {
    expect(spanOnDay(local(29, 12, 30), local(29, 13, 30), '2026-09-29')).toEqual({ startMin: 750, endMin: 810 });
    expect(spanOnDay(local(29, 12, 30), local(29, 13, 30), '2026-09-30')).toBeNull();
  });

  it('splits an event that crosses midnight', () => {
    expect(spanOnDay(local(29, 22), local(30, 1), '2026-09-29')).toEqual({ startMin: 1320, endMin: 1440 });
    expect(spanOnDay(local(29, 22), local(30, 1), '2026-09-30')).toEqual({ startMin: 0, endMin: 60 });
  });

  it('keeps zero-length events on their day', () => {
    expect(spanOnDay(local(29, 9), local(29, 9), '2026-09-29')).toEqual({ startMin: 540, endMin: 540 });
  });
});

describe('all-day and blocks', () => {
  it('covers the days up to the exclusive end', () => {
    expect(coversDay('2026-10-03', '2026-10-05', '2026-10-04')).toBe(true);
    expect(coversDay('2026-10-03', '2026-10-05', '2026-10-05')).toBe(false);
    expect(coversDay('2026-10-03', '2026-10-03', '2026-10-03')).toBe(true);
  });

  it('turns a task time and estimate into a block', () => {
    expect(blockSpan('15:00', 45)).toEqual({ startMin: 900, endMin: 945 });
    expect(blockSpan('15:00', null)).toEqual({ startMin: 900, endMin: 930 });
    expect(blockSpan('23:50', 60)).toEqual({ startMin: 1430, endMin: 1440 });
    expect(blockSpan('later', 60)).toBeNull();
  });
});

describe('layoutColumns', () => {
  it('puts overlapping items side by side and leaves the rest full width', () => {
    const laid = layoutColumns([
      { id: 'a', startMin: 600, endMin: 720 },
      { id: 'b', startMin: 630, endMin: 660 },
      { id: 'c', startMin: 660, endMin: 700 },
      { id: 'd', startMin: 800, endMin: 860 },
    ]);
    const by = Object.fromEntries(laid.map((i) => [i.id, [i.col, i.cols]]));
    expect(by).toEqual({ a: [0, 2], b: [1, 2], c: [1, 2], d: [0, 1] });
  });
});

describe('grids and labels', () => {
  it('lists the week from Monday and six weeks for a month', () => {
    expect(weekDays('2026-09-29')).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    const grid = monthGrid('2026-09-15');
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-08-31');
  });

  it('moves by months, clamping the day', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
  });

  it('writes week ranges the short way', () => {
    expect(rangeLabel('2026-09-28', '2026-10-04')).toBe('28 Sep – 4 Oct 2026');
    expect(rangeLabel('2026-10-05', '2026-10-11')).toBe('5 – 11 Oct 2026');
    expect(rangeLabel('2025-12-29', '2026-01-04')).toBe('29 Dec 2025 – 4 Jan 2026');
  });

  it('says how soon something starts', () => {
    const now = Date.parse(local(29, 11, 50));
    expect(startsIn(Date.parse(local(29, 12, 30)), Date.parse(local(29, 13, 30)), now)).toBe('in 40 min');
    expect(startsIn(Date.parse(local(29, 11, 30)), Date.parse(local(29, 12)), now)).toBe('now');
    expect(startsIn(Date.parse(local(29, 9)), Date.parse(local(29, 10)), now)).toBeNull();
    expect(startsIn(Date.parse(local(29, 15)), Date.parse(local(29, 16)), now)).toBe('in 3 hours');
  });
});

describe('habitsOnDay', () => {
  const daily = { input: { kind: 'yesno' as const, target: 1, schedule: { type: 'daily' as const }, startDay: '2026-09-01' }, logs: [{ day: '2026-09-28', value: 1, status: 'done' as const }] };
  const weekdays = { input: { kind: 'yesno' as const, target: 1, schedule: { type: 'weekdays' as const, days: [1] }, startDay: '2026-09-01' }, logs: [] };

  it('counts habits done out of those due', () => {
    expect(habitsOnDay([daily, weekdays], '2026-09-28', '2026-09-29')).toEqual({ done: 1, due: 2 });
    expect(habitsOnDay([daily, weekdays], '2026-09-29', '2026-09-29')).toEqual({ done: 0, due: 1 });
    expect(habitsOnDay([daily], '2026-08-01', '2026-09-29')).toBeNull();
  });
});
