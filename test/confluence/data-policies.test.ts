import { describe, it, expect, beforeEach } from 'vitest';
import { DataPoliciesResource } from '../../src/confluence/resources/data-policies.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const sampleMetadata = { anyContentBlocked: true };

const makeSpace = (id: string, key: string) => ({
  id,
  key,
  name: `Space ${key}`,
  dataPolicy: { anyContentBlocked: false },
  _links: { webui: `/wiki/spaces/${key}` },
});

describe('DataPoliciesResource', () => {
  let transport: MockTransport;
  let resource: DataPoliciesResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new DataPoliciesResource(transport, BASE_URL);
  });

  // ── getMetadata ──────────────────────────────────────────────────────────

  describe('getMetadata()', () => {
    it('issues GET /data-policies/metadata with no body or query', async () => {
      // Arrange
      transport.respondWith(sampleMetadata);

      // Act
      const result = await resource.getMetadata();

      // Assert
      expect(result).toEqual(sampleMetadata);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/data-policies/metadata`,
      });
      expect(transport.lastCall?.options.body).toBeUndefined();
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('boom'));
      await expect(resource.getMetadata()).rejects.toThrow('boom');
    });
  });

  // ── listSpaces ───────────────────────────────────────────────────────────

  describe('listSpaces()', () => {
    it('calls GET /data-policies/spaces with no params', async () => {
      // Arrange
      const payload = { results: [makeSpace('1', 'ENG')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await resource.listSpaces();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/data-policies/spaces`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
      expect(transport.lastCall?.options.body).toBeUndefined();
    });

    it('serializes ids and keys arrays as repeated path params, not CSV (B1049)', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act — ids are integer/int64 in the spec (B1059)
      await resource.listSpaces({ ids: [1, 2, 3], keys: ['ENG', 'OPS'] });

      // Assert — `ids`/`keys` are `type: array` on /data-policies/spaces:
      // repeated params in the path, never `ids=1%2C2%2C3`.
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/data-policies/spaces?ids=1&ids=2&ids=3&keys=ENG&keys=OPS`,
      );
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('omits ids and keys when arrays are empty', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.listSpaces({ ids: [], keys: [] });

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/data-policies/spaces`);
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards sort, limit, and cursor verbatim', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.listSpaces({ sort: '-name', limit: 50, cursor: 'tok' });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({
        sort: '-name',
        limit: 50,
        cursor: 'tok',
      });
    });

    it('throws ValidationError when limit is zero', async () => {
      await expect(resource.listSpaces({ limit: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when limit is negative', async () => {
      await expect(resource.listSpaces({ limit: -5 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when limit is not an integer', async () => {
      await expect(resource.listSpaces({ limit: 1.5 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('boom'));
      await expect(resource.listSpaces()).rejects.toThrow('boom');
    });
  });

  // ── listAllSpaces ────────────────────────────────────────────────────────

  describe('listAllSpaces()', () => {
    it('yields items across pages until _links.next is absent', async () => {
      // Arrange — first page advertises a next cursor, second page is the tail
      transport
        .respondWith({
          results: [makeSpace('1', 'ENG'), makeSpace('2', 'OPS')],
          _links: { next: '/wiki/api/v2/data-policies/spaces?cursor=c2' },
        })
        .respondWith({
          results: [makeSpace('3', 'QA')],
          _links: {},
        });

      // Act
      const items: { id?: string }[] = [];
      for await (const item of resource.listAllSpaces()) {
        items.push(item);
      }

      // Assert
      expect(items.map((i) => i.id)).toEqual(['1', '2', '3']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({});
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'c2' });
    });

    it('forwards ids, keys, sort, and limit to the request query', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act — ids are integer/int64 in the spec (B1059)
      const iter = resource.listAllSpaces({
        ids: [10, 20],
        keys: ['ENG'],
        sort: 'key',
        limit: 25,
      });
      await iter.next();

      // Assert — `ids`/`keys` are `type: array` → repeated path params; `sort`/
      // `limit` stay in the query bag (B1049).
      expect(transport.lastCall?.options.query).toMatchObject({
        sort: 'key',
        limit: 25,
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('ids');
      expect(transport.lastCall?.options.query).not.toHaveProperty('keys');
      expect(transport.lastCall?.options.path).toContain('ids=10');
      expect(transport.lastCall?.options.path).toContain('ids=20');
      expect(transport.lastCall?.options.path).toContain('keys=ENG');
    });

    it('drops any caller-supplied cursor so pagination starts at the head', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act — pass a cursor through the params bag; the generator must not honour it.
      const iter = resource.listAllSpaces({
        limit: 10,
        // The Omit signature forbids `cursor` at the type level, but JS callers
        // can still smuggle it through — assert the runtime drops it.
        ...({ cursor: 'leaked' } as object),
      });
      await iter.next();

      // Assert
      expect(transport.lastCall?.options.query).not.toHaveProperty('cursor');
    });

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listAllSpaces({ limit: 0 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });
});
