/**
 * Release 4.1.0, unit jira-users-agile (F123, F132): a CLI → wire matrix with
 * one row per action of `users`, `issue-types`, `issuetype`, `priorities`,
 * `statuses`, `issue-comments`, `boards` and `sprints`, plus the
 * `issue-attachments` / `labels` shapes F132 names. Each row runs real argv
 * through {@link runCliWire} and pins the method, path (with encoded ids),
 * query (repeated params as arrays) and JSON body against the pinned specs.
 * The `cmd()` handler tests mock the resources, so parse-level and
 * serialization regressions only show up here.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCliWire, type WireRequest } from '../helpers/cli-wire.js';

const API = '/rest/api/3';
const AGILE = '/rest/agile/1.0';
const SOFTWARE = '/rest/software/1.0';
const ADF = { type: 'doc', version: 1, content: [] };

type Query = Record<string, string | string[]>;
/** argv after `jira`, method, path, query, JSON body (omit for none). */
type Row = readonly [readonly string[], string, string, Query, unknown?];

function queryOf(req: WireRequest): Query {
  const out: Query = {};
  for (const key of new Set(req.query.keys())) {
    const all = req.query.getAll(key);
    out[key] = all.length === 1 ? (all[0] as string) : all;
  }
  return out;
}

async function expectRow([args, method, path, query, body]: Row): Promise<void> {
  const run = await runCliWire(['jira', ...args]);
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  const req = run.requests[0] as WireRequest;
  expect(req.method).toBe(method);
  expect(req.path).toBe(path);
  expect(queryOf(req)).toEqual(query);
  expect(req.body).toEqual(body);
}

function labelled(rows: readonly Row[]): (readonly [string, Row])[] {
  return rows.map((row) => [`atlas jira ${row[0].join(' ')}`, row] as const);
}

