/**
 * Release 4.1.0, unit exports: the package root (`package.json` exposes only
 * `.`) must name every type a 4.1.0-new or 4.1.0-changed public method
 * signature uses (X-EX1), plus every type the 4.1.0 release notes tell
 * consumers to import (X-EX3). Generic Jira names carry a `Jira` prefix
 * (X-EX2). Both typecheck passes (`npm run typecheck`, `npm run
 * typecheck:ts6`) compile this file: a name missing from `src/index.ts`
 * fails with TS2305, a type that drifts from the signature it names fails
 * `toEqualTypeOf`, and a reappearing unprefixed `GetUserParams` fails the
 * `@ts-expect-error` below with TS2578.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import type * as Root from '../../src/index.js';
import type {
  JiraClient,
  OffsetPaginatedResponse,
  // X-EX1: types of 4.1.0 signatures (not used by any 4.0.0 signature)
  CreateIssueParams,
  GetEditMetaParams,
  WorklogBulkOutcome,
  GetProjectParams,
  GetProjectsFieldsParams,
  LoadProjectAvatarParams,
  ProjectFieldBean,
  FieldContextDefaultValue,
  IssueTypeDefaultValueUpdate,
  AddIssueTypesToContextBody,
  // X-EX2: generic name, prefixed at the root
  JiraGetUserParams,
  // X-EX3: names the 4.1.0 release notes say are exported from the root
  Task,
  BulkIssuePropertyOptions,
  BulkSetIssuePropertyData,
  BulkDeleteIssuePropertyData,
  RemoveFieldParametersResult,
  RemoveFieldParametersResultEntry,
  ExpressionEvaluateData,
  ExpressionEvaluateContext,
  ExpressionEvaluateJqlContext,
  IssueCommentExpandParams,
  UpdateIssueCommentParams,
  DashboardWriteParams,
  ListGadgetsParams,
  FilterQueryParams,
  FilterSharePermissionWrite,
  AddFilterSharePermissionData,
  DeleteFieldParams,
  TaskProgressBeanObject,
  WebhookRegistrationResult,
  JqlQueryToSanitize,
  SanitizedJqlQuery,
  JqlSuggestion,
  ContentPermissionsRequest,
  DatabaseEntryFilter,
  PolicySummaryResponse,
  StartAgentSessionsBatchData,
  WorkflowCopyRequest,
} from '../../src/index.js';

type Issues = JiraClient['issues'];
type Projects = JiraClient['projects'];

describe('X-EX1: 4.1.0 signature types are importable from the package root', () => {
  it('issues.create / getEditMeta params', () => {
    expectTypeOf<CreateIssueParams>().toEqualTypeOf<NonNullable<Parameters<Issues['create']>[1]>>();
    expectTypeOf<GetEditMetaParams>().toEqualTypeOf<
      NonNullable<Parameters<Issues['getEditMeta']>[1]>
    >();
  });

  it('WorklogBulkOutcome is what the returnOutcome overloads resolve', () => {
    const moved = (issues: Issues) =>
      issues.moveWorklog('K-1', { ids: [1], issueIdOrKey: 'K-2' }, { returnOutcome: true });
    const deleted = (issues: Issues) =>
      issues.deleteAllWorklogs('K-1', [1], { returnOutcome: true });
    expectTypeOf(moved).returns.resolves.toEqualTypeOf<WorklogBulkOutcome>();
    expectTypeOf(deleted).returns.resolves.toEqualTypeOf<WorklogBulkOutcome>();
  });

  it('projects.get / loadAvatar / getProjectsFields params and page item', () => {
    expectTypeOf<GetProjectParams>().toEqualTypeOf<
      Exclude<NonNullable<Parameters<Projects['get']>[1]>, string[]>
    >();
    expectTypeOf<LoadProjectAvatarParams>().toEqualTypeOf<
      NonNullable<Parameters<Projects['loadAvatar']>[2]>
    >();
    const fields = (projects: Projects, params: GetProjectsFieldsParams) =>
      projects.getProjectsFields(params);
    expectTypeOf(fields).returns.resolves.toEqualTypeOf<
      OffsetPaginatedResponse<ProjectFieldBean>
    >();
  });

  it('FieldContextDefaultValue types the new field-context request bodies', () => {
    expectTypeOf<FieldContextDefaultValue>().toEqualTypeOf<
      NonNullable<IssueTypeDefaultValueUpdate['value']>
    >();
    expectTypeOf<FieldContextDefaultValue>().toEqualTypeOf<
      NonNullable<AddIssueTypesToContextBody['defaultValue']>
    >();
  });
});

describe('X-EX2: the generic GetUserParams name is exported only Jira-prefixed', () => {
  it('JiraGetUserParams is the users.get / getCurrentUser param type', () => {
    expectTypeOf<JiraGetUserParams>().toEqualTypeOf<
      NonNullable<Parameters<JiraClient['users']['get']>[1]>
    >();
    expectTypeOf<JiraGetUserParams>().toEqualTypeOf<
      NonNullable<Parameters<JiraClient['users']['getCurrentUser']>[0]>
    >();
  });

  it('has no unprefixed GetUserParams root export', () => {
    // @ts-expect-error -- root exports it only as JiraGetUserParams (X-EX2).
    expectTypeOf<Root.GetUserParams>().not.toBeNever();
  });
});

describe('X-EX3: every type the 4.1.0 release notes name resolves at the root', () => {
  it('compiles a consumer that names each of them', () => {
    type Named = [
      Task,
      BulkIssuePropertyOptions,
      BulkSetIssuePropertyData,
      BulkDeleteIssuePropertyData,
      RemoveFieldParametersResult,
      RemoveFieldParametersResultEntry,
      ExpressionEvaluateData,
      ExpressionEvaluateContext,
      ExpressionEvaluateJqlContext,
      JiraGetUserParams,
      IssueCommentExpandParams,
      UpdateIssueCommentParams,
      DashboardWriteParams,
      ListGadgetsParams,
      FilterQueryParams,
      FilterSharePermissionWrite,
      AddFilterSharePermissionData,
      DeleteFieldParams,
      TaskProgressBeanObject,
      WebhookRegistrationResult,
      JqlQueryToSanitize,
      SanitizedJqlQuery,
      JqlSuggestion,
      ContentPermissionsRequest,
      DatabaseEntryFilter,
      PolicySummaryResponse,
      StartAgentSessionsBatchData,
      WorkflowCopyRequest,
      IssueTypeDefaultValueUpdate,
      WorklogBulkOutcome,
      GetProjectParams,
      ProjectFieldBean,
    ];
    const named: Partial<Named> = [];
    expect(named).toEqual([]);
  });
});
