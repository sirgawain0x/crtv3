import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Default to node, override with jsdom for React tests
    environmentMatchGlobs: [
      ['**/*.hook.test.tsx', 'jsdom'], // Use jsdom for React hook tests
      ['**/*.component.test.tsx', 'jsdom'], // Use jsdom for React component tests
    ],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', 'dist', '.next'],
    setupFiles: ['./vitest.setup.ts'], // Setup file for test configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

