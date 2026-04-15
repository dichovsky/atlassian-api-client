import { describe, it, expect, beforeEach } from 'vitest';
import { BoardsResource } from '../../src/jira/resources/boards.js';
import { MockTransport } from '../helpers/mock-transport.js';

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
});
