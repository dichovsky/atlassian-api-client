/**
 * CLI → wire regressions for release 4.1.0 unit parity-conf (Confluence
 * `pages`, `blog-posts`, `space-roles`, `attachments`): M1-8, M3-2, M3-5,
 * M5-1, M6-4. Every command is built from `skill/reference/confluence.md`:
 * either it is an example line that must appear verbatim in the resource's
 * section, or the flags it uses are taken from a section sentence the test
 * also asserts. Each run goes through {@link runCliWire} (real argv → router →
 * client → fake fetch), so nothing reaches the network.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runCliWire, type WireRequest } from '../helpers/cli-wire.js';

const V2 = '/wiki/api/v2';

const SKILL = readFileSync(new URL('../../skill/reference/confluence.md', import.meta.url), 'utf8');

/** The `## \`<resource>\`` section of the Confluence skill reference. */
function section(resource: string): string {
  const heading = `\n## \`${resource}\`\n`;
  const start = SKILL.indexOf(heading);
  expect(start, `skill section for ${resource}`).toBeGreaterThanOrEqual(0);
  const end = SKILL.indexOf('\n## ', start + heading.length);
  return SKILL.slice(start, end === -1 ? undefined : end);
}

/** Shell-split one example line (single/double quotes, no escapes). */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: string | undefined;
  let started = false;
  for (const ch of line) {
    if (quote !== undefined) {
      if (ch === quote) quote = undefined;
      else current += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      started = true;
    } else if (ch === ' ') {
      if (started) tokens.push(current);
      current = '';
      started = false;
    } else {
      current += ch;
      started = true;
    }
  }
  if (started) tokens.push(current);
  return tokens;
}

/** Argv (after `atlas`) of an example that must appear verbatim in the resource's skill section. */
function example(resource: string, line: string): string[] {
  const lines = section(resource)
    .split('\n')
    .map((l) => l.trim());
  expect(lines, `example missing from the ${resource} skill section`).toContain(line);
  return tokenize(line).slice(1);
}

async function sent(argv: readonly string[]): Promise<WireRequest> {
  const run = await runCliWire(argv);
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return run.requests[0] as WireRequest;
}

async function rejected(argv: readonly string[], message: string): Promise<void> {
  const run = await runCliWire(argv);
  expect(run.exitCode).toBe(1);
  expect(run.requests).toHaveLength(0);
  expect(run.stderr).toContain(message);
}

function queryOf(req: WireRequest): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of new Set(req.query.keys())) out[key] = req.query.getAll(key);
  return out;
}

// ─── M3-2 / M5-1: likes-users --limit 0 ─────────────────────────────────────

