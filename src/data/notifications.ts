import { toDay } from '@/domain/days';
import { DEFAULT_REMINDER_PREFS, dueReminders, firedToKeep, reviewWeekToNudge, type Reminder, type ReminderPrefs } from '@/domain/reminders';
import { getDailyEntry } from './checkIns';
import { db } from './db';
import { listReviewedWeeks } from './reviewActions';
import { tasksRepo } from './repositories';

/**
 * Notification settings belong to this device, like the privacy ones: they live in `meta`, so an
 * export never carries them. The record of what has fired lives beside them, so a reminder shows
 * once per device.
 */

const PREFS_KEY = 'notifications.prefs';
const FIRED_KEY = 'notifications.fired';

export async function getReminderPrefs(): Promise<ReminderPrefs> {
  const entry = await db.meta.get(PREFS_KEY);
  const saved = (entry?.value ?? {}) as Partial<ReminderPrefs>;
  return {
    ...DEFAULT_REMINDER_PREFS,
    ...saved,
    checkIn: { ...DEFAULT_REMINDER_PREFS.checkIn, ...saved.checkIn },
    review: { ...DEFAULT_REMINDER_PREFS.review, ...saved.review },
  };
}

export async function setReminderPrefs(patch: Partial<ReminderPrefs>): Promise<ReminderPrefs> {
  return db.transaction('rw', db.meta, async () => {
    const next = { ...(await getReminderPrefs()), ...patch };
    await db.meta.put({ key: PREFS_KEY, value: next });
    return next;
  });
}

async function readFired(): Promise<Record<string, string>> {
  return ((await db.meta.get(FIRED_KEY))?.value as Record<string, string> | undefined) ?? {};
}

/** What should show now and hasn't yet. Read-only. */
export async function collectDueReminders(now = new Date(), locked = false): Promise<Reminder[]> {
  const prefs = await getReminderPrefs();
  if (!prefs.enabled) return [];
  const today = toDay(now);
  const [tasks, entry, reviewed, fired] = await Promise.all([
    tasksRepo.list((t) => t.reminderAt !== null && t.status !== 'done'),
    getDailyEntry(today),
    listReviewedWeeks(),
    readFired(),
  ]);
  return dueReminders({
    now,
    prefs,
    tasks,
    checkedInToday: Boolean(entry && (entry.mood !== null || entry.energy !== null)),
    reviewDone: reviewed.includes(reviewWeekToNudge(today)),
    fired,
    hideDetails: prefs.hideDetails || locked,
  });
}

/** Records reminders as shown, and forgets ones too old to fire again. */
export async function markRemindersFired(keys: readonly string[], now = new Date()): Promise<void> {
  await db.transaction('rw', db.meta, async () => {
    const fired = firedToKeep(await readFired(), now);
    for (const key of keys) fired[key] = now.toISOString();
    await db.meta.put({ key: FIRED_KEY, value: fired });
  });
}
