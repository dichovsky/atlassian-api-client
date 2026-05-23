import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsResource } from '../../src/jira/resources/settings.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('SettingsResource', () => {
  let transport: MockTransport;
  let settings: SettingsResource;

  beforeEach(() => {
    transport = new MockTransport();
    settings = new SettingsResource(transport, BASE_URL);
  });

  // ── getColumns ────────────────────────────────────────────────────────────

  describe('getColumns()', () => {
    it('calls GET /settings/columns and returns columns array', async () => {
      // Arrange
      const columns = [
        { label: 'Key', value: 'issuekey' },
        { label: 'Summary', value: 'summary' },
      ];
      transport.respondWith(columns);

      // Act
      const result = await settings.getColumns();

      // Assert
      expect(result).toEqual(columns);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/settings/columns`,
      });
    });

    it('returns empty array when no columns configured', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await settings.getColumns();

      // Assert
      expect(result).toEqual([]);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(settings.getColumns()).rejects.toThrow('network error');
    });
  });

  // ── setColumns ────────────────────────────────────────────────────────────

  describe('setColumns()', () => {
    it('calls PUT /settings/columns with provided columns and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = {
        columns: [
          { label: 'Key', value: 'issuekey' },
          { label: 'Summary', value: 'summary' },
        ],
      };

      // Act
      const result = await settings.setColumns(data);

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/settings/columns`,
        body: data,
      });
    });

    it('sends an empty columns array when provided', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await settings.setColumns({ columns: [] });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({ columns: [] });
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(settings.setColumns({ columns: [] })).rejects.toThrow('forbidden');
    });
  });
});
