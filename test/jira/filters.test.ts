import { describe, it, expect, beforeEach } from 'vitest';
import { FiltersResource } from '../../src/jira/resources/filters.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeFilter = (id: string, name: string) => ({
  id,
  self: `${BASE_URL}/filter/${id}`,
  name,
  jql: 'project = PROJ',
});

const makeListResponse = <T>(values: T[]) => ({
  values,
  startAt: 0,
  maxResults: 50,
  total: values.length,
});

describe('FiltersResource', () => {
  let transport: MockTransport;
  let filters: FiltersResource;

  beforeEach(() => {
    transport = new MockTransport();
    filters = new FiltersResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /filter/search with no params', async () => {
      // Arrange
      const payload = makeListResponse([makeFilter('1', 'My Filter')]);
      transport.respondWith(payload);

      // Act
      const result = await filters.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/filter/search`,
      });
    });

    it('passes all supported params correctly', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await filters.list({
        startAt: 5,
        maxResults: 20,
        expand: 'sharePermissions',
        id: [1, 2, 3],
        orderBy: 'name',
      });

      // Assert — `id` is a `type: array` query param emitted as repeated params
      // built into the path; the scalar bag carries only the scalar params.
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/filter/search?id=1&id=2&id=3`);
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 20,
        expand: 'sharePermissions',
        orderBy: 'name',
      });
    });

    it('emits id array as repeated query params', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await filters.list({ id: [10, 20] });

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/filter/search?id=10&id=20`);
    });

    it('omits id param when not provided', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await filters.list({ expand: 'sharePermissions' });

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['id']).toBeUndefined();
    });

    it('throws RangeError for maxResults: 0', async () => {
      await expect(filters.list({ maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: -1', async () => {
      await expect(filters.list({ maxResults: -1 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: 1.5', async () => {
      await expect(filters.list({ maxResults: 1.5 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: Infinity', async () => {
      await expect(filters.list({ maxResults: Infinity })).rejects.toThrow(RangeError);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /filter/{id}', async () => {
      // Arrange
      const filter = makeFilter('10001', 'My Filter');
      transport.respondWith(filter);

      // Act
      const result = await filters.get('10001');

      // Assert
      expect(result).toEqual(filter);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/filter/10001`,
      });
    });

    it('encodes id with slash in get()', async () => {
      // Arrange
      transport.respondWith(makeFilter('x', 'x'));

      // Act
      await filters.get('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/filter/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment id in get(): %s',
      async (id) => {
        await expect(filters.get(id)).rejects.toThrow('path parameter must not be "." or ".."');
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /filter with the provided data', async () => {
      // Arrange
      const filter = makeFilter('1', 'New Filter');
      transport.respondWith(filter);
      const data = {
        name: 'New Filter',
        jql: 'project = PROJ',
        favourite: true,
      };

      // Act
      const result = await filters.create(data);

      // Assert
      expect(result).toEqual(filter);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/filter`,
        body: data,
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /filter/{id} with the provided data', async () => {
      // Arrange
      const filter = makeFilter('10001', 'Updated Filter');
      transport.respondWith(filter);
      const data = { name: 'Updated Filter', jql: 'project = NEWPROJ' };

      // Act
      const result = await filters.update('10001', data);

      // Assert
      expect(result).toEqual(filter);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/filter/10001`,
        body: data,
      });
    });

    it('encodes id in update()', async () => {
      // Arrange
      transport.respondWith(makeFilter('x', 'x'));

      // Act
      await filters.update('../admin', { name: 'x' });

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/filter/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment id in update(): %s',
      async (id) => {
        await expect(filters.update(id, { name: 'x' })).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /filter/{id}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await filters.delete('10001');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/filter/10001`,
      });
    });

    it('encodes id in delete()', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await filters.delete('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/filter/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment id in delete(): %s',
      async (id) => {
        await expect(filters.delete(id)).rejects.toThrow('path parameter must not be "." or ".."');
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('paginates with offset across multiple responses and yields all filters', async () => {
      // Arrange
      transport
        .respondWith({
          values: [makeFilter('1', 'Filter 1')],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeFilter('2', 'Filter 2')],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      // Act
      const items: { id: string }[] = [];
      for await (const filter of filters.listAll()) {
        items.push(filter);
      }

      // Assert
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
      expect(transport.calls).toHaveLength(2);
    });

    it('passes params to the underlying pagination call', async () => {
      // Arrange
      transport.respondWith({
        values: [],
        startAt: 0,
        maxResults: 10,
        total: 0,
        isLast: true,
      });

      // Act
      for await (const _ of filters.listAll({ maxResults: 10, orderBy: 'name', expand: 'owner' })) {
        // consume
      }

      // Assert
      expect(transport.calls[0]?.options.query).toMatchObject({
        maxResults: 10,
        orderBy: 'name',
        expand: 'owner',
      });
    });

    it('works with no params', async () => {
      // Arrange
      transport.respondWith({
        values: [],
        startAt: 0,
        maxResults: 50,
        isLast: true,
      });

      // Act
      const items: unknown[] = [];
      for await (const item of filters.listAll()) {
        items.push(item);
      }

      // Assert
      expect(items).toHaveLength(0);
    });

    it('passes id array as repeated query params', async () => {
      // Arrange
      transport.respondWith({
        values: [],
        startAt: 0,
        maxResults: 50,
        isLast: true,
      });

      // Act
      for await (const _ of filters.listAll({ id: [1, 2, 3] })) {
        // consume
      }

      // Assert — repeated params are built into the basePath passed to paginateOffset.
      expect(transport.calls[0]?.options.path).toBe(`${BASE_URL}/filter/search?id=1&id=2&id=3`);
    });

    it('omits id param in listAll when not provided', async () => {
      // Arrange
      transport.respondWith({
        values: [],
        startAt: 0,
        maxResults: 50,
        isLast: true,
      });

      // Act
      for await (const _ of filters.listAll({ expand: 'owner' })) {
        // consume
      }

      // Assert
      const query = transport.calls[0]?.options.query ?? {};
      expect(query['id']).toBeUndefined();
    });
  });

  // ── columns (B452-B454) ───────────────────────────────────────────────────

  describe('getColumns()', () => {
    it('calls GET /filter/{id}/columns', async () => {
      const cols = [
        { label: 'Key', value: 'issuekey' },
        { label: 'Summary', value: 'summary' },
      ];
      transport.respondWith(cols);

      const result = await filters.getColumns('10001');

      expect(result).toEqual(cols);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/filter/10001/columns`,
      });
    });

    it('rejects dot-segment id', async () => {
      await expect(filters.getColumns('..')).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('setColumns()', () => {
    it('calls PUT /filter/{id}/columns with the body shape', async () => {
      transport.respondWith(undefined);

      await filters.setColumns('10001', ['issuekey', 'summary', 'assignee']);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/filter/10001/columns`,
        body: { columns: ['issuekey', 'summary', 'assignee'] },
      });
    });

    it('encodes id in setColumns()', async () => {
      transport.respondWith(undefined);
      await filters.setColumns('../admin', ['x']);
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/filter/..%2Fadmin/columns`);
    });
  });

  describe('resetColumns()', () => {
    it('calls DELETE /filter/{id}/columns', async () => {
      transport.respondWith(undefined);

      await filters.resetColumns('10001');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/filter/10001/columns`,
      });
    });

    it('rejects dot-segment id', async () => {
      await expect(filters.resetColumns('.')).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
    });
  });

  // ── favourites (B455-B456, B464) ──────────────────────────────────────────

  describe('addFavourite()', () => {
    it('calls PUT /filter/{id}/favourite', async () => {
      const filter = makeFilter('10001', 'F');
      transport.respondWith(filter);

      const result = await filters.addFavourite('10001');

      expect(result).toEqual(filter);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/filter/10001/favourite`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards --expand', async () => {
      transport.respondWith(makeFilter('1', 'F'));
      await filters.addFavourite('10001', { expand: 'sharePermissions' });
      expect(transport.lastCall?.options.query).toMatchObject({ expand: 'sharePermissions' });
    });
  });

  describe('removeFavourite()', () => {
    it('calls DELETE /filter/{id}/favourite', async () => {
      const filter = makeFilter('10001', 'F');
      transport.respondWith(filter);

      const result = await filters.removeFavourite('10001');

      expect(result).toEqual(filter);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/filter/10001/favourite`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards --expand', async () => {
      transport.respondWith(makeFilter('1', 'F'));
      await filters.removeFavourite('10001', { expand: 'owner' });
      expect(transport.lastCall?.options.query).toMatchObject({ expand: 'owner' });
    });
  });

  describe('listFavourites()', () => {
    it('calls GET /filter/favourite', async () => {
      const list = [makeFilter('1', 'F'), makeFilter('2', 'G')];
      transport.respondWith(list);

      const result = await filters.listFavourites();

      expect(result).toEqual(list);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/filter/favourite`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards --expand', async () => {
      transport.respondWith([]);
      await filters.listFavourites({ expand: 'owner' });
      expect(transport.lastCall?.options.query).toMatchObject({ expand: 'owner' });
    });
  });

  // ── my (B465) ─────────────────────────────────────────────────────────────

  describe('listMy()', () => {
    it('calls GET /filter/my', async () => {
      const list = [makeFilter('1', 'Mine')];
      transport.respondWith(list);

      const result = await filters.listMy();

      expect(result).toEqual(list);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/filter/my`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards expand + includeFavourites', async () => {
      transport.respondWith([]);
      await filters.listMy({ expand: 'sharePermissions', includeFavourites: true });
      expect(transport.lastCall?.options.query).toMatchObject({
        expand: 'sharePermissions',
        includeFavourites: true,
      });
    });
  });

  // ── owner (B457) ──────────────────────────────────────────────────────────

  describe('changeOwner()', () => {
    it('calls PUT /filter/{id}/owner with accountId body', async () => {
      transport.respondWith(undefined);

      await filters.changeOwner('10001', 'acc-123');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/filter/10001/owner`,
        body: { accountId: 'acc-123' },
      });
    });

    it('rejects dot-segment id', async () => {
      await expect(filters.changeOwner('.', 'a')).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
    });
  });

  // ── permissions (B458-B461) ───────────────────────────────────────────────

  describe('listPermissions()', () => {
    it('calls GET /filter/{id}/permission', async () => {
      const perms = [{ type: 'global' as const }];
      transport.respondWith(perms);

      const result = await filters.listPermissions('10001');

      expect(result).toEqual(perms);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/filter/10001/permission`,
      });
    });
  });

  describe('addPermission()', () => {
    it('calls POST /filter/{id}/permission with body', async () => {
      transport.respondWith([{ type: 'project', project: { id: '10000' } }]);

      const result = await filters.addPermission('10001', {
        type: 'project',
        projectId: '10000',
      });

      expect(result).toEqual([{ type: 'project', project: { id: '10000' } }]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/filter/10001/permission`,
        body: { type: 'project', projectId: '10000' },
      });
    });
  });

  describe('getPermission()', () => {
    it('calls GET /filter/{id}/permission/{permissionId}', async () => {
      const perm = { type: 'group' as const, group: { name: 'devs' } };
      transport.respondWith(perm);

      const result = await filters.getPermission('10001', '20001');

      expect(result).toEqual(perm);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/filter/10001/permission/20001`,
      });
    });

    it('encodes both ids in getPermission()', async () => {
      transport.respondWith({ type: 'global' });
      await filters.getPermission('a/b', 'c/d');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/filter/a%2Fb/permission/c%2Fd`);
    });

    it('rejects dot-segment permissionId', async () => {
      await expect(filters.getPermission('10001', '..')).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
    });
  });

  describe('deletePermission()', () => {
    it('calls DELETE /filter/{id}/permission/{permissionId}', async () => {
      transport.respondWith(undefined);

      await filters.deletePermission('10001', '20001');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/filter/10001/permission/20001`,
      });
    });

    it('rejects dot-segment id', async () => {
      await expect(filters.deletePermission('.', '20001')).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
    });
  });

  // ── default share scope (B462-B463) ───────────────────────────────────────

  describe('getDefaultShareScope()', () => {
    it('calls GET /filter/defaultShareScope', async () => {
      const scope = { scope: 'GLOBAL' as const };
      transport.respondWith(scope);

      const result = await filters.getDefaultShareScope();

      expect(result).toEqual(scope);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/filter/defaultShareScope`,
      });
    });
  });

  describe('setDefaultShareScope()', () => {
    it('calls PUT /filter/defaultShareScope with scope body', async () => {
      const scope = { scope: 'PRIVATE' as const };
      transport.respondWith(scope);

      const result = await filters.setDefaultShareScope('PRIVATE');

      expect(result).toEqual(scope);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/filter/defaultShareScope`,
        body: { scope: 'PRIVATE' },
      });
    });
  });
});
