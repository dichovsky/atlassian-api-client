import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowSchemeResource } from '../../src/jira/resources/workflowscheme.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeScheme = (id = 101010, name = 'Example workflow scheme') => ({
  id,
  name,
  defaultWorkflow: 'jira',
  description: 'A test scheme',
  draft: false,
  issueTypeMappings: { '10000': 'scrum workflow' },
  self: `${BASE_URL}/workflowscheme/${id}`,
});

const makePageOf = <T>(values: T[], startAt = 0, total = values.length) => ({
  values,
  startAt,
  maxResults: 50,
  total,
  isLast: true,
});

describe('WorkflowSchemeResource', () => {
  let transport: MockTransport;
  let resource: WorkflowSchemeResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new WorkflowSchemeResource(transport, BASE_URL);
  });

  // ── B855: list ─────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /workflowscheme with empty query when no params', async () => {
      const page = makePageOf([makeScheme()]);
      transport.respondWith(page);

      const result = await resource.list();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflowscheme`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ startAt: 10, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.list({ maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── B855: listAll ──────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('yields items from a single-page response', async () => {
      const scheme = makeScheme();
      transport.respondWith(makePageOf([scheme]));

      const results: unknown[] = [];
      for await (const item of resource.listAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(scheme);
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [makeScheme(101010)],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeScheme(101011)],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: unknown[] = [];
      for await (const item of resource.listAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(2);
    });

    it('yields nothing for empty page', async () => {
      transport.respondWith(makePageOf([]));

      const results: unknown[] = [];
      for await (const item of resource.listAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(0);
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── B856: create ───────────────────────────────────────────────────────────

  describe('create()', () => {
    it('POSTs with required name', async () => {
      const created = makeScheme();
      transport.respondWith(created);

      const result = await resource.create({ name: 'Example workflow scheme' });

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/workflowscheme`,
        body: { name: 'Example workflow scheme' },
      });
    });

    it('includes optional fields when provided', async () => {
      transport.respondWith(makeScheme());

      await resource.create({
        name: 'My Scheme',
        defaultWorkflow: 'jira',
        description: 'A description',
        issueTypeMappings: { '10000': 'scrum workflow' },
      });

      expect(transport.lastCall?.options.body).toEqual({
        name: 'My Scheme',
        defaultWorkflow: 'jira',
        description: 'A description',
        issueTypeMappings: { '10000': 'scrum workflow' },
      });
    });

    it('omits undefined optional fields', async () => {
      transport.respondWith(makeScheme());

      await resource.create({ name: 'Minimal' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('description');
      expect(transport.lastCall?.options.body).not.toHaveProperty('defaultWorkflow');
      expect(transport.lastCall?.options.body).not.toHaveProperty('issueTypeMappings');
    });
  });

  // ── B857: delete ───────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /workflowscheme/{id} with string id', async () => {
      transport.respondWith(undefined);

      await resource.delete('101010');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/workflowscheme/101010`,
      });
    });

    it('accepts a numeric id', async () => {
      transport.respondWith(undefined);

      await resource.delete(101010);

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/workflowscheme/101010`);
    });
  });

  // ── B858: get ──────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /workflowscheme/{id} with empty query', async () => {
      const scheme = makeScheme();
      transport.respondWith(scheme);

      const result = await resource.get('101010');

      expect(result).toEqual(scheme);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflowscheme/101010`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards returnDraftIfExists when set', async () => {
      transport.respondWith(makeScheme());

      await resource.get('101010', { returnDraftIfExists: true });

      expect(transport.lastCall?.options.query).toMatchObject({ returnDraftIfExists: true });
    });
  });

  // ── B859: update ───────────────────────────────────────────────────────────

  describe('update()', () => {
    it('PUTs to /workflowscheme/{id} with provided fields', async () => {
      const updated = makeScheme();
      transport.respondWith(updated);

      const result = await resource.update('101010', {
        name: 'Renamed',
        defaultWorkflow: 'jira',
        description: 'New desc',
        issueTypeMappings: { '10001': 'builds workflow' },
        updateDraftIfNeeded: true,
      });

      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/workflowscheme/101010`,
        body: {
          name: 'Renamed',
          defaultWorkflow: 'jira',
          description: 'New desc',
          issueTypeMappings: { '10001': 'builds workflow' },
          updateDraftIfNeeded: true,
        },
      });
    });

    it('omits undefined fields', async () => {
      transport.respondWith(makeScheme());

      await resource.update('101010', {});

      expect(transport.lastCall?.options.body).toEqual({});
    });
  });

  // ── B861: deleteDefault ────────────────────────────────────────────────────

  describe('deleteDefault()', () => {
    it('calls DELETE /workflowscheme/{id}/default with empty query', async () => {
      transport.respondWith(makeScheme());

      const result = await resource.deleteDefault('101010');

      expect(result).toEqual(makeScheme());
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/workflowscheme/101010/default`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards updateDraftIfNeeded', async () => {
      transport.respondWith(makeScheme());

      await resource.deleteDefault('101010', { updateDraftIfNeeded: true });

      expect(transport.lastCall?.options.query).toMatchObject({ updateDraftIfNeeded: true });
    });
  });

  // ── B862: getDefault ───────────────────────────────────────────────────────

  describe('getDefault()', () => {
    it('calls GET /workflowscheme/{id}/default', async () => {
      const def = { workflow: 'jira' };
      transport.respondWith(def);

      const result = await resource.getDefault('101010');

      expect(result).toEqual(def);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflowscheme/101010/default`,
      });
    });

    it('forwards returnDraftIfExists', async () => {
      transport.respondWith({ workflow: 'jira' });

      await resource.getDefault('101010', { returnDraftIfExists: true });

      expect(transport.lastCall?.options.query).toMatchObject({ returnDraftIfExists: true });
    });
  });

  // ── B863: setDefault ───────────────────────────────────────────────────────

  describe('setDefault()', () => {
    it('PUTs to /workflowscheme/{id}/default with required workflow', async () => {
      transport.respondWith(makeScheme());

      const result = await resource.setDefault('101010', { workflow: 'jira' });

      expect(result).toEqual(makeScheme());
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/workflowscheme/101010/default`,
        body: { workflow: 'jira' },
      });
    });

    it('includes updateDraftIfNeeded when provided', async () => {
      transport.respondWith(makeScheme());

      await resource.setDefault('101010', { workflow: 'jira', updateDraftIfNeeded: false });

      expect(transport.lastCall?.options.body).toEqual({
        workflow: 'jira',
        updateDraftIfNeeded: false,
      });
    });
  });

  // ── B877: deleteIssueTypeMapping ───────────────────────────────────────────

  describe('deleteIssueTypeMapping()', () => {
    it('calls DELETE /workflowscheme/{id}/issuetype/{issueType}', async () => {
      transport.respondWith(makeScheme());

      const result = await resource.deleteIssueTypeMapping('101010', '10000');

      expect(result).toEqual(makeScheme());
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/workflowscheme/101010/issuetype/10000`,
      });
    });

    it('forwards updateDraftIfNeeded', async () => {
      transport.respondWith(makeScheme());

      await resource.deleteIssueTypeMapping('101010', '10000', { updateDraftIfNeeded: true });

      expect(transport.lastCall?.options.query).toMatchObject({ updateDraftIfNeeded: true });
    });
  });

  // ── B878: getIssueTypeMapping ──────────────────────────────────────────────

  describe('getIssueTypeMapping()', () => {
    it('calls GET /workflowscheme/{id}/issuetype/{issueType}', async () => {
      const mapping = { issueType: '10000', workflow: 'jira' };
      transport.respondWith(mapping);

      const result = await resource.getIssueTypeMapping('101010', '10000');

      expect(result).toEqual(mapping);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflowscheme/101010/issuetype/10000`,
      });
    });

    it('forwards returnDraftIfExists', async () => {
      transport.respondWith({ workflow: 'jira' });

      await resource.getIssueTypeMapping('101010', '10000', { returnDraftIfExists: true });

      expect(transport.lastCall?.options.query).toMatchObject({ returnDraftIfExists: true });
    });
  });

  // ── B879: setIssueTypeMapping ──────────────────────────────────────────────

  describe('setIssueTypeMapping()', () => {
    it('PUTs to /workflowscheme/{id}/issuetype/{issueType}', async () => {
      transport.respondWith(makeScheme());

      const result = await resource.setIssueTypeMapping('101010', '10000', {
        workflow: 'jira',
        updateDraftIfNeeded: false,
      });

      expect(result).toEqual(makeScheme());
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/workflowscheme/101010/issuetype/10000`,
        body: { workflow: 'jira', updateDraftIfNeeded: false },
      });
    });

    it('includes issueType in body when provided', async () => {
      transport.respondWith(makeScheme());

      await resource.setIssueTypeMapping('101010', '10000', {
        issueType: '10000',
        workflow: 'jira',
      });

      expect(transport.lastCall?.options.body).toEqual({
        issueType: '10000',
        workflow: 'jira',
      });
    });

    it('sends empty body when no fields provided', async () => {
      transport.respondWith(makeScheme());

      await resource.setIssueTypeMapping('101010', '10000', {});

      expect(transport.lastCall?.options.body).toEqual({});
    });
  });

  // ── B880: deleteWorkflowMapping ────────────────────────────────────────────

  describe('deleteWorkflowMapping()', () => {
    it('calls DELETE /workflowscheme/{id}/workflow with required workflowName', async () => {
      transport.respondWith(undefined);

      await resource.deleteWorkflowMapping('101010', { workflowName: 'jira' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/workflowscheme/101010/workflow`,
        query: { workflowName: 'jira' },
      });
    });

    it('forwards updateDraftIfNeeded', async () => {
      transport.respondWith(undefined);

      await resource.deleteWorkflowMapping('101010', {
        workflowName: 'jira',
        updateDraftIfNeeded: true,
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        workflowName: 'jira',
        updateDraftIfNeeded: true,
      });
    });
  });

  // ── B881: getWorkflowMapping ───────────────────────────────────────────────

  describe('getWorkflowMapping()', () => {
    it('calls GET /workflowscheme/{id}/workflow with empty query when no params', async () => {
      const mapping = { defaultMapping: false, issueTypes: ['10000'], workflow: 'jira' };
      transport.respondWith(mapping);

      const result = await resource.getWorkflowMapping('101010');

      expect(result).toEqual(mapping);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflowscheme/101010/workflow`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards workflowName and returnDraftIfExists', async () => {
      transport.respondWith({ workflow: 'jira' });

      await resource.getWorkflowMapping('101010', {
        workflowName: 'jira',
        returnDraftIfExists: true,
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        workflowName: 'jira',
        returnDraftIfExists: true,
      });
    });
  });

  // ── B882: setWorkflowMapping ───────────────────────────────────────────────

  describe('setWorkflowMapping()', () => {
    it('PUTs to /workflowscheme/{id}/workflow with workflowName query and body', async () => {
      transport.respondWith(makeScheme());

      const result = await resource.setWorkflowMapping('101010', 'jira', {
        issueTypes: ['10000'],
        workflow: 'jira',
        updateDraftIfNeeded: true,
      });

      expect(result).toEqual(makeScheme());
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/workflowscheme/101010/workflow`,
        query: { workflowName: 'jira' },
        body: {
          issueTypes: ['10000'],
          workflow: 'jira',
          updateDraftIfNeeded: true,
        },
      });
    });

    it('includes defaultMapping when provided', async () => {
      transport.respondWith(makeScheme());

      await resource.setWorkflowMapping('101010', 'jira', { defaultMapping: true });

      expect(transport.lastCall?.options.body).toEqual({ defaultMapping: true });
    });

    it('sends empty body when no fields provided', async () => {
      transport.respondWith(makeScheme());

      await resource.setWorkflowMapping('101010', 'jira', {});

      expect(transport.lastCall?.options.body).toEqual({});
    });
  });

  // ── B883: getProjectUsages ─────────────────────────────────────────────────

  describe('getProjectUsages()', () => {
    it('calls GET /workflowscheme/{workflowSchemeId}/projectUsages with empty query', async () => {
      const dto = {
        projects: { nextPageToken: 'eyJvIjoyfQ==', values: [{ id: '1003' }] },
        workflowSchemeId: '10005',
      };
      transport.respondWith(dto);

      const result = await resource.getProjectUsages('10005');

      expect(result).toEqual(dto);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflowscheme/10005/projectUsages`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards nextPageToken and maxResults', async () => {
      transport.respondWith({ projects: { values: [] }, workflowSchemeId: '10005' });

      await resource.getProjectUsages('10005', {
        nextPageToken: 'eyJvIjoyfQ==',
        maxResults: 10,
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        nextPageToken: 'eyJvIjoyfQ==',
        maxResults: 10,
      });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.getProjectUsages('10005', { maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── B884: getProjectAssociations ───────────────────────────────────────────

  describe('getProjectAssociations()', () => {
    it('calls GET /workflowscheme/project with required projectId', async () => {
      const container = {
        values: [{ projectIds: ['10010', '10020'], workflowScheme: makeScheme() }],
      };
      transport.respondWith(container);

      const result = await resource.getProjectAssociations({ projectId: ['10010', '10020'] });

      expect(result).toEqual(container);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflowscheme/project`,
        query: { projectId: '10010,10020' },
      });
    });

    it('accepts numeric project IDs', async () => {
      transport.respondWith({ values: [] });

      await resource.getProjectAssociations({ projectId: [10010, 10020] });

      expect(transport.lastCall?.options.query).toMatchObject({ projectId: '10010,10020' });
    });

    it('throws when projectId is empty', async () => {
      await expect(resource.getProjectAssociations({ projectId: [] })).rejects.toThrow(
        'projectId must contain at least one value',
      );
    });
  });

  // ── B885: assignToProject ──────────────────────────────────────────────────

  describe('assignToProject()', () => {
    it('PUTs to /workflowscheme/project with required projectId', async () => {
      transport.respondWith(undefined);

      await resource.assignToProject({ projectId: '10001' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/workflowscheme/project`,
        body: { projectId: '10001' },
      });
    });

    it('includes workflowSchemeId when provided', async () => {
      transport.respondWith(undefined);

      await resource.assignToProject({ projectId: '10001', workflowSchemeId: '10032' });

      expect(transport.lastCall?.options.body).toEqual({
        projectId: '10001',
        workflowSchemeId: '10032',
      });
    });

    it('omits workflowSchemeId when undefined', async () => {
      transport.respondWith(undefined);

      await resource.assignToProject({ projectId: '10001' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('workflowSchemeId');
    });
  });

  // ── B886: switchProject ────────────────────────────────────────────────────

  describe('switchProject()', () => {
    it('POSTs to /workflowscheme/project/switch with provided fields', async () => {
      const task = {
        id: 'task-1',
        elapsedRuntime: 100,
        lastUpdate: 200,
        progress: 50,
        self: `${BASE_URL}/task/task-1`,
        status: 'RUNNING' as const,
        submitted: 50,
        submittedBy: 1,
      };
      transport.respondWith(task);

      const result = await resource.switchProject({
        projectId: '10001',
        targetSchemeId: '10002',
      });

      expect(result).toEqual(task);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/workflowscheme/project/switch`,
        body: { projectId: '10001', targetSchemeId: '10002' },
      });
    });

    it('forwards mappingsByIssueTypeOverride', async () => {
      transport.respondWith({
        id: 't',
        elapsedRuntime: 0,
        lastUpdate: 0,
        progress: 0,
        self: 's',
        status: 'ENQUEUED' as const,
        submitted: 0,
        submittedBy: 0,
      });
      const overrides = [
        {
          issueTypeId: '10000',
          statusMappings: [{ oldStatusId: '3', newStatusId: '10003' }],
        },
      ];

      await resource.switchProject({
        projectId: '10001',
        targetSchemeId: '10002',
        mappingsByIssueTypeOverride: overrides,
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        mappingsByIssueTypeOverride: overrides,
      });
    });

    it('sends empty body when no fields provided', async () => {
      transport.respondWith({
        id: 't',
        elapsedRuntime: 0,
        lastUpdate: 0,
        progress: 0,
        self: 's',
        status: 'ENQUEUED' as const,
        submitted: 0,
        submittedBy: 0,
      });

      await resource.switchProject({});

      expect(transport.lastCall?.options.body).toEqual({});
    });
  });

  // ── error path ─────────────────────────────────────────────────────────────

  describe('error propagation', () => {
    it('propagates transport errors from get()', async () => {
      transport.respondWithError(new Error('404 Not Found'));

      await expect(resource.get('999999')).rejects.toThrow('404 Not Found');
    });

    it('propagates transport errors from create()', async () => {
      transport.respondWithError(new Error('400 Bad Request'));

      await expect(resource.create({ name: 'X' })).rejects.toThrow('400 Bad Request');
    });
  });
});
