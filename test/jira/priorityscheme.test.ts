import { describe, it, expect, beforeEach } from 'vitest';
import { PrioritySchemeResource } from '../../src/jira/resources/priorityscheme.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeScheme = (id = '10001') => ({
  id,
  name: 'Default Priority Scheme',
  description: 'A default scheme',
  defaultPriorityId: '10001',
  isDefault: true,
});

const makePriority = (id = '10001') => ({
  id,
  name: 'High',
  description: 'Serious problem',
  iconUrl: '/images/icons/priorities/high.svg',
  statusColor: '#f15C75',
  isDefault: false,
  sequence: '1',
});

const makeProject = (id = '10100') => ({
  id,
  key: 'EX',
  name: 'Example',
  self: `${BASE_URL}/project/${id}`,
  projectTypeKey: 'software',
  simplified: false,
});

const makePageOf = <T>(values: T[], startAt = 0, total = values.length) => ({
  values,
  startAt,
  maxResults: 50,
  total,
  isLast: true,
});

describe('PrioritySchemeResource', () => {
  let transport: MockTransport;
  let resource: PrioritySchemeResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new PrioritySchemeResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /priorityscheme with no params', async () => {
      const page = makePageOf([makeScheme()]);
      transport.respondWith(page);

      const result = await resource.list();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/priorityscheme`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ startAt: 0, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 0, maxResults: 25 });
    });

    it('forwards priorityId and schemeId arrays as repeated query params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ priorityId: [10000, 10001], schemeId: [20000, 20001] });

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/priorityscheme?priorityId=10000&priorityId=10001&schemeId=20000&schemeId=20001`,
      );
    });

    it('omits empty priorityId / schemeId arrays from the query', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ priorityId: [], schemeId: [] });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['priorityId']).toBeUndefined();
      expect(query['schemeId']).toBeUndefined();
    });

    it('forwards schemeName, onlyDefault, orderBy, and expand', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({
        schemeName: 'My Scheme',
        onlyDefault: true,
        orderBy: '-name',
        expand: 'priorities,projects',
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        schemeName: 'My Scheme',
        onlyDefault: true,
        orderBy: '-name',
        expand: 'priorities,projects',
      });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.list({ maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('yields items from paginated response', async () => {
      const scheme = makeScheme();
      transport.respondWith(makePageOf([scheme]));

      const results: unknown[] = [];
      for await (const item of resource.listAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(scheme);
    });

    it('paginateOffset starts from startAt=0', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listAll()) {
        break;
      }

      expect(transport.lastCall?.options.query?.['startAt']).toBe(0);
    });

    it('forwards filter params through to paginateOffset', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listAll({ schemeId: [10001], expand: 'priorities' })) {
        break;
      }

      // `schemeId` is a `type: array` query param built into the basePath as a
      // repeated param; the scalar bag holds only the scalar filters.
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/priorityscheme?schemeId=10001`);
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['expand']).toBe('priorities');
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('POSTs minimal body with required fields', async () => {
      transport.respondWith({ id: '10001' });

      const result = await resource.create({
        name: 'My Scheme',
        defaultPriorityId: 10001,
        priorityIds: [10001, 10002],
      });

      expect(result).toEqual({ id: '10001' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/priorityscheme`,
        body: {
          name: 'My Scheme',
          defaultPriorityId: 10001,
          priorityIds: [10001, 10002],
        },
      });
    });

    it('includes optional fields when provided', async () => {
      transport.respondWith({ id: '10001' });

      await resource.create({
        name: 'My Scheme',
        defaultPriorityId: 10001,
        priorityIds: [10001, 10002],
        description: 'desc',
        projectIds: [10100, 10101],
        mappings: { in: { '10000': 10001 } },
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        description: 'desc',
        projectIds: [10100, 10101],
        mappings: { in: { '10000': 10001 } },
      });
    });

    it('returns task envelope when create is async', async () => {
      const taskEnvelope = {
        id: '10001',
        task: {
          id: 'task-1',
          self: `${BASE_URL}/task/task-1`,
          status: 'COMPLETE',
          progress: 100,
          elapsedRuntime: 50,
          submitted: 1,
          lastUpdate: 2,
        },
      };
      transport.respondWith(taskEnvelope);

      const result = await resource.create({
        name: 'Async Scheme',
        defaultPriorityId: 10001,
        priorityIds: [10001],
      });

      expect(result).toEqual(taskEnvelope);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /priorityscheme/{schemeId}', async () => {
      transport.respondWith(undefined);

      await resource.delete('10001');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/priorityscheme/10001`,
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /priorityscheme/{schemeId} and returns task envelope', async () => {
      const response = {
        task: {
          id: 'task-1',
          self: `${BASE_URL}/task/task-1`,
          status: 'COMPLETE',
          progress: 100,
          elapsedRuntime: 50,
          submitted: 1,
          lastUpdate: 2,
        },
        priorityScheme: makeScheme(),
      };
      transport.respondWith(response);

      const result = await resource.update('10001', { name: 'Renamed' });

      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/priorityscheme/10001`,
        body: { name: 'Renamed' },
      });
    });

    it('only sends defined fields', async () => {
      transport.respondWith({});

      await resource.update('10001', { description: 'new desc' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['name']).toBeUndefined();
      expect(body['description']).toBe('new desc');
    });

    it('forwards all optional body fields', async () => {
      transport.respondWith({});

      await resource.update('10001', {
        name: 'X',
        description: 'd',
        defaultPriorityId: 10002,
        priorities: { add: { ids: [10003] }, remove: { ids: [10004] } },
        projects: { add: { ids: [10100] }, remove: { ids: [10101] } },
        mappings: { in: { '10005': 10006 }, out: { '10006': 10005 } },
      });

      expect(transport.lastCall?.options.body).toEqual({
        name: 'X',
        description: 'd',
        defaultPriorityId: 10002,
        priorities: { add: { ids: [10003] }, remove: { ids: [10004] } },
        projects: { add: { ids: [10100] }, remove: { ids: [10101] } },
        mappings: { in: { '10005': 10006 }, out: { '10006': 10005 } },
      });
    });
  });

  // ── listPriorities ────────────────────────────────────────────────────────

  describe('listPriorities()', () => {
    it('GETs /priorityscheme/{schemeId}/priorities', async () => {
      const page = makePageOf([makePriority()]);
      transport.respondWith(page);

      const result = await resource.listPriorities('10001');

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/priorityscheme/10001/priorities`,
      });
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listPriorities('10001', { startAt: 5, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 25 });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.listPriorities('10001', { maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── listPrioritiesAll ─────────────────────────────────────────────────────

  describe('listPrioritiesAll()', () => {
    it('yields items from paginated response', async () => {
      const priority = makePriority();
      transport.respondWith(makePageOf([priority]));

      const results: unknown[] = [];
      for await (const item of resource.listPrioritiesAll('10001')) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(priority);
    });

    it('paginateOffset starts from startAt=0', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listPrioritiesAll('10001')) {
        break;
      }

      expect(transport.lastCall?.options.query?.['startAt']).toBe(0);
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/priorityscheme/10001/priorities`);
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listPrioritiesAll('10001', { maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── listProjects ──────────────────────────────────────────────────────────

  describe('listProjects()', () => {
    it('GETs /priorityscheme/{schemeId}/projects', async () => {
      const page = makePageOf([makeProject()]);
      transport.respondWith(page);

      const result = await resource.listProjects('10001');

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/priorityscheme/10001/projects`,
      });
    });

    it('forwards projectId as repeated query params plus scalar query', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProjects('10001', { projectId: [10100, 10101], query: 'EX' });

      // `projectId` is a `type: array` query param built into the path; the
      // scalar bag holds only the scalar `query` filter.
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/priorityscheme/10001/projects?projectId=10100&projectId=10101`,
      );
      expect(transport.lastCall?.options.query).toMatchObject({
        query: 'EX',
      });
    });

    it('omits empty projectId array from query', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProjects('10001', { projectId: [] });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['projectId']).toBeUndefined();
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProjects('10001', { startAt: 10, maxResults: 5 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 5 });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.listProjects('10001', { maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── listProjectsAll ───────────────────────────────────────────────────────

  describe('listProjectsAll()', () => {
    it('yields items from paginated response', async () => {
      const project = makeProject();
      transport.respondWith(makePageOf([project]));

      const results: unknown[] = [];
      for await (const item of resource.listProjectsAll('10001')) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(project);
    });

    it('paginateOffset starts from startAt=0 and forwards filter', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listProjectsAll('10001', { query: 'foo' })) {
        break;
      }

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['startAt']).toBe(0);
      expect(query['query']).toBe('foo');
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listProjectsAll('10001', { maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── suggestedMappings ─────────────────────────────────────────────────────

  describe('suggestedMappings()', () => {
    it('POSTs /priorityscheme/mappings with no body when no data given', async () => {
      const page = makePageOf([]);
      transport.respondWith(page);

      const result = await resource.suggestedMappings();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/priorityscheme/mappings`,
        body: {},
      });
    });

    it('forwards all body fields', async () => {
      transport.respondWith(makePageOf([]));

      await resource.suggestedMappings({
        schemeId: 10005,
        priorities: { add: [10001, 10002], remove: [10003] },
        projects: { add: [10021] },
        startAt: 0,
        maxResults: 50,
      });

      expect(transport.lastCall?.options.body).toEqual({
        schemeId: 10005,
        priorities: { add: [10001, 10002], remove: [10003] },
        projects: { add: [10021] },
        startAt: 0,
        maxResults: 50,
      });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.suggestedMappings({ maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── listAvailablePriorities ───────────────────────────────────────────────

  describe('listAvailablePriorities()', () => {
    it('GETs /priorityscheme/priorities/available with required schemeId', async () => {
      const page = makePageOf([makePriority()]);
      transport.respondWith(page);

      const result = await resource.listAvailablePriorities({ schemeId: '10001' });

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/priorityscheme/priorities/available`,
      });
      expect(transport.lastCall?.options.query).toMatchObject({ schemeId: '10001' });
    });

    it('forwards query, repeated exclude, startAt, maxResults (schemeId stays scalar)', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listAvailablePriorities({
        schemeId: '10001',
        query: 'high',
        exclude: ['10005', '10006'],
        startAt: 0,
        maxResults: 25,
      });

      // `exclude` is a `type: array` query param built into the path; `schemeId`
      // is `type: string` (genuine scalar) and stays in the scalar query bag.
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/priorityscheme/priorities/available?exclude=10005&exclude=10006`,
      );
      expect(transport.lastCall?.options.query).toMatchObject({
        schemeId: '10001',
        query: 'high',
        startAt: 0,
        maxResults: 25,
      });
    });

    it('omits empty exclude array from the query', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listAvailablePriorities({ schemeId: '10001', exclude: [] });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['exclude']).toBeUndefined();
    });

    it('throws on invalid maxResults', async () => {
      await expect(
        resource.listAvailablePriorities({ schemeId: '10001', maxResults: 0 }),
      ).rejects.toThrow();
    });
  });

  // ── listAvailablePrioritiesAll ────────────────────────────────────────────

  describe('listAvailablePrioritiesAll()', () => {
    it('yields items from paginated response', async () => {
      const priority = makePriority();
      transport.respondWith(makePageOf([priority]));

      const results: unknown[] = [];
      for await (const item of resource.listAvailablePrioritiesAll({ schemeId: '10001' })) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(priority);
    });

    it('paginateOffset starts from startAt=0 and forwards filters', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listAvailablePrioritiesAll({
        schemeId: '10001',
        query: 'high',
        exclude: ['10005'],
      })) {
        break;
      }

      // `exclude` is a `type: array` query param built into the basePath as a
      // repeated param; `schemeId` is a genuine scalar in the query bag.
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/priorityscheme/priorities/available?exclude=10005`,
      );
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['startAt']).toBe(0);
      expect(query['schemeId']).toBe('10001');
      expect(query['query']).toBe('high');
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listAvailablePrioritiesAll({
          schemeId: '10001',
          maxResults: 0,
        })) {
          break;
        }
      }).rejects.toThrow();
    });
  });
});
