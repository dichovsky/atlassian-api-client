import { describe, it, expect } from 'vitest';
import { JiraClient } from '../../src/index.js';
import { isIntegrationEnabled, loadIntegrationEnv } from './env.js';

describe.skipIf(!isIntegrationEnabled())('Jira projects — integration', () => {
  const env = isIntegrationEnabled() ? loadIntegrationEnv() : null;

  it('fetches the sandbox project by key', async () => {
    if (!env) throw new Error('unreachable — describe.skipIf should have skipped');
    const client = new JiraClient({
      baseUrl: env.baseUrl,
      auth: { type: 'basic', email: env.email, apiToken: env.apiToken },
    });

    const project = await client.projects.get(env.projectKey);

    expect(project.key).toBe(env.projectKey);
  });

  it('returns a paginated projects list', async () => {
    if (!env) throw new Error('unreachable — describe.skipIf should have skipped');
    const client = new JiraClient({
      baseUrl: env.baseUrl,
      auth: { type: 'basic', email: env.email, apiToken: env.apiToken },
    });

    const page = await client.projects.list({ maxResults: 1 });

    expect(Array.isArray(page.values)).toBe(true);
  });
});
