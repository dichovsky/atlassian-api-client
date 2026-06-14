import { describe, it, expect, beforeEach } from 'vitest';
import { IssuesResource, type CreateRemoteLinkData } from '../../src/jira/resources/issues.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';
const AGILE_BASE_URL = 'https://test.atlassian.net/rest/agile/1.0';

const makeIssue = (id: string, key: string) => ({
  id,
  key,
  self: `${BASE_URL}/issue/${key}`,
  fields: {},
});

describe('IssuesResource', () => {
  let transport: MockTransport;
  let issues: IssuesResource;
  // Alias used in sub-resource tests
  let resource: IssuesResource;

  beforeEach(() => {
    transport = new MockTransport();
    issues = new IssuesResource(transport, BASE_URL, AGILE_BASE_URL);
    resource = issues;
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /issue/{key} with no params', async () => {
      // Arrange
      const issue = makeIssue('10001', 'PROJ-1');
      transport.respondWith(issue);

      // Act
      const result = await issues.get('PROJ-1');

      // Assert
      expect(result).toEqual(issue);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1`,
      });
    });

    it('serializes fields/properties as repeated path params, expand as CSV (B1049)', async () => {
      // Arrange
      transport.respondWith(makeIssue('10001', 'PROJ-1'));

      // Act
      await issues.get('PROJ-1', {
        fields: ['summary', 'status', 'assignee'],
        expand: ['renderedFields', 'names'],
        properties: ['prop1', 'prop2'],
      });

      // Assert — `/issue/{id}` GET: `fields`/`properties` are `type: array` →
      // repeated params in the path; `expand` is `type: string` → CSV.
      expect(transport.lastCall?.options.query).toMatchObject({
        expand: 'renderedFields,names',
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('fields');
      expect(transport.lastCall?.options.query).not.toHaveProperty('properties');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/issue/PROJ-1?fields=summary&fields=status&fields=assignee&properties=prop1&properties=prop2`,
      );
    });

    it('does not include undefined query params when no options passed', async () => {
      // Arrange
      transport.respondWith(makeIssue('10001', 'PROJ-1'));

      // Act
      await issues.get('PROJ-1');

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['fields']).toBeUndefined();
      expect(query['expand']).toBeUndefined();
      expect(query['properties']).toBeUndefined();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /issue with the provided data', async () => {
      // Arrange
      const created = { id: '10001', key: 'PROJ-1', self: `${BASE_URL}/issue/PROJ-1` };
      transport.respondWith(created);
      const data = {
        fields: {
          project: { key: 'PROJ' },
          issuetype: { name: 'Bug' },
          summary: 'Fix the bug',
        },
      };

      // Act
      const result = await issues.create(data);

      // Assert
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue`,
        body: data,
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /issue/{key} with the provided data', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = { fields: { summary: 'Updated summary' } };

      // Act
      await issues.update('PROJ-1', data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issue/PROJ-1`,
        body: data,
      });
    });

    it('passes all spec query params when provided (B1056)', async () => {
      // Spec: notifyUsers, overrideScreenSecurity, overrideEditableFlag, returnIssue, expand
      transport.respondWith(undefined);
      await issues.update(
        'PROJ-1',
        { fields: {} },
        {
          notifyUsers: false,
          overrideScreenSecurity: true,
          overrideEditableFlag: true,
          returnIssue: true,
          expand: 'renderedFields',
        },
      );
      expect(transport.lastCall?.options.query).toMatchObject({
        notifyUsers: false,
        overrideScreenSecurity: true,
        overrideEditableFlag: true,
        returnIssue: true,
        expand: 'renderedFields',
      });
    });

    it('omits query params when not provided', async () => {
      transport.respondWith(undefined);
      await issues.update('PROJ-1', { fields: {} });
      const query = transport.lastCall?.options.query ?? {};
      expect(query['notifyUsers']).toBeUndefined();
      expect(query['returnIssue']).toBeUndefined();
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /issue/{key}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await issues.delete('PROJ-1');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/PROJ-1`,
      });
    });

    it('passes deleteSubtasks query param when provided (B1056)', async () => {
      // Spec: deleteSubtasks is a string enum "true" | "false", not boolean
      transport.respondWith(undefined);
      await issues.delete('PROJ-1', { deleteSubtasks: 'true' });
      expect(transport.lastCall?.options.query).toMatchObject({ deleteSubtasks: 'true' });
    });

    it('omits deleteSubtasks query param when not provided', async () => {
      transport.respondWith(undefined);
      await issues.delete('PROJ-1');
      const query = transport.lastCall?.options.query ?? {};
      expect(query['deleteSubtasks']).toBeUndefined();
    });
  });

  // ── getTransitions ────────────────────────────────────────────────────────

  describe('getTransitions()', () => {
    it('calls GET /issue/{key}/transitions and returns the transitions array', async () => {
      // Arrange
      const transitions = [
        { id: '1', name: 'To Do', to: { id: '10001', name: 'To Do' } },
        { id: '2', name: 'In Progress', to: { id: '10002', name: 'In Progress' } },
      ];
      transport.respondWith({ transitions });

      // Act
      const result = await issues.getTransitions('PROJ-1');

      // Assert
      expect(result).toEqual(transitions);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/transitions`,
      });
    });

    it('passes all spec query params when provided (B1056)', async () => {
      // Spec: expand, transitionId, skipRemoteOnlyCondition, includeUnavailableTransitions, sortByOpsBarAndStatus
      transport.respondWith({ transitions: [] });
      await issues.getTransitions('PROJ-1', {
        expand: 'transitions.fields',
        transitionId: '21',
        skipRemoteOnlyCondition: true,
        includeUnavailableTransitions: true,
        sortByOpsBarAndStatus: false,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        expand: 'transitions.fields',
        transitionId: '21',
        skipRemoteOnlyCondition: true,
        includeUnavailableTransitions: true,
        sortByOpsBarAndStatus: false,
      });
    });

    it('omits query params when not provided', async () => {
      transport.respondWith({ transitions: [] });
      await issues.getTransitions('PROJ-1');
      const query = transport.lastCall?.options.query ?? {};
      expect(query['expand']).toBeUndefined();
      expect(query['transitionId']).toBeUndefined();
    });
  });

  // ── transition ────────────────────────────────────────────────────────────

  describe('transition()', () => {
    it('calls POST /issue/{key}/transitions with transition data', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = { transition: { id: '21' } };

      // Act
      await issues.transition('PROJ-1', data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/PROJ-1/transitions`,
        body: data,
      });
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes issueIdOrKey in get()', async () => {
      transport.respondWith(makeIssue('x', 'x'));
      await issues.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/..%2Fadmin`);
    });

    it('encodes issueIdOrKey in update()', async () => {
      transport.respondWith(undefined);
      await issues.update('../admin', { fields: {} });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/..%2Fadmin`);
    });

    it('encodes issueIdOrKey in delete()', async () => {
      transport.respondWith(undefined);
      await issues.delete('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/..%2Fadmin`);
    });

    it('encodes issueIdOrKey in getTransitions()', async () => {
      transport.respondWith({ transitions: [] });
      await issues.getTransitions('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/..%2Fadmin/transitions`);
    });

    it('encodes issueIdOrKey in transition()', async () => {
      transport.respondWith(undefined);
      await issues.transition('../admin', { transition: { id: '1' } });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/..%2Fadmin/transitions`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment issueIdOrKey in get(): %s',
      async (issueIdOrKey) => {
        await expect(issues.get(issueIdOrKey)).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── Agile methods ─────────────────────────────────────────────────────────

  describe('getAgile() — B265', () => {
    it('calls GET /agile/1.0/issue/{key}', async () => {
      // Arrange
      const agileIssue = {
        id: '10001',
        key: 'PROJ-1',
        self: `${AGILE_BASE_URL}/issue/PROJ-1`,
        fields: {},
      };
      transport.respondWith(agileIssue);

      // Act
      const result = await issues.getAgile('PROJ-1');

      // Assert
      expect(result).toEqual(agileIssue);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${AGILE_BASE_URL}/issue/PROJ-1`,
      });
    });

    it('encodes issueIdOrKey in getAgile()', async () => {
      transport.respondWith({ id: 'x', key: 'x', self: 'x', fields: {} });
      await issues.getAgile('../admin');
      expect(transport.lastCall?.options.path).toBe(`${AGILE_BASE_URL}/issue/..%2Fadmin`);
    });

    it('throws ValidationError when agileBaseUrl is not configured', async () => {
      const noAgile = new IssuesResource(transport, BASE_URL);
      await expect(noAgile.getAgile('PROJ-1')).rejects.toThrow('agileBaseUrl is required');
    });

    it('passes expand and updateHistory as query params (B1056)', async () => {
      // Spec: expand (string), updateHistory (boolean), fields (array → repeated params)
      transport.respondWith({ id: '10001', key: 'PROJ-1', self: '', fields: {} });
      await issues.getAgile('PROJ-1', { expand: 'changelog', updateHistory: true });
      expect(transport.lastCall?.options.query).toMatchObject({
        expand: 'changelog',
        updateHistory: true,
      });
    });

    it('passes fields as repeated path params (type:array in agile spec) (B1056)', async () => {
      transport.respondWith({ id: '10001', key: 'PROJ-1', self: '', fields: {} });
      await issues.getAgile('PROJ-1', { fields: ['summary', 'status'] });
      // fields must be repeated params in the path, not in query
      expect(transport.lastCall?.options.path).toContain('fields=summary');
      expect(transport.lastCall?.options.path).toContain('fields=status');
      expect(transport.lastCall?.options.query ?? {}).not.toHaveProperty('fields');
    });
  });

  describe('getEstimation() — B266', () => {
    it('calls GET /agile/1.0/issue/{key}/estimation without boardId', async () => {
      // Arrange
      const estimation = { fieldId: 'story_points', value: '3' };
      transport.respondWith(estimation);

      // Act
      const result = await issues.getEstimation('PROJ-1');

      // Assert
      expect(result).toEqual(estimation);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${AGILE_BASE_URL}/issue/PROJ-1/estimation`,
      });
    });

    it('passes boardId as query param when provided', async () => {
      transport.respondWith({ fieldId: 'story_points', value: '5' });
      await issues.getEstimation('PROJ-1', { boardId: 42 });
      expect(transport.lastCall?.options.query).toMatchObject({ boardId: 42 });
    });

    it('throws ValidationError for non-positive boardId', async () => {
      await expect(issues.getEstimation('PROJ-1', { boardId: 0 })).rejects.toThrow(
        'boardId must be a positive integer',
      );
      expect(transport.calls).toHaveLength(0);
    });

    it('returns null value when no estimate set', async () => {
      const estimation = { fieldId: 'story_points', value: null };
      transport.respondWith(estimation);
      const result = await issues.getEstimation('PROJ-1');
      expect(result.value).toBeNull();
    });
  });

  describe('setEstimation() — B267', () => {
    it('calls PUT /agile/1.0/issue/{key}/estimation with value', async () => {
      // Arrange
      const estimation = { fieldId: 'story_points', value: '5' };
      transport.respondWith(estimation);

      // Act
      const result = await issues.setEstimation('PROJ-1', { value: '5' });

      // Assert
      expect(result).toEqual(estimation);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${AGILE_BASE_URL}/issue/PROJ-1/estimation`,
        body: { value: '5' },
      });
    });

    it('passes boardId as query param when provided', async () => {
      transport.respondWith({ fieldId: 'story_points', value: '8' });
      await issues.setEstimation('PROJ-2', { value: '8' }, { boardId: 10 });
      expect(transport.lastCall?.options.query).toMatchObject({ boardId: 10 });
    });

    it('supports setting estimation to null (clear estimate)', async () => {
      const estimation = { fieldId: 'story_points', value: null };
      transport.respondWith(estimation);
      const result = await issues.setEstimation('PROJ-1', { value: null });
      expect(result.value).toBeNull();
      expect(transport.lastCall?.options.body).toMatchObject({ value: null });
    });

    it('throws ValidationError for non-positive boardId', async () => {
      await expect(issues.setEstimation('PROJ-1', { value: '3' }, { boardId: -1 })).rejects.toThrow(
        'boardId must be a positive integer',
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('rank() — B268', () => {
    it('calls PUT /agile/1.0/issue/rank with issues array', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await issues.rank({ issues: ['PROJ-1', 'PROJ-2'], rankBeforeIssue: 'PROJ-3' });

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${AGILE_BASE_URL}/issue/rank`,
        body: { issues: ['PROJ-1', 'PROJ-2'], rankBeforeIssue: 'PROJ-3' },
      });
    });

    it('supports rankAfterIssue', async () => {
      transport.respondWith(undefined);
      await issues.rank({ issues: ['PROJ-1'], rankAfterIssue: 'PROJ-5' });
      expect(transport.lastCall?.options.body).toMatchObject({
        issues: ['PROJ-1'],
        rankAfterIssue: 'PROJ-5',
      });
    });

    it('supports rankCustomFieldId', async () => {
      transport.respondWith(undefined);
      await issues.rank({ issues: ['PROJ-1'], rankCustomFieldId: 10020 });
      expect(transport.lastCall?.options.body).toMatchObject({ rankCustomFieldId: 10020 });
    });

    it('throws ValidationError when issues is empty', async () => {
      await expect(issues.rank({ issues: [] })).rejects.toThrow('non-empty array');
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when an issue entry is an empty string', async () => {
      await expect(issues.rank({ issues: [''] })).rejects.toThrow('non-empty strings');
      expect(transport.calls).toHaveLength(0);
    });

    it('throws ValidationError when both rankBeforeIssue and rankAfterIssue provided', async () => {
      await expect(
        issues.rank({ issues: ['PROJ-1'], rankBeforeIssue: 'PROJ-2', rankAfterIssue: 'PROJ-3' }),
      ).rejects.toThrow('mutually exclusive');
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── assign (B478) ─────────────────────────────────────────────────────────

  describe('assign() — B478', () => {
    it('sends PUT /issue/:key/assignee with accountId', async () => {
      transport.respondWith(undefined);
      await resource.assign('PROJ-1', { accountId: 'acc-1' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issue/PROJ-1/assignee`,
        body: { accountId: 'acc-1' },
      });
    });

    it('sends null accountId to unassign', async () => {
      transport.respondWith(undefined);
      await resource.assign('PROJ-1', { accountId: null });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        body: { accountId: null },
      });
    });

    it('encodes issueIdOrKey in assign()', async () => {
      transport.respondWith(undefined);
      await resource.assign('../admin', { accountId: 'acc' });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/..%2Fadmin/assignee`);
    });
  });

  // ── getChangelog (B480) ───────────────────────────────────────────────────

  describe('getChangelog() — B480', () => {
    it('sends GET /issue/:key/changelog', async () => {
      const payload = { startAt: 0, maxResults: 50, total: 1, values: [] };
      transport.respondWith(payload);
      const result = await resource.getChangelog('PROJ-1');
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/changelog`,
      });
    });

    it('passes pagination params as query', async () => {
      transport.respondWith({ startAt: 10, maxResults: 25, total: 100, values: [] });
      await resource.getChangelog('PROJ-1', { startAt: 10, maxResults: 25 });
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('omits query params when not provided', async () => {
      transport.respondWith({ startAt: 0, maxResults: 50, total: 0, values: [] });
      await resource.getChangelog('PROJ-1');
      const query = transport.lastCall?.options.query ?? {};
      expect(query['startAt']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
    });

    it('returns isLast and nextPage from spec PageBeanChangelog (B1056)', async () => {
      // Spec: PageBeanChangelog — has isLast, nextPage, self in addition to startAt/maxResults/total/values
      const nextUrl = `${BASE_URL}/issue/PROJ-1/changelog?startAt=50`;
      transport.respondWith({
        startAt: 0,
        maxResults: 50,
        total: 100,
        values: [],
        isLast: false,
        nextPage: nextUrl,
        self: `${BASE_URL}/issue/PROJ-1/changelog`,
      });
      const result = await resource.getChangelog('PROJ-1');
      expect(result.isLast).toBe(false);
      expect(result.nextPage).toBe(nextUrl);
    });
  });

  // ── filterChangelog (B481) ────────────────────────────────────────────────

  describe('filterChangelog() — B481', () => {
    it('sends POST /issue/:key/changelog/list with changelogIds', async () => {
      // Spec: PageOfChangelogs — uses `histories[]`, not `values[]`
      const payload = { startAt: 0, maxResults: 50, total: 2, histories: [] };
      transport.respondWith(payload);
      const result = await resource.filterChangelog('PROJ-1', [10001, 10002]);
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/PROJ-1/changelog/list`,
        body: { changelogIds: [10001, 10002] },
      });
    });

    it('returns histories[] not values[] in response (B1056)', async () => {
      // Spec: PageOfChangelogs has histories[], not values[]
      const histories = [{ id: '10001', created: '2024-01-01T00:00:00.000Z', items: [] }];
      transport.respondWith({ startAt: 0, maxResults: 50, total: 1, histories });
      const result = await resource.filterChangelog('PROJ-1', [10001]);
      expect(result.histories).toEqual(histories);
    });
  });

  // ── getEditMeta (B487) ────────────────────────────────────────────────────

  describe('getEditMeta() — B487', () => {
    it('sends GET /issue/:key/editmeta', async () => {
      const payload = { fields: { summary: { required: true } } };
      transport.respondWith(payload);
      const result = await resource.getEditMeta('PROJ-1');
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/editmeta`,
      });
    });
  });

  // ── notify (B488) ─────────────────────────────────────────────────────────

  describe('notify() — B488', () => {
    it('sends POST /issue/:key/notify', async () => {
      transport.respondWith(undefined);
      const data = { subject: 'Hello', textBody: 'World' };
      await resource.notify('PROJ-1', data);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/PROJ-1/notify`,
        body: data,
      });
    });
  });

  // ── listProperties (B489) ─────────────────────────────────────────────────

  describe('listProperties() — B489', () => {
    it('sends GET /issue/:key/properties', async () => {
      const payload = { keys: [{ key: 'myProp', self: 'url' }] };
      transport.respondWith(payload);
      const result = await resource.listProperties('PROJ-1');
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/properties`,
      });
    });
  });

  // ── deleteProperty (B490) ─────────────────────────────────────────────────

  describe('deleteProperty() — B490', () => {
    it('sends DELETE /issue/:key/properties/:propertyKey', async () => {
      transport.respondWith(undefined);
      await resource.deleteProperty('PROJ-1', 'myProp');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/PROJ-1/properties/myProp`,
      });
    });

    it('encodes propertyKey', async () => {
      transport.respondWith(undefined);
      await resource.deleteProperty('PROJ-1', 'my/prop');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/issue/PROJ-1/properties/my%2Fprop`,
      );
    });

    it('throws ValidationError when propertyKey is empty', async () => {
      await expect(resource.deleteProperty('PROJ-1', '')).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
    });
  });

  // ── getProperty (B491) ────────────────────────────────────────────────────

  describe('getProperty() — B491', () => {
    it('sends GET /issue/:key/properties/:propertyKey', async () => {
      const payload = { key: 'myProp', value: { foo: 'bar' } };
      transport.respondWith(payload);
      const result = await resource.getProperty('PROJ-1', 'myProp');
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/properties/myProp`,
      });
    });

    it('throws ValidationError when propertyKey is empty', async () => {
      await expect(resource.getProperty('PROJ-1', '')).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
    });
  });

  // ── setProperty (B492) ────────────────────────────────────────────────────

  describe('setProperty() — B492', () => {
    it('sends PUT /issue/:key/properties/:propertyKey with value', async () => {
      transport.respondWith(undefined);
      await resource.setProperty('PROJ-1', 'myProp', { foo: 'bar' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issue/PROJ-1/properties/myProp`,
        body: { foo: 'bar' },
      });
    });

    it('throws ValidationError when propertyKey is empty', async () => {
      await expect(resource.setProperty('PROJ-1', '', {})).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
    });
  });

  // ── deleteAllRemoteLinks (B493) ───────────────────────────────────────────

  describe('deleteAllRemoteLinks() — B493', () => {
    it('sends DELETE /issue/:key/remotelink without params', async () => {
      transport.respondWith(undefined);
      await resource.deleteAllRemoteLinks('PROJ-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/PROJ-1/remotelink`,
      });
    });

    it('passes globalId as query param', async () => {
      transport.respondWith(undefined);
      await resource.deleteAllRemoteLinks('PROJ-1', { globalId: 'global-abc' });
      expect(transport.lastCall?.options.query).toMatchObject({ globalId: 'global-abc' });
    });
  });

  // ── listRemoteLinks (B494) ────────────────────────────────────────────────

  describe('listRemoteLinks() — B494', () => {
    it('sends GET /issue/:key/remotelink', async () => {
      const payload = [{ id: 1, relationship: 'blocks' }];
      transport.respondWith(payload);
      const result = await resource.listRemoteLinks('PROJ-1');
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/remotelink`,
      });
    });

    it('passes globalId as query param', async () => {
      transport.respondWith([]);
      await resource.listRemoteLinks('PROJ-1', { globalId: 'global-abc' });
      expect(transport.lastCall?.options.query).toMatchObject({ globalId: 'global-abc' });
    });
  });

  // ── createRemoteLink (B495) ───────────────────────────────────────────────

  describe('createRemoteLink() — B495', () => {
    it('sends POST /issue/:key/remotelink with data', async () => {
      const payload = { id: 10001, self: 'url' };
      transport.respondWith(payload);
      const data: CreateRemoteLinkData = {
        object: { url: 'https://example.com', title: 'Example' },
      };
      const result = await resource.createRemoteLink('PROJ-1', data);
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/PROJ-1/remotelink`,
        body: data,
      });
    });
  });

  // ── deleteRemoteLink (B496) ───────────────────────────────────────────────

  describe('deleteRemoteLink() — B496', () => {
    it('sends DELETE /issue/:key/remotelink/:linkId', async () => {
      transport.respondWith(undefined);
      await resource.deleteRemoteLink('PROJ-1', '10001');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/PROJ-1/remotelink/10001`,
      });
    });
  });

  // ── getRemoteLink (B497) ──────────────────────────────────────────────────

  describe('getRemoteLink() — B497', () => {
    it('sends GET /issue/:key/remotelink/:linkId', async () => {
      const payload = { id: 10001, relationship: 'blocks' };
      transport.respondWith(payload);
      const result = await resource.getRemoteLink('PROJ-1', '10001');
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/remotelink/10001`,
      });
    });
  });

  // ── updateRemoteLink (B498) ───────────────────────────────────────────────

  describe('updateRemoteLink() — B498', () => {
    it('sends PUT /issue/:key/remotelink/:linkId with data', async () => {
      transport.respondWith(undefined);
      const data: CreateRemoteLinkData = {
        object: { url: 'https://example.com', title: 'Updated' },
      };
      await resource.updateRemoteLink('PROJ-1', '10001', data);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issue/PROJ-1/remotelink/10001`,
        body: data,
      });
    });
  });

  // ── removeVote (B499) ─────────────────────────────────────────────────────

  describe('removeVote() — B499', () => {
    it('sends DELETE /issue/:key/votes', async () => {
      transport.respondWith(undefined);
      await resource.removeVote('PROJ-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/PROJ-1/votes`,
      });
    });
  });

  // ── getVotes (B500) ───────────────────────────────────────────────────────

  describe('getVotes() — B500', () => {
    it('sends GET /issue/:key/votes', async () => {
      const payload = { self: 'url', votes: 3, hasVoted: false, voters: [] };
      transport.respondWith(payload);
      const result = await resource.getVotes('PROJ-1');
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/votes`,
      });
    });
  });

  // ── addVote (B501) ────────────────────────────────────────────────────────

  describe('addVote() — B501', () => {
    it('sends POST /issue/:key/votes', async () => {
      transport.respondWith(undefined);
      await resource.addVote('PROJ-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/PROJ-1/votes`,
      });
    });

    it('sends no request body (spec has no requestBody for POST /votes) (B1056)', async () => {
      // Spec: POST /rest/api/3/issue/{issueIdOrKey}/votes has no requestBody defined
      transport.respondWith(undefined);
      await resource.addVote('PROJ-1');
      expect(transport.lastCall?.options.body).toBeUndefined();
    });
  });

  // ── removeWatcher (B502) ──────────────────────────────────────────────────

  describe('removeWatcher() — B502', () => {
    it('sends DELETE /issue/:key/watchers without params', async () => {
      transport.respondWith(undefined);
      await resource.removeWatcher('PROJ-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/PROJ-1/watchers`,
      });
    });

    it('passes accountId as query param', async () => {
      transport.respondWith(undefined);
      await resource.removeWatcher('PROJ-1', { accountId: 'acc-1' });
      expect(transport.lastCall?.options.query).toMatchObject({ accountId: 'acc-1' });
    });
  });

  // ── getWatchers (B503) ────────────────────────────────────────────────────

  describe('getWatchers() — B503', () => {
    it('sends GET /issue/:key/watchers', async () => {
      const payload = { self: 'url', isWatching: true, watchCount: 2, watchers: [] };
      transport.respondWith(payload);
      const result = await resource.getWatchers('PROJ-1');
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/watchers`,
      });
    });

    it('returns watchers with full UserDetails fields (B1056)', async () => {
      // Spec: Watchers.watchers items are UserDetails — many more fields than just accountId/displayName
      const watchers = [
        {
          accountId: 'acc-1',
          accountType: 'atlassian',
          active: true,
          displayName: 'Alice',
          emailAddress: 'alice@example.com',
          self: 'https://example.atlassian.net/rest/api/3/user?accountId=acc-1',
          avatarUrls: { '48x48': 'https://example.com/avatar.png' },
        },
      ];
      transport.respondWith({ self: 'url', isWatching: false, watchCount: 1, watchers });
      const result = await resource.getWatchers('PROJ-1');
      expect(result.watchers?.[0]).toMatchObject({
        accountId: 'acc-1',
        accountType: 'atlassian',
        active: true,
        emailAddress: 'alice@example.com',
      });
    });
  });

  // ── addWatcher (B504) ─────────────────────────────────────────────────────

  describe('addWatcher() — B504', () => {
    it('sends POST /issue/:key/watchers with accountId as body', async () => {
      transport.respondWith(undefined);
      await resource.addWatcher('PROJ-1', 'acc-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/PROJ-1/watchers`,
        body: 'acc-1',
      });
    });
  });

  // ── Worklog (B505–B515) ───────────────────────────────────────────────────

  describe('deleteAllWorklogs() — B505', () => {
    it('sends DELETE /issue/:key/worklog', async () => {
      transport.respondWith(undefined);
      await issues.deleteAllWorklogs('PROJ-1', [10001, 10002]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/PROJ-1/worklog`,
      });
    });

    it('passes adjustEstimate and overrideEditableFlag as query params (B1056)', async () => {
      // Spec: adjustEstimate (enum: "leave"|"auto"), overrideEditableFlag (boolean)
      transport.respondWith(undefined);
      await issues.deleteAllWorklogs('PROJ-1', [10001], {
        adjustEstimate: 'leave',
        overrideEditableFlag: true,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        adjustEstimate: 'leave',
        overrideEditableFlag: true,
      });
    });

    it('omits query params when not provided', async () => {
      transport.respondWith(undefined);
      await issues.deleteAllWorklogs('PROJ-1', [10001]);
      const query = transport.lastCall?.options.query ?? {};
      expect(query['adjustEstimate']).toBeUndefined();
      expect(query['overrideEditableFlag']).toBeUndefined();
    });

    it('encodes issueIdOrKey', async () => {
      transport.respondWith(undefined);
      await issues.deleteAllWorklogs('../admin', [10001]);
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/..%2Fadmin/worklog`);
    });

    it('sends the spec-required WorklogIdsRequestBean body { ids } for bulkDeleteWorklogs (#204)', async () => {
      transport.respondWith(undefined);
      await issues.deleteAllWorklogs('PROJ-1', [10001, 10002]);
      const opts = transport.lastCall?.options;
      const body = opts?.body as { ids?: unknown } | undefined;
      expect(body, 'request body must be present (spec: required)').toBeDefined();
      expect(Array.isArray(body?.ids), 'body.ids must be an array').toBe(true);
      expect(body?.ids).toEqual([10001, 10002]);
    });

    it('resolves to void on 200 partial-success (known limitation: 200 payload not surfaced)', async () => {
      // bulkDeleteWorklogs can return 200 (partial success) or 204 (full success).
      // This method returns void for both — callers cannot distinguish partial from full success.
      transport.respondWith(undefined, 200);
      const result = await issues.deleteAllWorklogs('PROJ-1', [10001]);
      expect(result).toBeUndefined();
    });
  });

  describe('listWorklogs() — B506', () => {
    it('sends GET /issue/:key/worklog', async () => {
      transport.respondWith({ startAt: 0, maxResults: 50, total: 0, worklogs: [] });
      const result = await issues.listWorklogs('PROJ-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/worklog`,
      });
      expect(result).toMatchObject({ worklogs: [] });
    });

    it('passes pagination params', async () => {
      transport.respondWith({ startAt: 10, maxResults: 5, total: 50, worklogs: [] });
      await issues.listWorklogs('PROJ-1', { startAt: 10, maxResults: 5 });
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 5 });
    });

    it('passes startedAfter/startedBefore/expand params', async () => {
      transport.respondWith({ startAt: 0, maxResults: 50, total: 0, worklogs: [] });
      await issues.listWorklogs('PROJ-1', {
        startedAfter: 1000000,
        startedBefore: 2000000,
        expand: 'properties',
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        startedAfter: 1000000,
        startedBefore: 2000000,
        expand: 'properties',
      });
    });
  });

  describe('addWorklog() — B507', () => {
    it('sends POST /issue/:key/worklog with body', async () => {
      const worklog = { id: 'wl-1', timeSpentSeconds: 3600 };
      transport.respondWith(worklog);
      const data = { timeSpentSeconds: 3600, started: '2024-01-01T09:00:00.000+0000' };
      const result = await issues.addWorklog('PROJ-1', data);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/PROJ-1/worklog`,
        body: data,
      });
      expect(result).toMatchObject({ id: 'wl-1' });
    });

    it('passes query params when provided', async () => {
      transport.respondWith({ id: 'wl-1' });
      await issues.addWorklog(
        'PROJ-1',
        { timeSpentSeconds: 3600 },
        { notifyUsers: false, adjustEstimate: 'leave', newEstimate: '2h' },
      );
      expect(transport.lastCall?.options.query).toMatchObject({
        notifyUsers: false,
        adjustEstimate: 'leave',
        newEstimate: '2h',
      });
    });

    it('passes overrideEditableFlag when provided', async () => {
      transport.respondWith({ id: 'wl-3' });
      await issues.addWorklog('PROJ-1', { timeSpentSeconds: 1800 }, { overrideEditableFlag: true });
      expect(transport.lastCall?.options.query).toMatchObject({ overrideEditableFlag: true });
    });

    it('passes reduceBy and expand when provided', async () => {
      transport.respondWith({ id: 'wl-4' });
      await issues.addWorklog(
        'PROJ-1',
        { timeSpentSeconds: 1800 },
        { reduceBy: '1h', expand: 'properties' },
      );
      expect(transport.lastCall?.options.query).toMatchObject({
        reduceBy: '1h',
        expand: 'properties',
      });
    });

    it('sends without optional params when not provided', async () => {
      transport.respondWith({ id: 'wl-2' });
      await issues.addWorklog('PROJ-2', { timeSpentSeconds: 1800 });
      const query = transport.lastCall?.options.query ?? {};
      expect(query['notifyUsers']).toBeUndefined();
    });
  });

  describe('deleteWorklog() — B508', () => {
    it('sends DELETE /issue/:key/worklog/:id', async () => {
      transport.respondWith(undefined);
      await issues.deleteWorklog('PROJ-1', 'wl-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/PROJ-1/worklog/wl-1`,
      });
    });

    it('passes query params when provided', async () => {
      transport.respondWith(undefined);
      await issues.deleteWorklog('PROJ-1', 'wl-1', {
        notifyUsers: true,
        adjustEstimate: 'manual',
        increaseBy: '1h',
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        notifyUsers: true,
        adjustEstimate: 'manual',
        increaseBy: '1h',
      });
    });

    it('passes overrideEditableFlag when provided', async () => {
      transport.respondWith(undefined);
      await issues.deleteWorklog('PROJ-1', 'wl-1', { overrideEditableFlag: true });
      expect(transport.lastCall?.options.query).toMatchObject({ overrideEditableFlag: true });
    });

    it('passes newEstimate when provided', async () => {
      transport.respondWith(undefined);
      await issues.deleteWorklog('PROJ-1', 'wl-1', { newEstimate: '2h' });
      expect(transport.lastCall?.options.query).toMatchObject({ newEstimate: '2h' });
    });

    it('encodes worklogId in path', async () => {
      transport.respondWith(undefined);
      await issues.deleteWorklog('PROJ-1', 'wl/2');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/PROJ-1/worklog/wl%2F2`);
    });
  });

  describe('getWorklog() — B509', () => {
    it('sends GET /issue/:key/worklog/:id', async () => {
      const worklog = { id: 'wl-1', timeSpentSeconds: 3600 };
      transport.respondWith(worklog);
      const result = await issues.getWorklog('PROJ-1', 'wl-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/worklog/wl-1`,
      });
      expect(result).toMatchObject({ id: 'wl-1' });
    });

    it('passes expand param when provided', async () => {
      transport.respondWith({ id: 'wl-1' });
      await issues.getWorklog('PROJ-1', 'wl-1', { expand: 'properties' });
      expect(transport.lastCall?.options.query).toMatchObject({ expand: 'properties' });
    });
  });

  describe('updateWorklog() — B510', () => {
    it('sends PUT /issue/:key/worklog/:id with body', async () => {
      const worklog = { id: 'wl-1', timeSpentSeconds: 7200 };
      transport.respondWith(worklog);
      const data = { timeSpentSeconds: 7200 };
      const result = await issues.updateWorklog('PROJ-1', 'wl-1', data);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issue/PROJ-1/worklog/wl-1`,
        body: data,
      });
      expect(result).toMatchObject({ id: 'wl-1' });
    });

    it('passes query params when provided', async () => {
      transport.respondWith({ id: 'wl-1' });
      await issues.updateWorklog(
        'PROJ-1',
        'wl-1',
        { timeSpentSeconds: 3600 },
        { notifyUsers: false, adjustEstimate: 'new', newEstimate: '1h', expand: 'properties' },
      );
      expect(transport.lastCall?.options.query).toMatchObject({
        notifyUsers: false,
        adjustEstimate: 'new',
        newEstimate: '1h',
        expand: 'properties',
      });
    });

    it('passes overrideEditableFlag when provided', async () => {
      transport.respondWith({ id: 'wl-1' });
      await issues.updateWorklog(
        'PROJ-1',
        'wl-1',
        { timeSpentSeconds: 3600 },
        { overrideEditableFlag: true },
      );
      expect(transport.lastCall?.options.query).toMatchObject({ overrideEditableFlag: true });
    });
  });

  describe('listWorklogProperties() — B511', () => {
    it('sends GET /issue/:key/worklog/:wid/properties', async () => {
      transport.respondWith({ keys: [{ key: 'prop1' }] });
      const result = await issues.listWorklogProperties('PROJ-1', 'wl-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/worklog/wl-1/properties`,
      });
      expect(result).toMatchObject({ keys: [{ key: 'prop1' }] });
    });
  });

  describe('deleteWorklogProperty() — B512', () => {
    it('sends DELETE /issue/:key/worklog/:wid/properties/:propKey', async () => {
      transport.respondWith(undefined);
      await issues.deleteWorklogProperty('PROJ-1', 'wl-1', 'myProp');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/PROJ-1/worklog/wl-1/properties/myProp`,
      });
    });

    it('encodes propertyKey', async () => {
      transport.respondWith(undefined);
      await issues.deleteWorklogProperty('PROJ-1', 'wl-1', 'prop/key');
      expect(transport.lastCall?.options.path).toContain('prop%2Fkey');
    });
  });

  describe('getWorklogProperty() — B513', () => {
    it('sends GET /issue/:key/worklog/:wid/properties/:propKey', async () => {
      const prop = { key: 'myProp', value: true };
      transport.respondWith(prop);
      const result = await issues.getWorklogProperty('PROJ-1', 'wl-1', 'myProp');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/worklog/wl-1/properties/myProp`,
      });
      expect(result).toMatchObject({ key: 'myProp', value: true });
    });
  });

  describe('setWorklogProperty() — B514', () => {
    it('sends PUT /issue/:key/worklog/:wid/properties/:propKey with value body', async () => {
      transport.respondWith(undefined);
      await issues.setWorklogProperty('PROJ-1', 'wl-1', 'myProp', true);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issue/PROJ-1/worklog/wl-1/properties/myProp`,
        body: true,
      });
    });
  });

  describe('moveWorklog() — B515', () => {
    it('sends POST /issue/:key/worklog/move with correct body', async () => {
      transport.respondWith(undefined);
      await issues.moveWorklog('PROJ-1', { ids: [10001, 10002] });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/PROJ-1/worklog/move`,
        body: { ids: [10001, 10002] },
      });
    });

    it('includes destination issueIdOrKey in body when provided', async () => {
      transport.respondWith(undefined);
      await issues.moveWorklog('PROJ-1', { ids: [10001], issueIdOrKey: 'PROJ-2' });
      expect(transport.lastCall?.options.body).toMatchObject({
        ids: [10001],
        issueIdOrKey: 'PROJ-2',
      });
    });

    it('sends adjustEstimate and overrideEditableFlag as query params', async () => {
      transport.respondWith(undefined);
      await issues.moveWorklog(
        'PROJ-1',
        { ids: [10001] },
        { adjustEstimate: 'leave', overrideEditableFlag: true },
      );
      expect(transport.lastCall?.options.query).toMatchObject({
        adjustEstimate: 'leave',
        overrideEditableFlag: true,
      });
    });
  });

  // ── Issue archive (B516, B517, B528) ─────────────────────────────────────

  describe('archiveIssues() — B516', () => {
    it('sends PUT /issue/archive with issueIdsOrKeys body', async () => {
      // Spec: IssueArchivalSyncResponse — { numberOfIssuesUpdated?, errors? }
      // (archived/failed were fictional fields; spec uses numberOfIssuesUpdated)
      transport.respondWith({ numberOfIssuesUpdated: 2, errors: {} });
      const result = await issues.archiveIssues(['PROJ-1', 'PROJ-2']);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issue/archive`,
        body: { issueIdsOrKeys: ['PROJ-1', 'PROJ-2'] },
      });
      expect(result).toMatchObject({ numberOfIssuesUpdated: 2 });
    });

    it('returns spec-shape errors when some issues fail to archive (B1056)', async () => {
      // Spec errors is an object with named error categories, not an array
      const errorsPayload = {
        issueIsSubtask: { count: 1, issueIdsOrKeys: ['ST-1'], message: 'Issue is subtask.' },
      };
      transport.respondWith({ numberOfIssuesUpdated: 1, errors: errorsPayload });
      const result = await issues.archiveIssues(['PROJ-1', 'ST-1']);
      expect(result.errors).toMatchObject(errorsPayload);
      expect(result.numberOfIssuesUpdated).toBe(1);
    });
  });

  describe('archiveIssuesByJql() — B517', () => {
    it('sends POST /issue/archive with jql body and returns spec-accurate 202 task URL (#206)', async () => {
      // Spec: POST /rest/api/3/issue/archive (operationId archiveIssuesAsync) responds 202
      // with body = a string status-check URL, NOT IssueArchiveResult.
      const statusUrl = 'https://your-domain.atlassian.net/rest/api/3/task/10010';
      transport.respondWith(statusUrl, 202);
      const result = await issues.archiveIssuesByJql('project = PROJ AND status = Done');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/archive`,
        body: { jql: 'project = PROJ AND status = Done' },
      });
      expect(typeof result).toBe('string');
      expect(result).toBe(statusUrl);
    });
  });

  describe('unarchiveIssues() — B528', () => {
    it('sends PUT /issue/unarchive with issueIdsOrKeys body', async () => {
      // Spec: IssueArchivalSyncResponse — { numberOfIssuesUpdated?, errors? }
      transport.respondWith({ numberOfIssuesUpdated: 1, errors: {} });
      const result = await issues.unarchiveIssues(['PROJ-1']);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issue/unarchive`,
        body: { issueIdsOrKeys: ['PROJ-1'] },
      });
      expect(result).toMatchObject({ numberOfIssuesUpdated: 1 });
    });
  });

  // ── Bulk fetch (B519) ─────────────────────────────────────────────────────

  describe('bulkFetch() — B519', () => {
    it('sends POST /issue/bulkfetch', async () => {
      // Spec: BulkIssueResults — { issues?, issueErrors? } (not "errors")
      transport.respondWith({ issues: [], issueErrors: [] });
      const result = await issues.bulkFetch({ issueIdsOrKeys: ['PROJ-1', 'PROJ-2'] });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/bulkfetch`,
        body: { issueIdsOrKeys: ['PROJ-1', 'PROJ-2'] },
      });
      expect(result).toMatchObject({ issues: [] });
    });

    it('returns issueErrors (not errors) in response shape (B1056)', async () => {
      // Spec: the field is issueErrors, not errors
      const issueErrors = [{ id: 'PROJ-999', errorMessage: 'Issue not found' }];
      transport.respondWith({ issues: [], issueErrors });
      const result = await issues.bulkFetch({ issueIdsOrKeys: ['PROJ-1', 'PROJ-999'] });
      expect(result.issueErrors).toEqual(issueErrors);
    });

    it('passes fields and expand when provided', async () => {
      transport.respondWith({ issues: [] });
      await issues.bulkFetch({
        issueIdsOrKeys: ['PROJ-1'],
        fields: ['summary', 'status'],
        expand: ['changelog'],
      });
      expect(transport.lastCall?.options.body).toMatchObject({
        fields: ['summary', 'status'],
        expand: ['changelog'],
      });
    });
  });

  // ── Create meta (B924, B520, B521) ───────────────────────────────────────

  describe('getCreateMeta() — B924', () => {
    it('sends GET /issue/createmeta', async () => {
      transport.respondWith({ projects: [] });
      const result = await issues.getCreateMeta();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/createmeta`,
      });
      expect(result).toMatchObject({ projects: [] });
    });

    it('sends projectKeys and projectIds as repeated params, not CSV', async () => {
      transport.respondWith({ projects: [] });
      await issues.getCreateMeta({ projectKeys: ['PROJ', 'OPS'], expand: 'projects.issuetypes' });
      const opts = transport.lastCall?.options;
      expect(opts?.path).toContain('projectKeys=PROJ');
      expect(opts?.path).toContain('projectKeys=OPS');
      expect(opts?.path).not.toContain('projectKeys=PROJ%2COPS');
      expect(opts?.path).not.toContain('projectKeys=PROJ,OPS');
      expect(opts?.query).toMatchObject({ expand: 'projects.issuetypes' });
      expect(opts?.query).not.toHaveProperty('projectKeys');
    });

    it('sends issuetypeIds and issuetypeNames as repeated params, not CSV', async () => {
      transport.respondWith({});
      await issues.getCreateMeta({
        projectIds: ['10001', '10002'],
        issuetypeIds: ['10000'],
        issuetypeNames: ['Bug'],
      });
      const opts = transport.lastCall?.options;
      expect(opts?.path).toContain('projectIds=10001');
      expect(opts?.path).toContain('projectIds=10002');
      expect(opts?.path).toContain('issuetypeIds=10000');
      expect(opts?.path).toContain('issuetypeNames=Bug');
      expect(opts?.query).not.toHaveProperty('projectIds');
      expect(opts?.query).not.toHaveProperty('issuetypeIds');
      expect(opts?.query).not.toHaveProperty('issuetypeNames');
    });
  });

  describe('getCreateMetaIssueTypes() — B520', () => {
    it('sends GET /issue/createmeta/:project/issuetypes', async () => {
      transport.respondWith({ issueTypes: [], total: 0 });
      const result = await issues.getCreateMetaIssueTypes('PROJ');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/createmeta/PROJ/issuetypes`,
      });
      expect(result).toMatchObject({ issueTypes: [] });
    });

    it('passes pagination params', async () => {
      transport.respondWith({ issueTypes: [] });
      await issues.getCreateMetaIssueTypes('PROJ', { startAt: 0, maxResults: 10 });
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 0, maxResults: 10 });
    });

    it('encodes projectIdOrKey', async () => {
      transport.respondWith({});
      await issues.getCreateMetaIssueTypes('PROJ/A');
      expect(transport.lastCall?.options.path).toContain('PROJ%2FA');
    });
  });

  describe('getCreateMetaIssueType() — B521', () => {
    it('sends GET /issue/createmeta/:project/issuetypes/:issueTypeId', async () => {
      transport.respondWith({ fields: {}, total: 0 });
      const result = await issues.getCreateMetaIssueType('PROJ', '10000');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/createmeta/PROJ/issuetypes/10000`,
      });
      expect(result).toMatchObject({ fields: {} });
    });

    it('passes pagination params', async () => {
      transport.respondWith({ fields: {} });
      await issues.getCreateMetaIssueType('PROJ', '10000', { startAt: 5, maxResults: 20 });
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 20 });
    });
  });

  // ── Issue limit report (B522) ─────────────────────────────────────────────

  describe('getLimitReport() — B522', () => {
    it('sends GET /issue/limit/report', async () => {
      // Spec: IssueLimitReportResponseBean — { issuesApproachingLimit?, issuesBreachingLimit?, limits? }
      const payload = {
        issuesApproachingLimit: { '10001': { customfield_10000: 95 } },
        issuesBreachingLimit: {},
        limits: { customfield_10000: 100 },
      };
      transport.respondWith(payload);
      const result = await issues.getLimitReport();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/limit/report`,
      });
      expect(result).toMatchObject({ limits: { customfield_10000: 100 } });
    });

    it('returns correct spec shape with issuesApproachingLimit and issuesBreachingLimit (B1056)', async () => {
      // Spec: field is issuesApproachingLimit/issuesBreachingLimit/limits, not issueIds
      const payload = {
        issuesApproachingLimit: { '10001': { customfield_10000: 95 } },
        issuesBreachingLimit: { '10002': { customfield_10000: 101 } },
        limits: { customfield_10000: 100 },
      };
      transport.respondWith(payload);
      const result = await issues.getLimitReport();
      expect(result.issuesApproachingLimit).toMatchObject({ '10001': { customfield_10000: 95 } });
      expect(result.issuesBreachingLimit).toMatchObject({ '10002': { customfield_10000: 101 } });
      expect(result.limits).toMatchObject({ customfield_10000: 100 });
    });
  });

  // ── Issue picker (B523) ───────────────────────────────────────────────────

  describe('picker() — B523', () => {
    it('sends GET /issue/picker', async () => {
      transport.respondWith({ sections: [] });
      const result = await issues.picker();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/picker`,
      });
      expect(result).toMatchObject({ sections: [] });
    });

    it('passes query params when provided', async () => {
      transport.respondWith({ sections: [] });
      await issues.picker({
        query: 'bug',
        currentJQL: 'project = PROJ',
        currentIssueKey: 'PROJ-1',
        currentProjectId: '10001',
        showSubTasks: true,
        showSubTaskParent: false,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        query: 'bug',
        currentJQL: 'project = PROJ',
        currentIssueKey: 'PROJ-1',
        currentProjectId: '10001',
        showSubTasks: true,
        showSubTaskParent: false,
      });
    });

    it('sends without optional params when not provided', async () => {
      transport.respondWith({ sections: [] });
      await issues.picker();
      const query = transport.lastCall?.options.query ?? {};
      expect(query['query']).toBeUndefined();
    });
  });

  // ── Bulk properties (B524, B527) ──────────────────────────────────────────

  describe('setPropertiesByEntityIds() — B524', () => {
    it('sends POST /issue/properties with entitiesIds and properties', async () => {
      transport.respondWith(undefined);
      await issues.setPropertiesByEntityIds({
        entitiesIds: [10001, 10002],
        properties: { flagged: true },
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/properties`,
        body: { entitiesIds: [10001, 10002], properties: { flagged: true } },
      });
    });

    it('sends empty body when no fields provided', async () => {
      transport.respondWith(undefined);
      await issues.setPropertiesByEntityIds({});
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/properties`,
      });
    });
  });

  describe('setPropertiesMulti() — B527', () => {
    it('sends POST /issue/properties/multi with issues array', async () => {
      transport.respondWith(undefined);
      await issues.setPropertiesMulti({
        issues: [{ issueID: 10001, properties: { key: 'val' } }],
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/properties/multi`,
        body: { issues: [{ issueID: 10001, properties: { key: 'val' } }] },
      });
    });
  });

  // ── Bulk watching (B529) ──────────────────────────────────────────────────

  describe('watchIssuesBulk() — B529', () => {
    it('sends POST /bulk/issues/watch with selectedIssueIdsOrKeys body and returns taskId (#207)', async () => {
      // Spec: POST /rest/api/3/bulk/issues/watch (operationId submitBulkWatch) — write endpoint.
      // The old code targeted /issue/watching (getIsWatchingIssueBulk), a READ that watches nothing.
      transport.respondWith({ taskId: 'task-123' }, 201);
      const result = await issues.watchIssuesBulk({ issueIds: ['PROJ-1', 'PROJ-2'] });
      const opts = transport.lastCall?.options;
      expect(opts?.path).toContain('/bulk/issues/watch');
      expect(opts?.body).toEqual({ selectedIssueIdsOrKeys: ['PROJ-1', 'PROJ-2'] });
      expect(result).toMatchObject({ taskId: 'task-123' });
    });
  });

  // ── Bulk watching read-check (B1022) ──────────────────────────────────────

  describe('isWatchingIssuesBulk() — B1022', () => {
    it('sends POST /issue/watching with issueIds body and returns issuesIsWatching map', async () => {
      // Spec: POST /rest/api/3/issue/watching (operationId getIsWatchingIssueBulk) — READ-ONLY.
      // Distinct from watchIssuesBulk which POSTs to /bulk/issues/watch (the write endpoint).
      transport.respondWith({ issuesIsWatching: { '10001': true, '10002': false } }, 200);
      const result = await issues.isWatchingIssuesBulk({ issueIds: ['10001', '10002'] });
      const opts = transport.lastCall?.options;
      expect(opts?.method).toBe('POST');
      expect(opts?.path).toBe(`${BASE_URL}/issue/watching`);
      expect(opts?.body).toEqual({ issueIds: ['10001', '10002'] });
      expect(result).toEqual({ issuesIsWatching: { '10001': true, '10002': false } });
    });

    it('passes issue keys as issueIds (spec accepts string IDs or keys)', async () => {
      transport.respondWith({ issuesIsWatching: { 'PROJ-1': true } }, 200);
      const result = await issues.isWatchingIssuesBulk({ issueIds: ['PROJ-1'] });
      expect(transport.lastCall?.options.body).toEqual({ issueIds: ['PROJ-1'] });
      expect(result).toMatchObject({ issuesIsWatching: { 'PROJ-1': true } });
    });
  });

  // ── Archive export (B538) ─────────────────────────────────────────────────

  describe('exportArchivedIssues() — B538', () => {
    it('sends PUT /issues/archive/export (plural issues) and returns task progress response (B1056)', async () => {
      // Spec: responds 202 with ExportArchivedIssuesTaskProgressResponse { taskId, status, progress, ... }
      const taskResponse = { taskId: '10990', status: 'ENQUEUED', progress: 0 };
      transport.respondWith(taskResponse, 202);
      const result = await issues.exportArchivedIssues({
        projects: ['PROJ'],
        reporters: ['uuid-001'],
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issues/archive/export`,
        body: { projects: ['PROJ'], reporters: ['uuid-001'] },
      });
      expect(result).toMatchObject({ taskId: '10990', status: 'ENQUEUED' });
    });

    it('accepts spec-correct filter fields: archivedBy, archivedDateRange, issueTypes, projects, reporters', async () => {
      transport.respondWith({ taskId: 'task-1', status: 'ENQUEUED', progress: 0 }, 202);
      const result = await issues.exportArchivedIssues({
        archivedBy: ['uuid-rep-001'],
        archivedDateRange: { dateAfter: '2023-01-01', dateBefore: '2023-01-12' },
        issueTypes: ['10001'],
        projects: ['FOO', 'BAR'],
        reporters: ['uuid-rep-002'],
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['archivedBy']).toEqual(['uuid-rep-001']);
      expect(body['archivedDateRange']).toMatchObject({ dateAfter: '2023-01-01' });
      expect(result.taskId).toBe('task-1');
    });

    it('still accepts deprecated jql/exportType fields (CLI compat, see DEFERRED-CLI)', async () => {
      // These are deprecated but retained to avoid breaking the CLI until it is updated
      transport.respondWith({ taskId: 'task-2', status: 'ENQUEUED', progress: 0 }, 202);
      await issues.exportArchivedIssues({ jql: 'project = PROJ', exportType: 'CSV' });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['jql']).toBe('project = PROJ');
    });
  });
});
