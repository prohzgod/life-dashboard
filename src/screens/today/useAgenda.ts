import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { startsIn } from '@/domain/calendar';
import { addDays, dayToDate, type Day } from '@/domain/days';
import { areasRepo, loadCalendarRange } from '@/data';
import { messages } from '@/i18n';
import { itemsForDay, readLayers } from '@/screens/calendar/items';

/** Minutes since 1970, ticking each minute, so "in 40 min" stays true. */
function useMinute(): number {
  const [minute, setMinute] = useState(() => Math.floor(Date.now() / 60_000));
  useEffect(() => {
    const timer = window.setInterval(() => setMinute(Math.floor(Date.now() / 60_000)), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return minute;
}

export type AgendaEntry = {
  key: string;
  title: string;
  time: string;
  /** "Work", "Time block, Growth", "All day, Family" */
  source: string;
  tone: string;
  block: boolean;
  allDay: boolean;
  done: boolean;
  soon: string | null;
  /** Happening right now: how far along (0–1) and the minutes left. */
  now: { progress: number; minutesLeft: number } | null;
};

/** Today's events and time blocks in order, for the agenda strip and the Home widget. */
export function useAgenda(today: Day): { entries: AgendaEntry[]; calendars: string[] } | undefined {
  const minute = useMinute();
  return useLiveQuery(async () => {
    const { agenda } = messages().today;
    const tb = messages().calendar.timeBlock;
    const [range, areas] = await Promise.all([loadCalendarRange(today, addDays(today, 1), today), areasRepo.listOrdered()]);
    const { timed, allDay } = itemsForDay(range, today, { ...readLayers(), blocks: true }, areas);
    const midnight = dayToDate(today).getTime();
    const at = (min: number) => midnight + min * 60_000;
    const entries: AgendaEntry[] = [
      ...allDay.map((a) => ({ key: a.key, title: a.title, time: agenda.allDay, source: a.calendarName, tone: a.tone, block: false, allDay: true, done: false, soon: null, now: null })),
      ...[...timed]
        .sort((a, b) => a.startMin - b.startMin)
        .map((t) => {
          const nowMs = minute * 60_000;
          const over = at(t.endMin) <= nowMs;
          const running = !t.done && at(t.startMin) <= nowMs && !over;
          return {
            key: t.key,
            title: t.title,
            time: t.time,
            source: t.kind === 'block' ? (t.detail === tb ? tb : agenda.timeBlockOf(t.detail)) : t.calendarName,
            tone: t.tone,
            block: t.kind === 'block',
            allDay: false,
            done: t.done || over,
            soon: t.done ? null : startsIn(at(t.startMin), at(t.endMin), nowMs),
            now: running
              ? { progress: (nowMs - at(t.startMin)) / Math.max(1, at(t.endMin) - at(t.startMin)), minutesLeft: Math.max(1, Math.round((at(t.endMin) - nowMs) / 60_000)) }
              : null,
          };
        }),
    ];
    return { entries, calendars: range.calendars.filter((c) => c.visible).map((c) => (c.readOnly ? agenda.readOnly(c.name) : c.name)) };
  }, [today, minute]);
}

