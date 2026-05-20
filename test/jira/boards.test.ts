import { describe, it, expect, beforeEach } from 'vitest';
import { BoardsResource } from '../../src/jira/resources/boards.js';
import type { QuickFilter } from '../../src/jira/resources/boards.js';
import { MockTransport } from '../helpers/mock-transport.js';
import type { Sprint } from '../../src/jira/resources/sprints.js';

const BASE_URL = 'https://test.atlassian.net/rest/agile/1.0';

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

const makeSprint = (id: number, name: string): Sprint => ({
  id,
  self: `${BASE_URL}/sprint/${id}`,
  state: 'active',
  name,
  originBoardId: 1,
});

describe('BoardsResource', () => {
  let transport: MockTransport;
  let boards: BoardsResource;

  beforeEach(() => {
    transport = new MockTransport();
    boards = new BoardsResource(transport, BASE_URL);
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

    it('throws RangeError for maxResults: 0', async () => {
      await expect(boards.list({ maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: -1', async () => {
      await expect(boards.list({ maxResults: -1 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: 1.5', async () => {
      await expect(boards.list({ maxResults: 1.5 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: Infinity', async () => {
      await expect(boards.list({ maxResults: Infinity })).rejects.toThrow(RangeError);
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
    it('calls GET /board/{boardId}/issue', async () => {
      // Arrange
      const payload = makeListResponse([makeBoardIssue('1', 'PROJ-1')]);
      transport.respondWith(payload);

      // Act
      const result = await boards.getIssues(42);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/issue`,
      });
    });

    it('passes startAt, maxResults, and jql params', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.getIssues(42, { startAt: 5, maxResults: 10, jql: 'status = Done' });

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
      await boards.getIssues(42, { fields: ['summary', 'status'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        fields: 'summary,status',
      });
    });

    it('throws RangeError for maxResults: 0', async () => {
      await expect(boards.getIssues(42, { maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: -1', async () => {
      await expect(boards.getIssues(42, { maxResults: -1 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: 1.5', async () => {
      await expect(boards.getIssues(42, { maxResults: 1.5 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: Infinity', async () => {
      await expect(boards.getIssues(42, { maxResults: Infinity })).rejects.toThrow(RangeError);
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

    it('throws RangeError for maxResults: 0', async () => {
      const gen = boards.listAll({ maxResults: 0 });
      await expect(gen.next()).rejects.toThrow(RangeError);
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

    it('throws RangeError for maxResults: 0', async () => {
      await expect(boards.listSprints(42, { maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: -1', async () => {
      await expect(boards.listSprints(42, { maxResults: -1 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: Infinity', async () => {
      await expect(boards.listSprints(42, { maxResults: Infinity })).rejects.toThrow(RangeError);
    });
  });

  // ── getSprintIssues ───────────────────────────────────────────────────────

  describe('getSprintIssues()', () => {
    it('calls GET /board/{boardId}/sprint/{sprintId}/issue with no params', async () => {
      // Arrange
      const payload = makeListResponse([makeBoardIssue('1', 'PROJ-1')]);
      transport.respondWith(payload);

      // Act
      const result = await boards.getSprintIssues(42, 10);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/board/42/sprint/10/issue`,
      });
    });

    it('passes startAt, maxResults, jql, and fields params', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.getSprintIssues(42, 10, {
        startAt: 5,
        maxResults: 20,
        jql: 'status = Done',
        fields: ['summary', 'status'],
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 20,
        jql: 'status = Done',
        fields: 'summary,status',
      });
    });

    it('joins fields array with commas', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.getSprintIssues(42, 10, { fields: ['assignee', 'priority', 'labels'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        fields: 'assignee,priority,labels',
      });
    });

    it('does not include undefined query params when params is empty object', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await boards.getSprintIssues(42, 10, {});

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['startAt']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
      expect(query['jql']).toBeUndefined();
      expect(query['fields']).toBeUndefined();
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

    it('throws RangeError for maxResults: 0', async () => {
      await expect(boards.getSprintIssues(42, 10, { maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: -1', async () => {
      await expect(boards.getSprintIssues(42, 10, { maxResults: -1 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: Infinity', async () => {
      await expect(boards.getSprintIssues(42, 10, { maxResults: Infinity })).rejects.toThrow(
        RangeError,
      );
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

    it('throws RangeError for maxResults: 0', async () => {
      await expect(boards.listQuickFilters(42, { maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: -1', async () => {
      await expect(boards.listQuickFilters(42, { maxResults: -1 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: Infinity', async () => {
      await expect(boards.listQuickFilters(42, { maxResults: Infinity })).rejects.toThrow(
        RangeError,
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
});
