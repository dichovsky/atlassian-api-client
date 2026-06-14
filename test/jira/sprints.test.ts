import { describe, it, expect, beforeEach } from 'vitest';
import { SprintsResource } from '../../src/jira/resources/sprints.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/agile/1.0';
const SOFTWARE_BASE_URL = 'https://test.atlassian.net/rest/software/1.0';

const makeSprint = (id: number, name: string) => ({
  id,
  self: `${BASE_URL}/sprint/${id}`,
  state: 'active' as const,
  name,
  originBoardId: 1,
});

const makeBoardIssue = (id: string, key: string) => ({
  id,
  key,
  self: `${BASE_URL}/issue/${key}`,
  fields: {},
});

const makeListResponse = <T>(values: T[]) => ({
  values,
  startAt: 0,
  maxResults: 50,
  total: values.length,
});

describe('SprintsResource', () => {
  let transport: MockTransport;
  let sprints: SprintsResource;

  beforeEach(() => {
    transport = new MockTransport();
    sprints = new SprintsResource(transport, BASE_URL, SOFTWARE_BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /sprint/{sprintId} with numeric ID', async () => {
      // Arrange
      const sprint = makeSprint(42, 'Sprint 1');
      transport.respondWith(sprint);

      // Act
      const result = await sprints.get(42);

      // Assert
      expect(result).toEqual(sprint);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/sprint/42`,
      });
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /sprint with the provided data', async () => {
      // Arrange
      const sprint = makeSprint(1, 'New Sprint');
      transport.respondWith(sprint);
      const data = {
        name: 'New Sprint',
        originBoardId: 1,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-14T00:00:00.000Z',
        goal: 'Complete feature X',
      };

      // Act
      const result = await sprints.create(data);

      // Assert
      expect(result).toEqual(sprint);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/sprint`,
        body: data,
      });
    });

    it('calls POST /sprint with minimal data', async () => {
      // Arrange
      const sprint = makeSprint(2, 'Sprint 2');
      transport.respondWith(sprint);
      const data = { name: 'Sprint 2', originBoardId: 1 };

      // Act
      await sprints.create(data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/sprint`,
        body: data,
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /sprint/{sprintId} with the provided data', async () => {
      // Arrange
      const sprint = makeSprint(42, 'Updated Sprint');
      transport.respondWith(sprint);
      const data = { name: 'Updated Sprint', state: 'closed' as const };

      // Act
      const result = await sprints.update(42, data);

      // Assert
      expect(result).toEqual(sprint);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/sprint/42`,
        body: data,
      });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /sprint/{sprintId}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await sprints.delete(42);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/sprint/42`,
      });
    });
  });

  // ── partialUpdate ─────────────────────────────────────────────────────────

  describe('partialUpdate()', () => {
    it('calls POST /sprint/{sprintId} with the provided data', async () => {
      // Arrange
      const sprint = makeSprint(42, 'Patched Sprint');
      transport.respondWith(sprint);
      const data = { name: 'Patched Sprint', state: 'closed' as const };

      // Act
      const result = await sprints.partialUpdate(42, data);

      // Assert
      expect(result).toEqual(sprint);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/sprint/42`,
        body: data,
      });
    });

    it('sends partial data (only name) verbatim', async () => {
      // Arrange
      const sprint = makeSprint(5, 'Renamed Sprint');
      transport.respondWith(sprint);
      const data = { name: 'Renamed Sprint' };

      // Act
      await sprints.partialUpdate(5, data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/sprint/5`,
        body: { name: 'Renamed Sprint' },
      });
    });

    it('throws ValidationError for sprintId = 0', async () => {
      await expect(sprints.partialUpdate(0, {})).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('throws ValidationError for sprintId < 0', async () => {
      await expect(sprints.partialUpdate(-1, {})).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });
  });

  // ── moveIssues ────────────────────────────────────────────────────────────

  describe('moveIssues()', () => {
    it('calls POST /sprint/{sprintId}/issue with issues body and returns void', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      const result = await sprints.moveIssues(42, ['PROJ-1', 'PROJ-2']);

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/sprint/42/issue`,
        body: { issues: ['PROJ-1', 'PROJ-2'] },
      });
    });

    it('sends exactly 50 issues (boundary)', async () => {
      // Arrange
      transport.respondWith(undefined, 204);
      const issues = Array.from({ length: 50 }, (_, i) => `PROJ-${i + 1}`);

      // Act
      await sprints.moveIssues(1, issues);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/sprint/1/issue`,
        body: { issues },
      });
    });

    it('throws ValidationError for sprintId = 0', async () => {
      await expect(sprints.moveIssues(0, ['PROJ-1'])).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('throws ValidationError for sprintId < 0', async () => {
      await expect(sprints.moveIssues(-5, ['PROJ-1'])).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('throws ValidationError for empty issues array', async () => {
      await expect(sprints.moveIssues(1, [])).rejects.toThrow('issues must be a non-empty array');
    });

    it('throws ValidationError for issues array with 51 entries', async () => {
      const issues = Array.from({ length: 51 }, (_, i) => `PROJ-${i + 1}`);
      await expect(sprints.moveIssues(1, issues)).rejects.toThrow(
        'issues must contain at most 50 entries',
      );
    });

    it('throws ValidationError for issue entry that is an empty string', async () => {
      await expect(sprints.moveIssues(1, ['PROJ-1', ''])).rejects.toThrow(
        'issues entries must be non-empty strings',
      );
    });

    it('sends rankBeforeIssue, rankAfterIssue, rankCustomFieldId when provided (B1056)', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act — rank control fields added by B1056 spec alignment
      await sprints.moveIssues(42, ['PROJ-1'], 'PROJ-2', 'PROJ-3', 10001);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        issues: ['PROJ-1'],
        rankBeforeIssue: 'PROJ-2',
        rankAfterIssue: 'PROJ-3',
        rankCustomFieldId: 10001,
      });
    });

    it('omits rank fields when not provided', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await sprints.moveIssues(42, ['PROJ-1']);

      // Assert — body only contains issues
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).toHaveProperty('issues');
      expect(body).not.toHaveProperty('rankBeforeIssue');
      expect(body).not.toHaveProperty('rankAfterIssue');
      expect(body).not.toHaveProperty('rankCustomFieldId');
    });
  });

  // ── getIssues ─────────────────────────────────────────────────────────────

  describe('getIssues()', () => {
    it('calls GET /sprint/{sprintId}/issue and maps .issues → .values (B1055/6)', async () => {
      // The agile spec response uses SearchResults: { issues, startAt, maxResults, total }.
      // getIssues() maps that to OffsetPaginatedResponse: { values, startAt, maxResults, total }.
      const issue = makeBoardIssue('1', 'PROJ-1');
      transport.respondWith({ issues: [issue], startAt: 0, maxResults: 50, total: 1 });

      // Act
      const result = await sprints.getIssues(42);

      // Assert — response shape uses .values (not .issues)
      expect(result.values).toEqual([issue]);
      expect(result.startAt).toBe(0);
      expect(result.maxResults).toBe(50);
      expect(result.total).toBe(1);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/sprint/42/issue`,
      });
    });

    it('passes startAt, maxResults, and jql params', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await sprints.getIssues(42, { startAt: 5, maxResults: 10, jql: 'status = Done' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 10,
        jql: 'status = Done',
      });
    });

    it('serializes fields array as repeated params, not CSV (B1049)', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await sprints.getIssues(42, { fields: ['summary', 'status'] });

      // Assert — `fields` is `type: array` → repeated params in the path.
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/sprint/42/issue?fields=summary&fields=status`,
      );
      expect(transport.lastCall?.options.path).not.toContain('%2C');
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
    });

    it('passes validateQuery and expand params (B1056)', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act — params added in B1056 spec alignment
      await sprints.getIssues(42, { validateQuery: false, expand: 'changelog' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        validateQuery: false,
        expand: 'changelog',
      });
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(sprints.getIssues(42, { maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: -1', async () => {
      await expect(sprints.getIssues(42, { maxResults: -1 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: 1.5', async () => {
      await expect(sprints.getIssues(42, { maxResults: 1.5 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: Infinity', async () => {
      await expect(sprints.getIssues(42, { maxResults: Infinity })).rejects.toThrow(
        ValidationError,
      );
    });

    it('throws ValidationError for non-positive sprintId', async () => {
      await expect(sprints.getIssues(0)).rejects.toThrow('sprintId must be a positive integer');
    });
  });

  // ── listProperties ────────────────────────────────────────────────────────

  describe('listProperties()', () => {
    it('calls GET /sprint/{sprintId}/properties', async () => {
      // Arrange
      const payload = {
        keys: [{ self: `${BASE_URL}/sprint/42/properties/my-key`, key: 'my-key' }],
      };
      transport.respondWith(payload);

      // Act
      const result = await sprints.listProperties(42);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/sprint/42/properties`,
      });
    });

    it('returns empty keys array when no properties exist', async () => {
      // Arrange
      transport.respondWith({ keys: [] });

      // Act
      const result = await sprints.listProperties(1);

      // Assert
      expect(result).toEqual({ keys: [] });
    });

    it('throws ValidationError for sprintId = 0', async () => {
      await expect(sprints.listProperties(0)).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('throws ValidationError for sprintId < 0', async () => {
      await expect(sprints.listProperties(-3)).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });
  });

  // ── getProperty ───────────────────────────────────────────────────────────

  describe('getProperty()', () => {
    it('calls GET /sprint/{sprintId}/properties/{propertyKey}', async () => {
      // Arrange
      const payload = { key: 'my-key', value: { foo: 'bar' } };
      transport.respondWith(payload);

      // Act
      const result = await sprints.getProperty(42, 'my-key');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/sprint/42/properties/my-key`,
      });
    });

    it('URL-encodes propertyKey with spaces and slashes', async () => {
      // Arrange
      transport.respondWith({ key: 'my key/with space', value: null });

      // Act
      await sprints.getProperty(5, 'my key/with space');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/sprint/5/properties/my%20key%2Fwith%20space`,
      );
    });

    it('throws ValidationError for sprintId = 0', async () => {
      await expect(sprints.getProperty(0, 'key')).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('throws ValidationError for sprintId < 0', async () => {
      await expect(sprints.getProperty(-1, 'key')).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('throws ValidationError for empty propertyKey', async () => {
      await expect(sprints.getProperty(1, '')).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
    });
  });

  // ── setProperty ───────────────────────────────────────────────────────────

  describe('setProperty()', () => {
    it('calls PUT /sprint/{sprintId}/properties/{propertyKey} with object value', async () => {
      // Arrange
      transport.respondWith(undefined, 200);
      const value = { enabled: true, threshold: 42 };

      // Act
      await sprints.setProperty(42, 'my-key', value);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/sprint/42/properties/my-key`,
        body: value,
      });
    });

    it('accepts array value', async () => {
      // Arrange
      transport.respondWith(undefined, 201);
      const value = [1, 2, 3];

      // Act
      await sprints.setProperty(7, 'tags', value);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/sprint/7/properties/tags`,
        body: value,
      });
    });

    it('accepts string value', async () => {
      // Arrange
      transport.respondWith(undefined, 200);

      // Act
      await sprints.setProperty(3, 'label', 'hello');

      // Assert
      expect(transport.lastCall?.options.body).toBe('hello');
    });

    it('accepts number value', async () => {
      // Arrange
      transport.respondWith(undefined, 200);

      // Act
      await sprints.setProperty(3, 'count', 99);

      // Assert
      expect(transport.lastCall?.options.body).toBe(99);
    });

    it('accepts null value', async () => {
      // Arrange
      transport.respondWith(undefined, 200);

      // Act
      await sprints.setProperty(3, 'nullable', null);

      // Assert
      expect(transport.lastCall?.options.body).toBeNull();
    });

    it('accepts boolean value', async () => {
      // Arrange
      transport.respondWith(undefined, 200);

      // Act
      await sprints.setProperty(3, 'flag', false);

      // Assert
      expect(transport.lastCall?.options.body).toBe(false);
    });

    it('throws ValidationError for sprintId = 0', async () => {
      await expect(sprints.setProperty(0, 'key', {})).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('throws ValidationError for sprintId < 0', async () => {
      await expect(sprints.setProperty(-1, 'key', {})).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('throws ValidationError for empty propertyKey', async () => {
      await expect(sprints.setProperty(1, '', {})).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
    });
  });

  // ── deleteProperty ────────────────────────────────────────────────────────

  describe('deleteProperty()', () => {
    it('calls DELETE /sprint/{sprintId}/properties/{propertyKey}', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      const result = await sprints.deleteProperty(42, 'my-key');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/sprint/42/properties/my-key`,
      });
    });

    it('does not send a body', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await sprints.deleteProperty(1, 'x');

      // Assert
      expect(transport.lastCall?.options.body).toBeUndefined();
    });

    it('throws ValidationError for sprintId = 0', async () => {
      await expect(sprints.deleteProperty(0, 'key')).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('throws ValidationError for sprintId < 0', async () => {
      await expect(sprints.deleteProperty(-1, 'key')).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('throws ValidationError for empty propertyKey', async () => {
      await expect(sprints.deleteProperty(1, '')).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
    });
  });

  // ── swap ──────────────────────────────────────────────────────────────────

  describe('swap()', () => {
    it('calls POST /sprint/{sprintId}/swap with body { sprintToSwapWith }', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      const result = await sprints.swap(42, 99);

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/sprint/42/swap`,
        body: { sprintToSwapWith: 99 },
      });
    });

    it('throws ValidationError for sprintId = 0', async () => {
      await expect(sprints.swap(0, 1)).rejects.toThrow('sprintId must be a positive integer');
    });

    it('throws ValidationError for sprintId < 0', async () => {
      await expect(sprints.swap(-1, 1)).rejects.toThrow('sprintId must be a positive integer');
    });

    it('throws ValidationError for sprintToSwapWith = 0', async () => {
      await expect(sprints.swap(1, 0)).rejects.toThrow(
        'sprintToSwapWith must be a positive integer',
      );
    });

    it('throws ValidationError for sprintToSwapWith < 0', async () => {
      await expect(sprints.swap(1, -5)).rejects.toThrow(
        'sprintToSwapWith must be a positive integer',
      );
    });

    it('throws ValidationError when swapping a sprint with itself', async () => {
      await expect(sprints.swap(42, 42)).rejects.toThrow('cannot swap a sprint with itself');
    });
  });
});

