import { describe, it, expect, beforeEach } from 'vitest';
import {
  StatusResource,
  type JiraStatus,
  type JiraStatusScope,
} from '../../src/jira/resources/status.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeStatus = (overrides?: Partial<{ id: string; name: string }>): JiraStatus => ({
  id: overrides?.id ?? '10001',
  name: overrides?.name ?? 'To Do',
  self: 'https://test.atlassian.net/rest/api/3/status/10001',
  description: 'The issue is open and ready for the assignee to start work on it.',
  statusCategory: { id: 2, key: 'new', name: 'To Do' },
});

describe('StatusResource', () => {
  let transport: MockTransport;
  let status: StatusResource;

  beforeEach(() => {
    transport = new MockTransport();
    status = new StatusResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /status and returns the statuses array', async () => {
      // Arrange
      const statuses = [makeStatus(), makeStatus({ id: '10002', name: 'In Progress' })];
      transport.respondWith(statuses);

      // Act
      const result = await status.list();

      // Assert
      expect(result).toEqual(statuses);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/status`,
      });
    });

    it('returns an empty array when no statuses are defined', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await status.list();

      // Assert
      expect(result).toEqual([]);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(status.list()).rejects.toThrow('network error');
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /status/{idOrName} and returns the status', async () => {
      // Arrange
      const single = makeStatus();
      transport.respondWith(single);

      // Act
      const result = await status.get('10001');

      // Assert
      expect(result).toEqual(single);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/status/10001`,
      });
    });

    it('URL-encodes the idOrName', async () => {
      // Arrange
      const single = makeStatus({ name: 'In Progress' });
      transport.respondWith(single);

      // Act
      await status.get('In Progress');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/status/In%20Progress`);
    });

    it('URL-encodes special characters', async () => {
      // Arrange
      transport.respondWith(makeStatus());

      // Act
      await status.get('status/with/slashes');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/status/status%2Fwith%2Fslashes`);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(status.get('unknown')).rejects.toThrow('not found');
    });

    it('rejects a path-traversal idOrName (B1052)', async () => {
      await expect(status.get('..')).rejects.toThrow(ValidationError);
    });

    it('returns a status with a scope field (JiraStatusScope)', async () => {
      // Arrange
      const scopedStatus: JiraStatus = {
        ...makeStatus(),
        scope: {
          type: 'PROJECT',
          project: { id: '10001', key: 'MYPROJ' },
        } satisfies JiraStatusScope,
      };
      transport.respondWith(scopedStatus);

      // Act
      const result = await status.get('10001');

      // Assert
      expect(result.scope?.type).toBe('PROJECT');
    });

    it('handles status with all optional fields absent', async () => {
      // Arrange
      transport.respondWith({});

      // Act
      const result = await status.get('10001');

      // Assert
      expect(result.id).toBeUndefined();
      expect(result.name).toBeUndefined();
      expect(result.scope).toBeUndefined();
    });
  });
});
