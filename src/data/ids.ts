import { monotonicFactory } from 'ulid';

const ulid = monotonicFactory();

/** A new ULID: sortable by creation time, unique without a server. */
export function newId(): string {
  return ulid();
}

let lastMs = 0;

/**
 * Now as a UTC ISO timestamp, strictly increasing on this device: two writes in the same
 * millisecond still get different times, so "newest wins" and "trashed together" stay exact.
 */
export function nowIso(): string {
  lastMs = Math.max(Date.now(), lastMs + 1);
  return new Date(lastMs).toISOString();
}

/** A date as a local `YYYY-MM-DD` day (not UTC), for habit and journal days. */
export { toDay as toLocalDay } from '@/domain/days';