describe('SprintsResource sprintId validation', () => {
  let transport: MockTransport;
  let sprints: SprintsResource;

  beforeEach(() => {
    transport = new MockTransport();
    sprints = new SprintsResource(transport, BASE_URL, SOFTWARE_BASE_URL);
  });

  it('get() throws ValidationError for sprintId <= 0', async () => {
    await expect(sprints.get(0)).rejects.toThrow('sprintId must be a positive integer');
    await expect(sprints.get(-1)).rejects.toThrow('sprintId must be a positive integer');
  });

  it('update() throws ValidationError for sprintId <= 0', async () => {
    await expect(sprints.update(0, {})).rejects.toThrow('sprintId must be a positive integer');
  });

  it('delete() throws ValidationError for sprintId <= 0', async () => {
    await expect(sprints.delete(0)).rejects.toThrow('sprintId must be a positive integer');
  });

  it('partialUpdate() throws ValidationError for sprintId <= 0', async () => {
    await expect(sprints.partialUpdate(0, {})).rejects.toThrow(
      'sprintId must be a positive integer',
    );
    await expect(sprints.partialUpdate(-1, {})).rejects.toThrow(
      'sprintId must be a positive integer',
    );
  });

  it('moveIssues() throws ValidationError for sprintId <= 0', async () => {
    await expect(sprints.moveIssues(0, ['PROJ-1'])).rejects.toThrow(
      'sprintId must be a positive integer',
    );
  });
});

