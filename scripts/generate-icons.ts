/**
 * Renders the PWA icons in public/ from the logo mark (brass tile, midnight leaf).
 * Run with: npx tsx scripts/generate-icons.ts  (needs `npx playwright install chromium` once).
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const leaf = 'M12 21v-9M12 12c0-4.4 3.1-7.5 7.5-7.5 0 4.4-3.1 7.5-7.5 7.5zM12 15c0-3.3-2.7-6-6.5-6 0 3.8 2.7 6 6.5 6z';
const brass = '#D4B57C';
const midnight = '#131A2E';

// `inset` is the share of the canvas the leaf may use; maskable icons keep it inside the 80% safe zone.
function svg(size: number, { rounded, inset }: { rounded: boolean; inset: number }) {
  const mark = size * inset;
  const offset = (size - mark) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${rounded ? size * 0.22 : 0}" fill="${brass}"/>
    <g transform="translate(${offset} ${offset}) scale(${mark / 24})" fill="none" stroke="${midnight}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${leaf}"/></g>
  </svg>`;
}

const icons = [
  { file: 'pwa-192.png', size: 192, rounded: true, inset: 0.62 },
  { file: 'pwa-512.png', size: 512, rounded: true, inset: 0.62 },
  { file: 'pwa-maskable-512.png', size: 512, rounded: false, inset: 0.5 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, inset: 0.6 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const icon of icons) {
  await page.setViewportSize({ width: icon.size, height: icon.size });
  await page.setContent(`<body style="margin:0;background:transparent">${svg(icon.size, icon)}</body>`);
  const path = fileURLToPath(new URL(`../public/${icon.file}`, import.meta.url));
  await page.locator('svg').screenshot({ path, omitBackground: true });
  console.log('wrote', icon.file);
}
await browser.close();
