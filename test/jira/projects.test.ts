import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectsResource } from '../../src/jira/resources/projects.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeProject = (id: string, key: string) => ({
  id,
  key,
  name: `Project ${key}`,
  self: `${BASE_URL}/project/${key}`,
  projectTypeKey: 'software',
});

const makeListResponse = (projects: ReturnType<typeof makeProject>[]) => ({
  values: projects,
  startAt: 0,
  maxResults: 50,
  total: projects.length,
});

describe('ProjectsResource', () => {
  let transport: MockTransport;
  let projects: ProjectsResource;

  beforeEach(() => {
    transport = new MockTransport();
    projects = new ProjectsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /project/search with no params', async () => {
      // Arrange
      const payload = makeListResponse([makeProject('10001', 'PROJ')]);
      transport.respondWith(payload);

      // Act
      const result = await projects.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/search`,
      });
    });

    it('converts expand array to comma-joined string', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await projects.list({ expand: ['description', 'lead'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        expand: 'description,lead',
      });
    });

    it('converts status array to comma-joined string', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await projects.list({ status: ['live', 'archived'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        status: 'live,archived',
      });
    });

    it('passes all supported params correctly', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await projects.list({
        startAt: 10,
        maxResults: 25,
        orderBy: 'name',
        expand: ['description'],
        status: ['live'],
        typeKey: 'software',
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 10,
        maxResults: 25,
        orderBy: 'name',
        expand: 'description',
        status: 'live',
        typeKey: 'software',
      });
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /project/{key} without expand', async () => {
      // Arrange
      const project = makeProject('10001', 'PROJ');
      transport.respondWith(project);

      // Act
      const result = await projects.get('PROJ');

      // Assert
      expect(result).toEqual(project);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project/PROJ`,
      });
    });

    it('joins expand array when provided', async () => {
      // Arrange
      transport.respondWith(makeProject('10001', 'PROJ'));

      // Act
      await projects.get('PROJ', ['description', 'issueTypes']);

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        expand: 'description,issueTypes',
      });
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('paginates with offset across multiple responses and yields all projects', async () => {
      // Arrange
      transport
        .respondWith({
          values: [makeProject('1', 'PROJ1')],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeProject('2', 'PROJ2')],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      // Act
      const items: { id: string }[] = [];
      for await (const project of projects.listAll()) {
        items.push(project);
      }

      // Assert
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
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
      for await (const _ of projects.listAll({ maxResults: 10, orderBy: 'name' })) {
        // consume
      }

      // Assert
      expect(transport.calls[0]?.options.query).toMatchObject({
        maxResults: 10,
        orderBy: 'name',
      });
    });

    it('passes expand, status, and typeKey params', async () => {
      // Arrange
      transport.respondWith({
        values: [{ id: '1', key: 'P' }],
        startAt: 0,
        maxResults: 50,
        isLast: true,
      });

      // Act
      const items: unknown[] = [];
      for await (const item of projects.listAll({
        expand: ['description'],
        status: ['live'],
        typeKey: 'software',
        orderBy: 'name',
      })) {
        items.push(item);
      }

      // Assert
      expect(items).toHaveLength(1);
      expect(transport.calls[0]?.options.query).toMatchObject({
        expand: 'description',
        status: 'live',
        typeKey: 'software',
        orderBy: 'name',
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
      for await (const item of projects.listAll()) {
        items.push(item);
      }

      // Assert
      expect(items).toHaveLength(0);
    });

    it('omits orderBy when not specified', async () => {
      // Arrange
      transport.respondWith({
        values: [{ id: '2', key: 'Q' }],
        startAt: 0,
        maxResults: 50,
        isLast: true,
      });

      // Act
      for await (const _ of projects.listAll({ maxResults: 10 })) {
        // consume
      }

      // Assert
      expect(transport.calls[0]?.options.query?.['orderBy']).toBeUndefined();
    });
  });

  // ── validation ────────────────────────────────────────────────────────────

  describe('validation', () => {
    it('throws RangeError when list() is called with maxResults: 0', async () => {
      // Act & Assert
      await expect(projects.list({ maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError when list() is called with negative maxResults', async () => {
      // Act & Assert
      await expect(projects.list({ maxResults: -1 })).rejects.toThrow(RangeError);
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes projectIdOrKey in get()', async () => {
      transport.respondWith(makeProject('x', 'x'));
      await projects.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/project/..%2Fadmin`);
    });
  });
});
