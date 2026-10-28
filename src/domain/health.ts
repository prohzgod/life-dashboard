import { addDays, dayOfMonth, toDay, type Day } from './days';

/** Health numbers from your check-ins, metrics and workouts. Pure: data in, summaries out. */

export const SLEEP_TARGET_MIN = 420;

export type SleepEntry = { day: Day; sleepMinutes: number | null; mood: number | null };

/**
 * The last `nights` nights, oldest first. A check-in's sleep is the night before its day,
 * so the bar labelled 29 is the night into the 29th.
 */
export function sleepNights(entries: readonly SleepEntry[], today: Day, nights = 14): Array<{ day: Day; label: string; minutes: number | null }> {
  const byDay = new Map(entries.map((e) => [e.day, e.sleepMinutes]));
  return Array.from({ length: nights }, (_, i) => {
    const day = addDays(today, i - (nights - 1));
    return { day, label: String(dayOfMonth(day)), minutes: byDay.get(day) ?? null };
  });
}

export function sleepSummary(nights: ReadonlyArray<{ minutes: number | null }>): { average: number | null; met: number; logged: number } {
  const logged = nights.map((n) => n.minutes).filter((m): m is number => m !== null);
  return {
    average: logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : null,
    met: logged.filter((m) => m >= SLEEP_TARGET_MIN).length,
    logged: logged.length,
  };
}

/** "7h 04m" */
export function formatSleep(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

export type SleepMood = { rested: number; short: number; diff: number; restedDays: number; shortDays: number };

const MIN_NIGHTS = 5;

/** Mood on days after 7h+ nights vs shorter ones; null until there are at least five of each. */
export function sleepMoodPattern(entries: readonly SleepEntry[]): SleepMood | null {
  const pairs = entries.filter((e) => e.mood !== null && e.sleepMinutes !== null);
  const rested = pairs.filter((e) => e.sleepMinutes! >= SLEEP_TARGET_MIN).map((e) => e.mood!);
  const short = pairs.filter((e) => e.sleepMinutes! < SLEEP_TARGET_MIN).map((e) => e.mood!);
  if (rested.length < MIN_NIGHTS || short.length < MIN_NIGHTS) return null;
  const a = avg(rested);
  const b = avg(short);
  return { rested: a, short: b, diff: a - b, restedDays: rested.length, shortDays: short.length };
}

// ---- Metrics ----

export type Aggregation = 'sum' | 'average' | 'last';
export type MetricEntryLike = { at: string; value: number };

/** One day's value for a metric: the total, the average, or the last reading. Null with no entries. */
export function dayValue(entries: readonly MetricEntryLike[], day: Day, aggregation: Aggregation): number | null {
  const today = entries.filter((e) => toDay(new Date(e.at)) === day).sort((a, b) => a.at.localeCompare(b.at));
  if (!today.length) return null;
  if (aggregation === 'last') return today.at(-1)!.value;
  const sum = today.reduce((s, e) => s + e.value, 0);
  return aggregation === 'sum' ? sum : sum / today.length;
}

/** The average of daily values over the last `days` days that have any. */
export function dailyAverage(entries: readonly MetricEntryLike[], today: Day, aggregation: Aggregation, days = 14): number | null {
  const values: number[] = [];
  for (let i = 0; i < days; i++) {
    const v = dayValue(entries, addDays(today, -i), aggregation);
    if (v !== null) values.push(v);
  }
  return values.length ? avg(values) : null;
}

/** The latest reading and how far it moved since the first one in the last `days` days ("−3 since June"). */
export function latestWithChange(entries: readonly MetricEntryLike[], today: Day, days = 120): { latest: number; change: number | null; since: Date | null } | null {
  if (!entries.length) return null;
  const sorted = [...entries].sort((a, b) => a.at.localeCompare(b.at));
  const latest = sorted.at(-1)!;
  const windowStart = addDays(today, -days);
  const first = sorted.find((e) => toDay(new Date(e.at)) >= windowStart);
  if (!first || first === latest) return { latest: latest.value, change: null, since: null };
  return { latest: latest.value, change: latest.value - first.value, since: new Date(first.at) };
}

/** The time of the most recent entry today, "11:05", or null. */
export function lastTimeToday(entries: readonly MetricEntryLike[], today: Day): string | null {
  const last = entries.filter((e) => toDay(new Date(e.at)) === today).sort((a, b) => a.at.localeCompare(b.at)).at(-1);
  if (!last) return null;
  const d = new Date(last.at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ---- Workouts ----

export type WorkoutKind = 'run' | 'walk' | 'ride' | 'swim' | 'yoga' | 'strength' | 'other';
export type WorkoutLike = { day: Day; kind: WorkoutKind; distanceKm: number | null; durationSec: number };

/** "11, 62 km run, 3 yoga" for a month. */
export function workoutMonth(workouts: readonly WorkoutLike[], month: string): { count: number; runKm: number; byKind: Partial<Record<WorkoutKind, number>> } {
  const inMonth = workouts.filter((w) => w.day.startsWith(month));
  const byKind: Partial<Record<WorkoutKind, number>> = {};
  for (const w of inMonth) byKind[w.kind] = (byKind[w.kind] ?? 0) + 1;
  const runKm = inMonth.filter((w) => w.kind === 'run').reduce((s, w) => s + (w.distanceKm ?? 0), 0);
  return { count: inMonth.length, runKm: Math.round(runKm * 10) / 10, byKind };
}

/** 1720 → "28:40"; 4325 → "1:12:05". */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** "28:40", "1:12:05" or "45" (minutes) → seconds; null when it isn't a time. */
export function parseDuration(text: string): number | null {
  const t = text.trim();
  if (/^\d+$/.test(t)) return Number(t) * 60;
  const parts = t.split(':').map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  const [h, m, s] = parts.length === 3 ? parts : [0, ...parts];
  if (m! >= 60 || s! >= 60) return null;
  return h! * 3600 + m! * 60 + s!;
}

function avg(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
