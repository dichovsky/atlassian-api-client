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
    it('calls POST /forge/panel/action/bulk/async with moduleId + projectList', async () => {
      // Arrange
      const taskResponse = { taskId: 'task-abc-123' };
      transport.respondWith(taskResponse, 202);

      // Act
      const result = await forge.bulkPanelAction({
        moduleId: 'ari:cloud:ecosystem::extension/app/env/static/my-panel',
        projectList: [{ action: 'PIN', projectIdOrKey: 'PROJ' }],
      });

      // Assert
      expect(result).toEqual(taskResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/forge/panel/action/bulk/async`,
        body: {
          moduleId: 'ari:cloud:ecosystem::extension/app/env/static/my-panel',
          projectList: [{ action: 'PIN', projectIdOrKey: 'PROJ' }],
        },
      });
    });

    it('sends multiple PIN/UNPIN actions in a single request', async () => {
      // Arrange
      transport.respondWith({ taskId: 'task-xyz' }, 202);

      // Act
      await forge.bulkPanelAction({
        moduleId: 'ari:cloud:ecosystem::extension/app/env/static/p',
        projectList: [
          { action: 'PIN', projectIdOrKey: 'PROJ' },
          { action: 'UNPIN', projectIdOrKey: 'OTHER' },
        ],
      });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({
        moduleId: 'ari:cloud:ecosystem::extension/app/env/static/p',
        projectList: [
          { action: 'PIN', projectIdOrKey: 'PROJ' },
          { action: 'UNPIN', projectIdOrKey: 'OTHER' },
        ],
      });
    });

    it('does not send the legacy per-issue `actions` field', async () => {
      // Arrange
      transport.respondWith({ taskId: 'task-1' }, 202);

      // Act
      await forge.bulkPanelAction({
        moduleId: 'm',
        projectList: [{ action: 'PIN', projectIdOrKey: '10001' }],
      });

      // Assert
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).toHaveProperty('moduleId');
      expect(body).toHaveProperty('projectList');
      expect(body).not.toHaveProperty('actions');
    });

    it('returns the taskId string from the response', async () => {
      // Arrange
      transport.respondWith({ taskId: 'unique-task-id-999' }, 202);

      // Act
      const result = await forge.bulkPanelAction({
        moduleId: 'm',
        projectList: [{ action: 'PIN', projectIdOrKey: 'PROJ' }],
      });

      // Assert
      expect(result.taskId).toBe('unique-task-id-999');
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(
        forge.bulkPanelAction({
          moduleId: 'm',
          projectList: [{ action: 'PIN', projectIdOrKey: 'PROJ' }],
        }),
      ).rejects.toThrow('forbidden');
    });
  });
});
