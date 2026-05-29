import { describe, it, expect, beforeEach } from 'vitest';
import { IssueSecuritySchemesResource } from '../../src/jira/resources/issuesecurityschemes.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeScheme = (id = 10001, name = 'My Security Scheme') => ({
  id,
  name,
  description: 'A test scheme',
  self: `${BASE_URL}/issuesecurityschemes/${id}`,
});

const makeLevel = (id = '10100', name = 'Public') => ({
  id,
  name,
  description: 'A test level',
  isDefault: false,
  schemeId: '10001',
});

const makeMember = (id = '10200') => ({
  id,
  issueSecurityLevelId: '10100',
  issueSecuritySchemeId: '10001',
});

const makePageOf = <T>(values: T[], startAt = 0, total = values.length) => ({
  values,
  startAt,
  maxResults: 50,
  total,
  isLast: true,
});

describe('IssueSecuritySchemesResource', () => {
  let transport: MockTransport;
  let resource: IssueSecuritySchemesResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new IssueSecuritySchemesResource(transport, BASE_URL);
  });

  // ── B539: getAll ───────────────────────────────────────────────────────────

  describe('getAll()', () => {
    it('calls GET /issuesecurityschemes with no params', async () => {
      const resp = { issueSecuritySchemes: [makeScheme()] };
      transport.respondWith(resp);

      const result = await resource.getAll();

      expect(result).toEqual(resp);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuesecurityschemes`,
      });
    });

    it('forwards id and projectId filters', async () => {
      transport.respondWith({ issueSecuritySchemes: [] });

      await resource.getAll({ id: ['10001', '10002'], projectId: ['10100'] });

      expect(transport.lastCall?.options.query).toMatchObject({
        id: '10001,10002',
        projectId: '10100',
      });
    });

    it('forwards onlyDefault flag', async () => {
      transport.respondWith({ issueSecuritySchemes: [] });

      await resource.getAll({ onlyDefault: true });

      expect(transport.lastCall?.options.query).toMatchObject({ onlyDefault: true });
    });

    it('forwards expand param', async () => {
      transport.respondWith({ issueSecuritySchemes: [] });

      await resource.getAll({ expand: 'levels' });

      expect(transport.lastCall?.options.query).toMatchObject({ expand: 'levels' });
    });

    it('forwards startAt and maxResults to getAll', async () => {
      transport.respondWith({ issueSecuritySchemes: [] });

      await resource.getAll({ startAt: 10, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('omits empty id array', async () => {
      transport.respondWith({ issueSecuritySchemes: [] });

      await resource.getAll({ id: [] });

      expect(transport.lastCall?.options.query?.['id']).toBeUndefined();
    });
  });

  // ── B540: create ───────────────────────────────────────────────────────────

  describe('create()', () => {
    it('POSTs with required name', async () => {
      const created = makeScheme();
      transport.respondWith(created);

      const result = await resource.create({ name: 'My Security Scheme' });

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issuesecurityschemes`,
        body: { name: 'My Security Scheme' },
      });
    });

    it('includes optional description', async () => {
      transport.respondWith(makeScheme());

      await resource.create({ name: 'My Scheme', description: 'A description' });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'My Scheme',
        description: 'A description',
      });
    });

    it('includes optional levels', async () => {
      transport.respondWith(makeScheme());
      const levels = [{ name: 'Public', isDefault: true }];

      await resource.create({ name: 'My Scheme', levels });

      expect(transport.lastCall?.options.body).toMatchObject({ levels });
    });

    it('omits description when not provided', async () => {
      transport.respondWith(makeScheme());

      await resource.create({ name: 'Minimal' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('description');
    });
  });

  // ── B541: get ──────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /issuesecurityschemes/{id}', async () => {
      const scheme = makeScheme();
      transport.respondWith(scheme);

      const result = await resource.get('10001');

      expect(result).toEqual(scheme);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuesecurityschemes/10001`,
      });
    });
  });

  // ── B542: update ───────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /issuesecurityschemes/{id} with name', async () => {
      transport.respondWith(undefined);

      await resource.update('10001', { name: 'Renamed' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuesecurityschemes/10001`,
        body: { name: 'Renamed' },
      });
    });

    it('includes description when provided', async () => {
      transport.respondWith(undefined);

      await resource.update('10001', { name: 'X', description: 'Updated' });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'X',
        description: 'Updated',
      });
    });

    it('omits undefined fields from body', async () => {
      transport.respondWith(undefined);

      await resource.update('10001', { description: 'Only desc' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('name');
      expect(transport.lastCall?.options.body).toHaveProperty('description', 'Only desc');
    });
  });

  // ── B543: listMembers ──────────────────────────────────────────────────────

  describe('listMembers()', () => {
    it('calls GET /issuesecurityschemes/{id}/members', async () => {
      const page = makePageOf([makeMember()]);
      transport.respondWith(page);

      const result = await resource.listMembers('10001');

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuesecurityschemes/10001/members`,
      });
    });

    it('forwards issueSecurityLevelId filter', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listMembers('10001', { issueSecurityLevelId: ['10100', '10101'] });

      expect(transport.lastCall?.options.query).toMatchObject({
        issueSecurityLevelId: '10100,10101',
      });
    });

    it('forwards expand param', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listMembers('10001', { expand: 'all' });

      expect(transport.lastCall?.options.query).toMatchObject({ expand: 'all' });
    });

    it('forwards pagination params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listMembers('10001', { startAt: 5, maxResults: 20 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 20 });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.listMembers('10001', { maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── B543: listMembersAll ───────────────────────────────────────────────────

  describe('listMembersAll()', () => {
    it('yields items from paginated response', async () => {
      const member = makeMember();
      transport.respondWith(makePageOf([member]));

      const results: unknown[] = [];
      for await (const item of resource.listMembersAll('10001')) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(member);
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [makeMember('10200')],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeMember('10201')],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: unknown[] = [];
      for await (const item of resource.listMembersAll('10001')) {
        results.push(item);
      }

      expect(results).toHaveLength(2);
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listMembersAll('10001', { maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── B544: delete ───────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /issuesecurityschemes/{schemeId}', async () => {
      transport.respondWith(undefined);

      await resource.delete('10001');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issuesecurityschemes/10001`,
      });
    });
  });

  // ── B545: addLevels ────────────────────────────────────────────────────────

  describe('addLevels()', () => {
    it('calls PUT /issuesecurityschemes/{schemeId}/level with levels', async () => {
      transport.respondWith(undefined);
      const levels = [{ name: 'New Level' }];

      await resource.addLevels('10001', { levels });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuesecurityschemes/10001/level`,
        body: { levels },
      });
    });

    it('sends empty body when no levels provided', async () => {
      transport.respondWith(undefined);

      await resource.addLevels('10001', {});

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuesecurityschemes/10001/level`,
        body: {},
      });
    });
  });

  // ── B546: removeLevel ──────────────────────────────────────────────────────

  describe('removeLevel()', () => {
    it('calls DELETE /issuesecurityschemes/{schemeId}/level/{levelId}', async () => {
      transport.respondWith(undefined);

      await resource.removeLevel('10001', '10100');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issuesecurityschemes/10001/level/10100`,
      });
    });

    it('forwards replaceWith query param', async () => {
      transport.respondWith(undefined);

      await resource.removeLevel('10001', '10100', { replaceWith: '10101' });

      expect(transport.lastCall?.options.query).toMatchObject({ replaceWith: '10101' });
    });

    it('omits replaceWith when not provided', async () => {
      transport.respondWith(undefined);

      await resource.removeLevel('10001', '10100');

      expect(transport.lastCall?.options.query?.['replaceWith']).toBeUndefined();
    });
  });

  // ── B547: updateLevel ──────────────────────────────────────────────────────

  describe('updateLevel()', () => {
    it('calls PUT /issuesecurityschemes/{schemeId}/level/{levelId} with name', async () => {
      transport.respondWith(undefined);

      await resource.updateLevel('10001', '10100', { name: 'Renamed' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuesecurityschemes/10001/level/10100`,
        body: { name: 'Renamed' },
      });
    });

    it('includes description when provided', async () => {
      transport.respondWith(undefined);

      await resource.updateLevel('10001', '10100', {
        name: 'X',
        description: 'Updated desc',
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'X',
        description: 'Updated desc',
      });
    });

    it('omits undefined fields', async () => {
      transport.respondWith(undefined);

      await resource.updateLevel('10001', '10100', { description: 'Only desc' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('name');
    });
  });

  // ── B548: addLevelMembers ──────────────────────────────────────────────────

  describe('addLevelMembers()', () => {
    it('calls PUT /issuesecurityschemes/{schemeId}/level/{levelId}/member', async () => {
      transport.respondWith(undefined);
      const members = [{ type: 'reporter' }];

      await resource.addLevelMembers('10001', '10100', { members });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuesecurityschemes/10001/level/10100/member`,
        body: { members },
      });
    });

    it('sends empty body when members not provided', async () => {
      transport.respondWith(undefined);

      await resource.addLevelMembers('10001', '10100', {});

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuesecurityschemes/10001/level/10100/member`,
        body: {},
      });
    });
  });

  // ── B549: removeLevelMember ────────────────────────────────────────────────

  describe('removeLevelMember()', () => {
    it('calls DELETE /issuesecurityschemes/{schemeId}/level/{levelId}/member/{memberId}', async () => {
      transport.respondWith(undefined);

      await resource.removeLevelMember('10001', '10100', '10200');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issuesecurityschemes/10001/level/10100/member/10200`,
      });
    });
  });

  // ── B550: listLevels ───────────────────────────────────────────────────────

  describe('listLevels()', () => {
    it('calls GET /issuesecurityschemes/level with no params', async () => {
      const page = makePageOf([makeLevel()]);
      transport.respondWith(page);

      const result = await resource.listLevels();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuesecurityschemes/level`,
      });
    });

    it('forwards id and schemeId filters', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listLevels({ id: ['10100'], schemeId: ['10001', '10002'] });

      expect(transport.lastCall?.options.query).toMatchObject({
        id: '10100',
        schemeId: '10001,10002',
      });
    });

    it('forwards onlyDefault flag', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listLevels({ onlyDefault: true });

      expect(transport.lastCall?.options.query).toMatchObject({ onlyDefault: true });
    });

    it('forwards pagination params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listLevels({ startAt: 10, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.listLevels({ maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── B550: listLevelsAll ────────────────────────────────────────────────────

  describe('listLevelsAll()', () => {
    it('yields items from paginated response', async () => {
      transport.respondWith(makePageOf([makeLevel()]));

      const results: unknown[] = [];
      for await (const item of resource.listLevelsAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [makeLevel('10100')],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeLevel('10101')],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: unknown[] = [];
      for await (const item of resource.listLevelsAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(2);
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listLevelsAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── B551: setDefaultLevels ─────────────────────────────────────────────────

  describe('setDefaultLevels()', () => {
    it('calls PUT /issuesecurityschemes/level/default with defaultValues', async () => {
      transport.respondWith(undefined);
      const defaultValues = [{ issueSecuritySchemeId: '10001', defaultLevelId: '10100' }];

      await resource.setDefaultLevels({ defaultValues });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuesecurityschemes/level/default`,
        body: { defaultValues },
      });
    });
  });

  // ── B552: listLevelMembers ─────────────────────────────────────────────────

  describe('listLevelMembers()', () => {
    it('calls GET /issuesecurityschemes/level/member with no params', async () => {
      const page = makePageOf([makeMember()]);
      transport.respondWith(page);

      const result = await resource.listLevelMembers();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuesecurityschemes/level/member`,
      });
    });

    it('forwards id, schemeId, levelId filters', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listLevelMembers({
        id: ['10200'],
        schemeId: ['10001'],
        levelId: ['10100'],
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        id: '10200',
        schemeId: '10001',
        levelId: '10100',
      });
    });

    it('forwards expand param', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listLevelMembers({ expand: 'all' });

      expect(transport.lastCall?.options.query).toMatchObject({ expand: 'all' });
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listLevelMembers({ startAt: 5, maxResults: 20 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 20 });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.listLevelMembers({ maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── B552: listLevelMembersAll ──────────────────────────────────────────────

  describe('listLevelMembersAll()', () => {
    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [makeMember('10200')],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeMember('10201')],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: unknown[] = [];
      for await (const item of resource.listLevelMembersAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(2);
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listLevelMembersAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── B553: listProjects ─────────────────────────────────────────────────────

  describe('listProjects()', () => {
    it('calls GET /issuesecurityschemes/project with no params', async () => {
      const page = makePageOf([{ issueSecuritySchemeId: '10001', projectId: '10100' }]);
      transport.respondWith(page);

      const result = await resource.listProjects();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuesecurityschemes/project`,
      });
    });

    it('forwards issueSecuritySchemeId and projectId filters', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProjects({
        issueSecuritySchemeId: ['10001'],
        projectId: ['10100', '10101'],
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        issueSecuritySchemeId: '10001',
        projectId: '10100,10101',
      });
    });

    it('forwards pagination params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProjects({ startAt: 5, maxResults: 20 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 20 });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.listProjects({ maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── B553: listProjectsAll ──────────────────────────────────────────────────

  describe('listProjectsAll()', () => {
    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [{ issueSecuritySchemeId: '10001', projectId: '10100' }],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [{ issueSecuritySchemeId: '10001', projectId: '10101' }],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: unknown[] = [];
      for await (const item of resource.listProjectsAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(2);
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listProjectsAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── B554: associateToProject ───────────────────────────────────────────────

  describe('associateToProject()', () => {
    it('calls PUT /issuesecurityschemes/project with required fields', async () => {
      transport.respondWith(undefined);

      await resource.associateToProject({ projectId: '10100', schemeId: '10001' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuesecurityschemes/project`,
        body: { projectId: '10100', schemeId: '10001' },
      });
    });

    it('includes optional oldToNewSecurityLevelMappings', async () => {
      transport.respondWith(undefined);
      const mappings = [{ oldLevelId: '10100', newLevelId: '10101' }];

      await resource.associateToProject({
        projectId: '10100',
        schemeId: '10001',
        oldToNewSecurityLevelMappings: mappings,
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        oldToNewSecurityLevelMappings: mappings,
      });
    });

    it('omits mappings when not provided', async () => {
      transport.respondWith(undefined);

      await resource.associateToProject({ projectId: '10100', schemeId: '10001' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('oldToNewSecurityLevelMappings');
    });
  });

  // ── B555: search ───────────────────────────────────────────────────────────

  describe('search()', () => {
    it('calls GET /issuesecurityschemes/search with no params', async () => {
      const page = makePageOf([{ id: 10001, name: 'My Scheme' }]);
      transport.respondWith(page);

      const result = await resource.search();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuesecurityschemes/search`,
      });
    });

    it('forwards id and projectId filters', async () => {
      transport.respondWith(makePageOf([]));

      await resource.search({ id: ['10001'], projectId: ['10100'] });

      expect(transport.lastCall?.options.query).toMatchObject({
        id: '10001',
        projectId: '10100',
      });
    });

    it('forwards pagination params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.search({ startAt: 10, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.search({ maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── B555: searchAll ────────────────────────────────────────────────────────

  describe('searchAll()', () => {
    it('yields items from paginated response', async () => {
      transport.respondWith(makePageOf([{ id: 10001, name: 'My Scheme' }]));

      const results: unknown[] = [];
      for await (const item of resource.searchAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [{ id: 10001 }],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [{ id: 10002 }],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: unknown[] = [];
      for await (const item of resource.searchAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(2);
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.searchAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });
});
