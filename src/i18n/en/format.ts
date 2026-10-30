const weekdaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weekdaysLong = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const numberWords = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** Dates, times, durations and counts. */
export const format = {
  weekdaysShort,
  weekdaysLong,
  /** Mon-first initials for week strips. */
  weekdayInitials: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  monthsShort,
  monthsLong,
  /** "Thu 1 Oct" */
  dayShort: (d: Date) => `${weekdaysShort[d.getDay()]} ${d.getDate()} ${monthsShort[d.getMonth()]}`,
  /** "Tuesday, 29 September 2026" */
  dayLong: (d: Date) => `${weekdaysLong[d.getDay()]}, ${d.getDate()} ${monthsLong[d.getMonth()]} ${d.getFullYear()}`,
  /** "Tuesday, 29 September" */
  weekdayDate: (d: Date) => `${weekdaysLong[d.getDay()]}, ${d.getDate()} ${monthsLong[d.getMonth()]}`,
  /** "29 September 2026" */
  date: (d: Date) => `${d.getDate()} ${monthsLong[d.getMonth()]} ${d.getFullYear()}`,
  /** "1 Oct" */
  dayMonth: (d: Date) => `${d.getDate()} ${monthsShort[d.getMonth()]}`,
  /** "October 2026" */
  monthYear: (d: Date) => `${monthsLong[d.getMonth()]} ${d.getFullYear()}`,
  /** "Thu 1 Oct, 17:00" */
  dateTime: (d: Date, time: string) => `${weekdaysShort[d.getDay()]} ${d.getDate()} ${monthsShort[d.getMonth()]}, ${time}`,
  today: 'Today',
  tomorrow: 'Tomorrow',
  yesterday: 'Yesterday',
  /** "10 min", "1h 35m", "2h" */
  minutes: (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`),
  justNow: 'just now',
  minutesAgo: (n: number) => `${n} min ago`,
  hoursAgo: (n: number) => (n === 1 ? 'an hour ago' : `${n} hours ago`),
  yesterdayLower: 'yesterday',
  daysAgo: (n: number) => `${n} days ago`,
  /** "Three" for 3, the digits from 11 up. */
  numberWord: (n: number) => numberWords[n] ?? String(n),
  /** "1 task", "3 tasks". Vietnamese has no plural, so `many` is ignored there. */
  plural: (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`,
  /** Joins a list for a sentence: "a, b and c". */
  list: (items: string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`),
  dash: '–',
};
