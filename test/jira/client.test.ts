import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JiraClient } from '../../src/jira/client.js';
import type { JiraClientConfig } from '../../src/jira/client.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';
import { IssuesResource } from '../../src/jira/resources/issues.js';
import { ProjectsResource } from '../../src/jira/resources/projects.js';
import { SearchResource } from '../../src/jira/resources/search.js';
import { UsersResource } from '../../src/jira/resources/users.js';
import { IssueTypesResource } from '../../src/jira/resources/issue-types.js';
import { PrioritiesResource } from '../../src/jira/resources/priorities.js';
import { StatusesResource } from '../../src/jira/resources/statuses.js';

const VALID_CONFIG = {
  baseUrl: 'https://test.atlassian.net',
  auth: { type: 'basic' as const, email: 'user@example.com', apiToken: 'token123' },
};

const PROXY_CONFIG: JiraClientConfig = {
  baseUrl: 'https://test.atlassian.net',
  auth: { type: 'bearer', token: 'oauth-access-token' },
  softwareIntegrationProxy: { cloudId: '11111111-2222-3333-4444-555555555555' },
};

describe('JiraClient', () => {
  describe('constructor', () => {
    it('creates a client with valid config and custom transport', () => {
      // Arrange
      const transport = new MockTransport();

      // Act
      const client = new JiraClient({ ...VALID_CONFIG, transport });

      // Assert
      expect(client).toBeInstanceOf(JiraClient);
    });

    it('creates a client with valid bearer auth config', () => {
      // Arrange & Act
      const client = new JiraClient({
        baseUrl: 'https://test.atlassian.net',
        auth: { type: 'bearer', token: 'my-pat-token' },
      });

      // Assert
      expect(client).toBeInstanceOf(JiraClient);
    });

    it('throws ValidationError when baseUrl is missing', () => {
      expect(() => new JiraClient({ ...VALID_CONFIG, baseUrl: '' })).toThrow(ValidationError);
    });

    it('throws ValidationError when baseUrl is not a valid URL', () => {
      expect(() => new JiraClient({ ...VALID_CONFIG, baseUrl: 'not-a-url' })).toThrow(
        ValidationError,
      );
    });

    it('throws ValidationError when auth is missing', () => {
      expect(
        // @ts-expect-error intentionally missing auth
        () => new JiraClient({ baseUrl: 'https://test.atlassian.net', auth: null }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when basic auth email is missing', () => {
      expect(
        () =>
          new JiraClient({
            ...VALID_CONFIG,
            auth: { type: 'basic', email: '', apiToken: 'token' },
          }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when basic auth apiToken is missing', () => {
      expect(
        () =>
          new JiraClient({
            ...VALID_CONFIG,
            auth: { type: 'basic', email: 'user@example.com', apiToken: '' },
          }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when bearer token is missing', () => {
      expect(
        () =>
          new JiraClient({
            ...VALID_CONFIG,
            auth: { type: 'bearer', token: '' },
          }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError for unsupported auth type', () => {
      expect(
        () =>
          new JiraClient({
            ...VALID_CONFIG,
            // @ts-expect-error intentionally invalid type
            auth: { type: 'oauth', token: 'x' },
          }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when timeout is not a positive number', () => {
      expect(() => new JiraClient({ ...VALID_CONFIG, timeout: -1 })).toThrow(ValidationError);
    });

    it('throws ValidationError when retries is negative', () => {
      expect(() => new JiraClient({ ...VALID_CONFIG, retries: -1 })).toThrow(ValidationError);
    });

    it('throws ValidationError when retries is not an integer', () => {
      expect(() => new JiraClient({ ...VALID_CONFIG, retries: 1.5 })).toThrow(ValidationError);
    });

    it('throws ValidationError when retryDelay is not a positive number', () => {
      expect(() => new JiraClient({ ...VALID_CONFIG, retryDelay: 0 })).toThrow(ValidationError);
    });

    it('throws ValidationError when maxRetryDelay is not a positive number', () => {
      expect(() => new JiraClient({ ...VALID_CONFIG, maxRetryDelay: 0 })).toThrow(ValidationError);
    });

    it('requires bearer auth when the Jira Software integration proxy is enabled', () => {
      expect(
        () =>
          new JiraClient({
            ...VALID_CONFIG,
            softwareIntegrationProxy: { cloudId: 'cloud-123' },
          }),
      ).toThrow(/requires bearer OAuth authentication/);
    });

    it.each([{ cloudId: '' }, { cloudId: '   ' }, { cloudId: 42 as unknown as string }])(
      'rejects an invalid integration-proxy cloudId: $cloudId',
      (softwareIntegrationProxy) => {
        expect(() => new JiraClient({ ...PROXY_CONFIG, softwareIntegrationProxy })).toThrow(
          /non-empty cloudId/,
        );
      },
    );

    it('rejects a malformed integration-proxy config object', () => {
      expect(
        () =>
          new JiraClient({
            ...PROXY_CONFIG,
            softwareIntegrationProxy: null,
          } as unknown as JiraClientConfig),
      ).toThrow(/softwareIntegrationProxy must be an object/);
    });

    it('does not enable proxy routing for bearer auth unless explicitly configured', async () => {
      const transport = new MockTransport().respondWith({});
      const client = new JiraClient({
        baseUrl: VALID_CONFIG.baseUrl,
        auth: { type: 'bearer', token: 'oauth-access-token' },
        transport,
      });

      await client.bulk.submitDevInfo({ repositories: [] });

      expect(transport.lastCall?.options.path).toBe(
        'https://test.atlassian.net/rest/devinfo/0.10/bulk',
      );
    });

    it('routes only Development Information, Builds, and Deployments through the OAuth proxy', async () => {
      const transport = new MockTransport();
      const client = new JiraClient({ ...PROXY_CONFIG, transport });
      const respond = (): void => {
        transport.respondWith({});
      };

      respond();
      await client.bulk.submitBuilds({ builds: [] });
      respond();
      await client.bulk.submitDeployments({ deployments: [] });
      respond();
      await client.bulk.submitDevInfo({ repositories: [] });
      respond();
      await client.repository.get('repo-1');
      respond();
      await client.existsByProperties.get();
      respond();
      await client.pipelines.getBuild('pipeline-1', 1);
      respond();
      await client.pipelines.getDeployment('pipeline-1', 'production', 2);
      respond();
      await client.pipelines.getDeploymentGatingStatus('pipeline-1', 'production', 2);
      respond();
      await client.bulkByProperties.deleteBuildsByProperties({ properties: { accountId: 'a' } });
      respond();
      await client.bulkByProperties.deleteDeploymentsByProperties({
        properties: { accountId: 'a' },
      });
      respond();
      await client.bulkByProperties.deleteDevInfoByProperties({
        properties: { accountId: 'a' },
      });
      respond();
      await client.bulk.submitFeatureFlags({ flags: [] });

      expect(transport.calls.map(({ options }) => options.path)).toEqual([
        'https://api.atlassian.com/jira/builds/0.1/cloud/11111111-2222-3333-4444-555555555555/bulk',
        'https://api.atlassian.com/jira/deployments/0.1/cloud/11111111-2222-3333-4444-555555555555/bulk',
        'https://api.atlassian.com/jira/devinfo/0.1/cloud/11111111-2222-3333-4444-555555555555/bulk',
        'https://api.atlassian.com/jira/devinfo/0.1/cloud/11111111-2222-3333-4444-555555555555/repository/repo-1',
        'https://api.atlassian.com/jira/devinfo/0.1/cloud/11111111-2222-3333-4444-555555555555/existsByProperties',
        'https://api.atlassian.com/jira/builds/0.1/cloud/11111111-2222-3333-4444-555555555555/pipelines/pipeline-1/builds/1',
        'https://api.atlassian.com/jira/deployments/0.1/cloud/11111111-2222-3333-4444-555555555555/pipelines/pipeline-1/environments/production/deployments/2',
        'https://test.atlassian.net/rest/deployments/0.1/pipelines/pipeline-1/environments/production/deployments/2/gating-status',
        'https://api.atlassian.com/jira/builds/0.1/cloud/11111111-2222-3333-4444-555555555555/bulkByProperties',
        'https://api.atlassian.com/jira/deployments/0.1/cloud/11111111-2222-3333-4444-555555555555/bulkByProperties',
        'https://api.atlassian.com/jira/devinfo/0.1/cloud/11111111-2222-3333-4444-555555555555/bulkByProperties',
        'https://test.atlassian.net/rest/featureflags/0.1/bulk',
      ]);
    });

    it('authorizes only the tenant and api.atlassian.com for the built-in transport', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response('{}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
      const client = new JiraClient({
        ...PROXY_CONFIG,
        allowedHosts: ['test.atlassian.net'],
        retries: 0,
        fetch: fetchMock as typeof fetch,
      });

      await client.bulk.submitBuilds({ builds: [] });

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe(
        'https://api.atlassian.com/jira/builds/0.1/cloud/11111111-2222-3333-4444-555555555555/bulk',
      );
      expect(new Headers(init.headers).get('authorization')).toBe('Bearer oauth-access-token');
    });

    it('does not broaden the proxy allowlist to unrelated hosts', async () => {
      const fetchMock = vi.fn();
      const client = new JiraClient({
        ...PROXY_CONFIG,
        retries: 0,
        fetch: fetchMock as typeof fetch,
        middleware: [
          (_options, next) =>
            next({ method: 'GET', path: 'https://evil.example/credential-target' }),
        ],
      });

      await expect(client.bulk.submitBuilds({ builds: [] })).rejects.toThrow(
        /host is not on the allowedHosts list/,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('resource properties', () => {
    let client: JiraClient;

    beforeEach(() => {
      client = new JiraClient({ ...VALID_CONFIG, transport: new MockTransport() });
    });

    it('exposes an issues resource', () => {
      expect(client.issues).toBeInstanceOf(IssuesResource);
    });

    it('exposes a projects resource', () => {
      expect(client.projects).toBeInstanceOf(ProjectsResource);
    });

    it('exposes a search resource', () => {
      expect(client.search).toBeInstanceOf(SearchResource);
    });

    it('exposes a users resource', () => {
      expect(client.users).toBeInstanceOf(UsersResource);
    });

    it('exposes an issueTypes resource', () => {
      expect(client.issueTypes).toBeInstanceOf(IssueTypesResource);
    });

    it('exposes a priorities resource', () => {
      expect(client.priorities).toBeInstanceOf(PrioritiesResource);
    });

    it('exposes a statuses resource', () => {
      expect(client.statuses).toBeInstanceOf(StatusesResource);
    });
  });
});
