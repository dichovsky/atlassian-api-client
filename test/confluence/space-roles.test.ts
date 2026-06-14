import { describe, it, expect, beforeEach } from 'vitest';
import { SpaceRolesResource } from '../../src/confluence/resources/space-roles.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeRole = (id: string, name: string, type: 'SYSTEM' | 'CUSTOM' = 'CUSTOM') => ({
  id,
  type,
  name,
  description: `${name} role`,
  spacePermissions: ['read/space'],
});

describe('SpaceRolesResource', () => {
  let transport: MockTransport;
  let resource: SpaceRolesResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new SpaceRolesResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /space-roles with no params', async () => {
      // Arrange
      const payload = { results: [makeRole('r1', 'Editor')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await resource.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/space-roles`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
      expect(transport.lastCall?.options.body).toBeUndefined();
    });

    it('forwards every supported filter as a query param', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.list({
        'space-id': 'space-1',
        'role-type': 'CUSTOM',
        'principal-id': 'acc-1',
        'principal-type': 'USER',
        limit: 10,
        cursor: 'tok',
      });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({
        'space-id': 'space-1',
        'role-type': 'CUSTOM',
        'principal-id': 'acc-1',
        'principal-type': 'USER',
        limit: 10,
        cursor: 'tok',
      });
    });

    it('accepts role-type as an open string (not restricted to SYSTEM/CUSTOM enum) (B1059)', async () => {
      // Spec declares role-type as type:string without an enum constraint.
      transport.respondWith({ results: [], _links: {} });

      await resource.list({ 'role-type': 'TENANT_DEFINED_ROLE' });

      expect(transport.lastCall?.options.query).toMatchObject({
        'role-type': 'TENANT_DEFINED_ROLE',
      });
    });

    it('omits cursor when only limit is provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.list({ limit: 5 });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ limit: 5 });
    });

    it('omits limit when only cursor is provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.list({ cursor: 'c1' });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ cursor: 'c1' });
    });

    it('throws ValidationError when limit is zero', async () => {
      await expect(resource.list({ limit: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when limit is negative', async () => {
      await expect(resource.list({ limit: -1 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('boom'));
      await expect(resource.list()).rejects.toThrow('boom');
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('yields items across pages until _links.next is absent', async () => {
      // Arrange — first page advertises a next cursor, second page is the tail
      transport
        .respondWith({
          results: [makeRole('r1', 'Editor'), makeRole('r2', 'Viewer')],
          _links: { next: '/wiki/api/v2/space-roles?cursor=c2' },
        })
        .respondWith({
          results: [makeRole('r3', 'Admin', 'SYSTEM')],
          _links: {},
        });

      // Act
      const items: { id?: string }[] = [];
      for await (const item of resource.listAll()) {
        items.push(item);
      }

      // Assert
      expect(items.map((i) => i.id)).toEqual(['r1', 'r2', 'r3']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({});
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'c2' });
    });

    it('forwards every filter to the first request', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      const iter = resource.listAll({
        'space-id': 'space-1',
        'role-type': 'SYSTEM',
        'principal-id': 'acc-9',
        'principal-type': 'GROUP',
        limit: 25,
      });
      await iter.next();

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        'space-id': 'space-1',
        'role-type': 'SYSTEM',
        'principal-id': 'acc-9',
        'principal-type': 'GROUP',
        limit: 25,
      });
    });

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listAll({ limit: 0 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /space-roles/{id} with no query/body', async () => {
      // Arrange
      const payload = {
        ...makeRole('r1', 'Editor'),
        _links: { base: 'https://test.atlassian.net/wiki' },
      };
      transport.respondWith(payload);

      // Act
      const result = await resource.get('r1');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/space-roles/r1`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
      expect(transport.lastCall?.options.body).toBeUndefined();
    });

    it('URL-encodes the id path segment', async () => {
      // Arrange
      transport.respondWith(makeRole('r/1', 'Slash'));

      // Act
      await resource.get('r/1');

      // Assert — `/` in the id must be encoded so it doesn't extend the path.
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/space-roles/r%2F1`);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /space-roles with the body and no query', async () => {
      // Arrange
      const data = {
        name: 'Editor',
        description: 'Edit pages',
        spacePermissions: ['read/space', 'write/space'],
      };
      const payload = { ...makeRole('r-new', 'Editor'), spacePermissions: data.spacePermissions };
      transport.respondWith(payload, 201);

      // Act
      const result = await resource.create(data);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/space-roles`,
        body: data,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /space-roles/{id} with the body', async () => {
      // Arrange
      const data = {
        name: 'Editor v2',
        description: 'Updated',
        spacePermissions: ['read/space'],
      };
      const payload = {
        id: 'r1',
        type: 'CUSTOM' as const,
        name: 'Editor v2',
        description: 'Updated',
        taskId: 'task-9',
      };
      transport.respondWith(payload, 202);

      // Act
      const result = await resource.update('r1', data);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/space-roles/r1`,
        body: data,
      });
    });

    it('forwards optional reassignment ids when provided', async () => {
      // Arrange
      const data = {
        name: 'Editor',
        description: 'Desc',
        spacePermissions: ['read/space'],
        anonymousReassignmentRoleId: 'role-anon',
        guestReassignmentRoleId: 'role-guest',
      };
      transport.respondWith({ id: 'r1', taskId: 't-1' }, 202);

      // Act
      await resource.update('r1', data);

      // Assert
      expect(transport.lastCall?.options.body).toEqual(data);
    });

    it('URL-encodes the id path segment', async () => {
      // Arrange
      transport.respondWith({ id: 'r 1', taskId: 't-1' }, 202);

      // Act
      await resource.update('r 1', {
        name: 'n',
        description: 'd',
        spacePermissions: ['read/space'],
      });

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/space-roles/r%201`);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /space-roles/{id} and returns the task envelope', async () => {
      // Arrange
      const payload = { taskId: 'task-42' };
      transport.respondWith(payload, 202);

      // Act
      const result = await resource.delete('r1');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/space-roles/r1`,
      });
      expect(transport.lastCall?.options.body).toBeUndefined();
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('URL-encodes the id path segment', async () => {
      // Arrange
      transport.respondWith({ taskId: 'task-1' }, 202);

      // Act
      await resource.delete('r#1');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/space-roles/r%231`);
    });
  });
});
