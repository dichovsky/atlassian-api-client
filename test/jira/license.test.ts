import { describe, it, expect, beforeEach } from 'vitest';
import { LicenseResource } from '../../src/jira/resources/license.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('LicenseResource', () => {
  let transport: MockTransport;
  let license: LicenseResource;

  beforeEach(() => {
    transport = new MockTransport();
    license = new LicenseResource(transport, BASE_URL);
  });

  // ── getApproximateCount ───────────────────────────────────────────────────

  describe('getApproximateCount()', () => {
    it('calls GET /license/approximateLicenseCount and returns a LicenseMetric', async () => {
      // Arrange — spec returns { key, value } (LicenseMetric)
      const payload = { key: 'license.totalApproximateUserCount', value: '1000' };
      transport.respondWith(payload);

      // Act
      const result = await license.getApproximateCount();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/license/approximateLicenseCount`,
      });
    });

    it('returns the key and value strings from the metric', async () => {
      // Arrange
      transport.respondWith({ key: 'license.totalApproximateUserCount', value: '0' });

      // Act
      const result = await license.getApproximateCount();

      // Assert
      expect(result.key).toBe('license.totalApproximateUserCount');
      expect(result.value).toBe('0');
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(license.getApproximateCount()).rejects.toThrow('network error');
    });
  });

  // ── getApproximateCountForProduct ─────────────────────────────────────────

  describe('getApproximateCountForProduct()', () => {
    it('calls GET /license/approximateLicenseCount/product/{key} with the given key', async () => {
      // Arrange — spec returns { key, value } (LicenseMetric)
      const payload = { key: 'license.approximateUserCount', value: '25' };
      transport.respondWith(payload);

      // Act
      const result = await license.getApproximateCountForProduct('jira-software');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/license/approximateLicenseCount/product/jira-software`,
      });
    });

    it('accepts all four enum application keys', async () => {
      const keys = [
        'jira-core',
        'jira-product-discovery',
        'jira-software',
        'jira-servicedesk',
      ] as const;
      for (const key of keys) {
        transport.respondWith({ key: 'license.approximateUserCount', value: '10' });
        await license.getApproximateCountForProduct(key);
        expect(transport.lastCall?.options.path).toBe(
          `${BASE_URL}/license/approximateLicenseCount/product/${key}`,
        );
      }
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(license.getApproximateCountForProduct('jira-software')).rejects.toThrow(
        'server error',
      );
    });
  });
});
