import { describe, it, expect, beforeEach } from 'vitest';
import { UsersResource } from '../../src/confluence/resources/users.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

describe('UsersResource', () => {
  let transport: MockTransport;
  let resource: UsersResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new UsersResource(transport, BASE_URL);
  });

  // ── checkAccessByEmail ───────────────────────────────────────────────────

  describe('checkAccessByEmail()', () => {
    it('issues POST /user/access/check-access-by-email with the request body verbatim', async () => {
      // Arrange
      const payload = {
        emailsWithoutAccess: ['outsider@example.com'],
        invalidEmails: ['not-an-email'],
      };
      transport.respondWith(payload);
      const body = { emails: ['member@example.com', 'outsider@example.com', 'not-an-email'] };

      // Act
      const result = await resource.checkAccessByEmail(body);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/user/access/check-access-by-email`,
        body,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('returns the envelope unchanged when the server omits both buckets', async () => {
      // Arrange — Confluence may return `{}` if every email already has access.
      transport.respondWith({});

      // Act
      const result = await resource.checkAccessByEmail({ emails: ['member@example.com'] });

      // Assert
      expect(result).toEqual({});
      expect(result.emailsWithoutAccess).toBeUndefined();
      expect(result.invalidEmails).toBeUndefined();
    });

    it('passes a single-email batch through to the wire', async () => {
      // Arrange
      transport.respondWith({ emailsWithoutAccess: ['x@example.com'] });

      // Act
      await resource.checkAccessByEmail({ emails: ['x@example.com'] });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({ emails: ['x@example.com'] });
    });

    it('throws RangeError when emails is an empty array (no HTTP call)', async () => {
      // Act + Assert
      await expect(resource.checkAccessByEmail({ emails: [] })).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws RangeError when emails is missing entirely', async () => {
      // Act + Assert — exercise the !Array.isArray guard branch.
      await expect(
        resource.checkAccessByEmail({ emails: undefined as unknown as readonly string[] }),
      ).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('boom'));

      // Act + Assert
      await expect(resource.checkAccessByEmail({ emails: ['x@example.com'] })).rejects.toThrow(
        'boom',
      );
    });
  });

  // ── inviteByEmail ────────────────────────────────────────────────────────

  describe('inviteByEmail()', () => {
    it('issues POST /user/access/invite-by-email with the request body verbatim', async () => {
      // Arrange — the endpoint is fire-and-forget (no body of interest).
      transport.respondWith(undefined);
      const body = { emails: ['new1@example.com', 'new2@example.com'] };

      // Act
      const result = await resource.inviteByEmail(body);

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/user/access/invite-by-email`,
        body,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('passes a single-email batch through to the wire', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await resource.inviteByEmail({ emails: ['solo@example.com'] });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({ emails: ['solo@example.com'] });
    });

    it('throws RangeError when emails is an empty array (no HTTP call)', async () => {
      // Act + Assert
      await expect(resource.inviteByEmail({ emails: [] })).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });

    it('throws RangeError when emails is missing entirely', async () => {
      // Act + Assert — exercise the !Array.isArray guard branch.
      await expect(
        resource.inviteByEmail({ emails: undefined as unknown as readonly string[] }),
      ).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('boom'));

      // Act + Assert
      await expect(resource.inviteByEmail({ emails: ['x@example.com'] })).rejects.toThrow('boom');
    });
  });
});
