import { describe, it, expect, beforeEach } from 'vitest';
import { DatabasesResource } from '../../src/confluence/resources/databases.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const sampleDatabase = {
  id: 'db-1',
  type: 'database',
  status: 'current',
  title: 'Inventory',
  spaceId: 'space-1',
  version: { number: 1 },
};

const sampleProperty = {
  id: 'prop-1',
  key: 'feature-flags',
  value: { beta: true },
  version: { number: 3 },
};

describe('DatabasesResource', () => {
  let transport: MockTransport;
  let resource: DatabasesResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new DatabasesResource(transport, BASE_URL);
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('issues POST /databases with body and no query when params omitted', async () => {
      // Arrange
      transport.respondWith(sampleDatabase);

      // Act
      const result = await resource.create({ spaceId: 'space-1', title: 'Inventory' });

      // Assert
      expect(result).toEqual(sampleDatabase);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/databases`,
        body: { spaceId: 'space-1', title: 'Inventory' },
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('passes private flag through as query parameter', async () => {
      // Arrange
      transport.respondWith(sampleDatabase);

      // Act
      await resource.create({ spaceId: 'space-1' }, { private: true });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ private: true });
    });

    it('forwards parentId when supplied', async () => {
      // Arrange
      transport.respondWith(sampleDatabase);

      // Act
      await resource.create({ spaceId: 'space-1', parentId: 'parent-9' });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({
        spaceId: 'space-1',
        parentId: 'parent-9',
      });
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('issues GET /databases/{id} with no query when params omitted', async () => {
      // Arrange
      transport.respondWith(sampleDatabase);

      // Act
      const result = await resource.get('db-1');

      // Assert
      expect(result).toEqual(sampleDatabase);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/databases/db-1`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('serialises all four include-* flags into the query', async () => {
      // Arrange
      transport.respondWith(sampleDatabase);

      // Act
      await resource.get('db-1', {
        'include-collaborators': true,
        'include-direct-children': true,
        'include-operations': true,
        'include-properties': true,
      });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({
        'include-collaborators': true,
        'include-direct-children': true,
        'include-operations': true,
        'include-properties': true,
      });
    });

    it('encodes the database ID path segment', async () => {
      // Arrange
      transport.respondWith(sampleDatabase);

      // Act
      await resource.get('weird/id');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/databases/weird%2Fid`);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('issues DELETE /databases/{id} with no body or query', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await resource.delete('db-1');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/databases/db-1`,
      });
      expect(transport.lastCall?.options.body).toBeUndefined();
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── listAncestors ─────────────────────────────────────────────────────────

  describe('listAncestors()', () => {
    it('issues GET /databases/{id}/ancestors and returns the wrapped { results } shape', async () => {
      // Arrange — ancestors is bare-{results}, NOT cursor-paginated.
      const payload = { results: [{ id: 'a1', type: 'page' as const }] };
      transport.respondWith(payload);

      // Act
      const result = await resource.listAncestors('db-1');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/databases/db-1/ancestors`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('passes limit through to the request query', async () => {
      // Arrange
      transport.respondWith({ results: [] });

      // Act
      await resource.listAncestors('db-1', { limit: 10 });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ limit: 10 });
    });

    it('throws RangeError when limit is non-positive', async () => {
      await expect(resource.listAncestors('db-1', { limit: 0 })).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── listDescendants ───────────────────────────────────────────────────────

  describe('listDescendants()', () => {
    it('issues GET /databases/{id}/descendants with depth, limit, cursor', async () => {
      // Arrange
      const payload = {
        results: [{ id: 'd1', type: 'page', depth: 1 }],
        _links: { next: '/wiki/api/v2/databases/db-1/descendants?cursor=c2' },
      };
      transport.respondWith(payload);

      // Act
      const result = await resource.listDescendants('db-1', {
        limit: 25,
        depth: 3,
        cursor: 'c1',
      });

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/databases/db-1/descendants`,
      });
      expect(transport.lastCall?.options.query).toEqual({
        limit: 25,
        depth: 3,
        cursor: 'c1',
      });
    });

    it('omits keys when params not supplied', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.listDescendants('db-1');

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── listDescendantsAll ────────────────────────────────────────────────────

  describe('listDescendantsAll()', () => {
    it('iterates pages until _links.next is absent', async () => {
      // Arrange
      transport
        .respondWith({
          results: [{ id: 'a' }, { id: 'b' }],
          _links: { next: '/wiki/api/v2/databases/db-1/descendants?cursor=c2' },
        })
        .respondWith({
          results: [{ id: 'c' }],
          _links: {},
        });

      // Act
      const ids: string[] = [];
      for await (const d of resource.listDescendantsAll('db-1')) {
        ids.push(d.id);
      }

      // Assert
      expect(ids).toEqual(['a', 'b', 'c']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({});
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'c2' });
    });

    it('throws RangeError when limit is invalid before any request', async () => {
      const iter = resource.listDescendantsAll('db-1', { limit: -1 });
      await expect(iter.next()).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });

    it('passes depth + limit into the first request', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      const iter = resource.listDescendantsAll('db-1', { limit: 5, depth: 2 });
      await iter.next();

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ limit: 5, depth: 2 });
    });
  });

  // ── listDirectChildren ────────────────────────────────────────────────────

  describe('listDirectChildren()', () => {
    it('issues GET /databases/{id}/direct-children with limit, cursor, sort', async () => {
      // Arrange
      const payload = {
        results: [{ id: 'c1', title: 'Child' }],
        _links: {},
      };
      transport.respondWith(payload);

      // Act
      const result = await resource.listDirectChildren('db-1', {
        limit: 10,
        cursor: 'tok',
        sort: '-title',
      });

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/databases/db-1/direct-children`,
      });
      expect(transport.lastCall?.options.query).toEqual({
        limit: 10,
        cursor: 'tok',
        sort: '-title',
      });
    });

    it('omits sort when not supplied', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.listDirectChildren('db-1');

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('throws RangeError when limit is invalid', async () => {
      await expect(resource.listDirectChildren('db-1', { limit: 0 })).rejects.toThrow(RangeError);
    });
  });

  // ── listDirectChildrenAll ─────────────────────────────────────────────────

  describe('listDirectChildrenAll()', () => {
    it('iterates pages until _links.next is absent', async () => {
      // Arrange
      transport
        .respondWith({
          results: [{ id: 'c1' }],
          _links: { next: '/wiki/api/v2/databases/db-1/direct-children?cursor=c2' },
        })
        .respondWith({ results: [{ id: 'c2' }], _links: {} });

      // Act
      const ids: string[] = [];
      for await (const c of resource.listDirectChildrenAll('db-1', { sort: 'title' })) {
        ids.push(c.id);
      }

      // Assert
      expect(ids).toEqual(['c1', 'c2']);
      expect(transport.calls[0]?.options.query).toMatchObject({ sort: 'title' });
    });

    it('throws RangeError when limit is invalid before any request', async () => {
      const iter = resource.listDirectChildrenAll('db-1', { limit: 0 });
      await expect(iter.next()).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });

    it('passes both limit and sort into the request query', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      const iter = resource.listDirectChildrenAll('db-1', { limit: 25, sort: 'created-date' });
      await iter.next();

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        limit: 25,
        sort: 'created-date',
      });
    });

    it('issues a bare request when called with no params', async () => {
      // Arrange — exercises the `params?.sort !== undefined` false branch.
      transport.respondWith({ results: [], _links: {} });

      // Act
      const iter = resource.listDirectChildrenAll('db-1');
      await iter.next();

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── getOperations ─────────────────────────────────────────────────────────

  describe('getOperations()', () => {
    it('issues GET /databases/{id}/operations', async () => {
      // Arrange
      const payload = { operations: [{ operation: 'read', targetType: 'database' }] };
      transport.respondWith(payload);

      // Act
      const result = await resource.getOperations('db-1');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/databases/db-1/operations`,
      });
    });
  });

  // ── classification level ──────────────────────────────────────────────────

  describe('getClassificationLevel()', () => {
    it('issues GET /databases/{id}/classification-level', async () => {
      // Arrange
      const level = {
        id: 'cl-1',
        name: 'Public',
        color: 'GREEN' as const,
        status: 'PUBLISHED' as const,
      };
      transport.respondWith(level);

      // Act
      const result = await resource.getClassificationLevel('db-1');

      // Assert
      expect(result).toEqual(level);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/databases/db-1/classification-level`,
      });
    });
  });

  describe('updateClassificationLevel()', () => {
    it('issues PUT /databases/{id}/classification-level with the body', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await resource.updateClassificationLevel('db-1', {
        id: 'cl-1',
        status: 'current',
      });

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/databases/db-1/classification-level`,
        body: { id: 'cl-1', status: 'current' },
      });
    });
  });

  describe('resetClassificationLevel()', () => {
    it('issues POST /databases/{id}/classification-level/reset with default body', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await resource.resetClassificationLevel('db-1');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/databases/db-1/classification-level/reset`,
        body: { status: 'current' },
      });
    });

    it('forwards an explicit body when supplied', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await resource.resetClassificationLevel('db-1', { status: 'current' });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({ status: 'current' });
    });
  });

  // ── content properties ────────────────────────────────────────────────────

  describe('listProperties()', () => {
    it('issues GET /databases/{id}/properties with all four query params', async () => {
      // Arrange
      const payload = { results: [sampleProperty], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await resource.listProperties('db-1', {
        key: 'feature-flags',
        sort: 'key',
        cursor: 'tok',
        limit: 10,
      });

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/databases/db-1/properties`,
      });
      expect(transport.lastCall?.options.query).toEqual({
        key: 'feature-flags',
        sort: 'key',
        cursor: 'tok',
        limit: 10,
      });
    });

    it('omits unset query keys', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.listProperties('db-1');

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('throws RangeError when limit is non-positive', async () => {
      await expect(resource.listProperties('db-1', { limit: 0 })).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('listPropertiesAll()', () => {
    it('paginates through every page until cursor is exhausted', async () => {
      // Arrange
      transport
        .respondWith({
          results: [{ ...sampleProperty, id: 'p1' }],
          _links: { next: '/wiki/api/v2/databases/db-1/properties?cursor=c2' },
        })
        .respondWith({
          results: [{ ...sampleProperty, id: 'p2' }],
          _links: {},
        });

      // Act
      const ids: string[] = [];
      for await (const p of resource.listPropertiesAll('db-1')) {
        ids.push(p.id ?? '');
      }

      // Assert
      expect(ids).toEqual(['p1', 'p2']);
      expect(transport.calls).toHaveLength(2);
    });

    it('passes key + sort + limit into the request query', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      const iter = resource.listPropertiesAll('db-1', { key: 'k', sort: '-key', limit: 5 });
      await iter.next();

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        key: 'k',
        sort: '-key',
        limit: 5,
      });
    });

    it('throws RangeError when limit is invalid before any request', async () => {
      const iter = resource.listPropertiesAll('db-1', { limit: -1 });
      await expect(iter.next()).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('createProperty()', () => {
    it('issues POST /databases/{id}/properties with the body', async () => {
      // Arrange
      transport.respondWith(sampleProperty);
      const data = { key: 'feature-flags', value: { beta: true } };

      // Act
      const result = await resource.createProperty('db-1', data);

      // Assert
      expect(result).toEqual(sampleProperty);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/databases/db-1/properties`,
        body: data,
      });
    });
  });

  describe('getProperty()', () => {
    it('issues GET /databases/{database-id}/properties/{property-id}', async () => {
      // Arrange
      transport.respondWith(sampleProperty);

      // Act
      const result = await resource.getProperty('db-1', 'prop-1');

      // Assert
      expect(result).toEqual(sampleProperty);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/databases/db-1/properties/prop-1`,
      });
    });

    it('encodes both path segments', async () => {
      // Arrange
      transport.respondWith(sampleProperty);

      // Act
      await resource.getProperty('a/b', 'c/d');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/databases/a%2Fb/properties/c%2Fd`);
    });
  });

  describe('updateProperty()', () => {
    it('issues PUT /databases/{database-id}/properties/{property-id} with the body', async () => {
      // Arrange
      transport.respondWith(sampleProperty);
      const data = {
        key: 'feature-flags',
        value: { beta: false },
        version: { number: 4 },
      };

      // Act
      const result = await resource.updateProperty('db-1', 'prop-1', data);

      // Assert
      expect(result).toEqual(sampleProperty);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/databases/db-1/properties/prop-1`,
        body: data,
      });
    });
  });

  describe('deleteProperty()', () => {
    it('issues DELETE /databases/{database-id}/properties/{property-id}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await resource.deleteProperty('db-1', 'prop-1');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/databases/db-1/properties/prop-1`,
      });
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('boom'));

      // Act + Assert
      await expect(resource.deleteProperty('db-1', 'prop-1')).rejects.toThrow('boom');
    });
  });
});
