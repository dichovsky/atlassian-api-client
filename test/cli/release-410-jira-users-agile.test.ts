/**
 * Release 4.1.0, unit jira-users-agile: CLI → wire regressions for the
 * `users`, `issue-types`, `issuetype`, `priorities`, `statuses`,
 * `issue-comments`, `boards` and `sprints` findings (F109–F135). Every case
 * drives real argv through {@link runCliWire} and asserts what reaches the
 * wire (or that the CLI refuses before sending anything).
 */
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from 'vitest';
import type {
  JiraGetUserParams as GetUserParams,
  IssueCommentExpandParams,
  JiraClient,
  ListIssueTypesForProjectParams,
  UpdateIssueCommentParams,
} from '../../src/index.js';
import { runCliWire, type CliWireResult, type WireRequest } from '../helpers/cli-wire.js';

const JIRA = '/rest/api/3';
const AGILE = '/rest/agile/1.0';
const SKILL_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'skill',
  'reference',
  'jira',
);

async function onlyRequest(args: readonly string[]): Promise<WireRequest> {
  const run = await runCliWire(args);
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return run.requests[0] as WireRequest;
}

async function rejected(args: readonly string[]): Promise<CliWireResult> {
  const run = await runCliWire(args);
  expect(run.exitCode).toBe(1);
  expect(run.requests).toHaveLength(0);
  return run;
}

function query(req: WireRequest): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(req.query.keys())) {
    const all = req.query.getAll(key);
    out[key] = all.length === 1 ? (all[0] as string) : all;
  }
  return out;
}

describe('F109 users search reaches startAt, accountId and property', () => {
  it('sends --start-at with --query', async () => {
    const req = await onlyRequest(['jira', 'users', 'search', '--query', 'q', '--start-at', '10']);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${JIRA}/user/search`);
    expect(query(req)).toEqual({ query: 'q', startAt: '10' });
  });

  it('accepts --account-id alone', async () => {
    const req = await onlyRequest(['jira', 'users', 'search', '--account-id', 'acc-1']);
    expect(query(req)).toEqual({ accountId: 'acc-1' });
  });

  it('accepts --property alone', async () => {
    const req = await onlyRequest([
      'jira',
      'users',
      'search',
      '--property',
      'location.office.city=Sydney',
    ]);
    expect(query(req)).toEqual({ property: 'location.office.city=Sydney' });
  });

  it('requires one of --query, --account-id or --property', async () => {
    const run = await rejected(['jira', 'users', 'search', '--max-results', '5']);
    expect(run.stderr).toContain('--query, --account-id or --property');
  });

  it('rejects a negative --start-at', async () => {
    const run = await rejected(['jira', 'users', 'search', '--query', 'q', '--start-at=-1']);
    expect(run.stderr).toContain('--start-at must be a non-negative integer');
  });
});

describe('F110 issuetype load-avatar sends an image Content-Type', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'atlas-avatar-'));
    await writeFile(join(dir, 'a.png'), new Uint8Array([137, 80, 78]));
    await writeFile(join(dir, 'a.JPG'), new Uint8Array([255, 216]));
    await writeFile(join(dir, 'a.gif'), new Uint8Array([71, 73]));
    await writeFile(join(dir, 'a.bin'), new Uint8Array([0]));
    await writeFile(join(dir, 'avatar'), new Uint8Array([0]));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it.each([
    ['a.png', 'image/png'],
    ['a.JPG', 'image/jpeg'],
    ['a.gif', 'image/gif'],
  ])('derives the type of %s from its extension', async (file, type) => {
    const req = await onlyRequest([
      'jira',
      'issuetype',
      'load-avatar',
      '10001',
      '--file',
      join(dir, file),
      '--size',
      '48',
      '--x',
      '1',
      '--y',
      '2',
    ]);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${JIRA}/issuetype/10001/avatar2`);
    expect(query(req)).toEqual({ size: '48', x: '1', y: '2' });
    expect(req.headers['content-type']).toBe(type);
    expect(req.headers['x-atlassian-token']).toBe('no-check');
    expect(req.body).toBeInstanceOf(Blob);
    expect((req.body as Blob).type).toBe(type);
  });

  it('--media-type overrides the extension', async () => {
    const req = await onlyRequest([
      'jira',
      'issuetype',
      'load-avatar',
      '10001',
      '--file',
      join(dir, 'a.bin'),
      '--size',
      '48',
      '--media-type',
      'image/gif',
    ]);
    expect(req.headers['content-type']).toBe('image/gif');
  });

  it('rejects a file without an extension unless --media-type is given', async () => {
    const run = await rejected([
      'jira',
      'issuetype',
      'load-avatar',
      '10001',
      '--file',
      join(dir, 'avatar'),
      '--size',
      '48',
    ]);
    expect(run.stderr).toContain('pass --media-type');
  });

  it('rejects an unknown extension without --media-type', async () => {
    const run = await rejected([
      'jira',
      'issuetype',
      'load-avatar',
      '10001',
      '--file',
      join(dir, 'a.bin'),
      '--size',
      '48',
    ]);
    expect(run.stderr).toContain('--media-type');
  });

  it('rejects a --media-type Jira does not accept', async () => {
    const run = await rejected([
      'jira',
      'issuetype',
      'load-avatar',
      '10001',
      '--file',
      join(dir, 'a.png'),
      '--size',
      '48',
      '--media-type',
      'image/webp',
    ]);
    expect(run.stderr).toContain('--media-type must be one of: image/png, image/jpeg, image/gif');
  });
});

