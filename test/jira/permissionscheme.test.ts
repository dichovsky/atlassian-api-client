import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionSchemeResource } from '../../src/jira/resources/permissionscheme.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeScheme = (id: number, name: string) => ({
  id,
  self: `${BASE_URL}/permissionscheme/${id}`,
  name,
});

const makeGrant = (id: number, permission: string) => ({
  id,
  self: `${BASE_URL}/permissionscheme/100/permission/${id}`,
  holder: { type: 'anyone', expand: 'field' },
  permission,
});

describe('PermissionSchemeResource', () => {
  let transport: MockTransport;
  let resource: PermissionSchemeResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new PermissionSchemeResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /permissionscheme with no params', async () => {
      transport.respondWith({ permissionSchemes: [makeScheme(1, 'Default')] });
      const result = await resource.list();
      expect(result.permissionSchemes).toHaveLength(1);
      expect(result.permissionSchemes[0]?.name).toBe('Default');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/permissionscheme`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards expand query param', async () => {
      transport.respondWith({ permissionSchemes: [] });
      await resource.list({ expand: 'permissions' });
      expect(transport.lastCall?.options.query).toEqual({ expand: 'permissions' });
    });

    it('omits query when no params', async () => {
      transport.respondWith({ permissionSchemes: [] });
      await resource.list();
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('POSTs minimal body with required name', async () => {
      const scheme = makeScheme(10, 'New Scheme');
      transport.respondWith(scheme);
      const result = await resource.create({ name: 'New Scheme' });
      expect(result).toEqual(scheme);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/permissionscheme`,
        body: { name: 'New Scheme' },
      });
    });

    it('forwards description and permissions in body', async () => {
      transport.respondWith(makeScheme(10, 'Full'));
      await resource.create({
        name: 'Full',
        description: 'A full scheme',
        permissions: [{ holder: { type: 'anyone' }, permission: 'BROWSE_PROJECTS' }],
      });
      expect(transport.lastCall?.options.body).toEqual({
        name: 'Full',
        description: 'A full scheme',
        permissions: [{ holder: { type: 'anyone' }, permission: 'BROWSE_PROJECTS' }],
      });
    });

    it('forwards expand query param', async () => {
      transport.respondWith(makeScheme(10, 'X'));
      await resource.create({ name: 'X' }, { expand: 'permissions' });
      expect(transport.lastCall?.options.query).toEqual({ expand: 'permissions' });
    });

    it('omits optional fields from body when not provided', async () => {
      transport.respondWith(makeScheme(10, 'Minimal'));
      await resource.create({ name: 'Minimal' });
      expect(transport.lastCall?.options.body).toEqual({ name: 'Minimal' });
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('GETs /permissionscheme/{schemeId}', async () => {
      const scheme = makeScheme(10000, 'Default');
      transport.respondWith(scheme);
      const result = await resource.get(10000);
      expect(result).toEqual(scheme);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/permissionscheme/10000`,
      });
    });

    it('forwards expand query param', async () => {
      transport.respondWith(makeScheme(1, 'S'));
      await resource.get(1, { expand: 'permissions' });
      expect(transport.lastCall?.options.query).toEqual({ expand: 'permissions' });
    });

    it('omits query when no params', async () => {
      transport.respondWith(makeScheme(1, 'S'));
      await resource.get(1);
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('PUTs /permissionscheme/{schemeId} with name', async () => {
      const scheme = makeScheme(10000, 'Updated');
      transport.respondWith(scheme);
      const result = await resource.update(10000, { name: 'Updated' });
      expect(result).toEqual(scheme);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/permissionscheme/10000`,
        body: { name: 'Updated' },
      });
    });

    it('forwards all body fields', async () => {
      transport.respondWith(makeScheme(1, 'X'));
      await resource.update(1, {
        name: 'X',
        description: 'd',
        permissions: [{ holder: { type: 'anyone' }, permission: 'BROWSE_PROJECTS' }],
      });
      expect(transport.lastCall?.options.body).toEqual({
        name: 'X',
        description: 'd',
        permissions: [{ holder: { type: 'anyone' }, permission: 'BROWSE_PROJECTS' }],
      });
    });

    it('forwards expand query param', async () => {
      transport.respondWith(makeScheme(1, 'X'));
      await resource.update(1, { name: 'X' }, { expand: 'permissions' });
      expect(transport.lastCall?.options.query).toEqual({ expand: 'permissions' });
    });

    it('always sends name in body (spec requires it) and includes optional fields', async () => {
      // Regression: UpdatePermissionSchemeData.name is now required per spec.
      transport.respondWith(makeScheme(1, 'X'));
      await resource.update(1, { name: 'X', description: 'd' });
      expect(transport.lastCall?.options.body).toEqual({ name: 'X', description: 'd' });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('DELETEs /permissionscheme/{schemeId}', async () => {
      transport.respondWith(undefined);
      await resource.delete(10000);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/permissionscheme/10000`,
      });
    });
  });

  // ── listPermissions ───────────────────────────────────────────────────────

  describe('listPermissions()', () => {
    it('GETs /permissionscheme/{schemeId}/permission', async () => {
      transport.respondWith({ permissions: [makeGrant(1, 'BROWSE_PROJECTS')] });
      const result = await resource.listPermissions(100);
      expect(result.permissions).toHaveLength(1);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/permissionscheme/100/permission`,
      });
    });

    it('forwards expand query param', async () => {
      transport.respondWith({ permissions: [] });
      await resource.listPermissions(100, { expand: 'all' });
      expect(transport.lastCall?.options.query).toEqual({ expand: 'all' });
    });

    it('omits query when no params', async () => {
      transport.respondWith({ permissions: [] });
      await resource.listPermissions(100);
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── createPermission ──────────────────────────────────────────────────────

  describe('createPermission()', () => {
    it('POSTs /permissionscheme/{schemeId}/permission with body', async () => {
      const grant = makeGrant(10, 'BROWSE_PROJECTS');
      transport.respondWith(grant);
      const result = await resource.createPermission(100, {
        holder: { type: 'anyone' },
        permission: 'BROWSE_PROJECTS',
      });
      expect(result).toEqual(grant);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/permissionscheme/100/permission`,
        body: {
          holder: { type: 'anyone' },
          permission: 'BROWSE_PROJECTS',
        },
      });
    });

    it('sends empty body when no data provided', async () => {
      transport.respondWith(makeGrant(10, 'BROWSE_PROJECTS'));
      await resource.createPermission(100, {});
      expect(transport.lastCall?.options.body).toEqual({});
    });

    it('forwards expand query param', async () => {
      transport.respondWith(makeGrant(10, 'BROWSE_PROJECTS'));
      await resource.createPermission(100, { holder: { type: 'anyone' } }, { expand: 'all' });
      expect(transport.lastCall?.options.query).toEqual({ expand: 'all' });
    });
  });

  // ── getPermission ─────────────────────────────────────────────────────────

  describe('getPermission()', () => {
    it('GETs /permissionscheme/{schemeId}/permission/{permissionId}', async () => {
      const grant = makeGrant(10, 'BROWSE_PROJECTS');
      transport.respondWith(grant);
      const result = await resource.getPermission(100, 10);
      expect(result).toEqual(grant);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/permissionscheme/100/permission/10`,
      });
    });

    it('forwards expand query param', async () => {
      transport.respondWith(makeGrant(10, 'X'));
      await resource.getPermission(100, 10, { expand: 'field' });
      expect(transport.lastCall?.options.query).toEqual({ expand: 'field' });
    });

    it('omits query when no params', async () => {
      transport.respondWith(makeGrant(10, 'X'));
      await resource.getPermission(100, 10);
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── deletePermission ──────────────────────────────────────────────────────

  describe('deletePermission()', () => {
    it('DELETEs /permissionscheme/{schemeId}/permission/{permissionId}', async () => {
      transport.respondWith(undefined);
      await resource.deletePermission(100, 10);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/permissionscheme/100/permission/10`,
      });
    });
  });

  // ── spec alignment regressions ────────────────────────────────────────────

  describe('spec alignment', () => {
    it('PermissionHolder includes expand field from spec', async () => {
      // Regression: PermissionHolder was missing the `expand` field.
      const grant = {
        id: 1,
        holder: { type: 'anyone', expand: 'field', parameter: 'param', value: 'val' },
        permission: 'BROWSE_PROJECTS',
      };
      transport.respondWith(grant);
      const result = await resource.getPermission(100, 1);
      expect(result.holder?.expand).toBe('field');
    });

    it('update() always sends name in body — spec requires it', async () => {
      // Regression: UpdatePermissionSchemeData.name was optional but spec requires it.
      transport.respondWith(makeScheme(1, 'Required'));
      await resource.update(1, { name: 'Required' });
      expect(transport.lastCall?.options.body).toMatchObject({ name: 'Required' });
    });

    it('PermissionScheme.scope.type accepts spec enum values', async () => {
      // Regression: scope.type was typed as `string` instead of the enum.
      const schemeWithScope = {
        ...makeScheme(1, 'Scoped'),
        scope: { type: 'PROJECT' as const, project: { id: '10000', key: 'PROJ', name: 'Project' } },
      };
      transport.respondWith(schemeWithScope);
      const result = await resource.get(1);
      expect(result.scope?.type).toBe('PROJECT');
    });

    it('PermissionScheme.scope.project includes full ProjectDetails fields', async () => {
      // Regression: scope.project was missing self, simplified, projectTypeKey fields.
      const schemeWithFullProject = {
        ...makeScheme(1, 'Scoped'),
        scope: {
          type: 'PROJECT' as const,
          project: {
            id: '10000',
            key: 'PROJ',
            name: 'Project',
            self: `${BASE_URL}/project/PROJ`,
            simplified: false,
            projectTypeKey: 'software' as const,
          },
        },
      };
      transport.respondWith(schemeWithFullProject);
      const result = await resource.get(1);
      expect(result.scope?.project?.self).toBe(`${BASE_URL}/project/PROJ`);
      expect(result.scope?.project?.projectTypeKey).toBe('software');
      expect(result.scope?.project?.simplified).toBe(false);
    });
  });
});
