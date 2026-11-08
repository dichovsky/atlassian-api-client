/**
 * Release 4.1.0 unit `jira-issues`: IssuesResource wire and type contracts
 * added for F077, F080, F083 and F276 (CLI → wire proofs live in
 * test/cli/release-410-jira-issues.test.ts).
 */
import { beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import { IssuesResource, type WorklogBulkOutcome } from '../../src/jira/resources/issues.js';
import type {
  CreateIssueData,
  Issue,
  TransitionData,
  UpdateIssueData,
} from '../../src/jira/types.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('IssuesResource (release 4.1.0 jira-issues)', () => {
  let transport: MockTransport;
  let issues: IssuesResource;

  beforeEach(() => {
    transport = new MockTransport();
    issues = new IssuesResource(transport, BASE_URL);
  });

  describe('F080: getEditMeta() and create() query params', () => {
    it('getEditMeta sends both overrides, including false', async () => {
      transport.respondWith({ fields: {} });
      await issues.getEditMeta('PROJ-1', {
        overrideScreenSecurity: true,
        overrideEditableFlag: false,
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/editmeta`,
        query: { overrideScreenSecurity: true, overrideEditableFlag: false },
      });
    });

    it('getEditMeta without params sends an empty query', async () => {
      transport.respondWith({ fields: {} });
      await issues.getEditMeta('PROJ-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('create sends updateHistory, and nothing without params', async () => {
      const data = { fields: { summary: 'S' } };
      transport.respondWith({ id: '1', key: 'P-1' }, 201).respondWith({ id: '2' }, 201);
      await issues.create(data, { updateHistory: true });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue`,
        query: { updateHistory: true },
        body: data,
      });
      await issues.create(data);
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  describe('F077: deleteAllWorklogs() / moveWorklog() returnOutcome', () => {
    it('deleteAllWorklogs reports a 200 as partial with its body, and never sends returnOutcome', async () => {
      transport.respondWith({ message: 'partial' }, 200);
      const outcome = issues.deleteAllWorklogs('PROJ-1', [1, 2], {
        adjustEstimate: 'leave',
        returnOutcome: true,
      });
      expectTypeOf(outcome).toEqualTypeOf<Promise<WorklogBulkOutcome>>();
      await expect(outcome).resolves.toEqual({ partial: true, details: { message: 'partial' } });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/PROJ-1/worklog`,
        body: { ids: [1, 2] },
      });
      expect(transport.lastCall?.options.query).toEqual({ adjustEstimate: 'leave' });
    });

    it('deleteAllWorklogs reports a 204 as complete and an empty 200 as partial', async () => {
      transport.respondWith(undefined, 204).respondWith(undefined, 200);
      await expect(
        issues.deleteAllWorklogs('PROJ-1', [1], { returnOutcome: true }),
      ).resolves.toEqual({ partial: false });
      await expect(
        issues.deleteAllWorklogs('PROJ-1', [1], { returnOutcome: true }),
      ).resolves.toEqual({ partial: true });
    });

    it('deleteAllWorklogs without returnOutcome keeps resolving void', async () => {
      transport.respondWith({ message: 'partial' }, 200);
      const promise = issues.deleteAllWorklogs('PROJ-1', [1], { overrideEditableFlag: true });
      expectTypeOf(promise).toEqualTypeOf<Promise<void>>();
      const bare = () => issues.deleteAllWorklogs('PROJ-1', [1]);
      expectTypeOf(bare).returns.toEqualTypeOf<Promise<void>>();
      await expect(promise).resolves.toBeUndefined();
    });

    it('moveWorklog reports partial success and keeps void without the opt-in', async () => {
      transport.respondWith({ message: 'partial' }, 200).respondWith(undefined, 204);
      const outcome = issues.moveWorklog(
        'PROJ-1',
        { ids: [1], issueIdOrKey: 'PROJ-2' },
        { overrideEditableFlag: true, returnOutcome: true },
      );
      expectTypeOf(outcome).toEqualTypeOf<Promise<WorklogBulkOutcome>>();
      await expect(outcome).resolves.toEqual({ partial: true, details: { message: 'partial' } });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/PROJ-1/worklog/move`,
        query: { overrideEditableFlag: true },
        body: { ids: [1], issueIdOrKey: 'PROJ-2' },
      });
      const plain = issues.moveWorklog('PROJ-1', { ids: [1] });
      expectTypeOf(plain).toEqualTypeOf<Promise<void>>();
      await expect(plain).resolves.toBeUndefined();
    });
  });

  describe('F276: update() overload selection', () => {
    it('an `as const` params object selects Promise<Issue>; a boolean variable stays Promise<void>', async () => {
      const edited = { id: '1', key: 'PROJ-1', self: 's', fields: {} };
      transport.respondWith(edited).respondWith(edited);
      const params = { returnIssue: true } as const;
      const typed = issues.update('PROJ-1', { fields: {} }, params);
      expectTypeOf(typed).toEqualTypeOf<Promise<Issue>>();
      await expect(typed).resolves.toEqual(edited);
      // Documented: a widened boolean takes the void overload, yet the issue is
      // still resolved at runtime when the value is true.
      const flag: boolean = true as boolean;
      const widened = issues.update('PROJ-1', { fields: {} }, { returnIssue: flag });
      expectTypeOf(widened).toEqualTypeOf<Promise<void>>();
      await expect(widened).resolves.toEqual(edited);
    });
  });

  describe('F083: write bodies accept every IssueUpdateDetails key', () => {
    it('create, update and transition bodies type-check with properties, historyMetadata and transition', () => {
      const history = { type: 'myplugin:type', activityDescription: 'Imported' };
      const properties = [{ key: 'k', value: { a: 1 } }];
      const create = {
        fields: { summary: 'S' },
        properties,
        historyMetadata: history,
        transition: { id: '11' },
      } satisfies CreateIssueData;
      const update = {
        historyMetadata: history,
        transition: { id: '21', looped: true },
      } satisfies UpdateIssueData;
      const transition = {
        transition: { id: '31', looped: true },
        properties,
        historyMetadata: history,
      } satisfies TransitionData;
      expectTypeOf(create).toMatchTypeOf<CreateIssueData>();
      expectTypeOf(update).toMatchTypeOf<UpdateIssueData>();
      expectTypeOf(transition).toMatchTypeOf<TransitionData>();
    });
  });
});
