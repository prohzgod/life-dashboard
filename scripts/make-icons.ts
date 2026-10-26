// Renders the PWA icons from the logo mark. Run with: npx tsx scripts/make-icons.ts (needs Playwright's Chromium).
import { chromium } from '@playwright/test';

const mark =
  'M12 21v-9M12 12c0-4.4 3.1-7.5 7.5-7.5 0 4.4-3.1 7.5-7.5 7.5zM12 15c0-3.3-2.7-6-6.5-6 0 3.8 2.7 6 6.5 6z';

// Brass tile with a midnight mark; maskable icons keep the mark inside the 80% safe zone on midnight.
const icon = (size: number, maskable: boolean) => {
  const bg = maskable ? '#131A2E' : '#D4B57C';
  const ink = maskable ? '#D4B57C' : '#131A2E';
  const radius = maskable ? 0 : size * 0.22;
  const markScale = maskable ? 0.5 : 0.62;
  const markSize = size * markScale;
  const offset = (size - markSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>
    <g transform="translate(${offset} ${offset}) scale(${markSize / 24})" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${mark}"/></g>
  </svg>`;
};

const outputs = [
  { file: 'public/pwa-192.png', size: 192, maskable: false },
  { file: 'public/pwa-512.png', size: 512, maskable: false },
  { file: 'public/pwa-maskable-512.png', size: 512, maskable: true },
  { file: 'public/apple-touch-icon.png', size: 180, maskable: true },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, maskable } of outputs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${icon(size, maskable)}</body></html>`);
  await page.locator('svg').screenshot({ path: file, omitBackground: true });
  console.log('wrote', file);
}
await browser.close();
