import { describe, it, expect, beforeEach } from 'vitest';
import { MyPermissionsResource } from '../../src/jira/resources/mypermissions.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makePermission = (key: string, havePermission = true) => ({
  id: '10',
  key,
  name: key.replace(/_/g, ' '),
  type: 'PROJECT' as const,
  description: `Permission: ${key}`,
  havePermission,
  deprecatedKey: false,
});

const makeMyPermissions = () => ({
  permissions: {
    BROWSE_PROJECTS: makePermission('BROWSE_PROJECTS'),
    CREATE_ISSUES: makePermission('CREATE_ISSUES'),
    EDIT_ISSUES: makePermission('EDIT_ISSUES', false),
  },
});

describe('MyPermissionsResource', () => {
  let transport: MockTransport;
  let myPermissions: MyPermissionsResource;

  beforeEach(() => {
    transport = new MockTransport();
    myPermissions = new MyPermissionsResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /mypermissions with no params and returns permissions', async () => {
      // Arrange
      const perms = makeMyPermissions();
      transport.respondWith(perms);

      // Act
      const result = await myPermissions.get();

      // Assert
      expect(result).toEqual(perms);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/mypermissions`,
      });
    });

    it('sends projectId query param when provided', async () => {
      // Arrange
      transport.respondWith(makeMyPermissions());

      // Act
      await myPermissions.get({ projectId: '10001' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ projectId: '10001' });
    });

    it('sends projectKey query param when provided', async () => {
      // Arrange
      transport.respondWith(makeMyPermissions());

      // Act
      await myPermissions.get({ projectKey: 'PROJ' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ projectKey: 'PROJ' });
    });

    it('sends issueId query param when provided', async () => {
      // Arrange
      transport.respondWith(makeMyPermissions());

      // Act
      await myPermissions.get({ issueId: '10050' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ issueId: '10050' });
    });

    it('sends issueKey query param when provided', async () => {
      // Arrange
      transport.respondWith(makeMyPermissions());

      // Act
      await myPermissions.get({ issueKey: 'PROJ-42' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ issueKey: 'PROJ-42' });
    });

    it('sends permissions query param when provided', async () => {
      // Arrange
      transport.respondWith(makeMyPermissions());

      // Act
      await myPermissions.get({ permissions: 'BROWSE_PROJECTS,CREATE_ISSUES' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        permissions: 'BROWSE_PROJECTS,CREATE_ISSUES',
      });
    });

    it('sends commentId query param when provided', async () => {
      // Arrange
      transport.respondWith(makeMyPermissions());

      // Act
      await myPermissions.get({ commentId: '99' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ commentId: '99' });
    });

    it('sends projectConfigurationUuid query param when provided', async () => {
      // Arrange
      transport.respondWith(makeMyPermissions());

      // Act
      await myPermissions.get({ projectConfigurationUuid: 'uuid-abc-123' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        projectConfigurationUuid: 'uuid-abc-123',
      });
    });

    it('sends projectUuid query param when provided', async () => {
      // Arrange
      transport.respondWith(makeMyPermissions());

      // Act
      await myPermissions.get({ projectUuid: 'uuid-proj-456' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ projectUuid: 'uuid-proj-456' });
    });

    it('does not include undefined params in query', async () => {
      // Arrange
      transport.respondWith(makeMyPermissions());

      // Act
      await myPermissions.get({ projectId: '10001' });

      // Assert
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('projectKey');
      expect(query).not.toHaveProperty('issueId');
      expect(query).not.toHaveProperty('issueKey');
    });

    it('accepts GLOBAL type in permission', async () => {
      // Arrange
      const perms = {
        permissions: {
          ADMINISTER: {
            id: '0',
            key: 'ADMINISTER',
            name: 'Administer Jira',
            type: 'GLOBAL' as const,
            havePermission: true,
          },
        },
      };
      transport.respondWith(perms);

      // Act
      const result = await myPermissions.get();

      // Assert
      expect(result.permissions['ADMINISTER']?.type).toBe('GLOBAL');
    });

    it('handles permissions with deprecatedKey field', async () => {
      // Arrange
      const perms = {
        permissions: {
          OLD_PERM: { key: 'OLD_PERM', deprecatedKey: true, havePermission: false },
        },
      };
      transport.respondWith(perms);

      // Act
      const result = await myPermissions.get();

      // Assert
      expect(result.permissions['OLD_PERM']?.deprecatedKey).toBe(true);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(myPermissions.get()).rejects.toThrow('network error');
    });
  });
});
