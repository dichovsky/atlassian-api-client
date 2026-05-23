import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityLevelResource } from '../../src/jira/resources/security-level.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeSecurityLevel = (overrides?: Partial<{ id: string; name: string }>) => ({
  id: overrides?.id ?? '10001',
  name: overrides?.name ?? 'Confidential',
  description: 'Visible to reporters and above',
  issueSecuritySchemeId: '10000',
  self: `${BASE_URL}/securitylevel/${overrides?.id ?? '10001'}`,
});

describe('SecurityLevelResource', () => {
  let transport: MockTransport;
  let securityLevel: SecurityLevelResource;

  beforeEach(() => {
    transport = new MockTransport();
    securityLevel = new SecurityLevelResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /securitylevel/{id} and returns the security level', async () => {
      // Arrange
      const level = makeSecurityLevel();
      transport.respondWith(level);

      // Act
      const result = await securityLevel.get('10001');

      // Assert
      expect(result).toEqual(level);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/securitylevel/10001`,
      });
    });

    it('URL-encodes the id', async () => {
      // Arrange
      transport.respondWith(makeSecurityLevel({ id: 'level/special' }));

      // Act
      await securityLevel.get('level/special');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/securitylevel/level%2Fspecial`);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(securityLevel.get('10001')).rejects.toThrow('not found');
    });
  });
});
