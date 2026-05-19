/**
 * Full-matrix E2E coverage for `atlas confluence …` commands.
 *
 * Each row drives the real `runCli` → `ConfluenceClient` → `HttpTransport`
 * pipeline with `fetch` mocked at the bottom. The aim is to prove that
 * every shipped CLI verb still produces the expected HTTP method, path,
 * and serialized output — not to retest resource-level invariants, which
 * live in `test/confluence/**`.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { installFetchMock, type Route, type CapturedCall } from './helpers/fetch-mock.js';
import { runAtlas, type RunResult } from './helpers/cli-runner.js';
import { confluenceFixtures as F, CONFLUENCE_PREFIX as P } from './helpers/fixtures.js';

interface MatrixRow {
  name: string;
  argv: string[];
  routes: readonly Route[];
  /** Method + pathname pair the SDK is expected to hit (first call). */
  expectCall: { method: string; pathname: string };
  /** Optional substring(s) that must appear in stdout JSON. */
  expectStdout?: readonly string[];
  /** Optional assertion on the captured request body. */
  expectBody?: (body: unknown) => void;
  /** Optional assertion on the captured request querystring. */
  expectQuery?: (query: Record<string, string>) => void;
}

const HAPPY_EXIT = 0;

afterEach(() => {
  vi.unstubAllGlobals();
});

