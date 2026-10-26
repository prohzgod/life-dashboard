// @vitest-environment node
import { db } from './db';
import { initData, resetInitForTests } from './init';
import { areasRepo, goalsRepo, habitsRepo, nodesRepo, spacesRepo, tasksRepo } from './repositories';
import { nextSunday, seedIfNeeded } from './seed';
import { getCurrentSpaceId } from './session';
import { freshDatabase } from './testing';

beforeEach(freshDatabase);

describe('first launch', () => {
  it('creates the Personal space and makes it current', async () => {
    const spaces = await spacesRepo.list();
    expect(spaces).toHaveLength(1);
    expect(spaces[0]).toMatchObject({ name: 'Personal', type: 'personal' });
    expect(spaces[0]!.spaceId).toBe(spaces[0]!.id);
    expect(getCurrentSpaceId()).toBe(spaces[0]!.id);
  });

  it('creates 8 life areas in order, each with an area color token', async () => {
    const areas = await areasRepo.listOrdered();
    expect(areas.map((a) => a.name)).toEqual(['Health', 'Career', 'Finance', 'Family', 'Friends', 'Growth', 'Home', 'Fun']);
    expect(new Set(areas.map((a) => a.sortKey)).size).toBe(8);
    for (const area of areas) expect(['health', 'career', 'finance', 'family', 'growth', 'home', 'fun']).toContain(area.color);
  });

  it('creates a sample yearly goal with a quarterly child', async () => {
    const [year] = await goalsRepo.listRoots();
    expect(year).toMatchObject({ title: 'Run a half-marathon', horizon: 'year', status: 'active' });
    expect(year!.startDate).toMatch(/^\d{4}-01-01$/);
    expect(year!.endDate).toMatch(/^\d{4}-12-31$/);

    const [quarter] = await goalsRepo.listChildren(year!.id);
    expect(quarter).toMatchObject({ horizon: 'quarter', areaId: year!.areaId });
    expect(quarter!.startDate >= year!.startDate && quarter!.endDate <= year!.endDate).toBe(true);
  });

  it('creates 3 habits, the Library system folders and a Sunday weekly review', async () => {
    expect((await habitsRepo.list()).map((h) => h.title)).toEqual(['Meditate', 'Read 20 pages', 'Water']);

    const folders = await nodesRepo.listChildren(null);
    expect(folders.map((n) => n.title)).toEqual(['Journal', 'Areas', 'Projects']);
    expect(folders.every((n) => n.kind === 'folder' && n.isSystem)).toBe(true);

    const [review] = await tasksRepo.list((t) => t.title === 'Weekly review');
    expect(review!.rrule).toBe('FREQ=WEEKLY;BYDAY=SU');
    expect(new Date(`${review!.doOn}T12:00:00`).getDay()).toBe(0);
  });

  it('only seeds once', async () => {
    const id = getCurrentSpaceId();
    resetInitForTests();
    await initData();
    expect(await seedIfNeeded()).toBe(id);
    expect(await db.spaces.count()).toBe(1);
    expect(await db.areas.count()).toBe(8);
  });
});

describe('nextSunday', () => {
  it('is the same day on a Sunday and the coming Sunday otherwise', () => {
    expect(nextSunday(new Date(2026, 9, 25)).getDate()).toBe(25); // Sun 25 Oct 2026
    expect(nextSunday(new Date(2026, 9, 26)).getDate()).toBe(1); // Mon → Sun 1 Nov
    expect(nextSunday(new Date(2026, 9, 31)).getDate()).toBe(1); // Sat → Sun 1 Nov
  });
});
