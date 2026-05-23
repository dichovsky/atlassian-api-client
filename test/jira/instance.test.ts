import { describe, it, expect, beforeEach } from 'vitest';
import { InstanceResource } from '../../src/jira/resources/instance.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeLicense = () => ({
  applications: [
    { id: 'jira-software', plan: 'STANDARD' as const },
    { id: 'jira-servicedesk', plan: 'PREMIUM' as const },
  ],
});

describe('InstanceResource', () => {
  let transport: MockTransport;
  let instance: InstanceResource;

  beforeEach(() => {
    transport = new MockTransport();
    instance = new InstanceResource(transport, BASE_URL);
  });

  // ── getLicense ────────────────────────────────────────────────────────────

  describe('getLicense()', () => {
    it('calls GET /instance/license and returns the license info', async () => {
      // Arrange
      const license = makeLicense();
      transport.respondWith(license);

      // Act
      const result = await instance.getLicense();

      // Assert
      expect(result).toEqual(license);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/instance/license`,
      });
    });

    it('returns license with free plan', async () => {
      // Arrange
      const license = { applications: [{ id: 'jira-software', plan: 'FREE' as const }] };
      transport.respondWith(license);

      // Act
      const result = await instance.getLicense();

      // Assert
      expect(result.applications[0]?.plan).toBe('FREE');
    });

    it('returns license with empty applications array', async () => {
      // Arrange
      transport.respondWith({ applications: [] });

      // Act
      const result = await instance.getLicense();

      // Assert
      expect(result.applications).toHaveLength(0);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(instance.getLicense()).rejects.toThrow('network error');
    });
  });
});
