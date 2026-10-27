import { db } from './db';
import { createRepository } from './repository';
import type {
  AreaRating,
  Attachment,
  Calendar,
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
  LocalDay,
  Metric,
  MetricEntry,
  Milestone,
  Profile,
  Review,
  Space,
  Tag,
  Tagging,
  Task,
  VisionCard,
} from './types';

const bySortKey = <T extends { sortKey: string }>(a: T, b: T) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0);

export const spacesRepo = createRepository<Space>(db.spaces, { scoped: false });
export const profileRepo = createRepository<Profile>(db.profile, { scoped: false });

const areas = createRepository<LifeArea>(db.areas);
export const areasRepo = {
  ...areas,
  /** Areas in their display order. */
  async listOrdered(): Promise<LifeArea[]> {
    return (await areas.list()).sort(bySortKey);
  },
};
export const areaRatingsRepo = createRepository<AreaRating>(db.areaRatings);

const goals = createRepository<Goal>(db.goals);
export const goalsRepo = {
  ...goals,
  async listChildren(parentGoalId: string): Promise<Goal[]> {
    return goals.where('parentGoalId', parentGoalId);
  },
  /** Goals with no parent: the top of the goal tree. */
  async listRoots(): Promise<Goal[]> {
    return goals.list((g) => g.parentGoalId === null);
  },
};
export const keyResultsRepo = createRepository<KeyResult>(db.keyResults);
export const milestonesRepo = createRepository<Milestone>(db.milestones);

const tasks = createRepository<Task>(db.tasks);
export const tasksRepo = {
  ...tasks,
  async listForDay(day: LocalDay): Promise<Task[]> {
    return (await tasks.where('doOn', day)).sort(bySortKey);
  },
};

export const habitsRepo = createRepository<Habit>(db.habits);
const habitLogs = createRepository<HabitLog>(db.habitLogs);
export const habitLogsRepo = {
  ...habitLogs,
  async listForHabit(habitId: string): Promise<HabitLog[]> {
    return (await habitLogs.where('habitId', habitId)).sort((a, b) => a.day.localeCompare(b.day));
  },
};

export const metricsRepo = createRepository<Metric>(db.metrics);
export const metricEntriesRepo = createRepository<MetricEntry>(db.metricEntries);
export const dailyEntriesRepo = createRepository<DailyEntry>(db.dailyEntries);

const nodes = createRepository<LibraryNode>(db.nodes);
export const nodesRepo = {
  ...nodes,
  /** Children of a folder in order; `null` for the top level of the Library. */
  async listChildren(parentId: string | null): Promise<LibraryNode[]> {
    const children = parentId === null ? await nodes.list((n) => n.parentId === null) : await nodes.where('parentId', parentId);
    return children.sort(bySortKey);
  },
};

export const attachmentsRepo = createRepository<Attachment>(db.attachments);
export const linksRepo = createRepository<Link>(db.links);
export const tagsRepo = createRepository<Tag>(db.tags);
export const taggingsRepo = createRepository<Tagging>(db.taggings);
export const homeWidgetsRepo = createRepository<HomeWidget>(db.homeWidgets);
export const reviewsRepo = createRepository<Review>(db.reviews);
export const calendarsRepo = createRepository<Calendar>(db.calendars);
export const eventsRepo = createRepository<CalendarEvent>(db.events);

export const visionCardsRepo = createRepository<VisionCard>(db.visionCards);
