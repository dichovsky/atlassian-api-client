import { describe, it, expect, beforeEach } from 'vitest';
import { JqlResource } from '../../src/jira/resources/jql.js';
import { MockTransport } from '../helpers/mock-transport.js';
import type {
  JqlAutocompleteData,
  JqlSuggestions,
  ParsedJqlQueries,
  SanitizedJqlQueries,
  JqlPrecomputationsPage,
  UpdatePrecomputationsResponse,
  GetPrecomputationsByIdResponse,
  IssueMatches,
  ConvertedJqlQueries,
} from '../../src/jira/resources/jql.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('JqlResource', () => {
  let transport: MockTransport;
  let jql: JqlResource;

  beforeEach(() => {
    transport = new MockTransport();
    jql = new JqlResource(transport, BASE_URL);
  });

  // ── getAutocompleteData ───────────────────────────────────────────────────

  describe('getAutocompleteData()', () => {
    it('calls GET /jql/autocompletedata and returns data', async () => {
      // Arrange
      const autocompleteData: JqlAutocompleteData = {
        visibleFieldNames: [
          { value: 'assignee', displayName: 'Assignee' },
          { value: 'status', displayName: 'Status' },
        ],
        jqlReservedWords: ['AND', 'OR', 'NOT'],
      };
      transport.respondWith(autocompleteData);

      // Act
      const result = await jql.getAutocompleteData();

      // Assert
      expect(result).toEqual(autocompleteData);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/jql/autocompletedata`,
      });
    });

    it('returns empty data when API returns empty object', async () => {
      // Arrange
      transport.respondWith({});

      // Act
      const result = await jql.getAutocompleteData();

      // Assert
      expect(result).toEqual({});
    });
  });

  // ── getFieldReferenceSuggestions ──────────────────────────────────────────

  describe('getFieldReferenceSuggestions()', () => {
    it('calls GET /jql/autocompletedata/suggestions with fieldName param', async () => {
      // Arrange
      const suggestions: JqlSuggestions = {
        results: [
          { value: 'open', displayName: 'Open' },
          { value: 'in-progress', displayName: 'In Progress' },
        ],
      };
      transport.respondWith(suggestions);

      // Act
      const result = await jql.getFieldReferenceSuggestions({ fieldName: 'status' });

      // Assert
      expect(result).toEqual(suggestions);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/jql/autocompletedata/suggestions`,
        query: { fieldName: 'status' },
      });
    });

    it('passes optional fieldValue, predicateName, predicateValue params', async () => {
      // Arrange
      transport.respondWith({ results: [] });

      // Act
      await jql.getFieldReferenceSuggestions({
        fieldName: 'assignee',
        fieldValue: 'john',
        predicateName: 'was',
        predicateValue: 'before',
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        fieldName: 'assignee',
        fieldValue: 'john',
        predicateName: 'was',
        predicateValue: 'before',
      });
    });

    it('does not include undefined optional params in query', async () => {
      // Arrange
      transport.respondWith({ results: [] });

      // Act
      await jql.getFieldReferenceSuggestions({ fieldName: 'project' });

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['fieldValue']).toBeUndefined();
      expect(query['predicateName']).toBeUndefined();
      expect(query['predicateValue']).toBeUndefined();
    });

    it('accepts no params — fieldName is optional per spec (B1056)', async () => {
      // All params are optional per spec — calling with no args should not throw
      transport.respondWith({ results: [] });
      await jql.getFieldReferenceSuggestions();
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── parse ─────────────────────────────────────────────────────────────────

  describe('parse()', () => {
    it('calls POST /jql/parse with the provided data', async () => {
      // Arrange
      const parsed: ParsedJqlQueries = {
        queries: [{ query: 'project = TEST AND status = Open', structure: {} }],
      };
      transport.respondWith(parsed);
      const data = { queries: ['project = TEST AND status = Open'] };

      // Act
      const result = await jql.parse(data);

      // Assert
      expect(result).toEqual(parsed);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/jql/parse`,
        body: data,
      });
    });

    it('sends validation as the required query param, not in the body', async () => {
      // Arrange
      transport.respondWith({ queries: [] });

      // Act — spec: parseJqlQueries has `validation` as a required query param
      // (in:query, enum strict/warn/none) and body schema JqlQueriesToParse
      // contains only { queries } with additionalProperties:false.
      await jql.parse({ queries: ['project = TEST'], validation: 'warn' });

      // Assert — validation must be in the query map, not in the body
      const opts = transport.lastCall?.options;
      expect((opts?.query as Record<string, unknown>)?.['validation']).toBe('warn');
      expect('validation' in ((opts?.body as Record<string, unknown>) ?? {})).toBe(false);
    });

    it('sends strict as the default validation query param when not specified', async () => {
      // Arrange
      transport.respondWith({ queries: [] });

      // Act — when omitted, the spec default is 'strict'; we send it explicitly
      // so the caller gets predictable behaviour regardless of server-side defaults
      await jql.parse({ queries: ['project = TEST'] });

      // Assert
      const opts = transport.lastCall?.options;
      expect((opts?.query as Record<string, unknown>)?.['validation']).toBe('strict');
      expect('validation' in ((opts?.body as Record<string, unknown>) ?? {})).toBe(false);
    });

    it('returns query errors in the result', async () => {
      // Arrange
      const parsed: ParsedJqlQueries = {
        queries: [{ query: 'INVALID', errors: ['Error in query'] }],
      };
      transport.respondWith(parsed);

      // Act
      const result = await jql.parse({ queries: ['INVALID'] });

      // Assert
      expect(result.queries[0]!.errors).toEqual(['Error in query']);
    });

    it('returns warnings field when present (B1056)', async () => {
      // ParsedJqlQuery.warnings is present in spec but was previously missing
      const parsed: ParsedJqlQueries = {
        queries: [{ query: 'project = TEST ORDER BY unknown', warnings: ['Unknown sort order'] }],
      };
      transport.respondWith(parsed);
      const result = await jql.parse({ queries: ['project = TEST ORDER BY unknown'] });
      expect(result.queries[0]!.warnings).toEqual(['Unknown sort order']);
    });
  });

  // ── sanitize ──────────────────────────────────────────────────────────────

  describe('sanitize()', () => {
    it('calls POST /jql/sanitize with the provided data', async () => {
      // Arrange
      const sanitized: SanitizedJqlQueries = {
        queries: [
          {
            initialQuery: 'project = TEST AND assignee = currentUser()',
            sanitizedQuery: 'project = TEST AND assignee = "612345:abc"',
          },
        ],
      };
      transport.respondWith(sanitized);
      const data = {
        queries: [
          { query: 'project = TEST AND assignee = currentUser()', accountId: '612345:abc' },
        ],
      };

      // Act
      const result = await jql.sanitize(data);

      // Assert
      expect(result).toEqual(sanitized);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/jql/sanitize`,
        body: data,
      });
    });

    it('returns sanitization errors in the result', async () => {
      // Arrange — ErrorCollection schema: errorMessages, errors, status (no `count`)
      const sanitized: SanitizedJqlQueries = {
        queries: [
          {
            initialQuery: 'INVALID',
            errors: { errorMessages: ['Cannot parse query'], status: 400 },
          },
        ],
      };
      transport.respondWith(sanitized);

      // Act
      const result = await jql.sanitize({ queries: [{ query: 'INVALID' }] });

      // Assert
      expect(result.queries[0]!.errors?.errorMessages).toEqual(['Cannot parse query']);
    });
  });

  // ── getAutocompleteDataPost ───────────────────────────────────────────────

  describe('getAutocompleteDataPost()', () => {
    it('calls POST /jql/autocompletedata with filter body', async () => {
      // Arrange
      const autocompleteData: JqlAutocompleteData = { visibleFieldNames: [], jqlReservedWords: [] };
      transport.respondWith(autocompleteData);

      // Act
      const result = await jql.getAutocompleteDataPost({
        projectIds: [10001, 10002],
        includeCollapsedFields: true,
      });

      // Assert
      expect(result).toEqual(autocompleteData);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/jql/autocompletedata`,
        body: { projectIds: [10001, 10002], includeCollapsedFields: true },
      });
    });

    it('calls POST /jql/autocompletedata with empty body when no filter provided', async () => {
      // Arrange
      transport.respondWith({});

      // Act
      await jql.getAutocompleteDataPost();

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/jql/autocompletedata`,
        body: {},
      });
    });
  });

  // ── getPrecomputations ────────────────────────────────────────────────────

  describe('getPrecomputations()', () => {
    it('calls GET /jql/function/computation and returns page', async () => {
      // Arrange
      const page: JqlPrecomputationsPage = {
        isLast: true,
        maxResults: 100,
        startAt: 0,
        total: 1,
        values: [{ id: 'cf75a1b0', functionKey: 'myFn', value: 'issue in (TEST-1)' }],
      };
      transport.respondWith(page);

      // Act
      const result = await jql.getPrecomputations();

      // Assert
      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/jql/function/computation`,
      });
    });

    it('sends functionKey as repeated query params and other params via the query map', async () => {
      // Arrange
      transport.respondWith({ values: [] });

      // Act — `functionKey` is a `type: array` query param (Jira swagger), so it
      // must be sent as repeated params (`functionKey=a&functionKey=b`), not
      // comma-joined. Jira parses a CSV value as a single (nonexistent) key.
      // Forge/Connect keys carry `:` and `/`, so each value is URL-encoded.
      await jql.getPrecomputations({
        functionKey: ['myFn', 'ari:cloud::ext/Fn'],
        startAt: 0,
        maxResults: 50,
        orderBy: 'updated',
      });

      // Assert: repeated, URL-encoded `functionKey` params live on the path
      // (the transport `query` map collapses duplicate keys); the remaining
      // scalar params travel through the `query` map.
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/jql/function/computation?functionKey=myFn&functionKey=ari%3Acloud%3A%3Aext%2FFn`,
      );
      expect(transport.lastCall?.options.query).toEqual({
        startAt: '0',
        maxResults: '50',
        orderBy: 'updated',
      });
    });

    it('sends no query when called with empty params', async () => {
      // Arrange
      transport.respondWith({});

      // Act
      await jql.getPrecomputations({});

      // Assert
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── updatePrecomputations ─────────────────────────────────────────────────

  describe('updatePrecomputations()', () => {
    it('calls POST /jql/function/computation with values body', async () => {
      // Arrange
      const response: UpdatePrecomputationsResponse = { notFoundPrecomputationIDs: [] };
      transport.respondWith(response);
      const data = {
        values: [{ id: 'f2ef228b', value: 'issue in (TEST-1, TEST-2, TEST-3)' }],
      };

      // Act
      const result = await jql.updatePrecomputations(data);

      // Assert
      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/jql/function/computation`,
        body: data,
      });
    });

    it('passes skipNotFoundPrecomputations query param when provided', async () => {
      // Arrange
      transport.respondWith({});

      // Act
      await jql.updatePrecomputations(
        { values: [{ id: 'abc123', value: 'issue in (X-1)' }] },
        { skipNotFoundPrecomputations: true },
      );

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        skipNotFoundPrecomputations: 'true',
      });
    });

    it('does not include query when skipNotFoundPrecomputations is not provided', async () => {
      // Arrange
      transport.respondWith({});

      // Act
      await jql.updatePrecomputations({ values: [{ id: 'abc123', value: 'issue in (X-1)' }] });

      // Assert
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── getPrecomputationsById ────────────────────────────────────────────────

  describe('getPrecomputationsById()', () => {
    it('calls POST /jql/function/computation/search with IDs', async () => {
      // Arrange
      const response: GetPrecomputationsByIdResponse = {
        precomputations: [{ id: 'cf75a1b0', value: 'issue in (TEST-1)' }],
        notFoundPrecomputationIDs: ['missing-id'],
      };
      transport.respondWith(response);

      // Act
      const result = await jql.getPrecomputationsById({
        precomputationIDs: ['cf75a1b0', 'missing-id'],
      });

      // Assert
      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/jql/function/computation/search`,
        body: { precomputationIDs: ['cf75a1b0', 'missing-id'] },
      });
    });

    it('passes orderBy query param when provided', async () => {
      // Arrange
      transport.respondWith({ precomputations: [] });

      // Act
      await jql.getPrecomputationsById({ precomputationIDs: ['abc'] }, { orderBy: 'created' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ orderBy: 'created' });
    });

    it('sends no query when params is empty', async () => {
      // Arrange
      transport.respondWith({});

      // Act
      await jql.getPrecomputationsById({});

      // Assert
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── matchIssues ───────────────────────────────────────────────────────────

  describe('matchIssues()', () => {
    it('calls POST /jql/match with issueIds and jqls', async () => {
      // Arrange
      const response: IssueMatches = {
        matches: [{ matchedIssues: [10000, 10004], errors: [] }],
      };
      transport.respondWith(response);

      // Act
      const result = await jql.matchIssues({
        issueIds: [10001, 1000, 10042],
        jqls: ['project = FOO', 'issuetype = Bug'],
      });

      // Assert
      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/jql/match`,
        body: { issueIds: [10001, 1000, 10042], jqls: ['project = FOO', 'issuetype = Bug'] },
      });
    });
  });

  // ── migrateQueries ────────────────────────────────────────────────────────

  describe('migrateQueries()', () => {
    it('calls POST /jql/pdcleaner with queryStrings', async () => {
      // Arrange
      const response: ConvertedJqlQueries = {
        queryStrings: ['issuetype = Bug AND assignee in (abcde-12345)'],
        queriesWithUnknownUsers: [],
      };
      transport.respondWith(response);

      // Act
      const result = await jql.migrateQueries({
        queryStrings: ['assignee = mia', 'issuetype = Bug AND assignee in (mia)'],
      });

      // Assert
      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/jql/pdcleaner`,
        body: { queryStrings: ['assignee = mia', 'issuetype = Bug AND assignee in (mia)'] },
      });
    });

    it('sends empty body when called with no queryStrings', async () => {
      // Arrange
      transport.respondWith({});

      // Act
      await jql.migrateQueries({});

      // Assert
      expect(transport.lastCall?.options.body).toEqual({});
    });
  });
});
