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
