import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceRegistryResource } from '../../src/jira/resources/service-registry.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/atlassian-connect/1';

const makeEntries = () => [
  {
    id: 'ca075ed7-6ea7-4563-acb3-000000000000',
    name: 'My App',
    description: 'An example Connect app',
    organizationId: 'org-123',
    revision: 'rev-1',
    serviceTier: {
      id: 'tier-uuid-1',
      level: 1,
      name: 'Gold',
      nameKey: 'service-registry.tier1.name',
      description: null,
    },
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
    it('sends repeated serviceIds params and returns entries', async () => {
      // Arrange
      const entries = makeEntries();
      transport.respondWith(entries);

      // Act
      const result = await serviceRegistry.get(['id-a', 'id-b']);

      // Assert
      expect(result).toEqual(entries);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/service-registry?serviceIds=id-a&serviceIds=id-b`,
      });
    });

    it('sends a single serviceId as a repeated param', async () => {
      transport.respondWith(makeEntries());

      await serviceRegistry.get(['only-one']);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/service-registry?serviceIds=only-one`,
      });
    });

    it('returns an empty array when no services are registered', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await serviceRegistry.get(['some-id']);

      // Assert
      expect(result).toEqual([]);
    });

    it('throws ValidationError when serviceIds array is empty', async () => {
      await expect(serviceRegistry.get([])).rejects.toThrow(ValidationError);
      await expect(serviceRegistry.get([])).rejects.toThrow('at least one serviceId');
    });

    it('throws ValidationError when a serviceId is blank', async () => {
      await expect(serviceRegistry.get(['valid', ''])).rejects.toThrow(ValidationError);
      await expect(serviceRegistry.get(['valid', ''])).rejects.toThrow('non-empty serviceIds');
    });

    it('URL-encodes serviceIds that contain special characters', async () => {
      transport.respondWith([]);

      await serviceRegistry.get(['ari:cloud:graph::service/abc/def']);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/service-registry?serviceIds=ari%3Acloud%3Agraph%3A%3Aservice%2Fabc%2Fdef`,
      });
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('unauthorized'));

      // Act / Assert
      await expect(serviceRegistry.get(['some-id'])).rejects.toThrow('unauthorized');
    });
  });
});
