/**
 * Release 4.1.0, unit parity-jira-core: CLI → wire proofs for the Jira core
 * resources (issues, changelog, issue-attachments, issuelinktype, priorities,
 * issuetype, resolutions, expression, projects, roles, version,
 * project-template, search, jql). Every command is read from the skill
 * reference (`skill/reference/jira/*.md`), the text an agent builds commands
 * from, and run through real argv → router → client → transport with
 * {@link runCliWire}; nothing reaches the network.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { getHelpText } from '../../src/cli/help.js';
import {
  runCliWire,
  type CliWireResult,
  type WireRequest,
  type WireResponse,
} from '../helpers/cli-wire.js';

const API = '/rest/api/3';
const SKILL_DIR = resolve(import.meta.dirname, '..', '..', 'skill', 'reference', 'jira');
const ISSUES = 'issues.md';
const META = 'metadata.md';
const PROJ = 'projects.md';
const SEARCH = 'search.md';

/** Naive shell tokenizer that respects single and double quotes. */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: string | undefined;
  for (const ch of line) {
    if ((ch === "'" || ch === '"') && (quote === undefined || quote === ch)) {
      quote = quote === undefined ? ch : undefined;
      continue;
    }
    if (ch === ' ' && quote === undefined) {
      if (current.length > 0) tokens.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

/** `atlas …` lines of a skill file's shell blocks, `\` continuations joined. */
function skillCommands(file: string): string[] {
  const markdown = readFileSync(join(SKILL_DIR, file), 'utf8');
  const commands: string[] = [];
  for (const block of markdown.matchAll(/```(?:sh|bash)\n([\s\S]*?)```/g)) {
    const joined = (block[1] as string).replace(/\\\n\s*/g, '');
    for (const line of joined.split('\n')) {
      if (line.trim().startsWith('atlas ')) commands.push(line.trim());
    }
  }
  return commands;
}

/**
 * argv (without `atlas`) of the one skill example that starts with
 * `atlas <prefix>` and contains `marker`; with no marker the example must be
 * exactly `atlas <prefix>`.
 */
function example(file: string, prefix: string, marker?: string): string[] {
  const head = `atlas ${prefix}`;
  const found = skillCommands(file).filter((c) =>
    marker === undefined ? c === head : c.startsWith(head) && c.includes(marker),
  );
  expect(found, `${file}: one example "${prefix}" / "${marker ?? ''}"`).toHaveLength(1);
  return tokenize(found[0] as string).slice(1);
}

/** The value after `flag` replaced (`flag` must appear once). */
function withFlag(argv: readonly string[], flag: string, value: string): string[] {
  const at = argv.indexOf(flag);
  expect(at, `${flag} in ${argv.join(' ')}`).toBeGreaterThan(-1);
  return argv.map((arg, i) => (i === at + 1 ? value : arg));
}

/** A skill section from its heading to the next `##` / `###` heading. */
function section(file: string, heading: string): string {
  const text = readFileSync(join(SKILL_DIR, file), 'utf8');
  const start = text.indexOf(`\n${heading}`);
  expect(start, `${file} ${heading}`).toBeGreaterThanOrEqual(0);
  const rest = text.slice(start + heading.length + 1);
  const next = rest.search(/\n#{2,3} /);
  return next === -1 ? rest : rest.slice(0, next);
}

type Query = Record<string, string | string[]>;

/** Query string as name → value, or every value of a repeated param. */
function queryOf(req: WireRequest): Query {
  const out: Query = {};
  for (const key of new Set(req.query.keys())) {
    const all = req.query.getAll(key);
    out[key] = all.length === 1 ? (all[0] as string) : all;
  }
  return out;
}

async function onlyRequest(
  args: readonly string[],
  respond?: WireResponse | ((request: WireRequest) => WireResponse),
): Promise<{ req: WireRequest; stdout: string }> {
  const run = await runCliWire(args, respond === undefined ? {} : { respond });
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return { req: run.requests[0] as WireRequest, stdout: run.stdout };
}

async function rejected(args: readonly string[], message: string | RegExp): Promise<CliWireResult> {
  const run = await runCliWire(args);
  expect(run.exitCode).toBe(1);
  expect(run.requests).toHaveLength(0);
  expect(run.stderr).toMatch(message);
  return run;
}

/**
 * One skill example and the exact request it must send: skill file, command
 * prefix, marker (`undefined` = the example is exactly the prefix),
 * placeholder replacements, method, path, query, JSON body (omit for none).
 */
interface Row {
  readonly file: string;
  readonly prefix: string;
  readonly marker?: string;
  readonly replace?: Readonly<Record<string, string>>;
  readonly method: string;
  readonly path: string;
  readonly query?: Query;
  readonly body?: unknown;
}

async function expectRow(row: Row): Promise<void> {
  const argv = example(row.file, row.prefix, row.marker).map((arg) => row.replace?.[arg] ?? arg);
  const { req } = await onlyRequest(argv);
  expect(req.method).toBe(row.method);
  expect(req.path).toBe(row.path);
  expect(queryOf(req)).toEqual(row.query ?? {});
  expect(req.body).toEqual(row.body);
}

const labelled = (rows: readonly Row[]): (readonly [string, Row])[] =>
  rows.map((row) => [`${row.prefix} ${row.marker ?? ''}`.trim(), row] as const);

// ── M3-1 (HIGH): issue-attachments downloads can be saved with --output ─────

describe('issue-attachments download-content / download-thumbnail --output (M3-1)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-attachment-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('download-content --output writes the attachment bytes and never overwrites', async () => {
    const out = join(dir, 'report.pdf');
    const argv = withFlag(
      example(ISSUES, 'jira issue-attachments download-content', '--output'),
      '--output',
      out,
    );
    const run = await runCliWire(argv, { respond: { body: 'PDF-BYTES' } });
    expect(run.stderr).toBe('');
    expect(run.exitCode).toBe(0);
    expect(run.requests).toHaveLength(1);
    const req = run.requests[0] as WireRequest;
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${API}/attachment/content/10001`);
    expect(queryOf(req)).toEqual({});
    expect(readFileSync(out, 'utf8')).toBe('PDF-BYTES');
    expect(JSON.parse(run.stdout)).toEqual({ bytes: 9, path: out });

    const again = await runCliWire(argv, { respond: { body: 'OTHER' } });
    expect(again.exitCode).toBe(1);
    expect(again.stderr).toContain('already exists');
    expect(again.requests).toHaveLength(0);
    expect(readFileSync(out, 'utf8')).toBe('PDF-BYTES');
  });

  it('download-thumbnail --output writes the thumbnail and sends every documented flag (M3-6)', async () => {
    const out = join(dir, 'thumb.png');
    const argv = withFlag(
      example(ISSUES, 'jira issue-attachments download-thumbnail', '--output'),
      '--output',
      out,
    );
    const run = await runCliWire(argv, { respond: { body: 'PNG' } });
    expect(run.exitCode).toBe(0);
    expect(run.requests).toHaveLength(1);
    const req = run.requests[0] as WireRequest;
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${API}/attachment/thumbnail/10001`);
    expect(queryOf(req)).toEqual({
      width: '200',
      height: '200',
      fallbackToDefault: 'true',
      redirect: 'false',
    });
    expect(readFileSync(out, 'utf8')).toBe('PNG');
    expect(JSON.parse(run.stdout)).toEqual({ bytes: 3, path: out });

    const again = await runCliWire(argv, { respond: { body: 'OTHER' } });
    expect(again.exitCode).toBe(1);
    expect(again.stderr).toContain('already exists');
    expect(again.requests).toHaveLength(0);
  });

  it.each(['download-content', 'download-thumbnail'])(
    '%s --output into a missing directory is refused before the download',
    async (action) => {
      const out = join(dir, 'no-such-dir', 'file.bin');
      const run = await runCliWire(['jira', 'issue-attachments', action, '10001', '--output', out]);
      expect(run.exitCode).toBe(1);
      expect(run.stderr).toContain('its directory does not exist');
      expect(run.requests).toHaveLength(0);
      expect(existsSync(out)).toBe(false);
    },
  );

  it.each(['download-content', 'download-thumbnail'])(
    '%s with a blank --output is refused before the download',
    async (action) => {
      await rejected(
        ['jira', 'issue-attachments', action, '10001', '--output', ' '],
        /Missing value for --output/,
      );
    },
  );

  it('without --output the documented examples still print only the byte count', async () => {
    const plain = await onlyRequest(
      example(ISSUES, 'jira issue-attachments download-content 10001'),
      {
        body: 'PDF-BYTES',
      },
    );
    expect(JSON.parse(plain.stdout)).toEqual({ bytes: 9 });
    const inline = await onlyRequest(
      example(ISSUES, 'jira issue-attachments download-content', '--redirect false'),
      { body: 'AB' },
    );
    expect(queryOf(inline.req)).toEqual({ redirect: 'false' });
    expect(JSON.parse(inline.stdout)).toEqual({ bytes: 2 });
  });

  it('--output stays refused on the other issue-attachments actions', async () => {
    const out = join(dir, 'meta.json');
    await rejected(
      ['jira', 'issue-attachments', 'get', '10001', '--output', out],
      /--output is supported only by .*issue-attachments download-content and download-thumbnail/,
    );
    expect(existsSync(out)).toBe(false);
  });

  it('the skill documents --output on both actions', () => {
    const text = section(ISSUES, '## `issue-attachments`');
    for (const action of ['download-content', 'download-thumbnail']) {
      const row = text.split('\n').find((l) => l.startsWith(`| \`${action}\``));
      expect(row, action).toContain('`--output`');
    }
    expect(text).toMatch(/`--output` never overwrites/);
    expect(text).not.toContain('use the SDK');
  });

  it('atlas --help shows --output on both actions', () => {
    const help = getHelpText('jira');
    for (const action of ['download-content', 'download-thumbnail']) {
      expect(help).toMatch(new RegExp(`issue-attachments ${action} 10001 .*--output `));
    }
  });
});

