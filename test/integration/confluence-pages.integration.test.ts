import { describe, it, expect } from 'vitest';
import { ConfluenceClient } from '../../src/index.js';
import { isIntegrationEnabled, loadIntegrationEnv } from './env.js';

describe.skipIf(!isIntegrationEnabled())('Confluence pages — integration', () => {
  const env = isIntegrationEnabled() ? loadIntegrationEnv() : null;

  it('lists pages in the sandbox space', async () => {
    if (!env) throw new Error('unreachable — describe.skipIf should have skipped');
    const client = new ConfluenceClient({
      baseUrl: env.baseUrl,
      auth: { type: 'basic', email: env.email, apiToken: env.apiToken },
    });

    const page = await client.pages.list({ spaceId: env.spaceId, limit: 1 });

    expect(Array.isArray(page.results)).toBe(true);
  });

  it('paginates pages via listAll without errors', async () => {
    if (!env) throw new Error('unreachable — describe.skipIf should have skipped');
    const client = new ConfluenceClient({
      baseUrl: env.baseUrl,
      auth: { type: 'basic', email: env.email, apiToken: env.apiToken },
    });

    let count = 0;
    for await (const _page of client.pages.listAll({ spaceId: env.spaceId, limit: 5 })) {
      void _page;
      count += 1;
      if (count >= 5) break;
    }

    expect(count).toBeGreaterThanOrEqual(0);
  });
});
