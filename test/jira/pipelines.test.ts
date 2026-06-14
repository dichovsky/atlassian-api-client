import { describe, it, expect, beforeEach } from 'vitest';
import type {
  Build,
  Deployment,
  DeploymentGatingStatus,
} from '../../src/jira/resources/pipelines.js';
import { PipelinesResource } from '../../src/jira/resources/pipelines.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BUILDS_BASE_URL = 'https://test.atlassian.net/rest/builds/0.1';
const DEPLOYMENTS_BASE_URL = 'https://test.atlassian.net/rest/deployments/0.1';

const makeBuild = (overrides?: Partial<{ pipelineId: string; buildNumber: number }>): Build => ({
  schemaVersion: '1.0',
  pipelineId: overrides?.pipelineId ?? 'pipeline-abc',
  buildNumber: overrides?.buildNumber ?? 42,
  updateSequenceNumber: 1,
  displayName: 'Build #42',
  description: 'Successful build',
  label: 'v1.0.0',
  url: 'https://ci.example.com/builds/42',
  state: 'successful',
  lastUpdated: '2024-01-15T10:00:00.000Z',
  issueKeys: ['PROJ-1', 'PROJ-2'],
});

const makeDeployment = (
  overrides?: Partial<{
    pipelineId: string;
    environmentId: string;
    deploymentSequenceNumber: number;
  }>,
): Deployment => ({
  deploymentSequenceNumber: overrides?.deploymentSequenceNumber ?? 7,
  updateSequenceNumber: 1,
  displayName: 'Deployment #7',
  url: 'https://ci.example.com/deployments/7',
  description: 'Production deployment',
  lastUpdated: '2024-01-15T11:00:00.000Z',
  state: 'successful',
  pipeline: {
    id: overrides?.pipelineId ?? 'pipeline-abc',
    displayName: 'My Pipeline',
    url: 'https://ci.example.com/pipelines/abc',
  },
  environment: {
    id: overrides?.environmentId ?? 'env-prod',
    displayName: 'Production',
    type: 'production',
  },
  issueKeys: ['PROJ-3'],
  schemaVersion: '1.0',
});

const makeGatingStatus = (): DeploymentGatingStatus => ({
  deploymentSequenceNumber: 7,
  pipelineId: 'pipeline-abc',
  environmentId: 'env-prod',
  gatingStatus: 'awaiting',
  updatedTimestamp: '2024-01-15T11:05:00.000Z',
  details: [
    {
      type: 'issue',
      issueKey: 'PROJ-42',
      issueLink: 'https://example.atlassian.net/browse/PROJ-42',
    },
  ],
});

