import { describe, it, expect, beforeEach } from 'vitest';
import { RemoteLinkResource } from '../../src/jira/resources/remote-link.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/remotelinks/1.0';

const makeRemoteLink = (overrides?: Partial<{ id: string; title: string }>) => ({
  id: overrides?.id ?? 'rl-1',
  url: 'https://github.com/org/repo/pull/42',
  title: overrides?.title ?? 'Pull Request #42',
  type: 'GitHub',
  lastUpdated: '2024-01-01T00:00:00.000Z',
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
  });
});
