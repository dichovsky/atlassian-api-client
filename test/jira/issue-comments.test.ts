import { describe, it, expect, beforeEach } from 'vitest';
import { IssueCommentsResource } from '../../src/jira/resources/issue-comments.js';
import { ValidationError } from '../../src/core/errors.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeComment = (id: string) => ({
  id,
  self: `${BASE_URL}/issue/PROJ-1/comment/${id}`,
  body: { type: 'doc', version: 1, content: [] },
  created: '2024-01-01T00:00:00.000Z',
  updated: '2024-01-01T00:00:00.000Z',
});

const makeListResponse = (comments: ReturnType<typeof makeComment>[]) => ({
  comments,
  startAt: 0,
  maxResults: 50,
  total: comments.length,
});

describe('IssueCommentsResource', () => {
  let transport: MockTransport;
  let resource: IssueCommentsResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new IssueCommentsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /issue/{key}/comment', async () => {
      // Arrange
      const payload = makeListResponse([makeComment('1001')]);
      transport.respondWith(payload);

      // Act
      const result = await resource.list('PROJ-1');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/comment`,
      });
    });

    it('passes pagination params as query', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await resource.list('PROJ-1', { startAt: 10, maxResults: 25 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('passes orderBy and expand params', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await resource.list('PROJ-1', { orderBy: '-created', expand: 'renderedBody' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        orderBy: '-created',
        expand: 'renderedBody',
      });
    });

    it('omits optional params when not provided', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await resource.list('PROJ-1');

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['startAt']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
    });

    it('throws ValidationError when maxResults is invalid', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act + Assert
      await expect(resource.list('PROJ-1', { maxResults: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /issue/{key}/comment/{id}', async () => {
      // Arrange
      const comment = makeComment('1001');
      transport.respondWith(comment);

      // Act
      const result = await resource.get('PROJ-1', '1001');

      // Assert
      expect(result).toEqual(comment);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/comment/1001`,
      });
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /issue/{key}/comment with body', async () => {
      // Arrange
      const comment = makeComment('1002');
      transport.respondWith(comment);
      const data = { body: { type: 'doc', version: 1, content: [] } };

      // Act
      const result = await resource.create('PROJ-1', data);

      // Assert
      expect(result).toEqual(comment);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/PROJ-1/comment`,
        body: data,
      });
    });

    it('includes visibility when provided', async () => {
      // Arrange
      transport.respondWith(makeComment('1003'));
      const data = {
        body: { type: 'doc', version: 1, content: [] },
        visibility: { type: 'role' as const, value: 'Administrators' },
      };

      // Act
      await resource.create('PROJ-1', data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        visibility: { type: 'role', value: 'Administrators' },
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /issue/{key}/comment/{id} with updated body', async () => {
      // Arrange
      const updated = makeComment('1001');
      transport.respondWith(updated);
      const data = { body: { type: 'doc', version: 1, content: [] } };

      // Act
      const result = await resource.update('PROJ-1', '1001', data);

      // Assert
      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issue/PROJ-1/comment/1001`,
        body: data,
      });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /issue/{key}/comment/{id}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await resource.delete('PROJ-1', '1001');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/PROJ-1/comment/1001`,
      });
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes issueIdOrKey in list()', async () => {
      transport.respondWith({ comments: [], startAt: 0, maxResults: 50, total: 0 });
      await resource.list('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/..%2Fadmin/comment`);
    });

    it('encodes issueIdOrKey and commentId in get()', async () => {
      transport.respondWith(makeComment('x'));
      await resource.get('../admin', '../cid');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/issue/..%2Fadmin/comment/..%2Fcid`,
      );
    });

    it('encodes issueIdOrKey in create()', async () => {
      transport.respondWith(makeComment('x'));
      await resource.create('../admin', { body: {} });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/..%2Fadmin/comment`);
    });

    it('encodes issueIdOrKey and commentId in update()', async () => {
      transport.respondWith(makeComment('x'));
      await resource.update('../admin', '../cid', { body: {} });
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/issue/..%2Fadmin/comment/..%2Fcid`,
      );
    });

    it('encodes issueIdOrKey and commentId in delete()', async () => {
      transport.respondWith(undefined);
      await resource.delete('../admin', '../cid');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/issue/..%2Fadmin/comment/..%2Fcid`,
      );
    });
  });

  // ── listProperties (B356) ─────────────────────────────────────────────────

  describe('listProperties()', () => {
    it('calls GET /comment/{commentId}/properties', async () => {
      // Arrange
      const payload = {
        keys: [{ self: `${BASE_URL}/comment/1001/properties/foo`, key: 'foo' }],
      };
      transport.respondWith(payload);

      // Act
      const result = await resource.listProperties('1001');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/comment/1001/properties`,
      });
    });

    it('encodes commentId', async () => {
      transport.respondWith({ keys: [] });
      await resource.listProperties('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/comment/..%2Fadmin/properties`);
    });

    it('throws ValidationError when commentId is empty', async () => {
      await expect(resource.listProperties('')).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── getProperty (B358) ────────────────────────────────────────────────────

  describe('getProperty()', () => {
    it('calls GET /comment/{commentId}/properties/{propertyKey}', async () => {
      // Arrange
      const payload = { key: 'foo', value: { nested: true } };
      transport.respondWith(payload);

      // Act
      const result = await resource.getProperty('1001', 'foo');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/comment/1001/properties/foo`,
      });
    });

    it('encodes commentId and propertyKey', async () => {
      transport.respondWith({ key: 'x', value: null });
      await resource.getProperty('../admin', '../key');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/comment/..%2Fadmin/properties/..%2Fkey`,
      );
    });

    it('throws ValidationError when commentId is empty', async () => {
      await expect(resource.getProperty('', 'foo')).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when propertyKey is empty', async () => {
      await expect(resource.getProperty('1001', '')).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── setProperty (B359) ────────────────────────────────────────────────────

  describe('setProperty()', () => {
    it('calls PUT /comment/{commentId}/properties/{propertyKey} with raw value body', async () => {
      // Arrange
      transport.respondWith(undefined);
      const value = { nested: { flag: true } };

      // Act
      await resource.setProperty('1001', 'foo', value);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/comment/1001/properties/foo`,
        body: value,
      });
    });

    it('accepts primitive value (string)', async () => {
      transport.respondWith(undefined);
      await resource.setProperty('1001', 'foo', 'plain');
      expect(transport.lastCall?.options.body).toBe('plain');
    });

    it('encodes commentId and propertyKey', async () => {
      transport.respondWith(undefined);
      await resource.setProperty('../admin', '../key', {});
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/comment/..%2Fadmin/properties/..%2Fkey`,
      );
    });

    it('throws ValidationError when commentId is empty', async () => {
      await expect(resource.setProperty('', 'foo', 1)).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when propertyKey is empty', async () => {
      await expect(resource.setProperty('1001', '', 1)).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── deleteProperty (B357) ─────────────────────────────────────────────────

  describe('deleteProperty()', () => {
    it('calls DELETE /comment/{commentId}/properties/{propertyKey}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await resource.deleteProperty('1001', 'foo');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/comment/1001/properties/foo`,
      });
    });

    it('encodes commentId and propertyKey', async () => {
      transport.respondWith(undefined);
      await resource.deleteProperty('../admin', '../key');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/comment/..%2Fadmin/properties/..%2Fkey`,
      );
    });

    it('throws ValidationError when commentId is empty', async () => {
      await expect(resource.deleteProperty('', 'foo')).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when propertyKey is empty', async () => {
      await expect(resource.deleteProperty('1001', '')).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── bulkFetch (B360) ──────────────────────────────────────────────────────

  describe('bulkFetch()', () => {
    it('calls POST /comment/list with ids body', async () => {
      // Arrange
      const payload = {
        values: [makeComment('1001'), makeComment('1002')],
        startAt: 0,
        maxResults: 100,
        total: 2,
        isLast: true,
      };
      transport.respondWith(payload);

      // Act
      const result = await resource.bulkFetch({ ids: [1001, 1002] });

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/comment/list`,
        body: { ids: [1001, 1002] },
      });
    });

    it('passes expand query param when provided', async () => {
      transport.respondWith({
        values: [],
        startAt: 0,
        maxResults: 100,
        total: 0,
        isLast: true,
      });
      await resource.bulkFetch({ ids: [1001] }, { expand: 'renderedBody,properties' });
      expect(transport.lastCall?.options.query).toMatchObject({
        expand: 'renderedBody,properties',
      });
    });

    it('omits expand query when not provided', async () => {
      transport.respondWith({
        values: [],
        startAt: 0,
        maxResults: 100,
        total: 0,
        isLast: true,
      });
      await resource.bulkFetch({ ids: [1001] });
      const query = transport.lastCall?.options.query ?? {};
      expect(query['expand']).toBeUndefined();
    });

    it('throws ValidationError when ids is empty array', async () => {
      await expect(resource.bulkFetch({ ids: [] })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when ids is not an array', async () => {
      await expect(
        resource.bulkFetch({ ids: 'nope' as unknown as readonly number[] }),
      ).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when ids exceeds 1000 entries', async () => {
      const tooMany = Array.from({ length: 1001 }, (_, i) => i + 1);
      await expect(resource.bulkFetch({ ids: tooMany })).rejects.toThrow(/exceed 1000/);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when ids contains a non-positive integer', async () => {
      await expect(resource.bulkFetch({ ids: [1001, 0] })).rejects.toThrow(
        /must contain only positive integers/,
      );
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when ids contains a non-integer', async () => {
      await expect(resource.bulkFetch({ ids: [1001, 1.5] })).rejects.toThrow(
        /must contain only positive integers/,
      );
      expect(transport.calls).toHaveLength(0);
    });
  });
});
