import { describe, it, expect, beforeEach } from 'vitest';
import {
  BulkByPropertiesResource,
  type BulkByPropertiesBaseUrls,
} from '../../src/jira/resources/bulk-by-properties.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASES: BulkByPropertiesBaseUrls = {
  builds: 'https://test.atlassian.net/rest/builds/0.1',
  deployments: 'https://test.atlassian.net/rest/deployments/0.1',
  devinfo: 'https://test.atlassian.net/rest/devinfo/0.10',
  devopscomponents: 'https://test.atlassian.net/rest/devopscomponents/1.0',
  featureflags: 'https://test.atlassian.net/rest/featureflags/0.1',
  operations: 'https://test.atlassian.net/rest/operations/1.0',
  remotelinks: 'https://test.atlassian.net/rest/remotelinks/1.0',
  security: 'https://test.atlassian.net/rest/security/1.0',
};

describe('BulkByPropertiesResource', () => {
  let transport: MockTransport;
  let resource: BulkByPropertiesResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new BulkByPropertiesResource(transport, BASES);
  });

  // ── deleteBuildsByProperties (B953) ───────────────────────────────────────

  describe('deleteBuildsByProperties()', () => {
    it('sends DELETE to /rest/builds/0.1/bulkByProperties with property query params', async () => {
      transport.respondWith(undefined, 202);
      await resource.deleteBuildsByProperties({ properties: { accountId: 'account-123' } });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASES.builds}/bulkByProperties`,
        query: { accountId: 'account-123' },
      });
    });

    it('merges multiple properties with AND logic (all appear in query)', async () => {
      transport.respondWith(undefined, 202);
      await resource.deleteBuildsByProperties({
        properties: { accountId: 'acc-1', createdBy: 'user-456' },
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        accountId: 'acc-1',
        createdBy: 'user-456',
      });
    });

    it('returns void (no response body)', async () => {
      transport.respondWith(undefined, 202);
      const result = await resource.deleteBuildsByProperties({
        properties: { accountId: 'acc-1' },
      });
      expect(result).toBeUndefined();
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('unauthorized'));
      await expect(
        resource.deleteBuildsByProperties({ properties: { accountId: 'acc-1' } }),
      ).rejects.toThrow('unauthorized');
    });

    it('converts numeric property values to strings', async () => {
      transport.respondWith(undefined, 202);
      await resource.deleteBuildsByProperties({ properties: { sequence: 42 } });

      expect(transport.lastCall?.options.query).toMatchObject({ sequence: '42' });
    });

    it('throws and sends no request when properties is empty', async () => {
      await expect(resource.deleteBuildsByProperties({ properties: {} })).rejects.toThrow(
        'at least one property',
      );
      expect(transport.lastCall).toBeUndefined();
    });
  });

  // ── deleteDeploymentsByProperties (B957) ──────────────────────────────────

  describe('deleteDeploymentsByProperties()', () => {
    it('sends DELETE to /rest/deployments/0.1/bulkByProperties', async () => {
      transport.respondWith(undefined, 202);
      await resource.deleteDeploymentsByProperties({ properties: { accountId: 'account-123' } });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASES.deployments}/bulkByProperties`,
        query: { accountId: 'account-123' },
      });
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('forbidden'));
      await expect(
        resource.deleteDeploymentsByProperties({ properties: { accountId: 'acc-1' } }),
      ).rejects.toThrow('forbidden');
    });
  });

  // ── deleteDevInfoByProperties (B962) ──────────────────────────────────────

  describe('deleteDevInfoByProperties()', () => {
    it('sends DELETE to /rest/devinfo/0.10/bulkByProperties', async () => {
      transport.respondWith(undefined, 202);
      await resource.deleteDevInfoByProperties({ properties: { accountId: 'account-123' } });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASES.devinfo}/bulkByProperties`,
        query: { accountId: 'account-123' },
      });
    });

    it('merges multiple properties', async () => {
      transport.respondWith(undefined, 202);
      await resource.deleteDevInfoByProperties({
        properties: { accountId: 'acc-1', repoId: 'repo-99' },
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        accountId: 'acc-1',
        repoId: 'repo-99',
      });
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('rate limited'));
      await expect(
        resource.deleteDevInfoByProperties({ properties: { accountId: 'acc-1' } }),
      ).rejects.toThrow('rate limited');
    });
  });

  // ── deleteDevOpsComponentsByProperties (B968) ─────────────────────────────

  describe('deleteDevOpsComponentsByProperties()', () => {
    it('sends DELETE to /rest/devopscomponents/1.0/bulkByProperties', async () => {
      transport.respondWith(undefined, 202);
      await resource.deleteDevOpsComponentsByProperties({
        properties: { componentId: 'comp-1' },
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASES.devopscomponents}/bulkByProperties`,
        query: { componentId: 'comp-1' },
      });
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('timeout'));
      await expect(
        resource.deleteDevOpsComponentsByProperties({ properties: { componentId: 'comp-1' } }),
      ).rejects.toThrow('timeout');
    });
  });

  // ── deleteFeatureFlagsByProperties (B972) ─────────────────────────────────

  describe('deleteFeatureFlagsByProperties()', () => {
    it('sends DELETE to /rest/featureflags/0.1/bulkByProperties', async () => {
      transport.respondWith(undefined, 202);
      await resource.deleteFeatureFlagsByProperties({ properties: { accountId: 'acc-1' } });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASES.featureflags}/bulkByProperties`,
        query: { accountId: 'acc-1' },
      });
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('service unavailable'));
      await expect(
        resource.deleteFeatureFlagsByProperties({ properties: { accountId: 'acc-1' } }),
      ).rejects.toThrow('service unavailable');
    });
  });

  // ── deleteOperationsByProperties (B981) ───────────────────────────────────

  describe('deleteOperationsByProperties()', () => {
    it('sends DELETE to /rest/operations/1.0/bulkByProperties', async () => {
      transport.respondWith(undefined, 202);
      await resource.deleteOperationsByProperties({ properties: { accountId: 'acc-1' } });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASES.operations}/bulkByProperties`,
        query: { accountId: 'acc-1' },
      });
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('not found'));
      await expect(
        resource.deleteOperationsByProperties({ properties: { accountId: 'acc-1' } }),
      ).rejects.toThrow('not found');
    });
  });

  // ── deleteRemoteLinksByProperties (B990) ──────────────────────────────────

  describe('deleteRemoteLinksByProperties()', () => {
    it('sends DELETE to /rest/remotelinks/1.0/bulkByProperties', async () => {
      transport.respondWith(undefined, 202);
      await resource.deleteRemoteLinksByProperties({ properties: { accountId: 'acc-1' } });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASES.remotelinks}/bulkByProperties`,
        query: { accountId: 'acc-1' },
      });
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('connection refused'));
      await expect(
        resource.deleteRemoteLinksByProperties({ properties: { accountId: 'acc-1' } }),
      ).rejects.toThrow('connection refused');
    });
  });

  // ── deleteSecurityByProperties (B994) ─────────────────────────────────────

  describe('deleteSecurityByProperties()', () => {
    it('sends DELETE to /rest/security/1.0/bulkByProperties', async () => {
      transport.respondWith(undefined, 202);
      await resource.deleteSecurityByProperties({ properties: { accountId: 'acc-1' } });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASES.security}/bulkByProperties`,
        query: { accountId: 'acc-1' },
      });
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('bad request'));
      await expect(
        resource.deleteSecurityByProperties({ properties: { accountId: 'acc-1' } }),
      ).rejects.toThrow('bad request');
    });
  });
});
