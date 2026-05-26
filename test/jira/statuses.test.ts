import { describe, it, expect, beforeEach } from 'vitest';
import { StatusesResource } from '../../src/jira/resources/statuses.js';
import { MockTransport } from '../helpers/mock-transport.js';
import type { Status } from '../../src/jira/types.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeStatus = (id: string): Status => ({
  id,
  name: `Status ${id}`,
  self: `${BASE_URL}/status/${id}`,
  description: 'A test status',
  statusCategory: {
    id: 1,
    key: 'new',
    name: 'To Do',
    colorName: 'blue-gray',
  },
});

const makePage = (
  items: Status[],
  opts?: { total?: number; isLast?: boolean; startAt?: number },
) => ({
  values: items,
  startAt: opts?.startAt ?? 0,
  maxResults: 50,
  total: opts?.total ?? items.length,
  isLast: opts?.isLast ?? true,
});

describe('StatusesResource', () => {
  let transport: MockTransport;
  let statuses: StatusesResource;

  beforeEach(() => {
    transport = new MockTransport();
    statuses = new StatusesResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /statuses and returns the array', async () => {
      // Arrange
      const statusList = [makeStatus('1'), makeStatus('2'), makeStatus('3')];
      transport.respondWith(statusList);

      // Act
      const result = await statuses.list();

      // Assert
      expect(result).toEqual(statusList);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/statuses`,
      });
    });

    it('returns an empty array when no statuses exist', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await statuses.list();

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ── bulkDelete (B777) ─────────────────────────────────────────────────────

  describe('bulkDelete()', () => {
    it('calls DELETE /statuses with ids as CSV query param', async () => {
      transport.respondWith(undefined, 204);

      await statuses.bulkDelete({ id: ['1', '2', '3'] });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/statuses`,
      });
      expect(transport.lastCall?.options.query).toEqual({ id: '1,2,3' });
    });

    it('joins a single id', async () => {
      transport.respondWith(undefined, 204);

      await statuses.bulkDelete({ id: ['5'] });

      expect(transport.lastCall?.options.query).toEqual({ id: '5' });
    });
  });

  // ── bulkCreate (B778) ─────────────────────────────────────────────────────

  describe('bulkCreate()', () => {
    it('calls POST /statuses with statuses body', async () => {
      const created = [makeStatus('10'), makeStatus('11')];
      transport.respondWith(created);

      const result = await statuses.bulkCreate({
        statuses: [
          { name: 'Blocked', statusCategory: 'IN_PROGRESS' },
          { name: 'Done', statusCategory: 'DONE', description: 'Work complete' },
        ],
      });

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/statuses`,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['statuses']).toHaveLength(2);
    });
  });

  // ── bulkUpdate (B779) ─────────────────────────────────────────────────────

  describe('bulkUpdate()', () => {
    it('calls PUT /statuses with statuses body and returns void', async () => {
      transport.respondWith(undefined, 204);

      await statuses.bulkUpdate({
        statuses: [{ id: '1', name: 'Renamed' }],
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/statuses`,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['statuses']).toHaveLength(1);
    });
  });

  // ── getIssueTypeUsages (B780) ─────────────────────────────────────────────

  describe('getIssueTypeUsages()', () => {
    it('calls GET /statuses/{statusId}/project/{projectId}/issueTypeUsages', async () => {
      transport.respondWith({ values: [], nextPageToken: undefined });

      const result = await statuses.getIssueTypeUsages('s1', 'p1');

      expect(result.values).toEqual([]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/statuses/s1/project/p1/issueTypeUsages`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards nextPageToken and maxResults', async () => {
      transport.respondWith({ values: [], nextPageToken: 'tok2' });

      await statuses.getIssueTypeUsages('s1', 'p1', {
        nextPageToken: 'tok1',
        maxResults: 25,
      });

      expect(transport.lastCall?.options.query).toEqual({
        nextPageToken: 'tok1',
        maxResults: 25,
      });
    });

    it('URL-encodes path segments', async () => {
      transport.respondWith({ values: [] });

      await statuses.getIssueTypeUsages('s/1', 'p/2');

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/statuses/s%2F1/project/p%2F2/issueTypeUsages`,
      );
    });
  });

  // ── getProjectUsages (B781) ───────────────────────────────────────────────

  describe('getProjectUsages()', () => {
    it('calls GET /statuses/{statusId}/projectUsages', async () => {
      transport.respondWith({ values: [] });

      await statuses.getProjectUsages('s1');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/statuses/s1/projectUsages`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards nextPageToken', async () => {
      transport.respondWith({ values: [] });

      await statuses.getProjectUsages('s1', { nextPageToken: 'abc' });

      expect(transport.lastCall?.options.query).toEqual({ nextPageToken: 'abc' });
    });

    it('forwards maxResults', async () => {
      transport.respondWith({ values: [] });

      await statuses.getProjectUsages('s1', { maxResults: 20 });

      expect(transport.lastCall?.options.query).toEqual({ maxResults: 20 });
    });
  });

  // ── getWorkflowUsages (B782) ──────────────────────────────────────────────

  describe('getWorkflowUsages()', () => {
    it('calls GET /statuses/{statusId}/workflowUsages', async () => {
      transport.respondWith({ values: [] });

      await statuses.getWorkflowUsages('s1');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/statuses/s1/workflowUsages`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards nextPageToken', async () => {
      transport.respondWith({ values: [] });

      await statuses.getWorkflowUsages('s1', { nextPageToken: 'tok1' });

      expect(transport.lastCall?.options.query).toEqual({ nextPageToken: 'tok1' });
    });

    it('forwards maxResults', async () => {
      transport.respondWith({ values: [] });

      await statuses.getWorkflowUsages('s1', { maxResults: 10 });

      expect(transport.lastCall?.options.query).toEqual({ maxResults: 10 });
    });
  });

  // ── byNames (B783) ────────────────────────────────────────────────────────

  describe('byNames()', () => {
    it('calls GET /statuses/byNames with CSV-joined names', async () => {
      const statusList = [makeStatus('1'), makeStatus('2')];
      transport.respondWith(statusList);

      const result = await statuses.byNames({ names: ['In Progress', 'Done'] });

      expect(result).toEqual(statusList);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/statuses/byNames`,
      });
      expect(transport.lastCall?.options.query).toEqual({
        statusName: 'In Progress,Done',
      });
    });

    it('joins a single name', async () => {
      transport.respondWith([makeStatus('1')]);

      await statuses.byNames({ names: ['Done'] });

      expect(transport.lastCall?.options.query).toEqual({ statusName: 'Done' });
    });
  });

  // ── search (B784) ─────────────────────────────────────────────────────────

  describe('search()', () => {
    it('calls GET /statuses/search with no params', async () => {
      transport.respondWith(makePage([]));

      const result = await statuses.search();

      expect(result.values).toEqual([]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/statuses/search`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards all query params', async () => {
      transport.respondWith(makePage([makeStatus('1')]));

      await statuses.search({
        projectId: 'p1',
        startAt: 0,
        maxResults: 10,
        searchString: 'In Progress',
        statusCategory: 'IN_PROGRESS',
      });

      expect(transport.lastCall?.options.query).toEqual({
        projectId: 'p1',
        startAt: 0,
        maxResults: 10,
        searchString: 'In Progress',
        statusCategory: 'IN_PROGRESS',
      });
    });

    it('rejects non-positive maxResults', async () => {
      await expect(statuses.search({ maxResults: 0 })).rejects.toThrow(/maxResults/);
    });

    it('omits undefined params from query', async () => {
      transport.respondWith(makePage([]));

      await statuses.search({ projectId: 'p1' });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('searchString');
      expect(query).not.toHaveProperty('statusCategory');
    });
  });

  // ── searchAll (B784, paginated) ───────────────────────────────────────────

  describe('searchAll()', () => {
    it('yields items from a single page', async () => {
      transport.respondWith(makePage([makeStatus('1'), makeStatus('2')]));

      const results: Status[] = [];
      for await (const s of statuses.searchAll()) {
        results.push(s);
      }

      expect(results.map((s) => s.id)).toEqual(['1', '2']);
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith(makePage([makeStatus('1')], { total: 2, isLast: false }))
        .respondWith(makePage([makeStatus('2')], { total: 2, isLast: true, startAt: 1 }));

      const results: Status[] = [];
      for await (const s of statuses.searchAll({ maxResults: 1 })) {
        results.push(s);
      }

      expect(results.map((s) => s.id)).toEqual(['1', '2']);
    });

    it('forwards filter query params on every page', async () => {
      transport.respondWith(makePage([], { isLast: true }));

      for await (const _ of statuses.searchAll({ projectId: 'p1', statusCategory: 'DONE' })) {
        // consume
      }

      expect(transport.lastCall?.options.query).toMatchObject({
        projectId: 'p1',
        statusCategory: 'DONE',
      });
    });

    it('rejects non-positive maxResults', async () => {
      await expect(async () => {
        for await (const _ of statuses.searchAll({ maxResults: 0 })) {
          // consume
        }
      }).rejects.toThrow(/maxResults/);
    });
  });
});
