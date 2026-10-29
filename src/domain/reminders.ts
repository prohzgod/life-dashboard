import { addDays, startOfWeek, toDay, weekday, type Day } from './days';

/** Notification settings belong to this device. Times are local "HH:MM"; weekday 0 is Sunday. */
export type ReminderPrefs = {
  enabled: boolean;
  tasks: boolean;
  checkIn: { on: boolean; time: string };
  review: { on: boolean; weekday: number; time: string };
  /** Say "You have a reminder" instead of naming the task. */
  hideDetails: boolean;
};

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  enabled: false,
  tasks: true,
  checkIn: { on: false, time: '20:00' },
  review: { on: true, weekday: 0, time: '18:00' },
  hideDetails: false,
};

export type ReminderTask = { id: string; title: string; status: string; reminderAt: string | null };

export type ReminderInput = {
  now: Date;
  prefs: ReminderPrefs;
  tasks: readonly ReminderTask[];
  checkedInToday: boolean;
  /** Whether the week from reviewWeekToNudge(today) is reviewed. */
  reviewDone: boolean;
  /** Keys already shown, with when. */
  fired: Readonly<Record<string, string>>;
  /** Hide what a reminder is about (asked for, or the app is locked). */
  hideDetails: boolean;
};

export type Reminder = { key: string; kind: 'task' | 'check-in' | 'review'; title: string; body: string; url: string };

/** A reminder missed while the app was closed still shows, up to a day late. */
const LATE_LIMIT_MS = 24 * 3600_000;
const KEEP_FIRED_MS = 3 * 24 * 3600_000;

function minutesOf(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
}

/** The week a review nudge is about: the week ending today on Sunday, otherwise last week. */
export function reviewWeekToNudge(today: Day): Day {
  const thisWeek = startOfWeek(today);
  return weekday(today) === 0 ? thisWeek : addDays(thisWeek, -7);
}

/** Everything that should be shown now and hasn't been yet. */
export function dueReminders({ now, prefs, tasks, checkedInToday, reviewDone, fired, hideDetails }: ReminderInput): Reminder[] {
  if (!prefs.enabled) return [];
  const out: Reminder[] = [];
  const today = toDay(now);
  const minuteNow = now.getHours() * 60 + now.getMinutes();
  const hidden = (r: Reminder): Reminder => (hideDetails ? { ...r, title: 'Life Dashboard', body: 'You have a reminder.' } : r);

  if (prefs.tasks) {
    for (const task of tasks) {
      if (!task.reminderAt || task.status === 'done') continue;
      const when = Date.parse(task.reminderAt);
      if (when > now.getTime() || now.getTime() - when > LATE_LIMIT_MS) continue;
      const key = `task:${task.id}:${task.reminderAt}`;
      if (fired[key]) continue;
      out.push(hidden({ key, kind: 'task', title: 'Reminder', body: task.title, url: `/tasks/${task.id}` }));
    }
  }

  if (prefs.checkIn.on && !checkedInToday && minuteNow >= minutesOf(prefs.checkIn.time)) {
    const key = `check-in:${today}`;
    if (!fired[key]) out.push(hidden({ key, kind: 'check-in', title: 'Time for your check-in', body: 'About 30 seconds: mood, energy and one line.', url: '/today' }));
  }

  if (prefs.review.on && !reviewDone && weekday(today) === prefs.review.weekday && minuteNow >= minutesOf(prefs.review.time)) {
    const key = `review:${today}`;
    if (!fired[key]) out.push(hidden({ key, kind: 'review', title: 'Your weekly review', body: "About 15 minutes. Start when you're ready.", url: '/review' }));
  }

  return out;
}

/** Drops fired keys older than three days; nothing that old can fire again. */
export function firedToKeep(fired: Readonly<Record<string, string>>, now: Date): Record<string, string> {
  return Object.fromEntries(Object.entries(fired).filter(([, at]) => now.getTime() - Date.parse(at) <= KEEP_FIRED_MS));
}
