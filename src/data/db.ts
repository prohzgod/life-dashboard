import Dexie, { type Table } from 'dexie';
import type {
  AreaRating,
  Attachment,
  CalendarEvent,
  DailyEntry,
  Goal,
  Habit,
  HabitLog,
  HomeWidget,
  KeyResult,
  LibraryNode,
  LifeArea,
  Link,
  MetaEntry,
  Metric,
  MetricEntry,
  Milestone,
  Profile,
  Review,
  Space,
  Tag,
  Tagging,
  Task,
} from './types';

/**
 * The local database. Only modules in src/data/ may import this; the UI goes through the repositories.
 * Changing an index means adding a new `version(n)` below, never editing an old one.
 */
export class LifeDb extends Dexie {
  spaces!: Table<Space, string>;
  areas!: Table<LifeArea, string>;
  areaRatings!: Table<AreaRating, string>;
  goals!: Table<Goal, string>;
  keyResults!: Table<KeyResult, string>;
  milestones!: Table<Milestone, string>;
  tasks!: Table<Task, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  metrics!: Table<Metric, string>;
  metricEntries!: Table<MetricEntry, string>;
  dailyEntries!: Table<DailyEntry, string>;
  nodes!: Table<LibraryNode, string>;
  attachments!: Table<Attachment, string>;
  links!: Table<Link, string>;
  tags!: Table<Tag, string>;
  taggings!: Table<Tagging, string>;
  homeWidgets!: Table<HomeWidget, string>;
  profile!: Table<Profile, string>;
  reviews!: Table<Review, string>;
  events!: Table<CalendarEvent, string>;
  meta!: Table<MetaEntry, string>;

  constructor(name = 'life-dashboard') {
    super(name);
    this.version(1).stores({
      spaces: 'id, type, updatedAt',
      areas: 'id, spaceId, sortKey, updatedAt',
      areaRatings: 'id, spaceId, areaId, date, updatedAt',
      goals: 'id, spaceId, areaId, parentGoalId, horizon, status, updatedAt',
      keyResults: 'id, spaceId, goalId, updatedAt',
      milestones: 'id, spaceId, goalId, dueDate, updatedAt',
      tasks: 'id, spaceId, areaId, goalId, keyResultId, parentTaskId, status, doOn, dueAt, updatedAt',
      habits: 'id, spaceId, areaId, goalId, updatedAt',
      habitLogs: 'id, spaceId, habitId, day, [habitId+day], updatedAt',
      metrics: 'id, spaceId, updatedAt',
      metricEntries: 'id, spaceId, metricId, at, updatedAt',
      dailyEntries: 'id, spaceId, day, [spaceId+day], updatedAt',
      nodes: 'id, spaceId, parentId, kind, updatedAt',
      attachments: 'id, spaceId, nodeId, updatedAt',
      links: 'id, spaceId, [fromType+fromId], [toType+toId], updatedAt',
      tags: 'id, spaceId, name, updatedAt',
      taggings: 'id, spaceId, tagId, [targetType+targetId], updatedAt',
      homeWidgets: 'id, spaceId, sortKey, updatedAt',
      profile: 'id, updatedAt',
      reviews: 'id, spaceId, [period+periodStart], updatedAt',
      events: 'id, spaceId, start, updatedAt',
      meta: 'key',
    });
    // v2: tasks gain `time` and `repeatOfId` (not indexed).
    this.version(2)
      .stores({})
      .upgrade((tx) =>
        tx
          .table('tasks')
          .toCollection()
          .modify((task: Task) => normalizeTask(task)),
      );
    // v3: library nodes gain systemKey (indexed), favourites and page properties.
    this.version(3)
      .stores({ nodes: 'id, spaceId, parentId, kind, systemKey, updatedAt' })
      .upgrade((tx) =>
        tx
          .table('nodes')
          .toCollection()
          .modify((node: LibraryNode) => normalizeNode(node)),
      );
  }
}

export const db = new LifeDb();

/** Fills in fields added after a task was first saved. Also used when importing older exports. */
export function normalizeTask(task: Task): Task {
  task.time ??= null;
  task.repeatOfId ??= null;
  return task;
}

const SEEDED_FOLDERS: Record<string, string> = { Journal: 'journal', Areas: 'areas', Projects: 'projects' };

/** Fills in node fields added after a node was first saved. Also used when importing older exports. */
export function normalizeNode(node: LibraryNode): LibraryNode {
  node.systemKey ??= node.isSystem && node.parentId === null ? (SEEDED_FOLDERS[node.title] ?? null) : null;
  node.favoritedAt ??= null;
  node.areaId ??= null;
  node.goalId ??= null;
  return node;
}

/** Every table that holds user data, in a stable order (used by export and import). */
export const dataTableNames = [
  'spaces',
  'areas',
  'areaRatings',
  'goals',
  'keyResults',
  'milestones',
  'tasks',
  'habits',
  'habitLogs',
  'metrics',
  'metricEntries',
  'dailyEntries',
  'nodes',
  'attachments',
  'links',
  'tags',
  'taggings',
  'homeWidgets',
  'profile',
  'reviews',
  'events',
] as const satisfies ReadonlyArray<keyof LifeDb>;

export type DataTableName = (typeof dataTableNames)[number];
