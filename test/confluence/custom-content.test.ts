import { describe, it, expect, beforeEach } from 'vitest';
import { CustomContentResource } from '../../src/confluence/resources/custom-content.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeCustomContent = (id: string) => ({
  id,
  type: 'custom-type',
  status: 'current',
  title: `Custom Content ${id}`,
});

describe('CustomContentResource', () => {
  let transport: MockTransport;
  let resource: CustomContentResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new CustomContentResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /custom-content with no params', async () => {
      const payload = { results: [makeCustomContent('1')], _links: {} };
      transport.respondWith(payload);

      const result = await resource.list();

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/custom-content`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards every spec-defined query key with kebab-case wire format', async () => {
      const payload = { results: [], _links: {} };
      transport.respondWith(payload);
      const params = {
        type: 'custom-type',
        id: '123',
        'space-id': 'SPACE',
        sort: 'created-date' as const,
        'body-format': 'storage' as const,
        cursor: 'abc',
        limit: 25,
      };

      const result = await resource.list(params);

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options.query).toEqual(params);
    });

    it('omits keys not in the spec (no pageId/blogPostId/status drift)', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.list({ type: 't', 'space-id': 'SPACE' });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).toEqual({ type: 't', 'space-id': 'SPACE' });
      expect(query).not.toHaveProperty('spaceId');
      expect(query).not.toHaveProperty('pageId');
      expect(query).not.toHaveProperty('blogPostId');
      expect(query).not.toHaveProperty('status');
    });

    it('throws ValidationError for invalid limit', async () => {
      await expect(resource.list({ limit: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('forwards id-only filter without other keys', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.list({ id: '42' });

      expect(transport.lastCall?.options.query).toEqual({ id: '42' });
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /custom-content/{id} without extra params', async () => {
      const item = makeCustomContent('42');
      transport.respondWith(item);

      const result = await resource.get('42');

      expect(result).toEqual(item);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/custom-content/42`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards body-format and version', async () => {
      transport.respondWith(makeCustomContent('42'));
      const params = { 'body-format': 'storage' as const, version: 2 };

      await resource.get('42', params);

      expect(transport.lastCall?.options.query).toEqual(params);
    });

    it('forwards every include-* flag set on the spec', async () => {
      transport.respondWith(makeCustomContent('42'));

      await resource.get('42', {
        'include-labels': true,
        'include-properties': true,
        'include-operations': true,
        'include-versions': true,
        'include-version': true,
        'include-collaborators': true,
      });

      expect(transport.lastCall?.options.query).toEqual({
        'include-labels': true,
        'include-properties': true,
        'include-operations': true,
        'include-versions': true,
        'include-version': true,
        'include-collaborators': true,
      });
    });

    it('accepts the extended single-item body-format vocabulary', async () => {
      transport.respondWith(makeCustomContent('42'));
      await resource.get('42', { 'body-format': 'export_view' });
      expect(transport.lastCall?.options.query).toEqual({ 'body-format': 'export_view' });
    });

    it('omits the entire query bag when params is undefined', async () => {
      transport.respondWith(makeCustomContent('42'));
      await resource.get('42');
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('omits the query bag when only undefined flags are passed', async () => {
      transport.respondWith(makeCustomContent('42'));
      await resource.get('42', {});
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /custom-content with the provided body', async () => {
      const created = makeCustomContent('99');
      transport.respondWith(created);
      const data = {
        type: 'custom-type',
        status: 'current' as const,
        spaceId: 'SPACE',
        title: 'New Custom Content',
        body: { representation: 'storage' as const, value: '<p>hello</p>' },
      };

      const result = await resource.create(data);

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/custom-content`,
        body: data,
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /custom-content/{id} with the provided body', async () => {
      const updated = makeCustomContent('5');
      transport.respondWith(updated);
      const data = {
        id: '5',
        type: 'custom-type',
        status: 'current' as const,
        title: 'Updated Title',
        body: { representation: 'storage' as const, value: '<p>updated</p>' },
        version: { number: 2 },
      };

      const result = await resource.update('5', data);

      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/custom-content/5`,
        body: data,
      });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /custom-content/{id} with no query when no params', async () => {
      transport.respondWith(undefined);

      await resource.delete('7');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/custom-content/7`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards purge=true when set', async () => {
      transport.respondWith(undefined);

      await resource.delete('7', { purge: true });

      expect(transport.lastCall?.options.query).toEqual({ purge: true });
    });

    it('forwards purge=false when explicitly set', async () => {
      transport.respondWith(undefined);

      await resource.delete('7', { purge: false });

      expect(transport.lastCall?.options.query).toEqual({ purge: false });
    });

    it('omits query when params object has no purge key', async () => {
      transport.respondWith(undefined);

      await resource.delete('7', {});

      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('iterates across multiple pages and yields all items', async () => {
      transport
        .respondWith({
          results: [makeCustomContent('1')],
          _links: { next: '/wiki/api/v2/custom-content?cursor=page2' },
        })
        .respondWith({
          results: [makeCustomContent('2')],
          _links: {},
        });

      const items: { id: string }[] = [];
      for await (const item of resource.listAll()) {
        items.push(item);
      }

      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
      expect(transport.calls).toHaveLength(2);
    });

    it('passes params to the first request', async () => {
      transport.respondWith({ results: [], _links: {} });

      for await (const _ of resource.listAll({ type: 'custom-type', limit: 10 })) {
        /* consume */
      }

      expect(transport.calls[0]?.options.query).toMatchObject({
        type: 'custom-type',
        limit: 10,
      });
    });

    it('propagates the cursor on subsequent requests', async () => {
      transport
        .respondWith({
          results: [makeCustomContent('A')],
          _links: { next: '/wiki/api/v2/custom-content?cursor=token-xyz' },
        })
        .respondWith({ results: [], _links: {} });

      for await (const _ of resource.listAll()) {
        /* consume */
      }

      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'token-xyz' });
    });

    it('handles a single page with no next link', async () => {
      transport.respondWith({ results: [makeCustomContent('only')], _links: {} });

      const items: { id: string }[] = [];
      for await (const item of resource.listAll()) {
        items.push(item);
      }

      expect(items).toHaveLength(1);
      expect(transport.calls).toHaveLength(1);
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes special characters in id for get()', async () => {
      transport.respondWith(makeCustomContent('x'));
      await resource.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/custom-content/..%2Fadmin`);
    });

    it('encodes special characters in id for update()', async () => {
      transport.respondWith(makeCustomContent('x'));
      await resource.update('../admin', {
        id: '../admin',
        type: 'custom-type',
        status: 'current',
        title: 'x',
        body: { representation: 'storage', value: '<p>x</p>' },
        version: { number: 2 },
      });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/custom-content/..%2Fadmin`);
    });

    it('encodes special characters in id for delete()', async () => {
      transport.respondWith(undefined);
      await resource.delete('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/custom-content/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment id in get(): %s',
      async (id) => {
        await expect(resource.get(id)).rejects.toThrow('path parameter must not be "." or ".."');
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── content properties (B094-B098) ────────────────────────────────────────

  describe('listProperties()', () => {
    it('issues GET /custom-content/{id}/properties with no params', async () => {
      transport.respondWith({ results: [], _links: {} });

      const result = await resource.listProperties('cc-1');

      expect(result).toEqual({ results: [], _links: {} });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/custom-content/cc-1/properties`,
        query: {},
      });
    });

    it('forwards key, sort, cursor, limit', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.listProperties('cc-1', { key: 'k', sort: '-key', cursor: 'tok', limit: 25 });

      expect(transport.lastCall?.options.query).toEqual({
        key: 'k',
        sort: '-key',
        cursor: 'tok',
        limit: 25,
      });
    });

    it('rejects invalid limit with ValidationError', async () => {
      await expect(resource.listProperties('cc-1', { limit: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('encodes custom content id path segment', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listProperties('a/b');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/custom-content/a%2Fb/properties`);
    });
  });

  describe('listPropertiesAll()', () => {
    it('iterates across pages and yields all properties', async () => {
      transport
        .respondWith({
          results: [{ id: 'p1', key: 'k1', value: 1 }],
          _links: { next: '/wiki/api/v2/custom-content/cc-1/properties?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'p2', key: 'k2', value: 2 }], _links: {} });

      const items: unknown[] = [];
      for await (const it of resource.listPropertiesAll('cc-1', { key: 'k', sort: 'key' })) {
        items.push(it);
      }

      expect(items).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({ key: 'k', sort: 'key' });
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'p2' });
    });

    it('rejects invalid limit with ValidationError', async () => {
      const iter = resource.listPropertiesAll('cc-1', { limit: 0 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('omits all optional keys when called with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of resource.listPropertiesAll('cc-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('forwards limit when supplied alone', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of resource.listPropertiesAll('cc-1', { limit: 5 })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({ limit: 5 });
    });
  });

  describe('createProperty()', () => {
    it('POSTs key+value to /custom-content/{id}/properties', async () => {
      transport.respondWith({ id: 'p1', key: 'k', value: true });

      const result = await resource.createProperty('cc-1', { key: 'k', value: true });

      expect(result).toEqual({ id: 'p1', key: 'k', value: true });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/custom-content/cc-1/properties`,
        body: { key: 'k', value: true },
      });
    });
  });

  describe('getProperty()', () => {
    it('issues GET /custom-content/{id}/properties/{property-id}', async () => {
      transport.respondWith({ id: 'p1', key: 'k', value: 1 });

      const result = await resource.getProperty('cc-1', 'p1');

      expect(result).toEqual({ id: 'p1', key: 'k', value: 1 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/custom-content/cc-1/properties/p1`,
      });
    });

    it('encodes both path segments', async () => {
      transport.respondWith({ id: 'p1', key: 'k', value: 1 });
      await resource.getProperty('a b', 'c d');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/custom-content/a%20b/properties/c%20d`,
      );
    });
  });

  describe('updateProperty()', () => {
    it('PUTs the body to /custom-content/{id}/properties/{property-id}', async () => {
      transport.respondWith({ id: 'p1', key: 'k', value: 2 });

      const result = await resource.updateProperty('cc-1', 'p1', {
        key: 'k',
        value: 2,
        version: { number: 3 },
      });

      expect(result).toEqual({ id: 'p1', key: 'k', value: 2 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/custom-content/cc-1/properties/p1`,
        body: { key: 'k', value: 2, version: { number: 3 } },
      });
    });
  });

  describe('deleteProperty()', () => {
    it('issues DELETE /custom-content/{id}/properties/{property-id}', async () => {
      transport.respondWith(undefined);

      await resource.deleteProperty('cc-1', 'p1');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/custom-content/cc-1/properties/p1`,
      });
    });
  });

  // ── versions (B099-B100) ──────────────────────────────────────────────────

  describe('listVersions()', () => {
    it('issues GET /custom-content/{id}/versions with no params', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.listVersions('cc-1');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/custom-content/cc-1/versions`,
        query: {},
      });
    });

    it('forwards body-format, sort, cursor, limit', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.listVersions('cc-1', {
        'body-format': 'storage',
        sort: '-modified-date',
        cursor: 'tok',
        limit: 50,
      });

      expect(transport.lastCall?.options.query).toEqual({
        'body-format': 'storage',
        sort: '-modified-date',
        cursor: 'tok',
        limit: 50,
      });
    });

    it('rejects invalid limit', async () => {
      await expect(resource.listVersions('cc-1', { limit: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('listVersionsAll()', () => {
    it('iterates across pages and yields every version', async () => {
      transport
        .respondWith({
          results: [{ number: 2 }],
          _links: { next: '/wiki/api/v2/custom-content/cc-1/versions?cursor=v1' },
        })
        .respondWith({ results: [{ number: 1 }], _links: {} });

      const versions: unknown[] = [];
      for await (const v of resource.listVersionsAll('cc-1', {
        'body-format': 'raw',
        sort: 'modified-date',
      })) {
        versions.push(v);
      }

      expect(versions).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({
        'body-format': 'raw',
        sort: 'modified-date',
      });
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'v1' });
    });

    it('rejects invalid limit', async () => {
      const iter = resource.listVersionsAll('cc-1', { limit: 0 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
    });

    it('omits all optional keys when called with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of resource.listVersionsAll('cc-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('forwards limit alone', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of resource.listVersionsAll('cc-1', { limit: 5 })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({ limit: 5 });
    });
  });

  describe('getVersion()', () => {
    it('issues GET /custom-content/{id}/versions/{version-number}', async () => {
      transport.respondWith({ number: 3, createdAt: '2026-01-01T00:00:00Z' });

      const result = await resource.getVersion('cc-1', 3);

      expect(result).toEqual({ number: 3, createdAt: '2026-01-01T00:00:00Z' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/custom-content/cc-1/versions/3`,
      });
    });
  });

  // ── attachments (B104) ────────────────────────────────────────────────────

  describe('listAttachments()', () => {
    it('issues GET /custom-content/{id}/attachments with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listAttachments('cc-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/custom-content/cc-1/attachments`,
        query: {},
      });
    });

    it('serializes a status array as repeated path params and forwards other params (B1049)', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.listAttachments('cc-1', {
        sort: '-created-date',
        cursor: 'tok',
        status: ['current', 'archived'],
        mediaType: 'image/png',
        filename: 'a.png',
        limit: 10,
      });

      // `status` is `type: array` → repeated params in the path, not CSV.
      expect(transport.lastCall?.options.query).toEqual({
        sort: '-created-date',
        cursor: 'tok',
        mediaType: 'image/png',
        filename: 'a.png',
        limit: 10,
      });
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/custom-content/cc-1/attachments?status=current&status=archived`,
      );
    });

    it('serializes a scalar status as a single path param', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listAttachments('cc-1', { status: 'archived' });
      expect(transport.lastCall?.options.query).toEqual({});
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/custom-content/cc-1/attachments?status=archived`,
      );
    });

    it('drops empty status array entirely', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listAttachments('cc-1', { status: [] });
      expect(transport.lastCall?.options.query).toEqual({});
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/custom-content/cc-1/attachments`);
    });

    it('rejects invalid limit', async () => {
      await expect(resource.listAttachments('cc-1', { limit: 0 })).rejects.toThrow(ValidationError);
    });
  });

  describe('listAttachmentsAll()', () => {
    it('walks every page of attachments', async () => {
      transport
        .respondWith({
          results: [{ id: 'att-1' }],
          _links: { next: '/wiki/api/v2/custom-content/cc-1/attachments?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'att-2' }], _links: {} });

      const seen: unknown[] = [];
      for await (const a of resource.listAttachmentsAll('cc-1', { sort: 'created-date' })) {
        seen.push(a);
      }
      expect(seen).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({ sort: 'created-date' });
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'p2' });
    });

    it('rejects invalid limit', async () => {
      const iter = resource.listAttachmentsAll('cc-1', { limit: 0 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
    });
  });

  // ── children (B105) ───────────────────────────────────────────────────────

  describe('listChildren()', () => {
    it('issues GET /custom-content/{id}/children with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listChildren('cc-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/custom-content/cc-1/children`,
        query: {},
      });
    });

    it('forwards sort, cursor, limit', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listChildren('cc-1', { sort: 'created-date', cursor: 'tok', limit: 25 });
      expect(transport.lastCall?.options.query).toEqual({
        sort: 'created-date',
        cursor: 'tok',
        limit: 25,
      });
    });

    it('rejects invalid limit', async () => {
      await expect(resource.listChildren('cc-1', { limit: 0 })).rejects.toThrow(ValidationError);
    });
  });

  describe('listChildrenAll()', () => {
    it('walks every page of children', async () => {
      transport
        .respondWith({
          results: [{ id: 'c1' }],
          _links: { next: '/wiki/api/v2/custom-content/cc-1/children?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'c2' }], _links: {} });

      const all: unknown[] = [];
      for await (const c of resource.listChildrenAll('cc-1', { sort: 'created-date' })) {
        all.push(c);
      }
      expect(all).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({ sort: 'created-date' });
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'p2' });
    });

    it('rejects invalid limit', async () => {
      const iter = resource.listChildrenAll('cc-1', { limit: 0 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
    });

    it('omits all optional keys when called with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of resource.listChildrenAll('cc-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('forwards limit alone', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of resource.listChildrenAll('cc-1', { limit: 5 })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({ limit: 5 });
    });
  });

  // ── footer comments (B106) ────────────────────────────────────────────────

  describe('listFooterComments()', () => {
    it('issues GET /custom-content/{id}/footer-comments with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listFooterComments('cc-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/custom-content/cc-1/footer-comments`,
        query: {},
      });
    });

    it('forwards body-format, sort, cursor, limit', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listFooterComments('cc-1', {
        'body-format': 'atlas_doc_format',
        sort: '-created-date',
        cursor: 'tok',
        limit: 50,
      });
      expect(transport.lastCall?.options.query).toEqual({
        'body-format': 'atlas_doc_format',
        sort: '-created-date',
        cursor: 'tok',
        limit: 50,
      });
    });

    it('rejects invalid limit', async () => {
      await expect(resource.listFooterComments('cc-1', { limit: 0 })).rejects.toThrow(
        ValidationError,
      );
    });

    it('passes only body-format when other keys are absent', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listFooterComments('cc-1', { 'body-format': 'storage' });
      expect(transport.lastCall?.options.query).toEqual({ 'body-format': 'storage' });
    });
  });

  describe('listFooterCommentsAll()', () => {
    it('walks every page of footer comments', async () => {
      transport
        .respondWith({
          results: [{ id: 'fc-1' }],
          _links: { next: '/wiki/api/v2/custom-content/cc-1/footer-comments?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'fc-2' }], _links: {} });

      const all: unknown[] = [];
      for await (const c of resource.listFooterCommentsAll('cc-1', {
        'body-format': 'storage',
        sort: 'created-date',
      })) {
        all.push(c);
      }
      expect(all).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({
        'body-format': 'storage',
        sort: 'created-date',
      });
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'p2' });
    });

    it('rejects invalid limit', async () => {
      const iter = resource.listFooterCommentsAll('cc-1', { limit: 0 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
    });

    it('omits all optional keys when called with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of resource.listFooterCommentsAll('cc-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });
  });

  // ── labels (B107) ─────────────────────────────────────────────────────────

  describe('listLabels()', () => {
    it('issues GET /custom-content/{id}/labels with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listLabels('cc-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/custom-content/cc-1/labels`,
        query: {},
      });
    });

    it('forwards prefix, sort, cursor, limit', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listLabels('cc-1', {
        prefix: 'global',
        sort: '-name',
        cursor: 'tok',
        limit: 10,
      });
      expect(transport.lastCall?.options.query).toEqual({
        prefix: 'global',
        sort: '-name',
        cursor: 'tok',
        limit: 10,
      });
    });

    it('rejects invalid limit', async () => {
      await expect(resource.listLabels('cc-1', { limit: 0 })).rejects.toThrow(ValidationError);
    });
  });

  describe('listLabelsAll()', () => {
    it('walks every page of labels', async () => {
      transport
        .respondWith({
          results: [{ id: 'l1', name: 'a' }],
          _links: { next: '/wiki/api/v2/custom-content/cc-1/labels?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'l2', name: 'b' }], _links: {} });

      const all: unknown[] = [];
      for await (const l of resource.listLabelsAll('cc-1', { prefix: 'team', sort: 'name' })) {
        all.push(l);
      }
      expect(all).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({ prefix: 'team', sort: 'name' });
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'p2' });
    });

    it('rejects invalid limit', async () => {
      const iter = resource.listLabelsAll('cc-1', { limit: 0 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
    });

    it('omits all optional keys when called with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of resource.listLabelsAll('cc-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('forwards limit alone', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of resource.listLabelsAll('cc-1', { limit: 5 })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({ limit: 5 });
    });
  });

  // ── operations (B108) ─────────────────────────────────────────────────────

  describe('getOperations()', () => {
    it('issues GET /custom-content/{id}/operations', async () => {
      transport.respondWith({ operations: [{ operation: 'read', targetType: 'custom-content' }] });

      const result = await resource.getOperations('cc-1');

      expect(result).toEqual({
        operations: [{ operation: 'read', targetType: 'custom-content' }],
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/custom-content/cc-1/operations`,
      });
    });
  });
});
