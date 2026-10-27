import { IcsError, parseIcs, type IcsWindow } from './ics';

const window: IcsWindow = { from: new Date(Date.UTC(2026, 0, 1)), to: new Date(Date.UTC(2027, 0, 1)) };

function cal(...events: string[][]): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'X-WR-CALNAME:Work', ...events.flatMap((e) => ['BEGIN:VEVENT', ...e, 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');
}

describe('parseIcs', () => {
  it('reads a timed UTC event, the calendar name and escaped text', () => {
    const { name, events } = parseIcs(
      cal(['UID:a1', 'SUMMARY:Stand-up\\, daily', 'DTSTART:20260929T093000Z', 'DTEND:20260929T094500Z', 'LOCATION:Room 2', 'DESCRIPTION:Line one\\nLine two']),
      window,
    );
    expect(name).toBe('Work');
    expect(events).toEqual([
      { uid: 'a1', recurrenceId: null, title: 'Stand-up, daily', start: '2026-09-29T09:30:00.000Z', end: '2026-09-29T09:45:00.000Z', allDay: false, location: 'Room 2', notes: 'Line one\nLine two' },
    ]);
  });

  it('unfolds long lines', () => {
    const text = cal(['UID:a2', 'SUMMARY:A very long', '  title', 'DTSTART:20260929T093000Z']);
    expect(parseIcs(text, window).events[0]!.title).toBe('A very long title');
  });

  it('converts TZID times to UTC, across daylight saving', () => {
    const { events } = parseIcs(
      cal(
        ['UID:s', 'SUMMARY:Summer', 'DTSTART;TZID=Europe/London:20260701T090000', 'DTEND;TZID=Europe/London:20260701T100000'],
        ['UID:w', 'SUMMARY:Winter', 'DTSTART;TZID="Europe/London":20261201T090000', 'DURATION:PT30M'],
      ),
      window,
    );
    expect(events.map((e) => [e.start, e.end])).toEqual([
      ['2026-07-01T08:00:00.000Z', '2026-07-01T09:00:00.000Z'],
      ['2026-12-01T09:00:00.000Z', '2026-12-01T09:30:00.000Z'],
    ]);
  });

  it('reads floating times as local time, and unknown zones too', () => {
    const { events } = parseIcs(cal(['UID:f', 'DTSTART:20261005T180000'], ['UID:g', 'DTSTART;TZID=Pacific Standard Time:20261005T180000']), window);
    const local = new Date(2026, 9, 5, 18, 0).toISOString();
    expect(events.map((e) => e.start)).toEqual([local, local]);
    expect(events[0]!.title).toBe('Untitled event');
  });

  it('keeps all-day events as days, with an exclusive end', () => {
    const { events } = parseIcs(cal(['UID:b', 'SUMMARY:Linh’s birthday', 'DTSTART;VALUE=DATE:20261003', 'DTEND;VALUE=DATE:20261004']), window);
    expect(events[0]).toMatchObject({ allDay: true, start: '2026-10-03', end: '2026-10-04' });
    const noEnd = parseIcs(cal(['UID:c', 'DTSTART;VALUE=DATE:20261003']), window).events[0]!;
    expect(noEnd.end).toBe('2026-10-04');
  });

  it('expands a weekly rule with BYDAY, COUNT and EXDATE', () => {
    const { events } = parseIcs(
      cal([
        'UID:r',
        'SUMMARY:Stand-up',
        'DTSTART:20260928T093000Z',
        'DTEND:20260928T094500Z',
        'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=5',
        'EXDATE:20260930T093000Z',
      ]),
      window,
    );
    expect(events.map((e) => e.start.slice(0, 10))).toEqual(['2026-09-28', '2026-10-02', '2026-10-05', '2026-10-07']);
    expect(events[1]!.recurrenceId).toBe('2026-10-02T09:30:00.000Z');
  });

  it('stops at UNTIL and at the end of the window', () => {
    const until = parseIcs(cal(['UID:u', 'DTSTART:20261001T080000Z', 'RRULE:FREQ=DAILY;INTERVAL=2;UNTIL=20261007T080000Z']), window).events;
    expect(until.map((e) => e.start.slice(0, 10))).toEqual(['2026-10-01', '2026-10-03', '2026-10-05', '2026-10-07']);
    const endless = parseIcs(cal(['UID:e', 'DTSTART:20261201T080000Z', 'RRULE:FREQ=DAILY']), window).events;
    expect(endless).toHaveLength(31);
  });

  it('only keeps repeats inside the window', () => {
    const { events } = parseIcs(cal(['UID:old', 'DTSTART;VALUE=DATE:20200315', 'RRULE:FREQ=YEARLY']), window);
    expect(events.map((e) => e.start)).toEqual(['2026-03-15']);
  });

  it('handles monthly rules by position and by day of month', () => {
    const last = parseIcs(cal(['UID:m', 'DTSTART;VALUE=DATE:20261030', 'RRULE:FREQ=MONTHLY;BYDAY=-1FR;COUNT=3']), window).events;
    expect(last.map((e) => e.start)).toEqual(['2026-10-30', '2026-11-27', '2026-12-25']);
    const rent = parseIcs(cal(['UID:p', 'DTSTART;VALUE=DATE:20260901', 'RRULE:FREQ=MONTHLY;BYMONTHDAY=1;UNTIL=20261101']), window).events;
    expect(rent.map((e) => e.start)).toEqual(['2026-09-01', '2026-10-01', '2026-11-01']);
    const the31st = parseIcs(cal(['UID:q', 'DTSTART;VALUE=DATE:20260831', 'RRULE:FREQ=MONTHLY;COUNT=3']), window).events;
    expect(the31st.map((e) => e.start)).toEqual(['2026-08-31', '2026-10-31', '2026-12-31']);
  });

  it('applies moved and cancelled occurrences', () => {
    const { events } = parseIcs(
      cal(
        ['UID:x', 'SUMMARY:Yoga', 'DTSTART:20261005T170000Z', 'DTEND:20261005T180000Z', 'RRULE:FREQ=WEEKLY;COUNT=3'],
        ['UID:x', 'SUMMARY:Yoga (moved)', 'RECURRENCE-ID:20261012T170000Z', 'DTSTART:20261013T170000Z', 'DTEND:20261013T180000Z'],
        ['UID:x', 'RECURRENCE-ID:20261019T170000Z', 'STATUS:CANCELLED', 'DTSTART:20261019T170000Z'],
      ),
      window,
    );
    expect(events.map((e) => [e.title, e.start.slice(0, 10)])).toEqual([
      ['Yoga', '2026-10-05'],
      ['Yoga (moved)', '2026-10-13'],
    ]);
  });

  it('skips cancelled events and nested blocks like alarms', () => {
    const { events } = parseIcs(
      cal(['UID:z', 'STATUS:CANCELLED', 'DTSTART:20261005T170000Z'], ['UID:y', 'SUMMARY:Dentist', 'DTSTART:20261001T110000Z', 'BEGIN:VALARM', 'SUMMARY:Reminder', 'END:VALARM']),
      window,
    );
    expect(events.map((e) => e.title)).toEqual(['Dentist']);
  });

  it('rejects files that are not calendars', () => {
    expect(() => parseIcs('hello', window)).toThrow(IcsError);
    expect(() => parseIcs(cal(['UID:bad', 'DTSTART:tomorrow']), window)).toThrow(/isn’t readable/);
  });
});
