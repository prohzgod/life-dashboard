import type { Day } from '@/domain/days';
import { goalsRepo } from './repositories';
import type { Goal, GoalHorizon } from './types';

const HORIZON_ORDER: GoalHorizon[] = ['week', 'month', 'quarter', 'year'];

/**
 * This week's focus: active week goals covering today. Until a weekly review picks some,
 * the nearest active horizon (month, then quarter, then year) stands in. At most 3.
 */
export async function listFocusGoals(today: Day): Promise<{ goals: Goal[]; fromReview: boolean }> {
  const active = await goalsRepo.list((g) => g.status === 'active' && g.startDate <= today && g.endDate >= today);
  for (const horizon of HORIZON_ORDER) {
    const goals = active.filter((g) => g.horizon === horizon).sort((a, b) => a.endDate.localeCompare(b.endDate));
    if (goals.length) return { goals: goals.slice(0, 3), fromReview: horizon === 'week' };
  }
  return { goals: [], fromReview: false };
}