const USERS: readonly Row[] = [
  [['users', 'get', 'acc-1'], 'GET', `${API}/user`, { accountId: 'acc-1' }],
  [['users', 'me'], 'GET', `${API}/myself`, {}],
  [
    ['users', 'search', '--query', 'jo', '--start-at', '10', '--max-results', '5'],
    'GET',
    `${API}/user/search`,
    { query: 'jo', startAt: '10', maxResults: '5' },
  ],
  [['users', 'delete', '--account-id', 'acc-1'], 'DELETE', `${API}/user`, { accountId: 'acc-1' }],
  [
    ['users', 'create', '--email-address', 'n@example.com', '--products', 'jira-software'],
    'POST',
    `${API}/user`,
    {},
    { emailAddress: 'n@example.com', products: ['jira-software'] },
  ],
  [
    ['users', 'assignable-multi-project', '--project-keys', 'A,B', '--account-id', 'acc'],
    'GET',
    `${API}/user/assignable/multiProjectSearch`,
    { accountId: 'acc', projectKeys: 'A,B' },
  ],
  [
    ['users', 'assignable', '--project', 'PROJ', '--query', 'j', '--account-type', 'atlassian,app'],
    'GET',
    `${API}/user/assignable/search`,
    { project: 'PROJ', query: 'j', accountType: ['atlassian', 'app'] },
  ],
  [
    ['users', 'bulk', '--account-ids', 'a,b', '--max-results', '2'],
    'GET',
    `${API}/user/bulk`,
    { accountId: ['a', 'b'], maxResults: '2' },
  ],
  [
    ['users', 'bulk-migration', '--key', 'k1,k2'],
    'GET',
    `${API}/user/bulk/migration`,
    { key: ['k1', 'k2'] },
  ],
  [
    ['users', 'reset-columns', '--account-id', 'a'],
    'DELETE',
    `${API}/user/columns`,
    { accountId: 'a' },
  ],
  [['users', 'get-columns'], 'GET', `${API}/user/columns`, {}],
  [
    ['users', 'set-columns', '--columns', 'summary,status'],
    'PUT',
    `${API}/user/columns`,
    {},
    { columns: ['summary', 'status'] },
  ],
  [['users', 'email', '--account-id', 'a'], 'GET', `${API}/user/email`, { accountId: 'a' }],
  [
    ['users', 'bulk-emails', '--account-ids', 'a,b'],
    'GET',
    `${API}/user/email/bulk`,
    { accountId: ['a', 'b'] },
  ],
  [['users', 'groups', '--account-id', 'a'], 'GET', `${API}/user/groups`, { accountId: 'a' }],
  [
    ['users', 'permission-search', '--permissions', 'BROWSE_PROJECTS', '--issue-key', 'K-1'],
    'GET',
    `${API}/user/permission/search`,
    { issueKey: 'K-1', permissions: 'BROWSE_PROJECTS' },
  ],
  [
    ['users', 'picker', '--query', 'j', '--exclude-account-ids', 'a,b', '--show-avatar'],
    'GET',
    `${API}/user/picker`,
    { query: 'j', showAvatar: 'true', excludeAccountIds: ['a', 'b'] },
  ],
  [
    ['users', 'list-properties', '--account-id', 'a'],
    'GET',
    `${API}/user/properties`,
    { accountId: 'a' },
  ],
  [
    ['users', 'delete-property', 'my key', '--account-id', 'a'],
    'DELETE',
    `${API}/user/properties/my%20key`,
    { accountId: 'a' },
  ],
  [
    ['users', 'get-property', 'k', '--user-key', 'uk'],
    'GET',
    `${API}/user/properties/k`,
    { userKey: 'uk' },
  ],
  [
    ['users', 'set-property', 'k', '--value', '{"a":1}', '--account-id', 'a'],
    'PUT',
    `${API}/user/properties/k`,
    { accountId: 'a' },
    { a: 1 },
  ],
  [
    ['users', 'search-query', '--query', 'is assignee of PROJ'],
    'GET',
    `${API}/user/search/query`,
    { query: 'is assignee of PROJ' },
  ],
  [
    ['users', 'search-query-key', '--query', 'is watcher of PROJ-1', '--max-results', '3'],
    'GET',
    `${API}/user/search/query/key`,
    { query: 'is watcher of PROJ-1', maxResult: '3' },
  ],
  [
    ['users', 'viewissue-search', '--issue-key', 'K-1', '--query', 'j'],
    'GET',
    `${API}/user/viewissue/search`,
    { issueKey: 'K-1', query: 'j' },
  ],
  [['users', 'list', '--expand', 'groups'], 'GET', `${API}/users`, { expand: 'groups' }],
  [['users', 'list-search', '--start-at', '0'], 'GET', `${API}/users/search`, { startAt: '0' }],
];