describe('issue-attachments upload --filename / --media-type (M3-6)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-upload-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('names and types the multipart part from the documented flags', async () => {
    const file = join(dir, 'screenshot.png');
    writeFileSync(file, 'PNGDATA');
    const argv = withFlag(
      example(ISSUES, 'jira issue-attachments upload', '--filename'),
      '--file',
      file,
    );
    const { req } = await onlyRequest(argv, { body: [] });
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${API}/issue/PROJ-1/attachments`);
    expect(req.headers['x-atlassian-token']).toBe('no-check');
    const part = (req.body as FormData).get('file') as File;
    expect(part.name).toBe('login-error.png');
    expect(part.type).toBe('image/png');
    expect(await part.text()).toBe('PNGDATA');
  });

  it('defaults the part name to the file basename', async () => {
    const file = join(dir, 'screenshot.png');
    writeFileSync(file, 'PNGDATA');
    const argv = withFlag(
      example(
        ISSUES,
        'jira issue-attachments upload PROJ-1 --file ./screenshot.png --media-type image/png',
      ),
      '--file',
      file,
    );
    const { req } = await onlyRequest(argv, { body: [] });
    const part = (req.body as FormData).get('file') as File;
    expect(part.name).toBe('screenshot.png');
    expect(part.type).toBe('image/png');
  });
});

// ── M2-1 / X-PRIO-AFTER: priorities set-default null and move trimming ──────

describe('priorities set-default / move (M2-1, X-PRIO-AFTER)', () => {
  it('set-default --id null sends a JSON null id to erase the default', async () => {
    const { req, stdout } = await onlyRequest(
      example(META, 'jira priorities set-default --id null'),
      { status: 204 },
    );
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${API}/priority/default`);
    expect(req.body).toEqual({ id: null });
    expect(JSON.parse(stdout)).toEqual({ updated: true });
    expect(section(META, '## `issue-types` / `priorities` / `statuses`')).toContain(
      '`set-default --id null` erases the default priority setting',
    );
  });

  it('set-default --id <id> still sends the id string', async () => {
    const argv = example(META, 'jira priorities set-default --id <id>').map((a) =>
      a === '<id>' ? '3' : a,
    );
    const { req } = await onlyRequest(argv, { status: 204 });
    expect(req.body).toEqual({ id: '3' });
  });

  it('set-default without --id is refused before any request', async () => {
    await rejected(['jira', 'priorities', 'set-default'], /--id/);
  });

  it.each([
    [' 3 ', '3'],
    [' null ', null],
  ] as const)('set-default trims --id %j before sending', async (raw, id) => {
    const argv = withFlag(example(META, 'jira priorities set-default --id null'), '--id', raw);
    const { req } = await onlyRequest(argv, { status: 204 });
    expect(req.body).toEqual({ id });
  });

  it('set-default refuses a blank --id before any request', async () => {
    await rejected(['jira', 'priorities', 'set-default', '--id', '  '], /Missing value for --id/);
    expect(section(META, '## `issue-types` / `priorities` / `statuses`')).toContain(
      'The value is trimmed; an empty `--id` is rejected before any request.',
    );
  });

  it('move trims a padded --after value', async () => {
    const argv = withFlag(example(META, 'jira priorities move', '--after'), '--after', ' 10000 ');
    const { req } = await onlyRequest(argv, { status: 204 });
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${API}/priority/move`);
    expect(req.body).toEqual({ ids: ['10001', '10002'], after: '10000' });
  });

  it('move trims a padded --position value', async () => {
    const argv = withFlag(
      example(META, 'jira priorities move', '--position'),
      '--position',
      ' First ',
    );
    const { req } = await onlyRequest(argv, { status: 204 });
    expect(req.body).toEqual({ ids: ['10001', '10002'], position: 'First' });
  });
});

// ── M2-4: projects delete-role-actors actor validation ─────────────────────

describe('projects delete-role-actors (M2-4)', () => {
  it('refuses --group together with --group-id before any request', async () => {
    await rejected(
      [
        'jira',
        'projects',
        'delete-role-actors',
        'PROJ',
        '10001',
        '--group',
        'gn',
        '--group-id',
        'g-1',
      ],
      /--group or --group-id, not both/,
    );
  });

  it('refuses a call that names no actor before any request', async () => {
    await rejected(
      ['jira', 'projects', 'delete-role-actors', 'PROJ', '10001'],
      /requires one of --user, --group-id or --group/,
    );
  });

  it('refuses a blank actor value before any request', async () => {
    await rejected(
      ['jira', 'projects', 'delete-role-actors', 'PROJ', '10001', '--group-id', ' '],
      /Missing value for --group-id/,
    );
  });

  it.each([
    ['--user', { user: 'acc-1' }],
    ['--group-id', { groupId: 'grp-1' }],
  ] as const)('the skill example with %s sends that actor only', async (flag, query) => {
    const { req, stdout } = await onlyRequest(
      example(PROJ, 'jira projects delete-role-actors', flag),
      { status: 204 },
    );
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe(`${API}/project/PROJ/role/10001`);
    expect(queryOf(req)).toEqual(query);
    expect(JSON.parse(stdout)).toEqual({ deleted: true });
  });

  it.each([
    ['--user', { user: 'acc-1' }],
    ['--group-id', { groupId: 'grp-1' }],
  ] as const)('trims a padded %s value', async (flag, query) => {
    const argv = example(PROJ, 'jira projects delete-role-actors', flag);
    const value = argv[argv.indexOf(flag) + 1] as string;
    const { req } = await onlyRequest(withFlag(argv, flag, ` ${value} `), { status: 204 });
    expect(queryOf(req)).toEqual(query);
  });

  it('trims a padded --group value', async () => {
    const { req } = await onlyRequest(
      ['jira', 'projects', 'delete-role-actors', 'PROJ', '10001', '--group', ' legacy group '],
      { status: 204 },
    );
    expect(queryOf(req)).toEqual({ group: 'legacy group' });
  });

  it('the skill states the constraint', () => {
    const bullet = section(PROJ, '## `projects`')
      .split('\n')
      .find((l) => l.startsWith('- `delete-role-actors`'));
    expect(bullet).toMatch(/Pass at least one/);
    expect(bullet).toMatch(/`--group` and `--group-id` cannot be combined/);
    expect(bullet).toMatch(/Surrounding spaces are trimmed/);
  });
});

// ── M3-3: jql precomputation CSV flags drop empty tokens ───────────────────

describe('jql precomputation CSV flags (M3-3)', () => {
  it('get-precomputations drops empty --function-key entries', async () => {
    const argv = withFlag(
      example(SEARCH, 'jira jql get-precomputations', '--function-key'),
      '--function-key',
      'a, ,b,',
    );
    const { req } = await onlyRequest(argv);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${API}/jql/function/computation`);
    expect(queryOf(req)).toEqual({ functionKey: ['a', 'b'], startAt: '0', maxResults: '25' });
  });

  it('get-precomputations-by-id drops empty --precomputation-ids entries', async () => {
    const argv = withFlag(
      example(SEARCH, 'jira jql get-precomputations-by-id', '--precomputation-ids'),
      '--precomputation-ids',
      'a,,b,',
    );
    const { req } = await onlyRequest(argv);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${API}/jql/function/computation/search`);
    expect(queryOf(req)).toEqual({ orderBy: 'created' });
    expect(req.body).toEqual({ precomputationIDs: ['a', 'b'] });
  });

  it.each([
    ['get-precomputations', '--function-key'],
    ['get-precomputations-by-id', '--precomputation-ids'],
  ])('%s refuses a %s value that names nothing', async (action, flag) => {
    await rejected(
      ['jira', 'jql', action, flag, ' , '],
      new RegExp(`${flag} must name at least one`),
    );
  });
});

// ── M1-4: issues export-archived identifier types ──────────────────────────

describe('issues export-archived (M1-4)', () => {
  it('the skill names the identifier each list filter takes', () => {
    const text = section(ISSUES, '### Archive Export');
    expect(text).toMatch(/`--archived-by` and `--reporters` are account IDs/);
    expect(text).toMatch(/`--issue-types` are issue type IDs/);
    expect(text).toMatch(/`--projects` are project keys/);
  });

  it('the identifier example sends IDs and keys as arrays', async () => {
    const { req } = await onlyRequest(
      example(ISSUES, 'jira issues export-archived', '--reporters'),
      { status: 202, body: { taskId: '1' } },
    );
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${API}/issues/archive/export`);
    expect(req.body).toEqual({
      projects: ['PROJ'],
      issueTypes: ['10004'],
      reporters: ['5b10ac8d82e05b22cc7d4ef5', '5b10a2844c20165700ede21g'],
    });
  });
});

