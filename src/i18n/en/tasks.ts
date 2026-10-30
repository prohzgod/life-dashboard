import type { RRule, Weekday } from '@/domain/recurrence';

const DAY_NAMES: Record<Weekday, string> = { MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday', SA: 'Saturday', SU: 'Sunday' };
const listJoin = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

/** "Every Tuesday", "Every 3 days", "Monthly on day 1". */
function describe(rule: RRule): string {
  const n = rule.interval;
  const unit = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' }[rule.freq];
  const every = n === 1 ? `Every ${unit}` : n === 2 ? `Every other ${unit}` : `Every ${n} ${unit}s`;
  if (rule.freq === 'WEEKLY' && rule.byDay?.length) {
    const days = rule.byDay;
    if (days.join() === 'MO,TU,WE,TH,FR' && n === 1) return 'Every weekday';
    if (days.join() === 'SA,SU' && n === 1) return 'Every weekend';
    const names = listJoin(days.map((d) => DAY_NAMES[d]));
    return n === 1 ? `Every ${names}` : `${every} on ${names}`;
  }
  if (rule.freq === 'MONTHLY' && rule.byMonthDay?.length) {
    const dates = listJoin(rule.byMonthDay.map((d) => (d === -1 ? 'the last day' : `day ${d}`)));
    return n === 1 ? `Monthly on ${dates}` : `${every} on ${dates}`;
  }
  return every;
}

/** Tasks: the lists, rows, quick add, the detail drawer, and how repeats read. */
export const tasks = {
  repeat: {
    describe,
    /** "Repeats monthly, day 1" */
    short: (rule: RRule) => {
      if (rule.interval === 1 && rule.freq === 'MONTHLY' && rule.byMonthDay?.length === 1) {
        const d = rule.byMonthDay[0]!;
        return `Repeats monthly, ${d === -1 ? 'last day' : `day ${d}`}`;
      }
      const long = describe(rule);
      return `Repeats ${long.charAt(0).toLowerCase()}${long.slice(1)}`;
    },
    /** The short form inside a list of details, lower-case. */
    inline: (text: string) => text.charAt(0).toLowerCase() + text.slice(1),
  },
  markDone: (title: string) => `Mark “${title}” as done`,
  markNotDone: (title: string) => `Mark “${title}” as not done`,
  due: (date: string) => `due ${date}`,
  dueChip: (date: string, relative: boolean) => `Due ${relative ? date.toLowerCase() : date}`,
  high: 'high',
  highPriority: 'High priority',
  mediumPriority: 'Medium priority',
  lowPriority: 'Low priority',
  someday: 'Someday',
  /** The phone's tab, where space is tight. */
  somedayTab: 'Someday',
  task: 'Task',
  willBeSaved: 'Will be saved as',
  enter: 'Enter',
  example: 'e.g. “Pay rent every 1st #finance !high” becomes a monthly task on day 1, in Finance, high priority.',
  rolledYesterday: 'Rolled over from yesterday',
  rolledFrom: (when: string) => `Rolled over from ${when}`,
  views: { inbox: 'Inbox', today: 'Today', upcoming: 'Upcoming', anytime: 'Anytime', someday: 'Someday / maybe', logbook: 'Logbook' },
  subtitles: {
    today: 'Planned for today, plus anything that rolled over.',
    upcoming: 'What’s planned for the days ahead.',
    anytime: 'No date yet. Pick from here when you plan your day.',
    someday: 'Ideas worth keeping, without the pressure.',
    logbook: 'Everything you’ve finished, newest first.',
  },
  empty: {
    today: 'Nothing planned for today.',
    anytime: 'Nothing waiting without a date.',
    someday: 'No someday ideas yet.',
    logbook: 'Finished tasks will collect here.',
    upcoming: 'Nothing planned ahead yet.',
    filtered: 'Nothing open here.',
  },
  inboxToTriage: (n: number) => `${n} to triage. Clear it in 2 minutes, or during your weekly review.`,
  inboxZero: 'Inbox zero. Anything you capture lands here first.',
  upcoming: 'Upcoming',
  rolledOver: (n: number) => (n === 1 ? '1 task rolled over.' : `${n} tasks rolled over.`),
  addLabel: 'Add a task',
  addForToday: 'Add a task for today',
  addNoDate: 'Add a task, no date needed',
  tasks: 'Tasks',
  inArea: (area: string) => `Open tasks in ${area}, by date.`,
  withTag: 'Open tasks with this tag, by date.',
  lists: 'Task lists',
  inboxCount: (n: number) => `Inbox ${n}`,
  toSort: (n: number) => `${n} to sort. Accept, or open one for more.`,
  tomorrowDate: (date: string) => `Tomorrow, ${date}`,
  nav: { label: 'Task views', views: 'Views', areas: 'Areas', tags: 'Tags' },
  inbox: {
    label: 'To triage',
    captured: (ago: string) => `Captured ${ago}`,
    suggested: 'Suggested:',
    accept: 'Accept',
    acceptAs: (title: string, as: string) => `Accept “${title}” as ${as}`,
    more: (title: string) => `More options for “${title}”`,
  },
  detail: {
    label: 'Task details',
    gone: 'This task was deleted.',
    markDone: 'Mark as done',
    markNotDone: 'Mark as not done',
    area: 'Area',
    noArea: 'No area',
    goal: 'Goal',
    noGoal: 'Not linked to a goal',
    doOn: 'Do on',
    time: 'Time',
    deadline: 'Deadline',
    repeats: 'Repeats',
    noRepeat: 'Doesn’t repeat',
    everyDay: 'Every day',
    everyWeekday: 'Every weekday',
    everyNamed: (day: string) => `Every ${day}`,
    everyOtherNamed: (day: string) => `Every other ${day}`,
    monthlyOn: (d: number) => `Monthly on day ${d}`,
    everyYear: 'Every year',
    nextAfter: (date: string) => `Next after this one: ${date}`,
    reminder: 'Reminder',
    priority: 'Priority',
    none: 'None',
    priorities: { high: 'High', medium: 'Medium', low: 'Low' },
    estimate: 'Estimate',
    tags: 'Tags',
    tagsPlaceholder: '#bills #errand',
    subtasks: 'Subtasks',
    notes: 'Notes',
    notesPlaceholder: 'Anything worth remembering about this task',
    moveToAnytime: 'Move to Anytime',
    someday: 'Someday',
    delete: 'Delete',
    created: (ago: string) => `Created ${ago}`,
    doneAgo: (ago: string) => `, done ${ago}`,
    stored: ', stored on this device',
    backTo: (context: string) => `Back to ${context}`,
    close: 'Close details',
    title: 'Task title',
    addSubtask: 'Add a subtask',
  },
};
