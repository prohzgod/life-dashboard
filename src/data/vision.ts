import { messages } from '@/i18n/locale';
import type { Area } from '@design/tokens';
import { generateKeyBetween } from 'fractional-indexing';
import type { Day } from '@/domain/days';
import { year } from '@/domain/days';
import { sortKeyAt } from '@/domain/library';
import { clampRect, type CanvasRect } from '@/domain/vision';
import { db } from './db';
import { loadGoalBoard } from './goalActions';
import { saveUpload, type UploadInput } from './library';
import { attachmentsRepo, visionCardsRepo } from './repositories';
import type { VisionCard } from './types';

export class VisionError extends Error {}

const bySortKey = (a: VisionCard, b: VisionCard) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0);

export async function listVisionCards(): Promise<VisionCard[]> {
  return (await visionCardsRepo.list()).sort(bySortKey);
}

async function endKey(): Promise<string> {
  return generateKeyBetween((await listVisionCards()).at(-1)?.sortKey ?? null, null);
}

type NewCard = Partial<Pick<VisionCard, 'areaId' | 'goalId' | 'size' | 'bold' | 'text'>>;

/** A quote or intention, set large. */
export async function addWordsCard(input: NewCard & { text: string }): Promise<VisionCard> {
  const text = input.text.trim();
  if (!text) throw new VisionError(messages().errors.vision.words);
  return visionCardsRepo.create({
    kind: 'words',
    text,
    areaId: input.areaId ?? null,
    goalId: input.goalId ?? null,
    size: input.size ?? 'S',
    bold: input.bold ?? false,
    attachmentId: null,
    canvas: null,
    sortKey: await endKey(),
  });
}

/** Saves pictures (with thumbnails made on this device) and adds a card for each, at the end. */
export async function addImageCards(images: ReadonlyArray<UploadInput>, input: NewCard = {}): Promise<VisionCard[]> {
  const cards: VisionCard[] = [];
  for (const image of images) {
    const attachment = await saveUpload(null, image);
    cards.push(await addImageCardFor(attachment.id, image.name?.replace(/\.[^.]+$/, '') ?? '', input));
  }
  return cards;
}

/** Puts a picture that's already in your Library on the board; the Library keeps it. */
export async function addLibraryPhotos(attachmentIds: readonly string[], input: NewCard = {}): Promise<VisionCard[]> {
  const cards: VisionCard[] = [];
  for (const id of attachmentIds) {
    const attachment = await attachmentsRepo.get(id);
    if (attachment) cards.push(await addImageCardFor(id, attachment.caption, input));
  }
  return cards;
}

async function addImageCardFor(attachmentId: string, caption: string, input: NewCard): Promise<VisionCard> {
  return visionCardsRepo.create({
    kind: 'image',
    text: input.text ?? caption,
    areaId: input.areaId ?? null,
    goalId: input.goalId ?? null,
    size: input.size ?? 'L',
    bold: false,
    attachmentId,
    canvas: null,
    sortKey: await endKey(),
  });
}

/** Fetches a picture from a link. Many sites don't let web apps copy their images; the error says what to do instead. */
export async function fetchImage(url: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(url.trim());
  } catch {
    throw new VisionError(
      navigator.onLine === false ? messages().errors.vision.offline : messages().errors.vision.blocked,
    );
  }
  const blob = await response.blob();
  if (!response.ok || !blob.type.startsWith('image/')) throw new VisionError(messages().errors.vision.notPicture);
  return blob;
}

export async function updateVisionCard(id: string, patch: Partial<Pick<VisionCard, 'text' | 'areaId' | 'goalId' | 'size' | 'bold'>>): Promise<void> {
  const card = await visionCardsRepo.get(id);
  if (!card) return;
  if (patch.text !== undefined && card.kind === 'words' && !patch.text.trim()) throw new VisionError(messages().errors.vision.needsWords);
  await visionCardsRepo.update(id, patch.text === undefined ? patch : { ...patch, text: patch.text.trim() });
}

/** Removes a card; its picture stays in your attachments, so the Library and other cards keep it. */
export async function removeVisionCard(id: string): Promise<void> {
  await visionCardsRepo.remove(id);
}

/** Moves a card to `index` in the board's order. Only that row changes. */
export async function moveVisionCard(id: string, index: number): Promise<void> {
  const others = (await listVisionCards()).filter((c) => c.id !== id);
  await visionCardsRepo.update(id, { sortKey: sortKeyAt(others, Math.max(0, Math.min(index, others.length))) });
}

export async function setCanvasRect(id: string, rect: CanvasRect): Promise<void> {
  await visionCardsRepo.update(id, { canvas: clampRect(rect) });
}

/** Saves where every card sits now (the first time the free canvas is used), in one transaction. */
export async function saveCanvasLayout(rects: ReadonlyArray<{ id: string; rect: CanvasRect }>): Promise<void> {
  await db.transaction('rw', db.visionCards, async () => {
    for (const { id, rect } of rects) await visionCardsRepo.update(id, { canvas: clampRect(rect) });
  });
}

export type VisionCardView = VisionCard & {
  area: { name: string; color: Area } | null;
  goal: { id: string; title: string; percent: number | null } | null;
};

export type VisionBoard = { year: number; word: string | null; statement: string | null; cards: VisionCardView[] };

/** The board for this year: cards in order with their area and pinned goal, and the word of the year. */
export async function loadVisionBoard(today: Day): Promise<VisionBoard> {
  const [cards, board] = await Promise.all([listVisionCards(), loadGoalBoard(today)]);
  return {
    year: year(today),
    word: board.vision?.wordOfYear ?? null,
    statement: board.vision?.title ?? null,
    cards: cards.map((card) => {
      const area = board.areas.find((a) => a.id === card.areaId);
      const view = board.views.find((v) => v.goal.id === card.goalId);
      return {
        ...card,
        area: area ? { name: area.name, color: area.color } : null,
        goal: view ? { id: view.goal.id, title: view.goal.title, percent: view.progress.percent } : null,
      };
    }),
  };
}