describe('M3-2/M5-1: pages and blog-posts likes-users --limit accept the spec minimum 0', () => {
  const NOTE =
    '`likes-users --limit` takes a non-negative integer; 0 is the spec minimum, and the 250 maximum (server default 25) is enforced by the server, not the CLI.';

  it.each([
    ['pages', '12345', 'pages'],
    ['blog-posts', '99999', 'blogposts'],
  ])('%s likes-users --limit 0 --cursor c1', async (resource, id, segment) => {
    expect(section(resource)).toContain(NOTE);
    const req = await sent([
      'confluence',
      resource,
      'likes-users',
      id,
      '--limit',
      '0',
      '--cursor',
      'c1',
    ]);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${V2}/${segment}/${id}/likes/users`);
    expect(queryOf(req)).toEqual({ limit: ['0'], cursor: ['c1'] });
  });

  it.each([
    ['pages', '12345', 'pages'],
    ['blog-posts', '99999', 'blogposts'],
  ])('%s likes-users without --limit sends no limit', async (resource, id, segment) => {
    const req = await sent(['confluence', resource, 'likes-users', id]);
    expect(req.path).toBe(`${V2}/${segment}/${id}/likes/users`);
    expect(queryOf(req)).toEqual({});
  });

  it.each([
    ['pages', '--limit=-1', '-1'],
    ['pages', '--limit=1.5', '1.5'],
    ['blog-posts', '--limit=-1', '-1'],
    ['blog-posts', '--limit=', ''],
  ])('%s likes-users %s is rejected before any request', async (resource, flag, value) => {
    await rejected(
      ['confluence', resource, 'likes-users', '1', flag],
      `--limit must be a non-negative integer, got: ${value}`,
    );
  });
});

// ─── M1-8: space-roles --space-id, blog-posts versions paging ───────────────

describe('M1-8: space-roles list --space-id and blog-posts versions flags reach the wire', () => {
  it('space-roles list --space-id sends the kebab-case space-id with limit and cursor', async () => {
    expect(section('space-roles')).toContain(
      '`--space-id` restricts the listing to the roles available in that space',
    );
    const req = await sent(
      example(
        'space-roles',
        'atlas confluence space-roles list --space-id 654321 --limit 50 --cursor "<value-from-response>"',
      ),
    );
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${V2}/space-roles`);
    expect(queryOf(req)).toEqual({
      'space-id': ['654321'],
      limit: ['50'],
      cursor: ['<value-from-response>'],
    });
  });

  it('blog-posts versions sends body-format, sort, cursor and limit', async () => {
    expect(section('blog-posts')).toContain(
      '`versions --body-format` accepts `storage` or `atlas_doc_format`',
    );
    const req = await sent(
      example(
        'blog-posts',
        'atlas confluence blog-posts versions 99999 --body-format storage --sort=modified-date --limit 10 --cursor "<value-from-response>"',
      ),
    );
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${V2}/blogposts/99999/versions`);
    expect(queryOf(req)).toEqual({
      'body-format': ['storage'],
      sort: ['modified-date'],
      cursor: ['<value-from-response>'],
      limit: ['10'],
    });
  });

  it.each([
    [
      ['--body-format', 'view'],
      '--body-format must be one of: storage, atlas_doc_format, got: view',
    ],
    [
      ['--sort=-created-date'],
      '--sort must be one of: modified-date, -modified-date, got: -created-date',
    ],
    [['--limit', '0'], '--limit must be a positive integer, got: 0'],
  ])('blog-posts versions %j is rejected before any request', async (flags, message) => {
    await rejected(['confluence', 'blog-posts', 'versions', '99999', ...flags], message);
  });
});

// ─── M3-5: pages create / get optional flags ────────────────────────────────

describe('M3-5: pages create and get optional flags reach the wire', () => {
  it('create a draft with --parent-id, --subtype, a nested --body-json, --embedded and --private', async () => {
    const req = await sent(
      example(
        'pages',
        `atlas confluence pages create --space-id 654321 --status draft --parent-id 67890 --subtype live --body-json '{"storage":{"representation":"storage","value":"<p>Draft</p>"}}' --embedded --private`,
      ),
    );
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${V2}/pages`);
    expect(queryOf(req)).toEqual({ embedded: ['true'], private: ['true'] });
    expect(req.body).toEqual({
      spaceId: '654321',
      parentId: '67890',
      subtype: 'live',
      status: 'draft',
      body: { storage: { representation: 'storage', value: '<p>Draft</p>' } },
    });
  });

  it('create --root-level sends root-level=true and a flat storage body', async () => {
    const req = await sent(
      example(
        'pages',
        'atlas confluence pages create --space-id 654321 --title "Top level" --body "<p>Hi</p>" --root-level',
      ),
    );
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${V2}/pages`);
    expect(queryOf(req)).toEqual({ 'root-level': ['true'] });
    expect(req.body).toEqual({
      spaceId: '654321',
      title: 'Top level',
      body: { representation: 'storage', value: '<p>Hi</p>' },
    });
  });

  it('create with --embedded/--private/--root-level false sends none of them (the server default)', async () => {
    expect(section('pages')).toContain(
      '`--embedded false`, `--private false` and `--root-level false` are the same as omitting the flag',
    );
    const req = await sent([
      'confluence',
      'pages',
      'create',
      '--space-id',
      '654321',
      '--title',
      'T',
      '--parent-id',
      '67890',
      '--embedded',
      'false',
      '--private',
      'false',
      '--root-level',
      'false',
    ]);
    expect(queryOf(req)).toEqual({});
    expect(req.body).toEqual({ spaceId: '654321', parentId: '67890', title: 'T' });
  });

  it.each([
    [['--title', 'T'], 'Missing required option: --space-id'],
    [['--space-id', '654321'], 'Missing required option: --title'],
    [
      ['--space-id', '1', '--title', 'T', '--root-level', '--parent-id', '2'],
      '--root-level cannot be used with --parent-id',
    ],
    [
      ['--space-id', '1', '--title', 'T', '--subtype', 'page'],
      '--subtype must be one of: live, got: page',
    ],
    [
      ['--space-id', '1', '--title', 'T', '--body-json', '{"storage":', '--body', 'x'],
      '--body-json',
    ],
  ])('create %j is rejected before any request', async (flags, message) => {
    await rejected(['confluence', 'pages', 'create', ...flags], message);
  });

  it('get sends body-format, repeated status, version and include-version=false', async () => {
    const req = await sent(
      example(
        'pages',
        'atlas confluence pages get 12345 --body-format atlas_doc_format --status current,historical --historical-version 3 --no-include-version',
      ),
    );
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${V2}/pages/12345`);
    expect(queryOf(req)).toEqual({
      'body-format': ['atlas_doc_format'],
      status: ['current', 'historical'],
      version: ['3'],
      'include-version': ['false'],
    });
  });

  it('get --get-draft sends get-draft=true', async () => {
    expect(section('pages')).toContain('`--get-draft` retrieves the draft revision');
    const req = await sent(
      example('pages', 'atlas confluence pages get 12345 --get-draft --body-format storage'),
    );
    expect(queryOf(req)).toEqual({ 'get-draft': ['true'], 'body-format': ['storage'] });
  });

  it('get sends every documented --include-* flag as =true', async () => {
    const req = await sent(
      example(
        'pages',
        'atlas confluence pages get 12345 --include-labels --include-properties --include-operations --include-likes --include-versions --include-collaborators --include-direct-children --include-favorited-by-current-user-status --include-webresources',
      ),
    );
    expect(queryOf(req)).toEqual({
      'include-labels': ['true'],
      'include-properties': ['true'],
      'include-operations': ['true'],
      'include-likes': ['true'],
      'include-versions': ['true'],
      'include-collaborators': ['true'],
      'include-direct-children': ['true'],
      'include-favorited-by-current-user-status': ['true'],
      'include-webresources': ['true'],
    });
  });

  it('get: --include-version false sends include-version=false; --include-labels false sends nothing', async () => {
    const req = await sent([
      'confluence',
      'pages',
      'get',
      '12345',
      '--include-version',
      'false',
      '--include-labels',
      'false',
    ]);
    expect(queryOf(req)).toEqual({ 'include-version': ['false'] });
    const plain = await sent(['confluence', 'pages', 'get', '12345']);
    expect(plain.url).toBe(`https://test.atlassian.net${V2}/pages/12345`);
  });

  it.each([
    [['--body-format', 'html'], '--body-format must be one of'],
    [['--status', 'current,bogus'], '--status must be one of'],
    [['--historical-version', '0'], '--historical-version must be a positive integer, got: 0'],
    [
      ['--include-version', '--no-include-version'],
      '--include-version was given both true and false',
    ],
  ])('get %j is rejected before any request', async (flags, message) => {
    await rejected(['confluence', 'pages', 'get', '12345', ...flags], message);
  });
});

