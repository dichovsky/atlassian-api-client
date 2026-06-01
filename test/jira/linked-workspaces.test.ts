import { describe, it, expect, beforeEach } from 'vitest';
import { LinkedWorkspacesResource } from '../../src/jira/resources/linked-workspaces.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const OPERATIONS_BASE_URL = 'https://test.atlassian.net/rest/operations/1.0';
const SECURITY_BASE_URL = 'https://test.atlassian.net/rest/security/1.0';

describe('LinkedWorkspacesResource', () => {
  let transport: MockTransport;
  let resource: LinkedWorkspacesResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new LinkedWorkspacesResource(transport, OPERATIONS_BASE_URL, SECURITY_BASE_URL);
  });

  // ── listOperations ────────────────────────────────────────────────────────

  describe('listOperations()', () => {
    it('calls GET /linkedWorkspaces on the operations base URL and returns the response', async () => {
      // Arrange
      const expected = { workspaceIds: ['ws-1', 'ws-2'] };
      transport.respondWith(expected);

      // Act
      const result = await resource.listOperations();

      // Assert
      expect(result).toEqual(expected);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${OPERATIONS_BASE_URL}/linkedWorkspaces`,
      });
    });

    it('returns an empty object when no workspaceIds present', async () => {
      // Arrange
      transport.respondWith({});

      // Act
      const result = await resource.listOperations();

      // Assert
      expect(result).toEqual({});
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(resource.listOperations()).rejects.toThrow('network error');
    });
  });

  // ── bulkDeleteOperations ──────────────────────────────────────────────────

  describe('bulkDeleteOperations()', () => {
    it('calls DELETE /linkedWorkspaces/bulk with workspaceIds query param', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await resource.bulkDeleteOperations('ws-1,ws-2');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${OPERATIONS_BASE_URL}/linkedWorkspaces/bulk`,
        query: { workspaceIds: 'ws-1,ws-2' },
      });
    });

    it('throws ValidationError when workspaceIds is empty', async () => {
      // Act / Assert
      await expect(resource.bulkDeleteOperations('')).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when workspaceIds is only whitespace', async () => {
      // Act / Assert
      await expect(resource.bulkDeleteOperations('   ')).rejects.toThrow(ValidationError);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(resource.bulkDeleteOperations('ws-1')).rejects.toThrow('forbidden');
    });
  });

  // ── bulkCreateOperations ──────────────────────────────────────────────────

  describe('bulkCreateOperations()', () => {
    it('calls POST /linkedWorkspaces/bulk with body and returns acceptedWorkspaceIds', async () => {
      // Arrange
      const expected = { acceptedWorkspaceIds: ['ws-1', 'ws-2'] };
      transport.respondWith(expected);

      // Act
      const result = await resource.bulkCreateOperations({ workspaceIds: ['ws-1', 'ws-2'] });

      // Assert
      expect(result).toEqual(expected);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${OPERATIONS_BASE_URL}/linkedWorkspaces/bulk`,
        body: { workspaceIds: ['ws-1', 'ws-2'] },
      });
    });

    it('throws ValidationError when workspaceIds is empty', async () => {
      // Act / Assert
      await expect(resource.bulkCreateOperations({ workspaceIds: [] })).rejects.toThrow(
        ValidationError,
      );
    });

    it('returns response with partial acceptedWorkspaceIds', async () => {
      // Arrange
      transport.respondWith({ acceptedWorkspaceIds: ['ws-1'] });

      // Act
      const result = await resource.bulkCreateOperations({ workspaceIds: ['ws-1', 'ws-invalid'] });

      // Assert
      expect(result.acceptedWorkspaceIds).toEqual(['ws-1']);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(resource.bulkCreateOperations({ workspaceIds: ['ws-1'] })).rejects.toThrow(
        'server error',
      );
    });
  });

  // ── listSecurity ──────────────────────────────────────────────────────────

  describe('listSecurity()', () => {
    it('calls GET /linkedWorkspaces on the security base URL and returns the response', async () => {
      // Arrange
      const expected = { workspaceIds: ['ws-3', 'ws-4'] };
      transport.respondWith(expected);

      // Act
      const result = await resource.listSecurity();

      // Assert
      expect(result).toEqual(expected);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${SECURITY_BASE_URL}/linkedWorkspaces`,
      });
    });

    it('returns an empty object when no workspaceIds present', async () => {
      // Arrange
      transport.respondWith({});

      // Act
      const result = await resource.listSecurity();

      // Assert
      expect(result).toEqual({});
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('unauthorized'));

      // Act / Assert
      await expect(resource.listSecurity()).rejects.toThrow('unauthorized');
    });
  });

  // ── getSecurity ───────────────────────────────────────────────────────────

  describe('getSecurity()', () => {
    it('calls GET /linkedWorkspaces/{workspaceId} and returns the workspace', async () => {
      // Arrange
      const expected = { workspaceId: 'ws-1', updatedAt: '2024-01-01T00:00:00Z' };
      transport.respondWith(expected);

      // Act
      const result = await resource.getSecurity('ws-1');

      // Assert
      expect(result).toEqual(expected);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${SECURITY_BASE_URL}/linkedWorkspaces/ws-1`,
      });
    });

    it('URL-encodes the workspaceId', async () => {
      // Arrange
      transport.respondWith({ workspaceId: 'ws/special' });

      // Act
      await resource.getSecurity('ws/special');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${SECURITY_BASE_URL}/linkedWorkspaces/ws%2Fspecial`,
      );
    });

    it('returns a workspace with only workspaceId when updatedAt is absent', async () => {
      // Arrange
      transport.respondWith({ workspaceId: 'ws-2' });

      // Act
      const result = await resource.getSecurity('ws-2');

      // Assert
      expect(result.workspaceId).toBe('ws-2');
      expect(result.updatedAt).toBeUndefined();
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(resource.getSecurity('ws-missing')).rejects.toThrow('not found');
    });
  });

  // ── bulkDeleteSecurity ────────────────────────────────────────────────────

  describe('bulkDeleteSecurity()', () => {
    it('calls DELETE /linkedWorkspaces/bulk on the security base URL', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await resource.bulkDeleteSecurity('ws-1,ws-2');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${SECURITY_BASE_URL}/linkedWorkspaces/bulk`,
        query: { workspaceIds: 'ws-1,ws-2' },
      });
    });

    it('throws ValidationError when workspaceIds is empty', async () => {
      // Act / Assert
      await expect(resource.bulkDeleteSecurity('')).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when workspaceIds is only whitespace', async () => {
      // Act / Assert
      await expect(resource.bulkDeleteSecurity('  ')).rejects.toThrow(ValidationError);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(resource.bulkDeleteSecurity('ws-1')).rejects.toThrow('forbidden');
    });
  });

  // ── bulkCreateSecurity ────────────────────────────────────────────────────

  describe('bulkCreateSecurity()', () => {
    it('calls POST /linkedWorkspaces/bulk on the security base URL and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await resource.bulkCreateSecurity({ workspaceIds: ['ws-1', 'ws-2'] });

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${SECURITY_BASE_URL}/linkedWorkspaces/bulk`,
        body: { workspaceIds: ['ws-1', 'ws-2'] },
      });
    });

    it('throws ValidationError when workspaceIds is empty', async () => {
      // Act / Assert
      await expect(resource.bulkCreateSecurity({ workspaceIds: [] })).rejects.toThrow(
        ValidationError,
      );
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(resource.bulkCreateSecurity({ workspaceIds: ['ws-1'] })).rejects.toThrow(
        'server error',
      );
    });
  });
});
