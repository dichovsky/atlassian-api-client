import { describe, it, expect, beforeEach } from 'vitest';
import { ServerInfoResource } from '../../src/jira/resources/serverinfo.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeServerInfo = () => ({
  baseUrl: 'https://test.atlassian.net',
  version: '9.0.0',
  versionNumbers: [9, 0, 0],
  deploymentType: 'Cloud',
  buildNumber: 90000,
  buildDate: '2024-01-15T00:00:00.000+0000',
  serverTime: '2024-06-01T12:00:00.000+0000',
  scmInfo: 'abc1234',
  serverTitle: 'Test Jira',
});

describe('ServerInfoResource', () => {
  let transport: MockTransport;
  let serverInfo: ServerInfoResource;

  beforeEach(() => {
    transport = new MockTransport();
    serverInfo = new ServerInfoResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /serverInfo and returns server info', async () => {
      // Arrange
      const info = makeServerInfo();
      transport.respondWith(info);

      // Act
      const result = await serverInfo.get();

      // Assert
      expect(result).toEqual(info);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/serverInfo`,
      });
    });

    it('returns server info with health checks', async () => {
      // Arrange
      const info = {
        ...makeServerInfo(),
        healthChecks: [{ name: 'DB', description: 'Database connectivity', passed: true }],
      };
      transport.respondWith(info);

      // Act
      const result = await serverInfo.get();

      // Assert
      expect(result.healthChecks).toHaveLength(1);
      expect(result.healthChecks?.[0]?.passed).toBe(true);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(serverInfo.get()).rejects.toThrow('network error');
    });
  });
});
