import { describe, it, expect, beforeEach } from 'vitest';
import { SpacesResource } from '../../src/confluence/resources/spaces.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeSpace = (id: string) => ({
  id,
  key: `KEY${id}`,
  name: `Space ${id}`,
  type: 'global',
  status: 'current',
});

describe('SpacesResource', () => {
  let transport: MockTransport;
  let spaces: SpacesResource;

  beforeEach(() => {
    transport = new MockTransport();
    spaces = new SpacesResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /spaces with no params', async () => {
      // Arrange
      const payload = { results: [makeSpace('1')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await spaces.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/spaces`,
      });
    });

    it('serializes keys array as repeated path params, not CSV (B1049)', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await spaces.list({ keys: ['KEY1', 'KEY2', 'KEY3'] });

      // Assert — `keys` is `type: array` on /spaces: repeated params in the path.
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/spaces?keys=KEY1&keys=KEY2&keys=KEY3`,
      );
      expect(transport.lastCall?.options.query).not.toHaveProperty('keys');
    });

    it('sends all supported params', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await spaces.list({
        keys: ['A'],
        type: 'global',
        status: 'current',
        limit: 10,
        cursor: 'cur',
      });

      // Assert — `keys` (type:array) is a repeated path param; `type`/`status`
      // are `type: string` and stay in the query bag (B1049).
      expect(transport.lastCall?.options.query).toMatchObject({
        type: 'global',
        status: 'current',
        limit: 10,
        cursor: 'cur',
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('keys');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/spaces?keys=A`);
    });

    it('omits undefined optional fields', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await spaces.list({ type: 'personal' });

      // Assert
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['keys']).toBeUndefined();
      expect(query['type']).toBe('personal');
    });

    it('rejects out-of-range limit', async () => {
      await expect(spaces.list({ limit: 0 })).rejects.toThrow(/limit/);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /spaces/{id}', async () => {
      // Arrange
      const space = makeSpace('42');
      transport.respondWith(space);

      // Act
      const result = await spaces.get('42');

      // Assert
      expect(result).toEqual(space);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/spaces/42`,
      });
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('iterates across multiple pages and yields all items', async () => {
      // Arrange
      transport
        .respondWith({
          results: [makeSpace('1')],
          _links: { next: '/wiki/api/v2/spaces?cursor=page2' },
        })
        .respondWith({
          results: [makeSpace('2')],
          _links: {},
        });

      // Act
      const items: { id: string }[] = [];
      for await (const space of spaces.listAll()) {
        items.push(space);
      }

      // Assert
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
      expect(transport.calls).toHaveLength(2);
    });

    it('serializes keys as repeated path params for pagination (B1049)', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      for await (const _ of spaces.listAll({ keys: ['X', 'Y'] })) {
        /* consume */
      }

      // Assert — `keys` is `type: array` → repeated params in the path.
      expect(transport.calls[0]?.options.path).toBe(`${BASE_URL}/spaces?keys=X&keys=Y`);
      expect(transport.calls[0]?.options.query).not.toHaveProperty('keys');
    });

    it('passes type, status, and limit params', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      for await (const _ of spaces.listAll({ type: 'global', status: 'current', limit: 5 })) {
        /* consume */
      }

      // Assert
      expect(transport.calls[0]?.options.query).toMatchObject({
        type: 'global',
        status: 'current',
        limit: 5,
      });
    });

    it('handles no params', async () => {
      // Arrange
      transport.respondWith({ results: [makeSpace('only')], _links: {} });

      // Act
      const items: { id: string }[] = [];
      for await (const space of spaces.listAll()) {
        items.push(space);
      }

      // Assert
      expect(items).toHaveLength(1);
    });

    it('rejects out-of-range limit', async () => {
      const gen = spaces.listAll({ limit: -1 });
      await expect(gen.next()).rejects.toThrow(/limit/);
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes special characters in id for get()', async () => {
      transport.respondWith(makeSpace('x'));
      await spaces.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/spaces/..%2Fadmin`);
    });
  });

  // ── create (B196) ─────────────────────────────────────────────────────────

  describe('create()', () => {
    it('POSTs /spaces with the minimal name-only payload', async () => {
      const space = makeSpace('999');
      transport.respondWith(space);

      const result = await spaces.create({ name: 'New Space' });

      expect(result).toEqual(space);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/spaces`,
        body: { name: 'New Space' },
      });
    });

    it('forwards key, alias, description, and roleAssignments fields verbatim', async () => {
      transport.respondWith(makeSpace('1'));

      await spaces.create({
        name: 'Engineering',
        key: 'ENG',
        alias: 'eng',
        description: { value: 'desc', representation: 'plain' },
        roleAssignments: [
          { principal: { principalType: 'USER', principalId: 'acc-1' }, roleId: 'role-admin' },
        ],
        createPrivateSpace: true,
        templateKey: 'team-space',
        copySpaceAccessConfiguration: 42,
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'Engineering',
        key: 'ENG',
        alias: 'eng',
        description: { value: 'desc', representation: 'plain' },
        roleAssignments: [
          { principal: { principalType: 'USER', principalId: 'acc-1' }, roleId: 'role-admin' },
        ],
        createPrivateSpace: true,
        templateKey: 'team-space',
        copySpaceAccessConfiguration: 42,
      });
    });
  });

  // ── blog posts in space (B197) ────────────────────────────────────────────

  describe('listBlogPosts()', () => {
    it('GETs /spaces/{id}/blogposts and forwards query params', async () => {
      transport.respondWith({ results: [], _links: {} });

      await spaces.listBlogPosts('SP-1', {
        sort: '-created-date',
        status: ['current', 'trashed'],
        title: 'Launch',
        'body-format': 'atlas_doc_format',
        cursor: 'tok',
        limit: 25,
      });

      // `status` is `type: array` → repeated params in the path (B1049).
      expect(transport.lastCall?.options.method).toBe('GET');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/spaces/SP-1/blogposts?status=current&status=trashed`,
      );
      expect(transport.lastCall?.options.query).toMatchObject({
        sort: '-created-date',
        title: 'Launch',
        'body-format': 'atlas_doc_format',
        cursor: 'tok',
        limit: 25,
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('status');
    });

    it('serializes a scalar status as a single path param', async () => {
      transport.respondWith({ results: [], _links: {} });
      await spaces.listBlogPosts('SP-1', { status: 'current' });
      expect(transport.lastCall?.options.query).not.toHaveProperty('status');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/spaces/SP-1/blogposts?status=current`,
      );
    });

    it('drops an explicit empty status array from the query bag', async () => {
      transport.respondWith({ results: [], _links: {} });
      await spaces.listBlogPosts('SP-1', { status: [] });
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['status']).toBeUndefined();
    });

    it('rejects out-of-range limit', async () => {
      await expect(spaces.listBlogPosts('SP-1', { limit: 0 })).rejects.toThrow(/limit/);
    });
  });

  describe('listBlogPostsAll()', () => {
    it('iterates multiple pages threading the cursor', async () => {
      transport
        .respondWith({
          results: [{ id: 'bp-1' }],
          _links: { next: '/wiki/api/v2/spaces/SP-1/blogposts?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'bp-2' }], _links: {} });

      const items: { id: string }[] = [];
      for await (const bp of spaces.listBlogPostsAll('SP-1', { limit: 10 })) {
        items.push(bp as { id: string });
      }

      expect(items.map((i) => i.id)).toEqual(['bp-1', 'bp-2']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toMatchObject({ limit: 10 });
    });

    it('rejects out-of-range limit', async () => {
      const gen = spaces.listBlogPostsAll('SP-1', { limit: -1 });
      await expect(gen.next()).rejects.toThrow(/limit/);
    });
  });

  // ── default classification level (B198-B200) ──────────────────────────────

  describe('getDefaultClassificationLevel() (B199)', () => {
    it('GETs /spaces/{id}/classification-level/default', async () => {
      transport.respondWith({ id: 'cl-1', name: 'Public', status: 'PUBLISHED' });

      const result = await spaces.getDefaultClassificationLevel('SP-1');

      expect(result).toEqual({ id: 'cl-1', name: 'Public', status: 'PUBLISHED' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/spaces/SP-1/classification-level/default`,
      });
    });
  });

  describe('updateDefaultClassificationLevel() (B200)', () => {
    it('PUTs /spaces/{id}/classification-level/default with body { id }', async () => {
      transport.respondWith(undefined);

      await spaces.updateDefaultClassificationLevel('SP-1', { id: 'cl-2' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/spaces/SP-1/classification-level/default`,
        body: { id: 'cl-2' },
      });
    });
  });

  describe('deleteDefaultClassificationLevel() (B198)', () => {
    it('DELETEs /spaces/{id}/classification-level/default and returns void', async () => {
      transport.respondWith(undefined);

      const result = await spaces.deleteDefaultClassificationLevel('SP-1');

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/spaces/SP-1/classification-level/default`,
      });
    });

    it('encodes unsafe path segments', async () => {
      transport.respondWith(undefined);
      await spaces.deleteDefaultClassificationLevel('foo/bar');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/spaces/foo%2Fbar/classification-level/default`,
      );
    });
  });

  // ── content labels (B201) + labels on space entity (B203) ─────────────────

  describe('listContentLabels() (B201)', () => {
    it('GETs /spaces/{id}/content/labels with all params', async () => {
      transport.respondWith({ results: [{ id: 'lbl-1', name: 'sprint' }], _links: {} });

      await spaces.listContentLabels('SP-1', {
        prefix: 'team',
        sort: '-name',
        cursor: 'tok',
        limit: 5,
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/spaces/SP-1/content/labels`,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        prefix: 'team',
        sort: '-name',
        cursor: 'tok',
        limit: 5,
      });
    });
  });

  describe('listContentLabelsAll() (B201)', () => {
    it('threads cursors and forwards params', async () => {
      transport
        .respondWith({
          results: [{ id: 'l1' }],
          _links: { next: '/wiki/api/v2/spaces/SP-1/content/labels?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'l2' }], _links: {} });

      const items: { id: string }[] = [];
      for await (const lbl of spaces.listContentLabelsAll('SP-1', { prefix: 'my' })) {
        items.push(lbl as { id: string });
      }

      expect(items.map((i) => i.id)).toEqual(['l1', 'l2']);
      expect(transport.calls[0]?.options.query).toMatchObject({ prefix: 'my' });
    });
  });

  describe('listLabels() (B203)', () => {
    it('GETs /spaces/{id}/labels with all params', async () => {
      transport.respondWith({ results: [], _links: {} });

      await spaces.listLabels('SP-1', { prefix: 'team', sort: 'name', limit: 25 });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/spaces/SP-1/labels`,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        prefix: 'team',
        sort: 'name',
        limit: 25,
      });
    });
  });

  describe('listLabelsAll() (B203)', () => {
    it('iterates pages and forwards params', async () => {
      transport
        .respondWith({
          results: [{ id: 'a' }],
          _links: { next: '/wiki/api/v2/spaces/SP-1/labels?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'b' }], _links: {} });

      const out: { id: string }[] = [];
      for await (const l of spaces.listLabelsAll('SP-1', { sort: '-name' })) {
        out.push(l as { id: string });
      }

      expect(out.map((i) => i.id)).toEqual(['a', 'b']);
      expect(transport.calls[0]?.options.query).toMatchObject({ sort: '-name' });
    });
  });

  // ── custom content (B202) ─────────────────────────────────────────────────

  describe('listCustomContent() (B202)', () => {
    it('GETs /spaces/{id}/custom-content and requires type', async () => {
      transport.respondWith({ results: [], _links: {} });

      await spaces.listCustomContent('SP-1', {
        type: 'ai.atlassian.collection',
        cursor: 'tok',
        limit: 10,
        'body-format': 'storage',
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/spaces/SP-1/custom-content`,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        type: 'ai.atlassian.collection',
        cursor: 'tok',
        limit: 10,
        'body-format': 'storage',
      });
    });

    it('rejects out-of-range limit', async () => {
      await expect(spaces.listCustomContent('SP-1', { type: 't', limit: 0 })).rejects.toThrow(
        /limit/,
      );
    });
  });

  describe('listCustomContentAll() (B202)', () => {
    it('threads cursors and forwards params', async () => {
      transport
        .respondWith({
          results: [{ id: 'cc-1' }],
          _links: { next: '/wiki/api/v2/spaces/SP-1/custom-content?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'cc-2' }], _links: {} });

      const items: { id: string }[] = [];
      for await (const cc of spaces.listCustomContentAll('SP-1', { type: 't' })) {
        items.push(cc as { id: string });
      }

      expect(items.map((i) => i.id)).toEqual(['cc-1', 'cc-2']);
      expect(transport.calls[0]?.options.query).toMatchObject({ type: 't' });
    });
  });

  // ── operations (B204) ─────────────────────────────────────────────────────

  describe('getOperations() (B204)', () => {
    it('GETs /spaces/{id}/operations with no query', async () => {
      const payload = { operations: [{ operation: 'read', targetType: 'space' }] };
      transport.respondWith(payload);

      const result = await spaces.getOperations('SP-1');

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/spaces/SP-1/operations`,
      });
    });
  });

  // ── pages in space (B205) ─────────────────────────────────────────────────

  describe('listPages() (B205)', () => {
    it('GETs /spaces/{id}/pages with all params', async () => {
      transport.respondWith({ results: [], _links: {} });

      await spaces.listPages('SP-1', {
        depth: 'root',
        sort: '-modified-date',
        status: ['current', 'archived'],
        title: 'Quarterly',
        'body-format': 'storage',
        cursor: 'tok',
        limit: 25,
      });

      // `status` is `type: array` → repeated params in the path (B1049).
      expect(transport.lastCall?.options.method).toBe('GET');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/spaces/SP-1/pages?status=current&status=archived`,
      );
      expect(transport.lastCall?.options.query).toMatchObject({
        depth: 'root',
        sort: '-modified-date',
        title: 'Quarterly',
        'body-format': 'storage',
        cursor: 'tok',
        limit: 25,
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('status');
    });

    it('serializes a scalar status as a single path param', async () => {
      transport.respondWith({ results: [], _links: {} });
      await spaces.listPages('SP-1', { status: 'current' });
      expect(transport.lastCall?.options.query).not.toHaveProperty('status');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/spaces/SP-1/pages?status=current`);
    });
  });

  describe('listPagesAll() (B205)', () => {
    it('threads cursors and forwards depth', async () => {
      transport
        .respondWith({
          results: [{ id: 'pg-1' }],
          _links: { next: '/wiki/api/v2/spaces/SP-1/pages?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'pg-2' }], _links: {} });

      const items: { id: string }[] = [];
      for await (const pg of spaces.listPagesAll('SP-1', { depth: 'all' })) {
        items.push(pg as { id: string });
      }

      expect(items.map((i) => i.id)).toEqual(['pg-1', 'pg-2']);
      expect(transport.calls[0]?.options.query).toMatchObject({ depth: 'all' });
    });
  });

  // ── permission assignments (B206) ─────────────────────────────────────────

  describe('listPermissions() (B206)', () => {
    it('GETs /spaces/{id}/permissions with pagination params', async () => {
      transport.respondWith({ results: [], _links: {} });

      await spaces.listPermissions('SP-1', { cursor: 'tok', limit: 50 });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/spaces/SP-1/permissions`,
      });
      expect(transport.lastCall?.options.query).toMatchObject({ cursor: 'tok', limit: 50 });
    });

    it('issues no query for default params', async () => {
      transport.respondWith({ results: [], _links: {} });
      await spaces.listPermissions('SP-1');
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['cursor']).toBeUndefined();
      expect(query['limit']).toBeUndefined();
    });

    it('emits only the cursor when limit is omitted', async () => {
      // Covers the `cursor` branch of `buildPermissionsQuery` independently
      // of `limit` so refactors of the shared helper cannot silently drop
      // either side of the pagination contract.
      transport.respondWith({ results: [], _links: {} });
      await spaces.listPermissions('SP-1', { cursor: 'tok' });
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['cursor']).toBe('tok');
      expect(query['limit']).toBeUndefined();
    });

    it('rejects out-of-range limit', async () => {
      await expect(spaces.listPermissions('SP-1', { limit: 0 })).rejects.toThrow(/limit/);
    });
  });

  describe('listPermissionsAll() (B206)', () => {
    it('threads cursors across pages', async () => {
      transport
        .respondWith({
          results: [{ id: 'perm-1' }],
          _links: { next: '/wiki/api/v2/spaces/SP-1/permissions?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'perm-2' }], _links: {} });

      const items: { id?: string }[] = [];
      for await (const p of spaces.listPermissionsAll('SP-1', { limit: 5 })) {
        items.push(p);
      }

      expect(items).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toMatchObject({ limit: 5 });
    });
  });

  // ── role assignments (B207-B208) ──────────────────────────────────────────

  describe('listRoleAssignments() (B207)', () => {
    it('GETs /spaces/{id}/role-assignments with all filters', async () => {
      transport.respondWith({ results: [], _links: {} });

      await spaces.listRoleAssignments('SP-1', {
        'role-id': 'role-1',
        'role-type': 'CUSTOM',
        'principal-id': 'acc-1',
        'principal-type': 'USER',
        cursor: 'tok',
        limit: 10,
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/spaces/SP-1/role-assignments`,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        'role-id': 'role-1',
        'role-type': 'CUSTOM',
        'principal-id': 'acc-1',
        'principal-type': 'USER',
        cursor: 'tok',
        limit: 10,
      });
    });
  });

  describe('listRoleAssignmentsAll() (B207)', () => {
    it('threads cursors across pages', async () => {
      transport
        .respondWith({
          results: [{ principal: { principalId: 'acc-1' } }],
          _links: { next: '/wiki/api/v2/spaces/SP-1/role-assignments?cursor=p2' },
        })
        .respondWith({ results: [{ principal: { principalId: 'acc-2' } }], _links: {} });

      const items: unknown[] = [];
      for await (const ra of spaces.listRoleAssignmentsAll('SP-1', { 'role-type': 'SYSTEM' })) {
        items.push(ra);
      }

      expect(items).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toMatchObject({ 'role-type': 'SYSTEM' });
    });
  });

  describe('setRoleAssignments() (B208)', () => {
    it('POSTs /spaces/{id}/role-assignments with the array body', async () => {
      // The server replies 200 with a `MultiEntityResult<SpaceRoleAssignment>`
      // envelope (the canonicalised post-write state); we stub a non-trivial
      // payload to lock in that the resource returns the body verbatim rather
      // than echoing the request.
      const responseBody = {
        results: [
          {
            principal: { principalType: 'USER' as const, principalId: 'acc-1-normalised' },
            roleId: 'role-1',
          },
        ],
        _links: { base: 'https://example.atlassian.net/wiki' },
      };
      transport.respondWith(responseBody);
      const data = [
        { principal: { principalType: 'USER' as const, principalId: 'acc-1' }, roleId: 'role-1' },
      ];

      const result = await spaces.setRoleAssignments('SP-1', data);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/spaces/SP-1/role-assignments`,
        body: data,
      });
      // Resource surfaces the response body so callers can diff request vs
      // server-normalised set rather than re-fetching state.
      expect(result).toEqual(responseBody);
    });
  });

  // ── space properties (B209-B213) ──────────────────────────────────────────

  describe('listProperties() (B209)', () => {
    it('GETs /spaces/{space-id}/properties with all params', async () => {
      transport.respondWith({ results: [], _links: {} });

      await spaces.listProperties('SP-1', {
        key: 'feature-flags',
        sort: 'key',
        cursor: 'tok',
        limit: 25,
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/spaces/SP-1/properties`,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        key: 'feature-flags',
        sort: 'key',
        cursor: 'tok',
        limit: 25,
      });
    });

    it('rejects out-of-range limit', async () => {
      await expect(spaces.listProperties('SP-1', { limit: 0 })).rejects.toThrow(/limit/);
    });
  });

  describe('listPropertiesAll() (B209)', () => {
    it('threads cursors across pages', async () => {
      transport
        .respondWith({
          results: [{ id: 'prop-1', key: 'k', value: 1 }],
          _links: { next: '/wiki/api/v2/spaces/SP-1/properties?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'prop-2', key: 'k', value: 2 }], _links: {} });

      const items: { id: string }[] = [];
      for await (const p of spaces.listPropertiesAll('SP-1', { key: 'k' })) {
        items.push(p as { id: string });
      }

      expect(items.map((i) => i.id)).toEqual(['prop-1', 'prop-2']);
      expect(transport.calls[0]?.options.query).toMatchObject({ key: 'k' });
    });
  });

  describe('createProperty() (B210)', () => {
    it('POSTs /spaces/{space-id}/properties', async () => {
      const created = { id: 'prop-1', key: 'k', value: 1, version: { number: 1 } };
      transport.respondWith(created);

      const result = await spaces.createProperty('SP-1', { key: 'k', value: 1 });

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/spaces/SP-1/properties`,
        body: { key: 'k', value: 1 },
      });
    });
  });

  describe('getProperty() (B212)', () => {
    it('GETs /spaces/{space-id}/properties/{property-id}', async () => {
      transport.respondWith({ id: 'prop-1', key: 'k', value: 1 });

      await spaces.getProperty('SP-1', 'prop-1');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/spaces/SP-1/properties/prop-1`,
      });
    });

    it('encodes both path segments', async () => {
      transport.respondWith({ id: 'p', key: 'k', value: 1 });
      await spaces.getProperty('with/slash', 'prop id');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/spaces/with%2Fslash/properties/prop%20id`,
      );
    });
  });

  describe('updateProperty() (B213)', () => {
    it('PUTs /spaces/{space-id}/properties/{property-id} with optimistic-concurrency body', async () => {
      const updated = { id: 'prop-1', key: 'k', value: 2, version: { number: 2 } };
      transport.respondWith(updated);

      const result = await spaces.updateProperty('SP-1', 'prop-1', {
        key: 'k',
        value: 2,
        version: { number: 2 },
      });

      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/spaces/SP-1/properties/prop-1`,
        body: { key: 'k', value: 2, version: { number: 2 } },
      });
    });
  });

  describe('deleteProperty() (B211)', () => {
    it('DELETEs /spaces/{space-id}/properties/{property-id} and returns void', async () => {
      transport.respondWith(undefined);

      const result = await spaces.deleteProperty('SP-1', 'prop-1');

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/spaces/SP-1/properties/prop-1`,
      });
    });
  });

  // ── generator + query-builder edge cases (coverage) ───────────────────────
  //
  // Each `listAll*` generator validates `limit` at the entry point — covered
  // here for every generator that wasn't already exercised with a rejecting
  // value in the happy-path tests above. The query builders also short-circuit
  // when called without params; the resource exposes those branches via
  // `*All` callers that pass `undefined`.

  describe('listAll generators reject invalid limit', () => {
    it('listContentLabelsAll rejects out-of-range limit', async () => {
      const gen = spaces.listContentLabelsAll('SP-1', { limit: -1 });
      await expect(gen.next()).rejects.toThrow(/limit/);
    });

    it('listCustomContentAll rejects out-of-range limit', async () => {
      const gen = spaces.listCustomContentAll('SP-1', { type: 't', limit: -1 });
      await expect(gen.next()).rejects.toThrow(/limit/);
    });

    it('listLabelsAll rejects out-of-range limit', async () => {
      const gen = spaces.listLabelsAll('SP-1', { limit: -1 });
      await expect(gen.next()).rejects.toThrow(/limit/);
    });

    it('listPagesAll rejects out-of-range limit', async () => {
      const gen = spaces.listPagesAll('SP-1', { limit: -1 });
      await expect(gen.next()).rejects.toThrow(/limit/);
    });

    it('listPermissionsAll rejects out-of-range limit', async () => {
      const gen = spaces.listPermissionsAll('SP-1', { limit: -1 });
      await expect(gen.next()).rejects.toThrow(/limit/);
    });

    it('listRoleAssignmentsAll rejects out-of-range limit', async () => {
      const gen = spaces.listRoleAssignmentsAll('SP-1', { limit: -1 });
      await expect(gen.next()).rejects.toThrow(/limit/);
    });

    it('listPropertiesAll rejects out-of-range limit', async () => {
      const gen = spaces.listPropertiesAll('SP-1', { limit: -1 });
      await expect(gen.next()).rejects.toThrow(/limit/);
    });
  });

  describe('listAll generators with no params hit the undefined short-circuit', () => {
    it('listBlogPostsAll() — bare call', async () => {
      transport.respondWith({ results: [{ id: 'bp-only' }], _links: {} });
      const out: { id: string }[] = [];
      for await (const bp of spaces.listBlogPostsAll('SP-1')) {
        out.push(bp as { id: string });
      }
      expect(out).toHaveLength(1);
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listPagesAll() — bare call', async () => {
      transport.respondWith({ results: [{ id: 'pg-only' }], _links: {} });
      const out: { id: string }[] = [];
      for await (const p of spaces.listPagesAll('SP-1')) {
        out.push(p as { id: string });
      }
      expect(out).toHaveLength(1);
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listLabelsAll() — bare call', async () => {
      transport.respondWith({ results: [{ id: 'l-only' }], _links: {} });
      const out: { id: string }[] = [];
      for await (const l of spaces.listLabelsAll('SP-1')) {
        out.push(l as { id: string });
      }
      expect(out).toHaveLength(1);
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listContentLabelsAll() — bare call', async () => {
      transport.respondWith({ results: [{ id: 'cl-only' }], _links: {} });
      const out: { id: string }[] = [];
      for await (const l of spaces.listContentLabelsAll('SP-1')) {
        out.push(l as { id: string });
      }
      expect(out).toHaveLength(1);
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listRoleAssignmentsAll() — bare call', async () => {
      transport.respondWith({ results: [{ roleId: 'role-only' }], _links: {} });
      const out: unknown[] = [];
      for await (const r of spaces.listRoleAssignmentsAll('SP-1')) {
        out.push(r);
      }
      expect(out).toHaveLength(1);
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  describe('listPropertiesAll() forwards optional sort + limit (B209)', () => {
    it('emits sort and limit in the query bag', async () => {
      transport.respondWith({ results: [{ id: 'p-only' }], _links: {} });
      const out: { id: string }[] = [];
      for await (const p of spaces.listPropertiesAll('SP-1', { sort: '-key', limit: 5 })) {
        out.push(p as { id: string });
      }
      expect(out).toHaveLength(1);
      expect(transport.lastCall?.options.query).toMatchObject({ sort: '-key', limit: 5 });
    });

    it('listProperties() called without sort omits it but still forwards limit', async () => {
      transport.respondWith({ results: [], _links: {} });
      await spaces.listProperties('SP-1', { limit: 3 });
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['limit']).toBe(3);
      expect(query['sort']).toBeUndefined();
    });
  });

  describe('listPermissionsAll() bare call (coverage)', () => {
    it('omits limit from query when called with no params', async () => {
      transport.respondWith({ results: [{ id: 'perm-only' }], _links: {} });
      const out: { id?: string }[] = [];
      for await (const p of spaces.listPermissionsAll('SP-1')) {
        out.push(p);
      }
      expect(out).toHaveLength(1);
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  describe('listRoleAssignments() partial filter (coverage)', () => {
    it('forwards only role-id when role-type omitted', async () => {
      transport.respondWith({ results: [], _links: {} });
      await spaces.listRoleAssignments('SP-1', { 'role-id': 'role-1' });
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['role-id']).toBe('role-1');
      expect(query['role-type']).toBeUndefined();
    });
  });

  // ── B1059: SpaceProperty response shape ───────────────────────────────────

  describe('B1059 — SpaceProperty response has createdAt, createdBy, version.createdAt/createdBy', () => {
    it('getProperty returns SpaceProperty with full audit fields', async () => {
      // Arrange — spec SpaceProperty adds createdAt/createdBy + richer version
      const spaceProperty = {
        id: 'sp-1',
        key: 'my-key',
        value: { enabled: true },
        createdAt: '2026-01-01T00:00:00.000Z',
        createdBy: 'acc-abc123',
        version: {
          number: 2,
          message: 'second edit',
          createdAt: '2026-01-02T00:00:00.000Z',
          createdBy: 'acc-xyz456',
        },
      };
      transport.respondWith(spaceProperty);

      // Act
      const result = await spaces.getProperty('SP-1', 'sp-1');

      // Assert — full SpaceProperty shape passes through
      expect(result).toEqual(spaceProperty);
      expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
      expect(result.createdBy).toBe('acc-abc123');
      expect(result.version?.createdAt).toBe('2026-01-02T00:00:00.000Z');
      expect(result.version?.createdBy).toBe('acc-xyz456');
    });

    it('createProperty returns SpaceProperty shape', async () => {
      // Arrange
      const created = {
        id: 'sp-new',
        key: 'feat-flag',
        value: 'on',
        createdAt: '2026-06-15T10:00:00.000Z',
        createdBy: 'acc-creator',
        version: { number: 1, createdAt: '2026-06-15T10:00:00.000Z', createdBy: 'acc-creator' },
      };
      transport.respondWith(created);

      // Act — CreateContentPropertyData: spec marks key/value optional
      const result = await spaces.createProperty('SP-1', { key: 'feat-flag', value: 'on' });

      // Assert
      expect(result.createdBy).toBe('acc-creator');
      expect(result.version?.createdBy).toBe('acc-creator');
    });
  });
});
