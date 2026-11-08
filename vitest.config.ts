import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'test/fixtures/**',
      'test/scripts/api-gap-analysis.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Only pure re-export barrels are excluded; logic-bearing index.ts files
      // (src/cli/index.ts, src/skill-installer/index.ts) count toward 100%.
      exclude: [
        'src/**/__tests__/**',
        'src/**/types.ts',
        'src/index.ts',
        'src/core/index.ts',
        'src/jira/index.ts',
        'src/jira/resources/index.ts',
        'src/confluence/index.ts',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
