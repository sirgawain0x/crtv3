import { defineConfig } from 'vitest/config';
import path from 'path';

/** Playwright capture only — not run in CI. */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['components/home-page/capture-dear-creative-visual.test.tsx'],
    exclude: ['node_modules'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './lib/reality-social/__mocks__/server-only.ts'),
    },
  },
});
