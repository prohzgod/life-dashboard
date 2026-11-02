import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@life-dashboard/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)) } },
  test: { globals: true, environment: 'node', include: ['test/**/*.test.ts'], testTimeout: 20000 },
});
