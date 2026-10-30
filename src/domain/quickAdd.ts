import { addDays, type Day, dayOfMonth, daysInMonth, isDay, makeDay, month, startOfWeek, weekday, year } from './days';
import { firstOnOrAfter, formatRRule, type RRule, type Weekday } from './recurrence';

export type Priority = 1 | 2 | 3;

export type ParsedCapture = {
  /** What's left once dates, repeats, tags and so on are taken out. */
  title: string;
  /** The day to do it. */
  doOn: Day | null;
  /** A deadline from "by …" / "before …" / "due …". */
  dueOn: Day | null;
  /** "HH:MM" from "at 3pm" or "18:00". */
  time: string | null;
  rrule: string | null;
  /** The area's name as given in `areaNames`, from "#finance". */
  areaName: string | null;
  /** Other #words, lower-cased, without the #. */
  tags: string[];
  priority: Priority | null;
  estimateMin: number | null;
  someday: boolean;
};

type Options = { today: Day; areaNames: readonly string[] };

const WEEKDAY_WORDS: Array<[RegExp, Weekday]> = [
  [/^mon(day)?s?$/i, 'MO'],
  [/^tue(s|sday)?s?$/i, 'TU'],
  [/^wed(nesday)?s?$/i, 'WE'],
  [/^thu(rs|rsday)?s?$/i, 'TH'],
  [/^fri(day)?s?$/i, 'FR'],
  [/^sat(urday)?s?$/i, 'SA'],
  [/^sun(day)?s?$/i, 'SU'],
];
const WEEKDAY = '(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day)?s?|(?:tues|wednes|thurs|satur)days?';
const WEEKDAY_INDEX: Record<Weekday, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const ORD = '(?:st|nd|rd|th)?';
const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, other: 2 };

/** A date phrase, without the leading word ("on", "by"…). Order matters: longest first. */
const DATE_PHRASE = [
  `\\d{4}-\\d{2}-\\d{2}`,
  `${MONTH}\\s+\\d{1,2}${ORD}`,
  `\\d{1,2}${ORD}\\s+(?:of\\s+)?${MONTH}`,
  `today|tonight|tomorrow|tmrw|tmr`,
  `next\\s+(?:week|month|${WEEKDAY})`,
  `this\\s+(?:weekend|${WEEKDAY})`,
  `in\\s+(?:\\d+|a|an|one|two|three|four|five|six)\\s+(?:days?|weeks?|months?)`,
  WEEKDAY,
].join('|');

const VI_WEEKDAYS: Array<[string, string]> = [
  ['thứ hai|thứ 2', 'monday'],
  ['thứ ba|thứ 3', 'tuesday'],
  ['thứ tư|thứ 4', 'wednesday'],
  ['thứ năm|thứ 5', 'thursday'],
  ['thứ sáu|thứ 6', 'friday'],
  ['thứ bảy|thứ 7', 'saturday'],
  ['chủ nhật', 'sunday'],
];
const VI_WEEKDAY = VI_WEEKDAYS.map(([vi]) => vi).join('|');
const VI_DATES: Array<[RegExp, string]> = [
  [/^(?:hôm nay|tối nay)$/, 'today'],
  [/^ngày mai$/, 'tomorrow'],
  [/^(?:ngày kia|ngày mốt)$/, 'in 2 days'],
  [/^(?:tuần sau|tuần tới)$/, 'next week'],
  [/^(?:tháng sau|tháng tới)$/, 'next month'],
  [/^cuối tuần này$/, 'this weekend'],
  ...VI_WEEKDAYS.map(([vi, en]): [RegExp, string] => [new RegExp(`^(?:${vi})(?: (?:tới|này))?$`), en]),
];
const VI_DATE = `hôm nay|tối nay|ngày mai|ngày kia|ngày mốt|tuần sau|tuần tới|tháng sau|tháng tới|cuối tuần này|(?:${VI_WEEKDAY})(?:\\s+(?:tới|này))?`;
const VI_UNITS: Record<string, string> = { ngày: 'day', tuần: 'week', tháng: 'month', năm: 'year' };
const VI_PRIORITY: Record<string, string> = { cao: 'high', vừa: 'medium', thấp: 'low' };

