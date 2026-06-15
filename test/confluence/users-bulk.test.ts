import { describe, it, expect, beforeEach } from 'vitest';
import { UsersBulkResource } from '../../src/confluence/resources/users-bulk.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const sampleUser = {
  accountId: 'acc-1',
  accountType: 'atlassian' as const,
  accountStatus: 'active' as const,
  displayName: 'Alice Example',
  publicName: 'Alice',
  email: 'alice@example.com',
  timeZone: 'UTC',
  personalSpaceId: 'space-1',
  isExternalCollaborator: false,
  profilePicture: { path: '/wiki/avatar/alice.png', isDefault: false },
};

describe('UsersBulkResource', () => {
  let transport: MockTransport;
  let resource: UsersBulkResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new UsersBulkResource(transport, BASE_URL);
  });

  // ── lookup ────────────────────────────────────────────────────────────────

  describe('lookup()', () => {
    it('issues POST /users-bulk with the request body verbatim', async () => {
      // Arrange
      const payload = {
        results: [sampleUser],
        _links: { base: 'https://test.atlassian.net/wiki' },
      };
      transport.respondWith(payload);
      const body = { accountIds: ['acc-1', 'acc-2', 'acc-3'] };

      // Act
      const result = await resource.lookup(body);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/users-bulk`,
        body,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('returns the empty wrapper unchanged when no IDs resolve', async () => {
      // Arrange — Confluence returns `{ results: [], _links: {} }` for unknown IDs.
      const payload = { results: [], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await resource.lookup({ accountIds: ['nonexistent'] });

      // Assert
      expect(result).toEqual(payload);
      expect(result.results).toEqual([]);
    });

    it('passes a single-ID batch through to the wire', async () => {
      // Arrange
      transport.respondWith({ results: [sampleUser] });

      // Act
      await resource.lookup({ accountIds: ['acc-1'] });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({ accountIds: ['acc-1'] });
    });

    it('throws ValidationError when accountIds is an empty array (no HTTP call)', async () => {
      // Act + Assert
      await expect(resource.lookup({ accountIds: [] })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when accountIds is missing entirely', async () => {
      // Act + Assert — exercise the !Array.isArray guard branch.
      await expect(
        resource.lookup({ accountIds: undefined as unknown as readonly string[] }),
      ).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('boom'));

      // Act + Assert
      await expect(resource.lookup({ accountIds: ['acc-1'] })).rejects.toThrow('boom');
    });
  });
});
