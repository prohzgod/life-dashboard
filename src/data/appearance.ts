/**
 * Your own background photo. Like the other device settings it lives in `meta`, as a Blob, so it
 * works offline and stays on this device. The rest of the look (background, accent, light or dark)
 * is in localStorage, because the first paint needs it before the database opens.
 */
import { db } from './db';
import { listVisionCards } from './vision';
import { getAttachment } from './checkIns';

const PHOTO_KEY = 'backgroundPhoto';

export async function getBackgroundPhoto(): Promise<Blob | null> {
  const value = (await db.meta.get(PHOTO_KEY))?.value;
  return value instanceof Blob ? value : null;
}

export async function setBackgroundPhoto(blob: Blob): Promise<void> {
  await db.meta.put({ key: PHOTO_KEY, value: blob });
}

export async function clearBackgroundPhoto(): Promise<void> {
  await db.meta.delete(PHOTO_KEY);
}

export type BoardPhoto = { attachmentId: string; caption: string };

/** The pictures on your Vision board, to pick one as the background. */
export async function listBoardPhotos(): Promise<BoardPhoto[]> {
  const cards = await listVisionCards();
  return cards.filter((c) => c.kind === 'image' && c.attachmentId).map((c) => ({ attachmentId: c.attachmentId!, caption: c.text }));
}

/** Copies a Vision board picture to be the background, so removing the card keeps it. */
export async function setBackgroundFromBoard(attachmentId: string): Promise<Blob | null> {
  const attachment = await getAttachment(attachmentId);
  if (!attachment) return null;
  await setBackgroundPhoto(attachment.blob);
  return attachment.blob;
}
