import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowsResource } from '../../src/jira/resources/workflows.js';
import type {
  WorkflowPreviewRequest,
  WorkflowUpdateRequest,
  WorkflowUpdateValidateRequest,
} from '../../src/jira/resources/workflows.js';
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

    it('throws RangeError for maxResults: 0', async () => {
      await expect(workflows.searchWorkflows({ maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: -1', async () => {
      await expect(workflows.searchWorkflows({ maxResults: -1 })).rejects.toThrow(RangeError);
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
