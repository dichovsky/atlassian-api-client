/**
 * Full-matrix E2E coverage for `atlas jira …` commands.
 *
 * Each row drives the real `runCli` → `JiraClient` → `HttpTransport`
 * pipeline with `fetch` mocked at the bottom. Asserts on method, path,
 * auth header presence, request body (where applicable) and stdout
 * payload visibility — not on resource-internal behaviour, which is
 * covered by `test/jira/**`.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { installFetchMock, type Route, type CapturedCall } from './helpers/fetch-mock.js';
import { runAtlas, type RunResult } from './helpers/cli-runner.js';
import { jiraFixtures as F, JIRA_PREFIX as P } from './helpers/fixtures.js';

interface MatrixRow {
  name: string;
  argv: string[];
  routes: readonly Route[];
  expectCall: { method: string; pathname: string };
  expectStdout?: readonly string[];
  expectBody?: (body: unknown) => void;
  expectQuery?: (query: Record<string, string>) => void;
}

const HAPPY_EXIT = 0;

afterEach(() => {
  vi.unstubAllGlobals();
});

const matrix: readonly MatrixRow[] = [
  // ─── issues ───────────────────────────────────────────────────────────
  {
    name: 'issues get',
    argv: ['jira', 'issues', 'get', 'PROJ-1'],
    routes: [{ method: 'GET', path: `${P}/issue/PROJ-1`, body: F.issue }],
    expectCall: { method: 'GET', pathname: `${P}/issue/PROJ-1` },
    expectStdout: ['"key": "PROJ-1"'],
  },
  {
    name: 'issues create',
    argv: [
      'jira',
      'issues',
      'create',
      '--project',
      'PROJ',
      '--type',
      'Task',
      '--summary',
      'E2E test issue',
    ],
    routes: [{ method: 'POST', path: `${P}/issue`, status: 201, body: F.issueCreated }],
    expectCall: { method: 'POST', pathname: `${P}/issue` },
    expectStdout: ['"key": "PROJ-1"'],
    expectBody: (body) => {
      expect(body).toMatchObject({
        fields: {
          project: { key: 'PROJ' },
          issuetype: { name: 'Task' },
          summary: 'E2E test issue',
        },
      });
    },
  },
  {
    name: 'issues update',
    argv: ['jira', 'issues', 'update', 'PROJ-1', '--summary', 'Renamed'],
    routes: [{ method: 'PUT', path: `${P}/issue/PROJ-1`, status: 204 }],
    expectCall: { method: 'PUT', pathname: `${P}/issue/PROJ-1` },
    expectStdout: ['"updated": true'],
    expectBody: (body) => {
      expect(body).toMatchObject({ fields: { summary: 'Renamed' } });
    },
  },
  {
    name: 'issues delete',
    argv: ['jira', 'issues', 'delete', 'PROJ-1'],
    routes: [{ method: 'DELETE', path: `${P}/issue/PROJ-1`, status: 204 }],
    expectCall: { method: 'DELETE', pathname: `${P}/issue/PROJ-1` },
    expectStdout: ['"deleted": true'],
  },
  {
    name: 'issues transition',
    argv: ['jira', 'issues', 'transition', 'PROJ-1', '--transition-id', '11'],
    routes: [{ method: 'POST', path: `${P}/issue/PROJ-1/transitions`, status: 204 }],
    expectCall: { method: 'POST', pathname: `${P}/issue/PROJ-1/transitions` },
    expectStdout: ['"transitioned": true'],
    expectBody: (body) => {
      expect(body).toMatchObject({ transition: { id: '11' } });
    },
  },
  {
    name: 'issues transitions',
    argv: ['jira', 'issues', 'transitions', 'PROJ-1'],
    routes: [{ method: 'GET', path: `${P}/issue/PROJ-1/transitions`, body: F.transitionList }],
    expectCall: { method: 'GET', pathname: `${P}/issue/PROJ-1/transitions` },
    expectStdout: ['"name": "Start Progress"'],
  },

  // ─── projects ─────────────────────────────────────────────────────────
  {
    name: 'projects list',
    argv: ['jira', 'projects', 'list', '--max-results', '25'],
    routes: [
      {
        method: 'GET',
        path: `${P}/project/search`,
        body: { values: F.projectList, isLast: true, startAt: 0, maxResults: 25 },
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/project/search` },
    expectStdout: ['"key": "PROJ"'],
  },
  {
    name: 'projects get',
    argv: ['jira', 'projects', 'get', 'PROJ'],
    routes: [{ method: 'GET', path: `${P}/project/PROJ`, body: F.project }],
    expectCall: { method: 'GET', pathname: `${P}/project/PROJ` },
    expectStdout: ['"key": "PROJ"'],
  },

  // ─── search ───────────────────────────────────────────────────────────
  {
    name: 'search (POST /search)',
    argv: ['jira', 'search', 'search', '--jql', 'project = PROJ', '--max-results', '50'],
    routes: [{ method: 'POST', path: `${P}/search`, body: F.searchResult }],
    expectCall: { method: 'POST', pathname: `${P}/search` },
    expectStdout: ['"key": "PROJ-1"'],
    expectBody: (body) => {
      expect(body).toMatchObject({ jql: 'project = PROJ', maxResults: 50 });
    },
  },

  // ─── users ────────────────────────────────────────────────────────────
  {
    name: 'users get',
    argv: ['jira', 'users', 'get', 'acct-001'],
    routes: [{ method: 'GET', path: `${P}/user`, body: F.user }],
    expectCall: { method: 'GET', pathname: `${P}/user` },
    expectStdout: ['"accountId": "acct-001"'],
    expectQuery: (query) => {
      expect(query.accountId).toBe('acct-001');
    },
  },
  {
    name: 'users me',
    argv: ['jira', 'users', 'me'],
    routes: [{ method: 'GET', path: `${P}/myself`, body: F.user }],
    expectCall: { method: 'GET', pathname: `${P}/myself` },
    expectStdout: ['"accountId": "acct-001"'],
  },
  {
    name: 'users search',
    argv: ['jira', 'users', 'search', '--query', 'cli'],
    routes: [{ method: 'GET', path: `${P}/user/search`, body: F.userList }],
    expectCall: { method: 'GET', pathname: `${P}/user/search` },
    expectStdout: ['"accountId": "acct-001"'],
    expectQuery: (query) => {
      expect(query.query).toBe('cli');
    },
  },

  // ─── issue-types ──────────────────────────────────────────────────────
  {
    name: 'issue-types list',
    argv: ['jira', 'issue-types', 'list'],
    routes: [{ method: 'GET', path: `${P}/issuetype`, body: F.issueTypeList }],
    expectCall: { method: 'GET', pathname: `${P}/issuetype` },
    expectStdout: ['"name": "Task"'],
  },
  {
    name: 'issue-types get',
    argv: ['jira', 'issue-types', 'get', '10000'],
    routes: [{ method: 'GET', path: `${P}/issuetype/10000`, body: F.issueType }],
    expectCall: { method: 'GET', pathname: `${P}/issuetype/10000` },
    expectStdout: ['"name": "Task"'],
  },

  // ─── priorities ───────────────────────────────────────────────────────
  {
    name: 'priorities list',
    argv: ['jira', 'priorities', 'list'],
    routes: [{ method: 'GET', path: `${P}/priority`, body: F.priorityList }],
    expectCall: { method: 'GET', pathname: `${P}/priority` },
    expectStdout: ['"name": "Medium"'],
  },
  {
    name: 'priorities get',
    argv: ['jira', 'priorities', 'get', '3'],
    routes: [{ method: 'GET', path: `${P}/priority/3`, body: F.priority }],
    expectCall: { method: 'GET', pathname: `${P}/priority/3` },
    expectStdout: ['"name": "Medium"'],
  },

  // ─── statuses ─────────────────────────────────────────────────────────
  {
    name: 'statuses list',
    argv: ['jira', 'statuses', 'list'],
    routes: [{ method: 'GET', path: `${P}/statuses`, body: F.statusList }],
    expectCall: { method: 'GET', pathname: `${P}/statuses` },
    expectStdout: ['"name": "To Do"'],
  },
];

function findFirstApiCall(calls: readonly CapturedCall[]): CapturedCall {
  const apiCall = calls.find((c) => c.pathname.startsWith(P));
  if (!apiCall) throw new Error('No Jira API call captured');
  return apiCall;
}

describe('atlas jira — full action matrix', () => {
  it.each(matrix)('$name', async (row) => {
    const handle = installFetchMock(row.routes);

    const result: RunResult = await runAtlas(row.argv);

    expect(result.code).toBe(HAPPY_EXIT);
    expect(result.stderr).toBe('');

    const call = findFirstApiCall(handle.calls);
    expect(call.method).toBe(row.expectCall.method);
    expect(call.pathname).toBe(row.expectCall.pathname);
    expect(call.headers['authorization']).toMatch(/^Basic /);

    if (row.expectBody) row.expectBody(call.body);
    if (row.expectQuery) row.expectQuery(call.query);

    for (const needle of row.expectStdout ?? []) {
      expect(result.stdout).toContain(needle);
    }
  });
});
