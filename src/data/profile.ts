import { messages } from '@/i18n/locale';
import { db } from './db';
import { newId } from './ids';
import { attachmentsRepo, profileRepo } from './repositories';
import type { Profile } from './types';

export type ProfileFields = Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

const blank: ProfileFields = {
  displayName: '',
  quote: '',
  gender: '',
  birthday: null,
  pronouns: '',
  occupation: '',
  city: '',
  email: '',
  phone: '',
  photoAttachmentId: null,
  customFields: [],
  visibility: {},
};

/** Creates the empty profile row once. Runs at startup (writes can't happen inside live queries). */
export async function ensureProfile(): Promise<void> {
  await db.transaction('rw', db.profile, async () => {
    const existing = (await profileRepo.list())[0];
    if (!existing) await profileRepo.create({ ...blank });
  });
}

/** The one profile row (see ensureProfile). */
export async function getProfile(): Promise<Profile> {
  const existing = (await profileRepo.list())[0];
  if (!existing) throw new Error('The profile is missing: call ensureProfile() at startup.');
  return existing;
}

export async function saveProfile(fields: Partial<ProfileFields>): Promise<Profile> {
  const profile = await getProfile();
  return profileRepo.update(profile.id, fields);
}

/** Blurs every field, or shows them all again. */
export async function setAllVisibility(blurred: boolean): Promise<void> {
  const profile = await getProfile();
  const fields = ['displayName', 'quote', 'gender', 'birthday', 'pronouns', 'occupation', 'city', 'email', 'phone', ...profile.customFields.map((f) => f.id)];
  await profileRepo.update(profile.id, { visibility: Object.fromEntries(fields.map((f) => [f, blurred ? 'blurred' : 'shown'])) });
}

export async function setFieldVisibility(field: string, visibility: 'shown' | 'blurred'): Promise<void> {
  const profile = await getProfile();
  await profileRepo.update(profile.id, { visibility: { ...profile.visibility, [field]: visibility } });
}

export async function setProfilePhoto(photo: { blob: Blob; thumbBlob: Blob | null; width: number | null; height: number | null } | null): Promise<void> {
  const profile = await getProfile();
  if (profile.photoAttachmentId) await attachmentsRepo.remove(profile.photoAttachmentId);
  if (!photo) {
    await profileRepo.update(profile.id, { photoAttachmentId: null });
    return;
  }
  const attachment = await attachmentsRepo.create({
    nodeId: null,
    blob: photo.blob,
    thumbBlob: photo.thumbBlob,
    mime: photo.blob.type,
    size: photo.blob.size,
    width: photo.width,
    height: photo.height,
    takenAt: null,
    caption: messages().seed.profilePhoto,
  });
  await profileRepo.update(profile.id, { photoAttachmentId: attachment.id });
}

export function newCustomField(label: string) {
  return { id: `custom-${newId()}`, label, value: '' };
}
