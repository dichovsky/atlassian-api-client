import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardsResource } from '../../src/jira/resources/dashboards.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeDashboard = (id: string, name: string) => ({
  id,
  self: `${BASE_URL}/dashboard/${id}`,
  name,
});

const makeRawListResponse = (dashboards: ReturnType<typeof makeDashboard>[]) => ({
  dashboards,
  startAt: 0,
  maxResults: 50,
  total: dashboards.length,
});

describe('DashboardsResource', () => {
  let transport: MockTransport;
  let dashboards: DashboardsResource;

  beforeEach(() => {
    transport = new MockTransport();
    dashboards = new DashboardsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /dashboard with no params and normalizes response', async () => {
      // Arrange
      const raw = makeRawListResponse([makeDashboard('1', 'My Dashboard')]);
      transport.respondWith(raw);

      // Act
      const result = await dashboards.list();

      // Assert
      expect(result.values).toEqual(raw.dashboards);
      expect(result.startAt).toBe(raw.startAt);
      expect(result.maxResults).toBe(raw.maxResults);
      expect(result.total).toBe(raw.total);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/dashboard`,
      });
    });

    it('passes all supported params correctly', async () => {
      // Arrange
      transport.respondWith(makeRawListResponse([]));

      // Act
      await dashboards.list({
        startAt: 10,
        maxResults: 25,
        filter: 'my',
        orderBy: 'name',
        expand: 'owner',
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 10,
        maxResults: 25,
        filter: 'my',
        orderBy: 'name',
        expand: 'owner',
      });
    });

    it('passes filter: favourite correctly', async () => {
      // Arrange
      transport.respondWith(makeRawListResponse([]));

      // Act
      await dashboards.list({ filter: 'favourite' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ filter: 'favourite' });
    });

    it('throws RangeError for maxResults: 0', async () => {
      await expect(dashboards.list({ maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: -1', async () => {
      await expect(dashboards.list({ maxResults: -1 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: 1.5', async () => {
      await expect(dashboards.list({ maxResults: 1.5 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: Infinity', async () => {
      await expect(dashboards.list({ maxResults: Infinity })).rejects.toThrow(RangeError);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /dashboard/{id}', async () => {
      // Arrange
      const dashboard = makeDashboard('10001', 'My Dashboard');
      transport.respondWith(dashboard);

      // Act
      const result = await dashboards.get('10001');

      // Assert
      expect(result).toEqual(dashboard);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/dashboard/10001`,
      });
    });

    it('encodes id with slash in get()', async () => {
      // Arrange
      transport.respondWith(makeDashboard('x', 'x'));

      // Act
      await dashboards.get('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/dashboard/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment id in get(): %s',
      async (id) => {
        await expect(dashboards.get(id)).rejects.toThrow('path parameter must not be "." or ".."');
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /dashboard with the provided data', async () => {
      // Arrange
      const dashboard = makeDashboard('1', 'New Dashboard');
      transport.respondWith(dashboard);
      const data = {
        name: 'New Dashboard',
        sharePermissions: [{ type: 'global' as const }],
      };

      // Act
      const result = await dashboards.create(data);

      // Assert
      expect(result).toEqual(dashboard);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/dashboard`,
        body: data,
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /dashboard/{id} with the provided data', async () => {
      // Arrange
      const dashboard = makeDashboard('10001', 'Updated Dashboard');
      transport.respondWith(dashboard);
      const data = {
        name: 'Updated Dashboard',
        sharePermissions: [{ type: 'loggedin' as const }],
      };

      // Act
      const result = await dashboards.update('10001', data);

      // Assert
      expect(result).toEqual(dashboard);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/dashboard/10001`,
        body: data,
      });
    });

    it('encodes id in update()', async () => {
      // Arrange
      transport.respondWith(makeDashboard('x', 'x'));

      // Act
      await dashboards.update('../admin', { name: 'x', sharePermissions: [] });

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/dashboard/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment id in update(): %s',
      async (id) => {
        await expect(dashboards.update(id, { name: 'x', sharePermissions: [] })).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /dashboard/{id}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await dashboards.delete('10001');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/dashboard/10001`,
      });
    });

    it('encodes id in delete()', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await dashboards.delete('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/dashboard/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment id in delete(): %s',
      async (id) => {
        await expect(dashboards.delete(id)).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('paginates across multiple responses and yields all dashboards', async () => {
      // Arrange
      transport
        .respondWith({
          dashboards: [makeDashboard('1', 'Dashboard 1')],
          startAt: 0,
          maxResults: 50,
          total: 51,
        })
        .respondWith({
          dashboards: [makeDashboard('2', 'Dashboard 2')],
          startAt: 50,
          maxResults: 50,
          total: 51,
        });

      // Act
      const items: { id: string }[] = [];
      for await (const dashboard of dashboards.listAll()) {
        items.push(dashboard);
      }

      // Assert
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
      expect(transport.calls).toHaveLength(2);
    });

    it('stops when total is reached', async () => {
      // Arrange
      transport.respondWith({
        dashboards: [makeDashboard('1', 'Dashboard 1')],
        startAt: 0,
        maxResults: 50,
        total: 1,
      });

      // Act
      const items: unknown[] = [];
      for await (const item of dashboards.listAll()) {
        items.push(item);
      }

      // Assert
      expect(items).toHaveLength(1);
      expect(transport.calls).toHaveLength(1);
    });

    it('stops when values are empty', async () => {
      // Arrange
      transport.respondWith({
        dashboards: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
      });

      // Act
      const items: unknown[] = [];
      for await (const item of dashboards.listAll()) {
        items.push(item);
      }

      // Assert
      expect(items).toHaveLength(0);
      expect(transport.calls).toHaveLength(1);
    });

    it('passes params to the underlying list call', async () => {
      // Arrange
      transport.respondWith({
        dashboards: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
      });

      // Act
      for await (const _ of dashboards.listAll({ filter: 'my', orderBy: 'name' })) {
        // consume
      }

      // Assert
      expect(transport.calls[0]?.options.query).toMatchObject({
        filter: 'my',
        orderBy: 'name',
      });
    });
  });
});
