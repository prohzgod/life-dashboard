// @vitest-environment node
import { countExportRecords, exportAll, exportAllAsJson, ImportError, importReplacingAll, parseExport } from './backup';
import { db } from './db';
import { attachmentsRepo, nodesRepo, tasksRepo } from './repositories';
import { freshDatabase } from './testing';

beforeEach(freshDatabase);

describe('export', () => {
  it('includes every table, soft-deleted rows, and a format header', async () => {
    const [review] = await tasksRepo.list();
    await tasksRepo.remove(review!.id);

    const file = await exportAll();
    expect(file).toMatchObject({ format: 'life-dashboard-export', version: 2, schemaVersion: 9 });
    expect(file.tables.areas).toHaveLength(8);
    expect(file.tables.tasks).toEqual([expect.objectContaining({ id: review!.id, deletedAt: expect.any(String) })]);
    expect(Object.keys(file.tables)).toContain('events');
  });

  it('round-trips through JSON, Blobs included', async () => {
    const [journal] = await nodesRepo.listChildren(null);
    const bytes = new Uint8Array([0, 1, 2, 250, 255]);
    const photo = await attachmentsRepo.create({
      nodeId: journal!.id,
      blob: new Blob([bytes], { type: 'image/png' }),
      thumbBlob: null,
      mime: 'image/png',
      size: bytes.length,
      width: 1,
      height: 1,
      takenAt: null,
      caption: 'First long run',
    });
    const json = await exportAllAsJson();
    const before = await db.tasks.toArray();

    await freshDatabase(); // a new device, already seeded with its own defaults
    const result = await importReplacingAll(parseExport(json));

    expect(result.records).toBe(countExportRecords(parseExport(json)));
    expect(await db.tasks.toArray()).toEqual(before);
    expect(await db.areas.count()).toBe(8); // replaced, not doubled

    const restored = await attachmentsRepo.get(photo.id);
    expect(restored?.caption).toBe('First long run');
    expect(new Uint8Array(await restored!.blob.arrayBuffer())).toEqual(bytes);
    expect(restored!.blob.type).toBe('image/png');
  });

  it('imports a version 1 export, dropping its spaces', async () => {
    const file = await exportAll();
    const v1 = {
      ...file,
      version: 1,
      tables: {
        ...file.tables,
        spaces: [{ id: 'p', spaceId: 'p', name: 'Personal', type: 'personal', createdAt: 'x', updatedAt: 'x', deletedAt: null }],
        tasks: file.tables.tasks!.map((t) => ({ ...(t as object), spaceId: 'p' })),
      },
    };
    await freshDatabase();
    const parsed = parseExport(JSON.stringify(v1));
    expect(countExportRecords(parsed)).toBe(countExportRecords(file));

    await importReplacingAll(parsed);
    const [task] = await db.tasks.toArray();
    expect(task).toBeDefined();
    expect(task).not.toHaveProperty('spaceId');
    expect(await tasksRepo.list()).toHaveLength(1);
  });
});

describe('parseExport', () => {
  const valid = async () => JSON.parse(await exportAllAsJson()) as Record<string, unknown>;

  it.each([
    ['not json', 'isn’t valid JSON'],
    ['{"hello":1}', 'isn’t a Life Dashboard export'],
  ])('rejects %s', (text, message) => {
    expect(() => parseExport(text)).toThrow(ImportError);
    expect(() => parseExport(text)).toThrow(message);
  });

  it('rejects a newer export version', async () => {
    const file = { ...(await valid()), version: 99 };
    expect(() => parseExport(JSON.stringify(file))).toThrow('newer version');
  });

  it('rejects unknown tables and damaged rows', async () => {
    const file = await valid();
    const tables = file.tables as Record<string, unknown[]>;
    expect(() => parseExport(JSON.stringify({ ...file, tables: { ...tables, secrets: [] } }))).toThrow('unknown table');
    expect(() => parseExport(JSON.stringify({ ...file, tables: { ...tables, tasks: [{ title: 'no id' }] } }))).toThrow('damaged');
  });

  it('fills in task fields added since an older export', async () => {
    const file = parseExport(await exportAllAsJson());
    const legacy = { ...(file.tables.tasks![0] as Record<string, unknown>) };
    delete legacy.time;
    delete legacy.repeatOfId;
    file.tables.tasks = [legacy];
    await importReplacingAll(file);
    expect(await db.tasks.get(legacy.id as string)).toMatchObject({ time: null, repeatOfId: null });
  });

  it('leaves existing data untouched when an import fails part-way', async () => {
    const file = parseExport(await exportAllAsJson());
    // Two rows with the same id make bulkAdd fail inside the transaction.
    const dup = file.tables.areas![0];
    file.tables.areas = [dup, dup];
    const before = await db.areas.toArray();

    await expect(importReplacingAll(file)).rejects.toThrow();
    expect(await db.areas.toArray()).toEqual(before);
  });
});
