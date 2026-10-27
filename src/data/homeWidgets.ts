import { generateKeyBetween } from 'fractional-indexing';
import { allowedSize, DEFAULT_WIDGETS, type WidgetSize } from '@/domain/home';
import { sortKeyAt } from '@/domain/library';
import { db } from './db';
import { homeWidgetsRepo } from './repositories';
import type { HomeWidget, LinkTarget } from './types';

const bySortKey = (a: HomeWidget, b: HomeWidget) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0);

/** Sets up Home with the default widgets, once. Runs at startup (writes can't happen inside live queries). */
export async function ensureHomeWidgets(): Promise<void> {
  await db.transaction('rw', db.homeWidgets, async () => {
    if ((await homeWidgetsRepo.list()).length) return;
    let key: string | null = null;
    for (const w of DEFAULT_WIDGETS) {
      key = generateKeyBetween(key, null);
      await homeWidgetsRepo.create({ ...w, sortKey: key, refType: null, refId: null });
    }
  });
}

/** Home's widgets in order. */
export async function listHomeWidgets(): Promise<HomeWidget[]> {
  return (await homeWidgetsRepo.list()).sort(bySortKey);
}

export async function setWidgetSize(id: string, size: WidgetSize): Promise<void> {
  const widget = await homeWidgetsRepo.get(id);
  if (widget) await homeWidgetsRepo.update(id, { size: allowedSize(widget.kind, size) });
}

/** Hiding keeps the widget (and its data); pinned items are unpinned instead. */
export async function setWidgetHidden(id: string, hidden: boolean): Promise<void> {
  const widget = await homeWidgetsRepo.get(id);
  if (!widget) return;
  if (widget.kind === 'pinned' && hidden) await homeWidgetsRepo.remove(id);
  else await homeWidgetsRepo.update(id, { hidden, ...(hidden ? {} : { sortKey: await endKey() }) });
}

/** Moves a widget to `index` among the visible ones. Only that row changes. */
export async function moveWidget(id: string, index: number): Promise<void> {
  const visible = (await listHomeWidgets()).filter((w) => !w.hidden && w.id !== id);
  await homeWidgetsRepo.update(id, { sortKey: sortKeyAt(visible, index) });
}

async function endKey(): Promise<string> {
  const rows = await listHomeWidgets();
  return generateKeyBetween(rows.at(-1)?.sortKey ?? null, null);
}

export async function pinnedWidget(refType: LinkTarget, refId: string): Promise<HomeWidget | undefined> {
  return (await homeWidgetsRepo.list((w) => w.kind === 'pinned' && w.refType === refType && w.refId === refId))[0];
}

/** Pins a Library page, goal or habit to Home as a Medium tile at the end. */
export async function pinToHome(refType: LinkTarget, refId: string): Promise<HomeWidget> {
  const existing = await pinnedWidget(refType, refId);
  if (existing) return existing;
  return homeWidgetsRepo.create({ kind: 'pinned', size: 'M', hidden: false, refType, refId, sortKey: await endKey() });
}

export async function unpinFromHome(refType: LinkTarget, refId: string): Promise<void> {
  const existing = await pinnedWidget(refType, refId);
  if (existing) await homeWidgetsRepo.remove(existing.id);
}

/** Back to the default Home. Pins are kept, at the end. */
export async function resetHome(): Promise<void> {
  await db.transaction('rw', db.homeWidgets, async () => {
    const rows = await homeWidgetsRepo.list();
    const pins = rows.filter((w) => w.kind === 'pinned').sort(bySortKey);
    for (const row of rows.filter((w) => w.kind !== 'pinned')) await homeWidgetsRepo.remove(row.id);
    let key: string | null = null;
    for (const w of DEFAULT_WIDGETS) {
      key = generateKeyBetween(key, null);
      await homeWidgetsRepo.create({ ...w, sortKey: key, refType: null, refId: null });
    }
    for (const pin of pins) {
      key = generateKeyBetween(key, null);
      await homeWidgetsRepo.update(pin.id, { sortKey: key });
    }
  });
}
