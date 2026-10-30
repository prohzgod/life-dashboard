// @vitest-environment node
import Dexie from 'dexie';
import { saveDailyEntry } from './checkIns';
import { LifeDb } from './db';
import {
  attachmentBlob,
  createNode,
  ensureJournalPage,
  journalDayOf,
  journalPageTitle as journalPageTitleNow,
  LibraryError,
  listBacklinks,
  listLibraryNodes,
  localizeSystemNodes,
  listTrash,
  moveNode,
  renameNode,
  restoreNode,
  saveUpload,
  savePageContent,
  searchLibrary,
  tagsForNode,
  setNodeTags,
  toggleFavorite,
  trashNode,
} from './library';
import { goalsRepo, linksRepo, nodesRepo } from './repositories';
import { getDailyEntry } from './checkIns';
import { freshDatabase } from './testing';
import { setLocale } from '@/i18n/locale';

beforeEach(freshDatabase);

const folder = async (key: string) => (await listLibraryNodes()).find((n) => n.systemKey === key)!;
const paragraph = (...content: unknown[]) => ({ type: 'paragraph', props: {}, content, children: [] });
const text = (t: string) => ({ type: 'text', text: t, styles: {} });

describe('creating, renaming and moving', () => {
  it('creates pages at the end of their folder', async () => {
    const projects = await folder('projects');
    const a = await createNode({ parentId: projects.id, kind: 'page', title: 'Japan trip 2027' });
    const b = await createNode({ parentId: projects.id, kind: 'page' });
    expect(b.title).toBe('Untitled');
    expect(b.sortKey > a.sortKey).toBe(true);
    expect((await nodesRepo.listChildren(projects.id)).map((n) => n.id)).toEqual([a.id, b.id]);
  });

  it('keeps the Journal’s folders for its own days', async () => {
    const journal = await folder('journal');
    await expect(createNode({ parentId: journal.id, kind: 'page' })).rejects.toThrow(LibraryError);
  });

  it('renames pages but never built-ins', async () => {
    const page = await createNode({ parentId: null, kind: 'page' });
    await renameNode(page.id, '  Reading notes ');
    expect((await nodesRepo.get(page.id))!.title).toBe('Reading notes');
    const journal = await folder('journal');
    await renameNode(journal.id, 'Diary');
    expect((await nodesRepo.get(journal.id))!.title).toBe('Journal');
  });

  it('moves with one write: new parent and a sortKey between the new neighbours', async () => {
    const projects = await folder('projects');
    const [a, b, c] = await Promise.all(['A', 'B', 'C'].map((title) => createNode({ parentId: projects.id, kind: 'page', title })));
    const loose = await createNode({ parentId: null, kind: 'page', title: 'Loose' });
    await moveNode(loose.id, projects.id, 1);
    const order = (await nodesRepo.listChildren(projects.id)).map((n) => n.title);
    expect(order).toEqual(['A', 'Loose', 'B', 'C']);
    expect((await nodesRepo.get(a!.id))!.updatedAt).toBe(a!.updatedAt);
    expect((await nodesRepo.get(c!.id))!.sortKey).toBe(c!.sortKey);
    void b;
  });

  it('refuses impossible moves', async () => {
    const parent = await createNode({ parentId: null, kind: 'page', title: 'Parent' });
    const child = await createNode({ parentId: parent.id, kind: 'page', title: 'Child' });
    await expect(moveNode(parent.id, child.id, 0)).rejects.toThrow('inside itself');
    await expect(moveNode((await folder('areas')).id, parent.id, 0)).rejects.toThrow('Built-in');
  });
});

