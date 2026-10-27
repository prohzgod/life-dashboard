// @vitest-environment node
import { toDay } from '@/domain/days';
import { exportAll, importReplacingAll } from './backup';
import { saveVision } from './goalActions';
import { areasRepo, attachmentsRepo, goalsRepo } from './repositories';
import { freshDatabase } from './testing';
import {
  addImageCards,
  addLibraryPhotos,
  addWordsCard,
  listVisionCards,
  loadVisionBoard,
  moveVisionCard,
  removeVisionCard,
  saveCanvasLayout,
  setCanvasRect,
  updateVisionCard,
  VisionError,
} from './vision';

beforeEach(freshDatabase);

const today = toDay(new Date());
const image = (name: string) => ({ blob: new Blob(['x'], { type: 'image/jpeg' }), thumbBlob: null, width: 800, height: 600, name });

describe('vision cards', () => {
  it('adds words and pictures in order, at the end', async () => {
    const health = (await areasRepo.list()).find((a) => a.name === 'Health')!;
    await addWordsCard({ text: ' Strong body, quiet mind. ', areaId: health.id, bold: true });
    await addImageCards([image('Crossing the finish line.jpg'), image('Kyoto in spring.png')]);
    const cards = await listVisionCards();
    expect(cards.map((c) => [c.kind, c.text, c.size])).toEqual([
      ['words', 'Strong body, quiet mind.', 'S'],
      ['image', 'Crossing the finish line', 'L'],
      ['image', 'Kyoto in spring', 'L'],
    ]);
    expect(cards[1]!.attachmentId).toBeTruthy();
    expect(await attachmentsRepo.get(cards[1]!.attachmentId!)).toMatchObject({ mime: 'image/jpeg', nodeId: null });
  });

  it('needs words on a words card', async () => {
    await expect(addWordsCard({ text: '  ' })).rejects.toThrow(VisionError);
    const card = await addWordsCard({ text: 'Calm.' });
    await expect(updateVisionCard(card.id, { text: '' })).rejects.toThrow(VisionError);
  });

  it('reuses Library photos without copying them', async () => {
    const [card] = await addImageCards([image('Balcony.jpg')]);
    const [again] = await addLibraryPhotos([card!.attachmentId!]);
    expect(again!.attachmentId).toBe(card!.attachmentId);
    await removeVisionCard(card!.id);
    expect(await attachmentsRepo.get(card!.attachmentId!)).toBeDefined();
  });

  it('reorders by changing one row', async () => {
    const a = await addWordsCard({ text: 'A' });
    const b = await addWordsCard({ text: 'B' });
    const c = await addWordsCard({ text: 'C' });
    await moveVisionCard(c.id, 0);
    expect((await listVisionCards()).map((x) => x.text)).toEqual(['C', 'A', 'B']);
    expect((await listVisionCards()).find((x) => x.id === a.id)!.sortKey).toBe(a.sortKey);
    expect((await listVisionCards()).find((x) => x.id === b.id)!.sortKey).toBe(b.sortKey);
  });

  it('keeps canvas positions on the board', async () => {
    const a = await addWordsCard({ text: 'A' });
    const b = await addWordsCard({ text: 'B' });
    await setCanvasRect(a.id, { x: -50, y: 10, w: 300, h: 200 });
    await saveCanvasLayout([{ id: b.id, rect: { x: 2000, y: 0, w: 200, h: 200 } }]);
    const [ca, cb] = await listVisionCards();
    expect(ca!.canvas).toEqual({ x: 0, y: 8, w: 304, h: 200 });
    expect(cb!.canvas).toEqual({ x: 1000, y: 0, w: 200, h: 200 });
  });
});

describe('loadVisionBoard', () => {
  it('joins areas, pinned goals and the word of the year', async () => {
    await saveVision(today, { statement: 'Healthy, curious, present.', word: 'Present' });
    const goal = (await goalsRepo.list((g) => g.horizon === 'year'))[0]!;
    const family = (await areasRepo.list()).find((a) => a.name === 'Family')!;
    await addWordsCard({ text: 'Sunday dinners, phones away.', areaId: family.id, goalId: goal.id });
    const board = await loadVisionBoard(today);
    expect(board.word).toBe('Present');
    expect(board.cards[0]).toMatchObject({ area: { name: 'Family', color: family.color }, goal: { id: goal.id, title: goal.title } });
  });

  it('travels in exports', async () => {
    await addWordsCard({ text: 'Calm about money.' });
    const file = await exportAll();
    expect(file.tables.visionCards).toHaveLength(1);
    await importReplacingAll(file);
    expect((await listVisionCards()).map((c) => c.text)).toEqual(['Calm about money.']);
  });
});
