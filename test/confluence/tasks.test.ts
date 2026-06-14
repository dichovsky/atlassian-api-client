import { describe, it, expect, beforeEach } from 'vitest';
import { TasksResource } from '../../src/confluence/resources/tasks.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeTask = (id: string) => ({
  id,
  status: 'incomplete' as const,
  spaceId: 'space-1',
});

describe('TasksResource', () => {
  let transport: MockTransport;
  let resource: TasksResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new TasksResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /tasks with no params', async () => {
      const payload = { results: [makeTask('1')], _links: {} };
      transport.respondWith(payload);

      const result = await resource.list();

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/tasks`,
      });
    });

    it('serializes scalar filters through query bag and array filters as repeated path params', async () => {
      const payload = { results: [], _links: {} };
      transport.respondWith(payload);
      const params = {
        'body-format': 'storage' as const,
        includeBlankTasks: true,
        status: 'incomplete' as const,
        // array-type params go into path
        taskId: [100, 200],
        spaceId: [11, 22],
        pageId: [33],
        blogPostId: [44],
        createdBy: ['user-1', 'user-2'],
        assignedTo: ['user-3'],
        completedBy: ['user-4'],
        // integer epoch-ms timestamps
        createdAtFrom: 1700000000000,
        createdAtTo: 1710000000000,
        dueAtFrom: 1705000000000,
        dueAtTo: 1715000000000,
        completedAtFrom: 1720000000000,
        completedAtTo: 1730000000000,
        cursor: 'abc',
        limit: 25,
      };

      const result = await resource.list(params);

      expect(result).toEqual(payload);
      // Scalar params stay in the query bag.
      expect(transport.lastCall?.options.query).toEqual({
        'body-format': 'storage',
        'include-blank-tasks': true,
        status: 'incomplete',
        'created-at-from': 1700000000000,
        'created-at-to': 1710000000000,
        'due-at-from': 1705000000000,
        'due-at-to': 1715000000000,
        'completed-at-from': 1720000000000,
        'completed-at-to': 1730000000000,
        cursor: 'abc',
        limit: 25,
      });
      // Array-type params are baked into the path as repeated segments.
      const { path } = transport.lastCall!.options;
      expect(path).toContain('task-id=100');
      expect(path).toContain('task-id=200');
      expect(path).toContain('space-id=11');
      expect(path).toContain('space-id=22');
      expect(path).toContain('page-id=33');
      expect(path).toContain('blogpost-id=44');
      expect(path).toContain('created-by=user-1');
      expect(path).toContain('created-by=user-2');
      expect(path).toContain('assigned-to=user-3');
      expect(path).toContain('completed-by=user-4');
    });

    it('omits empty arrays from the path', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.list({ taskId: [], spaceId: [] });

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/tasks`);
    });

    it('omits the query bag entirely when no params are given', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.list();

      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('omits the query bag when an empty options object is given', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.list({});

      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('throws ValidationError for invalid limit', async () => {
      await expect(resource.list({ limit: -1 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('accepts completedAtFrom and completedAtTo as integers (epoch ms)', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.list({ completedAtFrom: 1700000000000, completedAtTo: 1710000000000 });
      expect(transport.lastCall?.options.query).toMatchObject({
        'completed-at-from': 1700000000000,
        'completed-at-to': 1710000000000,
      });
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /tasks/{id} without extra params', async () => {
      const item = makeTask('42');
      transport.respondWith(item);

      const result = await resource.get('42');

      expect(result).toEqual(item);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/tasks/42`,
      });
    });

    it('includes body-format param when provided', async () => {
      transport.respondWith(makeTask('42'));
      const params = { 'body-format': 'storage' as const };

      await resource.get('42', params);

      expect(transport.lastCall?.options.query).toMatchObject(params);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /tasks/{id} with the provided body', async () => {
      const updated = { ...makeTask('5'), status: 'complete' as const };
      transport.respondWith(updated);
      const data = { status: 'complete' as const };

      const result = await resource.update('5', data);

      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/tasks/5`,
        body: data,
      });
    });

    it('forwards body-format query param when provided', async () => {
      transport.respondWith(makeTask('5'));
      const data = { status: 'complete' as const };

      await resource.update('5', data, { 'body-format': 'atlas_doc_format' });

      expect(transport.lastCall?.options.query).toMatchObject({
        'body-format': 'atlas_doc_format',
      });
    });

    it('passes no query when body-format omitted', async () => {
      transport.respondWith(makeTask('5'));

      await resource.update('5', { status: 'incomplete' });

      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('iterates across multiple pages and yields all items', async () => {
      transport
        .respondWith({
          results: [makeTask('1')],
          _links: { next: '/wiki/api/v2/tasks?cursor=page2' },
        })
        .respondWith({
          results: [makeTask('2')],
          _links: {},
        });

      const items: { id: string }[] = [];
      for await (const item of resource.listAll()) {
        items.push(item);
      }

      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
      expect(transport.calls).toHaveLength(2);
    });

    it('passes scalar params in query bag and array params in path', async () => {
      transport.respondWith({ results: [], _links: {} });

      for await (const _ of resource.listAll({
        status: 'incomplete',
        limit: 10,
        spaceId: [55, 66],
      })) {
        /* consume */
      }

      expect(transport.calls[0]?.options.query).toMatchObject({
        status: 'incomplete',
        limit: 10,
      });
      expect(transport.calls[0]?.options.query).not.toHaveProperty('spaceId');
      const path = transport.calls[0]?.options.path ?? '';
      expect(path).toContain('space-id=55');
      expect(path).toContain('space-id=66');
    });

    it('propagates the cursor on subsequent requests', async () => {
      transport
        .respondWith({
          results: [makeTask('A')],
          _links: { next: '/wiki/api/v2/tasks?cursor=token-xyz' },
        })
        .respondWith({ results: [], _links: {} });

      for await (const _ of resource.listAll()) {
        /* consume */
      }

      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'token-xyz' });
    });

    it('handles a single page with no next link', async () => {
      transport.respondWith({ results: [makeTask('only')], _links: {} });

      const items: { id: string }[] = [];
      for await (const item of resource.listAll()) {
        items.push(item);
      }

      expect(items).toHaveLength(1);
      expect(transport.calls).toHaveLength(1);
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes special characters in id for get()', async () => {
      transport.respondWith(makeTask('x'));
      await resource.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/tasks/..%2Fadmin`);
    });

    it('encodes special characters in id for update()', async () => {
      transport.respondWith(makeTask('x'));
      await resource.update('../admin', { status: 'complete' });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/tasks/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment id in get(): %s',
      async (id) => {
        await expect(resource.get(id)).rejects.toThrow('path parameter must not be "." or ".."');
        expect(transport.calls).toHaveLength(0);
      },
    );
  });
});
