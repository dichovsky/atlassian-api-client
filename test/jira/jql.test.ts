import { describe, it, expect, beforeEach } from 'vitest';
import { JqlResource } from '../../src/jira/resources/jql.js';
import { MockTransport } from '../helpers/mock-transport.js';
import type {
  JqlAutocompleteData,
  JqlSuggestions,
  ParsedJqlQueries,
  SanitizedJqlQueries,
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

    it('includes optional validation setting in body', async () => {
      // Arrange
      transport.respondWith({ queries: [] });

      // Act
      await jql.parse({ queries: ['project = TEST'], validation: 'strict' });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({ validation: 'strict' });
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
      // Arrange
      const sanitized: SanitizedJqlQueries = {
        queries: [
          {
            initialQuery: 'INVALID',
            errors: { count: 1, errorMessages: ['Cannot parse query'] },
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
});
