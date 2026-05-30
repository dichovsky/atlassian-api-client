import { describe, it, expect, beforeEach } from 'vitest';
import { FieldsResource } from '../../src/jira/resources/fields.js';
import { MockTransport } from '../helpers/mock-transport.js';
import type { Field, FieldContext } from '../../src/jira/resources/fields.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeField = (id: string, name: string, custom = false): Field => ({
  id,
  name,
  custom,
});

const makeContext = (id: string, name: string): FieldContext => ({
  id,
  name,
  description: 'A test context',
  isGlobalContext: true,
  isAnyIssueType: false,
});

describe('FieldsResource', () => {
  let transport: MockTransport;
  let fields: FieldsResource;

  beforeEach(() => {
    transport = new MockTransport();
    fields = new FieldsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /field/search with no params', async () => {
      // Arrange
      const page = {
        values: [makeField('f1', 'Summary', false)],
        startAt: 0,
        maxResults: 50,
        total: 1,
      };
      transport.respondWith(page);

      // Act
      const result = await fields.list();

      // Assert
      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/field/search`,
      });
    });

    it('passes startAt and maxResults to query', async () => {
      // Arrange
      const page = { values: [], startAt: 10, maxResults: 25, total: 10 };
      transport.respondWith(page);

      // Act
      await fields.list({ startAt: 10, maxResults: 25 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('joins type array into comma-separated string', async () => {
      // Arrange
      transport.respondWith({ values: [], startAt: 0, maxResults: 50 });

      // Act
      await fields.list({ type: ['custom', 'system'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ type: 'custom,system' });
    });

    it('joins id array into comma-separated string', async () => {
      // Arrange
      transport.respondWith({ values: [], startAt: 0, maxResults: 50 });

      // Act
      await fields.list({ id: ['customfield_10001', 'customfield_10002'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        id: 'customfield_10001,customfield_10002',
      });
    });

    it('passes query, orderBy, expand params', async () => {
      // Arrange
      transport.respondWith({ values: [], startAt: 0, maxResults: 50 });

      // Act
      await fields.list({ query: 'sprint', orderBy: 'name', expand: 'searcherKey' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        query: 'sprint',
        orderBy: 'name',
        expand: 'searcherKey',
      });
    });

    it.each([0, -1, 1.5, Infinity])(
      'throws RangeError for invalid maxResults: %s',
      async (maxResults) => {
        await expect(fields.list({ maxResults })).rejects.toThrow(RangeError);
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('calls GET /field and returns the flat array', async () => {
      // Arrange
      const allFields = [makeField('f1', 'Summary', false), makeField('f2', 'My Field', true)];
      transport.respondWith(allFields);

      // Act
      const result = await fields.listAll();

      // Assert
      expect(result).toEqual(allFields);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/field`,
      });
    });

    it('returns an empty array when the API returns none', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await fields.listAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /field with the provided data', async () => {
      // Arrange
      const created = makeField('customfield_10050', 'My Field', true);
      transport.respondWith(created);
      const data = {
        name: 'My Field',
        type: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
      };

      // Act
      const result = await fields.create(data);

      // Assert
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/field`,
        body: data,
      });
    });

    it('includes optional description and searcherKey in body', async () => {
      // Arrange
      transport.respondWith(makeField('customfield_10051', 'Notes', true));
      const data = {
        name: 'Notes',
        type: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
        description: 'Extra notes',
        searcherKey: 'com.atlassian.jira.plugin.system.customfieldtypes:textsearcher',
      };

      // Act
      await fields.create(data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        description: 'Extra notes',
        searcherKey: 'com.atlassian.jira.plugin.system.customfieldtypes:textsearcher',
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /field/{fieldId} with the provided data', async () => {
      // Arrange
      const updated = makeField('customfield_10050', 'Renamed Field', true);
      transport.respondWith(updated);
      const data = { name: 'Renamed Field' };

      // Act
      const result = await fields.update('customfield_10050', data);

      // Assert
      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/field/customfield_10050`,
        body: data,
      });
    });

    it('encodes fieldId in the path', async () => {
      // Arrange
      transport.respondWith(makeField('customfield_10050', 'Field', true));

      // Act
      await fields.update('../admin', { name: 'x' });

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment fieldId in update(): %s',
      async (fieldId) => {
        await expect(fields.update(fieldId, {})).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /field/{fieldId}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.delete('customfield_10050');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/field/customfield_10050`,
      });
    });

    it('encodes fieldId in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.delete('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment fieldId in delete(): %s',
      async (fieldId) => {
        await expect(fields.delete(fieldId)).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── listContexts ──────────────────────────────────────────────────────────

  describe('listContexts()', () => {
    it('calls GET /field/{fieldId}/context with no params', async () => {
      // Arrange
      const page = {
        values: [makeContext('10025', 'Bug fields context')],
        startAt: 0,
        maxResults: 50,
        total: 1,
      };
      transport.respondWith(page);

      // Act
      const result = await fields.listContexts('customfield_10001');

      // Assert
      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/field/customfield_10001/context`,
      });
    });

    it('passes isAnyIssueType and isGlobalContext query params', async () => {
      // Arrange
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0 });

      // Act
      await fields.listContexts('customfield_10001', {
        isAnyIssueType: true,
        isGlobalContext: false,
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        isAnyIssueType: true,
        isGlobalContext: false,
      });
    });

    it('joins contextId array into comma-separated string', async () => {
      // Arrange
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0 });

      // Act
      await fields.listContexts('customfield_10001', { contextId: [10025, 10026] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ contextId: '10025,10026' });
    });

    it('passes startAt and maxResults', async () => {
      // Arrange
      transport.respondWith({ values: [], startAt: 10, maxResults: 25, total: 10 });

      // Act
      await fields.listContexts('customfield_10001', { startAt: 10, maxResults: 25 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('encodes fieldId in the path', async () => {
      // Arrange
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0 });

      // Act
      await fields.listContexts('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin/context`);
    });

    it.each([0, -1, 1.5, Infinity])(
      'throws RangeError for invalid maxResults: %s',
      async (maxResults) => {
        await expect(fields.listContexts('customfield_10001', { maxResults })).rejects.toThrow(
          RangeError,
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── createContext ─────────────────────────────────────────────────────────

  describe('createContext()', () => {
    it('calls POST /field/{fieldId}/context with required name', async () => {
      // Arrange
      const created = makeContext('10025', 'Bug fields context');
      transport.respondWith(created);
      const data = { name: 'Bug fields context' };

      // Act
      const result = await fields.createContext('customfield_10001', data);

      // Assert
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/field/customfield_10001/context`,
        body: data,
      });
    });

    it('includes optional description, projectIds, issueTypeIds in body', async () => {
      // Arrange
      transport.respondWith(makeContext('10025', 'Bug fields context'));
      const data = {
        name: 'Bug fields context',
        description: 'A context for bugs',
        projectIds: ['10010', '10011'],
        issueTypeIds: ['10000'],
      };

      // Act
      await fields.createContext('customfield_10001', data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        description: 'A context for bugs',
        projectIds: ['10010', '10011'],
        issueTypeIds: ['10000'],
      });
    });

    it('encodes fieldId in the path', async () => {
      // Arrange
      transport.respondWith(makeContext('10025', 'ctx'));

      // Act
      await fields.createContext('../admin', { name: 'ctx' });

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin/context`);
    });
  });

  // ── updateContext ─────────────────────────────────────────────────────────

  describe('updateContext()', () => {
    it('calls PUT /field/{fieldId}/context/{contextId} with body', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = { name: 'Updated context', description: 'New description' };

      // Act
      await fields.updateContext('customfield_10001', 10025, data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/field/customfield_10001/context/10025`,
        body: data,
      });
    });

    it('encodes fieldId in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.updateContext('../admin', 10025, { name: 'x' });

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin/context/10025`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment fieldId in updateContext(): %s',
      async (fieldId) => {
        await expect(fields.updateContext(fieldId, 10025, {})).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── deleteContext ─────────────────────────────────────────────────────────

  describe('deleteContext()', () => {
    it('calls DELETE /field/{fieldId}/context/{contextId}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.deleteContext('customfield_10001', 10025);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/field/customfield_10001/context/10025`,
      });
    });

    it('encodes fieldId in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.deleteContext('../admin', 10025);

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin/context/10025`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment fieldId in deleteContext(): %s',
      async (fieldId) => {
        await expect(fields.deleteContext(fieldId, 10025)).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });
});
