import { describe, it, expect, beforeEach } from 'vitest';
import { AdminKeyResource } from '../../src/confluence/resources/admin-key.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const sampleKey = {
  createdAt: '2026-05-20T12:00:00.000Z',
  expireAt: '2026-05-20T13:00:00.000Z',
  durationInHours: 1,
};

describe('AdminKeyResource', () => {
  let transport: MockTransport;
  let adminKey: AdminKeyResource;

  beforeEach(() => {
    transport = new MockTransport();
    adminKey = new AdminKeyResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('issues GET /admin-key with no body or query', async () => {
      // Arrange
      transport.respondWith(sampleKey);

      // Act
      const result = await adminKey.get();

      // Assert
      expect(result).toEqual(sampleKey);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/admin-key`,
      });
      expect(transport.lastCall?.options.body).toBeUndefined();
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('issues POST /admin-key with no body when no data is supplied', async () => {
      // Arrange
      transport.respondWith(sampleKey);

      // Act
      const result = await adminKey.create();

      // Assert
      expect(result).toEqual(sampleKey);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/admin-key`,
      });
      expect(transport.lastCall?.options.body).toBeUndefined();
    });

    it('forwards durationInHours when provided', async () => {
      // Arrange
      transport.respondWith({ ...sampleKey, durationInHours: 8 });
      const data = { durationInHours: 8 };

      // Act
      const result = await adminKey.create(data);

      // Assert
      expect(result.durationInHours).toBe(8);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/admin-key`,
        body: data,
      });
    });

    it('passes an empty object body through verbatim (does not coerce to undefined)', async () => {
      // Arrange
      transport.respondWith(sampleKey);

      // Act
      await adminKey.create({});

      // Assert
      expect(transport.lastCall?.options.body).toEqual({});
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('issues DELETE /admin-key with no body or query', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await adminKey.delete();

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/admin-key`,
      });
      expect(transport.lastCall?.options.body).toBeUndefined();
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('returns void (the resource discards the response data)', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await adminKey.delete();

      // Assert
      expect(result).toBeUndefined();
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('boom'));

      // Act + Assert
      await expect(adminKey.delete()).rejects.toThrow('boom');
    });
  });
});
