import { readPace } from './paceText';

describe('readPace', () => {
  it('reads on pace and behind in plain words', () => {
    expect(readPace(80, '2026-01-01', '2026-12-31', '2026-10-01')).toMatchObject({ status: 'on-pace', sentence: 'On pace' });
    // 13 points of a year is about 47 days.
    expect(readPace(62, '2026-01-01', '2026-12-31', '2026-10-01').sentence).toBe('Behind by about 7 weeks');
    expect(readPace(0, '2026-10-01', '2026-10-31', '2026-10-06').sentence).toBe('Behind by about 5 days');
  });
});
