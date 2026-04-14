import { describe, it, expect, beforeEach } from 'vitest';
import { JiraClient } from '../../src/jira/client.js';
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
