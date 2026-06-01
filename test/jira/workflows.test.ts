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
  });
});
