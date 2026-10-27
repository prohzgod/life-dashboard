import { generateKeyBetween } from 'fractional-indexing';
import { blocksToLinks, blocksToText, type DocLink } from '@/domain/blocks';
import { dayOfMonth, month, year, type Day } from '@/domain/days';
import { canMove, descendantIds, sortKeyAt } from '@/domain/library';
import { searchDocs, type SearchHit } from '@/domain/search';
import { db } from './db';
import { nowIso } from './ids';
import { attachmentsRepo, linksRepo, nodesRepo } from './repositories';
import { getCurrentSpaceId } from './session';
import { setTags, tagsFor } from './tags';
import type { Attachment, LibraryNode } from './types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export class LibraryError extends Error {}

/** Every live node in this space. */
export function listLibraryNodes(): Promise<LibraryNode[]> {
  return nodesRepo.list();
}

export function getNode(id: string): Promise<LibraryNode | undefined> {
  return nodesRepo.get(id);
}

function blankNode(): Pick<LibraryNode, 'contentJson' | 'contentText' | 'icon' | 'isSystem' | 'systemKey' | 'favoritedAt' | 'areaId' | 'goalId'> {
  return { contentJson: null, contentText: '', icon: null, isSystem: false, systemKey: null, favoritedAt: null, areaId: null, goalId: null };
}

async function lastSortKeyUnder(parentId: string | null): Promise<string | null> {
  const siblings = await nodesRepo.listChildren(parentId);
  return siblings.at(-1)?.sortKey ?? null;
}

/** A new page or folder at the end of `parentId`'s children (null = top level). */
export async function createNode(input: { parentId: string | null; kind: 'page' | 'folder'; title?: string }): Promise<LibraryNode> {
  // One at a time, so two quick creates can't pick the same "last" position. (The callback must be
  // async for Dexie to keep the transaction open across the nested awaits.)
  return db.transaction('rw', db.nodes, async () => await createNodeNow(input));
}

async function createNodeNow(input: { parentId: string | null; kind: 'page' | 'folder'; title?: string }): Promise<LibraryNode> {
  const parent = input.parentId ? await nodesRepo.get(input.parentId) : undefined;
  if (input.parentId && !parent) throw new LibraryError('That folder no longer exists.');
  if (parent?.systemKey && /^journal(:\d{4}(-\d{2})?)?$/.test(parent.systemKey)) {
    throw new LibraryError('The Journal files its days by itself. Add pages inside a day instead.');
  }
  return nodesRepo.create({
    ...blankNode(),
    parentId: input.parentId,
    kind: input.kind,
    title: input.title ?? (input.kind === 'folder' ? 'New folder' : 'Untitled'),
    sortKey: generateKeyBetween(await lastSortKeyUnder(input.parentId), null),
  });
}

export async function renameNode(id: string, title: string): Promise<void> {
  const node = await nodesRepo.get(id);
  if (!node || node.isSystem) return;
  const next = title.trim();
  if (next && next !== node.title) await nodesRepo.update(id, { title: next });
}

/** Moves a node to `index` among `parentId`'s children. Only the moved row is written. */
export async function moveNode(id: string, parentId: string | null, index: number): Promise<void> {
  const nodes = await nodesRepo.list();
  const node = nodes.find((n) => n.id === id);
  if (!node) return;
  const check = canMove(nodes, node, parentId);
  if (!check.ok) throw new LibraryError(check.reason);
  const siblings = nodes.filter((n) => n.parentId === parentId && n.id !== id);
  await nodesRepo.update(id, { parentId, sortKey: sortKeyAt(siblings, index) });
}

/** Moves a page and everything under it to Trash, stamped with one time so they come back together. */
export async function trashNode(id: string): Promise<void> {
  await db.transaction('rw', db.nodes, async () => {
    const nodes = await nodesRepo.list();
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    if (node.isSystem) throw new LibraryError('Built-in folders can’t be deleted.');
    const now = nowIso();
    for (const target of [id, ...descendantIds(nodes, id)]) {
      const row = nodes.find((n) => n.id === target)!;
      await db.nodes.put({ ...row, deletedAt: now, updatedAt: now });
    }
  });
}

