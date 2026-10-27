// @vitest-environment node
import { getProfile, saveProfile, setAllVisibility, setFieldVisibility, newCustomField } from './profile';
import { ensureProfile } from './profile';
import { db } from './db';
import { freshDatabase } from './testing';

beforeEach(freshDatabase);

describe('profile', () => {
  it('exists from the start, once', async () => {
    await ensureProfile();
    expect(await db.profile.count()).toBe(1);
    expect(await getProfile()).toMatchObject({ displayName: '', customFields: [], visibility: {} });
  });

  it('saves fields and per-field visibility, and blurs everything at once', async () => {
    const field = newCustomField('Blood type');
    await saveProfile({ displayName: 'Minh Tran', email: 'minh@example.com', customFields: [{ ...field, value: 'O+' }] });
    await setFieldVisibility('email', 'shown');
    expect((await getProfile()).visibility).toEqual({ email: 'shown' });

    await setAllVisibility(true);
    const blurred = await getProfile();
    expect(blurred.visibility.email).toBe('blurred');
    expect(blurred.visibility[field.id]).toBe('blurred');
    expect(blurred.visibility.displayName).toBe('blurred');

    await setAllVisibility(false);
    expect(Object.values((await getProfile()).visibility).every((v) => v === 'shown')).toBe(true);
  });
});
