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
      // Arrange — pages are sized at the caller's `maxResults` (PR review
      // of B033: short-page termination uses the CALLER-supplied page size,
      // not the server's echo, so a page of N items with `maxResults: N`
      // continues iteration; a partial page terminates).
      transport
        .respondWith({
          dashboards: [makeDashboard('1', 'Dashboard 1')],
          startAt: 0,
          maxResults: 1,
          total: 2,
        })
        .respondWith({
          dashboards: [makeDashboard('2', 'Dashboard 2')],
          startAt: 1,
          maxResults: 1,
          total: 2,
        });

      // Act
      const items: { id: string }[] = [];
      for await (const dashboard of dashboards.listAll({ maxResults: 1 })) {
        items.push(dashboard);
      }

      // Assert
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
      expect(transport.calls).toHaveLength(2);
    });

    it('PR review of B033: short-page termination ends iteration when server returns < maxResults rows and omits total', async () => {
      // A normal "last page" — server returned 3 rows for a page size of 50
      // and didn't bother setting `total`. The new short-page check must
      // recognise this and exit; previously the loop would have run all the
      // way to `maxPages` (up to 10k wasted requests).
      transport.respondWith({
        dashboards: [makeDashboard('1', 'D1'), makeDashboard('2', 'D2'), makeDashboard('3', 'D3')],
        startAt: 0,
        maxResults: 50,
        // total deliberately omitted
      });

      const items: { id: string }[] = [];
      for await (const dashboard of dashboards.listAll()) {
        items.push(dashboard);
      }

      expect(items).toHaveLength(3);
      expect(transport.calls).toHaveLength(1);
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

    it('B033: caps iteration at maxPages when server returns total: undefined forever', async () => {
      // Hostile server: every response carries a FULL page (matching the
      // caller-supplied `maxResults: 1`) with no `total`, which would loop
      // forever under the old implementation. The short-page check does
      // NOT fire here because `values.length === maxResults`, so the
      // maxPages cap is the only thing standing between the client and an
      // infinite request stream — exactly the case B033 was built for.
      for (let i = 0; i < 20; i++) {
        transport.respondWith({
          dashboards: [makeDashboard(String(i), `Dashboard ${i}`)],
          startAt: i,
          maxResults: 1,
          // total deliberately omitted
        });
      }

      const items: { id: string }[] = [];
      // Pass maxPages: 5 so the test terminates promptly instead of running
      // for 10 000 pages (the default cap that protects production).
      for await (const dashboard of dashboards.listAll({ maxResults: 1 }, { maxPages: 5 })) {
        items.push(dashboard);
      }

      // Must terminate after exactly 5 page fetches (one item each)
      expect(items).toHaveLength(5);
      expect(transport.calls).toHaveLength(5);
    });

    it('B033: throws RangeError when maxPages is not a positive integer', async () => {
      transport.respondWith(makeRawListResponse([]));
      const iterator = dashboards.listAll(undefined, { maxPages: 0 });
      await expect(iterator.next()).rejects.toBeInstanceOf(RangeError);
    });

    it('B033: throws RangeError when maxPages is fractional', async () => {
      transport.respondWith(makeRawListResponse([]));
      const iterator = dashboards.listAll(undefined, { maxPages: 1.5 });
      await expect(iterator.next()).rejects.toBeInstanceOf(RangeError);
    });

    it('B033 (PR review): does NOT emit a warn() when maxPages is intentionally small (1 or 2)', async () => {
      transport.respondWith({
        dashboards: [makeDashboard('1', 'D1')],
        startAt: 0,
        maxResults: 1,
      });

      const warnings: string[] = [];
      const noop = (): void => undefined;
      const logger = {
        debug: noop,
        info: noop,
        warn: (msg: string): void => {
          warnings.push(msg);
        },
        error: noop,
      };

      for await (const _ of dashboards.listAll(undefined, { maxPages: 1, logger })) {
        // consume
      }

      expect(warnings).toEqual([]);
    });

    it('B033: emits a warn() once the page count crosses 80% of maxPages', async () => {
      // Full pages (caller `maxResults: 1`, server returns 1 row) keep
      // iteration going past the 80% threshold so the warn() fires; the
      // short-page check would otherwise terminate before the threshold.
      for (let i = 0; i < 10; i++) {
        transport.respondWith({
          dashboards: [makeDashboard(String(i), `D${i}`)],
          startAt: i,
          maxResults: 1,
        });
      }

      const warnings: string[] = [];
      const noop = (): void => undefined;
      const logger = {
        debug: noop,
        info: noop,
        warn: (msg: string): void => {
          warnings.push(msg);
        },
        error: noop,
      };

      for await (const _ of dashboards.listAll({ maxResults: 1 }, { maxPages: 5, logger })) {
        // consume
      }

      expect(warnings.some((m) => m.includes('nearing maxPages'))).toBe(true);
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

  // ── B391: listGadgets ────────────────────────────────────────────────────

  describe('listGadgets()', () => {
    it('calls GET /dashboard/{dashboardId}/gadget', async () => {
      transport.respondWith({ gadgets: [{ id: 1 }] });
      const result = await dashboards.listGadgets('10001');
      expect(result).toEqual({ gadgets: [{ id: 1 }] });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/dashboard/10001/gadget`,
      });
    });

    it.each(['.', '..'])('rejects dot-segment dashboardId: %s', async (id) => {
      await expect(dashboards.listGadgets(id)).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
    });
  });

  // ── B392: addGadget ──────────────────────────────────────────────────────

  describe('addGadget()', () => {
    it('calls POST /dashboard/{dashboardId}/gadget and strips undefined keys', async () => {
      transport.respondWith({ id: 7 });
      const result = await dashboards.addGadget('10001', {
        moduleKey: 'com.x:gadget',
        position: { row: 1, column: 2 },
        title: 'X',
      });
      expect(result).toEqual({ id: 7 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/dashboard/10001/gadget`,
      });
      // body must not include unspecified keys
      expect(transport.lastCall?.options.body).toEqual({
        moduleKey: 'com.x:gadget',
        position: { row: 1, column: 2 },
        title: 'X',
      });
    });

    it('forwards every body field', async () => {
      transport.respondWith({ id: 1 });
      await dashboards.addGadget('10001', {
        moduleKey: 'mk',
        uri: 'u',
        color: 'blue',
        position: { row: 1, column: 1 },
        title: 't',
        ignoreUriAndModuleKeyValidation: true,
      });
      expect(transport.lastCall?.options.body).toEqual({
        moduleKey: 'mk',
        uri: 'u',
        color: 'blue',
        position: { row: 1, column: 1 },
        title: 't',
        ignoreUriAndModuleKeyValidation: true,
      });
    });

    it('sends an empty body when no fields are supplied', async () => {
      transport.respondWith({ id: 1 });
      await dashboards.addGadget('10001', {});
      expect(transport.lastCall?.options.body).toEqual({});
    });
  });

  // ── B394: updateGadget ───────────────────────────────────────────────────

  describe('updateGadget()', () => {
    it('calls PUT /dashboard/{dashboardId}/gadget/{gadgetId} with body', async () => {
      transport.respondWith(undefined);
      await dashboards.updateGadget('10001', 5, { title: 'New', color: 'red' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/dashboard/10001/gadget/5`,
        body: { title: 'New', color: 'red' },
      });
    });

    it('sends empty body when no fields supplied', async () => {
      transport.respondWith(undefined);
      await dashboards.updateGadget('10001', 5, {});
      expect(transport.lastCall?.options.body).toEqual({});
    });

    it('includes position when supplied', async () => {
      transport.respondWith(undefined);
      await dashboards.updateGadget('10001', 5, { position: { row: 1, column: 2 } });
      expect(transport.lastCall?.options.body).toEqual({ position: { row: 1, column: 2 } });
    });

    it.each([0, -1, 1.5, Number.NaN])(
      'rejects non-positive-integer gadgetId: %s',
      async (gadgetId) => {
        await expect(dashboards.updateGadget('10001', gadgetId, {})).rejects.toThrow(
          'gadgetId must be a positive integer',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── B393: removeGadget ───────────────────────────────────────────────────

  describe('removeGadget()', () => {
    it('calls DELETE /dashboard/{dashboardId}/gadget/{gadgetId}', async () => {
      transport.respondWith(undefined);
      await dashboards.removeGadget('10001', 5);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/dashboard/10001/gadget/5`,
      });
    });

    it.each([0, -1, 1.5])('rejects non-positive-integer gadgetId: %s', async (gadgetId) => {
      await expect(dashboards.removeGadget('10001', gadgetId)).rejects.toThrow(
        'gadgetId must be a positive integer',
      );
    });
  });

  // ── B395: listItemProperties ─────────────────────────────────────────────

  describe('listItemProperties()', () => {
    it('calls GET /dashboard/{dashboardId}/items/{itemId}/properties', async () => {
      transport.respondWith({ keys: [{ self: 'x', key: 'k' }] });
      const result = await dashboards.listItemProperties('10001', 'itm-1');
      expect(result).toEqual({ keys: [{ self: 'x', key: 'k' }] });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/dashboard/10001/items/itm-1/properties`,
      });
    });

    it('encodes dashboardId and itemId in the path', async () => {
      transport.respondWith({ keys: [] });
      await dashboards.listItemProperties('a/b', 'c d');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/dashboard/a%2Fb/items/c%20d/properties`,
      );
    });
  });

  // ── B397: getItemProperty ────────────────────────────────────────────────

  describe('getItemProperty()', () => {
    it('calls GET .../properties/{propertyKey}', async () => {
      transport.respondWith({ key: 'k', value: 42 });
      const result = await dashboards.getItemProperty('10001', 'itm-1', 'my-key');
      expect(result).toEqual({ key: 'k', value: 42 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/dashboard/10001/items/itm-1/properties/my-key`,
      });
    });

    it('encodes propertyKey in path', async () => {
      transport.respondWith({ key: '', value: null });
      await dashboards.getItemProperty('10001', 'itm-1', 'a/b c');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/dashboard/10001/items/itm-1/properties/a%2Fb%20c`,
      );
    });

    it('rejects empty propertyKey', async () => {
      await expect(dashboards.getItemProperty('10001', 'itm-1', '')).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── B398: setItemProperty ────────────────────────────────────────────────

  describe('setItemProperty()', () => {
    it('calls PUT .../properties/{propertyKey} with arbitrary JSON body', async () => {
      transport.respondWith(undefined);
      await dashboards.setItemProperty('10001', 'itm-1', 'my-key', { hello: 'world' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/dashboard/10001/items/itm-1/properties/my-key`,
        body: { hello: 'world' },
      });
    });

    it('rejects empty propertyKey', async () => {
      await expect(dashboards.setItemProperty('10001', 'itm-1', '', { x: 1 })).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── B396: deleteItemProperty ─────────────────────────────────────────────

  describe('deleteItemProperty()', () => {
    it('calls DELETE .../properties/{propertyKey}', async () => {
      transport.respondWith(undefined);
      await dashboards.deleteItemProperty('10001', 'itm-1', 'my-key');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/dashboard/10001/items/itm-1/properties/my-key`,
      });
    });

    it('rejects empty propertyKey', async () => {
      await expect(dashboards.deleteItemProperty('10001', 'itm-1', '')).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
    });
  });

  // ── B402: copy ───────────────────────────────────────────────────────────

  describe('copy()', () => {
    it('calls POST /dashboard/{id}/copy with provided body', async () => {
      transport.respondWith({ id: '2', name: 'Copy' });
      const result = await dashboards.copy('10001', {
        name: 'Copy',
        description: 'desc',
        sharePermissions: [{ type: 'global' }],
        editPermissions: [{ type: 'loggedin' }],
      });
      expect(result).toEqual({ id: '2', name: 'Copy' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/dashboard/10001/copy`,
        body: {
          name: 'Copy',
          description: 'desc',
          sharePermissions: [{ type: 'global' }],
          editPermissions: [{ type: 'loggedin' }],
        },
      });
    });

    it('sends empty body when no data supplied', async () => {
      transport.respondWith({ id: '2', name: 'X' });
      await dashboards.copy('10001');
      expect(transport.lastCall?.options.body).toEqual({});
    });

    it('strips undefined keys from partial copy data', async () => {
      transport.respondWith({ id: '2', name: 'X' });
      await dashboards.copy('10001', { name: 'X' });
      expect(transport.lastCall?.options.body).toEqual({ name: 'X' });
    });
  });

  // ── B403: bulkEdit ───────────────────────────────────────────────────────

  describe('bulkEdit()', () => {
    it('calls PUT /dashboard/bulk/edit with payload', async () => {
      transport.respondWith({ taskId: 't1' });
      const result = await dashboards.bulkEdit({
        entityIds: ['10001', '10002'],
        action: 'delete',
      });
      expect(result).toEqual({ taskId: 't1' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/dashboard/bulk/edit`,
        body: { entityIds: ['10001', '10002'], action: 'delete' },
      });
    });

    it('includes optional changeOwnerDetails and permissionDetails', async () => {
      transport.respondWith({});
      await dashboards.bulkEdit({
        entityIds: ['10001'],
        action: 'changeOwner',
        changeOwnerDetails: { newOwner: 'acc-1', autofixName: true },
        extendAdminPermissions: true,
        permissionDetails: { sharePermissions: [{ type: 'global' }] },
      });
      expect(transport.lastCall?.options.body).toEqual({
        entityIds: ['10001'],
        action: 'changeOwner',
        changeOwnerDetails: { newOwner: 'acc-1', autofixName: true },
        extendAdminPermissions: true,
        permissionDetails: { sharePermissions: [{ type: 'global' }] },
      });
    });

    it('rejects empty entityIds', async () => {
      await expect(dashboards.bulkEdit({ entityIds: [], action: 'delete' })).rejects.toThrow(
        'entityIds must be a non-empty array',
      );
      expect(transport.calls).toHaveLength(0);
    });

    it.each([[''], [123 as unknown as string]])(
      'rejects bad entityIds entry: %s',
      async (entry) => {
        await expect(dashboards.bulkEdit({ entityIds: [entry], action: 'delete' })).rejects.toThrow(
          'entityIds entries must be non-empty strings',
        );
      },
    );
  });

  // ── B404: listAvailableGadgets ───────────────────────────────────────────
  // Covers GET /rest/api/3/dashboard/gadgets (operationId: getAllAvailableDashboardGadgets).
  // The spec defines NO query parameters for this catalogue endpoint — all filters
  // (moduleKey, uri, gadgetId, dashboardId) belong to the per-dashboard endpoint
  // GET /dashboard/{dashboardId}/gadget (getAllGadgets), already covered by listGadgets().

  describe('listAvailableGadgets()', () => {
    it('calls GET /dashboard/gadgets with no query params', async () => {
      transport.respondWith({ gadgets: [] });
      await dashboards.listAvailableGadgets();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/dashboard/gadgets`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('returns the gadgets catalogue array', async () => {
      const catalogue = [
        { moduleKey: 'com.x:gadget-a', title: 'Gadget A' },
        { uri: 'rest/gadgets/1.0/g/gadget-b.xml', title: 'Gadget B' },
      ];
      transport.respondWith({ gadgets: catalogue });
      const result = await dashboards.listAvailableGadgets();
      expect(result.gadgets).toEqual(catalogue);
    });
  });

  // ── B405: search ─────────────────────────────────────────────────────────

  describe('search()', () => {
    it('calls GET /dashboard/search and normalizes response', async () => {
      transport.respondWith({
        values: [makeDashboard('1', 'D1')],
        startAt: 0,
        maxResults: 50,
        total: 1,
      });
      const result = await dashboards.search();
      expect(result.values).toHaveLength(1);
      expect(result.startAt).toBe(0);
      expect(result.total).toBe(1);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/dashboard/search`,
      });
    });

    it('passes the full filter set', async () => {
      transport.respondWith({
        values: [],
        startAt: 0,
        maxResults: 25,
        total: 0,
      });
      await dashboards.search({
        dashboardName: 'Sprint',
        accountId: 'acc-1',
        owner: 'acc-2',
        groupname: 'devs',
        groupId: 'grp-1',
        projectId: 100,
        orderBy: 'name',
        startAt: 5,
        maxResults: 25,
        status: 'active',
        expand: 'owner',
      });
      expect(transport.lastCall?.options.query).toEqual({
        dashboardName: 'Sprint',
        accountId: 'acc-1',
        owner: 'acc-2',
        groupname: 'devs',
        groupId: 'grp-1',
        projectId: 100,
        orderBy: 'name',
        startAt: 5,
        maxResults: 25,
        status: 'active',
        expand: 'owner',
      });
    });

    it('omits unset query keys', async () => {
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0 });
      await dashboards.search({ dashboardName: 'Sprint' });
      expect(transport.lastCall?.options.query).toEqual({ dashboardName: 'Sprint' });
    });

    it.each([0, -1, 1.5, Infinity])('rejects bad maxResults: %s', async (maxResults) => {
      await expect(dashboards.search({ maxResults })).rejects.toThrow(RangeError);
    });

    it('PR review: returns total as undefined when server omits it', async () => {
      // OffsetPaginatedResponse.total is optional and Jira /dashboard/search
      // can omit it. Verify search() propagates the missing field rather
      // than asserting a number is always present.
      transport.respondWith({
        values: [makeDashboard('1', 'D1')],
        startAt: 0,
        maxResults: 50,
        // total deliberately omitted
      });
      const result = await dashboards.search({ accountId: 'acc-1' });
      expect(result.total).toBeUndefined();
      expect(result.values).toHaveLength(1);
      // Exercise the dashboardName-omitted branch in the query builder.
      expect(transport.lastCall?.options.query).toEqual({ accountId: 'acc-1' });
    });
  });

  // ── B405: searchAll ──────────────────────────────────────────────────────

  describe('searchAll()', () => {
    it('paginates across multiple search responses', async () => {
      transport
        .respondWith({
          values: [makeDashboard('1', 'D1')],
          startAt: 0,
          maxResults: 1,
          total: 2,
        })
        .respondWith({
          values: [makeDashboard('2', 'D2')],
          startAt: 1,
          maxResults: 1,
          total: 2,
        });

      const items: { id: string }[] = [];
      for await (const d of dashboards.searchAll({ maxResults: 1 })) {
        items.push(d);
      }

      expect(items).toHaveLength(2);
      expect(transport.calls).toHaveLength(2);
    });

    it('stops on empty page', async () => {
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0 });
      const items: unknown[] = [];
      for await (const d of dashboards.searchAll()) items.push(d);
      expect(items).toHaveLength(0);
      expect(transport.calls).toHaveLength(1);
    });

    it('short-page termination when server omits total', async () => {
      transport.respondWith({
        values: [makeDashboard('1', 'D1')],
        startAt: 0,
        maxResults: 50,
      });
      const items: unknown[] = [];
      for await (const d of dashboards.searchAll()) items.push(d);
      expect(items).toHaveLength(1);
      expect(transport.calls).toHaveLength(1);
    });

    it('caps at maxPages for hostile servers', async () => {
      for (let i = 0; i < 20; i++) {
        transport.respondWith({
          values: [makeDashboard(String(i), `D${i}`)],
          startAt: i,
          maxResults: 1,
        });
      }
      const items: unknown[] = [];
      for await (const d of dashboards.searchAll({ maxResults: 1 }, { maxPages: 5 })) {
        items.push(d);
      }
      expect(items).toHaveLength(5);
      expect(transport.calls).toHaveLength(5);
    });

    it('throws RangeError when maxPages is not a positive integer', async () => {
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0 });
      const iterator = dashboards.searchAll(undefined, { maxPages: 0 });
      await expect(iterator.next()).rejects.toBeInstanceOf(RangeError);
    });

    it('passes the full filter set as query params', async () => {
      // searchAll delegates to paginateOffset, which uses values.length for
      // advancement (PR review [[B037]]). Verify every filter is forwarded
      // to the underlying GET /dashboard/search request.
      transport.respondWith({
        values: [makeDashboard('1', 'D1')],
        startAt: 0,
        maxResults: 50,
      });
      const items: unknown[] = [];
      for await (const d of dashboards.searchAll({
        dashboardName: 'Sprint',
        accountId: 'acc-1',
        owner: 'acc-2',
        groupname: 'devs',
        groupId: 'grp-1',
        projectId: 100,
        orderBy: 'name',
        status: 'active',
        expand: 'owner',
        maxResults: 50,
      })) {
        items.push(d);
      }
      expect(items).toHaveLength(1);
      // paginateOffset injects startAt + maxResults itself; verify the
      // resource-level params surface alongside them.
      expect(transport.calls[0]?.options.query).toMatchObject({
        dashboardName: 'Sprint',
        accountId: 'acc-1',
        owner: 'acc-2',
        groupname: 'devs',
        groupId: 'grp-1',
        projectId: 100,
        orderBy: 'name',
        status: 'active',
        expand: 'owner',
        startAt: 0,
        maxResults: 50,
      });
    });

    it('emits warn() at 80% of maxPages', async () => {
      for (let i = 0; i < 10; i++) {
        transport.respondWith({
          values: [makeDashboard(String(i), `D${i}`)],
          startAt: i,
          maxResults: 1,
        });
      }
      const warnings: string[] = [];
      const noop = (): void => undefined;
      const logger = {
        debug: noop,
        info: noop,
        warn: (msg: string): void => {
          warnings.push(msg);
        },
        error: noop,
      };
      for await (const _ of dashboards.searchAll({ maxResults: 1 }, { maxPages: 5, logger })) {
        // consume
      }
      expect(warnings.some((m) => m.includes('nearing maxPages'))).toBe(true);
    });
  });
});
