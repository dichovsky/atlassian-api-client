import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowsResource } from '../../src/jira/resources/workflows.js';
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

    it('calls GET /workflow/rule/config with required types param', async () => {
      transport.respondWith(ruleConfigPage);

      const result = await workflows.getTransitionRuleConfigs({ types: ['postfunction'] });

      expect(result).toEqual(ruleConfigPage);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/workflow/rule/config`,
      });
      expect(transport.lastCall?.options.query).toMatchObject({ types: 'postfunction' });
    });

    it('passes multiple types as comma-separated string', async () => {
      transport.respondWith(ruleConfigPage);

      await workflows.getTransitionRuleConfigs({
        types: ['postfunction', 'condition', 'validator'],
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        types: 'postfunction,condition,validator',
      });
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

      expect(transport.lastCall?.options.query).toMatchObject({
        types: 'postfunction',
        startAt: 0,
        maxResults: 10,
        keys: 'key-a,key-b',
        workflowNames: 'My Workflow',
        withTags: 'tag1',
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

    it('throws RangeError for maxResults out of range', async () => {
      await expect(
        workflows.getTransitionRuleConfigs({ types: ['postfunction'], maxResults: 0 }),
      ).rejects.toThrow(RangeError);
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
});
