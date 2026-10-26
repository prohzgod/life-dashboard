import { monotonicFactory } from 'ulid';

const ulid = monotonicFactory();

/** A new ULID: sortable by creation time, unique without a server. */
export function newId(): string {
  return ulid();
}

/** Now as a UTC ISO timestamp. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** A date as a local `YYYY-MM-DD` day (not UTC), for habit and journal days. */
export function toLocalDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
