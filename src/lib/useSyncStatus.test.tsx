import { act, renderHook, waitFor } from '@testing-library/react';
import { freshDatabase } from '@/data/testing';
import { META, setMeta } from '@/data/sync/meta';
import { setLocale } from '@/i18n/locale';
import { useSavedLabel } from './useSyncStatus';

beforeEach(async () => {
  setLocale('en');
  await freshDatabase();
});

describe('with sync switched off', () => {
  it('says "on this device" even on a device that once signed in', async () => {
    await act(async () => {
      await setMeta(META.accountId, 'me');
    });
    const { result } = renderHook(() => useSavedLabel());
    await waitFor(() => expect(result.current).toBe('Saved on this device'));
  });
});
