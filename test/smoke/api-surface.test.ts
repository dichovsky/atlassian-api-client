/**
 * API surface smoke tests — verify the public API is constructable and correctly typed.
 * These tests do not make network calls; they validate structure and type compatibility.
 */
import { describe, it, expect } from 'vitest';
import { ConfluenceClient, JiraClient } from '../../src/index.js';
import type {
  ClientConfig,
  Logger,
  Middleware,
  ListLabelsParams,
  ConfluenceListLabelsParams,
  JiraListLabelsParams,
} from '../../src/index.js';

const BASE_CONFIG: ClientConfig = {
  baseUrl: 'https://test.atlassian.net',
  auth: { type: 'basic', email: 'user@example.com', apiToken: 'token' },
};

describe('ConfluenceClient', () => {
  it('is constructable with basic auth', () => {
    const client = new ConfluenceClient(BASE_CONFIG);
    expect(client).toBeDefined();
  });

  it('exposes all expected resources', () => {
    const client = new ConfluenceClient(BASE_CONFIG);
    expect(typeof client.pages.list).toBe('function');
    expect(typeof client.pages.get).toBe('function');
    expect(typeof client.pages.create).toBe('function');
    expect(typeof client.pages.update).toBe('function');
    expect(typeof client.pages.delete).toBe('function');
    expect(typeof client.pages.listAll).toBe('function');
    expect(typeof client.spaces.list).toBe('function');
    expect(typeof client.spaces.get).toBe('function');
    expect(typeof client.spaces.listAll).toBe('function');
    expect(typeof client.blogPosts.list).toBe('function');
    expect(typeof client.blogPosts.create).toBe('function');
    expect(typeof client.comments.listFooter).toBe('function');
    expect(typeof client.comments.listInline).toBe('function');
    expect(typeof client.attachments.listForPage).toBe('function');
    expect(typeof client.attachments.upload).toBe('function');
    expect(typeof client.labels.listForPage).toBe('function');
    expect(typeof client.contentProperties.listForPage).toBe('function');
    expect(typeof client.contentProperties.getForPage).toBe('function');
    expect(typeof client.contentProperties.createForPage).toBe('function');
    expect(typeof client.contentProperties.updateForPage).toBe('function');
    expect(typeof client.contentProperties.deleteForPage).toBe('function');
    expect(typeof client.customContent.list).toBe('function');
    expect(typeof client.customContent.get).toBe('function');
    expect(typeof client.customContent.create).toBe('function');
    expect(typeof client.customContent.update).toBe('function');
    expect(typeof client.customContent.delete).toBe('function');
    expect(typeof client.whiteboards.get).toBe('function');
    expect(typeof client.whiteboards.create).toBe('function');
    expect(typeof client.whiteboards.delete).toBe('function');
    expect(typeof client.tasks.list).toBe('function');
    expect(typeof client.tasks.get).toBe('function');
    expect(typeof client.tasks.update).toBe('function');
    expect(typeof client.versions.listForPage).toBe('function');
    expect(typeof client.versions.getForPage).toBe('function');
    expect(typeof client.versions.listForBlogPost).toBe('function');
    expect(typeof client.versions.getForBlogPost).toBe('function');
  });
});