// ── M9-2: changelog bulk-fetch ─────────────────────────────────────────────

describe('changelog bulk-fetch (M9-2)', () => {
  const PATH = `${API}/changelog/bulkfetch`;
  it.each(
    labelled([
      {
        file: ISSUES,
        prefix: 'jira changelog bulk-fetch --issues PROJ-1,PROJ-2',
        method: 'POST',
        path: PATH,
        body: { issueIdsOrKeys: ['PROJ-1', 'PROJ-2'] },
      },
      {
        file: ISSUES,
        prefix: 'jira changelog bulk-fetch',
        marker: '--field-ids',
        method: 'POST',
        path: PATH,
        body: { issueIdsOrKeys: ['PROJ-1', 'PROJ-2'], fieldIds: ['status'] },
      },
      {
        file: ISSUES,
        prefix: 'jira changelog bulk-fetch',
        marker: '--next-page-token',
        replace: { '<token>': 'tok' },
        method: 'POST',
        path: PATH,
        body: { issueIdsOrKeys: ['PROJ-1'], maxResults: 50, nextPageToken: 'tok' },
      },
    ]),
  )('%s', (_label, row) => expectRow(row));

  it('trims and drops blanks in --issues', async () => {
    const argv = withFlag(
      example(ISSUES, 'jira changelog bulk-fetch', '--field-ids'),
      '--issues',
      ' PROJ-1 , PROJ-2 ,',
    );
    const { req } = await onlyRequest(argv);
    expect(req.body).toEqual({ issueIdsOrKeys: ['PROJ-1', 'PROJ-2'], fieldIds: ['status'] });
  });

  it('refuses a missing --issues before any request', async () => {
    await rejected(['jira', 'changelog', 'bulk-fetch', '--field-ids', 'status'], /--issues/);
  });
});

