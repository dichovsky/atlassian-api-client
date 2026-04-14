import { describe, it, expect, beforeEach } from 'vitest';
import { IssueCommentsResource } from '../../src/jira/resources/issue-comments.js';
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

    it('throws RangeError when maxResults is invalid', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act + Assert
      await expect(resource.list('PROJ-1', { maxResults: 0 })).rejects.toThrow(RangeError);
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
        visibility: { type: 'role', value: 'Administrators' },
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
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/..%2Fadmin/comment/..%2Fcid`);
    });

    it('encodes issueIdOrKey in create()', async () => {
      transport.respondWith(makeComment('x'));
      await resource.create('../admin', { body: {} });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/..%2Fadmin/comment`);
    });

    it('encodes issueIdOrKey and commentId in update()', async () => {
      transport.respondWith(makeComment('x'));
      await resource.update('../admin', '../cid', { body: {} });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/..%2Fadmin/comment/..%2Fcid`);
    });

    it('encodes issueIdOrKey and commentId in delete()', async () => {
      transport.respondWith(undefined);
      await resource.delete('../admin', '../cid');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/..%2Fadmin/comment/..%2Fcid`);
    });
  });
});
