/**
 * CLI → wire regressions for release 4.1.0 unit conf-b: `tasks`,
 * `footer-comments`, `inline-comments`, `databases` (and the versions resource
 * behind `pages versions`), the `embeds` / `folders` / `whiteboards` /
 * `space-roles` / `space-permissions` / `data-policies` / `admin-key` findings
 * batched with them, plus the CLI→HTTP coverage the audit found missing
 * (F052, F059, F065). Every case drives real argv through {@link runCliWire},
 * and every captured request is checked against the pinned
 * `spec/confluence-v2.json` (operation exists for method + path, every query
 * key is a declared query parameter).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getHelpText } from '../../src/cli/help.js';
import { runCliWire, type WireRequest } from '../helpers/cli-wire.js';

const V2 = '/wiki/api/v2';
const C = 'confluence';

// ─── pinned spec ────────────────────────────────────────────────────────────

interface SpecParam {
  readonly name: string;
  readonly in: string;
}
type SpecParamRef = SpecParam | { readonly $ref: string };
interface Spec {
  readonly paths: Record<string, Record<string, { readonly parameters?: SpecParamRef[] }>>;
  readonly components: { readonly parameters: Record<string, SpecParam> };
}
const SPEC = JSON.parse(
  readFileSync(new URL('../../spec/confluence-v2.json', import.meta.url), 'utf8'),
) as Spec;
// Literal templates before parameterised ones, so `/a/b` beats `/a/{id}`.
const SPEC_PATHS = Object.entries(SPEC.paths).sort(
  ([a], [b]) => a.split('{').length - b.split('{').length,
);

/** Query parameter names of the spec operation matching `req`, or undefined. */
function specQueryParams(req: WireRequest): Set<string> | undefined {
  const rel = req.path.slice(V2.length);
  for (const [template, item] of SPEC_PATHS) {
    const op = item[req.method.toLowerCase()];
    if (op === undefined) continue;
    if (!new RegExp(`^${template.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(rel)) continue;
    const params = [...(item['parameters']?.parameters ?? []), ...(op.parameters ?? [])].map((p) =>
      '$ref' in p ? SPEC.components.parameters[p.$ref.split('/').pop() ?? ''] : p,
    );
    return new Set(params.filter((p) => p?.in === 'query').map((p) => p?.name ?? ''));
  }
  return undefined;
}

function expectOnSpec(req: WireRequest): void {
  expect(req.path.startsWith(V2)).toBe(true);
  const names = specQueryParams(req);
  expect(names, `${req.method} ${req.path} is not a spec operation`).toBeDefined();
  // deepObject params (`filter[fld]`) are declared under their base name.
  for (const key of req.query.keys()) {
    expect(names, `${req.method} ${req.path} ?${key}`).toContain(key.replace(/\[.*$/, ''));
  }
}

// ─── harness helpers ────────────────────────────────────────────────────────

/** Run argv; expect success with exactly one spec-conformant request. */
async function sent(args: readonly string[]): Promise<WireRequest> {
  const run = await runCliWire([C, ...args]);
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  const req = run.requests[0] as WireRequest;
  expectOnSpec(req);
  return req;
}

/** Run argv; expect exit 1 with `message` on stderr and no request. */
async function rejected(args: readonly string[], message: string): Promise<void> {
  const run = await runCliWire([C, ...args]);
  expect(run.exitCode).toBe(1);
  expect(run.stderr).toContain(message);
  expect(run.requests).toHaveLength(0);
}

/** Query as a plain object; repeated keys become arrays. */
function queryOf(req: WireRequest): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(req.query.keys())) {
    const all = req.query.getAll(key);
    out[key] = all.length === 1 ? (all[0] as string) : all;
  }
  return out;
}

/**
 * Split a shell snippet into argv lists: honours single/double quotes,
 * `\`-newline continuations, unquoted newlines between commands and `#`
 * comments. Returns only commands starting with `atlas`, without that word.
 */
function shellCommands(snippet: string): string[][] {
  const commands: string[][] = [];
  let tokens: string[] = [];
  let current: string | undefined;
  let quote: string | undefined;
  const endToken = () => {
    if (current !== undefined) tokens.push(current);
    current = undefined;
  };
  const endCommand = () => {
    endToken();
    if (tokens[0] === 'atlas') commands.push(tokens.slice(1));
    tokens = [];
  };
  for (let i = 0; i < snippet.length; i++) {
    const ch = snippet[i] as string;
    if (quote !== undefined) {
      if (ch === quote) quote = undefined;
      else current = (current ?? '') + ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      current ??= '';
    } else if (ch === '\\' && snippet[i + 1] === '\n') {
      i++;
      endToken();
    } else if (ch === '\n') {
      endCommand();
    } else if (ch === ' ') {
      endToken();
    } else if (ch === '#' && current === undefined) {
      while (i + 1 < snippet.length && snippet[i + 1] !== '\n') i++;
    } else {
      current = (current ?? '') + ch;
    }
  }
  endCommand();
  return commands;
}

const SKILL = readFileSync(new URL('../../skill/reference/confluence.md', import.meta.url), 'utf8');

/** The `## <heading>` section of confluence.md (empty when missing). */
function skillSection(heading: string): string {
  const start = SKILL.indexOf(`\n## ${heading}`);
  if (start === -1) return '';
  const end = SKILL.indexOf('\n## ', start + 1);
  return SKILL.slice(start, end === -1 ? undefined : end);
}

/** `atlas` commands in a section's sh blocks; `<placeholder>` → `placeholder`. */
function skillCommands(heading: string): string[][] {
  const blocks = [...skillSection(heading).matchAll(/```sh\n([\s\S]*?)```/g)];
  return blocks.flatMap(([, body]) => shellCommands((body ?? '').replace(/<([^>]+)>/g, '$1')));
}

// ─── skill + help examples run end to end ───────────────────────────────────

describe('every documented command for these resources runs (F044, F064, F070)', () => {
  const sections = [
    '`tasks`',
    '`databases`',
    '`footer-comments`',
    '`inline-comments`',
    '`app`',
    '`space-permissions`',
    '`space-roles`',
    '`embeds`',
    '`folders`',
    '`whiteboards`',
    '`data-policies`',
    '`admin-key`',
    'Content permissions and restriction state',
  ];

  it.each(sections)('skill section %s exists and has examples', (heading) => {
    expect(skillCommands(heading).length).toBeGreaterThan(0);
  });

  const cases = sections.flatMap((heading) =>
    skillCommands(heading).map((argv) => [heading, argv.join(' '), argv] as const),
  );
  it.each(cases)('%s: atlas %s', async (_heading, _line, argv) => {
    const run = await runCliWire(argv);
    expect(run.stderr).toBe('');
    expect(run.exitCode).toBe(0);
    expect(run.requests.length).toBeGreaterThan(0);
    for (const req of run.requests) expectOnSpec(req);
  });

  const helpLines = getHelpText('confluence')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) =>
      /^atlas confluence (tasks|databases|embeds|folders|whiteboards|footer-comments|inline-comments|space-roles|space-permissions|data-policies) /.test(
        line,
      ),
    );
  it('finds the help examples for these resources', () => {
    expect(helpLines.length).toBeGreaterThanOrEqual(45);
  });
  it.each(helpLines)('--help example: %s', async (line) => {
    const [argv] = shellCommands(line.replace(/<([^>]+)>/g, '$1'));
    const run = await runCliWire(argv ?? []);
    expect(run.stderr).toBe('');
    expect(run.exitCode).toBe(0);
    expect(run.requests).toHaveLength(1);
    expectOnSpec(run.requests[0] as WireRequest);
  });
});

// ─── tasks ──────────────────────────────────────────────────────────────────

describe('tasks list numeric ID filters (F043, F044)', () => {
  const message = 'must contain only decimal integer IDs up to 9007199254740991, got: ';
  it.each([
    ['--page-id', 'abc', 'abc'],
    ['--page-id', '12abc,7', '12abc'],
    ['--task-id', '9007199254740993', '9007199254740993'],
    ['--space-id', '1.5', '1.5'],
    ['--blog-post-id', '7,0x10', '0x10'],
  ])('rejects %s %s instead of dropping or rounding it', async (flag, value, bad) => {
    await rejected(['tasks', 'list', flag, value], `${flag} ${message}${bad}`);
  });

  it('data-policies list-spaces --ids shares the guard', async () => {
    await rejected(['data-policies', 'list-spaces', '--ids', 'abc'], `--ids ${message}abc`);
    const req = await sent(['data-policies', 'list-spaces', '--ids', '1,2']);
    expect(queryOf(req)).toEqual({ ids: ['1', '2'] });
  });

  it('sends each comma-separated ID as a repeated parameter', async () => {
    const req = await sent([
      ...['tasks', 'list', '--space-id', '1,2', '--task-id', '5,6'],
      ...['--created-by', 'acc-1,acc-2'],
    ]);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${V2}/tasks`);
    expect(queryOf(req)).toEqual({
      'task-id': ['5', '6'],
      'space-id': ['1', '2'],
      'created-by': ['acc-1', 'acc-2'],
    });
  });

  it('maps every filter flag onto its kebab-case wire name', async () => {
    const req = await sent([
      ...['tasks', 'list', '--page-id', '12345', '--blog-post-id', '7', '--status', 'complete'],
      ...['--assigned-to', 'acc-1', '--completed-by', 'acc-2', '--limit', '10', '--cursor', 'c1'],
    ]);
    expect(queryOf(req)).toEqual({
      'page-id': '12345',
      'blogpost-id': '7',
      'assigned-to': 'acc-1',
      'completed-by': 'acc-2',
      status: 'complete',
      limit: '10',
      cursor: 'c1',
    });
  });
});

describe('tasks list --include-blank-tasks (both false spellings)', () => {
  it.each([
    [['--include-blank-tasks', 'false'], 'false'],
    [['--include-blank-tasks=false'], 'false'],
    [['--no-include-blank-tasks'], 'false'],
    [['--include-blank-tasks'], 'true'],
    [['--include-blank-tasks', 'true'], 'true'],
    [[], null],
  ])('%j sends include-blank-tasks=%s', async (flags, expected) => {
    const req = await sent(['tasks', 'list', ...flags]);
    expect(req.query.get('include-blank-tasks')).toBe(expected);
  });
});

describe('tasks --body-format is validated on every action (F050)', () => {
  const bad = '--body-format must be one of: storage, atlas_doc_format, got: bogus';
  it.each([
    [['tasks', 'list']],
    [['tasks', 'get', '123456']],
    [['tasks', 'update', '123456', '--status', 'complete']],
  ])('%j --body-format bogus is rejected', async (args) => {
    await rejected([...args, '--body-format', 'bogus'], bad);
  });

  it('get sends a valid --body-format', async () => {
    const req = await sent(['tasks', 'get', '123456', '--body-format', 'atlas_doc_format']);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${V2}/tasks/123456`);
    expect(queryOf(req)).toEqual({ 'body-format': 'atlas_doc_format' });
  });

  it('update sends status in the body and body-format in the query', async () => {
    const req = await sent([
      ...['tasks', 'update', '123456', '--status', 'complete', '--body-format', 'storage'],
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${V2}/tasks/123456`);
    expect(queryOf(req)).toEqual({ 'body-format': 'storage' });
    expect(req.body).toEqual({ status: 'complete' });
  });
});

// ─── footer-comments / inline-comments ──────────────────────────────────────

describe('footer-comments get (F061, F063)', () => {
  it.each([
    [['--no-include-version'], 'false'],
    [['--include-version', 'false'], 'false'],
    [['--include-version=false'], 'false'],
    [['--include-version'], 'true'],
    [[], null],
  ])('%j sends include-version=%s', async (flags, expected) => {
    const req = await sent(['footer-comments', 'get', '77777', ...flags]);
    expect(req.path).toBe(`${V2}/footer-comments/77777`);
    expect(req.query.get('include-version')).toBe(expected);
  });

  it('rejects --include-version together with --no-include-version', async () => {
    await rejected(
      ['footer-comments', 'get', '77777', '--include-version', '--no-include-version'],
      '--include-version was given both true and false',
    );
  });

  it('--version-number pins a historical version and include-* false sends nothing', async () => {
    const req = await sent([
      ...['footer-comments', 'get', '77777', '--version-number', '2', '--include-likes', 'false'],
      '--include-versions',
    ]);
    expect(queryOf(req)).toEqual({ version: '2', 'include-versions': 'true' });
  });

  it.each(['storage', 'atlas_doc_format', 'view', 'export_view'])(
    'get --body-format %s reaches the wire',
    async (format) => {
      const req = await sent(['footer-comments', 'get', '77777', '--body-format', format]);
      expect(req.query.get('body-format')).toBe(format);
    },
  );
  it.each(['anonymous_export_view', 'styled_view', 'editor'])(
    'get --body-format %s reaches the wire',
    async (format) => {
      const req = await sent(['footer-comments', 'get', '77777', '--body-format', format]);
      expect(req.query.get('body-format')).toBe(format);
    },
  );

  it.each([
    [['footer-comments', 'list']],
    [['footer-comments', 'children', '77777']],
    [['footer-comments', 'versions', '77777']],
  ])('%j keeps the narrower storage|atlas_doc_format set', async (args) => {
    await rejected(
      [...args, '--body-format', 'view'],
      '--body-format must be one of: storage, atlas_doc_format, got: view',
    );
  });
});

describe('inline-comments versions --body-format (F062)', () => {
  it('sends body-format with sort and pagination', async () => {
    const req = await sent([
      ...['inline-comments', 'versions', '77777', '--body-format', 'atlas_doc_format'],
      ...['--sort=-modified-date', '--limit', '10', '--cursor', 'c1'],
    ]);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${V2}/inline-comments/77777/versions`);
    expect(queryOf(req)).toEqual({
      'body-format': 'atlas_doc_format',
      sort: '-modified-date',
      limit: '10',
      cursor: 'c1',
    });
  });

  it('rejects an unknown --body-format', async () => {
    await rejected(
      ['inline-comments', 'versions', '77777', '--body-format', 'view'],
      '--body-format must be one of: storage, atlas_doc_format, got: view',
    );
  });
});

describe('likes-users --limit accepts the spec minimum 0 (F067)', () => {
  it.each(['footer-comments', 'inline-comments'])('%s likes-users --limit 0', async (resource) => {
    const req = await sent([resource, 'likes-users', '77777', '--limit', '0', '--cursor', 'c1']);
    expect(req.path).toBe(`${V2}/${resource}/77777/likes/users`);
    expect(queryOf(req)).toEqual({ limit: '0', cursor: 'c1' });
  });

  it.each(['footer-comments', 'inline-comments'])('%s likes-users --limit=-1', async (resource) => {
    await rejected(
      [resource, 'likes-users', '77777', '--limit=-1'],
      '--limit must be a non-negative integer, got: -1',
    );
  });
});

// ─── databases ──────────────────────────────────────────────────────────────

describe('update-property --version-message (F046, F054)', () => {
  it.each(['databases', 'embeds', 'folders', 'whiteboards'])(
    '%s update-property sends version.message when given',
    async (resource) => {
      const req = await sent([
        ...[
          resource,
          'update-property',
          '456',
          '--property-id',
          'prop/1',
          '--key',
          'feature-flags',
        ],
        ...['--value', '{"beta":true}', '--version-number', '5'],
        ...['--version-message', 'Re-enable beta'],
      ]);
      expect(req.method).toBe('PUT');
      expect(req.path).toBe(`${V2}/${resource}/456/properties/prop%2F1`);
      expect(queryOf(req)).toEqual({});
      expect(req.body).toEqual({
        key: 'feature-flags',
        value: { beta: true },
        version: { number: 5, message: 'Re-enable beta' },
      });
    },
  );

  it.each(['databases', 'embeds', 'folders', 'whiteboards'])(
    '%s update-property sends only version.number without it',
    async (resource) => {
      const req = await sent([
        ...[resource, 'update-property', '456', '--property-id', 'prop-1'],
        ...['--key', 'k', '--value', '1', '--version-number', '4'],
      ]);
      expect(req.body).toEqual({ key: 'k', value: 1, version: { number: 4 } });
    },
  );

  it('footer-comments update sends version.message with the storage body', async () => {
    const req = await sent([
      ...['footer-comments', 'update', '77777', '--body', 'Fixed typo', '--version-number', '3'],
      ...['--version-message', 'Typo fix'],
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${V2}/footer-comments/77777`);
    expect(req.body).toEqual({
      version: { number: 3, message: 'Typo fix' },
      body: { representation: 'storage', value: 'Fixed typo' },
    });
  });

  it('still requires --version-number, and checks it before the ID', async () => {
    await rejected(
      ['embeds', 'update-property', '--property-id', 'p', '--key', 'k', '--value', '1'],
      'Missing required option: --version-number',
    );
    await rejected(
      [
        'folders',
        'update-property',
        'f1',
        '--property-id',
        'p',
        '--key',
        'k',
        '--value',
        '1',
      ].concat(['--version-number', '0', '--version-message', 'm']),
      '--version-number must be a positive integer, got: 0',
    );
  });
});

// ─── embeds / folders ───────────────────────────────────────────────────────

describe('embeds / folders descendants --depth is 1-10 like databases (F058)', () => {
  it.each([
    ['embeds', '0'],
    ['embeds', '11'],
    ['folders', '0'],
    ['folders', '11'],
  ])('%s descendants --depth %s is rejected before the request', async (resource, depth) => {
    await rejected(
      [resource, 'descendants', 'x1', '--depth', depth],
      `--depth must be between 1 and 10 (per API spec), got: ${depth}`,
    );
  });

  it.each(['embeds', 'folders'])('%s descendants --depth 10 reaches the wire', async (resource) => {
    const req = await sent([resource, 'descendants', 'x1', '--depth', '10', '--limit', '5']);
    expect(req.path).toBe(`${V2}/${resource}/x1/descendants`);
    expect(queryOf(req)).toEqual({ depth: '10', limit: '5' });
  });
});

describe('--private on folders / embeds create is rejected, not dropped (F057)', () => {
  it.each(['folders', 'embeds'])(
    '%s create --private fails without a request',
    async (resource) => {
      await rejected(
        [resource, 'create', '--space-id', '654321', '--private'],
        `--private is not supported by ${resource} create (only databases and whiteboards create take it)`,
      );
    },
  );

  it.each(['folders', 'embeds'])(
    '%s create --private false is the default and still creates',
    async (resource) => {
      const req = await sent([resource, 'create', '--space-id', '654321', '--private', 'false']);
      expect(req.method).toBe('POST');
      expect(req.path).toBe(`${V2}/${resource}`);
      expect(queryOf(req)).toEqual({});
      expect(req.body).toEqual({ spaceId: '654321' });
    },
  );

  it('whiteboards create --private still sends private=true', async () => {
    const req = await sent(['whiteboards', 'create', '--space-id', '654321', '--private']);
    expect(queryOf(req)).toEqual({ private: 'true' });
  });
});

// ─── whiteboards / space-roles / space-permissions skill text ───────────────

describe('whiteboards create allowlists are in the skill (F047)', () => {
  const section = skillSection('`whiteboards`');

  /** The allowlist the CLI prints for an invalid value of `flag`. */
  async function allowlist(flag: string): Promise<string[]> {
    const run = await runCliWire([C, 'whiteboards', 'create', '--space-id', '1', flag, 'bogus']);
    expect(run.requests).toHaveLength(0);
    const match = /must be one of: (.*), got: bogus/.exec(run.stderr);
    return (match?.[1] ?? '').split(', ');
  }

  it.each([
    ['--template-key', 53],
    ['--locale', 21],
  ])('every %s value the CLI accepts is listed', async (flag, count) => {
    const values = await allowlist(flag);
    expect(values).toHaveLength(count);
    for (const value of values) expect(section).toContain(`\`${value}\``);
  });

  it('does not point at a source file the installed skill does not ship', () => {
    expect(section).not.toContain('src/confluence/types.ts');
  });
});

describe('space-roles list --role-type is an open string (F068)', () => {
  it('sends a tenant-defined role type with the principal pair', async () => {
    const req = await sent([
      ...[
        'space-roles',
        'list',
        '--role-type',
        'TENANT_DEFINED',
        '--principal-type',
        'ACCESS_CLASS',
      ],
      ...['--principal-id', 'all-licensed-users'],
    ]);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${V2}/space-roles`);
    expect(queryOf(req)).toEqual({
      'role-type': 'TENANT_DEFINED',
      'principal-type': 'ACCESS_CLASS',
      'principal-id': 'all-licensed-users',
    });
  });
});

describe('transition-list-combinations documents its body cursor (F066)', () => {
  it('names the response cursor and generatedAt, and fetches page 2 with --cursor', async () => {
    const section = skillSection('`space-permissions`');
    expect(section).toContain('{ results, generatedAt?, cursor? }');
    expect(section).toContain('Confluence administrator');
    const req = await sent([
      ...['space-permissions', 'transition-list-combinations', '--limit', '50'],
      ...['--cursor', 'next-page-cursor'],
    ]);
    expect(queryOf(req)).toEqual({ limit: '50', cursor: 'next-page-cursor' });
  });
});

describe('dash-leading values need the = form, as the skill says (F056)', () => {
  it('--sort=-key and --value=-1 reach the wire', async () => {
    const list = await sent(['databases', 'list-properties', '456', '--sort=-key']);
    expect(queryOf(list)).toEqual({ sort: '-key' });
    const create = await sent(['databases', 'create-property', '456', '--key', 'k', '--value=-1']);
    expect(create.body).toEqual({ key: 'k', value: -1 });
  });

  it('the space form --sort -key is rejected as ambiguous', async () => {
    await rejected(
      ['databases', 'list-properties', '456', '--sort', '-key'],
      "Option '--sort' argument is ambiguous",
    );
  });
});

describe('boolean false never opts into a database/folder flag (F055)', () => {
  it.each([
    ['databases', 'false', null],
    ['databases', 'true', 'true'],
    ['folders', 'false', null],
    ['whiteboards', 'false', null],
  ])('%s set-restriction-state --allow-self-lockout %s', async (resource, value, expected) => {
    const req = await sent([
      ...[resource, 'set-restriction-state', '456', '--state', 'OPEN'],
      ...['--allow-self-lockout', value],
    ]);
    expect(req.query.get('allow-self-lockout')).toBe(expected);
    expect(req.body).toEqual({ state: 'OPEN' });
  });

  it.each([
    [['--private', 'false'], null],
    [['--no-private'], null],
    [['--private'], 'true'],
  ])('databases create %j sends private=%s', async (flags, expected) => {
    const req = await sent(['databases', 'create', '--space-id', '654321', ...flags]);
    expect(req.method).toBe('POST');
    expect(req.query.get('private')).toBe(expected);
    expect(req.body).toEqual({ spaceId: '654321' });
  });

  it('databases get --include-properties false sends nothing, true sends true', async () => {
    const off = await sent(['databases', 'get', '456', '--include-properties', 'false']);
    expect(queryOf(off)).toEqual({});
    const on = await sent(['databases', 'get', '456', '--include-properties']);
    expect(queryOf(on)).toEqual({ 'include-properties': 'true' });
  });
});

// ─── CLI → HTTP coverage (F052, F059, F065) ─────────────────────────────────

interface Row {
  readonly argv: readonly string[];
  readonly method: string;
  readonly path: string;
  readonly query?: Record<string, string | string[]>;
  readonly body?: unknown;
  readonly ifNoneMatch?: string;
}

const PERMISSIONS_BODY = {
  permissions: [
    { operation: 'read', principals: [{ principalType: 'user', principalId: 'acc-1' }] },
  ],
};

function restrictionRows(resource: string, id: string): Row[] {
  const p = `${V2}/${resource}/${id}`;
  const body = JSON.stringify(PERMISSIONS_BODY);
  return [
    {
      argv: [resource, 'get-restriction-state', id],
      method: 'GET',
      path: `${p}/restriction-state`,
    },
    {
      argv: [
        resource,
        'set-restriction-state',
        id,
        '--state',
        'VIEW_RESTRICTED',
        '--allow-self-lockout',
      ],
      method: 'PUT',
      path: `${p}/restriction-state`,
      query: { 'allow-self-lockout': 'true' },
      body: { state: 'VIEW_RESTRICTED' },
    },
    {
      argv: [
        ...[resource, 'list-permissions', id, '--operation', 'update', '--principal-type', 'user'],
        ...['--principal-id', 'acc-1', '--limit', '5', '--cursor', 'c1'],
      ],
      method: 'GET',
      path: `${p}/permissions`,
      query: {
        operation: 'update',
        'principal-type': 'user',
        'principal-id': 'acc-1',
        limit: '5',
        cursor: 'c1',
      },
    },
    {
      argv: [resource, 'add-permissions', id, '--body', body],
      method: 'POST',
      path: `${p}/permissions`,
      body: PERMISSIONS_BODY,
    },
    {
      argv: [resource, 'set-permissions', id, '--body', body, '--allow-self-lockout'],
      method: 'PUT',
      path: `${p}/permissions`,
      query: { 'allow-self-lockout': 'true' },
      body: PERMISSIONS_BODY,
    },
    {
      argv: [
        ...[resource, 'delete-permissions', id, '--operation', 'read', '--principal-type', 'user'],
        ...['--principal-id', 'acc-1'],
      ],
      method: 'DELETE',
      path: `${p}/permissions`,
      query: { operation: 'read', 'principal-type': 'user', 'principal-id': 'acc-1' },
    },
  ];
}

const REMOVE_ACCESS = {
  permissionCombinationIds: ['combo-abc'],
  spaceSelection: { spaceType: 'ALL' },
};
const ASSIGN_ROLES = {
  assignments: [
    {
      permissionCombinationId: 'combo-abc',
      principalTypeAssignments: [{ principalType: 'USER', removeAccess: false, roleId: 'r-1' }],
    },
  ],
  spaceSelection: { spaceType: 'ALL' },
};

const ROWS: readonly Row[] = [
  // F059: databases data endpoints (experimental) + restriction/permissions
  {
    argv: [
      'databases',
      'fields',
      '456',
      '--limit',
      '50',
      '--cursor',
      'c1',
      '--if-none-match',
      '"e1"',
    ],
    method: 'GET',
    path: `${V2}/databases/456/fields`,
    query: { limit: '50', cursor: 'c1' },
    ifNoneMatch: '"e1"',
  },
  {
    argv: ['databases', 'views', '456', '--limit', '10', '--cursor', 'c2', '--if-none-match', 'e2'],
    method: 'GET',
    path: `${V2}/databases/456/views`,
    query: { limit: '10', cursor: 'c2' },
    ifNoneMatch: 'e2',
  },
  {
    argv: [
      ...['databases', 'entries', '456', '--sort=-fld1', '--limit', '5', '--cursor', 'c3'],
      ...['--filter', '{"fld1":"eq:Done","fld2":{"gte":"2026-01-01"}}'],
    ],
    method: 'GET',
    path: `${V2}/databases/456/entries`,
    query: {
      limit: '5',
      cursor: 'c3',
      sort: '-fld1',
      'filter[fld1]': 'eq:Done',
      'filter[fld2][gte]': '2026-01-01',
    },
  },
  {
    argv: ['databases', 'get-entry', '456', '--entry-id', 'e/1', '--if-none-match', 'e4'],
    method: 'GET',
    path: `${V2}/databases/456/entries/e%2F1`,
    ifNoneMatch: 'e4',
  },
  ...restrictionRows('databases', '456'),
  ...restrictionRows('folders', '789'),
  // F052: whiteboards restriction/permissions, app properties, pages versions
  ...restrictionRows('whiteboards', '321'),
  {
    argv: ['app', 'list-properties', '--limit', '25', '--cursor', 'c1'],
    method: 'GET',
    path: `${V2}/app/properties`,
    query: { limit: '25', cursor: 'c1' },
  },
  {
    argv: ['app', 'get-property', 'my/flags'],
    method: 'GET',
    path: `${V2}/app/properties/my%2Fflags`,
  },
  {
    argv: ['app', 'upsert-property', 'my-flags', '--value', '{"beta":true}'],
    method: 'PUT',
    path: `${V2}/app/properties/my-flags`,
    body: { beta: true },
  },
  {
    argv: ['app', 'delete-property', 'my-flags'],
    method: 'DELETE',
    path: `${V2}/app/properties/my-flags`,
  },
  {
    argv: [
      ...['pages', 'versions', '12345', '--body-format', 'storage', '--sort=-modified-date'],
      ...['--limit', '25', '--cursor', 'c1'],
    ],
    method: 'GET',
    path: `${V2}/pages/12345/versions`,
    query: { 'body-format': 'storage', sort: '-modified-date', limit: '25', cursor: 'c1' },
  },
  {
    argv: ['pages', 'version', '12345', '--version-number', '3'],
    method: 'GET',
    path: `${V2}/pages/12345/versions/3`,
  },
  // F065: inline-comments, space-permissions transition-*, space-roles update
  {
    argv: [
      ...['inline-comments', 'list', '--body-format', 'storage', '--sort=-created-date'],
      ...['--limit', '25', '--cursor', 'c1'],
    ],
    method: 'GET',
    path: `${V2}/inline-comments`,
    query: { 'body-format': 'storage', sort: '-created-date', limit: '25', cursor: 'c1' },
  },
  {
    argv: [
      ...['inline-comments', 'children', '77777', '--body-format', 'atlas_doc_format'],
      ...['--sort', 'created-date', '--limit', '5', '--cursor', 'c2'],
    ],
    method: 'GET',
    path: `${V2}/inline-comments/77777/children`,
    query: { 'body-format': 'atlas_doc_format', sort: 'created-date', limit: '5', cursor: 'c2' },
  },
  {
    argv: ['inline-comments', 'likes-count', '77777'],
    method: 'GET',
    path: `${V2}/inline-comments/77777/likes/count`,
  },
  {
    argv: ['inline-comments', 'likes-users', '77777', '--limit', '50', '--cursor', 'c3'],
    method: 'GET',
    path: `${V2}/inline-comments/77777/likes/users`,
    query: { limit: '50', cursor: 'c3' },
  },
  {
    argv: ['inline-comments', 'operations', '77777'],
    method: 'GET',
    path: `${V2}/inline-comments/77777/operations`,
  },
  {
    argv: ['inline-comments', 'version', '77777', '--version-number', '3'],
    method: 'GET',
    path: `${V2}/inline-comments/77777/versions/3`,
  },
  {
    argv: [
      'space-permissions',
      'transition-remove-access',
      '--body',
      JSON.stringify(REMOVE_ACCESS),
    ],
    method: 'POST',
    path: `${V2}/space-permissions/transition/access-removals`,
    body: REMOVE_ACCESS,
  },
  {
    argv: ['space-permissions', 'transition-list-combinations', '--limit', '50', '--cursor', 'c1'],
    method: 'GET',
    path: `${V2}/space-permissions/transition/combinations`,
    query: { limit: '50', cursor: 'c1' },
  },
  {
    argv: ['space-permissions', 'transition-generate-combinations'],
    method: 'POST',
    path: `${V2}/space-permissions/transition/combinations`,
  },
  {
    argv: ['space-permissions', 'transition-assign-roles', '--body', JSON.stringify(ASSIGN_ROLES)],
    method: 'POST',
    path: `${V2}/space-permissions/transition/role-assignments`,
    body: ASSIGN_ROLES,
  },
  {
    argv: ['space-permissions', 'transition-task-status', 'task/1'],
    method: 'GET',
    path: `${V2}/space-permissions/transition/tasks/task%2F1`,
  },
  {
    argv: [
      ...['space-roles', 'update', 'role-1', '--name', 'Editor v2', '--description', 'Updated'],
      ...['--space-permissions', 'read/space,write/space'],
      ...['--anonymous-reassignment-role-id', 'r-a', '--guest-reassignment-role-id', 'r-g'],
    ],
    method: 'PUT',
    path: `${V2}/space-roles/role-1`,
    body: {
      name: 'Editor v2',
      description: 'Updated',
      spacePermissions: ['read/space', 'write/space'],
      anonymousReassignmentRoleId: 'r-a',
      guestReassignmentRoleId: 'r-g',
    },
  },
];

describe('CLI → HTTP wire rows (F052, F059, F065)', () => {
  it.each(ROWS.map((row) => [row.argv.join(' '), row] as const))(
    'atlas confluence %s',
    async (_, row) => {
      const req = await sent(row.argv);
      expect(req.method).toBe(row.method);
      expect(req.path).toBe(row.path);
      expect(queryOf(req)).toEqual(row.query ?? {});
      expect(req.body).toEqual(row.body);
      expect(req.headers['if-none-match']).toBe(row.ifNoneMatch);
    },
  );

  it.each([
    ['transition-remove-access', '[]', 'BulkRemoveAccessRequest'],
    ['transition-assign-roles', '"x"', 'BulkAssignRolesRequest'],
  ])('space-permissions %s rejects a non-object --body %s', async (action, body, type) => {
    await rejected(
      ['space-permissions', action, '--body', body],
      `--body must be a JSON object (${type})`,
    );
  });
});