describe('trash', () => {
  it('trashes a page with its children and restores them together', async () => {
    const parent = await createNode({ parentId: null, kind: 'page', title: 'Japan' });
    const child = await createNode({ parentId: parent.id, kind: 'page', title: 'Budget' });
    await trashNode(parent.id);
    expect((await listLibraryNodes()).some((n) => n.id === child.id)).toBe(false);
    expect((await listTrash()).map((n) => n.title)).toEqual(['Japan']);

    await restoreNode(parent.id);
    expect((await nodesRepo.get(child.id))!.parentId).toBe(parent.id);
    expect(await listTrash()).toEqual([]);
  });

  it('restores a page to the top level when its folder is still in Trash', async () => {
    const parent = await createNode({ parentId: null, kind: 'page', title: 'Old folder' });
    const child = await createNode({ parentId: parent.id, kind: 'page', title: 'Keep me' });
    await trashNode(child.id);
    await trashNode(parent.id);
    expect((await listTrash()).map((n) => n.title).sort()).toEqual(['Keep me', 'Old folder']);
    await restoreNode(child.id);
    expect((await nodesRepo.get(child.id))!.parentId).toBeNull();
  });

  it('refuses to trash built-in folders', async () => {
    await expect(trashNode((await folder('journal')).id)).rejects.toThrow(LibraryError);
  });
});

describe('content, links and search', () => {
  it('saves text and [[links]] / @mentions, and shows backlinks', async () => {
    const budget = await createNode({ parentId: null, kind: 'page', title: 'Budget' });
    const trip = await createNode({ parentId: null, kind: 'page', title: 'Japan trip 2027' });
    const [goal] = await goalsRepo.listRoots();
    await savePageContent(trip.id, [
      paragraph(text('Costs live in '), { type: 'pageLink', props: { id: budget.id, title: 'Budget' } }, text(', for '), { type: 'goalMention', props: { id: goal!.id, title: goal!.title } }),
    ]);

    expect((await nodesRepo.get(trip.id))!.contentText).toBe(`Costs live in Budget, for ${goal!.title}`);
    expect((await linksRepo.list()).map((l) => `${l.toType}:${l.toId}`).sort()).toEqual([`goal:${goal!.id}`, `node:${budget.id}`].sort());
    const [backlink] = await listBacklinks(budget.id);
    expect(backlink!.node.id).toBe(trip.id);
    expect(backlink!.snippet).toContain('Costs live in Budget');

    // Removing the link removes the backlink.
    await savePageContent(trip.id, [paragraph(text('No links now'))]);
    expect(await listBacklinks(budget.id)).toEqual([]);
  });

  it('finds pages by words in the title or body', async () => {
    const trip = await createNode({ parentId: null, kind: 'page', title: 'Japan trip 2027' });
    await savePageContent(trip.id, [paragraph(text('Kyoto first, then Tokyo.'))]);
    await createNode({ parentId: null, kind: 'page', title: 'Kyoto restaurants' });
    expect((await searchLibrary('kyoto')).map((h) => h.title)).toEqual(['Kyoto restaurants', 'Japan trip 2027']);
    expect((await searchLibrary('tokyo kyoto'))[0]!.snippet).toContain('Kyoto first');
  });

  it('tags and favourites pages', async () => {
    const page = await createNode({ parentId: null, kind: 'page', title: 'Training plan' });
    await setNodeTags(page.id, ['#travel', 'running']);
    expect((await tagsForNode(page.id)).map((t) => t.name).sort()).toEqual(['running', 'travel']);
    await toggleFavorite(page.id);
    expect((await nodesRepo.get(page.id))!.favoritedAt).not.toBeNull();
    await toggleFavorite(page.id);
    expect((await nodesRepo.get(page.id))!.favoritedAt).toBeNull();
  });

  it('stores uploads as attachment:// references', async () => {
    const page = await createNode({ parentId: null, kind: 'page' });
    const att = await saveUpload(page.id, { blob: new Blob(['img'], { type: 'image/png' }), thumbBlob: new Blob(['t'], { type: 'image/jpeg' }), width: 1, height: 1 });
    expect(await (await attachmentBlob(`attachment://${att.id}`))!.text()).toBe('img');
    expect(await (await attachmentBlob(`attachment://${att.id}`, true))!.text()).toBe('t');
    expect(await attachmentBlob('https://example.com/x.png')).toBeNull();
  });
});

