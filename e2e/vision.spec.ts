import { expect, test, type Page } from '@playwright/test';

/** Rows of one IndexedDB table, read straight from the browser: lets a test wait until a save has landed. */
async function stored<T>(page: Page, table: string): Promise<T[]> {
  return page.evaluate(
    (name) =>
      new Promise<T[]>((resolve) => {
        const open = indexedDB.open('life-dashboard');
        open.onsuccess = () => {
          const read = open.result.transaction(name).objectStore(name).getAll();
          read.onsuccess = () => {
            open.result.close();
            resolve(read.result as T[]);
          };
        };
      }),
    table,
  );
}


// A tiny real PNG (1×1), so thumbnails are made by the browser.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('build a board: words, a picture, a pinned goal, a filter', async ({ page }) => {
  await page.goto('/vision');
  await expect(page.getByRole('heading', { level: 1, name: 'Vision board' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Empty board' })).toBeVisible();

  // Words, for Health, on a dark card.
  await page.getByRole('button', { name: 'Add words' }).first().click();
  const words = page.getByRole('dialog', { name: 'Add words' });
  await words.getByLabel('Words').fill('Strong body, quiet mind.');
  await words.getByLabel('Area').selectOption({ label: 'Health' });
  await words.getByLabel('Dark card').check();
  await words.getByRole('button', { name: 'Add to board' }).click();
  const card = page.getByRole('article', { name: 'Strong body, quiet mind.' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('Health');

  // A picture from a file.
  await page.locator('input[type=file][aria-label="Choose pictures for the board"]').setInputFiles({ name: 'Crossing the finish line.png', mimeType: 'image/png', buffer: png });
  const picture = page.getByRole('article', { name: 'Crossing the finish line' });
  await expect(picture.getByRole('img', { name: 'Crossing the finish line' })).toBeVisible();

  // Pin the sample year goal to the picture: its progress shows and links to the goal.
  await page.getByRole('button', { name: 'Pin a goal' }).click();
  const pin = page.getByRole('dialog', { name: 'Pin a goal' });
  await pin.getByLabel('Goal').selectOption({ index: 1 });
  await pin.getByLabel('On').selectOption({ label: 'Crossing the finish line' });
  await pin.getByRole('button', { name: 'Pin goal' }).click();
  const chip = picture.getByRole('link', { name: /%$/ });
  await expect(chip).toBeVisible();

  // Filter by area shows only Health's card.
  await page.getByRole('button', { name: 'Showing All areas' }).click();
  await page.getByRole('menuitem', { name: 'Health' }).click();
  await expect(picture).toHaveCount(0);
  await expect(card).toBeVisible();
  await page.getByRole('button', { name: 'Showing Health' }).click();
  await page.getByRole('menuitem', { name: 'All areas' }).click();

  // Edit, then remove the words.
  await card.getByRole('button', { name: 'Edit “Strong body, quiet mind.”' }).click();
  const edit = page.getByRole('dialog', { name: 'Edit words' });
  await edit.getByRole('button', { name: 'Remove from board' }).click();
  await expect(card).toHaveCount(0);

  await chip.click();
  await expect(page).toHaveURL(/\/goals\/[0-9A-Z]+$/);
});

test('free canvas: move a card with the keyboard, and it stays there', async ({ page }) => {
  await page.goto('/vision');
  await page.getByRole('button', { name: 'Add words' }).first().click();
  await page.getByRole('dialog', { name: 'Add words' }).getByLabel('Words').fill('Calm about money.');
  await page.getByRole('dialog', { name: 'Add words' }).getByRole('button', { name: 'Add to board' }).click();

  await page.getByRole('radio', { name: 'Free canvas' }).click();
  await expect(page).toHaveURL(/layout=canvas/);
  const placed = page.getByRole('article', { name: 'Calm about money.' });
  await expect(page.getByRole('button', { name: /^Move “Calm about money\.”/ })).toBeAttached();
  const before = (await placed.boundingBox())!;
  const handle = page.getByRole('button', { name: /^Move “Calm about money\.”/ });
  await handle.focus();
  const savedRect = async () => (await stored<{ text: string; canvas: { x: number; y: number } | null }>(page, 'visionCards')).find((c) => c.text === 'Calm about money.')?.canvas ?? null;
  // Each move is saved before the next, and before the reload checks that they stick.
  await page.keyboard.press('Shift+ArrowRight');
  await expect.poll(savedRect).not.toBeNull();
  const first = (await savedRect())!;
  await page.keyboard.press('Shift+ArrowDown');
  await expect.poll(async () => (await savedRect())?.y).toBe(first.y + 64);
  await expect.poll(async () => (await placed.boundingBox())!.x).toBeGreaterThan(before.x + 20);

  await page.reload();
  await expect.poll(async () => (await page.getByRole('article', { name: 'Calm about money.' }).boundingBox())!.y).toBeGreaterThan(before.y + 20);
});
