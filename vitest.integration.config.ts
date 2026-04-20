import { defineConfig } from 'vitest/config';

/**
 * Integration test config — hits a real Atlassian Cloud sandbox.
 *
 * Opt-in only: gated by `ATLASSIAN_INTEGRATION=1` and the following env vars,
 * which every integration test reads through `test/integration/env.ts`:
 *
 *   ATLASSIAN_BASE_URL       https://{site}.atlassian.net
 *   ATLASSIAN_EMAIL          service account email
 *   ATLASSIAN_API_TOKEN      service account token
 *   ATLASSIAN_SPACE_ID       Confluence space to read from
 *   ATLASSIAN_PROJECT_KEY    Jira project to read from
 *
 * Not run by `npm test` or `npm run validate`; no coverage threshold applied.
 */
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/integration/**/*.integration.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    retry: 1,
  },
});
