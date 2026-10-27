import { useLiveQuery } from 'dexie-react-hooks';
import { areasRepo, goalsRepo, taskTagMap, type Goal, type LifeArea } from '@/data';

export type TaskLookups = {
  areas: LifeArea[];
  areaById: Map<string, LifeArea>;
  goalById: Map<string, Goal>;
  tagsByTask: Map<string, string[]>;
};

const empty: TaskLookups = { areas: [], areaById: new Map(), goalById: new Map(), tagsByTask: new Map() };

/** Areas, goals and tags that task rows need to describe themselves, kept live. */
export function useTaskLookups(): TaskLookups {
  return (
    useLiveQuery(async () => {
      const [areas, goals, tagsByTask] = await Promise.all([areasRepo.listOrdered(), goalsRepo.list(), taskTagMap()]);
      return { areas, areaById: new Map(areas.map((a) => [a.id, a])), goalById: new Map(goals.map((g) => [g.id, g])), tagsByTask };
    }) ?? empty
  );
}
