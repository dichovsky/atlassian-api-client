import { describe, it, expect, beforeEach } from 'vitest';
import { ScreensResource } from '../../src/jira/resources/screens.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeScreen = (id = 10001, name = 'Default Screen') => ({
  id,
  name,
  description: 'A test screen',
});

const makeTab = (id = 1, name = 'Field Tab') => ({ id, name });
const makeField = (id = 'summary', name = 'Summary') => ({ id, name });

const makePageOf = <T>(values: T[], startAt = 0, total = values.length) => ({
  values,
  startAt,
  maxResults: 50,
  total,
  isLast: true,
});

describe('ScreensResource', () => {
  let transport: MockTransport;
  let resource: ScreensResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new ScreensResource(transport, BASE_URL);
  });

  // ── B746: list ─────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /screens with no params', async () => {
      const page = makePageOf([makeScreen()]);
      transport.respondWith(page);

      const result = await resource.list();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/screens`,
      });
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ startAt: 10, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('forwards id as comma-joined string', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ id: [10001, 10002] });

      expect(transport.lastCall?.options.query).toMatchObject({ id: '10001,10002' });
    });

    it('omits empty id array', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ id: [] });

      expect(transport.lastCall?.options.query?.['id']).toBeUndefined();
    });

    it('forwards queryString', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ queryString: 'Default' });

      expect(transport.lastCall?.options.query).toMatchObject({ queryString: 'Default' });
    });

    it('forwards scope as comma-joined string', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ scope: ['PROJECT', 'GLOBAL'] });

      expect(transport.lastCall?.options.query).toMatchObject({ scope: 'PROJECT,GLOBAL' });
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

  // ── B746: listAll ──────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('yields items from paginated response', async () => {
      const screen = makeScreen();
      transport.respondWith(makePageOf([screen]));

      const results: unknown[] = [];
      for await (const item of resource.listAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(screen);
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [makeScreen(10001)],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeScreen(10002)],
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

  // ── B747: create ───────────────────────────────────────────────────────────

  describe('create()', () => {
    it('POSTs with required name', async () => {
      const created = makeScreen();
      transport.respondWith(created);

      const result = await resource.create({ name: 'Default Screen' });

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/screens`,
        body: { name: 'Default Screen' },
      });
    });

    it('includes optional description', async () => {
      transport.respondWith(makeScreen());

      await resource.create({ name: 'Default Screen', description: 'A screen' });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'Default Screen',
        description: 'A screen',
      });
    });

    it('omits description when not provided', async () => {
      transport.respondWith(makeScreen());

      await resource.create({ name: 'Minimal' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('description');
    });
  });

  // ── B748: delete ───────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /screens/{screenId}', async () => {
      transport.respondWith(undefined);

      await resource.delete(10001);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/screens/10001`,
      });
    });
  });

  // ── B749: update ───────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /screens/{screenId} with name', async () => {
      const updated = makeScreen();
      transport.respondWith(updated);

      const result = await resource.update(10001, { name: 'Renamed Screen' });

      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/screens/10001`,
        body: { name: 'Renamed Screen' },
      });
    });

    it('calls PUT with description only', async () => {
      transport.respondWith(makeScreen());

      await resource.update(10001, { description: 'New desc' });

      expect(transport.lastCall?.options.body).toMatchObject({ description: 'New desc' });
      expect(transport.lastCall?.options.body).not.toHaveProperty('name');
    });

    it('omits undefined fields', async () => {
      transport.respondWith(makeScreen());

      await resource.update(10001, {});

      expect(transport.lastCall?.options.body).toEqual({});
    });
  });

  // ── B750: listAvailableFields ──────────────────────────────────────────────

  describe('listAvailableFields()', () => {
    it('calls GET /screens/{screenId}/availableFields', async () => {
      const fields = [makeField()];
      transport.respondWith(fields);

      const result = await resource.listAvailableFields(10001);

      expect(result).toEqual(fields);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/screens/10001/availableFields`,
      });
    });
  });

  // ── B751: listTabs ─────────────────────────────────────────────────────────

  describe('listTabs()', () => {
    it('calls GET /screens/{screenId}/tabs', async () => {
      const tabs = [makeTab()];
      transport.respondWith(tabs);

      const result = await resource.listTabs(10001);

      expect(result).toEqual(tabs);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/screens/10001/tabs`,
      });
    });

    it('forwards projectKey query param', async () => {
      transport.respondWith([makeTab()]);

      await resource.listTabs(10001, 'PROJ');

      expect(transport.lastCall?.options.query).toMatchObject({ projectKey: 'PROJ' });
    });

    it('sends no query when projectKey is omitted', async () => {
      transport.respondWith([]);

      await resource.listTabs(10001);

      expect(transport.lastCall?.options.query?.['projectKey']).toBeUndefined();
    });
  });

  // ── B752: createTab ────────────────────────────────────────────────────────

  describe('createTab()', () => {
    it('POSTs tab name to /screens/{screenId}/tabs', async () => {
      const tab = makeTab();
      transport.respondWith(tab);

      const result = await resource.createTab(10001, { name: 'Field Tab' });

      expect(result).toEqual(tab);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/screens/10001/tabs`,
        body: { name: 'Field Tab' },
      });
    });
  });

  // ── B753: deleteTab ────────────────────────────────────────────────────────

  describe('deleteTab()', () => {
    it('calls DELETE /screens/{screenId}/tabs/{tabId}', async () => {
      transport.respondWith(undefined);

      await resource.deleteTab(10001, 1);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/screens/10001/tabs/1`,
      });
    });
  });

  // ── B754: updateTab ────────────────────────────────────────────────────────

  describe('updateTab()', () => {
    it('calls PUT /screens/{screenId}/tabs/{tabId} with name', async () => {
      const tab = makeTab(1, 'Renamed Tab');
      transport.respondWith(tab);

      const result = await resource.updateTab(10001, 1, { name: 'Renamed Tab' });

      expect(result).toEqual(tab);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/screens/10001/tabs/1`,
        body: { name: 'Renamed Tab' },
      });
    });
  });

  // ── B755: listTabFields ────────────────────────────────────────────────────

  describe('listTabFields()', () => {
    it('calls GET /screens/{screenId}/tabs/{tabId}/fields', async () => {
      const fields = [makeField()];
      transport.respondWith(fields);

      const result = await resource.listTabFields(10001, 1);

      expect(result).toEqual(fields);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/screens/10001/tabs/1/fields`,
      });
    });

    it('forwards projectKey query param', async () => {
      transport.respondWith([makeField()]);

      await resource.listTabFields(10001, 1, { projectKey: 'PROJ' });

      expect(transport.lastCall?.options.query).toMatchObject({ projectKey: 'PROJ' });
    });
  });

  // ── B756: addFieldToTab ────────────────────────────────────────────────────

  describe('addFieldToTab()', () => {
    it('POSTs fieldId to /screens/{screenId}/tabs/{tabId}/fields', async () => {
      const field = makeField();
      transport.respondWith(field);

      const result = await resource.addFieldToTab(10001, 1, { fieldId: 'summary' });

      expect(result).toEqual(field);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/screens/10001/tabs/1/fields`,
        body: { fieldId: 'summary' },
      });
    });

    it('forwards skipFieldAssociation query param', async () => {
      transport.respondWith(makeField());

      await resource.addFieldToTab(10001, 1, { fieldId: 'summary' }, true);

      expect(transport.lastCall?.options.query).toMatchObject({ skipFieldAssociation: true });
    });

    it('omits skipFieldAssociation when undefined', async () => {
      transport.respondWith(makeField());

      await resource.addFieldToTab(10001, 1, { fieldId: 'summary' });

      expect(transport.lastCall?.options.query?.['skipFieldAssociation']).toBeUndefined();
    });
  });

  // ── B757: removeFieldFromTab ───────────────────────────────────────────────

  describe('removeFieldFromTab()', () => {
    it('calls DELETE /screens/{screenId}/tabs/{tabId}/fields/{id}', async () => {
      transport.respondWith(undefined);

      await resource.removeFieldFromTab(10001, 1, 'summary');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/screens/10001/tabs/1/fields/summary`,
      });
    });
  });

  // ── B758: moveField ────────────────────────────────────────────────────────

  describe('moveField()', () => {
    it('POSTs position to /screens/{screenId}/tabs/{tabId}/fields/{id}/move', async () => {
      transport.respondWith(undefined);

      await resource.moveField(10001, 1, 'summary', { position: 'First' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/screens/10001/tabs/1/fields/summary/move`,
        body: { position: 'First' },
      });
    });

    it('POSTs after field reference', async () => {
      transport.respondWith(undefined);

      await resource.moveField(10001, 1, 'summary', { after: 'description' });

      expect(transport.lastCall?.options.body).toMatchObject({ after: 'description' });
      expect(transport.lastCall?.options.body).not.toHaveProperty('position');
    });

    it('sends empty body when no fields provided', async () => {
      transport.respondWith(undefined);

      await resource.moveField(10001, 1, 'summary', {});

      expect(transport.lastCall?.options.body).toEqual({});
    });
  });

  // ── B759: moveTab ──────────────────────────────────────────────────────────

  describe('moveTab()', () => {
    it('POSTs to /screens/{screenId}/tabs/{tabId}/move/{pos}', async () => {
      transport.respondWith(undefined);

      await resource.moveTab(10001, 1, 0);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/screens/10001/tabs/1/move/0`,
      });
    });
  });

  // ── B760: addToDefault ─────────────────────────────────────────────────────

  describe('addToDefault()', () => {
    it('POSTs to /screens/addToDefault/{fieldId}', async () => {
      transport.respondWith({});

      const result = await resource.addToDefault('summary');

      expect(result).toBeDefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/screens/addToDefault/summary`,
      });
    });
  });

  // ── B761: listScreenTabs / listAllScreenTabs ───────────────────────────────

  describe('listScreenTabs()', () => {
    it('returns the page bean from GET /screens/tabs with no params', async () => {
      const page = makePageOf([{ screenId: 10001, tabId: 1, tabName: 'Field Tab' }]);
      transport.respondWith(page);

      const result = await resource.listScreenTabs();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/screens/tabs`,
      });
    });

    it('forwards screenId as comma-joined string', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listScreenTabs({ screenId: [10001, 10002] });

      expect(transport.lastCall?.options.query).toMatchObject({ screenId: '10001,10002' });
    });

    it('forwards tabId as comma-joined string', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listScreenTabs({ tabId: [1, 2] });

      expect(transport.lastCall?.options.query).toMatchObject({ tabId: '1,2' });
    });

    it('forwards startAt and maxResult', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listScreenTabs({ startAt: 5, maxResult: 20 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResult: 20 });
    });

    it('omits empty screenId array', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listScreenTabs({ screenId: [] });

      expect(transport.lastCall?.options.query?.['screenId']).toBeUndefined();
    });

    it('rejects an invalid maxResult', async () => {
      await expect(resource.listScreenTabs({ maxResult: 0 })).rejects.toThrow();
    });
  });

  describe('listAllScreenTabs()', () => {
    it('iterates every tab across pages', async () => {
      transport
        .respondWith({
          values: [
            { screenId: 1, tabId: 1, tabName: 'A' },
            { screenId: 1, tabId: 2, tabName: 'B' },
          ],
          startAt: 0,
          maxResults: 2,
          total: 3,
          isLast: false,
        })
        .respondWith({
          values: [{ screenId: 2, tabId: 3, tabName: 'C' }],
          startAt: 2,
          maxResults: 2,
          total: 3,
          isLast: true,
        });

      const tabNames: (string | undefined)[] = [];
      for await (const tab of resource.listAllScreenTabs({ screenId: [1, 2] })) {
        tabNames.push(tab.tabName);
      }

      expect(tabNames).toEqual(['A', 'B', 'C']);
    });

    it('rejects an invalid maxResult before requesting', async () => {
      await expect(resource.listAllScreenTabs({ maxResult: 0 }).next()).rejects.toThrow();
    });

    it('strips the page-size key from the base query (paginateOffset owns it)', async () => {
      transport.respondWith({
        values: [{ screenId: 1, tabId: 1, tabName: 'A' }],
        startAt: 0,
        maxResults: 5,
        total: 1,
        isLast: true,
      });

      for await (const _tab of resource.listAllScreenTabs({ screenId: [1], maxResult: 5 })) {
        /* consume */
      }

      expect(transport.calls[0]?.options.query).not.toHaveProperty('maxResult');
    });
  });
});
