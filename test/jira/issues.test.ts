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

    it('calls GET /issue/{key} with fields, expand, and properties joined by commas', async () => {
      // Arrange
      transport.respondWith(makeIssue('10001', 'PROJ-1'));

      // Act
      await issues.get('PROJ-1', {
        fields: ['summary', 'status', 'assignee'],
        expand: ['renderedFields', 'names'],
        properties: ['prop1', 'prop2'],
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        fields: 'summary,status,assignee',
        expand: 'renderedFields,names',
        properties: 'prop1,prop2',
      });
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
  });

  // ── filterChangelog (B481) ────────────────────────────────────────────────

  describe('filterChangelog() — B481', () => {
    it('sends POST /issue/:key/changelog/list with changelogIds', async () => {
      const payload = { startAt: 0, maxResults: 50, total: 2, values: [] };
      transport.respondWith(payload);
      const result = await resource.filterChangelog('PROJ-1', [10001, 10002]);
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/PROJ-1/changelog/list`,
        body: { changelogIds: [10001, 10002] },
      });
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
});
