import { describe, it, expect, beforeEach } from 'vitest';
import { SearchResource } from '../../src/jira/resources/search.js';
import type { ApproximateCountResult, JqlSearchResult } from '../../src/jira/resources/search.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

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

    it('sends validateQuery, properties, and fieldsByKeys in POST body (B1056)', async () => {
      // Arrange
      transport.respondWith(makeSearchResult([]));

      // Act
      await search.search({
        jql: 'project = PROJ',
        validateQuery: 'strict',
        properties: ['prop1', 'prop2'],
        fieldsByKeys: true,
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        validateQuery: 'strict',
        properties: ['prop1', 'prop2'],
        fieldsByKeys: true,
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

      // Assert — `/search` GET: `fields` is `type: array` → repeated params in
      // the path; `expand` is `type: string` → comma-joined (B1049).
      expect(transport.lastCall?.options.query).toMatchObject({
        jql: 'project = PROJ',
        startAt: 5,
        maxResults: 20,
        expand: 'changelog',
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/search?fields=id&fields=key&fields=summary`,
      );
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

    it('sends validateQuery, properties as repeated params, and fieldsByKeys for GET (B1056)', async () => {
      // Arrange
      transport.respondWith(makeSearchResult([]));

      // Act
      await search.searchGet({
        jql: 'project = PROJ',
        validateQuery: 'warn',
        properties: ['prop1'],
        fieldsByKeys: false,
      });

      // Assert — `properties` is type:array → repeated params in path
      expect(transport.lastCall?.options.query).toMatchObject({
        validateQuery: 'warn',
        fieldsByKeys: false,
      });
      expect(transport.lastCall?.options.path).toContain('properties=prop1');
      expect(transport.lastCall?.options.query).not.toHaveProperty('properties');
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

  // ── approximateCount ──────────────────────────────────────────────────────

  describe('approximateCount()', () => {
    it('calls POST /search/approximate-count with jql in body', async () => {
      // Arrange
      const result: ApproximateCountResult = { count: 42 };
      transport.respondWith(result);

      // Act
      const data = await search.approximateCount('project = PROJ');

      // Assert
      expect(data).toEqual(result);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/search/approximate-count`,
        body: { jql: 'project = PROJ' },
      });
    });

    it('returns the count value from the response', async () => {
      // Arrange
      transport.respondWith({ count: 99 });

      // Act
      const data = await search.approximateCount('assignee = currentUser()');

      // Assert
      expect(data.count).toBe(99);
    });
  });

  // ── searchJqlGet ──────────────────────────────────────────────────────────

  describe('searchJqlGet()', () => {
    it('calls GET /search/jql with jql query param', async () => {
      // Arrange
      const result: JqlSearchResult = {
        issues: [makeIssue('1', 'PROJ-1')],
        nextPageToken: 'tok-2',
      };
      transport.respondWith(result);

      // Act
      const data = await search.searchJqlGet({ jql: 'project = PROJ' });

      // Assert
      expect(data).toEqual(result);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/search/jql`,
        query: { jql: 'project = PROJ' },
      });
    });

    it('includes all optional query params when provided', async () => {
      // Arrange
      transport.respondWith({ issues: [] });

      // Act
      await search.searchJqlGet({
        jql: 'project = PROJ',
        nextPageToken: 'tok-1',
        maxResults: 25,
        fields: ['id', 'key'],
        expand: ['changelog'],
        properties: ['prop-1'],
        fieldsByKeys: true,
      });

      // Assert — `/search/jql` GET: `fields`/`properties` are `type: array` →
      // repeated params in the path; `expand` is `type: string` → CSV (B1049).
      expect(transport.lastCall?.options.query).toMatchObject({
        jql: 'project = PROJ',
        nextPageToken: 'tok-1',
        maxResults: 25,
        expand: 'changelog',
        fieldsByKeys: true,
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
      expect(transport.lastCall?.options.query).not.toHaveProperty('properties');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/search/jql?fields=id&fields=key&properties=prop-1`,
      );
    });

    it('omits undefined optional params from query', async () => {
      // Arrange
      transport.respondWith({ issues: [] });

      // Act
      await search.searchJqlGet({ jql: 'project = PROJ' });

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['nextPageToken']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
      expect(query['fields']).toBeUndefined();
      expect(query['expand']).toBeUndefined();
    });

    it('omits jql from query when not provided', async () => {
      // Arrange
      transport.respondWith({ issues: [] });

      // Act
      await search.searchJqlGet({});

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['jql']).toBeUndefined();
    });

    it('throws ValidationError when maxResults is invalid', async () => {
      await expect(search.searchJqlGet({ maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('sends failFast as a boolean query param when provided', async () => {
      // Spec: failFast is accepted by GET /rest/api/3/search/jql (type: boolean).
      transport.respondWith({ issues: [] });

      await search.searchJqlGet({ jql: 'project = PROJ', failFast: true });

      expect(transport.lastCall?.options.query).toMatchObject({ failFast: true });
    });

    it('omits failFast from query when not provided', async () => {
      transport.respondWith({ issues: [] });

      await search.searchJqlGet({ jql: 'project = PROJ' });

      const query = transport.lastCall?.options.query ?? {};
      expect(query['failFast']).toBeUndefined();
    });

    it('sends reconcileIssues as repeated path params when provided', async () => {
      // Spec: reconcileIssues is type:array in GET /rest/api/3/search/jql →
      // repeated params baked into the path.
      transport.respondWith({ issues: [] });

      await search.searchJqlGet({ jql: 'project = PROJ', reconcileIssues: [101, 202] });

      expect(transport.lastCall?.options.path).toContain('reconcileIssues=101');
      expect(transport.lastCall?.options.path).toContain('reconcileIssues=202');
    });
  });

  // ── searchJqlPost ─────────────────────────────────────────────────────────

  describe('searchJqlPost()', () => {
    it('calls POST /search/jql with params in body', async () => {
      // Arrange
      const result: JqlSearchResult = { issues: [makeIssue('1', 'PROJ-1')] };
      transport.respondWith(result);

      // Act
      const data = await search.searchJqlPost({ jql: 'project = PROJ' });

      // Assert
      expect(data).toEqual(result);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/search/jql`,
        body: { jql: 'project = PROJ' },
      });
    });

    it('sends all optional params in the body', async () => {
      // Arrange
      transport.respondWith({ issues: [] });

      // Act
      await search.searchJqlPost({
        jql: 'project = PROJ',
        nextPageToken: 'tok-1',
        maxResults: 50,
        fields: ['summary', 'status'],
        expand: ['renderedFields'],
        properties: ['my-prop'],
        fieldsByKeys: false,
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        jql: 'project = PROJ',
        nextPageToken: 'tok-1',
        maxResults: 50,
        fields: ['summary', 'status'],
        // `expand` is the lone array-shaped param the /search/jql POST body
        // defines as a comma-delimited STRING (SearchAndReconcileRequestBean),
        // unlike `fields`/`properties` which stay arrays.
        expand: 'renderedFields',
        properties: ['my-prop'],
        fieldsByKeys: false,
      });
    });

    it('comma-joins expand into a string while fields/properties stay arrays', async () => {
      // Arrange
      transport.respondWith({ issues: [] });

      // Act
      await search.searchJqlPost({
        jql: 'project = PROJ',
        fields: ['summary', 'status'],
        expand: ['renderedFields', 'changelog'],
        properties: ['p1', 'p2'],
      });

      // Assert — per SearchAndReconcileRequestBean the body `expand` is a
      // comma-delimited string, so multiple values must be joined; `fields`
      // and `properties` are genuine string arrays and must NOT be joined.
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['expand']).toBe('renderedFields,changelog');
      expect(body['fields']).toEqual(['summary', 'status']);
      expect(body['properties']).toEqual(['p1', 'p2']);
    });

    it('omits undefined optional params from body', async () => {
      // Arrange
      transport.respondWith({ issues: [] });

      // Act
      await search.searchJqlPost({ jql: 'project = PROJ' });

      // Assert
      const body = transport.lastCall?.options.body ?? {};
      expect(body).not.toHaveProperty('nextPageToken');
      expect(body).not.toHaveProperty('maxResults');
      expect(body).not.toHaveProperty('fields');
      expect(body).not.toHaveProperty('expand');
    });

    it('omits jql from body when not provided', async () => {
      // Arrange
      transport.respondWith({ issues: [] });

      // Act
      await search.searchJqlPost({});

      // Assert
      const body = transport.lastCall?.options.body ?? {};
      expect(body).not.toHaveProperty('jql');
    });

    it('throws ValidationError when maxResults is invalid', async () => {
      await expect(search.searchJqlPost({ maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('surfaces isLast from the SearchAndReconcileResults response (B1055/7)', async () => {
      // Spec: SearchAndReconcileResults includes isLast: boolean.
      transport.respondWith({ issues: [], isLast: true, nextPageToken: undefined });

      const result = await search.searchJqlPost({});

      expect(result.isLast).toBe(true);
    });

    it('surfaces isLast: false when more pages remain', async () => {
      transport.respondWith({ issues: [], isLast: false, nextPageToken: 'tok-2' });

      const result = await search.searchJqlPost({});

      expect(result.isLast).toBe(false);
      expect(result.nextPageToken).toBe('tok-2');
    });

    it('sends reconcileIssues as an array in body when provided', async () => {
      // Spec: reconcileIssues is type:array in POST body of SearchAndReconcileRequestBean.
      transport.respondWith({ issues: [] });

      await search.searchJqlPost({ jql: 'project = PROJ', reconcileIssues: [101, 202] });

      expect(transport.lastCall?.options.body).toMatchObject({ reconcileIssues: [101, 202] });
    });

    it('omits reconcileIssues from body when not provided', async () => {
      transport.respondWith({ issues: [] });

      await search.searchJqlPost({ jql: 'project = PROJ' });

      const body = transport.lastCall?.options.body ?? {};
      expect(body).not.toHaveProperty('reconcileIssues');
    });
  });
});
