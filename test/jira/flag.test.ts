import { describe, it, expect, beforeEach } from 'vitest';
import { FlagResource } from '../../src/jira/resources/flag.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/featureflags/0.1';

describe('FlagResource', () => {
  let transport: MockTransport;
  let flag: FlagResource;

  beforeEach(() => {
    transport = new MockTransport();
    flag = new FlagResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /flag/{featureFlagId} and returns the flag entity', async () => {
      // Arrange
      const payload = { id: 'flag-xyz', displayName: 'My Feature Flag' };
      transport.respondWith(payload);

      // Act
      const result = await flag.get('flag-xyz');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/flag/flag-xyz`,
      });
    });

    it('URL-encodes special characters in featureFlagId', async () => {
      // Arrange
      transport.respondWith({ id: 'flag/1', displayName: 'Slash Flag' });

      // Act
      await flag.get('flag/1');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/flag/flag%2F1`);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(flag.get('missing')).rejects.toThrow('not found');
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /flag/{featureFlagId} and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await flag.delete('flag-xyz');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/flag/flag-xyz`,
      });
    });

    it('URL-encodes special characters in featureFlagId', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await flag.delete('flag/1');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/flag/flag%2F1`);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(flag.delete('flag-xyz')).rejects.toThrow('server error');
    });
  });
});
