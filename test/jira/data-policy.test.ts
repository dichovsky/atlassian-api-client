import { describe, it, expect, beforeEach } from 'vitest';
import type { ProjectDataPolicies } from '../../src/jira/resources/data-policy.js';
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

  // ── getPolicies (B1055/5) ─────────────────────────────────────────────────
  // The spec endpoint GET /rest/api/3/data-policy/project (getPolicies) is
  // NON-paginated — it returns ProjectDataPolicies with no total/startAt/maxResults.

  describe('getPolicies()', () => {
    const makeResponse = (ids: string[]): ProjectDataPolicies => ({
      projectDataPolicies: ids.map((id) => ({ id: Number(id), dataPolicy: { anyContentBlocked: false } })),
    });

    it('calls GET /data-policy/project with no params (B1055/5)', async () => {
      // Arrange — non-paginated endpoint; no startAt/maxResults query params
      const response = makeResponse(['10001']);
      transport.respondWith(response);

      // Act
      const result = await dataPolicy.getPolicies();

      // Assert
      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/data-policy/project`,
      });
      // must NOT send pagination query params
      const query = transport.lastCall?.options.query ?? {};
      expect(query).not.toHaveProperty('startAt');
      expect(query).not.toHaveProperty('maxResults');
    });

    it('sends ids as a comma-separated query param', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await dataPolicy.getPolicies({ ids: ['10001', '10002'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ ids: '10001,10002' });
    });

    it('omits ids from query when ids array is empty', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await dataPolicy.getPolicies({ ids: [] });

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query).not.toHaveProperty('ids');
    });

    it('omits query entirely when no params given', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await dataPolicy.getPolicies();

      // Assert
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('returns the projectDataPolicies array from the response', async () => {
      // Arrange
      const response: ProjectDataPolicies = {
        projectDataPolicies: [
          { id: 10001, dataPolicy: { anyContentBlocked: true } },
          { id: 10002, dataPolicy: { anyContentBlocked: false } },
        ],
      };
      transport.respondWith(response);

      // Act
      const result = await dataPolicy.getPolicies();

      // Assert
      expect(result.projectDataPolicies).toHaveLength(2);
      expect(result.projectDataPolicies?.[0]?.id).toBe(10001);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(dataPolicy.getPolicies()).rejects.toThrow('server error');
    });
  });
});
