import { formatAmount, type GoalPace, type GoalProgress } from '@/domain/goals';
import type { Goal } from '@/data';
import { messages } from '@/i18n';

/** "Year, target", "Quarter, milestones", "Q3 OKR, stretch". */
export function goalTypeChip(goal: Goal): string {
  const t = messages().goals;
  const parts = [t.horizons[goal.horizon], t.methodShort[goal.progressMethod]];
  if (goal.progressMethod === 'metric' && goal.targetValue !== null && goal.unit && !/^[a-z]/i.test(goal.unit)) parts[1] = t.target(formatAmount(goal.targetValue, goal.unit));
  if (goal.commitment === 'aspirational') parts.push(t.stretch);
  return parts.join(', ');
}

/** The line under a goal's title: pace, or what it's counting. */
export function goalStatusLine(goal: Goal, progress: GoalProgress, pace: GoalPace): { text: string; tone: 'success' | 'warning' | 'quiet' } {
  const t = messages().goals;
  if (goal.progressMethod === 'keyResultAverage' && progress.score !== undefined) {
    return { text: t.krScore(progress.total ?? 0, progress.score.toFixed(2), goal.commitment === 'aspirational'), tone: 'quiet' };
  }
  const counted =
    progress.total !== undefined && progress.done !== undefined && progress.total > 0 && goal.progressMethod !== 'childRollup'
      ? t.counted(progress.done, progress.total, goal.progressMethod === 'milestones')
      : goal.progressMethod === 'metric' && goal.currentValue !== null && goal.unit && !/^[a-z]/i.test(goal.unit)
        ? t.saved(formatAmount(goal.currentValue, goal.unit))
        : goal.progressMethod === 'habitConsistency' && progress.percent !== null
          ? t.consistency(Math.round(progress.percent))
          : null;
  if (pace.state === 'behind') return { text: counted ? t.withPace(counted, pace.sentence) : pace.sentence, tone: 'warning' };
  if (pace.state === 'on-pace') return { text: counted ? `${counted}, ${t.onPaceLower}` : t.onPace, tone: 'success' };
  return { text: counted ? t.withPace(counted, pace.sentence) : pace.sentence, tone: 'quiet' };
}

/** The "Now" column: a percent, a count, or an OKR score. */
export function goalNow(goal: Goal, progress: GoalProgress): string {
  if (goal.progressMethod === 'keyResultAverage' && progress.score !== undefined) return progress.score.toFixed(2);
  if (goal.horizon === 'week' && progress.total && progress.done !== undefined) return `${progress.done}/${progress.total}`;
  return progress.percent === null ? '–' : `${Math.round(progress.percent)}%`;
}
