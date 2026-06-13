import { describe, it, expect, beforeEach } from 'vitest';
import { CustomFieldOptionResource } from '../../src/jira/resources/custom-field-option.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeOption = (overrides?: Partial<{ id: string; value: string }>) => ({
  self: 'https://test.atlassian.net/rest/api/3/customFieldOption/10001',
  value: overrides?.value ?? 'In Progress',
  id: overrides?.id ?? '10001',
  disabled: false,
});

describe('CustomFieldOptionResource', () => {
  let transport: MockTransport;
  let customFieldOption: CustomFieldOptionResource;

  beforeEach(() => {
    transport = new MockTransport();
    customFieldOption = new CustomFieldOptionResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /customFieldOption/{id} and returns the option', async () => {
      // Arrange
      const option = makeOption();
      transport.respondWith(option);

      // Act
      const result = await customFieldOption.get('10001');

      // Assert
      expect(result).toEqual(option);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/customFieldOption/10001`,
      });
    });

    it('URL-encodes the id', async () => {
      // Arrange
      transport.respondWith(makeOption({ id: 'opt/special' }));

      // Act
      await customFieldOption.get('opt/special');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/customFieldOption/opt%2Fspecial`);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(customFieldOption.get('10001')).rejects.toThrow('not found');
    });

    it('rejects a path-traversal id (B1052)', async () => {
      await expect(customFieldOption.get('..')).rejects.toThrow(ValidationError);
    });
  });
});
