/**
 * Release 4.1.0, unit minors-sweep: CLI → wire proofs for the LOW follow-ups
 * from the wave-2/3 reviews. Accepted commands are taken from the skill
 * reference (`skill/reference/**`), the text an agent builds commands from,
 * and run through the real argv → router → client → transport path with a
 * fake fetch; a rejected command must fail before any request is sent.
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it, onTestFinished } from 'vitest';
import { runCliWire, type CliWireResult, type WireRequest } from '../helpers/cli-wire.js';

const SKILL_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'skill',
  'reference',
);
const CONF = 'confluence.md';
const META = 'jira/metadata.md';
const ISSUES = 'jira/issues.md';
const SCHEMES = 'jira/schemes.md';
const C = '/wiki/api/v2';

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

/** The argv (without `atlas`) of the one skill example that starts with `prefix` and contains `marker`. */
function example(file: string, prefix: string, marker = ''): string[] {
  const markdown = readFileSync(join(SKILL_DIR, file), 'utf8');
  const found: string[] = [];
  for (const block of markdown.matchAll(/```(?:sh|bash)\n([\s\S]*?)```/g)) {
    for (const line of (block[1] as string).split('\n')) {
      const c = line.trim();
      if (c.startsWith(`atlas ${prefix} `) && c.includes(marker)) found.push(c);
    }
  }
  expect(found, `${file}: one example for "${prefix}" containing "${marker}"`).toHaveLength(1);
  return tokenize(found[0] as string).slice(1);
}

/** Replace the value after `flag` in `argv`. */
function withFlag(argv: readonly string[], flag: string, value: string): string[] {
  const i = argv.indexOf(flag);
  expect(i, `${flag} in ${argv.join(' ')}`).toBeGreaterThan(-1);
  return [...argv.slice(0, i + 1), value, ...argv.slice(i + 2)];
}

function only(run: CliWireResult): WireRequest {
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return run.requests[0] as WireRequest;
}

async function refused(argv: readonly string[], message: string): Promise<void> {
  const run = await runCliWire(argv);
  expect(run.exitCode).toBe(1);
  expect(run.stderr).toContain(message);
  expect(run.requests).toHaveLength(0);
}

