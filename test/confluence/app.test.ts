import { describe, it, expect, beforeEach } from 'vitest';
import { AppResource } from '../../src/confluence/resources/app.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeProperty = (key: string, value: unknown) => ({
  id: 'prop-1',
  key,
  value,
  version: { number: 1 },
});

describe('AppResource', () => {
  let transport: MockTransport;
  let resource: AppResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new AppResource(transport, BASE_URL);
  });

  // ── listProperties ────────────────────────────────────────────────────────

  describe('listProperties()', () => {
    it('calls GET /app/properties with no params', async () => {
      // Arrange
      const payload = { results: [makeProperty('k', { a: 1 })], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await resource.listProperties();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/app/properties`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('passes limit and cursor when provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.listProperties({ limit: 10, cursor: 'tok' });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ limit: 10, cursor: 'tok' });
    });

    it('omits cursor when only limit is provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.listProperties({ limit: 5 });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ limit: 5 });
    });

    it('omits limit when only cursor is provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.listProperties({ cursor: 'c1' });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ cursor: 'c1' });
    });

    it('throws ValidationError when limit is zero', async () => {
      await expect(resource.listProperties({ limit: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when limit is negative', async () => {
      await expect(resource.listProperties({ limit: -1 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── getProperty ───────────────────────────────────────────────────────────

  describe('getProperty()', () => {
    it('calls GET /app/properties/{key}', async () => {
      // Arrange
      const property = makeProperty('feature-flags', { beta: true });
      transport.respondWith(property);

      // Act
      const result = await resource.getProperty('feature-flags');

      // Assert
      expect(result).toEqual(property);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/app/properties/feature-flags`,
      });
    });
  });

  // ── upsertProperty ────────────────────────────────────────────────────────

  describe('upsertProperty()', () => {
    it('calls PUT /app/properties/{key} with the raw value as body', async () => {
      // Arrange
      const property = makeProperty('feature-flags', { beta: true });
      transport.respondWith(property);
      const value = { beta: true, version: 7 };

      // Act
      const result = await resource.upsertProperty('feature-flags', { value });

      // Assert
      expect(result).toEqual(property);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/app/properties/feature-flags`,
        body: value,
      });
    });

    it('passes through primitive values verbatim', async () => {
      // Arrange
      transport.respondWith(makeProperty('counter', 42));

      // Act
      await resource.upsertProperty('counter', { value: 42 });

      // Assert
      expect(transport.lastCall?.options.body).toBe(42);
    });
  });

  // ── deleteProperty ────────────────────────────────────────────────────────

  describe('deleteProperty()', () => {
    it('calls DELETE /app/properties/{key}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await resource.deleteProperty('feature-flags');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/app/properties/feature-flags`,
      });
    });
  });

  // ── listPropertiesAll ─────────────────────────────────────────────────────

  describe('listPropertiesAll()', () => {
    it('yields items across pages until _links.next is absent', async () => {
      // Arrange — first page has next cursor, second page is the tail
      transport
        .respondWith({
          results: [makeProperty('a', 1), makeProperty('b', 2)],
          _links: { next: '/wiki/api/v2/app/properties?cursor=c2' },
        })
        .respondWith({
          results: [makeProperty('c', 3)],
          _links: {},
        });

      // Act
      const items: { key: string }[] = [];
      for await (const item of resource.listPropertiesAll()) {
        items.push(item);
      }

      // Assert
      expect(items.map((i) => i.key)).toEqual(['a', 'b', 'c']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({});
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'c2' });
    });

    it('passes limit through to the request query', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      const iter = resource.listPropertiesAll({ limit: 25 });
      await iter.next();

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ limit: 25 });
    });

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listPropertiesAll({ limit: 0 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes propertyKey in getProperty()', async () => {
      transport.respondWith(makeProperty('x', null));
      await resource.getProperty('../etc/passwd');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/app/properties/..%2Fetc%2Fpasswd`);
    });

    it('encodes propertyKey in upsertProperty()', async () => {
      transport.respondWith(makeProperty('x', null));
      await resource.upsertProperty('weird/key', { value: 1 });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/app/properties/weird%2Fkey`);
    });

    it('encodes propertyKey in deleteProperty()', async () => {
      transport.respondWith(undefined);
      await resource.deleteProperty('weird/key');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/app/properties/weird%2Fkey`);
    });
  });
});
