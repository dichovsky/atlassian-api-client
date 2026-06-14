import { describe, it, expect, beforeEach } from 'vitest';
import { SpacePermissionsResource } from '../../src/confluence/resources/space-permissions.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';
import type {
  BulkAssignRolesRequest,
  BulkRemoveAccessRequest,
} from '../../src/confluence/types/space-permissions.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makePermission = (id: string, displayName: string) => ({
  id,
  displayName,
  description: `${displayName} permission`,
  requiredPermissionIds: [],
});

const makeCombination = (combinationId: string) => ({
  combinationId,
  spaceCount: 1,
  principalCount: 2,
  permissions: [{ id: 'VIEW_CONTENT', displayName: 'View' }],
  principalTypes: ['USER' as const],
});

describe('SpacePermissionsResource', () => {
  let transport: MockTransport;
  let resource: SpacePermissionsResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new SpacePermissionsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /space-permissions with no params', async () => {
      // Arrange
      const payload = { results: [makePermission('p1', 'Read')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await resource.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/space-permissions`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
      expect(transport.lastCall?.options.body).toBeUndefined();
    });

    it('passes limit and cursor when provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.list({ limit: 10, cursor: 'tok' });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ limit: 10, cursor: 'tok' });
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
          results: [makePermission('p1', 'Read'), makePermission('p2', 'Write')],
          _links: { next: '/wiki/api/v2/space-permissions?cursor=c2' },
        })
        .respondWith({
          results: [makePermission('p3', 'Admin')],
          _links: {},
        });

      // Act
      const items: { id: string }[] = [];
      for await (const item of resource.listAll()) {
        items.push(item);
      }

      // Assert
      expect(items.map((i) => i.id)).toEqual(['p1', 'p2', 'p3']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({});
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'c2' });
    });

    it('passes limit through to the request query', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      const iter = resource.listAll({ limit: 25 });
      await iter.next();

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ limit: 25 });
    });

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listAll({ limit: 0 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── bulkRemoveAccess (B1031) ───────────────────────────────────────────────

  describe('bulkRemoveAccess()', () => {
    const taskResponse = {
      taskId: 'task-1',
      status: 'IN_PROGRESS' as const,
      statusUrl: 'https://example.atlassian.net/status/task-1',
    };

    const requestBody: BulkRemoveAccessRequest = {
      permissionCombinationIds: ['combo-abc', 'combo-def'],
      spaceSelection: { spaceType: 'ALL' },
    };

    it('calls POST /space-permissions/transition/access-removals with body', async () => {
      // Arrange
      transport.respondWith(taskResponse);

      // Act
      const result = await resource.bulkRemoveAccess(requestBody);

      // Assert
      expect(result).toEqual(taskResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/space-permissions/transition/access-removals`,
        body: requestBody,
      });
    });

    it('passes selectedSpaces when spaceType is SPECIFIC', async () => {
      transport.respondWith(taskResponse);
      const data: BulkRemoveAccessRequest = {
        permissionCombinationIds: ['combo-1'],
        spaceSelection: {
          spaceType: 'SPECIFIC',
          selectedSpaces: [{ id: 's1', key: 'KEY1' }],
        },
      };
      await resource.bulkRemoveAccess(data);
      expect(transport.lastCall?.options.body).toEqual(data);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('net-err'));
      await expect(resource.bulkRemoveAccess(requestBody)).rejects.toThrow('net-err');
    });
  });

  // ── listCombinations (B1032) ───────────────────────────────────────────────

  describe('listCombinations()', () => {
    const combinationsPage = {
      results: [makeCombination('combo-1')],
      generatedAt: '2026-06-07T10:00:00Z',
      cursor: null,
    };

    it('calls GET /space-permissions/transition/combinations with no params', async () => {
      transport.respondWith(combinationsPage);

      const result = await resource.listCombinations();

      expect(result).toEqual(combinationsPage);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/space-permissions/transition/combinations`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('passes limit and cursor', async () => {
      transport.respondWith(combinationsPage);
      await resource.listCombinations({ limit: 50, cursor: 'curs1' });
      expect(transport.lastCall?.options.query).toEqual({ limit: 50, cursor: 'curs1' });
    });

    it('throws ValidationError when limit is zero', async () => {
      await expect(resource.listCombinations({ limit: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when limit is negative', async () => {
      await expect(resource.listCombinations({ limit: -5 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── listAllCombinations (B1032) ────────────────────────────────────────────

  describe('listAllCombinations()', () => {
    it('yields items across pages until cursor is absent', async () => {
      transport
        .respondWith({
          results: [makeCombination('c1'), makeCombination('c2')],
          cursor: 'cursor-p2',
        })
        .respondWith({
          results: [makeCombination('c3')],
          cursor: null,
        });

      const items: { combinationId: string }[] = [];
      for await (const item of resource.listAllCombinations()) {
        items.push(item);
      }

      expect(items.map((i) => i.combinationId)).toEqual(['c1', 'c2', 'c3']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({});
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'cursor-p2' });
    });

    it('passes limit through to requests', async () => {
      transport.respondWith({ results: [], cursor: null });
      const iter = resource.listAllCombinations({ limit: 100 });
      await iter.next();
      expect(transport.lastCall?.options.query).toMatchObject({ limit: 100 });
    });

    it('throws ValidationError when limit is invalid before any request', async () => {
      const iter = resource.listAllCombinations({ limit: 0 });
      await expect(iter.next()).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('yields nothing when first page has empty results and no cursor', async () => {
      transport.respondWith({ results: [], cursor: null });
      const items = [];
      for await (const item of resource.listAllCombinations()) {
        items.push(item);
      }
      expect(items).toHaveLength(0);
    });

    it('terminates when a misbehaving tenant returns the same non-null cursor (stuck-cursor guard)', async () => {
      // Page 1: cursor 'stuck'
      transport
        .respondWith({ results: [makeCombination('c1')], cursor: 'stuck' })
        // Page 2: same cursor 'stuck' — should trigger break, not loop again
        .respondWith({ results: [makeCombination('c2')], cursor: 'stuck' });

      const items: { combinationId: string }[] = [];
      for await (const item of resource.listAllCombinations()) {
        items.push(item);
      }

      // Must terminate (not hang) and stop after exactly 2 requests
      expect(transport.calls).toHaveLength(2);
      expect(items.map((i) => i.combinationId)).toEqual(['c1', 'c2']);
    });

    it('terminates when a page returns zero results even if cursor is non-null (empty-page guard)', async () => {
      // Page 1: has items + non-null cursor; page 2: empty results with a cursor
      transport
        .respondWith({ results: [makeCombination('c1')], cursor: 'next' })
        .respondWith({ results: [], cursor: 'next' });

      const items: { combinationId: string }[] = [];
      for await (const item of resource.listAllCombinations()) {
        items.push(item);
      }

      expect(transport.calls).toHaveLength(2);
      expect(items.map((i) => i.combinationId)).toEqual(['c1']);
    });
  });

  // ── generateCombinations (B1033) ──────────────────────────────────────────

  describe('generateCombinations()', () => {
    const taskResponse = {
      taskId: 'task-gen',
      status: 'IN_PROGRESS' as const,
      statusUrl: 'https://example.atlassian.net/status/task-gen',
    };

    it('calls POST /space-permissions/transition/combinations with no body', async () => {
      transport.respondWith(taskResponse);

      const result = await resource.generateCombinations();

      expect(result).toEqual(taskResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/space-permissions/transition/combinations`,
      });
      expect(transport.lastCall?.options.body).toBeUndefined();
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('server-err'));
      await expect(resource.generateCombinations()).rejects.toThrow('server-err');
    });
  });

  // ── bulkAssignRoles (B1034) ────────────────────────────────────────────────

  describe('bulkAssignRoles()', () => {
    const taskResponse = {
      taskId: 'task-assign',
      status: 'IN_PROGRESS' as const,
      statusUrl: 'https://example.atlassian.net/status/task-assign',
    };

    const requestBody: BulkAssignRolesRequest = {
      assignments: [
        {
          permissionCombinationId: 'combo-abc',
          principalTypeAssignments: [
            { principalType: 'USER', removeAccess: false, roleId: 'role-uuid' },
          ],
        },
      ],
      spaceSelection: { spaceType: 'ALL_EXCEPT_PERSONAL' },
    };

    it('calls POST /space-permissions/transition/role-assignments with body', async () => {
      transport.respondWith(taskResponse);

      const result = await resource.bulkAssignRoles(requestBody);

      expect(result).toEqual(taskResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/space-permissions/transition/role-assignments`,
        body: requestBody,
      });
    });

    it('handles removeAccess: true case', async () => {
      transport.respondWith(taskResponse);
      const data: BulkAssignRolesRequest = {
        assignments: [
          {
            permissionCombinationId: 'combo-xyz',
            principalTypeAssignments: [{ principalType: 'GROUP', removeAccess: true }],
          },
        ],
        spaceSelection: { spaceType: 'PERSONAL' },
      };
      await resource.bulkAssignRoles(data);
      expect(transport.lastCall?.options.body).toEqual(data);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('assign-err'));
      await expect(resource.bulkAssignRoles(requestBody)).rejects.toThrow('assign-err');
    });
  });

  // ── getTransitionTaskStatus (B1035) ───────────────────────────────────────

  describe('getTransitionTaskStatus()', () => {
    it('calls GET /space-permissions/transition/tasks/{taskId}', async () => {
      const statusResponse = { taskId: 'task-123', status: 'COMPLETED' as const };
      transport.respondWith(statusResponse);

      const result = await resource.getTransitionTaskStatus('task-123');

      expect(result).toEqual(statusResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/space-permissions/transition/tasks/task-123`,
      });
    });

    it('URL-encodes the taskId path segment', async () => {
      transport.respondWith({ taskId: 'task/special', status: 'FAILED' as const });
      await resource.getTransitionTaskStatus('task/special');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/space-permissions/transition/tasks/task%2Fspecial`,
      );
    });

    it('returns FAILED status with errorMessage', async () => {
      const failedResponse = {
        taskId: 'task-fail',
        status: 'FAILED' as const,
        errorMessage: 'Something went wrong',
      };
      transport.respondWith(failedResponse);
      const result = await resource.getTransitionTaskStatus('task-fail');
      expect(result).toEqual(failedResponse);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('not-found'));
      await expect(resource.getTransitionTaskStatus('missing')).rejects.toThrow('not-found');
    });
  });
});