const METADATA: readonly Row[] = [
  [['issue-types', 'list'], 'GET', `${API}/issuetype`, {}],
  [['issue-types', 'get', '10001'], 'GET', `${API}/issuetype/10001`, {}],
  [
    ['issuetype', 'create', '--name', 'Sub', '--type', 'subtask', '--hierarchy-level=-1'],
    'POST',
    `${API}/issuetype`,
    {},
    { name: 'Sub', type: 'subtask', hierarchyLevel: -1 },
  ],
  [
    ['issuetype', 'delete', '10001', '--alternative-id', '10002'],
    'DELETE',
    `${API}/issuetype/10001`,
    { alternativeIssueTypeId: '10002' },
  ],
  [
    ['issuetype', 'update', '10001', '--avatar-id', '5'],
    'PUT',
    `${API}/issuetype/10001`,
    {},
    { avatarId: 5 },
  ],
  [['issuetype', 'list-alternatives', '10001'], 'GET', `${API}/issuetype/10001/alternatives`, {}],
  [['issuetype', 'list-properties', '10001'], 'GET', `${API}/issuetype/10001/properties`, {}],
  [
    ['issuetype', 'delete-property', '10001', 'a/b'],
    'DELETE',
    `${API}/issuetype/10001/properties/a%2Fb`,
    {},
  ],
  [['issuetype', 'get-property', '10001', 'k'], 'GET', `${API}/issuetype/10001/properties/k`, {}],
  [
    ['issuetype', 'set-property', '10001', 'k', '--value', '"v"'],
    'PUT',
    `${API}/issuetype/10001/properties/k`,
    {},
    'v',
  ],
  [
    ['issuetype', 'list-for-project', '--project-id', '10100', '--level', '1'],
    'GET',
    `${API}/issuetype/project`,
    { projectId: '10100', level: '1' },
  ],
  [['priorities', 'list'], 'GET', `${API}/priority`, {}],
  [['priorities', 'get', '3'], 'GET', `${API}/priority/3`, {}],
  [
    [
      'priorities',
      'create',
      '--name',
      'P',
      '--status-color',
      '#ABC',
      '--icon-url',
      '/images/icons/priorities/low.png',
    ],
    'POST',
    `${API}/priority`,
    {},
    { name: 'P', statusColor: '#ABC', iconUrl: '/images/icons/priorities/low.png' },
  ],
  [
    ['priorities', 'update', '3', '--status-color', '#000'],
    'PUT',
    `${API}/priority/3`,
    {},
    { statusColor: '#000' },
  ],
  [['priorities', 'delete', '3'], 'DELETE', `${API}/priority/3`, {}],
  [['priorities', 'set-default', '--id', '3'], 'PUT', `${API}/priority/default`, {}, { id: '3' }],
  [
    ['priorities', 'move', '--ids', '1,2', '--position', 'First'],
    'PUT',
    `${API}/priority/move`,
    {},
    { ids: ['1', '2'], position: 'First' },
  ],
  [
    [
      'priorities',
      'search',
      '--priority-name',
      'High',
      '--only-default',
      'false',
      '--expand',
      'schemes',
    ],
    'GET',
    `${API}/priority/search`,
    { priorityName: 'High', onlyDefault: 'false', expand: 'schemes' },
  ],
  [['statuses', 'list', '--ids', '1,2'], 'GET', `${API}/statuses`, { id: ['1', '2'] }],
  [['statuses', 'bulk-delete', '--ids', '1,2'], 'DELETE', `${API}/statuses`, { id: ['1', '2'] }],
  [
    [
      'statuses',
      'bulk-create',
      '--scope',
      '{"type":"GLOBAL"}',
      '--value',
      '[{"name":"B","statusCategory":"TODO"}]',
    ],
    'POST',
    `${API}/statuses`,
    {},
    { scope: { type: 'GLOBAL' }, statuses: [{ name: 'B', statusCategory: 'TODO' }] },
  ],
  [
    ['statuses', 'bulk-update', '--value', '[{"id":"1","name":"N","statusCategory":"DONE"}]'],
    'PUT',
    `${API}/statuses`,
    {},
    { statuses: [{ id: '1', name: 'N', statusCategory: 'DONE' }] },
  ],
  [
    ['statuses', 'get-issue-type-usages', '1', '2', '--next-page-token', 't', '--max-results', '5'],
    'GET',
    `${API}/statuses/1/project/2/issueTypeUsages`,
    { nextPageToken: 't', maxResults: '5' },
  ],
  [['statuses', 'get-project-usages', '1'], 'GET', `${API}/statuses/1/projectUsages`, {}],
  [['statuses', 'get-workflow-usages', '1'], 'GET', `${API}/statuses/1/workflowUsages`, {}],
  [['statuses', 'by-names', '--names', 'Done'], 'GET', `${API}/statuses/byNames`, { name: 'Done' }],
  [
    [
      'statuses',
      'search',
      '--project-id',
      '1',
      '--status-category',
      'DONE',
      '--include-global-statuses',
      'false',
    ],
    'GET',
    `${API}/statuses/search`,
    { projectId: '1', statusCategory: 'DONE', includeGlobalStatuses: 'false' },
  ],
];

