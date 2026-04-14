import { describe, it, expect, beforeEach } from 'vitest';
import { ContentPropertiesResource } from '../../src/confluence/resources/content-properties.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeProperty = (id: string, key: string) => ({
  id,
  key,
  value: { color: 'blue' },
  version: { number: 1 },
});

describe('ContentPropertiesResource', () => {
  let transport: MockTransport;
  let resource: ContentPropertiesResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new ContentPropertiesResource(transport, BASE_URL);
  });

  // ── listForPage ───────────────────────────────────────────────────────────

  describe('listForPage()', () => {
    it('calls GET /pages/{pageId}/properties with no params', async () => {
      // Arrange
      const payload = { results: [makeProperty('p1', 'color')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await resource.listForPage('page-1');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/page-1/properties`,
      });
    });

    it('passes params when provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await resource.listForPage('page-1', { key: 'color', limit: 10, cursor: 'tok' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        key: 'color',
        limit: 10,
        cursor: 'tok',
      });
    });
  });

  // ── getForPage ────────────────────────────────────────────────────────────

  describe('getForPage()', () => {
    it('calls GET /pages/{pageId}/properties/{key}', async () => {
      // Arrange
      const property = makeProperty('p1', 'color');
      transport.respondWith(property);

      // Act
      const result = await resource.getForPage('page-1', 'color');

      // Assert
      expect(result).toEqual(property);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/page-1/properties/color`,
      });
    });
  });

  // ── createForPage ─────────────────────────────────────────────────────────

  describe('createForPage()', () => {
    it('calls POST /pages/{pageId}/properties with data', async () => {
      // Arrange
      const property = makeProperty('p2', 'theme');
      transport.respondWith(property);
      const data = { key: 'theme', value: { mode: 'dark' } };

      // Act
      const result = await resource.createForPage('page-1', data);

      // Assert
      expect(result).toEqual(property);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/pages/page-1/properties`,
        body: data,
      });
    });
  });

  // ── updateForPage ─────────────────────────────────────────────────────────

  describe('updateForPage()', () => {
    it('calls PUT /pages/{pageId}/properties/{key} with updated data', async () => {
      // Arrange
      const updated = { ...makeProperty('p1', 'color'), value: { color: 'red' } };
      transport.respondWith(updated);
      const data = {
        key: 'color',
        value: { color: 'red' },
        version: { number: 2 },
      };

      // Act
      const result = await resource.updateForPage('page-1', 'color', data);

      // Assert
      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/pages/page-1/properties/color`,
        body: data,
      });
    });
  });

  // ── deleteForPage ─────────────────────────────────────────────────────────

  describe('deleteForPage()', () => {
    it('calls DELETE /pages/{pageId}/properties/{key}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await resource.deleteForPage('page-1', 'color');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/pages/page-1/properties/color`,
      });
    });
  });
});
