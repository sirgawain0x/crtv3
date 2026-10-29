import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vitest.config';

export default mergeConfig(base, {
  test: {
    include: ['components/home-page/capture-dear-creative-visual.test.tsx'],
  },
});