// ── M3-7: issuelinktype create / update ────────────────────────────────────

describe('issuelinktype create / update (M3-7)', () => {
  const PATH = `${API}/issueLinkType`;
  it.each(
    labelled([
      {
        file: ISSUES,
        prefix: 'jira issuelinktype create',
        marker: '--inward',
        method: 'POST',
        path: PATH,
        body: { name: 'Blocks', inward: 'is blocked by', outward: 'blocks' },
      },
      {
        file: ISSUES,
        prefix: 'jira issuelinktype update 10001',
        marker: '--name',
        method: 'PUT',
        path: `${PATH}/10001`,
        body: { name: 'Clones', inward: 'is cloned by', outward: 'clones' },
      },
      {
        file: ISSUES,
        prefix: 'jira issuelinktype update 10001 --outward "clones"',
        method: 'PUT',
        path: `${PATH}/10001`,
        body: { outward: 'clones' },
      },
    ]),
  )('%s', (_label, row) => expectRow(row));

  it('update refuses a call that changes nothing', async () => {
    await rejected(['jira', 'issuelinktype', 'update', '10001'], /at least one of/);
  });
});

// ── M2-7: expression analyse / eval ────────────────────────────────────────

describe('expression analyse / eval (M2-7)', () => {
  it.each(
    labelled([
      {
        file: META,
        prefix: 'jira expression analyse',
        marker: '"issue.key","issue.summary"',
        method: 'POST',
        path: `${API}/expression/analyse`,
        body: { expressions: ['issue.key', 'issue.summary'] },
      },
      {
        file: META,
        prefix: 'jira expression analyse',
        marker: '--check type',
        method: 'POST',
        path: `${API}/expression/analyse`,
        query: { check: 'type' },
        body: { expressions: ['value.accountId'], contextVariables: { value: 'User' } },
      },
      {
        file: META,
        prefix: 'jira expression eval --expression',
        method: 'POST',
        marker: '--expand meta.complexity',
        path: `${API}/expression/eval`,
        query: { expand: 'meta.complexity' },
        body: { expression: 'issue.summary', context: { issue: { key: 'ACJIRA-1470' } } },
      },
    ]),
  )('%s', (_label, row) => expectRow(row));
});

