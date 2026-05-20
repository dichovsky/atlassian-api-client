import { describe, it, expect, beforeEach } from 'vitest';
import { SprintsResource } from '../../src/jira/resources/sprints.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/agile/1.0';

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
    sprints = new SprintsResource(transport, BASE_URL);
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
  });

  // ── getIssues ─────────────────────────────────────────────────────────────

  describe('getIssues()', () => {
    it('calls GET /sprint/{sprintId}/issue', async () => {
      // Arrange
      const payload = makeListResponse([makeBoardIssue('1', 'PROJ-1')]);
      transport.respondWith(payload);

      // Act
      const result = await sprints.getIssues(42);

      // Assert
      expect(result).toEqual(payload);
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

    it('joins fields array with commas', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await sprints.getIssues(42, { fields: ['summary', 'status'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        fields: 'summary,status',
      });
    });

    it('throws RangeError for maxResults: 0', async () => {
      await expect(sprints.getIssues(42, { maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: -1', async () => {
      await expect(sprints.getIssues(42, { maxResults: -1 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: 1.5', async () => {
      await expect(sprints.getIssues(42, { maxResults: 1.5 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: Infinity', async () => {
      await expect(sprints.getIssues(42, { maxResults: Infinity })).rejects.toThrow(RangeError);
    });

    it('throws ValidationError for non-positive sprintId', async () => {
      await expect(sprints.getIssues(0)).rejects.toThrow('sprintId must be a positive integer');
    });
  });
});

describe('SprintsResource sprintId validation', () => {
  let transport: MockTransport;
  let sprints: SprintsResource;

  beforeEach(() => {
    transport = new MockTransport();
    sprints = new SprintsResource(transport, BASE_URL);
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
