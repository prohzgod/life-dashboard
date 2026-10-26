import { defineConfig, devices } from '@playwright/test';

const port = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1440, height: 960 },
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 960 } } }],
  // The service worker only exists in a production build, so e2e runs against `vite preview`.
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
