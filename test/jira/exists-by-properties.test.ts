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
      // Arrange — spec field name is hasDataMatchingProperties
      transport.respondWith({ hasDataMatchingProperties: true });

      // Act
      const result = await existsByProperties.get();

      // Assert
      expect(result).toEqual({ hasDataMatchingProperties: true });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/existsByProperties`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('passes _updateSequenceId query param when provided', async () => {
      // Arrange
      transport.respondWith({ hasDataMatchingProperties: false });

      // Act
      await existsByProperties.get({ _updateSequenceId: 42 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ _updateSequenceId: 42 });
    });

    it('passes arbitrary property key=value pairs as query params', async () => {
      // Arrange — the spec allows arbitrary properties (e.g. accountId=123&projectId=ABC)
      transport.respondWith({ hasDataMatchingProperties: true });

      // Act
      await existsByProperties.get({ accountId: '123', projectId: 'ABC' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        accountId: '123',
        projectId: 'ABC',
      });
    });

    it('omits undefined values from query', async () => {
      // Arrange
      transport.respondWith({ hasDataMatchingProperties: false });

      // Act
      await existsByProperties.get({ _updateSequenceId: undefined });

      // Assert
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('returns hasDataMatchingProperties: false when nothing is found', async () => {
      // Arrange
      transport.respondWith({ hasDataMatchingProperties: false });

      // Act
      const result = await existsByProperties.get({ repoId: 'commit-42' });

      // Assert
      expect(result.hasDataMatchingProperties).toBe(false);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(existsByProperties.get()).rejects.toThrow('forbidden');
    });
  });
});
