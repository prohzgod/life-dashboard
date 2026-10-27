import {
  describeRRule,
  describeRRuleShort,
  firstOnOrAfter,
  formatRRule,
  matches,
  nextAfterCompletion,
  nextOccurrence,
  parseRRule,
  type RRule,
} from './recurrence';

const rule = (text: string) => parseRRule(text)!;

describe('parseRRule / formatRRule', () => {
  it('round-trips the supported subset', () => {
    for (const text of ['FREQ=DAILY', 'FREQ=DAILY;INTERVAL=3', 'FREQ=WEEKLY;BYDAY=TU,TH', 'FREQ=MONTHLY;BYMONTHDAY=1', 'FREQ=MONTHLY;BYMONTHDAY=-1', 'FREQ=YEARLY;INTERVAL=2']) {
      expect(formatRRule(rule(text))).toBe(text);
    }
  });

  it('accepts an RRULE: prefix and sorts weekdays Monday first', () => {
    expect(rule('RRULE:FREQ=WEEKLY;BYDAY=SU,MO')).toEqual({ freq: 'WEEKLY', interval: 1, byDay: ['MO', 'SU'] });
  });

  it('rejects anything it does not understand', () => {
    expect(parseRRule('')).toBeNull();
    expect(parseRRule('FREQ=HOURLY')).toBeNull();
    expect(parseRRule('FREQ=DAILY;COUNT=3')).toBeNull();
    expect(parseRRule('FREQ=WEEKLY;BYDAY=XX')).toBeNull();
    expect(parseRRule('FREQ=DAILY;INTERVAL=0')).toBeNull();
    expect(parseRRule('INTERVAL=2')).toBeNull();
  });
});

describe('occurrences', () => {
  it('every 3 days counts from the anchor', () => {
    const r = rule('FREQ=DAILY;INTERVAL=3');
    expect(matches(r, '2026-10-01', '2026-10-04')).toBe(true);
    expect(matches(r, '2026-10-01', '2026-10-05')).toBe(false);
    expect(nextOccurrence(r, '2026-10-01', '2026-10-04')).toBe('2026-10-07');
  });

  it('every Tuesday and Thursday', () => {
    const r = rule('FREQ=WEEKLY;BYDAY=TU,TH');
    expect(firstOnOrAfter(r, '2026-10-26', '2026-10-26')).toBe('2026-10-27');
    expect(nextOccurrence(r, '2026-10-26', '2026-10-27')).toBe('2026-10-29');
  });

  it('every other week keeps to the anchor week', () => {
    const r = rule('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO');
    expect(nextOccurrence(r, '2026-10-26', '2026-10-26')).toBe('2026-11-09');
  });

  it('weekly without BYDAY repeats on the anchor weekday', () => {
    expect(nextOccurrence(rule('FREQ=WEEKLY'), '2026-10-27', '2026-10-27')).toBe('2026-11-03');
  });

  it('monthly on day 1, and on the last day', () => {
    expect(nextOccurrence(rule('FREQ=MONTHLY;BYMONTHDAY=1'), '2026-10-01', '2026-10-26')).toBe('2026-11-01');
    expect(nextOccurrence(rule('FREQ=MONTHLY;BYMONTHDAY=-1'), '2026-01-31', '2026-01-31')).toBe('2026-02-28');
  });

  it('monthly from the 31st falls back to shorter months’ last day', () => {
    expect(nextOccurrence(rule('FREQ=MONTHLY'), '2026-01-31', '2026-01-31')).toBe('2026-02-28');
    expect(nextOccurrence(rule('FREQ=MONTHLY'), '2026-01-31', '2026-02-28')).toBe('2026-03-31');
  });

  it('yearly on 29 February lands on the 28th in other years', () => {
    expect(nextOccurrence(rule('FREQ=YEARLY'), '2028-02-29', '2028-02-29')).toBe('2029-02-28');
  });
});

describe('nextAfterCompletion', () => {
  it('counts "every N days" from the day it was done', () => {
    expect(nextAfterCompletion(rule('FREQ=DAILY;INTERVAL=3'), '2026-10-20', '2026-10-26')).toBe('2026-10-29');
  });

  it('keeps calendar rules on schedule, even when done late', () => {
    const tuesdays = rule('FREQ=WEEKLY;BYDAY=TU');
    expect(nextAfterCompletion(tuesdays, '2026-10-20', '2026-10-21')).toBe('2026-10-27');
    expect(nextAfterCompletion(tuesdays, '2026-10-20', '2026-10-28')).toBe('2026-11-03');
  });

  it('done early still moves to the next date after the planned one', () => {
    expect(nextAfterCompletion(rule('FREQ=MONTHLY;BYMONTHDAY=1'), '2026-11-01', '2026-10-29')).toBe('2026-12-01');
  });

  it('uses the completion day when the task had no date', () => {
    expect(nextAfterCompletion(rule('FREQ=WEEKLY'), null, '2026-10-26')).toBe('2026-11-02');
  });
});

describe('describeRRule', () => {
  it.each<[string, string]>([
    ['FREQ=DAILY', 'Every day'],
    ['FREQ=DAILY;INTERVAL=2', 'Every other day'],
    ['FREQ=DAILY;INTERVAL=3', 'Every 3 days'],
    ['FREQ=WEEKLY', 'Every week'],
    ['FREQ=WEEKLY;BYDAY=TU', 'Every Tuesday'],
    ['FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', 'Every weekday'],
    ['FREQ=WEEKLY;BYDAY=SA,SU', 'Every weekend'],
    ['FREQ=WEEKLY;BYDAY=MO,WE,FR', 'Every Monday, Wednesday and Friday'],
    ['FREQ=WEEKLY;INTERVAL=2;BYDAY=MO', 'Every other week on Monday'],
    ['FREQ=MONTHLY', 'Every month'],
    ['FREQ=MONTHLY;BYMONTHDAY=1', 'Monthly on day 1'],
    ['FREQ=MONTHLY;BYMONTHDAY=-1', 'Monthly on the last day'],
    ['FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=15', 'Every 3 months on day 15'],
    ['FREQ=YEARLY', 'Every year'],
  ])('%s → %s', (text, expected) => {
    expect(describeRRule(rule(text))).toBe(expected);
  });

  it('has a chip form', () => {
    expect(describeRRuleShort(rule('FREQ=MONTHLY;BYMONTHDAY=1'))).toBe('Repeats monthly · day 1');
    expect(describeRRuleShort(rule('FREQ=WEEKLY;BYDAY=TU') as RRule)).toBe('Repeats every Tuesday');
  });
});
