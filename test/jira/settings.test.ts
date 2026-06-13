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
    it('calls PUT /settings/columns with multipart/form-data and a repeated columns field per string', async () => {
      // Arrange — spec: PUT /rest/api/3/settings/columns accepts multipart/form-data
      // with `columns` as a string array (column ids), NOT a JSON object-array.
      transport.respondWith(undefined);

      // Act
      const result = await settings.setColumns(['issuekey', 'summary']);

      // Assert
      expect(result).toBeUndefined();
      const opts = transport.lastCall?.options;
      expect(opts).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/settings/columns`,
      });
      // Must send formData, not body
      expect(opts?.body).toBeUndefined();
      expect(opts?.formData).toBeInstanceOf(FormData);
      const fd = opts?.formData as FormData;
      expect(fd.getAll('columns')).toEqual(['issuekey', 'summary']);
    });

    it('sends an empty columns list when provided', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await settings.setColumns([]);

      // Assert
      const fd = transport.lastCall?.options.formData as FormData;
      expect(fd).toBeInstanceOf(FormData);
      expect(fd.getAll('columns')).toEqual([]);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(settings.setColumns([])).rejects.toThrow('forbidden');
    });
  });
});
