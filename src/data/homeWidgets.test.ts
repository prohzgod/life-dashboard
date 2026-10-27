// @vitest-environment node
import { ensureHomeWidgets, listHomeWidgets, moveWidget, pinnedWidget, pinToHome, resetHome, setWidgetHidden, setWidgetSize, unpinFromHome } from './homeWidgets';
import { createNode } from './library';
import { freshDatabase } from './testing';

beforeEach(freshDatabase);

const visibleKinds = async () => (await listHomeWidgets()).filter((w) => !w.hidden).map((w) => w.kind);

describe('home widgets', () => {
  it('starts with the design’s layout, Ask AI and Steps hidden', async () => {
    expect(await visibleKinds()).toEqual(['today', 'goals', 'calendar', 'review', 'progress', 'sleep', 'finance', 'vision']);
    expect((await listHomeWidgets()).filter((w) => w.hidden).map((w) => w.kind)).toEqual(['assistant', 'steps']);
    await ensureHomeWidgets();
    expect((await listHomeWidgets()).length).toBe(10); // set up once
  });

  it('resizes within what each widget allows', async () => {
    const [today] = await listHomeWidgets();
    await setWidgetSize(today!.id, 'S');
    expect((await listHomeWidgets())[0]!.size).toBe('M');
  });

  it('reorders by changing one row', async () => {
    const before = await listHomeWidgets();
    const vision = before.find((w) => w.kind === 'vision')!;
    await moveWidget(vision.id, 0);
    const after = await listHomeWidgets();
    expect(after.filter((w) => !w.hidden)[0]!.kind).toBe('vision');
    expect(after.filter((w) => w.id !== vision.id).map((w) => w.sortKey)).toEqual(before.filter((w) => w.id !== vision.id).map((w) => w.sortKey));
  });

  it('hides and brings back, at the end', async () => {
    const goals = (await listHomeWidgets()).find((w) => w.kind === 'goals')!;
    await setWidgetHidden(goals.id, true);
    expect(await visibleKinds()).not.toContain('goals');
    await setWidgetHidden(goals.id, false);
    expect((await visibleKinds()).at(-1)).toBe('goals');
  });

  it('pins and unpins a page; hiding a pin unpins it', async () => {
    const page = await createNode({ parentId: null, kind: 'page', title: 'Japan trip 2027' });
    const pin = await pinToHome('node', page.id);
    expect(await pinToHome('node', page.id)).toEqual(pin);
    expect(pin).toMatchObject({ kind: 'pinned', size: 'M', refType: 'node', refId: page.id });
    expect((await visibleKinds()).at(-1)).toBe('pinned');

    await setWidgetHidden(pin.id, true);
    expect(await pinnedWidget('node', page.id)).toBeUndefined();
    await pinToHome('node', page.id);
    await unpinFromHome('node', page.id);
    expect(await pinnedWidget('node', page.id)).toBeUndefined();
  });

  it('resets to the defaults and keeps pins', async () => {
    const page = await createNode({ parentId: null, kind: 'page', title: 'Pinned page' });
    await pinToHome('node', page.id);
    const goals = (await listHomeWidgets()).find((w) => w.kind === 'goals')!;
    await setWidgetHidden(goals.id, true);
    await resetHome();
    expect(await visibleKinds()).toEqual(['today', 'goals', 'calendar', 'review', 'progress', 'sleep', 'finance', 'vision', 'pinned']);
  });
});
