import { describe, it, expect, beforeEach } from 'vitest';
import { InlineCommentsResource } from '../../src/confluence/resources/inline-comments.js';
import { ValidationError } from '../../src/core/errors.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const sampleInlineComment = {
  id: '88888',
  status: 'current',
  pageId: '12345',
  version: { number: 1 },
};

describe('InlineCommentsResource', () => {
  let transport: MockTransport;
  let resource: InlineCommentsResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new InlineCommentsResource(transport, BASE_URL);
  });

  // ── list ─────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('issues GET /inline-comments with no query when params omitted', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.list();

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/inline-comments`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('serializes body-format, sort, cursor, limit into the query', async () => {
      transport.respondWith({ results: [sampleInlineComment], _links: {} });

      const result = await resource.list({
        'body-format': 'storage',
        sort: '-created-date',
        cursor: 'c1',
        limit: 25,
      });

      expect(result.results).toEqual([sampleInlineComment]);
      expect(transport.lastCall?.options.query).toEqual({
        'body-format': 'storage',
        sort: '-created-date',
        cursor: 'c1',
        limit: 25,
      });
    });

    it('throws RangeError when limit is invalid before any request', async () => {
      await expect(resource.list({ limit: 0 })).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── listAll ──────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('iterates pages until _links.next is absent', async () => {
      transport
        .respondWith({
          results: [{ id: 'a' }, { id: 'b' }],
          _links: { next: '/wiki/api/v2/inline-comments?cursor=c2' },
        })
        .respondWith({ results: [{ id: 'c' }], _links: {} });

      const ids: string[] = [];
      for await (const c of resource.listAll({ sort: 'created-date' })) {
        ids.push(c.id);
      }

      expect(ids).toEqual(['a', 'b', 'c']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toMatchObject({ sort: 'created-date' });
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'c2' });
    });

    it('throws RangeError when limit is invalid before any request', async () => {
      const iter = resource.listAll({ limit: -1 });
      await expect(iter.next()).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });

    it('passes body-format + limit into the first request', async () => {
      transport.respondWith({ results: [], _links: {} });

      const iter = resource.listAll({ 'body-format': 'atlas_doc_format', limit: 5 });
      await iter.next();

      expect(transport.lastCall?.options.query).toMatchObject({
        'body-format': 'atlas_doc_format',
        limit: 5,
      });
    });

    it('issues a bare request when called with no params', async () => {
      transport.respondWith({ results: [], _links: {} });

      const iter = resource.listAll();
      await iter.next();

      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── listChildren ─────────────────────────────────────────────────────────

  describe('listChildren()', () => {
    it('issues GET /inline-comments/{id}/children with no query when params omitted', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.listChildren('88888');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/inline-comments/88888/children`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('serializes body-format, cursor, limit into the query', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.listChildren('88888', {
        'body-format': 'storage',
        cursor: 'c1',
        limit: 10,
      });

      expect(transport.lastCall?.options.query).toEqual({
        'body-format': 'storage',
        cursor: 'c1',
        limit: 10,
      });
    });

    it('encodes the comment ID path segment', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.listChildren('a/b c');

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/inline-comments/a%2Fb%20c/children`,
      );
    });

    it('throws RangeError when limit is invalid', async () => {
      await expect(resource.listChildren('88888', { limit: 0 })).rejects.toThrow(RangeError);
    });
  });

  describe('listChildrenAll()', () => {
    it('iterates pages until _links.next is absent', async () => {
      transport
        .respondWith({
          results: [{ id: 'r1' }],
          _links: { next: '/wiki/api/v2/inline-comments/88888/children?cursor=c2' },
        })
        .respondWith({ results: [{ id: 'r2' }], _links: {} });

      const ids: string[] = [];
      for await (const c of resource.listChildrenAll('88888', { limit: 5 })) {
        ids.push(c.id);
      }

      expect(ids).toEqual(['r1', 'r2']);
      expect(transport.calls[0]?.options.query).toMatchObject({ limit: 5 });
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'c2' });
    });

    it('throws RangeError when limit is invalid before any request', async () => {
      const iter = resource.listChildrenAll('88888', { limit: 0 });
      await expect(iter.next()).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });

    it('issues a bare request when called with no params', async () => {
      transport.respondWith({ results: [], _links: {} });

      const iter = resource.listChildrenAll('88888');
      await iter.next();

      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('passes body-format into the request query', async () => {
      transport.respondWith({ results: [], _links: {} });

      const iter = resource.listChildrenAll('88888', { 'body-format': 'storage' });
      await iter.next();

      expect(transport.lastCall?.options.query).toMatchObject({ 'body-format': 'storage' });
    });
  });

  // ── likes ────────────────────────────────────────────────────────────────

  describe('getLikesCount()', () => {
    it('issues GET /inline-comments/{id}/likes/count', async () => {
      transport.respondWith({ count: 7 });

      const result = await resource.getLikesCount('88888');

      expect(result).toEqual({ count: 7 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/inline-comments/88888/likes/count`,
      });
    });

    it('encodes the comment ID path segment', async () => {
      transport.respondWith({ count: 0 });

      await resource.getLikesCount('a/b');

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/inline-comments/a%2Fb/likes/count`,
      );
    });
  });

  describe('listLikeUsers()', () => {
    it('issues GET /inline-comments/{id}/likes/users with no query when params omitted', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.listLikeUsers('88888');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/inline-comments/88888/likes/users`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('serializes cursor + limit into the query', async () => {
      transport.respondWith({ results: [{ accountId: 'acc-1' }], _links: {} });

      const result = await resource.listLikeUsers('88888', { cursor: 'c1', limit: 50 });

      expect(result.results).toEqual([{ accountId: 'acc-1' }]);
      expect(transport.lastCall?.options.query).toEqual({ cursor: 'c1', limit: 50 });
    });

    it('throws RangeError when limit is invalid', async () => {
      await expect(resource.listLikeUsers('88888', { limit: -1 })).rejects.toThrow(RangeError);
    });
  });

  describe('listLikeUsersAll()', () => {
    it('iterates pages until _links.next is absent', async () => {
      transport
        .respondWith({
          results: [{ accountId: 'a' }],
          _links: { next: '/wiki/api/v2/inline-comments/88888/likes/users?cursor=c2' },
        })
        .respondWith({ results: [{ accountId: 'b' }], _links: {} });

      const accounts: string[] = [];
      for await (const u of resource.listLikeUsersAll('88888', { limit: 10 })) {
        accounts.push(u.accountId as string);
      }

      expect(accounts).toEqual(['a', 'b']);
      expect(transport.calls[0]?.options.query).toMatchObject({ limit: 10 });
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'c2' });
    });

    it('throws RangeError when limit is invalid before any request', async () => {
      const iter = resource.listLikeUsersAll('88888', { limit: 0 });
      await expect(iter.next()).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });

    it('issues a bare request when called with no params', async () => {
      transport.respondWith({ results: [], _links: {} });

      const iter = resource.listLikeUsersAll('88888');
      await iter.next();

      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── operations ───────────────────────────────────────────────────────────

  describe('getOperations()', () => {
    it('issues GET /inline-comments/{id}/operations', async () => {
      const payload = { operations: [{ operation: 'read', targetType: 'comment' }] };
      transport.respondWith(payload);

      const result = await resource.getOperations('88888');

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/inline-comments/88888/operations`,
      });
    });

    it('encodes the comment ID path segment', async () => {
      transport.respondWith({ operations: [] });

      await resource.getOperations('a/b');

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/inline-comments/a%2Fb/operations`);
    });
  });

  // ── versions ─────────────────────────────────────────────────────────────

  describe('listVersions()', () => {
    it('issues GET /inline-comments/{id}/versions with no query when params omitted', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.listVersions('88888');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/inline-comments/88888/versions`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('serializes cursor + limit into the query', async () => {
      transport.respondWith({ results: [{ number: 1 }], _links: {} });

      await resource.listVersions('88888', { cursor: 'c1', limit: 5 });

      expect(transport.lastCall?.options.query).toEqual({ cursor: 'c1', limit: 5 });
    });

    it('throws RangeError when limit is invalid', async () => {
      await expect(resource.listVersions('88888', { limit: 0 })).rejects.toThrow(RangeError);
    });
  });

  describe('listVersionsAll()', () => {
    it('iterates pages until _links.next is absent', async () => {
      transport
        .respondWith({
          results: [{ number: 2 }],
          _links: { next: '/wiki/api/v2/inline-comments/88888/versions?cursor=c2' },
        })
        .respondWith({ results: [{ number: 1 }], _links: {} });

      const numbers: number[] = [];
      for await (const v of resource.listVersionsAll('88888', { limit: 5 })) {
        numbers.push(v.number);
      }

      expect(numbers).toEqual([2, 1]);
      expect(transport.calls[0]?.options.query).toMatchObject({ limit: 5 });
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'c2' });
    });

    it('throws RangeError when limit is invalid before any request', async () => {
      const iter = resource.listVersionsAll('88888', { limit: -1 });
      await expect(iter.next()).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });

    it('issues a bare request when called with no params', async () => {
      transport.respondWith({ results: [], _links: {} });

      const iter = resource.listVersionsAll('88888');
      await iter.next();

      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  describe('getVersion()', () => {
    it('issues GET /inline-comments/{id}/versions/{number}', async () => {
      const payload = { number: 2, minorEdit: false };
      transport.respondWith(payload);

      const result = await resource.getVersion('88888', 2);

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/inline-comments/88888/versions/2`,
      });
    });

    it('encodes the comment ID path segment', async () => {
      transport.respondWith({ number: 1 });

      await resource.getVersion('a/b', 1);

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/inline-comments/a%2Fb/versions/1`);
    });

    it('throws ValidationError when versionNumber is not a positive integer', async () => {
      await expect(resource.getVersion('88888', 0)).rejects.toThrow(ValidationError);
      await expect(resource.getVersion('88888', -1)).rejects.toThrow(ValidationError);
      await expect(resource.getVersion('88888', 1.5)).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });
});
