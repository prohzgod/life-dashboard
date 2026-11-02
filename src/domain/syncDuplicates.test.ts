// @vitest-environment node
import { mergeDuplicates, NATURAL_KEYS, pickWinner } from './syncDuplicates';

const row = (id: string, updatedAt: string, extra: object = {}) => ({ id, createdAt: updatedAt, updatedAt, deletedAt: null as string | null, ...extra });

describe('pickWinner', () => {
  it('picks the same winner in any order', () => {
    const rows = [row('B', 'x'), row('A', 'x'), row('C', 'x')];
    expect(pickWinner(rows).winner.id).toBe('A');
    expect(pickWinner([...rows].reverse()).winner.id).toBe('A');
    expect(pickWinner(rows).losers.map((r) => r.id).sort()).toEqual(['B', 'C']);
  });
});

describe('NATURAL_KEYS', () => {
  it('names what makes rows the same', () => {
    expect(NATURAL_KEYS.dailyEntries!.key({ day: '2026-11-02' })).toBe('2026-11-02');
    expect(NATURAL_KEYS.habitLogs!.key({ habitId: 'h', day: 'd' })).toBe('h|d');
    expect(NATURAL_KEYS.reviews!.key({ period: 'week', periodStart: 'd' })).toBe('week|d');
    expect(NATURAL_KEYS.profile!.key({})).toBe('profile');
  });

  it('leaves rows without one alone', () => {
    expect(NATURAL_KEYS.nodes!.key({ systemKey: null })).toBeNull();
    expect(NATURAL_KEYS.metrics!.key({ systemKey: null })).toBeNull();
    expect(NATURAL_KEYS.homeWidgets!.key({ kind: 'pinned' })).toBeNull();
    expect(NATURAL_KEYS.calendars!.key({ source: 'ics', name: 'Work' })).toBeNull();
  });
});

describe('mergeDuplicates', () => {
  const t1 = '2026-11-02T10:00:00.000Z';
  const t2 = '2026-11-02T11:00:00.000Z';
  const after = '2026-11-02T11:00:00.001Z';

  it('soft-deletes the loser, stamped after both, and leaves an already newer winner alone', () => {
    const { winner, losers } = mergeDuplicates([row('A', t2, { mood: 3 }), row('B', t1, { mood: 5 })]);
    expect(winner).toBeNull();
    expect(losers).toEqual([expect.objectContaining({ id: 'B', deletedAt: after, updatedAt: after })]);
  });

  it("keeps the newer content, under the winner's id", () => {
    const { winner, losers } = mergeDuplicates([row('A', t1, { mood: 3, createdAt: t1 }), row('B', t2, { mood: 5 })]);
    expect(winner).toMatchObject({ id: 'A', mood: 5, createdAt: t1, updatedAt: after, deletedAt: null });
    expect(losers[0]).toMatchObject({ id: 'B', deletedAt: after });
  });

  it('comes out the same whichever device runs it', () => {
    const a = mergeDuplicates([row('A', t1, { mood: 3 }), row('B', t2, { mood: 5 })]);
    const b = mergeDuplicates([row('B', t2, { mood: 5 }), row('A', t1, { mood: 3 })]);
    expect(a).toEqual(b);
  });

  it('keeps what only the older row knew', () => {
    const { winner } = mergeDuplicates([row('A', t1, { mood: 4, sleepMin: 420, line: '' }), row('B', t2, { mood: null, sleepMin: null, line: 'From the laptop' })]);
    expect(winner).toMatchObject({ id: 'A', mood: 4, sleepMin: 420, line: 'From the laptop' });
  });

  it('writes the winner when it is newest but an older row fills a gap', () => {
    const { winner } = mergeDuplicates([row('A', t2, { mood: null, line: 'Newest' }), row('B', t1, { mood: 2, line: 'Older' })]);
    expect(winner).toMatchObject({ id: 'A', mood: 2, line: 'Newest', updatedAt: after });
  });
});
