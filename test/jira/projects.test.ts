import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectsResource } from '../../src/jira/resources/projects.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeProject = (id: string, key: string) => ({
  id,
  key,
  name: `Project ${key}`,
  self: `${BASE_URL}/project/${key}`,
  projectTypeKey: 'software',
});

const makeListResponse = (projects: ReturnType<typeof makeProject>[]) => ({
  values: projects,
  startAt: 0,
  maxResults: 50,
  total: projects.length,
});

describe('ProjectsResource', () => {
  let transport: MockTransport;
  let projects: ProjectsResource;

  beforeEach(() => {
    transport = new MockTransport();
    projects = new ProjectsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /project/search with no params', async () => {
      // Arrange
      const payload = makeListResponse([makeProject('10001', 'PROJ')]);
      transport.respondWith(payload);

      // Act
      const result = await projects.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/search`,
      });
    });

    it('converts expand array to comma-joined string', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await projects.list({ expand: ['description', 'lead'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        expand: 'description,lead',
      });
    });

    it('serializes status array as repeated params, not CSV (B1049)', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await projects.list({ status: ['live', 'archived'] });

      // Assert — `status` is `type: array` on /project/search: repeated params,
      // never `status=live%2Carchived`.
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/project/search?status=live&status=archived`,
      );
      expect(transport.lastCall?.options.path).not.toContain('status=live%2Carchived');
      expect(transport.lastCall?.options.query).not.toHaveProperty('status');
    });

    it('passes all supported params correctly', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await projects.list({
        startAt: 10,
        maxResults: 25,
        orderBy: 'name',
        expand: ['description'],
        status: ['live'],
        typeKey: 'software',
      });

      // Assert — `expand`/`typeKey` are `type: string` (stay comma-joined in the
      // query bag); `status` is `type: array` (repeated param in the path).
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 10,
        maxResults: 25,
        orderBy: 'name',
        expand: 'description',
        typeKey: 'software',
      });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/project/search?status=live`);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /project/{key} without expand', async () => {
      // Arrange
      const project = makeProject('10001', 'PROJ');
      transport.respondWith(project);

      // Act
      const result = await projects.get('PROJ');

      // Assert
      expect(result).toEqual(project);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ`,
      });
    });

    it('joins expand array when provided', async () => {
      // Arrange
      transport.respondWith(makeProject('10001', 'PROJ'));

      // Act
      await projects.get('PROJ', ['description', 'issueTypes']);

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        expand: 'description,issueTypes',
      });
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('paginates with offset across multiple responses and yields all projects', async () => {
      // Arrange
      transport
        .respondWith({
          values: [makeProject('1', 'PROJ1')],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeProject('2', 'PROJ2')],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      // Act
      const items: { id: string }[] = [];
      for await (const project of projects.listAll()) {
        items.push(project);
      }

      // Assert
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
      expect(transport.calls).toHaveLength(2);
    });

    it('passes params to the underlying pagination call', async () => {
      // Arrange
      transport.respondWith({
        values: [],
        startAt: 0,
        maxResults: 10,
        total: 0,
        isLast: true,
      });

      // Act
      for await (const _ of projects.listAll({ maxResults: 10, orderBy: 'name' })) {
        // consume
      }

      // Assert
      expect(transport.calls[0]?.options.query).toMatchObject({
        maxResults: 10,
        orderBy: 'name',
      });
    });

    it('passes expand, status, and typeKey params', async () => {
      // Arrange
      transport.respondWith({
        values: [{ id: '1', key: 'P' }],
        startAt: 0,
        maxResults: 50,
        isLast: true,
      });

      // Act
      const items: unknown[] = [];
      for await (const item of projects.listAll({
        expand: ['description'],
        status: ['live'],
        typeKey: 'software',
        orderBy: 'name',
      })) {
        items.push(item);
      }

      // Assert — `expand`/`typeKey` stay comma-joined (type:string); `status`
      // (type:array) is a repeated param in the path (B1049).
      expect(items).toHaveLength(1);
      expect(transport.calls[0]?.options.query).toMatchObject({
        expand: 'description',
        typeKey: 'software',
        orderBy: 'name',
      });
      expect(transport.calls[0]?.options.path).toBe(`${BASE_URL}/project/search?status=live`);
      expect(transport.calls[0]?.options.query).not.toHaveProperty('status');
    });

    it('works with no params', async () => {
      // Arrange
      transport.respondWith({
        values: [],
        startAt: 0,
        maxResults: 50,
        isLast: true,
      });

      // Act
      const items: unknown[] = [];
      for await (const item of projects.listAll()) {
        items.push(item);
      }

      // Assert
      expect(items).toHaveLength(0);
    });

    it('omits orderBy when not specified', async () => {
      // Arrange
      transport.respondWith({
        values: [{ id: '2', key: 'Q' }],
        startAt: 0,
        maxResults: 50,
        isLast: true,
      });

      // Act
      for await (const _ of projects.listAll({ maxResults: 10 })) {
        // consume
      }

      // Assert
      expect(transport.calls[0]?.options.query?.['orderBy']).toBeUndefined();
    });
  });

  // ── validation ────────────────────────────────────────────────────────────

  describe('validation', () => {
    it('throws ValidationError when list() is called with maxResults: 0', async () => {
      // Act & Assert
      await expect(projects.list({ maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when list() is called with negative maxResults', async () => {
      // Act & Assert
      await expect(projects.list({ maxResults: -1 })).rejects.toThrow(ValidationError);
    });
  });

  // ── listLegacy ────────────────────────────────────────────────────────────

  describe('listLegacy()', () => {
    it('calls GET /project with no params', async () => {
      // Arrange
      const payload = [makeProject('10001', 'PROJ')];
      transport.respondWith(payload);

      // Act
      const result = await projects.listLegacy();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project`,
      });
    });

    it('passes all supported params correctly', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      await projects.listLegacy({
        maxResults: 25,
        orderBy: 'name',
        startAt: 10,
        expand: ['description', 'lead'],
        typeKey: ['software', 'business'],
        categoryId: 5,
        action: 'view',
        query: 'example',
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        maxResults: 25,
        orderBy: 'name',
        startAt: 10,
        expand: 'description,lead',
        typeKey: 'software,business',
        categoryId: 5,
        action: 'view',
        query: 'example',
      });
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /project and returns ProjectIdentifiers (id is a number)', async () => {
      // Arrange — spec 201 returns ProjectIdentifiers { id, key, self }, not a full Project.
      const identifiers = { id: 12345, key: 'EX', self: `${BASE_URL}/project/12345` };
      transport.respondWith(identifiers, 201);

      // Act
      const result = await projects.create({
        key: 'EX',
        name: 'Example',
        projectTypeKey: 'software',
      });

      // Assert — return type is the identifiers, with numeric id.
      expect(result).toEqual(identifiers);
      expect(typeof result.id).toBe('number');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/project`,
      });
      expect(transport.lastCall?.options.body).toMatchObject({
        key: 'EX',
        name: 'Example',
        projectTypeKey: 'software',
      });
    });

    it('includes all optional fields in body when provided', async () => {
      // Arrange
      transport.respondWith({ id: 10003, key: 'TEST', self: `${BASE_URL}/project/10003` }, 201);

      // Act
      await projects.create({
        key: 'TEST',
        name: 'Test Project',
        projectTypeKey: 'business',
        description: 'A test project',
        leadAccountId: 'abc123',
        url: 'https://ex.com',
        assigneeType: 'PROJECT_LEAD',
        avatarId: 10100,
        issueSecurityScheme: 1,
        permissionScheme: 10001,
        notificationScheme: 2,
        categoryId: 3,
        workflowScheme: 4,
        issueTypeScheme: 5,
        issueTypeScreenScheme: 6,
        fieldConfigurationScheme: 7,
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        description: 'A test project',
        leadAccountId: 'abc123',
        url: 'https://ex.com',
        assigneeType: 'PROJECT_LEAD',
        avatarId: 10100,
        issueSecurityScheme: 1,
        permissionScheme: 10001,
        notificationScheme: 2,
        categoryId: 3,
        workflowScheme: 4,
        issueTypeScheme: 5,
        issueTypeScreenScheme: 6,
        fieldConfigurationScheme: 7,
      });
    });

    it('never sends priorityScheme in the body (CreateProjectDetails has no such field)', async () => {
      // Regression: the old code added `priorityScheme`, which CreateProjectDetails
      // (additionalProperties:false) rejects with 400.
      transport.respondWith({ id: 10004, key: 'NP', self: `${BASE_URL}/project/10004` }, 201);

      await projects.create({ key: 'NP', name: 'No Priority', projectTypeKey: 'software' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('priorityScheme');
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /project/{id}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await projects.delete('PROJ');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/project/PROJ`,
      });
    });

    it('passes enableUndo query param when provided', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await projects.delete('PROJ', { enableUndo: true });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        enableUndo: true,
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /project/{id} and returns Project', async () => {
      // Arrange
      const project = makeProject('10001', 'PROJ');
      transport.respondWith(project);

      // Act
      const result = await projects.update('PROJ', { name: 'Updated Name' });

      // Assert
      expect(result).toEqual(project);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/project/PROJ`,
      });
      expect(transport.lastCall?.options.body).toMatchObject({ name: 'Updated Name' });
    });

    it('only includes provided optional fields in body', async () => {
      // Arrange
      transport.respondWith(makeProject('10001', 'PROJ'));

      // Act
      await projects.update('PROJ', {
        name: 'New Name',
        description: 'New desc',
        assigneeType: 'UNASSIGNED',
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'New Name',
        description: 'New desc',
        assigneeType: 'UNASSIGNED',
      });
    });

    it('includes all optional fields when provided', async () => {
      // Arrange
      transport.respondWith(makeProject('10001', 'PROJ'));

      // Act
      await projects.update('PROJ', {
        key: 'NEWKEY',
        leadAccountId: 'acc1',
        url: 'https://ex.com',
        avatarId: 42,
        issueSecurityScheme: 1,
        permissionScheme: 2,
        notificationScheme: 3,
        categoryId: 4,
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        key: 'NEWKEY',
        leadAccountId: 'acc1',
        url: 'https://ex.com',
        avatarId: 42,
        issueSecurityScheme: 1,
        permissionScheme: 2,
        notificationScheme: 3,
        categoryId: 4,
      });
    });
  });

  // ── recent ────────────────────────────────────────────────────────────────

  describe('recent()', () => {
    it('calls GET /project/recent', async () => {
      // Arrange
      const payload = [makeProject('10001', 'PROJ')];
      transport.respondWith(payload);

      // Act
      const result = await projects.recent();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/recent`,
      });
    });

    it('passes maxResults and expand params', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      await projects.recent({ maxResults: 5, expand: ['description'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        maxResults: 5,
        expand: 'description',
      });
    });
  });

  // ── listTypes ─────────────────────────────────────────────────────────────

  describe('listTypes()', () => {
    it('calls GET /project/type', async () => {
      // Arrange
      const payload = [
        { key: 'software', color: '#0052cc', descriptionI18nKey: 'project.type.software' },
      ];
      transport.respondWith(payload);

      // Act
      const result = await projects.listTypes();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/type`,
      });
    });
  });

  // ── getType ───────────────────────────────────────────────────────────────

  describe('getType()', () => {
    it('calls GET /project/type/{typeKey}', async () => {
      // Arrange
      const payload = {
        key: 'software',
        color: '#0052cc',
        descriptionI18nKey: 'project.type.software',
      };
      transport.respondWith(payload);

      // Act
      const result = await projects.getType('software');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/type/software`,
      });
    });

    it('encodes typeKey in path', async () => {
      transport.respondWith({ key: 'x', color: 'red', descriptionI18nKey: 'x' });
      await projects.getType('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/project/type/..%2Fadmin`);
    });
  });

  // ── getAccessibleType ─────────────────────────────────────────────────────

  describe('getAccessibleType()', () => {
    it('calls GET /project/type/{typeKey}/accessible', async () => {
      // Arrange
      const payload = {
        key: 'software',
        color: '#0052cc',
        descriptionI18nKey: 'project.type.software',
      };
      transport.respondWith(payload);

      // Act
      const result = await projects.getAccessibleType('software');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/type/software/accessible`,
      });
    });
  });

  // ── listAccessibleTypes ───────────────────────────────────────────────────

  describe('listAccessibleTypes()', () => {
    it('calls GET /project/type/accessible', async () => {
      // Arrange
      const payload = [
        { key: 'software', color: '#0052cc', descriptionI18nKey: 'project.type.software' },
      ];
      transport.respondWith(payload);

      // Act
      const result = await projects.listAccessibleTypes();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/type/accessible`,
      });
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes projectIdOrKey in get()', async () => {
      transport.respondWith(makeProject('x', 'x'));
      await projects.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/project/..%2Fadmin`);
    });
  });

  // ── getEmail ──────────────────────────────────────────────────────────────

  describe('getEmail()', () => {
    it('sends GET /project/:id/email', async () => {
      const payload = { projectId: 1, emailAddress: 'test@example.com' };
      transport.respondWith(payload);
      const result = await projects.getEmail('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/email`,
      });
      expect(result).toMatchObject({ emailAddress: 'test@example.com' });
    });

    it('encodes projectId in path', async () => {
      transport.respondWith({});
      await projects.getEmail('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/project/..%2Fadmin/email`);
    });
  });

  // ── setEmail ──────────────────────────────────────────────────────────────

  describe('setEmail()', () => {
    it('sends PUT /project/:id/email with emailAddress', async () => {
      transport.respondWith(undefined);
      await projects.setEmail('PROJ', { emailAddress: 'new@example.com' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/project/PROJ/email`,
      });
      expect(transport.lastCall?.options.body).toMatchObject({ emailAddress: 'new@example.com' });
    });

    it('sends PUT with empty body when no emailAddress', async () => {
      transport.respondWith(undefined);
      await projects.setEmail('PROJ', {});
      expect(transport.lastCall?.options.body).toEqual({});
    });
  });

  // ── getHierarchy ──────────────────────────────────────────────────────────

  describe('getHierarchy()', () => {
    it('sends GET /project/:id/hierarchy', async () => {
      const payload = { projectId: 10001, hierarchy: [] };
      transport.respondWith(payload);
      const result = await projects.getHierarchy('10001');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/10001/hierarchy`,
      });
      expect(result).toMatchObject({ projectId: 10001 });
    });
  });

  // ── archive ───────────────────────────────────────────────────────────────

  describe('archive()', () => {
    it('sends POST /project/:key/archive', async () => {
      transport.respondWith(undefined);
      await projects.archive('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/project/PROJ/archive`,
      });
    });
  });

  // ── setAvatar ─────────────────────────────────────────────────────────────

  describe('setAvatar()', () => {
    it('sends PUT /project/:key/avatar with id', async () => {
      transport.respondWith(undefined);
      await projects.setAvatar('PROJ', { id: 'avi-123' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/project/PROJ/avatar`,
      });
      expect(transport.lastCall?.options.body).toMatchObject({ id: 'avi-123' });
    });
  });

  // ── deleteAvatar ──────────────────────────────────────────────────────────

  describe('deleteAvatar()', () => {
    it('sends DELETE /project/:key/avatar/:avatarId', async () => {
      transport.respondWith(undefined);
      await projects.deleteAvatar('PROJ', '10100');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/project/PROJ/avatar/10100`,
      });
    });

    it('encodes avatarId in path', async () => {
      transport.respondWith(undefined);
      await projects.deleteAvatar('PROJ', 'av/123');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/project/PROJ/avatar/av%2F123`);
    });
  });

  // ── loadAvatar ────────────────────────────────────────────────────────────

  describe('loadAvatar()', () => {
    it('sends POST /project/:key/avatar2 with body', async () => {
      const payload = { id: 'av-new' };
      transport.respondWith(payload);
      const result = await projects.loadAvatar('PROJ', { data: 'base64...' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/project/PROJ/avatar2`,
      });
      expect(result).toMatchObject({ id: 'av-new' });
    });
  });

  // ── getAvatars ────────────────────────────────────────────────────────────

  describe('getAvatars()', () => {
    it('sends GET /project/:key/avatars', async () => {
      const payload = { system: [], custom: [] };
      transport.respondWith(payload);
      const result = await projects.getAvatars('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/avatars`,
      });
      expect(result).toMatchObject({ system: [], custom: [] });
    });
  });

  // ── getClassificationConfig ───────────────────────────────────────────────

  describe('getClassificationConfig()', () => {
    it('sends GET /project/:key/classification-config', async () => {
      const payload = { id: 'cl-1', name: 'Public' };
      transport.respondWith(payload);
      const result = await projects.getClassificationConfig('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/classification-config`,
      });
      expect(result).toMatchObject({ id: 'cl-1' });
    });
  });

  // ── deleteClassificationLevel ─────────────────────────────────────────────

  describe('deleteClassificationLevel()', () => {
    it('sends DELETE /project/:key/classification-level/default', async () => {
      transport.respondWith(undefined);
      await projects.deleteClassificationLevel('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/project/PROJ/classification-level/default`,
      });
    });
  });

  // ── restore ───────────────────────────────────────────────────────────────

  describe('restore()', () => {
    it('sends POST /project/:id/restore', async () => {
      transport.respondWith(undefined);
      await projects.restore('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/project/PROJ/restore`,
      });
    });

    it('encodes projectIdOrKey in path', async () => {
      transport.respondWith(undefined);
      await projects.restore('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/project/..%2Fadmin/restore`);
    });
  });

  // ── listRoles ─────────────────────────────────────────────────────────────

  describe('listRoles()', () => {
    it('sends GET /project/:id/role', async () => {
      transport.respondWith({ Developer: 'https://example.com/role/10001' });
      const result = await projects.listRoles('PROJ');
      expect(result).toEqual({ Developer: 'https://example.com/role/10001' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/role`,
      });
    });
  });

  // ── deleteRoleActors ──────────────────────────────────────────────────────

  describe('deleteRoleActors()', () => {
    it('sends DELETE /project/:id/role/:roleId with user param', async () => {
      transport.respondWith(undefined);
      await projects.deleteRoleActors('PROJ', 10001, { user: 'acc-1' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/project/PROJ/role/10001`,
        query: { user: 'acc-1' },
      });
    });

    it('sends DELETE with groupId param', async () => {
      transport.respondWith(undefined);
      await projects.deleteRoleActors('PROJ', 10001, { groupId: 'grp-1' });
      expect(transport.lastCall?.options.query).toMatchObject({ groupId: 'grp-1' });
    });

    it('sends DELETE with group param', async () => {
      transport.respondWith(undefined);
      await projects.deleteRoleActors('PROJ', 10001, { group: 'my-group' });
      expect(transport.lastCall?.options.query).toMatchObject({ group: 'my-group' });
    });
  });

  // ── getRole ───────────────────────────────────────────────────────────────

  describe('getRole()', () => {
    it('sends GET /project/:id/role/:roleId', async () => {
      transport.respondWith({ id: 10001, name: 'Developer' });
      const result = await projects.getRole('PROJ', 10001);
      expect(result).toMatchObject({ id: 10001, name: 'Developer' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/role/10001`,
      });
    });

    it('passes excludeInactiveUsers param', async () => {
      transport.respondWith({ id: 10001 });
      await projects.getRole('PROJ', 10001, { excludeInactiveUsers: true });
      expect(transport.lastCall?.options.query).toMatchObject({ excludeInactiveUsers: true });
    });

    it('omits excludeInactiveUsers when not provided', async () => {
      transport.respondWith({ id: 10001 });
      await projects.getRole('PROJ', 10001);
      expect(transport.lastCall?.options.query?.['excludeInactiveUsers']).toBeUndefined();
    });
  });

  // ── addRoleActors ─────────────────────────────────────────────────────────

  describe('addRoleActors()', () => {
    it('sends POST /project/:id/role/:roleId with flat ActorsMap body', async () => {
      transport.respondWith({ id: 10001, actors: [] });
      const result = await projects.addRoleActors('PROJ', 10001, { user: ['acc-1'] });
      expect(result).toMatchObject({ id: 10001 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/project/PROJ/role/10001`,
        body: { user: ['acc-1'] },
      });
    });

    it('REPRO sends the spec ActorsMap body { user } not a nested { actors: [...] } wrapper', async () => {
      transport.respondWith({ id: 10001, actors: [] });
      await projects.addRoleActors('PROJ', 10001, { user: ['acc-1'] });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      // Spec: POST /project/{id}/role/{id} (addActorUsers) body = ActorsMap = flat
      // { user?: string[]; group?: string[]; groupId?: string[] }, additionalProperties:false.
      expect('actors' in body).toBe(false);
      expect(body['user']).toEqual(['acc-1']);
    });

    it('sends group array in ActorsMap body', async () => {
      transport.respondWith({ id: 10001, actors: [] });
      await projects.addRoleActors('PROJ', 10001, { group: ['group-name'] });
      expect(transport.lastCall?.options.body).toEqual({ group: ['group-name'] });
    });

    it('sends groupId array in ActorsMap body', async () => {
      transport.respondWith({ id: 10001, actors: [] });
      await projects.addRoleActors('PROJ', 10001, { groupId: ['gid-1', 'gid-2'] });
      expect(transport.lastCall?.options.body).toEqual({ groupId: ['gid-1', 'gid-2'] });
    });

    it('omits empty arrays from ActorsMap body', async () => {
      transport.respondWith({ id: 10001, actors: [] });
      await projects.addRoleActors('PROJ', 10001, { user: [], groupId: ['gid-1'] });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect('user' in body).toBe(false);
      expect(body['groupId']).toEqual(['gid-1']);
    });
  });

  // ── getClassificationLevel ────────────────────────────────────────────────

  describe('getClassificationLevel()', () => {
    it('sends GET /project/:key/classification-level/default', async () => {
      const payload = { id: 'cl-1', name: 'Public' };
      transport.respondWith(payload);
      const result = await projects.getClassificationLevel('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/classification-level/default`,
      });
      expect(result).toMatchObject({ id: 'cl-1' });
    });
  });

  // ── setClassificationLevel ────────────────────────────────────────────────

  describe('setClassificationLevel()', () => {
    it('sends PUT /project/:key/classification-level/default with id', async () => {
      transport.respondWith(undefined);
      await projects.setClassificationLevel('PROJ', { id: 'cl-1' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/project/PROJ/classification-level/default`,
      });
      expect(transport.lastCall?.options.body).toMatchObject({ id: 'cl-1' });
    });

    it('sends PUT with empty body when no id provided', async () => {
      transport.respondWith(undefined);
      await projects.setClassificationLevel('PROJ', {});
      expect(transport.lastCall?.options.body).toEqual({});
    });
  });

  // ── listComponents ────────────────────────────────────────────────────────

  describe('listComponents()', () => {
    it('sends GET /project/:key/component', async () => {
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      transport.respondWith(payload);
      const result = await projects.listComponents('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/component`,
      });
      expect(result).toMatchObject({ values: [] });
    });

    it('passes pagination and filter params', async () => {
      transport.respondWith({ values: [], startAt: 10, maxResults: 25, total: 0 });
      await projects.listComponents('PROJ', {
        startAt: 10,
        maxResults: 25,
        orderBy: 'name',
        componentSource: 'auto',
        query: 'comp',
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 10,
        maxResults: 25,
        orderBy: 'name',
        componentSource: 'auto',
        query: 'comp',
      });
    });
  });

  // ── setRoleActors ─────────────────────────────────────────────────────────

  describe('setRoleActors()', () => {
    it('sends PUT /project/:id/role/:roleId with categorisedActors body', async () => {
      transport.respondWith({ id: 10001 });
      const result = await projects.setRoleActors('PROJ', 10001, {
        categorisedActors: { 'atlassian-user-role-actor': ['acc-1'] },
      });
      expect(result).toMatchObject({ id: 10001 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/project/PROJ/role/10001`,
        body: { categorisedActors: { 'atlassian-user-role-actor': ['acc-1'] } },
      });
    });
  });

  // ── getRoleDetails ────────────────────────────────────────────────────────

  describe('getRoleDetails()', () => {
    it('sends GET /project/:id/roledetails', async () => {
      transport.respondWith([{ id: 10001, name: 'Developer', roleConfigurable: true }]);
      const result = await projects.getRoleDetails('PROJ');
      expect(result).toHaveLength(1);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/roledetails`,
      });
    });

    it('passes currentMember param', async () => {
      transport.respondWith([]);
      await projects.getRoleDetails('PROJ', { currentMember: true });
      expect(transport.lastCall?.options.query).toMatchObject({ currentMember: true });
    });

    it('passes excludeConnectAddons param', async () => {
      transport.respondWith([]);
      await projects.getRoleDetails('PROJ', { excludeConnectAddons: true });
      expect(transport.lastCall?.options.query).toMatchObject({ excludeConnectAddons: true });
    });
  });

  // ── getStatuses ───────────────────────────────────────────────────────────

  describe('getStatuses()', () => {
    it('sends GET /project/:id/statuses', async () => {
      const payload = [{ id: '10001', name: 'Bug', statuses: [{ id: '1', name: 'Open' }] }];
      transport.respondWith(payload);
      const result = await projects.getStatuses('PROJ');
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/statuses`,
      });
    });
  });

  // ── listVersions ──────────────────────────────────────────────────────────

  describe('listVersions()', () => {
    it('sends GET /project/:id/version', async () => {
      const payload = { values: [{ id: 'v1', name: '1.0' }], startAt: 0, maxResults: 50, total: 1 };
      transport.respondWith(payload);
      const result = await projects.listVersions('PROJ');
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/version`,
      });
    });

    it('passes all optional params', async () => {
      transport.respondWith({ values: [], startAt: 0, maxResults: 10, total: 0 });
      await projects.listVersions('PROJ', {
        startAt: 5,
        maxResults: 10,
        orderBy: 'name',
        query: 'v1',
        status: 'released',
        expand: 'issuesstatus',
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 10,
        orderBy: 'name',
        query: 'v1',
        status: 'released',
        expand: 'issuesstatus',
      });
    });
  });

  // ── listAllComponents ─────────────────────────────────────────────────────

  describe('listAllComponents()', () => {
    it('sends GET /project/:key/components', async () => {
      const payload = [{ id: 'comp-1', name: 'Backend' }];
      transport.respondWith(payload);
      const result = await projects.listAllComponents('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/components`,
      });
      expect(result).toEqual(payload);
    });
  });

  // ── deleteAsync ───────────────────────────────────────────────────────────

  describe('deleteAsync()', () => {
    it('sends POST /project/:key/delete and returns TaskId', async () => {
      transport.respondWith({ id: 'task-123' });
      const result = await projects.deleteAsync('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/project/PROJ/delete`,
      });
      expect(result).toMatchObject({ id: 'task-123' });
    });
  });

  // ── getFeatures ───────────────────────────────────────────────────────────

  describe('getFeatures()', () => {
    it('sends GET /project/:key/features', async () => {
      const payload = { features: [{ feature: 'jsw.classic.roadmap', state: 'ENABLED' }] };
      transport.respondWith(payload);
      const result = await projects.getFeatures('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/features`,
      });
      expect(result).toMatchObject({ features: expect.any(Array) });
    });
  });

  // ── setFeatureState ───────────────────────────────────────────────────────

  describe('setFeatureState()', () => {
    it('sends PUT /project/:key/features/:featureKey with state', async () => {
      const payload = { features: [] };
      transport.respondWith(payload);
      const result = await projects.setFeatureState('PROJ', 'jsw.classic.roadmap', 'ENABLED');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/project/PROJ/features/jsw.classic.roadmap`,
      });
      expect(transport.lastCall?.options.body).toMatchObject({ state: 'ENABLED' });
      expect(result).toMatchObject({ features: [] });
    });

    it('sends DISABLED state', async () => {
      transport.respondWith({ features: [] });
      await projects.setFeatureState('PROJ', 'some.feature', 'DISABLED');
      expect(transport.lastCall?.options.body).toMatchObject({ state: 'DISABLED' });
    });

    it('encodes featureKey in path', async () => {
      transport.respondWith({ features: [] });
      await projects.setFeatureState('PROJ', 'feature/key', 'ENABLED');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/project/PROJ/features/feature%2Fkey`,
      );
    });
  });

  // ── listProperties ────────────────────────────────────────────────────────

  describe('listProperties()', () => {
    it('sends GET /project/:key/properties', async () => {
      const payload = { keys: [{ self: 'url', key: 'prop1' }] };
      transport.respondWith(payload);
      const result = await projects.listProperties('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/properties`,
      });
      expect(result).toMatchObject({ keys: expect.any(Array) });
    });
  });

  // ── deleteProperty ────────────────────────────────────────────────────────

  describe('deleteProperty()', () => {
    it('sends DELETE /project/:key/properties/:propertyKey', async () => {
      transport.respondWith(undefined);
      await projects.deleteProperty('PROJ', 'my.prop');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/project/PROJ/properties/my.prop`,
      });
    });

    it('encodes propertyKey in path', async () => {
      transport.respondWith(undefined);
      await projects.deleteProperty('PROJ', 'key/with/slashes');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/project/PROJ/properties/key%2Fwith%2Fslashes`,
      );
    });
  });

  // ── getProperty ───────────────────────────────────────────────────────────

  describe('getProperty()', () => {
    it('sends GET /project/:key/properties/:propertyKey', async () => {
      const payload = { key: 'my.prop', value: { foo: 'bar' } };
      transport.respondWith(payload);
      const result = await projects.getProperty('PROJ', 'my.prop');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/properties/my.prop`,
      });
      expect(result).toMatchObject({ key: 'my.prop', value: { foo: 'bar' } });
    });
  });

  // ── setProperty ───────────────────────────────────────────────────────────

  describe('setProperty()', () => {
    it('sends PUT /project/:key/properties/:propertyKey with value', async () => {
      transport.respondWith(undefined);
      await projects.setProperty('PROJ', 'my.prop', { answer: 42 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/project/PROJ/properties/my.prop`,
      });
      expect(transport.lastCall?.options.body).toMatchObject({ answer: 42 });
    });
  });

  // ── listAllVersions ───────────────────────────────────────────────────────

  describe('listAllVersions()', () => {
    it('sends GET /project/:id/versions', async () => {
      transport.respondWith([{ id: 'v1', name: '1.0' }]);
      const result = await projects.listAllVersions('PROJ');
      expect(result).toEqual([{ id: 'v1', name: '1.0' }]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/versions`,
      });
    });

    it('passes optional params', async () => {
      transport.respondWith([]);
      await projects.listAllVersions('PROJ', { orderBy: '-releaseDate', status: 'released' });
      expect(transport.lastCall?.options.query).toMatchObject({
        orderBy: '-releaseDate',
        status: 'released',
      });
    });

    it('passes all optional params including maxResults, query, and expand', async () => {
      transport.respondWith([]);
      await projects.listAllVersions('PROJ', {
        maxResults: 10,
        orderBy: 'name',
        query: 'v1',
        status: 'unreleased',
        expand: 'issuesstatus',
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        maxResults: 10,
        orderBy: 'name',
        query: 'v1',
        status: 'unreleased',
        expand: 'issuesstatus',
      });
    });
  });

  // ── getIssueSecurityScheme ────────────────────────────────────────────────

  describe('getIssueSecurityScheme()', () => {
    it('sends GET /project/:id/issuesecuritylevelscheme', async () => {
      transport.respondWith({ id: 1, name: 'Scheme' });
      const result = await projects.getIssueSecurityScheme('PROJ');
      expect(result).toMatchObject({ id: 1 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/issuesecuritylevelscheme`,
      });
    });
  });

  // ── getNotificationScheme ─────────────────────────────────────────────────

  describe('getNotificationScheme()', () => {
    it('sends GET /project/:id/notificationscheme', async () => {
      transport.respondWith({ id: 2, name: 'Default' });
      await projects.getNotificationScheme('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/notificationscheme`,
      });
    });

    it('passes expand param', async () => {
      transport.respondWith({ id: 2 });
      await projects.getNotificationScheme('PROJ', { expand: 'all' });
      expect(transport.lastCall?.options.query).toMatchObject({ expand: 'all' });
    });
  });

  // ── getPermissionScheme ───────────────────────────────────────────────────

  describe('getPermissionScheme()', () => {
    it('sends GET /project/:id/permissionscheme', async () => {
      transport.respondWith({ id: 3, name: 'Default Permission Scheme' });
      await projects.getPermissionScheme('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/permissionscheme`,
      });
    });

    it('passes expand param', async () => {
      transport.respondWith({ id: 3 });
      await projects.getPermissionScheme('PROJ', { expand: 'permissions' });
      expect(transport.lastCall?.options.query).toMatchObject({ expand: 'permissions' });
    });
  });

  // ── setPermissionScheme ───────────────────────────────────────────────────

  describe('setPermissionScheme()', () => {
    it('sends PUT /project/:id/permissionscheme with id body', async () => {
      transport.respondWith({ id: 10001 });
      const result = await projects.setPermissionScheme('PROJ', { id: 10001 });
      expect(result).toMatchObject({ id: 10001 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/project/PROJ/permissionscheme`,
        body: { id: 10001 },
      });
    });
  });

  // ── getSecurityLevels ─────────────────────────────────────────────────────

  describe('getSecurityLevels()', () => {
    it('sends GET /project/:id/securitylevel', async () => {
      transport.respondWith({ levels: [{ id: '1', name: 'Private' }] });
      const result = await projects.getSecurityLevels('PROJ');
      expect(result.levels).toHaveLength(1);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ/securitylevel`,
      });
    });
  });

  // ── listCategories ────────────────────────────────────────────────────────

  describe('listCategories()', () => {
    it('sends GET /projectCategory', async () => {
      transport.respondWith([{ id: '1', name: 'Infrastructure' }]);
      const result = await projects.listCategories();
      expect(result).toEqual([{ id: '1', name: 'Infrastructure' }]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/projectCategory`,
      });
    });
  });

  // ── createCategory ────────────────────────────────────────────────────────

  describe('createCategory()', () => {
    it('sends POST /projectCategory with name', async () => {
      transport.respondWith({ id: '2', name: 'DevOps' });
      const result = await projects.createCategory({ name: 'DevOps' });
      expect(result).toMatchObject({ name: 'DevOps' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/projectCategory`,
        body: { name: 'DevOps' },
      });
    });

    it('includes description when provided', async () => {
      transport.respondWith({ id: '3', name: 'Platform' });
      await projects.createCategory({ name: 'Platform', description: 'Platform team' });
      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'Platform',
        description: 'Platform team',
      });
    });
  });

  // ── deleteCategory ────────────────────────────────────────────────────────

  describe('deleteCategory()', () => {
    it('sends DELETE /projectCategory/:id', async () => {
      transport.respondWith(undefined);
      await projects.deleteCategory('42');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/projectCategory/42`,
      });
    });

    it('encodes categoryId in path', async () => {
      transport.respondWith(undefined);
      await projects.deleteCategory('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/projectCategory/..%2Fadmin`);
    });
  });

  // ── getCategory ───────────────────────────────────────────────────────────

  describe('getCategory()', () => {
    it('sends GET /projectCategory/:id', async () => {
      transport.respondWith({ id: '42', name: 'DevOps' });
      const result = await projects.getCategory('42');
      expect(result).toMatchObject({ id: '42' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/projectCategory/42`,
      });
    });
  });

  // ── updateCategory ────────────────────────────────────────────────────────

  describe('updateCategory()', () => {
    it('sends PUT /projectCategory/:id with updated fields', async () => {
      transport.respondWith({ id: '42', name: 'Renamed' });
      const result = await projects.updateCategory('42', { name: 'Renamed' });
      expect(result).toMatchObject({ name: 'Renamed' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/projectCategory/42`,
        body: { name: 'Renamed' },
      });
    });

    it('includes description when provided', async () => {
      transport.respondWith({ id: '42', name: 'X' });
      await projects.updateCategory('42', { name: 'X', description: 'Updated' });
      expect(transport.lastCall?.options.body).toMatchObject({ description: 'Updated' });
    });

    it('omits undefined fields', async () => {
      transport.respondWith({ id: '42' });
      await projects.updateCategory('42', {});
      expect(transport.lastCall?.options.body).toEqual({});
    });
  });

  // ── getProjectsFields ─────────────────────────────────────────────────────

  describe('getProjectsFields()', () => {
    it('sends GET /projects/fields', async () => {
      transport.respondWith([{ id: 'f1' }, { id: 'f2' }]);
      const result = await projects.getProjectsFields();
      expect(result).toHaveLength(2);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/projects/fields`,
      });
    });
  });

  // ── validateProjectKey ────────────────────────────────────────────────────

  describe('validateProjectKey()', () => {
    it('sends GET /projectvalidate/key and returns an ErrorCollection (empty = valid)', async () => {
      // Spec 200 is ErrorCollection; a valid key has empty errorMessages.
      transport.respondWith({ errorMessages: [], errors: {}, status: 200 });
      const result = await projects.validateProjectKey('MYPROJ');
      expect(result.errorMessages).toEqual([]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/projectvalidate/key`,
        query: { key: 'MYPROJ' },
      });
    });

    it('returns errorMessages + errors map when invalid (no `valid` boolean)', async () => {
      // Regression: the old type declared `valid`/`errors:string[]`; the spec
      // returns ErrorCollection with `errors` as a parameter→message map.
      transport.respondWith({
        errorMessages: ['A project with that key already exists.'],
        errors: { projectKey: 'Key must be unique.' },
        status: 400,
      });
      const result = await projects.validateProjectKey('TAKEN');
      expect(result.errorMessages).toContain('A project with that key already exists.');
      expect(result.errors).toEqual({ projectKey: 'Key must be unique.' });
      expect(result).not.toHaveProperty('valid');
    });
  });

  // ── getValidProjectKey ────────────────────────────────────────────────────

  describe('getValidProjectKey()', () => {
    it('sends GET /projectvalidate/validProjectKey and returns the bare string', async () => {
      // Spec 200 is a bare string, not { key }.
      transport.respondWith('MYKEY2');
      const result = await projects.getValidProjectKey('myproj');
      expect(result).toBe('MYKEY2');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/projectvalidate/validProjectKey`,
        query: { key: 'myproj' },
      });
    });
  });

  // ── getValidProjectName ───────────────────────────────────────────────────

  describe('getValidProjectName()', () => {
    it('sends GET /projectvalidate/validProjectName and returns the bare string', async () => {
      // Spec 200 is a bare string, not { name }.
      transport.respondWith('My Project');
      const result = await projects.getValidProjectName('My Project');
      expect(result).toBe('My Project');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/projectvalidate/validProjectName`,
        query: { name: 'My Project' },
      });
    });
  });
});
