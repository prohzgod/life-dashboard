import type { RRule, Weekday } from '@/domain/recurrence';
import type { Messages } from '../locale';

const DAY_NAMES: Record<Weekday, string> = { MO: 'thứ Hai', TU: 'thứ Ba', WE: 'thứ Tư', TH: 'thứ Năm', FR: 'thứ Sáu', SA: 'thứ Bảy', SU: 'Chủ nhật' };
const listJoin = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} và ${items.at(-1)}`);

/** "Mỗi thứ Ba", "Mỗi 3 ngày", "Hằng tháng vào ngày 1". */
function describe(rule: RRule): string {
  const n = rule.interval;
  const unit = { DAILY: 'ngày', WEEKLY: 'tuần', MONTHLY: 'tháng', YEARLY: 'năm' }[rule.freq];
  const every = n === 1 ? `Mỗi ${unit}` : `Mỗi ${n} ${unit}`;
  if (rule.freq === 'WEEKLY' && rule.byDay?.length) {
    const days = rule.byDay;
    if (days.join() === 'MO,TU,WE,TH,FR' && n === 1) return 'Mỗi ngày trong tuần';
    if (days.join() === 'SA,SU' && n === 1) return 'Mỗi cuối tuần';
    const names = listJoin(days.map((d) => DAY_NAMES[d]));
    return n === 1 ? `Mỗi ${names}` : `${every} vào ${names}`;
  }
  if (rule.freq === 'MONTHLY' && rule.byMonthDay?.length) {
    const dates = listJoin(rule.byMonthDay.map((d) => (d === -1 ? 'ngày cuối tháng' : `ngày ${d}`)));
    return n === 1 ? `Hằng tháng vào ${dates}` : `${every} vào ${dates}`;
  }
  return every;
}

export const tasks: Messages['tasks'] = {
  repeat: {
    describe,
    short: (rule) => {
      if (rule.interval === 1 && rule.freq === 'MONTHLY' && rule.byMonthDay?.length === 1) {
        const d = rule.byMonthDay[0]!;
        return `Lặp hằng tháng, ${d === -1 ? 'ngày cuối' : `ngày ${d}`}`;
      }
      const long = describe(rule);
      return `Lặp ${long.charAt(0).toLowerCase()}${long.slice(1)}`;
    },
    inline: (text) => text.charAt(0).toLowerCase() + text.slice(1),
  },
  markDone: (title) => `Đánh dấu “${title}” là xong`,
  markNotDone: (title) => `Đánh dấu “${title}” là chưa xong`,
  due: (date) => `hạn ${date}`,
  dueChip: (date, relative) => `Hạn ${relative ? date.toLowerCase() : date}`,
  high: 'ưu tiên cao',
  highPriority: 'Ưu tiên cao',
  mediumPriority: 'Ưu tiên vừa',
  lowPriority: 'Ưu tiên thấp',
  someday: 'Một ngày nào đó',
  somedayTab: 'Để sau',
  task: 'Việc',
  willBeSaved: 'Sẽ được lưu là',
  enter: 'Enter',
  example: 'ví dụ “Trả tiền nhà mỗi ngày 1 #tàichính !cao” thành việc hằng tháng vào ngày 1, thuộc Tài chính, ưu tiên cao.',
  rolledYesterday: 'Dời từ hôm qua',
  rolledFrom: (when) => `Dời từ ${when}`,
  views: { inbox: 'Hộp thư', today: 'Hôm nay', upcoming: 'Sắp tới', anytime: 'Bất cứ lúc nào', someday: 'Một ngày nào đó', logbook: 'Đã xong' },
  subtitles: {
    today: 'Đã lên kế hoạch cho hôm nay, cùng những việc được dời lại.',
    upcoming: 'Những gì đã lên kế hoạch cho các ngày tới.',
    anytime: 'Chưa có ngày. Chọn từ đây khi bạn lên kế hoạch ngày.',
    someday: 'Ý tưởng đáng giữ, không áp lực.',
    logbook: 'Mọi việc bạn đã xong, mới nhất trước.',
  },
  empty: {
    today: 'Hôm nay chưa có kế hoạch.',
    anytime: 'Không có việc nào đang chờ mà chưa có ngày.',
    someday: 'Chưa có ý tưởng nào cho một ngày nào đó.',
    logbook: 'Việc đã xong sẽ được gom ở đây.',
    upcoming: 'Chưa có kế hoạch cho các ngày tới.',
    filtered: 'Không có việc nào đang mở ở đây.',
  },
  inboxToTriage: (n) => `${n} việc cần sắp xếp. Xử lý trong 2 phút, hoặc khi nhìn lại tuần.`,
  inboxZero: 'Hộp thư trống. Mọi thứ bạn ghi nhanh đều vào đây trước.',
  upcoming: 'Sắp tới',
  rolledOver: (n) => `${n} việc được dời lại.`,
  addLabel: 'Thêm việc',
  addForToday: 'Thêm việc cho hôm nay',
  addNoDate: 'Thêm việc, không cần ngày',
  tasks: 'Công việc',
  inArea: (area) => `Việc đang mở trong ${area}, theo ngày.`,
  withTag: 'Việc đang mở có thẻ này, theo ngày.',
  lists: 'Danh sách việc',
  inboxCount: (n) => `Hộp thư ${n}`,
  toSort: (n) => `${n} việc cần sắp xếp. Chấp nhận, hoặc mở để xem thêm.`,
  tomorrowDate: (date) => `Ngày mai, ${date}`,
  nav: { label: 'Các mục việc', views: 'Danh sách', areas: 'Lĩnh vực', tags: 'Thẻ' },
  inbox: {
    label: 'Cần sắp xếp',
    captured: (ago) => `Ghi lại ${ago}`,
    suggested: 'Gợi ý:',
    accept: 'Chấp nhận',
    acceptAs: (title, as) => `Chấp nhận “${title}” là ${as}`,
    more: (title) => `Thêm tùy chọn cho “${title}”`,
  },
  detail: {
    label: 'Chi tiết việc',
    gone: 'Việc này đã bị xóa.',
    markDone: 'Đánh dấu là xong',
    markNotDone: 'Đánh dấu là chưa xong',
    area: 'Lĩnh vực',
    noArea: 'Không có lĩnh vực',
    goal: 'Mục tiêu',
    noGoal: 'Không liên kết mục tiêu',
    doOn: 'Làm vào',
    time: 'Giờ',
    deadline: 'Hạn chót',
    repeats: 'Lặp lại',
    noRepeat: 'Không lặp lại',
    everyDay: 'Mỗi ngày',
    everyWeekday: 'Mỗi ngày trong tuần',
    everyNamed: (day) => `Mỗi ${day}`,
    everyOtherNamed: (day) => `Cách tuần vào ${day}`,
    monthlyOn: (d) => `Hằng tháng vào ngày ${d}`,
    everyYear: 'Mỗi năm',
    nextAfter: (date) => `Lần tiếp theo: ${date}`,
    reminder: 'Nhắc nhở',
    priority: 'Ưu tiên',
    none: 'Không',
    priorities: { high: 'Cao', medium: 'Vừa', low: 'Thấp' },
    estimate: 'Ước tính',
    tags: 'Thẻ',
    tagsPlaceholder: '#hóađơn #việcvặt',
    subtasks: 'Việc con',
    notes: 'Ghi chú',
    notesPlaceholder: 'Điều đáng nhớ về việc này',
    moveToAnytime: 'Chuyển sang Bất cứ lúc nào',
    someday: 'Một ngày nào đó',
    delete: 'Xóa',
    created: (ago) => `Tạo ${ago}`,
    doneAgo: (ago) => `, xong ${ago}`,
    stored: ', lưu trên thiết bị này',
    backTo: (context) => `Quay lại ${context}`,
    close: 'Đóng chi tiết',
    title: 'Tên việc',
    addSubtask: 'Thêm việc con',
  },
};
