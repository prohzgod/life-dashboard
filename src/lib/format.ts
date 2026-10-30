import { addDays, dayToDate, type Day } from '@/domain/days';
import { messages, readLocale } from '@/i18n';

const f = () => messages().format;

/** "Thu 1 Oct" */
export function formatDayShort(day: Day): string {
  return f().dayShort(dayToDate(day));
}

/** "Tuesday, 29 September 2026" */
export function formatDayLong(day: Day): string {
  return f().dayLong(dayToDate(day));
}

/** "29 September 2026" */
export function formatDate(day: Day): string {
  return f().date(dayToDate(day));
}

/** "1 Oct" */
export function formatDayMonth(day: Day): string {
  return f().dayMonth(dayToDate(day));
}

/** "Today", "Tomorrow", "Yesterday", or "Thu 1 Oct". */
export function formatDayRelative(day: Day, today: Day): string {
  if (day === today) return f().today;
  if (day === addDays(today, 1)) return f().tomorrow;
  if (day === addDays(today, -1)) return f().yesterday;
  return formatDayShort(day);
}

export function weekdayName(day: Day): string {
  return f().weekdaysLong[dayToDate(day).getDay()]!;
}

/** "18:00" in local time. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "Thu 1 Oct, 17:00" */
export function formatDateTime(iso: string): string {
  return f().dateTime(new Date(iso), formatTime(iso));
}

/** "10 min", "1h 35m", "2h" */
export function formatMinutes(minutes: number): string {
  return f().minutes(minutes);
}

/** "just now", "5 min ago", "3 hours ago", "yesterday", "4 days ago", then a date. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return f().justNow;
  if (minutes < 60) return f().minutesAgo(minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return f().hoursAgo(hours);
  const days = Math.round(hours / 24);
  if (days === 1) return f().yesterdayLower;
  if (days < 7) return f().daysAgo(days);
  return f().dayMonth(new Date(iso));
}

/** "Three" for 3, the digits from 11 up. */
export function numberWord(n: number): string {
  return f().numberWord(n);
}

/** "3 tasks". Pass words from the dictionary; Vietnamese ignores `many`. */
export function plural(n: number, one: string, many?: string): string {
  return f().plural(n, one, many);
}

/** "glasses" → "glass", "pages" → "page". Good enough for habit units. */
export function singular(word: string): string {
  if (readLocale() !== 'en') return word;
  if (/(ss|sh|ch|x)es$/i.test(word)) return word.slice(0, -2);
  return word.replace(/s$/i, '');
}
