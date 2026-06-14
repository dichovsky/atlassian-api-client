import { describe, it, expect, beforeEach } from 'vitest';
import { AppResource } from '../../src/jira/resources/app.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const API_BASE = 'https://test.atlassian.net/rest/api/3';
const CONNECT_BASE = 'https://test.atlassian.net/rest/atlassian-connect/1';
const FORGE_BASE = 'https://test.atlassian.net/rest/forge/1';

describe('AppResource', () => {
  let transport: MockTransport;
  let app: AppResource;

  beforeEach(() => {
    transport = new MockTransport();
    app = new AppResource(transport, API_BASE, CONNECT_BASE, FORGE_BASE);
  });

  // ── Field context configuration ───────────────────────────────────────────

  describe('getFieldContextConfiguration()', () => {
    it('calls GET /app/field/{fieldIdOrKey}/context/configuration and returns paginated response (B1056)', async () => {
      // Spec returns PageBeanContextualConfiguration, not a single item.
      // Items use fieldContextId (not contextId).
      const pageBean = {
        isLast: true,
        maxResults: 50,
        startAt: 0,
        total: 1,
        values: [{ id: 'cfg-1', fieldContextId: '10100', configuration: { foo: true } }],
      };
      transport.respondWith(pageBean);

      const result = await app.getFieldContextConfiguration('customfield_10042');

      expect(result).toEqual(pageBean);
      // Regression: old code returned a single FieldContextConfiguration, not PageBean.
      expect(result).toHaveProperty('values');
      expect(result).toHaveProperty('isLast');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${API_BASE}/app/field/customfield_10042/context/configuration`,
      });
    });

    it('URL-encodes the fieldIdOrKey path segment', async () => {
      transport.respondWith({ isLast: true, values: [] });

      await app.getFieldContextConfiguration('weird/key with space');

      expect(transport.lastCall?.options.path).toContain(
        `${API_BASE}/app/field/weird%2Fkey%20with%20space/context/configuration`,
      );
    });

    it('passes id as repeated query params via path (type:array in spec)', async () => {
      transport.respondWith({ isLast: true, values: [] });

      await app.getFieldContextConfiguration('customfield_10042', { id: [10000, 10001] });

      const path = transport.lastCall?.options.path as string;
      expect(path).toContain('id=10000');
      expect(path).toContain('id=10001');
    });

    it('passes fieldContextId as repeated query params via path (type:array in spec)', async () => {
      transport.respondWith({ isLast: true, values: [] });

      await app.getFieldContextConfiguration('customfield_10042', {
        fieldContextId: [10010, 10011],
      });

      const path = transport.lastCall?.options.path as string;
      expect(path).toContain('fieldContextId=10010');
      expect(path).toContain('fieldContextId=10011');
    });

    it('passes scalar query params via query object', async () => {
      transport.respondWith({ isLast: true, values: [] });

      await app.getFieldContextConfiguration('customfield_10042', {
        issueId: 9999,
        projectKeyOrId: 'PROJ',
        issueTypeId: 'it-1',
        startAt: 0,
        maxResults: 50,
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        issueId: 9999,
        projectKeyOrId: 'PROJ',
        issueTypeId: 'it-1',
        startAt: 0,
        maxResults: 50,
      });
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('forbidden'));
      await expect(app.getFieldContextConfiguration('customfield_10042')).rejects.toThrow(
        'forbidden',
      );
    });
  });

  describe('updateFieldContextConfiguration()', () => {
    it('sends the spec body { configurations: [{ id, ... }] } and returns void (B1045)', async () => {
      transport.respondWith(undefined, 204);

      const result = await app.updateFieldContextConfiguration('customfield_10042', {
        configurations: [{ id: '10000', configuration: { foo: true }, schema: { type: 'object' } }],
      });

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${API_BASE}/app/field/customfield_10042/context/configuration`,
        // Regression: the old code sent a flat { configuration, schema } body,
        // omitting the required `configurations` wrapper → server 400.
        body: {
          configurations: [
            { id: '10000', configuration: { foo: true }, schema: { type: 'object' } },
          ],
        },
      });
    });

    it('throws ValidationError when configurations is empty', async () => {
      await expect(
        app.updateFieldContextConfiguration('customfield_10042', { configurations: [] }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError when a configuration has no id', async () => {
      await expect(
        app.updateFieldContextConfiguration('customfield_10042', {
          configurations: [{ id: '' }],
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('listFieldContextConfigurations()', () => {
    it('POSTs with required fieldIdsOrKeys body and returns paginated response with values (B1056)', async () => {
      // Spec returns PageBeanBulkContextualConfiguration with `values` (not `configurations`).
      // BulkContextualConfiguration includes customFieldId.
      const pageBean = {
        isLast: true,
        maxResults: 100,
        startAt: 0,
        total: 1,
        values: [{ id: 'cfg-1', customFieldId: 'customfield_10042', fieldContextId: '10100' }],
      };
      transport.respondWith(pageBean);

      const result = await app.listFieldContextConfigurations({
        fieldIdsOrKeys: ['customfield_10042'],
      });

      expect(result).toEqual(pageBean);
      // Regression: old envelope used `configurations` key instead of `values`.
      expect(result).toHaveProperty('values');
      expect(result).not.toHaveProperty('configurations');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${API_BASE}/app/field/context/configuration/list`,
        // Regression: old body allowed `contextIds` which is not in spec.
        body: { fieldIdsOrKeys: ['customfield_10042'] },
      });
    });

    it('body must NOT include contextIds (not in spec ConfigurationsListParameters)', async () => {
      // The spec ConfigurationsListParameters only has `fieldIdsOrKeys` (required).
      // Sending `contextIds` would be ignored or rejected by the server.
      transport.respondWith({ isLast: true, values: [] });

      await app.listFieldContextConfigurations({ fieldIdsOrKeys: ['customfield_10042'] });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('contextIds');
    });

    it('passes id filter as repeated query params (type:array)', async () => {
      transport.respondWith({ isLast: true, values: [] });

      await app.listFieldContextConfigurations(
        { fieldIdsOrKeys: ['customfield_10042'] },
        { id: [10000, 10001] },
      );

      const path = transport.lastCall?.options.path as string;
      expect(path).toContain('id=10000');
      expect(path).toContain('id=10001');
    });

    it('passes fieldContextId filter as repeated query params (type:array)', async () => {
      transport.respondWith({ isLast: true, values: [] });

      await app.listFieldContextConfigurations(
        { fieldIdsOrKeys: ['customfield_10042'] },
        { fieldContextId: [10010] },
      );

      const path = transport.lastCall?.options.path as string;
      expect(path).toContain('fieldContextId=10010');
    });

    it('passes pagination query params', async () => {
      transport.respondWith({ isLast: false, values: [] });

      await app.listFieldContextConfigurations(
        { fieldIdsOrKeys: ['customfield_10042'] },
        { startAt: 100, maxResults: 50 },
      );

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 100, maxResults: 50 });
    });
  });

  // ── Field value updates ───────────────────────────────────────────────────

  describe('updateFieldValue()', () => {
    it('PUTs the updates and returns void', async () => {
      transport.respondWith(undefined, 204);

      const result = await app.updateFieldValue('customfield_10042', {
        updates: [{ issueIds: [10001, 10002], value: 'hello' }],
      });

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${API_BASE}/app/field/customfield_10042/value`,
        // Regression: old FieldValueUpdate had fictional issueIdsOrKeys and issueKeys.
        // Spec CustomFieldValueUpdate only has issueIds (required) and value.
        body: { updates: [{ issueIds: [10001, 10002], value: 'hello' }] },
      });
    });

    it('encodes fieldIdOrKey in the path', async () => {
      transport.respondWith(undefined, 204);

      await app.updateFieldValue('weird key', { updates: [{ issueIds: [1], value: 1 }] });

      expect(transport.lastCall?.options.path).toContain(`${API_BASE}/app/field/weird%20key/value`);
    });

    it('sends generateChangelog and generateAppEvents query params (B1056)', async () => {
      transport.respondWith(undefined, 204);

      await app.updateFieldValue(
        'customfield_10042',
        { updates: [{ issueIds: [1], value: 'v' }] },
        { generateChangelog: false, generateAppEvents: false },
      );

      expect(transport.lastCall?.options.query).toMatchObject({
        generateChangelog: false,
        generateAppEvents: false,
      });
    });

    it('omits generateChangelog and generateAppEvents when not provided', async () => {
      transport.respondWith(undefined, 204);

      await app.updateFieldValue('customfield_10042', { updates: [{ issueIds: [1], value: 'v' }] });

      const q = transport.lastCall?.options.query as Record<string, unknown> | undefined;
      expect(q).not.toHaveProperty('generateChangelog');
      expect(q).not.toHaveProperty('generateAppEvents');
    });
  });

  describe('bulkUpdateFieldValue()', () => {
    it('POSTs the flat per-field updates and returns void (B1056 — spec is flat not nested)', async () => {
      transport.respondWith(undefined, 204);

      // Spec MultipleCustomFieldValuesUpdate: { customField, issueIds, value }
      // NOT nested { fieldIdOrKey, updates: [...] }.
      const result = await app.bulkUpdateFieldValue({
        updates: [
          { customField: 'customfield_10042', issueIds: [10001], value: { x: 1 } },
          { customField: 'customfield_10043', issueIds: [10001, 10002], value: 'new' },
        ],
      });

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${API_BASE}/app/field/value`,
        body: {
          updates: [
            { customField: 'customfield_10042', issueIds: [10001], value: { x: 1 } },
            { customField: 'customfield_10043', issueIds: [10001, 10002], value: 'new' },
          ],
        },
      });
    });

    it('sends generateChangelog and generateAppEvents query params (B1056)', async () => {
      transport.respondWith(undefined, 204);

      await app.bulkUpdateFieldValue(
        { updates: [{ customField: 'cf_1', issueIds: [1], value: 'v' }] },
        { generateChangelog: true, generateAppEvents: false },
      );

      expect(transport.lastCall?.options.query).toMatchObject({
        generateChangelog: true,
        generateAppEvents: false,
      });
    });

    it('body does NOT have fieldIdOrKey or nested updates (regression for old nested shape)', async () => {
      transport.respondWith(undefined, 204);

      await app.bulkUpdateFieldValue({
        updates: [{ customField: 'cf_1', issueIds: [1], value: 'v' }],
      });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      const firstUpdate = (body['updates'] as Record<string, unknown>[])[0];
      // Spec is flat: customField at top level, not nested fieldIdOrKey+updates.
      expect(firstUpdate).toHaveProperty('customField');
      expect(firstUpdate).not.toHaveProperty('fieldIdOrKey');
      expect(firstUpdate).not.toHaveProperty('updates');
    });
  });

  // ── Atlassian Connect dynamic modules ─────────────────────────────────────

  describe('getDynamicModules()', () => {
    it('GETs /app/module/dynamic on the Connect base', async () => {
      transport.respondWith({ modules: [{ key: 'm-1', type: 'webhook' }] });

      const result = await app.getDynamicModules();

      expect(result).toEqual({ modules: [{ key: 'm-1', type: 'webhook' }] });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${CONNECT_BASE}/app/module/dynamic`,
      });
    });
  });

  describe('registerDynamicModules()', () => {
    it('POSTs the modules body and returns void', async () => {
      transport.respondWith(undefined, 200);

      const result = await app.registerDynamicModules({
        modules: [{ key: 'my-module', type: 'webhook' }],
      });

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${CONNECT_BASE}/app/module/dynamic`,
        body: { modules: [{ key: 'my-module', type: 'webhook' }] },
      });
    });
  });

  describe('deleteDynamicModules()', () => {
    it('DELETEs all modules when no params are provided', async () => {
      transport.respondWith(undefined, 204);

      const result = await app.deleteDynamicModules();

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${CONNECT_BASE}/app/module/dynamic`,
      });
    });

    it('DELETEs all modules when params has empty moduleKey array', async () => {
      transport.respondWith(undefined, 204);

      await app.deleteDynamicModules({ moduleKey: [] });

      expect(transport.lastCall?.options.path).toBe(`${CONNECT_BASE}/app/module/dynamic`);
    });

    it('appends repeated moduleKey query params, URL-encoding each value', async () => {
      transport.respondWith(undefined, 204);

      await app.deleteDynamicModules({ moduleKey: ['a', 'b c', 'd&e'] });

      // The transport sees the path with the query string already attached;
      // each key is URL-encoded and repeated rather than comma-joined.
      expect(transport.lastCall?.options.path).toBe(
        `${CONNECT_BASE}/app/module/dynamic?moduleKey=a&moduleKey=b%20c&moduleKey=d%26e`,
      );
    });
  });

  // ── Forge app properties ──────────────────────────────────────────────────

  describe('listForgeProperties()', () => {
    it('GETs /app/properties on the Forge base', async () => {
      transport.respondWith({ keys: [{ key: 'k1', self: 'https://x/k1' }] });

      const result = await app.listForgeProperties();

      expect(result).toEqual({ keys: [{ key: 'k1', self: 'https://x/k1' }] });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${FORGE_BASE}/app/properties`,
      });
    });
  });

  describe('getForgeProperty()', () => {
    it('GETs the property by key', async () => {
      transport.respondWith({ key: 'my-key', value: { on: true } });

      const result = await app.getForgeProperty('my-key');

      expect(result).toEqual({ key: 'my-key', value: { on: true } });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${FORGE_BASE}/app/properties/my-key`,
      });
    });

    it('URL-encodes the property key', async () => {
      transport.respondWith({ key: 'a/b', value: 1 });

      await app.getForgeProperty('a/b');

      expect(transport.lastCall?.options.path).toBe(`${FORGE_BASE}/app/properties/a%2Fb`);
    });
  });

  describe('setForgeProperty()', () => {
    it('PUTs the value verbatim and returns void', async () => {
      transport.respondWith(undefined, 200);

      const result = await app.setForgeProperty('my-key', { on: true, n: 1 });

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${FORGE_BASE}/app/properties/my-key`,
        body: { on: true, n: 1 },
      });
    });

    it('PUTs a primitive value verbatim', async () => {
      transport.respondWith(undefined, 200);

      await app.setForgeProperty('my-key', 42);

      expect(transport.lastCall?.options.body).toBe(42);
    });
  });

  describe('deleteForgeProperty()', () => {
    it('DELETEs the property by key', async () => {
      transport.respondWith(undefined, 204);

      const result = await app.deleteForgeProperty('my-key');

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${FORGE_BASE}/app/properties/my-key`,
      });
    });
  });

  it('rejects a path-traversal fieldIdOrKey (B1052)', async () => {
    await expect(app.getFieldContextConfiguration('..')).rejects.toThrow(ValidationError);
  });

  it('rejects a path-traversal propertyKey (B1052)', async () => {
    await expect(app.getForgeProperty('..')).rejects.toThrow(ValidationError);
  });
});