function viDate(phrase: string): string {
  const p = phrase.toLowerCase().replace(/\s+/g, ' ').trim();
  return VI_DATES.find(([pattern]) => pattern.test(p))?.[1] ?? p;
}

/**
 * Vietnamese phrases rewritten into the English ones the parser reads ("ngày mai lúc 18:00" →
 * "tomorrow at 18:00"). Only whole phrases are rewritten, so a stray word stays in the title.
 */
function fromVietnamese(text: string): string {
  // `to` returns null to leave the match as it was.
  const swap = (pattern: string, to: (...m: string[]) => string | null) => {
    text = text.replace(new RegExp(pattern, 'giu'), (match: string, ...args) => {
      const out = to(...(args.slice(0, -2) as string[]));
      return out === null ? match : ` ${out} `;
    });
  };
  swap(`\\s!(cao|vừa|thấp)(?=\\s)`, (p) => `!${VI_PRIORITY[p!.toLowerCase()]}`);
  swap(`\\s(?:mỗi|hằng|hàng)\\s+ngày\\s+trong\\s+tuần(?=\\s)`, () => 'every weekday');
  swap(`\\s(?:mỗi|hằng|hàng)\\s+cuối\\s+tuần(?=\\s)`, () => 'every weekend');
  swap(`\\s(?:mỗi|hằng|hàng)\\s+(?:ngày|mùng)\\s+(\\d{1,2})(?:\\s+(?:mỗi|hằng|hàng)\\s+tháng)?(?=\\s)`, (d) => `every ${d}th`);
  swap(`\\s(?:mỗi|hằng|hàng)\\s+(${VI_WEEKDAY})(?=\\s)`, (d) => `every ${viDate(d!)}`);
  swap(`\\s(?:mỗi|hằng|hàng)\\s+(\\d+)\\s+(ngày|tuần|tháng|năm)(?=\\s)`, (n, u) => `every ${n} ${VI_UNITS[u!.toLowerCase()]}s`);
  swap(`\\s(?:mỗi|hằng|hàng)\\s+(ngày|tuần|tháng|năm)(?=\\s)`, (u) => `every ${VI_UNITS[u!.toLowerCase()]}`);
  swap(`\\s(?:trước|hạn)\\s+(${VI_DATE})(?=\\s)`, (d) => `by ${viDate(d!)}`);
  swap(`\\s(?:lúc\\s+)?(\\d{1,2})\\s?(?:h|giờ)\\s?(\\d{2})?(?:\\s+(sáng|trưa|chiều|tối))?(?=\\s)`, (h, m, part) => {
    let hours = Number(h);
    if ((part === 'chiều' || part === 'tối') && hours < 12) hours += 12;
    if (hours > 23 || Number(m ?? 0) > 59) return null;
    return `${String(hours).padStart(2, '0')}:${m ?? '00'}`;
  });
  swap(`\\slúc\\s+(\\d{1,2}:\\d{2})(?=\\s)`, (t) => `at ${t}`);
  swap(`\\s(?:vào\\s+)?(${VI_DATE})(?=\\s)`, (d) => viDate(d!));
  swap(`\\s(?:một ngày nào đó|lúc nào đó|khi nào đó)(?=\\s)`, () => 'someday');
  return text;
}

/** "Tài chính", "tài-chính" and "taichinh" all name the same area. */
function looseName(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').replace(/[\s_-]+/g, '').toLowerCase();
}

/**
 * Reads a quick-add line such as "Pay rent every 1st #finance !high" into task fields.
 * Vietnamese works too: "Trả tiền nhà mỗi ngày 1 #tàichính !cao".
 * Pure: the caller passes today and the area names, and decides what to do with the result.
 */
