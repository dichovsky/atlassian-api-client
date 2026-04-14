import { describe, it, expect, beforeEach } from 'vitest';
import { AttachmentsResource } from '../../src/confluence/resources/attachments.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeAttachment = (id: string) => ({
  id,
  status: 'current',
  title: `file-${id}.pdf`,
  pageId: 'page-1',
});

describe('AttachmentsResource', () => {
  let transport: MockTransport;
  let attachments: AttachmentsResource;

  beforeEach(() => {
    transport = new MockTransport();
    attachments = new AttachmentsResource(transport, BASE_URL);
  });

  // ── listForPage ───────────────────────────────────────────────────────────

  describe('listForPage()', () => {
    it('calls GET /pages/{pageId}/attachments with no params', async () => {
      // Arrange
      const payload = { results: [makeAttachment('a1')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await attachments.listForPage('page-1');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/page-1/attachments`,
      });
    });

    it('includes params when provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });
      const params = { limit: 10, cursor: 'tok', mediaType: 'application/pdf', filename: 'doc' };

      // Act
      await attachments.listForPage('page-1', params);

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject(params);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /attachments/{id}', async () => {
      // Arrange
      const attachment = makeAttachment('a42');
      transport.respondWith(attachment);

      // Act
      const result = await attachments.get('a42');

      // Assert
      expect(result).toEqual(attachment);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachments/a42`,
      });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /attachments/{id}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await attachments.delete('a7');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/attachments/a7`,
      });
    });
  });

  // ── listAllForPage ────────────────────────────────────────────────────────

  describe('listAllForPage()', () => {
    it('iterates across multiple pages and yields all items', async () => {
      // Arrange
      transport
        .respondWith({
          results: [makeAttachment('a1')],
          _links: { next: '/wiki/api/v2/pages/page-1/attachments?cursor=page2' },
        })
        .respondWith({
          results: [makeAttachment('a2')],
          _links: {},
        });

      // Act
      const items: { id: string }[] = [];
      for await (const attachment of attachments.listAllForPage('page-1')) {
        items.push(attachment);
      }

      // Assert
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('a1');
      expect(items[1]?.id).toBe('a2');
      expect(transport.calls).toHaveLength(2);
    });

    it('passes params to the first request', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      for await (const _ of attachments.listAllForPage('page-1', {
        mediaType: 'image/png',
        limit: 5,
      })) {
        /* consume */
      }

      // Assert
      expect(transport.calls[0]?.options.query).toMatchObject({
        mediaType: 'image/png',
        limit: 5,
      });
    });

    it('propagates the cursor on subsequent requests', async () => {
      // Arrange
      transport
        .respondWith({
          results: [makeAttachment('a1')],
          _links: { next: '/wiki/api/v2/pages/page-1/attachments?cursor=cursor-xyz' },
        })
        .respondWith({ results: [], _links: {} });

      // Act
      for await (const _ of attachments.listAllForPage('page-1')) {
        /* consume */
      }

      // Assert
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'cursor-xyz' });
    });

    it('handles a single page with no next link', async () => {
      // Arrange
      transport.respondWith({ results: [makeAttachment('only')], _links: {} });

      // Act
      const items: { id: string }[] = [];
      for await (const attachment of attachments.listAllForPage('page-1')) {
        items.push(attachment);
      }

      // Assert
      expect(items).toHaveLength(1);
      expect(transport.calls).toHaveLength(1);
    });
  });

  // ── upload ────────────────────────────────────────────────────────────────

  describe('upload()', () => {
    it('calls POST /pages/{pageId}/attachments with FormData', async () => {
      // Arrange
      const payload = { results: [makeAttachment('new-1')], _links: {} };
      transport.respondWith(payload);
      const content = new Blob(['file content'], { type: 'text/plain' });

      // Act
      const result = await attachments.upload('page-1', 'test.txt', content, 'text/plain');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/pages/page-1/attachments`,
      });
      expect(transport.lastCall?.options.formData).toBeInstanceOf(FormData);
    });

    it('accepts upload without a mimeType override', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });
      const content = new Blob(['file content']);

      // Act
      await attachments.upload('page-1', 'test.txt', content);

      // Assert
      expect(transport.lastCall?.options.formData).toBeInstanceOf(FormData);
    });

    it('allows overriding mimeType when it differs from Blob.type', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });
      const content = new Blob(['file content'], { type: 'application/octet-stream' });

      // Act
      await attachments.upload('page-1', 'test.png', content, 'image/png');

      // Assert
      expect(transport.lastCall?.options.formData).toBeInstanceOf(FormData);
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes pageId in listForPage()', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.listForPage('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin/attachments`);
    });

    it('encodes id in get()', async () => {
      transport.respondWith(makeAttachment('x'));
      await attachments.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/attachments/..%2Fadmin`);
    });

    it('encodes id in delete()', async () => {
      transport.respondWith(undefined);
      await attachments.delete('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/attachments/..%2Fadmin`);
    });

    it('encodes pageId in upload()', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.upload('../admin', 'test.txt', new Blob(['x']));
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin/attachments`);
    });
  });
});