// ── M3-10: resolutions create / update / move ──────────────────────────────

describe('resolutions create / update / move (M3-10)', () => {
  it.each(
    labelled([
      {
        file: META,
        prefix: 'jira resolutions create',
        marker: '--description',
        method: 'POST',
        path: `${API}/resolution`,
        body: { name: "Won't Fix", description: 'Not a bug' },
      },
      {
        file: META,
        prefix: 'jira resolutions update 10001',
        marker: '--description',
        method: 'PUT',
        path: `${API}/resolution/10001`,
        body: { name: 'Fixed', description: 'Issue was fixed' },
      },
      {
        file: META,
        prefix: 'jira resolutions move',
        marker: '--position First',
        method: 'PUT',
        path: `${API}/resolution/move`,
        body: { ids: ['10001', '10002'], position: 'First' },
      },
      {
        file: META,
        prefix: 'jira resolutions move',
        marker: '--after 10000',
        method: 'PUT',
        path: `${API}/resolution/move`,
        body: { ids: ['10001', '10002'], after: '10000' },
      },
    ]),
  )('%s', (_label, row) => expectRow(row));
});

// ── M2-10: roles create / delete --swap / add-actors ───────────────────────

describe('roles create / delete --swap / add-actors (M2-10)', () => {
  it.each(
    labelled([
      {
        file: PROJ,
        prefix: 'jira roles create',
        marker: '--description',
        method: 'POST',
        path: `${API}/role`,
        body: { name: 'Developers', description: 'Dev team role' },
      },
      {
        file: PROJ,
        prefix: 'jira roles delete 10001 --swap 10002',
        method: 'DELETE',
        path: `${API}/role/10001`,
        query: { swap: '10002' },
      },
      {
        file: PROJ,
        prefix: 'jira roles add-actors 10001 --user acc-1,acc-2',
        method: 'POST',
        path: `${API}/role/10001/actors`,
        body: { user: ['acc-1', 'acc-2'] },
      },
      {
        file: PROJ,
        prefix: 'jira roles add-actors 10001 --group-id grp-1,grp-2',
        method: 'POST',
        path: `${API}/role/10001/actors`,
        body: { groupId: ['grp-1', 'grp-2'] },
      },
      {
        file: PROJ,
        prefix: 'jira roles add-actors 10001 --group legacy-group-name',
        method: 'POST',
        path: `${API}/role/10001/actors`,
        body: { group: ['legacy-group-name'] },
      },
    ]),
  )('%s', (_label, row) => expectRow(row));
});

