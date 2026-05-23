import { describe, it, expect, beforeEach } from 'vitest';
import { ApplicationRoleResource } from '../../src/jira/resources/application-role.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeRole = (
  overrides?: Partial<{ key: string; name: string }>,
): {
  key: string;
  groups: string[];
  name: string;
  defaultGroups: string[];
  selectedByDefault: boolean;
  defined: boolean;
  numberOfSeats: number;
  remainingSeats: number;
  userCount: number;
  userCountDescription: string;
  hasUnlimitedSeats: boolean;
  platform: boolean;
} => ({
  key: overrides?.key ?? 'jira-software',
  groups: ['jira-software-users'],
  name: overrides?.name ?? 'Jira Software',
  defaultGroups: ['jira-software-users'],
  selectedByDefault: false,
  defined: false,
  numberOfSeats: 10,
  remainingSeats: 5,
  userCount: 5,
  userCountDescription: '5 developers',
  hasUnlimitedSeats: false,
  platform: false,
});

describe('ApplicationRoleResource', () => {
  let transport: MockTransport;
  let applicationRole: ApplicationRoleResource;

  beforeEach(() => {
    transport = new MockTransport();
    applicationRole = new ApplicationRoleResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /applicationrole and returns the roles array', async () => {
      // Arrange
      const roles = [
        makeRole(),
        makeRole({ key: 'jira-servicedesk', name: 'Jira Service Management' }),
      ];
      transport.respondWith(roles);

      // Act
      const result = await applicationRole.list();

      // Assert
      expect(result).toEqual(roles);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/applicationrole`,
      });
    });

    it('returns an empty array when no roles are defined', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await applicationRole.list();

      // Assert
      expect(result).toEqual([]);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(applicationRole.list()).rejects.toThrow('network error');
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /applicationrole/{key} and returns the role', async () => {
      // Arrange
      const role = makeRole();
      transport.respondWith(role);

      // Act
      const result = await applicationRole.get('jira-software');

      // Assert
      expect(result).toEqual(role);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/applicationrole/jira-software`,
      });
    });

    it('URL-encodes the key', async () => {
      // Arrange
      const role = makeRole({ key: 'jira/special' });
      transport.respondWith(role);

      // Act
      await applicationRole.get('jira/special');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/applicationrole/jira%2Fspecial`);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(applicationRole.get('unknown-key')).rejects.toThrow('not found');
    });
  });
});
