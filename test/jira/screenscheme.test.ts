import { describe, it, expect, beforeEach } from 'vitest';
import { ScreenSchemeResource } from '../../src/jira/resources/screenscheme.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeScreenScheme = (id = 1, name = 'Default Screen Scheme') => ({
  id,
  name,
  description: 'A test screen scheme',
  screens: {
    default: 10001,
    create: 10002,
    view: 10003,
    edit: 10004,
  },
});

const makePageOf = <T>(values: T[], startAt = 0, total = values.length) => ({
  values,
  startAt,
  maxResults: 50,
  total,
  isLast: true,
});

describe('ScreenSchemeResource', () => {
  let transport: MockTransport;
  let resource: ScreenSchemeResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new ScreenSchemeResource(transport, BASE_URL);
  });

  // ── B762: list ─────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /screenscheme with no params', async () => {
      const page = makePageOf([makeScreenScheme()]);
      transport.respondWith(page);

      const result = await resource.list();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/screenscheme`,
      });
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ startAt: 10, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('forwards id as repeated query params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ id: [1, 2] });

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/screenscheme?id=1&id=2`);
    });

    it('omits empty id array', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ id: [] });

      expect(transport.lastCall?.options.query?.['id']).toBeUndefined();
    });

    it('forwards expand', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ expand: 'issueTypeScreenSchemes' });

      expect(transport.lastCall?.options.query).toMatchObject({
        expand: 'issueTypeScreenSchemes',
      });
    });

    it('forwards queryString', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ queryString: 'Default' });

      expect(transport.lastCall?.options.query).toMatchObject({ queryString: 'Default' });
    });

    it('forwards orderBy', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ orderBy: 'name' });

      expect(transport.lastCall?.options.query).toMatchObject({ orderBy: 'name' });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.list({ maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── B762: listAll ──────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('yields items from paginated response', async () => {
      const scheme = makeScreenScheme();
      transport.respondWith(makePageOf([scheme]));

      const results: unknown[] = [];
      for await (const item of resource.listAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(scheme);
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [makeScreenScheme(1)],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeScreenScheme(2)],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: unknown[] = [];
      for await (const item of resource.listAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(2);
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── B763: create ───────────────────────────────────────────────────────────

  describe('create()', () => {
    it('POSTs with required name and screens.default', async () => {
      const created = { id: 1 };
      transport.respondWith(created);

      const result = await resource.create({
        name: 'My Scheme',
        screens: { default: 10001 },
      });

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/screenscheme`,
        body: { name: 'My Scheme', screens: { default: 10001 } },
      });
    });

    it('includes optional description', async () => {
      transport.respondWith({ id: 1 });

      await resource.create({
        name: 'My Scheme',
        description: 'A scheme',
        screens: { default: 10001 },
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'My Scheme',
        description: 'A scheme',
      });
    });

    it('omits description when not provided', async () => {
      transport.respondWith({ id: 1 });

      await resource.create({ name: 'Minimal', screens: { default: 10001 } });

      expect(transport.lastCall?.options.body).not.toHaveProperty('description');
    });

    it('includes optional screen types', async () => {
      transport.respondWith({ id: 1 });

      await resource.create({
        name: 'Full Scheme',
        screens: { default: 10001, create: 10002, view: 10003, edit: 10004 },
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        screens: { default: 10001, create: 10002, view: 10003, edit: 10004 },
      });
    });

    it('omits undefined optional screen types', async () => {
      transport.respondWith({ id: 1 });

      await resource.create({ name: 'Minimal', screens: { default: 10001 } });

      const screens = (transport.lastCall?.options.body as Record<string, unknown>)[
        'screens'
      ] as Record<string, unknown>;
      expect(screens).not.toHaveProperty('view');
      expect(screens).not.toHaveProperty('edit');
      expect(screens).not.toHaveProperty('create');
    });
  });

  // ── B765: update ───────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /screenscheme/{screenSchemeId} with name', async () => {
      transport.respondWith(undefined);

      await resource.update('1', { name: 'Renamed Scheme' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/screenscheme/1`,
        body: { name: 'Renamed Scheme' },
      });
    });

    it('calls PUT with description only', async () => {
      transport.respondWith(undefined);

      await resource.update('1', { description: 'New desc' });

      expect(transport.lastCall?.options.body).toMatchObject({ description: 'New desc' });
      expect(transport.lastCall?.options.body).not.toHaveProperty('name');
    });

    it('sends empty body when no fields provided', async () => {
      transport.respondWith(undefined);

      await resource.update('1', {});

      expect(transport.lastCall?.options.body).toEqual({});
    });

    it('includes screens with string IDs when provided', async () => {
      transport.respondWith(undefined);

      await resource.update('1', { screens: { default: '10001', view: '10002' } });

      expect(transport.lastCall?.options.body).toMatchObject({
        screens: { default: '10001', view: '10002' },
      });
    });

    it('omits undefined screen types in update body', async () => {
      transport.respondWith(undefined);

      await resource.update('1', { screens: { default: '10001' } });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      const screens = body['screens'] as Record<string, unknown>;
      expect(screens).not.toHaveProperty('view');
      expect(screens).not.toHaveProperty('edit');
      expect(screens).not.toHaveProperty('create');
    });

    it('includes edit and create screen types as strings when provided', async () => {
      transport.respondWith(undefined);

      await resource.update('1', { screens: { default: '10001', edit: '10003', create: '10004' } });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      const screens = body['screens'] as Record<string, unknown>;
      expect(screens).toMatchObject({ default: '10001', edit: '10003', create: '10004' });
    });

    it('accepts update with only non-default screen (default is optional on update)', async () => {
      transport.respondWith(undefined);

      await resource.update('1', { screens: { create: '10019' } });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      const screens = body['screens'] as Record<string, unknown>;
      expect(screens).toEqual({ create: '10019' });
      expect(screens).not.toHaveProperty('default');
    });
  });

  // ── B764: delete ───────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /screenscheme/{screenSchemeId}', async () => {
      transport.respondWith(undefined);

      await resource.delete('1');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/screenscheme/1`,
      });
    });
  });
});