// ── M6-8: version get --expand / delete / delete-and-replace / related work ─

describe('version get / delete / delete-and-replace / create-related-work (M6-8)', () => {
  it.each(
    labelled([
      {
        file: PROJ,
        prefix: 'jira version get 10000',
        marker: '--expand',
        method: 'GET',
        path: `${API}/version/10000`,
        query: { expand: 'issuesstatus' },
      },
      {
        file: PROJ,
        prefix: 'jira version delete 10000',
        marker: '--move-fix-issues-to',
        method: 'DELETE',
        path: `${API}/version/10000`,
        query: { moveFixIssuesTo: '10001', moveAffectedIssuesTo: '10002' },
      },
      {
        file: PROJ,
        prefix: 'jira version delete-and-replace 10000',
        marker: '--move-affected-issues-to',
        method: 'POST',
        path: `${API}/version/10000/removeAndSwap`,
        body: { moveFixIssuesTo: 10001, moveAffectedIssuesTo: 10001 },
      },
      {
        file: PROJ,
        prefix: 'jira version delete-and-replace 10000',
        marker: '--custom-field-replacement-list',
        method: 'POST',
        path: `${API}/version/10000/removeAndSwap`,
        body: { customFieldReplacementList: [{ customFieldId: 10050, moveTo: 10001 }] },
      },
      {
        file: PROJ,
        prefix: 'jira version create-related-work 10000',
        marker: '--title',
        method: 'POST',
        path: `${API}/version/10000/relatedwork`,
        body: { category: 'Confluence page', title: 'Release notes', url: 'https://example.com' },
      },
    ]),
  )('%s', (_label, row) => expectRow(row));
});

// ── M1-6: project-template create details / live-template / remove-template ─

describe('project-template create details, live-template, remove-template (M1-6)', () => {
  it.each(
    labelled([
      {
        file: PROJ,
        prefix: 'jira project-template create',
        marker: '--enable-components false',
        method: 'POST',
        path: `${API}/project-template`,
        body: {
          details: {
            name: 'Platform',
            key: 'PLAT',
            description: 'Platform team',
            url: 'https://example.com/platform',
            language: 'en',
            leadAccountId: '5b10a2844c20165700ede21g',
            accessLevel: 'private',
            assigneeType: 'PROJECT_LEAD',
            avatarId: 10200,
            categoryId: 10000,
            enableComponents: false,
            additionalProperties: { team: 'platform' },
          },
          template: { project: { projectTypeKey: 'software' } },
        },
      },
      {
        file: PROJ,
        prefix: 'jira project-template live-template --project-id "10001"',
        method: 'GET',
        path: `${API}/project-template/live-template`,
        query: { projectId: '10001' },
      },
      {
        file: PROJ,
        prefix: 'jira project-template live-template --template-key "my-template-key"',
        method: 'GET',
        path: `${API}/project-template/live-template`,
        query: { templateKey: 'my-template-key' },
      },
      {
        file: PROJ,
        prefix: 'jira project-template remove-template --template-key "my-template-key"',
        method: 'DELETE',
        path: `${API}/project-template/remove-template`,
        query: { templateKey: 'my-template-key' },
      },
    ]),
  )('%s', (_label, row) => expectRow(row));

  it('remove-template percent-encodes a template key in the query', async () => {
    const argv = withFlag(
      example(PROJ, 'jira project-template remove-template --template-key "my-template-key"'),
      '--template-key',
      'team a&b',
    );
    const { req } = await onlyRequest(argv, { status: 204 });
    expect(req.url).toContain('templateKey=team+a%26b');
    expect(req.query.get('templateKey')).toBe('team a&b');
  });
});

// ── M2-9: projects query/body serialization ────────────────────────────────

