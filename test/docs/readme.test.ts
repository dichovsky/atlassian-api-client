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
const CHANGELOG = readFileSync(resolve(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
const DOCS_INDEX = readFileSync(resolve(REPO_ROOT, 'docs', 'README.md'), 'utf8');
const RELEASING = readFileSync(resolve(REPO_ROOT, 'docs', 'RELEASING.md'), 'utf8');
const DEEP_AUDIT = readFileSync(
  resolve(REPO_ROOT, 'docs', 'archive', 'DEEP-AUDIT-2026-06-10.md'),
  'utf8',
);
const BACKLOG = readFileSync(resolve(REPO_ROOT, 'BACKLOG.md'), 'utf8');
const ATTACHMENT_TYPES = readFileSync(
  resolve(REPO_ROOT, 'src', 'confluence', 'types', 'attachments.ts'),
  'utf8',
);
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

  it('documents CLI bearer authentication without inline credentials', () => {
    expect(README).toContain('ATLASSIAN_AUTH_TYPE=bearer');
    expect(README).toContain('Credential flags remain available for backward compatibility');
    expect(README).not.toContain('--token your-');
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
  it('keeps an empty linked Unreleased section ahead of the latest release', () => {
    const unreleased = CHANGELOG.indexOf(
      '## [Unreleased](https://github.com/dichovsky/atlassian-api-client/compare/v4.0.0...HEAD)',
    );
    const latestRelease = CHANGELOG.indexOf('## [4.0.0]');

    expect(unreleased).toBeGreaterThan(-1);
    expect(latestRelease).toBeGreaterThan(unreleased);
    expect(CHANGELOG.slice(unreleased, latestRelease).trim()).toBe(
      '## [Unreleased](https://github.com/dichovsky/atlassian-api-client/compare/v4.0.0...HEAD)',
    );
  });

  it('documents the current supported major version and security controls', () => {
    expect(SECURITY).toContain('| 4.x     | Yes');
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
    expect(CONTRIBUTING).toContain('[release runbook](docs/RELEASING.md)');
  });

  it('documents the guarded release, verification, and rollback process', () => {
    expect(DOCS_INDEX).toContain('[RELEASING.md](RELEASING.md)');
    expect(RELEASING).toContain('npm run release:check -- vX.Y.Z');
    expect(RELEASING).toContain('npm publish --provenance');
    expect(RELEASING).toContain('signed annotated tag');
    expect(RELEASING).toContain('OIDC');
    expect(RELEASING).toContain('Never publish from a workstation');
    expect(RELEASING).toContain('Never move or reuse a published tag');
    expect(RELEASING).toContain('npm deprecate');
    expect(RELEASING).toContain('npm dist-tag add');
    expect(RELEASING).toContain('Post-release');
  });

  it('keeps the June deep audit explicitly historical and correctly linked', () => {
    expect(DOCS_INDEX).toContain('[DEEP-AUDIT-2026-06-10.md](archive/DEEP-AUDIT-2026-06-10.md)');
    expect(DEEP_AUDIT).toContain('HISTORICAL SNAPSHOT');
    expect(DEEP_AUDIT).toContain('[spec/README.md](../../spec/README.md)');
    expect(DEEP_AUDIT).not.toContain('non-functional on HEAD');
    expect(DEEP_AUDIT).not.toContain('future **3.0.0**');
  });

  it('tracks the deferred richer attachment upload model concretely', () => {
    expect(BACKLOG).toContain('B1067');
    expect(ATTACHMENT_TYPES).toContain('B1067');
    expect(ATTACHMENT_TYPES).not.toContain('Flag for inclusion in a future major-version');
  });

  it('describes the pinned OpenAPI snapshot as JSON', () => {
    expect(PAYLOAD_RULES).toContain('spec/jira-platform-v3.json');
    expect(PAYLOAD_RULES).not.toContain('YAML is the source-of-truth format');
  });
});
