import { describe, it, expect, beforeEach } from 'vitest';
import { TaskResource } from '../../src/jira/resources/task.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeTask = (overrides?: Partial<{ status: 'RUNNING' | 'COMPLETE' | 'FAILED' }>) => ({
  id: 'task-123',
  self: `${BASE_URL}/task/task-123`,
  description: 'Bulk field update',
  status: overrides?.status ?? ('RUNNING' as const),
  progress: 50,
  elapsedRuntime: 1000,
  submitted: 1700000000000,
  lastUpdate: 1700000001000,
});

describe('TaskResource', () => {
  let transport: MockTransport;
  let task: TaskResource;

  beforeEach(() => {
    transport = new MockTransport();
    task = new TaskResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /task/{taskId} and returns the task', async () => {
      // Arrange
      const payload = makeTask();
      transport.respondWith(payload);

      // Act
      const result = await task.get('task-123');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/task/task-123`,
      });
    });

    it('returns a completed task', async () => {
      // Arrange
      const payload = { ...makeTask({ status: 'COMPLETE' }), progress: 100 };
      transport.respondWith(payload);

      // Act
      const result = await task.get('task-123');

      // Assert
      expect(result.status).toBe('COMPLETE');
      expect(result.progress).toBe(100);
    });

    it('URL-encodes special characters in taskId', async () => {
      // Arrange
      transport.respondWith(makeTask());

      // Act
      await task.get('task/1');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/task/task%2F1`);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(task.get('missing')).rejects.toThrow('not found');
    });
  });

  // ── cancel ────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('calls POST /task/{taskId}/cancel and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await task.cancel('task-123');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/task/task-123/cancel`,
      });
    });

    it('URL-encodes special characters in taskId', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await task.cancel('task/1');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/task/task%2F1/cancel`);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(task.cancel('task-123')).rejects.toThrow('server error');
    });
  });
});
