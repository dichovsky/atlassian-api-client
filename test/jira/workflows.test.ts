import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowsResource } from '../../src/jira/resources/workflows.js';
import type {
  WorkflowPreviewRequest,
  WorkflowUpdateRequest,
  WorkflowUpdateValidateRequest,
} from '../../src/jira/resources/workflows.js';
import { ValidationError } from '../../src/core/errors.js';
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

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(workflows.list({ maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: -1', async () => {
      await expect(workflows.list({ maxResults: -1 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: 1.5', async () => {
      await expect(workflows.list({ maxResults: 1.5 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: Infinity', async () => {
      await expect(workflows.list({ maxResults: Infinity })).rejects.toThrow(ValidationError);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /workflow/search with workflowName query param and returns first result', async () => {
      // Arrange
      const workflow = makeWorkflow('Default Workflow');
      transport.respondWith({ values: [workflow] });

      // Act
      const result = await workflows.get('Default Workflow');

      // Assert
      expect(result).toEqual(workflow);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflow/search`,
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
      ).rejects.toThrow(ValidationError);
      await expect(
        workflows.getIssueTypeUsages(WORKFLOW_ID, PROJECT_ID, { maxResults: -1 }),
      ).rejects.toThrow(ValidationError);
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
        ValidationError,
      );
      await expect(workflows.getProjectUsages(WORKFLOW_ID, { maxResults: -5 })).rejects.toThrow(
        ValidationError,
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
      ).rejects.toThrow(ValidationError);
      await expect(
        workflows.getWorkflowSchemeUsages(WORKFLOW_ID, { maxResults: -2 }),
      ).rejects.toThrow(ValidationError);
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
          statuses: [{ statusReference: 'f0b24de5-25e7-4fab-ab94-63d81db6c0c0', properties: {} }],
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

  // ── readWorkflowFromHistory (B841) ─────────────────────────────────────────

  describe('readWorkflowFromHistory()', () => {
    const historyReadResponse = {
      statuses: [{ id: '10003', name: 'To Do', statusReference: '10003' }],
      workflows: [
        {
          id: WORKFLOW_ID,
          name: 'Example Workflow',
          version: { id: 'ver-uuid', versionNumber: 4 },
        },
      ],
    };

    it('calls POST /workflow/history and returns response', async () => {
      transport.respondWith(historyReadResponse);

      const result = await workflows.readWorkflowFromHistory({
        workflowId: WORKFLOW_ID,
        version: 4,
      });

      expect(result).toEqual(historyReadResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/workflow/history`,
        body: { workflowId: WORKFLOW_ID, version: 4 },
      });
    });

    it('calls POST /workflow/history without version when omitted', async () => {
      transport.respondWith(historyReadResponse);

      await workflows.readWorkflowFromHistory({ workflowId: WORKFLOW_ID });

      expect(transport.lastCall?.options.body).toEqual({ workflowId: WORKFLOW_ID });
    });

    it('throws ValidationError when workflowId is empty', async () => {
      await expect(workflows.readWorkflowFromHistory({ workflowId: '' })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── listWorkflowHistory (B842) ─────────────────────────────────────────────

  describe('listWorkflowHistory()', () => {
    const historyListResponse = {
      entries: [
        {
          isIntermediate: false,
          workflowId: WORKFLOW_ID,
          workflowVersion: 4,
          writtenAt: '2025-11-20',
        },
        {
          isIntermediate: true,
          workflowId: WORKFLOW_ID,
          workflowVersion: 3,
          writtenAt: '2025-11-19',
        },
      ],
    };

    it('calls POST /workflow/history/list and returns response', async () => {
      transport.respondWith(historyListResponse);

      const result = await workflows.listWorkflowHistory({ workflowId: WORKFLOW_ID });

      expect(result).toEqual(historyListResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/workflow/history/list`,
        body: { workflowId: WORKFLOW_ID },
      });
    });

    it('passes expand query param when provided', async () => {
      transport.respondWith(historyListResponse);

      await workflows.listWorkflowHistory(
        { workflowId: WORKFLOW_ID },
        { expand: 'includeIntermediateWorkflows' },
      );

      expect(transport.lastCall?.options.query).toMatchObject({
        expand: 'includeIntermediateWorkflows',
      });
    });

    it('does not include expand query param when not provided', async () => {
      transport.respondWith(historyListResponse);

      await workflows.listWorkflowHistory({ workflowId: WORKFLOW_ID });

      const query = transport.lastCall?.options.query ?? {};
      expect(query['expand']).toBeUndefined();
    });

    it('throws ValidationError when workflowId is empty', async () => {
      await expect(workflows.listWorkflowHistory({ workflowId: '' })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── getTransitionRuleConfigs (B843) ────────────────────────────────────────

  describe('getTransitionRuleConfigs()', () => {
    const ruleConfigPage = {
      isLast: true,
      maxResults: 10,
      startAt: 0,
      total: 1,
      values: [
        {
          workflowId: { name: 'My Workflow', draft: false },
          postFunctions: [
            {
              id: 'b4d6cbdc',
              key: 'postfunction-key',
              configuration: { value: '{}', disabled: false },
            },
          ],
        },
      ],
    };

    it('calls GET /workflow/rule/config with required types param (repeated)', async () => {
      transport.respondWith(ruleConfigPage);

      const result = await workflows.getTransitionRuleConfigs({ types: ['postfunction'] });

      expect(result).toEqual(ruleConfigPage);
      // `types` is a `type: array` query param emitted as repeated params built
      // into the path, not a CSV value in the scalar query bag.
      expect(transport.lastCall?.options.method).toBe('GET');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/workflow/rule/config?types=postfunction`,
      );
    });

    it('passes multiple types as repeated query params', async () => {
      transport.respondWith(ruleConfigPage);

      await workflows.getTransitionRuleConfigs({
        types: ['postfunction', 'condition', 'validator'],
      });

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/workflow/rule/config?types=postfunction&types=condition&types=validator`,
      );
    });

    it('passes all optional params correctly', async () => {
      transport.respondWith(ruleConfigPage);

      await workflows.getTransitionRuleConfigs({
        types: ['postfunction'],
        startAt: 0,
        maxResults: 10,
        keys: ['key-a', 'key-b'],
        workflowNames: ['My Workflow'],
        withTags: ['tag1'],
        draft: false,
        expand: 'transition',
      });

      // `types`, `keys`, `workflowNames`, `withTags` are `type: array` params
      // built into the path as repeated; the scalar bag holds only scalars.
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/workflow/rule/config?types=postfunction&keys=key-a&keys=key-b` +
          `&workflowNames=My%20Workflow&withTags=tag1`,
      );
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 0,
        maxResults: 10,
        draft: false,
        expand: 'transition',
      });
    });

    it('does not include optional params when not provided', async () => {
      transport.respondWith(ruleConfigPage);

      await workflows.getTransitionRuleConfigs({ types: ['postfunction'] });

      const query = transport.lastCall?.options.query ?? {};
      expect(query['startAt']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
      expect(query['keys']).toBeUndefined();
      expect(query['workflowNames']).toBeUndefined();
      expect(query['withTags']).toBeUndefined();
      expect(query['draft']).toBeUndefined();
      expect(query['expand']).toBeUndefined();
    });

    it('throws ValidationError when types array is empty', async () => {
      await expect(workflows.getTransitionRuleConfigs({ types: [] })).rejects.toThrow(
        ValidationError,
      );
    });

    it('throws ValidationError for maxResults out of range', async () => {
      await expect(
        workflows.getTransitionRuleConfigs({ types: ['postfunction'], maxResults: 0 }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ── updateTransitionRuleConfigs (B844) ─────────────────────────────────────

  describe('updateTransitionRuleConfigs()', () => {
    const updateResponse = {
      updateResults: [
        {
          workflowId: { name: 'My Workflow', draft: false },
          ruleUpdateErrors: {},
          updateErrors: [],
        },
      ],
    };

    it('calls PUT /workflow/rule/config and returns response', async () => {
      transport.respondWith(updateResponse);

      const result = await workflows.updateTransitionRuleConfigs({
        workflows: [
          {
            workflowId: { name: 'My Workflow', draft: false },
            postFunctions: [{ id: 'rule-id', configuration: { value: '{}' } }],
          },
        ],
      });

      expect(result).toEqual(updateResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/workflow/rule/config`,
      });
    });

    it('passes the workflows body correctly', async () => {
      transport.respondWith(updateResponse);

      const body = {
        workflows: [
          {
            workflowId: { name: 'Workflow A' },
            conditions: [{ id: 'cond-id', configuration: { value: '{"x":1}', disabled: false } }],
          },
        ],
      };
      await workflows.updateTransitionRuleConfigs(body);

      expect(transport.lastCall?.options.body).toEqual(body);
    });

    it('throws ValidationError when workflows array is empty', async () => {
      await expect(workflows.updateTransitionRuleConfigs({ workflows: [] })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── deleteTransitionRuleConfigs (B845) ─────────────────────────────────────

  describe('deleteTransitionRuleConfigs()', () => {
    const deleteResponse = {
      updateResults: [
        {
          workflowId: { name: 'My Workflow', draft: false },
          ruleUpdateErrors: {},
          updateErrors: [],
        },
      ],
    };

    it('calls PUT /workflow/rule/config/delete and returns response', async () => {
      transport.respondWith(deleteResponse);

      const result = await workflows.deleteTransitionRuleConfigs({
        workflows: [
          {
            workflowId: { name: 'My Workflow' },
            workflowRuleIds: ['rule-id-1', 'rule-id-2'],
          },
        ],
      });

      expect(result).toEqual(deleteResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/workflow/rule/config/delete`,
      });
    });

    it('passes the workflows body correctly', async () => {
      transport.respondWith(deleteResponse);

      const body = {
        workflows: [
          {
            workflowId: { name: 'Workflow B', draft: false },
            workflowRuleIds: ['abc', 'def'],
          },
        ],
      };
      await workflows.deleteTransitionRuleConfigs(body);

      expect(transport.lastCall?.options.body).toEqual(body);
    });

    it('throws ValidationError when workflows array is empty', async () => {
      await expect(workflows.deleteTransitionRuleConfigs({ workflows: [] })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── deleteTransitionProperty (B935) ───────────────────────────────────────

  describe('deleteTransitionProperty()', () => {
    it('calls DELETE /workflow/transitions/{transitionId}/properties with required params', async () => {
      transport.respondWith(undefined);

      await workflows.deleteTransitionProperty(10000, 'jira.permission', 'My Workflow');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/workflow/transitions/10000/properties`,
        query: { key: 'jira.permission', workflowName: 'My Workflow' },
      });
    });

    it('includes workflowMode when provided', async () => {
      transport.respondWith(undefined);

      await workflows.deleteTransitionProperty(10000, 'jira.permission', 'My Workflow', 'draft');

      expect(transport.lastCall?.options.query).toMatchObject({ workflowMode: 'draft' });
    });

    it('does not include workflowMode when omitted', async () => {
      transport.respondWith(undefined);

      await workflows.deleteTransitionProperty(10000, 'jira.permission', 'My Workflow');

      expect(transport.lastCall?.options.query?.['workflowMode']).toBeUndefined();
    });

    it('throws ValidationError for non-positive transitionId', async () => {
      const { ValidationError } = await import('../../src/core/errors.js');
      await expect(
        workflows.deleteTransitionProperty(0, 'jira.permission', 'My Workflow'),
      ).rejects.toThrow(ValidationError);
      await expect(
        workflows.deleteTransitionProperty(-1, 'jira.permission', 'My Workflow'),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ── getTransitionProperties (B936) ────────────────────────────────────────

  describe('getTransitionProperties()', () => {
    const transitionPropertyResponse = {
      key: 'jira.permission',
      value: 'createissue',
      id: 'jira.permission',
    };

    it('calls GET /workflow/transitions/{transitionId}/properties with workflowName', async () => {
      transport.respondWith(transitionPropertyResponse);

      const result = await workflows.getTransitionProperties(10000, 'My Workflow');

      expect(result).toEqual(transitionPropertyResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflow/transitions/10000/properties`,
        query: { workflowName: 'My Workflow' },
      });
    });

    it('passes optional key and workflowMode params', async () => {
      transport.respondWith(transitionPropertyResponse);

      await workflows.getTransitionProperties(10000, 'My Workflow', {
        key: 'jira.permission',
        workflowMode: 'draft',
        includeReservedKeys: true,
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        workflowName: 'My Workflow',
        key: 'jira.permission',
        workflowMode: 'draft',
        includeReservedKeys: true,
      });
    });

    it('does not include optional params when omitted', async () => {
      transport.respondWith(transitionPropertyResponse);

      await workflows.getTransitionProperties(10000, 'My Workflow');

      const query = transport.lastCall?.options.query ?? {};
      expect(query['key']).toBeUndefined();
      expect(query['workflowMode']).toBeUndefined();
      expect(query['includeReservedKeys']).toBeUndefined();
    });

    it('throws ValidationError for non-positive transitionId', async () => {
      const { ValidationError } = await import('../../src/core/errors.js');
      await expect(workflows.getTransitionProperties(0, 'My Workflow')).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── createTransitionProperty (B937) ───────────────────────────────────────

  describe('createTransitionProperty()', () => {
    const transitionPropertyResponse = {
      key: 'jira.permission',
      value: 'createissue',
      id: 'jira.permission',
    };

    it('calls POST /workflow/transitions/{transitionId}/properties with key, workflowName, body', async () => {
      transport.respondWith(transitionPropertyResponse);

      const result = await workflows.createTransitionProperty(
        10000,
        'jira.permission',
        'My Workflow',
        'createissue',
      );

      expect(result).toEqual(transitionPropertyResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/workflow/transitions/10000/properties`,
        query: { key: 'jira.permission', workflowName: 'My Workflow' },
        body: { value: 'createissue' },
      });
    });

    it('includes workflowMode when provided', async () => {
      transport.respondWith(transitionPropertyResponse);

      await workflows.createTransitionProperty(
        10000,
        'jira.permission',
        'My Workflow',
        'createissue',
        'live',
      );

      expect(transport.lastCall?.options.query).toMatchObject({ workflowMode: 'live' });
    });

    it('throws ValidationError for non-positive transitionId', async () => {
      const { ValidationError } = await import('../../src/core/errors.js');
      await expect(
        workflows.createTransitionProperty(0, 'jira.permission', 'My Workflow', 'createissue'),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ── updateTransitionProperty (B938) ───────────────────────────────────────

  describe('updateTransitionProperty()', () => {
    const transitionPropertyResponse = {
      key: 'jira.permission',
      value: 'editissue',
      id: 'jira.permission',
    };

    it('calls PUT /workflow/transitions/{transitionId}/properties with key, workflowName, body', async () => {
      transport.respondWith(transitionPropertyResponse);

      const result = await workflows.updateTransitionProperty(
        10000,
        'jira.permission',
        'My Workflow',
        'editissue',
      );

      expect(result).toEqual(transitionPropertyResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/workflow/transitions/10000/properties`,
        query: { key: 'jira.permission', workflowName: 'My Workflow' },
        body: { value: 'editissue' },
      });
    });

    it('includes workflowMode when provided', async () => {
      transport.respondWith(transitionPropertyResponse);

      await workflows.updateTransitionProperty(
        10000,
        'jira.permission',
        'My Workflow',
        'editissue',
        'draft',
      );

      expect(transport.lastCall?.options.query).toMatchObject({ workflowMode: 'draft' });
    });

    it('encodes transitionId in path', async () => {
      transport.respondWith(transitionPropertyResponse);

      await workflows.updateTransitionProperty(
        12345,
        'jira.permission',
        'My Workflow',
        'editissue',
      );

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/workflow/transitions/12345/properties`,
      );
    });

    it('throws ValidationError for non-positive transitionId', async () => {
      const { ValidationError } = await import('../../src/core/errors.js');
      await expect(
        workflows.updateTransitionProperty(0, 'jira.permission', 'My Workflow', 'editissue'),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ── previewWorkflows (B851) ────────────────────────────────────────────────

  describe('previewWorkflows()', () => {
    const previewResponse = {
      workflows: [
        {
          id: WORKFLOW_ID,
          name: 'Sample Workflow',
          statuses: [],
          transitions: [],
        },
      ],
      statuses: [{ id: '1', name: 'To Do', statusCategory: 'TODO' }],
    };

    const previewBody: WorkflowPreviewRequest = {
      projectId: PROJECT_ID,
      workflowIds: [WORKFLOW_ID],
    };

    it('calls POST /workflows/preview with body', async () => {
      transport.respondWith(previewResponse);

      const result = await workflows.previewWorkflows(previewBody);

      expect(result).toEqual(previewResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/workflows/preview`,
        body: previewBody,
      });
    });

    it('sends the full request body including optional fields', async () => {
      transport.respondWith(previewResponse);

      const body: WorkflowPreviewRequest = {
        projectId: PROJECT_ID,
        workflowIds: [WORKFLOW_ID],
        workflowNames: ['Default Workflow'],
        issueTypeIds: ['10001'],
      };
      await workflows.previewWorkflows(body);

      expect(transport.lastCall?.options.body).toEqual(body);
    });
  });

  // ── searchWorkflows (B852) ─────────────────────────────────────────────────

  describe('searchWorkflows()', () => {
    const searchResponse = {
      startAt: 0,
      maxResults: 50,
      total: 1,
      isLast: true,
      values: [{ id: WORKFLOW_ID, description: 'A workflow' }],
      statuses: [],
    };

    it('calls GET /workflows/search with no params', async () => {
      transport.respondWith(searchResponse);

      const result = await workflows.searchWorkflows();

      expect(result).toEqual(searchResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflows/search`,
      });
    });

    it('passes all supported query params', async () => {
      transport.respondWith(searchResponse);

      await workflows.searchWorkflows({
        startAt: 0,
        maxResults: 25,
        expand: 'transitions',
        queryString: 'Default',
        orderBy: 'name',
        scope: 'GLOBAL',
        isActive: true,
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 0,
        maxResults: 25,
        expand: 'transitions',
        queryString: 'Default',
        orderBy: 'name',
        scope: 'GLOBAL',
        isActive: true,
      });
    });

    it('passes isActive: false correctly', async () => {
      transport.respondWith(searchResponse);

      await workflows.searchWorkflows({ isActive: false });

      expect(transport.lastCall?.options.query).toMatchObject({ isActive: false });
    });

    it('does not include undefined query params when called with empty params', async () => {
      transport.respondWith(searchResponse);

      await workflows.searchWorkflows({});

      const query = transport.lastCall?.options.query ?? {};
      expect(query['expand']).toBeUndefined();
      expect(query['queryString']).toBeUndefined();
      expect(query['orderBy']).toBeUndefined();
      expect(query['scope']).toBeUndefined();
      expect(query['isActive']).toBeUndefined();
    });

    it('throws ValidationError for maxResults: 0', async () => {
      await expect(workflows.searchWorkflows({ maxResults: 0 })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for maxResults: -1', async () => {
      await expect(workflows.searchWorkflows({ maxResults: -1 })).rejects.toThrow(ValidationError);
    });

    it('accepts startAt: 0 (valid)', async () => {
      transport.respondWith(searchResponse);
      await workflows.searchWorkflows({ startAt: 0 });
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 0 });
    });
  });

  // ── updateWorkflows (B853) ─────────────────────────────────────────────────

  describe('updateWorkflows()', () => {
    const updateResponse = {
      taskId: null,
      workflows: [{ id: WORKFLOW_ID, description: 'Updated' }],
      statuses: [{ id: '1', statusReference: '1', statusCategory: 'TODO' }],
    };

    const updateBody: WorkflowUpdateRequest = {
      workflows: [{ id: WORKFLOW_ID, description: 'Updated' }],
      statuses: [{ statusReference: '1', name: 'To Do', statusCategory: 'TODO' }],
    };

    it('calls POST /workflows/update with body', async () => {
      transport.respondWith(updateResponse);

      const result = await workflows.updateWorkflows(updateBody);

      expect(result).toEqual(updateResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/workflows/update`,
        body: updateBody,
      });
    });

    it('sends optional statuses array in body', async () => {
      transport.respondWith(updateResponse);

      const body: WorkflowUpdateRequest = {
        workflows: [{ id: WORKFLOW_ID }],
        statuses: [{ name: 'In Progress', statusCategory: 'IN_PROGRESS', statusReference: '2' }],
      };
      await workflows.updateWorkflows(body);

      expect(transport.lastCall?.options.body).toEqual(body);
    });
  });

  // ── validateWorkflowUpdate (B854) ──────────────────────────────────────────

  describe('validateWorkflowUpdate()', () => {
    const validationResponse = {
      errors: [
        {
          code: 'INVALID_DESCRIPTION',
          message: 'Description exceeds max length',
          level: 'WARNING',
        },
      ],
    };

    const validateBody: WorkflowUpdateValidateRequest = {
      payload: {
        workflows: [{ id: WORKFLOW_ID, description: 'Test' }],
      },
    };

    it('calls POST /workflows/update/validation with body', async () => {
      transport.respondWith(validationResponse);

      const result = await workflows.validateWorkflowUpdate(validateBody);

      expect(result).toEqual(validationResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/workflows/update/validation`,
        body: validateBody,
      });
    });

    it('returns empty errors array when payload is valid', async () => {
      transport.respondWith({ errors: [] });

      const result = await workflows.validateWorkflowUpdate({ payload: {} });

      expect(result).toEqual({ errors: [] });
    });

    it('sends validationOptions.levels in body when provided', async () => {
      transport.respondWith({ errors: [] });

      const body: WorkflowUpdateValidateRequest = {
        payload: { workflows: [{ id: WORKFLOW_ID }] },
        validationOptions: { levels: ['ERROR'] },
      };
      await workflows.validateWorkflowUpdate(body);

      expect(transport.lastCall?.options.body).toEqual(body);
    });
  });
});
