import { describe, it, expect, beforeEach } from 'vitest';
import { GroupUserPickerResource } from '../../src/jira/resources/group-user-picker.js';
import type {
  GroupUserPickerResponse,
  GroupSuggestion,
  UserSuggestion,
} from '../../src/jira/resources/group-user-picker.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

/** Build a spec-conformant FoundUsersAndGroups response. */
const makePickerResponse = (): GroupUserPickerResponse => ({
  groups: {
    groups: [
      {
        groupId: 'grp-1',
        name: 'developers',
        html: '<b>dev</b>elopers',
        avatarUrl: 'https://example.com/avatar.png',
        managedBy: 'ADMINS',
        usageType: 'USERBASE_GROUP',
        labels: [{ text: 'Admin', title: 'Admin group', type: 'ADMIN' }],
      } satisfies GroupSuggestion,
    ],
    header: 'Showing 1 of 1 matching groups',
    total: 1,
  },
  users: {
    users: [
      {
        accountId: 'acc-1',
        displayName: 'Alice',
        html: '<b>Al</b>ice',
        avatarUrl: 'https://example.com/alice.png',
        accountType: 'atlassian',
      } satisfies UserSuggestion,
    ],
    header: 'Showing 1 of 1 matching users',
    total: 1,
  },
});

describe('GroupUserPickerResource', () => {
  let transport: MockTransport;
  let picker: GroupUserPickerResource;

  beforeEach(() => {
    transport = new MockTransport();
    picker = new GroupUserPickerResource(transport, BASE_URL);
  });

  // ── pick ──────────────────────────────────────────────────────────────────

  describe('pick()', () => {
    it('calls GET /groupuserpicker with no params and returns response', async () => {
      const response = makePickerResponse();
      transport.respondWith(response);

      const result = await picker.pick();

      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/groupuserpicker`,
      });
    });

    it('response shape matches spec FoundUsersAndGroups (groups+users sections only, no top-level header/total)', async () => {
      // Spec FoundUsersAndGroups: only `groups` (FoundGroups) and `users` (FoundUsers).
      // header and total belong inside each section, NOT at the top level.
      const response = makePickerResponse();
      transport.respondWith(response);

      const result = await picker.pick({ query: 'dev' });

      expect(result).toHaveProperty('groups');
      expect(result).toHaveProperty('users');
      expect(result).not.toHaveProperty('header');
      expect(result).not.toHaveProperty('total');
    });

    it('FoundGroups section has header, total, and groups array (not label/sub/id/msg)', async () => {
      // Spec FoundGroups: groups[], header?, total? — no label, sub, id, msg fields.
      const response = makePickerResponse();
      transport.respondWith(response);

      const result = await picker.pick({ query: 'dev' });

      expect(result.groups).toHaveProperty('groups');
      expect(result.groups).toHaveProperty('header');
      expect(result.groups).toHaveProperty('total');
      expect(result.groups).not.toHaveProperty('label');
      expect(result.groups).not.toHaveProperty('sub');
      expect(result.groups).not.toHaveProperty('id');
      expect(result.groups).not.toHaveProperty('msg');
    });

    it('FoundUsers section has header, total, and users array (not label/sub/id/msg)', async () => {
      // Spec FoundUsers: header?, total?, users[] — no label, sub, id, msg fields.
      const response = makePickerResponse();
      transport.respondWith(response);

      const result = await picker.pick({ query: 'alice' });

      expect(result.users).toHaveProperty('users');
      expect(result.users).toHaveProperty('header');
      expect(result.users).toHaveProperty('total');
      expect(result.users).not.toHaveProperty('label');
      expect(result.users).not.toHaveProperty('sub');
      expect(result.users).not.toHaveProperty('id');
      expect(result.users).not.toHaveProperty('msg');
    });

    it('GroupSuggestion includes spec fields: avatarUrl, labels, managedBy, usageType', async () => {
      // Spec FoundGroup: groupId, name, html, avatarUrl, labels, managedBy, usageType.
      const response = makePickerResponse();
      transport.respondWith(response);

      const result = await picker.pick({ query: 'dev' });
      const group = result.groups?.groups?.[0];

      expect(group).toHaveProperty('groupId', 'grp-1');
      expect(group).toHaveProperty('avatarUrl');
      expect(group).toHaveProperty('managedBy', 'ADMINS');
      expect(group).toHaveProperty('usageType', 'USERBASE_GROUP');
      expect(group).toHaveProperty('labels');
    });

    it('UserSuggestion includes spec fields: accountType, key, name', async () => {
      // Spec UserPickerUser: accountId, accountType, avatarUrl, displayName, html, key, name.
      const response: GroupUserPickerResponse = {
        ...makePickerResponse(),
        users: {
          users: [
            {
              accountId: 'acc-1',
              displayName: 'Alice',
              accountType: 'atlassian',
              key: 'alice-key',
              name: 'alice',
            },
          ],
          header: 'Showing 1 user',
          total: 1,
        },
      };
      transport.respondWith(response);

      const result = await picker.pick({ query: 'alice' });
      const user = result.users?.users?.[0];

      expect(user).toHaveProperty('accountType', 'atlassian');
      expect(user).toHaveProperty('key', 'alice-key');
      expect(user).toHaveProperty('name', 'alice');
    });

    it('forwards query param', async () => {
      transport.respondWith(makePickerResponse());

      await picker.pick({ query: 'alice' });

      expect(transport.lastCall?.options.query).toMatchObject({ query: 'alice' });
    });

    it('forwards maxResults param', async () => {
      transport.respondWith(makePickerResponse());

      await picker.pick({ query: 'dev', maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ maxResults: 25 });
    });

    it('forwards showAvatar param', async () => {
      transport.respondWith(makePickerResponse());

      await picker.pick({ query: 'dev', showAvatar: true });

      expect(transport.lastCall?.options.query).toMatchObject({ showAvatar: true });
    });

    it('forwards avatarSize param (new spec param)', async () => {
      // Spec: avatarSize is a query param with specific enum values.
      transport.respondWith(makePickerResponse());

      await picker.pick({ query: 'dev', avatarSize: 'medium' });

      expect(transport.lastCall?.options.query).toMatchObject({ avatarSize: 'medium' });
    });

    it('forwards caseInsensitive param (new spec param)', async () => {
      // Spec: caseInsensitive controls whether group name matching is case-insensitive.
      transport.respondWith(makePickerResponse());

      await picker.pick({ query: 'dev', caseInsensitive: true });

      expect(transport.lastCall?.options.query).toMatchObject({ caseInsensitive: true });
    });

    it('forwards projectId array as repeated query params in path, not CSV', async () => {
      // Spec: projectId is type:array, sent as repeated params.
      transport.respondWith(makePickerResponse());

      await picker.pick({ query: 'dev', projectId: ['10001', '10002'] });

      const path = transport.lastCall?.options.path as string;
      expect(path).toContain('projectId=10001');
      expect(path).toContain('projectId=10002');
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('projectId');
    });

    it('forwards issueTypeId array as repeated query params in path (new spec param)', async () => {
      // Spec: issueTypeId is type:array — must be repeated params, not CSV.
      transport.respondWith(makePickerResponse());

      await picker.pick({ query: 'dev', issueTypeId: ['10000', '10001'] });

      const path = transport.lastCall?.options.path as string;
      expect(path).toContain('issueTypeId=10000');
      expect(path).toContain('issueTypeId=10001');
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('issueTypeId');
    });

    it('does NOT emit projectRole — not a spec param for GET /groupuserpicker', async () => {
      // projectRole is NOT in the spec for GET /groupuserpicker.
      // Prior code emitted it on the wire; now it must be suppressed.
      transport.respondWith(makePickerResponse());

      // Pass via cast since TypeScript correctly rejects projectRole now
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await picker.pick({ query: 'dev', projectRole: 'Developer' } as any);

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('projectRole');
      const path = transport.lastCall?.options.path as string;
      expect(path).not.toContain('projectRole');
    });

    it('forwards fieldId as scalar query param', async () => {
      transport.respondWith(makePickerResponse());

      await picker.pick({ query: 'dev', fieldId: 'customfield_10050' });

      expect(transport.lastCall?.options.query).toMatchObject({ fieldId: 'customfield_10050' });
    });

    it('does NOT emit excludeAccountIds — deprecated, not a valid param on GET /groupuserpicker', async () => {
      // The /groupuserpicker spec has no excludeAccountIds param.
      transport.respondWith(makePickerResponse());

      await picker.pick({ query: 'alice', excludeAccountIds: ['acc-1', 'acc-2'] });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('excludeAccountIds');
      const path = transport.lastCall?.options.path as string;
      expect(path).not.toContain('excludeAccountIds');
    });

    it('maps excludeConnectUsers to the excludeConnectAddons wire param', async () => {
      transport.respondWith(makePickerResponse());

      await picker.pick({ query: 'dev', excludeConnectUsers: true });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).toMatchObject({ excludeConnectAddons: true });
      expect(query).not.toHaveProperty('excludeConnectUsers');
    });

    it('omits undefined params from query', async () => {
      transport.respondWith(makePickerResponse());

      await picker.pick({ query: 'eng' });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('maxResults');
      expect(query).not.toHaveProperty('projectId');
      expect(query).not.toHaveProperty('issueTypeId');
      expect(query).not.toHaveProperty('avatarSize');
      expect(query).not.toHaveProperty('caseInsensitive');
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('network error'));

      await expect(picker.pick()).rejects.toThrow('network error');
    });
  });
});
