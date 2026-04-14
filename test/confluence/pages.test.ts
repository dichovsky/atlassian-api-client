import { describe, it, expect, beforeEach } from 'vitest';
import { PagesResource } from '../../src/confluence/resources/pages.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makePage = (id: string) => ({
  id,
  status: 'current',
  title: `Page ${id}`,
  spaceId: 'space-1',
});

describe('PagesResource', () => {
  let transport: MockTransport;
  let pages: PagesResource;

  beforeEach(() => {
    transport = new MockTransport();
    pages = new PagesResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /pages with no params', async () => {
      // Arrange
      const payload = { results: [makePage('1')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await pages.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages`,
      });
    });

    it('calls GET /pages with all supported params', async () => {
      // Arrange
      const payload = { results: [], _links: {} };
      transport.respondWith(payload);
      const params = {
        spaceId: 'SPACE',
        title: 'My Page',
        status: 'current',
        'body-format': 'storage' as const,
        limit: 25,
        cursor: 'abc',
      };

      // Act
      const result = await pages.list(params);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options.query).toMatchObject(params);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /pages/{id} without extra params', async () => {
      // Arrange
      const page = makePage('42');
      transport.respondWith(page);

      // Act
      const result = await pages.get('42');

      // Assert
      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/42`,
      });
    });

    it('includes query params when provided', async () => {
      // Arrange
      transport.respondWith(makePage('42'));
      const params = {
        'body-format': 'view' as const,
        'include-labels': true,
        version: 3,
      };

      // Act
      await pages.get('42', params);

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject(params);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /pages with the provided body', async () => {
      // Arrange
      const created = makePage('99');
      transport.respondWith(created);
      const data = {
        spaceId: 'SPACE',
        title: 'New Page',
        body: { representation: 'storage' as const, value: '<p>hello</p>' },
      };

      // Act
      const result = await pages.create(data);

      // Assert
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/pages`,
        body: data,
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /pages/{id} with the provided body', async () => {
      // Arrange
      const updated = makePage('5');
      transport.respondWith(updated);
      const data = {
        id: '5',
        title: 'Updated Title',
        status: 'current' as const,
        version: { number: 2 },
      };

      // Act
      const result = await pages.update('5', data);

      // Assert
      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/pages/5`,
        body: data,
      });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /pages/{id} with no params', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await pages.delete('7');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/pages/7`,
      });
    });

    it('includes purge param when provided', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await pages.delete('7', { purge: true });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ purge: true });
    });

    it('includes draft param when provided', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await pages.delete('7', { draft: true });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ draft: true });
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('iterates across multiple pages and yields all items', async () => {
      // Arrange
      transport
        .respondWith({
          results: [makePage('1')],
          _links: { next: '/wiki/api/v2/pages?cursor=page2' },
        })
        .respondWith({
          results: [makePage('2')],
          _links: {},
        });

      // Act
      const items: { id: string }[] = [];
      for await (const page of pages.listAll()) {
        items.push(page);
      }

      // Assert
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
      expect(transport.calls).toHaveLength(2);
    });

    it('passes params to the first request', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      const items: unknown[] = [];
      for await (const page of pages.listAll({ spaceId: 'MY_SPACE', limit: 10 })) {
        items.push(page);
      }

      // Assert
      expect(transport.calls[0]?.options.query).toMatchObject({
        spaceId: 'MY_SPACE',
        limit: 10,
      });
    });

    it('propagates the cursor on subsequent requests', async () => {
      // Arrange
      transport
        .respondWith({
          results: [makePage('A')],
          _links: { next: '/wiki/api/v2/pages?cursor=token-xyz' },
        })
        .respondWith({ results: [], _links: {} });

      // Act
      for await (const _ of pages.listAll()) {
        /* consume */
      }

      // Assert
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'token-xyz' });
    });

    it('handles a single page with no next link', async () => {
      // Arrange
      transport.respondWith({ results: [makePage('only')], _links: {} });

      // Act
      const items: { id: string }[] = [];
      for await (const page of pages.listAll()) {
        items.push(page);
      }

      // Assert
      expect(items).toHaveLength(1);
      expect(transport.calls).toHaveLength(1);
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes special characters in id for get()', async () => {
      transport.respondWith(makePage('x'));
      await pages.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin`);
    });

    it('encodes special characters in id for update()', async () => {
      transport.respondWith(makePage('x'));
      await pages.update('../admin', {
        id: '../admin',
        title: 'T',
        status: 'current',
        version: { number: 2 },
      });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin`);
    });

    it('encodes special characters in id for delete()', async () => {
      transport.respondWith(undefined);
      await pages.delete('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin`);
    });
  });
});
