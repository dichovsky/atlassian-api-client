import { describe, it, expect, beforeEach } from 'vitest';
import { BulkResource } from '../../src/jira/resources/bulk.js';
import { MockTransport } from '../helpers/mock-transport.js';
import type { BulkCreatedIssues, BulkResourceBaseUrls } from '../../src/jira/resources/bulk.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';
const DEVOPS_BASE_URLS: BulkResourceBaseUrls = {
  builds: 'https://test.atlassian.net/rest/builds/0.1',
  deployments: 'https://test.atlassian.net/rest/deployments/0.1',
  devInfo: 'https://test.atlassian.net/rest/devinfo/0.10',
  devopsComponents: 'https://test.atlassian.net/rest/devopscomponents/1.0',
  featureFlags: 'https://test.atlassian.net/rest/featureflags/0.1',
  operations: 'https://test.atlassian.net/rest/operations/1.0',
  remoteLinks: 'https://test.atlassian.net/rest/remotelinks/1.0',
  security: 'https://test.atlassian.net/rest/security/1.0',
};

describe('BulkResource', () => {
  let transport: MockTransport;
  let bulk: BulkResource;

  beforeEach(() => {
    transport = new MockTransport();
    bulk = new BulkResource(transport, BASE_URL, DEVOPS_BASE_URLS);
  });

  // ── createBulk ────────────────────────────────────────────────────────────

  describe('createBulk()', () => {
    it('calls POST /issue/bulk with the provided data', async () => {
      // Arrange
      const created: BulkCreatedIssues = {
        issues: [
          { id: '10001', key: 'PROJ-1', self: `${BASE_URL}/issue/PROJ-1` },
          { id: '10002', key: 'PROJ-2', self: `${BASE_URL}/issue/PROJ-2` },
        ],
      };
      transport.respondWith(created);
      const data = {
        issueUpdates: [
          { fields: { project: { key: 'PROJ' }, issuetype: { name: 'Bug' }, summary: 'Bug 1' } },
          { fields: { project: { key: 'PROJ' }, issuetype: { name: 'Task' }, summary: 'Task 1' } },
        ],
      };

      // Act
      const result = await bulk.createBulk(data);

      // Assert
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/bulk`,
        body: data,
      });
    });

    it('returns errors array when some issues fail to create', async () => {
      // Arrange
      const created: BulkCreatedIssues = {
        issues: [{ id: '10001', key: 'PROJ-1', self: `${BASE_URL}/issue/PROJ-1` }],
        errors: [{ status: 400, failedElementNumber: 1, elementErrors: { summary: 'Required' } }],
      };
      transport.respondWith(created);

      // Act
      const result = await bulk.createBulk({
        issueUpdates: [
          { fields: { project: { key: 'PROJ' }, issuetype: { name: 'Bug' }, summary: 'Valid' } },
          { fields: { project: { key: 'PROJ' } } },
        ],
      });

      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]!.failedElementNumber).toBe(1);
    });

    it('includes optional update field in the issue data', async () => {
      // Arrange
      transport.respondWith({ issues: [] });
      const data = {
        issueUpdates: [
          {
            fields: { project: { key: 'PROJ' }, issuetype: { name: 'Bug' }, summary: 'Test' },
            update: { comment: [{ add: { body: 'A comment' } }] },
          },
        ],
      };

      // Act
      await bulk.createBulk(data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({ issueUpdates: data.issueUpdates });
    });
  });

  // ── setPropertyBulk ───────────────────────────────────────────────────────

  describe('setPropertyBulk()', () => {
    it('calls PUT /issue/properties/{propertyKey} with the data', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = { value: { sprint: 42 } };

      // Act
      await bulk.setPropertyBulk('myProperty', data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issue/properties/myProperty`,
        body: data,
      });
    });

    it('passes filter to the body', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = {
        value: 'active',
        filter: { entityIds: ['10001', '10002'], hasProperty: true },
      };

      // Act
      await bulk.setPropertyBulk('status', data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({ filter: data.filter });
    });

    it('encodes propertyKey in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await bulk.setPropertyBulk('../admin', { value: 'x' });

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/properties/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment propertyKey in setPropertyBulk(): %s',
      async (propertyKey) => {
        await expect(bulk.setPropertyBulk(propertyKey, { value: 'x' })).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── deletePropertyBulk ────────────────────────────────────────────────────

  describe('deletePropertyBulk()', () => {
    it('calls DELETE /issue/properties/{propertyKey} with no body when data omitted', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await bulk.deletePropertyBulk('myProperty');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/properties/myProperty`,
      });
    });

    it('passes optional filter data in body', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = { filter: { entityIds: ['10001'], currentValue: 'old' } };

      // Act
      await bulk.deletePropertyBulk('myProperty', data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject(data);
    });

    it('encodes propertyKey in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await bulk.deletePropertyBulk('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/properties/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment propertyKey in deletePropertyBulk(): %s',
      async (propertyKey) => {
        await expect(bulk.deletePropertyBulk(propertyKey)).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── B345: deleteIssuesBulk ────────────────────────────────────────────────

  describe('deleteIssuesBulk()', () => {
    it('calls POST /bulk/issues/delete and returns the submitted taskId', async () => {
      transport.respondWith({ taskId: '10641' });
      const data = { selectedIssueIdsOrKeys: ['10001', '10002'], sendBulkNotification: false };

      const result = await bulk.deleteIssuesBulk(data);

      expect(result).toEqual({ taskId: '10641' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/bulk/issues/delete`,
        body: data,
      });
    });
  });

  // ── B346: getIssueFieldsBulk ──────────────────────────────────────────────

  describe('getIssueFieldsBulk()', () => {
    it('calls GET /bulk/issues/fields with required issueIdsOrKeys query', async () => {
      const response = { fields: [{ id: 'assignee', name: 'Assignee', type: 'assignee' }] };
      transport.respondWith(response);

      const result = await bulk.getIssueFieldsBulk({ issueIdsOrKeys: '10001,10002' });

      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/bulk/issues/fields`,
        query: { issueIdsOrKeys: '10001,10002' },
      });
    });

    it('strips undefined optional query params', async () => {
      transport.respondWith({ fields: [] });

      await bulk.getIssueFieldsBulk({
        issueIdsOrKeys: 'PROJ-1',
        searchText: 'sum',
        endingBefore: undefined,
        startingAfter: 'cursor-1',
      });

      expect(transport.lastCall?.options.query).toEqual({
        issueIdsOrKeys: 'PROJ-1',
        searchText: 'sum',
        startingAfter: 'cursor-1',
      });
    });

    it('passes endingBefore when provided', async () => {
      transport.respondWith({ fields: [] });

      await bulk.getIssueFieldsBulk({ issueIdsOrKeys: 'PROJ-1', endingBefore: 'cur-0' });

      expect(transport.lastCall?.options.query).toEqual({
        issueIdsOrKeys: 'PROJ-1',
        endingBefore: 'cur-0',
      });
    });
  });

  // ── B347: editIssueFieldsBulk ─────────────────────────────────────────────

  describe('editIssueFieldsBulk()', () => {
    it('calls POST /bulk/issues/fields with the edit payload', async () => {
      transport.respondWith({ taskId: '10641' });
      const data = {
        editedFieldsInput: { priority: { priorityId: '3' } },
        selectedActions: ['priority'],
        selectedIssueIdsOrKeys: ['10001'],
        sendBulkNotification: true,
      };

      const result = await bulk.editIssueFieldsBulk(data);

      expect(result).toEqual({ taskId: '10641' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/bulk/issues/fields`,
        body: data,
      });
    });
  });

  // ── B348: moveIssuesBulk ──────────────────────────────────────────────────

  describe('moveIssuesBulk()', () => {
    it('calls POST /bulk/issues/move with the move mapping', async () => {
      transport.respondWith({ taskId: '10641' });
      const data = {
        sendBulkNotification: true,
        targetToSourcesMapping: {
          'PROJ,10001': { issueIdsOrKeys: ['ISSUE-1'] },
        },
      };

      const result = await bulk.moveIssuesBulk(data);

      expect(result).toEqual({ taskId: '10641' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/bulk/issues/move`,
        body: data,
      });
    });
  });

  // ── B349: getAvailableTransitionsBulk ─────────────────────────────────────

  describe('getAvailableTransitionsBulk()', () => {
    it('calls GET /bulk/issues/transition with issueIdsOrKeys query', async () => {
      const response = {
        availableTransitions: [
          {
            isTransitionsFiltered: false,
            issues: ['EPIC-1'],
            transitions: [
              {
                to: { statusId: '10001', statusName: 'To Do' },
                transitionId: '11',
                transitionName: 'To Do',
              },
            ],
          },
        ],
      };
      transport.respondWith(response);

      const result = await bulk.getAvailableTransitionsBulk({ issueIdsOrKeys: 'EPIC-1,TASK-1' });

      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/bulk/issues/transition`,
        query: { issueIdsOrKeys: 'EPIC-1,TASK-1' },
      });
    });
  });

  // ── B350: transitionIssuesBulk ────────────────────────────────────────────

  describe('transitionIssuesBulk()', () => {
    it('calls POST /bulk/issues/transition with the bulkTransitionInputs payload', async () => {
      transport.respondWith({ taskId: '10641' });
      const data = {
        bulkTransitionInputs: [{ selectedIssueIdsOrKeys: ['10001', '10002'], transitionId: '11' }],
        sendBulkNotification: false,
      };

      const result = await bulk.transitionIssuesBulk(data);

      expect(result).toEqual({ taskId: '10641' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/bulk/issues/transition`,
        body: data,
      });
    });
  });

  // ── B351: unwatchIssuesBulk ───────────────────────────────────────────────

  describe('unwatchIssuesBulk()', () => {
    it('calls POST /bulk/issues/unwatch with selectedIssueIdsOrKeys', async () => {
      transport.respondWith({ taskId: '10641' });
      const data = { selectedIssueIdsOrKeys: ['10001', '10002'] };

      const result = await bulk.unwatchIssuesBulk(data);

      expect(result).toEqual({ taskId: '10641' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/bulk/issues/unwatch`,
        body: data,
      });
    });
  });

  // ── B352: watchIssuesBulk ─────────────────────────────────────────────────

  describe('watchIssuesBulk()', () => {
    it('calls POST /bulk/issues/watch with selectedIssueIdsOrKeys', async () => {
      transport.respondWith({ taskId: '10641' });
      const data = { selectedIssueIdsOrKeys: ['10001', '10002'] };

      const result = await bulk.watchIssuesBulk(data);

      expect(result).toEqual({ taskId: '10641' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/bulk/issues/watch`,
        body: data,
      });
    });
  });

  // ── B353: getBulkOperationStatus ──────────────────────────────────────────

  describe('getBulkOperationStatus()', () => {
    it('calls GET /bulk/queue/{taskId} and returns the progress payload', async () => {
      const progress = {
        taskId: '10641',
        status: 'COMPLETE',
        progressPercent: 100,
        totalIssueCount: 2,
        invalidOrInaccessibleIssueCount: 0,
        processedAccessibleIssues: [10001, 10002],
        created: 1704110400000,
        started: 1704110460000,
        updated: 1704110520000,
        submittedBy: { accountId: 'acc-1' },
      };
      transport.respondWith(progress);

      const result = await bulk.getBulkOperationStatus('10641');

      expect(result).toEqual(progress);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/bulk/queue/10641`,
      });
    });

    it('encodes special characters in taskId path segment', async () => {
      transport.respondWith({ taskId: 'x' });

      await bulk.getBulkOperationStatus('a/b');

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/bulk/queue/a%2Fb`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment taskId in getBulkOperationStatus(): %s',
      async (taskId) => {
        await expect(bulk.getBulkOperationStatus(taskId)).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── DevOps bulk POST endpoints ────────────────────────────────────────────

  describe('DevOps bulk submit endpoints', () => {
    const cases: {
      name: string;
      method: keyof BulkResource;
      baseKey: keyof BulkResourceBaseUrls;
    }[] = [
      { name: 'B952 submitBuilds', method: 'submitBuilds', baseKey: 'builds' },
      { name: 'B956 submitDeployments', method: 'submitDeployments', baseKey: 'deployments' },
      { name: 'B961 submitDevInfo', method: 'submitDevInfo', baseKey: 'devInfo' },
      {
        name: 'B967 submitDevopsComponents',
        method: 'submitDevopsComponents',
        baseKey: 'devopsComponents',
      },
      {
        name: 'B971 submitFeatureFlags',
        method: 'submitFeatureFlags',
        baseKey: 'featureFlags',
      },
      { name: 'B980 submitOperations', method: 'submitOperations', baseKey: 'operations' },
      { name: 'B989 submitRemoteLinks', method: 'submitRemoteLinks', baseKey: 'remoteLinks' },
      { name: 'B993 submitSecurity', method: 'submitSecurity', baseKey: 'security' },
    ];

    for (const { name, method, baseKey } of cases) {
      it(`${name} POSTs to ${baseKey}/bulk with the given body`, async () => {
        const response = { acceptedEntities: [{ id: '1' }] };
        transport.respondWith(response);
        const body = { providerMetadata: { product: 'test' }, payload: { foo: 'bar' } };

        const fn = bulk[method] as (data: unknown) => Promise<unknown>;
        const result = await fn.call(bulk, body);

        expect(result).toEqual(response);
        expect(transport.lastCall?.options).toMatchObject({
          method: 'POST',
          path: `${DEVOPS_BASE_URLS[baseKey]}/bulk`,
          body,
        });
      });
    }

    it('throws a clear error if DevOps base URLs were not supplied', async () => {
      const bare = new BulkResource(transport, BASE_URL);

      await expect(bare.submitBuilds({})).rejects.toThrow('DevOps base URLs not configured');
      expect(transport.calls).toHaveLength(0);
    });
  });
});