const COMMENTS: readonly Row[] = [
  [
    [
      'issue-comments',
      'list',
      'K-1',
      '--start-at',
      '0',
      '--max-results',
      '2',
      '--order-by=-created',
    ],
    'GET',
    `${API}/issue/K-1/comment`,
    { startAt: '0', maxResults: '2', orderBy: '-created' },
  ],
  [['issue-comments', 'get', 'K-1', '10001'], 'GET', `${API}/issue/K-1/comment/10001`, {}],
  [
    [
      'issue-comments',
      'create',
      'K-1',
      '--body',
      JSON.stringify({ body: ADF, properties: [{ key: 'k', value: 1 }] }),
    ],
    'POST',
    `${API}/issue/K-1/comment`,
    {},
    { body: ADF, properties: [{ key: 'k', value: 1 }] },
  ],
  [
    [
      'issue-comments',
      'update',
      'K-1',
      '10001',
      '--body',
      JSON.stringify({ body: ADF }),
      '--notify-users',
    ],
    'PUT',
    `${API}/issue/K-1/comment/10001`,
    { notifyUsers: 'true' },
    { body: ADF },
  ],
  [['issue-comments', 'delete', 'K-1', '10001'], 'DELETE', `${API}/issue/K-1/comment/10001`, {}],
  [['issue-comments', 'list-properties', '10001'], 'GET', `${API}/comment/10001/properties`, {}],
  [
    ['issue-comments', 'get-property', '10001', 'a b'],
    'GET',
    `${API}/comment/10001/properties/a%20b`,
    {},
  ],
  [
    ['issue-comments', 'set-property', '10001', 'k', '--value', '{"x":true}'],
    'PUT',
    `${API}/comment/10001/properties/k`,
    {},
    { x: true },
  ],
  [
    ['issue-comments', 'delete-property', '10001', 'k'],
    'DELETE',
    `${API}/comment/10001/properties/k`,
    {},
  ],
  [
    ['issue-comments', 'bulk-fetch', '--ids', '1,2', '--expand', 'renderedBody'],
    'POST',
    `${API}/comment/list`,
    { expand: 'renderedBody' },
    { ids: [1, 2] },
  ],
];