// ─── M6-4: attachments list filters, property CRUD, delete --purge, get --include-* ──

describe('M6-4: attachments flags reach the wire', () => {
  it('list sends repeated status, sort and the camelCase mediaType/filename filters', async () => {
    const run = await runCliWire(
      example(
        'attachments',
        'atlas confluence attachments list --page-id 12345 --status current,archived --sort=-created-date',
      ),
    );
    expect(run.exitCode).toBe(0);
    const [req] = run.requests as WireRequest[];
    expect(req?.method).toBe('GET');
    expect(req?.path).toBe(`${V2}/pages/12345/attachments`);
    expect(queryOf(req as WireRequest)).toEqual({
      status: ['current', 'archived'],
      sort: ['-created-date'],
    });
  });

  it('list sends mediaType, filename, limit and cursor', async () => {
    const req = await sent(
      example(
        'attachments',
        'atlas confluence attachments list --page-id 12345 --media-type image/png --filename diagram.png --limit 5 --cursor "<value-from-response>"',
      ),
    );
    expect(req.path).toBe(`${V2}/pages/12345/attachments`);
    expect(queryOf(req)).toEqual({
      mediaType: ['image/png'],
      filename: ['diagram.png'],
      limit: ['5'],
      cursor: ['<value-from-response>'],
    });
  });

  it.each([
    [['--status', 'current'], 'Missing required option: --page-id'],
    [
      ['--page-id', '1', '--status', 'deleted'],
      '--status must be one of: current, archived, trashed, got: deleted',
    ],
    [['--page-id', '1', '--sort', 'title'], '--sort must be one of'],
    [['--page-id', '1', '--limit', '0'], '--limit must be a positive integer, got: 0'],
  ])('list %j is rejected before any request', async (flags, message) => {
    await rejected(['confluence', 'attachments', 'list', ...flags], message);
  });

  it('create-property POSTs the key and the JSON-parsed value', async () => {
    const req = await sent(
      example(
        'attachments',
        `atlas confluence attachments create-property att-1 --key reviewed --value '{"ok":true}'`,
      ),
    );
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${V2}/attachments/att-1/properties`);
    expect(req.body).toEqual({ key: 'reviewed', value: { ok: true } });
  });

  it('create-property keeps a non-JSON --value as a string', async () => {
    const req = await sent([
      'confluence',
      'attachments',
      'create-property',
      'att-1',
      '--key',
      'note',
      '--value',
      'plain text',
    ]);
    expect(req.body).toEqual({ key: 'note', value: 'plain text' });
  });

  it('get-property and delete-property address the property by id', async () => {
    const get = await sent(
      example(
        'attachments',
        'atlas confluence attachments get-property att-1 --property-id prop-1',
      ),
    );
    expect(get.method).toBe('GET');
    expect(get.path).toBe(`${V2}/attachments/att-1/properties/prop-1`);

    const run = await runCliWire(
      example(
        'attachments',
        'atlas confluence attachments delete-property att-1 --property-id prop-1',
      ),
      { respond: { status: 204, body: null } },
    );
    expect(run.exitCode).toBe(0);
    expect(run.requests).toHaveLength(1);
    expect(run.requests[0]?.method).toBe('DELETE');
    expect(run.requests[0]?.path).toBe(`${V2}/attachments/att-1/properties/prop-1`);
    expect(JSON.parse(run.stdout)).toEqual({ deleted: true });
  });

  it('property ids are path-encoded', async () => {
    const req = await sent([
      'confluence',
      'attachments',
      'get-property',
      'att/1',
      '--property-id',
      'p?1',
    ]);
    expect(req.path).toBe(`${V2}/attachments/att%2F1/properties/p%3F1`);
  });

  it.each([
    [['create-property', 'att-1', '--value', '1'], 'Missing required option: --key'],
    [['create-property', 'att-1', '--key', 'k'], 'Missing required option: --value'],
    [['get-property', 'att-1'], 'Missing required option: --property-id'],
    [['delete-property', 'att-1'], 'Missing required option: --property-id'],
    [['delete-property', '--property-id', 'p'], 'Missing required argument: attachment ID'],
  ])('%j is rejected before any request', async (argv, message) => {
    await rejected(['confluence', 'attachments', ...argv], message);
  });

  it('delete --purge sends purge=true; without it or with --purge false no purge param', async () => {
    const respond = { status: 204, body: null } as const;
    const purge = await runCliWire(
      example('attachments', 'atlas confluence attachments delete att-1 --purge'),
      { respond },
    );
    expect(purge.exitCode).toBe(0);
    expect(purge.requests[0]?.method).toBe('DELETE');
    expect(purge.requests[0]?.path).toBe(`${V2}/attachments/att-1`);
    expect(queryOf(purge.requests[0] as WireRequest)).toEqual({ purge: ['true'] });
    expect(JSON.parse(purge.stdout)).toEqual({ deleted: true });

    for (const extra of [[], ['--purge', 'false']]) {
      const run = await runCliWire(['confluence', 'attachments', 'delete', 'att-1', ...extra], {
        respond,
      });
      expect(run.exitCode).toBe(0);
      expect(run.requests[0]?.url).toBe(`https://test.atlassian.net${V2}/attachments/att-1`);
    }
  });

  it('get sends --version-number as version plus the --include-* flags', async () => {
    const req = await sent(
      example(
        'attachments',
        'atlas confluence attachments get att-1 --version-number 2 --include-properties --include-operations --include-versions --include-collaborators',
      ),
    );
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${V2}/attachments/att-1`);
    expect(queryOf(req)).toEqual({
      version: ['2'],
      'include-properties': ['true'],
      'include-operations': ['true'],
      'include-versions': ['true'],
      'include-collaborators': ['true'],
    });
  });

  it('get --include-labels --no-include-version sends include-version=false', async () => {
    const req = await sent(
      example(
        'attachments',
        'atlas confluence attachments get att-1 --include-labels --no-include-version',
      ),
    );
    expect(queryOf(req)).toEqual({ 'include-labels': ['true'], 'include-version': ['false'] });
  });

  it('get --include-collaborators false sends nothing for that flag', async () => {
    const req = await sent([
      'confluence',
      'attachments',
      'get',
      'att-1',
      '--include-collaborators',
      'false',
    ]);
    expect(queryOf(req)).toEqual({});
  });
});