export function parseCapture(input: string, { today, areaNames }: Options): ParsedCapture {
  const result: ParsedCapture = {
    title: '',
    doOn: null,
    dueOn: null,
    time: null,
    rrule: null,
    areaName: null,
    tags: [],
    priority: null,
    estimateMin: null,
    someday: false,
  };
  let text = fromVietnamese(` ${input} `);
  const take = (pattern: RegExp, apply: (match: RegExpMatchArray) => boolean | void) => {
    text = text.replace(pattern, (...args) => {
      const match = args.slice(0, -2) as unknown as RegExpMatchArray;
      return apply(match) === false ? match[0] : ' ';
    });
  };

  // !high, !2, !!!
  take(/\s!(high|hi|h|1|!!|medium|med|m|2|!|low|lo|l|3)(?=\s)/gi, (m) => {
    const p = m[1]!.toLowerCase();
    result.priority = ['high', 'hi', 'h', '1', '!!'].includes(p) ? 1 : ['low', 'lo', 'l', '3'].includes(p) ? 3 : 2;
  });

  // ~30m, ~1h, ~1h30m, ~90min
  take(/\s~(?:(\d+(?:\.\d+)?)\s?h(?:ours?|rs?)?)?\s?(?:(\d+)\s?m(?:in(?:utes?|s)?)?)?(?=\s)/gi, (m) => {
    if (!m[1] && !m[2]) return false;
    result.estimateMin = Math.round(Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0));
  });

  // #area or #tag. A tag starts with a letter, so "Essay #9" keeps its number.
  take(/\s#(\p{L}[\p{L}\p{M}\p{N}_-]*)(?=\s)/giu, (m) => {
    const word = m[1]!;
    const area = areaNames.find((name) => looseName(name) === looseName(word));
    if (area && !result.areaName) result.areaName = area;
    else if (!result.tags.includes(word.toLowerCase())) result.tags.push(word.toLowerCase());
  });

  // Repeats
  let rule: RRule | null = null;
  take(/\s(?:every|each)\s+(?:(\d+|other|two|three|four|five|six)\s+)?(days?|weeks?|months?|years?)(?:\s+on\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th))?(?=\s)/gi, (m) => {
    const interval = m[1] ? (NUMBER_WORDS[m[1].toLowerCase()] ?? Number(m[1])) : 1;
    const freq = ({ d: 'DAILY', w: 'WEEKLY', m: 'MONTHLY', y: 'YEARLY' } as const)[m[2]!.charAt(0).toLowerCase() as 'd' | 'w' | 'm' | 'y'];
    rule = { freq, interval };
    if (m[3] && freq === 'MONTHLY') rule.byMonthDay = [Number(m[3])];
  });
  take(/\s(?:every|each)\s+(weekday|weekend)s?(?=\s)/gi, (m) => {
    rule = { freq: 'WEEKLY', interval: 1, byDay: m[1]!.toLowerCase() === 'weekday' ? ['MO', 'TU', 'WE', 'TH', 'FR'] : ['SA', 'SU'] };
  });
  take(new RegExp(`\\s(?:every|each)\\s+((?:${WEEKDAY})(?:\\s*(?:,|and|&)\\s*(?:${WEEKDAY}))*)(?=\\s)`, 'gi'), (m) => {
    const days = m[1]!.split(/\s*(?:,|and|&)\s*/i).map(toWeekday).filter((d): d is Weekday => !!d);
    rule = { freq: 'WEEKLY', interval: 1, byDay: days };
  });
  take(/\s(?:every|each)\s+(?:(last)\s+day|(\d{1,2})(?:st|nd|rd|th))(?:\s+of\s+(?:the|each|every)\s+month)?(?=\s)/gi, (m) => {
    rule = { freq: 'MONTHLY', interval: 1, byMonthDay: [m[1] ? -1 : Number(m[2])] };
  });
  // A bare "daily" only counts at the end ("Meditate daily"), not inside a phrase ("a monthly photo book").
  take(/\s(daily|weekly|monthly|yearly|annually)\s*$/gi, (m) => {
    if (rule) return false;
    const word = m[1]!.toLowerCase();
    rule = { freq: word === 'daily' ? 'DAILY' : word === 'weekly' ? 'WEEKLY' : word === 'monthly' ? 'MONTHLY' : 'YEARLY', interval: 1 };
  });

  // Deadlines: "by Friday", "before Oct 15", "due tomorrow"
  take(new RegExp(`\\s(?:by|before|due(?:\\s+on)?)\\s+(${DATE_PHRASE})(?=\\s)`, 'gi'), (m) => {
    const day = resolveDate(m[1]!, today);
    if (!day) return false;
    result.dueOn = day;
  });

  // Times: "at 3pm", "at 15:30", "3:30pm", "18:00"
  take(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)|\s(?:at\s+)?(\d{1,2}):(\d{2})(?=\s)|\sat\s+(\d{1,2})(?=\s)/gi, (m) => {
    let hours = Number(m[1] ?? m[4] ?? m[6]);
    const minutes = Number(m[2] ?? m[5] ?? 0);
    const meridiem = m[3]?.toLowerCase();
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    if (hours > 23 || minutes > 59) return false;
    result.time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  });

  // The day to do it
  take(new RegExp(`\\s(?:(?:on|starting|from|beginning)\\s+)?(${DATE_PHRASE})(?=\\s)`, 'gi'), (m) => {
    if (result.doOn) return false;
    const day = resolveDate(m[1]!, today);
    if (!day) return false;
    result.doOn = day;
  });

  take(/\s(someday|some day)(?=\s)/gi, () => {
    result.someday = true;
  });

  if (rule) {
    result.rrule = formatRRule(rule);
    // The series starts at its first occurrence on or after the given day (or today).
    const start = result.doOn ?? today;
    result.doOn = firstOnOrAfter(rule, start, start);
  }
  if (result.time && !result.doOn) result.doOn = today;

  result.title = tidyTitle(text) || input.trim();
  return result;
}

