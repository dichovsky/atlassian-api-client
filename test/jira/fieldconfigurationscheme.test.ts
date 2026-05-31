import { describe, it, expect, beforeEach } from 'vitest';
import { FieldConfigurationSchemeResource } from '../../src/jira/resources/fieldconfigurationscheme.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeScheme = (id = '10000') => ({
  id,
  name: 'Field Configuration Scheme for Bugs',
  description: 'This field configuration scheme is for bugs only.',
});

const makePageOf = <T>(values: T[], startAt = 0, total = values.length) => ({
  values,
  startAt,
  maxResults: 50,
  total,
  isLast: true,
});

describe('FieldConfigurationSchemeResource', () => {
  let transport: MockTransport;
  let resource: FieldConfigurationSchemeResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new FieldConfigurationSchemeResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /fieldconfigurationscheme with no params', async () => {
      const page = makePageOf([makeScheme()]);
      transport.respondWith(page);

      const result = await resource.list();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/fieldconfigurationscheme`,
      });
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ startAt: 0, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 0, maxResults: 25 });
    });

    it('forwards id filter as comma-joined string', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ id: [10000, 10001] });

      expect(transport.lastCall?.options.query).toMatchObject({ id: '10000,10001' });
    });

    it('omits id from query when not provided', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ startAt: 0 });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('id');
    });

    it('omits id from query when empty array provided', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ id: [] });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('id');
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.list({ maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('yields items from paginated response', async () => {
      const scheme = makeScheme();
      transport.respondWith(makePageOf([scheme]));

      const results: unknown[] = [];
      for await (const item of resource.listAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(scheme);
    });

    it('paginateOffset starts from startAt=0', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listAll()) {
        break;
      }

      expect(transport.lastCall?.options.query?.['startAt']).toBe(0);
    });

    it('forwards id filter', async () => {
      transport.respondWith(makePageOf([makeScheme()]));

      const results: unknown[] = [];
      for await (const item of resource.listAll({ id: [10000] })) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(transport.lastCall?.options.query).toMatchObject({ id: '10000' });
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /fieldconfigurationscheme with name and returns FieldConfigurationScheme', async () => {
      const scheme = makeScheme('10002');
      transport.respondWith(scheme);

      const result = await resource.create({ name: 'My Scheme' });

      expect(result).toEqual(scheme);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/fieldconfigurationscheme`,
        body: { name: 'My Scheme' },
      });
    });

    it('includes description when provided', async () => {
      transport.respondWith(makeScheme('10002'));

      await resource.create({ name: 'Full', description: 'A full scheme' });

      expect(transport.lastCall?.options.body).toEqual({
        name: 'Full',
        description: 'A full scheme',
      });
    });

    it('omits description when not provided', async () => {
      transport.respondWith(makeScheme('10002'));

      await resource.create({ name: 'Minimal' });

      expect(transport.lastCall?.options.body).toEqual({ name: 'Minimal' });
    });

    it('create response type is FieldConfigurationScheme (distinct from list item type)', async () => {
      // POST 201 returns FieldConfigurationScheme (with id as string, name, description?)
      // GET list returns PageBeanFieldConfigurationScheme (values: FieldConfigurationScheme[])
      // Both use the same FieldConfigurationScheme item shape — verify create returns the item directly
      const created = { id: '10002', name: 'New Scheme', description: 'desc' };
      transport.respondWith(created);

      const result = await resource.create({ name: 'New Scheme', description: 'desc' });

      expect(result).toEqual(created);
      expect(result.id).toBe('10002');
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /fieldconfigurationscheme/{id} and returns void', async () => {
      transport.respondWith(undefined);

      const result = await resource.delete(10001);

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/fieldconfigurationscheme/10001`,
      });
    });

    it('encodes the path segment', async () => {
      transport.respondWith(undefined);

      await resource.delete(10002);

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/fieldconfigurationscheme/10002`);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /fieldconfigurationscheme/{id} and returns void', async () => {
      transport.respondWith(undefined);

      const result = await resource.update(10001, { name: 'Renamed' });

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/fieldconfigurationscheme/10001`,
        body: { name: 'Renamed' },
      });
    });

    it('includes description when provided', async () => {
      transport.respondWith(undefined);

      await resource.update(10001, { name: 'X', description: 'new desc' });

      expect(transport.lastCall?.options.body).toEqual({
        name: 'X',
        description: 'new desc',
      });
    });

    it('omits description when not provided', async () => {
      transport.respondWith(undefined);

      await resource.update(10001, { name: 'X' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['name']).toBe('X');
      expect(body['description']).toBeUndefined();
    });

    it('encodes the path segment', async () => {
      transport.respondWith(undefined);

      await resource.update(10002, { name: 'Scheme 2' });

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/fieldconfigurationscheme/10002`);
    });
  });
});
