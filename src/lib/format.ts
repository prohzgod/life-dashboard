import { addDays, dayToDate, type Day } from '@/domain/days';

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Thu 1 Oct" */
export function formatDayShort(day: Day): string {
  const d = dayToDate(day);
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "Tuesday, 29 September 2026" */
export function formatDayLong(day: Day): string {
  const d = dayToDate(day);
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Today", "Tomorrow", "Yesterday", or "Thu 1 Oct". */
export function formatDayRelative(day: Day, today: Day): string {
  if (day === today) return 'Today';
  if (day === addDays(today, 1)) return 'Tomorrow';
  if (day === addDays(today, -1)) return 'Yesterday';
  return formatDayShort(day);
}

export function weekdayName(day: Day): string {
  return WEEKDAYS_LONG[dayToDate(day).getDay()]!;
}

/** "18:00" in local time. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "Thu 1 Oct, 17:00" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${formatTime(iso)}`;
}

/** "10 min", "1h 35m", "2h" */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** "just now", "5 min ago", "3 hours ago", "yesterday", "4 days ago", then a date. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** "Three" for 3, the digits from 11 up. */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "glasses" → "glass", "pages" → "page". Good enough for habit units. */
export function singular(word: string): string {
  if (/(ss|sh|ch|x)es$/i.test(word)) return word.slice(0, -2);
  return word.replace(/s$/i, '');
}
