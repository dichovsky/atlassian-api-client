import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceRegistryResource } from '../../src/jira/resources/service-registry.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/atlassian-connect/1';

const makeEntries = () => [
  {
    key: 'com.example.my-app',
    name: 'My App',
    description: 'An example Connect app',
    baseUrl: 'https://app.example.com',
    vendor: { name: 'Example Corp', url: 'https://example.com' },
  },
];

describe('ServiceRegistryResource', () => {
  let transport: MockTransport;
  let serviceRegistry: ServiceRegistryResource;

  beforeEach(() => {
    transport = new MockTransport();
    serviceRegistry = new ServiceRegistryResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /service-registry and returns the entries', async () => {
      // Arrange
      const entries = makeEntries();
      transport.respondWith(entries);

      // Act
      const result = await serviceRegistry.get();

      // Assert
      expect(result).toEqual(entries);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/service-registry`,
      });
    });

    it('returns an empty array when no services are registered', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await serviceRegistry.get();

      // Assert
      expect(result).toEqual([]);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('unauthorized'));

      // Act / Assert
      await expect(serviceRegistry.get()).rejects.toThrow('unauthorized');
    });
  });
});
