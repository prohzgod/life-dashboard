/**
 * Renders the PWA icons in public/ from the Grid mark: one square of the Swiss red on poster paper.
 * Run with: npx tsx scripts/generate-icons.ts  (needs `npx playwright install chromium` once).
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const paper = '#F8F7F3';
const red = '#D9241B';

// `inset` is the share of the canvas the red square takes; maskable icons keep it inside the 80% safe zone.
// The square sits low and left on its tile, hung from the grid like the wordmark's square, never centred.
function svg(size: number, { inset }: { rounded: boolean; inset: number }) {
  const mark = Math.round(size * inset);
  const margin = Math.round((size - mark) * 0.42);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${paper}"/>
    <rect x="${margin}" y="${size - margin - mark}" width="${mark}" height="${mark}" fill="${red}"/>
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
