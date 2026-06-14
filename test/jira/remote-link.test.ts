import { describe, it, expect, beforeEach } from 'vitest';
import { RemoteLinkResource } from '../../src/jira/resources/remote-link.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/remotelinks/1.0';

// Spec-compliant RemoteLink fixture (required fields per spec RemoteLinkData).
const makeRemoteLink = (overrides?: Partial<{ id: string; displayName: string }>) => ({
  id: overrides?.id ?? 'rl-1',
  updateSequenceNumber: 1523494301448,
  displayName: overrides?.displayName ?? 'Pull Request #42',
  url: 'https://github.com/org/repo/pull/42',
  type: 'document' as const,
  lastUpdated: '2024-01-01T00:00:00.000Z',
  description: 'A PR',
  schemaVersion: '1.0' as const,
  status: { appearance: 'inprogress' as const, label: 'In Review' },
  actionIds: ['action-123'],
  attributeMap: { prId: '42' },
});

describe('RemoteLinkResource', () => {
  let transport: MockTransport;
  let remoteLink: RemoteLinkResource;

  beforeEach(() => {
    transport = new MockTransport();
    remoteLink = new RemoteLinkResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /remotelink/{id} and returns the remote link', async () => {
      // Arrange
      const link = makeRemoteLink();
      transport.respondWith(link);

      // Act
      const result = await remoteLink.get('rl-1');

      // Assert
      expect(result).toEqual(link);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/remotelink/rl-1`,
      });
    });

    it('URL-encodes the remoteLinkId', async () => {
      // Arrange
      transport.respondWith(makeRemoteLink({ id: 'rl/special' }));

      // Act
      await remoteLink.get('rl/special');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/remotelink/rl%2Fspecial`);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(remoteLink.get('rl-1')).rejects.toThrow('network error');
    });

    it('returns spec-required fields: updateSequenceNumber and displayName', async () => {
      // Regression: old RemoteLink used `title`/`summary` instead of `displayName`/`description`,
      // and omitted the required `updateSequenceNumber` field.
      const link = makeRemoteLink();
      transport.respondWith(link);

      const result = await remoteLink.get('rl-1');

      expect(result.updateSequenceNumber).toBe(1523494301448);
      expect(result.displayName).toBe('Pull Request #42');
      // Old fictional fields should NOT be present on the type (TypeScript would
      // catch assignment; at runtime the mock passes through whatever the server sends)
    });

    it('returns optional spec fields: schemaVersion, status, actionIds, attributeMap', async () => {
      // Spec: RemoteLinkData has optional schemaVersion, status, actionIds, attributeMap.
      const link = makeRemoteLink();
      transport.respondWith(link);

      const result = await remoteLink.get('rl-1');

      expect(result.schemaVersion).toBe('1.0');
      expect(result.status?.appearance).toBe('inprogress');
      expect(result.status?.label).toBe('In Review');
      expect(result.actionIds).toEqual(['action-123']);
      expect(result.attributeMap).toEqual({ prId: '42' });
    });

    it('type field returns a spec enum value', async () => {
      // Spec: `type` is an enum, not an arbitrary string.
      const link = makeRemoteLink();
      transport.respondWith(link);

      const result = await remoteLink.get('rl-1');

      // TypeScript type is RemoteLinkType; at runtime just verify the value is present
      expect(result.type).toBe('document');
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /remotelink/{id} and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await remoteLink.delete('rl-1');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/remotelink/rl-1`,
      });
    });

    it('URL-encodes the remoteLinkId', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await remoteLink.delete('rl/special');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/remotelink/rl%2Fspecial`);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(remoteLink.delete('rl-1')).rejects.toThrow('forbidden');
    });

    it('rejects a path-traversal remoteLinkId (B1052)', async () => {
      await expect(remoteLink.get('..')).rejects.toThrow(ValidationError);
    });

    it('sends _updateSequenceNumber query param when provided (deprecated, spec param)', async () => {
      // Regression: DELETE /rest/remotelinks/1.0/remotelink/{id} supports a
      // deprecated `_updateSequenceNumber` query param to control deletion ordering.
      transport.respondWith(undefined);

      await remoteLink.delete('rl-1', 1523494301448);

      expect(transport.lastCall?.options.query?.['_updateSequenceNumber']).toBe(1523494301448);
    });

    it('omits _updateSequenceNumber from query when not provided', async () => {
      transport.respondWith(undefined);

      await remoteLink.delete('rl-1');

      // query object should be empty or not have the param set
      const query = transport.lastCall?.options.query ?? {};
      expect(query['_updateSequenceNumber']).toBeUndefined();
    });
  });
});
