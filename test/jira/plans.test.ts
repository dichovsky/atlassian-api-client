import { describe, it, expect, beforeEach } from 'vitest';
import { PlansResource } from '../../src/jira/resources/plans.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makePlanSummary = (id = '101') => ({
  id,
  name: 'Q3 Plan',
  scenarioId: 'sc-1',
  status: 'Active',
  issueSources: [{ type: 'Board', value: 1 }],
});

const makePlanResponse = (planId = 101) => ({
  id: planId,
  name: 'Q3 Plan',
  status: 'Active',
  scheduling: {
    dependencies: 'Sequential',
    endDate: { type: 'TargetEndDate' },
    estimation: 'StoryPoints',
    inferredDates: 'None',
    startDate: { type: 'TargetStartDate' },
  },
  exclusionRules: { numberOfDaysToShowCompletedIssues: 30 },
});

const makeAtlassianTeam = (id = 'team-abc') => ({
  id,
  planningStyle: 'Scrum',
  capacity: 5.0,
  issueSourceId: 1,
  sprintLength: 14,
});

const makePlanOnlyTeam = (id = 1001) => ({
  id,
  name: 'My Team',
  planningStyle: 'Kanban',
  memberAccountIds: ['acc-1', 'acc-2'],
});

const makeTeamSummary = (id = 'team-1') => ({
  id,
  name: 'Team 1',
  type: 'atlassian',
});

