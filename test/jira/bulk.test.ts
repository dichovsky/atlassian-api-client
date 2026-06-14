import { describe, it, expect, beforeEach } from 'vitest';
import { BulkResource } from '../../src/jira/resources/bulk.js';
import { ValidationError } from '../../src/core/errors.js';
import { MockTransport } from '../helpers/mock-transport.js';
import type {
  BulkCreatedIssues,
  BulkResourceBaseUrls,
  BulkOperationProgress,
} from '../../src/jira/resources/bulk.js';

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

    it('returns errors array when some issues fail to create (elementErrors is ErrorCollection)', async () => {
      // Arrange — elementErrors matches BulkErrorCollection (spec: ErrorCollection shape)
      const created: BulkCreatedIssues = {
        issues: [{ id: '10001', key: 'PROJ-1', self: `${BASE_URL}/issue/PROJ-1` }],
        errors: [
          {
            status: 400,
            failedElementNumber: 1,
            elementErrors: { errorMessages: ['Summary is required'], errors: {} },
          },
        ],
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
      expect(result.errors![0]!.elementErrors?.errorMessages).toEqual(['Summary is required']);
    });

    it('includes transition and watchers nested responses in BulkCreatedIssue (spec: CreatedIssue)', async () => {
      // Arrange — transition and watchers are optional spec fields
      const created: BulkCreatedIssues = {
        issues: [
          {
            id: '10001',
            key: 'PROJ-1',
            self: `${BASE_URL}/issue/PROJ-1`,
            transition: { status: 200, errorCollection: { errorMessages: [], errors: {} } },
            watchers: { status: 200 },
          },
        ],
      };
      transport.respondWith(created);

      const result = await bulk.createBulk({
        issueUpdates: [{ fields: { summary: 'Test' } }],
      });

      expect(result.issues[0]!.transition?.status).toBe(200);
      expect(result.issues[0]!.watchers?.status).toBe(200);
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

    it('passes filter to the body with integer entityIds (spec: int64)', async () => {
      // Arrange — entityIds are numbers per spec (int64), not strings
      transport.respondWith(undefined);
      const data = {
        value: 'active',
        filter: { entityIds: [10001, 10002], hasProperty: true },
      };

      // Act
      await bulk.setPropertyBulk('status', data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({ filter: data.filter });
    });

    it('passes optional expression field (spec: BulkIssuePropertyUpdateRequest)', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = {
        value: null,
        expression: 'issue.priority.name',
        filter: { entityIds: [10001], hasProperty: false },
      };

      // Act
      await bulk.setPropertyBulk('priority', data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        expression: 'issue.priority.name',
        filter: { hasProperty: false },
      });
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
    it('calls DELETE /issue/properties/{propertyKey} with an empty body object', async () => {
      // Arrange — spec: requestBody.required = true; body is required (empty object is valid)
      transport.respondWith(undefined);

      // Act
      await bulk.deletePropertyBulk('myProperty', {});

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/properties/myProperty`,
      });
    });

    it('passes filter data with integer entityIds (spec: int64)', async () => {
      // Arrange — entityIds are numbers per spec (int64), not strings
      transport.respondWith(undefined);
      const data = { filter: { entityIds: [10001], currentValue: 'old' } };

      // Act
      await bulk.deletePropertyBulk('myProperty', data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject(data);
    });

    it('encodes propertyKey in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await bulk.deletePropertyBulk('../admin', {});

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/properties/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment propertyKey in deletePropertyBulk(): %s',
      async (propertyKey) => {
        await expect(bulk.deletePropertyBulk(propertyKey, {})).rejects.toThrow(
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

    it('returns cursor pagination fields from response (spec: BulkEditGetFields)', async () => {
      // Arrange — spec BulkEditGetFields has endingBefore and startingAfter
      const response = {
        fields: [{ id: 'assignee', name: 'Assignee', type: 'assignee' }],
        endingBefore: 'cur-prev',
        startingAfter: 'cur-next',
      };
      transport.respondWith(response);

      const result = await bulk.getIssueFieldsBulk({ issueIdsOrKeys: 'PROJ-1' });

      expect(result.endingBefore).toBe('cur-prev');
      expect(result.startingAfter).toBe('cur-next');
    });

    it('multiSelectFieldOptions uses enum values (spec: ADD|REMOVE|REPLACE|REMOVE_ALL)', async () => {
      const response = {
        fields: [
          {
            id: 'components',
            name: 'Components',
            type: 'components',
            multiSelectFieldOptions: ['ADD', 'REMOVE', 'REPLACE', 'REMOVE_ALL'],
          },
        ],
      };
      transport.respondWith(response);

      const result = await bulk.getIssueFieldsBulk({ issueIdsOrKeys: 'PROJ-1' });

      expect(result.fields[0]!.multiSelectFieldOptions).toEqual([
        'ADD',
        'REMOVE',
        'REPLACE',
        'REMOVE_ALL',
      ]);
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
                // transitionId and statusId are integers per spec (int32)
                to: { statusId: 10001, statusName: 'To Do' },
                transitionId: 11,
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

    it('passes cursor pagination params to query (spec: endingBefore/startingAfter)', async () => {
      // Arrange — spec has endingBefore/startingAfter as query params AND in the response
      const response = {
        availableTransitions: [],
        endingBefore: 'prev-cursor',
        startingAfter: 'next-cursor',
      };
      transport.respondWith(response);

      const result = await bulk.getAvailableTransitionsBulk({
        issueIdsOrKeys: 'PROJ-1',
        endingBefore: 'prev-cursor',
        startingAfter: 'next-cursor',
      });

      expect(transport.lastCall?.options.query).toEqual({
        issueIdsOrKeys: 'PROJ-1',
        endingBefore: 'prev-cursor',
        startingAfter: 'next-cursor',
      });
      expect(result.endingBefore).toBe('prev-cursor');
      expect(result.startingAfter).toBe('next-cursor');
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
      // Spec: created/started/updated are date-time strings; processedAccessibleIssues are int64
      const progress: BulkOperationProgress = {
        taskId: '10641',
        status: 'COMPLETE',
        progressPercent: 100,
        totalIssueCount: 2,
        invalidOrInaccessibleIssueCount: 0,
        processedAccessibleIssues: [10001, 10002],
        created: '2024-01-01T12:00:00.000Z',
        started: '2024-01-01T12:01:00.000Z',
        updated: '2024-01-01T12:02:00.000Z',
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

    it('includes failedAccessibleIssues map when present (spec field)', async () => {
      // Arrange — failedAccessibleIssues is a map of issueId → error reason strings
      const progress: BulkOperationProgress = {
        taskId: '10641',
        status: 'FAILED',
        progressPercent: 50,
        totalIssueCount: 2,
        invalidOrInaccessibleIssueCount: 0,
        processedAccessibleIssues: [10001],
        failedAccessibleIssues: { '10002': ['Issue cannot be deleted: sub-tasks exist'] },
        created: '2024-01-01T12:00:00.000Z',
        started: '2024-01-01T12:01:00.000Z',
        updated: '2024-01-01T12:01:30.000Z',
        submittedBy: { accountId: 'acc-1' },
      };
      transport.respondWith(progress);

      const result = await bulk.getBulkOperationStatus('10641');

      expect(result.failedAccessibleIssues).toEqual({
        '10002': ['Issue cannot be deleted: sub-tasks exist'],
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
    it('B952 submitBuilds POSTs to builds/bulk and returns SubmitBuildsResponse shape', async () => {
      // Spec: SubmitBuildsResponse — acceptedBuilds (BuildKey[]), rejectedBuilds, unknownIssueKeys
      const response = {
        acceptedBuilds: [{ pipelineId: 'my-pipeline', buildNumber: 42 }],
        unknownIssueKeys: [],
      };
      transport.respondWith(response);
      const body = { providerMetadata: { product: 'test' }, builds: [] };

      const result = await bulk.submitBuilds(body);

      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${DEVOPS_BASE_URLS.builds}/bulk`,
        body,
      });
    });

    it('B956 submitDeployments POSTs to deployments/bulk and returns SubmitDeploymentsResponse', async () => {
      // Spec: SubmitDeploymentsResponse — acceptedDeployments (DeploymentKey[])
      const response = {
        acceptedDeployments: [
          { pipelineId: 'pipe-1', environmentId: 'env-1', deploymentSequenceNumber: 1 },
        ],
        unknownIssueKeys: [],
      };
      transport.respondWith(response);
      const body = { deployments: [] };

      const result = await bulk.submitDeployments(body);

      expect(result).toEqual(response);
      expect(transport.lastCall?.options.path).toBe(`${DEVOPS_BASE_URLS.deployments}/bulk`);
    });

    it('B961 submitDevInfo POSTs to devInfo/bulk and returns SubmitDevInfoResponse', async () => {
      // Spec: StoreDevinfoResult — acceptedDevinfoEntities is an object map (not array)
      const response = {
        acceptedDevinfoEntities: {
          'repo-1': { commits: ['abc123'], branches: [], pullRequests: [] },
        },
      };
      transport.respondWith(response);
      const body = { repositories: [] };

      const result = await bulk.submitDevInfo(body);

      expect(result.acceptedDevinfoEntities?.['repo-1']?.commits).toEqual(['abc123']);
      expect(transport.lastCall?.options.path).toBe(`${DEVOPS_BASE_URLS.devInfo}/bulk`);
    });

    it('B967 submitDevopsComponents POSTs to devopsComponents/bulk', async () => {
      // Spec: acceptedComponents, failedComponents, unknownProjectKeys
      const response = { acceptedComponents: [{}], unknownProjectKeys: [] };
      transport.respondWith(response);

      const result = await bulk.submitDevopsComponents({ components: [] });

      expect(result).toEqual(response);
      expect(transport.lastCall?.options.path).toBe(`${DEVOPS_BASE_URLS.devopsComponents}/bulk`);
    });

    it('B971 submitFeatureFlags POSTs to featureFlags/bulk', async () => {
      // Spec: acceptedFeatureFlags, failedFeatureFlags, unknownIssueKeys, unknownAssociations
      const response = { acceptedFeatureFlags: [{}], unknownIssueKeys: [] };
      transport.respondWith(response);

      const result = await bulk.submitFeatureFlags({ flags: [] });

      expect(result).toEqual(response);
      expect(transport.lastCall?.options.path).toBe(`${DEVOPS_BASE_URLS.featureFlags}/bulk`);
    });

    it('B980 submitOperations POSTs to operations/bulk', async () => {
      // Spec: acceptedIncidents, failedIncidents, unknownProjectKeys
      const response = { acceptedIncidents: [{}], unknownProjectKeys: [] };
      transport.respondWith(response);

      const result = await bulk.submitOperations({ incidents: [] });

      expect(result).toEqual(response);
      expect(transport.lastCall?.options.path).toBe(`${DEVOPS_BASE_URLS.operations}/bulk`);
    });

    it('B989 submitRemoteLinks POSTs to remoteLinks/bulk', async () => {
      // Spec: acceptedRemoteLinks, rejectedRemoteLinks, unknownAssociations
      const response = { acceptedRemoteLinks: [{}], unknownAssociations: [] };
      transport.respondWith(response);

      const result = await bulk.submitRemoteLinks({ remoteLinks: [] });

      expect(result).toEqual(response);
      expect(transport.lastCall?.options.path).toBe(`${DEVOPS_BASE_URLS.remoteLinks}/bulk`);
    });

    it('B993 submitSecurity POSTs to security/bulk', async () => {
      // Spec: acceptedVulnerabilities, failedVulnerabilities, unknownAssociations
      const response = { acceptedVulnerabilities: [{}], unknownAssociations: [] };
      transport.respondWith(response);

      const result = await bulk.submitSecurity({ vulnerabilities: [] });

      expect(result).toEqual(response);
      expect(transport.lastCall?.options.path).toBe(`${DEVOPS_BASE_URLS.security}/bulk`);
    });

    it('throws a clear error if DevOps base URLs were not supplied', async () => {
      const bare = new BulkResource(transport, BASE_URL);

      await expect(bare.submitBuilds({})).rejects.toThrow(ValidationError);
      await expect(bare.submitBuilds({})).rejects.toThrow('DevOps base URLs not configured');
      expect(transport.calls).toHaveLength(0);
    });
  });
});
