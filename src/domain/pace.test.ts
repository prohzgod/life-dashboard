import { expectedPercent, paceStatus } from './pace';

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('expectedPercent', () => {
  it('is elapsed time over total time', () => {
    expect(expectedPercent(day('2026-01-01'), day('2026-01-11'), day('2026-01-06'))).toBe(50);
  });

  it('clamps before the start and after the end', () => {
    expect(expectedPercent(day('2026-01-01'), day('2026-01-11'), day('2025-12-01'))).toBe(0);
    expect(expectedPercent(day('2026-01-01'), day('2026-01-11'), day('2026-02-01'))).toBe(100);
  });

  it('handles a goal that starts and ends on the same moment', () => {
    expect(expectedPercent(day('2026-01-01'), day('2026-01-01'), day('2025-12-31'))).toBe(0);
    expect(expectedPercent(day('2026-01-01'), day('2026-01-01'), day('2026-01-01'))).toBe(100);
  });
});

describe('paceStatus', () => {
  it('is on pace at or above the expected value', () => {
    expect(paceStatus(80, 75)).toBe('on-pace');
    expect(paceStatus(75, 75)).toBe('on-pace');
  });

  it('allows 3 points of slack', () => {
    expect(paceStatus(72, 75)).toBe('on-pace');
    expect(paceStatus(71.9, 75)).toBe('behind');
  });
});
