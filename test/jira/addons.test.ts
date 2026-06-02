import { describe, it, expect, beforeEach } from 'vitest';
import { AddonsResource } from '../../src/jira/resources/addons.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/atlassian-connect/1';

const makePropertyKeys = () => ({
  keys: [
    {
      key: 'my-setting',
      self: `${BASE_URL}/addons/my-app/properties/my-setting`,
    },
    {
      key: 'config',
      self: `${BASE_URL}/addons/my-app/properties/config`,
    },
  ],
});

const makeProperty = () => ({
  key: 'my-setting',
  value: { enabled: true },
});

const makeOperationMessage = (statusCode: number, message: string) => ({
  message,
  statusCode,
});

describe('AddonsResource', () => {
  let transport: MockTransport;
  let addons: AddonsResource;

  beforeEach(() => {
    transport = new MockTransport();
    addons = new AddonsResource(transport, BASE_URL);
  });

  // ── listProperties ────────────────────────────────────────────────────────

  describe('listProperties()', () => {
    it('calls GET /addons/{addonKey}/properties and returns property keys', async () => {
      // Arrange
      const propertyKeys = makePropertyKeys();
      transport.respondWith(propertyKeys);

      // Act
      const result = await addons.listProperties('my-app');

      // Assert
      expect(result).toEqual(propertyKeys);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/addons/my-app/properties`,
      });
    });

    it('URL-encodes the addonKey in the path', async () => {
      // Arrange
      transport.respondWith({ keys: [] });

      // Act
      await addons.listProperties('my app/key');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/addons/my%20app%2Fkey/properties`);
    });

    it('returns empty keys array when no properties exist', async () => {
      // Arrange
      transport.respondWith({ keys: [] });

      // Act
      const result = await addons.listProperties('my-app');

      // Assert
      expect(result).toEqual({ keys: [] });
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('unauthorized'));

      // Act / Assert
      await expect(addons.listProperties('my-app')).rejects.toThrow('unauthorized');
    });
  });

  // ── getProperty ───────────────────────────────────────────────────────────

  describe('getProperty()', () => {
    it('calls GET /addons/{addonKey}/properties/{propertyKey} and returns property', async () => {
      // Arrange
      const property = makeProperty();
      transport.respondWith(property);

      // Act
      const result = await addons.getProperty('my-app', 'my-setting');

      // Assert
      expect(result).toEqual(property);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/addons/my-app/properties/my-setting`,
      });
    });

    it('URL-encodes both addonKey and propertyKey', async () => {
      // Arrange
      transport.respondWith({ key: 'a b', value: null });

      // Act
      await addons.getProperty('my app', 'key/name');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/addons/my%20app/properties/key%2Fname`,
      );
    });

    it('returns property with arbitrary JSON value', async () => {
      // Arrange
      const property = { key: 'cfg', value: [1, 2, 3] };
      transport.respondWith(property);

      // Act
      const result = await addons.getProperty('my-app', 'cfg');

      // Assert
      expect(result.value).toEqual([1, 2, 3]);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(addons.getProperty('my-app', 'missing')).rejects.toThrow('not found');
    });
  });

  // ── setProperty ───────────────────────────────────────────────────────────

  describe('setProperty()', () => {
    it('calls PUT /addons/{addonKey}/properties/{propertyKey} with raw value as body', async () => {
      // Arrange
      const opMsg = makeOperationMessage(200, 'Property updated.');
      transport.respondWith(opMsg);
      const value = { enabled: true };

      // Act
      const result = await addons.setProperty('my-app', 'my-setting', value);

      // Assert
      expect(result).toEqual(opMsg);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/addons/my-app/properties/my-setting`,
        body: value,
      });
    });

    it('returns 201 OperationMessage when property is created', async () => {
      // Arrange
      const opMsg = makeOperationMessage(201, 'Property created.');
      transport.respondWith(opMsg);

      // Act
      const result = await addons.setProperty('my-app', 'new-prop', 'hello');

      // Assert
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Property created.');
    });

    it('sends primitive JSON values as the raw body', async () => {
      // Arrange
      transport.respondWith(makeOperationMessage(200, 'Property updated.'));

      // Act
      await addons.setProperty('my-app', 'flag', true);

      // Assert
      expect(transport.lastCall?.options.body).toBe(true);
    });

    it('sends array values as the raw body', async () => {
      // Arrange
      transport.respondWith(makeOperationMessage(201, 'Property created.'));

      // Act
      await addons.setProperty('my-app', 'list', [1, 2, 3]);

      // Assert
      expect(transport.lastCall?.options.body).toEqual([1, 2, 3]);
    });

    it('URL-encodes both addonKey and propertyKey', async () => {
      // Arrange
      transport.respondWith(makeOperationMessage(200, 'Property updated.'));

      // Act
      await addons.setProperty('my app', 'key/name', { x: 1 });

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/addons/my%20app/properties/key%2Fname`,
      );
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(addons.setProperty('my-app', 'reserved', {})).rejects.toThrow('forbidden');
    });
  });

  // ── deleteProperty ────────────────────────────────────────────────────────

  describe('deleteProperty()', () => {
    it('calls DELETE /addons/{addonKey}/properties/{propertyKey} and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await addons.deleteProperty('my-app', 'my-setting');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/addons/my-app/properties/my-setting`,
      });
    });

    it('URL-encodes both addonKey and propertyKey', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await addons.deleteProperty('my app', 'key/name');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/addons/my%20app/properties/key%2Fname`,
      );
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(addons.deleteProperty('my-app', 'missing')).rejects.toThrow('not found');
    });
  });
});
