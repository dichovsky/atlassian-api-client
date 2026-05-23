import { describe, it, expect, beforeEach } from 'vitest';
import { DataPolicyResource } from '../../src/jira/resources/data-policy.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('DataPolicyResource', () => {
  let transport: MockTransport;
  let dataPolicy: DataPolicyResource;

  beforeEach(() => {
    transport = new MockTransport();
    dataPolicy = new DataPolicyResource(transport, BASE_URL);
  });

  // ── getWorkspacePolicy ────────────────────────────────────────────────────

  describe('getWorkspacePolicy()', () => {
    it('calls GET /data-policy and returns workspace policy', async () => {
      // Arrange
      const policy = { anyContentBlocked: false };
      transport.respondWith(policy);

      // Act
      const result = await dataPolicy.getWorkspacePolicy();

      // Assert
      expect(result).toEqual(policy);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/data-policy`,
      });
    });

    it('returns anyContentBlocked: true when workspace blocks content', async () => {
      // Arrange
      transport.respondWith({ anyContentBlocked: true });

      // Act
      const result = await dataPolicy.getWorkspacePolicy();

      // Assert
      expect(result.anyContentBlocked).toBe(true);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(dataPolicy.getWorkspacePolicy()).rejects.toThrow('network error');
    });
  });

  // ── listProjectPolicies ───────────────────────────────────────────────────

  describe('listProjectPolicies()', () => {
    const makeResponse = (values: { projectId: string; anyContentBlocked: boolean }[]) => ({
      values,
      startAt: 0,
      maxResults: 50,
      total: values.length,
      isLast: true,
    });

    it('calls GET /data-policy/project with no params', async () => {
      // Arrange
      const response = makeResponse([{ projectId: '10001', anyContentBlocked: false }]);
      transport.respondWith(response);

      // Act
      const result = await dataPolicy.listProjectPolicies();

      // Assert
      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/data-policy/project`,
      });
    });

    it('sends ids as a comma-separated query param', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await dataPolicy.listProjectPolicies({ ids: ['10001', '10002'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ ids: '10001,10002' });
    });

    it('sends startAt and maxResults query params', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await dataPolicy.listProjectPolicies({ startAt: 10, maxResults: 25 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('sends all params together', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await dataPolicy.listProjectPolicies({ ids: ['10001'], startAt: 0, maxResults: 10 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        ids: '10001',
        startAt: 0,
        maxResults: 10,
      });
    });

    it('omits ids from query when ids array is empty', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await dataPolicy.listProjectPolicies({ ids: [] });

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query).not.toHaveProperty('ids');
    });

    it('throws RangeError for invalid maxResults', async () => {
      // Act / Assert
      await expect(dataPolicy.listProjectPolicies({ maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(dataPolicy.listProjectPolicies()).rejects.toThrow('server error');
    });

    it('returns paginated response shape correctly', async () => {
      // Arrange
      const response = {
        values: [
          { projectId: '10001', anyContentBlocked: true },
          { projectId: '10002', anyContentBlocked: false },
        ],
        startAt: 0,
        maxResults: 50,
        total: 2,
        isLast: true,
      };
      transport.respondWith(response);

      // Act
      const result = await dataPolicy.listProjectPolicies();

      // Assert
      expect(result.values).toHaveLength(2);
      const first = result.values[0]!;
      expect(first.projectId).toBe('10001');
      expect(first.anyContentBlocked).toBe(true);
    });
  });

  // ── listAllProjectPolicies ────────────────────────────────────────────────

  describe('listAllProjectPolicies()', () => {
    it('yields all items from a single page', async () => {
      // Arrange
      transport.respondWith({
        values: [
          { projectId: '10001', anyContentBlocked: false },
          { projectId: '10002', anyContentBlocked: true },
        ],
        startAt: 0,
        maxResults: 50,
        total: 2,
        isLast: true,
      });

      // Act
      const results: { projectId: string; anyContentBlocked: boolean }[] = [];
      for await (const item of dataPolicy.listAllProjectPolicies()) {
        results.push(item);
      }

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]!.projectId).toBe('10001');
      expect(results[1]!.projectId).toBe('10002');
    });

    it('paginates across multiple pages', async () => {
      // Arrange — two pages of 1 item each
      transport
        .respondWith({
          values: [{ projectId: '10001', anyContentBlocked: false }],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [{ projectId: '10002', anyContentBlocked: true }],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      // Act
      const results: { projectId: string; anyContentBlocked: boolean }[] = [];
      for await (const item of dataPolicy.listAllProjectPolicies({ maxResults: 1 })) {
        results.push(item);
      }

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]!.projectId).toBe('10001');
      expect(results[1]!.projectId).toBe('10002');
    });

    it('passes ids query param when provided', async () => {
      // Arrange
      transport.respondWith({
        values: [{ projectId: '10001', anyContentBlocked: false }],
        startAt: 0,
        maxResults: 50,
        total: 1,
        isLast: true,
      });

      // Act
      const results: { projectId: string; anyContentBlocked: boolean }[] = [];
      for await (const item of dataPolicy.listAllProjectPolicies({ ids: ['10001', '10002'] })) {
        results.push(item);
      }

      // Assert
      expect(results).toHaveLength(1);
      expect(transport.lastCall?.options.query).toMatchObject({ ids: '10001,10002' });
    });

    it('yields nothing for an empty response', async () => {
      // Arrange
      transport.respondWith({
        values: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
        isLast: true,
      });

      // Act
      const results: { projectId: string; anyContentBlocked: boolean }[] = [];
      for await (const item of dataPolicy.listAllProjectPolicies()) {
        results.push(item);
      }

      // Assert
      expect(results).toHaveLength(0);
    });

    it('propagates transport errors during iteration', async () => {
      // Arrange
      transport.respondWithError(new Error('network failure'));

      // Act / Assert
      await expect(async () => {
        for await (const _ of dataPolicy.listAllProjectPolicies()) {
          // consume
        }
      }).rejects.toThrow('network failure');
    });
  });
});
