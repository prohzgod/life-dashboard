import { dataTableNames, db, normalizeGoal, normalizeNode, normalizeTask, type DataTableName } from './db';
import { nowIso } from './ids';
import { setCurrentSpaceId } from './session';
import type { BaseRecord, Goal, LibraryNode, Space, Task } from './types';

export const EXPORT_FORMAT = 'life-dashboard-export';
export const EXPORT_VERSION = 1;

export type ExportFile = {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  /** Dexie schema version the rows came from. */
  schemaVersion: number;
  tables: Partial<Record<DataTableName, unknown[]>>;
};

/** Blobs (images, attachments) travel inside the JSON as base64. */
type EncodedBlob = { $blob: { type: string; base64: string } };

export class ImportError extends Error {}

/** Every record on this device, including soft-deleted ones, as one JSON-ready object. */
export async function exportAll(): Promise<ExportFile> {
  const tables: ExportFile['tables'] = {};
  await db.transaction('r', dataTableNames.map((name) => db[name]), async () => {
    for (const name of dataTableNames) {
      tables[name] = await db[name].toArray();
    }
  });
  for (const name of dataTableNames) {
    tables[name] = await Promise.all((tables[name] ?? []).map((row) => encodeValue(row)));
  }
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: nowIso(), schemaVersion: db.verno, tables };
}

export async function exportAllAsJson(): Promise<string> {
  return JSON.stringify(await exportAll(), null, 2);
}

/** Checks a parsed file and returns it typed, or throws an ImportError with a plain reason. */
export function parseExport(text: string): ExportFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('That file isn’t valid JSON.');
  }
  if (!isObject(data) || data.format !== EXPORT_FORMAT) throw new ImportError('That file isn’t a Life Dashboard export.');
  if (typeof data.version !== 'number' || data.version > EXPORT_VERSION) {
    throw new ImportError('That export comes from a newer version of Life Dashboard. Update this app, then try again.');
  }
  if (!isObject(data.tables)) throw new ImportError('That export has no data in it.');

  for (const [name, rows] of Object.entries(data.tables)) {
    if (!(dataTableNames as readonly string[]).includes(name)) throw new ImportError(`That export has an unknown table, “${name}”.`);
    if (!Array.isArray(rows) || !rows.every((row) => isObject(row) && typeof row.id === 'string')) {
      throw new ImportError(`The “${name}” data in that export is damaged.`);
    }
  }
  const spaces = (data.tables.spaces ?? []) as Space[];
  if (!spaces.some((s) => s.type === 'personal' && s.deletedAt === null)) {
    throw new ImportError('That export has no Personal space, so it can’t be restored.');
  }
  return data as ExportFile;
}

/** Number of records in an export, for the confirmation message. */
export function countExportRecords(file: ExportFile): number {
  return Object.values(file.tables).reduce((sum, rows) => sum + (rows?.length ?? 0), 0);
}

/**
 * Replaces everything on this device with the export, in one transaction:
 * if anything fails, the data already here is left untouched.
 */
export async function importReplacingAll(file: ExportFile): Promise<{ records: number }> {
  const decoded: Partial<Record<DataTableName, BaseRecord[]>> = {};
  for (const name of dataTableNames) {
    decoded[name] = (file.tables[name] ?? []).map((row) => decodeValue(row) as BaseRecord);
  }
  decoded.tasks = (decoded.tasks as Task[]).map(normalizeTask);
  decoded.nodes = (decoded.nodes as LibraryNode[]).map(normalizeNode);
  decoded.goals = (decoded.goals as Goal[]).map(normalizeGoal);
  const personal = (decoded.spaces as Space[]).find((s) => s.type === 'personal' && s.deletedAt === null)!;

  await db.transaction('rw', [...dataTableNames.map((name) => db[name]), db.meta], async () => {
    for (const name of dataTableNames) {
      await db[name].clear();
      // The table types differ per name; rows were checked in parseExport.
      await (db[name] as unknown as { bulkAdd(rows: BaseRecord[]): Promise<unknown> }).bulkAdd(decoded[name] ?? []);
    }
    await db.meta.bulkPut([
      { key: 'currentSpaceId', value: personal.id },
      { key: 'importedAt', value: nowIso() },
    ]);
  });
  setCurrentSpaceId(personal.id);
  return { records: countExportRecords(file) };
}

/** Live record count per table (soft-deleted excluded), for Settings. */
export async function countRecords(): Promise<Record<DataTableName, number>> {
  const counts = {} as Record<DataTableName, number>;
  for (const name of dataTableNames) {
    counts[name] = await db[name].filter((row) => (row as BaseRecord).deletedAt === null).count();
  }
  return counts;
}

async function encodeValue(value: unknown): Promise<unknown> {
  if (value instanceof Blob) {
    const bytes = new Uint8Array(await value.arrayBuffer());
    return { $blob: { type: value.type, base64: toBase64(bytes) } } satisfies EncodedBlob;
  }
  if (Array.isArray(value)) return Promise.all(value.map(encodeValue));
  if (isObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) out[key] = await encodeValue(inner);
    return out;
  }
  return value;
}

function decodeValue(value: unknown): unknown {
  if (isEncodedBlob(value)) return new Blob([fromBase64(value.$blob.base64)], { type: value.$blob.type });
  if (Array.isArray(value)) return value.map(decodeValue);
  if (isObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) out[key] = decodeValue(inner);
    return out;
  }
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Blob);
}

function isEncodedBlob(value: unknown): value is EncodedBlob {
  return isObject(value) && isObject(value.$blob) && typeof value.$blob.base64 === 'string';
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
