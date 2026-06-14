import { describe, it, expect, beforeEach } from 'vitest';
import { FlagResource } from '../../src/jira/resources/flag.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/featureflags/0.1';

const makeFlag = () => ({
  id: 'flag-xyz',
  key: 'my-awesome-feature',
  updateSequenceId: 1523494301448,
  displayName: 'My Feature Flag',
  schemaVersion: '1.0' as const,
  summary: {
    url: 'https://example.com/project/feature-123/summary',
    status: {
      enabled: true,
      rollout: { percentage: 80 },
    },
    lastUpdated: '2018-01-20T23:27:25.000Z',
  },
  details: [
    {
      url: 'https://example.com/project/feature-123/production',
      lastUpdated: '2018-01-20T23:27:25.000Z',
      environment: { name: 'prod-us-west', type: 'production' as const },
      status: { enabled: true },
    },
  ],
});

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
      // Arrange — full spec-conformant FeatureFlagData shape.
      const payload = makeFlag();
      transport.respondWith(payload);

      // Act
      const result = await flag.get('flag-xyz');

      // Assert — required fields from spec are present.
      expect(result.id).toBe('flag-xyz');
      expect(result.key).toBe('my-awesome-feature');
      expect(result.updateSequenceId).toBe(1523494301448);
      // summary is an object (FeatureFlagSummary), not a string.
      expect(typeof result.summary).toBe('object');
      expect(result.summary.status.enabled).toBe(true);
      // details is an array of FeatureFlagDetails.
      expect(Array.isArray(result.details)).toBe(true);
      expect(result.details[0]?.environment.name).toBe('prod-us-west');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/flag/flag-xyz`,
      });
    });

    it('URL-encodes special characters in featureFlagId', async () => {
      // Arrange
      transport.respondWith(makeFlag());

      // Act
      await flag.get('flag/1');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/flag/flag%2F1`);
    });

    it('exposes schemaVersion when present', async () => {
      const payload = { ...makeFlag(), schemaVersion: '1.0' as const };
      transport.respondWith(payload);

      const result = await flag.get('flag-xyz');

      expect(result.schemaVersion).toBe('1.0');
    });

    it('exposes issueKeys (deprecated) when present', async () => {
      const payload = { ...makeFlag(), issueKeys: ['PROJ-1', 'PROJ-2'] };
      transport.respondWith(payload);

      const result = await flag.get('flag-xyz');

      expect(result.issueKeys).toEqual(['PROJ-1', 'PROJ-2']);
    });

    it('exposes associations when present', async () => {
      const payload = {
        ...makeFlag(),
        associations: [{ issueIdOrKeys: ['PROJ-1'] }],
      };
      transport.respondWith(payload);

      const result = await flag.get('flag-xyz');

      expect(result.associations).toEqual([{ issueIdOrKeys: ['PROJ-1'] }]);
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
