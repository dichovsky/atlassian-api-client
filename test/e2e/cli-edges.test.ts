/**
 * Edge-case E2E coverage for the `atlas` CLI: help/version surfaces,
 * missing-credential refusal, unknown-command refusal, and HTTP error
 * propagation (401 / 403 / 404 — the non-retried statuses).
 *
 * Retried error paths (429, 5xx) are exercised in
 * `test/core/transport.test.ts` and `test/core/retry.test.ts` with fake
 * timers; folding them into the in-process CLI driver here would either
 * couple every edge test to vitest's timer plumbing or make the suite
 * wait through real retry delays. Out of scope for this PR.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { installFetchMock } from './helpers/fetch-mock.js';
import { runAtlas } from './helpers/cli-runner.js';
import { CONFLUENCE_PREFIX as C, JIRA_PREFIX as J } from './helpers/fixtures.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('atlas — help surfaces', () => {
  it('--version prints atlas v<version>', async () => {
    const result = await runAtlas(['--version'], { version: '1.2.3-e2e' });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('atlas v1.2.3-e2e');
    expect(result.stderr).toBe('');
  });

  it('--help prints global help with both API verbs', async () => {
    const result = await runAtlas(['--help']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('atlas');
    expect(result.stdout.toLowerCase()).toContain('usage');
    expect(result.stdout).toContain('confluence');
    expect(result.stdout).toContain('jira');
  });

  it('confluence --help prints confluence-scoped help', async () => {
    const result = await runAtlas(['confluence', '--help']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Confluence');
    expect(result.stdout).toContain('pages');
    expect(result.stdout).toContain('spaces');
  });

  it('jira --help prints jira-scoped help', async () => {
    const result = await runAtlas(['jira', '--help']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Jira');
    expect(result.stdout).toContain('issues');
    expect(result.stdout).toContain('projects');
  });

  it('install-skill --help prints install-skill-scoped help', async () => {
    const result = await runAtlas(['install-skill', '--help']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('install-skill');
    expect(result.stdout).toContain('--dry-run');
    expect(result.stdout).toContain('--print');
  });

  it('no arguments prints global help', async () => {
    const result = await runAtlas([]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('atlas');
  });
});

describe('atlas — missing-credential refusal', () => {
  it('exits non-zero when ATLASSIAN_BASE_URL is unset', async () => {
    const result = await runAtlas(['confluence', 'pages', 'get', '1'], {
      env: { ATLASSIAN_BASE_URL: undefined },
    });
    expect(result.code).toBe(1);
    expect(result.stderr.toLowerCase()).toContain('base-url');
  });

  it('exits non-zero when ATLASSIAN_API_TOKEN is unset', async () => {
    const result = await runAtlas(['confluence', 'pages', 'get', '1'], {
      env: { ATLASSIAN_API_TOKEN: undefined },
    });
    expect(result.code).toBe(1);
    expect(result.stderr.toLowerCase()).toContain('token');
  });

  it('exits non-zero when basic auth is selected but email is unset', async () => {
    const result = await runAtlas(['jira', 'issues', 'get', 'PROJ-1'], {
      env: { ATLASSIAN_EMAIL: undefined },
    });
    expect(result.code).toBe(1);
    expect(result.stderr.toLowerCase()).toContain('email');
  });
});

describe('atlas — unknown command refusal', () => {
  it('rejects an unknown api verb', async () => {
    const result = await runAtlas(['bitbucket', 'foo', 'bar']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Unknown API');
  });

  it('rejects an unknown api verb before requiring credentials', async () => {
    const result = await runAtlas(['bitbucket', 'foo', 'bar'], {
      env: {
        ATLASSIAN_BASE_URL: undefined,
        ATLASSIAN_EMAIL: undefined,
        ATLASSIAN_API_TOKEN: undefined,
      },
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Unknown API');
  });

  it('rejects an unknown confluence resource', async () => {
    const result = await runAtlas(['confluence', 'widgets', 'list']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Unknown Confluence resource');
  });

  it('rejects an unknown jira resource', async () => {
    const result = await runAtlas(['jira', 'epics', 'list']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Unknown Jira resource');
  });

  it('rejects an unknown confluence action on a known resource', async () => {
    const result = await runAtlas(['confluence', 'pages', 'archive', '123']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Unknown pages action');
  });

  it('rejects an unknown jira action on a known resource', async () => {
    const result = await runAtlas(['jira', 'issues', 'archive', 'PROJ-1']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Unknown issues action');
  });
});

describe('atlas — HTTP error propagation (non-retried)', () => {
  it('confluence 401 → exit 1, auth error surfaced', async () => {
    installFetchMock([
      {
        method: 'GET',
        path: `${C}/pages/12345`,
        status: 401,
        body: { message: 'Unauthorized' },
      },
    ]);
    const result = await runAtlas(['confluence', 'pages', 'get', '12345']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/401|auth|unauthor/i);
  });

  it('confluence 403 → exit 1, forbidden surfaced', async () => {
    installFetchMock([
      {
        method: 'GET',
        path: `${C}/pages/12345`,
        status: 403,
        body: { message: 'Forbidden' },
      },
    ]);
    const result = await runAtlas(['confluence', 'pages', 'get', '12345']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/403|forbid/i);
  });

  it('jira 404 → exit 1, not-found surfaced', async () => {
    installFetchMock([
      {
        method: 'GET',
        path: `${J}/issue/PROJ-1`,
        status: 404,
        body: { errorMessages: ['Issue does not exist'] },
      },
    ]);
    const result = await runAtlas(['jira', 'issues', 'get', 'PROJ-1']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/404|not.?found|does not exist/i);
  });

  it('jira 400 → exit 1, validation surfaced', async () => {
    installFetchMock([
      {
        method: 'POST',
        path: `${J}/issue`,
        status: 400,
        body: { errorMessages: ['Field "summary" is required'] },
      },
    ]);
    const result = await runAtlas([
      'jira',
      'issues',
      'create',
      '--project',
      'PROJ',
      '--type',
      'Task',
      '--summary',
      'x',
    ]);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/400|required|summary/i);
  });
});

describe('atlas — output formats', () => {
  it('--format minimal prints only the id', async () => {
    installFetchMock([
      {
        method: 'GET',
        path: `${C}/pages/12345`,
        body: {
          id: '12345',
          type: 'page',
          status: 'current',
          title: 'X',
          spaceId: '1',
          version: { number: 1 },
        },
      },
    ]);
    const result = await runAtlas(['confluence', 'pages', 'get', '12345', '--format', 'minimal']);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe('12345');
  });

  it('--format table prints aligned columns', async () => {
    installFetchMock([
      {
        method: 'GET',
        path: `${J}/issuetype`,
        body: [
          { id: '10000', name: 'Task', description: 'a' },
          { id: '10001', name: 'Bug', description: 'b' },
        ],
      },
    ]);
    const result = await runAtlas(['jira', 'issue-types', 'list', '--format', 'table']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('id');
    expect(result.stdout).toContain('name');
    expect(result.stdout).toContain('Task');
    expect(result.stdout).toContain('Bug');
  });
});

describe('atlas install-skill — non-mutating modes', () => {
  it('--print emits the bundled skill source directory', async () => {
    const result = await runAtlas(['install-skill', '--print']);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/skill/i);
  });

  it('refuses positional arguments', async () => {
    const result = await runAtlas(['install-skill', 'extra']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('install-skill does not accept');
  });
});

describe('atlas — auth header variants', () => {
  it('bearer auth sends Authorization: Bearer <token>', async () => {
    const handle = installFetchMock([
      {
        method: 'GET',
        path: `${J}/myself`,
        body: { accountId: 'acct-001', displayName: 'CLI E2E User' },
      },
    ]);
    const result = await runAtlas(['jira', 'users', 'me'], {
      env: {
        ATLASSIAN_AUTH_TYPE: 'bearer',
        ATLASSIAN_EMAIL: undefined,
      },
    });
    expect(result.code).toBe(0);
    expect(handle.calls[0]!.headers['authorization']).toMatch(/^Bearer /);
  });
});
