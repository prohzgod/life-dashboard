import { metricProgress } from './progress';

describe('metricProgress', () => {
  it('measures from start toward target', () => {
    expect(metricProgress({ startValue: 0, targetValue: 21.1, currentValue: 10.55 })).toBeCloseTo(50);
    expect(metricProgress({ startValue: 80, targetValue: 70, currentValue: 75 })).toBe(50); // losing weight counts down
  });

  it('clamps and refuses what it cannot measure', () => {
    expect(metricProgress({ startValue: 0, targetValue: 10, currentValue: 14 })).toBe(100);
    expect(metricProgress({ startValue: 0, targetValue: 0, currentValue: 0 })).toBeNull();
    expect(metricProgress({ startValue: null, targetValue: 10, currentValue: 3 })).toBeNull();
  });
});
