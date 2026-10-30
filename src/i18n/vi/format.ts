import type { Messages } from '../locale';

const weekdaysShort = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const weekdaysLong = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const monthsShort = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
const monthsLong = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
const numberWords = ['Không', 'Một', 'Hai', 'Ba', 'Bốn', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười'];
const dm = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;

export const format: Messages['format'] = {
  weekdaysShort,
  weekdaysLong,
  weekdayInitials: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
  monthsShort,
  monthsLong,
  dayShort: (d) => `${weekdaysShort[d.getDay()]}, ${dm(d)}`,
  dayLong: (d) => `${weekdaysLong[d.getDay()]}, ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`,
  date: (d) => `${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`,
  dayMonth: dm,
  monthYear: (d) => `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`,
  dateTime: (d, time) => `${weekdaysShort[d.getDay()]}, ${dm(d)}, ${time}`,
  today: 'Hôm nay',
  tomorrow: 'Ngày mai',
  yesterday: 'Hôm qua',
  minutes: (m) => (m < 60 ? `${m} phút` : m % 60 ? `${Math.floor(m / 60)} giờ ${m % 60} phút` : `${m / 60} giờ`),
  justNow: 'vừa xong',
  minutesAgo: (n) => `${n} phút trước`,
  hoursAgo: (n) => `${n} giờ trước`,
  yesterdayLower: 'hôm qua',
  daysAgo: (n) => `${n} ngày trước`,
  numberWord: (n) => numberWords[n] ?? String(n),
  plural: (n, one) => `${n} ${one}`,
  list: (items) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} và ${items[items.length - 1]}`),
  dash: '–',
};
