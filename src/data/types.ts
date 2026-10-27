import type { Area } from '@design/tokens';

/** Fields every record has, so sync and encryption can be added later. */
export interface BaseRecord {
  /** ULID created on this device. */
  id: string;
  spaceId: string;
  /** UTC ISO timestamps. */
  createdAt: string;
  updatedAt: string;
  /** Soft delete: set instead of removing the row. */
  deletedAt: string | null;
}

/** A local calendar day, `YYYY-MM-DD`. */
export type LocalDay = string;

export interface Space extends BaseRecord {
  name: string;
  type: 'personal' | 'shared';
}

export interface LifeArea extends BaseRecord {
  name: string;
  /** One of the area color tokens: --{color}, --{color}-soft, --{color}-ink. */
  color: Area;
  icon: string | null;
  sortKey: string;
}

export interface AreaRating extends BaseRecord {
  areaId: string;
  date: LocalDay;
  /** 1–10 */
  score: number;
}

export type GoalHorizon = 'vision' | 'year' | 'quarter' | 'month' | 'week';
export type GoalType = 'target' | 'average' | 'milestone' | 'habit' | 'okr' | 'qualitative';
export type ProgressMethod =
  | 'taskCount'
  | 'weightedTasks'
  | 'metric'
  | 'keyResultAverage'
  | 'milestones'
  | 'habitConsistency'
  | 'manual'
  | 'childRollup';
export type GoalStatus = 'active' | 'paused' | 'done' | 'dropped';

export interface Goal extends BaseRecord {
  areaId: string | null;
  parentGoalId: string | null;
  title: string;
  why: string;
  horizon: GoalHorizon;
  type: GoalType;
  progressMethod: ProgressMethod;
  startValue: number | null;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  startDate: LocalDay;
  endDate: LocalDay;
  status: GoalStatus;
  commitment: 'committed' | 'aspirational';
  /** Every update to currentValue, oldest first, for the progress-vs-pace chart. */
  progressLog: Array<{ at: string; value: number }>;
  /** Vision goals only: the year's one word. */
  wordOfYear: string | null;
}

export interface KeyResult extends BaseRecord {
  goalId: string;
  title: string;
  start: number;
  target: number;
  current: number;
  weight: number;
}

export interface Milestone extends BaseRecord {
  goalId: string;
  title: string;
  dueDate: LocalDay | null;
  doneAt: string | null;
}

export type TaskStatus = 'inbox' | 'open' | 'done' | 'someday';

export interface Task extends BaseRecord {
  areaId: string | null;
  goalId: string | null;
  keyResultId: string | null;
  parentTaskId: string | null;
  title: string;
  notes: string;
  status: TaskStatus;
  /** 1 (highest) to 3, or null for none. */
  priority: 1 | 2 | 3 | null;
  /** The day you plan to do it. */
  doOn: LocalDay | null;
  /** Local "HH:MM" the task is set for on its day, e.g. from "Call Mom at 18:00". */
  time: string | null;
  /** Hard deadline, UTC ISO. */
  dueAt: string | null;
  estimateMin: number | null;
  /** iCalendar RRULE, e.g. "FREQ=WEEKLY;BYDAY=SU". */
  rrule: string | null;
  reminderAt: string | null;
  completedAt: string | null;
  sortKey: string;
  /** For a repeating task: the occurrence this one was created from when that one was done. */
  repeatOfId: string | null;
}

export type HabitSchedule =
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] }
  | { type: 'timesPerWeek'; count: number };

export interface Habit extends BaseRecord {
  areaId: string | null;
  goalId: string | null;
  title: string;
  kind: 'yesno' | 'count' | 'duration' | 'negative';
  /** Daily target: 1 for yes/no, a count, or minutes. */
  target: number;
  /** What `target` counts, e.g. "glasses". */
  unit: string | null;
  schedule: HabitSchedule;
  cue: string | null;
  archivedAt: string | null;
}

