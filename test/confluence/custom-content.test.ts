import { describe, it, expect, beforeEach } from 'vitest';
import { CustomContentResource } from '../../src/confluence/resources/custom-content.js';
import { MockTransport } from '../helpers/mock-transport.js';

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
    });

    it('calls GET /custom-content with all supported params', async () => {
      const payload = { results: [], _links: {} };
      transport.respondWith(payload);
      const params = {
        type: 'custom-type',
        id: '123',
        spaceId: 'SPACE',
        pageId: 'PAGE',
        blogPostId: 'BLOG',
        status: 'current',
        'body-format': 'storage' as const,
        cursor: 'abc',
        limit: 25,
      };

      const result = await resource.list(params);

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options.query).toMatchObject(params);
    });

    it('throws RangeError for invalid limit', async () => {
      await expect(resource.list({ limit: 0 })).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
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
    });

    it('includes query params when provided', async () => {
      transport.respondWith(makeCustomContent('42'));
      const params = { 'body-format': 'storage' as const, version: 2 };

      await resource.get('42', params);

      expect(transport.lastCall?.options.query).toMatchObject(params);
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
    it('calls DELETE /custom-content/{id}', async () => {
      transport.respondWith(undefined);

      await resource.delete('7');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/custom-content/7`,
      });
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

  // ── B030: spec-aligned schema additions ───────────────────────────────────

  describe('B030: spec-aligned CustomContent schema + params', () => {
    it('exposes customContentId (parent ref) on response', async () => {
      transport.respondWith({
        id: 'cc1',
        type: 'extension.foo',
        status: 'current',
        customContentId: 'parent-cc-1',
      });
      const cc = await resource.get('cc1');
      expect(cc.customContentId).toBe('parent-cc-1');
    });

    it('forwards spec id and space-id array params as comma-separated', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.list({ id: ['1', '2'], 'space-id': ['x'] });
      expect(transport.lastCall?.options.query).toMatchObject({ id: '1,2', 'space-id': 'x' });
    });

    it('forwards sort param', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.list({ sort: '-modified-date' });
      expect(transport.lastCall?.options.query).toMatchObject({ sort: '-modified-date' });
    });

    it('accepts customContentId on create payload', async () => {
      transport.respondWith({ id: 'cc2', type: 'extension.bar', status: 'current' });
      await resource.create({
        type: 'extension.bar',
        customContentId: 'parent-cc-9',
      });
      expect(transport.lastCall?.options.body).toMatchObject({ customContentId: 'parent-cc-9' });
    });
  });
});