describe('PlansResource', () => {
  let transport: MockTransport;
  let resource: PlansResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new PlansResource(transport, BASE_URL);
  });

  // ── list (B625) ────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /plans/plan with no params', async () => {
      const page = { values: [makePlanSummary()], last: true };
      transport.respondWith(page);

      const result = await resource.list();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/plans/plan`,
      });
    });

    it('passes all query params', async () => {
      transport.respondWith({ values: [], last: true });

      await resource.list({
        cursor: 'abc123',
        includeTrashed: true,
        includeArchived: false,
        maxResults: 25,
      });

      const q = transport.lastCall?.options.query as Record<string, unknown>;
      expect(q['cursor']).toBe('abc123');
      expect(q['includeTrashed']).toBe(true);
      expect(q['includeArchived']).toBe(false);
      expect(q['maxResults']).toBe(25);
    });

    it('omits undefined params from query', async () => {
      transport.respondWith({ values: [], last: true });
      await resource.list({});

      const q = transport.lastCall?.options.query as Record<string, unknown>;
      expect(q['cursor']).toBeUndefined();
      expect(q['includeTrashed']).toBeUndefined();
    });
  });

  // ── listAll (B625 — cursor generator) ─────────────────────────────────────

  describe('listAll()', () => {
    it('yields all items across a single page', async () => {
      const plan1 = makePlanSummary('101');
      const plan2 = makePlanSummary('102');
      transport.respondWith({ values: [plan1, plan2], last: true });

      const items = [];
      for await (const item of resource.listAll()) {
        items.push(item);
      }

      expect(items).toHaveLength(2);
      expect(items[0]).toEqual(plan1);
      expect(items[1]).toEqual(plan2);
      expect(transport.calls).toHaveLength(1);
    });

    it('paginates across multiple pages using nextPageCursor', async () => {
      const plan1 = makePlanSummary('101');
      const plan2 = makePlanSummary('102');
      transport
        .respondWith({ values: [plan1], last: false, nextPageCursor: 'cursor1' })
        .respondWith({ values: [plan2], last: true, nextPageCursor: undefined });

      const items = [];
      for await (const item of resource.listAll()) {
        items.push(item);
      }

      expect(items).toHaveLength(2);
      expect(transport.calls).toHaveLength(2);
      // Second call should include cursor
      const secondCall = transport.calls[1];
      const q = secondCall?.options.query as Record<string, unknown>;
      expect(q['cursor']).toBe('cursor1');
    });

    it('stops when page is empty', async () => {
      transport.respondWith({ values: [], last: false, nextPageCursor: 'cursor1' });

      const items = [];
      for await (const item of resource.listAll()) {
        items.push(item);
      }

      expect(items).toHaveLength(0);
      expect(transport.calls).toHaveLength(1);
    });

    it('stops when cursor does not advance (infinite-loop guard)', async () => {
      transport
        .respondWith({ values: [makePlanSummary('1')], last: false, nextPageCursor: 'same' })
        .respondWith({ values: [makePlanSummary('2')], last: false, nextPageCursor: 'same' });

      const items = [];
      for await (const item of resource.listAll()) {
        items.push(item);
      }

      // Both pages yield before the cursor guard fires at the end of second iteration.
      // The guard prevents a third request but both pages are already yielded.
      expect(items).toHaveLength(2);
      expect(transport.calls).toHaveLength(2);
    });

    it('passes optional params to all page requests', async () => {
      transport.respondWith({ values: [], last: true });

      for await (const _ of resource.listAll({ includeTrashed: true, maxResults: 10 })) {
        // iterate
      }

      const q = transport.lastCall?.options.query as Record<string, unknown>;
      expect(q['includeTrashed']).toBe(true);
      expect(q['maxResults']).toBe(10);
    });

    it('passes includeArchived to query', async () => {
      transport.respondWith({ values: [], last: true });

      for await (const _ of resource.listAll({ includeArchived: true })) {
        // iterate
      }

      const q = transport.lastCall?.options.query as Record<string, unknown>;
      expect(q['includeArchived']).toBe(true);
    });
  });

  // ── create (B626) ──────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /plans/plan with required fields and returns plan ID', async () => {
      transport.respondWith(42, 201);

      const result = await resource.create({
        name: 'Q3 Plan',
        issueSources: [{ type: 'Board', value: 1 }],
        scheduling: {
          estimation: 'StoryPoints',
          dependencies: 'Sequential',
          startDate: { type: 'TargetStartDate' },
          endDate: { type: 'TargetEndDate' },
        },
      });

      expect(result).toBe(42);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/plans/plan`,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['name']).toBe('Q3 Plan');
      expect(body['issueSources']).toEqual([{ type: 'Board', value: 1 }]);
      expect(body['scheduling']).toBeDefined();
    });

    it('includes optional fields when provided', async () => {
      transport.respondWith(43, 201);

      await resource.create({
        name: 'Plan',
        issueSources: [{ type: 'Project', value: 2 }],
        scheduling: { estimation: 'Days' } as never,
        leadAccountId: 'acc-1',
        crossProjectReleases: [{ name: 'Release 1', releaseIds: [1] }],
        customFields: [{ customFieldId: 100, filter: true }],
        exclusionRules: { issueIds: [10], numberOfDaysToShowCompletedIssues: 14 },
        permissions: [{ holder: { type: 'AccountId', value: 'acc-1' }, type: 'view' }],
      });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['leadAccountId']).toBe('acc-1');
      expect(body['crossProjectReleases']).toBeDefined();
      expect(body['customFields']).toBeDefined();
      expect(body['exclusionRules']).toBeDefined();
      expect(body['permissions']).toBeDefined();
    });

    it('passes useGroupId query param', async () => {
      transport.respondWith(44, 201);
      await resource.create(
        {
          name: 'Plan',
          issueSources: [{ type: 'Board', value: 1 }],
          scheduling: { estimation: 'StoryPoints' } as never,
        },
        true,
      );

      const q = transport.lastCall?.options.query as Record<string, unknown>;
      expect(q['useGroupId']).toBe(true);
    });

    it('omits optional fields when not provided', async () => {
      transport.respondWith(45, 201);
      await resource.create({
        name: 'Plan',
        issueSources: [{ type: 'Board', value: 1 }],
        scheduling: { estimation: 'Hours' } as never,
      });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['leadAccountId']).toBeUndefined();
      expect(body['crossProjectReleases']).toBeUndefined();
    });
  });

  // ── get (B627) ─────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /plans/plan/{planId}', async () => {
      const plan = makePlanResponse(101);
      transport.respondWith(plan);

      const result = await resource.get(101);

      expect(result).toEqual(plan);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/plans/plan/101`,
      });
    });

    it('passes useGroupId query param', async () => {
      transport.respondWith(makePlanResponse());
      await resource.get(101, { useGroupId: true });

      const q = transport.lastCall?.options.query as Record<string, unknown>;
      expect(q['useGroupId']).toBe(true);
    });

    it('omits query when no params', async () => {
      transport.respondWith(makePlanResponse());
      await resource.get(101);

      const q = transport.lastCall?.options.query as Record<string, unknown>;
      expect(q['useGroupId']).toBeUndefined();
    });
  });

  // ── update (B628) ──────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /plans/plan/{planId} with patch body and returns void', async () => {
      transport.respondWith(undefined, 204);

      await resource.update(101, { op: 'replace', path: '/name', value: 'New Name' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/plans/plan/101`,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['op']).toBe('replace');
      expect(body['path']).toBe('/name');
      expect(body['value']).toBe('New Name');
    });

    it('passes useGroupId query param', async () => {
      transport.respondWith(undefined, 204);
      await resource.update(101, {}, true);

      const q = transport.lastCall?.options.query as Record<string, unknown>;
      expect(q['useGroupId']).toBe(true);
    });
  });

  // ── archive (B629) ─────────────────────────────────────────────────────────

  describe('archive()', () => {
    it('calls PUT /plans/plan/{planId}/archive and returns void', async () => {
      transport.respondWith(undefined, 204);

      await resource.archive(101);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/plans/plan/101/archive`,
      });
    });
  });

  // ── duplicate (B630) ───────────────────────────────────────────────────────

  describe('duplicate()', () => {
    it('calls POST /plans/plan/{planId}/duplicate with name and returns new plan ID', async () => {
      transport.respondWith(55, 201);

      const result = await resource.duplicate(101, { name: 'Copy of Q3' });

      expect(result).toBe(55);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/plans/plan/101/duplicate`,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['name']).toBe('Copy of Q3');
    });
  });

  // ── listTeams (B631) ───────────────────────────────────────────────────────

  describe('listTeams()', () => {
    it('calls GET /plans/plan/{planId}/team', async () => {
      const page = { values: [makeTeamSummary()], last: true };
      transport.respondWith(page);

      const result = await resource.listTeams(101);

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/plans/plan/101/team`,
      });
    });

    it('passes cursor and maxResults', async () => {
      transport.respondWith({ values: [], last: true });
      await resource.listTeams(101, { cursor: 'c1', maxResults: 10 });

      const q = transport.lastCall?.options.query as Record<string, unknown>;
      expect(q['cursor']).toBe('c1');
      expect(q['maxResults']).toBe(10);
    });
  });

  // ── listTeamsAll (B631 — cursor generator) ─────────────────────────────────

  describe('listTeamsAll()', () => {
    it('yields all teams across multiple pages', async () => {
      const team1 = makeTeamSummary('t1');
      const team2 = makeTeamSummary('t2');
      transport
        .respondWith({ values: [team1], last: false, nextPageCursor: 'next' })
        .respondWith({ values: [team2], last: true });

      const items = [];
      for await (const item of resource.listTeamsAll(101)) {
        items.push(item);
      }

      expect(items).toHaveLength(2);
      expect(transport.calls).toHaveLength(2);
    });

    it('stops when page is empty', async () => {
      transport.respondWith({ values: [], last: false });

      const items = [];
      for await (const item of resource.listTeamsAll(101)) {
        items.push(item);
      }

      expect(items).toHaveLength(0);
    });

    it('passes maxResults to query', async () => {
      transport.respondWith({ values: [], last: true });

      for await (const _ of resource.listTeamsAll(101, { maxResults: 5 })) {
        // iterate
      }

      const q = transport.lastCall?.options.query as Record<string, unknown>;
      expect(q['maxResults']).toBe(5);
    });

    it('stops when nextPageCursor repeats (infinite-loop guard)', async () => {
      const team1 = makeTeamSummary('t1');
      const team2 = makeTeamSummary('t2');
      transport
        .respondWith({ values: [team1], last: false, nextPageCursor: 'same' })
        .respondWith({ values: [team2], last: false, nextPageCursor: 'same' });

      const items = [];
      for await (const item of resource.listTeamsAll(101)) {
        items.push(item);
      }

      expect(items).toHaveLength(2);
      expect(transport.calls).toHaveLength(2);
    });
  });

  // ── addAtlassianTeam (B632) ────────────────────────────────────────────────

  describe('addAtlassianTeam()', () => {
    it('calls POST /plans/plan/{planId}/team/atlassian and returns void', async () => {
      transport.respondWith(undefined, 204);

      await resource.addAtlassianTeam(101, {
        id: 'team-abc',
        planningStyle: 'Scrum',
        sprintLength: 14,
        capacity: 8.0,
        issueSourceId: 1,
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/plans/plan/101/team/atlassian`,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['id']).toBe('team-abc');
      expect(body['planningStyle']).toBe('Scrum');
      expect(body['sprintLength']).toBe(14);
      expect(body['capacity']).toBe(8.0);
      expect(body['issueSourceId']).toBe(1);
    });

    it('omits optional fields when not provided', async () => {
      transport.respondWith(undefined, 204);
      await resource.addAtlassianTeam(101, { id: 'team-xyz', planningStyle: 'Kanban' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['capacity']).toBeUndefined();
      expect(body['issueSourceId']).toBeUndefined();
      expect(body['sprintLength']).toBeUndefined();
    });
  });

  // ── deleteAtlassianTeam (B633) ─────────────────────────────────────────────

  describe('deleteAtlassianTeam()', () => {
    it('calls DELETE /plans/plan/{planId}/team/atlassian/{atlassianTeamId}', async () => {
      transport.respondWith(undefined, 204);

      await resource.deleteAtlassianTeam(101, 'team-abc');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/plans/plan/101/team/atlassian/team-abc`,
      });
    });
  });

  // ── getAtlassianTeam (B634) ────────────────────────────────────────────────

  describe('getAtlassianTeam()', () => {
    it('calls GET /plans/plan/{planId}/team/atlassian/{atlassianTeamId}', async () => {
      const team = makeAtlassianTeam('team-abc');
      transport.respondWith(team);

      const result = await resource.getAtlassianTeam(101, 'team-abc');

      expect(result).toEqual(team);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/plans/plan/101/team/atlassian/team-abc`,
      });
    });
  });

  // ── updateAtlassianTeam (B635) ─────────────────────────────────────────────

  describe('updateAtlassianTeam()', () => {
    it('calls PUT /plans/plan/{planId}/team/atlassian/{atlassianTeamId} with patch', async () => {
      transport.respondWith(undefined, 204);

      await resource.updateAtlassianTeam(101, 'team-abc', {
        op: 'replace',
        path: '/sprintLength',
        value: 21,
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/plans/plan/101/team/atlassian/team-abc`,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['value']).toBe(21);
    });
  });

  // ── createPlanOnlyTeam (B636) ──────────────────────────────────────────────

  describe('createPlanOnlyTeam()', () => {
    it('calls POST /plans/plan/{planId}/team/planonly and returns team ID', async () => {
      transport.respondWith(2001, 201);

      const result = await resource.createPlanOnlyTeam(101, {
        name: 'My Team',
        planningStyle: 'Kanban',
        memberAccountIds: ['acc-1', 'acc-2'],
        capacity: 6.0,
        issueSourceId: 1,
        sprintLength: 0,
      });

      expect(result).toBe(2001);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/plans/plan/101/team/planonly`,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['name']).toBe('My Team');
      expect(body['planningStyle']).toBe('Kanban');
      expect(body['memberAccountIds']).toEqual(['acc-1', 'acc-2']);
      expect(body['capacity']).toBe(6.0);
    });

    it('omits optional fields when not provided', async () => {
      transport.respondWith(2002, 201);
      await resource.createPlanOnlyTeam(101, { name: 'Team B', planningStyle: 'Scrum' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['capacity']).toBeUndefined();
      expect(body['issueSourceId']).toBeUndefined();
      expect(body['memberAccountIds']).toBeUndefined();
      expect(body['sprintLength']).toBeUndefined();
    });
  });

  // ── deletePlanOnlyTeam (B637) ──────────────────────────────────────────────

  describe('deletePlanOnlyTeam()', () => {
    it('calls DELETE /plans/plan/{planId}/team/planonly/{planOnlyTeamId}', async () => {
      transport.respondWith(undefined, 204);

      await resource.deletePlanOnlyTeam(101, 2001);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/plans/plan/101/team/planonly/2001`,
      });
    });
  });

  // ── getPlanOnlyTeam (B638) ─────────────────────────────────────────────────

  describe('getPlanOnlyTeam()', () => {
    it('calls GET /plans/plan/{planId}/team/planonly/{planOnlyTeamId}', async () => {
      const team = makePlanOnlyTeam(2001);
      transport.respondWith(team);

      const result = await resource.getPlanOnlyTeam(101, 2001);

      expect(result).toEqual(team);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/plans/plan/101/team/planonly/2001`,
      });
    });
  });

  // ── updatePlanOnlyTeam (B639) ──────────────────────────────────────────────

  describe('updatePlanOnlyTeam()', () => {
    it('calls PUT /plans/plan/{planId}/team/planonly/{planOnlyTeamId} with patch', async () => {
      transport.respondWith(undefined, 204);

      await resource.updatePlanOnlyTeam(101, 2001, {
        op: 'replace',
        path: '/name',
        value: 'Renamed Team',
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/plans/plan/101/team/planonly/2001`,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['value']).toBe('Renamed Team');
    });
  });

  // ── trash (B640) ───────────────────────────────────────────────────────────

  describe('trash()', () => {
    it('calls PUT /plans/plan/{planId}/trash and returns void', async () => {
      transport.respondWith(undefined, 204);

      await resource.trash(101);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/plans/plan/101/trash`,
      });
    });
  });

  // ── path encoding ──────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes planId in path', async () => {
      transport.respondWith(makePlanResponse());
      await resource.get(999);

      expect(transport.lastCall?.options.path).toContain('/plans/plan/999');
    });

    it('encodes atlassianTeamId with special chars in path', async () => {
      transport.respondWith(makeAtlassianTeam('team/special'));
      await resource.getAtlassianTeam(101, 'team/special');

      expect(transport.lastCall?.options.path).toContain('team%2Fspecial');
    });
  });
});
