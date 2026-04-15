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

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 20,
        expand: 'sharePermissions',
        id: '1,2,3',
        orderBy: 'name',
      });
    });

    it('joins id array with commas', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await filters.list({ id: [10, 20] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ id: '10,20' });
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

    it('passes id array as comma-joined string', async () => {
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

      // Assert
      expect(transport.calls[0]?.options.query).toMatchObject({ id: '1,2,3' });
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
});
