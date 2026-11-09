/**
 * Release 4.1.0 unit help-skill: the generic CLI rules the skill states, run
 * through the real CLI (F069, F009, F346, F342, X-HS1..X-HS5, X-HS8).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runCliWire, type CliWireResult, type WireRequest } from '../helpers/cli-wire.js';
import { runAtlas, type RunResult } from '../e2e/helpers/cli-runner.js';
import { TimeoutError } from '../../src/core/errors.js';

const SKILL = resolve(import.meta.dirname, '..', '..', 'skill');
const PAYLOAD_RULES = readFileSync(resolve(SKILL, 'reference/payload-rules.md'), 'utf8');
const AUTH_SAFETY = readFileSync(resolve(SKILL, 'reference/auth-and-safety.md'), 'utf8');
const C = '/wiki/api/v2';

async function oneRequest(args: readonly string[], body?: unknown): Promise<WireRequest> {
  const run = await runCliWire(args, body === undefined ? {} : { respond: { body } });
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return run.requests[0] as WireRequest;
}

async function rejected(args: readonly string[]): Promise<CliWireResult> {
  const run = await runCliWire(args);
  expect(run.exitCode).toBe(1);
  expect(run.requests).toEqual([]);
  return run;
}

describe('values that start with - need = (F069, F009d)', () => {
  it('--sort=-created-date reaches the wire', async () => {
    const req = await oneRequest([
      'confluence',
      'footer-comments',
      'versions',
      '77',
      '--sort=-modified-date',
    ]);
    expect(req.path).toBe(`${C}/footer-comments/77/versions`);
    expect(req.query.getAll('sort')).toEqual(['-modified-date']);
  });

  it('--sort -created-date fails with the error the skill quotes', async () => {
    const run = await rejected(['confluence', 'pages', 'list', '--sort', '-title']);
    expect(run.stderr).toContain("Option '--sort' argument is ambiguous");
    expect(PAYLOAD_RULES).toContain(
      "fails before any request with `Option '--sort' argument is ambiguous`",
    );
  });
});

describe('boolean flag syntax as payload-rules.md states it (X-HS1)', () => {
  const picker = ['jira', 'issues', 'picker', '--query', 'bug'];
  it.each([
    [['--show-sub-tasks'], ['true']],
    [['--show-sub-tasks', 'true'], ['true']],
    [['--show-sub-tasks=true'], ['true']],
    [['--show-sub-tasks', 'false'], ['false']],
    [['--show-sub-tasks=false'], ['false']],
    [['--no-show-sub-tasks'], ['false']],
    [[], []],
  ] as const)('%j sends showSubTasks=%j', async (flag, sent) => {
    const req = await oneRequest([...picker, ...flag]);
    expect(req.path).toBe('/rest/api/3/issue/picker');
    expect(req.query.getAll('showSubTasks')).toEqual(sent);
  });

  it.each([
    [['--show-sub-tasks', 'no'], '--show-sub-tasks accepts true or false, got: no'],
    [['--show-sub-tasks=yes'], '--show-sub-tasks accepts true or false, got: yes'],
    [['--no-show-sub-tasks', 'true'], '--no-show-sub-tasks does not take a value'],
    [['--show-sub-tasks', '--no-show-sub-tasks'], '--show-sub-tasks was given both true and false'],
  ] as const)('%j is rejected before any request', async (flag, message) => {
    const run = await rejected([...picker, ...flag]);
    expect(run.stderr).toContain(message);
  });
});

describe('flags that only act when true send nothing for false (X-HS3)', () => {
  it.each([
    [['jira', 'issues', 'delete', 'K-1', '--delete-subtasks', 'false'], 'DELETE'],
    [['jira', 'issues', 'update', 'K-1', '--summary', 'x', '--return-issue', 'false'], 'PUT'],
    [['confluence', 'pages', 'delete', '123', '--purge', 'false'], 'DELETE'],
    [['confluence', 'pages', 'delete', '123', '--draft', 'false'], 'DELETE'],
    [['confluence', 'pages', 'get', '5', '--get-draft', 'false', '--include-labels=false'], 'GET'],
    [['confluence', 'spaces', 'get', '9', '--include-icon', 'false'], 'GET'],
  ] as const)('%j', async (argv, method) => {
    const req = await oneRequest(argv);
    expect(req.method).toBe(method);
    expect([...req.query.keys()]).toEqual([]);
  });

  it('payload-rules.md calls its list examples and names the Confluence get flags', () => {
    expect(PAYLOAD_RULES).toContain('For example: `--delete-subtasks`');
    expect(PAYLOAD_RULES).toContain(
      '`--get-draft` and the `--include-*` flags other than `--include-version`',
    );
  });
});

describe('a 1 or 0 after a boolean flag sets it to true (review r1 minor)', () => {
  it.each([
    [['confluence', 'pages', 'delete', '123', '--purge', '0'], `${C}/pages/123`, 'purge'],
    [
      ['jira', 'issues', 'delete', 'K-1', '--delete-subtasks', '0'],
      '/rest/api/3/issue/K-1',
      'deleteSubtasks',
    ],
  ] as const)('%j sends %s?%s=true', async (argv, path, param) => {
    const req = await oneRequest(argv);
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe(path);
    expect([...req.query.entries()]).toEqual([[param, 'true']]);
  });

  it('payload-rules.md warns that the flag becomes true', () => {
    expect(PAYLOAD_RULES).toContain(
      'a `1` or `0` after the flag is not its value: the flag is set to `true` and the digit becomes a stray positional',
    );
    expect(PAYLOAD_RULES).toContain(
      '`atlas confluence pages delete 123 --purge 0` purges the page',
    );
  });
});

describe('--format minimal follows the documented rules (X-HS2, X-HS4)', () => {
  async function minimal(args: readonly string[], body: unknown): Promise<string> {
    const run = await runCliWire([...args, '--format', 'minimal'], { respond: { body } });
    expect(run.exitCode).toBe(0);
    expect(run.requests).toHaveLength(1);
    return run.stdout;
  }

  it('a Jira issue prints its numeric id, not the key', async () => {
    const out = await minimal(['jira', 'issues', 'get', 'PROJ-123'], {
      id: '10123',
      key: 'PROJ-123',
      fields: { summary: 's' },
    });
    expect(out).toBe('10123\n');
  });

  it('an array prints one line per element, id then key then name', async () => {
    const out = await minimal(
      ['jira', 'issue-types', 'list'],
      [{ id: 10001, name: 'Bug' }, { key: 'K' }, { name: 'Task' }, { other: 1 }],
    );
    expect(out).toBe('10001\nK\nTask\n\n');
  });

  it('an id-less envelope prints its only array', async () => {
    const out = await minimal(['jira', 'issues', 'transitions', 'PROJ-1'], {
      expand: 'transitions',
      transitions: [{ id: '31' }, { id: '41' }],
    });
    expect(out).toBe('31\n41\n');
  });

  it('a Jira user prints its account ID', async () => {
    const out = await minimal(['jira', 'users', 'get', '5b10ac'], {
      accountId: '5b10ac',
      displayName: 'Ada',
    });
    expect(out).toBe('5b10ac\n');
  });

  it('an object without id fields or a single array prints an empty line', async () => {
    expect(await minimal(['confluence', 'pages', 'likes-count', '456'], { count: 5 })).toBe('\n');
  });

  it('an empty list prints nothing', async () => {
    expect(await minimal(['confluence', 'pages', 'list'], { results: [], _links: {} })).toBe('');
  });

  it('an object whose name is not a string is an envelope, as rule 2 states', async () => {
    const out = await minimal(['jira', 'issue-types', 'list'], {
      name: { first: 'not-a-record-name' },
      values: [{ id: 7 }],
    });
    expect(out).toBe('7\n');
    expect(PAYLOAD_RULES).toContain(
      '2. An object with a string or number `id`, or a string `key`, `name` or `accountId`, is one record',
    );
  });
});

describe('blog-posts get flag projection matches its JSDoc (X-HS5)', () => {
  it('default-false flags given false are left off; --historical-version maps to version', async () => {
    const req = await oneRequest([
      'confluence',
      'blog-posts',
      'get',
      '5',
      '--include-labels',
      'false',
      '--get-draft=false',
      '--historical-version',
      '3',
    ]);
    expect(req.path).toBe(`${C}/blogposts/5`);
    expect([...req.query.entries()]).toEqual([['version', '3']]);
  });

  it('an explicit false for include-version is sent', async () => {
    const req = await oneRequest([
      'confluence',
      'blog-posts',
      'get',
      '5',
      '--include-version=false',
    ]);
    expect([...req.query.entries()]).toEqual([['include-version', 'false']]);
  });
});

describe('error messages the skill quotes match the CLI (F009b, F346)', () => {
  const update = ['confluence', 'pages', 'update', '789012'];
  it.each([
    [['--title', 'x', '--body', 'y'], '--version-number'],
    [['--version-number', '4', '--body', 'y'], '--title'],
    [['--version-number', '4', '--title', 'x'], '--body'],
  ] as const)('pages update %j fails locally on %s', async (flags, missing) => {
    const run = await rejected([...update, ...flags]);
    expect(run.stderr).toBe(`Error: Missing required option: ${missing}\n`);
  });

  it('payload-rules.md quotes that message', () => {
    expect(PAYLOAD_RULES).toContain('`Missing required option: --version-number`');
    expect(PAYLOAD_RULES).not.toContain('version-mismatch error');
  });

  it('pages update with all three sends the version', async () => {
    const req = await oneRequest([
      ...update,
      '--version-number',
      '4',
      '--title',
      'x',
      '--body',
      '',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.body).toMatchObject({ version: { number: 4 }, body: { value: '' } });
  });

  it('the allowlist error is the one auth-and-safety.md quotes, and --allowed-hosts fixes it', async () => {
    const base = [
      'confluence',
      'spaces',
      'list',
      '--base-url',
      'https://confluence.internal.example',
    ];
    const run = await rejected(base);
    expect(run.stderr).toMatch(
      /^Error: baseUrl host "confluence\.internal\.example" is not on the default Atlassian host allowlist \(.*Pass ClientConfig\.allowedHosts/,
    );
    expect(AUTH_SAFETY).toContain(
      '`Error: baseUrl host "<host>" is not on the default Atlassian host allowlist (...)`',
    );

    const req = await oneRequest([...base, '--allowed-hosts', 'confluence.internal.example']);
    expect(req.url).toBe('https://confluence.internal.example/wiki/api/v2/spaces');
  });
});

describe('atlas scopes validate works as auth-and-safety.md documents it (F342)', () => {
  const noAuth = {
    ATLASSIAN_BASE_URL: undefined,
    ATLASSIAN_EMAIL: undefined,
    ATLASSIAN_API_TOKEN: undefined,
  };

  it('exits 0 with allValid for known scopes, without auth or a request', async () => {
    const run = await runCliWire(['scopes', 'validate', 'read:issue:jira', 'write:issue:jira'], {
      env: noAuth,
    });
    expect(run.exitCode).toBe(0);
    expect(run.requests).toEqual([]);
    expect(JSON.parse(run.stdout)).toEqual({
      valid: ['read:issue:jira', 'write:issue:jira'],
      unknown: [],
      allValid: true,
    });
  });

  it('exits 1 and lists the unknown scope', async () => {
    const run = await runCliWire(['scopes', 'validate', 'read:issue:jira', 'write:made-up'], {
      env: noAuth,
    });
    expect(run.exitCode).toBe(1);
    expect(JSON.parse(run.stdout)).toMatchObject({ unknown: ['write:made-up'], allValid: false });
    expect(run.stderr).toContain('write:made-up');
  });

  it('exits 1 and lists the known scopes when none is given', async () => {
    const run = await runCliWire(['scopes', 'validate'], { env: noAuth });
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain('Known scopes:');
  });
});

describe('write failures the skill tells agents to read back first (X-HS8)', () => {
  /** Run `atlas <args>` against a fetch stub, counting the requests it sends. */
  async function failingWrite(
    args: readonly string[],
    fetchStub: () => Promise<Response>,
  ): Promise<{ readonly run: RunResult; readonly calls: number }> {
    let calls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      calls++;
      return fetchStub();
    }) as typeof fetch;
    try {
      return { run: await runAtlas(args), calls };
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  const coded = (message: string, code: string): TypeError =>
    new TypeError(message, { cause: Object.assign(new Error(code), { code }) });
  const create = [
    'jira',
    'issues',
    'create',
    '--project',
    'PROJ',
    '--type',
    'Task',
    '--summary',
    'Fix login',
  ];

  it('a write whose response headers time out prints `Error: fetch failed`, sent once', async () => {
    const { run, calls } = await failingWrite(
      ['jira', 'issues', 'update', 'K-1', '--summary', 'x'],
      () => Promise.reject(coded('fetch failed', 'UND_ERR_HEADERS_TIMEOUT')),
    );
    expect(calls).toBe(1);
    expect(run.code).toBe(1);
    expect(run.stderr).toBe('Error: fetch failed\n');
    expect(AUTH_SAFETY).toContain('`Error: fetch failed`');
  });

  it('a create whose 201 body dies mid-read prints `Error: terminated`, sent once', async () => {
    const { run, calls } = await failingWrite(create, () =>
      Promise.resolve(
        new Response(
          new ReadableStream({
            pull(controller) {
              controller.error(coded('terminated', 'UND_ERR_SOCKET'));
            },
          }),
          { status: 201, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );
    expect(calls).toBe(1);
    expect(run.code).toBe(1);
    expect(run.stderr).toBe('Error: terminated\n');
    expect(AUTH_SAFETY).toContain('`Error: terminated`');
  });

  it('a create redirected off the allowlist says it may already have applied it, sent once', async () => {
    const { run, calls } = await failingWrite(create, () =>
      Promise.resolve(
        new Response(null, { status: 303, headers: { location: 'https://evil.example.com/x' } }),
      ),
    );
    expect(calls).toBe(1);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('may already have applied it');
    expect(AUTH_SAFETY).toContain('"may already have applied it"');
  });

  it('quotes the timeout message the CLI prints with its default timeout', () => {
    expect(new TimeoutError(30_000).message).toBe('Request timed out after 30000ms');
    expect(AUTH_SAFETY).toContain('`Error: Request timed out after 30000ms`');
  });

  it('does not key the rule on "not retried", which the CLI never prints', () => {
    expect(AUTH_SAFETY).not.toContain('not retried');
  });
});