describe('JiraClient', () => {
  it('is constructable with bearer auth', () => {
    const client = new JiraClient({
      baseUrl: 'https://test.atlassian.net',
      auth: { type: 'bearer', token: 'my-token' },
    });
    expect(client).toBeDefined();
  });

  it('exposes all expected resources', () => {
    const client = new JiraClient(BASE_CONFIG);
    expect(typeof client.issues.get).toBe('function');
    expect(typeof client.issues.create).toBe('function');
    expect(typeof client.issues.update).toBe('function');
    expect(typeof client.issues.delete).toBe('function');
    expect(typeof client.projects.list).toBe('function');
    expect(typeof client.projects.get).toBe('function');
    expect(typeof client.projects.listAll).toBe('function');
    expect(typeof client.search.search).toBe('function');
    expect(typeof client.search.searchGet).toBe('function');
    expect(typeof client.search.searchAll).toBe('function');
    expect(typeof client.users.getCurrentUser).toBe('function');
    expect(typeof client.users.get).toBe('function');
    expect(typeof client.issueTypes.list).toBe('function');
    expect(typeof client.priorities.list).toBe('function');
    expect(typeof client.statuses.list).toBe('function');
    expect(typeof client.issueComments.list).toBe('function');
    expect(typeof client.issueComments.get).toBe('function');
    expect(typeof client.issueComments.create).toBe('function');
    expect(typeof client.issueComments.update).toBe('function');
    expect(typeof client.issueComments.delete).toBe('function');
    expect(typeof client.issueAttachments.list).toBe('function');
    expect(typeof client.issueAttachments.get).toBe('function');
    expect(typeof client.issueAttachments.upload).toBe('function');
    expect(typeof client.labels.list).toBe('function');
    expect(typeof client.boards.list).toBe('function');
    expect(typeof client.boards.get).toBe('function');
    expect(typeof client.boards.getIssues).toBe('function');
    expect(typeof client.sprints.get).toBe('function');
    expect(typeof client.sprints.create).toBe('function');
    expect(typeof client.sprints.update).toBe('function');
    expect(typeof client.sprints.delete).toBe('function');
    expect(typeof client.workflows.list).toBe('function');
    expect(typeof client.workflows.get).toBe('function');
    expect(typeof client.dashboards.list).toBe('function');
    expect(typeof client.dashboards.get).toBe('function');
    expect(typeof client.dashboards.create).toBe('function');
    expect(typeof client.dashboards.update).toBe('function');
    expect(typeof client.dashboards.delete).toBe('function');
    expect(typeof client.filters.list).toBe('function');
    expect(typeof client.filters.get).toBe('function');
    expect(typeof client.filters.create).toBe('function');
    expect(typeof client.filters.update).toBe('function');
    expect(typeof client.filters.delete).toBe('function');
    expect(typeof client.fields.list).toBe('function');
    expect(typeof client.fields.listAll).toBe('function');
    expect(typeof client.fields.create).toBe('function');
    expect(typeof client.fields.update).toBe('function');
    expect(typeof client.fields.delete).toBe('function');
    expect(typeof client.webhooks.list).toBe('function');
    expect(typeof client.webhooks.register).toBe('function');
    expect(typeof client.webhooks.delete).toBe('function');
    expect(typeof client.jql.getAutocompleteData).toBe('function');
    expect(typeof client.jql.getFieldReferenceSuggestions).toBe('function');
    expect(typeof client.jql.parse).toBe('function');
    expect(typeof client.jql.sanitize).toBe('function');
    expect(typeof client.bulk.createBulk).toBe('function');
    expect(typeof client.bulk.setPropertyBulk).toBe('function');
    expect(typeof client.bulk.deletePropertyBulk).toBe('function');
  });
});

describe('Logger and Middleware config', () => {
  it('accepts a Logger', () => {
    const messages: string[] = [];
    const logger: Logger = {
      debug: (msg) => messages.push(`debug:${msg}`),
      info: (msg) => messages.push(`info:${msg}`),
      warn: (msg) => messages.push(`warn:${msg}`),
      error: (msg) => messages.push(`error:${msg}`),
    };

    const client = new JiraClient({ ...BASE_CONFIG, logger });
    expect(client).toBeDefined();
  });

  it('accepts a Middleware array', () => {
    const calls: string[] = [];
    const middleware: Middleware = async (options, next) => {
      calls.push('before');
      const result = await next(options);
      calls.push('after');
      return result;
    };

    const client = new ConfluenceClient({ ...BASE_CONFIG, middleware: [middleware] });
    expect(client).toBeDefined();
  });
});

describe('root type exports', () => {
  it('keeps ListLabelsParams backward-compatible while exposing explicit aliases', () => {
    const confluenceParams: ListLabelsParams = { prefix: 'global', limit: 10 };
    const confluenceAlias: ConfluenceListLabelsParams = confluenceParams;
    const jiraParams: JiraListLabelsParams = { startAt: 0, maxResults: 50 };

    expect(confluenceAlias.limit).toBe(10);
    expect(jiraParams.maxResults).toBe(50);
  });
});
