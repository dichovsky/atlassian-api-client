import { describe, it, expect, beforeEach } from 'vitest';
import { SpaceRoleModeResource } from '../../src/confluence/resources/space-role-mode.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

describe('SpaceRoleModeResource', () => {
  let transport: MockTransport;
  let spaceRoleMode: SpaceRoleModeResource;

  beforeEach(() => {
    transport = new MockTransport();
    spaceRoleMode = new SpaceRoleModeResource(transport, BASE_URL);
  });

  describe('get()', () => {
    it('issues GET /space-role-mode with no body or query', async () => {
      // Arrange
      const payload = { mode: 'ROLES' as const };
      transport.respondWith(payload);

      // Act
      const result = await spaceRoleMode.get();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/space-role-mode`,
      });
      expect(transport.lastCall?.options.body).toBeUndefined();
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('returns the PRE_ROLES mode verbatim', async () => {
      // Arrange
      transport.respondWith({ mode: 'PRE_ROLES' });

      // Act
      const result = await spaceRoleMode.get();

      // Assert
      expect(result.mode).toBe('PRE_ROLES');
    });

    it('returns the ROLES_TRANSITION mode verbatim', async () => {
      // Arrange
      transport.respondWith({ mode: 'ROLES_TRANSITION' });

      // Act
      const result = await spaceRoleMode.get();

      // Assert
      expect(result.mode).toBe('ROLES_TRANSITION');
    });

    it('handles an empty object response (mode field absent)', async () => {
      // Arrange — the OpenAPI spec marks `mode` as optional.
      transport.respondWith({});

      // Act
      const result = await spaceRoleMode.get();

      // Assert
      expect(result).toEqual({});
      expect(result.mode).toBeUndefined();
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('boom'));

      // Act + Assert
      await expect(spaceRoleMode.get()).rejects.toThrow('boom');
    });
  });
});
