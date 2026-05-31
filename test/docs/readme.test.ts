import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '..', '..');
const README = readFileSync(resolve(REPO_ROOT, 'README.md'), 'utf8');
const PACKAGE_JSON = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8')) as {
  funding?: string;
  files?: string[];
};

describe('README package documentation', () => {
  it('keeps the response-size example aligned with the public pages API', () => {
    expect(README).toContain("await client.pages.get('123');");
    expect(README).not.toContain('client.pages.getPage(');
  });

  it('documents CLI bearer authentication', () => {
    expect(README).toContain('ATLASSIAN_AUTH_TYPE=bearer');
    expect(README).toContain('--auth-type bearer');
  });

  it('documents LRU cache eviction and auth-scoped keys', () => {
    expect(README).toContain('LRU eviction');
    expect(README).toContain('Keys include auth identity, method, path, and query string');
  });

  it('distinguishes transport fetch injection from OAuth refresh fetch injection', () => {
    expect(README).toContain('OAuth token refresh has a separate `fetch` option');
    expect(README).toContain('fetch: proxyFetch');
  });

  it('ships linked package documentation and funding metadata', () => {
    expect(PACKAGE_JSON.files).toContain('docs/ARCHITECTURE.md');
    expect(PACKAGE_JSON.funding).toBe('https://buymeacoffee.com/dichovsky');
    expect(README).toContain('[Support development](https://buymeacoffee.com/dichovsky)');
  });
});