const dir = mkdtempSync(join(tmpdir(), 'atlas-minors-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('M-CA2: pages / blog-posts list --space-id takes one space ID', () => {
  it.each([
    ['confluence pages list', '/pages'],
    ['confluence blog-posts list', '/blogposts'],
  ])('%s sends the skill example space-id and refuses a list', async (prefix, path) => {
    const argv = example(CONF, prefix, '--limit 25');
    const req = only(await runCliWire(argv));
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${C}${path}`);
    expect(req.query.getAll('space-id')).toEqual(['654321']);
    expect(req.query.get('limit')).toBe('25');

    await refused(withFlag(argv, '--space-id', '1,2'), '--space-id takes one space ID, got: 1,2');
  });
});

describe('M-CA3: attachments thumbnail --file refuses an existing file before the download', () => {
  const argvFor = (file: string): string[] =>
    withFlag(example(CONF, 'confluence attachments thumbnail', '--file'), '--file', file);

  it('writes a new file, then refuses the same path without a request', async () => {
    const file = join(dir, 'thumb.png');
    const argv = argvFor(file);
    const run = await runCliWire(argv, { respond: { body: 'PNG' } });
    const req = only(run);
    expect(req.path).toBe(`${C}/attachments/att-1/thumbnail/download`);
    expect(req.query.get('width')).toBe('200');
    expect(req.query.get('height')).toBe('200');
    expect(JSON.parse(run.stdout)).toEqual({ downloaded: true, byteLength: 3, file });
    expect(readFileSync(file, 'utf8')).toBe('PNG');

    await refused(argv, `${file} already exists; pass --force to overwrite`);
    expect(readFileSync(file, 'utf8')).toBe('PNG');
  });

  it('--force downloads and overwrites an existing file', async () => {
    const file = join(dir, 'forced.png');
    writeFileSync(file, 'OLD');
    const run = await runCliWire([...argvFor(file), '--force'], { respond: { body: 'NEW' } });
    only(run);
    expect(readFileSync(file, 'utf8')).toBe('NEW');
  });

  it('still refuses a file that appears while the download runs', async () => {
    const file = join(dir, 'raced.png');
    const run = await runCliWire(argvFor(file), {
      respond: () => {
        writeFileSync(file, 'OTHER');
        return { body: 'PNG' };
      },
    });
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain(`${file} already exists; pass --force to overwrite`);
    expect(readFileSync(file, 'utf8')).toBe('OTHER');
  });
});

describe('M-CA4: Confluence CSV ID flags take decimal integer IDs only', () => {
  it('labels list-all sends repeated label-id from the skill example', async () => {
    const argv = example(CONF, 'confluence labels list-all', '--label-id');
    const req = only(await runCliWire(argv));
    expect(req.path).toBe(`${C}/labels`);
    expect(req.query.getAll('label-id')).toEqual(['10', '20']);
    expect(req.query.getAll('prefix')).toEqual(['my', 'team']);
    await refused(
      withFlag(argv, '--label-id', '10,abc'),
      '--label-id must contain only decimal integer IDs, got: abc',
    );
  });

  it.each(['blog-posts', 'pages'])('labels %s --space-id is validated', async (action) => {
    const argv = example(CONF, 'confluence labels blog-posts', '--space-id');
    argv[2] = action;
    const req = only(await runCliWire(argv));
    expect(req.path).toBe(`${C}/labels/12345/${action === 'pages' ? 'pages' : 'blogposts'}`);
    expect(req.query.getAll('space-id')).toEqual(['100', '200']);
    await refused(
      withFlag(argv, '--space-id', '100,x1'),
      '--space-id must contain only decimal integer IDs, got: x1',
    );
  });

  it('custom-content list validates --id and --space-id', async () => {
    const argv = example(CONF, 'confluence custom-content list', '--space-id');
    const req = only(await runCliWire([...argv, '--id', '7,8']));
    expect(req.path).toBe(`${C}/custom-content`);
    expect(req.query.getAll('space-id')).toEqual(['654321']);
    expect(req.query.getAll('id')).toEqual(['7', '8']);
    await refused(
      withFlag(argv, '--space-id', '12abc'),
      '--space-id must contain only decimal integer IDs, got: 12abc',
    );
    await refused(
      [...argv, '--id', '7,1.5'],
      '--id must contain only decimal integer IDs, got: 1.5',
    );
  });

  it('spaces list --ids keeps int64 strings and shares the message', async () => {
    const req = only(
      await runCliWire(['confluence', 'spaces', 'list', '--ids', '9007199254740993,-1']),
    );
    expect(req.query.getAll('ids')).toEqual(['9007199254740993', '-1']);
    await refused(
      ['confluence', 'spaces', 'list', '--ids', '1,0x10'],
      '--ids must contain only decimal integer IDs, got: 0x10',
    );
  });

  it('pages list --id follows the same int64 rule as the other ID lists', async () => {
    const req = only(await runCliWire(['confluence', 'pages', 'list', '--id=-1,2']));
    expect(req.query.getAll('id')).toEqual(['-1', '2']);
  });
});

describe('M-CB1/M-CB2: --role-type is an open string, sent trimmed', () => {
  it('space-roles list sends the trimmed role type', async () => {
    const argv = example(CONF, 'confluence space-roles list', '--role-type');
    expect(only(await runCliWire(argv)).query.get('role-type')).toBe('CUSTOM');
    const req = only(
      await runCliWire(['confluence', 'space-roles', 'list', '--role-type', ' SYSTEM ']),
    );
    expect(req.path).toBe(`${C}/space-roles`);
    expect(req.query.get('role-type')).toBe('SYSTEM');
    expect(req.url).not.toContain('+');
  });

  it('spaces role-assignments sends a tenant-defined role type, trimmed', async () => {
    const argv = example(CONF, 'confluence spaces role-assignments', '--role-type');
    const req = only(await runCliWire(argv));
    expect(req.path).toBe(`${C}/spaces/654321/role-assignments`);
    expect(req.query.get('role-type')).toBe('CUSTOM');
    expect(req.query.get('principal-type')).toBe('USER');
    const custom = only(await runCliWire(withFlag(argv, '--role-type', ' tenant-type ')));
    expect(custom.query.get('role-type')).toBe('tenant-type');
  });

  it.each([
    ['space-roles', 'list'],
    ['spaces', 'role-assignments', '654321'],
  ])('%s %s refuses an empty or blank --role-type', async (...argv) => {
    for (const blank of ['', '  ']) {
      await refused(['confluence', ...argv, '--role-type', blank], '--role-type must not be empty');
    }
  });
});

describe('M-JI1: issues create needs a usable fields.project / fields.issuetype', () => {
  it('the skill --body example by ID is sent as given', async () => {
    const argv = example(ISSUES, 'jira issues create', '--body');
    const req = only(await runCliWire(argv));
    expect(req.method).toBe('POST');
    expect(req.path).toBe('/rest/api/3/issue');
    expect(req.body).toEqual({
      fields: { project: { id: '10000' }, issuetype: { id: '10001' }, summary: 'Fix login' },
    });
  });

  it.each([
    ['{}', '{"id":"10001"}', 'fields.project must be an object with an "id" or "key"'],
    ['10000', '{"id":"10001"}', 'fields.project must be an object with an "id" or "key"'],
    ['{"id":""}', '{"id":"10001"}', 'fields.project must be an object with an "id" or "key"'],
    ['{"key":"PROJ"}', '{}', 'fields.issuetype must be an object with an "id" or "name"'],
    ['{"key":"PROJ"}', '"Bug"', 'fields.issuetype must be an object with an "id" or "name"'],
    [
      '{"key":"PROJ"}',
      '{"key":"Bug"}',
      'fields.issuetype must be an object with an "id" or "name"',
    ],
  ])('project %s / issuetype %s is refused', async (project, issuetype, message) => {
    const argv = example(ISSUES, 'jira issues create', '--body');
    const body = `{"fields":{"project":${project},"issuetype":${issuetype}}}`;
    await refused(withFlag(argv, '--body', body), message);
  });

  it('accepts a numeric id and a name, and the flags still win over --body', async () => {
    const argv = example(ISSUES, 'jira issues create', '--body');
    const numeric = only(
      await runCliWire(
        withFlag(argv, '--body', '{"fields":{"project":{"id":10000},"issuetype":{"name":"Bug"}}}'),
      ),
    );
    expect(numeric.body).toMatchObject({
      fields: { project: { id: 10000 }, issuetype: { name: 'Bug' } },
    });
    const flags = only(
      await runCliWire([
        ...withFlag(argv, '--body', '{"fields":{"project":{},"issuetype":{}}}'),
        '--project',
        'PROJ',
        '--type',
        'Task',
      ]),
    );
    expect(flags.body).toMatchObject({
      fields: { project: { key: 'PROJ' }, issuetype: { name: 'Task' } },
    });
  });

  it('a missing project / type keeps the missing-option message', async () => {
    await refused(
      ['jira', 'issues', 'create', '--summary', 's', '--type', 'Task'],
      'Missing required option: --project',
    );
    await refused(
      ['jira', 'issues', 'create', '--summary', 's', '--project', 'P'],
      'Missing required option: --type',
    );
  });
});

describe('M-JU2: statuses bulk-update names a wrong-typed field', () => {
  it('the skill example is sent', async () => {
    const req = only(await runCliWire(example(META, 'jira statuses bulk-update')));
    expect(req.method).toBe('PUT');
    expect(req.path).toBe('/rest/api/3/statuses');
    expect(req.body).toEqual({
      statuses: [{ id: '10001', name: 'Renamed Status', statusCategory: 'IN_PROGRESS' }],
    });
  });

  it.each([
    [
      '{"id":10001,"name":"x","statusCategory":"DONE"}',
      'statuses[0].id must be a string, got: number',
    ],
    [
      '{"id":"1","name":true,"statusCategory":"DONE"}',
      'statuses[0].name must be a string, got: boolean',
    ],
    [
      '{"id":"1","name":"x","statusCategory":3}',
      'statuses[0].statusCategory must be a string, got: number',
    ],
    ['{"id":"1","name":"","statusCategory":"DONE"}', 'statuses[0] requires name'],
    ['{"name":"x","statusCategory":"DONE"}', 'statuses[0] requires id'],
    ['{"id":"1","name":null,"statusCategory":"DONE"}', 'statuses[0] requires name'],
  ])('%s is refused with a precise message', async (entry, message) => {
    await refused(['jira', 'statuses', 'bulk-update', '--value', `[${entry}]`], message);
  });
});

describe('M-JU3: an empty or blank integer flag is refused, not sent as 0', () => {
  it('issuetype list-for-project --level from the skill is sent; --level= is refused', async () => {
    const argv = example(META, 'jira issuetype list-for-project', '--level');
    const req = only(await runCliWire(argv));
    expect(req.path).toBe('/rest/api/3/issuetype/project');
    expect(req.query.get('level')).toBe('-1');
    expect(req.query.get('projectId')).toBe('10100');
    await refused(
      [...argv.filter((a) => !a.startsWith('--level')), '--level='],
      '--level must be an integer, got: ',
    );
    await refused(
      [...argv.filter((a) => !a.startsWith('--level')), '--level', ' '],
      '--level must be an integer, got:  ',
    );
  });

  it.each([
    [
      ['jira', 'issuetype', 'create', '--name', 'Story', '--hierarchy-level='],
      '--hierarchy-level must be an integer, got: ',
    ],
    [
      ['jira', 'issues', 'get-changelog', 'PROJ-1', '--start-at='],
      '--start-at must be a non-negative integer, got: ',
    ],
    [
      ['jira', 'issues', 'get-changelog', 'PROJ-1', '--start-at', ' '],
      '--start-at must be a non-negative integer, got:  ',
    ],
    [
      ['jira', 'projects', 'list', '--start-at', ''],
      '--start-at must be a non-negative integer, got: ',
    ],
    [
      ['jira', 'issuetype', 'load-avatar', '10001', '--file', 'a.png', '--size', '48', '--x', ''],
      '--x must be a non-negative integer, got: ',
    ],
    [['jira', 'pipelines', 'get-build', 'p-1', ' '], 'buildNumber must be an integer, got:  '],
    [
      [
        'jira',
        'plans',
        'add-atlassian-team',
        '1',
        '--atlassian-team-id',
        't',
        '--planning-style',
        'Scrum',
        '--capacity=',
      ],
      '--capacity must be a finite number, got: ',
    ],
    [
      ['confluence', 'tasks', 'list', '--completed-at-from='],
      '--completed-at-from must be a non-negative integer, got: ',
    ],
  ])('%j is refused', async (argv, message) => {
    await refused(argv, message);
  });

  it('a real 0 is still sent', async () => {
    const req = only(
      await runCliWire(['jira', 'issues', 'get-changelog', 'PROJ-1', '--start-at', '0']),
    );
    expect(req.query.get('startAt')).toBe('0');
    const level = only(
      await runCliWire([
        'jira',
        'issuetype',
        'list-for-project',
        '--project-id',
        '1',
        '--level',
        '0',
      ]),
    );
    expect(level.query.get('level')).toBe('0');
  });
});

describe('M-JU4: priorities move needs --after or --position', () => {
  it.each(['--after', '--position'])('the skill %s example is sent', async (flag) => {
    const req = only(await runCliWire(example(META, 'jira priorities move', flag)));
    expect(req.method).toBe('PUT');
    expect(req.path).toBe('/rest/api/3/priority/move');
    expect(req.body).toEqual(
      flag === '--after'
        ? { ids: ['10001', '10002'], after: '10000' }
        : { ids: ['10001', '10002'], position: 'First' },
    );
  });

  it('refuses neither and both before any request', async () => {
    const argv = example(META, 'jira priorities move', '--after');
    await refused(argv.slice(0, -2), 'priorities move requires one of: --after, --position');
    await refused(
      [...argv, '--position', 'Last'],
      'priorities move accepts either --after or --position, not both',
    );
  });
});

describe('M-JS1: workflowscheme list-by-project takes at most 100 project IDs', () => {
  const ids = (n: number): string =>
    Array.from({ length: n }, (_, i) => String(10000 + i)).join(',');

  it('sends the skill example and exactly 100 IDs as repeated params', async () => {
    const argv = example(SCHEMES, 'jira workflowscheme list-by-project');
    const req = only(await runCliWire(argv));
    expect(req.path).toBe('/rest/api/3/workflowscheme/project');
    expect(req.query.getAll('projectId')).toEqual(['10010', '10020']);
    const hundred = only(await runCliWire(withFlag(argv, '--project-id', ids(100))));
    expect(hundred.query.getAll('projectId')).toHaveLength(100);
  });

  it('refuses 101 IDs before any request', async () => {
    const argv = example(SCHEMES, 'jira workflowscheme list-by-project');
    await refused(
      withFlag(argv, '--project-id', ids(101)),
      '--project-id accepts at most 100 project IDs, got: 101',
    );
  });
});

describe('M-JW1: workflowscheme list-by-project --project-id is decimal-only', () => {
  it.each(['-5', '1e3', '0x10', '9007199254740992'])('%s is refused', async (bad) => {
    await refused(
      ['jira', 'workflowscheme', 'list-by-project', '--project-id', `1,${bad}`],
      `--project-id must contain positive integers up to 9007199254740991, got: ${bad}`,
    );
  });
});

describe('M-JU1: universal-avatar store sends a typed image', () => {
  it('--media-type and the file extension set Content-Type', async () => {
    const file = join(dir, 'avatar.gif');
    writeFileSync(file, 'GIF89a');
    const base = [
      'jira',
      'universal-avatar',
      'store',
      'project',
      '10000',
      '--file',
      file,
      '--size',
      '48',
    ];
    expect(only(await runCliWire(base)).headers['content-type']).toBe('image/gif');
    const typed = only(await runCliWire([...base, '--media-type', 'image/png']));
    expect(typed.headers['content-type']).toBe('image/png');
    expect(existsSync(file)).toBe(true);
  });
});

describe('round 1: blank values the first pass missed', () => {
  it('screens move-tab sends the skill example and refuses a blank pos', async () => {
    const argv = example(SCHEMES, 'jira screens move-tab');
    const req = only(await runCliWire(argv));
    expect(req.method).toBe('POST');
    expect(req.path).toBe('/rest/api/3/screens/10001/tabs/1/move/0');
    await refused([...argv.slice(0, -1), ' '], 'pos must be a non-negative integer, got:  ');
  });

  it.each([
    ['--after', ''],
    ['--after', ' '],
    ['--position', ''],
  ])('priorities move refuses an empty %s', async (flag, blank) => {
    const argv = example(META, 'jira priorities move', '--after');
    await refused([...argv.slice(0, -2), flag, blank], `Missing value for ${flag}`);
  });

  it.each([
    ['confluence pages list', '/pages'],
    ['confluence blog-posts list', '/blogposts'],
  ])('%s trims --space-id and refuses a blank or non-decimal one', async (prefix, path) => {
    const argv = example(CONF, prefix, '--limit 25');
    const req = only(await runCliWire(withFlag(argv, '--space-id', ' 654321 ')));
    expect(req.path).toBe(`${C}${path}`);
    expect(req.query.getAll('space-id')).toEqual(['654321']);
    expect(req.url).not.toContain('+');
    await refused(withFlag(argv, '--space-id', ''), '--space-id must not be empty');
    await refused(withFlag(argv, '--space-id', '  '), '--space-id must not be empty');
    await refused(
      withFlag(argv, '--space-id', 'abc'),
      '--space-id must be a decimal integer ID, got: abc',
    );
  });

  it.each(['', ' '])(
    'attachments thumbnail --file %j is refused before the download',
    async (blank) => {
      // Run in a scratch cwd: a regression would write a file named " " there, not in the repo.
      const scratch = mkdtempSync(join(tmpdir(), 'atlas-blank-thumb-'));
      const cwd = process.cwd();
      process.chdir(scratch);
      onTestFinished(() => {
        process.chdir(cwd);
        rmSync(scratch, { recursive: true, force: true });
      });
      const argv = withFlag(
        example(CONF, 'confluence attachments thumbnail', '--file'),
        '--file',
        blank,
      );
      const run = await runCliWire(argv, { respond: { body: 'PNG' } });
      expect(run.exitCode).toBe(1);
      expect(run.stderr).toContain('--file must not be empty');
      expect(run.stderr).not.toContain('ENOENT');
      expect(run.requests).toHaveLength(0);
      expect(readdirSync(scratch)).toEqual([]);
    },
  );
});