describe('PipelinesResource', () => {
  let transport: MockTransport;
  let pipelines: PipelinesResource;

  beforeEach(() => {
    transport = new MockTransport();
    pipelines = new PipelinesResource(transport, BUILDS_BASE_URL, DEPLOYMENTS_BASE_URL);
  });

  // ── getBuild ──────────────────────────────────────────────────────────────

  describe('getBuild()', () => {
    it('calls GET /pipelines/{pipelineId}/builds/{buildNumber} and returns build data', async () => {
      // Arrange
      const build = makeBuild();
      transport.respondWith(build);

      // Act
      const result = await pipelines.getBuild('pipeline-abc', 42);

      // Assert
      expect(result).toEqual(build);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BUILDS_BASE_URL}/pipelines/pipeline-abc/builds/42`,
      });
    });

    it('encodes special characters in pipelineId', async () => {
      // Arrange
      transport.respondWith(makeBuild({ pipelineId: 'pipe/line' }));

      // Act
      await pipelines.getBuild('pipe/line', 1);

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BUILDS_BASE_URL}/pipelines/pipe%2Fline/builds/1`,
      );
    });

    it('rejects dot-segment pipelineId with ValidationError', async () => {
      // Act / Assert
      await expect(pipelines.getBuild('..', 1)).rejects.toThrow(ValidationError);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(pipelines.getBuild('pipeline-abc', 99)).rejects.toThrow('not found');
    });
  });

  // ── deleteBuild ───────────────────────────────────────────────────────────

  describe('deleteBuild()', () => {
    it('calls DELETE /pipelines/{pipelineId}/builds/{buildNumber} and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await pipelines.deleteBuild('pipeline-abc', 42);

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BUILDS_BASE_URL}/pipelines/pipeline-abc/builds/42`,
      });
    });

    it('encodes special characters in pipelineId', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await pipelines.deleteBuild('pipe/line', 5);

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BUILDS_BASE_URL}/pipelines/pipe%2Fline/builds/5`,
      );
    });

    it('rejects dot-segment pipelineId with ValidationError', async () => {
      // Act / Assert
      await expect(pipelines.deleteBuild('..', 1)).rejects.toThrow(ValidationError);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(pipelines.deleteBuild('pipeline-abc', 42)).rejects.toThrow('forbidden');
    });
  });

  // ── getDeployment ─────────────────────────────────────────────────────────

  describe('getDeployment()', () => {
    it('calls GET /pipelines/{pipelineId}/environments/{envId}/deployments/{dsn} and returns deployment', async () => {
      // Arrange
      const deployment = makeDeployment();
      transport.respondWith(deployment);

      // Act
      const result = await pipelines.getDeployment('pipeline-abc', 'env-prod', 7);

      // Assert
      expect(result).toEqual(deployment);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${DEPLOYMENTS_BASE_URL}/pipelines/pipeline-abc/environments/env-prod/deployments/7`,
      });
    });

    it('encodes special characters in pipelineId and environmentId', async () => {
      // Arrange
      transport.respondWith(makeDeployment());

      // Act
      await pipelines.getDeployment('pipe/line', 'env/prod', 3);

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${DEPLOYMENTS_BASE_URL}/pipelines/pipe%2Fline/environments/env%2Fprod/deployments/3`,
      );
    });

    it('rejects dot-segment pipelineId with ValidationError', async () => {
      // Act / Assert
      await expect(pipelines.getDeployment('..', 'env-prod', 1)).rejects.toThrow(ValidationError);
    });

    it('rejects dot-segment environmentId with ValidationError', async () => {
      // Act / Assert
      await expect(pipelines.getDeployment('pipeline-abc', '..', 1)).rejects.toThrow(
        ValidationError,
      );
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(pipelines.getDeployment('pipeline-abc', 'env-prod', 7)).rejects.toThrow(
        'not found',
      );
    });
  });

  // ── deleteDeployment ──────────────────────────────────────────────────────

  describe('deleteDeployment()', () => {
    it('calls DELETE /pipelines/{pipelineId}/environments/{envId}/deployments/{dsn} and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await pipelines.deleteDeployment('pipeline-abc', 'env-prod', 7);

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${DEPLOYMENTS_BASE_URL}/pipelines/pipeline-abc/environments/env-prod/deployments/7`,
      });
    });

    it('encodes special characters in pipelineId and environmentId', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await pipelines.deleteDeployment('pipe/line', 'env/stage', 10);

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${DEPLOYMENTS_BASE_URL}/pipelines/pipe%2Fline/environments/env%2Fstage/deployments/10`,
      );
    });

    it('rejects dot-segment pipelineId with ValidationError', async () => {
      // Act / Assert
      await expect(pipelines.deleteDeployment('..', 'env-prod', 1)).rejects.toThrow(
        ValidationError,
      );
    });

    it('rejects dot-segment environmentId with ValidationError', async () => {
      // Act / Assert
      await expect(pipelines.deleteDeployment('pipeline-abc', '.', 1)).rejects.toThrow(
        ValidationError,
      );
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('service unavailable'));

      // Act / Assert
      await expect(pipelines.deleteDeployment('pipeline-abc', 'env-prod', 7)).rejects.toThrow(
        'service unavailable',
      );
    });
  });

  // ── getDeploymentGatingStatus ─────────────────────────────────────────────

  describe('getDeploymentGatingStatus()', () => {
    it('calls GET .../gating-status and returns gating status', async () => {
      // Arrange
      const gatingStatus = makeGatingStatus();
      transport.respondWith(gatingStatus);

      // Act
      const result = await pipelines.getDeploymentGatingStatus('pipeline-abc', 'env-prod', 7);

      // Assert
      expect(result).toEqual(gatingStatus);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${DEPLOYMENTS_BASE_URL}/pipelines/pipeline-abc/environments/env-prod/deployments/7/gating-status`,
      });
    });

    it('encodes special characters in pipelineId and environmentId', async () => {
      // Arrange
      transport.respondWith(makeGatingStatus());

      // Act
      await pipelines.getDeploymentGatingStatus('pipe/line', 'env/prod', 2);

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${DEPLOYMENTS_BASE_URL}/pipelines/pipe%2Fline/environments/env%2Fprod/deployments/2/gating-status`,
      );
    });

    it('rejects dot-segment pipelineId with ValidationError', async () => {
      // Act / Assert
      await expect(pipelines.getDeploymentGatingStatus('..', 'env-prod', 1)).rejects.toThrow(
        ValidationError,
      );
    });

    it('rejects dot-segment environmentId with ValidationError', async () => {
      // Act / Assert
      await expect(pipelines.getDeploymentGatingStatus('pipeline-abc', '..', 1)).rejects.toThrow(
        ValidationError,
      );
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('too many requests'));

      // Act / Assert
      await expect(
        pipelines.getDeploymentGatingStatus('pipeline-abc', 'env-prod', 7),
      ).rejects.toThrow('too many requests');
    });
  });
});
