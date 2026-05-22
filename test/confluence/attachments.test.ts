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
    it('calls GET /attachments/{id} without a query when no params', async () => {
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
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards version and every include-* flag', async () => {
      transport.respondWith(makeAttachment('a42'));
      await attachments.get('a42', {
        version: 5,
        'include-labels': true,
        'include-properties': true,
        'include-operations': true,
        'include-versions': true,
        'include-version': false,
        'include-collaborators': true,
      });
      expect(transport.lastCall?.options.query).toEqual({
        version: 5,
        'include-labels': true,
        'include-properties': true,
        'include-operations': true,
        'include-versions': true,
        'include-version': false,
        'include-collaborators': true,
      });
    });

    it('omits the query bag when params object has no defined fields', async () => {
      transport.respondWith(makeAttachment('a42'));
      await attachments.get('a42', {});
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('exposes spec-modelled nested envelopes in the typed response', async () => {
      transport.respondWith({
        ...makeAttachment('a42'),
        createdAt: '2026-05-01T00:00:00Z',
        customContentId: 'cc-1',
        fileId: 'file-9',
        labels: { results: [{ id: 'l1', name: 'urgent' }], meta: { hasMore: false } },
      });
      const attachment = await attachments.get('a42', { 'include-labels': true });
      expect(attachment.createdAt).toBe('2026-05-01T00:00:00Z');
      expect(attachment.customContentId).toBe('cc-1');
      expect(attachment.fileId).toBe('file-9');
      expect(attachment.labels?.results?.[0]?.name).toBe('urgent');
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /attachments/{id} without a query when no params', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await attachments.delete('a7');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/attachments/a7`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards purge=true when requested', async () => {
      transport.respondWith(undefined);
      await attachments.delete('a7', { purge: true });
      expect(transport.lastCall?.options.query).toEqual({ purge: true });
    });

    it('omits the query when purge is undefined', async () => {
      transport.respondWith(undefined);
      await attachments.delete('a7', {});
      expect(transport.lastCall?.options.query).toBeUndefined();
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

  // ── list (tenant-wide) ────────────────────────────────────────────────────

  describe('list()', () => {
    it('returns the exact paginated payload when called with no params', async () => {
      const payload = { results: [makeAttachment('a1')], _links: {} };
      transport.respondWith(payload);
      const result = await attachments.list();
      expect(result).toEqual(payload);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe('a1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachments`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('flattens a status array and forwards every filter', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.list({
        sort: '-modified-date',
        cursor: 'tok',
        status: ['current', 'archived'],
        mediaType: 'application/pdf',
        filename: 'report',
        limit: 25,
      });
      expect(transport.lastCall?.options.query).toEqual({
        sort: '-modified-date',
        cursor: 'tok',
        status: 'current,archived',
        mediaType: 'application/pdf',
        filename: 'report',
        limit: 25,
      });
    });

    it('passes a scalar status straight through', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.list({ status: 'archived' });
      expect(transport.lastCall?.options.query).toEqual({ status: 'archived' });
    });

    it('drops an empty status array', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.list({ status: [] });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('rejects an out-of-range limit', async () => {
      await expect(attachments.list({ limit: 0 })).rejects.toThrow(/limit/);
    });

    it('rejects a negative limit', async () => {
      await expect(attachments.list({ limit: -1 })).rejects.toThrow(/limit/);
    });
  });

  describe('listAll()', () => {
    it('iterates across multiple pages and yields all items', async () => {
      transport
        .respondWith({
          results: [makeAttachment('a1')],
          _links: { next: '/wiki/api/v2/attachments?cursor=p2' },
        })
        .respondWith({ results: [makeAttachment('a2')], _links: {} });

      const ids: string[] = [];
      for await (const a of attachments.listAll({ sort: 'created-date' })) {
        ids.push(a.id);
      }

      expect(ids).toEqual(['a1', 'a2']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toMatchObject({ sort: 'created-date' });
    });

    it('rejects an out-of-range limit before any request', async () => {
      await expect(async () => {
        for await (const _ of attachments.listAll({ limit: 0 })) {
          /* consume */
        }
      }).rejects.toThrow(/limit/);
      expect(transport.calls).toHaveLength(0);
    });

    it('rejects a negative limit before any request', async () => {
      await expect(async () => {
        for await (const _ of attachments.listAll({ limit: -5 })) {
          /* consume */
        }
      }).rejects.toThrow(/limit/);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── content properties ───────────────────────────────────────────────────

  describe('listProperties()', () => {
    it('calls GET /attachments/{id}/properties with the property query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.listProperties('att-1', { key: 'flag', sort: '-key', limit: 10 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachments/att-1/properties`,
      });
      expect(transport.lastCall?.options.query).toEqual({
        key: 'flag',
        sort: '-key',
        limit: 10,
      });
    });

    it('rejects an out-of-range limit', async () => {
      await expect(attachments.listProperties('att-1', { limit: 0 })).rejects.toThrow(/limit/);
    });

    it('omits the query bag entirely when no params are provided', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.listProperties('att-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards only the cursor when other filters are unset', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.listProperties('att-1', { cursor: 'tok' });
      expect(transport.lastCall?.options.query).toEqual({ cursor: 'tok' });
    });
  });

  describe('listPropertiesAll()', () => {
    it('iterates across multiple pages and forwards the query bag', async () => {
      transport
        .respondWith({
          results: [{ id: 'p1', key: 'a', value: 1 }],
          _links: { next: '/wiki/api/v2/attachments/att-1/properties?cursor=n' },
        })
        .respondWith({ results: [{ id: 'p2', key: 'b', value: 2 }], _links: {} });

      const props: { id: string }[] = [];
      for await (const p of attachments.listPropertiesAll('att-1', { key: 'a' })) {
        props.push(p as { id: string });
      }

      expect(props).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toMatchObject({ key: 'a' });
      expect(transport.calls).toHaveLength(2);
    });

    it('rejects an out-of-range limit before any request', async () => {
      await expect(async () => {
        for await (const _ of attachments.listPropertiesAll('att-1', { limit: 0 })) {
          /* consume */
        }
      }).rejects.toThrow(/limit/);
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('createProperty()', () => {
    it('calls POST with the property body', async () => {
      transport.respondWith({ id: 'p1', key: 'k', value: { v: 1 }, version: { number: 1 } });
      await attachments.createProperty('att-1', { key: 'k', value: { v: 1 } });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/attachments/att-1/properties`,
        body: { key: 'k', value: { v: 1 } },
      });
    });
  });

  describe('getProperty()', () => {
    it('calls GET /attachments/{id}/properties/{property-id}', async () => {
      transport.respondWith({ id: 'p1', key: 'k', value: 1 });
      await attachments.getProperty('att-1', 'p1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachments/att-1/properties/p1`,
      });
    });
  });

  describe('updateProperty()', () => {
    it('calls PUT with the optimistic-concurrency version', async () => {
      transport.respondWith({ id: 'p1', key: 'k', value: 'v2', version: { number: 2 } });
      await attachments.updateProperty('att-1', 'p1', {
        key: 'k',
        value: 'v2',
        version: { number: 2 },
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/attachments/att-1/properties/p1`,
        body: { key: 'k', value: 'v2', version: { number: 2 } },
      });
    });
  });

  describe('deleteProperty()', () => {
    it('calls DELETE /attachments/{id}/properties/{property-id}', async () => {
      transport.respondWith(undefined);
      await attachments.deleteProperty('att-1', 'p1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/attachments/att-1/properties/p1`,
      });
    });
  });

  // ── versions ─────────────────────────────────────────────────────────────

  describe('listVersions()', () => {
    it('calls GET /attachments/{id}/versions with the sort/limit query', async () => {
      transport.respondWith({ results: [{ number: 2 }], _links: {} });
      await attachments.listVersions('att-1', { sort: '-modified-date', limit: 10 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachments/att-1/versions`,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        sort: '-modified-date',
        limit: 10,
      });
    });

    it('rejects an out-of-range limit', async () => {
      await expect(attachments.listVersions('att-1', { limit: 0 })).rejects.toThrow(/limit/);
    });

    it('omits the query when called without params', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.listVersions('att-1');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/attachments/att-1/versions`);
    });

    it('forwards only the cursor when other filters are unset', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.listVersions('att-1', { cursor: 'next' });
      expect(transport.lastCall?.options.query).toEqual({ cursor: 'next' });
    });
  });

  describe('listAllVersions()', () => {
    it('iterates across multiple pages', async () => {
      transport
        .respondWith({
          results: [{ number: 2 }],
          _links: { next: '/wiki/api/v2/attachments/att-1/versions?cursor=n' },
        })
        .respondWith({ results: [{ number: 1 }], _links: {} });

      const nums: number[] = [];
      for await (const v of attachments.listAllVersions('att-1')) {
        if (v.number !== undefined) nums.push(v.number);
      }

      expect(nums).toEqual([2, 1]);
      expect(transport.calls).toHaveLength(2);
    });

    it('rejects an out-of-range limit before any request', async () => {
      await expect(async () => {
        for await (const _ of attachments.listAllVersions('att-1', { limit: 0 })) {
          /* consume */
        }
      }).rejects.toThrow(/limit/);
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('getVersion()', () => {
    it('calls GET /attachments/{id}/versions/{version-number}', async () => {
      transport.respondWith({ number: 3 });
      await attachments.getVersion('att-1', 3);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachments/att-1/versions/3`,
      });
    });

    it('rejects a zero versionNumber without making a request', async () => {
      await expect(attachments.getVersion('att-1', 0)).rejects.toThrow(/positive integer/);
      expect(transport.calls).toHaveLength(0);
    });

    it('rejects a negative versionNumber without making a request', async () => {
      await expect(attachments.getVersion('att-1', -3)).rejects.toThrow(/positive integer/);
      expect(transport.calls).toHaveLength(0);
    });

    it('rejects a non-integer versionNumber without making a request', async () => {
      await expect(attachments.getVersion('att-1', 1.5)).rejects.toThrow(/positive integer/);
      expect(transport.calls).toHaveLength(0);
    });

    it('exposes the spec `attachment` back-reference on the typed version', async () => {
      transport.respondWith({
        number: 4,
        attachment: { id: 'att-1', title: 'spec.pdf' },
      });
      const version = await attachments.getVersion('att-1', 4);
      expect(version.attachment?.id).toBe('att-1');
      expect(version.attachment?.title).toBe('spec.pdf');
    });
  });

  // ── footer comments ──────────────────────────────────────────────────────

  describe('listFooterComments()', () => {
    it('calls GET /attachments/{id}/footer-comments with the comment query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.listFooterComments('att-1', {
        'body-format': 'storage',
        sort: '-modified-date',
        version: 2,
        limit: 10,
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachments/att-1/footer-comments`,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        'body-format': 'storage',
        sort: '-modified-date',
        version: 2,
        limit: 10,
      });
    });

    it('rejects an out-of-range limit', async () => {
      await expect(attachments.listFooterComments('att-1', { limit: 0 })).rejects.toThrow(/limit/);
    });

    it('omits the query when called without params', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.listFooterComments('att-1');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/attachments/att-1/footer-comments`,
      );
    });

    it('forwards only the cursor when other filters are unset', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.listFooterComments('att-1', { cursor: 'next' });
      expect(transport.lastCall?.options.query).toEqual({ cursor: 'next' });
    });
  });

  describe('listAllFooterComments()', () => {
    it('iterates across multiple pages', async () => {
      transport
        .respondWith({
          results: [{ id: 'c1', attachmentId: 'att-1' }],
          _links: { next: '/wiki/api/v2/attachments/att-1/footer-comments?cursor=n' },
        })
        .respondWith({ results: [{ id: 'c2', attachmentId: 'att-1' }], _links: {} });

      const ids: string[] = [];
      for await (const c of attachments.listAllFooterComments('att-1')) {
        if (c.id !== undefined) ids.push(c.id);
      }

      expect(ids).toEqual(['c1', 'c2']);
      expect(transport.calls).toHaveLength(2);
    });

    it('rejects an out-of-range limit before any request', async () => {
      await expect(async () => {
        for await (const _ of attachments.listAllFooterComments('att-1', { limit: 0 })) {
          /* consume */
        }
      }).rejects.toThrow(/limit/);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── labels ───────────────────────────────────────────────────────────────

  describe('listLabels()', () => {
    it('calls GET /attachments/{id}/labels with the prefix/sort query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.listLabels('att-1', { prefix: 'global', sort: '-name', limit: 5 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachments/att-1/labels`,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        prefix: 'global',
        sort: '-name',
        limit: 5,
      });
    });

    it('rejects an out-of-range limit', async () => {
      await expect(attachments.listLabels('att-1', { limit: 0 })).rejects.toThrow(/limit/);
    });

    it('omits the query when called without params', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.listLabels('att-1');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/attachments/att-1/labels`);
    });

    it('forwards only the cursor when other filters are unset', async () => {
      transport.respondWith({ results: [], _links: {} });
      await attachments.listLabels('att-1', { cursor: 'next' });
      expect(transport.lastCall?.options.query).toEqual({ cursor: 'next' });
    });
  });

  describe('listAllLabels()', () => {
    it('iterates across multiple pages', async () => {
      transport
        .respondWith({
          results: [{ id: 'l1', name: 'one' }],
          _links: { next: '/wiki/api/v2/attachments/att-1/labels?cursor=n' },
        })
        .respondWith({ results: [{ id: 'l2', name: 'two' }], _links: {} });

      const names: string[] = [];
      for await (const l of attachments.listAllLabels('att-1')) {
        names.push(l.name);
      }

      expect(names).toEqual(['one', 'two']);
      expect(transport.calls).toHaveLength(2);
    });

    it('rejects an out-of-range limit before any request', async () => {
      await expect(async () => {
        for await (const _ of attachments.listAllLabels('att-1', { limit: 0 })) {
          /* consume */
        }
      }).rejects.toThrow(/limit/);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── operations ───────────────────────────────────────────────────────────

  describe('getOperations()', () => {
    it('calls GET /attachments/{id}/operations', async () => {
      transport.respondWith({ operations: [{ operation: 'read', targetType: 'attachment' }] });
      const result = await attachments.getOperations('att-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachments/att-1/operations`,
      });
      expect(result.operations?.[0]).toMatchObject({
        operation: 'read',
        targetType: 'attachment',
      });
    });
  });

  // ── thumbnail ────────────────────────────────────────────────────────────

  describe('downloadThumbnail()', () => {
    it('calls GET /attachments/{id}/thumbnail/download with responseType arrayBuffer', async () => {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      transport.respondWith(bytes.buffer);
      const result = await attachments.downloadThumbnail('att-1', {
        version: 2,
        width: 100,
        height: 200,
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachments/att-1/thumbnail/download`,
        responseType: 'arrayBuffer',
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        version: 2,
        width: 100,
        height: 200,
      });
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect((result as ArrayBuffer).byteLength).toBe(4);
    });

    it('omits query when no params provided', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await attachments.downloadThumbnail('att-1');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/attachments/att-1/thumbnail/download`,
      );
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('omits query when params object is empty', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await attachments.downloadThumbnail('att-1', {});
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards only the defined hints when partial params are supplied', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await attachments.downloadThumbnail('att-1', { width: 64 });
      expect(transport.lastCall?.options.query).toEqual({ width: 64 });
    });
  });
});
