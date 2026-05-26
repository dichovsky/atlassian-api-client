import { describe, it, expect, beforeEach } from 'vitest';
import { FieldConfigurationResource } from '../../src/jira/resources/fieldconfiguration.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeConfiguration = (id = 10000) => ({
  id,
  name: 'Default Field Configuration',
  description: 'The default field configuration description',
  isDefault: true,
});

const makeItem = (id = 'environment') => ({
  id,
  description: 'A field description',
  isHidden: false,
  isRequired: false,
});

const makePageOf = <T>(values: T[], startAt = 0, total = values.length) => ({
  values,
  startAt,
  maxResults: 50,
  total,
  isLast: true,
});

describe('FieldConfigurationResource', () => {
  let transport: MockTransport;
  let resource: FieldConfigurationResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new FieldConfigurationResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /fieldconfiguration with no params', async () => {
      const page = makePageOf([makeConfiguration()]);
      transport.respondWith(page);

      const result = await resource.list();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/fieldconfiguration`,
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

    it('forwards isDefault and query filters', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ isDefault: true, query: 'default' });

      expect(transport.lastCall?.options.query).toMatchObject({
        isDefault: true,
        query: 'default',
      });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.list({ maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('yields items from paginated response', async () => {
      const config = makeConfiguration();
      transport.respondWith(makePageOf([config]));

      const results: unknown[] = [];
      for await (const item of resource.listAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(config);
    });

    it('paginateOffset starts from startAt=0', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listAll()) {
        break;
      }

      expect(transport.lastCall?.options.query?.['startAt']).toBe(0);
    });

    it('forwards id, isDefault, and query filters', async () => {
      transport.respondWith(makePageOf([makeConfiguration()]));

      const results: unknown[] = [];
      for await (const item of resource.listAll({
        id: [10000],
        isDefault: false,
        query: 'sw',
      })) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(transport.lastCall?.options.query).toMatchObject({
        id: '10000',
        isDefault: false,
        query: 'sw',
      });
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
    it('calls POST /fieldconfiguration with name', async () => {
      const config = makeConfiguration(10001);
      transport.respondWith(config);

      const result = await resource.create({ name: 'My Configuration' });

      expect(result).toEqual(config);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/fieldconfiguration`,
        body: { name: 'My Configuration' },
      });
    });

    it('includes description when provided', async () => {
      transport.respondWith(makeConfiguration(10001));

      await resource.create({ name: 'Full', description: 'A full configuration' });

      expect(transport.lastCall?.options.body).toEqual({
        name: 'Full',
        description: 'A full configuration',
      });
    });

    it('omits description when not provided', async () => {
      transport.respondWith(makeConfiguration(10001));

      await resource.create({ name: 'Minimal' });

      expect(transport.lastCall?.options.body).toEqual({ name: 'Minimal' });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /fieldconfiguration/{id}', async () => {
      transport.respondWith(undefined);

      await resource.delete(10001);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/fieldconfiguration/10001`,
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /fieldconfiguration/{id} and returns void', async () => {
      transport.respondWith(undefined);

      const result = await resource.update(10001, { name: 'Renamed' });

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/fieldconfiguration/10001`,
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
  });

  // ── listFields ────────────────────────────────────────────────────────────

  describe('listFields()', () => {
    it('calls GET /fieldconfiguration/{id}/fields with no params', async () => {
      const page = makePageOf([makeItem()]);
      transport.respondWith(page);

      const result = await resource.listFields(10001);

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/fieldconfiguration/10001/fields`,
      });
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listFields(10001, { startAt: 10, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.listFields(10001, { maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── listAllFields ─────────────────────────────────────────────────────────

  describe('listAllFields()', () => {
    it('yields items from paginated response', async () => {
      const item = makeItem('environment');
      transport.respondWith(makePageOf([item]));

      const results: unknown[] = [];
      for await (const entry of resource.listAllFields(10001)) {
        results.push(entry);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(item);
    });

    it('paginateOffset starts from startAt=0', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listAllFields(10001)) {
        break;
      }

      expect(transport.lastCall?.options.query?.['startAt']).toBe(0);
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/fieldconfiguration/10001/fields`);
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listAllFields(10001, { maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── updateFields ──────────────────────────────────────────────────────────

  describe('updateFields()', () => {
    it('calls PUT /fieldconfiguration/{id}/fields and returns void', async () => {
      transport.respondWith(undefined);

      const items = [
        { id: 'customfield_10012', description: 'X', isHidden: false },
        { id: 'customfield_10011', isRequired: true },
        {
          id: 'customfield_10010',
          description: 'Y',
          isHidden: false,
          isRequired: false,
          renderer: 'wiki-renderer',
        },
      ];
      const result = await resource.updateFields(10001, {
        fieldConfigurationItems: items,
      });

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/fieldconfiguration/10001/fields`,
        body: { fieldConfigurationItems: items },
      });
    });
  });
});
