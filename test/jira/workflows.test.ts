import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowsResource } from '../../src/jira/resources/workflows.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

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
});
