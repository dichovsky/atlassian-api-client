import { describe, it, expect, beforeEach } from 'vitest';
import { ForgeResource } from '../../src/jira/resources/forge.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('ForgeResource', () => {
  let transport: MockTransport;
  let forge: ForgeResource;

  beforeEach(() => {
    transport = new MockTransport();
    forge = new ForgeResource(transport, BASE_URL);
  });

  // ── bulkPanelAction ───────────────────────────────────────────────────────

  describe('bulkPanelAction()', () => {
    it('calls POST /forge/panel/action/bulk/async and returns taskId', async () => {
      // Arrange
      const taskResponse = { taskId: 'task-abc-123' };
      transport.respondWith(taskResponse);

      // Act
      const result = await forge.bulkPanelAction({
        actions: [{ issueId: '10001', moduleKey: 'my-app:my-panel' }],
      });

      // Assert
      expect(result).toEqual(taskResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/forge/panel/action/bulk/async`,
        body: {
          actions: [{ issueId: '10001', moduleKey: 'my-app:my-panel' }],
        },
      });
    });

    it('sends multiple actions in a single request', async () => {
      // Arrange
      transport.respondWith({ taskId: 'task-xyz' });

      // Act
      await forge.bulkPanelAction({
        actions: [
          { issueId: '10001', moduleKey: 'app:panel-a' },
          { issueId: '10002', moduleKey: 'app:panel-b' },
        ],
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        actions: [
          { issueId: '10001', moduleKey: 'app:panel-a' },
          { issueId: '10002', moduleKey: 'app:panel-b' },
        ],
      });
    });

    it('includes payload when provided', async () => {
      // Arrange
      transport.respondWith({ taskId: 'task-1' });

      // Act
      await forge.bulkPanelAction({
        actions: [
          {
            issueId: '10001',
            moduleKey: 'my-app:my-panel',
            payload: { key: 'value', count: 42 },
          },
        ],
      });

      // Assert
      const body = transport.lastCall?.options.body as { actions: unknown[] };
      expect(body.actions[0]).toMatchObject({
        issueId: '10001',
        moduleKey: 'my-app:my-panel',
        payload: { key: 'value', count: 42 },
      });
    });

    it('returns the taskId string from the response', async () => {
      // Arrange
      transport.respondWith({ taskId: 'unique-task-id-999' });

      // Act
      const result = await forge.bulkPanelAction({
        actions: [{ issueId: '10001', moduleKey: 'app:p' }],
      });

      // Assert
      expect(result.taskId).toBe('unique-task-id-999');
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(
        forge.bulkPanelAction({ actions: [{ issueId: '10001', moduleKey: 'app:p' }] }),
      ).rejects.toThrow('forbidden');
    });
  });
});
