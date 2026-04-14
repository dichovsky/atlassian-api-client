import { describe, it, expect, beforeEach } from 'vitest';
import { SearchResource } from '../../src/jira/resources/search.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeIssue = (id: string, key: string) => ({
  id,
  key,
  self: `${BASE_URL}/issue/${key}`,
  fields: {},
});

const makeSearchResult = (issues: ReturnType<typeof makeIssue>[], total = 0) => ({
  issues,
  startAt: 0,
  maxResults: issues.length,
  total: total || issues.length,
});

describe('SearchResource', () => {
  let transport: MockTransport;
  let search: SearchResource;

  beforeEach(() => {
    transport = new MockTransport();
    search = new SearchResource(transport, BASE_URL);
  });

  // ── search ────────────────────────────────────────────────────────────────

  describe('search()', () => {
    it('calls POST /search with required body params', async () => {
      // Arrange
      const result = makeSearchResult([makeIssue('1', 'PROJ-1')]);
      transport.respondWith(result);

      // Act
      const data = await search.search({ jql: 'project = PROJ' });

      // Assert
      expect(data).toEqual(result);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/search`,
        body: { jql: 'project = PROJ' },
      });
    });

    it('sends all optional params in the body', async () => {
      // Arrange
      transport.respondWith(makeSearchResult([]));

      // Act
      await search.search({
        jql: 'project = PROJ AND status = Open',
        startAt: 10,
        maxResults: 25,
        fields: ['summary', 'status'],
        expand: ['renderedFields'],
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        jql: 'project = PROJ AND status = Open',
        startAt: 10,
        maxResults: 25,
        fields: ['summary', 'status'],
        expand: ['renderedFields'],
      });
    });
  });

  // ── searchGet ─────────────────────────────────────────────────────────────

  describe('searchGet()', () => {
    it('calls GET /search with jql query param', async () => {
      // Arrange
      const result = makeSearchResult([makeIssue('1', 'PROJ-1')]);
      transport.respondWith(result);

      // Act
      const data = await search.searchGet({ jql: 'project = PROJ' });

      // Assert
      expect(data).toEqual(result);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/search`,
        query: { jql: 'project = PROJ' },
      });
    });

    it('includes all optional query params when provided', async () => {
      // Arrange
      transport.respondWith(makeSearchResult([]));

      // Act
      await search.searchGet({
        jql: 'project = PROJ',
        startAt: 5,
        maxResults: 20,
        fields: ['id', 'key', 'summary'],
        expand: ['changelog'],
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        jql: 'project = PROJ',
        startAt: 5,
        maxResults: 20,
        fields: 'id,key,summary',
        expand: 'changelog',
      });
    });

    it('does not include undefined optional params in query', async () => {
      // Arrange
      transport.respondWith(makeSearchResult([]));

      // Act
      await search.searchGet({ jql: 'project = PROJ' });

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['startAt']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
      expect(query['fields']).toBeUndefined();
      expect(query['expand']).toBeUndefined();
    });
  });

  // ── searchAll ─────────────────────────────────────────────────────────────

  describe('searchAll()', () => {
    it('paginates across multiple pages using POST and yields all issues', async () => {
      // Arrange
      transport
        .respondWith({
          issues: [makeIssue('1', 'P-1')],
          startAt: 0,
          maxResults: 1,
          total: 2,
        })
        .respondWith({
          issues: [makeIssue('2', 'P-2')],
          startAt: 1,
          maxResults: 1,
          total: 2,
        });

      // Act
      const items: { id: string }[] = [];
      for await (const issue of search.searchAll({ jql: 'project = P' })) {
        items.push(issue);
      }

      // Assert
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
      expect(transport.calls).toHaveLength(2);
    });

    it('uses POST method for each page request', async () => {
      // Arrange
      transport.respondWith({
        issues: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
      });

      // Act
      for await (const _ of search.searchAll({ jql: 'project = PROJ' })) {
        // consume
      }

      // Assert
      expect(transport.calls[0]?.options.method).toBe('POST');
    });

    it('passes fields and expand to each page request', async () => {
      // Arrange
      transport.respondWith({
        issues: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
      });

      // Act
      for await (const _ of search.searchAll({
        jql: 'project = PROJ',
        fields: ['summary', 'status'],
        expand: ['changelog'],
      })) {
        // consume
      }

      // Assert
      expect(transport.calls[0]?.options.body).toMatchObject({
        fields: ['summary', 'status'],
        expand: ['changelog'],
      });
    });
  });
});
