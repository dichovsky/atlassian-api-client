import { describe, it, expect, beforeEach } from 'vitest';
import { FieldsResource } from '../../src/jira/resources/fields.js';
import { MockTransport } from '../helpers/mock-transport.js';
import type {
  Field,
  FieldContext,
  CreatedFieldContext,
  FieldContextOption,
  CreatedFieldContextOptionsList,
  UpdatedFieldContextOptionsList,
  TaskProgressBeanRemoveOptionFromIssuesResult,
  FieldContextIssueTypeMapping,
  FieldContextDefaultValueSingleOption,
  FieldContextDefaultValueMultipleOption,
  FieldContextDefaultValueCascadingOption,
  FieldContextDefaultValueForgeStringField,
  FieldContextDefaultValueForgeUserField,
  FieldContextDefaultValueFloat,
  FieldContextProjectMapping,
  FieldContextForProjectAndIssueType,
  IssueFieldOption,
  CreateIssueFieldOptionData,
  FieldProjectAssociation,
  ScreenWithTab,
  FieldAssociationsRequest,
} from '../../src/jira/resources/fields.js';

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

/** Spec-shape fixture for POST /field/{fieldId}/context (CreateCustomFieldContext). */
const makeCreatedContext = (id: string, name: string): CreatedFieldContext => ({
  id,
  name,
  description: 'A created context',
  projectIds: [],
  issueTypeIds: ['10010'],
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
      const created = makeCreatedContext('10025', 'Bug fields context');
      transport.respondWith(created);
      const data = { name: 'Bug fields context' };

      // Act
      const result = await fields.createContext('customfield_10001', data);

      // Assert
      expect(result).toEqual(created);
      // Spec shape: projectIds and issueTypeIds present; no isGlobalContext/isAnyIssueType
      expect(result).toHaveProperty('projectIds');
      expect(result).toHaveProperty('issueTypeIds');
      expect(result).not.toHaveProperty('isGlobalContext');
      expect(result).not.toHaveProperty('isAnyIssueType');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/field/customfield_10001/context`,
        body: data,
      });
    });

    it('includes optional description, projectIds, issueTypeIds in body', async () => {
      // Arrange
      transport.respondWith(makeCreatedContext('10025', 'Bug fields context'));
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
      transport.respondWith(makeCreatedContext('10025', 'ctx'));

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

  // ── helpers for context option tests ─────────────────────────────────────

  const makeOption = (id: string, value: string): FieldContextOption => ({
    id,
    value,
    disabled: false,
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

  // ── listContextOptions ────────────────────────────────────────────────────

  describe('listContextOptions()', () => {
    it('calls GET /field/{fieldId}/context/{contextId}/option with no params', async () => {
      // Arrange — spec shape: PageBeanCustomFieldContextOption
      const page = {
        values: [makeOption('10001', 'New York'), makeOption('10002', 'Boston')],
        startAt: 0,
        maxResults: 100,
        total: 2,
        isLast: true,
      };
      transport.respondWith(page);

      // Act
      const result = await fields.listContextOptions('customfield_10001', 10025);

      // Assert
      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/field/customfield_10001/context/10025/option`,
      });
    });

    it('passes optionId, onlyOptions, startAt, maxResults as query params', async () => {
      // Arrange
      transport.respondWith({ values: [], startAt: 0, maxResults: 100, total: 0, isLast: true });

      // Act
      await fields.listContextOptions('customfield_10001', 10025, {
        optionId: 10001,
        onlyOptions: true,
        startAt: 10,
        maxResults: 50,
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        optionId: 10001,
        onlyOptions: true,
        startAt: 10,
        maxResults: 50,
      });
    });

    it('encodes fieldId and contextId in the path', async () => {
      // Arrange
      transport.respondWith({ values: [], startAt: 0, maxResults: 100, total: 0, isLast: true });

      // Act — special characters in fieldId
      await fields.listContextOptions('../admin', 10025);

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/context/10025/option`,
      );
    });

    it('omits undefined optional params from query — optionId only', async () => {
      // Arrange — params object present but only optionId set; covers onlyOptions/startAt/maxResults undefined branches
      transport.respondWith({ values: [], startAt: 0, maxResults: 100, total: 0, isLast: true });

      // Act
      await fields.listContextOptions('customfield_10001', 10025, { optionId: 10001 });

      // Assert — query has only optionId
      expect(transport.lastCall?.options.query).toEqual({ optionId: 10001 });
    });

    it('omits undefined optional params from query — onlyOptions only', async () => {
      // Arrange — params object present but only onlyOptions set; covers optionId undefined branch
      transport.respondWith({ values: [], startAt: 0, maxResults: 100, total: 0, isLast: true });

      // Act
      await fields.listContextOptions('customfield_10001', 10025, { onlyOptions: false });

      // Assert — query has only onlyOptions
      expect(transport.lastCall?.options.query).toEqual({ onlyOptions: false });
    });

    it.each([0, -1, 1.5, Infinity])(
      'throws RangeError for invalid maxResults: %s',
      async (maxResults) => {
        await expect(
          fields.listContextOptions('customfield_10001', 10025, { maxResults }),
        ).rejects.toThrow(RangeError);
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── createContextOptions ──────────────────────────────────────────────────

  describe('createContextOptions()', () => {
    it('calls POST /field/{fieldId}/context/{contextId}/option and returns spec-shape response', async () => {
      // Arrange — spec shape: CustomFieldCreatedContextOptionsList wraps CustomFieldContextOption items
      const created: CreatedFieldContextOptionsList = {
        options: [
          { id: '10001', value: 'Scranton', disabled: false },
          { id: '10002', value: 'Manhattan', disabled: true, optionId: '10000' },
        ],
      };
      transport.respondWith(created);
      const data = {
        options: [
          { value: 'Scranton', disabled: false },
          { value: 'Manhattan', disabled: true, optionId: '10000' },
        ],
      };

      // Act
      const result = await fields.createContextOptions('customfield_10001', 10025, data);

      // Assert
      expect(result).toEqual(created);
      // Spec shape: options array with id+value+disabled (CustomFieldContextOption)
      expect(result.options?.[0]).toHaveProperty('id');
      expect(result.options?.[0]).toHaveProperty('value');
      expect(result.options?.[0]).toHaveProperty('disabled');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/field/customfield_10001/context/10025/option`,
        body: data,
      });
    });

    it('encodes fieldId in the path', async () => {
      // Arrange
      transport.respondWith({ options: [] });

      // Act
      await fields.createContextOptions('../admin', 10025, { options: [] });

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/context/10025/option`,
      );
    });
  });

  // ── updateContextOptions ──────────────────────────────────────────────────

  describe('updateContextOptions()', () => {
    it('calls PUT /field/{fieldId}/context/{contextId}/option and returns spec-shape response', async () => {
      // Arrange — spec shape: CustomFieldUpdatedContextOptionsList wraps CustomFieldOptionUpdate items (id+value?+disabled?)
      const updated: UpdatedFieldContextOptionsList = {
        options: [
          { id: '10001', value: 'Scranton', disabled: false },
          { id: '10002', value: 'Manhattan', disabled: true },
        ],
      };
      transport.respondWith(updated);
      const data = {
        options: [
          { id: '10001', value: 'Scranton', disabled: false },
          { id: '10002', value: 'Manhattan', disabled: true },
        ],
      };

      // Act
      const result = await fields.updateContextOptions('customfield_10001', 10025, data);

      // Assert
      expect(result).toEqual(updated);
      // Spec shape: options items have id (required) + optional value/disabled
      expect(result.options?.[0]).toHaveProperty('id');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/field/customfield_10001/context/10025/option`,
        body: data,
      });
    });
  });

  // ── deleteContextOption ───────────────────────────────────────────────────

  describe('deleteContextOption()', () => {
    it('calls DELETE /field/{fieldId}/context/{contextId}/option/{optionId}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.deleteContextOption('customfield_10001', 10025, 10001);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/field/customfield_10001/context/10025/option/10001`,
      });
    });

    it('encodes fieldId with special characters in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.deleteContextOption('../admin', 10025, 10001);

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/context/10025/option/10001`,
      );
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment fieldId in deleteContextOption(): %s',
      async (fieldId) => {
        await expect(fields.deleteContextOption(fieldId, 10025, 10001)).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── replaceContextOptionOnIssues ──────────────────────────────────────────

  describe('replaceContextOptionOnIssues()', () => {
    it('calls DELETE /field/{fieldId}/context/{contextId}/option/{optionId}/issue and returns task progress', async () => {
      // Arrange — spec shape: TaskProgressBeanRemoveOptionFromIssuesResult (303)
      const taskResult: TaskProgressBeanRemoveOptionFromIssuesResult = {
        id: '1',
        self: 'https://your-domain.atlassian.net/rest/api/3/task/1',
        description: 'Remove option 1 from issues',
        status: 'COMPLETE',
        progress: 100,
        elapsedRuntime: 42,
        submitted: 1718000000000,
        submittedBy: 5001,
        lastUpdate: 1718000000000,
        result: {
          modifiedIssues: [10001, 10010],
          unmodifiedIssues: [10005],
        },
      };
      transport.respondWith(taskResult);

      // Act
      const result = await fields.replaceContextOptionOnIssues('customfield_10001', 10025, 10001, {
        replaceWith: 10003,
        jql: 'project=10000',
      });

      // Assert
      expect(result).toEqual(taskResult);
      // Spec shape: task progress with id, self, status, progress, elapsedRuntime
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('progress');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/field/customfield_10001/context/10025/option/10001/issue`,
        query: { replaceWith: 10003, jql: 'project=10000' },
      });
    });

    it('calls with no params when none provided', async () => {
      // Arrange
      transport.respondWith({
        id: '2',
        self: 'https://your-domain.atlassian.net/rest/api/3/task/2',
        status: 'RUNNING',
        progress: 50,
        elapsedRuntime: 10,
        lastUpdate: 1718000000000,
      });

      // Act
      await fields.replaceContextOptionOnIssues('customfield_10001', 10025, 10001);

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('calls with only replaceWith when jql is absent (covers jql undefined branch)', async () => {
      // Arrange — params present but jql absent
      transport.respondWith({
        id: '4',
        self: 'url',
        status: 'COMPLETE',
        progress: 100,
        elapsedRuntime: 5,
        lastUpdate: 1718000000000,
      });

      // Act
      await fields.replaceContextOptionOnIssues('customfield_10001', 10025, 10001, {
        replaceWith: 10003,
      });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ replaceWith: 10003 });
    });

    it('calls with only jql when replaceWith is absent (covers replaceWith undefined branch)', async () => {
      // Arrange — params present but replaceWith absent
      transport.respondWith({
        id: '5',
        self: 'url',
        status: 'COMPLETE',
        progress: 100,
        elapsedRuntime: 5,
        lastUpdate: 1718000000000,
      });

      // Act
      await fields.replaceContextOptionOnIssues('customfield_10001', 10025, 10001, {
        jql: 'project=PROJ',
      });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ jql: 'project=PROJ' });
    });

    it('encodes fieldId with special characters in the path', async () => {
      // Arrange
      transport.respondWith({
        id: '3',
        self: 'url',
        status: 'COMPLETE',
        progress: 100,
        elapsedRuntime: 5,
        lastUpdate: 1718000000000,
      });

      // Act
      await fields.replaceContextOptionOnIssues('../admin', 10025, 10001);

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/context/10025/option/10001/issue`,
      );
    });
  });

  // ── reorderContextOptions ─────────────────────────────────────────────────

  describe('reorderContextOptions()', () => {
    it('calls PUT /field/{fieldId}/context/{contextId}/option/move with position', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = {
        customFieldOptionIds: ['10001', '10002'],
        position: 'First' as const,
      };

      // Act
      await fields.reorderContextOptions('customfield_10001', 10025, data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/field/customfield_10001/context/10025/option/move`,
        body: data,
      });
    });

    it('calls with after instead of position', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = {
        customFieldOptionIds: ['10001'],
        after: '10005',
      };

      // Act
      await fields.reorderContextOptions('customfield_10001', 10025, data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        customFieldOptionIds: ['10001'],
        after: '10005',
      });
    });

    it('encodes fieldId with special characters in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.reorderContextOptions('../admin', 10025, {
        customFieldOptionIds: ['10001'],
        position: 'Last',
      });

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/context/10025/option/move`,
      );
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment fieldId in reorderContextOptions(): %s',
      async (fieldId) => {
        await expect(
          fields.reorderContextOptions(fieldId, 10025, { customFieldOptionIds: ['10001'] }),
        ).rejects.toThrow('path parameter must not be "." or ".."');
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── setContextIssueTypes (B419) ───────────────────────────────────────────

  describe('setContextIssueTypes()', () => {
    it('calls PUT /field/{fieldId}/context/{contextId}/issuetype with issueTypeIds body', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = { issueTypeIds: ['10001', '10005', '10006'] };

      // Act
      await fields.setContextIssueTypes('customfield_10001', 10025, data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/field/customfield_10001/context/10025/issuetype`,
        body: { issueTypeIds: ['10001', '10005', '10006'] },
      });
    });

    it('encodes fieldId with special characters in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.setContextIssueTypes('../admin', 10025, { issueTypeIds: ['10001'] });

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/context/10025/issuetype`,
      );
    });

    it('body contains issueTypeIds as string array exactly', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = { issueTypeIds: ['10001'] };

      // Act
      await fields.setContextIssueTypes('customfield_10001', 10025, data);

      // Assert
      const body = transport.lastCall?.options.body as { issueTypeIds: string[] };
      expect(body).toEqual({ issueTypeIds: ['10001'] });
    });
  });

  // ── removeContextIssueTypes (B420) ────────────────────────────────────────

  describe('removeContextIssueTypes()', () => {
    it('calls POST /field/{fieldId}/context/{contextId}/issuetype/remove with issueTypeIds body', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = { issueTypeIds: ['10001', '10005'] };

      // Act
      await fields.removeContextIssueTypes('customfield_10001', 10025, data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/field/customfield_10001/context/10025/issuetype/remove`,
        body: { issueTypeIds: ['10001', '10005'] },
      });
    });

    it('encodes fieldId with special characters in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.removeContextIssueTypes('../admin', 10025, { issueTypeIds: ['10001'] });

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/context/10025/issuetype/remove`,
      );
    });

    it('body contains issueTypeIds as string array exactly', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = { issueTypeIds: ['10001', '10002'] };

      // Act
      await fields.removeContextIssueTypes('customfield_10001', 10025, data);

      // Assert
      const body = transport.lastCall?.options.body as { issueTypeIds: string[] };
      expect(body).toEqual({ issueTypeIds: ['10001', '10002'] });
    });
  });

  // ── listContextIssueTypeMappings (B429) ───────────────────────────────────

  describe('listContextIssueTypeMappings()', () => {
    it('calls GET /field/{fieldId}/context/issuetypemapping and returns paginated results', async () => {
      // Arrange
      const mapping1: FieldContextIssueTypeMapping = { contextId: '10001', issueTypeId: '10010' };
      const mapping2: FieldContextIssueTypeMapping = { contextId: '10001', issueTypeId: '10011' };
      const mapping3: FieldContextIssueTypeMapping = { contextId: '10002', isAnyIssueType: true };
      transport.respondWith({
        isLast: true,
        maxResults: 100,
        startAt: 0,
        total: 3,
        values: [mapping1, mapping2, mapping3],
      });

      // Act
      const result = await fields.listContextIssueTypeMappings('customfield_10001');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/field/customfield_10001/context/issuetypemapping`,
      });
      expect(result.values).toHaveLength(3);
      expect(result.values[0]).toMatchObject({ contextId: '10001', issueTypeId: '10010' });
      expect(result.values[2]).toMatchObject({ contextId: '10002', isAnyIssueType: true });
    });

    it('passes contextId, startAt, maxResults as query params', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listContextIssueTypeMappings('customfield_10001', {
        contextId: [10001, 10002],
        startAt: 10,
        maxResults: 25,
      });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({
        contextId: '10001,10002',
        startAt: 10,
        maxResults: 25,
      });
    });

    it('sends no query params when params is undefined', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listContextIssueTypeMappings('customfield_10001');

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('sends empty query when params is provided but all sub-properties are undefined', async () => {
      // Arrange — covers the false branches of contextId/startAt/maxResults checks
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listContextIssueTypeMappings('customfield_10001', {});

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('encodes fieldId with special characters in the path', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listContextIssueTypeMappings('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/context/issuetypemapping`,
      );
    });
  });

  // ── listContextDefaultValues (B905) ───────────────────────────────────────

  describe('listContextDefaultValues()', () => {
    it('calls GET /field/{fieldId}/context/defaultValue and returns polymorphic values', async () => {
      // Arrange
      const singleOption: FieldContextDefaultValueSingleOption = {
        type: 'option.single',
        contextId: '10100',
        optionId: '10001',
      };
      transport.respondWith({
        isLast: true,
        maxResults: 50,
        startAt: 0,
        total: 1,
        values: [singleOption],
      });

      // Act
      const result = await fields.listContextDefaultValues('customfield_10001');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/field/customfield_10001/context/defaultValue`,
      });
      expect(result.values).toHaveLength(1);
      expect(result.values[0]).toMatchObject({
        type: 'option.single',
        contextId: '10100',
        optionId: '10001',
      });
    });

    it('passes contextId, startAt, maxResults as query params', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listContextDefaultValues('customfield_10001', {
        contextId: [10001, 10002],
        startAt: 20,
        maxResults: 10,
      });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({
        contextId: '10001,10002',
        startAt: 20,
        maxResults: 10,
      });
    });

    it('encodes fieldId with special characters in the path', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listContextDefaultValues('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/context/defaultValue`,
      );
    });

    it('sends empty query when params is provided but all sub-properties are undefined', async () => {
      // Arrange — covers the false branches of contextId/startAt/maxResults checks
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listContextDefaultValues('customfield_10001', {});

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('handles multiple polymorphic variants in values[]', async () => {
      // Arrange — spec-shape fixtures for 3 distinct variants
      const singleOption: FieldContextDefaultValueSingleOption = {
        type: 'option.single',
        contextId: '10100',
        optionId: '10001',
      };
      const multipleOption: FieldContextDefaultValueMultipleOption = {
        type: 'option.multiple',
        contextId: '10101',
        optionIds: ['10003', '10004'],
      };
      const forgeString: FieldContextDefaultValueForgeStringField = {
        type: 'forge.string',
        contextId: '10102',
        text: 'default text',
      };
      transport.respondWith({
        isLast: true,
        maxResults: 50,
        startAt: 0,
        total: 3,
        values: [singleOption, multipleOption, forgeString],
      });

      // Act
      const result = await fields.listContextDefaultValues('customfield_10001');

      // Assert
      expect(result.values).toHaveLength(3);
      expect(result.values[0]).toMatchObject({ type: 'option.single', optionId: '10001' });
      expect(result.values[1]).toMatchObject({
        type: 'option.multiple',
        optionIds: ['10003', '10004'],
      });
      expect(result.values[2]).toMatchObject({ type: 'forge.string', text: 'default text' });
    });
  });

  // ── setContextDefaultValues (B906) ────────────────────────────────────────

  describe('setContextDefaultValues()', () => {
    it('calls PUT /field/{fieldId}/context/defaultValue with option.single variant', async () => {
      // Arrange
      transport.respondWith(undefined);
      const singleOption: FieldContextDefaultValueSingleOption = {
        type: 'option.single',
        contextId: '10100',
        optionId: '10001',
      };

      // Act
      await fields.setContextDefaultValues('customfield_10001', {
        defaultValues: [singleOption],
      });

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/field/customfield_10001/context/defaultValue`,
        body: {
          defaultValues: [{ type: 'option.single', contextId: '10100', optionId: '10001' }],
        },
      });
    });

    it('sends option.cascading variant with cascadingOptionId', async () => {
      // Arrange
      transport.respondWith(undefined);
      const cascading: FieldContextDefaultValueCascadingOption = {
        type: 'option.cascading',
        contextId: '10101',
        optionId: '10002',
        cascadingOptionId: '10003',
      };

      // Act
      await fields.setContextDefaultValues('customfield_10001', {
        defaultValues: [cascading],
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        defaultValues: [
          {
            type: 'option.cascading',
            contextId: '10101',
            optionId: '10002',
            cascadingOptionId: '10003',
          },
        ],
      });
    });

    it('sends forge.string variant', async () => {
      // Arrange
      transport.respondWith(undefined);
      const forgeString: FieldContextDefaultValueForgeStringField = {
        type: 'forge.string',
        contextId: '10102',
        text: 'Hello Forge',
      };

      // Act
      await fields.setContextDefaultValues('customfield_10001', {
        defaultValues: [forgeString],
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        defaultValues: [{ type: 'forge.string', contextId: '10102', text: 'Hello Forge' }],
      });
    });

    it('sends forge.user variant with accountId and userFilter', async () => {
      // Arrange
      transport.respondWith(undefined);
      const forgeUser: FieldContextDefaultValueForgeUserField = {
        type: 'forge.user',
        contextId: '10103',
        accountId: 'abc123',
        userFilter: { enabled: true, groups: ['jira-users'] },
      };

      // Act
      await fields.setContextDefaultValues('customfield_10001', {
        defaultValues: [forgeUser],
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        defaultValues: [
          {
            type: 'forge.user',
            contextId: '10103',
            accountId: 'abc123',
            userFilter: { enabled: true, groups: ['jira-users'] },
          },
        ],
      });
    });

    it('sends float variant with number field', async () => {
      // Arrange
      transport.respondWith(undefined);
      const floatDefault: FieldContextDefaultValueFloat = {
        type: 'float',
        contextId: '10104',
        number: 3.14,
      };

      // Act
      await fields.setContextDefaultValues('customfield_10001', {
        defaultValues: [floatDefault],
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        defaultValues: [{ type: 'float', contextId: '10104', number: 3.14 }],
      });
    });

    it('sends multiple variants in a single request', async () => {
      // Arrange
      transport.respondWith(undefined);
      const singleOption: FieldContextDefaultValueSingleOption = {
        type: 'option.single',
        contextId: '10100',
        optionId: '10001',
      };
      const forgeString: FieldContextDefaultValueForgeStringField = {
        type: 'forge.string',
        contextId: '10102',
        text: 'hi',
      };

      // Act
      await fields.setContextDefaultValues('customfield_10001', {
        defaultValues: [singleOption, forgeString],
      });

      // Assert
      const body = transport.lastCall?.options.body as {
        defaultValues: { type: string }[];
      };
      expect(body.defaultValues).toHaveLength(2);
      expect(body.defaultValues[0]).toMatchObject({ type: 'option.single' });
      expect(body.defaultValues[1]).toMatchObject({ type: 'forge.string' });
    });

    it('encodes fieldId with special characters in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.setContextDefaultValues('../admin', { defaultValues: [] });

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/context/defaultValue`,
      );
    });
  });

  // ── setContextProjects (B427) ─────────────────────────────────────────────

  describe('setContextProjects()', () => {
    it('sends PUT with ProjectIds body and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.setContextProjects('customfield_10001', 10025, {
        projectIds: ['10001', '10005', '10006'],
      });

      // Assert
      expect(transport.lastCall?.options.method).toBe('PUT');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/customfield_10001/context/10025/project`,
      );
      expect(transport.lastCall?.options.body).toEqual({
        projectIds: ['10001', '10005', '10006'],
      });
    });

    it('encodes fieldId and contextId with special characters in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.setContextProjects('../admin', 10025, { projectIds: ['10001'] });

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/context/10025/project`,
      );
    });
  });

  // ── removeContextProjects (B428) ──────────────────────────────────────────

  describe('removeContextProjects()', () => {
    it('sends POST with ProjectIds body and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.removeContextProjects('customfield_10001', 10025, {
        projectIds: ['10001', '10005'],
      });

      // Assert
      expect(transport.lastCall?.options.method).toBe('POST');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/customfield_10001/context/10025/project/remove`,
      );
      expect(transport.lastCall?.options.body).toEqual({
        projectIds: ['10001', '10005'],
      });
    });

    it('encodes fieldId with special characters in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.removeContextProjects('../admin', 10025, { projectIds: ['10001'] });

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/context/10025/project/remove`,
      );
    });
  });

  // ── getContextMappings (B430) ─────────────────────────────────────────────

  describe('getContextMappings()', () => {
    it('sends POST with ProjectIssueTypeMappings body and returns paginated results', async () => {
      // Arrange
      const item: FieldContextForProjectAndIssueType = {
        contextId: '10000',
        issueTypeId: '10000',
        projectId: '10000',
      };
      transport.respondWith({
        isLast: true,
        maxResults: 50,
        startAt: 0,
        total: 1,
        values: [item],
      });

      // Act
      const result = await fields.getContextMappings('customfield_10001', {
        mappings: [
          { projectId: '10000', issueTypeId: '10000' },
          { projectId: '10000', issueTypeId: '10001' },
        ],
      });

      // Assert
      expect(transport.lastCall?.options.method).toBe('POST');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/customfield_10001/context/mapping`,
      );
      expect(transport.lastCall?.options.body).toEqual({
        mappings: [
          { projectId: '10000', issueTypeId: '10000' },
          { projectId: '10000', issueTypeId: '10001' },
        ],
      });
      expect(result.values).toHaveLength(1);
      expect(result.values[0]).toEqual({
        contextId: '10000',
        issueTypeId: '10000',
        projectId: '10000',
      });
    });

    it('passes pagination query params when provided', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 10, startAt: 5, total: 5, values: [] });

      // Act
      await fields.getContextMappings(
        'customfield_10001',
        { mappings: [{ projectId: '10001', issueTypeId: '10002' }] },
        { startAt: 5, maxResults: 10 },
      );

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 10 });
    });

    it('calls with empty params when params object has no set properties', async () => {
      // Arrange — covers params branch where startAt/maxResults are undefined
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.getContextMappings('customfield_10001', { mappings: [] }, {});

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('returns result item where contextId is null for unmatched mapping', async () => {
      // Arrange — spec example: contextId null when no context matched
      transport.respondWith({
        isLast: true,
        maxResults: 50,
        startAt: 0,
        total: 1,
        values: [{ projectId: '10000', issueTypeId: '10001', contextId: null }],
      });

      // Act
      const result = await fields.getContextMappings('customfield_10001', {
        mappings: [{ projectId: '10000', issueTypeId: '10001' }],
      });

      // Assert
      expect(result.values[0]).toMatchObject({ contextId: null });
    });

    it('encodes fieldId with special characters in the path', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.getContextMappings('../admin', { mappings: [] });

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin/context/mapping`);
    });
  });

  // ── listContextProjectMappings (B431) ─────────────────────────────────────

  describe('listContextProjectMappings()', () => {
    it('sends GET and returns paginated context-to-project mappings', async () => {
      // Arrange
      const item: FieldContextProjectMapping = {
        contextId: '10025',
        projectId: '10001',
      };
      const globalItem: FieldContextProjectMapping = {
        contextId: '10026',
        isGlobalContext: true,
      };
      transport.respondWith({
        isLast: true,
        maxResults: 100,
        startAt: 0,
        total: 2,
        values: [item, globalItem],
      });

      // Act
      const result = await fields.listContextProjectMappings('customfield_10001');

      // Assert
      expect(transport.lastCall?.options.method).toBe('GET');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/customfield_10001/context/projectmapping`,
      );
      expect(result.values).toHaveLength(2);
      expect(result.values[0]).toEqual({ contextId: '10025', projectId: '10001' });
      expect(result.values[1]).toEqual({ contextId: '10026', isGlobalContext: true });
    });

    it('passes contextId array as comma-separated query param', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listContextProjectMappings('customfield_10001', {
        contextId: [10025, 10026],
        startAt: 0,
        maxResults: 50,
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        contextId: '10025,10026',
        startAt: 0,
        maxResults: 50,
      });
    });

    it('calls without params when none given', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listContextProjectMappings('customfield_10001');

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('calls with empty params object when params has no set properties', async () => {
      // Arrange — covers params branch where contextId/startAt/maxResults are undefined
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listContextProjectMappings('customfield_10001', {});

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('encodes fieldId with special characters in the path', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listContextProjectMappings('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/context/projectmapping`,
      );
    });
  });

  // ── listFieldOptions (B433) ──────────────────────────────────────────────────

  describe('listFieldOptions()', () => {
    const makeOption = (id: number, value: string): IssueFieldOption => ({ id, value });

    it('calls GET /field/{fieldKey}/option and returns paginated results', async () => {
      // Arrange
      const opt1 = makeOption(1, 'Team 1');
      const opt2 = makeOption(2, 'Team 2');
      transport.respondWith({
        isLast: true,
        maxResults: 50,
        startAt: 0,
        total: 2,
        values: [opt1, opt2],
      });

      // Act
      const result = await fields.listFieldOptions('example-add-on__team-field');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/field/example-add-on__team-field/option`,
      });
      expect(result.values).toHaveLength(2);
      expect(result.values[0]).toMatchObject({ id: 1, value: 'Team 1' });
    });

    it('passes startAt and maxResults as query params', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 10, startAt: 5, total: 20, values: [] });

      // Act
      await fields.listFieldOptions('my-field', { startAt: 5, maxResults: 10 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 10 });
    });

    it('sends no query params when params is undefined', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listFieldOptions('my-field');

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('sends empty query when params has no set properties', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listFieldOptions('my-field', {});

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('encodes fieldKey with special characters', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listFieldOptions('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin/option`);
    });

    it.each(['.', '..', '%2e', '%2E%2E'])('rejects dot-segment fieldKey: %s', async (fieldKey) => {
      await expect(fields.listFieldOptions(fieldKey)).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── createFieldOption (B434) ─────────────────────────────────────────────────

  describe('createFieldOption()', () => {
    it('calls POST /field/{fieldKey}/option and returns the created option', async () => {
      // Arrange — spec: IssueFieldOption response (id, value required)
      const created: IssueFieldOption = { id: 1, value: 'Team 1' };
      transport.respondWith(created);
      const data: CreateIssueFieldOptionData = { value: 'Team 1' };

      // Act
      const result = await fields.createFieldOption('example-add-on__team-field', data);

      // Assert
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/field/example-add-on__team-field/option`,
        body: { value: 'Team 1' },
      });
    });

    it('sends full body including properties and config', async () => {
      // Arrange
      const created: IssueFieldOption = {
        id: 2,
        value: 'Team 2',
        properties: { members: 42 },
        config: { attributes: [] },
      };
      transport.respondWith(created);
      const data: CreateIssueFieldOptionData = {
        value: 'Team 2',
        properties: { members: 42 },
        config: { attributes: [] },
      };

      // Act
      await fields.createFieldOption('example-add-on__team-field', data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        value: 'Team 2',
        properties: { members: 42 },
        config: { attributes: [] },
      });
    });

    it('encodes fieldKey with special characters', async () => {
      // Arrange
      transport.respondWith({ id: 1, value: 'x' });

      // Act
      await fields.createFieldOption('../admin', { value: 'x' });

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin/option`);
    });
  });

  // ── deleteFieldOption (B435) ─────────────────────────────────────────────────

  describe('deleteFieldOption()', () => {
    it('calls DELETE /field/{fieldKey}/option/{optionId} — 204 (void)', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.deleteFieldOption('example-add-on__team-field', 1);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/field/example-add-on__team-field/option/1`,
      });
    });

    it('encodes fieldKey with special characters', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.deleteFieldOption('../admin', 99);

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin/option/99`);
    });

    it.each(['.', '..', '%2e'])('rejects dot-segment fieldKey: %s', async (fieldKey) => {
      await expect(fields.deleteFieldOption(fieldKey, 1)).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── getFieldOption (B436) ────────────────────────────────────────────────────

  describe('getFieldOption()', () => {
    it('calls GET /field/{fieldKey}/option/{optionId} and returns the option', async () => {
      // Arrange — spec: IssueFieldOption (id required, value required)
      const option: IssueFieldOption = {
        id: 1,
        value: 'Team 1',
        properties: { leader: { name: 'Leader Name' } },
        config: { scope: { projects: [], global: {} }, attributes: [] },
      };
      transport.respondWith(option);

      // Act
      const result = await fields.getFieldOption('example-add-on__team-field', 1);

      // Assert
      expect(result).toEqual(option);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/field/example-add-on__team-field/option/1`,
      });
    });

    it('encodes fieldKey with special characters', async () => {
      // Arrange
      transport.respondWith({ id: 1, value: 'x' });

      // Act
      await fields.getFieldOption('../admin', 5);

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin/option/5`);
    });

    it.each(['.', '..'])('rejects dot-segment fieldKey: %s', async (fieldKey) => {
      await expect(fields.getFieldOption(fieldKey, 1)).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── updateFieldOption (B437) ─────────────────────────────────────────────────

  describe('updateFieldOption()', () => {
    it('calls PUT /field/{fieldKey}/option/{optionId} and returns the updated option', async () => {
      // Arrange — spec: body and response are both IssueFieldOption (id required, value required)
      const option: IssueFieldOption = { id: 1, value: 'Team 1 Updated' };
      transport.respondWith(option);

      // Act
      const result = await fields.updateFieldOption('example-add-on__team-field', 1, option);

      // Assert
      expect(result).toEqual(option);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/field/example-add-on__team-field/option/1`,
        body: { id: 1, value: 'Team 1 Updated' },
      });
    });

    it('encodes fieldKey with special characters', async () => {
      // Arrange
      const option: IssueFieldOption = { id: 3, value: 'x' };
      transport.respondWith(option);

      // Act
      await fields.updateFieldOption('../admin', 3, option);

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin/option/3`);
    });

    it.each(['.', '..'])('rejects dot-segment fieldKey: %s', async (fieldKey) => {
      await expect(fields.updateFieldOption(fieldKey, 1, { id: 1, value: 'x' })).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── replaceFieldOptionOnIssues (B438) ────────────────────────────────────────

  describe('replaceFieldOptionOnIssues()', () => {
    it('calls DELETE /field/{fieldKey}/option/{optionId}/issue and returns task progress', async () => {
      // Arrange — spec: 303 → TaskProgressBeanRemoveOptionFromIssuesResult
      const taskResult: TaskProgressBeanRemoveOptionFromIssuesResult = {
        id: '1',
        self: 'https://example.atlassian.net/rest/api/3/task/1',
        description: 'Remove option 1 from issues',
        status: 'COMPLETE',
        progress: 100,
        elapsedRuntime: 42,
        submitted: 1718000000000,
        submittedBy: 5001,
        lastUpdate: 1718000000000,
        result: { modifiedIssues: [10001, 10010], unmodifiedIssues: [10005] },
      };
      transport.respondWith(taskResult);

      // Act
      const result = await fields.replaceFieldOptionOnIssues('example-add-on__team-field', 1, {
        replaceWith: 3,
        jql: 'project=PROJ',
      });

      // Assert
      expect(result).toEqual(taskResult);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/field/example-add-on__team-field/option/1/issue`,
        query: { replaceWith: 3, jql: 'project=PROJ' },
      });
    });

    it('sends empty query when no params provided', async () => {
      // Arrange
      transport.respondWith({
        id: '2',
        self: 'url',
        status: 'RUNNING',
        progress: 50,
        elapsedRuntime: 10,
        lastUpdate: 1718000000000,
        submitted: 1718000000000,
        submittedBy: 1,
      });

      // Act
      await fields.replaceFieldOptionOnIssues('my-field', 2);

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('passes overrideScreenSecurity and overrideEditableFlag query params', async () => {
      // Arrange — spec params: overrideScreenSecurity (default false), overrideEditableFlag (default false)
      transport.respondWith({
        id: '3',
        self: 'url',
        status: 'COMPLETE',
        progress: 100,
        elapsedRuntime: 5,
        lastUpdate: 1718000000000,
        submitted: 1718000000000,
        submittedBy: 1,
      });

      // Act
      await fields.replaceFieldOptionOnIssues('my-field', 2, {
        overrideScreenSecurity: true,
        overrideEditableFlag: false,
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        overrideScreenSecurity: true,
        overrideEditableFlag: false,
      });
    });

    it('passes only replaceWith when jql is absent', async () => {
      // Arrange
      transport.respondWith({
        id: '4',
        self: 'url',
        status: 'COMPLETE',
        progress: 100,
        elapsedRuntime: 5,
        lastUpdate: 1718000000000,
        submitted: 1718000000000,
        submittedBy: 1,
      });

      // Act
      await fields.replaceFieldOptionOnIssues('my-field', 2, { replaceWith: 5 });

      // Assert
      expect(transport.lastCall?.options.query).toEqual({ replaceWith: 5 });
    });

    it('encodes fieldKey with special characters', async () => {
      // Arrange
      transport.respondWith({
        id: '5',
        self: 'url',
        status: 'COMPLETE',
        progress: 100,
        elapsedRuntime: 5,
        lastUpdate: 1718000000000,
        submitted: 1718000000000,
        submittedBy: 1,
      });

      // Act
      await fields.replaceFieldOptionOnIssues('../admin', 1);

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin/option/1/issue`);
    });
  });

  // ── listFieldOptionSuggestionsEdit (B439) ─────────────────────────────────────

  describe('listFieldOptionSuggestionsEdit()', () => {
    it('calls GET /field/{fieldKey}/option/suggestions/edit and returns paginated results', async () => {
      // Arrange — spec: PageBeanIssueFieldOption
      const opt: IssueFieldOption = { id: 1, value: 'Team 1' };
      transport.respondWith({
        isLast: true,
        maxResults: 50,
        startAt: 0,
        total: 1,
        values: [opt],
      });

      // Act
      const result = await fields.listFieldOptionSuggestionsEdit('example-add-on__team-field');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/field/example-add-on__team-field/option/suggestions/edit`,
      });
      expect(result.values[0]).toMatchObject({ id: 1, value: 'Team 1' });
    });

    it('passes startAt, maxResults, and projectId as query params', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 25, startAt: 10, total: 0, values: [] });

      // Act
      await fields.listFieldOptionSuggestionsEdit('my-field', {
        startAt: 10,
        maxResults: 25,
        projectId: 10001,
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 10,
        maxResults: 25,
        projectId: 10001,
      });
    });

    it('sends no query params when params is undefined', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listFieldOptionSuggestionsEdit('my-field');

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('sends empty query when params has no set properties', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listFieldOptionSuggestionsEdit('my-field', {});

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('encodes fieldKey with special characters', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listFieldOptionSuggestionsEdit('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/option/suggestions/edit`,
      );
    });

    it.each(['.', '..'])('rejects dot-segment fieldKey: %s', async (fieldKey) => {
      await expect(fields.listFieldOptionSuggestionsEdit(fieldKey)).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── listFieldOptionSuggestionsSearch (B440) ───────────────────────────────────

  describe('listFieldOptionSuggestionsSearch()', () => {
    it('calls GET /field/{fieldKey}/option/suggestions/search and returns paginated results', async () => {
      // Arrange — spec: PageBeanIssueFieldOption (read only: visible options)
      const opt: IssueFieldOption = { id: 2, value: 'Team 2' };
      transport.respondWith({
        isLast: false,
        maxResults: 1,
        startAt: 0,
        total: 10,
        values: [opt],
      });

      // Act
      const result = await fields.listFieldOptionSuggestionsSearch('example-add-on__team-field');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/field/example-add-on__team-field/option/suggestions/search`,
      });
      expect(result.values[0]).toMatchObject({ id: 2, value: 'Team 2' });
    });

    it('passes startAt, maxResults, and projectId as query params', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 10, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listFieldOptionSuggestionsSearch('my-field', {
        startAt: 0,
        maxResults: 10,
        projectId: 10005,
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 0,
        maxResults: 10,
        projectId: 10005,
      });
    });

    it('sends no query params when params is undefined', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listFieldOptionSuggestionsSearch('my-field');

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('sends empty query when params has no set properties', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listFieldOptionSuggestionsSearch('my-field', {});

      // Assert
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('encodes fieldKey with special characters', async () => {
      // Arrange
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      // Act
      await fields.listFieldOptionSuggestionsSearch('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/option/suggestions/search`,
      );
    });

    it.each(['.', '..'])('rejects dot-segment fieldKey: %s', async (fieldKey) => {
      await expect(fields.listFieldOptionSuggestionsSearch(fieldKey)).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── B414: listFieldProjectAssociations ────────────────────────────────────
  describe('listFieldProjectAssociations (B414)', () => {
    it('sends GET to correct path and returns paginated project associations', async () => {
      const item: FieldProjectAssociation = { projectId: '10010' };
      transport.respondWith({
        isLast: true,
        maxResults: 50,
        startAt: 0,
        total: 1,
        values: [item],
      });

      const result = await fields.listFieldProjectAssociations('customfield_10001');

      expect(transport.lastCall?.options.method).toBe('GET');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/customfield_10001/association/project`,
      );
      expect(transport.lastCall?.options.query).toEqual({});
      expect(result.values).toEqual([item]);
    });

    it('sends pagination params when provided', async () => {
      transport.respondWith({ isLast: true, maxResults: 10, startAt: 5, total: 10, values: [] });

      await fields.listFieldProjectAssociations('customfield_10001', {
        startAt: 5,
        maxResults: 10,
      });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 10 });
    });

    it('sends no query params when params is empty object', async () => {
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      await fields.listFieldProjectAssociations('customfield_10001', {});

      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('encodes fieldId with special characters', async () => {
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      await fields.listFieldProjectAssociations('../admin');

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/field/..%2Fadmin/association/project`,
      );
    });

    it.each(['.', '..'])('rejects dot-segment fieldId: %s', async (fieldId) => {
      await expect(fields.listFieldProjectAssociations(fieldId)).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── B432: listFieldScreens ────────────────────────────────────────────────
  describe('listFieldScreens (B432)', () => {
    it('sends GET to correct path and returns paginated screens', async () => {
      const screen: ScreenWithTab = {
        id: 10001,
        name: 'Default Screen',
        tab: { id: 10000, name: 'Fields Tab' },
      };
      transport.respondWith({
        isLast: true,
        maxResults: 100,
        startAt: 0,
        total: 1,
        values: [screen],
      });

      const result = await fields.listFieldScreens('customfield_10001');

      expect(transport.lastCall?.options.method).toBe('GET');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/customfield_10001/screens`);
      expect(transport.lastCall?.options.query).toEqual({});
      expect(result.values).toEqual([screen]);
    });

    it('sends all optional params when provided', async () => {
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      await fields.listFieldScreens('customfield_10001', {
        startAt: 0,
        maxResults: 50,
        expand: 'tab',
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 0,
        maxResults: 50,
        expand: 'tab',
      });
    });

    it('sends no query params when params is empty object', async () => {
      transport.respondWith({ isLast: true, maxResults: 100, startAt: 0, total: 0, values: [] });

      await fields.listFieldScreens('customfield_10001', {});

      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('encodes fieldId with special characters', async () => {
      transport.respondWith({ isLast: true, maxResults: 100, startAt: 0, total: 0, values: [] });

      await fields.listFieldScreens('../admin');

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin/screens`);
    });

    it.each(['.', '..'])('rejects dot-segment fieldId: %s', async (fieldId) => {
      await expect(fields.listFieldScreens(fieldId)).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── B442: restoreField ────────────────────────────────────────────────────
  describe('restoreField (B442)', () => {
    it('sends POST to correct path and returns undefined', async () => {
      transport.respondWith({});

      await fields.restoreField('customfield_10001');

      expect(transport.lastCall?.options.method).toBe('POST');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/customfield_10001/restore`);
      expect(transport.lastCall?.options.body).toBeUndefined();
    });

    it('encodes id with special characters', async () => {
      transport.respondWith({});

      await fields.restoreField('../admin');

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin/restore`);
    });

    it.each(['.', '..'])('rejects dot-segment id: %s', async (id) => {
      await expect(fields.restoreField(id)).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── B443: trashField ──────────────────────────────────────────────────────
  describe('trashField (B443)', () => {
    it('sends POST to correct path and returns undefined', async () => {
      transport.respondWith({});

      await fields.trashField('customfield_10001');

      expect(transport.lastCall?.options.method).toBe('POST');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/customfield_10001/trash`);
      expect(transport.lastCall?.options.body).toBeUndefined();
    });

    it('encodes id with special characters', async () => {
      transport.respondWith({});

      await fields.trashField('../admin');

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin/trash`);
    });

    it.each(['.', '..'])('rejects dot-segment id: %s', async (id) => {
      await expect(fields.trashField(id)).rejects.toThrow('path parameter must not be "." or ".."');
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── B444: removeAssociations ──────────────────────────────────────────────
  describe('removeAssociations (B444)', () => {
    it('sends DELETE to /field/association with correct body', async () => {
      transport.respondWith({});

      const body: FieldAssociationsRequest = {
        associationContexts: [{ type: 'PROJECT_ID', identifier: 10000 }],
        fields: [{ type: 'FIELD_ID', identifier: 'customfield_10000' }],
      };
      await fields.removeAssociations(body);

      expect(transport.lastCall?.options.method).toBe('DELETE');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/association`);
      expect(transport.lastCall?.options.body).toEqual(body);
    });
  });

  // ── B445: createAssociations ──────────────────────────────────────────────
  describe('createAssociations (B445)', () => {
    it('sends PUT to /field/association with correct body', async () => {
      transport.respondWith({});

      const body: FieldAssociationsRequest = {
        associationContexts: [{ type: 'PROJECT_ID', identifier: 10000 }],
        fields: [{ type: 'FIELD_ID', identifier: 'customfield_10000' }],
      };
      await fields.createAssociations(body);

      expect(transport.lastCall?.options.method).toBe('PUT');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/association`);
      expect(transport.lastCall?.options.body).toEqual(body);
    });
  });

  // ── B447: listTrashedFields ───────────────────────────────────────────────
  describe('listTrashedFields (B447)', () => {
    it('sends GET to /field/search/trashed and returns paginated fields', async () => {
      const field = makeField('customfield_10000', 'Approvers');
      transport.respondWith({
        isLast: true,
        maxResults: 50,
        startAt: 0,
        total: 1,
        values: [field],
      });

      const result = await fields.listTrashedFields();

      expect(transport.lastCall?.options.method).toBe('GET');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/search/trashed`);
      expect(transport.lastCall?.options.query).toEqual({});
      expect(result.values).toEqual([field]);
    });

    it('sends all optional params when provided', async () => {
      transport.respondWith({ isLast: true, maxResults: 10, startAt: 0, total: 0, values: [] });

      await fields.listTrashedFields({
        startAt: 0,
        maxResults: 10,
        id: ['customfield_10000', 'customfield_10001'],
        query: 'approvers',
        expand: 'trashDate',
        orderBy: 'name',
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 0,
        maxResults: 10,
        id: 'customfield_10000,customfield_10001',
        query: 'approvers',
        expand: 'trashDate',
        orderBy: 'name',
      });
    });

    it('sends no query params when params is empty object', async () => {
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      await fields.listTrashedFields({});

      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── B446 / list() with projectIds ────────────────────────────────────────
  describe('list() with projectIds (B446)', () => {
    it('sends projectIds as comma-separated query param when provided', async () => {
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      await fields.list({ projectIds: [10001, 10002] });

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/search`);
      expect(transport.lastCall?.options.query).toMatchObject({
        projectIds: '10001,10002',
      });
    });

    it('omits projectIds when not provided', async () => {
      transport.respondWith({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

      await fields.list({});

      expect(transport.lastCall?.options.query).toEqual({});
    });
  });
});
