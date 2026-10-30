import { generateNKeysBetween } from 'fractional-indexing';
import type { Area } from '@design/tokens';
import { messages, type Messages } from '@/i18n/locale';
import { db } from './db';
import { newId, nowIso, toLocalDay } from './ids';
import type { BaseRecord, Goal, Habit, LibraryNode, LifeArea, Task } from './types';

export const SEED_VERSION = 1;

type AreaKey = keyof Messages['seed']['areas'];

/** The eight life areas from the wheel of life. Friends has no color of its own yet and shares Family's. */
const defaultAreas: Array<{ key: AreaKey; color: Area }> = [
  { key: 'health', color: 'health' },
  { key: 'career', color: 'career' },
  { key: 'finance', color: 'finance' },
  { key: 'family', color: 'family' },
  { key: 'friends', color: 'family' },
  { key: 'growth', color: 'growth' },
  { key: 'home', color: 'home' },
  { key: 'fun', color: 'fun' },
];

/**
 * Creates the first-launch defaults if this device has never been seeded, in your language.
 * Runs in one transaction, so a failure leaves nothing half-made.
 */
export async function seedIfNeeded(today: Date = new Date()): Promise<void> {
  return db.transaction('rw', [db.meta, db.areas, db.goals, db.habits, db.nodes, db.tasks], async () => {
    if (await db.meta.get('seededAt')) return;

    const now = nowIso();
    const base = (): BaseRecord => ({ id: newId(), createdAt: now, updatedAt: now, deletedAt: null });

    const t = messages().seed;
    const areaKeys = generateNKeysBetween(null, null, defaultAreas.length);
    const areas: LifeArea[] = defaultAreas.map((a, i) => ({ ...base(), name: t.areas[a.key], color: a.color, icon: null, sortKey: areaKeys[i]! }));
    const areaId = (key: AreaKey) => areas[defaultAreas.findIndex((a) => a.key === key)]!.id;

    const year = today.getFullYear();
    const quarter = Math.floor(today.getMonth() / 3);
    const yearGoal: Goal = {
      ...base(),
      areaId: areaId('health'),
      parentGoalId: null,
      title: t.yearGoal,
      why: t.yearGoalWhy,
      horizon: 'year',
      type: 'target',
      progressMethod: 'metric',
      startValue: 0,
      targetValue: 21.1,
      currentValue: 0,
      unit: 'km',
      startDate: toLocalDay(new Date(year, 0, 1)),
      endDate: toLocalDay(new Date(year, 11, 31)),
      status: 'active',
      commitment: 'committed',
      progressLog: [],
      wordOfYear: null,
    };
    const quarterGoal: Goal = {
      ...yearGoal,
      ...base(),
      parentGoalId: yearGoal.id,
      title: t.quarterGoal,
      why: '',
      horizon: 'quarter',
      targetValue: 10,
      startDate: toLocalDay(new Date(year, quarter * 3, 1)),
      endDate: toLocalDay(new Date(year, quarter * 3 + 3, 0)),
    };

    const habit = (h: Pick<Habit, 'title' | 'kind' | 'target' | 'unit' | 'cue'> & { area: AreaKey }): Habit => ({
      ...base(),
      areaId: areaId(h.area),
      goalId: null,
      title: h.title,
      kind: h.kind,
      target: h.target,
      unit: h.unit,
      schedule: { type: 'daily' },
      cue: h.cue,
      archivedAt: null,
    });
    const habits = [
      habit({ title: t.habits.meditate.title, kind: 'yesno', target: 1, unit: null, cue: t.habits.meditate.cue, area: 'health' }),
      habit({ title: t.habits.read.title, kind: 'count', target: 20, unit: t.habits.read.unit, cue: t.habits.read.cue, area: 'growth' }),
      habit({ title: t.habits.water.title, kind: 'count', target: 8, unit: t.habits.water.unit, cue: null, area: 'health' }),
    ];

    const folderKeys = generateNKeysBetween(null, null, 3);
    const folders: LibraryNode[] = (['journal', 'areas', 'projects'] as const).map((key, i) => ({
      ...base(),
      parentId: null,
      kind: 'folder',
      title: t.folders[key],
      contentJson: null,
      contentText: '',
      sortKey: folderKeys[i]!,
      icon: null,
      isSystem: true,
      systemKey: key,
      favoritedAt: null,
      areaId: null,
      goalId: null,
    }));

    const weeklyReview: Task = {
      ...base(),
      areaId: null,
      goalId: null,
      keyResultId: null,
      parentTaskId: null,
      title: t.weeklyReview,
      notes: t.weeklyReviewNotes,
      status: 'open',
      priority: null,
      doOn: toLocalDay(nextSunday(today)),
      time: null,
      dueAt: null,
      estimateMin: 30,
      rrule: 'FREQ=WEEKLY;BYDAY=SU',
      reminderAt: null,
      completedAt: null,
      sortKey: generateNKeysBetween(null, null, 1)[0]!,
      repeatOfId: null,
    };

    await db.areas.bulkAdd(areas);
    await db.goals.bulkAdd([yearGoal, quarterGoal]);
    await db.habits.bulkAdd(habits);
    await db.nodes.bulkAdd(folders);
    await db.tasks.add(weeklyReview);
    await db.meta.bulkPut([
      { key: 'seedVersion', value: SEED_VERSION },
      { key: 'seededAt', value: now },
    ]);
  });
}

/** Today if it is Sunday, otherwise the coming Sunday. */
export function nextSunday(from: Date): Date {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  date.setDate(date.getDate() + ((7 - date.getDay()) % 7));
  return date;
}
