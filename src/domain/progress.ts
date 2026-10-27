/** A goal measured by a number: (current − start) ÷ (target − start), as 0–100. Null when it can't be measured. */
export function metricProgress(goal: { startValue: number | null; targetValue: number | null; currentValue: number | null }): number | null {
  const { startValue, targetValue, currentValue } = goal;
  if (startValue === null || targetValue === null || currentValue === null || targetValue === startValue) return null;
  return Math.min(100, Math.max(0, ((currentValue - startValue) / (targetValue - startValue)) * 100));
}
