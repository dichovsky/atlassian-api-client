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
import { describe, expectTypeOf, it } from 'vitest';
import type * as Root from '../../src/index.js';
import type {
  JiraClient,
  OffsetPaginatedResponse,
  // X-EX1: types that only 4.1.0 signatures name. FieldContextDefaultValue was
  // reachable in 4.0.0 only through FieldContextDefaultValuePage; the 4.1.0
  // root exports IssueTypeDefaultValueUpdate / AddIssueTypesToContextBody
  // name it directly.
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
  JiraTask,
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
  // What the 5.0.0-new workflows.copyWorkflow resolves (4.0.0's bulkCreate already
  // returned it, but it was not importable from the root).
  WorkflowCreateResponse,
  // X-EXPORTS-4B: the issue-security-scheme signatures changed after the exports unit
  AssociateSchemesToProjectsData,
  AssociateSchemesToProjectsOptions,
  RemoveSecurityLevelParams,
  // Re-run of the X-EX1 audit on the final tree: every other type a 5.0.0-new or
  // -changed signature introduced that the root exports.
  BulkAgentSessionsResponse,
  BulkForgePanelPinStatusData,
  BulkForgePanelPinStatusResponse,
  BulkPolicyOperationResponse,
  ContentPermissionOutput,
  ContentPermissionWriteParams,
  ContentPermissionsResponse,
  DatabaseConditionalParams,
  DatabaseEntry,
  DatabaseEntryListResponse,
  DatabaseEntrySingleResponse,
  DatabaseField,
  DatabaseFieldListResponse,
  DatabaseView,
  DatabaseViewListResponse,
  DeleteContentPermissionsParams,
  GetInvalidJqlAuditEntriesParams,
  InvalidJqlAuditPage,
  ListContentPermissionsParams,
  ListDatabaseEntriesParams,
  ListDatabasePageParams,
  ListIssueTypesForProjectParams,
  ListPoliciesParams,
  PolicyIdsData,
  PolicyProjectIdsData,
  RestrictionStateResponse,
  SetRestrictionStateData,
  StartAgentSessionsUniformData,
  StatePolicyDocument,
  StatePolicyRule,
  UpdateContextDefaultValuesBody,
} from '../../src/index.js';

type Issues = JiraClient['issues'];
type Projects = JiraClient['projects'];
type SecuritySchemes = JiraClient['issueSecuritySchemes'];

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

describe('X-EXPORTS-4B: the final-tree signature types are importable from the root', () => {
  it('issueSecuritySchemes.associateToProject / removeLevel params', () => {
    expectTypeOf<AssociateSchemesToProjectsData>().toEqualTypeOf<
      Parameters<SecuritySchemes['associateToProject']>[0]
    >();
    expectTypeOf<AssociateSchemesToProjectsOptions>().toEqualTypeOf<
      NonNullable<Parameters<SecuritySchemes['associateToProject']>[1]>
    >();
    expectTypeOf<RemoveSecurityLevelParams>().toEqualTypeOf<
      NonNullable<Parameters<SecuritySchemes['removeLevel']>[2]>
    >();
  });

  it('WorkflowCreateResponse is what workflows.copyWorkflow resolves', () => {
    expectTypeOf<WorkflowCreateResponse>().toEqualTypeOf<
      Awaited<ReturnType<JiraClient['workflows']['copyWorkflow']>>
    >();
  });

  it('compiles a consumer that names every other new signature type', () => {
    type Named = [
      BulkAgentSessionsResponse,
      BulkForgePanelPinStatusData,
      BulkForgePanelPinStatusResponse,
      BulkPolicyOperationResponse,
      ContentPermissionOutput,
      ContentPermissionWriteParams,
      ContentPermissionsResponse,
      DatabaseConditionalParams,
      DatabaseEntry,
      DatabaseEntryListResponse,
      DatabaseEntrySingleResponse,
      DatabaseField,
      DatabaseFieldListResponse,
      DatabaseView,
      DatabaseViewListResponse,
      DeleteContentPermissionsParams,
      GetInvalidJqlAuditEntriesParams,
      InvalidJqlAuditPage,
      ListContentPermissionsParams,
      ListDatabaseEntriesParams,
      ListDatabasePageParams,
      ListIssueTypesForProjectParams,
      ListPoliciesParams,
      PolicyIdsData,
      PolicyProjectIdsData,
      RestrictionStateResponse,
      SetRestrictionStateData,
      StartAgentSessionsUniformData,
      StatePolicyDocument,
      StatePolicyRule,
      UpdateContextDefaultValuesBody,
    ];
    expectTypeOf<Named[number]>().not.toBeAny();
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

  it('has no unprefixed Task root export: the Jira task type is JiraTask', () => {
    // @ts-expect-error -- root exports it only as JiraTask, like ConfluenceTask.
    expectTypeOf<Root.Task>().not.toBeNever();
    expectTypeOf<JiraTask>().toEqualTypeOf<
      NonNullable<Awaited<ReturnType<JiraClient['bulk']['setPropertyBulk']>>>
    >();
  });
});

describe('X-EX3: every type the 4.1.0 release notes name resolves at the root', () => {
  it('compiles a consumer that names each of them', () => {
    type Named = [
      JiraTask,
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
    // An unresolved name already fails typecheck (TS2305); this also fails
    // if any of them resolves to `any`, which would hide the type.
    expectTypeOf<Named[number]>().not.toBeAny();
  });
});
