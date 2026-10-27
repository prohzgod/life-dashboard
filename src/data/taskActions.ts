import { generateKeyBetween } from 'fractional-indexing';
import type { Day } from '@/domain/days';
import { parseCapture, type ParsedCapture } from '@/domain/quickAdd';
import { nextAfterCompletion, parseRRule } from '@/domain/recurrence';
import { looksLikeSomeday, suggestArea } from '@/domain/suggest';
import { db } from './db';
import { nowIso } from './ids';
import { areasRepo, taggingsRepo, tagsRepo, tasksRepo } from './repositories';
import type { NewRecord } from './repository';
import type { LifeArea, Task } from './types';

/** Reads a quick-add line against this space's areas. */
export async function parseQuickAdd(text: string, today: Day): Promise<ParsedCapture> {
  const areas = await areasRepo.listOrdered();
  return parseCapture(text, { today, areaNames: areas.map((a) => a.name) });
}

async function nextSortKey(): Promise<string> {
  const tasks = await db.tasks.toArray();
  const last = tasks.reduce<string | null>((max, t) => (max === null || t.sortKey > max ? t.sortKey : max), null);
  return generateKeyBetween(last, null);
}

function blankTask(): Omit<NewRecord<Task>, 'title' | 'sortKey'> {
  return {
    areaId: null,
    goalId: null,
    keyResultId: null,
    parentTaskId: null,
    notes: '',
    status: 'open',
    priority: null,
    doOn: null,
    time: null,
    dueAt: null,
    estimateMin: null,
    rrule: null,
    reminderAt: null,
    completedAt: null,
    repeatOfId: null,
  };
}

/** A deadline day becomes 17:00 local time on that day, as a UTC timestamp. */
export function deadlineFromDay(day: Day): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 17, 0).toISOString();
}

type CaptureOptions = {
  today: Day;
  /** "inbox" to triage later (⌘N, Inbox); "open" to plan straight away (Today's add field). */
  status: 'inbox' | 'open';
  /** Day to use when the text names none (Today's add field uses today). */
  defaultDoOn?: Day | null;
};

/** Creates a task from a quick-add line: parsed fields, area, tags and all. */
export async function captureTask(text: string, { today, status, defaultDoOn = null }: CaptureOptions): Promise<Task> {
  const parsed = await parseQuickAdd(text, today);
  const areas = await areasRepo.listOrdered();
  const area = areas.find((a) => a.name === parsed.areaName) ?? null;
  const task = await tasksRepo.create({
    ...blankTask(),
    title: parsed.title,
    status: parsed.someday && status === 'open' ? 'someday' : status,
    areaId: area?.id ?? null,
    priority: parsed.priority,
    doOn: parsed.doOn ?? (parsed.someday ? null : defaultDoOn),
    time: parsed.time,
    dueAt: parsed.dueOn ? deadlineFromDay(parsed.dueOn) : null,
    estimateMin: parsed.estimateMin,
    rrule: parsed.rrule,
    sortKey: await nextSortKey(),
  });
  if (parsed.tags.length) await setTaskTags(task.id, parsed.tags);
  return task;
}

export async function addSubtask(parent: Task, title: string): Promise<Task> {
  return tasksRepo.create({ ...blankTask(), title, parentTaskId: parent.id, areaId: parent.areaId, sortKey: await nextSortKey() });
}

/**
 * Marks a task done. A repeating task also gets its next occurrence, linked by `repeatOfId`
 * so un-checking can take it back.
 */
export async function completeTask(id: string, today: Day): Promise<void> {
  await db.transaction('rw', [db.tasks, db.taggings, db.tags], async () => {
    const task = await tasksRepo.get(id);
    if (!task || task.status === 'done') return;
    await tasksRepo.update(id, { status: 'done', completedAt: nowIso() });

    const rule = task.rrule ? parseRRule(task.rrule) : null;
    if (!rule || task.parentTaskId) return;
    const existing = await tasksRepo.list((t) => t.repeatOfId === id);
    if (existing.length) return;
    const next = await tasksRepo.create({
      ...blankTask(),
      title: task.title,
      notes: task.notes,
      areaId: task.areaId,
      goalId: task.goalId,
      keyResultId: task.keyResultId,
      priority: task.priority,
      time: task.time,
      estimateMin: task.estimateMin,
      rrule: task.rrule,
      doOn: nextAfterCompletion(rule, task.doOn, today),
      sortKey: task.sortKey,
      repeatOfId: id,
    });
    await setTaskTags(next.id, (await tagsForTask(id)).map((t) => t.name));
  });
}

