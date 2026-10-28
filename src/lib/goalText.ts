import { formatAmount, type GoalPace, type GoalProgress } from '@/domain/goals';
import type { Goal } from '@/data';

const HORIZONS: Record<Goal['horizon'], string> = { vision: 'Vision', year: 'Year', quarter: 'Quarter', month: 'Month', week: 'Week' };

export const METHOD_LABELS: Record<Goal['progressMethod'], string> = {
  metric: 'A number toward a target',
  milestones: 'Milestones',
  taskCount: 'Linked tasks done',
  weightedTasks: 'Linked tasks, weighed by estimate',
  keyResultAverage: 'Key results (OKR)',
  habitConsistency: 'Habit consistency',
  manual: 'I’ll update it by hand',
  childRollup: 'Average of its sub-goals',
};

const METHOD_SHORT: Record<Goal['progressMethod'], string> = {
  metric: 'target',
  milestones: 'milestones',
  taskCount: 'tasks',
  weightedTasks: 'tasks',
  keyResultAverage: 'OKR',
  habitConsistency: 'habit',
  manual: 'manual',
  childRollup: 'roll-up',
};

/** "Year, target", "Quarter, milestones", "Q3 OKR, stretch". */
export function goalTypeChip(goal: Goal): string {
  const parts = [HORIZONS[goal.horizon], METHOD_SHORT[goal.progressMethod]];
  if (goal.progressMethod === 'metric' && goal.targetValue !== null && goal.unit && !/^[a-z]/i.test(goal.unit)) parts[1] = `target ${formatAmount(goal.targetValue, goal.unit)}`;
  if (goal.commitment === 'aspirational') parts.push('stretch');
  return parts.join(', ');
}

/** The line under a goal's title: pace, or what it's counting. */
export function goalStatusLine(goal: Goal, progress: GoalProgress, pace: GoalPace): { text: string; tone: 'success' | 'warning' | 'quiet' } {
  if (goal.progressMethod === 'keyResultAverage' && progress.score !== undefined) {
    return { text: `${progress.total} key results, score ${progress.score.toFixed(2)}${goal.commitment === 'aspirational' ? ' (0.6–0.7 is a win)' : ''}`, tone: 'quiet' };
  }
  const counted =
    progress.total !== undefined && progress.done !== undefined && progress.total > 0 && goal.progressMethod !== 'childRollup'
      ? `${progress.done} of ${progress.total} ${goal.progressMethod === 'milestones' ? 'milestones' : 'tasks'}`
      : goal.progressMethod === 'metric' && goal.currentValue !== null && goal.unit && !/^[a-z]/i.test(goal.unit)
        ? `${formatAmount(goal.currentValue, goal.unit)} saved`
        : goal.progressMethod === 'habitConsistency' && progress.percent !== null
          ? `${Math.round(progress.percent)}% consistency`
          : null;
  if (pace.state === 'behind') return { text: counted ? `${counted}, ${pace.sentence.charAt(0).toLowerCase()}${pace.sentence.slice(1)}` : pace.sentence, tone: 'warning' };
  if (pace.state === 'on-pace') return { text: counted ? `${counted}, on pace` : 'On pace', tone: 'success' };
  return { text: counted ? `${counted}, ${pace.sentence.charAt(0).toLowerCase()}${pace.sentence.slice(1)}` : pace.sentence, tone: 'quiet' };
}

/** The "Now" column: a percent, a count, or an OKR score. */
export function goalNow(goal: Goal, progress: GoalProgress): string {
  if (goal.progressMethod === 'keyResultAverage' && progress.score !== undefined) return progress.score.toFixed(2);
  if (goal.horizon === 'week' && progress.total && progress.done !== undefined) return `${progress.done}/${progress.total}`;
  return progress.percent === null ? '–' : `${Math.round(progress.percent)}%`;
}