// ── Enhanced (JSIS) sprint issue endpoint (B1030) ─────────────────────────

const makeSoftwareIssueResults = (keys: string[]) => ({
  issues: keys.map((key, i) => ({
    id: String(i + 1),
    key,
    self: `${BASE_URL}/issue/${key}`,
    fields: {},
  })),
  nextPageToken: 'TOKEN-2',
  isLast: false,
});

describe('SprintsResource.getIssuesEnhanced()', () => {
  let transport: MockTransport;
  let sprints: SprintsResource;

  beforeEach(() => {
    transport = new MockTransport();
    sprints = new SprintsResource(transport, BASE_URL, SOFTWARE_BASE_URL);
  });

  it('calls GET software /sprint/{sprintId}/issue and passes the page through', async () => {
    const payload = makeSoftwareIssueResults(['PROJ-1', 'PROJ-2']);
    transport.respondWith(payload);

    const result = await sprints.getIssuesEnhanced(42);

    expect(result).toEqual(payload);
    expect(transport.lastCall?.options).toMatchObject({
      method: 'GET',
      path: `${SOFTWARE_BASE_URL}/sprint/42/issue`,
    });
  });

  it('threads params and repeated reconcileIssues', async () => {
    transport.respondWith(makeSoftwareIssueResults([]));

    await sprints.getIssuesEnhanced(42, {
      nextPageToken: 'TOK',
      maxResults: 10,
      jql: 'project = X',
      fields: ['id', 'summary'],
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
      `${SOFTWARE_BASE_URL}/sprint/42/issue?reconcileIssues=10001&reconcileIssues=10002&fields=id&fields=summary`,
    );
  });

  it('threads single reconcileIssues entry', async () => {
    transport.respondWith(makeSoftwareIssueResults([]));

    await sprints.getIssuesEnhanced(42, { reconcileIssues: [5] });

    expect(transport.lastCall?.options.path).toBe(
      `${SOFTWARE_BASE_URL}/sprint/42/issue?reconcileIssues=5`,
    );
  });

  it('throws ValidationError for sprintId = 0', async () => {
    await expect(sprints.getIssuesEnhanced(0)).rejects.toThrow(
      'sprintId must be a positive integer',
    );
  });

  it('throws ValidationError for sprintId = -1', async () => {
    await expect(sprints.getIssuesEnhanced(-1)).rejects.toThrow(
      'sprintId must be a positive integer',
    );
  });

  it('throws ValidationError for maxResults: 0', async () => {
    await expect(sprints.getIssuesEnhanced(42, { maxResults: 0 })).rejects.toThrow(ValidationError);
  });

  it('derives softwareBaseUrl from agile baseUrl when not provided', async () => {
    const t = new MockTransport();
    t.respondWith(makeSoftwareIssueResults([]));
    const resource = new SprintsResource(t, BASE_URL);
    await resource.getIssuesEnhanced(1);
    expect(t.lastCall?.options.path).toBe(
      'https://test.atlassian.net/rest/software/1.0/sprint/1/issue',
    );
  });
});
