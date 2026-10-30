import { parseCapture } from './quickAdd';

// Monday 26 October 2026
const today = '2026-10-26';
const areaNames = ['Health', 'Career', 'Finance', 'Family', 'Friends', 'Growth', 'Home', 'Fun'];
const parse = (text: string) => parseCapture(text, { today, areaNames });

describe('parseCapture', () => {
  it('reads the example from the design', () => {
    expect(parse('Pay rent every 1st #finance !high')).toMatchObject({
      title: 'Pay rent',
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=1',
      doOn: '2026-11-01',
      areaName: 'Finance',
      priority: 1,
    });
  });

  it('leaves plain text alone', () => {
    expect(parse('Idea: monthly photo book for Mom')).toMatchObject({
      title: 'Idea: monthly photo book for Mom',
      doOn: null,
      rrule: null,
      areaName: null,
      tags: [],
      priority: null,
    });
  });

  it('takes priorities', () => {
    expect(parse('Ship it !1').priority).toBe(1);
    expect(parse('Ship it !med').priority).toBe(2);
    expect(parse('Ship it !low').priority).toBe(3);
    expect(parse('Wow! great').priority).toBeNull();
  });

  it('separates areas from tags', () => {
    const p = parse('Pick up dry cleaning #home #errand #Errand');
    expect(p).toMatchObject({ title: 'Pick up dry cleaning', areaName: 'Home', tags: ['errand'] });
    expect(parse('Outline essay #9 #growth')).toMatchObject({ title: 'Outline essay #9', areaName: 'Growth', tags: [] });
  });

  it('reads estimates', () => {
    expect(parse('Water the plants ~5m').estimateMin).toBe(5);
    expect(parse('Deep work ~1h30m').estimateMin).toBe(90);
    expect(parse('Deep work ~2h').estimateMin).toBe(120);
    expect(parse('Deep work ~ later').estimateMin).toBeNull();
  });

  describe('dates', () => {
    it.each([
      ['Call Mom today', '2026-10-26'],
      ['Call Mom tonight', '2026-10-26'],
      ['Call Mom tomorrow', '2026-10-27'],
      ['Call Mom tmrw', '2026-10-27'],
      ['Call Mom friday', '2026-10-30'],
      ['Call Mom on Fri', '2026-10-30'],
      ['Call Mom monday', '2026-11-02'], // today is Monday, so the coming one
      ['Call Mom this monday', '2026-10-26'],
      ['Call Mom next week', '2026-11-02'],
      ['Call Mom next month', '2026-11-01'],
      ['Call Mom this weekend', '2026-10-31'],
      ['Call Mom in 3 days', '2026-10-29'],
      ['Call Mom in two weeks', '2026-11-09'],
      ['Call Mom in a month', '2026-11-26'],
      ['Call Mom on 15 Nov', '2026-11-15'],
      ['Call Mom Nov 15th', '2026-11-15'],
      ['Call Mom 2027-01-02', '2027-01-02'],
      ['Call Mom on 3 March', '2027-03-03'], // already past this year
    ])('%s → %s', (text, day) => {
      const p = parse(text);
      expect(p.doOn).toBe(day);
      expect(p.title).toBe('Call Mom');
    });

    it('does not mistake words for dates', () => {
      expect(parse('Read Sundays and Cybele').doOn).toBe('2026-11-01'); // a weekday name still counts
      expect(parse('Watch Monday.com demo').title).toBe('Watch Monday.com demo');
      expect(parse('Today’s plan review').doOn).toBeNull();
    });

    it('reads deadlines separately from do-on days', () => {
      const p = parse('Renew car insurance before Nov 15');
      expect(p).toMatchObject({ title: 'Renew car insurance', dueOn: '2026-11-15', doOn: null });
      expect(parse('Send invoice by friday').dueOn).toBe('2026-10-30');
      expect(parse('Tax return due tomorrow').dueOn).toBe('2026-10-27');
    });

    it('skips impossible dates', () => {
      expect(parse('Party on 31 Nov').doOn).toBeNull();
    });
  });

  describe('times', () => {
    it.each([
      ['Call Mom at 6pm', '18:00'],
      ['Call Mom at 18:30', '18:30'],
      ['Call Mom 7:15am', '07:15'],
      ['Call Mom at 12am', '00:00'],
      ['Call Mom at 9', '09:00'],
    ])('%s → %s', (text, time) => {
      const p = parse(text);
      expect(p.time).toBe(time);
      expect(p.title).toBe('Call Mom');
      expect(p.doOn).toBe(today);
    });

    it('keeps a date given with the time', () => {
      expect(parse('Dentist tomorrow at 13:00')).toMatchObject({ title: 'Dentist', doOn: '2026-10-27', time: '13:00' });
    });

    it('does not read plain numbers as times', () => {
      expect(parse('Run 8 km').time).toBeNull();
      expect(parse('Run 8 km').title).toBe('Run 8 km');
    });
  });

  describe('repeats', () => {
    it.each([
      ['Meditate every day', 'FREQ=DAILY', '2026-10-26'],
      ['Meditate daily', 'FREQ=DAILY', '2026-10-26'],
      ['Water the plants every 3 days', 'FREQ=DAILY;INTERVAL=3', '2026-10-26'],
      ['Gym every other day', 'FREQ=DAILY;INTERVAL=2', '2026-10-26'],
      ['Call Mom every Tuesday', 'FREQ=WEEKLY;BYDAY=TU', '2026-10-27'],
      ['Yoga every tue and thu', 'FREQ=WEEKLY;BYDAY=TU,TH', '2026-10-27'],
      ['Stand-up every weekday', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', '2026-10-26'],
      ['Review every week', 'FREQ=WEEKLY', '2026-10-26'],
      ['Review weekly', 'FREQ=WEEKLY', '2026-10-26'],
      ['Sprint every 2 weeks', 'FREQ=WEEKLY;INTERVAL=2', '2026-10-26'],
      ['Budget every month on the 15th', 'FREQ=MONTHLY;BYMONTHDAY=15', '2026-11-15'],
      ['Invoice every last day of the month', 'FREQ=MONTHLY;BYMONTHDAY=-1', '2026-10-31'],
      ['Checkup every year', 'FREQ=YEARLY', '2026-10-26'],
    ])('%s', (text, rrule, doOn) => {
      const p = parse(text);
      expect(p.rrule).toBe(rrule);
      expect(p.doOn).toBe(doOn);
      expect(p.title).not.toMatch(/every|daily|weekly/i);
    });

    it('only reads a bare "monthly" at the end of the line', () => {
      expect(parse('Idea: monthly photo book for Mom').rrule).toBeNull();
      expect(parse('Pay the gardener monthly').rrule).toBe('FREQ=MONTHLY');
    });

    it('starts on a given date when there is one', () => {
      expect(parse('Call Mom every Tuesday starting next week')).toMatchObject({ title: 'Call Mom', doOn: '2026-11-03' });
      expect(parse('Sprint every 2 weeks from friday')).toMatchObject({ rrule: 'FREQ=WEEKLY;INTERVAL=2', doOn: '2026-10-30' });
    });
  });

  it('notices someday', () => {
    expect(parse('Learn the cello someday')).toMatchObject({ title: 'Learn the cello', someday: true });
  });

  it('never returns an empty title', () => {
    expect(parse('tomorrow').title).toBe('tomorrow');
    expect(parse('#finance').title).toBe('#finance');
  });
});

describe('parseCapture in Vietnamese', () => {
  const today = '2026-10-29'; // a Thursday
  const areaNames = ['Sức khỏe', 'Tài chính', 'Gia đình'];
  const parse = (text: string) => parseCapture(text, { today, areaNames });

  it('reads days, times, areas and priority', () => {
    expect(parse('Gọi mẹ ngày mai lúc 18:00 #giađình !cao')).toMatchObject({ title: 'Gọi mẹ', doOn: '2026-10-30', time: '18:00', areaName: 'Gia đình', priority: 1 });
    expect(parse('Họp nhóm thứ hai 9h30')).toMatchObject({ title: 'Họp nhóm', doOn: '2026-11-02', time: '09:30' });
    expect(parse('Ăn tối 7 giờ tối hôm nay')).toMatchObject({ title: 'Ăn tối', doOn: today, time: '19:00' });
  });

  it('reads repeats and deadlines', () => {
    expect(parse('Trả tiền nhà mỗi ngày 1 #tàichính')).toMatchObject({ title: 'Trả tiền nhà', rrule: 'FREQ=MONTHLY;BYMONTHDAY=1', areaName: 'Tài chính', doOn: '2026-11-01' });
    expect(parse('Thiền mỗi ngày').rrule).toBe('FREQ=DAILY');
    expect(parse('Chạy bộ mỗi thứ bảy').rrule).toBe('FREQ=WEEKLY;BYDAY=SA');
    expect(parse('Nộp báo cáo trước thứ sáu')).toMatchObject({ title: 'Nộp báo cáo', dueOn: '2026-10-30' });
  });

  it('leaves words alone when they aren’t a whole phrase', () => {
    expect(parse('Mua 50g đường').title).toBe('Mua 50g đường');
    expect(parse('Đọc sách trước khi ngủ').title).toBe('Đọc sách trước khi ngủ');
    expect(parse('Học tiếng Anh một ngày nào đó').someday).toBe(true);
  });
});