const matrix: readonly MatrixRow[] = [
  // ─── pages ────────────────────────────────────────────────────────────
  {
    name: 'pages list',
    argv: ['confluence', 'pages', 'list', '--limit', '10'],
    routes: [{ method: 'GET', path: `${P}/pages`, body: F.pageList }],
    expectCall: { method: 'GET', pathname: `${P}/pages` },
    expectStdout: ['E2E Test Page'],
    expectQuery: (query) => {
      expect(query.limit).toBe('10');
    },
  },
  {
    name: 'pages get',
    argv: ['confluence', 'pages', 'get', '12345'],
    routes: [{ method: 'GET', path: `${P}/pages/12345`, body: F.page }],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345` },
    expectStdout: ['"id": "12345"'],
  },
  {
    name: 'pages create',
    argv: [
      'confluence',
      'pages',
      'create',
      '--space-id',
      '654321',
      '--title',
      'New Page',
      '--body',
      '<p>hi</p>',
    ],
    routes: [{ method: 'POST', path: `${P}/pages`, status: 201, body: F.page }],
    expectCall: { method: 'POST', pathname: `${P}/pages` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        spaceId: '654321',
        title: 'New Page',
        body: { representation: 'storage', value: '<p>hi</p>' },
      });
    },
  },
  {
    name: 'pages update',
    argv: [
      'confluence',
      'pages',
      'update',
      '12345',
      '--title',
      'Renamed',
      '--version-number',
      '2',
      '--body',
      '<p>v2</p>',
    ],
    routes: [{ method: 'PUT', path: `${P}/pages/12345`, body: F.page }],
    expectCall: { method: 'PUT', pathname: `${P}/pages/12345` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        id: '12345',
        title: 'Renamed',
        status: 'current',
        version: { number: 2 },
        body: { representation: 'storage', value: '<p>v2</p>' },
      });
    },
  },
  {
    name: 'pages delete',
    argv: ['confluence', 'pages', 'delete', '12345'],
    routes: [{ method: 'DELETE', path: `${P}/pages/12345`, status: 204 }],
    expectCall: { method: 'DELETE', pathname: `${P}/pages/12345` },
    expectStdout: ['"deleted": true'],
  },
  {
    name: 'pages delete --purge',
    argv: ['confluence', 'pages', 'delete', '12345', '--purge'],
    routes: [{ method: 'DELETE', path: `${P}/pages/12345`, status: 204 }],
    expectCall: { method: 'DELETE', pathname: `${P}/pages/12345` },
    expectStdout: ['"deleted": true'],
  },

  // ─── spaces ───────────────────────────────────────────────────────────
  {
    name: 'spaces list',
    argv: ['confluence', 'spaces', 'list'],
    routes: [{ method: 'GET', path: `${P}/spaces`, body: F.spaceList }],
    expectCall: { method: 'GET', pathname: `${P}/spaces` },
    expectStdout: ['"key": "E2E"'],
  },
  {
    name: 'spaces get',
    argv: ['confluence', 'spaces', 'get', '654321'],
    routes: [{ method: 'GET', path: `${P}/spaces/654321`, body: F.space }],
    expectCall: { method: 'GET', pathname: `${P}/spaces/654321` },
    expectStdout: ['"id": "654321"'],
  },

  // ─── blog-posts ───────────────────────────────────────────────────────
  {
    name: 'blog-posts list',
    argv: ['confluence', 'blog-posts', 'list', '--space-id', '654321'],
    routes: [{ method: 'GET', path: `${P}/blogposts`, body: F.blogPostList }],
    expectCall: { method: 'GET', pathname: `${P}/blogposts` },
    expectStdout: ['"id": "99999"'],
  },
  {
    name: 'blog-posts get',
    argv: ['confluence', 'blog-posts', 'get', '99999'],
    routes: [{ method: 'GET', path: `${P}/blogposts/99999`, body: F.blogPost }],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999` },
    expectStdout: ['"id": "99999"'],
  },
  {
    name: 'blog-posts create',
    argv: [
      'confluence',
      'blog-posts',
      'create',
      '--space-id',
      '654321',
      '--title',
      'Hello',
      '--body',
      '<p>hi</p>',
    ],
    routes: [{ method: 'POST', path: `${P}/blogposts`, status: 201, body: F.blogPost }],
    expectCall: { method: 'POST', pathname: `${P}/blogposts` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        spaceId: '654321',
        title: 'Hello',
        body: { representation: 'storage', value: '<p>hi</p>' },
      });
    },
  },
  {
    name: 'blog-posts update',
    argv: [
      'confluence',
      'blog-posts',
      'update',
      '99999',
      '--title',
      'Renamed',
      '--version-number',
      '2',
    ],
    routes: [{ method: 'PUT', path: `${P}/blogposts/99999`, body: F.blogPost }],
    expectCall: { method: 'PUT', pathname: `${P}/blogposts/99999` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        id: '99999',
        title: 'Renamed',
        status: 'current',
        version: { number: 2 },
      });
    },
  },
  {
    name: 'blog-posts delete',
    argv: ['confluence', 'blog-posts', 'delete', '99999'],
    routes: [{ method: 'DELETE', path: `${P}/blogposts/99999`, status: 204 }],
    expectCall: { method: 'DELETE', pathname: `${P}/blogposts/99999` },
    expectStdout: ['"deleted": true'],
  },

  // ─── comments (footer default) ────────────────────────────────────────
  {
    name: 'comments list (footer default)',
    argv: ['confluence', 'comments', 'list', '--page-id', '12345'],
    routes: [
      {
        method: 'GET',
        path: `${P}/pages/12345/footer-comments`,
        body: F.footerCommentList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/footer-comments` },
    expectStdout: ['"id": "77777"'],
  },
  {
    name: 'comments get (footer)',
    argv: ['confluence', 'comments', 'get', '77777'],
    routes: [{ method: 'GET', path: `${P}/footer-comments/77777`, body: F.footerComment }],
    expectCall: { method: 'GET', pathname: `${P}/footer-comments/77777` },
    expectStdout: ['"id": "77777"'],
  },
  {
    name: 'comments create (footer)',
    argv: ['confluence', 'comments', 'create', '--page-id', '12345', '--body', 'hello'],
    routes: [{ method: 'POST', path: `${P}/footer-comments`, status: 201, body: F.footerComment }],
    expectCall: { method: 'POST', pathname: `${P}/footer-comments` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        pageId: '12345',
        body: { representation: 'storage', value: 'hello' },
      });
    },
  },
  {
    name: 'comments delete (footer)',
    argv: ['confluence', 'comments', 'delete', '77777'],
    routes: [{ method: 'DELETE', path: `${P}/footer-comments/77777`, status: 204 }],
    expectCall: { method: 'DELETE', pathname: `${P}/footer-comments/77777` },
    expectStdout: ['"deleted": true'],
  },

  // ─── comments (inline) ────────────────────────────────────────────────
  {
    name: 'comments list (inline)',
    argv: ['confluence', 'comments', 'list', '--page-id', '12345', '--comment-type', 'inline'],
    routes: [
      {
        method: 'GET',
        path: `${P}/pages/12345/inline-comments`,
        body: F.inlineCommentList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/inline-comments` },
    expectStdout: ['"id": "88888"'],
  },
  {
    name: 'comments get (inline)',
    argv: ['confluence', 'comments', 'get', '88888', '--comment-type', 'inline'],
    routes: [{ method: 'GET', path: `${P}/inline-comments/88888`, body: F.inlineComment }],
    expectCall: { method: 'GET', pathname: `${P}/inline-comments/88888` },
    expectStdout: ['"id": "88888"'],
  },
  {
    name: 'comments create (inline)',
    argv: [
      'confluence',
      'comments',
      'create',
      '--page-id',
      '12345',
      '--body',
      'inline hi',
      '--comment-type',
      'inline',
    ],
    routes: [{ method: 'POST', path: `${P}/inline-comments`, status: 201, body: F.inlineComment }],
    expectCall: { method: 'POST', pathname: `${P}/inline-comments` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        pageId: '12345',
        body: { representation: 'storage', value: 'inline hi' },
      });
    },
  },
  {
    name: 'comments delete (inline)',
    argv: ['confluence', 'comments', 'delete', '88888', '--comment-type', 'inline'],
    routes: [{ method: 'DELETE', path: `${P}/inline-comments/88888`, status: 204 }],
    expectCall: { method: 'DELETE', pathname: `${P}/inline-comments/88888` },
    expectStdout: ['"deleted": true'],
  },

  // ─── attachments ──────────────────────────────────────────────────────
  {
    name: 'attachments list',
    argv: ['confluence', 'attachments', 'list', '--page-id', '12345'],
    routes: [
      {
        method: 'GET',
        path: `${P}/pages/12345/attachments`,
        body: F.attachmentList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/attachments` },
    expectStdout: ['"id": "att-1"'],
  },
  {
    name: 'attachments get',
    argv: ['confluence', 'attachments', 'get', 'att-1'],
    routes: [{ method: 'GET', path: `${P}/attachments/att-1`, body: F.attachment }],
    expectCall: { method: 'GET', pathname: `${P}/attachments/att-1` },
    expectStdout: ['"id": "att-1"'],
  },
  {
    name: 'attachments delete',
    argv: ['confluence', 'attachments', 'delete', 'att-1'],
    routes: [{ method: 'DELETE', path: `${P}/attachments/att-1`, status: 204 }],
    expectCall: { method: 'DELETE', pathname: `${P}/attachments/att-1` },
    expectStdout: ['"deleted": true'],
  },

  // ─── labels ───────────────────────────────────────────────────────────
  {
    name: 'labels list',
    argv: ['confluence', 'labels', 'list', '--page-id', '12345'],
    routes: [{ method: 'GET', path: `${P}/pages/12345/labels`, body: F.labelList }],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/labels` },
    expectStdout: ['"name": "production"'],
  },
];

function findFirstApiCall(calls: readonly CapturedCall[]): CapturedCall {
  const apiCall = calls.find((c) => c.pathname.startsWith(P));
  if (!apiCall) throw new Error('No Confluence API call captured');
  return apiCall;
}

describe('atlas confluence — full action matrix', () => {
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
