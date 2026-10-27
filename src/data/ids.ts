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
export { toDay as toLocalDay } from '@/domain/days';