/** Brings a trashed page back with what was trashed alongside it. If its folder is gone, it returns to the top level. */
export async function restoreNode(id: string): Promise<void> {
  await db.transaction('rw', db.nodes, async () => {
    const space = getCurrentSpaceId();
    const all = (await db.nodes.where('spaceId').equals(space).toArray()) as LibraryNode[];
    const node = all.find((n) => n.id === id);
    if (!node?.deletedAt) return;
    const stamp = node.deletedAt;
    const parent = node.parentId ? all.find((n) => n.id === node.parentId) : undefined;
    const now = nowIso();
    const restoreIds = [id, ...descendantIds(all, id).filter((d) => all.find((n) => n.id === d)?.deletedAt === stamp)];
    for (const target of restoreIds) {
      const row = all.find((n) => n.id === target)!;
      const orphaned = target === id && (!parent || parent.deletedAt !== null);
      await db.nodes.put({ ...row, deletedAt: null, updatedAt: now, ...(orphaned ? { parentId: null } : {}) });
    }
  });
}

/** What's in Trash: the top of each trashed group, newest first. */
export async function listTrash(): Promise<LibraryNode[]> {
  const deleted = await nodesRepo.listDeleted();
  return deleted.filter((n) => !deleted.some((p) => p.id === n.parentId && p.deletedAt === n.deletedAt));
}

export async function toggleFavorite(id: string): Promise<void> {
  const node = await nodesRepo.get(id);
  if (node) await nodesRepo.update(id, { favoritedAt: node.favoritedAt ? null : nowIso() });
}

export async function setNodeProperties(id: string, props: Partial<Pick<LibraryNode, 'areaId' | 'goalId'>>): Promise<void> {
  await nodesRepo.update(id, props);
}

export function setNodeTags(id: string, names: readonly string[]) {
  return setTags('node', id, names);
}

export function tagsForNode(id: string) {
  return tagsFor('node', id);
}

/** Saves a page's document, its plain text for search, and its [[links]] and @mentions. */
export async function savePageContent(id: string, contentJson: unknown): Promise<void> {
  await db.transaction('rw', [db.nodes, db.links], async () => {
    const node = await nodesRepo.get(id);
    if (!node) return;
    await nodesRepo.update(id, { contentJson, contentText: blocksToText(contentJson) });
    await syncLinks(id, blocksToLinks(contentJson));
  });
}

async function syncLinks(fromId: string, wanted: DocLink[]) {
  const current = await linksRepo.list((l) => l.fromType === 'node' && l.fromId === fromId);
  const key = (l: DocLink) => `${l.toType}:${l.toId}`;
  const wantedKeys = new Set(wanted.map(key));
  for (const link of current) if (!wantedKeys.has(key(link as DocLink))) await linksRepo.remove(link.id);
  const currentKeys = new Set(current.map((l) => key(l as DocLink)));
  for (const link of wanted) {
    if (!currentKeys.has(key(link)) && link.toId !== fromId) await linksRepo.create({ fromType: 'node', fromId, ...link });
  }
}

export type Backlink = { node: LibraryNode; snippet: string };

/** Pages that link to this one, with the words around the link. */
export async function listBacklinks(id: string): Promise<Backlink[]> {
  const links = await linksRepo.list((l) => l.toType === 'node' && l.toId === id && l.fromType === 'node');
  const target = await nodesRepo.get(id);
  const out: Backlink[] = [];
  for (const link of links) {
    const node = await nodesRepo.get(link.fromId);
    if (!node) continue;
    const text = node.contentText;
    const at = target ? text.indexOf(target.title) : -1;
    const snippet = at >= 0 ? text.slice(Math.max(0, at - 40), at + target!.title.length + 40) : text.slice(0, 80);
    out.push({ node, snippet: snippet.replace(/\s+/g, ' ').trim() });
  }
  return out.sort((a, b) => b.node.updatedAt.localeCompare(a.node.updatedAt));
}

/** Pages that mention a goal, for the goal's own page later. */
export async function listPagesMentioningGoal(goalId: string): Promise<LibraryNode[]> {
  const links = await linksRepo.list((l) => l.toType === 'goal' && l.toId === goalId && l.fromType === 'node');
  const nodes = await Promise.all(links.map((l) => nodesRepo.get(l.fromId)));
  return nodes.filter((n): n is LibraryNode => !!n);
}

export function listNodeAttachments(id: string): Promise<Attachment[]> {
  return attachmentsRepo.where('nodeId', id);
}

