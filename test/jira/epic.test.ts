import { describe, it, expect, beforeEach } from 'vitest';
import { EpicResource } from '../../src/jira/resources/epic.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/agile/1.0';
const SOFTWARE_BASE_URL = 'https://test.atlassian.net/rest/software/1.0';

const makeEpic = (id: number, name: string) => ({
  id,
  self: `${BASE_URL}/epic/${id}`,
  name,
  done: false,
  key: `PROJ-${id}`,
});

const makeBoardIssue = (id: string, key: string) => ({
  id,
  key,
  self: `${BASE_URL}/issue/${key}`,
  fields: {},
});

/** Wire format for agile SearchResults (spec uses `.issues`, not `.values`). */
const makeIssueSearchResults = (issues: ReturnType<typeof makeBoardIssue>[]) => ({
  issues,
  startAt: 0,
  maxResults: 50,
  total: issues.length,
});

describe('EpicResource', () => {
  let transport: MockTransport;
  let epic: EpicResource;

  beforeEach(() => {
    transport = new MockTransport();
    epic = new EpicResource(transport, BASE_URL, SOFTWARE_BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /epic/{epicIdOrKey} with numeric string ID', async () => {
      // Arrange
      const epicData = makeEpic(42, 'My Epic');
      transport.respondWith(epicData);

      // Act
      const result = await epic.get('42');

      // Assert
      expect(result).toEqual(epicData);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/epic/42`,
      });
    });

    it('calls GET /epic/{epicIdOrKey} with epic key', async () => {
      // Arrange
      const epicData = makeEpic(42, 'My Epic');
      transport.respondWith(epicData);

      // Act
      const result = await epic.get('PROJ-42');

      // Assert
      expect(result).toEqual(epicData);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/epic/PROJ-42`,
      });
    });

    it('throws ValidationError for empty epicIdOrKey', async () => {
      await expect(epic.get('')).rejects.toThrow('epicIdOrKey must be a non-empty string');
    });
  });

  // ── partialUpdate ─────────────────────────────────────────────────────────

  describe('partialUpdate()', () => {
    it('calls POST /epic/{epicIdOrKey} with the provided data', async () => {
      // Arrange
      const epicData = makeEpic(42, 'Renamed Epic');
      transport.respondWith(epicData);
      const data = { name: 'Renamed Epic' };

      // Act
      const result = await epic.partialUpdate('42', data);

      // Assert
      expect(result).toEqual(epicData);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/epic/42`,
        body: data,
      });
    });

    it('accepts done flag, summary, and color', async () => {
      // Arrange
      transport.respondWith(makeEpic(5, 'Epic'));
      const data = {
        name: 'Epic',
        summary: 'New summary',
        color: { key: 'color_1' as const },
        done: true,
      };

      // Act
      await epic.partialUpdate('PROJ-5', data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/epic/PROJ-5`,
        body: data,
      });
    });

    it('sends partial data (only name) verbatim', async () => {
      // Arrange
      transport.respondWith(makeEpic(3, 'Only Name'));
      const data = { name: 'Only Name' };

      // Act
      await epic.partialUpdate('3', data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        body: { name: 'Only Name' },
      });
    });

    it('throws ValidationError for empty epicIdOrKey', async () => {
      await expect(epic.partialUpdate('', {})).rejects.toThrow(
        'epicIdOrKey must be a non-empty string',
      );
    });
  });

  // ── getIssues ─────────────────────────────────────────────────────────────

  describe('getIssues()', () => {
    it('calls GET /epic/{epicIdOrKey}/issue and maps .issues → .values (B1056)', async () => {
      // Arrange — wire sends SearchResults: { issues, startAt, maxResults, total }
      const issue = makeBoardIssue('1', 'PROJ-1');
      transport.respondWith(makeIssueSearchResults([issue]));

      // Act
      const result = await epic.getIssues('42');

      // Assert — result uses OffsetPaginatedResponse shape with .values
      expect(result.values).toEqual([issue]);
      expect(result.startAt).toBe(0);
      expect(result.maxResults).toBe(50);
      expect(result.total).toBe(1);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/epic/42/issue`,
      });
    });

    it('calls GET /epic/{epicKey}/issue with string key', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act
      await epic.getIssues('PROJ-42');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/epic/PROJ-42/issue`,
      });
    });

    it('passes startAt, maxResults, and jql params', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act
      await epic.getIssues('42', { startAt: 5, maxResults: 10, jql: 'status = Done' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 10,
        jql: 'status = Done',
      });
    });

    it('serializes fields array as repeated params, not CSV (B1049)', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act
      await epic.getIssues('42', { fields: ['summary', 'status'] });

      // Assert — `fields` is `type: array` → repeated params in the path.
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/epic/42/issue?fields=summary&fields=status`,
      );
      expect(transport.lastCall?.options.path).not.toContain('%2C');
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
    });

    it('passes validateQuery and expand params (B1056)', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act — params added in B1056 spec alignment
      await epic.getIssues('42', { validateQuery: false, expand: 'changelog' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        validateQuery: false,
        expand: 'changelog',
      });
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(epic.getIssues('42', { maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: -1', async () => {
      await expect(epic.getIssues('42', { maxResults: -1 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: 1.5', async () => {
      await expect(epic.getIssues('42', { maxResults: 1.5 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for empty epicIdOrKey', async () => {
      await expect(epic.getIssues('')).rejects.toThrow('epicIdOrKey must be a non-empty string');
    });
  });

  // ── moveIssues ────────────────────────────────────────────────────────────

  describe('moveIssues()', () => {
    it('calls POST /epic/{epicIdOrKey}/issue with issues body and returns void', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      const result = await epic.moveIssues('42', ['PROJ-1', 'PROJ-2']);

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/epic/42/issue`,
        body: { issues: ['PROJ-1', 'PROJ-2'] },
      });
    });

    it('works with epic key', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await epic.moveIssues('PROJ-42', ['PROJ-1']);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/epic/PROJ-42/issue`,
        body: { issues: ['PROJ-1'] },
      });
    });

    it('throws ValidationError for empty epicIdOrKey', async () => {
      await expect(epic.moveIssues('', ['PROJ-1'])).rejects.toThrow(
        'epicIdOrKey must be a non-empty string',
      );
    });

    it('throws ValidationError for empty issues array', async () => {
      await expect(epic.moveIssues('42', [])).rejects.toThrow('issues must be a non-empty array');
    });

    it('throws ValidationError for issue entry that is an empty string', async () => {
      await expect(epic.moveIssues('42', ['PROJ-1', ''])).rejects.toThrow(
        'issues entries must be non-empty strings',
      );
    });
  });

  // ── rank ──────────────────────────────────────────────────────────────────

  describe('rank()', () => {
    it('calls PUT /epic/{epicIdOrKey}/rank with rankBeforeEpic', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      const result = await epic.rank('42', { rankBeforeEpic: '99' });

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/epic/42/rank`,
        body: { rankBeforeEpic: '99' },
      });
    });

    it('calls PUT /epic/{epicIdOrKey}/rank with rankAfterEpic', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await epic.rank('PROJ-42', { rankAfterEpic: 'PROJ-5' });

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/epic/PROJ-42/rank`,
        body: { rankAfterEpic: 'PROJ-5' },
      });
    });

    it('accepts rankCustomFieldId with rankBeforeEpic', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await epic.rank('42', { rankBeforeEpic: '99', rankCustomFieldId: 10020 });

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        body: { rankBeforeEpic: '99', rankCustomFieldId: 10020 },
      });
    });

    it('throws ValidationError for empty epicIdOrKey', async () => {
      await expect(epic.rank('', { rankBeforeEpic: '99' })).rejects.toThrow(
        'epicIdOrKey must be a non-empty string',
      );
    });

    it('throws ValidationError when neither rankBeforeEpic nor rankAfterEpic is provided', async () => {
      await expect(epic.rank('42', {})).rejects.toThrow(
        'rankBeforeEpic or rankAfterEpic must be provided',
      );
    });

    it('throws ValidationError when both rankBeforeEpic and rankAfterEpic are provided', async () => {
      await expect(epic.rank('42', { rankBeforeEpic: '1', rankAfterEpic: '2' })).rejects.toThrow(
        'rankBeforeEpic and rankAfterEpic are mutually exclusive',
      );
    });
  });

  // ── getIssuesWithoutEpic ──────────────────────────────────────────────────

  describe('getIssuesWithoutEpic()', () => {
    it('calls GET /epic/none/issue and maps .issues → .values (B1056)', async () => {
      // Arrange — wire sends SearchResults: { issues, startAt, maxResults, total }
      const issue = makeBoardIssue('10', 'PROJ-10');
      transport.respondWith(makeIssueSearchResults([issue]));

      // Act
      const result = await epic.getIssuesWithoutEpic();

      // Assert — result uses OffsetPaginatedResponse shape with .values
      expect(result.values).toEqual([issue]);
      expect(result.startAt).toBe(0);
      expect(result.maxResults).toBe(50);
      expect(result.total).toBe(1);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/epic/none/issue`,
      });
    });

    it('passes pagination params', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act
      await epic.getIssuesWithoutEpic({ startAt: 10, maxResults: 25 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 10,
        maxResults: 25,
      });
    });

    it('passes jql and fields', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act
      await epic.getIssuesWithoutEpic({ jql: 'priority = High', fields: ['summary', 'priority'] });

      // Assert — `fields` is `type: array` → repeated params in the path (B1049).
      expect(transport.lastCall?.options.query).toMatchObject({
        jql: 'priority = High',
      });
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/epic/none/issue?fields=summary&fields=priority`,
      );
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
    });

    it('passes validateQuery and expand params (B1056)', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act — params added in B1056 spec alignment
      await epic.getIssuesWithoutEpic({ validateQuery: true, expand: 'names' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        validateQuery: true,
        expand: 'names',
      });
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(epic.getIssuesWithoutEpic({ maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: -1', async () => {
      await expect(epic.getIssuesWithoutEpic({ maxResults: -1 })).rejects.toThrow(ValidationError);
    });
  });

  // ── removeIssuesFromEpic ──────────────────────────────────────────────────

  describe('removeIssuesFromEpic()', () => {
    it('calls POST /epic/none/issue with issues body and returns void', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      const result = await epic.removeIssuesFromEpic(['PROJ-1', 'PROJ-2']);

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/epic/none/issue`,
        body: { issues: ['PROJ-1', 'PROJ-2'] },
      });
    });

    it('throws ValidationError for empty issues array', async () => {
      await expect(epic.removeIssuesFromEpic([])).rejects.toThrow(
        'issues must be a non-empty array',
      );
    });

    it('throws ValidationError for issue entry that is an empty string', async () => {
      await expect(epic.removeIssuesFromEpic(['PROJ-1', ''])).rejects.toThrow(
        'issues entries must be non-empty strings',
      );
    });
  });

  // ── Enhanced (JSIS) epic issue endpoints (B1028-B1029) ───────────────────

  const makeSoftwareIssueResults = (keys: string[]) => ({
    issues: keys.map((key, i) => makeBoardIssue(String(i + 1), key)),
    nextPageToken: 'TOKEN-2',
    isLast: false,
  });

  describe('getIssuesEnhanced()', () => {
    it('calls GET software /epic/{epicIdOrKey}/issue and passes the page through', async () => {
      const payload = makeSoftwareIssueResults(['PROJ-1', 'PROJ-2']);
      transport.respondWith(payload);

      const result = await epic.getIssuesEnhanced('42');

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${SOFTWARE_BASE_URL}/epic/42/issue`,
      });
    });

    it('encodes epicIdOrKey with special characters in the path', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));

      await epic.getIssuesEnhanced('PROJ-42');

      expect(transport.lastCall?.options.path).toBe(`${SOFTWARE_BASE_URL}/epic/PROJ-42/issue`);
    });

    it('threads params and repeated reconcileIssues', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));

      await epic.getIssuesEnhanced('42', {
        nextPageToken: 'TOK',
        maxResults: 10,
        jql: 'project = X',
        fields: ['summary', 'status'],
        expand: 'schema',
        reconcileIssues: [10001, 10002],
        validateQuery: false,
      });

      // `fields` and `reconcileIssues` are both `type: array` → repeated params
      // in the path; `expand` is `type: string` and stays in the query (B1049).
      expect(transport.lastCall?.options.query).toMatchObject({
        nextPageToken: 'TOK',
        maxResults: 10,
        jql: 'project = X',
        expand: 'schema',
        validateQuery: false,
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
      expect(transport.lastCall?.options.path).toBe(
        `${SOFTWARE_BASE_URL}/epic/42/issue?reconcileIssues=10001&reconcileIssues=10002&fields=summary&fields=status`,
      );
    });

    it('omits undefined optional params from query (nextPageToken branch)', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));

      // Pass jql only — nextPageToken, expand, validateQuery absent → covers their false branches
      await epic.getIssuesEnhanced('42', { jql: 'status = Done' });

      const q = transport.lastCall?.options.query ?? {};
      expect(q).toMatchObject({ jql: 'status = Done' });
      expect(q).not.toHaveProperty('nextPageToken');
      expect(q).not.toHaveProperty('expand');
      expect(q).not.toHaveProperty('validateQuery');
    });

    it('omits undefined optional params from query (jql branch)', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));

      // Pass nextPageToken only — jql, fields, expand absent → covers their false branches
      await epic.getIssuesEnhanced('42', { nextPageToken: 'cursor' });

      const q = transport.lastCall?.options.query ?? {};
      expect(q).toMatchObject({ nextPageToken: 'cursor' });
      expect(q).not.toHaveProperty('jql');
      expect(q).not.toHaveProperty('expand');
    });

    it('throws ValidationError for empty epicIdOrKey', async () => {
      await expect(epic.getIssuesEnhanced('')).rejects.toThrow(
        'epicIdOrKey must be a non-empty string',
      );
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(epic.getIssuesEnhanced('42', { maxResults: 0 })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('getIssuesWithoutEpicEnhanced()', () => {
    it('calls GET software /epic/none/issue and passes the page through', async () => {
      const payload = makeSoftwareIssueResults(['PROJ-9']);
      transport.respondWith(payload);

      const result = await epic.getIssuesWithoutEpicEnhanced();

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${SOFTWARE_BASE_URL}/epic/none/issue`,
      });
    });

    it('threads jql, fields, validateQuery params', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));

      await epic.getIssuesWithoutEpicEnhanced({
        jql: 'priority = High',
        fields: ['summary'],
        validateQuery: true,
      });

      // `fields` is `type: array` → repeated param in the path (B1049).
      expect(transport.lastCall?.options.query).toMatchObject({
        jql: 'priority = High',
        validateQuery: true,
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
      expect(transport.lastCall?.options.path).toBe(
        `${SOFTWARE_BASE_URL}/epic/none/issue?fields=summary`,
      );
    });

    it('threads all params including nextPageToken, maxResults, expand', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));

      await epic.getIssuesWithoutEpicEnhanced({
        nextPageToken: 'TOK',
        maxResults: 5,
        jql: 'status = Done',
        fields: ['id'],
        expand: 'names',
        validateQuery: false,
      });

      // `fields` is `type: array` → repeated param in the path (B1049).
      expect(transport.lastCall?.options.query).toMatchObject({
        nextPageToken: 'TOK',
        maxResults: 5,
        jql: 'status = Done',
        expand: 'names',
        validateQuery: false,
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
      expect(transport.lastCall?.options.path).toBe(
        `${SOFTWARE_BASE_URL}/epic/none/issue?fields=id`,
      );
    });

    it('serializes reconcileIssues as repeated params', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));

      await epic.getIssuesWithoutEpicEnhanced({ reconcileIssues: [5, 6] });

      expect(transport.lastCall?.options.path).toBe(
        `${SOFTWARE_BASE_URL}/epic/none/issue?reconcileIssues=5&reconcileIssues=6`,
      );
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(epic.getIssuesWithoutEpicEnhanced({ maxResults: 0 })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  it('derives softwareBaseUrl from agile baseUrl when not provided', async () => {
    const t = new MockTransport();
    t.respondWith({ issues: [], isLast: true });
    const resource = new EpicResource(t, BASE_URL);
    await resource.getIssuesEnhanced('42');
    expect(t.lastCall?.options.path).toBe(
      'https://test.atlassian.net/rest/software/1.0/epic/42/issue',
    );
  });

  it('rejects a path-traversal epicIdOrKey (B1052)', async () => {
    await expect(epic.get('..')).rejects.toThrow(ValidationError);
  });
});