/** Un-checks a task and removes the next occurrence it created, if that one isn't done yet. */
export async function reopenTask(id: string): Promise<void> {
  await db.transaction('rw', [db.tasks, db.taggings], async () => {
    const task = await tasksRepo.get(id);
    if (!task || task.status !== 'done') return;
    await tasksRepo.update(id, { status: 'open', completedAt: null });
    for (const next of await tasksRepo.list((t) => t.repeatOfId === id && t.status !== 'done')) {
      await deleteTask(next.id);
    }
  });
}

export async function toggleTask(task: Pick<Task, 'id' | 'status'>, today: Day): Promise<void> {
  if (task.status === 'done') await reopenTask(task.id);
  else await completeTask(task.id, today);
}

/** Soft-deletes a task with its subtasks and tags. */
export async function deleteTask(id: string): Promise<void> {
  for (const sub of await tasksRepo.where('parentTaskId', id)) await tasksRepo.remove(sub.id);
  for (const tagging of await taggingsRepo.list((t) => t.targetType === 'task' && t.targetId === id)) await taggingsRepo.remove(tagging.id);
  await tasksRepo.remove(id);
}

/** Moves every rolled-over task (planned before today, still open) onto today. */
export async function moveRolledOverToToday(today: Day): Promise<number> {
  const rolled = await tasksRepo.list((t) => t.status === 'open' && !!t.doOn && t.doOn < today && !t.parentTaskId);
  for (const task of rolled) await tasksRepo.update(task.id, { doOn: today });
  return rolled.length;
}

export type InboxSuggestion = {
  status: 'open' | 'someday';
  area: LifeArea | null;
};

/** What Accept would do with an Inbox item: keep its own area, or guess one from the words. */
export function suggestForInbox(task: Task, areas: readonly LifeArea[]): InboxSuggestion {
  const own = areas.find((a) => a.id === task.areaId) ?? null;
  const someday = !task.doOn && !task.dueAt && !task.rrule && looksLikeSomeday(task.title);
  return { status: someday ? 'someday' : 'open', area: own ?? suggestArea(task.title, areas) };
}

export async function acceptInboxTask(task: Task, suggestion: InboxSuggestion): Promise<void> {
  await tasksRepo.update(task.id, { status: suggestion.status, areaId: suggestion.area?.id ?? task.areaId });
}

/** Replaces a task's tags with these names, creating tags that don't exist yet. */
export async function setTaskTags(taskId: string, names: readonly string[]): Promise<void> {
  const wanted = [...new Set(names.map((n) => n.replace(/^#/, '').trim().toLowerCase()).filter(Boolean))];
  const allTags = await tagsRepo.list();
  const current = await taggingsRepo.list((t) => t.targetType === 'task' && t.targetId === taskId);
  const tagIds: string[] = [];
  for (const name of wanted) {
    const tag = allTags.find((t) => t.name === name) ?? (await tagsRepo.create({ name }));
    tagIds.push(tag.id);
  }
  for (const tagging of current) if (!tagIds.includes(tagging.tagId)) await taggingsRepo.remove(tagging.id);
  for (const tagId of tagIds) {
    if (!current.some((t) => t.tagId === tagId)) await taggingsRepo.create({ tagId, targetType: 'task', targetId: taskId });
  }
}

export async function tagsForTask(taskId: string) {
  const taggings = await taggingsRepo.list((t) => t.targetType === 'task' && t.targetId === taskId);
  const tags = await tagsRepo.list();
  return taggings.map((t) => tags.find((tag) => tag.id === t.tagId)).filter((t) => !!t);
}

/** Tag names per task id, for showing tags in lists. */
export async function taskTagMap(): Promise<Map<string, string[]>> {
  const [taggings, tags] = await Promise.all([taggingsRepo.list((t) => t.targetType === 'task'), tagsRepo.list()]);
  const names = new Map(tags.map((t) => [t.id, t.name]));
  const map = new Map<string, string[]>();
  for (const t of taggings) {
    const name = names.get(t.tagId);
    if (name) map.set(t.targetId, [...(map.get(t.targetId) ?? []), name]);
  }
  return map;
}

/** Tags with at least one live task, by name. */
export async function listTaskTags(): Promise<Array<{ id: string; name: string; count: number }>> {
  const [taggings, tags, tasks] = await Promise.all([taggingsRepo.list((t) => t.targetType === 'task'), tagsRepo.list(), tasksRepo.list()]);
  const live = new Set(tasks.filter((t) => t.status !== 'done').map((t) => t.id));
  return tags
    .map((tag) => ({ id: tag.id, name: tag.name, count: taggings.filter((t) => t.tagId === tag.id && live.has(t.targetId)).length }))
    .filter((t) => t.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}
