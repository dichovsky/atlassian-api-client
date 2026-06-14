import { describe, it, expect, beforeEach } from 'vitest';
import { BoardsResource, type QuickFilter } from '../../src/jira/resources/boards.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';
import type { Sprint } from '../../src/jira/resources/sprints.js';

const BASE_URL = 'https://test.atlassian.net/rest/agile/1.0';
const SOFTWARE_BASE_URL = 'https://test.atlassian.net/rest/software/1.0';

const makeBoard = (id: number, name: string) => ({
  id,
  self: `${BASE_URL}/board/${id}`,
  name,
  type: 'scrum' as const,
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

/**
 * Builds the wire-format response for the agile issue endpoints that return
 * `SearchResults` (`{issues:[...], startAt, maxResults, total}`).
 * The resource methods map `.issues` → `.values` before returning to callers.
 */
const makeIssueSearchResults = (issues: ReturnType<typeof makeBoardIssue>[]) => ({
  issues,
  startAt: 0,
  maxResults: 50,
  total: issues.length,
});

const makeSprint = (id: number, name: string): Sprint => ({
  id,
  self: `${BASE_URL}/sprint/${id}`,
  state: 'active',
  name,
  originBoardId: 1,
});

const makeSoftwareIssueResults = (keys: string[]) => ({
  issues: keys.map((key, i) => makeBoardIssue(String(i + 1), key)),
  nextPageToken: 'TOKEN-2',
  isLast: false,
});

describe('BoardsResource', () => {
  let transport: MockTransport;
  let boards: BoardsResource;

  beforeEach(() => {
    transport = new MockTransport();
    boards = new BoardsResource(transport, BASE_URL, SOFTWARE_BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /board with no params', async () => {
      // Arrange
      const payload = makeListResponse([makeBoard(1, 'Board 1')]);
      transport.respondWith(payload);

      // Act
      const result = await boards.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board`,
      });
    });

    it('passes all supported params correctly', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.list({
        startAt: 10,
        maxResults: 25,
        type: 'scrum',
        name: 'My Board',
        projectKeyOrId: 'PROJ',
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 10,
        maxResults: 25,
        type: 'scrum',
        name: 'My Board',
        projectKeyOrId: 'PROJ',
      });
    });

    it('passes kanban type param', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.list({ type: 'kanban' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ type: 'kanban' });
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.list({ maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: -1', async () => {
      await expect(boards.list({ maxResults: -1 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: 1.5', async () => {
      await expect(boards.list({ maxResults: 1.5 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: Infinity', async () => {
      await expect(boards.list({ maxResults: Infinity })).rejects.toThrow(ValidationError);
    });

    it('does not include undefined query params when params is empty object', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.list({});

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['type']).toBeUndefined();
      expect(query['name']).toBeUndefined();
      expect(query['projectKeyOrId']).toBeUndefined();
    });

    it('passes projectKeyOrId param', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.list({ projectKeyOrId: 'PROJ' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ projectKeyOrId: 'PROJ' });
    });

    it('passes all new B1056 params for list()', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act — 8 new params added by B1056 spec alignment
      await boards.list({
        accountIdLocation: 'account-123',
        projectLocation: 'project-loc',
        includePrivate: true,
        negateLocationFiltering: true,
        orderBy: 'name',
        expand: 'permissions',
        projectTypeLocation: 'software',
        filterId: 42,
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        accountIdLocation: 'account-123',
        projectLocation: 'project-loc',
        includePrivate: true,
        negateLocationFiltering: true,
        orderBy: 'name',
        expand: 'permissions',
        projectTypeLocation: 'software',
        filterId: 42,
      });
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /board/{boardId} with numeric ID', async () => {
      // Arrange
      const board = makeBoard(42, 'Sprint Board');
      transport.respondWith(board);

      // Act
      const result = await boards.get(42);

      // Assert
      expect(result).toEqual(board);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42`,
      });
    });

    it('throws ValidationError for non-positive boardId', async () => {
      await expect(boards.get(0)).rejects.toThrow('boardId must be a positive integer');
      await expect(boards.get(-1)).rejects.toThrow('boardId must be a positive integer');
    });
  });

  // ── getIssues ─────────────────────────────────────────────────────────────

  describe('getIssues()', () => {
    it('calls GET /board/{boardId}/issue and maps .issues → .values', async () => {
      // Arrange — wire response uses SearchResults shape (.issues); method maps to .values
      const issue = makeBoardIssue('1', 'PROJ-1');
      transport.respondWith(makeIssueSearchResults([issue]));

      // Act
      const result = await boards.getIssues(42);

      // Assert
      expect(result).toEqual({ values: [issue], startAt: 0, maxResults: 50, total: 1 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/issue`,
      });
    });

    it('passes startAt, maxResults, and jql params', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act
      await boards.getIssues(42, { startAt: 5, maxResults: 10, jql: 'status = Done' });

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
      await boards.getIssues(42, { fields: ['summary', 'status'] });

      // Assert — `fields` is `type: array` on the agile issue endpoint:
      // repeated params in the path, never `fields=summary%2Cstatus`.
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/board/42/issue?fields=summary&fields=status`,
      );
      expect(transport.lastCall?.options.path).not.toContain('fields=summary%2Cstatus');
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.getIssues(42, { maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: -1', async () => {
      await expect(boards.getIssues(42, { maxResults: -1 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: 1.5', async () => {
      await expect(boards.getIssues(42, { maxResults: 1.5 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: Infinity', async () => {
      await expect(boards.getIssues(42, { maxResults: Infinity })).rejects.toThrow(ValidationError);
    });

    it('passes validateQuery and expand params (B1056)', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act — params added in B1056 spec alignment
      await boards.getIssues(42, { validateQuery: false, expand: 'changelog' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        validateQuery: false,
        expand: 'changelog',
      });
    });

    it('throws ValidationError for non-positive boardId', async () => {
      await expect(boards.getIssues(0)).rejects.toThrow('boardId must be a positive integer');
      await expect(boards.getIssues(-5)).rejects.toThrow('boardId must be a positive integer');
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('paginates with offset across multiple responses and yields all boards', async () => {
      // Arrange
      transport
        .respondWith({
          values: [makeBoard(1, 'Board 1')],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeBoard(2, 'Board 2')],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      // Act
      const items: { id: number }[] = [];
      for await (const board of boards.listAll()) {
        items.push(board);
      }

      // Assert
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe(1);
      expect(items[1]?.id).toBe(2);
      expect(transport.calls).toHaveLength(2);
    });

    it('passes params to the underlying pagination call', async () => {
      // Arrange
      transport.respondWith({
        values: [],
        startAt: 0,
        maxResults: 10,
        total: 0,
        isLast: true,
      });

      // Act
      for await (const _ of boards.listAll({ type: 'scrum', name: 'Sprint' })) {
        // consume
      }

      // Assert
      expect(transport.calls[0]?.options.query).toMatchObject({
        type: 'scrum',
        name: 'Sprint',
      });
    });

    it('works with no params', async () => {
      // Arrange
      transport.respondWith({
        values: [],
        startAt: 0,
        maxResults: 50,
        isLast: true,
      });

      // Act
      const items: unknown[] = [];
      for await (const item of boards.listAll()) {
        items.push(item);
      }

      // Assert
      expect(items).toHaveLength(0);
    });

    it('throws ValidationError for maxResults: 0', async () => {
      const gen = boards.listAll({ maxResults: 0 });
      await expect(gen.next()).rejects.toThrow(ValidationError);
    });

    it('passes all listAll params including projectKeyOrId', async () => {
      // Arrange
      transport.respondWith({
        values: [],
        startAt: 0,
        maxResults: 10,
        isLast: true,
      });

      // Act
      for await (const _ of boards.listAll({
        maxResults: 10,
        type: 'kanban',
        name: 'Board',
        projectKeyOrId: 'PROJ',
      })) {
        // consume
      }

      // Assert
      expect(transport.calls[0]?.options.query).toMatchObject({
        maxResults: 10,
        type: 'kanban',
        name: 'Board',
        projectKeyOrId: 'PROJ',
      });
    });

    it('omits undefined optional params when params object is provided with only maxResults', async () => {
      // Arrange
      transport.respondWith({
        values: [],
        startAt: 0,
        maxResults: 5,
        isLast: true,
      });

      // Act
      for await (const _ of boards.listAll({ maxResults: 5 })) {
        // consume
      }

      // Assert
      const query = transport.calls[0]?.options.query ?? {};
      expect(query['type']).toBeUndefined();
      expect(query['name']).toBeUndefined();
      expect(query['projectKeyOrId']).toBeUndefined();
    });
  });

  // ── listSprints ───────────────────────────────────────────────────────────

  describe('listSprints()', () => {
    it('calls GET /board/{boardId}/sprint with no params', async () => {
      // Arrange
      const payload = makeListResponse([makeSprint(10, 'Sprint 1')]);
      transport.respondWith(payload);

      // Act
      const result = await boards.listSprints(42);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/sprint`,
      });
    });

    it('passes startAt, maxResults, and state params', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.listSprints(42, { startAt: 5, maxResults: 10, state: 'active,closed' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 10,
        state: 'active,closed',
      });
    });

    it('passes only state when startAt and maxResults are omitted', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.listSprints(42, { state: 'future' });

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['state']).toBe('future');
      expect(query['startAt']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
    });

    it('does not include undefined query params when params is empty object', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.listSprints(42, {});

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['startAt']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
      expect(query['state']).toBeUndefined();
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.listSprints(0)).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for boardId = -1', async () => {
      await expect(boards.listSprints(-1)).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for non-integer boardId', async () => {
      await expect(boards.listSprints(1.5)).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.listSprints(42, { maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: -1', async () => {
      await expect(boards.listSprints(42, { maxResults: -1 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: Infinity', async () => {
      await expect(boards.listSprints(42, { maxResults: Infinity })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── getSprintIssues ───────────────────────────────────────────────────────

  describe('getSprintIssues()', () => {
    it('calls GET /board/{boardId}/sprint/{sprintId}/issue and maps .issues → .values', async () => {
      // Arrange — wire response uses SearchResults-like shape (.issues); method maps to .values
      const issue = makeBoardIssue('1', 'PROJ-1');
      transport.respondWith(makeIssueSearchResults([issue]));

      // Act
      const result = await boards.getSprintIssues(42, 10);

      // Assert
      expect(result).toEqual({ values: [issue], startAt: 0, maxResults: 50, total: 1 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/sprint/10/issue`,
      });
    });

    it('passes startAt, maxResults, jql, and fields params', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act
      await boards.getSprintIssues(42, 10, {
        startAt: 5,
        maxResults: 20,
        jql: 'status = Done',
        fields: ['summary', 'status'],
      });

      // Assert — `fields` is `type: array` → repeated params in the path (B1049).
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 20,
        jql: 'status = Done',
      });
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/board/42/sprint/10/issue?fields=summary&fields=status`,
      );
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
    });

    it('serializes fields array as repeated params, not CSV (B1049)', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act
      await boards.getSprintIssues(42, 10, { fields: ['assignee', 'priority', 'labels'] });

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/board/42/sprint/10/issue?fields=assignee&fields=priority&fields=labels`,
      );
      expect(transport.lastCall?.options.path).not.toContain('%2C');
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
    });

    it('does not include undefined query params when params is empty object', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act
      await boards.getSprintIssues(42, 10, {});

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['startAt']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
      expect(query['jql']).toBeUndefined();
      expect(query['fields']).toBeUndefined();
    });

    it('passes validateQuery and expand params (B1056)', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act — params added in B1056 spec alignment
      await boards.getSprintIssues(42, 10, { validateQuery: true, expand: 'names' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        validateQuery: true,
        expand: 'names',
      });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.getSprintIssues(0, 10)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for boardId = -1', async () => {
      await expect(boards.getSprintIssues(-1, 10)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for non-integer boardId', async () => {
      await expect(boards.getSprintIssues(1.5, 10)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for sprintId = 0', async () => {
      await expect(boards.getSprintIssues(42, 0)).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('throws ValidationError for sprintId = -5', async () => {
      await expect(boards.getSprintIssues(42, -5)).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('throws ValidationError for non-integer sprintId', async () => {
      await expect(boards.getSprintIssues(42, 2.7)).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.getSprintIssues(42, 10, { maxResults: 0 })).rejects.toThrow(
        ValidationError,
      );
    });

    it('throws ValidationError for maxResults: -1', async () => {
      await expect(boards.getSprintIssues(42, 10, { maxResults: -1 })).rejects.toThrow(
        ValidationError,
      );
    });

    it('throws ValidationError for maxResults: Infinity', async () => {
      await expect(boards.getSprintIssues(42, 10, { maxResults: Infinity })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /board with name, type, filterId', async () => {
      // Arrange
      const board = makeBoard(99, 'New Board');
      transport.respondWith(board);

      // Act
      const result = await boards.create({ name: 'New Board', type: 'scrum', filterId: 5 });

      // Assert
      expect(result).toEqual(board);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/board`,
        body: { name: 'New Board', type: 'scrum', filterId: 5 },
      });
    });

    it('includes optional location when provided', async () => {
      // Arrange
      transport.respondWith(makeBoard(100, 'Board'));

      // Act
      await boards.create({
        name: 'Board',
        type: 'kanban',
        filterId: 10,
        location: { type: 'project', projectKeyOrId: 'PROJ' },
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        location: { type: 'project', projectKeyOrId: 'PROJ' },
      });
    });

    it('throws ValidationError for empty name', async () => {
      await expect(boards.create({ name: '', type: 'scrum', filterId: 1 })).rejects.toThrow(
        'name must be a non-empty string',
      );
    });

    it('accepts filterId: 0 (spec has no minimum; 0 is a valid non-negative integer)', async () => {
      // filterId: 0 was previously rejected, but spec places no minimum constraint
      transport.respondWith({
        id: 1,
        name: 'Board',
        type: 'scrum',
        self: 'https://test.atlassian.net/rest/agile/1.0/board/1',
      });
      const result = await boards.create({ name: 'Board', type: 'scrum', filterId: 0 });
      expect(result).toMatchObject({ id: 1, name: 'Board' });
    });

    it('throws ValidationError for negative filterId', async () => {
      await expect(boards.create({ name: 'Board', type: 'scrum', filterId: -1 })).rejects.toThrow(
        'filterId must be a non-negative integer',
      );
    });

    it('throws ValidationError when type is not a valid enum value', async () => {
      // Valid types per spec: 'kanban', 'scrum', 'agility' (spec dropped 'simple')
      await expect(
        boards.create({ name: 'Board', type: '' as 'scrum', filterId: 1 }),
      ).rejects.toThrow('type must be one of: kanban, scrum, agility');
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /board/{boardId}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await boards.delete(42);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/board/42`,
      });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.delete(0)).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for negative boardId', async () => {
      await expect(boards.delete(-1)).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for non-integer boardId', async () => {
      await expect(boards.delete(1.5)).rejects.toThrow('boardId must be a positive integer');
    });
  });

  // ── getBacklog ─────────────────────────────────────────────────────────────

  describe('getBacklog()', () => {
    it('calls GET /board/{boardId}/backlog and maps .issues → .values', async () => {
      // Arrange — wire response uses SearchResults shape (.issues); method maps to .values
      const issue = makeBoardIssue('1', 'PROJ-1');
      transport.respondWith(makeIssueSearchResults([issue]));

      // Act
      const result = await boards.getBacklog(42);

      // Assert
      expect(result).toEqual({ values: [issue], startAt: 0, maxResults: 50, total: 1 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/backlog`,
      });
    });

    it('passes startAt, maxResults, jql, and fields params', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act
      await boards.getBacklog(42, {
        startAt: 5,
        maxResults: 20,
        jql: 'status = Done',
        fields: ['summary', 'status'],
      });

      // Assert — `fields` is `type: array` → repeated params in the path (B1049).
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 20,
        jql: 'status = Done',
      });
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/board/42/backlog?fields=summary&fields=status`,
      );
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
    });

    it('passes only jql and fields without startAt or maxResults', async () => {
      transport.respondWith(makeIssueSearchResults([]));
      await boards.getBacklog(42, { jql: 'status = Open', fields: ['id'] });
      const q = transport.lastCall?.options.query ?? {};
      expect(q).not.toHaveProperty('startAt');
      expect(q).not.toHaveProperty('maxResults');
      expect(q).toMatchObject({ jql: 'status = Open' });
      // `fields` is a repeated param in the path, not the query bag (B1049).
      expect(q).not.toHaveProperty('fields');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/board/42/backlog?fields=id`);
    });

    it('passes only startAt without jql or fields', async () => {
      transport.respondWith(makeIssueSearchResults([]));
      await boards.getBacklog(42, { startAt: 5 });
      const q = transport.lastCall?.options.query ?? {};
      expect(q).not.toHaveProperty('jql');
      expect(q).not.toHaveProperty('fields');
      expect(q).toMatchObject({ startAt: 5 });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.getBacklog(0)).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for negative boardId', async () => {
      await expect(boards.getBacklog(-3)).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.getBacklog(42, { maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: Infinity', async () => {
      await expect(boards.getBacklog(42, { maxResults: Infinity })).rejects.toThrow(
        ValidationError,
      );
    });

    it('passes validateQuery and expand params (B1056)', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act — params added in B1056 spec alignment
      await boards.getBacklog(42, { validateQuery: false, expand: 'changelog' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        validateQuery: false,
        expand: 'changelog',
      });
    });
  });

  // ── getConfiguration ──────────────────────────────────────────────────────

  describe('getConfiguration()', () => {
    it('calls GET /board/{boardId}/configuration', async () => {
      // Arrange
      const config = {
        id: 42,
        self: `${BASE_URL}/board/42/configuration`,
        name: 'Board Config',
        type: 'scrum',
      };
      transport.respondWith(config);

      // Act
      const result = await boards.getConfiguration(42);

      // Assert
      expect(result).toEqual(config);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/configuration`,
      });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.getConfiguration(0)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for negative boardId', async () => {
      await expect(boards.getConfiguration(-1)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });
  });

  // ── listEpics ─────────────────────────────────────────────────────────────

  describe('listEpics()', () => {
    const makeEpic = (id: number, name: string) => ({
      id,
      self: `${BASE_URL}/epic/${id}`,
      name,
      done: false,
    });

    it('calls GET /board/{boardId}/epic', async () => {
      // Arrange
      const payload = makeListResponse([makeEpic(5, 'Epic 1')]);
      transport.respondWith(payload);

      // Act
      const result = await boards.listEpics(42);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/epic`,
      });
    });

    it('passes startAt, maxResults, and done params as strings (spec is type:string)', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act — spec declares `done` as type:string with valid values 'true'/'false'
      await boards.listEpics(42, { startAt: 5, maxResults: 10, done: 'false' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 10,
        done: 'false',
      });
    });

    it('passes only done param without startAt or maxResults', async () => {
      transport.respondWith(makeListResponse([]));
      await boards.listEpics(42, { done: 'true' });
      const q = transport.lastCall?.options.query ?? {};
      expect(q).not.toHaveProperty('startAt');
      expect(q).not.toHaveProperty('maxResults');
      expect(q).toMatchObject({ done: 'true' });
    });

    it('passes startAt and maxResults without done', async () => {
      transport.respondWith(makeListResponse([]));
      await boards.listEpics(42, { startAt: 5, maxResults: 10 });
      const q = transport.lastCall?.options.query ?? {};
      expect(q).not.toHaveProperty('done');
      expect(q).toMatchObject({ startAt: 5, maxResults: 10 });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.listEpics(0)).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.listEpics(42, { maxResults: 0 })).rejects.toThrow(ValidationError);
    });
  });

  // ── getEpicIssues ─────────────────────────────────────────────────────────

  describe('getEpicIssues()', () => {
    it('calls GET /board/{boardId}/epic/{epicId}/issue and maps .issues → .values', async () => {
      // Arrange — wire response uses SearchResults-like shape (.issues); method maps to .values
      const issue = makeBoardIssue('1', 'PROJ-1');
      transport.respondWith(makeIssueSearchResults([issue]));

      // Act
      const result = await boards.getEpicIssues(42, 7);

      // Assert
      expect(result).toEqual({ values: [issue], startAt: 0, maxResults: 50, total: 1 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/epic/7/issue`,
      });
    });

    it('passes jql and fields params', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act
      await boards.getEpicIssues(42, 7, { jql: 'status = Done', fields: ['summary'] });

      // Assert — `fields` is `type: array` → repeated param in the path (B1049).
      expect(transport.lastCall?.options.query).toMatchObject({
        jql: 'status = Done',
      });
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/board/42/epic/7/issue?fields=summary`,
      );
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
    });

    it('passes startAt and maxResults without jql or fields', async () => {
      transport.respondWith(makeIssueSearchResults([]));
      await boards.getEpicIssues(42, 7, { startAt: 5, maxResults: 10 });
      const q = transport.lastCall?.options.query ?? {};
      expect(q).not.toHaveProperty('jql');
      expect(q).not.toHaveProperty('fields');
      expect(q).toMatchObject({ startAt: 5, maxResults: 10 });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.getEpicIssues(0, 7)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for epicId = 0', async () => {
      await expect(boards.getEpicIssues(42, 0)).rejects.toThrow(
        'epicId must be a positive integer',
      );
    });

    it('throws ValidationError for negative epicId', async () => {
      await expect(boards.getEpicIssues(42, -1)).rejects.toThrow(
        'epicId must be a positive integer',
      );
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.getEpicIssues(42, 7, { maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('passes validateQuery and expand params (B1056)', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act — params added in B1056 spec alignment
      await boards.getEpicIssues(42, 7, { validateQuery: false, expand: 'changelog' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        validateQuery: false,
        expand: 'changelog',
      });
    });
  });

  // ── getIssuesWithoutEpic ──────────────────────────────────────────────────

  describe('getIssuesWithoutEpic()', () => {
    it('calls GET /board/{boardId}/epic/none/issue and maps .issues → .values', async () => {
      // Arrange — wire response uses SearchResults-like shape (.issues); method maps to .values
      const issue = makeBoardIssue('2', 'PROJ-2');
      transport.respondWith(makeIssueSearchResults([issue]));

      // Act
      const result = await boards.getIssuesWithoutEpic(42);

      // Assert
      expect(result).toEqual({ values: [issue], startAt: 0, maxResults: 50, total: 1 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/epic/none/issue`,
      });
    });

    it('passes jql and fields params', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act
      await boards.getIssuesWithoutEpic(42, { jql: 'status != Done', fields: ['summary'] });

      // Assert — `fields` is `type: array` → repeated param in the path (B1049).
      expect(transport.lastCall?.options.query).toMatchObject({
        jql: 'status != Done',
      });
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/board/42/epic/none/issue?fields=summary`,
      );
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
    });

    it('passes startAt and maxResults without jql or fields', async () => {
      transport.respondWith(makeIssueSearchResults([]));
      await boards.getIssuesWithoutEpic(42, { startAt: 5, maxResults: 10 });
      const q = transport.lastCall?.options.query ?? {};
      expect(q).not.toHaveProperty('jql');
      expect(q).not.toHaveProperty('fields');
      expect(q).toMatchObject({ startAt: 5, maxResults: 10 });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.getIssuesWithoutEpic(0)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.getIssuesWithoutEpic(42, { maxResults: 0 })).rejects.toThrow(
        ValidationError,
      );
    });

    it('passes validateQuery and expand params (B1056)', async () => {
      // Arrange
      transport.respondWith(makeIssueSearchResults([]));

      // Act — params added in B1056 spec alignment
      await boards.getIssuesWithoutEpic(42, { validateQuery: true, expand: 'names' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        validateQuery: true,
        expand: 'names',
      });
    });
  });

  // ── getFeatures ───────────────────────────────────────────────────────────

  describe('getFeatures()', () => {
    it('calls GET /board/{boardId}/features', async () => {
      // Arrange
      const payload = {
        features: [
          {
            boardFeature: 'SIMPLE_ROADMAP',
            boardId: 42,
            state: 'ENABLED' as const,
            togglable: true,
          },
        ],
      };
      transport.respondWith(payload);

      // Act
      const result = await boards.getFeatures(42);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/features`,
      });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.getFeatures(0)).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for negative boardId', async () => {
      await expect(boards.getFeatures(-1)).rejects.toThrow('boardId must be a positive integer');
    });
  });

  // ── toggleFeature ─────────────────────────────────────────────────────────

  describe('toggleFeature()', () => {
    it('sends spec body field `enabling` (boolean), not `state` string — enabling=true', async () => {
      // Agile spec toggleFeatures (PUT /board/{boardId}/features) body =
      // { boardId: integer, enabling: boolean, feature: string }, additionalProperties:false.
      const payload = { features: [] };
      transport.respondWith(payload);

      const result = await boards.toggleFeature(42, {
        feature: 'SIMPLE_ROADMAP',
        enabling: true,
      });

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/board/42/features`,
        body: { boardId: 42, enabling: true, feature: 'SIMPLE_ROADMAP' },
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect('state' in body).toBe(false);
    });

    it('sends enabling=false when disabling a feature', async () => {
      transport.respondWith({ features: [] });

      await boards.toggleFeature(42, { feature: 'SIMPLE_ROADMAP', enabling: false });

      expect(transport.lastCall?.options).toMatchObject({
        body: { boardId: 42, enabling: false, feature: 'SIMPLE_ROADMAP' },
      });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(
        boards.toggleFeature(0, { feature: 'SIMPLE_ROADMAP', enabling: true }),
      ).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for empty feature name', async () => {
      await expect(boards.toggleFeature(42, { feature: '', enabling: true })).rejects.toThrow(
        'feature must be a non-empty string',
      );
    });

    it('throws ValidationError when enabling is not a boolean', async () => {
      await expect(
        // @ts-expect-error testing invalid runtime value
        boards.toggleFeature(42, { feature: 'SIMPLE_ROADMAP', enabling: 'yes' }),
      ).rejects.toThrow('enabling must be a boolean');
    });
  });

  // ── moveIssues ────────────────────────────────────────────────────────────

  describe('moveIssues()', () => {
    it('calls POST /board/{boardId}/issue with issues array', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await boards.moveIssues(42, ['PROJ-1', 'PROJ-2']);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/board/42/issue`,
        body: { issues: ['PROJ-1', 'PROJ-2'] },
      });
    });

    it('includes rankBeforeIssue and rankAfterIssue when provided', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await boards.moveIssues(42, ['PROJ-1'], 'PROJ-2', 'PROJ-3');

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        issues: ['PROJ-1'],
        rankBeforeIssue: 'PROJ-2',
        rankAfterIssue: 'PROJ-3',
      });
    });

    it('includes only rankBeforeIssue when rankAfterIssue is omitted', async () => {
      transport.respondWith(undefined);
      await boards.moveIssues(42, ['PROJ-1'], 'PROJ-2', undefined);
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).toMatchObject({ issues: ['PROJ-1'], rankBeforeIssue: 'PROJ-2' });
      expect(body).not.toHaveProperty('rankAfterIssue');
    });

    it('includes only rankAfterIssue when rankBeforeIssue is omitted', async () => {
      transport.respondWith(undefined);
      await boards.moveIssues(42, ['PROJ-1'], undefined, 'PROJ-3');
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).toMatchObject({ issues: ['PROJ-1'], rankAfterIssue: 'PROJ-3' });
      expect(body).not.toHaveProperty('rankBeforeIssue');
    });

    it('includes rankCustomFieldId when provided (B1056)', async () => {
      // rankCustomFieldId was added by B1056 spec alignment
      transport.respondWith(undefined);
      await boards.moveIssues(42, ['PROJ-1'], undefined, undefined, 10001);
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).toMatchObject({ issues: ['PROJ-1'], rankCustomFieldId: 10001 });
      expect(body).not.toHaveProperty('rankBeforeIssue');
      expect(body).not.toHaveProperty('rankAfterIssue');
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.moveIssues(0, ['PROJ-1'])).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for empty issues array', async () => {
      await expect(boards.moveIssues(42, [])).rejects.toThrow('issues must be a non-empty array');
    });

    it('throws ValidationError for issues entry with empty string', async () => {
      await expect(boards.moveIssues(42, [''])).rejects.toThrow(
        'issues entries must be non-empty strings',
      );
    });

    it('throws ValidationError when issues array exceeds 50 entries', async () => {
      const issues = Array.from({ length: 51 }, (_, i) => `PROJ-${i + 1}`);
      await expect(boards.moveIssues(42, issues)).rejects.toThrow(
        'issues must contain at most 50 entries',
      );
    });
  });

  // ── listProjects ──────────────────────────────────────────────────────────

  describe('listProjects()', () => {
    const makeProject = (id: string, key: string) => ({
      id,
      key,
      self: `${BASE_URL}/project/${key}`,
      name: `Project ${key}`,
    });

    it('calls GET /board/{boardId}/project', async () => {
      // Arrange
      const payload = makeListResponse([makeProject('10001', 'PROJ')]);
      transport.respondWith(payload);

      // Act
      const result = await boards.listProjects(42);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/project`,
      });
    });

    it('passes startAt and maxResults params', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.listProjects(42, { startAt: 5, maxResults: 10 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 10 });
    });

    it('passes only maxResults without startAt', async () => {
      transport.respondWith(makeListResponse([]));
      await boards.listProjects(42, { maxResults: 10 });
      const q = transport.lastCall?.options.query ?? {};
      expect(q).not.toHaveProperty('startAt');
      expect(q).toMatchObject({ maxResults: 10 });
    });

    it('passes only startAt without maxResults', async () => {
      transport.respondWith(makeListResponse([]));
      await boards.listProjects(42, { startAt: 5 });
      const q = transport.lastCall?.options.query ?? {};
      expect(q).not.toHaveProperty('maxResults');
      expect(q).toMatchObject({ startAt: 5 });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.listProjects(0)).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.listProjects(42, { maxResults: 0 })).rejects.toThrow(ValidationError);
    });
  });

  // ── listProjectsFull ──────────────────────────────────────────────────────

  describe('listProjectsFull()', () => {
    it('calls GET /board/{boardId}/project/full', async () => {
      // Arrange
      const payload = makeListResponse([]);
      transport.respondWith(payload);

      // Act
      const result = await boards.listProjectsFull(42);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/project/full`,
      });
    });

    it('passes startAt and maxResults params', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.listProjectsFull(42, { startAt: 0, maxResults: 5 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 0, maxResults: 5 });
    });

    it('passes only maxResults without startAt', async () => {
      transport.respondWith(makeListResponse([]));
      await boards.listProjectsFull(42, { maxResults: 10 });
      const q = transport.lastCall?.options.query ?? {};
      expect(q).not.toHaveProperty('startAt');
      expect(q).toMatchObject({ maxResults: 10 });
    });

    it('passes only startAt without maxResults', async () => {
      transport.respondWith(makeListResponse([]));
      await boards.listProjectsFull(42, { startAt: 5 });
      const q = transport.lastCall?.options.query ?? {};
      expect(q).not.toHaveProperty('maxResults');
      expect(q).toMatchObject({ startAt: 5 });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.listProjectsFull(0)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.listProjectsFull(42, { maxResults: 0 })).rejects.toThrow(ValidationError);
    });
  });

  // ── listVersions ──────────────────────────────────────────────────────────

  describe('listVersions()', () => {
    const makeVersion = (id: number, name: string) => ({
      id,
      self: `${BASE_URL}/version/${id}`,
      name,
    });

    it('calls GET /board/{boardId}/version', async () => {
      // Arrange
      const payload = makeListResponse([makeVersion(1, 'v1.0')]);
      transport.respondWith(payload);

      // Act
      const result = await boards.listVersions(42);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/version`,
      });
    });

    it('passes startAt, maxResults, and released params as string (spec is type:string)', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act — spec declares `released` as type:string with valid values 'true'/'false'
      await boards.listVersions(42, { startAt: 0, maxResults: 20, released: 'true' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 0,
        maxResults: 20,
        released: 'true',
      });
    });

    it('passes only maxResults without startAt or released', async () => {
      transport.respondWith(makeListResponse([]));
      await boards.listVersions(42, { maxResults: 10 });
      const q = transport.lastCall?.options.query ?? {};
      expect(q).not.toHaveProperty('startAt');
      expect(q).not.toHaveProperty('released');
      expect(q).toMatchObject({ maxResults: 10 });
    });

    it('passes only startAt without maxResults or released', async () => {
      transport.respondWith(makeListResponse([]));
      await boards.listVersions(42, { startAt: 5 });
      const q = transport.lastCall?.options.query ?? {};
      expect(q).not.toHaveProperty('maxResults');
      expect(q).not.toHaveProperty('released');
      expect(q).toMatchObject({ startAt: 5 });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.listVersions(0)).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for negative boardId', async () => {
      await expect(boards.listVersions(-5)).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.listVersions(42, { maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: Infinity', async () => {
      await expect(boards.listVersions(42, { maxResults: Infinity })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── listByFilter ──────────────────────────────────────────────────────────

  describe('listByFilter()', () => {
    it('calls GET /board/filter/{filterId}', async () => {
      // Arrange
      const payload = makeListResponse([makeBoard(1, 'Board 1')]);
      transport.respondWith(payload);

      // Act
      const result = await boards.listByFilter(5);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/filter/5`,
      });
    });

    it('passes startAt and maxResults params', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.listByFilter(5, { startAt: 10, maxResults: 25 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('passes only maxResults without startAt', async () => {
      transport.respondWith(makeListResponse([]));
      await boards.listByFilter(5, { maxResults: 15 });
      const q = transport.lastCall?.options.query ?? {};
      expect(q).not.toHaveProperty('startAt');
      expect(q).toMatchObject({ maxResults: 15 });
    });

    it('passes only startAt without maxResults', async () => {
      transport.respondWith(makeListResponse([]));
      await boards.listByFilter(5, { startAt: 3 });
      const q = transport.lastCall?.options.query ?? {};
      expect(q).not.toHaveProperty('maxResults');
      expect(q).toMatchObject({ startAt: 3 });
    });

    it('throws ValidationError for filterId = 0', async () => {
      await expect(boards.listByFilter(0)).rejects.toThrow('filterId must be a positive integer');
    });

    it('throws ValidationError for negative filterId', async () => {
      await expect(boards.listByFilter(-1)).rejects.toThrow('filterId must be a positive integer');
    });

    it('throws ValidationError for non-integer filterId', async () => {
      await expect(boards.listByFilter(1.5)).rejects.toThrow('filterId must be a positive integer');
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.listByFilter(5, { maxResults: 0 })).rejects.toThrow(ValidationError);
    });
  });

  // ── listProperties ────────────────────────────────────────────────────────

  describe('listProperties()', () => {
    it('calls GET /board/{boardId}/properties', async () => {
      // Arrange
      const payload = {
        keys: [{ self: `${BASE_URL}/board/42/properties/my-key`, key: 'my-key' }],
      };
      transport.respondWith(payload);

      // Act
      const result = await boards.listProperties(42);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/properties`,
      });
    });

    it('returns empty keys array when no properties exist', async () => {
      // Arrange
      transport.respondWith({ keys: [] });

      // Act
      const result = await boards.listProperties(1);

      // Assert
      expect(result).toEqual({ keys: [] });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.listProperties(0)).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for boardId < 0', async () => {
      await expect(boards.listProperties(-1)).rejects.toThrow('boardId must be a positive integer');
    });
  });

  // ── deleteProperty ────────────────────────────────────────────────────────

  describe('deleteProperty()', () => {
    it('calls DELETE /board/{boardId}/properties/{propertyKey}', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      const result = await boards.deleteProperty(42, 'my-key');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/board/42/properties/my-key`,
      });
    });

    it('does not send a body', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await boards.deleteProperty(1, 'x');

      // Assert
      expect(transport.lastCall?.options.body).toBeUndefined();
    });

    it('URL-encodes propertyKey with spaces', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await boards.deleteProperty(5, 'my key/with space');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/board/5/properties/my%20key%2Fwith%20space`,
      );
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.deleteProperty(0, 'key')).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for boardId < 0', async () => {
      await expect(boards.deleteProperty(-1, 'key')).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for empty propertyKey', async () => {
      await expect(boards.deleteProperty(1, '')).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
    });
  });

  // ── getProperty ───────────────────────────────────────────────────────────

  describe('getProperty()', () => {
    it('calls GET /board/{boardId}/properties/{propertyKey}', async () => {
      // Arrange
      const payload = { key: 'my-key', value: { foo: 'bar' } };
      transport.respondWith(payload);

      // Act
      const result = await boards.getProperty(42, 'my-key');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/properties/my-key`,
      });
    });

    it('URL-encodes propertyKey with spaces and slashes', async () => {
      // Arrange
      transport.respondWith({ key: 'my key/with space', value: null });

      // Act
      await boards.getProperty(5, 'my key/with space');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/board/5/properties/my%20key%2Fwith%20space`,
      );
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.getProperty(0, 'key')).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for boardId < 0', async () => {
      await expect(boards.getProperty(-1, 'key')).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for empty propertyKey', async () => {
      await expect(boards.getProperty(1, '')).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
    });
  });

  // ── setProperty ───────────────────────────────────────────────────────────

  describe('setProperty()', () => {
    it('calls PUT /board/{boardId}/properties/{propertyKey} with object value', async () => {
      // Arrange
      transport.respondWith(undefined, 200);
      const value = { enabled: true, threshold: 42 };

      // Act
      await boards.setProperty(42, 'my-key', value);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/board/42/properties/my-key`,
        body: value,
      });
    });

    it('accepts array value', async () => {
      // Arrange
      transport.respondWith(undefined, 201);
      const value = [1, 2, 3];

      // Act
      await boards.setProperty(7, 'tags', value);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/board/7/properties/tags`,
        body: value,
      });
    });

    it('accepts string value', async () => {
      // Arrange
      transport.respondWith(undefined, 200);

      // Act
      await boards.setProperty(3, 'label', 'hello');

      // Assert
      expect(transport.lastCall?.options.body).toBe('hello');
    });

    it('accepts number value', async () => {
      // Arrange
      transport.respondWith(undefined, 200);

      // Act
      await boards.setProperty(3, 'count', 99);

      // Assert
      expect(transport.lastCall?.options.body).toBe(99);
    });

    it('accepts null value', async () => {
      // Arrange
      transport.respondWith(undefined, 200);

      // Act
      await boards.setProperty(3, 'nullable', null);

      // Assert
      expect(transport.lastCall?.options.body).toBeNull();
    });

    it('accepts boolean value', async () => {
      // Arrange
      transport.respondWith(undefined, 200);

      // Act
      await boards.setProperty(3, 'flag', false);

      // Assert
      expect(transport.lastCall?.options.body).toBe(false);
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.setProperty(0, 'key', {})).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for boardId < 0', async () => {
      await expect(boards.setProperty(-1, 'key', {})).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for empty propertyKey', async () => {
      await expect(boards.setProperty(1, '', {})).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
    });
  });

  // ── listQuickFilters ──────────────────────────────────────────────────────

  describe('listQuickFilters()', () => {
    const makeQuickFilter = (id: number, name: string): QuickFilter => ({
      id,
      boardId: 42,
      name,
      jql: `status = "${name}"`,
    });

    it('calls GET /board/{boardId}/quickfilter with no params', async () => {
      // Arrange
      const payload = makeListResponse([makeQuickFilter(1, 'My Filter')]);
      transport.respondWith(payload);

      // Act
      const result = await boards.listQuickFilters(42);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/quickfilter`,
      });
    });

    it('passes startAt and maxResults params', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.listQuickFilters(42, { startAt: 5, maxResults: 10 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 10,
      });
    });

    it('does not include undefined query params when params is empty object', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.listQuickFilters(42, {});

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['startAt']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.listQuickFilters(0)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for boardId < 0', async () => {
      await expect(boards.listQuickFilters(-1)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.listQuickFilters(42, { maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: -1', async () => {
      await expect(boards.listQuickFilters(42, { maxResults: -1 })).rejects.toThrow(
        ValidationError,
      );
    });

    it('throws ValidationError for maxResults: Infinity', async () => {
      await expect(boards.listQuickFilters(42, { maxResults: Infinity })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── getQuickFilter ────────────────────────────────────────────────────────

  describe('getQuickFilter()', () => {
    it('calls GET /board/{boardId}/quickfilter/{quickFilterId}', async () => {
      // Arrange
      const payload: QuickFilter = { id: 7, boardId: 42, name: 'My Filter', jql: 'status = Done' };
      transport.respondWith(payload);

      // Act
      const result = await boards.getQuickFilter(42, 7);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/quickfilter/7`,
      });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.getQuickFilter(0, 7)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for boardId < 0', async () => {
      await expect(boards.getQuickFilter(-1, 7)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for quickFilterId = 0', async () => {
      await expect(boards.getQuickFilter(42, 0)).rejects.toThrow(
        'quickFilterId must be a positive integer',
      );
    });

    it('throws ValidationError for quickFilterId < 0', async () => {
      await expect(boards.getQuickFilter(42, -1)).rejects.toThrow(
        'quickFilterId must be a positive integer',
      );
    });
  });

  // ── getReports ────────────────────────────────────────────────────────────

  describe('getReports()', () => {
    it('calls GET /board/{boardId}/reports', async () => {
      // Arrange
      const payload = { burndown: { type: 'burndown' }, velocity: { type: 'velocity' } };
      transport.respondWith(payload);

      // Act
      const result = await boards.getReports(42);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/reports`,
      });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.getReports(0)).rejects.toThrow('boardId must be a positive integer');
    });

    it('throws ValidationError for boardId < 0', async () => {
      await expect(boards.getReports(-1)).rejects.toThrow('boardId must be a positive integer');
    });
  });

  // ── Enhanced (JSIS) board issue endpoints (B1023-B1027) ─────────────────────

  describe('getBacklogEnhanced()', () => {
    it('calls GET software /board/{boardId}/backlog and passes the page through', async () => {
      const payload = makeSoftwareIssueResults(['PROJ-1', 'PROJ-2']);
      transport.respondWith(payload);

      const result = await boards.getBacklogEnhanced(42);

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${SOFTWARE_BASE_URL}/board/42/backlog`,
      });
    });

    it('threads scalar params into query and repeated fields into the path (B1049)', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));

      await boards.getBacklogEnhanced(42, {
        nextPageToken: 'TOK',
        maxResults: 20,
        jql: 'status = Done',
        fields: ['summary', 'status'],
        expand: 'names',
      });

      // `expand` is `type: string` (stays in the query bag); `fields` is
      // `type: array` on the JSIS endpoint → repeated params in the path.
      expect(transport.lastCall?.options.query).toMatchObject({
        nextPageToken: 'TOK',
        maxResults: 20,
        jql: 'status = Done',
        expand: 'names',
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
      expect(transport.lastCall?.options.path).toBe(
        `${SOFTWARE_BASE_URL}/board/42/backlog?fields=summary&fields=status`,
      );
    });

    it('threads validateQuery into query when provided', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));

      await boards.getBacklogEnhanced(42, { validateQuery: false });

      expect(transport.lastCall?.options.query).toMatchObject({ validateQuery: false });
    });

    it('serializes reconcileIssues as repeated params in the path (not CSV)', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));

      await boards.getBacklogEnhanced(42, { reconcileIssues: [10001, 10002] });

      expect(transport.lastCall?.options.path).toBe(
        `${SOFTWARE_BASE_URL}/board/42/backlog?reconcileIssues=10001&reconcileIssues=10002`,
      );
      expect(transport.lastCall?.options.query).not.toHaveProperty('reconcileIssues');
    });

    it('omits the reconcileIssues query string when not provided', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));
      await boards.getBacklogEnhanced(42, { jql: 'x' });
      expect(transport.lastCall?.options.path).toBe(`${SOFTWARE_BASE_URL}/board/42/backlog`);
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.getBacklogEnhanced(0)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for negative boardId', async () => {
      await expect(boards.getBacklogEnhanced(-1)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.getBacklogEnhanced(42, { maxResults: 0 })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('getIssuesEnhanced()', () => {
    it('calls GET software /board/{boardId}/issue and passes the page through', async () => {
      const payload = makeSoftwareIssueResults(['PROJ-1']);
      transport.respondWith(payload);

      const result = await boards.getIssuesEnhanced(42);

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${SOFTWARE_BASE_URL}/board/42/issue`,
      });
    });

    it('threads params and repeated reconcileIssues', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));

      await boards.getIssuesEnhanced(42, {
        nextPageToken: 'TOK',
        maxResults: 10,
        jql: 'project = X',
        fields: ['id'],
        expand: 'schema',
        reconcileIssues: [5],
      });

      // `fields` and `reconcileIssues` are both `type: array` on the JSIS
      // endpoint → repeated params in the path, not the query bag (B1049).
      expect(transport.lastCall?.options.query).toMatchObject({
        nextPageToken: 'TOK',
        maxResults: 10,
        jql: 'project = X',
        expand: 'schema',
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
      expect(transport.lastCall?.options.path).toBe(
        `${SOFTWARE_BASE_URL}/board/42/issue?reconcileIssues=5&fields=id`,
      );
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.getIssuesEnhanced(0)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.getIssuesEnhanced(42, { maxResults: 0 })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('getIssuesWithoutEpicEnhanced()', () => {
    it('calls GET software /board/{boardId}/epic/none/issue', async () => {
      const payload = makeSoftwareIssueResults(['PROJ-9']);
      transport.respondWith(payload);

      const result = await boards.getIssuesWithoutEpicEnhanced(42);

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${SOFTWARE_BASE_URL}/board/42/epic/none/issue`,
      });
    });

    it('threads jql into query and fields as a repeated path param (B1049)', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));
      await boards.getIssuesWithoutEpicEnhanced(42, { jql: 'a', fields: ['summary'] });
      expect(transport.lastCall?.options.query).toMatchObject({ jql: 'a' });
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
      expect(transport.lastCall?.options.path).toBe(
        `${SOFTWARE_BASE_URL}/board/42/epic/none/issue?fields=summary`,
      );
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.getIssuesWithoutEpicEnhanced(0)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.getIssuesWithoutEpicEnhanced(42, { maxResults: 0 })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('getEpicIssuesEnhanced()', () => {
    it('calls GET software /board/{boardId}/epic/{epicId}/issue', async () => {
      const payload = makeSoftwareIssueResults(['PROJ-3']);
      transport.respondWith(payload);

      const result = await boards.getEpicIssuesEnhanced(42, 7);

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${SOFTWARE_BASE_URL}/board/42/epic/7/issue`,
      });
    });

    it('threads params and repeated reconcileIssues', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));
      await boards.getEpicIssuesEnhanced(42, 7, {
        maxResults: 25,
        reconcileIssues: [1, 2],
      });
      expect(transport.lastCall?.options.query).toMatchObject({ maxResults: 25 });
      expect(transport.lastCall?.options.path).toBe(
        `${SOFTWARE_BASE_URL}/board/42/epic/7/issue?reconcileIssues=1&reconcileIssues=2`,
      );
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.getEpicIssuesEnhanced(0, 7)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for epicId = 0', async () => {
      await expect(boards.getEpicIssuesEnhanced(42, 0)).rejects.toThrow(
        'epicId must be a positive integer',
      );
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.getEpicIssuesEnhanced(42, 7, { maxResults: 0 })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('getSprintIssuesEnhanced()', () => {
    it('calls GET software /board/{boardId}/sprint/{sprintId}/issue', async () => {
      const payload = makeSoftwareIssueResults(['PROJ-4']);
      transport.respondWith(payload);

      const result = await boards.getSprintIssuesEnhanced(42, 10);

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${SOFTWARE_BASE_URL}/board/42/sprint/10/issue`,
      });
    });

    it('threads jql into query and repeated fields + reconcileIssues into the path (B1049)', async () => {
      transport.respondWith(makeSoftwareIssueResults([]));
      await boards.getSprintIssuesEnhanced(42, 10, {
        jql: 'status = "In Progress"',
        fields: ['summary', 'status'],
        reconcileIssues: [99],
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        jql: 'status = "In Progress"',
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
      // `reconcileIssues` is appended first, then `fields` — both repeated.
      expect(transport.lastCall?.options.path).toBe(
        `${SOFTWARE_BASE_URL}/board/42/sprint/10/issue?reconcileIssues=99&fields=summary&fields=status`,
      );
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(boards.getSprintIssuesEnhanced(0, 10)).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for sprintId = 0', async () => {
      await expect(boards.getSprintIssuesEnhanced(42, 0)).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(boards.getSprintIssuesEnhanced(42, 10, { maxResults: 0 })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── softwareBaseUrl derivation (optional 3rd constructor param) ─────────────

  describe('softwareBaseUrl fallback', () => {
    it('derives the software base from the agile base when omitted', async () => {
      const derived = new BoardsResource(transport, BASE_URL);
      transport.respondWith(makeSoftwareIssueResults([]));

      await derived.getBacklogEnhanced(42);

      expect(transport.lastCall?.options.path).toBe(`${SOFTWARE_BASE_URL}/board/42/backlog`);
    });
  });
});
