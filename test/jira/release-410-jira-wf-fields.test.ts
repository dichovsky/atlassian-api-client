/**
 * Release 4.1.0 unit jira-wf-fields: SDK wire and type regressions for
 * dashboards (F144), filters (F145), fields (F155) and the package-root
 * type exports (F153, F165).
 */
import { beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import { DashboardsResource } from '../../src/jira/resources/dashboards.js';
import { FieldsResource } from '../../src/jira/resources/fields.js';
import { FiltersResource } from '../../src/jira/resources/filters.js';
import type {
  AddFilterSharePermissionData,
  CreateFilterData,
  DashboardWriteParams,
  DeleteFieldParams,
  FilterQueryParams,
  FilterSharePermissionWrite,
  JqlQueryToSanitize,
  JqlSuggestion,
  ListGadgetsParams,
  SanitizedJqlQuery,
  TaskProgressBeanObject,
  UpdateFilterData,
  WebhookRegistrationResult,
} from '../../src/index.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';
const SHARE = [{ type: 'global' as const }];

let transport: MockTransport;

beforeEach(() => {
  transport = new MockTransport();
});

describe('dashboards create/update/copy accept extendAdminPermissions (F144)', () => {
  const data = { name: 'N', sharePermissions: SHARE, editPermissions: [] };

  it.each([true, false])('sends extendAdminPermissions=%s as a query param', async (flag) => {
    const dashboards = new DashboardsResource(transport, BASE_URL);
    transport.respondWith({ id: '1' }).respondWith({ id: '1' }).respondWith({ id: '2' });

    await dashboards.create(data, { extendAdminPermissions: flag });
    await dashboards.update('10001', data, { extendAdminPermissions: flag });
    await dashboards.copy('10001', data, { extendAdminPermissions: flag });

    expect(transport.calls.map((c) => [c.options.method, c.options.path, c.options.query])).toEqual(
      [
        ['POST', `${BASE_URL}/dashboard`, { extendAdminPermissions: flag }],
        ['PUT', `${BASE_URL}/dashboard/10001`, { extendAdminPermissions: flag }],
        ['POST', `${BASE_URL}/dashboard/10001/copy`, { extendAdminPermissions: flag }],
      ],
    );
    expect(transport.calls.map((c) => c.options.body)).toEqual([data, data, data]);
  });

  it('sends no query when the param is omitted', async () => {
    const dashboards = new DashboardsResource(transport, BASE_URL);
    transport.respondWith({ id: '1' }).respondWith({ id: '1' }).respondWith({ id: '2' });

    await dashboards.create(data);
    await dashboards.update('10001', data, {});
    await dashboards.copy('10001', data);

    for (const call of transport.calls) expect(call.options).not.toHaveProperty('query');
  });
});

describe('filter create/update accept the nested SharePermission shape (F145)', () => {
  it('types and sends nested group/project/role/user entries', async () => {
    const nested: FilterSharePermissionWrite[] = [
      { type: 'group', group: { groupId: '276f955c-63d7-42c8-9520-92d01dca0625' } },
      { type: 'projectRole', project: { id: '10000' }, role: { id: 10002 } },
      { type: 'user', user: { accountId: '5b10a2844c20165700ede21g' } },
      { type: 'authenticated' },
    ];
    const create: CreateFilterData = { name: 'x', sharePermissions: nested };
    const update: UpdateFilterData = { editPermissions: nested };
    const filters = new FiltersResource(transport, BASE_URL);
    transport.respondWith({ id: '1' }).respondWith({ id: '1' });

    await filters.create(create);
    await filters.update('1', update);

    expect(transport.calls[0]?.options.body).toEqual({ name: 'x', sharePermissions: nested });
    expect(transport.calls[1]?.options.body).toEqual({ editPermissions: nested });
  });

  it('types a nested literal directly in CreateFilterData / UpdateFilterData', () => {
    // On 4.0.0 this failed tsc: TS2561 'group' does not exist in AddFilterSharePermissionData.
    const create: CreateFilterData = {
      name: 'x',
      sharePermissions: [{ type: 'group', group: { name: 'devs' } }],
      editPermissions: [{ type: 'project', project: { id: '10000' } }],
    };
    const update: UpdateFilterData = {
      sharePermissions: [{ type: 'user', user: { accountId: 'a' } }],
    };
    expect(create.sharePermissions).toHaveLength(1);
    expect(update.sharePermissions).toHaveLength(1);
  });

  it('still accepts the flat add-permission shape for 4.x compatibility', () => {
    expectTypeOf<{ type: 'group'; groupname: string }>().toExtend<FilterSharePermissionWrite>();
  });
});

describe('fields.delete returns the async deletion task on request (F155)', () => {
  const task = {
    id: '10020',
    self: `${BASE_URL}/task/10020`,
    status: 'ENQUEUED',
    progress: 0,
    elapsedRuntime: 0,
    lastUpdate: 1,
    submitted: 1,
    submittedBy: 1,
  };

  it('resolves the task with returnTask: true', async () => {
    const fields = new FieldsResource(transport, BASE_URL);
    transport.respondWith(task);

    await expect(fields.delete('customfield_10001', { returnTask: true })).resolves.toEqual(task);
    expect(transport.lastCall?.options).toMatchObject({
      method: 'DELETE',
      path: `${BASE_URL}/field/customfield_10001`,
    });
    expect(transport.lastCall?.options).not.toHaveProperty('query');
  });

  it('keeps resolving void without it', async () => {
    const fields = new FieldsResource(transport, BASE_URL);
    transport.respondWith(task).respondWith(task);

    await expect(fields.delete('customfield_10001')).resolves.toBeUndefined();
    await expect(
      fields.delete('customfield_10001', { returnTask: false }),
    ).resolves.toBeUndefined();
  });

  it('resolves undefined with returnTask: true when Jira answers without the task (204)', async () => {
    const fields = new FieldsResource(transport, BASE_URL);
    transport.respondWith(undefined, 204);

    await expect(fields.delete('customfield_10001', { returnTask: true })).resolves.toBeUndefined();
    expect(transport.lastCall?.options).toMatchObject({
      method: 'DELETE',
      path: `${BASE_URL}/field/customfield_10001`,
    });
  });

  it('types the overloads', () => {
    const fields = new FieldsResource(transport, BASE_URL);
    expectTypeOf(() => fields.delete('x', { returnTask: true })).returns.resolves.toEqualTypeOf<
      TaskProgressBeanObject | undefined
    >();
    expectTypeOf(() => fields.delete('x')).returns.resolves.toBeVoid();
    expectTypeOf<DeleteFieldParams>().toEqualTypeOf<{ readonly returnTask?: boolean }>();
  });
});

describe('the package root exports the public param and element types (F153, F165)', () => {
  it('names them', () => {
    expectTypeOf<AddFilterSharePermissionData>().toExtend<FilterSharePermissionWrite>();
    expectTypeOf<TaskProgressBeanObject>().toHaveProperty('status');
    expectTypeOf<ListGadgetsParams['gadgetId']>().toEqualTypeOf<number[] | undefined>();
    expectTypeOf<FilterQueryParams['overrideSharePermissions']>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<DashboardWriteParams['extendAdminPermissions']>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<JqlQueryToSanitize>().toHaveProperty('query');
    expectTypeOf<SanitizedJqlQuery>().toHaveProperty('initialQuery');
    expectTypeOf<JqlSuggestion>().toHaveProperty('value');
    expectTypeOf<WebhookRegistrationResult>().toHaveProperty('createdWebhookId');
  });

  it('types JqlQueryToSanitize.accountId as the spec nullable string (R4-m1)', () => {
    expectTypeOf<JqlQueryToSanitize['accountId']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<{ query: 'project = A'; accountId: null }>().toExtend<JqlQueryToSanitize>();
  });
});
