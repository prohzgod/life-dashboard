import { expect, test, type Page } from '@playwright/test';

const editor = (page: Page) => page.locator('.bn-editor');
const suggestion = (page: Page, name: RegExp) => page.getByRole('listbox', { name: 'Suggestions' }).getByRole('option', { name });
const tree = (page: Page) => page.getByRole('complementary', { name: 'Library tree' });

/** New page from the tree's button, with a title, then focus in the editor body. */
async function newPage(page: Page, title: string) {
  await tree(page).getByRole('button', { name: 'New page' }).click();
  const titleInput = page.getByRole('textbox', { name: 'Page title' });
  await expect(titleInput).toBeFocused();
  await titleInput.fill(title);
  await titleInput.press('Enter');
  await editor(page).click();
}

/** Waits until the debounced save has written the page. */
async function waitForSave(page: Page) {
  const saved = page.getByRole('main').getByRole('status').filter({ hasText: 'Saved on this device' });
  await page.waitForTimeout(700);
  await expect(saved).toBeVisible();
}

test('the Library opens on today’s Journal page, filed by year and month', async ({ page }) => {
  await page.goto('/library');
  await expect(page.getByRole('heading', { level: 1, name: /^\w+day, \d+ \w+ \d{4}$/ })).toBeVisible();
  await expect(tree(page).getByText(/, today$/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Check-in' })).toContainText('No check-in yet today.');
});

test('write a page with a checklist, links, mentions and a pasted image; it all survives a reload', async ({ page }) => {
  await page.goto('/library');
  await newPage(page, 'Budget');
  await page.keyboard.type('Flights and hotels.');
  await waitForSave(page);

  await newPage(page, 'Japan trip 2027');
  await page.keyboard.type('Two weeks in April. Costs live in ');
  await page.keyboard.type('[[Bud');
  await suggestion(page, /Budget/).click();
  await page.keyboard.type('for ');
  await page.keyboard.type('@half');
  await suggestion(page, /Run a half-marathon/).click();
  await page.keyboard.press('Enter');

  // A checklist from the slash menu.
  await page.keyboard.type('/check');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Renew passports');
  await page.keyboard.press('Enter');

  // Paste an image.
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 30;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#d4b57c';
    ctx.fillRect(0, 0, 40, 30);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
    const data = new DataTransfer();
    data.items.add(new File([blob], 'kyoto.png', { type: 'image/png' }));
    document.querySelector('.bn-editor')!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expect(editor(page).locator('img[src^="blob:"]')).toBeVisible();
  await waitForSave(page);

  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue('Japan trip 2027');
  await expect(editor(page).getByRole('link', { name: 'Budget' })).toBeVisible();
  await expect(editor(page).getByRole('link', { name: 'Run a half-marathon' })).toBeVisible();
  await expect(editor(page).getByText('Renew passports')).toBeVisible();
  await expect(editor(page).locator('img[src^="blob:"]')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Page connections' })).toContainText('kyoto.png');

  // Following the link shows the backlink.
  await editor(page).getByRole('link', { name: 'Budget' }).click();
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue('Budget');
  const rail = page.getByRole('complementary', { name: 'Page connections' });
  await expect(rail.getByRole('heading', { name: 'Linked from 1' })).toBeVisible();
  await expect(rail.getByRole('link', { name: /Japan trip 2027/ })).toContainText('Costs live in Budget');

  // Full-text search finds words in the body.
  await tree(page).getByRole('searchbox', { name: 'Search pages' }).fill('april');
  await expect(tree(page).getByRole('region', { name: 'Search results' }).getByRole('link', { name: /Japan trip 2027/ })).toBeVisible();
});

test('a gallery takes images from the picker', async ({ page }) => {
  await page.goto('/library');
  await newPage(page, 'Inspiration');
  await page.keyboard.type('/gallery');
  await page.keyboard.press('Enter');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.getByLabel('Choose images for the gallery').setInputFiles([
    { name: 'Fushimi Inari gates.png', mimeType: 'image/png', buffer: png },
    { name: 'Arashiyama bamboo path.png', mimeType: 'image/png', buffer: png },
  ]);
  await expect(page.getByRole('textbox', { name: 'Caption' })).toHaveCount(2);
  await expect(page.getByRole('textbox', { name: 'Caption' }).first()).toHaveValue('Fushimi Inari gates');
});

test('drag a page into a folder, then trash and restore it', async ({ page }) => {
  await page.goto('/library');
  await newPage(page, 'Home renovation');
  const row = tree(page).getByRole('treeitem', { name: /Home renovation/ });
  const projects = tree(page).getByRole('treeitem', { name: /Projects/ });
  await row.dragTo(projects);
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Projects / Home renovation');

  await page.getByRole('button', { name: 'Page options' }).click();
  await page.getByRole('menuitem', { name: 'Move to Trash' }).click();
  await expect(tree(page).getByRole('treeitem', { name: /Home renovation/ })).toHaveCount(0);

  await tree(page).getByRole('link', { name: 'Trash' }).click();
  await page.getByRole('button', { name: 'Restore Home renovation' }).click();
  await expect(page.getByText('Trash is empty.')).toBeVisible();
  await expect(tree(page).getByRole('treeitem', { name: /Home renovation/ })).toBeVisible();
});

test('⌘K finds pages by their words, and the Library works offline', async ({ page, context }) => {
  await page.goto('/library');
  await newPage(page, 'Recipes');
  await page.keyboard.type('Miso soup with spring onions.');
  await waitForSave(page);

  await page.goto('/');
  await page.getByRole('button', { name: /Search or jump to/ }).click();
  await page.getByRole('combobox', { name: 'Search screens and pages' }).fill('miso');
  await page.getByRole('option', { name: /Recipes/ }).click();
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue('Recipes');

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue('Recipes');
  await expect(editor(page).getByText('Miso soup with spring onions.')).toBeVisible();
  await context.setOffline(false);
});
