import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * Glass v2 checks (docs/RESTYLE_PROMPTS.md, step 7): Today at four widths on three backgrounds,
 * the /kit page, no sideways scroll, and axe on every screen. Screenshots land in
 * test-results/glass/ to compare by eye with design/v2/screens.
 */

const looks = {
  dawn: { look: { background: 'dawn', accent: 'tangerine' }, theme: 'light' },
  photo: { look: { background: 'photo', accent: 'butter' }, theme: 'light' },
  night: { look: { background: 'night', accent: 'lavender' }, theme: 'dark' },
} as const;

async function useLook(page: Page, name: keyof typeof looks) {
  const { look, theme } = looks[name];
  await page.addInitScript(
    ([l, t]) => {
      localStorage.setItem('life-dashboard:look', l);
      localStorage.setItem('life-dashboard:theme', t);
    },
    [JSON.stringify(look), theme] as const,
  );
}

const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const width of [390, 834, 1280, 1440]) {
  for (const name of Object.keys(looks) as Array<keyof typeof looks>) {
    test(`Today at ${width} on ${name}`, async ({ page }) => {
      await useLook(page, name);
      await page.setViewportSize({ width, height: width < 768 ? 844 : 960 });
      await page.goto(width < 768 ? '/today' : '/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Good (morning|afternoon|evening)\./);
      await expect(page.locator('html')).toHaveAttribute('data-bg', looks[name].look.background);
      expect(await noSidewaysScroll(page)).toBe(true);
      await page.screenshot({ path: `test-results/glass/today-${width}-${name}.png`, fullPage: true });
    });
  }
}

test('the kit page shows every shared component', async ({ page }) => {
  await page.goto('/kit');
  await expect(page.getByRole('heading', { level: 1, name: 'Glass kit' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Light theme' }).getByRole('progressbar', { name: 'Today' })).toBeVisible();
  await page.screenshot({ path: 'test-results/glass/kit.png', fullPage: true });
});

const screens = ['/', '/inbox', '/tasks', '/calendar', '/goals', '/progress', '/reviews', '/library', '/vision', '/finance', '/health', '/profile', '/settings/appearance', '/kit'];

for (const name of ['dawn', 'night'] as const) {
  test(`axe finds no serious problems on ${name}`, async ({ page }) => {
    await useLook(page, name);
    const problems: string[] = [];
    for (const path of screens) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      // Text over translucent glass comes back as "needs review", not a violation; design/v2/TOKENS.md
      // lists the ratios measured on the real surfaces.
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      for (const v of results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')) {
        problems.push(`${path}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(' ')}`);
      }
    }
    expect(problems).toEqual([]);
  });
}
