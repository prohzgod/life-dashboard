import { type Day, month, dayOfMonth, year } from '@/domain/days';
import { db } from './db';
import { attachmentsRepo, dailyEntriesRepo } from './repositories';
import { getCurrentSpaceId } from './session';
import type { Attachment, DailyEntry } from './types';

type EntryFields = Partial<Pick<DailyEntry, 'mood' | 'energy' | 'sleepMinutes' | 'line' | 'photoId'>>;

export async function getDailyEntry(day: Day): Promise<DailyEntry | undefined> {
  const rows = await db.dailyEntries.where('[spaceId+day]').equals([getCurrentSpaceId(), day]).toArray();
  return rows.find((r) => r.deletedAt === null);
}

/** Saves part of a day's check-in, creating the day's entry on first use. */
export async function saveDailyEntry(day: Day, fields: EntryFields): Promise<DailyEntry> {
  return db.transaction('rw', db.dailyEntries, async () => {
    const existing = await getDailyEntry(day);
    if (existing) return dailyEntriesRepo.update(existing.id, fields);
    return dailyEntriesRepo.create({
      day,
      mood: null,
      energy: null,
      sleepMinutes: null,
      line: '',
      photoId: null,
      journalNodeId: null,
      ...fields,
    });
  });
}

export type PhotoInput = { blob: Blob; thumbBlob: Blob | null; width: number | null; height: number | null };

export async function savePhotoOfTheDay(day: Day, photo: PhotoInput): Promise<Attachment> {
  const attachment = await attachmentsRepo.create({
    nodeId: null,
    blob: photo.blob,
    thumbBlob: photo.thumbBlob,
    mime: photo.blob.type,
    size: photo.blob.size,
    width: photo.width,
    height: photo.height,
    takenAt: null,
    caption: '',
  });
  const previous = (await getDailyEntry(day))?.photoId;
  await saveDailyEntry(day, { photoId: attachment.id });
  if (previous) await attachmentsRepo.remove(previous);
  return attachment;
}

export async function getAttachment(id: string): Promise<Attachment | undefined> {
  return attachmentsRepo.get(id);
}

export type Memory = { entry: DailyEntry; yearsAgo: number; photo: Attachment | null };

/** The most recent earlier year's entry for today's date that has a line or a photo. */
export async function onThisDay(today: Day): Promise<Memory | null> {
  const entries = await dailyEntriesRepo.list(
    (e) => e.day < today && month(e.day) === month(today) && dayOfMonth(e.day) === dayOfMonth(today) && (!!e.line.trim() || !!e.photoId),
  );
  const latest = entries.sort((a, b) => b.day.localeCompare(a.day))[0];
  if (!latest) return null;
  const photo = latest.photoId ? ((await attachmentsRepo.get(latest.photoId)) ?? null) : null;
  return { entry: latest, yearsAgo: year(today) - year(latest.day), photo };
}
