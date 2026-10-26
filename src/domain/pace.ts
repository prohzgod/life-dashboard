/** How far a goal should be by `today`, as 0–100: elapsed time ÷ total time, clamped. */
export function expectedPercent(start: Date, end: Date, today: Date): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return today.getTime() >= end.getTime() ? 100 : 0;
  const elapsed = today.getTime() - start.getTime();
  return clamp((elapsed / total) * 100, 0, 100);
}

/** Points of slack before a goal counts as behind (PRODUCT.md "Pace rules"). */
export const PACE_TOLERANCE = 3;

export type PaceStatus = 'on-pace' | 'behind';

export function paceStatus(progress: number, expected: number): PaceStatus {
  return progress >= expected - PACE_TOLERANCE ? 'on-pace' : 'behind';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
