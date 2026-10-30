// @vitest-environment node
import { setLocale } from '@/i18n/locale';
import { localizeSeedContent } from './localize';
import { habitsRepo, tasksRepo } from './repositories';
import { captureTask } from './taskActions';
import { freshDatabase } from './testing';

beforeEach(freshDatabase);
afterEach(() => setLocale('en'));

describe('localizeSeedContent', () => {
  it('moves starter content into the current language and leaves your own text alone', async () => {
    await captureTask('Water', { today: '2026-10-30', status: 'open' });
    const review = (await tasksRepo.list((t) => t.title === 'Weekly review'))[0]!;
    await habitsRepo.update((await habitsRepo.list((h) => h.title === 'Read 20 pages'))[0]!.id, { cue: 'With tea' });

    setLocale('vi');
    expect(await localizeSeedContent()).toBeGreaterThan(0);
    const after = (await tasksRepo.get(review.id))!;
    expect(after.title).toBe('Nhìn lại tuần');
    expect(after.notes).not.toContain('Get clear');
    expect(after.updatedAt).toBe(review.updatedAt);
    // A task you typed that happens to match a sample word stays as you wrote it.
    expect((await tasksRepo.list((t) => t.title === 'Water'))).toHaveLength(1);
    const read = (await habitsRepo.list())[1]!;
    expect(read.cue).toBe('With tea');

    expect(await localizeSeedContent()).toBe(0);
  });
});