describe('projects query and body serialization (M2-9)', () => {
  const P = `${API}/project`;
  it.each(
    labelled([
      {
        file: PROJ,
        prefix: 'jira projects list',
        marker: '--type-key software',
        method: 'GET',
        path: `${P}/search`,
        query: {
          typeKey: 'software',
          status: 'live',
          action: 'browse',
          query: 'platform',
          orderBy: 'key',
          maxResults: '50',
        },
      },
      {
        file: PROJ,
        prefix: 'jira projects list',
        marker: '--status archived,deleted',
        method: 'GET',
        path: `${P}/search`,
        query: {
          status: ['archived', 'deleted'],
          id: ['10000', '10001'],
          keys: ['PROJ', 'OPS'],
          categoryId: '10020',
          propertyQuery: '[project.owner].team=core',
          properties: 'project.owner',
          expand: 'description,lead',
          startAt: '50',
        },
      },
      {
        file: PROJ,
        prefix: 'jira projects list-legacy',
        method: 'GET',
        marker: '--recent',
        path: P,
        query: {
          expand: 'description,lead',
          recent: '10',
          properties: ['project.owner', 'project.region'],
        },
      },
      {
        file: PROJ,
        prefix: 'jira projects get-role PROJ 10001',
        marker: '--exclude-inactive-users',
        method: 'GET',
        path: `${P}/PROJ/role/10001`,
        query: { excludeInactiveUsers: 'true' },
      },
      {
        file: PROJ,
        prefix: 'jira projects add-role-actors PROJ 10001',
        marker: '--body',
        method: 'POST',
        path: `${P}/PROJ/role/10001`,
        body: { user: ['acc-1'] },
      },
      {
        file: PROJ,
        prefix: 'jira projects list-versions PROJ',
        marker: '--status',
        method: 'GET',
        path: `${P}/PROJ/version`,
        query: { orderBy: 'name', status: 'released,archived' },
      },
      {
        file: PROJ,
        prefix: 'jira projects list-all-versions PROJ',
        marker: '--expand',
        method: 'GET',
        path: `${P}/PROJ/versions`,
        query: { expand: 'operations' },
      },
      {
        file: PROJ,
        prefix: 'jira projects get-notification-scheme PROJ',
        marker: '--expand',
        method: 'GET',
        path: `${P}/PROJ/notificationscheme`,
        query: { expand: 'all' },
      },
      {
        file: PROJ,
        prefix: 'jira projects get-permission-scheme PROJ',
        marker: '--expand',
        method: 'GET',
        path: `${P}/PROJ/permissionscheme`,
        query: { expand: 'permissions' },
      },
      {
        file: PROJ,
        prefix: 'jira projects create-category',
        marker: '--description',
        method: 'POST',
        path: `${API}/projectCategory`,
        body: { name: 'Infrastructure', description: 'Infra projects' },
      },
      {
        file: PROJ,
        prefix: 'jira projects update-category 10001',
        marker: '--name',
        method: 'PUT',
        path: `${API}/projectCategory/10001`,
        body: { name: 'Renamed' },
      },
      {
        file: PROJ,
        prefix: 'jira projects set-avatar PROJ',
        marker: '--avatar-id',
        method: 'PUT',
        path: `${P}/PROJ/avatar`,
        body: { id: '10010' },
      },
      {
        file: PROJ,
        prefix: 'jira projects set-property PROJ myKey',
        marker: '--value',
        method: 'PUT',
        path: `${P}/PROJ/properties/myKey`,
        body: 'hello',
      },
      {
        file: PROJ,
        prefix: 'jira projects validate-project-key',
        marker: '--key',
        method: 'GET',
        path: `${API}/projectvalidate/key`,
        query: { key: 'MYPROJ' },
      },
      {
        file: PROJ,
        prefix: 'jira projects get-valid-project-key',
        marker: '--key',
        method: 'GET',
        path: `${API}/projectvalidate/validProjectKey`,
        query: { key: 'myproj' },
      },
      {
        file: PROJ,
        prefix: 'jira projects get-valid-project-name',
        marker: '--name',
        method: 'GET',
        path: `${API}/projectvalidate/validProjectName`,
        query: { name: 'My Project' },
      },
    ]),
  )('%s', (_label, row) => expectRow(row));
});

// ── M7-5: search expand typing and repeated params ─────────────────────────

describe('search serialization from the skill examples (M7-5)', () => {
  const JQL = `${API}/search/jql`;
  it.each(
    labelled([
      {
        file: SEARCH,
        prefix: 'jira search search',
        marker: '--reconcile-issues',
        method: 'GET',
        path: JQL,
        query: {
          jql: 'project = PROJ AND status = Open',
          expand: 'names,changelog',
          properties: 'release.owner',
          fieldsByKeys: 'true',
          reconcileIssues: ['10001', '10002'],
          failFast: 'true',
          includeArchivedProjects: 'true',
          nextPageToken: 'eyJvIjoyfQ==',
        },
      },
      {
        file: SEARCH,
        prefix: 'jira search jql-get',
        method: 'GET',
        marker: '--reconcile-issues',
        path: JQL,
        query: {
          jql: 'project = PROJ',
          maxResults: '50',
          properties: 'release.owner',
          fieldsByKeys: 'true',
          reconcileIssues: ['10001', '10002'],
          failFast: 'true',
        },
      },
      {
        file: SEARCH,
        prefix: 'jira search jql-post',
        marker: '--fields',
        method: 'POST',
        path: JQL,
        body: {
          jql: 'project = PROJ AND assignee = currentUser()',
          fields: ['summary', 'status'],
          expand: 'names',
          properties: ['release.owner'],
          includeArchivedProjects: true,
        },
      },
      {
        file: SEARCH,
        prefix: 'jira search get',
        marker: '--fields',
        method: 'GET',
        path: `${API}/search`,
        query: {
          jql: 'project = PROJ',
          startAt: '50',
          validateQuery: 'warn',
          fields: ['summary', 'status'],
          expand: 'names',
          properties: 'release.owner',
          failFast: 'true',
        },
      },
      {
        file: SEARCH,
        prefix: 'jira search legacy-post',
        marker: '--expand',
        method: 'POST',
        path: `${API}/search`,
        body: {
          jql: 'project = PROJ',
          startAt: 50,
          validateQuery: 'strict',
          fieldsByKeys: true,
          expand: ['names', 'schema'],
        },
      },
    ]),
  )('%s', (_label, row) => expectRow(row));

  it('POST /search/jql takes expand as a string, legacy POST /search as an array', async () => {
    const current = await onlyRequest(
      withFlag(example(SEARCH, 'jira search jql-post', '--fields'), '--expand', 'names,schema'),
    );
    expect((current.req.body as { expand: unknown }).expand).toBe('names,schema');
    const legacy = await onlyRequest(example(SEARCH, 'jira search legacy-post', '--expand'));
    expect((legacy.req.body as { expand: unknown }).expand).toEqual(['names', 'schema']);
  });
});

