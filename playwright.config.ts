import { defineConfig, devices } from '@playwright/test';

// E2E_PORT runs the suite beside a preview server that's already on 4173.
const port = Number(process.env.E2E_PORT ?? 4173);
const apiPort = Number(process.env.E2E_API_PORT ?? 4180);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    // The app opens in Vietnamese; these flows read the English copy.
    storageState: { cookies: [], origins: [{ origin: `http://localhost:${port}`, localStorage: [{ name: 'life-dashboard:locale', value: 'en' }] }] },
    viewport: { width: 1440, height: 960 },
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', testIgnore: /mobile\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 960 } } },
    // Phones: the design's 390×844, with touch.
    { name: 'phone', testMatch: /mobile\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
  // The service worker only exists in a production build, so e2e runs against `vite preview`.
  webServer: [
    {
      command: `npm run build && npm run preview -- --port ${port} --strictPort`,
      env: { API_PROXY: `http://localhost:${apiPort}` },
      port,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      // The real API on an in-memory Postgres and file store, so sync can be tested without Neon or R2.
      command: 'npm run build -w shared && npm run dev:test -w api',
      env: { PORT: String(apiPort), NODE_ENV: 'test', DB_DRIVER: 'pglite', FILES_DRIVER: 'memory', USER_FILE_QUOTA_BYTES: '1000000000', AUTH_RATE_LIMIT: '1000' },
      port: apiPort,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
