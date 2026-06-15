import { describe, it, expect, beforeEach } from 'vitest';
import { BacklogResource } from '../../src/jira/resources/backlog.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/agile/1.0';

describe('BacklogResource', () => {
  let transport: MockTransport;
  let backlog: BacklogResource;

  beforeEach(() => {
    transport = new MockTransport();
    backlog = new BacklogResource(transport, BASE_URL);
  });

  // ── moveIssuesToBoard (B235) ──────────────────────────────────────────────

  describe('moveIssuesToBoard()', () => {
    it('calls POST /backlog/{boardId}/issue with issues body and returns void', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      const result = await backlog.moveIssuesToBoard(1, ['PROJ-1', 'PROJ-2']);

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/backlog/1/issue`,
        body: { issues: ['PROJ-1', 'PROJ-2'] },
      });
    });

    it('sends a single issue to a specific board', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await backlog.moveIssuesToBoard(42, ['KEY-99']);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/backlog/42/issue`,
        body: { issues: ['KEY-99'] },
      });
    });

    it('sends exactly 50 issues (boundary)', async () => {
      // Arrange
      transport.respondWith(undefined, 204);
      const issues = Array.from({ length: 50 }, (_, i) => `PROJ-${i + 1}`);

      // Act
      await backlog.moveIssuesToBoard(1, issues);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/backlog/1/issue`,
        body: { issues },
      });
    });

    it('throws ValidationError for boardId = 0', async () => {
      await expect(backlog.moveIssuesToBoard(0, ['PROJ-1'])).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for boardId < 0', async () => {
      await expect(backlog.moveIssuesToBoard(-5, ['PROJ-1'])).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for non-integer boardId', async () => {
      await expect(backlog.moveIssuesToBoard(1.5, ['PROJ-1'])).rejects.toThrow(
        'boardId must be a positive integer',
      );
    });

    it('throws ValidationError for empty issues array', async () => {
      await expect(backlog.moveIssuesToBoard(1, [])).rejects.toThrow(
        'issues must be a non-empty array',
      );
    });

    it('throws ValidationError for issues array with 51 entries', async () => {
      const issues = Array.from({ length: 51 }, (_, i) => `PROJ-${i + 1}`);
      await expect(backlog.moveIssuesToBoard(1, issues)).rejects.toThrow(
        'issues must contain at most 50 entries',
      );
    });

    it('throws ValidationError for issue entry that is an empty string', async () => {
      await expect(backlog.moveIssuesToBoard(1, ['PROJ-1', ''])).rejects.toThrow(
        'issues entries must be non-empty strings',
      );
    });

    it('sends optional rank fields when provided', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await backlog.moveIssuesToBoard(1, ['PROJ-1'], {
        rankBeforeIssue: 'PROJ-2',
        rankCustomFieldId: 10521,
      });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({
        issues: ['PROJ-1'],
        rankBeforeIssue: 'PROJ-2',
        rankCustomFieldId: 10521,
      });
    });

    it('sends rankAfterIssue when provided', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await backlog.moveIssuesToBoard(1, ['PROJ-3'], { rankAfterIssue: 'PROJ-4' });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({
        issues: ['PROJ-3'],
        rankAfterIssue: 'PROJ-4',
      });
    });
  });

  // ── moveIssues (B236) ─────────────────────────────────────────────────────

  describe('moveIssues()', () => {
    it('calls POST /backlog/issue with issues body and returns void', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      const result = await backlog.moveIssues(['PROJ-1', 'PROJ-2']);

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/backlog/issue`,
        body: { issues: ['PROJ-1', 'PROJ-2'] },
      });
    });

    it('sends a single issue', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await backlog.moveIssues(['KEY-1']);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/backlog/issue`,
        body: { issues: ['KEY-1'] },
      });
    });

    it('sends exactly 50 issues (boundary)', async () => {
      // Arrange
      transport.respondWith(undefined, 204);
      const issues = Array.from({ length: 50 }, (_, i) => `PROJ-${i + 1}`);

      // Act
      await backlog.moveIssues(issues);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/backlog/issue`,
        body: { issues },
      });
    });

    it('throws ValidationError for empty issues array', async () => {
      await expect(backlog.moveIssues([])).rejects.toThrow('issues must be a non-empty array');
    });

    it('throws ValidationError for issues array with 51 entries', async () => {
      const issues = Array.from({ length: 51 }, (_, i) => `PROJ-${i + 1}`);
      await expect(backlog.moveIssues(issues)).rejects.toThrow(
        'issues must contain at most 50 entries',
      );
    });

    it('throws ValidationError for issue entry that is an empty string', async () => {
      await expect(backlog.moveIssues(['PROJ-1', ''])).rejects.toThrow(
        'issues entries must be non-empty strings',
      );
    });
  });
});
