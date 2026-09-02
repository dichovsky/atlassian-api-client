import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/scripts/api-gap-analysis.test.ts'],
    maxConcurrency: 4,
    sequence: {
      concurrent: true,
    },
  },
});
