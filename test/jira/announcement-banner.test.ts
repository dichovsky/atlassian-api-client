import { describe, it, expect, beforeEach } from 'vitest';
import { AnnouncementBannerResource } from '../../src/jira/resources/announcement-banner.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeBanner = (
  overrides?: Partial<{ message: string; visibility: 'PUBLIC' | 'PRIVATE' }>,
) => ({
  isDismissible: false,
  isEnabled: true,
  message: overrides?.message ?? 'Hello Jira users',
  visibility: overrides?.visibility ?? ('PUBLIC' as const),
});

describe('AnnouncementBannerResource', () => {
  let transport: MockTransport;
  let announcementBanner: AnnouncementBannerResource;

  beforeEach(() => {
    transport = new MockTransport();
    announcementBanner = new AnnouncementBannerResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /announcementBanner and returns the banner config', async () => {
      // Arrange
      const banner = makeBanner();
      transport.respondWith(banner);

      // Act
      const result = await announcementBanner.get();

      // Assert
      expect(result).toEqual(banner);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/announcementBanner`,
      });
    });

    it('returns a banner with PRIVATE visibility', async () => {
      // Arrange
      const banner = makeBanner({ visibility: 'PRIVATE' });
      transport.respondWith(banner);

      // Act
      const result = await announcementBanner.get();

      // Assert
      expect(result.visibility).toBe('PRIVATE');
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(announcementBanner.get()).rejects.toThrow('network error');
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /announcementBanner with the provided data and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = { message: 'Scheduled maintenance tonight', visibility: 'PUBLIC' as const };

      // Act
      const result = await announcementBanner.update(data);

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/announcementBanner`,
        body: data,
      });
    });

    it('passes partial update data (only message)', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await announcementBanner.update({ message: 'New message' });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({ message: 'New message' });
    });

    it('passes partial update data (only visibility)', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await announcementBanner.update({ visibility: 'PRIVATE' });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({ visibility: 'PRIVATE' });
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(announcementBanner.update({ message: 'x' })).rejects.toThrow('server error');
    });
  });
});
