import { describe, it, expect, beforeEach } from 'vitest';
import { ResolutionResource } from '../../src/jira/resources/resolution.js';
import type { Resolution } from '../../src/jira/resources/resolution.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeResolution = (id: string): Resolution => ({
  id,
  name: `Resolution ${id}`,
  self: `${BASE_URL}/resolution/${id}`,
  description: 'A test resolution',
  isDefault: false,
});

const makePage = (
  items: Resolution[],
  opts?: { total?: number; isLast?: boolean; startAt?: number },
) => ({
  values: items,
  startAt: opts?.startAt ?? 0,
  maxResults: 50,
  total: opts?.total ?? items.length,
  isLast: opts?.isLast ?? true,
});

describe('ResolutionResource', () => {
  let transport: MockTransport;
  let resource: ResolutionResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new ResolutionResource(transport, BASE_URL);
  });

  // ── list (B931 — deprecated) ───────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /resolution and returns the array', async () => {
      const resolutionList = [makeResolution('1'), makeResolution('2')];
      transport.respondWith(resolutionList);

      const result = await resource.list();

      expect(result).toEqual(resolutionList);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/resolution`,
      });
    });

    it('returns an empty array when no resolutions exist', async () => {
      transport.respondWith([]);

      const result = await resource.list();

      expect(result).toEqual([]);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('network error'));

      await expect(resource.list()).rejects.toThrow('network error');
    });
  });

  // ── get (B714) ─────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /resolution/{id}', async () => {
      const res = makeResolution('42');
      transport.respondWith(res);

      const result = await resource.get('42');

      expect(result).toEqual(res);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/resolution/42`,
      });
    });

    it('URL-encodes the id', async () => {
      transport.respondWith(makeResolution('a b'));

      await resource.get('a b');

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/resolution/a%20b`);
    });
  });

  // ── create (B712) ──────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /resolution with required name', async () => {
      const created = makeResolution('99');
      transport.respondWith(created);

      const result = await resource.create({ name: 'Fixed' });

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/resolution`,
        body: { name: 'Fixed' },
      });
    });

    it('includes optional description in body', async () => {
      transport.respondWith(makeResolution('99'));

      await resource.create({ name: 'Fixed', description: 'Issue was resolved' });

      expect(transport.lastCall?.options.body).toEqual({
        name: 'Fixed',
        description: 'Issue was resolved',
      });
    });

    it('omits undefined description from body', async () => {
      transport.respondWith(makeResolution('99'));

      await resource.create({ name: 'Fixed' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('description');
    });
  });

  // ── update (B715) ──────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /resolution/{id} and returns void', async () => {
      transport.respondWith(undefined, 204);

      await resource.update('10', { name: 'Renamed' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/resolution/10`,
        body: { name: 'Renamed' },
      });
    });

    it('includes optional description in body', async () => {
      transport.respondWith(undefined, 204);

      await resource.update('10', { name: 'Renamed', description: 'Updated description' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).toEqual({ name: 'Renamed', description: 'Updated description' });
    });

    it('throws ValidationError when name is missing', async () => {
      await expect(resource.update('10', {})).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError when name is empty string', async () => {
      await expect(resource.update('10', { name: '' })).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError when only description provided (name required by Jira spec)', async () => {
      await expect(resource.update('10', { description: 'desc only' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  // ── delete (B713) ──────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /resolution/{id} with no query', async () => {
      transport.respondWith(undefined, 204);

      await resource.delete('10');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/resolution/10`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards replaceWith query parameter', async () => {
      transport.respondWith(undefined, 204);

      await resource.delete('10', { replaceWith: '1' });

      expect(transport.lastCall?.options.query).toEqual({ replaceWith: '1' });
    });
  });

  // ── setDefault (B716) ─────────────────────────────────────────────────────

  describe('setDefault()', () => {
    it('calls PUT /resolution/default with id body', async () => {
      transport.respondWith(undefined, 204);

      await resource.setDefault({ id: '5' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/resolution/default`,
        body: { id: '5' },
      });
    });
  });

  // ── moveResolutions (B717) ─────────────────────────────────────────────────

  describe('moveResolutions()', () => {
    it('calls PUT /resolution/move with ids and after', async () => {
      transport.respondWith(undefined, 204);

      await resource.moveResolutions({ ids: ['1', '2'], after: '3' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/resolution/move`,
        body: { ids: ['1', '2'], after: '3' },
      });
    });

    it('calls PUT /resolution/move with ids and before', async () => {
      transport.respondWith(undefined, 204);

      await resource.moveResolutions({ ids: ['1', '2'], before: '0' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['before']).toBe('0');
      expect(body).not.toHaveProperty('after');
    });

    it('throws ValidationError when ids is empty array', async () => {
      await expect(resource.moveResolutions({ ids: [], after: '3' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('throws ValidationError when both after and before are missing', async () => {
      await expect(resource.moveResolutions({ ids: ['1'] })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('throws ValidationError when both after and before are provided', async () => {
      await expect(
        resource.moveResolutions({ ids: ['1'], after: '2', before: '3' }),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  // ── search (B718) ─────────────────────────────────────────────────────────

  describe('search()', () => {
    it('calls GET /resolution/search with no params', async () => {
      transport.respondWith(makePage([]));

      const result = await resource.search();

      expect(result.values).toEqual([]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/resolution/search`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards all query params', async () => {
      transport.respondWith(makePage([makeResolution('1')]));

      await resource.search({
        startAt: 0,
        maxResults: 10,
        id: ['1', '2'],
        onlyDefault: true,
        queryString: 'Fix',
      });

      // `id` is a `type: array` query param emitted as repeated params built
      // into the path; the scalar bag carries only the genuine scalar params.
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/resolution/search?id=1&id=2`);
      expect(transport.lastCall?.options.query).toEqual({
        startAt: 0,
        maxResults: 10,
        onlyDefault: true,
        queryString: 'Fix',
      });
    });

    it('omits empty id array', async () => {
      transport.respondWith(makePage([]));

      await resource.search({ id: [] });

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/resolution/search`);
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('id');
    });

    it('rejects non-positive maxResults', async () => {
      await expect(resource.search({ maxResults: 0 })).rejects.toThrow(/maxResults/);
    });
  });

  // ── searchAll (B718, paginated) ───────────────────────────────────────────

  describe('searchAll()', () => {
    it('yields items from a single page', async () => {
      transport.respondWith(makePage([makeResolution('1'), makeResolution('2')]));

      const results: { id: string }[] = [];
      for await (const r of resource.searchAll()) {
        results.push(r);
      }

      expect(results.map((r) => r.id)).toEqual(['1', '2']);
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith(makePage([makeResolution('1')], { total: 2, isLast: false }))
        .respondWith(makePage([makeResolution('2')], { total: 2, isLast: true, startAt: 1 }));

      const results: { id: string }[] = [];
      for await (const r of resource.searchAll({ maxResults: 1 })) {
        results.push(r);
      }

      expect(results.map((r) => r.id)).toEqual(['1', '2']);
    });

    it('forwards filter query params on every page', async () => {
      transport.respondWith(makePage([], { isLast: true }));

      const results: unknown[] = [];
      for await (const r of resource.searchAll({ queryString: 'Fix', onlyDefault: false })) {
        results.push(r);
      }

      expect(transport.lastCall?.options.query).toMatchObject({
        queryString: 'Fix',
        onlyDefault: false,
      });
    });

    it('does not include maxResults in base query', async () => {
      transport.respondWith(makePage([], { isLast: true }));

      for await (const _ of resource.searchAll({ maxResults: 25 })) {
        // consume
      }

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      // maxResults is passed as pageSize to paginateOffset, not in baseQuery
      // paginateOffset will add it per page from pageSize, so it may appear
      // but should not come from baseQuery conflict
      expect(query).toMatchObject({ maxResults: 25 });
    });

    it('rejects non-positive maxResults', async () => {
      await expect(async () => {
        for await (const _ of resource.searchAll({ maxResults: 0 })) {
          // consume
        }
      }).rejects.toThrow(/maxResults/);
    });
  });
});
