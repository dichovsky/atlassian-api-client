import { describe, it, expect, beforeEach } from 'vitest';
import { MyPreferencesResource } from '../../src/jira/resources/mypreferences.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('MyPreferencesResource', () => {
  let transport: MockTransport;
  let myPreferences: MyPreferencesResource;

  beforeEach(() => {
    transport = new MockTransport();
    myPreferences = new MyPreferencesResource(transport, BASE_URL);
  });

  // ── getPreference (B602 GET /rest/api/3/mypreferences) ────────────────────

  describe('getPreference()', () => {
    it('calls GET /mypreferences with key query param and returns string value', async () => {
      // Arrange
      transport.respondWith('en_US');

      // Act
      const result = await myPreferences.getPreference('jira.user.locale');

      // Assert
      expect(result).toBe('en_US');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/mypreferences`,
        query: { key: 'jira.user.locale' },
      });
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(myPreferences.getPreference('some.key')).rejects.toThrow('network error');
    });
  });

  // ── setPreference (B603 PUT /rest/api/3/mypreferences) ────────────────────

  describe('setPreference()', () => {
    it('calls PUT /mypreferences with key query param and raw string body', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await myPreferences.setPreference('jira.user.locale', 'en_US');

      // Assert: method, path, query
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/mypreferences`,
        query: { key: 'jira.user.locale' },
      });
      // Assert: body is the raw string value (not an object wrapper)
      // buildFetchBody will call JSON.stringify(body), so the wire body will be
      // '"en_US"' — a valid JSON string. We assert the resource passes the string
      // directly as body so the caller gets the correct wire encoding.
      expect(transport.lastCall?.options.body).toBe('en_US');
    });

    it('returns void on success', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await myPreferences.setPreference('foo', 'bar');

      // Assert
      expect(result).toBeUndefined();
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(myPreferences.setPreference('foo', 'bar')).rejects.toThrow('server error');
    });
  });

  // ── removePreference (B601 DELETE /rest/api/3/mypreferences) ─────────────

  describe('removePreference()', () => {
    it('calls DELETE /mypreferences with key query param', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await myPreferences.removePreference('jira.user.locale');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/mypreferences`,
        query: { key: 'jira.user.locale' },
      });
    });

    it('returns void on success', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await myPreferences.removePreference('foo');

      // Assert
      expect(result).toBeUndefined();
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(myPreferences.removePreference('foo')).rejects.toThrow('network error');
    });
  });

  // ── getLocale (B604 GET /rest/api/3/mypreferences/locale) ────────────────

  describe('getLocale()', () => {
    it('calls GET /mypreferences/locale and returns Locale object', async () => {
      // Arrange
      const locale = { locale: 'en_US' };
      transport.respondWith(locale);

      // Act
      const result = await myPreferences.getLocale();

      // Assert
      expect(result).toEqual(locale);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/mypreferences/locale`,
      });
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(myPreferences.getLocale()).rejects.toThrow('network error');
    });
  });

  // ── setLocale (B925 PUT /rest/api/3/mypreferences/locale — deprecated) ───

  describe('setLocale()', () => {
    it('calls PUT /mypreferences/locale with locale object body', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await myPreferences.setLocale('fr_FR');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/mypreferences/locale`,
        body: { locale: 'fr_FR' },
      });
    });

    it('returns void on success', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await myPreferences.setLocale('en_US');

      // Assert
      expect(result).toBeUndefined();
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(myPreferences.setLocale('en_US')).rejects.toThrow('server error');
    });
  });
});