describe('journal', () => {
  it('files one page per day under Journal › year › month, and links the check-in', async () => {
    await saveDailyEntry('2026-10-27', { mood: 4 });
    const page = await ensureJournalPage('2026-10-27');
    const again = await ensureJournalPage('2026-10-27');
    expect(again.id).toBe(page.id);
    expect(page).toMatchObject({ title: 'Tue 27 Oct', systemKey: 'journal:2026-10-27', isSystem: true });
    expect(journalDayOf(page)).toBe('2026-10-27');

    const month = await nodesRepo.get(page.parentId!);
    const year = await nodesRepo.get(month!.parentId!);
    expect([month!.title, year!.title]).toEqual(['October', '2026']);
    expect(year!.parentId).toBe((await folder('journal')).id);
    expect((await getDailyEntry('2026-10-27'))!.journalNodeId).toBe(page.id);
  });

  it('keeps days and months in date order', async () => {
    await ensureJournalPage('2026-10-27');
    await ensureJournalPage('2026-10-28');
    await ensureJournalPage('2026-11-01');
    const oct = (await listLibraryNodes()).find((n) => n.systemKey === 'journal:2026-10')!;
    expect((await nodesRepo.listChildren(oct.id)).map((n) => n.title)).toEqual(['Tue 27 Oct', 'Wed 28 Oct']);
    const y = (await listLibraryNodes()).find((n) => n.systemKey === 'journal:2026')!;
    expect((await nodesRepo.listChildren(y.id)).map((n) => n.title)).toEqual(['October', 'November']);
  });

  it('renames the folders and days it made into the current language, and nothing else', async () => {
    const page = await ensureJournalPage('2026-10-27');
    const mine = await createNode({ parentId: null, kind: 'folder', title: 'October plans' });
    const before = (await nodesRepo.get(page.id))!.updatedAt;
    try {
      setLocale('vi');
      expect(await localizeSystemNodes()).toBeGreaterThan(0);
      const titles = new Map((await listLibraryNodes()).map((n) => [n.systemKey ?? n.id, n.title]));
      expect(titles.get('journal')).toBe('Nhật ký');
      expect(titles.get('journal:2026-10')).toBe('Tháng 10');
      expect(titles.get('journal:2026')).toBe('2026');
      expect(titles.get('journal:2026-10-27')).toBe(messagesTitle());
      expect(titles.get(mine.id)).toBe('October plans');
      expect((await nodesRepo.get(page.id))!.updatedAt).toBe(before);
      // A second run has nothing left to do.
      expect(await localizeSystemNodes()).toBe(0);
    } finally {
      setLocale('en');
    }
    await localizeSystemNodes();
    expect((await folder('journal:2026-10')).title).toBe('October');
  });

  it('survives two calls at once (StrictMode runs effects twice)', async () => {
    const [a, b] = await Promise.all([ensureJournalPage('2026-10-27'), ensureJournalPage('2026-10-27')]);
    expect(a.id).toBe(b.id);
    expect((await listLibraryNodes()).filter((n) => n.systemKey === 'journal:2026-10-27')).toHaveLength(1);
  });
});

describe('schema v2 → v3', () => {
  it('gives seeded folders their system keys', async () => {
    const name = 'migration-v3';
    const v2 = new Dexie(name);
    v2.version(2).stores({ nodes: 'id, spaceId, parentId, kind, updatedAt' });
    await v2.table('nodes').bulkAdd([
      { id: 'j', title: 'Journal', isSystem: true, parentId: null, deletedAt: null },
      { id: 'p', title: 'My page', isSystem: false, parentId: null, deletedAt: null },
    ]);
    v2.close();
    const db = new LifeDb(name);
    expect(await db.nodes.get('j')).toMatchObject({ systemKey: 'journal', favoritedAt: null, areaId: null, goalId: null });
    expect(await db.nodes.get('p')).toMatchObject({ systemKey: null });
    expect(await db.nodes.where('systemKey').equals('journal').count()).toBe(1);
    db.close();
    await Dexie.delete(name);
  });
});

/** Today's journal title in the language now set, as the app writes it. */
function messagesTitle(): string {
  return journalPageTitleNow('2026-10-27');
}
