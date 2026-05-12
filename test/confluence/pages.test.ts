import { describe, it, expect, beforeEach } from 'vitest';
import { PagesResource } from '../../src/confluence/resources/pages.js';
import type { Page } from '../../src/confluence/types/index.js';
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

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment id in get(): %s',
      async (id) => {
        await expect(pages.get(id)).rejects.toThrow('path parameter must not be "." or ".."');
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── B024: spec-aligned schema additions ───────────────────────────────────

  describe('B024: spec-aligned Page schema + params', () => {
    it('exposes lastOwnerId, subType, isFavoritedByCurrentUser, parentType from response', async () => {
      const response: Page = {
        id: '99',
        status: 'current',
        title: 'Spec Page',
        spaceId: 'space-1',
        parentId: 'parent-1',
        parentType: 'page',
        position: 3,
        ownerId: 'owner-1',
        lastOwnerId: 'prev-owner',
        subType: 'live',
        isFavoritedByCurrentUser: true,
      };
      transport.respondWith(response);
      const page = await pages.get('99');
      expect(page.lastOwnerId).toBe('prev-owner');
      expect(page.subType).toBe('live');
      expect(page.isFavoritedByCurrentUser).toBe(true);
      expect(page.parentType).toBe('page');
      expect(page.position).toBe(3);
    });

    it('forwards id and space-id array params as comma-separated strings', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.list({
        id: ['1', '2', '3'],
        'space-id': ['a', 'b'],
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        id: '1,2,3',
        'space-id': 'a,b',
      });
    });

    it('forwards sort and subtype params for list', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.list({ sort: '-modified-date', subtype: 'live' });
      expect(transport.lastCall?.options.query).toMatchObject({
        sort: '-modified-date',
        subtype: 'live',
      });
    });

    it('forwards new include-* and get-draft params on get()', async () => {
      transport.respondWith(makePage('1'));
      await pages.get('1', {
        'get-draft': true,
        'include-likes': true,
        'include-version': false,
        'include-favorited-by-current-user-status': true,
        'include-webresources': true,
        'include-collaborators': true,
        'include-direct-children': true,
      });
      const q = transport.lastCall?.options.query;
      expect(q).toMatchObject({
        'get-draft': true,
        'include-likes': true,
        'include-version': false,
        'include-favorited-by-current-user-status': true,
        'include-webresources': true,
        'include-collaborators': true,
        'include-direct-children': true,
      });
    });

    it('forwards array params via listAll generator', async () => {
      transport.respondWith({ results: [], _links: {} });
      const items: unknown[] = [];
      for await (const p of pages.listAll({ id: ['1', '2'], 'space-id': ['x'] })) {
        items.push(p);
      }
      expect(transport.calls[0]?.options.query).toMatchObject({
        id: '1,2',
        'space-id': 'x',
      });
    });
  });
});
