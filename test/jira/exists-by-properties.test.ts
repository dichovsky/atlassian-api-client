import { describe, it, expect, beforeEach } from 'vitest';
import { ExistsByPropertiesResource } from '../../src/jira/resources/exists-by-properties.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/devinfo/0.10';

describe('ExistsByPropertiesResource', () => {
  let transport: MockTransport;
  let existsByProperties: ExistsByPropertiesResource;

  beforeEach(() => {
    transport = new MockTransport();
    existsByProperties = new ExistsByPropertiesResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /existsByProperties with no params and returns the response', async () => {
      // Arrange
      transport.respondWith({ exists: true });

      // Act
      const result = await existsByProperties.get();

      // Assert
      expect(result).toEqual({ exists: true });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/existsByProperties`,
      });
    });

    it('passes entityType query param when provided', async () => {
      // Arrange
      transport.respondWith({ exists: false });

      // Act
      await existsByProperties.get({ entityType: 'repository' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ entityType: 'repository' });
    });

    it('passes entityId query param when provided', async () => {
      // Arrange
      transport.respondWith({ exists: true });

      // Act
      await existsByProperties.get({ entityId: 'repo-1' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ entityId: 'repo-1' });
    });

    it('passes both entityType and entityId when both are provided', async () => {
      // Arrange
      transport.respondWith({ exists: true });

      // Act
      await existsByProperties.get({ entityType: 'pullRequest', entityId: 'pr-42' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        entityType: 'pullRequest',
        entityId: 'pr-42',
      });
    });

    it('returns exists: false when nothing is found', async () => {
      // Arrange
      transport.respondWith({ exists: false });

      // Act
      const result = await existsByProperties.get({ entityType: 'commit' });

      // Assert
      expect(result.exists).toBe(false);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(existsByProperties.get()).rejects.toThrow('forbidden');
    });
  });
});