describe('F111 statuses bulk-update entries need id, name and statusCategory', () => {
  it('sends a complete StatusUpdate entry', async () => {
    const req = await onlyRequest([
      'jira',
      'statuses',
      'bulk-update',
      '--value',
      '[{"id":"10001","name":"Renamed Status","statusCategory":"IN_PROGRESS"}]',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/statuses`);
    expect(req.body).toEqual({
      statuses: [{ id: '10001', name: 'Renamed Status', statusCategory: 'IN_PROGRESS' }],
    });
  });

  it('rejects an entry without statusCategory before sending', async () => {
    const run = await rejected([
      'jira',
      'statuses',
      'bulk-update',
      '--value',
      '[{"id":"10001","name":"Renamed Status"}]',
    ]);
    expect(run.stderr).toContain('statusCategory');
  });

  it('rejects a statusCategory outside TODO/IN_PROGRESS/DONE before sending', async () => {
    const run = await rejected([
      'jira',
      'statuses',
      'bulk-update',
      '--value',
      '[{"id":"10001","name":"Renamed Status","statusCategory":"BOGUS"}]',
    ]);
    expect(run.stderr).toContain('statusCategory must be one of TODO, IN_PROGRESS, DONE');
  });
});

describe('F112 priorities create sends a spec-valid body', () => {
  it('sends avatarId with --avatar-id', async () => {
    const req = await onlyRequest([
      'jira',
      'priorities',
      'create',
      '--name',
      'Critical',
      '--status-color',
      '#FF0000',
      '--avatar-id',
      '10300',
    ]);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${JIRA}/priority`);
    expect(req.body).toEqual({ name: 'Critical', statusColor: '#FF0000', avatarId: 10300 });
  });

  it('sends iconUrl with --icon-url', async () => {
    const req = await onlyRequest([
      'jira',
      'priorities',
      'create',
      '--name',
      'Critical',
      '--description',
      'Highest urgency',
      '--status-color',
      '#FF0000',
      '--icon-url',
      '/images/icons/priorities/critical.png',
    ]);
    expect(req.body).toEqual({
      name: 'Critical',
      description: 'Highest urgency',
      statusColor: '#FF0000',
      iconUrl: '/images/icons/priorities/critical.png',
    });
  });

  it('requires --status-color', async () => {
    const run = await rejected(['jira', 'priorities', 'create', '--name', 'N', '--avatar-id', '1']);
    expect(run.stderr).toContain('Missing required option: --status-color');
  });

  it('requires one of --icon-url or --avatar-id', async () => {
    const run = await rejected([
      'jira',
      'priorities',
      'create',
      '--name',
      'N',
      '--status-color',
      '#000',
    ]);
    expect(run.stderr).toContain('one of --icon-url or --avatar-id');
  });

  it('rejects --icon-url together with --avatar-id', async () => {
    const run = await rejected([
      'jira',
      'priorities',
      'create',
      '--name',
      'N',
      '--status-color',
      '#000',
      '--icon-url',
      '/images/icons/priorities/low.png',
      '--avatar-id',
      '1',
    ]);
    expect(run.stderr).toContain('not both');
  });

  it('rejects a non-integer --avatar-id', async () => {
    const run = await rejected([
      'jira',
      'priorities',
      'create',
      '--name',
      'N',
      '--status-color',
      '#000',
      '--avatar-id',
      'abc',
    ]);
    expect(run.stderr).toContain('--avatar-id must be a positive integer');
  });
});

describe('F114 priorities delete sends only the spec path id', () => {
  it('sends DELETE /priority/{id} with no query', async () => {
    const req = await onlyRequest(['jira', 'priorities', 'delete', '3']);
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe(`${JIRA}/priority/3`);
    expect(req.url).not.toContain('?');
  });

  it('rejects the undeclared --replace-with', async () => {
    const run = await rejected(['jira', 'priorities', 'delete', '3', '--replace-with', '4']);
    expect(run.stderr).toContain('--replace-with is not supported by priorities delete');
  });
});

describe('F115/F118 spec-required users flags are enforced', () => {
  it.each([
    [['jira', 'users', 'search-query'], '--query'],
    [['jira', 'users', 'search-query-key'], '--query'],
    [['jira', 'users', 'assignable-multi-project', '--query', 'q'], '--project-keys'],
    [['jira', 'users', 'permission-search', '--project-key', 'P'], '--permissions'],
  ])('%j requires %s', async (args, flag) => {
    const run = await rejected(args);
    expect(run.stderr).toContain(`Missing required option: ${flag}`);
  });

  it('search-query sends the structured query', async () => {
    const req = await onlyRequest([
      'jira',
      'users',
      'search-query',
      '--query',
      'is assignee of PROJ',
      '--start-at',
      '0',
    ]);
    expect(req.path).toBe(`${JIRA}/user/search/query`);
    expect(query(req)).toEqual({ query: 'is assignee of PROJ', startAt: '0' });
  });

  it('search-query-key sends maxResult (singular)', async () => {
    const req = await onlyRequest([
      'jira',
      'users',
      'search-query-key',
      '--query',
      'is watcher of PROJ-1',
      '--max-results',
      '5',
    ]);
    expect(req.path).toBe(`${JIRA}/user/search/query/key`);
    expect(query(req)).toEqual({ query: 'is watcher of PROJ-1', maxResult: '5' });
  });

  it('assignable-multi-project sends projectKeys CSV', async () => {
    const req = await onlyRequest([
      'jira',
      'users',
      'assignable-multi-project',
      '--project-keys',
      'A, B',
      '--query',
      'q',
    ]);
    expect(query(req)).toEqual({ query: 'q', projectKeys: 'A,B' });
  });

  it('permission-search sends permissions CSV', async () => {
    const req = await onlyRequest([
      'jira',
      'users',
      'permission-search',
      '--permissions',
      'BROWSE_PROJECTS,EDIT_ISSUES',
      '--project-key',
      'P',
    ]);
    expect(query(req)).toEqual({ projectKey: 'P', permissions: 'BROWSE_PROJECTS,EDIT_ISSUES' });
  });
});

describe('F116/F117 users list / list-search send only spec params', () => {
  it('list forwards --expand', async () => {
    const req = await onlyRequest([
      'jira',
      'users',
      'list',
      '--start-at',
      '1',
      '--max-results',
      '5',
      '--expand',
      'groups',
    ]);
    expect(req.path).toBe(`${JIRA}/users`);
    expect(query(req)).toEqual({ startAt: '1', maxResults: '5', expand: 'groups' });
  });

  it('list-search forwards --expand', async () => {
    const req = await onlyRequest(['jira', 'users', 'list-search', '--expand', 'applicationRoles']);
    expect(req.path).toBe(`${JIRA}/users/search`);
    expect(query(req)).toEqual({ expand: 'applicationRoles' });
  });

  it('list-search rejects --query (GET /users/search has no filter)', async () => {
    const run = await rejected(['jira', 'users', 'list-search', '--query', 'Jane']);
    expect(run.stderr).toContain('--query is not supported by users list-search');
  });

  it('list-search rejects --user-name too (no username param either)', async () => {
    const run = await rejected(['jira', 'users', 'list-search', '--user-name', 'jane']);
    expect(run.stderr).toContain('--user-name is not supported by users list-search');
  });
});

describe('F119 empty id lists fail client-side', () => {
  it.each([
    [['jira', 'statuses', 'by-names', '--names', ',', '--project-id', '1']],
    [['jira', 'users', 'bulk', '--account-ids', ',']],
    [['jira', 'users', 'bulk-emails', '--account-ids', ',']],
  ])('%j sends nothing', async (args) => {
    await rejected(args);
  });

  it('by-names keeps projectId as a separate query param', async () => {
    const req = await onlyRequest([
      'jira',
      'statuses',
      'by-names',
      '--names',
      'In Progress,Done',
      '--project-id',
      '1',
    ]);
    expect(req.path).toBe(`${JIRA}/statuses/byNames`);
    expect(req.query.getAll('name')).toEqual(['In Progress', 'Done']);
    expect(req.query.get('projectId')).toBe('1');
  });

  it('bulk and bulk-emails repeat accountId', async () => {
    const bulk = await onlyRequest(['jira', 'users', 'bulk', '--account-ids', 'a,b']);
    expect(bulk.path).toBe(`${JIRA}/user/bulk`);
    expect(bulk.query.getAll('accountId')).toEqual(['a', 'b']);
    const emails = await onlyRequest(['jira', 'users', 'bulk-emails', '--account-ids', 'a, b']);
    expect(emails.path).toBe(`${JIRA}/user/email/bulk`);
    expect(emails.query.getAll('accountId')).toEqual(['a', 'b']);
  });
});

describe('F121 issue-comments get/create/update reach their spec query params', () => {
  const body =
    '{"body":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Hi"}]}]}}';

  it('get forwards --expand', async () => {
    const req = await onlyRequest([
      'jira',
      'issue-comments',
      'get',
      'K-1',
      '10001',
      '--expand',
      'renderedBody',
    ]);
    expect(req.path).toBe(`${JIRA}/issue/K-1/comment/10001`);
    expect(query(req)).toEqual({ expand: 'renderedBody' });
  });

  it('create forwards --expand', async () => {
    const req = await onlyRequest([
      'jira',
      'issue-comments',
      'create',
      'K-1',
      '--body',
      body,
      '--expand',
      'renderedBody',
    ]);
    expect(req.method).toBe('POST');
    expect(query(req)).toEqual({ expand: 'renderedBody' });
    expect(req.body).toEqual(JSON.parse(body));
  });

  it('update forwards --no-notify-users, --override-editable-flag and --expand', async () => {
    const req = await onlyRequest([
      'jira',
      'issue-comments',
      'update',
      'K-1',
      '10001',
      '--body',
      body,
      '--no-notify-users',
      '--override-editable-flag',
      '--expand',
      'renderedBody',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/issue/K-1/comment/10001`);
    expect(query(req)).toEqual({
      notifyUsers: 'false',
      overrideEditableFlag: 'true',
      expand: 'renderedBody',
    });
  });

  it('update with --notify-users false sends notifyUsers=false; omission sends nothing', async () => {
    const off = await onlyRequest([
      'jira',
      'issue-comments',
      'update',
      'K-1',
      '10001',
      '--body',
      body,
      '--notify-users',
      'false',
    ]);
    expect(query(off)).toEqual({ notifyUsers: 'false' });
    const omitted = await onlyRequest([
      'jira',
      'issue-comments',
      'update',
      'K-1',
      '10001',
      '--body',
      body,
    ]);
    expect(query(omitted)).toEqual({});
  });
});

describe('F122 spec params added to priorities search, issuetype list-for-project, users get/me', () => {
  it('priorities search repeats projectId', async () => {
    const req = await onlyRequest([
      'jira',
      'priorities',
      'search',
      '--project-id',
      '10000,10001',
      '--ids',
      '1,2',
    ]);
    expect(req.path).toBe(`${JIRA}/priority/search`);
    expect(req.query.getAll('projectId')).toEqual(['10000', '10001']);
    expect(req.query.getAll('id')).toEqual(['1', '2']);
  });

  it('issuetype list-for-project forwards --level (incl. -1 via =)', async () => {
    const req = await onlyRequest([
      'jira',
      'issuetype',
      'list-for-project',
      '--project-id',
      '1',
      '--level=-1',
    ]);
    expect(req.path).toBe(`${JIRA}/issuetype/project`);
    expect(query(req)).toEqual({ projectId: '1', level: '-1' });
  });

  it('issuetype list-for-project rejects a non-integer --level', async () => {
    const run = await rejected([
      'jira',
      'issuetype',
      'list-for-project',
      '--project-id',
      '1',
      '--level',
      'epic',
    ]);
    expect(run.stderr).toContain('--level');
  });

  it('users get and me forward --expand', async () => {
    const get = await onlyRequest(['jira', 'users', 'get', 'acc-1', '--expand', 'groups']);
    expect(get.path).toBe(`${JIRA}/user`);
    expect(query(get)).toEqual({ accountId: 'acc-1', expand: 'groups' });
    const me = await onlyRequest(['jira', 'users', 'me', '--expand', 'groups,applicationRoles']);
    expect(me.path).toBe(`${JIRA}/myself`);
    expect(query(me)).toEqual({ expand: 'groups,applicationRoles' });
  });
});

describe('F124 issue-comments list validates --order-by', () => {
  it('accepts --order-by=-created', async () => {
    const req = await onlyRequest(['jira', 'issue-comments', 'list', 'K-1', '--order-by=-created']);
    expect(query(req)).toEqual({ orderBy: '-created' });
  });

  it('rejects an unknown --order-by value', async () => {
    const run = await rejected(['jira', 'issue-comments', 'list', 'K-1', '--order-by', 'updated']);
    expect(run.stderr).toContain('--order-by must be one of: created, -created, +created');
  });
});

describe('F126 issue-comments bulk-fetch refuses ids above 2^53', () => {
  it('rejects 9007199254740993 instead of sending 9007199254740992', async () => {
    const run = await rejected([
      'jira',
      'issue-comments',
      'bulk-fetch',
      '--ids',
      '9007199254740993',
    ]);
    expect(run.stderr).toContain('safe integer');
  });
});

describe('F127 priorities update allows a partial update', () => {
  it('sends only --description', async () => {
    const req = await onlyRequest(['jira', 'priorities', 'update', '3', '--description', 'D']);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/priority/3`);
    expect(req.body).toEqual({ description: 'D' });
  });

  it('sends --avatar-id', async () => {
    const req = await onlyRequest(['jira', 'priorities', 'update', '3', '--avatar-id', '7']);
    expect(req.body).toEqual({ avatarId: 7 });
  });

  it('requires at least one field', async () => {
    const run = await rejected(['jira', 'priorities', 'update', '3']);
    expect(run.stderr).toContain('at least one of');
  });
});

describe('F129 boards list-versions reaches released=false', () => {
  it.each([
    [['--released', 'false'], 'false'],
    [['--released=false'], 'false'],
    [['--no-released'], 'false'],
    [['--released'], 'true'],
    [['--released', 'true'], 'true'],
  ])('%j sends released=%s', async (flag, released) => {
    const req = await onlyRequest(['jira', 'boards', 'list-versions', '42', ...flag]);
    expect(req.path).toBe(`${AGILE}/board/42/version`);
    expect(query(req)).toEqual({ released });
  });

  it('omitting --released sends no filter', async () => {
    const req = await onlyRequest(['jira', 'boards', 'list-versions', '42']);
    expect(query(req)).toEqual({});
  });
});

describe('F131 boards list --order-by descending form', () => {
  it('--order-by=-name reaches the wire', async () => {
    const req = await onlyRequest(['jira', 'boards', 'list', '--order-by=-name']);
    expect(req.path).toBe(`${AGILE}/board`);
    expect(query(req)).toEqual({ orderBy: '-name' });
  });
});

/**
 * Construct-from-skill proof: every `atlas jira …` example in this unit's
 * skill sections runs through the real CLI and sends exactly one request.
 * `<id>` placeholders become `10001`; examples reading a local file
 * (`/path/to/…`) are covered by the F110 cases above.
 */
describe('skill examples for these resources run as written', () => {
  const SECTIONS: readonly (readonly [string, string])[] = [
    ['users.md', '## `users`'],
    ['metadata.md', '## `issue-types` / `priorities` / `statuses`'],
    ['metadata.md', '## `issuetype`'],
    ['metadata.md', '## `statuses` (extended'],
    ['issues.md', '## `issue-comments`'],
    ['agile.md', '## `boards`'],
    ['agile.md', '## `sprints`'],
  ];

  function examples(file: string, heading: string): string[][] {
    const text = readFileSync(join(SKILL_DIR, file), 'utf8');
    const start = text.indexOf(heading);
    expect(start).toBeGreaterThanOrEqual(0);
    const next = text.indexOf('\n## ', start + heading.length);
    const section = text.slice(start, next === -1 ? undefined : next);
    return section
      .split('\n')
      .filter((line) => line.startsWith('atlas jira ') && !line.includes('/path/to'))
      .map((line) =>
        [...line.replaceAll(/<[a-z-]+>/g, '10001').matchAll(/'([^']*)'|"([^"]*)"|(\S+)/g)].map(
          (m) => (m[1] ?? m[2] ?? m[3]) as string,
        ),
      );
  }

  const rows = SECTIONS.flatMap(([file, heading]) =>
    examples(file, heading).map((argv) => [argv.join(' '), argv] as const),
  );

  it('finds the examples', () => {
    expect(rows.length).toBeGreaterThan(100);
  });

  // Spec createPriority / updatePriority: `iconUrl` was sunset on 16 Mar 2025
  // (CHANGE-1525), so an agent copying the first example must get --avatar-id.
  it('leads priorities create with --avatar-id, not the sunset --icon-url', () => {
    const create = rows.find(([label]) => label.startsWith('atlas jira priorities create'));
    expect(create?.[0]).toContain('--avatar-id');
    expect(create?.[0]).not.toContain('--icon-url');
  });

  it.each(rows)('%s', async (_label, argv) => {
    const run = await runCliWire(argv.slice(1));
    expect(run.stderr).toBe('');
    expect(run.exitCode).toBe(0);
    expect(run.requests).toHaveLength(1);
  });
});

// Compile-time: `npm run typecheck` fails if the root stops exporting the
// parameter types the new optional arguments use.
describe('new parameter types are exported from the package root', () => {
  it('match the resource method signatures', () => {
    expectTypeOf<GetUserParams>().toEqualTypeOf<
      NonNullable<Parameters<JiraClient['users']['get']>[1]>
    >();
    expectTypeOf<IssueCommentExpandParams>().toEqualTypeOf<
      NonNullable<Parameters<JiraClient['issueComments']['get']>[2]>
    >();
    expectTypeOf<UpdateIssueCommentParams>().toEqualTypeOf<
      NonNullable<Parameters<JiraClient['issueComments']['update']>[3]>
    >();
    expectTypeOf<ListIssueTypesForProjectParams>().toEqualTypeOf<
      NonNullable<Parameters<JiraClient['issueType']['listForProject']>[1]>
    >();
  });
});
