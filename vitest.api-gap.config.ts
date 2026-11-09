import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/scripts/api-gap-analysis.test.ts'],
    // Refuses real network access outside loopback (X-NO-NETWORK).
    setupFiles: ['test/setup/no-network.ts'],
    maxConcurrency: 4,
    sequence: {
      concurrent: true,
    },
  },
});
