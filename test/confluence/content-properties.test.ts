import { describe, it, expect, beforeEach } from 'vitest';
import { ContentPropertiesResource } from '../../src/confluence/resources/content-properties.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeProperty = (id: string, key: string) => ({
  id,
  key,
  value: { color: 'blue' },
  version: { number: 1 },
});

describe('ContentPropertiesResource', () => {
  let transport: MockTransport;
  let resource: ContentPropertiesResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new ContentPropertiesResource(transport, BASE_URL);
  });

  // ── listForPage ───────────────────────────────────────────────────────────

  describe('listForPage()', () => {
    it('calls GET /pages/{pageId}/properties with no params', async () => {
      // Arrange
      const payload = { results: [makeProperty('p1', 'color')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await resource.listForPage('page-1');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/page-1/properties`,
      });
    });

    it('passes params when provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.listForPage('page-1', { key: 'color', limit: 10, cursor: 'tok' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        key: 'color',
        limit: 10,
        cursor: 'tok',
      });
    });

    it('throws RangeError when limit is invalid', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act + Assert
      await expect(resource.listForPage('page-1', { limit: 0 })).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── getForPage ────────────────────────────────────────────────────────────

  describe('getForPage()', () => {
    it('calls GET /pages/{pageId}/properties/{key}', async () => {
      // Arrange
      const property = makeProperty('p1', 'color');
      transport.respondWith(property);

      // Act
      const result = await resource.getForPage('page-1', 'color');

      // Assert
      expect(result).toEqual(property);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/page-1/properties/color`,
      });
    });
  });

  // ── createForPage ─────────────────────────────────────────────────────────

  describe('createForPage()', () => {
    it('calls POST /pages/{pageId}/properties with data', async () => {
      // Arrange
      const property = makeProperty('p2', 'theme');
      transport.respondWith(property);
      const data = { key: 'theme', value: { mode: 'dark' } };

      // Act
      const result = await resource.createForPage('page-1', data);

      // Assert
      expect(result).toEqual(property);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/pages/page-1/properties`,
        body: data,
      });
    });
  });

  // ── updateForPage ─────────────────────────────────────────────────────────

  describe('updateForPage()', () => {
    it('calls PUT /pages/{pageId}/properties/{key} with updated data', async () => {
      // Arrange
      const updated = { ...makeProperty('p1', 'color'), value: { color: 'red' } };
      transport.respondWith(updated);
      const data = {
        key: 'color',
        value: { color: 'red' },
        version: { number: 2 },
      };

      // Act
      const result = await resource.updateForPage('page-1', 'color', data);

      // Assert
      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/pages/page-1/properties/color`,
        body: data,
      });
    });
  });

  // ── deleteForPage ─────────────────────────────────────────────────────────

  describe('deleteForPage()', () => {
    it('calls DELETE /pages/{pageId}/properties/{key}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await resource.deleteForPage('page-1', 'color');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/pages/page-1/properties/color`,
      });
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes pageId in listForPage()', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listForPage('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin/properties`);
    });

    it('encodes pageId and propertyKey in getForPage()', async () => {
      transport.respondWith(makeProperty('x', 'k'));
      await resource.getForPage('../admin', '../key');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/pages/..%2Fadmin/properties/..%2Fkey`,
      );
    });

    it('encodes pageId in createForPage()', async () => {
      transport.respondWith(makeProperty('x', 'k'));
      await resource.createForPage('../admin', { key: 'k', value: {} });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin/properties`);
    });

    it('encodes pageId in updateForPage() (propertyKey validated; URL-safe by contract)', async () => {
      transport.respondWith(makeProperty('x', 'my.key'));
      await resource.updateForPage('../admin', 'my.key', {
        key: 'my.key',
        value: {},
        version: { number: 2 },
      });
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/pages/..%2Fadmin/properties/my.key`,
      );
    });

    it('encodes pageId and propertyKey in deleteForPage()', async () => {
      transport.respondWith(undefined);
      await resource.deleteForPage('../admin', '../key');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/pages/..%2Fadmin/properties/..%2Fkey`,
      );
    });
  });

  // ── B029: client-side validation of content-property keys ─────────────────

  describe('B029: content-property key validation', () => {
    it('rejects invalid key in createForPage data', async () => {
      await expect(
        resource.createForPage('page-1', { key: '../bad', value: {} }),
      ).rejects.toThrow(/content property key must match/);
      expect(transport.calls).toHaveLength(0);
    });

    it('rejects invalid propertyKey in updateForPage path arg', async () => {
      await expect(
        resource.updateForPage('page-1', '../bad', {
          key: 'ok',
          value: {},
          version: { number: 2 },
        }),
      ).rejects.toThrow(/content property key must match/);
      expect(transport.calls).toHaveLength(0);
    });

    it('rejects invalid data.key in updateForPage body', async () => {
      await expect(
        resource.updateForPage('page-1', 'ok', {
          key: '../bad',
          value: {},
          version: { number: 2 },
        }),
      ).rejects.toThrow(/content property key must match/);
      expect(transport.calls).toHaveLength(0);
    });

    it('accepts a structured JsonValue payload (B029 value widening)', async () => {
      transport.respondWith(makeProperty('1', 'my.key'));
      await resource.createForPage('page-1', {
        key: 'my.key',
        value: { nested: { array: [1, 'two', null, true] } },
      });
      expect(transport.lastCall?.options.body).toMatchObject({
        key: 'my.key',
        value: { nested: { array: [1, 'two', null, true] } },
      });
    });
  });
});
