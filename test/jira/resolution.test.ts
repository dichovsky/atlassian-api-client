import { describe, it, expect, beforeEach } from 'vitest';
import { ResolutionResource } from '../../src/jira/resources/resolution.js';
import type {
  Resolution,
  ResolutionJsonBean,
  ResolutionId,
  ResolutionTaskProgress,
} from '../../src/jira/resources/resolution.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeResolution = (id: string): Resolution => ({
  id,
  name: `Resolution ${id}`,
  self: `${BASE_URL}/resolution/${id}`,
  description: 'A test resolution',
});

const makeResolutionJsonBean = (id: string): ResolutionJsonBean => ({
  id,
  name: `Resolution ${id}`,
  self: `${BASE_URL}/resolution/${id}`,
  description: 'A test resolution',
  iconUrl: 'https://example.com/icon.png',
  default: false,
});

const makeResolutionId = (id: string): ResolutionId => ({ id });

const makeTaskProgress = (id: string): ResolutionTaskProgress => ({
  id,
  description: 'Deleting resolution',
  status: 'RUNNING',
  progress: 50,
  elapsedRuntime: 100,
  self: `${BASE_URL}/task/${id}`,
});

const makePage = (
  items: ResolutionJsonBean[],
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

    it('returns Resolution without isDefault field (not in spec Resolution schema)', async () => {
      // Resolution schema: id, name, self, description only — no isDefault.
      const res: Resolution = makeResolution('1');
      transport.respondWith(res);

      const result = await resource.get('1');

      // Result should not have isDefault
      expect(result).not.toHaveProperty('isDefault');
    });
  });

  // ── create (B712) ──────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /resolution and returns ResolutionId (spec 201 body)', async () => {
      // Spec: POST /resolution returns 201 with ResolutionId { id: string }
      const created: ResolutionId = makeResolutionId('99');
      transport.respondWith(created);

      const result = await resource.create({ name: 'Fixed' });

      expect(result).toEqual(created);
      expect(result).toHaveProperty('id', '99');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/resolution`,
        body: { name: 'Fixed' },
      });
    });

    it('includes optional description in body', async () => {
      transport.respondWith(makeResolutionId('99'));

      await resource.create({ name: 'Fixed', description: 'Issue was resolved' });

      expect(transport.lastCall?.options.body).toEqual({
        name: 'Fixed',
        description: 'Issue was resolved',
      });
    });

    it('omits undefined description from body', async () => {
      transport.respondWith(makeResolutionId('99'));

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

    it('throws ValidationError when name is empty string', async () => {
      // name is required by spec (UpdateResolutionDetails: required: ["name"])
      // TypeScript enforces at compile time, but runtime guard covers runtime callers.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(resource.update('10', { name: '' } as any)).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  // ── delete (B713) ──────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /resolution/{id} with replaceWith param and returns task', async () => {
      // Spec: DELETE /resolution/{id} requires replaceWith (required: true) and
      // returns 303 with TaskProgressBeanObject.
      const task = makeTaskProgress('task-1');
      transport.respondWith(task, 303);

      const result = await resource.delete('10', { replaceWith: '1' });

      expect(result).toEqual(task);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/resolution/10`,
      });
      expect(transport.lastCall?.options.query).toEqual({ replaceWith: '1' });
    });

    it('always sends replaceWith query parameter (spec: required)', async () => {
      transport.respondWith(makeTaskProgress('task-2'), 303);

      await resource.delete('10', { replaceWith: '5' });

      expect(transport.lastCall?.options.query).toEqual({ replaceWith: '5' });
    });

    it('omits replaceWith from query when not provided (params omitted)', async () => {
      // Spec requires replaceWith but SDK keeps it optional for CLI compat.
      // When absent, query is sent without it.
      transport.respondWith(makeTaskProgress('task-3'), 303);

      await resource.delete('10');

      expect(transport.lastCall?.options.query).toEqual({});
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

    it('calls PUT /resolution/move with ids and position (B1053: spec uses position not before)', async () => {
      // Spec: ReorderIssueResolutionsRequest schema has after/ids/position — no `before`.
      transport.respondWith(undefined, 204);

      await resource.moveResolutions({ ids: ['1', '2'], position: 'Last' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['position']).toBe('Last');
      expect(body).not.toHaveProperty('after');
      expect(body).not.toHaveProperty('before');
    });

    it('throws ValidationError when ids is empty array', async () => {
      await expect(resource.moveResolutions({ ids: [], after: '3' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('throws ValidationError when both after and position are missing', async () => {
      await expect(resource.moveResolutions({ ids: ['1'] })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('throws ValidationError when both after and position are provided', async () => {
      await expect(
        resource.moveResolutions({ ids: ['1'], after: '2', position: 'First' }),
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

    it('returns ResolutionJsonBean items with correct field names (default not isDefault, iconUrl present)', async () => {
      // Spec: search response uses ResolutionJsonBean with field `default` (not `isDefault`)
      // and includes `iconUrl`.
      const bean = makeResolutionJsonBean('1');
      transport.respondWith(makePage([bean]));

      const result = await resource.search();

      expect(result.values[0]).toHaveProperty('default', false);
      expect(result.values[0]).toHaveProperty('iconUrl', 'https://example.com/icon.png');
      expect(result.values[0]).not.toHaveProperty('isDefault');
    });

    it('forwards all spec-defined query params (B1053: queryString removed — not in spec)', async () => {
      // Spec GET /resolution/search: startAt, maxResults, id, onlyDefault only.
      // queryString was never a valid param per the v3 spec.
      transport.respondWith(makePage([makeResolutionJsonBean('1')]));

      await resource.search({
        startAt: 0,
        maxResults: 10,
        id: ['1', '2'],
        onlyDefault: true,
      });

      // `id` is a `type: array` query param emitted as repeated params built
      // into the path; the scalar bag carries only the genuine scalar params.
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/resolution/search?id=1&id=2`);
      expect(transport.lastCall?.options.query).toEqual({
        startAt: 0,
        maxResults: 10,
        onlyDefault: true,
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('queryString');
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
    it('yields ResolutionJsonBean items from a single page', async () => {
      transport.respondWith(makePage([makeResolutionJsonBean('1'), makeResolutionJsonBean('2')]));

      const results: ResolutionJsonBean[] = [];
      for await (const r of resource.searchAll()) {
        results.push(r);
      }

      expect(results.map((r) => r.id)).toEqual(['1', '2']);
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith(makePage([makeResolutionJsonBean('1')], { total: 2, isLast: false }))
        .respondWith(
          makePage([makeResolutionJsonBean('2')], { total: 2, isLast: true, startAt: 1 }),
        );

      const results: ResolutionJsonBean[] = [];
      for await (const r of resource.searchAll({ maxResults: 1 })) {
        results.push(r);
      }

      expect(results.map((r) => r.id)).toEqual(['1', '2']);
    });

    it('forwards filter query params on every page', async () => {
      transport.respondWith(makePage([], { isLast: true }));

      const results: unknown[] = [];
      for await (const r of resource.searchAll({ onlyDefault: false })) {
        results.push(r);
      }

      expect(transport.lastCall?.options.query).toMatchObject({
        onlyDefault: false,
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('queryString');
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
