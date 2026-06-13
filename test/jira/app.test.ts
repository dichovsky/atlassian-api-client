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
    it('calls GET /app/field/{fieldIdOrKey}/context/configuration', async () => {
      transport.respondWith({ id: 'cfg-1', contextId: '10100', configuration: { foo: true } });

      const result = await app.getFieldContextConfiguration('customfield_10042');

      expect(result).toEqual({ id: 'cfg-1', contextId: '10100', configuration: { foo: true } });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${API_BASE}/app/field/customfield_10042/context/configuration`,
      });
    });

    it('URL-encodes the fieldIdOrKey path segment', async () => {
      transport.respondWith({ id: 'cfg-1', contextId: '10100' });

      await app.getFieldContextConfiguration('weird/key with space');

      expect(transport.lastCall?.options.path).toBe(
        `${API_BASE}/app/field/weird%2Fkey%20with%20space/context/configuration`,
      );
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
    it('POSTs the body and returns the list', async () => {
      transport.respondWith({ configurations: [{ id: 'cfg-1', contextId: '10100' }] });

      const result = await app.listFieldContextConfigurations({
        fieldIdsOrKeys: ['customfield_10042'],
        contextIds: ['10100'],
      });

      expect(result).toEqual({ configurations: [{ id: 'cfg-1', contextId: '10100' }] });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${API_BASE}/app/field/context/configuration/list`,
        body: { fieldIdsOrKeys: ['customfield_10042'], contextIds: ['10100'] },
      });
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
        body: { updates: [{ issueIds: [10001, 10002], value: 'hello' }] },
      });
    });

    it('encodes fieldIdOrKey in the path', async () => {
      transport.respondWith(undefined, 204);

      await app.updateFieldValue('weird key', { updates: [{ issueKeys: ['ABC-1'], value: 1 }] });

      expect(transport.lastCall?.options.path).toBe(`${API_BASE}/app/field/weird%20key/value`);
    });
  });

  describe('bulkUpdateFieldValue()', () => {
    it('POSTs the bulk updates and returns void', async () => {
      transport.respondWith(undefined, 204);

      const result = await app.bulkUpdateFieldValue({
        updates: [
          {
            fieldIdOrKey: 'customfield_10042',
            updates: [{ issueIds: [10001], value: { x: 1 } }],
          },
        ],
      });

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${API_BASE}/app/field/value`,
        body: {
          updates: [
            {
              fieldIdOrKey: 'customfield_10042',
              updates: [{ issueIds: [10001], value: { x: 1 } }],
            },
          ],
        },
      });
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
});
