import { describe, it, expect, beforeEach } from 'vitest';
import { SpacePermissionsResource } from '../../src/confluence/resources/space-permissions.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makePermission = (id: string, displayName: string) => ({
  id,
  displayName,
  description: `${displayName} permission`,
  requiredPermissionIds: [],
});

describe('SpacePermissionsResource', () => {
  let transport: MockTransport;
  let resource: SpacePermissionsResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new SpacePermissionsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /space-permissions with no params', async () => {
      // Arrange
      const payload = { results: [makePermission('p1', 'Read')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await resource.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/space-permissions`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
      expect(transport.lastCall?.options.body).toBeUndefined();
    });

    it('passes limit and cursor when provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.list({ limit: 10, cursor: 'tok' });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ limit: 10, cursor: 'tok' });
    });

    it('omits cursor when only limit is provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.list({ limit: 5 });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ limit: 5 });
    });

    it('omits limit when only cursor is provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.list({ cursor: 'c1' });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ cursor: 'c1' });
    });

    it('throws RangeError when limit is zero', async () => {
      await expect(resource.list({ limit: 0 })).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws RangeError when limit is negative', async () => {
      await expect(resource.list({ limit: -1 })).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('boom'));
      await expect(resource.list()).rejects.toThrow('boom');
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('yields items across pages until _links.next is absent', async () => {
      // Arrange — first page advertises a next cursor, second page is the tail
      transport
        .respondWith({
          results: [makePermission('p1', 'Read'), makePermission('p2', 'Write')],
          _links: { next: '/wiki/api/v2/space-permissions?cursor=c2' },
        })
        .respondWith({
          results: [makePermission('p3', 'Admin')],
          _links: {},
        });

      // Act
      const items: { id: string }[] = [];
      for await (const item of resource.listAll()) {
        items.push(item);
      }

      // Assert
      expect(items.map((i) => i.id)).toEqual(['p1', 'p2', 'p3']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({});
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'c2' });
    });

    it('passes limit through to the request query', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      const iter = resource.listAll({ limit: 25 });
      await iter.next();

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ limit: 25 });
    });

    it('throws RangeError when limit is invalid before any request', async () => {
      const iter = resource.listAll({ limit: 0 });
      await expect(iter.next()).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });
  });
});
