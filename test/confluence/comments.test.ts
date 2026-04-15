import { describe, it, expect, beforeEach } from 'vitest';
import { CommentsResource } from '../../src/confluence/resources/comments.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeFooterComment = (id: string) => ({
  id,
  status: 'current',
  pageId: 'page-1',
});

const makeInlineComment = (id: string) => ({
  id,
  status: 'current',
  pageId: 'page-1',
  resolutionStatus: 'open',
});

describe('CommentsResource', () => {
  let transport: MockTransport;
  let comments: CommentsResource;

  beforeEach(() => {
    transport = new MockTransport();
    comments = new CommentsResource(transport, BASE_URL);
  });

  // ── Footer Comments ───────────────────────────────────────────────────────

  describe('listFooter()', () => {
    it('calls GET /pages/{pageId}/footer-comments without params', async () => {
      // Arrange
      const payload = { results: [makeFooterComment('c1')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await comments.listFooter('page-1');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/page-1/footer-comments`,
      });
    });

    it('includes params when provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });
      const params = { 'body-format': 'storage' as const, limit: 10, cursor: 'tok' };

      // Act
      await comments.listFooter('page-1', params);

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject(params);
    });
  });

  describe('getFooter()', () => {
    it('calls GET /footer-comments/{commentId}', async () => {
      // Arrange
      const comment = makeFooterComment('c42');
      transport.respondWith(comment);

      // Act
      const result = await comments.getFooter('c42');

      // Assert
      expect(result).toEqual(comment);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/footer-comments/c42`,
      });
    });
  });

  describe('createFooter()', () => {
    it('calls POST /footer-comments with the provided body', async () => {
      // Arrange
      const created = makeFooterComment('new');
      transport.respondWith(created);
      const data = {
        pageId: 'page-1',
        body: { representation: 'storage' as const, value: '<p>comment</p>' },
      };

      // Act
      const result = await comments.createFooter(data);

      // Assert
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/footer-comments`,
        body: data,
      });
    });
  });

  describe('updateFooter()', () => {
    it('calls PUT /footer-comments/{commentId} with the provided body', async () => {
      // Arrange
      const updated = makeFooterComment('c5');
      transport.respondWith(updated);
      const data = {
        version: { number: 2 },
        body: { representation: 'storage' as const, value: '<p>updated</p>' },
      };

      // Act
      const result = await comments.updateFooter('c5', data);

      // Assert
      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/footer-comments/c5`,
        body: data,
      });
    });
  });

  describe('deleteFooter()', () => {
    it('calls DELETE /footer-comments/{commentId}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await comments.deleteFooter('c7');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/footer-comments/c7`,
      });
    });
  });

  // ── Inline Comments ───────────────────────────────────────────────────────

  describe('listInline()', () => {
    it('calls GET /pages/{pageId}/inline-comments without params', async () => {
      // Arrange
      const payload = { results: [makeInlineComment('i1')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await comments.listInline('page-1');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/page-1/inline-comments`,
      });
    });

    it('includes params when provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });
      const params = { 'body-format': 'view' as const, limit: 5, cursor: 'c' };

      // Act
      await comments.listInline('page-1', params);

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject(params);
    });
  });

  describe('getInline()', () => {
    it('calls GET /inline-comments/{commentId}', async () => {
      // Arrange
      const comment = makeInlineComment('i42');
      transport.respondWith(comment);

      // Act
      const result = await comments.getInline('i42');

      // Assert
      expect(result).toEqual(comment);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/inline-comments/i42`,
      });
    });
  });

  describe('createInline()', () => {
    it('calls POST /inline-comments with the provided body', async () => {
      // Arrange
      const created = makeInlineComment('new');
      transport.respondWith(created);
      const data = {
        pageId: 'page-1',
        body: { representation: 'storage' as const, value: '<p>inline</p>' },
        inlineCommentProperties: {
          textSelection: 'selected text',
          textSelectionMatchCount: 1,
          textSelectionMatchIndex: 0,
        },
      };

      // Act
      const result = await comments.createInline(data);

      // Assert
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/inline-comments`,
        body: data,
      });
    });
  });

  describe('updateInline()', () => {
    it('calls PUT /inline-comments/{commentId} with the provided body', async () => {
      // Arrange
      const updated = makeInlineComment('i5');
      transport.respondWith(updated);
      const data = {
        version: { number: 2 },
        body: { representation: 'storage' as const, value: '<p>updated inline</p>' },
      };

      // Act
      const result = await comments.updateInline('i5', data);

      // Assert
      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/inline-comments/i5`,
        body: data,
      });
    });
  });

  describe('deleteInline()', () => {
    it('calls DELETE /inline-comments/{commentId}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await comments.deleteInline('i7');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/inline-comments/i7`,
      });
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes pageId in listFooter()', async () => {
      transport.respondWith({ results: [], _links: {} });
      await comments.listFooter('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin/footer-comments`);
    });

    it('encodes commentId in getFooter()', async () => {
      transport.respondWith({ id: 'x', version: { number: 1 }, body: { storage: { value: '' } } });
      await comments.getFooter('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/footer-comments/..%2Fadmin`);
    });

    it('encodes commentId in updateFooter()', async () => {
      transport.respondWith({ id: 'x', version: { number: 1 }, body: { storage: { value: '' } } });
      await comments.updateFooter('../admin', {
        version: { number: 2 },
        body: { representation: 'storage', value: '' },
      });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/footer-comments/..%2Fadmin`);
    });

    it('encodes commentId in deleteFooter()', async () => {
      transport.respondWith(undefined);
      await comments.deleteFooter('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/footer-comments/..%2Fadmin`);
    });

    it('encodes pageId in listInline()', async () => {
      transport.respondWith({ results: [], _links: {} });
      await comments.listInline('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin/inline-comments`);
    });

    it('encodes commentId in getInline()', async () => {
      transport.respondWith({ id: 'x', version: { number: 1 }, body: { storage: { value: '' } } });
      await comments.getInline('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/inline-comments/..%2Fadmin`);
    });

    it('encodes commentId in updateInline()', async () => {
      transport.respondWith({ id: 'x', version: { number: 1 }, body: { storage: { value: '' } } });
      await comments.updateInline('../admin', {
        version: { number: 2 },
        body: { representation: 'storage', value: '' },
      });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/inline-comments/..%2Fadmin`);
    });

    it('encodes commentId in deleteInline()', async () => {
      transport.respondWith(undefined);
      await comments.deleteInline('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/inline-comments/..%2Fadmin`);
    });
  });
});
