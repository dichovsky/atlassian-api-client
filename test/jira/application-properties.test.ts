import { describe, it, expect, beforeEach } from 'vitest';
import {
  ApplicationPropertiesResource,
  type ApplicationProperty,
} from '../../src/jira/resources/application-properties.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeProperty = (overrides: Partial<ApplicationProperty> = {}): ApplicationProperty => ({
  id: 'jira.title',
  key: 'jira.title',
  value: 'My Jira',
  name: 'Jira Title',
  desc: 'The name of the Jira instance.',
  type: 'string',
  defaultValue: 'Jira',
  ...overrides,
});

describe('ApplicationPropertiesResource', () => {
  let transport: MockTransport;
  let resource: ApplicationPropertiesResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new ApplicationPropertiesResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /application-properties with no query when no params supplied', async () => {
      // Arrange
      const props = [makeProperty()];
      transport.respondWith(props);

      // Act
      const result = await resource.list();

      // Assert
      expect(result).toEqual(props);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/application-properties`,
        query: {},
      });
    });

    it('passes key, permissionLevel, and keyFilter as query params', async () => {
      // Arrange
      transport.respondWith([makeProperty({ key: 'jira.home', id: 'jira.home' })]);

      // Act
      await resource.list({
        key: 'jira.home',
        permissionLevel: 'SYSADMIN',
        keyFilter: '^jira\\.',
      });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({
        key: 'jira.home',
        permissionLevel: 'SYSADMIN',
        keyFilter: '^jira\\.',
      });
    });

    it('omits absent query params', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      await resource.list({ key: 'jira.title' });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ key: 'jira.title' });
    });

    it('returns the response array verbatim (multiple entries)', async () => {
      // Arrange
      const props = [
        makeProperty({ id: 'jira.title', key: 'jira.title' }),
        makeProperty({ id: 'jira.home', key: 'jira.home', value: '/var/jira' }),
      ];
      transport.respondWith(props);

      // Act
      const result = await resource.list();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.key).toBe('jira.title');
      expect(result[1]?.key).toBe('jira.home');
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(resource.list()).rejects.toThrow('network error');
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /application-properties/{id} with the id+value body and returns the updated property', async () => {
      // Arrange
      const updated = makeProperty({ value: 'New Title' });
      transport.respondWith(updated);

      // Act
      const result = await resource.update('jira.title', { id: 'jira.title', value: 'New Title' });

      // Assert
      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/application-properties/jira.title`,
        body: { id: 'jira.title', value: 'New Title' },
      });
    });

    it('URL-encodes ids that contain reserved characters', async () => {
      // Arrange
      transport.respondWith(makeProperty({ id: 'jira/weird?id', key: 'jira/weird?id' }));

      // Act
      await resource.update('jira/weird?id', { id: 'jira/weird?id', value: 'x' });

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/application-properties/jira%2Fweird%3Fid`,
      );
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(resource.update('jira.title', { id: 'jira.title', value: 'x' })).rejects.toThrow(
        'forbidden',
      );
    });
  });

  // ── listAdvancedSettings ──────────────────────────────────────────────────

  describe('listAdvancedSettings()', () => {
    it('calls GET /application-properties/advanced-settings and returns the array', async () => {
      // Arrange
      const advanced = [
        makeProperty({
          id: 'jira.option.allowunassigned',
          key: 'jira.option.allowunassigned',
          value: 'true',
          type: 'boolean',
        }),
      ];
      transport.respondWith(advanced);

      // Act
      const result = await resource.listAdvancedSettings();

      // Assert
      expect(result).toEqual(advanced);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/application-properties/advanced-settings`,
      });
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(resource.listAdvancedSettings()).rejects.toThrow('server error');
    });
  });
});