// ── M3-9: jql actions' success paths ───────────────────────────────────────

describe('jql success paths from the skill examples (M3-9)', () => {
  it.each(
    labelled([
      {
        file: SEARCH,
        prefix: 'jira jql autocomplete-data-post --project-ids 10001,10002',
        method: 'POST',
        path: `${API}/jql/autocompletedata`,
        body: { projectIds: [10001, 10002] },
      },
      {
        file: SEARCH,
        prefix: 'jira jql autocomplete-data-post --include-collapsed-fields',
        method: 'POST',
        path: `${API}/jql/autocompletedata`,
        body: { includeCollapsedFields: true },
      },
      {
        file: SEARCH,
        prefix: 'jira jql get-precomputations-by-id',
        marker: '--precomputation-ids',
        method: 'POST',
        path: `${API}/jql/function/computation/search`,
        query: { orderBy: 'created' },
        body: {
          precomputationIDs: [
            'f2ef228b-367f-4c6b-bd9d-0d0e96b5bd7b',
            '2a854f11-d0e1-4260-aea8-64a562a7062a',
          ],
        },
      },
      {
        file: SEARCH,
        prefix: 'jira jql match-issues',
        marker: '--jqls',
        method: 'POST',
        path: `${API}/jql/match`,
        body: { issueIds: [10001, 10002, 10003], jqls: ['project = FOO', 'issuetype = Bug'] },
      },
      {
        file: SEARCH,
        prefix: 'jira jql migrate-queries',
        marker: '--query-strings',
        method: 'POST',
        path: `${API}/jql/pdcleaner`,
        body: { queryStrings: ['assignee = mia', 'reporter = alana'] },
      },
      {
        file: SEARCH,
        prefix: 'jira jql invalid-jqls-access-log --max-results 100',
        method: 'GET',
        path: `${API}/invalid-jqls-access-log`,
        query: { maxResults: '100' },
      },
      {
        file: SEARCH,
        prefix: 'jira jql invalid-jqls-access-log',
        marker: '--next-page-token',
        replace: { '<nextPageToken>': 'eyJwIjoyfQ==' },
        method: 'GET',
        path: `${API}/invalid-jqls-access-log`,
        query: { userAccountId: '5b10ac8d82e05b22cc7d4ef5', nextPageToken: 'eyJwIjoyfQ==' },
      },
    ]),
  )('%s', (_label, row) => expectRow(row));

  it('autocomplete-data-post --include-collapsed-fields false sends false', async () => {
    const argv = [
      ...example(SEARCH, 'jira jql autocomplete-data-post --include-collapsed-fields'),
      'false',
    ];
    const { req } = await onlyRequest(argv);
    expect(req.body).toEqual({ includeCollapsedFields: false });
    expect(section(SEARCH, '## `jql`')).toContain(
      '`--include-collapsed-fields` (bare or `true` sends `true`, `false` sends `false`',
    );
  });
});

// ── M5-4: issuetype create examples use --hierarchy-level, not deprecated --type

describe('issuetype create examples (M5-4)', () => {
  it.each(
    labelled([
      {
        file: META,
        prefix: 'jira issuetype create',
        marker: '--hierarchy-level 0',
        method: 'POST',
        path: `${API}/issuetype`,
        body: { name: 'Feature', description: 'A new product feature', hierarchyLevel: 0 },
      },
      {
        file: META,
        prefix: 'jira issuetype create',
        marker: '--hierarchy-level=-1',
        method: 'POST',
        path: `${API}/issuetype`,
        body: { name: 'Sub-task', hierarchyLevel: -1 },
      },
    ]),
  )('%s', (_label, row) => expectRow(row));
});
