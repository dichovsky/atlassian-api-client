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
    name: 'blog-posts get with include-* + body-format + status',
    argv: [
      'confluence',
      'blog-posts',
      'get',
      '99999',
      '--include-labels',
      '--include-likes',
      '--body-format',
      'atlas_doc_format',
      '--status',
      'current,draft',
      '--historical-version',
      '3',
    ],
    routes: [{ method: 'GET', path: `${P}/blogposts/99999`, body: F.blogPost }],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999` },
    expectQuery: (query) => {
      expect(query['include-labels']).toBe('true');
      expect(query['include-likes']).toBe('true');
      expect(query['body-format']).toBe('atlas_doc_format');
      expect(query['status']).toBe('current,draft');
      expect(query['version']).toBe('3');
    },
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

  // ─── comments content properties ──────────────────────────────────────
  {
    name: 'comments list-properties',
    argv: ['confluence', 'comments', 'list-properties', '77777'],
    routes: [
      {
        method: 'GET',
        path: `${P}/comments/77777/properties`,
        body: F.commentPropertyList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/comments/77777/properties` },
    expectStdout: ['"id": "cp-1"', '"key": "reviewed"'],
  },
  {
    name: 'comments list-properties with filters',
    argv: [
      'confluence',
      'comments',
      'list-properties',
      '77777',
      '--key',
      'reviewed',
      '--sort=-key',
      '--limit',
      '50',
    ],
    routes: [
      {
        method: 'GET',
        path: `${P}/comments/77777/properties`,
        body: F.commentPropertyList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/comments/77777/properties` },
    expectQuery: (query) => {
      expect(query).toMatchObject({ key: 'reviewed', sort: '-key', limit: '50' });
    },
  },
  {
    name: 'comments create-property',
    argv: [
      'confluence',
      'comments',
      'create-property',
      '77777',
      '--key',
      'reviewed',
      '--value',
      '{"yes":true}',
    ],
    routes: [
      {
        method: 'POST',
        path: `${P}/comments/77777/properties`,
        status: 201,
        body: F.commentProperty,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/comments/77777/properties` },
    expectBody: (body) => {
      expect(body).toEqual({ key: 'reviewed', value: { yes: true } });
    },
  },
  {
    name: 'comments get-property',
    argv: ['confluence', 'comments', 'get-property', '77777', '--property-id', 'cp-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/comments/77777/properties/cp-1`,
        body: F.commentProperty,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/comments/77777/properties/cp-1` },
    expectStdout: ['"id": "cp-1"'],
  },
  {
    name: 'comments update-property',
    argv: [
      'confluence',
      'comments',
      'update-property',
      '77777',
      '--property-id',
      'cp-1',
      '--key',
      'reviewed',
      '--value',
      '{"yes":false}',
      '--version-number',
      '2',
    ],
    routes: [
      {
        method: 'PUT',
        path: `${P}/comments/77777/properties/cp-1`,
        body: F.commentProperty,
      },
    ],
    expectCall: { method: 'PUT', pathname: `${P}/comments/77777/properties/cp-1` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        key: 'reviewed',
        value: { yes: false },
        version: { number: 2 },
      });
    },
  },
  {
    name: 'comments delete-property',
    argv: ['confluence', 'comments', 'delete-property', '77777', '--property-id', 'cp-1'],
    routes: [
      {
        method: 'DELETE',
        path: `${P}/comments/77777/properties/cp-1`,
        status: 204,
      },
    ],
    expectCall: { method: 'DELETE', pathname: `${P}/comments/77777/properties/cp-1` },
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
  {
    name: 'labels list-all (tenant-wide)',
    argv: [
      'confluence',
      'labels',
      'list-all',
      '--prefix',
      'global,team',
      '--label-id',
      '10,20',
      '--sort=-name',
      '--limit',
      '50',
    ],
    routes: [{ method: 'GET', path: `${P}/labels`, body: F.labelTenantList }],
    expectCall: { method: 'GET', pathname: `${P}/labels` },
    expectStdout: ['"name": "release"'],
    expectQuery: (query) => {
      expect(query.prefix).toBe('global,team');
      expect(query['label-id']).toBe('10,20');
      expect(query.sort).toBe('-name');
      expect(query.limit).toBe('50');
    },
  },
  {
    name: 'labels attachments by label id',
    argv: [
      'confluence',
      'labels',
      'attachments',
      'lbl-100',
      '--sort=-modified-date',
      '--limit',
      '5',
    ],
    routes: [
      { method: 'GET', path: `${P}/labels/lbl-100/attachments`, body: F.attachmentsByLabel },
    ],
    expectCall: { method: 'GET', pathname: `${P}/labels/lbl-100/attachments` },
    expectStdout: ['"id": "att-200"'],
    expectQuery: (query) => {
      expect(query.sort).toBe('-modified-date');
      expect(query.limit).toBe('5');
    },
  },
  {
    name: 'labels blog-posts by label id',
    argv: [
      'confluence',
      'labels',
      'blog-posts',
      'lbl-100',
      '--space-id',
      '654321,777',
      '--body-format',
      'atlas_doc_format',
      '--sort=-id',
    ],
    routes: [{ method: 'GET', path: `${P}/labels/lbl-100/blogposts`, body: F.blogPostsByLabel }],
    expectCall: { method: 'GET', pathname: `${P}/labels/lbl-100/blogposts` },
    expectStdout: ['"id": "bp-300"'],
    expectQuery: (query) => {
      expect(query['space-id']).toBe('654321,777');
      expect(query['body-format']).toBe('atlas_doc_format');
      expect(query.sort).toBe('-id');
    },
  },
  {
    name: 'labels pages by label id',
    argv: ['confluence', 'labels', 'pages', 'lbl-100', '--sort=-title', '--limit', '25'],
    routes: [{ method: 'GET', path: `${P}/labels/lbl-100/pages`, body: F.pagesByLabel }],
    expectCall: { method: 'GET', pathname: `${P}/labels/lbl-100/pages` },
    expectStdout: ['"id": "pg-400"'],
    expectQuery: (query) => {
      expect(query.sort).toBe('-title');
      expect(query.limit).toBe('25');
    },
  },

  // ─── admin-key ────────────────────────────────────────────────────────
  {
    name: 'admin-key get',
    argv: ['confluence', 'admin-key', 'get'],
    routes: [{ method: 'GET', path: `${P}/admin-key`, body: F.adminKey }],
    expectCall: { method: 'GET', pathname: `${P}/admin-key` },
    expectStdout: ['"durationInHours": 1'],
  },
  {
    name: 'admin-key create (no flags)',
    argv: ['confluence', 'admin-key', 'create'],
    routes: [{ method: 'POST', path: `${P}/admin-key`, status: 201, body: F.adminKey }],
    expectCall: { method: 'POST', pathname: `${P}/admin-key` },
    expectBody: (body) => {
      // CLI omits a body when --duration-hours is not supplied; the fetch mock
      // reports that as null/undefined.
      expect(body == null).toBe(true);
    },
  },
  {
    name: 'admin-key create --duration-hours',
    argv: ['confluence', 'admin-key', 'create', '--duration-hours', '4'],
    routes: [
      {
        method: 'POST',
        path: `${P}/admin-key`,
        status: 201,
        body: { ...F.adminKey, durationInHours: 4 },
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/admin-key` },
    expectBody: (body) => {
      expect(body).toEqual({ durationInHours: 4 });
    },
  },
  {
    name: 'admin-key delete',
    argv: ['confluence', 'admin-key', 'delete'],
    routes: [{ method: 'DELETE', path: `${P}/admin-key`, status: 204, body: undefined }],
    expectCall: { method: 'DELETE', pathname: `${P}/admin-key` },
    expectStdout: ['"deleted": true'],
  },

  // ─── content ──────────────────────────────────────────────────────────
  {
    name: 'content convert-ids-to-types (comma-separated)',
    argv: ['confluence', 'content', 'convert-ids-to-types', '--ids', '12345,67890,11111'],
    routes: [
      {
        method: 'POST',
        path: `${P}/content/convert-ids-to-types`,
        body: F.contentIdTypes,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/content/convert-ids-to-types` },
    expectBody: (body) => {
      expect(body).toEqual({ contentIds: ['12345', '67890', '11111'] });
    },
    expectStdout: ['"12345": "page"', '"67890": "inline-comment"'],
  },
  {
    name: 'content convert-ids-to-types (JSON mixed-type ids)',
    argv: ['confluence', 'content', 'convert-ids-to-types', '--ids', '["12345",67890]'],
    routes: [
      {
        method: 'POST',
        path: `${P}/content/convert-ids-to-types`,
        body: F.contentIdTypes,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/content/convert-ids-to-types` },
    expectBody: (body) => {
      expect(body).toEqual({ contentIds: ['12345', 67890] });
    },
  },

  // ─── users ────────────────────────────────────────────────────────────
  {
    name: 'users check-access-by-email',
    argv: [
      'confluence',
      'users',
      'check-access-by-email',
      '--emails',
      'member@example.com,outsider@example.com',
    ],
    routes: [
      {
        method: 'POST',
        path: `${P}/user/access/check-access-by-email`,
        body: F.checkAccessByEmail,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/user/access/check-access-by-email` },
    expectBody: (body) => {
      expect(body).toEqual({ emails: ['member@example.com', 'outsider@example.com'] });
    },
    expectStdout: ['"emailsWithoutAccess"', '"outsider@example.com"'],
  },
  {
    name: 'users invite-by-email',
    argv: [
      'confluence',
      'users',
      'invite-by-email',
      '--emails',
      'new1@example.com,new2@example.com',
    ],
    routes: [
      {
        // The endpoint is asynchronous server-side and the OpenAPI spec
        // documents `200` with `"content": {}` (no media type). Confluence
        // returns a truly empty body; the transport's json parser tolerates
        // this and yields `undefined` instead of throwing `SyntaxError`.
        method: 'POST',
        path: `${P}/user/access/invite-by-email`,
        status: 200,
        body: '',
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/user/access/invite-by-email` },
    expectBody: (body) => {
      expect(body).toEqual({ emails: ['new1@example.com', 'new2@example.com'] });
    },
    expectStdout: ['"invited": true'],
  },

  // ─── users-bulk ───────────────────────────────────────────────────────
  {
    name: 'users-bulk lookup',
    argv: ['confluence', 'users-bulk', 'lookup', '--account-ids', 'acc-1,acc-2'],
    routes: [
      {
        method: 'POST',
        path: `${P}/users-bulk`,
        body: F.bulkUsersResponse,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/users-bulk` },
    expectStdout: ['"accountId": "acc-1"', '"accountId": "acc-2"'],
    expectBody: (body) => {
      expect(body).toEqual({ accountIds: ['acc-1', 'acc-2'] });
    },
  },

  // ─── classification-levels ────────────────────────────────────────────
  {
    name: 'classification-levels list',
    argv: ['confluence', 'classification-levels', 'list'],
    routes: [
      {
        method: 'GET',
        path: `${P}/classification-levels`,
        body: [
          {
            id: 'cl-1',
            status: 'PUBLISHED',
            order: 1,
            name: 'Public',
            description: 'Anyone',
            guideline: 'No restrictions',
            color: 'GREEN',
          },
        ],
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/classification-levels` },
    expectStdout: ['"name": "Public"', '"color": "GREEN"'],
  },

  // ─── data-policies ────────────────────────────────────────────────────
  {
    name: 'data-policies get-metadata',
    argv: ['confluence', 'data-policies', 'get-metadata'],
    routes: [
      {
        method: 'GET',
        path: `${P}/data-policies/metadata`,
        body: F.dataPolicyMetadata,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/data-policies/metadata` },
    expectStdout: ['"anyContentBlocked": true'],
  },
  {
    name: 'data-policies list-spaces',
    argv: ['confluence', 'data-policies', 'list-spaces'],
    routes: [
      {
        method: 'GET',
        path: `${P}/data-policies/spaces`,
        body: F.dataPolicySpacesList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/data-policies/spaces` },
    expectStdout: ['"key": "ENG"'],
  },
  {
    name: 'data-policies list-spaces --keys --limit --sort',
    argv: [
      'confluence',
      'data-policies',
      'list-spaces',
      '--keys',
      'ENG,OPS',
      '--limit',
      '50',
      '--sort=-key',
    ],
    routes: [
      {
        method: 'GET',
        path: `${P}/data-policies/spaces`,
        body: F.dataPolicySpacesList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/data-policies/spaces` },
    expectQuery: (query) => {
      expect(query.keys).toBe('ENG,OPS');
      expect(query.limit).toBe('50');
      expect(query.sort).toBe('-key');
    },
  },

  // ─── space-permissions ────────────────────────────────────────────────
  {
    name: 'space-permissions list',
    argv: ['confluence', 'space-permissions', 'list'],
    routes: [{ method: 'GET', path: `${P}/space-permissions`, body: F.spacePermissionList }],
    expectCall: { method: 'GET', pathname: `${P}/space-permissions` },
    expectStdout: ['"displayName": "View"'],
  },
  {
    name: 'space-permissions list --limit --cursor',
    argv: ['confluence', 'space-permissions', 'list', '--limit', '50', '--cursor', 'abc'],
    routes: [{ method: 'GET', path: `${P}/space-permissions`, body: F.spacePermissionList }],
    expectCall: { method: 'GET', pathname: `${P}/space-permissions` },
    expectQuery: (query) => {
      expect(query['limit']).toBe('50');
      expect(query['cursor']).toBe('abc');
    },
  },

  // ─── space-role-mode ──────────────────────────────────────────────────
  {
    name: 'space-role-mode get',
    argv: ['confluence', 'space-role-mode', 'get'],
    routes: [{ method: 'GET', path: `${P}/space-role-mode`, body: F.spaceRoleMode }],
    expectCall: { method: 'GET', pathname: `${P}/space-role-mode` },
    expectStdout: ['"mode": "ROLES"'],
  },

  // ─── space-roles ──────────────────────────────────────────────────────
  {
    name: 'space-roles list',
    argv: ['confluence', 'space-roles', 'list'],
    routes: [{ method: 'GET', path: `${P}/space-roles`, body: F.spaceRoleList }],
    expectCall: { method: 'GET', pathname: `${P}/space-roles` },
    expectStdout: ['"name": "E2E Editor"'],
  },
  {
    name: 'space-roles list — filters',
    argv: [
      'confluence',
      'space-roles',
      'list',
      '--role-type=CUSTOM',
      '--principal-type=USER',
      '--principal-id',
      'acc-1',
      '--limit',
      '50',
      '--cursor',
      'next',
    ],
    routes: [{ method: 'GET', path: `${P}/space-roles`, body: F.spaceRoleList }],
    expectCall: { method: 'GET', pathname: `${P}/space-roles` },
    expectQuery: (query) => {
      expect(query['role-type']).toBe('CUSTOM');
      expect(query['principal-type']).toBe('USER');
      expect(query['principal-id']).toBe('acc-1');
      expect(query['limit']).toBe('50');
      expect(query['cursor']).toBe('next');
    },
  },
  {
    name: 'space-roles get',
    argv: ['confluence', 'space-roles', 'get', 'role-1'],
    routes: [{ method: 'GET', path: `${P}/space-roles/role-1`, body: F.spaceRoleDetail }],
    expectCall: { method: 'GET', pathname: `${P}/space-roles/role-1` },
    expectStdout: ['"id": "role-1"', '"base"'],
  },
  {
    name: 'space-roles create',
    argv: [
      'confluence',
      'space-roles',
      'create',
      '--name',
      'E2E Editor',
      '--description',
      'Edit pages',
      '--space-permissions',
      'read/space,write/space',
    ],
    routes: [{ method: 'POST', path: `${P}/space-roles`, status: 201, body: F.spaceRole }],
    expectCall: { method: 'POST', pathname: `${P}/space-roles` },
    expectBody: (body) => {
      expect(body).toEqual({
        name: 'E2E Editor',
        description: 'Edit pages',
        spacePermissions: ['read/space', 'write/space'],
      });
    },
  },
  {
    name: 'space-roles update',
    argv: [
      'confluence',
      'space-roles',
      'update',
      'role-1',
      '--name',
      'E2E Editor v2',
      '--description',
      'Updated',
      '--space-permissions',
      'read/space',
    ],
    routes: [
      {
        method: 'PUT',
        path: `${P}/space-roles/role-1`,
        status: 202,
        body: F.spaceRoleUpdateResponse,
      },
    ],
    expectCall: { method: 'PUT', pathname: `${P}/space-roles/role-1` },
    expectStdout: ['"taskId": "task-42"'],
    expectBody: (body) => {
      expect(body).toEqual({
        name: 'E2E Editor v2',
        description: 'Updated',
        spacePermissions: ['read/space'],
      });
    },
  },
  {
    name: 'space-roles delete',
    argv: ['confluence', 'space-roles', 'delete', 'role-1'],
    routes: [
      {
        method: 'DELETE',
        path: `${P}/space-roles/role-1`,
        status: 202,
        body: F.spaceRoleDeleteResponse,
      },
    ],
    expectCall: { method: 'DELETE', pathname: `${P}/space-roles/role-1` },
    expectStdout: ['"taskId": "task-43"'],
  },

  // ─── tasks ────────────────────────────────────────────────────────────
  {
    name: 'tasks list',
    argv: ['confluence', 'tasks', 'list'],
    routes: [{ method: 'GET', path: `${P}/tasks`, body: F.taskList }],
    expectCall: { method: 'GET', pathname: `${P}/tasks` },
    expectStdout: ['"id": "task-1"', '"status": "incomplete"'],
  },
  {
    name: 'tasks list — filters and pagination',
    argv: [
      'confluence',
      'tasks',
      'list',
      '--status',
      'incomplete',
      '--page-id',
      '12345',
      '--assigned-to',
      'acc-assignee',
      '--limit',
      '25',
      '--cursor',
      'next',
    ],
    routes: [{ method: 'GET', path: `${P}/tasks`, body: F.taskList }],
    expectCall: { method: 'GET', pathname: `${P}/tasks` },
    expectQuery: (query) => {
      expect(query.status).toBe('incomplete');
      expect(query.pageId).toBe('12345');
      expect(query.assignedTo).toBe('acc-assignee');
      expect(query.limit).toBe('25');
      expect(query.cursor).toBe('next');
    },
  },
  {
    name: 'tasks get',
    argv: ['confluence', 'tasks', 'get', 'task-1'],
    routes: [{ method: 'GET', path: `${P}/tasks/task-1`, body: F.task }],
    expectCall: { method: 'GET', pathname: `${P}/tasks/task-1` },
    expectStdout: ['"id": "task-1"', '"status": "incomplete"'],
  },
  {
    name: 'tasks update',
    argv: ['confluence', 'tasks', 'update', 'task-1', '--status', 'complete'],
    routes: [{ method: 'PUT', path: `${P}/tasks/task-1`, body: F.taskCompleted }],
    expectCall: { method: 'PUT', pathname: `${P}/tasks/task-1` },
    expectStdout: ['"status": "complete"'],
    expectBody: (body) => {
      expect(body).toEqual({ status: 'complete' });
    },
  },

  // ─── databases ────────────────────────────────────────────────────────
  {
    name: 'databases create',
    argv: ['confluence', 'databases', 'create', '--space-id', '654321', '--title', 'E2E Inventory'],
    routes: [{ method: 'POST', path: `${P}/databases`, status: 201, body: F.database }],
    expectCall: { method: 'POST', pathname: `${P}/databases` },
    expectBody: (body) => {
      expect(body).toMatchObject({ spaceId: '654321', title: 'E2E Inventory' });
    },
  },
  {
    name: 'databases create --private',
    argv: [
      'confluence',
      'databases',
      'create',
      '--space-id',
      '654321',
      '--title',
      'Secret',
      '--private',
    ],
    routes: [{ method: 'POST', path: `${P}/databases`, status: 201, body: F.database }],
    expectCall: { method: 'POST', pathname: `${P}/databases` },
    expectQuery: (query) => {
      expect(query.private).toBe('true');
    },
  },
  {
    name: 'databases get',
    argv: ['confluence', 'databases', 'get', 'db-1'],
    routes: [{ method: 'GET', path: `${P}/databases/db-1`, body: F.database }],
    expectCall: { method: 'GET', pathname: `${P}/databases/db-1` },
    expectStdout: ['"id": "db-1"'],
  },
  {
    name: 'databases get --include-properties',
    argv: ['confluence', 'databases', 'get', 'db-1', '--include-properties'],
    routes: [{ method: 'GET', path: `${P}/databases/db-1`, body: F.database }],
    expectCall: { method: 'GET', pathname: `${P}/databases/db-1` },
    expectQuery: (query) => {
      expect(query['include-properties']).toBe('true');
    },
  },
  {
    name: 'databases delete',
    argv: ['confluence', 'databases', 'delete', 'db-1'],
    routes: [{ method: 'DELETE', path: `${P}/databases/db-1`, status: 204 }],
    expectCall: { method: 'DELETE', pathname: `${P}/databases/db-1` },
    expectStdout: ['"deleted": true'],
  },
  {
    name: 'databases ancestors',
    argv: ['confluence', 'databases', 'ancestors', 'db-1', '--limit', '10'],
    routes: [
      {
        method: 'GET',
        path: `${P}/databases/db-1/ancestors`,
        body: F.databaseAncestors,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/databases/db-1/ancestors` },
    expectStdout: ['"id": "ancestor-1"'],
    expectQuery: (query) => {
      expect(query.limit).toBe('10');
    },
  },
  {
    name: 'databases descendants',
    argv: ['confluence', 'databases', 'descendants', 'db-1', '--depth', '3', '--limit', '25'],
    routes: [
      {
        method: 'GET',
        path: `${P}/databases/db-1/descendants`,
        body: F.databaseDescendants,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/databases/db-1/descendants` },
    expectStdout: ['"id": "desc-1"'],
    expectQuery: (query) => {
      expect(query.depth).toBe('3');
      expect(query.limit).toBe('25');
    },
  },
  {
    name: 'databases direct-children',
    argv: ['confluence', 'databases', 'direct-children', 'db-1', '--sort=-title'],
    routes: [
      {
        method: 'GET',
        path: `${P}/databases/db-1/direct-children`,
        body: F.databaseChildren,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/databases/db-1/direct-children` },
    expectStdout: ['"id": "child-1"'],
    expectQuery: (query) => {
      expect(query.sort).toBe('-title');
    },
  },
  {
    name: 'databases operations',
    argv: ['confluence', 'databases', 'operations', 'db-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/databases/db-1/operations`,
        body: F.databaseOperations,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/databases/db-1/operations` },
    expectStdout: ['"operation": "read"'],
  },
  {
    name: 'databases get-classification-level',
    argv: ['confluence', 'databases', 'get-classification-level', 'db-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/databases/db-1/classification-level`,
        body: F.databaseClassificationLevel,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/databases/db-1/classification-level` },
    expectStdout: ['"id": "cl-1"'],
  },
  {
    name: 'databases update-classification-level',
    argv: ['confluence', 'databases', 'update-classification-level', 'db-1', '--level-id', 'cl-1'],
    routes: [
      {
        method: 'PUT',
        path: `${P}/databases/db-1/classification-level`,
        status: 204,
      },
    ],
    expectCall: { method: 'PUT', pathname: `${P}/databases/db-1/classification-level` },
    expectStdout: ['"updated": true'],
    expectBody: (body) => {
      expect(body).toEqual({ id: 'cl-1', status: 'current' });
    },
  },
  {
    name: 'databases reset-classification-level',
    argv: ['confluence', 'databases', 'reset-classification-level', 'db-1'],
    routes: [
      {
        method: 'POST',
        path: `${P}/databases/db-1/classification-level/reset`,
        status: 204,
      },
    ],
    expectCall: {
      method: 'POST',
      pathname: `${P}/databases/db-1/classification-level/reset`,
    },
    expectStdout: ['"reset": true'],
    expectBody: (body) => {
      expect(body).toEqual({ status: 'current' });
    },
  },
  {
    name: 'databases list-properties',
    argv: ['confluence', 'databases', 'list-properties', 'db-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/databases/db-1/properties`,
        body: F.databasePropertyList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/databases/db-1/properties` },
    expectStdout: ['"id": "prop-1"', '"key": "feature-flags"'],
  },
  {
    name: 'databases create-property',
    argv: [
      'confluence',
      'databases',
      'create-property',
      'db-1',
      '--key',
      'feature-flags',
      '--value',
      '{"beta":true}',
    ],
    routes: [
      {
        method: 'POST',
        path: `${P}/databases/db-1/properties`,
        status: 201,
        body: F.databaseProperty,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/databases/db-1/properties` },
    expectBody: (body) => {
      expect(body).toEqual({ key: 'feature-flags', value: { beta: true } });
    },
  },
  {
    name: 'databases get-property',
    argv: ['confluence', 'databases', 'get-property', 'db-1', '--property-id', 'prop-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/databases/db-1/properties/prop-1`,
        body: F.databaseProperty,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/databases/db-1/properties/prop-1` },
    expectStdout: ['"id": "prop-1"'],
  },
  {
    name: 'databases update-property',
    argv: [
      'confluence',
      'databases',
      'update-property',
      'db-1',
      '--property-id',
      'prop-1',
      '--key',
      'feature-flags',
      '--value',
      '{"beta":false}',
      '--version-number',
      '4',
    ],
    routes: [
      {
        method: 'PUT',
        path: `${P}/databases/db-1/properties/prop-1`,
        body: F.databaseProperty,
      },
    ],
    expectCall: { method: 'PUT', pathname: `${P}/databases/db-1/properties/prop-1` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        key: 'feature-flags',
        value: { beta: false },
        version: { number: 4 },
      });
    },
  },
  {
    name: 'databases delete-property',
    argv: ['confluence', 'databases', 'delete-property', 'db-1', '--property-id', 'prop-1'],
    routes: [
      {
        method: 'DELETE',
        path: `${P}/databases/db-1/properties/prop-1`,
        status: 204,
      },
    ],
    expectCall: { method: 'DELETE', pathname: `${P}/databases/db-1/properties/prop-1` },
    expectStdout: ['"deleted": true'],
  },
  // ─── embeds ───────────────────────────────────────────────────────────
  {
    name: 'embeds create',
    argv: [
      'confluence',
      'embeds',
      'create',
      '--space-id',
      '654321',
      '--title',
      'E2E Embed',
      '--embed-url',
      'https://example.com/demo',
    ],
    routes: [{ method: 'POST', path: `${P}/embeds`, status: 201, body: F.embed }],
    expectCall: { method: 'POST', pathname: `${P}/embeds` },
    expectBody: (body) => {
      expect(body).toEqual({
        spaceId: '654321',
        title: 'E2E Embed',
        embedUrl: 'https://example.com/demo',
      });
    },
  },
  {
    name: 'embeds create --parent-id',
    argv: [
      'confluence',
      'embeds',
      'create',
      '--space-id',
      '654321',
      '--title',
      'Nested',
      '--parent-id',
      'parent-9',
    ],
    routes: [{ method: 'POST', path: `${P}/embeds`, status: 201, body: F.embed }],
    expectCall: { method: 'POST', pathname: `${P}/embeds` },
    expectBody: (body) => {
      expect(body).toEqual({ spaceId: '654321', title: 'Nested', parentId: 'parent-9' });
    },
  },
  {
    name: 'embeds get',
    argv: ['confluence', 'embeds', 'get', 'embed-1'],
    routes: [{ method: 'GET', path: `${P}/embeds/embed-1`, body: F.embed }],
    expectCall: { method: 'GET', pathname: `${P}/embeds/embed-1` },
    expectStdout: ['"id": "embed-1"'],
  },
  {
    name: 'embeds get --include-properties',
    argv: ['confluence', 'embeds', 'get', 'embed-1', '--include-properties'],
    routes: [{ method: 'GET', path: `${P}/embeds/embed-1`, body: F.embed }],
    expectCall: { method: 'GET', pathname: `${P}/embeds/embed-1` },
    expectQuery: (query) => {
      expect(query['include-properties']).toBe('true');
    },
  },
  {
    name: 'embeds delete',
    argv: ['confluence', 'embeds', 'delete', 'embed-1'],
    routes: [{ method: 'DELETE', path: `${P}/embeds/embed-1`, status: 204 }],
    expectCall: { method: 'DELETE', pathname: `${P}/embeds/embed-1` },
    expectStdout: ['"deleted": true'],
  },
  {
    name: 'embeds ancestors',
    argv: ['confluence', 'embeds', 'ancestors', 'embed-1', '--limit', '10'],
    routes: [{ method: 'GET', path: `${P}/embeds/embed-1/ancestors`, body: F.embedAncestors }],
    expectCall: { method: 'GET', pathname: `${P}/embeds/embed-1/ancestors` },
    expectQuery: (query) => {
      expect(query.limit).toBe('10');
    },
  },
  {
    name: 'embeds descendants',
    argv: ['confluence', 'embeds', 'descendants', 'embed-1', '--depth', '3', '--limit', '25'],
    routes: [{ method: 'GET', path: `${P}/embeds/embed-1/descendants`, body: F.embedDescendants }],
    expectCall: { method: 'GET', pathname: `${P}/embeds/embed-1/descendants` },
    expectQuery: (query) => {
      expect(query.depth).toBe('3');
      expect(query.limit).toBe('25');
    },
  },
  {
    name: 'embeds direct-children',
    argv: ['confluence', 'embeds', 'direct-children', 'embed-1', '--sort=-title'],
    routes: [{ method: 'GET', path: `${P}/embeds/embed-1/direct-children`, body: F.embedChildren }],
    expectCall: { method: 'GET', pathname: `${P}/embeds/embed-1/direct-children` },
    expectQuery: (query) => {
      expect(query.sort).toBe('-title');
    },
  },
  {
    name: 'embeds operations',
    argv: ['confluence', 'embeds', 'operations', 'embed-1'],
    routes: [{ method: 'GET', path: `${P}/embeds/embed-1/operations`, body: F.embedOperations }],
    expectCall: { method: 'GET', pathname: `${P}/embeds/embed-1/operations` },
    expectStdout: ['"operation": "read"'],
  },
  {
    name: 'embeds list-properties',
    argv: ['confluence', 'embeds', 'list-properties', 'embed-1'],
    routes: [{ method: 'GET', path: `${P}/embeds/embed-1/properties`, body: F.embedPropertyList }],
    expectCall: { method: 'GET', pathname: `${P}/embeds/embed-1/properties` },
    expectStdout: ['"id": "prop-1"', '"key": "feature-flags"'],
  },
  {
    name: 'embeds create-property',
    argv: [
      'confluence',
      'embeds',
      'create-property',
      'embed-1',
      '--key',
      'feature-flags',
      '--value',
      '{"beta":true}',
    ],
    routes: [
      {
        method: 'POST',
        path: `${P}/embeds/embed-1/properties`,
        status: 201,
        body: F.embedProperty,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/embeds/embed-1/properties` },
    expectBody: (body) => {
      expect(body).toEqual({ key: 'feature-flags', value: { beta: true } });
    },
  },
  {
    name: 'embeds get-property',
    argv: ['confluence', 'embeds', 'get-property', 'embed-1', '--property-id', 'prop-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/embeds/embed-1/properties/prop-1`,
        body: F.embedProperty,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/embeds/embed-1/properties/prop-1` },
    expectStdout: ['"id": "prop-1"'],
  },
  {
    name: 'embeds update-property',
    argv: [
      'confluence',
      'embeds',
      'update-property',
      'embed-1',
      '--property-id',
      'prop-1',
      '--key',
      'feature-flags',
      '--value',
      '{"beta":false}',
      '--version-number',
      '4',
    ],
    routes: [
      {
        method: 'PUT',
        path: `${P}/embeds/embed-1/properties/prop-1`,
        body: F.embedProperty,
      },
    ],
    expectCall: { method: 'PUT', pathname: `${P}/embeds/embed-1/properties/prop-1` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        key: 'feature-flags',
        value: { beta: false },
        version: { number: 4 },
      });
    },
  },
  {
    name: 'embeds delete-property',
    argv: ['confluence', 'embeds', 'delete-property', 'embed-1', '--property-id', 'prop-1'],
    routes: [
      {
        method: 'DELETE',
        path: `${P}/embeds/embed-1/properties/prop-1`,
        status: 204,
      },
    ],
    expectCall: { method: 'DELETE', pathname: `${P}/embeds/embed-1/properties/prop-1` },
    expectStdout: ['"deleted": true'],
  },
  // ─── folders ──────────────────────────────────────────────────────────
  {
    name: 'folders create',
    argv: ['confluence', 'folders', 'create', '--space-id', '654321', '--title', 'E2E Drafts'],
    routes: [{ method: 'POST', path: `${P}/folders`, status: 201, body: F.folder }],
    expectCall: { method: 'POST', pathname: `${P}/folders` },
    expectBody: (body) => {
      expect(body).toEqual({ spaceId: '654321', title: 'E2E Drafts' });
    },
  },
  {
    name: 'folders create --parent-id',
    argv: [
      'confluence',
      'folders',
      'create',
      '--space-id',
      '654321',
      '--title',
      'Nested',
      '--parent-id',
      'parent-9',
    ],
    routes: [{ method: 'POST', path: `${P}/folders`, status: 201, body: F.folder }],
    expectCall: { method: 'POST', pathname: `${P}/folders` },
    expectBody: (body) => {
      expect(body).toEqual({ spaceId: '654321', title: 'Nested', parentId: 'parent-9' });
    },
  },
  {
    name: 'folders get',
    argv: ['confluence', 'folders', 'get', 'folder-1'],
    routes: [{ method: 'GET', path: `${P}/folders/folder-1`, body: F.folder }],
    expectCall: { method: 'GET', pathname: `${P}/folders/folder-1` },
    expectStdout: ['"id": "folder-1"'],
  },
  {
    name: 'folders get --include-properties',
    argv: ['confluence', 'folders', 'get', 'folder-1', '--include-properties'],
    routes: [{ method: 'GET', path: `${P}/folders/folder-1`, body: F.folder }],
    expectCall: { method: 'GET', pathname: `${P}/folders/folder-1` },
    expectQuery: (query) => {
      expect(query['include-properties']).toBe('true');
    },
  },
  {
    name: 'folders delete',
    argv: ['confluence', 'folders', 'delete', 'folder-1'],
    routes: [{ method: 'DELETE', path: `${P}/folders/folder-1`, status: 204 }],
    expectCall: { method: 'DELETE', pathname: `${P}/folders/folder-1` },
    expectStdout: ['"deleted": true'],
  },
  {
    name: 'folders ancestors',
    argv: ['confluence', 'folders', 'ancestors', 'folder-1', '--limit', '10'],
    routes: [{ method: 'GET', path: `${P}/folders/folder-1/ancestors`, body: F.folderAncestors }],
    expectCall: { method: 'GET', pathname: `${P}/folders/folder-1/ancestors` },
    expectQuery: (query) => {
      expect(query.limit).toBe('10');
    },
  },
  {
    name: 'folders descendants',
    argv: ['confluence', 'folders', 'descendants', 'folder-1', '--depth', '3', '--limit', '25'],
    routes: [
      { method: 'GET', path: `${P}/folders/folder-1/descendants`, body: F.folderDescendants },
    ],
    expectCall: { method: 'GET', pathname: `${P}/folders/folder-1/descendants` },
    expectQuery: (query) => {
      expect(query.depth).toBe('3');
      expect(query.limit).toBe('25');
    },
  },
  {
    name: 'folders direct-children',
    argv: ['confluence', 'folders', 'direct-children', 'folder-1', '--sort=-title'],
    routes: [
      { method: 'GET', path: `${P}/folders/folder-1/direct-children`, body: F.folderChildren },
    ],
    expectCall: { method: 'GET', pathname: `${P}/folders/folder-1/direct-children` },
    expectQuery: (query) => {
      expect(query.sort).toBe('-title');
    },
  },
  {
    name: 'folders operations',
    argv: ['confluence', 'folders', 'operations', 'folder-1'],
    routes: [{ method: 'GET', path: `${P}/folders/folder-1/operations`, body: F.folderOperations }],
    expectCall: { method: 'GET', pathname: `${P}/folders/folder-1/operations` },
    expectStdout: ['"operation": "read"'],
  },
  {
    name: 'folders list-properties',
    argv: ['confluence', 'folders', 'list-properties', 'folder-1'],
    routes: [
      { method: 'GET', path: `${P}/folders/folder-1/properties`, body: F.folderPropertyList },
    ],
    expectCall: { method: 'GET', pathname: `${P}/folders/folder-1/properties` },
    expectStdout: ['"id": "prop-1"', '"key": "feature-flags"'],
  },
  {
    name: 'folders create-property',
    argv: [
      'confluence',
      'folders',
      'create-property',
      'folder-1',
      '--key',
      'feature-flags',
      '--value',
      '{"beta":true}',
    ],
    routes: [
      {
        method: 'POST',
        path: `${P}/folders/folder-1/properties`,
        status: 201,
        body: F.folderProperty,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/folders/folder-1/properties` },
    expectBody: (body) => {
      expect(body).toEqual({ key: 'feature-flags', value: { beta: true } });
    },
  },
  {
    name: 'folders get-property',
    argv: ['confluence', 'folders', 'get-property', 'folder-1', '--property-id', 'prop-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/folders/folder-1/properties/prop-1`,
        body: F.folderProperty,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/folders/folder-1/properties/prop-1` },
    expectStdout: ['"id": "prop-1"'],
  },
  {
    name: 'folders update-property',
    argv: [
      'confluence',
      'folders',
      'update-property',
      'folder-1',
      '--property-id',
      'prop-1',
      '--key',
      'feature-flags',
      '--value',
      '{"beta":false}',
      '--version-number',
      '4',
    ],
    routes: [
      {
        method: 'PUT',
        path: `${P}/folders/folder-1/properties/prop-1`,
        body: F.folderProperty,
      },
    ],
    expectCall: { method: 'PUT', pathname: `${P}/folders/folder-1/properties/prop-1` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        key: 'feature-flags',
        value: { beta: false },
        version: { number: 4 },
      });
    },
  },
  {
    name: 'folders delete-property',
    argv: ['confluence', 'folders', 'delete-property', 'folder-1', '--property-id', 'prop-1'],
    routes: [
      {
        method: 'DELETE',
        path: `${P}/folders/folder-1/properties/prop-1`,
        status: 204,
      },
    ],
    expectCall: { method: 'DELETE', pathname: `${P}/folders/folder-1/properties/prop-1` },
    expectStdout: ['"deleted": true'],
  },
  // ─── footer-comments ──────────────────────────────────────────────────
  {
    name: 'footer-comments list',
    argv: ['confluence', 'footer-comments', 'list', '--sort=-created-date', '--limit', '25'],
    routes: [{ method: 'GET', path: `${P}/footer-comments`, body: F.footerCommentTenantList }],
    expectCall: { method: 'GET', pathname: `${P}/footer-comments` },
    expectQuery: (query) => {
      expect(query.sort).toBe('-created-date');
      expect(query.limit).toBe('25');
    },
  },
  {
    name: 'footer-comments get',
    argv: ['confluence', 'footer-comments', 'get', '77777', '--include-likes'],
    routes: [{ method: 'GET', path: `${P}/footer-comments/77777`, body: F.footerComment }],
    expectCall: { method: 'GET', pathname: `${P}/footer-comments/77777` },
    expectQuery: (query) => {
      expect(query['include-likes']).toBe('true');
    },
  },
  {
    name: 'footer-comments update',
    argv: [
      'confluence',
      'footer-comments',
      'update',
      '77777',
      '--body',
      'Updated text',
      '--version-number',
      '2',
    ],
    routes: [{ method: 'PUT', path: `${P}/footer-comments/77777`, body: F.footerComment }],
    expectCall: { method: 'PUT', pathname: `${P}/footer-comments/77777` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        version: { number: 2 },
        body: { representation: 'storage', value: 'Updated text' },
      });
    },
  },
  {
    name: 'footer-comments children',
    argv: ['confluence', 'footer-comments', 'children', '77777'],
    routes: [
      {
        method: 'GET',
        path: `${P}/footer-comments/77777/children`,
        body: F.footerCommentChildrenList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/footer-comments/77777/children` },
    expectStdout: ['child-77778'],
  },
  {
    name: 'footer-comments likes-count',
    argv: ['confluence', 'footer-comments', 'likes-count', '77777'],
    routes: [
      {
        method: 'GET',
        path: `${P}/footer-comments/77777/likes/count`,
        body: F.footerCommentLikeCount,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/footer-comments/77777/likes/count` },
    expectStdout: ['"count": 5'],
  },
  {
    name: 'footer-comments likes-users',
    argv: ['confluence', 'footer-comments', 'likes-users', '77777', '--limit', '50'],
    routes: [
      {
        method: 'GET',
        path: `${P}/footer-comments/77777/likes/users`,
        body: F.footerCommentLikeUsers,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/footer-comments/77777/likes/users` },
    expectQuery: (query) => {
      expect(query.limit).toBe('50');
    },
  },
  {
    name: 'footer-comments operations',
    argv: ['confluence', 'footer-comments', 'operations', '77777'],
    routes: [
      {
        method: 'GET',
        path: `${P}/footer-comments/77777/operations`,
        body: F.footerCommentOperations,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/footer-comments/77777/operations` },
  },
  {
    name: 'footer-comments versions',
    argv: ['confluence', 'footer-comments', 'versions', '77777', '--sort=-modified-date'],
    routes: [
      {
        method: 'GET',
        path: `${P}/footer-comments/77777/versions`,
        body: F.footerCommentVersionsList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/footer-comments/77777/versions` },
    expectQuery: (query) => {
      expect(query.sort).toBe('-modified-date');
    },
  },
  {
    name: 'footer-comments version',
    argv: ['confluence', 'footer-comments', 'version', '77777', '--version-number', '2'],
    routes: [
      {
        method: 'GET',
        path: `${P}/footer-comments/77777/versions/2`,
        body: F.footerCommentVersionDetail,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/footer-comments/77777/versions/2` },
  },

  // ─── whiteboards ──────────────────────────────────────────────────────
  {
    name: 'whiteboards create',
    argv: ['confluence', 'whiteboards', 'create', '--space-id', '654321', '--title', 'E2E Roadmap'],
    routes: [{ method: 'POST', path: `${P}/whiteboards`, status: 201, body: F.whiteboard }],
    expectCall: { method: 'POST', pathname: `${P}/whiteboards` },
    expectBody: (body) => {
      expect(body).toMatchObject({ spaceId: '654321', title: 'E2E Roadmap' });
    },
  },
  {
    name: 'whiteboards create --private',
    argv: [
      'confluence',
      'whiteboards',
      'create',
      '--space-id',
      '654321',
      '--title',
      'Secret',
      '--private',
    ],
    routes: [{ method: 'POST', path: `${P}/whiteboards`, status: 201, body: F.whiteboard }],
    expectCall: { method: 'POST', pathname: `${P}/whiteboards` },
    expectQuery: (query) => {
      expect(query.private).toBe('true');
    },
  },
  {
    name: 'whiteboards get',
    argv: ['confluence', 'whiteboards', 'get', 'wb-1'],
    routes: [{ method: 'GET', path: `${P}/whiteboards/wb-1`, body: F.whiteboard }],
    expectCall: { method: 'GET', pathname: `${P}/whiteboards/wb-1` },
    expectStdout: ['"id": "wb-1"'],
  },
  {
    name: 'whiteboards get with --include-properties flag',
    argv: ['confluence', 'whiteboards', 'get', 'wb-1', '--include-properties'],
    routes: [{ method: 'GET', path: `${P}/whiteboards/wb-1`, body: F.whiteboard }],
    expectCall: { method: 'GET', pathname: `${P}/whiteboards/wb-1` },
    expectStdout: ['"id": "wb-1"'],
    expectQuery: (query) => {
      expect(query['include-properties']).toBe('true');
    },
  },
  {
    name: 'whiteboards get with --include-collaborators flag',
    argv: ['confluence', 'whiteboards', 'get', 'wb-1', '--include-collaborators'],
    routes: [{ method: 'GET', path: `${P}/whiteboards/wb-1`, body: F.whiteboard }],
    expectCall: { method: 'GET', pathname: `${P}/whiteboards/wb-1` },
    expectStdout: ['"id": "wb-1"'],
    expectQuery: (query) => {
      expect(query['include-collaborators']).toBe('true');
    },
  },
  {
    name: 'whiteboards get with --include-direct-children flag',
    argv: ['confluence', 'whiteboards', 'get', 'wb-1', '--include-direct-children'],
    routes: [{ method: 'GET', path: `${P}/whiteboards/wb-1`, body: F.whiteboard }],
    expectCall: { method: 'GET', pathname: `${P}/whiteboards/wb-1` },
    expectStdout: ['"id": "wb-1"'],
    expectQuery: (query) => {
      expect(query['include-direct-children']).toBe('true');
    },
  },
  {
    name: 'whiteboards get with --include-operations flag',
    argv: ['confluence', 'whiteboards', 'get', 'wb-1', '--include-operations'],
    routes: [{ method: 'GET', path: `${P}/whiteboards/wb-1`, body: F.whiteboard }],
    expectCall: { method: 'GET', pathname: `${P}/whiteboards/wb-1` },
    expectStdout: ['"id": "wb-1"'],
    expectQuery: (query) => {
      expect(query['include-operations']).toBe('true');
    },
  },
  {
    name: 'whiteboards delete',
    argv: ['confluence', 'whiteboards', 'delete', 'wb-1'],
    routes: [{ method: 'DELETE', path: `${P}/whiteboards/wb-1`, status: 204 }],
    expectCall: { method: 'DELETE', pathname: `${P}/whiteboards/wb-1` },
    expectStdout: ['"deleted": true'],
  },
  {
    name: 'whiteboards ancestors',
    argv: ['confluence', 'whiteboards', 'ancestors', 'wb-1', '--limit', '10'],
    routes: [
      {
        method: 'GET',
        path: `${P}/whiteboards/wb-1/ancestors`,
        body: F.whiteboardAncestors,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/whiteboards/wb-1/ancestors` },
    expectStdout: ['"id": "ancestor-1"'],
    expectQuery: (query) => {
      expect(query.limit).toBe('10');
    },
  },
  {
    name: 'whiteboards descendants',
    argv: ['confluence', 'whiteboards', 'descendants', 'wb-1', '--depth', '3', '--limit', '25'],
    routes: [
      {
        method: 'GET',
        path: `${P}/whiteboards/wb-1/descendants`,
        body: F.whiteboardDescendants,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/whiteboards/wb-1/descendants` },
    expectStdout: ['"id": "desc-1"'],
    expectQuery: (query) => {
      expect(query.depth).toBe('3');
      expect(query.limit).toBe('25');
    },
  },
  {
    name: 'whiteboards direct-children',
    argv: ['confluence', 'whiteboards', 'direct-children', 'wb-1', '--sort=-title'],
    routes: [
      {
        method: 'GET',
        path: `${P}/whiteboards/wb-1/direct-children`,
        body: F.whiteboardChildren,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/whiteboards/wb-1/direct-children` },
    expectStdout: ['"id": "child-1"'],
    expectQuery: (query) => {
      expect(query.sort).toBe('-title');
    },
  },
  {
    name: 'whiteboards operations',
    argv: ['confluence', 'whiteboards', 'operations', 'wb-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/whiteboards/wb-1/operations`,
        body: F.whiteboardOperations,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/whiteboards/wb-1/operations` },
    expectStdout: ['"operation": "read"'],
  },
  {
    name: 'whiteboards get-classification-level',
    argv: ['confluence', 'whiteboards', 'get-classification-level', 'wb-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/whiteboards/wb-1/classification-level`,
        body: F.whiteboardClassificationLevel,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/whiteboards/wb-1/classification-level` },
    expectStdout: ['"id": "cl-1"'],
  },
  {
    name: 'whiteboards update-classification-level',
    argv: [
      'confluence',
      'whiteboards',
      'update-classification-level',
      'wb-1',
      '--level-id',
      'cl-1',
    ],
    routes: [
      {
        method: 'PUT',
        path: `${P}/whiteboards/wb-1/classification-level`,
        status: 204,
      },
    ],
    expectCall: { method: 'PUT', pathname: `${P}/whiteboards/wb-1/classification-level` },
    expectStdout: ['"updated": true'],
    expectBody: (body) => {
      expect(body).toEqual({ id: 'cl-1', status: 'current' });
    },
  },
  {
    name: 'whiteboards reset-classification-level',
    argv: ['confluence', 'whiteboards', 'reset-classification-level', 'wb-1'],
    routes: [
      {
        method: 'POST',
        path: `${P}/whiteboards/wb-1/classification-level/reset`,
        status: 204,
      },
    ],
    expectCall: {
      method: 'POST',
      pathname: `${P}/whiteboards/wb-1/classification-level/reset`,
    },
    expectStdout: ['"reset": true'],
    expectBody: (body) => {
      expect(body).toEqual({ status: 'current' });
    },
  },
  {
    name: 'whiteboards list-properties',
    argv: ['confluence', 'whiteboards', 'list-properties', 'wb-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/whiteboards/wb-1/properties`,
        body: F.whiteboardPropertyList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/whiteboards/wb-1/properties` },
    expectStdout: ['"id": "prop-1"', '"key": "feature-flags"'],
  },
  {
    name: 'whiteboards create-property',
    argv: [
      'confluence',
      'whiteboards',
      'create-property',
      'wb-1',
      '--key',
      'feature-flags',
      '--value',
      '{"beta":true}',
    ],
    routes: [
      {
        method: 'POST',
        path: `${P}/whiteboards/wb-1/properties`,
        status: 201,
        body: F.whiteboardProperty,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/whiteboards/wb-1/properties` },
    expectBody: (body) => {
      expect(body).toEqual({ key: 'feature-flags', value: { beta: true } });
    },
  },
  {
    name: 'whiteboards get-property',
    argv: ['confluence', 'whiteboards', 'get-property', 'wb-1', '--property-id', 'prop-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/whiteboards/wb-1/properties/prop-1`,
        body: F.whiteboardProperty,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/whiteboards/wb-1/properties/prop-1` },
    expectStdout: ['"id": "prop-1"'],
  },
  {
    name: 'whiteboards update-property',
    argv: [
      'confluence',
      'whiteboards',
      'update-property',
      'wb-1',
      '--property-id',
      'prop-1',
      '--key',
      'feature-flags',
      '--value',
      '{"beta":false}',
      '--version-number',
      '4',
    ],
    routes: [
      {
        method: 'PUT',
        path: `${P}/whiteboards/wb-1/properties/prop-1`,
        body: F.whiteboardProperty,
      },
    ],
    expectCall: { method: 'PUT', pathname: `${P}/whiteboards/wb-1/properties/prop-1` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        key: 'feature-flags',
        value: { beta: false },
        version: { number: 4 },
      });
    },
  },
  {
    name: 'whiteboards delete-property',
    argv: ['confluence', 'whiteboards', 'delete-property', 'wb-1', '--property-id', 'prop-1'],
    routes: [
      {
        method: 'DELETE',
        path: `${P}/whiteboards/wb-1/properties/prop-1`,
        status: 204,
      },
    ],
    expectCall: { method: 'DELETE', pathname: `${P}/whiteboards/wb-1/properties/prop-1` },
    expectStdout: ['"deleted": true'],
  },
  // ─── blog-posts sub-resources (B066-B084) ─────────────────────────────────
  {
    name: 'blog-posts list-properties',
    argv: ['confluence', 'blog-posts', 'list-properties', '99999', '--sort=key', '--limit', '10'],
    routes: [
      { method: 'GET', path: `${P}/blogposts/99999/properties`, body: F.blogPostPropertyList },
    ],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999/properties` },
    expectQuery: (query) => {
      expect(query.sort).toBe('key');
      expect(query.limit).toBe('10');
    },
  },
  {
    name: 'blog-posts create-property',
    argv: [
      'confluence',
      'blog-posts',
      'create-property',
      '99999',
      '--key',
      'reviewed',
      '--value',
      'true',
    ],
    routes: [
      {
        method: 'POST',
        path: `${P}/blogposts/99999/properties`,
        status: 201,
        body: F.blogPostProperty,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/blogposts/99999/properties` },
    expectBody: (body) => {
      expect(body).toMatchObject({ key: 'reviewed', value: true });
    },
  },
  {
    name: 'blog-posts get-property',
    argv: ['confluence', 'blog-posts', 'get-property', '99999', '--property-id', 'bp-prop-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/blogposts/99999/properties/bp-prop-1`,
        body: F.blogPostProperty,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999/properties/bp-prop-1` },
  },
  {
    name: 'blog-posts update-property',
    argv: [
      'confluence',
      'blog-posts',
      'update-property',
      '99999',
      '--property-id',
      'bp-prop-1',
      '--key',
      'reviewed',
      '--value',
      'false',
      '--version-number',
      '2',
    ],
    routes: [
      {
        method: 'PUT',
        path: `${P}/blogposts/99999/properties/bp-prop-1`,
        body: F.blogPostProperty,
      },
    ],
    expectCall: { method: 'PUT', pathname: `${P}/blogposts/99999/properties/bp-prop-1` },
    expectBody: (body) => {
      expect(body).toMatchObject({ key: 'reviewed', value: false, version: { number: 2 } });
    },
  },
  {
    name: 'blog-posts delete-property',
    argv: ['confluence', 'blog-posts', 'delete-property', '99999', '--property-id', 'bp-prop-1'],
    routes: [
      {
        method: 'DELETE',
        path: `${P}/blogposts/99999/properties/bp-prop-1`,
        status: 204,
      },
    ],
    expectCall: { method: 'DELETE', pathname: `${P}/blogposts/99999/properties/bp-prop-1` },
    expectStdout: ['"deleted": true'],
  },
  {
    name: 'blog-posts attachments',
    argv: [
      'confluence',
      'blog-posts',
      'attachments',
      '99999',
      '--media-type',
      'image/png',
      '--sort=-created-date',
    ],
    routes: [
      {
        method: 'GET',
        path: `${P}/blogposts/99999/attachments`,
        body: F.blogPostAttachmentsList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999/attachments` },
    expectQuery: (query) => {
      expect(query.mediaType).toBe('image/png');
      expect(query.sort).toBe('-created-date');
    },
  },
  {
    name: 'blog-posts attachments with --status',
    argv: ['confluence', 'blog-posts', 'attachments', '99999', '--status', 'current,archived'],
    routes: [
      {
        method: 'GET',
        path: `${P}/blogposts/99999/attachments`,
        body: F.blogPostAttachmentsList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999/attachments` },
    expectQuery: (query) => {
      expect(query.status).toBe('current,archived');
    },
  },
  {
    name: 'blog-posts get-classification-level',
    argv: ['confluence', 'blog-posts', 'get-classification-level', '99999'],
    routes: [
      {
        method: 'GET',
        path: `${P}/blogposts/99999/classification-level`,
        body: F.blogPostClassificationLevel,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999/classification-level` },
  },
  {
    name: 'blog-posts update-classification-level',
    argv: [
      'confluence',
      'blog-posts',
      'update-classification-level',
      '99999',
      '--level-id',
      'cl-restricted',
    ],
    routes: [{ method: 'PUT', path: `${P}/blogposts/99999/classification-level`, status: 204 }],
    expectCall: { method: 'PUT', pathname: `${P}/blogposts/99999/classification-level` },
    expectBody: (body) => {
      expect(body).toMatchObject({ id: 'cl-restricted', status: 'current' });
    },
    expectStdout: ['"updated": true'],
  },
  {
    name: 'blog-posts reset-classification-level',
    argv: ['confluence', 'blog-posts', 'reset-classification-level', '99999'],
    routes: [
      {
        method: 'POST',
        path: `${P}/blogposts/99999/classification-level/reset`,
        status: 204,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/blogposts/99999/classification-level/reset` },
    expectStdout: ['"reset": true'],
  },
  {
    name: 'blog-posts custom-content',
    argv: [
      'confluence',
      'blog-posts',
      'custom-content',
      '99999',
      '--type',
      'ai.atlassian.collection',
    ],
    routes: [
      {
        method: 'GET',
        path: `${P}/blogposts/99999/custom-content`,
        body: F.blogPostCustomContentList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999/custom-content` },
    expectQuery: (query) => {
      expect(query.type).toBe('ai.atlassian.collection');
    },
  },
  {
    name: 'blog-posts footer-comments',
    argv: ['confluence', 'blog-posts', 'footer-comments', '99999', '--sort=-created-date'],
    routes: [
      {
        method: 'GET',
        path: `${P}/blogposts/99999/footer-comments`,
        body: F.blogPostFooterCommentList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999/footer-comments` },
    expectQuery: (query) => {
      expect(query.sort).toBe('-created-date');
    },
  },
  {
    name: 'blog-posts inline-comments',
    argv: ['confluence', 'blog-posts', 'inline-comments', '99999', '--resolution-status', 'open'],
    routes: [
      {
        method: 'GET',
        path: `${P}/blogposts/99999/inline-comments`,
        body: F.blogPostInlineCommentList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999/inline-comments` },
    expectQuery: (query) => {
      expect(query['resolution-status']).toBe('open');
    },
  },
  {
    name: 'blog-posts labels',
    argv: ['confluence', 'blog-posts', 'labels', '99999', '--prefix', 'global'],
    routes: [{ method: 'GET', path: `${P}/blogposts/99999/labels`, body: F.blogPostLabelsList }],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999/labels` },
    expectQuery: (query) => {
      expect(query.prefix).toBe('global');
    },
  },
  {
    name: 'blog-posts likes-count',
    argv: ['confluence', 'blog-posts', 'likes-count', '99999'],
    routes: [
      { method: 'GET', path: `${P}/blogposts/99999/likes/count`, body: F.blogPostLikeCount },
    ],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999/likes/count` },
    expectStdout: ['"count": 9'],
  },
  {
    name: 'blog-posts likes-users',
    argv: ['confluence', 'blog-posts', 'likes-users', '99999', '--limit', '50'],
    routes: [
      { method: 'GET', path: `${P}/blogposts/99999/likes/users`, body: F.blogPostLikeUsers },
    ],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999/likes/users` },
    expectQuery: (query) => {
      expect(query.limit).toBe('50');
    },
  },
  {
    name: 'blog-posts operations',
    argv: ['confluence', 'blog-posts', 'operations', '99999'],
    routes: [
      { method: 'GET', path: `${P}/blogposts/99999/operations`, body: F.blogPostOperations },
    ],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999/operations` },
  },
  {
    name: 'blog-posts redact',
    argv: [
      'confluence',
      'blog-posts',
      'redact',
      '99999',
      '--value',
      '{"createdAt":"2026-01-01T00:00:00Z","body":{"redactions":[{"pointer":"/body/0/0","from":0,"to":4,"reason":"PII"}]}}',
    ],
    routes: [
      {
        method: 'POST',
        path: `${P}/blogposts/99999/redact`,
        status: 202,
        body: F.blogPostRedactResponse,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/blogposts/99999/redact` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        createdAt: '2026-01-01T00:00:00Z',
        body: { redactions: [{ pointer: '/body/0/0', from: 0, to: 4, reason: 'PII' }] },
      });
    },
  },
  {
    name: 'blog-posts redact with --created-at + --clean-history convenience overrides',
    argv: [
      'confluence',
      'blog-posts',
      'redact',
      '99999',
      '--value',
      '{"body":{"redactions":[]}}',
      '--created-at',
      '2026-05-22T12:00:00Z',
      '--clean-history',
    ],
    routes: [
      {
        method: 'POST',
        path: `${P}/blogposts/99999/redact`,
        status: 202,
        body: F.blogPostRedactResponse,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/blogposts/99999/redact` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        createdAt: '2026-05-22T12:00:00Z',
        cleanHistory: true,
        body: { redactions: [] },
      });
    },
  },
  {
    name: 'blog-posts versions',
    argv: ['confluence', 'blog-posts', 'versions', '99999', '--sort=-modified-date'],
    routes: [
      { method: 'GET', path: `${P}/blogposts/99999/versions`, body: F.blogPostVersionsList },
    ],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999/versions` },
    expectQuery: (query) => {
      expect(query.sort).toBe('-modified-date');
    },
  },
  {
    name: 'blog-posts version',
    argv: ['confluence', 'blog-posts', 'version', '99999', '--version-number', '2'],
    routes: [
      {
        method: 'GET',
        path: `${P}/blogposts/99999/versions/2`,
        body: F.blogPostVersionDetail,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/blogposts/99999/versions/2` },
  },

  // ─── custom-content (B094-B108) ──────────────────────────────────────
  {
    name: 'custom-content list',
    argv: [
      'confluence',
      'custom-content',
      'list',
      '--type',
      'ai.atlassian.collection',
      '--limit',
      '10',
    ],
    routes: [{ method: 'GET', path: `${P}/custom-content`, body: F.customContentList }],
    expectCall: { method: 'GET', pathname: `${P}/custom-content` },
    expectQuery: (query) => {
      expect(query.type).toBe('ai.atlassian.collection');
      expect(query.limit).toBe('10');
    },
  },
  {
    name: 'custom-content get',
    argv: ['confluence', 'custom-content', 'get', 'cc-1'],
    routes: [{ method: 'GET', path: `${P}/custom-content/cc-1`, body: F.customContentItem }],
    expectCall: { method: 'GET', pathname: `${P}/custom-content/cc-1` },
    expectStdout: ['"id": "cc-1"'],
  },
  {
    name: 'custom-content create',
    argv: [
      'confluence',
      'custom-content',
      'create',
      '--type',
      'ai.atlassian.collection',
      '--space-id',
      '654321',
      '--title',
      'New CC',
      '--body',
      '<p>hi</p>',
    ],
    routes: [
      { method: 'POST', path: `${P}/custom-content`, status: 201, body: F.customContentItem },
    ],
    expectCall: { method: 'POST', pathname: `${P}/custom-content` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        type: 'ai.atlassian.collection',
        spaceId: '654321',
        title: 'New CC',
        body: { representation: 'storage', value: '<p>hi</p>' },
      });
    },
  },
  {
    name: 'custom-content update',
    argv: [
      'confluence',
      'custom-content',
      'update',
      'cc-1',
      '--type',
      'ai.atlassian.collection',
      '--version-number',
      '2',
      '--title',
      'Renamed',
      '--body',
      '<p>updated</p>',
    ],
    routes: [{ method: 'PUT', path: `${P}/custom-content/cc-1`, body: F.customContentItem }],
    expectCall: { method: 'PUT', pathname: `${P}/custom-content/cc-1` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        id: 'cc-1',
        type: 'ai.atlassian.collection',
        status: 'current',
        title: 'Renamed',
        body: { representation: 'storage', value: '<p>updated</p>' },
        version: { number: 2 },
      });
    },
  },
  {
    name: 'custom-content delete',
    argv: ['confluence', 'custom-content', 'delete', 'cc-1'],
    routes: [{ method: 'DELETE', path: `${P}/custom-content/cc-1`, status: 204 }],
    expectCall: { method: 'DELETE', pathname: `${P}/custom-content/cc-1` },
    expectStdout: ['"deleted": true'],
  },
  {
    name: 'custom-content list-properties',
    argv: [
      'confluence',
      'custom-content',
      'list-properties',
      'cc-1',
      '--key',
      'reviewed',
      '--sort=key',
    ],
    routes: [
      {
        method: 'GET',
        path: `${P}/custom-content/cc-1/properties`,
        body: F.customContentPropertyList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/custom-content/cc-1/properties` },
    expectQuery: (query) => {
      expect(query.key).toBe('reviewed');
      expect(query.sort).toBe('key');
    },
  },
  {
    name: 'custom-content create-property',
    argv: [
      'confluence',
      'custom-content',
      'create-property',
      'cc-1',
      '--key',
      'reviewed',
      '--value',
      'true',
    ],
    routes: [
      {
        method: 'POST',
        path: `${P}/custom-content/cc-1/properties`,
        status: 201,
        body: F.customContentProperty,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/custom-content/cc-1/properties` },
    expectBody: (body) => {
      expect(body).toMatchObject({ key: 'reviewed', value: true });
    },
  },
  {
    name: 'custom-content get-property',
    argv: ['confluence', 'custom-content', 'get-property', 'cc-1', '--property-id', 'cc-prop-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/custom-content/cc-1/properties/cc-prop-1`,
        body: F.customContentProperty,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/custom-content/cc-1/properties/cc-prop-1` },
  },
  {
    name: 'custom-content update-property',
    argv: [
      'confluence',
      'custom-content',
      'update-property',
      'cc-1',
      '--property-id',
      'cc-prop-1',
      '--key',
      'reviewed',
      '--value',
      'false',
      '--version-number',
      '2',
    ],
    routes: [
      {
        method: 'PUT',
        path: `${P}/custom-content/cc-1/properties/cc-prop-1`,
        body: F.customContentProperty,
      },
    ],
    expectCall: { method: 'PUT', pathname: `${P}/custom-content/cc-1/properties/cc-prop-1` },
    expectBody: (body) => {
      expect(body).toMatchObject({ key: 'reviewed', value: false, version: { number: 2 } });
    },
  },
  {
    name: 'custom-content delete-property',
    argv: ['confluence', 'custom-content', 'delete-property', 'cc-1', '--property-id', 'cc-prop-1'],
    routes: [
      {
        method: 'DELETE',
        path: `${P}/custom-content/cc-1/properties/cc-prop-1`,
        status: 204,
      },
    ],
    expectCall: { method: 'DELETE', pathname: `${P}/custom-content/cc-1/properties/cc-prop-1` },
    expectStdout: ['"deleted": true'],
  },
  {
    name: 'custom-content versions',
    argv: ['confluence', 'custom-content', 'versions', 'cc-1', '--sort=-modified-date'],
    routes: [
      {
        method: 'GET',
        path: `${P}/custom-content/cc-1/versions`,
        body: F.customContentVersionsList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/custom-content/cc-1/versions` },
    expectQuery: (query) => {
      expect(query.sort).toBe('-modified-date');
    },
  },
  {
    name: 'custom-content version',
    argv: ['confluence', 'custom-content', 'version', 'cc-1', '--version-number', '2'],
    routes: [
      {
        method: 'GET',
        path: `${P}/custom-content/cc-1/versions/2`,
        body: F.customContentVersionDetail,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/custom-content/cc-1/versions/2` },
  },
  {
    name: 'custom-content attachments',
    argv: ['confluence', 'custom-content', 'attachments', 'cc-1', '--media-type', 'image/png'],
    routes: [
      {
        method: 'GET',
        path: `${P}/custom-content/cc-1/attachments`,
        body: F.customContentAttachmentsList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/custom-content/cc-1/attachments` },
    expectQuery: (query) => {
      expect(query.mediaType).toBe('image/png');
    },
  },
  {
    name: 'custom-content children',
    argv: ['confluence', 'custom-content', 'children', 'cc-1', '--limit', '50'],
    routes: [
      {
        method: 'GET',
        path: `${P}/custom-content/cc-1/children`,
        body: F.customContentChildrenList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/custom-content/cc-1/children` },
    expectQuery: (query) => {
      expect(query.limit).toBe('50');
    },
  },
  {
    name: 'custom-content footer-comments',
    argv: ['confluence', 'custom-content', 'footer-comments', 'cc-1', '--sort=-created-date'],
    routes: [
      {
        method: 'GET',
        path: `${P}/custom-content/cc-1/footer-comments`,
        body: F.customContentFooterCommentList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/custom-content/cc-1/footer-comments` },
    expectQuery: (query) => {
      expect(query.sort).toBe('-created-date');
    },
  },
  {
    name: 'custom-content labels',
    argv: ['confluence', 'custom-content', 'labels', 'cc-1', '--prefix', 'global'],
    routes: [
      {
        method: 'GET',
        path: `${P}/custom-content/cc-1/labels`,
        body: F.customContentLabelsList,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/custom-content/cc-1/labels` },
    expectQuery: (query) => {
      expect(query.prefix).toBe('global');
    },
  },
  {
    name: 'custom-content operations',
    argv: ['confluence', 'custom-content', 'operations', 'cc-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/custom-content/cc-1/operations`,
        body: F.customContentOperations,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/custom-content/cc-1/operations` },
  },

  // ─── pages sub-resources (B170-B188 + B895 + B893) ────────────────────────
  {
    name: 'pages ancestors',
    argv: ['confluence', 'pages', 'ancestors', '12345', '--limit', '25'],
    routes: [{ method: 'GET', path: `${P}/pages/12345/ancestors`, body: F.pageAncestors }],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/ancestors` },
    expectQuery: (query) => {
      expect(query.limit).toBe('25');
    },
  },
  {
    name: 'pages descendants',
    argv: ['confluence', 'pages', 'descendants', '12345', '--limit', '50', '--depth', '3'],
    routes: [{ method: 'GET', path: `${P}/pages/12345/descendants`, body: F.pageDescendants }],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/descendants` },
    expectQuery: (query) => {
      expect(query).toMatchObject({ limit: '50', depth: '3' });
    },
  },
  {
    name: 'pages direct-children with --sort=-modified-date',
    argv: ['confluence', 'pages', 'direct-children', '12345', '--sort=-modified-date'],
    routes: [
      { method: 'GET', path: `${P}/pages/12345/direct-children`, body: F.pageDirectChildren },
    ],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/direct-children` },
    expectQuery: (query) => {
      expect(query.sort).toBe('-modified-date');
    },
  },
  {
    name: 'pages children with --sort=-child-position',
    argv: ['confluence', 'pages', 'children', '12345', '--sort=-child-position', '--limit', '10'],
    routes: [{ method: 'GET', path: `${P}/pages/12345/children`, body: F.pageChildren }],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/children` },
    expectQuery: (query) => {
      expect(query).toMatchObject({ sort: '-child-position', limit: '10' });
    },
  },
  {
    name: 'pages get-classification-level',
    argv: ['confluence', 'pages', 'get-classification-level', '12345'],
    routes: [
      {
        method: 'GET',
        path: `${P}/pages/12345/classification-level`,
        body: F.pageClassificationLevel,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/classification-level` },
  },
  {
    name: 'pages update-classification-level',
    argv: ['confluence', 'pages', 'update-classification-level', '12345', '--level-id', 'cl-1'],
    routes: [{ method: 'PUT', path: `${P}/pages/12345/classification-level`, status: 204 }],
    expectCall: { method: 'PUT', pathname: `${P}/pages/12345/classification-level` },
    expectBody: (body) => {
      expect(body).toEqual({ id: 'cl-1', status: 'current' });
    },
    expectStdout: ['"updated": true'],
  },
  {
    name: 'pages update-classification-level --status draft',
    argv: [
      'confluence',
      'pages',
      'update-classification-level',
      '12345',
      '--level-id',
      'cl-1',
      '--status',
      'draft',
    ],
    routes: [{ method: 'PUT', path: `${P}/pages/12345/classification-level`, status: 204 }],
    expectCall: { method: 'PUT', pathname: `${P}/pages/12345/classification-level` },
    expectBody: (body) => {
      expect(body).toEqual({ id: 'cl-1', status: 'draft' });
    },
  },
  {
    name: 'pages reset-classification-level',
    argv: ['confluence', 'pages', 'reset-classification-level', '12345'],
    routes: [{ method: 'POST', path: `${P}/pages/12345/classification-level/reset`, status: 204 }],
    expectCall: { method: 'POST', pathname: `${P}/pages/12345/classification-level/reset` },
    expectBody: (body) => {
      expect(body).toEqual({ status: 'current' });
    },
  },
  {
    name: 'pages custom-content',
    argv: ['confluence', 'pages', 'custom-content', '12345', '--type', 'ai.atlassian.collection'],
    routes: [
      { method: 'GET', path: `${P}/pages/12345/custom-content`, body: F.pageCustomContentList },
    ],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/custom-content` },
    expectQuery: (query) => {
      expect(query.type).toBe('ai.atlassian.collection');
    },
  },
  {
    name: 'pages likes-count',
    argv: ['confluence', 'pages', 'likes-count', '12345'],
    routes: [{ method: 'GET', path: `${P}/pages/12345/likes/count`, body: F.pageLikeCount }],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/likes/count` },
    expectStdout: ['"count": 7'],
  },
  {
    name: 'pages likes-users',
    argv: ['confluence', 'pages', 'likes-users', '12345', '--limit', '50'],
    routes: [{ method: 'GET', path: `${P}/pages/12345/likes/users`, body: F.pageLikeUsers }],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/likes/users` },
    expectQuery: (query) => {
      expect(query.limit).toBe('50');
    },
  },
  {
    name: 'pages operations',
    argv: ['confluence', 'pages', 'operations', '12345'],
    routes: [{ method: 'GET', path: `${P}/pages/12345/operations`, body: F.pageOperations }],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/operations` },
  },
  {
    name: 'pages redact',
    argv: [
      'confluence',
      'pages',
      'redact',
      '12345',
      '--value',
      '{"createdAt":"2026-01-01T00:00:00Z","body":{"redactions":[{"pointer":"/body/0/0","from":0,"to":4,"reason":"PII"}]}}',
    ],
    routes: [
      {
        method: 'POST',
        path: `${P}/pages/12345/redact`,
        status: 202,
        body: F.pageRedactResponse,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/pages/12345/redact` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        createdAt: '2026-01-01T00:00:00Z',
        body: { redactions: [{ pointer: '/body/0/0', from: 0, to: 4, reason: 'PII' }] },
      });
    },
  },
  {
    name: 'pages redact with --created-at + --clean-history convenience overrides',
    argv: [
      'confluence',
      'pages',
      'redact',
      '12345',
      '--value',
      '{"body":{"redactions":[]}}',
      '--created-at',
      '2026-05-22T12:00:00Z',
      '--clean-history',
    ],
    routes: [
      {
        method: 'POST',
        path: `${P}/pages/12345/redact`,
        status: 202,
        body: F.pageRedactResponse,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/pages/12345/redact` },
    expectBody: (body) => {
      expect(body).toMatchObject({
        createdAt: '2026-05-22T12:00:00Z',
        cleanHistory: true,
        body: { redactions: [] },
      });
    },
  },
  {
    name: 'pages update-title',
    argv: ['confluence', 'pages', 'update-title', '12345', '--title', 'Renamed'],
    routes: [{ method: 'PUT', path: `${P}/pages/12345/title`, body: F.page }],
    expectCall: { method: 'PUT', pathname: `${P}/pages/12345/title` },
    expectBody: (body) => {
      expect(body).toEqual({ status: 'current', title: 'Renamed' });
    },
  },
  {
    name: 'pages update-title --status draft',
    argv: [
      'confluence',
      'pages',
      'update-title',
      '12345',
      '--title',
      'Draft Title',
      '--status',
      'draft',
    ],
    routes: [{ method: 'PUT', path: `${P}/pages/12345/title`, body: F.page }],
    expectCall: { method: 'PUT', pathname: `${P}/pages/12345/title` },
    expectBody: (body) => {
      expect(body).toEqual({ status: 'draft', title: 'Draft Title' });
    },
  },
  {
    name: 'pages list-properties',
    argv: ['confluence', 'pages', 'list-properties', '12345', '--sort=key', '--limit', '10'],
    routes: [{ method: 'GET', path: `${P}/pages/12345/properties`, body: F.pagePropertyList }],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/properties` },
    expectQuery: (query) => {
      expect(query).toMatchObject({ sort: 'key', limit: '10' });
    },
  },
  {
    name: 'pages create-property',
    argv: [
      'confluence',
      'pages',
      'create-property',
      '12345',
      '--key',
      'reviewed',
      '--value',
      '{"yes":true}',
    ],
    routes: [
      {
        method: 'POST',
        path: `${P}/pages/12345/properties`,
        status: 201,
        body: F.pageProperty,
      },
    ],
    expectCall: { method: 'POST', pathname: `${P}/pages/12345/properties` },
    expectBody: (body) => {
      expect(body).toEqual({ key: 'reviewed', value: { yes: true } });
    },
  },
  {
    name: 'pages get-property',
    argv: ['confluence', 'pages', 'get-property', '12345', '--property-id', 'pg-prop-1'],
    routes: [
      {
        method: 'GET',
        path: `${P}/pages/12345/properties/pg-prop-1`,
        body: F.pageProperty,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/properties/pg-prop-1` },
  },
  {
    name: 'pages update-property',
    argv: [
      'confluence',
      'pages',
      'update-property',
      '12345',
      '--property-id',
      'pg-prop-1',
      '--key',
      'reviewed',
      '--value',
      '{"yes":false}',
      '--version-number',
      '2',
    ],
    routes: [
      {
        method: 'PUT',
        path: `${P}/pages/12345/properties/pg-prop-1`,
        body: F.pageProperty,
      },
    ],
    expectCall: { method: 'PUT', pathname: `${P}/pages/12345/properties/pg-prop-1` },
    expectBody: (body) => {
      expect(body).toEqual({
        key: 'reviewed',
        value: { yes: false },
        version: { number: 2 },
      });
    },
  },
  {
    name: 'pages delete-property',
    argv: ['confluence', 'pages', 'delete-property', '12345', '--property-id', 'pg-prop-1'],
    routes: [{ method: 'DELETE', path: `${P}/pages/12345/properties/pg-prop-1`, status: 204 }],
    expectCall: { method: 'DELETE', pathname: `${P}/pages/12345/properties/pg-prop-1` },
    expectStdout: ['"deleted": true'],
  },
  {
    name: 'pages version',
    argv: ['confluence', 'pages', 'version', '12345', '--version-number', '2'],
    routes: [
      {
        method: 'GET',
        path: `${P}/pages/12345/versions/2`,
        body: F.pageVersionDetail,
      },
    ],
    expectCall: { method: 'GET', pathname: `${P}/pages/12345/versions/2` },
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