/** Every image on this device, newest first, for All photos. */
export async function listPhotos(): Promise<Attachment[]> {
  const all = await attachmentsRepo.list((a) => a.mime.startsWith('image/'));
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type UploadInput = { blob: Blob; thumbBlob: Blob | null; width: number | null; height: number | null; name?: string };

/** Stores an image or file for a page. The editor refers to it as `attachment://<id>`. */
export async function saveUpload(nodeId: string | null, file: UploadInput): Promise<Attachment> {
  return attachmentsRepo.create({
    nodeId,
    blob: file.blob,
    thumbBlob: file.thumbBlob,
    mime: file.blob.type || 'application/octet-stream',
    size: file.blob.size,
    width: file.width,
    height: file.height,
    takenAt: null,
    caption: file.name ?? '',
  });
}

export const ATTACHMENT_URL = 'attachment://';

export async function attachmentBlob(url: string, thumb = false): Promise<Blob | null> {
  if (!url.startsWith(ATTACHMENT_URL)) return null;
  const attachment = await attachmentsRepo.get(url.slice(ATTACHMENT_URL.length));
  if (!attachment) return null;
  return (thumb && attachment.thumbBlob) || attachment.blob;
}

/** Full-text search over page titles and text. */
export async function searchLibrary(query: string): Promise<SearchHit[]> {
  const nodes = await nodesRepo.list((n) => n.kind === 'page' || n.kind === 'folder');
  return searchDocs(
    nodes.map((n) => ({ id: n.id, title: n.title, text: n.contentText })),
    query,
  );
}

async function bySystemKey(key: string): Promise<LibraryNode | undefined> {
  const rows = await db.nodes.where('systemKey').equals(key).toArray();
  return rows.find((n) => n.deletedAt === null && n.spaceId === getCurrentSpaceId());
}

async function ensureSystemNode(key: string, parentId: string | null, title: string, kind: 'folder' | 'page'): Promise<LibraryNode> {
  const existing = await bySystemKey(key);
  if (existing) return existing;
  // Journal children are named so that their keys sort in date order.
  return nodesRepo.create({
    ...blankNode(),
    parentId,
    kind,
    title,
    isSystem: true,
    systemKey: key,
    sortKey: generateKeyBetween(await lastSortKeyUnder(parentId), null),
  });
}

/** "Tue 27 Oct" */
export function journalPageTitle(day: Day): string {
  const d = new Date(year(day), month(day) - 1, dayOfMonth(day));
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]!.slice(0, 3)}`;
}

/** The Journal page for a day, filed under Journal › year › month, created the first time it's needed. */
export async function ensureJournalPage(day: Day): Promise<LibraryNode> {
  return db.transaction('rw', [db.nodes, db.dailyEntries], async () => {
    const journal = await bySystemKey('journal');
    if (!journal) throw new LibraryError('The Journal folder is missing.');
    const y = String(year(day));
    const m = `${y}-${String(month(day)).padStart(2, '0')}`;
    const yearNode = await ensureSystemNode(`journal:${y}`, journal.id, y, 'folder');
    const monthNode = await ensureSystemNode(`journal:${m}`, yearNode.id, MONTHS[month(day) - 1]!, 'folder');
    const page = await ensureSystemNode(`journal:${day}`, monthNode.id, journalPageTitle(day), 'page');
    const entry = (await db.dailyEntries.where('[spaceId+day]').equals([getCurrentSpaceId(), day]).toArray()).find((e) => e.deletedAt === null);
    if (entry && entry.journalNodeId !== page.id) await db.dailyEntries.put({ ...entry, journalNodeId: page.id, updatedAt: nowIso() });
    return page;
  });
}

/** The day a journal page belongs to, if it is one. */
export function journalDayOf(node: Pick<LibraryNode, 'systemKey'>): Day | null {
  const m = /^journal:(\d{4}-\d{2}-\d{2})$/.exec(node.systemKey ?? '');
  return m ? m[1]! : null;
}

const textBlock = (text: string) => ({ type: 'paragraph', props: {}, content: [{ type: 'text', text, styles: {} }], children: [] });

/** A quick note: the first line becomes the page title, the rest its body. Filed at the top level. */
export async function createNoteFromText(text: string): Promise<LibraryNode> {
  const [first = '', ...rest] = text.trim().split('\n');
  const title = first.trim().slice(0, 120) || 'Quick note';
  const node = await createNode({ parentId: null, kind: 'page', title });
  const body = rest.map((l) => l.trim()).filter(Boolean);
  if (body.length) await savePageContent(node.id, body.map(textBlock));
  return node;
}

/** Adds a paragraph to the end of a day's Journal page. */
export async function appendToJournal(day: Day, text: string): Promise<LibraryNode> {
  const page = await ensureJournalPage(day);
  const existing = Array.isArray(page.contentJson) ? page.contentJson : [];
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  await savePageContent(page.id, [...existing, ...lines.map(textBlock)]);
  return page;
}
