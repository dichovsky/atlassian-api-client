import { describe, it, expect, beforeEach } from 'vitest';
import { FooterCommentsResource } from '../../src/confluence/resources/footer-comments.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const sampleComment = {
  id: '77777',
  status: 'current',
  title: '',
  pageId: '12345',
  version: { number: 1 },
};

const sampleChild = {
  id: 'child-1',
  status: 'current',
  parentCommentId: '77777',
  version: { number: 1 },
};

const sampleVersion = {
  number: 2,
  message: 'edit',
  minorEdit: false,
  authorId: 'acc-1',
  createdAt: '2026-05-21T00:00:00Z',
};

describe('FooterCommentsResource', () => {
  let transport: MockTransport;
  let resource: FooterCommentsResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new FooterCommentsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('issues GET /footer-comments with no query when params omitted', async () => {
      transport.respondWith({ results: [sampleComment], _links: {} });

      const result = await resource.list();

      expect(result.results).toEqual([sampleComment]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/footer-comments`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('serialises body-format, sort, cursor, limit into the query', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.list({
        'body-format': 'storage',
        sort: '-created-date',
        cursor: 'tok',
        limit: 50,
      });

      expect(transport.lastCall?.options.query).toEqual({
        'body-format': 'storage',
        sort: '-created-date',
        cursor: 'tok',
        limit: 50,
      });
    });

    it('throws ValidationError when limit is non-positive', async () => {
      await expect(resource.list({ limit: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('listAll()', () => {
    it('paginates until cursor is exhausted', async () => {
      transport
        .respondWith({
          results: [{ ...sampleComment, id: 'c1' }],
          _links: { next: '/wiki/api/v2/footer-comments?cursor=c2' },
        })
        .respondWith({
          results: [{ ...sampleComment, id: 'c2' }],
          _links: {},
        });

      const ids: string[] = [];
      for await (const c of resource.listAll()) {
        ids.push(c.id);
      }

      expect(ids).toEqual(['c1', 'c2']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({});
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'c2' });
    });

    it('passes body-format + sort + limit into the first request', async () => {
      transport.respondWith({ results: [], _links: {} });
      const iter = resource.listAll({
        'body-format': 'atlas_doc_format',
        sort: 'modified-date',
        limit: 10,
      });
      await iter.next();
      expect(transport.lastCall?.options.query).toMatchObject({
        'body-format': 'atlas_doc_format',
        sort: 'modified-date',
        limit: 10,
      });
    });

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listAll({ limit: -1 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('issues a bare request when called with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      const iter = resource.listAll();
      await iter.next();
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('issues GET /footer-comments/{id} with no query when params omitted', async () => {
      transport.respondWith(sampleComment);

      const result = await resource.get('77777');

      expect(result).toEqual(sampleComment);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/footer-comments/77777`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('serialises every include-* flag, body-format, and version', async () => {
      transport.respondWith(sampleComment);

      await resource.get('77777', {
        'body-format': 'storage',
        version: 3,
        'include-properties': true,
        'include-operations': true,
        'include-likes': true,
        'include-versions': true,
        'include-version': true,
      });

      expect(transport.lastCall?.options.query).toEqual({
        'body-format': 'storage',
        version: 3,
        'include-properties': true,
        'include-operations': true,
        'include-likes': true,
        'include-versions': true,
        'include-version': true,
      });
    });

    it('encodes the comment ID path segment', async () => {
      transport.respondWith(sampleComment);

      await resource.get('weird/id');

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/footer-comments/weird%2Fid`);
    });
  });

  // ── children ──────────────────────────────────────────────────────────────

  describe('listChildren()', () => {
    it('issues GET /footer-comments/{id}/children with all four query params', async () => {
      transport.respondWith({ results: [sampleChild], _links: {} });

      await resource.listChildren('77777', {
        'body-format': 'storage',
        sort: 'created-date',
        cursor: 'tok',
        limit: 10,
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/footer-comments/77777/children`,
      });
      expect(transport.lastCall?.options.query).toEqual({
        'body-format': 'storage',
        sort: 'created-date',
        cursor: 'tok',
        limit: 10,
      });
    });

    it('omits keys when params not supplied', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listChildren('77777');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('throws ValidationError when limit is non-positive', async () => {
      await expect(resource.listChildren('77777', { limit: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('listChildrenAll()', () => {
    it('iterates pages until _links.next is absent', async () => {
      transport
        .respondWith({
          results: [{ ...sampleChild, id: 'a' }],
          _links: { next: '/wiki/api/v2/footer-comments/77777/children?cursor=c2' },
        })
        .respondWith({ results: [{ ...sampleChild, id: 'b' }], _links: {} });

      const ids: string[] = [];
      for await (const c of resource.listChildrenAll('77777', { sort: 'created-date' })) {
        ids.push(c.id);
      }

      expect(ids).toEqual(['a', 'b']);
      expect(transport.calls[0]?.options.query).toMatchObject({ sort: 'created-date' });
    });

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listChildrenAll('77777', { limit: 0 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('passes body-format and limit into the first request', async () => {
      transport.respondWith({ results: [], _links: {} });
      const iter = resource.listChildrenAll('77777', {
        'body-format': 'storage',
        limit: 5,
      });
      await iter.next();
      expect(transport.lastCall?.options.query).toMatchObject({
        'body-format': 'storage',
        limit: 5,
      });
    });

    it('issues a bare request when called with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      const iter = resource.listChildrenAll('77777');
      await iter.next();
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── likes ────────────────────────────────────────────────────────────────

  describe('getLikeCount()', () => {
    it('issues GET /footer-comments/{id}/likes/count and returns { count }', async () => {
      transport.respondWith({ count: 5 });

      const result = await resource.getLikeCount('77777');

      expect(result).toEqual({ count: 5 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/footer-comments/77777/likes/count`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  describe('listLikeUsers()', () => {
    it('issues GET /footer-comments/{id}/likes/users with cursor + limit', async () => {
      transport.respondWith({
        results: [{ accountId: 'acc-1' }],
        _links: {},
      });

      await resource.listLikeUsers('77777', { cursor: 'tok', limit: 25 });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/footer-comments/77777/likes/users`,
      });
      expect(transport.lastCall?.options.query).toEqual({ cursor: 'tok', limit: 25 });
    });

    it('omits keys when params not supplied', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listLikeUsers('77777');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('throws ValidationError when limit is non-positive', async () => {
      await expect(resource.listLikeUsers('77777', { limit: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('listLikeUsersAll()', () => {
    it('iterates pages until _links.next is absent', async () => {
      transport
        .respondWith({
          results: [{ accountId: 'a' }],
          _links: { next: '/wiki/api/v2/footer-comments/77777/likes/users?cursor=c2' },
        })
        .respondWith({ results: [{ accountId: 'b' }], _links: {} });

      const ids: string[] = [];
      for await (const u of resource.listLikeUsersAll('77777')) {
        ids.push(u.accountId ?? '');
      }

      expect(ids).toEqual(['a', 'b']);
      expect(transport.calls).toHaveLength(2);
    });

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listLikeUsersAll('77777', { limit: -1 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('passes limit into the first request', async () => {
      transport.respondWith({ results: [], _links: {} });
      const iter = resource.listLikeUsersAll('77777', { limit: 5 });
      await iter.next();
      expect(transport.lastCall?.options.query).toMatchObject({ limit: 5 });
    });

    it('issues a bare request when called with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      const iter = resource.listLikeUsersAll('77777');
      await iter.next();
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── operations ───────────────────────────────────────────────────────────

  describe('getOperations()', () => {
    it('issues GET /footer-comments/{id}/operations', async () => {
      const payload = { operations: [{ operation: 'read', targetType: 'comment' }] };
      transport.respondWith(payload);

      const result = await resource.getOperations('77777');

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/footer-comments/77777/operations`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── versions ─────────────────────────────────────────────────────────────

  describe('listVersions()', () => {
    it('issues GET /footer-comments/{id}/versions with all four query params', async () => {
      transport.respondWith({ results: [sampleVersion], _links: {} });

      await resource.listVersions('77777', {
        'body-format': 'storage',
        sort: '-modified-date',
        cursor: 'tok',
        limit: 5,
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/footer-comments/77777/versions`,
      });
      expect(transport.lastCall?.options.query).toEqual({
        'body-format': 'storage',
        sort: '-modified-date',
        cursor: 'tok',
        limit: 5,
      });
    });

    it('omits keys when params not supplied', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listVersions('77777');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('throws ValidationError when limit is non-positive', async () => {
      await expect(resource.listVersions('77777', { limit: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('listVersionsAll()', () => {
    it('iterates pages until cursor is exhausted', async () => {
      transport
        .respondWith({
          results: [{ ...sampleVersion, number: 1 }],
          _links: { next: '/wiki/api/v2/footer-comments/77777/versions?cursor=c2' },
        })
        .respondWith({ results: [{ ...sampleVersion, number: 2 }], _links: {} });

      const numbers: number[] = [];
      for await (const v of resource.listVersionsAll('77777', { sort: 'modified-date' })) {
        numbers.push(v.number ?? -1);
      }

      expect(numbers).toEqual([1, 2]);
      expect(transport.calls[0]?.options.query).toMatchObject({ sort: 'modified-date' });
    });

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listVersionsAll('77777', { limit: -1 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('passes body-format and limit into the first request', async () => {
      transport.respondWith({ results: [], _links: {} });
      const iter = resource.listVersionsAll('77777', { 'body-format': 'storage', limit: 5 });
      await iter.next();
      expect(transport.lastCall?.options.query).toMatchObject({
        'body-format': 'storage',
        limit: 5,
      });
    });

    it('issues a bare request when called with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      const iter = resource.listVersionsAll('77777');
      await iter.next();
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  describe('getVersion()', () => {
    it('issues GET /footer-comments/{id}/versions/{version-number}', async () => {
      const detail = { number: 3, message: 'edit', authorId: 'a' };
      transport.respondWith(detail);

      const result = await resource.getVersion('77777', 3);

      expect(result).toEqual(detail);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/footer-comments/77777/versions/3`,
      });
    });

    it('encodes both path segments', async () => {
      transport.respondWith({ number: 1 });
      await resource.getVersion('a/b', 4);
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/footer-comments/a%2Fb/versions/4`);
    });

    it('rejects non-integer versionNumber', async () => {
      await expect(resource.getVersion('77777', 1.5)).rejects.toThrow(ValidationError);
    });

    it('rejects zero or negative versionNumber', async () => {
      await expect(resource.getVersion('77777', 0)).rejects.toThrow(ValidationError);
      await expect(resource.getVersion('77777', -1)).rejects.toThrow(ValidationError);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('boom'));
      await expect(resource.getVersion('77777', 1)).rejects.toThrow('boom');
    });
  });

  // ── B1059: ContentBody.view + ContentBody.raw ─────────────────────────────

  describe('B1059 — ContentBody supports view and raw representations', () => {
    it('get() returns a comment whose body includes the view representation', async () => {
      // Arrange — server returns BodySingle with view when body-format=view requested
      const commentWithView = {
        ...sampleComment,
        body: {
          view: { value: '<p>rendered</p>', representation: 'view' },
        },
      };
      transport.respondWith(commentWithView);

      // Act
      const result = await resource.get('77777', { 'body-format': 'view' });

      // Assert — ContentBody.view is now in the type (B1059 fix)
      expect(result.body?.view?.value).toBe('<p>rendered</p>');
      expect(result.body?.view?.representation).toBe('view');
    });
  });

  // ── B1059: ConfluenceVersion.number is optional ───────────────────────────

  describe('B1059 — ConfluenceVersion.number is optional', () => {
    it('list() accepts a version object without number (spec has no required fields)', async () => {
      // Arrange — server may return a version without number on some responses
      const commentNoVersionNumber = {
        ...sampleComment,
        version: { message: 'draft', createdAt: '2026-01-01T00:00:00.000Z' },
      };
      transport.respondWith({ results: [commentNoVersionNumber], _links: {} });

      // Act
      const result = await resource.list();

      // Assert — TypeScript must not error on absent version.number
      expect(result.results[0]?.version?.number).toBeUndefined();
      expect(result.results[0]?.version?.message).toBe('draft');
    });
  });
});
