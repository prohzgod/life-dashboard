import { generateNKeysBetween } from 'fractional-indexing';
import type { Area } from '@design/tokens';
import { db } from './db';
import { newId, nowIso, toLocalDay } from './ids';
import type { BaseRecord, Goal, Habit, LibraryNode, LifeArea, Task } from './types';

export const SEED_VERSION = 1;

/** The eight life areas from the wheel of life. Friends has no color of its own yet and shares Family's. */
const defaultAreas: Array<{ name: string; color: Area }> = [
  { name: 'Health', color: 'health' },
  { name: 'Career', color: 'career' },
  { name: 'Finance', color: 'finance' },
  { name: 'Family', color: 'family' },
  { name: 'Friends', color: 'family' },
  { name: 'Growth', color: 'growth' },
  { name: 'Home', color: 'home' },
  { name: 'Fun', color: 'fun' },
];

/**
 * Creates the first-launch defaults if this device has never been seeded.
 * Runs in one transaction, so a failure leaves nothing half-made.
 */
export async function seedIfNeeded(today: Date = new Date()): Promise<void> {
  return db.transaction('rw', [db.meta, db.areas, db.goals, db.habits, db.nodes, db.tasks], async () => {
    if (await db.meta.get('seededAt')) return;

    const now = nowIso();
    const base = (): BaseRecord => ({ id: newId(), createdAt: now, updatedAt: now, deletedAt: null });

    const areaKeys = generateNKeysBetween(null, null, defaultAreas.length);
    const areas: LifeArea[] = defaultAreas.map((a, i) => ({ ...base(), ...a, icon: null, sortKey: areaKeys[i]! }));
    const areaId = (name: string) => areas.find((a) => a.name === name)!.id;

    const year = today.getFullYear();
    const quarter = Math.floor(today.getMonth() / 3);
    const yearGoal: Goal = {
      ...base(),
      areaId: areaId('Health'),
      parentGoalId: null,
      title: 'Run a half-marathon',
      why: 'A sample goal to show how goals work. Change it to one of yours, or delete it.',
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
      title: 'Run 10 km without stopping',
      why: '',
      horizon: 'quarter',
      targetValue: 10,
      startDate: toLocalDay(new Date(year, quarter * 3, 1)),
      endDate: toLocalDay(new Date(year, quarter * 3 + 3, 0)),
    };

    const habit = (h: Pick<Habit, 'title' | 'kind' | 'target' | 'unit' | 'cue'> & { area: string }): Habit => ({
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
      habit({ title: 'Meditate', kind: 'yesno', target: 1, unit: null, cue: 'After morning coffee', area: 'Health' }),
      habit({ title: 'Read 20 pages', kind: 'count', target: 20, unit: 'pages', cue: 'Before bed', area: 'Growth' }),
      habit({ title: 'Water', kind: 'count', target: 8, unit: 'glasses', cue: null, area: 'Health' }),
    ];

    const folderKeys = generateNKeysBetween(null, null, 3);
    const folders: LibraryNode[] = ['Journal', 'Areas', 'Projects'].map((title, i) => ({
      ...base(),
      parentId: null,
      kind: 'folder',
      title,
      contentJson: null,
      contentText: '',
      sortKey: folderKeys[i]!,
      icon: null,
      isSystem: true,
      systemKey: title.toLowerCase(),
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
      title: 'Weekly review',
      notes: 'Get clear, get current, reflect, and pick 1–3 things to focus on next week.',
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
