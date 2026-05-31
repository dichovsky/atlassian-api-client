import { describe, it, expect, beforeEach } from 'vitest';
import { UiModificationsResource } from '../../src/jira/resources/uimodifications.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeUiModification = (id = 'mod-1', name = 'Reveal Story Points') => ({
  id,
  name,
  self: `https://test.atlassian.net/rest/api/2/uiModifications/${id}`,
  description: 'Reveals Story Points field when any Sprint is selected.',
  data: "{field: 'Story Points', config: {hidden: false}}",
  contexts: [
    {
      id: 'ctx-1',
      issueTypeId: '10000',
      projectId: '10000',
      viewType: 'GIC' as const,
      isAvailable: true,
    },
  ],
});

const makeIdentifiers = (id = 'mod-new') => ({
  id,
  self: `https://test.atlassian.net/rest/api/2/uiModifications/${id}`,
});

const makePageOf = <T>(values: T[], startAt = 0, total = values.length, isLast = true) => ({
  values,
  startAt,
  maxResults: 50,
  total,
  isLast,
});

describe('UiModificationsResource', () => {
  let transport: MockTransport;
  let resource: UiModificationsResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new UiModificationsResource(transport, BASE_URL);
  });

  // ── B787: list ─────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /uiModifications with no params', async () => {
      const page = makePageOf([makeUiModification()]);
      transport.respondWith(page);

      const result = await resource.list();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/uiModifications`,
      });
    });

    it('calls GET /uiModifications with empty params {}', async () => {
      const page = makePageOf([]);
      transport.respondWith(page);

      const result = await resource.list({});

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/uiModifications`,
      });
      // No query params should be set
      expect(transport.lastCall?.options.query?.['startAt']).toBeUndefined();
      expect(transport.lastCall?.options.query?.['maxResults']).toBeUndefined();
      expect(transport.lastCall?.options.query?.['expand']).toBeUndefined();
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ startAt: 10, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('forwards expand', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ expand: 'data,contexts' });

      expect(transport.lastCall?.options.query).toMatchObject({ expand: 'data,contexts' });
    });

    it('forwards expand=data only', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ expand: 'data' });

      expect(transport.lastCall?.options.query).toMatchObject({ expand: 'data' });
    });

    it('forwards expand=contexts only', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ expand: 'contexts' });

      expect(transport.lastCall?.options.query).toMatchObject({ expand: 'contexts' });
    });

    it('omits expand when not provided (false branch)', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ startAt: 0 });

      expect(transport.lastCall?.options.query?.['expand']).toBeUndefined();
    });

    it('omits startAt when not provided (false branch)', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ maxResults: 20 });

      expect(transport.lastCall?.options.query?.['startAt']).toBeUndefined();
    });

    it('omits maxResults when not provided (false branch)', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ startAt: 5 });

      expect(transport.lastCall?.options.query?.['maxResults']).toBeUndefined();
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.list({ maxResults: 0 })).rejects.toThrow();
    });

    it('throws on negative maxResults', async () => {
      await expect(resource.list({ maxResults: -1 })).rejects.toThrow();
    });
  });

  // ── B787: listAll ──────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('yields items from single-page response (isLast=true)', async () => {
      const mod = makeUiModification();
      transport.respondWith(makePageOf([mod], 0, 1, true));

      const results: unknown[] = [];
      for await (const item of resource.listAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mod);
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [makeUiModification('mod-1')],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeUiModification('mod-2')],
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

    it('yields nothing for empty results', async () => {
      transport.respondWith(makePageOf([], 0, 0, true));

      const results: unknown[] = [];
      for await (const item of resource.listAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(0);
    });

    it('forwards maxResults to pagination', async () => {
      transport.respondWith(makePageOf([makeUiModification()], 0, 1, true));

      const results: unknown[] = [];
      for await (const item of resource.listAll({ maxResults: 10 })) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
    });

    it('forwards expand to pagination', async () => {
      transport.respondWith(makePageOf([makeUiModification()], 0, 1, true));

      const results: unknown[] = [];
      for await (const item of resource.listAll({ expand: 'contexts' })) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── B788: create ───────────────────────────────────────────────────────────

  describe('create()', () => {
    it('POSTs with required name only', async () => {
      const created = makeIdentifiers('mod-new');
      transport.respondWith(created);

      const result = await resource.create({ name: 'My Modification' });

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/uiModifications`,
        body: { name: 'My Modification' },
      });
    });

    it('returns UiModificationIdentifiers ({id, self}) — NOT full details', async () => {
      const created = makeIdentifiers('mod-123');
      transport.respondWith(created);

      const result = await resource.create({ name: 'Test' });

      // Must have id and self
      expect(result).toHaveProperty('id', 'mod-123');
      expect(result).toHaveProperty('self');
      // Must NOT have full details properties
      expect(result).not.toHaveProperty('name');
      expect(result).not.toHaveProperty('description');
      expect(result).not.toHaveProperty('data');
      expect(result).not.toHaveProperty('contexts');
    });

    it('includes optional data field', async () => {
      transport.respondWith(makeIdentifiers());

      await resource.create({
        name: 'My Modification',
        data: "{field: 'Story Points', config: {hidden: false}}",
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'My Modification',
        data: "{field: 'Story Points', config: {hidden: false}}",
      });
    });

    it('includes optional description', async () => {
      transport.respondWith(makeIdentifiers());

      await resource.create({
        name: 'My Modification',
        description: 'Reveals Story Points field.',
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'My Modification',
        description: 'Reveals Story Points field.',
      });
    });

    it('includes optional contexts', async () => {
      transport.respondWith(makeIdentifiers());

      const contexts = [{ issueTypeId: '10000', projectId: '10000', viewType: 'GIC' as const }];
      await resource.create({
        name: 'My Modification',
        contexts,
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'My Modification',
        contexts,
      });
    });

    it('includes all optional fields together', async () => {
      transport.respondWith(makeIdentifiers());

      const contexts = [{ issueTypeId: '10000', projectId: '10000', viewType: 'GIC' as const }];
      await resource.create({
        name: 'Full Modification',
        data: '{"field":"Story Points"}',
        description: 'Full description',
        contexts,
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'Full Modification',
        data: '{"field":"Story Points"}',
        description: 'Full description',
        contexts,
      });
    });

    it('omits data when not provided (false branch)', async () => {
      transport.respondWith(makeIdentifiers());

      await resource.create({ name: 'Minimal' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('data');
    });

    it('omits description when not provided (false branch)', async () => {
      transport.respondWith(makeIdentifiers());

      await resource.create({ name: 'Minimal' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('description');
    });

    it('omits contexts when not provided (false branch)', async () => {
      transport.respondWith(makeIdentifiers());

      await resource.create({ name: 'Minimal' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('contexts');
    });
  });

  // ── B790: update ───────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /uiModifications/{id} with name', async () => {
      transport.respondWith(undefined);

      await resource.update('mod-1', { name: 'Renamed Modification' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/uiModifications/mod-1`,
        body: { name: 'Renamed Modification' },
      });
    });

    it('encodes the uiModificationId in the path', async () => {
      transport.respondWith(undefined);

      await resource.update('mod/with/slash', { name: 'Test' });

      expect(transport.lastCall?.options.path).toContain('uiModifications/mod%2Fwith%2Fslash');
    });

    it('sends empty body when no fields provided', async () => {
      transport.respondWith(undefined);

      await resource.update('mod-1', {});

      expect(transport.lastCall?.options.body).toEqual({});
    });

    it('includes optional data field', async () => {
      transport.respondWith(undefined);

      await resource.update('mod-1', { data: '{"field":"updated"}' });

      expect(transport.lastCall?.options.body).toMatchObject({ data: '{"field":"updated"}' });
      expect(transport.lastCall?.options.body).not.toHaveProperty('name');
    });

    it('includes optional description', async () => {
      transport.respondWith(undefined);

      await resource.update('mod-1', { description: 'Updated desc' });

      expect(transport.lastCall?.options.body).toMatchObject({ description: 'Updated desc' });
    });

    it('includes optional contexts (replaces all existing)', async () => {
      transport.respondWith(undefined);

      const contexts = [
        { issueTypeId: '10001', projectId: '10000', viewType: 'IssueView' as const },
      ];
      await resource.update('mod-1', { contexts });

      expect(transport.lastCall?.options.body).toMatchObject({ contexts });
    });

    it('includes all fields together', async () => {
      transport.respondWith(undefined);

      const contexts = [{ issueTypeId: '10000', projectId: '10000', viewType: 'GIC' as const }];
      await resource.update('mod-1', {
        name: 'Updated name',
        data: '{"new":"data"}',
        description: 'Updated desc',
        contexts,
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'Updated name',
        data: '{"new":"data"}',
        description: 'Updated desc',
        contexts,
      });
    });

    it('omits name when not provided (false branch)', async () => {
      transport.respondWith(undefined);

      await resource.update('mod-1', { description: 'Only desc' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('name');
    });

    it('omits data when not provided (false branch)', async () => {
      transport.respondWith(undefined);

      await resource.update('mod-1', { name: 'Only name' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('data');
    });

    it('omits description when not provided (false branch)', async () => {
      transport.respondWith(undefined);

      await resource.update('mod-1', { name: 'Only name' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('description');
    });

    it('omits contexts when not provided (false branch)', async () => {
      transport.respondWith(undefined);

      await resource.update('mod-1', { name: 'Only name' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('contexts');
    });

    it('propagates 404 error when modification not found', async () => {
      transport.respondWithError(new Error('Not Found'));

      await expect(resource.update('nonexistent', { name: 'Test' })).rejects.toThrow('Not Found');
    });
  });

  // ── B789: delete ───────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /uiModifications/{id}', async () => {
      transport.respondWith(undefined);

      await resource.delete('mod-1');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/uiModifications/mod-1`,
      });
    });

    it('encodes the uiModificationId in the path', async () => {
      transport.respondWith(undefined);

      await resource.delete('mod/special');

      expect(transport.lastCall?.options.path).toContain('uiModifications/mod%2Fspecial');
    });

    it('returns void on success', async () => {
      transport.respondWith(undefined);

      const result = await resource.delete('mod-1');

      expect(result).toBeUndefined();
    });

    it('propagates 404 error when modification not found', async () => {
      transport.respondWithError(new Error('Not Found'));

      await expect(resource.delete('nonexistent')).rejects.toThrow('Not Found');
    });
  });
});
