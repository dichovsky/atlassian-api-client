import { describe, it, expect, beforeEach } from 'vitest';
import { IssueTypeScreenSchemeResource } from '../../src/jira/resources/issuetypescreenscheme.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeScheme = (id = '10001', name = 'Default Scheme') => ({
  id,
  name,
  description: 'A scheme',
});

const makePageResponse = <T>(values: T[], total?: number) => ({
  values,
  startAt: 0,
  maxResults: 50,
  total: total ?? values.length,
  isLast: true,
});

describe('IssueTypeScreenSchemeResource', () => {
  let transport: MockTransport;
  let resource: IssueTypeScreenSchemeResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new IssueTypeScreenSchemeResource(transport, BASE_URL);
  });

  // ── list (B576) ─────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /issuetypescreenscheme with no params', async () => {
      transport.respondWith(makePageResponse([makeScheme()]));

      const result = await resource.list();

      expect(result.values).toHaveLength(1);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuetypescreenscheme`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards startAt, maxResults, id, and queryString', async () => {
      transport.respondWith(makePageResponse([]));

      await resource.list({ startAt: 10, maxResults: 25, id: [1, 2], queryString: 'Default' });

      expect(transport.lastCall?.options.query).toEqual({
        startAt: 10,
        maxResults: 25,
        id: '1,2',
        queryString: 'Default',
      });
    });

    it('omits undefined params from query', async () => {
      transport.respondWith(makePageResponse([]));

      await resource.list({ queryString: 'test' });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('startAt');
      expect(query).not.toHaveProperty('maxResults');
      expect(query).not.toHaveProperty('id');
    });

    it('omits empty id array from query', async () => {
      transport.respondWith(makePageResponse([]));

      await resource.list({ id: [] });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('id');
    });

    it('rejects non-positive maxResults', async () => {
      await expect(resource.list({ maxResults: 0 })).rejects.toThrow(/maxResults/);
    });

    it('forwards orderBy and expand', async () => {
      transport.respondWith(makePageResponse([]));

      await resource.list({ orderBy: 'name', expand: 'projects' });

      expect(transport.lastCall?.options.query).toMatchObject({
        orderBy: 'name',
        expand: 'projects',
      });
    });

    it('omits orderBy and expand when not provided', async () => {
      transport.respondWith(makePageResponse([]));

      await resource.list({ queryString: 'test' });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('orderBy');
      expect(query).not.toHaveProperty('expand');
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('network failure'));
      await expect(resource.list()).rejects.toThrow('network failure');
    });
  });

  // ── listAll (B576) ──────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('yields items from a single page', async () => {
      transport.respondWith(makePageResponse([makeScheme('1'), makeScheme('2')]));

      const results: { id: string }[] = [];
      for await (const s of resource.listAll()) {
        results.push(s);
      }

      expect(results.map((s) => s.id)).toEqual(['1', '2']);
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [makeScheme('1')],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeScheme('2')],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: { id: string }[] = [];
      for await (const s of resource.listAll({ maxResults: 1 })) {
        results.push(s);
      }

      expect(results.map((s) => s.id)).toEqual(['1', '2']);
    });

    it('forwards queryString filter on every page', async () => {
      transport.respondWith(makePageResponse([]));

      const results: unknown[] = [];
      for await (const s of resource.listAll({ queryString: 'Default' })) {
        results.push(s);
      }

      expect(transport.lastCall?.options.query).toMatchObject({ queryString: 'Default' });
    });

    it('rejects non-positive maxResults', async () => {
      await expect(async () => {
        for await (const _ of resource.listAll({ maxResults: 0 })) {
          // consume
        }
      }).rejects.toThrow(/maxResults/);
    });
  });

  // ── create (B577) ───────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /issuetypescreenscheme with required fields', async () => {
      transport.respondWith({ id: '10001' });

      const result = await resource.create({
        name: 'My Scheme',
        issueTypeMappings: [{ issueTypeId: '10000', screenSchemeId: '10001' }],
      });

      expect(result).toEqual({ id: '10001' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issuetypescreenscheme`,
        body: {
          name: 'My Scheme',
          issueTypeMappings: [{ issueTypeId: '10000', screenSchemeId: '10001' }],
        },
      });
    });

    it('includes optional description when provided', async () => {
      transport.respondWith({ id: '10002' });

      await resource.create({
        name: 'With Desc',
        description: 'A desc',
        issueTypeMappings: [],
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'With Desc',
        description: 'A desc',
      });
    });

    it('omits description when not provided', async () => {
      transport.respondWith({ id: '10003' });

      await resource.create({ name: 'No Desc', issueTypeMappings: [] });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('description');
    });
  });

  // ── update (B579) ───────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /issuetypescreenscheme/{id} with name', async () => {
      transport.respondWith(undefined, 204);

      await resource.update('10001', { name: 'Updated' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuetypescreenscheme/10001`,
        body: { name: 'Updated' },
      });
    });

    it('calls PUT with description only', async () => {
      transport.respondWith(undefined, 204);

      await resource.update('10001', { description: 'New desc' });

      expect(transport.lastCall?.options.body).toEqual({ description: 'New desc' });
    });

    it('encodes schemeId in path', async () => {
      transport.respondWith(undefined, 204);

      await resource.update('scheme/1', { name: 'X' });

      expect(transport.lastCall?.options.path).toContain('scheme%2F1');
    });
  });

  // ── delete (B578) ───────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /issuetypescreenscheme/{id}', async () => {
      transport.respondWith(undefined, 204);

      await resource.delete('10001');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issuetypescreenscheme/10001`,
      });
    });

    it('encodes schemeId in path', async () => {
      transport.respondWith(undefined, 204);

      await resource.delete('scheme/1');

      expect(transport.lastCall?.options.path).toContain('scheme%2F1');
    });
  });

  // ── updateMapping (B580) ────────────────────────────────────────────────────

  describe('updateMapping()', () => {
    it('calls PUT /issuetypescreenscheme/{id}/mapping', async () => {
      transport.respondWith(undefined, 204);

      const mappings = [{ issueTypeId: '10000', screenSchemeId: '10001' }];
      await resource.updateMapping('10001', { issueTypeMappings: mappings });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuetypescreenscheme/10001/mapping`,
        body: { issueTypeMappings: mappings },
      });
    });
  });

  // ── updateDefaultMapping (B581) ─────────────────────────────────────────────

  describe('updateDefaultMapping()', () => {
    it('calls PUT /issuetypescreenscheme/{id}/mapping/default', async () => {
      transport.respondWith(undefined, 204);

      await resource.updateDefaultMapping('10001', { screenSchemeId: '10002' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuetypescreenscheme/10001/mapping/default`,
        body: { screenSchemeId: '10002' },
      });
    });
  });

  // ── removeMappings (B582) ───────────────────────────────────────────────────

  describe('removeMappings()', () => {
    it('calls POST /issuetypescreenscheme/{id}/mapping/remove', async () => {
      transport.respondWith(undefined, 204);

      await resource.removeMappings('10001', { issueTypeIds: ['10000', '10001'] });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issuetypescreenscheme/10001/mapping/remove`,
        body: { issueTypeIds: ['10000', '10001'] },
      });
    });
  });

  // ── listProject (B583) ──────────────────────────────────────────────────────

  const makeProjectDetails = (id = 'p1', key = 'PROJ') => ({
    id,
    key,
    name: 'Project ' + key,
    projectTypeKey: 'software',
  });

  describe('listProject()', () => {
    it('calls GET /issuetypescreenscheme/{id}/project with no params', async () => {
      transport.respondWith(makePageResponse([makeProjectDetails()]));

      const result = await resource.listProject('10001');

      expect(result.values).toHaveLength(1);
      expect(result.values[0]).toMatchObject({ id: 'p1', key: 'PROJ', projectTypeKey: 'software' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuetypescreenscheme/10001/project`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageResponse([]));

      await resource.listProject('10001', { startAt: 5, maxResults: 10 });

      expect(transport.lastCall?.options.query).toEqual({ startAt: 5, maxResults: 10 });
    });

    it('rejects non-positive maxResults', async () => {
      await expect(resource.listProject('10001', { maxResults: 0 })).rejects.toThrow(/maxResults/);
    });
  });

  // ── listProjectAll (B583) ───────────────────────────────────────────────────

  describe('listProjectAll()', () => {
    it('yields ProjectDetails items from a single page', async () => {
      transport.respondWith(
        makePageResponse([makeProjectDetails('p1', 'ALPHA'), makeProjectDetails('p2', 'BETA')]),
      );

      const results: { id: string; key: string }[] = [];
      for await (const p of resource.listProjectAll('10001')) {
        results.push(p);
      }

      expect(results.map((p) => p.id)).toEqual(['p1', 'p2']);
      expect(results[0]).toMatchObject({ key: 'ALPHA', projectTypeKey: 'software' });
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [makeProjectDetails('p1', 'ALPHA')],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeProjectDetails('p2', 'BETA')],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: { id: string }[] = [];
      for await (const p of resource.listProjectAll('10001', { maxResults: 1 })) {
        results.push(p);
      }

      expect(results.map((p) => p.id)).toEqual(['p1', 'p2']);
    });
  });

  // ── listMapping (B584) ──────────────────────────────────────────────────────

  describe('listMapping()', () => {
    it('calls GET /issuetypescreenscheme/mapping with no params', async () => {
      transport.respondWith(makePageResponse([]));

      await resource.listMapping();

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuetypescreenscheme/mapping`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards startAt, maxResults, and issueTypeScreenSchemeId', async () => {
      transport.respondWith(makePageResponse([]));

      await resource.listMapping({ startAt: 0, maxResults: 10, issueTypeScreenSchemeId: [1, 2] });

      expect(transport.lastCall?.options.query).toEqual({
        startAt: 0,
        maxResults: 10,
        issueTypeScreenSchemeId: '1,2',
      });
    });

    it('omits empty issueTypeScreenSchemeId array', async () => {
      transport.respondWith(makePageResponse([]));

      await resource.listMapping({ issueTypeScreenSchemeId: [] });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('issueTypeScreenSchemeId');
    });

    it('rejects non-positive maxResults', async () => {
      await expect(resource.listMapping({ maxResults: 0 })).rejects.toThrow(/maxResults/);
    });
  });

  // ── listMappingAll (B584) ───────────────────────────────────────────────────

  describe('listMappingAll()', () => {
    it('yields items from a single page', async () => {
      const item = { issueTypeScreenSchemeId: '1', issueTypeId: '10000', screenSchemeId: '20000' };
      transport.respondWith(makePageResponse([item]));

      const results: (typeof item)[] = [];
      for await (const m of resource.listMappingAll()) {
        results.push(m);
      }

      expect(results).toHaveLength(1);
    });

    it('forwards issueTypeScreenSchemeId filter on every page', async () => {
      transport.respondWith(makePageResponse([]));

      const results: unknown[] = [];
      for await (const m of resource.listMappingAll({ issueTypeScreenSchemeId: [5] })) {
        results.push(m);
      }

      expect(transport.lastCall?.options.query).toMatchObject({
        issueTypeScreenSchemeId: '5',
      });
    });

    it('rejects non-positive maxResults', async () => {
      await expect(async () => {
        for await (const _ of resource.listMappingAll({ maxResults: 0 })) {
          // consume
        }
      }).rejects.toThrow(/maxResults/);
    });
  });

  // ── listProjectMappings (B585) ──────────────────────────────────────────────

  const makeSchemeProjects = (schemeId = '10001', projectIds = ['proj-1']) => ({
    issueTypeScreenScheme: makeScheme(schemeId),
    projectIds,
  });

  describe('listProjectMappings()', () => {
    it('calls GET /issuetypescreenscheme/project with required projectId', async () => {
      transport.respondWith(makePageResponse([makeSchemeProjects()]));

      const result = await resource.listProjectMappings({ projectId: ['10001'] });

      expect(result.values).toHaveLength(1);
      expect(result.values[0]).toMatchObject({
        issueTypeScreenScheme: { id: '10001' },
        projectIds: ['proj-1'],
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuetypescreenscheme/project`,
      });
      expect(transport.lastCall?.options.query).toMatchObject({ projectId: '10001' });
    });

    it('forwards startAt, maxResults, and projectId', async () => {
      transport.respondWith(makePageResponse([]));

      await resource.listProjectMappings({
        startAt: 0,
        maxResults: 10,
        projectId: ['p1', 'p2'],
      });

      expect(transport.lastCall?.options.query).toEqual({
        startAt: 0,
        maxResults: 10,
        projectId: 'p1,p2',
      });
    });

    it('rejects non-positive maxResults', async () => {
      await expect(
        resource.listProjectMappings({ projectId: ['p1'], maxResults: 0 }),
      ).rejects.toThrow(/maxResults/);
    });

    it('omits projectId query param when array is empty', async () => {
      transport.respondWith(makePageResponse([]));

      await resource.listProjectMappings({ projectId: [] });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('projectId');
    });
  });

  // ── listProjectMappingsAll (B585) ───────────────────────────────────────────

  describe('listProjectMappingsAll()', () => {
    it('yields IssueTypeScreenSchemesProjects items from a single page', async () => {
      transport.respondWith(makePageResponse([makeSchemeProjects('10001', ['p1'])]));

      const results: { issueTypeScreenScheme: { id: string }; projectIds: string[] }[] = [];
      for await (const p of resource.listProjectMappingsAll({ projectId: ['10001'] })) {
        results.push(p);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        issueTypeScreenScheme: { id: '10001' },
        projectIds: ['p1'],
      });
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [makeSchemeProjects('10001', ['p1'])],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeSchemeProjects('10002', ['p2'])],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: { issueTypeScreenScheme: { id: string }; projectIds: string[] }[] = [];
      for await (const p of resource.listProjectMappingsAll({
        projectId: ['10001'],
        maxResults: 1,
      })) {
        results.push(p);
      }

      expect(results.map((p) => p.issueTypeScreenScheme.id)).toEqual(['10001', '10002']);
    });
  });

  // ── assignToProject (B586) ──────────────────────────────────────────────────

  describe('assignToProject()', () => {
    it('calls PUT /issuetypescreenscheme/project with required fields', async () => {
      transport.respondWith(undefined, 204);

      await resource.assignToProject({
        issueTypeScreenSchemeId: '10001',
        projectId: '10002',
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuetypescreenscheme/project`,
        body: {
          issueTypeScreenSchemeId: '10001',
          projectId: '10002',
        },
      });
    });
  });
});
