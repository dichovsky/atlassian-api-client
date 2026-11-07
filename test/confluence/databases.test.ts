import { describe, it, expect, beforeEach } from 'vitest';
import { describeContentPermissions } from './content-permissions-suite.js';
import { DatabasesResource } from '../../src/confluence/resources/databases.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

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

    it('throws ValidationError when limit is non-positive', async () => {
      await expect(resource.listAncestors('db-1', { limit: 0 })).rejects.toThrow(ValidationError);
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

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listDescendantsAll('db-1', { limit: -1 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
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

    it('throws ValidationError when limit is invalid', async () => {
      await expect(resource.listDirectChildren('db-1', { limit: 0 })).rejects.toThrow(
        ValidationError,
      );
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

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listDirectChildrenAll('db-1', { limit: 0 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
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

    it('throws ValidationError when limit is non-positive', async () => {
      await expect(resource.listProperties('db-1', { limit: 0 })).rejects.toThrow(ValidationError);
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

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listPropertiesAll('db-1', { limit: -1 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
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

// ── data: fields, views, entries (experimental) ─────────────────────────────

describe('DatabasesResource data endpoints', () => {
  let transport: MockTransport;
  let resource: DatabasesResource;

  const listEnvelope = (results: unknown[], next?: string) => ({
    results,
    _links: {
      self: '/databases/42/x',
      base: 'https://test.atlassian.net/wiki',
      ...(next ? { next } : {}),
    },
    meta: { pageSize: 50, hasMore: next !== undefined },
  });

  beforeEach(() => {
    transport = new MockTransport();
    resource = new DatabasesResource(transport, BASE_URL);
  });

  describe.each([
    ['listFields', 'fields'],
    ['listViews', 'views'],
    ['listEntries', 'entries'],
  ] as const)('%s()', (method, leaf) => {
    it(`issues GET /databases/{id}/${leaf} with an empty query and no headers by default`, async () => {
      const payload = listEnvelope([{ id: 'x1' }]);
      transport.respondWith(payload);

      const result = await resource[method]('42');

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/databases/42/${leaf}`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
      expect(transport.lastCall?.options.headers).toBeUndefined();
    });

    it('passes limit and cursor as query and ifNoneMatch as the If-None-Match header', async () => {
      transport.respondWith(listEnvelope([]));

      await resource[method]('42', { limit: 250, cursor: 'tok', ifNoneMatch: '"etag-1"' });

      expect(transport.lastCall?.options.query).toEqual({ limit: 250, cursor: 'tok' });
      expect(transport.lastCall?.options.headers).toEqual({ 'If-None-Match': '"etag-1"' });
    });

    it('rejects an invalid limit before any request and encodes the id', async () => {
      await expect(resource[method]('42', { limit: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);

      transport.respondWith(listEnvelope([]));
      await resource[method]('a/b');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/databases/a%2Fb/${leaf}`);
    });
  });

  describe('listEntries() sort and filter', () => {
    it('sends sort and flattens scalar filters into filter[fieldId] keys', async () => {
      transport.respondWith(listEnvelope([]));

      await resource.listEntries('42', {
        sort: '-fld1',
        filter: { fld1: 'eq:Done', fld2: 7, fld3: true },
      });

      expect(transport.lastCall?.options.query).toEqual({
        sort: '-fld1',
        'filter[fld1]': 'eq:Done',
        'filter[fld2]': 7,
        'filter[fld3]': true,
      });
    });

    it('flattens range filters into filter[fieldId][operator] keys', async () => {
      transport.respondWith(listEnvelope([]));

      await resource.listEntries('42', {
        filter: { due: { gte: '2026-01-01', lt: '2027-01-01' }, qty: { gt: 3 } },
      });

      expect(transport.lastCall?.options.query).toEqual({
        'filter[due][gte]': '2026-01-01',
        'filter[due][lt]': '2027-01-01',
        'filter[qty][gt]': 3,
      });
    });

    it.each(['', 'a[b', 'a]b'])('rejects the field ID %j in a filter', async (fieldId) => {
      await expect(resource.listEntries('42', { filter: { [fieldId]: 'x' } })).rejects.toThrow(
        ValidationError,
      );
      expect(transport.calls).toHaveLength(0);
    });

    it('rejects an unknown range operator', async () => {
      await expect(
        resource.listEntries('42', {
          filter: { fld1: { neq: 'x' } as unknown as { gte: string } },
        }),
      ).rejects.toThrow('range operator');
      expect(transport.calls).toHaveLength(0);
    });

    it('rejects a filter condition that is neither scalar nor a range object', async () => {
      await expect(
        resource.listEntries('42', { filter: { fld1: null as unknown as string } }),
      ).rejects.toThrow('must be a string, number, boolean, or range object');
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe.each([
    ['listFieldsAll', 'fields'],
    ['listViewsAll', 'views'],
    ['listEntriesAll', 'entries'],
  ] as const)('%s()', (method, leaf) => {
    it('follows _links.next cursors and keeps limit, sort and filter on every page', async () => {
      transport
        .respondWith(listEnvelope([{ id: 'a' }], `/wiki/api/v2/databases/42/${leaf}?cursor=c2`))
        .respondWith(listEnvelope([{ id: 'b' }]));

      const params = {
        limit: 1,
        ...(method === 'listEntriesAll' ? { sort: 'f', filter: { f: 'x' } } : {}),
      };
      const ids: string[] = [];
      for await (const item of resource[method]('42', params)) {
        ids.push((item as { id: string }).id);
      }

      expect(ids).toEqual(['a', 'b']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.path).toBe(`${BASE_URL}/databases/42/${leaf}`);
      const expectedBase =
        method === 'listEntriesAll' ? { limit: 1, sort: 'f', 'filter[f]': 'x' } : { limit: 1 };
      expect(transport.calls[0]?.options.query).toEqual(expectedBase);
      expect(transport.calls[1]?.options.query).toEqual({ ...expectedBase, cursor: 'c2' });
    });

    it('sends an empty query without params and rejects an invalid limit', async () => {
      transport.respondWith(listEnvelope([]));

      for await (const item of resource[method]('42')) void item;

      expect(transport.lastCall?.options.query).toEqual({});
      await expect(resource[method]('42', { limit: -1 }).next()).rejects.toThrow(ValidationError);
    });
  });

  describe('getEntry()', () => {
    it('issues GET /databases/{id}/entries/{entryId} with encoded segments and no headers', async () => {
      const entry = {
        id: 'e1',
        databaseId: '42',
        values: { fld1: { type: 'text', plain: 'hi', rich: null } },
        _links: { self: '/databases/42/entries/e1', base: 'https://test.atlassian.net/wiki' },
      };
      transport.respondWith(entry);

      const result = await resource.getEntry('42', 'e/1');

      expect(result).toEqual(entry);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/databases/42/entries/e%2F1`,
      });
      expect(transport.lastCall?.options.headers).toBeUndefined();
    });

    it('sends ifNoneMatch as the If-None-Match header', async () => {
      transport.respondWith({});

      await resource.getEntry('42', 'e1', { ifNoneMatch: 'W/"abc"' });

      expect(transport.lastCall?.options.headers).toEqual({ 'If-None-Match': 'W/"abc"' });
    });

    it('rejects dot-segment entry IDs', async () => {
      await expect(resource.getEntry('42', '..')).rejects.toThrow(ValidationError);
    });
  });
});

describeContentPermissions(
  'DatabasesResource',
  'databases',
  (transport) => new DatabasesResource(transport, BASE_URL),
);