export interface HabitLog extends BaseRecord {
  habitId: string;
  day: LocalDay;
  value: number;
  status: 'done' | 'skipped' | 'missed';
}

export interface Metric extends BaseRecord {
  name: string;
  unit: string | null;
  valueType: 'number' | 'scale' | 'yesno';
  aggregation: 'sum' | 'average' | 'last';
  target: number | null;
}

export interface MetricEntry extends BaseRecord {
  metricId: string;
  at: string;
  value: number;
  source: 'manual' | 'health' | 'import';
}

export interface DailyEntry extends BaseRecord {
  day: LocalDay;
  /** 1–5 */
  mood: number | null;
  /** 1–5 */
  energy: number | null;
  sleepMinutes: number | null;
  line: string;
  photoId: string | null;
  journalNodeId: string | null;
}

export type NodeKind = 'folder' | 'page' | 'image' | 'file' | 'gallery';

/** A Library item: folders, pages and media in one tree. */
export interface LibraryNode extends BaseRecord {
  parentId: string | null;
  kind: NodeKind;
  title: string;
  /** Editor document (BlockNote JSON). */
  contentJson: unknown;
  /** Plain text of the content, for search. */
  contentText: string;
  /** Fractional index among siblings. */
  sortKey: string;
  icon: string | null;
  /** Built-in folders (Journal, Areas, Projects) can't be deleted or renamed. */
  isSystem: boolean;
  /** Stable name for built-in and journal nodes: "journal", "areas", "projects", "journal:2026", "journal:2026-10", "journal:2026-10-27". */
  systemKey: string | null;
  /** Set when the page is a favourite. */
  favoritedAt: string | null;
  /** Page properties. */
  areaId: string | null;
  goalId: string | null;
}

export interface Attachment extends BaseRecord {
  nodeId: string | null;
  blob: Blob;
  thumbBlob: Blob | null;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  takenAt: string | null;
  caption: string;
}

export type LinkTarget = 'goal' | 'task' | 'habit' | 'node' | 'area' | 'dailyEntry';

export interface Link extends BaseRecord {
  fromType: LinkTarget;
  fromId: string;
  toType: LinkTarget;
  toId: string;
}

export interface Tag extends BaseRecord {
  name: string;
}

export interface Tagging extends BaseRecord {
  tagId: string;
  targetType: LinkTarget;
  targetId: string;
}

export type HomeWidgetKind =
  | 'today'
  | 'goals'
  | 'calendar'
  | 'review'
  | 'progress'
  | 'sleep'
  | 'finance'
  | 'vision'
  | 'assistant'
  | 'steps'
  | 'pinned';

export interface HomeWidget extends BaseRecord {
  kind: HomeWidgetKind;
  size: 'S' | 'M' | 'L';
  sortKey: string;
  hidden: boolean;
  refType: LinkTarget | null;
  refId: string | null;
}

export type ProfileField = 'displayName' | 'quote' | 'gender' | 'birthday' | 'pronouns' | 'occupation' | 'city' | 'email' | 'phone';

/** A single row. */
export interface Profile extends BaseRecord {
  displayName: string;
  quote: string;
  gender: string;
  birthday: LocalDay | null;
  pronouns: string;
  occupation: string;
  city: string;
  email: string;
  phone: string;
  photoAttachmentId: string | null;
  customFields: Array<{ id: string; label: string; value: string }>;
  /** Keyed by a ProfileField or a custom field id. */
  visibility: Record<string, 'shown' | 'blurred'>;
}

export interface Review extends BaseRecord {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  periodStart: LocalDay;
  answers: Record<string, unknown>;
  autoSummary: string | null;
  completedAt: string | null;
}

export interface CalendarEvent extends BaseRecord {
  source: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  readOnly: boolean;
}

/** Device bookkeeping (seed version, current space). Not user data, not exported. */
export interface MetaEntry {
  key: string;
  value: unknown;
}
