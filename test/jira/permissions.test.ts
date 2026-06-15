import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionsResource } from '../../src/jira/resources/permissions.js';
import type {
  BulkPermissionsRequestBean,
  PermissionsKeysBean,
} from '../../src/jira/resources/permissions.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('PermissionsResource', () => {
  let transport: MockTransport;
  let resource: PermissionsResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new PermissionsResource(transport, BASE_URL);
  });

  // ── getAll (B613) ──────────────────────────────────────────────────────────

  describe('getAll()', () => {
    it('calls GET /permissions and returns the permissions envelope', async () => {
      const responseData = {
        permissions: {
          BULK_CHANGE: {
            id: '10',
            description: 'Ability to modify a collection of issues at once.',
            key: 'BULK_CHANGE',
            name: 'Bulk Change',
            type: 'GLOBAL' as const,
            havePermission: true,
            deprecatedKey: false,
          },
        },
      };
      transport.respondWith(responseData);

      const result = await resource.getAll();

      expect(result).toEqual(responseData);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/permissions`,
      });
    });

    it('returns an empty permissions map when no permissions exist', async () => {
      transport.respondWith({ permissions: {} });

      const result = await resource.getAll();

      expect(result).toEqual({ permissions: {} });
    });

    it('handles PROJECT type permission with havePermission and deprecatedKey fields', async () => {
      const responseData = {
        permissions: {
          EDIT_ISSUES: {
            id: '12',
            key: 'EDIT_ISSUES',
            name: 'Edit Issues',
            type: 'PROJECT' as const,
            havePermission: true,
            deprecatedKey: false,
          },
        },
      };
      transport.respondWith(responseData);

      const result = await resource.getAll();

      expect(result.permissions?.['EDIT_ISSUES']?.type).toBe('PROJECT');
      expect(result.permissions?.['EDIT_ISSUES']?.havePermission).toBe(true);
      expect(result.permissions?.['EDIT_ISSUES']?.id).toBe('12');
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('network error'));

      await expect(resource.getAll()).rejects.toThrow('network error');
    });
  });

  // ── check (B614) ───────────────────────────────────────────────────────────

  describe('check()', () => {
    it('calls POST /permissions/check with full body and returns grants', async () => {
      const body: BulkPermissionsRequestBean = {
        accountId: '5b10a2844c20165700ede21g',
        globalPermissions: ['ADMINISTER'],
        projectPermissions: [
          {
            permissions: ['EDIT_ISSUES'],
            projects: [10001],
            issues: [10010, 10011],
          },
        ],
      };
      const responseData = {
        globalPermissions: ['ADMINISTER'],
        projectPermissions: [
          {
            permission: 'EDIT_ISSUES',
            projects: [10001],
            issues: [10010, 10011],
          },
        ],
      };
      transport.respondWith(responseData);

      const result = await resource.check(body);

      expect(result).toEqual(responseData);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/permissions/check`,
        body: {
          accountId: '5b10a2844c20165700ede21g',
          globalPermissions: ['ADMINISTER'],
          projectPermissions: [
            {
              permissions: ['EDIT_ISSUES'],
              projects: [10001],
              issues: [10010, 10011],
            },
          ],
        },
      });
    });

    it('sends only globalPermissions when accountId is absent', async () => {
      const body: BulkPermissionsRequestBean = {
        globalPermissions: ['ADMINISTER'],
      };
      transport.respondWith({ globalPermissions: ['ADMINISTER'], projectPermissions: [] });

      await resource.check(body);

      const sentBody = transport.lastCall?.options.body as Record<string, unknown>;
      expect(sentBody).not.toHaveProperty('accountId');
      expect(sentBody).toHaveProperty('globalPermissions', ['ADMINISTER']);
      expect(sentBody).not.toHaveProperty('projectPermissions');
    });

    it('sends only accountId when only accountId is provided', async () => {
      const body: BulkPermissionsRequestBean = {
        accountId: 'abc123',
      };
      transport.respondWith({ globalPermissions: [], projectPermissions: [] });

      await resource.check(body);

      const sentBody = transport.lastCall?.options.body as Record<string, unknown>;
      expect(sentBody).toHaveProperty('accountId', 'abc123');
      expect(sentBody).not.toHaveProperty('globalPermissions');
      expect(sentBody).not.toHaveProperty('projectPermissions');
    });

    it('sends only projectPermissions when only projectPermissions is provided', async () => {
      const body: BulkPermissionsRequestBean = {
        projectPermissions: [{ permissions: ['BROWSE'], projects: [10001] }],
      };
      transport.respondWith({ globalPermissions: [], projectPermissions: [] });

      await resource.check(body);

      const sentBody = transport.lastCall?.options.body as Record<string, unknown>;
      expect(sentBody).not.toHaveProperty('accountId');
      expect(sentBody).not.toHaveProperty('globalPermissions');
      expect(sentBody).toHaveProperty('projectPermissions');
    });

    it('sends empty body when no fields are provided', async () => {
      const body: BulkPermissionsRequestBean = {};
      transport.respondWith({ globalPermissions: [], projectPermissions: [] });

      await resource.check(body);

      const sentBody = transport.lastCall?.options.body as Record<string, unknown>;
      expect(sentBody).not.toHaveProperty('accountId');
      expect(sentBody).not.toHaveProperty('globalPermissions');
      expect(sentBody).not.toHaveProperty('projectPermissions');
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('403 Forbidden'));

      await expect(resource.check({})).rejects.toThrow('403 Forbidden');
    });
  });

  // ── getPermittedProjects (B615) ────────────────────────────────────────────

  describe('getPermittedProjects()', () => {
    it('calls POST /permissions/project with permissions array and returns permitted projects', async () => {
      const body: PermissionsKeysBean = {
        permissions: ['BROWSE_PROJECTS', 'EDIT_ISSUES'],
      };
      const responseData = {
        projects: [
          { id: 10001, key: 'PROJ' },
          { id: 10002, key: 'TEST' },
        ],
      };
      transport.respondWith(responseData);

      const result = await resource.getPermittedProjects(body);

      expect(result).toEqual(responseData);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/permissions/project`,
        body: {
          permissions: ['BROWSE_PROJECTS', 'EDIT_ISSUES'],
        },
      });
    });

    it('sends a single permission correctly', async () => {
      const body: PermissionsKeysBean = { permissions: ['BROWSE_PROJECTS'] };
      transport.respondWith({ projects: [{ id: 10001, key: 'PROJ' }] });

      await resource.getPermittedProjects(body);

      expect(transport.lastCall?.options.body).toEqual({
        permissions: ['BROWSE_PROJECTS'],
      });
    });

    it('returns empty projects array when no projects match', async () => {
      transport.respondWith({ projects: [] });

      const result = await resource.getPermittedProjects({ permissions: ['ADMINISTER'] });

      expect(result).toEqual({ projects: [] });
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('400 Bad Request'));

      await expect(
        resource.getPermittedProjects({ permissions: ['UNKNOWN_PERMISSION'] }),
      ).rejects.toThrow('400 Bad Request');
    });
  });
});