const BOARDS: readonly Row[] = [
  [
    [
      'boards',
      'list',
      '--type',
      'scrum',
      '--project',
      'PROJ',
      '--project-type-location',
      'software,service_desk',
      '--include-private',
      'false',
      '--order-by=-name',
      '--filter-id',
      '9',
    ],
    'GET',
    `${AGILE}/board`,
    {
      type: 'scrum',
      projectKeyOrId: 'PROJ',
      projectTypeLocation: ['software', 'service_desk'],
      includePrivate: 'false',
      orderBy: '-name',
      filterId: '9',
    },
  ],
  [['boards', 'get', '42'], 'GET', `${AGILE}/board/42`, {}],
  [
    [
      'boards',
      'create',
      '--name',
      'B',
      '--type',
      'kanban',
      '--filter-id',
      '5',
      '--location-type',
      'user',
    ],
    'POST',
    `${AGILE}/board`,
    {},
    { name: 'B', type: 'kanban', filterId: 5, location: { type: 'user' } },
  ],
  [['boards', 'delete', '42'], 'DELETE', `${AGILE}/board/42`, {}],
  [
    ['boards', 'backlog', '42', '--fields', 'summary,status', '--validate-query', 'false'],
    'GET',
    `${AGILE}/board/42/backlog`,
    { fields: ['summary', 'status'], validateQuery: 'false' },
  ],
  [['boards', 'configuration', '42'], 'GET', `${AGILE}/board/42/configuration`, {}],
  [
    ['boards', 'list-epics', '42', '--done', 'false'],
    'GET',
    `${AGILE}/board/42/epic`,
    { done: 'false' },
  ],
  [
    ['boards', 'epic-issues', '42', '7', '--jql', 'a'],
    'GET',
    `${AGILE}/board/42/epic/7/issue`,
    { jql: 'a' },
  ],
  [['boards', 'issues-without-epic', '42'], 'GET', `${AGILE}/board/42/epic/none/issue`, {}],
  [['boards', 'get-features', '42'], 'GET', `${AGILE}/board/42/features`, {}],
  [
    ['boards', 'toggle-feature', '42', '--feature', 'SIMPLE_ROADMAP', '--enabling', 'false'],
    'PUT',
    `${AGILE}/board/42/features`,
    {},
    { boardId: 42, feature: 'SIMPLE_ROADMAP', enabling: false },
  ],
  [
    ['boards', 'get-issues', '42', '--start-at', '0'],
    'GET',
    `${AGILE}/board/42/issue`,
    { startAt: '0' },
  ],
  [
    [
      'boards',
      'move-issues',
      '42',
      '--issues',
      'K-1,K-2',
      '--before',
      'K-9',
      '--custom-field',
      '10019',
    ],
    'POST',
    `${AGILE}/board/42/issue`,
    {},
    { issues: ['K-1', 'K-2'], rankBeforeIssue: 'K-9', rankCustomFieldId: 10019 },
  ],
  [
    ['boards', 'list-projects', '42', '--max-results', '2'],
    'GET',
    `${AGILE}/board/42/project`,
    { maxResults: '2' },
  ],
  [['boards', 'list-projects-full', '42'], 'GET', `${AGILE}/board/42/project/full`, {}],
  [
    ['boards', 'list-sprints', '42', '--state', 'active,future'],
    'GET',
    `${AGILE}/board/42/sprint`,
    { state: 'active,future' },
  ],
  [
    ['boards', 'list-versions', '42', '--released', 'false'],
    'GET',
    `${AGILE}/board/42/version`,
    { released: 'false' },
  ],
  [['boards', 'sprint-issues', '42', '10'], 'GET', `${AGILE}/board/42/sprint/10/issue`, {}],
  [['boards', 'list-by-filter', '5'], 'GET', `${AGILE}/board/filter/5`, {}],
  [['boards', 'list-properties', '42'], 'GET', `${AGILE}/board/42/properties`, {}],
  [
    ['boards', 'delete-property', '42', 'a b/c'],
    'DELETE',
    `${AGILE}/board/42/properties/a%20b%2Fc`,
    {},
  ],
  [['boards', 'get-property', '42', 'k'], 'GET', `${AGILE}/board/42/properties/k`, {}],
  [
    ['boards', 'set-property', '42', 'k', '--value', '{"beta":true}'],
    'PUT',
    `${AGILE}/board/42/properties/k`,
    {},
    { beta: true },
  ],
  [['boards', 'list-quickfilters', '42'], 'GET', `${AGILE}/board/42/quickfilter`, {}],
  [['boards', 'get-quickfilter', '42', '7'], 'GET', `${AGILE}/board/42/quickfilter/7`, {}],
  [['boards', 'get-reports', '42'], 'GET', `${AGILE}/board/42/reports`, {}],
  [
    ['boards', 'backlog-enhanced', '42', '--next-page-token', 't1', '--reconcile-issues', '1,2'],
    'GET',
    `${SOFTWARE}/board/42/backlog`,
    { nextPageToken: 't1', reconcileIssues: ['1', '2'] },
  ],
  [['boards', 'get-issues-enhanced', '42'], 'GET', `${SOFTWARE}/board/42/issue`, {}],
  [
    ['boards', 'issues-without-epic-enhanced', '42'],
    'GET',
    `${SOFTWARE}/board/42/epic/none/issue`,
    {},
  ],
  [['boards', 'epic-issues-enhanced', '42', '7'], 'GET', `${SOFTWARE}/board/42/epic/7/issue`, {}],
  [
    ['boards', 'sprint-issues-enhanced', '42', '10'],
    'GET',
    `${SOFTWARE}/board/42/sprint/10/issue`,
    {},
  ],
  [
    ['boards', 'backlog-approximate-count', '42', '--jql', 'a'],
    'GET',
    `${SOFTWARE}/board/42/backlog/approximate-count`,
    { jql: 'a' },
  ],
  [
    ['boards', 'issues-approximate-count', '42', '--jql', 'a'],
    'GET',
    `${SOFTWARE}/board/42/issue/approximate-count`,
    { jql: 'a' },
  ],
];