function toWeekday(word: string): Weekday | null {
  return WEEKDAY_WORDS.find(([pattern]) => pattern.test(word.trim()))?.[1] ?? null;
}

/** The next given weekday strictly after today. */
function nextWeekday(today: Day, target: Weekday): Day {
  const delta = (WEEKDAY_INDEX[target] - weekday(today) + 7) % 7 || 7;
  return addDays(today, delta);
}

function resolveDate(phrase: string, today: Day): Day | null {
  const p = phrase.toLowerCase().replace(/\s+/g, ' ').trim();
  if (p === 'today' || p === 'tonight') return today;
  if (['tomorrow', 'tmrw', 'tmr'].includes(p)) return addDays(today, 1);
  if (p === 'next week') return addDays(startOfWeek(today), 7);
  if (p === 'next month') return makeDay(year(today), month(today) + 1, 1);
  if (p === 'this weekend') {
    const w = weekday(today);
    return w === 6 || w === 0 ? today : nextWeekday(today, 'SA');
  }

  const inMatch = /^in (\d+|a|an|one|two|three|four|five|six) (day|week|month)s?$/.exec(p);
  if (inMatch) {
    const n = /^\d+$/.test(inMatch[1]!) ? Number(inMatch[1]) : (NUMBER_WORDS[inMatch[1]!] ?? 1);
    if (inMatch[2] === 'day') return addDays(today, n);
    if (inMatch[2] === 'week') return addDays(today, 7 * n);
    const m = month(today) + n;
    const y = year(today) + Math.floor((m - 1) / 12);
    const mm = ((m - 1) % 12) + 1;
    return makeDay(y, mm, Math.min(dayOfMonth(today), daysInMonth(y, mm)));
  }

  const weekdayMatch = /^(?:next |this )?(.+)$/.exec(p);
  const wd = weekdayMatch ? toWeekday(weekdayMatch[1]!) : null;
  if (wd) return p.startsWith('this ') && WEEKDAY_INDEX[wd] === weekday(today) ? today : nextWeekday(today, wd);

  if (isDay(p)) return p;

  const monthFirst = new RegExp(`^(${MONTH}) (\\d{1,2})${ORD}$`).exec(p);
  const dayFirst = new RegExp(`^(\\d{1,2})${ORD} (?:of )?(${MONTH})$`).exec(p);
  const found = monthFirst ? { m: monthFirst[1]!, d: monthFirst[2]! } : dayFirst ? { m: dayFirst[2]!, d: dayFirst[1]! } : null;
  if (found) {
    const mm = MONTHS.indexOf(found.m.slice(0, 3)) + 1;
    const dd = Number(found.d);
    if (dd < 1 || dd > 31) return null;
    // A date already past this year means next year.
    let y = year(today);
    if (makeDay(y, mm, 1) < makeDay(year(today), month(today), 1) || (mm === month(today) && dd < dayOfMonth(today))) y += 1;
    if (dd > daysInMonth(y, mm)) return null;
    return makeDay(y, mm, dd);
  }
  return null;
}

function tidyTitle(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+(?:on|at|by|before|due|every|and|lúc|vào|trước|hạn|mỗi)$/iu, '')
    .replace(/^(?:on|at|lúc|vào)\s+/iu, '')
    .trim();
}
