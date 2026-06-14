import { describe, it, expect, beforeEach } from 'vitest';
import { WhiteboardsResource } from '../../src/confluence/resources/whiteboards.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeWhiteboard = (id: string) => ({
  id,
  title: `Whiteboard ${id}`,
  status: 'current',
  spaceId: 'space-1',
});

const sampleProperty = {
  id: 'prop-1',
  key: 'feature-flags',
  value: { beta: true },
  version: { number: 3 },
};

describe('WhiteboardsResource', () => {
  let transport: MockTransport;
  let resource: WhiteboardsResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new WhiteboardsResource(transport, BASE_URL);
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('issues POST /whiteboards with body and no query when params omitted', async () => {
      const created = makeWhiteboard('99');
      transport.respondWith(created);

      const result = await resource.create({ spaceId: 'space-1', title: 'New Whiteboard' });

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/whiteboards`,
        body: { spaceId: 'space-1', title: 'New Whiteboard' },
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('passes private flag through as query parameter', async () => {
      transport.respondWith(makeWhiteboard('99'));

      await resource.create({ spaceId: 'space-1' }, { private: true });

      expect(transport.lastCall?.options.query).toEqual({ private: true });
    });

    it('forwards templateKey, locale, parentId when supplied', async () => {
      transport.respondWith(makeWhiteboard('99'));

      await resource.create({
        spaceId: 'space-1',
        parentId: 'p-9',
        templateKey: 'flow-chart',
        locale: 'en-US',
      });

      expect(transport.lastCall?.options.body).toEqual({
        spaceId: 'space-1',
        parentId: 'p-9',
        templateKey: 'flow-chart',
        locale: 'en-US',
      });
    });

    it('calls POST /whiteboards with only required fields', async () => {
      const created = makeWhiteboard('100');
      transport.respondWith(created);
      const data = { spaceId: 'SPACE' };

      const result = await resource.create(data);

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/whiteboards`,
        body: data,
      });
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /whiteboards/{id}', async () => {
      const item = makeWhiteboard('42');
      transport.respondWith(item);

      const result = await resource.get('42');

      expect(result).toEqual(item);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/whiteboards/42`,
      });
    });

    it('returns a fully populated WhiteboardSingle shape (type/ownerId/position/version)', async () => {
      // Mirrors the WhiteboardSingle schema in the Confluence v2 OpenAPI spec.
      const full = {
        id: 'wb-42',
        type: 'whiteboard',
        status: 'current',
        title: 'Roadmap',
        parentId: 'p-1',
        parentType: 'page' as const,
        position: 3,
        authorId: 'author-1',
        ownerId: 'owner-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        spaceId: 'space-1',
        version: {
          createdAt: '2025-01-01T00:00:00.000Z',
          message: 'initial',
          number: 1,
          minorEdit: false,
          authorId: 'author-1',
        },
        _links: { webui: '/x/wb-42', editui: '/pages/edit/wb-42' },
      };
      transport.respondWith(full);

      const result = await resource.get('wb-42');

      // Assert each new field is typed-accessible through the Whiteboard interface.
      expect(result.type).toBe('whiteboard');
      expect(result.ownerId).toBe('owner-1');
      expect(result.position).toBe(3);
      expect(result.version?.number).toBe(1);
      expect(result.version?.minorEdit).toBe(false);
      expect(result.parentType).toBe('page');
    });

    it('includes include-collaborators flag when passed', async () => {
      transport.respondWith(makeWhiteboard('42'));
      await resource.get('42', { 'include-collaborators': true });
      expect(transport.lastCall?.options.query).toMatchObject({
        'include-collaborators': true,
      });
    });

    it('includes include-direct-children flag when passed', async () => {
      transport.respondWith(makeWhiteboard('42'));
      await resource.get('42', { 'include-direct-children': true });
      expect(transport.lastCall?.options.query).toMatchObject({
        'include-direct-children': true,
      });
    });

    it('includes include-operations flag when passed', async () => {
      transport.respondWith(makeWhiteboard('42'));
      await resource.get('42', { 'include-operations': true });
      expect(transport.lastCall?.options.query).toMatchObject({
        'include-operations': true,
      });
    });

    it('includes include-properties flag when passed', async () => {
      transport.respondWith(makeWhiteboard('42'));
      await resource.get('42', { 'include-properties': true });
      expect(transport.lastCall?.options.query).toMatchObject({
        'include-properties': true,
      });
    });

    it('includes all four include-* flags when all passed', async () => {
      transport.respondWith(makeWhiteboard('42'));
      await resource.get('42', {
        'include-collaborators': true,
        'include-direct-children': true,
        'include-operations': true,
        'include-properties': true,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        'include-collaborators': true,
        'include-direct-children': true,
        'include-operations': true,
        'include-properties': true,
      });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /whiteboards/{id}', async () => {
      transport.respondWith(undefined);

      await resource.delete('7');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/whiteboards/7`,
      });
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes special characters in id for get()', async () => {
      transport.respondWith(makeWhiteboard('x'));
      await resource.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/whiteboards/..%2Fadmin`);
    });

    it('encodes special characters in id for delete()', async () => {
      transport.respondWith(undefined);
      await resource.delete('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/whiteboards/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment id in get(): %s',
      async (id) => {
        await expect(resource.get(id)).rejects.toThrow('path parameter must not be "." or ".."');
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── listAncestors ─────────────────────────────────────────────────────────

  describe('listAncestors()', () => {
    it('issues GET /whiteboards/{id}/ancestors and returns the wrapped { results } shape', async () => {
      // Arrange — ancestors is bare-{results}, NOT cursor-paginated.
      const payload = { results: [{ id: 'a1', type: 'page' as const }] };
      transport.respondWith(payload);

      const result = await resource.listAncestors('wb-1');

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/whiteboards/wb-1/ancestors`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('passes limit through to the request query', async () => {
      transport.respondWith({ results: [] });

      await resource.listAncestors('wb-1', { limit: 10 });

      expect(transport.lastCall?.options.query).toEqual({ limit: 10 });
    });

    it('throws ValidationError when limit is non-positive', async () => {
      await expect(resource.listAncestors('wb-1', { limit: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── listDescendants ───────────────────────────────────────────────────────

  describe('listDescendants()', () => {
    it('issues GET /whiteboards/{id}/descendants with depth, limit, cursor', async () => {
      const payload = {
        results: [{ id: 'd1', type: 'page', depth: 1 }],
        _links: { next: '/wiki/api/v2/whiteboards/wb-1/descendants?cursor=c2' },
      };
      transport.respondWith(payload);

      const result = await resource.listDescendants('wb-1', {
        limit: 25,
        depth: 3,
        cursor: 'c1',
      });

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/whiteboards/wb-1/descendants`,
      });
      expect(transport.lastCall?.options.query).toEqual({
        limit: 25,
        depth: 3,
        cursor: 'c1',
      });
    });

    it('omits keys when params not supplied', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.listDescendants('wb-1');

      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── listDescendantsAll ────────────────────────────────────────────────────

  describe('listDescendantsAll()', () => {
    it('iterates pages until _links.next is absent', async () => {
      transport
        .respondWith({
          results: [{ id: 'a' }, { id: 'b' }],
          _links: { next: '/wiki/api/v2/whiteboards/wb-1/descendants?cursor=c2' },
        })
        .respondWith({
          results: [{ id: 'c' }],
          _links: {},
        });

      const ids: string[] = [];
      for await (const d of resource.listDescendantsAll('wb-1')) {
        ids.push(d.id);
      }

      expect(ids).toEqual(['a', 'b', 'c']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({});
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'c2' });
    });

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listDescendantsAll('wb-1', { limit: -1 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('passes depth + limit into the first request', async () => {
      transport.respondWith({ results: [], _links: {} });

      const iter = resource.listDescendantsAll('wb-1', { limit: 5, depth: 2 });
      await iter.next();

      expect(transport.lastCall?.options.query).toMatchObject({ limit: 5, depth: 2 });
    });
  });

  // ── listDirectChildren ────────────────────────────────────────────────────

  describe('listDirectChildren()', () => {
    it('issues GET /whiteboards/{id}/direct-children with limit, cursor, sort', async () => {
      const payload = {
        results: [{ id: 'c1', title: 'Child' }],
        _links: {},
      };
      transport.respondWith(payload);

      const result = await resource.listDirectChildren('wb-1', {
        limit: 10,
        cursor: 'tok',
        sort: '-title',
      });

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/whiteboards/wb-1/direct-children`,
      });
      expect(transport.lastCall?.options.query).toEqual({
        limit: 10,
        cursor: 'tok',
        sort: '-title',
      });
    });

    it('omits sort when not supplied', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.listDirectChildren('wb-1');

      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('throws ValidationError when limit is invalid', async () => {
      await expect(resource.listDirectChildren('wb-1', { limit: 0 })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── listDirectChildrenAll ─────────────────────────────────────────────────

  describe('listDirectChildrenAll()', () => {
    it('iterates pages until _links.next is absent', async () => {
      transport
        .respondWith({
          results: [{ id: 'c1' }],
          _links: { next: '/wiki/api/v2/whiteboards/wb-1/direct-children?cursor=c2' },
        })
        .respondWith({ results: [{ id: 'c2' }], _links: {} });

      const ids: string[] = [];
      for await (const c of resource.listDirectChildrenAll('wb-1', { sort: 'title' })) {
        ids.push(c.id);
      }

      expect(ids).toEqual(['c1', 'c2']);
      expect(transport.calls[0]?.options.query).toMatchObject({ sort: 'title' });
    });

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listDirectChildrenAll('wb-1', { limit: 0 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('passes both limit and sort into the request query', async () => {
      transport.respondWith({ results: [], _links: {} });

      const iter = resource.listDirectChildrenAll('wb-1', { limit: 25, sort: 'created-date' });
      await iter.next();

      expect(transport.lastCall?.options.query).toMatchObject({
        limit: 25,
        sort: 'created-date',
      });
    });

    it('issues a bare request when called with no params', async () => {
      // Exercises the `params?.sort !== undefined` false branch.
      transport.respondWith({ results: [], _links: {} });

      const iter = resource.listDirectChildrenAll('wb-1');
      await iter.next();

      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── getOperations ─────────────────────────────────────────────────────────

  describe('getOperations()', () => {
    it('issues GET /whiteboards/{id}/operations', async () => {
      const payload = { operations: [{ operation: 'read', targetType: 'whiteboard' }] };
      transport.respondWith(payload);

      const result = await resource.getOperations('wb-1');

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/whiteboards/wb-1/operations`,
      });
    });
  });

  // ── classification level ──────────────────────────────────────────────────

  describe('getClassificationLevel()', () => {
    it('issues GET /whiteboards/{id}/classification-level', async () => {
      const level = {
        id: 'cl-1',
        name: 'Public',
        color: 'GREEN' as const,
        status: 'PUBLISHED' as const,
      };
      transport.respondWith(level);

      const result = await resource.getClassificationLevel('wb-1');

      expect(result).toEqual(level);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/whiteboards/wb-1/classification-level`,
      });
    });
  });

  describe('updateClassificationLevel()', () => {
    it('issues PUT /whiteboards/{id}/classification-level with the body', async () => {
      transport.respondWith(undefined);

      const result = await resource.updateClassificationLevel('wb-1', {
        id: 'cl-1',
        status: 'current',
      });

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/whiteboards/wb-1/classification-level`,
        body: { id: 'cl-1', status: 'current' },
      });
    });
  });

  describe('resetClassificationLevel()', () => {
    it('issues POST /whiteboards/{id}/classification-level/reset with default body', async () => {
      transport.respondWith(undefined);

      await resource.resetClassificationLevel('wb-1');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/whiteboards/wb-1/classification-level/reset`,
        body: { status: 'current' },
      });
    });

    it('forwards an explicit body when supplied', async () => {
      transport.respondWith(undefined);

      await resource.resetClassificationLevel('wb-1', { status: 'current' });

      expect(transport.lastCall?.options.body).toEqual({ status: 'current' });
    });
  });

  // ── content properties ────────────────────────────────────────────────────

  describe('listProperties()', () => {
    it('issues GET /whiteboards/{id}/properties with all four query params', async () => {
      const payload = { results: [sampleProperty], _links: {} };
      transport.respondWith(payload);

      const result = await resource.listProperties('wb-1', {
        key: 'feature-flags',
        sort: 'key',
        cursor: 'tok',
        limit: 10,
      });

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/whiteboards/wb-1/properties`,
      });
      expect(transport.lastCall?.options.query).toEqual({
        key: 'feature-flags',
        sort: 'key',
        cursor: 'tok',
        limit: 10,
      });
    });

    it('omits unset query keys', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.listProperties('wb-1');

      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('throws ValidationError when limit is non-positive', async () => {
      await expect(resource.listProperties('wb-1', { limit: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('listPropertiesAll()', () => {
    it('paginates through every page until cursor is exhausted', async () => {
      transport
        .respondWith({
          results: [{ ...sampleProperty, id: 'p1' }],
          _links: { next: '/wiki/api/v2/whiteboards/wb-1/properties?cursor=c2' },
        })
        .respondWith({
          results: [{ ...sampleProperty, id: 'p2' }],
          _links: {},
        });

      const ids: string[] = [];
      for await (const p of resource.listPropertiesAll('wb-1')) {
        ids.push(p.id ?? '');
      }

      expect(ids).toEqual(['p1', 'p2']);
      expect(transport.calls).toHaveLength(2);
    });

    it('passes key + sort + limit into the request query', async () => {
      transport.respondWith({ results: [], _links: {} });

      const iter = resource.listPropertiesAll('wb-1', { key: 'k', sort: '-key', limit: 5 });
      await iter.next();

      expect(transport.lastCall?.options.query).toMatchObject({
        key: 'k',
        sort: '-key',
        limit: 5,
      });
    });

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listPropertiesAll('wb-1', { limit: -1 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('createProperty()', () => {
    it('issues POST /whiteboards/{id}/properties with the body', async () => {
      transport.respondWith(sampleProperty);
      const data = { key: 'feature-flags', value: { beta: true } };

      const result = await resource.createProperty('wb-1', data);

      expect(result).toEqual(sampleProperty);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/whiteboards/wb-1/properties`,
        body: data,
      });
    });
  });

  describe('getProperty()', () => {
    it('issues GET /whiteboards/{whiteboard-id}/properties/{property-id}', async () => {
      transport.respondWith(sampleProperty);

      const result = await resource.getProperty('wb-1', 'prop-1');

      expect(result).toEqual(sampleProperty);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/whiteboards/wb-1/properties/prop-1`,
      });
    });

    it('encodes both path segments', async () => {
      transport.respondWith(sampleProperty);

      await resource.getProperty('a/b', 'c/d');

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/whiteboards/a%2Fb/properties/c%2Fd`,
      );
    });
  });

  describe('updateProperty()', () => {
    it('issues PUT /whiteboards/{whiteboard-id}/properties/{property-id} with the body', async () => {
      transport.respondWith(sampleProperty);
      const data = {
        key: 'feature-flags',
        value: { beta: false },
        version: { number: 4 },
      };

      const result = await resource.updateProperty('wb-1', 'prop-1', data);

      expect(result).toEqual(sampleProperty);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/whiteboards/wb-1/properties/prop-1`,
        body: data,
      });
    });
  });

  describe('deleteProperty()', () => {
    it('issues DELETE /whiteboards/{whiteboard-id}/properties/{property-id}', async () => {
      transport.respondWith(undefined);

      const result = await resource.deleteProperty('wb-1', 'prop-1');

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/whiteboards/wb-1/properties/prop-1`,
      });
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('boom'));

      await expect(resource.deleteProperty('wb-1', 'prop-1')).rejects.toThrow('boom');
    });
  });
});
