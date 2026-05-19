/**
 * Smoke tests for the E2E harness itself. Validates that the in-process
 * runCli driver + fetch-mock plumbing work end-to-end before the
 * resource-matrix tests rely on them.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { installFetchMock } from './helpers/fetch-mock.js';
import { runAtlas } from './helpers/cli-runner.js';
import { confluenceFixtures, CONFLUENCE_PREFIX } from './helpers/fixtures.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('E2E harness', () => {
  it('captures --version through the runCli stdout writer', async () => {
    const result = await runAtlas(['--version'], { version: '9.9.9-harness' });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('atlas v9.9.9-harness');
    expect(result.stderr).toBe('');
  });

  it('captures --help through the runCli stdout writer', async () => {
    const result = await runAtlas(['--help']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('atlas');
    expect(result.stdout.toLowerCase()).toContain('usage');
  });

  it('routes confluence requests through the fetch-mock and prints JSON', async () => {
    const { calls } = installFetchMock([
      {
        method: 'GET',
        path: `${CONFLUENCE_PREFIX}/pages/12345`,
        body: confluenceFixtures.page,
      },
    ]);

    const result = await runAtlas(['confluence', 'pages', 'get', '12345']);
    expect(result.code).toBe(0);

    // printOutput writes pretty JSON to process.stdout; harness captures it.
    const parsed = JSON.parse(result.stdout) as { id: string; title: string };
    expect(parsed.id).toBe('12345');
    expect(parsed.title).toBe('E2E Test Page');

    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.method).toBe('GET');
    expect(call.pathname).toBe(`${CONFLUENCE_PREFIX}/pages/12345`);
    expect(call.headers['authorization']).toMatch(/^Basic /);
  });

  it('fails fast on an unmocked route', async () => {
    installFetchMock([]);
    const result = await runAtlas(['confluence', 'pages', 'get', '12345']);
    expect(result.code).not.toBe(0);
  });
});
