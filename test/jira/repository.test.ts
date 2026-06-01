import { describe, it, expect, beforeEach } from 'vitest';
import { RepositoryResource } from '../../src/jira/resources/repository.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/devinfo/0.10';

describe('RepositoryResource', () => {
  let transport: MockTransport;
  let repository: RepositoryResource;

  beforeEach(() => {
    transport = new MockTransport();
    repository = new RepositoryResource(transport, BASE_URL);
  });

  // ── get ────────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /repository/{repositoryId} and returns the repository', async () => {
      // Arrange
      const repoData = {
        id: 'repo-1',
        name: 'My Repo',
        commits: [],
        branches: [],
        pullRequests: [],
      };
      transport.respondWith(repoData);

      // Act
      const result = await repository.get('repo-1');

      // Assert
      expect(result).toEqual(repoData);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/repository/repo-1`,
      });
    });

    it('encodes special characters in repositoryId', async () => {
      // Arrange
      transport.respondWith({ id: 'my repo/123' });

      // Act
      await repository.get('my repo/123');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/repository/my%20repo%2F123`);
    });

    it('throws when repositoryId is empty', async () => {
      await expect(repository.get('')).rejects.toThrow('repositoryId is required');
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(repository.get('repo-1')).rejects.toThrow('not found');
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /repository/{repositoryId} with no query params', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await repository.delete('repo-1');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/repository/repo-1`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('includes _updateSequenceId when provided', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await repository.delete('repo-1', { updateSequenceId: 42 });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ _updateSequenceId: '42' });
    });

    it('throws when updateSequenceId is a negative integer', async () => {
      await expect(repository.delete('repo-1', { updateSequenceId: -1 })).rejects.toThrow(
        'updateSequenceId must be a non-negative integer',
      );
    });

    it('throws when updateSequenceId is not an integer (float/NaN)', async () => {
      await expect(repository.delete('repo-1', { updateSequenceId: 1.5 })).rejects.toThrow(
        'updateSequenceId must be a non-negative integer',
      );
      await expect(repository.delete('repo-1', { updateSequenceId: Number.NaN })).rejects.toThrow(
        'updateSequenceId must be a non-negative integer',
      );
    });

    it('encodes special characters in repositoryId', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await repository.delete('my repo/123');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/repository/my%20repo%2F123`);
    });

    it('throws when repositoryId is empty', async () => {
      await expect(repository.delete('')).rejects.toThrow('repositoryId is required');
    });

    it('returns void on success', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await repository.delete('repo-1');

      // Assert
      expect(result).toBeUndefined();
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(repository.delete('repo-1')).rejects.toThrow('forbidden');
    });
  });

  // ── deleteEntity ───────────────────────────────────────────────────────────

  describe('deleteEntity()', () => {
    it('calls DELETE /repository/{repositoryId}/{entityType}/{entityId}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await repository.deleteEntity('repo-1', 'commit', 'abc123');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/repository/repo-1/commit/abc123`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('includes _updateSequenceId when provided', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await repository.deleteEntity('repo-1', 'pullRequest', 'pr-1', { updateSequenceId: 99 });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ _updateSequenceId: '99' });
    });

    it('encodes special characters in all path segments', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await repository.deleteEntity('my repo', 'pull/Request', 'pr 1');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/repository/my%20repo/pull%2FRequest/pr%201`,
      );
    });

    it('throws when repositoryId is empty', async () => {
      await expect(repository.deleteEntity('', 'commit', 'abc123')).rejects.toThrow(
        'repositoryId is required',
      );
    });

    it('throws when entityType is empty', async () => {
      await expect(repository.deleteEntity('repo-1', '', 'abc123')).rejects.toThrow(
        'entityType is required',
      );
    });

    it('throws when entityId is empty', async () => {
      await expect(repository.deleteEntity('repo-1', 'commit', '')).rejects.toThrow(
        'entityId is required',
      );
    });

    it('returns void on success', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await repository.deleteEntity('repo-1', 'branch', 'feat-1');

      // Assert
      expect(result).toBeUndefined();
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('rate limited'));

      // Act / Assert
      await expect(repository.deleteEntity('repo-1', 'commit', 'abc')).rejects.toThrow(
        'rate limited',
      );
    });
  });
});