const SPRINTS: readonly Row[] = [
  [['sprints', 'get', '42'], 'GET', `${AGILE}/sprint/42`, {}],
  [
    ['sprints', 'create', '--name', 'S', '--board-id', '1', '--goal', 'G'],
    'POST',
    `${AGILE}/sprint`,
    {},
    { name: 'S', originBoardId: 1, goal: 'G' },
  ],
  [
    ['sprints', 'update', '42', '--name', 'S', '--state', 'closed'],
    'PUT',
    `${AGILE}/sprint/42`,
    {},
    { name: 'S', state: 'closed' },
  ],
  [['sprints', 'delete', '42'], 'DELETE', `${AGILE}/sprint/42`, {}],
  [
    ['sprints', 'get-issues', '42', '--fields', 'summary', '--validate-query', 'false'],
    'GET',
    `${AGILE}/sprint/42/issue`,
    { fields: 'summary', validateQuery: 'false' },
  ],
  [
    ['sprints', 'get-issues-enhanced', '42', '--next-page-token', 't'],
    'GET',
    `${SOFTWARE}/sprint/42/issue`,
    { nextPageToken: 't' },
  ],
  [
    ['sprints', 'partial-update', '42', '--goal', 'G2'],
    'POST',
    `${AGILE}/sprint/42`,
    {},
    { goal: 'G2' },
  ],
  [
    ['sprints', 'move-issues', '42', '--issues', 'K-1', '--after', 'K-0'],
    'POST',
    `${AGILE}/sprint/42/issue`,
    {},
    { issues: ['K-1'], rankAfterIssue: 'K-0' },
  ],
  [['sprints', 'list-properties', '42'], 'GET', `${AGILE}/sprint/42/properties`, {}],
  [['sprints', 'get-property', '42', 'a b'], 'GET', `${AGILE}/sprint/42/properties/a%20b`, {}],
  [
    ['sprints', 'set-property', '42', 'k', '--value', '42'],
    'PUT',
    `${AGILE}/sprint/42/properties/k`,
    {},
    42,
  ],
  [['sprints', 'delete-property', '42', 'k'], 'DELETE', `${AGILE}/sprint/42/properties/k`, {}],
  [
    ['sprints', 'swap', '42', '--with', '99'],
    'POST',
    `${AGILE}/sprint/42/swap`,
    {},
    { sprintToSwapWith: 99 },
  ],
];

const OTHER: readonly Row[] = [
  [
    ['issue-attachments', 'download-content', '10001', '--redirect', 'false'],
    'GET',
    `${API}/attachment/content/10001`,
    { redirect: 'false' },
  ],
  [
    ['labels', 'list', '--query', 'bu', '--scope', 'RECENT_PROJECTS'],
    'GET',
    `${API}/label`,
    { query: 'bu', scope: 'RECENT_PROJECTS' },
  ],
];

describe('CLI → wire matrix (release 4.1.0 jira-users-agile)', () => {
  it.each(labelled(USERS))('%s', (_label, row) => expectRow(row));
  it.each(labelled(METADATA))('%s', (_label, row) => expectRow(row));
  it.each(labelled(COMMENTS))('%s', (_label, row) => expectRow(row));
  it.each(labelled(BOARDS))('%s', (_label, row) => expectRow(row));
  it.each(labelled(SPRINTS))('%s', (_label, row) => expectRow(row));
  it.each(labelled(OTHER))('%s', (_label, row) => expectRow(row));

  it('issue-attachments upload sends multipart FormData with X-Atlassian-Token', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'atlas-upload-'));
    try {
      const file = join(dir, 'notes.txt');
      await writeFile(file, 'hello');
      const run = await runCliWire(['jira', 'issue-attachments', 'upload', 'K-1', '--file', file]);
      expect(run.exitCode).toBe(0);
      const req = run.requests[0] as WireRequest;
      expect(req.method).toBe('POST');
      expect(req.path).toBe(`${API}/issue/K-1/attachments`);
      expect(req.headers['x-atlassian-token']).toBe('no-check');
      expect(req.headers['content-type']).toBeUndefined();
      expect(req.body).toBeInstanceOf(FormData);
      const part = (req.body as FormData).get('file') as File;
      expect(part.name).toBe('notes.txt');
      expect(await part.text()).toBe('hello');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
