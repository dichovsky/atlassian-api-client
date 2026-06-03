import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '..', '..');
const README = readFileSync(resolve(REPO_ROOT, 'README.md'), 'utf8');
const ARCHITECTURE = readFileSync(resolve(REPO_ROOT, 'docs', 'ARCHITECTURE.md'), 'utf8');
const CONTRIBUTING = readFileSync(resolve(REPO_ROOT, 'CONTRIBUTING.md'), 'utf8');
const SECURITY = readFileSync(resolve(REPO_ROOT, 'SECURITY.md'), 'utf8');
const PAYLOAD_RULES = readFileSync(
  resolve(REPO_ROOT, 'skill', 'reference', 'payload-rules.md'),
  'utf8',
);
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
    expect(PACKAGE_JSON.funding).toEqual({
      type: 'buymeacoffee',
      url: 'https://buymeacoffee.com/dichovsky',
    });
    expect(README).toContain('[Support development](https://buymeacoffee.com/dichovsky)');
  });
});

describe('live documentation consistency', () => {
  it('documents the current supported major version and security controls', () => {
    expect(SECURITY).toContain('| 1.x     | Yes');
    expect(SECURITY).toContain('`ClientConfig.allowedHosts`');
    expect(SECURITY).toContain('`OAuthRefreshConfig.allowedTokenEndpointHosts`');
    expect(SECURITY).toContain('`ClientConfig.maxResponseBytes`');
  });

  it('keeps the architecture package inventory aligned with the publish whitelist', () => {
    expect(ARCHITECTURE).toContain('- `skill/` — bundled coding-agent skill and reference files');
    expect(ARCHITECTURE).toContain('- `SECURITY.md`');
    expect(ARCHITECTURE).toContain('- `docs/ARCHITECTURE.md`');
    expect(ARCHITECTURE).not.toContain('- `docs/` (dev documentation)');
  });

  it('documents the complete contributor validation gate', () => {
    expect(CONTRIBUTING).toContain('`npm run codemap:check`');
    expect(CONTRIBUTING).toContain('`npm run format:check`');
    expect(CONTRIBUTING).toContain('`npm run test:exports`');
    expect(CONTRIBUTING).toContain('`npm pack --dry-run --json`');
  });

  it('describes the pinned OpenAPI snapshot as JSON', () => {
    expect(PAYLOAD_RULES).toContain('spec/jira-platform-v3.json');
    expect(PAYLOAD_RULES).not.toContain('YAML is the source-of-truth format');
  });
});
