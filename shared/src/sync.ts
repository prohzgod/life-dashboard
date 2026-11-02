/** What the app and the API agree on. Kept free of dependencies, so both can import it. */
export const SYNC_TABLES = [
  'areas',
  'areaRatings',
  'goals',
  'keyResults',
  'milestones',
  'tasks',
  'habits',
  'habitLogs',
  'metrics',
  'metricEntries',
  'dailyEntries',
  'nodes',
  'attachments',
  'links',
  'tags',
  'taggings',
  'homeWidgets',
  'profile',
  'reviews',
  'calendars',
  'events',
  'visionCards',
  'budgets',
  'transactions',
  'accounts',
  'workouts',
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

/** A row on the wire. `payload` is the whole record minus `dirty` and any Blob fields. */
export type SyncRow = { table: SyncTable; id: string; updatedAt: string; deletedAt: string | null; payload: Record<string, unknown> };

/** `clientNow`: this device's clock when sending, so the server can correct for a clock that's wrong. */
export type PushRequest = { rows: SyncRow[]; clientNow?: string };
/** `winners`: rows where the server's version is the one to keep, because yours lost or its time was corrected. */
export type PushResponse = { accepted: string[]; winners: SyncRow[] };
export type PullResponse = { rows: SyncRow[]; cursor: number; hasMore: boolean };

export type FileKind = 'original' | 'thumb';
export type PresignRequest = { items: { attachmentId: string; kind: FileKind; mime: string; size: number; mode: 'put' | 'get' }[] };
export type PresignResponse = { items: { attachmentId: string; kind: FileKind; url: string }[] };

/** Names the account a device means to sync with, so a session that has since changed can't receive its rows. */
export const SYNC_ACCOUNT_HEADER = 'x-sync-account';

export const MAX_BATCH_BYTES = 1_000_000;
export const MAX_ROW_BYTES = 4_000_000;
export const MAX_FILE_BYTES = 50_000_000;
export const PULL_PAGE_SIZE = 500;
