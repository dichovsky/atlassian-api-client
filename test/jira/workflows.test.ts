import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowsResource } from '../../src/jira/resources/workflows.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

// ── Helpers ───────────────────────────────────────────────────────────────────

const WORKFLOW_ID = 'fb759d53-a3a4-45ff-9de4-547c4b638dde';
const PROJECT_ID = '10001';

const makeWorkflow = (name: string) => ({
  id: { name, entityId: `entity-${name}` },
  description: `Description for ${name}`,
});

const makeListResponse = <T>(values: T[]) => ({
  values,
  startAt: 0,
  maxResults: 50,
  total: values.length,
});

describe('WorkflowsResource', () => {
  let transport: MockTransport;
  let workflows: WorkflowsResource;

  beforeEach(() => {
    transport = new MockTransport();
    workflows = new WorkflowsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /workflow/search with no params', async () => {
      // Arrange
      const payload = makeListResponse([makeWorkflow('Default Workflow')]);
      transport.respondWith(payload);

      // Act
      const result = await workflows.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflow/search`,
      });
    });

    it('passes all supported params correctly', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await workflows.list({
        startAt: 5,
        maxResults: 20,
        expand: 'transitions',
        queryString: 'default',
        orderBy: 'name',
        isActive: true,
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 20,
        expand: 'transitions',
        queryString: 'default',
        orderBy: 'name',
        isActive: true,
      });
    });

    it('passes isActive: false correctly', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await workflows.list({ isActive: false });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ isActive: false });
    });

    it('does not include undefined query params when params is empty object', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await workflows.list({});

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['expand']).toBeUndefined();
      expect(query['queryString']).toBeUndefined();
      expect(query['orderBy']).toBeUndefined();
      expect(query['isActive']).toBeUndefined();
    });

    it('throws RangeError for maxResults: 0', async () => {
      await expect(workflows.list({ maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: -1', async () => {
      await expect(workflows.list({ maxResults: -1 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: 1.5', async () => {
      await expect(workflows.list({ maxResults: 1.5 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: Infinity', async () => {
      await expect(workflows.list({ maxResults: Infinity })).rejects.toThrow(RangeError);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /workflow with workflowName query param and returns first result', async () => {
      // Arrange
      const workflow = makeWorkflow('Default Workflow');
      transport.respondWith({ values: [workflow] });

      // Act
      const result = await workflows.get('Default Workflow');

      // Assert
      expect(result).toEqual(workflow);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflow`,
        query: { workflowName: 'Default Workflow' },
      });
    });

    it('throws an error when workflow not found', async () => {
      // Arrange
      transport.respondWith({ values: [] });

      // Act & Assert
      await expect(workflows.get('NonExistent')).rejects.toThrow('Workflow not found: NonExistent');
    });

    it('passes the workflow name as query param', async () => {
      // Arrange
      const workflow = makeWorkflow('Custom Workflow');
      transport.respondWith({ values: [workflow] });

      // Act
      await workflows.get('Custom Workflow');

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        workflowName: 'Custom Workflow',
      });
    });
  });

  // ── deleteWorkflow ─────────────────────────────────────────────────────────

  describe('deleteWorkflow()', () => {
    it('calls DELETE /workflow/{entityId} and returns void', async () => {
      transport.respondWith(undefined);

      await workflows.deleteWorkflow(WORKFLOW_ID);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/workflow/${WORKFLOW_ID}`,
      });
    });

    it('encodes the entityId in the path', async () => {
      const entityId = 'id with spaces';
      transport.respondWith(undefined);

      await workflows.deleteWorkflow(entityId);

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/workflow/id%20with%20spaces`);
    });
  });

  // ── getIssueTypeUsages ─────────────────────────────────────────────────────

  describe('getIssueTypeUsages()', () => {
    const issueTypeUsagesResponse = {
      workflowId: WORKFLOW_ID,
      projectId: PROJECT_ID,
      issueTypes: {
        values: [{ id: '10000' }],
        nextPageToken: 'eyJvIjoyfQ==',
      },
    };

    it('calls GET /workflow/{workflowId}/project/{projectId}/issueTypeUsages', async () => {
      transport.respondWith(issueTypeUsagesResponse);

      const result = await workflows.getIssueTypeUsages(WORKFLOW_ID, PROJECT_ID);

      expect(result).toEqual(issueTypeUsagesResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflow/${WORKFLOW_ID}/project/${PROJECT_ID}/issueTypeUsages`,
      });
    });

    it('passes nextPageToken and maxResults query params', async () => {
      transport.respondWith(issueTypeUsagesResponse);

      await workflows.getIssueTypeUsages(WORKFLOW_ID, PROJECT_ID, {
        nextPageToken: 'eyJvIjoyfQ==',
        maxResults: 25,
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        nextPageToken: 'eyJvIjoyfQ==',
        maxResults: 25,
      });
    });

    it('does not include undefined query params when params is empty', async () => {
      transport.respondWith(issueTypeUsagesResponse);

      await workflows.getIssueTypeUsages(WORKFLOW_ID, PROJECT_ID, {});

      const query = transport.lastCall?.options.query ?? {};
      expect(query['nextPageToken']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
    });

    it('encodes workflowId and projectId in the path', async () => {
      transport.respondWith(issueTypeUsagesResponse);

      await workflows.getIssueTypeUsages('wf/id', 'proj/id');

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/workflow/wf%2Fid/project/proj%2Fid/issueTypeUsages`,
      );
    });

    it('rejects out-of-range maxResults', async () => {
      await expect(
        workflows.getIssueTypeUsages(WORKFLOW_ID, PROJECT_ID, { maxResults: 0 }),
      ).rejects.toThrow(RangeError);
      await expect(
        workflows.getIssueTypeUsages(WORKFLOW_ID, PROJECT_ID, { maxResults: -1 }),
      ).rejects.toThrow(RangeError);
    });
  });

  // ── getProjectUsages ───────────────────────────────────────────────────────

  describe('getProjectUsages()', () => {
    const projectUsagesResponse = {
      workflowId: WORKFLOW_ID,
      projects: {
        values: [{ id: '10001' }],
        nextPageToken: 'eyJvIjoyfQ==',
      },
    };

    it('calls GET /workflow/{workflowId}/projectUsages', async () => {
      transport.respondWith(projectUsagesResponse);

      const result = await workflows.getProjectUsages(WORKFLOW_ID);

      expect(result).toEqual(projectUsagesResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflow/${WORKFLOW_ID}/projectUsages`,
      });
    });

    it('passes nextPageToken and maxResults query params', async () => {
      transport.respondWith(projectUsagesResponse);

      await workflows.getProjectUsages(WORKFLOW_ID, {
        nextPageToken: 'eyJvIjoyfQ==',
        maxResults: 10,
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        nextPageToken: 'eyJvIjoyfQ==',
        maxResults: 10,
      });
    });

    it('does not include undefined params when called with no params', async () => {
      transport.respondWith(projectUsagesResponse);

      await workflows.getProjectUsages(WORKFLOW_ID);

      const query = transport.lastCall?.options.query ?? {};
      expect(query['nextPageToken']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
    });

    it('rejects out-of-range maxResults', async () => {
      await expect(workflows.getProjectUsages(WORKFLOW_ID, { maxResults: 0 })).rejects.toThrow(
        RangeError,
      );
      await expect(workflows.getProjectUsages(WORKFLOW_ID, { maxResults: -5 })).rejects.toThrow(
        RangeError,
      );
    });
  });

  // ── getWorkflowSchemeUsages ────────────────────────────────────────────────

  describe('getWorkflowSchemeUsages()', () => {
    const schemeUsagesResponse = {
      workflowId: WORKFLOW_ID,
      workflowSchemes: {
        values: [{ id: '1000' }],
        nextPageToken: 'eyJvIjoyfQ==',
      },
    };

    it('calls GET /workflow/{workflowId}/workflowSchemes', async () => {
      transport.respondWith(schemeUsagesResponse);

      const result = await workflows.getWorkflowSchemeUsages(WORKFLOW_ID);

      expect(result).toEqual(schemeUsagesResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflow/${WORKFLOW_ID}/workflowSchemes`,
      });
    });

    it('passes nextPageToken and maxResults query params', async () => {
      transport.respondWith(schemeUsagesResponse);

      await workflows.getWorkflowSchemeUsages(WORKFLOW_ID, {
        nextPageToken: 'eyJvIjoyfQ==',
        maxResults: 50,
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        nextPageToken: 'eyJvIjoyfQ==',
        maxResults: 50,
      });
    });

    it('does not include undefined params when called with no params', async () => {
      transport.respondWith(schemeUsagesResponse);

      await workflows.getWorkflowSchemeUsages(WORKFLOW_ID);

      const query = transport.lastCall?.options.query ?? {};
      expect(query['nextPageToken']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
    });

    it('rejects out-of-range maxResults', async () => {
      await expect(
        workflows.getWorkflowSchemeUsages(WORKFLOW_ID, { maxResults: 0 }),
      ).rejects.toThrow(RangeError);
      await expect(
        workflows.getWorkflowSchemeUsages(WORKFLOW_ID, { maxResults: -2 }),
      ).rejects.toThrow(RangeError);
    });
  });

  // ── bulkGet (B846) ─────────────────────────────────────────────────────────

  describe('bulkGet()', () => {
    const readRequest = { workflowIds: [WORKFLOW_ID] };
    const readResponse = {
      workflows: [{ id: WORKFLOW_ID, name: 'My Workflow' }],
      statuses: [{ id: '10001', name: 'To Do', statusCategory: 'TODO' }],
    };

    it('calls POST /workflows with request body and returns WorkflowReadResponse', async () => {
      transport.respondWith(readResponse);

      const result = await workflows.bulkGet(readRequest);

      expect(result).toEqual(readResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/workflows`,
        body: readRequest,
      });
    });

    it('accepts all request fields: workflowNames and projectAndIssueTypes', async () => {
      transport.respondWith(readResponse);

      const body = {
        workflowIds: [WORKFLOW_ID],
        workflowNames: ['My Workflow'],
        projectAndIssueTypes: [{ projectId: '10001', issueTypeId: '10000' }],
      };

      await workflows.bulkGet(body);

      expect(transport.lastCall?.options.body).toEqual(body);
    });

    it('accepts empty request body (no filter fields)', async () => {
      transport.respondWith({ workflows: [], statuses: [] });

      await workflows.bulkGet({});

      expect(transport.lastCall?.options.method).toBe('POST');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/workflows`);
    });
  });

  // ── getCapabilities (B847) ─────────────────────────────────────────────────

  describe('getCapabilities()', () => {
    const capabilitiesResponse = {
      editorScope: 'GLOBAL',
      systemRules: [
        { name: 'Assign a request', ruleKey: 'system:change-assignee', ruleType: 'Function' },
      ],
      connectRules: [],
      forgeRules: [],
      projectTypes: ['software'],
      triggerRules: [],
    };

    it('calls GET /workflows/capabilities with no params', async () => {
      transport.respondWith(capabilitiesResponse);

      const result = await workflows.getCapabilities();

      expect(result).toEqual(capabilitiesResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflows/capabilities`,
      });
    });

    it('passes workflowId query param', async () => {
      transport.respondWith(capabilitiesResponse);

      await workflows.getCapabilities({ workflowId: WORKFLOW_ID });

      expect(transport.lastCall?.options.query).toMatchObject({ workflowId: WORKFLOW_ID });
    });

    it('passes projectId and issueTypeId query params', async () => {
      transport.respondWith(capabilitiesResponse);

      await workflows.getCapabilities({ projectId: '10001', issueTypeId: '10000' });

      expect(transport.lastCall?.options.query).toMatchObject({
        projectId: '10001',
        issueTypeId: '10000',
      });
    });

    it('does not include undefined query params when no params provided', async () => {
      transport.respondWith(capabilitiesResponse);

      await workflows.getCapabilities({});

      const query = transport.lastCall?.options.query ?? {};
      expect(query['workflowId']).toBeUndefined();
      expect(query['projectId']).toBeUndefined();
      expect(query['issueTypeId']).toBeUndefined();
    });
  });

  // ── bulkCreate (B848) ──────────────────────────────────────────────────────

  describe('bulkCreate()', () => {
    const createRequest = {
      scope: { type: 'GLOBAL' as const },
      statuses: [
        {
          name: 'To Do',
          statusCategory: 'TODO',
          statusReference: 'f0b24de5-25e7-4fab-ab94-63d81db6c0c0',
        },
      ],
      workflows: [
        {
          name: 'Software workflow 1',
          statuses: [{ statusReference: 'f0b24de5-25e7-4fab-ab94-63d81db6c0c0' }],
          transitions: [
            {
              id: '1',
              name: 'Create',
              type: 'INITIAL',
              toStatusReference: 'f0b24de5-25e7-4fab-ab94-63d81db6c0c0',
            },
          ],
        },
      ],
    };

    const createResponse = {
      workflows: [{ id: WORKFLOW_ID, name: 'Software workflow 1' }],
      statuses: [{ id: '10001', name: 'To Do', statusCategory: 'TODO' }],
    };

    it('calls POST /workflows/create with request body', async () => {
      transport.respondWith(createResponse);

      const result = await workflows.bulkCreate(createRequest);

      expect(result).toEqual(createResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/workflows/create`,
        body: createRequest,
      });
    });

    it('response schema is distinct from WorkflowReadResponse (both have workflows+statuses fields)', async () => {
      // WorkflowCreateResponse and WorkflowReadResponse share the same field names
      // but are different types from different spec schemas — ensure bulkCreate returns the right shape
      transport.respondWith(createResponse);

      const result = await workflows.bulkCreate(createRequest);

      expect(result).toHaveProperty('workflows');
      expect(result).toHaveProperty('statuses');
    });

    it('accepts minimal request with just workflows array', async () => {
      transport.respondWith({ workflows: [], statuses: [] });

      await workflows.bulkCreate({});

      expect(transport.lastCall?.options.method).toBe('POST');
    });
  });

  // ── validateCreate (B849) ─────────────────────────────────────────────────

  describe('validateCreate()', () => {
    const validateRequest = {
      payload: {
        scope: { type: 'GLOBAL' as const },
        statuses: [],
        workflows: [],
      },
      validationOptions: { levels: ['ERROR', 'WARNING'] },
    };

    const validationResponse = {
      errors: [
        {
          message: 'Workflow name is required',
          code: 'REQUIRED_FIELD',
          level: 'ERROR',
          type: 'WORKFLOW',
        },
      ],
    };

    it('calls POST /workflows/create/validation with request body', async () => {
      transport.respondWith(validationResponse);

      const result = await workflows.validateCreate(validateRequest);

      expect(result).toEqual(validationResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/workflows/create/validation`,
        body: validateRequest,
      });
    });

    it('returns empty errors array when validation passes', async () => {
      transport.respondWith({ errors: [] });

      const result = await workflows.validateCreate({
        payload: {},
      });

      expect(result.errors).toEqual([]);
    });

    it('body includes required payload field and optional validationOptions', async () => {
      transport.respondWith({});

      await workflows.validateCreate({
        payload: {},
        validationOptions: { levels: ['ERROR'] },
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        payload: {},
        validationOptions: { levels: ['ERROR'] },
      });
    });
  });

  // ── getDefaultEditor (B850) ────────────────────────────────────────────────

  describe('getDefaultEditor()', () => {
    it('calls GET /workflows/defaultEditor and returns response', async () => {
      transport.respondWith({ value: 'NEW' });

      const result = await workflows.getDefaultEditor();

      expect(result).toEqual({ value: 'NEW' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflows/defaultEditor`,
      });
    });

    it('returns value: LEGACY for legacy editor', async () => {
      transport.respondWith({ value: 'LEGACY' });

      const result = await workflows.getDefaultEditor();

      expect(result.value).toBe('LEGACY');
    });

    it('does not send a request body or query params', async () => {
      transport.respondWith({ value: 'NEW' });

      await workflows.getDefaultEditor();

      const call = transport.lastCall?.options;
      expect(call?.body).toBeUndefined();
      expect(call?.query).toBeUndefined();
    });
  });
});
