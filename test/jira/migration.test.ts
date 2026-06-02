import { describe, it, expect, beforeEach } from 'vitest';
import { MigrationResource } from '../../src/jira/resources/migration.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/atlassian-connect/1';
const TRANSFER_ID = 'a498d711-685d-428d-8c3e-bc03bb450ea7';

describe('MigrationResource', () => {
  let transport: MockTransport;
  let migration: MigrationResource;

  beforeEach(() => {
    transport = new MockTransport();
    migration = new MigrationResource(transport, BASE_URL);
  });

  // ── getMigrationTask (B946) ────────────────────────────────────────────────

  describe('getMigrationTask()', () => {
    it('calls GET /migration/{connectKey}/{jiraIssueFieldsKey}/task and returns task progress', async () => {
      // Arrange
      const task = {
        id: 'task-1',
        self: 'https://example.atlassian.net/rest/api/3/task/task-1',
        status: 'COMPLETE' as const,
        elapsedRuntime: 1234,
        lastUpdate: '2024-01-01T00:00:00.000Z',
        progress: 100,
        submittedBy: 12345,
      };
      transport.respondWith(task);

      // Act
      const result = await migration.getMigrationTask('com.example.app', 'my-custom-field');

      // Assert
      expect(result).toEqual(task);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/migration/com.example.app/my-custom-field/task`,
      });
    });

    it('encodes special characters in connectKey and jiraIssueFieldsKey', async () => {
      // Arrange
      const task = {
        id: 'task-1',
        self: 'https://example.atlassian.net/rest/api/3/task/task-1',
        status: 'RUNNING' as const,
        elapsedRuntime: 500,
        lastUpdate: '2024-01-01T00:00:00.000Z',
        progress: 50,
        submittedBy: 12345,
      };
      transport.respondWith(task);

      // Act
      await migration.getMigrationTask('com.example app', 'my/field');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/migration/com.example%20app/my%2Ffield/task`,
      );
    });

    it('throws when connectKey is empty', async () => {
      await expect(migration.getMigrationTask('', 'my-custom-field')).rejects.toThrow(
        'connectKey is required',
      );
    });

    it('throws when jiraIssueFieldsKey is empty', async () => {
      await expect(migration.getMigrationTask('com.example.app', '')).rejects.toThrow(
        'jiraIssueFieldsKey is required',
      );
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(
        migration.getMigrationTask('com.example.app', 'my-custom-field'),
      ).rejects.toThrow('not found');
    });
  });

  // ── submitMigrationTask (B947) ─────────────────────────────────────────────

  describe('submitMigrationTask()', () => {
    it('calls POST /migration/{connectKey}/{jiraIssueFieldsKey}/task and returns void', async () => {
      // Arrange
      transport.respondWith(undefined, 202);

      // Act
      const result = await migration.submitMigrationTask('com.example.app', 'my-custom-field');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/migration/com.example.app/my-custom-field/task`,
      });
    });

    it('throws when connectKey is empty', async () => {
      await expect(migration.submitMigrationTask('', 'my-custom-field')).rejects.toThrow(
        'connectKey is required',
      );
    });

    it('throws when jiraIssueFieldsKey is empty', async () => {
      await expect(migration.submitMigrationTask('com.example.app', '')).rejects.toThrow(
        'jiraIssueFieldsKey is required',
      );
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('conflict'));

      // Act / Assert
      await expect(
        migration.submitMigrationTask('com.example.app', 'my-custom-field'),
      ).rejects.toThrow('conflict');
    });
  });

  // ── updateIssueFields (B948) ───────────────────────────────────────────────

  describe('updateIssueFields()', () => {
    it('calls PUT /migration/field with Atlassian-Transfer-Id header and body', async () => {
      // Arrange
      transport.respondWith({}, 200);

      const body = {
        updateValueList: [
          { _type: 'StringIssueField' as const, issueID: 10001, fieldID: 10076, string: 'val' },
        ],
      };

      // Act
      await migration.updateIssueFields(TRANSFER_ID, body);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/migration/field`,
        body,
        headers: { 'Atlassian-Transfer-Id': TRANSFER_ID },
      });
    });

    it('sends the Atlassian-Transfer-Id header correctly', async () => {
      // Arrange
      transport.respondWith({});
      const customId = 'bb998822-1234-5678-9012-abcdef123456';

      // Act
      await migration.updateIssueFields(customId, {});

      // Assert
      expect(transport.lastCall?.options.headers).toMatchObject({
        'Atlassian-Transfer-Id': customId,
      });
    });

    it('accepts empty body (no updateValueList)', async () => {
      // Arrange
      transport.respondWith({});

      // Act
      await migration.updateIssueFields(TRANSFER_ID, {});

      // Assert
      expect(transport.lastCall?.options.body).toEqual({});
    });

    it('throws when transferId is empty', async () => {
      await expect(migration.updateIssueFields('', {})).rejects.toThrow('transferId is required');
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('bad request'));

      // Act / Assert
      await expect(migration.updateIssueFields(TRANSFER_ID, {})).rejects.toThrow('bad request');
    });

    it('returns the response data', async () => {
      // Arrange
      const responseData = { ok: true };
      transport.respondWith(responseData);

      // Act
      const result = await migration.updateIssueFields(TRANSFER_ID, {});

      // Assert
      expect(result).toEqual(responseData);
    });
  });

  // ── updateEntityProperties (B949) ─────────────────────────────────────────

  describe('updateEntityProperties()', () => {
    it('calls PUT /migration/properties/{entityType} with Atlassian-Transfer-Id header and body', async () => {
      // Arrange
      transport.respondWith(undefined, 200);

      const properties = [{ entityId: 123, key: 'mykey', value: 'newValue' }];

      // Act
      await migration.updateEntityProperties(TRANSFER_ID, 'IssueProperty', properties);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/migration/properties/IssueProperty`,
        body: properties,
        headers: { 'Atlassian-Transfer-Id': TRANSFER_ID },
      });
    });

    it('encodes the entityType path segment', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await migration.updateEntityProperties(TRANSFER_ID, 'CommentProperty', []);

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/migration/properties/CommentProperty`,
      );
    });

    it('sends Atlassian-Transfer-Id header', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await migration.updateEntityProperties(TRANSFER_ID, 'ProjectProperty', []);

      // Assert
      expect(transport.lastCall?.options.headers).toMatchObject({
        'Atlassian-Transfer-Id': TRANSFER_ID,
      });
    });

    it('returns void on success', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await migration.updateEntityProperties(TRANSFER_ID, 'IssueProperty', []);

      // Assert
      expect(result).toBeUndefined();
    });

    it('throws when transferId is empty', async () => {
      await expect(migration.updateEntityProperties('', 'IssueProperty', [])).rejects.toThrow(
        'transferId is required',
      );
    });

    it('throws when entityType is empty', async () => {
      await expect(
        migration.updateEntityProperties(TRANSFER_ID, '' as 'IssueProperty', []),
      ).rejects.toThrow('entityType is required');
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(
        migration.updateEntityProperties(TRANSFER_ID, 'IssueProperty', []),
      ).rejects.toThrow('forbidden');
    });
  });

  // ── searchWorkflowRules (B950) ─────────────────────────────────────────────

  describe('searchWorkflowRules()', () => {
    it('calls POST /migration/workflow/rule/search with Atlassian-Transfer-Id header and body', async () => {
      // Arrange
      const responseData = {
        workflowEntityId: 'a498d711-685d-428d-8c3e-bc03bb450ea7',
        invalidRules: [],
        validRules: [],
      };
      transport.respondWith(responseData);

      const body = {
        workflowEntityId: 'a498d711-685d-428d-8c3e-bc03bb450ea7',
        ruleIds: ['55d44f1d-c859-42e5-9c27-2c5ec3f340b1'],
      };

      // Act
      const result = await migration.searchWorkflowRules(TRANSFER_ID, body);

      // Assert
      expect(result).toEqual(responseData);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/migration/workflow/rule/search`,
        body,
        headers: { 'Atlassian-Transfer-Id': TRANSFER_ID },
      });
    });

    it('sends Atlassian-Transfer-Id header', async () => {
      // Arrange
      transport.respondWith({});

      // Act
      await migration.searchWorkflowRules(TRANSFER_ID, {
        workflowEntityId: 'wf-1',
        ruleIds: ['rule-1'],
      });

      // Assert
      expect(transport.lastCall?.options.headers).toMatchObject({
        'Atlassian-Transfer-Id': TRANSFER_ID,
      });
    });

    it('includes optional expand parameter when provided', async () => {
      // Arrange
      transport.respondWith({});

      const body = {
        workflowEntityId: 'wf-1',
        ruleIds: ['rule-1'],
        expand: 'transition',
      };

      // Act
      await migration.searchWorkflowRules(TRANSFER_ID, body);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({ expand: 'transition' });
    });

    it('throws when transferId is empty', async () => {
      await expect(
        migration.searchWorkflowRules('', { workflowEntityId: 'wf-1', ruleIds: ['r-1'] }),
      ).rejects.toThrow('transferId is required');
    });

    it('throws when workflowEntityId is empty', async () => {
      await expect(
        migration.searchWorkflowRules(TRANSFER_ID, { workflowEntityId: '', ruleIds: ['r-1'] }),
      ).rejects.toThrow('workflowEntityId is required');
    });

    it('throws when ruleIds is empty array', async () => {
      await expect(
        migration.searchWorkflowRules(TRANSFER_ID, {
          workflowEntityId: 'wf-1',
          ruleIds: [],
        }),
      ).rejects.toThrow('ruleIds is required');
    });

    it('throws when ruleIds has more than 10 items', async () => {
      const ruleIds = Array.from({ length: 11 }, (_, i) => `rule-${i + 1}`);
      await expect(
        migration.searchWorkflowRules(TRANSFER_ID, {
          workflowEntityId: 'wf-1',
          ruleIds,
        }),
      ).rejects.toThrow('ruleIds accepts at most 10 rule IDs');
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('bad request'));

      // Act / Assert
      await expect(
        migration.searchWorkflowRules(TRANSFER_ID, {
          workflowEntityId: 'wf-1',
          ruleIds: ['rule-1'],
        }),
      ).rejects.toThrow('bad request');
    });
  });
});
