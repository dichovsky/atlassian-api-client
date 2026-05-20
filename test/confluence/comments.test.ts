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

  // ── Comment Content Properties ────────────────────────────────────────────

  const makeProperty = (id: string) => ({
    id,
    key: 'reviewed',
    value: { yes: true },
    version: { number: 1 },
  });

  describe('listProperties()', () => {
    it('calls GET /comments/{commentId}/properties with no query when params omitted', async () => {
      // Arrange
      const payload = { results: [makeProperty('p1')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await comments.listProperties('c-1');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/comments/c-1/properties`,
        query: {},
      });
    });

    it('forwards key/sort/cursor/limit query params when provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await comments.listProperties('c-1', {
        key: 'reviewed',
        sort: '-key',
        cursor: 'tok',
        limit: 50,
      });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({
        key: 'reviewed',
        sort: '-key',
        cursor: 'tok',
        limit: 50,
      });
    });

    it('rejects invalid limit before issuing a request', async () => {
      await expect(comments.listProperties('c-1', { limit: 0 })).rejects.toThrow(RangeError);
      expect(transport.lastCall).toBeUndefined();
    });
  });

  describe('listPropertiesAll()', () => {
    it('yields properties across paginated responses', async () => {
      // Arrange
      transport.respondWith({
        results: [makeProperty('p1')],
        _links: { next: '/wiki/api/v2/comments/c-1/properties?cursor=next' },
      });
      transport.respondWith({ results: [makeProperty('p2')], _links: {} });

      // Act
      const collected: { id: string }[] = [];
      for await (const p of comments.listPropertiesAll('c-1')) {
        collected.push(p);
      }

      // Assert
      expect(collected.map((p) => p.id)).toEqual(['p1', 'p2']);
      expect(transport.calls).toHaveLength(2);
    });

    it('forwards filter params on every page', async () => {
      // Arrange
      transport.respondWith({ results: [makeProperty('p1')], _links: {} });

      // Act
      const iter = comments.listPropertiesAll('c-1', { key: 'k', sort: '-key', limit: 5 });
      await iter.next();

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ key: 'k', sort: '-key', limit: 5 });
    });

    it('rejects invalid limit before issuing a request', async () => {
      const iter = comments.listPropertiesAll('c-1', { limit: -1 });
      await expect(iter.next()).rejects.toThrow(RangeError);
      expect(transport.lastCall).toBeUndefined();
    });
  });

  describe('createProperty()', () => {
    it('calls POST /comments/{commentId}/properties with the body', async () => {
      // Arrange
      const created = makeProperty('p-new');
      transport.respondWith(created);
      const data = { key: 'reviewed', value: { yes: true } };

      // Act
      const result = await comments.createProperty('c-1', data);

      // Assert
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/comments/c-1/properties`,
        body: data,
      });
    });
  });

  describe('getProperty()', () => {
    it('calls GET /comments/{commentId}/properties/{propertyId}', async () => {
      // Arrange
      const property = makeProperty('p-42');
      transport.respondWith(property);

      // Act
      const result = await comments.getProperty('c-1', 'p-42');

      // Assert
      expect(result).toEqual(property);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/comments/c-1/properties/p-42`,
      });
    });

    it('encodes both commentId and propertyId', async () => {
      transport.respondWith(makeProperty('p'));
      await comments.getProperty('a/b', 'c/d');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/comments/a%2Fb/properties/c%2Fd`);
    });
  });

  describe('updateProperty()', () => {
    it('calls PUT /comments/{commentId}/properties/{propertyId} with the body', async () => {
      // Arrange
      const updated = makeProperty('p-1');
      transport.respondWith(updated);
      const data = {
        key: 'reviewed',
        value: { yes: false },
        version: { number: 2 },
      };

      // Act
      const result = await comments.updateProperty('c-1', 'p-1', data);

      // Assert
      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/comments/c-1/properties/p-1`,
        body: data,
      });
    });
  });

  describe('deleteProperty()', () => {
    it('calls DELETE /comments/{commentId}/properties/{propertyId} and resolves void', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await comments.deleteProperty('c-1', 'p-1');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/comments/c-1/properties/p-1`,
      });
    });

    it('propagates transport errors verbatim', async () => {
      transport.respondWithError(new Error('boom'));
      await expect(comments.deleteProperty('c-1', 'p-1')).rejects.toThrow('boom');
    });
  });

  describe('property path encoding', () => {
    it('encodes commentId in listProperties()', async () => {
      transport.respondWith({ results: [], _links: {} });
      await comments.listProperties('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/comments/..%2Fadmin/properties`);
    });

    it('encodes commentId in createProperty()', async () => {
      transport.respondWith(makeProperty('p'));
      await comments.createProperty('../admin', { key: 'k', value: 1 });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/comments/..%2Fadmin/properties`);
    });

    it('encodes both segments in updateProperty()', async () => {
      transport.respondWith(makeProperty('p'));
      await comments.updateProperty('../admin', 'pid/with/slash', {
        key: 'k',
        value: 1,
        version: { number: 2 },
      });
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/comments/..%2Fadmin/properties/pid%2Fwith%2Fslash`,
      );
    });

    it('encodes both segments in deleteProperty()', async () => {
      transport.respondWith(undefined);
      await comments.deleteProperty('../admin', '../other');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/comments/..%2Fadmin/properties/..%2Fother`,
      );
    });
  });
});
