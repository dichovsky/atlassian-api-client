import type { GlobalOptions, ParsedCommand } from '../types.js';
import { JiraClient } from '../../jira/client.js';
import type {
  AddFilterSharePermissionData,
  CreateStatusData,
  UpdateStatusData,
  FieldConfigurationItem,
  NotificationSchemeEvent,
  CreateRemoteLinkData,
  RemoveFieldAssociationsBody,
  UpdateFieldAssociationsBody,
  RemoveFieldParametersBody,
  UpdateFieldParametersBody,
  AssociateProjectsBody,
  AssociateSchemesToProjectsData,
  SecuritySchemeLevelBean,
  SecuritySchemeLevelMemberBean,
  DefaultLevelValue,
  OldToNewSecurityLevelMapping,
  CreatePlanData,
  AddAtlassianTeamData,
  CreatePlanOnlyTeamData,
  PlanningStyle,
  IssueSourceType,
  CreateFieldContextData,
  UpdateFieldContextData,
  BulkCreateFieldContextOptionData,
  BulkUpdateFieldContextOptionData,
  OrderFieldContextOptionsData,
  FieldContextIssueTypeIdsBody,
  FieldContextDefaultValue,
  FieldContextProjectIdsBody,
  FieldContextMappingBulkBody,
  CreateIssueFieldOptionData,
  IssueFieldOption,
  ReplaceIssueFieldOptionOnIssuesParams,
  ListIssueFieldOptionSuggestionsParams,
  FieldAssociationsRequest,
  BulkSetIssuePropertyData,
  BulkDeleteIssuePropertyData,
  WorkflowTransitionRulesUpdateEntry,
  WorkflowTransitionRulesDeleteEntry,
  BulkEditDashboardsData,
  SearchDashboardsOrderBy,
  ListSoftwareIssuesParams,
} from '../../jira/index.js';
import type {
  AddWorklogData,
  UpdateWorklogData,
  MultiIssueProperties,
} from '../../jira/resources/issues.js';
import type { WebhookRegistration } from '../../jira/resources/webhooks.js';
import type {
  ProjectAccessLevel,
  ProjectAssigneeType,
  SaveTemplateType,
} from '../../jira/resources/project-template.js';
import type {
  AvatarEntityType,
  AvatarViewSize,
  AvatarViewFormat,
} from '../../jira/resources/universal-avatar.js';
import type {
  MigrationEntityType,
  ConnectCustomFieldValue,
  EntityPropertyDetails,
} from '../../jira/resources/migration.js';
import { buildClientConfig } from '../config.js';

/** Execute a Jira CLI command. Returns the data to be printed. */
export async function executeJiraCommand(
  cmd: ParsedCommand,
  globals: GlobalOptions,
): Promise<unknown> {
  const client = new JiraClient(buildClientConfig(globals));

  switch (cmd.resource) {
    case 'issues':
      return executeIssues(client, cmd);
    case 'projects':
      return executeProjects(client, cmd);
    case 'search':
      return executeSearch(client, cmd);
    case 'users':
      return executeUsers(client, cmd);
    case 'issue-types':
      return executeIssueTypes(client, cmd);
    case 'issuetype':
      return executeIssueType(client, cmd);
    case 'priorities':
      return executePriorities(client, cmd);
    case 'statuses':
      return executeStatuses(client, cmd);
    case 'boards':
      return executeBoards(client, cmd);
    case 'sprints':
      return executeSprints(client, cmd);
    case 'epic':
      return executeEpic(client, cmd);
    case 'backlog':
      return executeBacklog(client, cmd);
    case 'announcement-banner':
      return executeAnnouncementBanner(client, cmd);
    case 'application-role':
      return executeApplicationRole(client, cmd);
    case 'data-policy':
      return executeDataPolicy(client, cmd);
    case 'status':
      return executeStatus(client, cmd);
    case 'status-category':
      return executeStatusCategory(client, cmd);
    case 'webhooks':
      return executeWebhooks(client, cmd);
    case 'server-info':
      return executeServerInfo(client, cmd);
    case 'instance':
      return executeInstance(client, cmd);
    case 'mypermissions':
      return executeMyPermissions(client, cmd);
    case 'mypreferences':
      return executeMyPreferences(client, cmd);
    case 'auditing':
      return executeAuditing(client, cmd);
    case 'events':
      return executeEvents(client, cmd);
    case 'changelog':
      return executeChangelog(client, cmd);
    case 'forge':
      return executeForge(client, cmd);
    case 'incidents':
      return executeIncidents(client, cmd);
    case 'post-incident-reviews':
      return executePostIncidentReviews(client, cmd);
    case 'vulnerability':
      return executeVulnerability(client, cmd);
    case 'devopscomponents':
      return executeDevopscomponents(client, cmd);
    case 'groups':
      return executeGroups(client, cmd);
    case 'group-user-picker':
      return executeGroupUserPicker(client, cmd);
    case 'security-level':
      return executeSecurityLevel(client, cmd);
    case 'license':
      return executeLicense(client, cmd);
    case 'settings':
      return executeSettings(client, cmd);
    case 'redact':
      return executeRedact(client, cmd);
    case 'flag':
      return executeFlag(client, cmd);
    case 'task':
      return executeTask(client, cmd);
    case 'avatar':
      return executeAvatar(client, cmd);
    case 'custom-field-option':
      return executeCustomFieldOption(client, cmd);
    case 'classification-levels':
      return executeClassificationLevels(client, cmd);
    case 'latest':
      return executeLatest(client, cmd);
    case 'remote-link':
      return executeRemoteLink(client, cmd);
    case 'service-registry':
      return executeServiceRegistry(client, cmd);
    case 'addons':
      return executeAddons(client, cmd);
    case 'exists-by-properties':
      return executeExistsByProperties(client, cmd);
    case 'app':
      return executeApp(client, cmd);
    case 'application-properties':
      return executeApplicationProperties(client, cmd);
    case 'configuration':
      return executeConfiguration(client, cmd);
    case 'bulk':
      return executeBulk(client, cmd);
    case 'issue-attachments':
      return executeIssueAttachments(client, cmd);
    case 'component':
      return executeComponent(client, cmd);
    case 'filters':
      return executeFilters(client, cmd);
    case 'issue-type-screen-schemes':
      return executeIssueTypeScreenSchemes(client, cmd);
    case 'permission-schemes':
      return executePermissionSchemes(client, cmd);
    case 'issue-type-schemes':
      return executeIssueTypeSchemes(client, cmd);
    case 'roles':
      return executeRoles(client, cmd);
    case 'resolutions':
      return executeResolutions(client, cmd);
    case 'expression':
      return executeExpression(client, cmd);
    case 'issue-comments':
      return executeIssueComments(client, cmd);
    case 'labels':
      return executeLabels(client, cmd);
    case 'fieldconfiguration':
      return executeFieldConfiguration(client, cmd);
    case 'notification-schemes':
      return executeNotificationSchemes(client, cmd);
    case 'priority-schemes':
      return executePrioritySchemeResource(client, cmd);
    case 'version':
      return executeVersionResource(client, cmd);
    case 'config':
      return executeConfig(client, cmd);
    case 'issuesecurityschemes':
      return executeIssueSecuritySchemes(client, cmd);
    case 'screens':
      return executeScreens(client, cmd);
    case 'screenscheme':
      return executeScreenScheme(client, cmd);
    case 'plans':
      return executePlans(client, cmd);
    case 'workflows':
      return executeWorkflows(client, cmd);
    case 'workflowscheme':
      return executeWorkflowScheme(client, cmd);
    case 'fields':
      return executeFields(client, cmd);
    case 'jql':
      return executeJql(client, cmd);
    case 'issuelinktype':
      return executeIssueLinkType(client, cmd);
    case 'issue-link':
      return executeIssueLink(client, cmd);
    case 'project-template':
      return executeProjectTemplate(client, cmd);
    case 'universal-avatar':
      return executeUniversalAvatar(client, cmd);
    case 'worklog':
      return executeWorklog(client, cmd);
    case 'ui-modifications':
      return executeUiModifications(client, cmd);
    case 'permissions':
      return executePermissions(client, cmd);
    case 'repository':
      return executeRepository(client, cmd);
    case 'pipelines':
      return executePipelines(client, cmd);
    case 'linked-workspaces':
      return executeLinkedWorkspaces(client, cmd);
    case 'bulk-by-properties':
      return executeBulkByProperties(client, cmd);
    case 'migration':
      return executeMigration(client, cmd);
    case 'dashboards':
      return executeDashboards(client, cmd);
    default:
      throw new Error(`Unknown Jira resource: ${cmd.resource}. Use --help for usage.`);
  }
}

async function executeIssues(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get':
      return client.issues.get(requireArg(cmd.positionalArgs[0], 'issue key'), {
        fields: csvFlag(opts['fields']),
        expand: csvFlag(opts['expand']),
      });
    case 'create':
      return client.issues.create({
        fields: {
          project: { key: requireOpt(opts['project'], '--project') },
          issuetype: { name: requireOpt(opts['type'], '--type') },
          summary: requireOpt(opts['summary'], '--summary'),
        },
      });
    case 'update': {
      const fields: Record<string, unknown> = {};
      const summary = asString(opts['summary']);
      if (summary) {
        fields['summary'] = summary;
      }
      await client.issues.update(requireArg(cmd.positionalArgs[0], 'issue key'), { fields });
      return { updated: true };
    }
    case 'delete':
      await client.issues.delete(requireArg(cmd.positionalArgs[0], 'issue key'));
      return { deleted: true };
    case 'transition':
      await client.issues.transition(requireArg(cmd.positionalArgs[0], 'issue key'), {
        transition: { id: requireOpt(opts['transition-id'], '--transition-id') },
      });
      return { transitioned: true };
    case 'transitions':
      return client.issues.getTransitions(requireArg(cmd.positionalArgs[0], 'issue key'));
    case 'get-agile':
      return client.issues.getAgile(requireArg(cmd.positionalArgs[0], 'issue key'));
    case 'get-estimation': {
      const boardId = asPositiveInt(opts['board-id'], '--board-id');
      return client.issues.getEstimation(requireArg(cmd.positionalArgs[0], 'issue key'), {
        boardId,
      });
    }
    case 'set-estimation': {
      const boardId = asPositiveInt(opts['board-id'], '--board-id');
      const rawValue = opts['value'];
      // Pass --value null to clear the estimate; the literal string "null" is reserved.
      const estimationValue = rawValue === 'null' ? null : requireOpt(rawValue, '--value');
      return client.issues.setEstimation(
        requireArg(cmd.positionalArgs[0], 'issue key'),
        { value: estimationValue },
        { boardId },
      );
    }
    case 'rank': {
      const issuesRaw = requireOpt(opts['issues'], '--issues');
      const rankIssues = issuesRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const before = asString(opts['before']);
      const after = asString(opts['after']);
      const customFieldRaw = opts['custom-field'];
      const rankCustomFieldId =
        customFieldRaw !== undefined ? asPositiveInt(customFieldRaw, '--custom-field') : undefined;
      await client.issues.rank({
        issues: rankIssues,
        rankBeforeIssue: before,
        rankAfterIssue: after,
        rankCustomFieldId,
      });
      return { ranked: true };
    }
    case 'assign': {
      const accountId = opts['account-id'] !== undefined ? asString(opts['account-id']) : null;
      await client.issues.assign(requireArg(cmd.positionalArgs[0], 'issue key'), {
        accountId: accountId ?? null,
      });
      return { assigned: true };
    }
    case 'get-changelog':
      return client.issues.getChangelog(requireArg(cmd.positionalArgs[0], 'issue key'), {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    case 'filter-changelog': {
      const rawIds = splitCsvIds(requireOpt(opts['ids'], '--ids'));
      const numericIds = rawIds.map((token) => {
        const n = Number(token);
        if (!Number.isInteger(n) || n <= 0)
          throw new Error(`--ids must be comma-separated positive integers, got: ${token}`);
        return n;
      });
      if (numericIds.length === 0) throw new Error('--ids must not be empty');
      return client.issues.filterChangelog(
        requireArg(cmd.positionalArgs[0], 'issue key'),
        numericIds,
      );
    }
    case 'get-editmeta':
      return client.issues.getEditMeta(requireArg(cmd.positionalArgs[0], 'issue key'));
    case 'notify': {
      await client.issues.notify(
        requireArg(cmd.positionalArgs[0], 'issue key'),
        parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body') as Parameters<
          typeof client.issues.notify
        >[1],
      );
      return { sent: true };
    }
    case 'list-properties':
      return client.issues.listProperties(requireArg(cmd.positionalArgs[0], 'issue key'));
    case 'delete-property': {
      await client.issues.deleteProperty(
        requireArg(cmd.positionalArgs[0], 'issue key'),
        requireArg(cmd.positionalArgs[1], 'propertyKey'),
      );
      return { deleted: true };
    }
    case 'get-property':
      return client.issues.getProperty(
        requireArg(cmd.positionalArgs[0], 'issue key'),
        requireArg(cmd.positionalArgs[1], 'propertyKey'),
      );
    case 'set-property': {
      await client.issues.setProperty(
        requireArg(cmd.positionalArgs[0], 'issue key'),
        requireArg(cmd.positionalArgs[1], 'propertyKey'),
        parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value'),
      );
      return { updated: true };
    }
    case 'delete-all-remotelinks': {
      await client.issues.deleteAllRemoteLinks(requireArg(cmd.positionalArgs[0], 'issue key'), {
        globalId: asString(opts['global-id']),
      });
      return { deleted: true };
    }
    case 'list-remotelinks':
      return client.issues.listRemoteLinks(requireArg(cmd.positionalArgs[0], 'issue key'), {
        globalId: asString(opts['global-id']),
      });
    case 'create-remotelink':
      return client.issues.createRemoteLink(
        requireArg(cmd.positionalArgs[0], 'issue key'),
        parseJsonObjectFlag(
          requireOpt(opts['body'], '--body'),
          '--body',
        ) as unknown as CreateRemoteLinkData,
      );
    case 'delete-remotelink': {
      await client.issues.deleteRemoteLink(
        requireArg(cmd.positionalArgs[0], 'issue key'),
        requireArg(cmd.positionalArgs[1], 'linkId'),
      );
      return { deleted: true };
    }
    case 'get-remotelink':
      return client.issues.getRemoteLink(
        requireArg(cmd.positionalArgs[0], 'issue key'),
        requireArg(cmd.positionalArgs[1], 'linkId'),
      );
    case 'update-remotelink': {
      await client.issues.updateRemoteLink(
        requireArg(cmd.positionalArgs[0], 'issue key'),
        requireArg(cmd.positionalArgs[1], 'linkId'),
        parseJsonObjectFlag(
          requireOpt(opts['body'], '--body'),
          '--body',
        ) as unknown as CreateRemoteLinkData,
      );
      return { updated: true };
    }
    case 'remove-vote': {
      await client.issues.removeVote(requireArg(cmd.positionalArgs[0], 'issue key'));
      return { removed: true };
    }
    case 'get-votes':
      return client.issues.getVotes(requireArg(cmd.positionalArgs[0], 'issue key'));
    case 'add-vote': {
      await client.issues.addVote(requireArg(cmd.positionalArgs[0], 'issue key'));
      return { voted: true };
    }
    case 'remove-watcher': {
      await client.issues.removeWatcher(requireArg(cmd.positionalArgs[0], 'issue key'), {
        accountId: asString(opts['account-id']),
      });
      return { removed: true };
    }
    case 'get-watchers':
      return client.issues.getWatchers(requireArg(cmd.positionalArgs[0], 'issue key'));
    case 'add-watcher': {
      await client.issues.addWatcher(
        requireArg(cmd.positionalArgs[0], 'issue key'),
        requireOpt(opts['account-id'], '--account-id'),
      );
      return { watching: true };
    }
    case 'delete-all-worklogs': {
      const worklogIds = splitCsvIds(requireOpt(opts['ids'], '--ids')).map((s) =>
        parsePositiveIntArg(s, '--ids'),
      );
      await client.issues.deleteAllWorklogs(
        requireArg(cmd.positionalArgs[0], 'issueIdOrKey'),
        worklogIds,
      );
      return { deleted: true };
    }
    case 'list-worklogs':
      return client.issues.listWorklogs(requireArg(cmd.positionalArgs[0], 'issueIdOrKey'), {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        startedAfter: asNonNegativeInt(opts['started-after'], '--started-after'),
        startedBefore: asNonNegativeInt(opts['started-before'], '--started-before'),
        expand: asString(opts['expand']),
      });
    case 'add-worklog':
      return client.issues.addWorklog(
        requireArg(cmd.positionalArgs[0], 'issueIdOrKey'),
        parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body') as AddWorklogData,
        {
          notifyUsers: asBoolFlag(opts['notify-users']),
          adjustEstimate: asString(opts['adjust-estimate']),
          newEstimate: asString(opts['new-estimate']),
          reduceBy: asString(opts['reduce-by']),
          expand: asString(opts['expand']),
          overrideEditableFlag: asBoolFlag(opts['override-editable-flag']),
        },
      );
    case 'delete-worklog':
      await client.issues.deleteWorklog(
        requireArg(cmd.positionalArgs[0], 'issueIdOrKey'),
        requireArg(cmd.positionalArgs[1], 'worklogId'),
        {
          notifyUsers: asBoolFlag(opts['notify-users']),
          adjustEstimate: asString(opts['adjust-estimate']),
          newEstimate: asString(opts['new-estimate']),
          increaseBy: asString(opts['increase-by']),
          overrideEditableFlag: asBoolFlag(opts['override-editable-flag']),
        },
      );
      return { deleted: true };
    case 'get-worklog':
      return client.issues.getWorklog(
        requireArg(cmd.positionalArgs[0], 'issueIdOrKey'),
        requireArg(cmd.positionalArgs[1], 'worklogId'),
        { expand: asString(opts['expand']) },
      );
    case 'update-worklog':
      return client.issues.updateWorklog(
        requireArg(cmd.positionalArgs[0], 'issueIdOrKey'),
        requireArg(cmd.positionalArgs[1], 'worklogId'),
        parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body') as UpdateWorklogData,
        {
          notifyUsers: asBoolFlag(opts['notify-users']),
          adjustEstimate: asString(opts['adjust-estimate']),
          newEstimate: asString(opts['new-estimate']),
          expand: asString(opts['expand']),
          overrideEditableFlag: asBoolFlag(opts['override-editable-flag']),
        },
      );
    case 'list-worklog-properties':
      return client.issues.listWorklogProperties(
        requireArg(cmd.positionalArgs[0], 'issueIdOrKey'),
        requireArg(cmd.positionalArgs[1], 'worklogId'),
      );
    case 'delete-worklog-property':
      await client.issues.deleteWorklogProperty(
        requireArg(cmd.positionalArgs[0], 'issueIdOrKey'),
        requireArg(cmd.positionalArgs[1], 'worklogId'),
        requireArg(cmd.positionalArgs[2], 'propertyKey'),
      );
      return { deleted: true };
    case 'get-worklog-property':
      return client.issues.getWorklogProperty(
        requireArg(cmd.positionalArgs[0], 'issueIdOrKey'),
        requireArg(cmd.positionalArgs[1], 'worklogId'),
        requireArg(cmd.positionalArgs[2], 'propertyKey'),
      );
    case 'set-worklog-property':
      await client.issues.setWorklogProperty(
        requireArg(cmd.positionalArgs[0], 'issueIdOrKey'),
        requireArg(cmd.positionalArgs[1], 'worklogId'),
        requireArg(cmd.positionalArgs[2], 'propertyKey'),
        parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value'),
      );
      return { updated: true };
    case 'move-worklog': {
      const rawMoveIds = requireOpt(opts['ids'], '--ids');
      const moveIds = splitCsvIds(rawMoveIds).map((s) => parsePositiveIntArg(s, '--ids'));
      await client.issues.moveWorklog(
        requireArg(cmd.positionalArgs[0], 'issueIdOrKey'),
        {
          ids: moveIds,
          ...(opts['target-issue'] !== undefined && {
            issueIdOrKey: asString(opts['target-issue']),
          }),
        },
        {
          adjustEstimate: asString(opts['adjust-estimate']),
          overrideEditableFlag: asBoolFlag(opts['override-editable-flag']),
        },
      );
      return { moved: true };
    }
    case 'archive-issues':
      return client.issues.archiveIssues(splitCsvIds(requireOpt(opts['ids'], '--ids')));
    case 'archive-issues-jql':
      return client.issues.archiveIssuesByJql(requireOpt(opts['jql'], '--jql'));
    case 'bulk-fetch':
      return client.issues.bulkFetch({
        issueIdsOrKeys: splitCsvIds(requireOpt(opts['issues'], '--issues')),
        fieldsByKeys: asBoolFlag(opts['fields-by-keys']),
        fields: parseCsv(opts['fields']),
        properties: parseCsv(opts['properties']),
        expand: parseCsv(opts['expand']),
      });
    case 'get-create-meta':
      return client.issues.getCreateMeta({
        projectIds: parseCsv(opts['project-ids']),
        projectKeys: parseCsv(opts['project-keys']),
        issuetypeIds: parseCsv(opts['issuetype-ids']),
        issuetypeNames: parseCsv(opts['issuetype-names']),
        expand: asString(opts['expand']),
      });
    case 'get-create-meta-issuetypes':
      return client.issues.getCreateMetaIssueTypes(
        requireArg(cmd.positionalArgs[0], 'projectIdOrKey'),
        {
          startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
          maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        },
      );
    case 'get-create-meta-issuetype':
      return client.issues.getCreateMetaIssueType(
        requireArg(cmd.positionalArgs[0], 'projectIdOrKey'),
        requireArg(cmd.positionalArgs[1], 'issueTypeId'),
        {
          startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
          maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        },
      );
    case 'get-limit-report':
      return client.issues.getLimitReport();
    case 'picker':
      return client.issues.picker({
        query: asString(opts['query']),
        currentJQL: asString(opts['current-jql']),
        currentIssueKey: asString(opts['current-issue-key']),
        currentProjectId: asString(opts['current-project-id']),
        showSubTasks: asBoolFlag(opts['show-sub-tasks']),
        showSubTaskParent: asBoolFlag(opts['show-sub-task-parent']),
      });
    case 'set-properties-by-entity-ids': {
      const entityIds = parseCsv(opts['entity-ids'])?.map((s) =>
        parsePositiveIntArg(s, '--entity-ids'),
      );
      const propertiesRaw = asString(opts['properties']);
      await client.issues.setPropertiesByEntityIds({
        ...(entityIds !== undefined && { entitiesIds: entityIds }),
        ...(propertiesRaw !== undefined && {
          properties: parseJsonObjectFlag(propertiesRaw, '--properties'),
        }),
      });
      return { submitted: true };
    }
    case 'set-properties-multi': {
      const issuesRaw = requireOpt(opts['issues'], '--issues');
      const issuesList = parseJsonArrayFlag(
        issuesRaw,
        '--issues',
      ) as MultiIssueProperties['issues'];
      await client.issues.setPropertiesMulti({ issues: issuesList });
      return { submitted: true };
    }
    case 'unarchive-issues':
      return client.issues.unarchiveIssues(splitCsvIds(requireOpt(opts['ids'], '--ids')));
    case 'watch-issues-bulk':
      return client.issues.watchIssuesBulk({
        issueIds: splitCsvIds(requireOpt(opts['issue-ids'], '--issue-ids')),
      });
    case 'is-watching-bulk':
      return client.issues.isWatchingIssuesBulk({
        issueIds: splitCsvIds(requireOpt(opts['issue-ids'], '--issue-ids')),
      });
    case 'export-archived':
      await client.issues.exportArchivedIssues({
        jql: asString(opts['jql']),
        exportType: asExportType(asString(opts['export-type'])),
      });
      return { submitted: true };
    default:
      throw new Error(
        `Unknown issues action: ${cmd.action}. Actions: get, create, update, delete, transition, transitions, get-agile, get-estimation, set-estimation, rank, assign, get-changelog, filter-changelog, get-editmeta, notify, list-properties, delete-property, get-property, set-property, delete-all-remotelinks, list-remotelinks, create-remotelink, delete-remotelink, get-remotelink, update-remotelink, remove-vote, get-votes, add-vote, remove-watcher, get-watchers, add-watcher, delete-all-worklogs, list-worklogs, add-worklog, delete-worklog, get-worklog, update-worklog, list-worklog-properties, delete-worklog-property, get-worklog-property, set-worklog-property, move-worklog, archive-issues, archive-issues-jql, bulk-fetch, get-create-meta, get-create-meta-issuetypes, get-create-meta-issuetype, get-limit-report, picker, set-properties-by-entity-ids, set-properties-multi, unarchive-issues, watch-issues-bulk, is-watching-bulk, export-archived`,
      );
  }
}

async function executeProjects(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.projects.list({
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    case 'get':
      return client.projects.get(requireArg(cmd.positionalArgs[0], 'project key'));
    case 'list-legacy': {
      const typeKeyRaw = asString(opts['type-key']);
      const expandRaw = asString(opts['expand']);
      return client.projects.listLegacy({
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        orderBy: asString(opts['order-by']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        ...(expandRaw !== undefined && { expand: expandRaw.split(',').map((s) => s.trim()) }),
        ...(typeKeyRaw !== undefined && { typeKey: typeKeyRaw.split(',').map((s) => s.trim()) }),
        categoryId: asPositiveInt(opts['category-id'], '--category-id'),
        action: asString(opts['action']),
        query: asString(opts['query']),
      });
    }
    case 'create': {
      const key = requireOpt(opts['key'], '--key');
      const name = requireOpt(opts['name'], '--name');
      const projectTypeKey = requireOpt(opts['project-type-key'], '--project-type-key');
      const assigneeTypeRaw = asString(opts['assignee-type']);
      if (
        assigneeTypeRaw !== undefined &&
        assigneeTypeRaw !== 'PROJECT_LEAD' &&
        assigneeTypeRaw !== 'UNASSIGNED'
      ) {
        throw new Error(
          `--assignee-type must be PROJECT_LEAD or UNASSIGNED, got: ${assigneeTypeRaw}`,
        );
      }
      return client.projects.create({
        key,
        name,
        projectTypeKey,
        description: asString(opts['description']),
        leadAccountId: asString(opts['lead-account-id']),
        url: asString(opts['url']),
        ...(assigneeTypeRaw !== undefined && {
          assigneeType: assigneeTypeRaw as 'PROJECT_LEAD' | 'UNASSIGNED',
        }),
        avatarId: asPositiveInt(opts['avatar-id'], '--avatar-id'),
        permissionScheme: asPositiveInt(opts['permission-scheme'], '--permission-scheme'),
        notificationScheme: asPositiveInt(opts['notification-scheme'], '--notification-scheme'),
        categoryId: asPositiveInt(opts['category-id'], '--category-id'),
      });
    }
    case 'update': {
      const projectIdOrKey = requireArg(cmd.positionalArgs[0], 'projectIdOrKey');
      const assigneeTypeRaw = asString(opts['assignee-type']);
      if (
        assigneeTypeRaw !== undefined &&
        assigneeTypeRaw !== 'PROJECT_LEAD' &&
        assigneeTypeRaw !== 'UNASSIGNED'
      ) {
        throw new Error(
          `--assignee-type must be PROJECT_LEAD or UNASSIGNED, got: ${assigneeTypeRaw}`,
        );
      }
      return client.projects.update(projectIdOrKey, {
        name: asString(opts['name']),
        description: asString(opts['description']),
        leadAccountId: asString(opts['lead-account-id']),
        url: asString(opts['url']),
        ...(assigneeTypeRaw !== undefined && {
          assigneeType: assigneeTypeRaw as 'PROJECT_LEAD' | 'UNASSIGNED',
        }),
      });
    }
    case 'delete': {
      const projectIdOrKey = requireArg(cmd.positionalArgs[0], 'projectIdOrKey');
      await client.projects.delete(projectIdOrKey, {
        ...(opts['enable-undo'] !== undefined && { enableUndo: asBoolFlag(opts['enable-undo']) }),
      });
      return { deleted: true };
    }
    case 'recent': {
      const expandRaw = asString(opts['expand']);
      return client.projects.recent({
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(expandRaw !== undefined && { expand: expandRaw.split(',').map((s) => s.trim()) }),
      });
    }
    case 'list-types':
      return client.projects.listTypes();
    case 'get-type':
      return client.projects.getType(requireArg(cmd.positionalArgs[0], 'typeKey'));
    case 'get-accessible-type':
      return client.projects.getAccessibleType(requireArg(cmd.positionalArgs[0], 'typeKey'));
    case 'list-accessible-types':
      return client.projects.listAccessibleTypes();
    case 'get-email':
      return client.projects.getEmail(requireArg(cmd.positionalArgs[0], 'projectId'));
    case 'set-email':
      await client.projects.setEmail(requireArg(cmd.positionalArgs[0], 'projectId'), {
        emailAddress: asString(opts['email-address']),
      });
      return { updated: true };
    case 'get-hierarchy':
      return client.projects.getHierarchy(requireArg(cmd.positionalArgs[0], 'projectId'));
    case 'archive':
      await client.projects.archive(requireArg(cmd.positionalArgs[0], 'projectIdOrKey'));
      return { archived: true };
    case 'set-avatar':
      await client.projects.setAvatar(requireArg(cmd.positionalArgs[0], 'projectIdOrKey'), {
        id: requireOpt(opts['avatar-id'], '--avatar-id'),
      });
      return { updated: true };
    case 'delete-avatar':
      await client.projects.deleteAvatar(
        requireArg(cmd.positionalArgs[0], 'projectIdOrKey'),
        requireArg(cmd.positionalArgs[1], 'avatarId'),
      );
      return { deleted: true };
    case 'load-avatar':
      return client.projects.loadAvatar(
        requireArg(cmd.positionalArgs[0], 'projectIdOrKey'),
        parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value'),
      );
    case 'get-avatars':
      return client.projects.getAvatars(requireArg(cmd.positionalArgs[0], 'projectIdOrKey'));
    case 'get-classification-config':
      return client.projects.getClassificationConfig(
        requireArg(cmd.positionalArgs[0], 'projectIdOrKey'),
      );
    case 'delete-classification-level':
      await client.projects.deleteClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'projectIdOrKey'),
      );
      return { deleted: true };
    case 'get-classification-level':
      return client.projects.getClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'projectIdOrKey'),
      );
    case 'set-classification-level':
      await client.projects.setClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'projectIdOrKey'),
        { id: asString(opts['classification-id']) },
      );
      return { updated: true };
    case 'list-components':
      return client.projects.listComponents(requireArg(cmd.positionalArgs[0], 'projectIdOrKey'), {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        orderBy: asString(opts['order-by']),
        componentSource: asString(opts['component-source']),
        query: asString(opts['query']),
      });
    case 'list-all-components':
      return client.projects.listAllComponents(requireArg(cmd.positionalArgs[0], 'projectIdOrKey'));
    case 'delete-async':
      return client.projects.deleteAsync(requireArg(cmd.positionalArgs[0], 'projectIdOrKey'));
    case 'get-features':
      return client.projects.getFeatures(requireArg(cmd.positionalArgs[0], 'projectIdOrKey'));
    case 'set-feature-state':
      return client.projects.setFeatureState(
        requireArg(cmd.positionalArgs[0], 'projectIdOrKey'),
        requireArg(cmd.positionalArgs[1], 'featureKey'),
        asFeatureState(requireOpt(opts['state'], '--state')),
      );
    case 'list-properties':
      return client.projects.listProperties(requireArg(cmd.positionalArgs[0], 'projectIdOrKey'));
    case 'delete-property':
      await client.projects.deleteProperty(
        requireArg(cmd.positionalArgs[0], 'projectIdOrKey'),
        requireArg(cmd.positionalArgs[1], 'propertyKey'),
      );
      return { deleted: true };
    case 'get-property':
      return client.projects.getProperty(
        requireArg(cmd.positionalArgs[0], 'projectIdOrKey'),
        requireArg(cmd.positionalArgs[1], 'propertyKey'),
      );
    case 'set-property':
      await client.projects.setProperty(
        requireArg(cmd.positionalArgs[0], 'projectIdOrKey'),
        requireArg(cmd.positionalArgs[1], 'propertyKey'),
        parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value'),
      );
      return { updated: true };
    case 'restore':
      await client.projects.restore(requireArg(cmd.positionalArgs[0], 'projectIdOrKey'));
      return { restored: true };
    case 'list-roles':
      return client.projects.listRoles(requireArg(cmd.positionalArgs[0], 'projectIdOrKey'));
    case 'delete-role-actors': {
      const projectIdOrKey = requireArg(cmd.positionalArgs[0], 'projectIdOrKey');
      const roleId = asPositiveInt(cmd.positionalArgs[1], 'roleId');
      if (roleId === undefined) throw new Error('Missing required argument: roleId');
      await client.projects.deleteRoleActors(projectIdOrKey, roleId, {
        user: asString(opts['user']),
        groupId: asString(opts['group-id']),
        group: asString(opts['group']),
      });
      return { deleted: true };
    }
    case 'get-role': {
      const projectIdOrKey = requireArg(cmd.positionalArgs[0], 'projectIdOrKey');
      const roleId = asPositiveInt(cmd.positionalArgs[1], 'roleId');
      if (roleId === undefined) throw new Error('Missing required argument: roleId');
      const excludeInactiveUsers = asBoolFlag(opts['exclude-inactive-users']);
      return client.projects.getRole(projectIdOrKey, roleId, {
        ...(excludeInactiveUsers !== undefined && { excludeInactiveUsers }),
      });
    }
    case 'add-role-actors': {
      const projectIdOrKey = requireArg(cmd.positionalArgs[0], 'projectIdOrKey');
      const roleId = asPositiveInt(cmd.positionalArgs[1], 'roleId');
      if (roleId === undefined) throw new Error('Missing required argument: roleId');
      return client.projects.addRoleActors(
        projectIdOrKey,
        roleId,
        parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body') as Parameters<
          typeof client.projects.addRoleActors
        >[2],
      );
    }
    case 'set-role-actors': {
      const projectIdOrKey = requireArg(cmd.positionalArgs[0], 'projectIdOrKey');
      const roleId = asPositiveInt(cmd.positionalArgs[1], 'roleId');
      if (roleId === undefined) throw new Error('Missing required argument: roleId');
      return client.projects.setRoleActors(
        projectIdOrKey,
        roleId,
        parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body') as Parameters<
          typeof client.projects.setRoleActors
        >[2],
      );
    }
    case 'get-role-details': {
      const projectIdOrKey = requireArg(cmd.positionalArgs[0], 'projectIdOrKey');
      const currentMember = asBoolFlag(opts['current-member']);
      const excludeConnectAddons = asBoolFlag(opts['exclude-connect-addons']);
      return client.projects.getRoleDetails(projectIdOrKey, {
        ...(currentMember !== undefined && { currentMember }),
        ...(excludeConnectAddons !== undefined && { excludeConnectAddons }),
      });
    }
    case 'get-statuses':
      return client.projects.getStatuses(requireArg(cmd.positionalArgs[0], 'projectIdOrKey'));
    case 'list-versions': {
      const projectIdOrKey = requireArg(cmd.positionalArgs[0], 'projectIdOrKey');
      return client.projects.listVersions(projectIdOrKey, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        orderBy: asString(opts['order-by']),
        query: asString(opts['query']),
        status: asString(opts['status']),
        expand: asString(opts['expand']),
      });
    }
    case 'list-all-versions': {
      const projectIdOrKey = requireArg(cmd.positionalArgs[0], 'projectIdOrKey');
      return client.projects.listAllVersions(projectIdOrKey, {
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        orderBy: asString(opts['order-by']),
        query: asString(opts['query']),
        status: asString(opts['status']),
        expand: asString(opts['expand']),
      });
    }
    case 'get-issue-security-scheme':
      return client.projects.getIssueSecurityScheme(
        requireArg(cmd.positionalArgs[0], 'projectKeyOrId'),
      );
    case 'get-notification-scheme':
      return client.projects.getNotificationScheme(
        requireArg(cmd.positionalArgs[0], 'projectKeyOrId'),
        { expand: asString(opts['expand']) },
      );
    case 'get-permission-scheme':
      return client.projects.getPermissionScheme(
        requireArg(cmd.positionalArgs[0], 'projectKeyOrId'),
        { expand: asString(opts['expand']) },
      );
    case 'set-permission-scheme': {
      const projectKeyOrId = requireArg(cmd.positionalArgs[0], 'projectKeyOrId');
      const permSchemeId = asPositiveInt(opts['permission-scheme'], '--permission-scheme');
      if (permSchemeId === undefined)
        throw new Error('Missing required option: --permission-scheme');
      return client.projects.setPermissionScheme(projectKeyOrId, { id: permSchemeId });
    }
    case 'get-security-levels':
      return client.projects.getSecurityLevels(requireArg(cmd.positionalArgs[0], 'projectKeyOrId'));
    case 'list-categories':
      return client.projects.listCategories();
    case 'create-category':
      return client.projects.createCategory({
        name: requireOpt(opts['name'], '--name'),
        description: asString(opts['description']),
      });
    case 'delete-category':
      await client.projects.deleteCategory(requireArg(cmd.positionalArgs[0], 'categoryId'));
      return { deleted: true };
    case 'get-category':
      return client.projects.getCategory(requireArg(cmd.positionalArgs[0], 'categoryId'));
    case 'update-category':
      return client.projects.updateCategory(requireArg(cmd.positionalArgs[0], 'categoryId'), {
        name: asString(opts['name']),
        description: asString(opts['description']),
      });
    case 'get-projects-fields':
      return client.projects.getProjectsFields();
    case 'validate-project-key':
      return client.projects.validateProjectKey(requireOpt(opts['key'], '--key'));
    case 'get-valid-project-key':
      return client.projects.getValidProjectKey(requireOpt(opts['key'], '--key'));
    case 'get-valid-project-name':
      return client.projects.getValidProjectName(requireOpt(opts['name'], '--name'));
    default:
      throw new Error(
        `Unknown projects action: ${cmd.action}. Actions: list, get, list-legacy, create, update, delete, recent, list-types, get-type, get-accessible-type, list-accessible-types, get-email, set-email, get-hierarchy, archive, set-avatar, delete-avatar, load-avatar, get-avatars, get-classification-config, delete-classification-level, get-classification-level, set-classification-level, list-components, list-all-components, delete-async, get-features, set-feature-state, list-properties, delete-property, get-property, set-property, restore, list-roles, delete-role-actors, get-role, add-role-actors, set-role-actors, get-role-details, get-statuses, list-versions, list-all-versions, get-issue-security-scheme, get-notification-scheme, get-permission-scheme, set-permission-scheme, get-security-levels, list-categories, create-category, delete-category, get-category, update-category, get-projects-fields, validate-project-key, get-valid-project-key, get-valid-project-name`,
      );
  }
}

async function executeSearch(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;
  switch (cmd.action) {
    case 'get': {
      // B932: GET /search (existing searchGet method)
      const jql = requireOpt(opts['jql'], '--jql');
      return client.search.searchGet({
        jql,
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        fields: csvFlag(opts['fields']),
      });
    }
    case 'approximate-count': {
      // B766
      const jql = requireOpt(opts['jql'], '--jql');
      return client.search.approximateCount(jql);
    }
    case 'jql-get': {
      // B767
      return client.search.searchJqlGet({
        jql: asString(opts['jql']),
        nextPageToken: asString(opts['next-page-token']),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        fields: csvFlag(opts['fields']),
        expand: csvFlag(opts['expand']),
      });
    }
    case 'jql-post': {
      // B768
      return client.search.searchJqlPost({
        jql: asString(opts['jql']),
        nextPageToken: asString(opts['next-page-token']),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        fields: csvFlag(opts['fields']),
        expand: csvFlag(opts['expand']),
      });
    }
    default: {
      // Backwards compat: atlas jira search --jql "..." still works
      const jql = asString(opts['jql']);
      if (!jql) throw new Error('Missing --jql option for search');
      return client.search.search({
        jql,
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        fields: csvFlag(opts['fields']),
      });
    }
  }
}

async function executeUsers(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;
  switch (cmd.action) {
    case 'get':
      return client.users.get(requireArg(cmd.positionalArgs[0], 'account ID'));
    case 'me':
      return client.users.getCurrentUser();
    case 'search':
      return client.users.search({
        query: requireOpt(opts['query'], '--query'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    case 'delete': {
      await client.users.deleteUser(requireOpt(opts['account-id'], '--account-id'));
      return { deleted: true };
    }
    case 'create':
      return client.users.createUser({
        emailAddress: requireOpt(opts['email'], '--email'),
        displayName: asString(opts['display-name']),
      });
    case 'assignable-multi-project': {
      const projectKeysRaw = asString(opts['project-keys']);
      return client.users.assignableMultiProjectSearch({
        query: asString(opts['query']),
        username: asString(opts['user-name']),
        accountId: asString(opts['account-id']),
        ...(projectKeysRaw !== undefined && {
          projectKeys: projectKeysRaw.split(',').map((s) => s.trim()),
        }),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
      });
    }
    case 'assignable':
      return client.users.assignableSearch({
        project: requireOpt(opts['project'], '--project'),
        query: asString(opts['query']),
        username: asString(opts['user-name']),
        accountId: asString(opts['account-id']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    case 'bulk': {
      const accountIdsRaw = requireOpt(opts['account-ids'], '--account-ids');
      const accountIds = accountIdsRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      return client.users.bulkGet({
        accountId: accountIds,
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'bulk-migration': {
      const usernameRaw = asString(opts['user-name']);
      const keyRaw = asString(opts['key']);
      return client.users.bulkMigration({
        ...(usernameRaw !== undefined && {
          username: usernameRaw.split(',').map((s) => s.trim()),
        }),
        ...(keyRaw !== undefined && {
          key: keyRaw.split(',').map((s) => s.trim()),
        }),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'reset-columns': {
      await client.users.resetColumns(asString(opts['account-id']));
      return { reset: true };
    }
    case 'get-columns':
      return client.users.getColumns(asString(opts['account-id']));
    case 'set-columns': {
      const columnsRaw = requireOpt(opts['columns'], '--columns');
      const columnList = columnsRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await client.users.setColumns(columnList, asString(opts['account-id']));
      return { set: true };
    }
    case 'email':
      return client.users.getEmail(requireOpt(opts['account-id'], '--account-id'));
    case 'bulk-emails': {
      const accountIdsRaw = requireOpt(opts['account-ids'], '--account-ids');
      const accountIds = accountIdsRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      return client.users.bulkGetEmails(accountIds);
    }
    case 'groups':
      return client.users.getGroups({
        accountId: requireOpt(opts['account-id'], '--account-id'),
        username: asString(opts['user-name']),
        key: asString(opts['key']),
      });
    case 'permission-search': {
      return client.users.getPermissionUsers({
        projectKey: asString(opts['project-key']),
        projectUuid: asString(opts['project-uuid']),
        issueKey: asString(opts['issue-key']),
        query: asString(opts['query']),
        permissions: parseCsv(opts['permissions']),
        accountId: asString(opts['account-id']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'picker': {
      return client.users.picker({
        query: requireOpt(opts['query'], '--query'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        showAvatar: opts['show-avatar'] === true ? true : undefined,
        exclude: parseCsv(opts['exclude']),
        excludeAccountIds: parseCsv(opts['exclude-account-ids']),
        avatarSize: asString(opts['avatar-size']),
        excludeConnectUsers: opts['exclude-connect-users'] === true ? true : undefined,
      });
    }
    case 'list-properties':
      return client.users.listProperties({
        userKey: asString(opts['user-key']),
        accountId: asString(opts['account-id']),
      });
    case 'delete-property': {
      const propertyKey = requireArg(cmd.positionalArgs[0], 'property key');
      await client.users.deleteProperty(propertyKey, {
        userKey: asString(opts['user-key']),
        accountId: asString(opts['account-id']),
      });
      return undefined;
    }
    case 'get-property': {
      const propertyKey = requireArg(cmd.positionalArgs[0], 'property key');
      return client.users.getProperty(propertyKey, {
        userKey: asString(opts['user-key']),
        accountId: asString(opts['account-id']),
      });
    }
    case 'set-property': {
      const propertyKey = requireArg(cmd.positionalArgs[0], 'property key');
      const value = parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value');
      await client.users.setProperty(propertyKey, value, {
        userKey: asString(opts['user-key']),
        accountId: asString(opts['account-id']),
      });
      return undefined;
    }
    case 'search-query':
      return client.users.searchQuery({
        query: asString(opts['query']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    case 'search-query-key':
      return client.users.searchQueryKey({
        query: asString(opts['query']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    case 'viewissue-search':
      return client.users.viewIssueSearch({
        issueKey: asString(opts['issue-key']),
        query: asString(opts['query']),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        accountId: asString(opts['account-id']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
      });
    case 'list':
      return client.users.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    case 'list-search':
      return client.users.listSearch({
        query: asString(opts['query']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    default:
      throw new Error(
        `Unknown users action: ${cmd.action}. Actions: get, me, search, delete, create, assignable-multi-project, assignable, bulk, bulk-migration, reset-columns, get-columns, set-columns, email, bulk-emails, groups, permission-search, picker, list-properties, delete-property, get-property, set-property, search-query, search-query-key, viewissue-search, list, list-search`,
      );
  }
}

async function executeIssueTypes(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'list':
      return client.issueTypes.list();
    case 'get':
      return client.issueTypes.get(requireArg(cmd.positionalArgs[0], 'issue type ID'));
    default:
      throw new Error(`Unknown issue-types action: ${cmd.action}. Actions: list, get`);
  }
}

async function executePriorities(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.priorities.list();
    case 'get':
      return client.priorities.get(requireArg(cmd.positionalArgs[0], 'priority ID'));
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      const iconUrl = asString(opts['icon-url']);
      const statusColor = asString(opts['status-color']);
      return client.priorities.create({
        name,
        ...(description !== undefined && { description }),
        ...(iconUrl !== undefined && { iconUrl }),
        ...(statusColor !== undefined && { statusColor }),
      });
    }
    case 'delete': {
      const id = requireArg(cmd.positionalArgs[0], 'priority ID');
      const replaceWith = asString(opts['replace-with']);
      await client.priorities.delete(id, {
        ...(replaceWith !== undefined && { replaceWith }),
      });
      return { deleted: true };
    }
    case 'update': {
      const id = requireArg(cmd.positionalArgs[0], 'priority ID');
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      const iconUrl = asString(opts['icon-url']);
      const statusColor = asString(opts['status-color']);
      await client.priorities.update(id, {
        name,
        ...(description !== undefined && { description }),
        ...(iconUrl !== undefined && { iconUrl }),
        ...(statusColor !== undefined && { statusColor }),
      });
      return { updated: true };
    }
    case 'set-default': {
      const id = requireOpt(opts['id'], '--id');
      await client.priorities.setDefault({ id });
      return { updated: true };
    }
    case 'move': {
      const idsRaw = requireOpt(opts['ids'], '--ids');
      const ids = splitCsvIds(idsRaw);
      const after = asString(opts['after']);
      const before = asString(opts['before']);
      if (after !== undefined && before !== undefined) {
        throw new Error('priorities move accepts either --after or --before, not both');
      }
      await client.priorities.move({
        ids,
        ...(after !== undefined && { after }),
        ...(before !== undefined && { before }),
      });
      return { moved: true };
    }
    case 'search': {
      const idsRaw = asString(opts['ids']);
      const id = idsRaw ? splitCsvIds(idsRaw) : undefined;
      return client.priorities.search({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(id !== undefined && { id }),
        onlyDefault: asBoolFlag(opts['only-default']),
        priorityName: asString(opts['priority-name']),
        expand: asString(opts['expand']),
      });
    }
    default:
      throw new Error(
        `Unknown priorities action: ${cmd.action}. Actions: list, get, create, update, delete, set-default, move, search`,
      );
  }
}

async function executeStatuses(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.statuses.list();
    case 'bulk-delete': {
      const idsRaw = requireOpt(opts['ids'], '--ids');
      const id = splitCsvIds(idsRaw);
      await client.statuses.bulkDelete({ id });
      return { deleted: true };
    }
    case 'bulk-create': {
      const valueRaw = requireOpt(opts['value'], '--value');
      const statuses = parseJsonArrayFlag(valueRaw, '--value') as CreateStatusData[];
      return client.statuses.bulkCreate({ statuses });
    }
    case 'bulk-update': {
      const valueRaw = requireOpt(opts['value'], '--value');
      const statuses = parseJsonArrayFlag(valueRaw, '--value') as UpdateStatusData[];
      await client.statuses.bulkUpdate({ statuses });
      return { updated: true };
    }
    case 'get-issue-type-usages': {
      const statusId = requireArg(cmd.positionalArgs[0], 'statusId');
      const projectId = requireArg(cmd.positionalArgs[1], 'projectId');
      return client.statuses.getIssueTypeUsages(statusId, projectId, {
        nextPageToken: asString(opts['next-page-token']),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'get-project-usages': {
      const statusId = requireArg(cmd.positionalArgs[0], 'statusId');
      return client.statuses.getProjectUsages(statusId, {
        nextPageToken: asString(opts['next-page-token']),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'get-workflow-usages': {
      const statusId = requireArg(cmd.positionalArgs[0], 'statusId');
      return client.statuses.getWorkflowUsages(statusId, {
        nextPageToken: asString(opts['next-page-token']),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'by-names': {
      const namesRaw = requireOpt(opts['names'], '--names');
      const names = splitCsvIds(namesRaw);
      return client.statuses.byNames({ names });
    }
    case 'search':
      return client.statuses.search({
        projectId: asString(opts['project-id']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        searchString: asString(opts['search-string']),
        statusCategory: asStatusCategory(opts['status-category']),
      });
    default:
      throw new Error(
        `Unknown statuses action: ${cmd.action}. Actions: list, bulk-delete, bulk-create, bulk-update, get-issue-type-usages, get-project-usages, get-workflow-usages, by-names, search`,
      );
  }
}

async function executeBoards(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      return client.boards.list({
        type: asBoardType(opts['type']),
        name: asString(opts['name']),
        projectKeyOrId: asString(opts['project']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'get': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.get(boardId);
    }
    case 'create': {
      const filterIdRaw = requireOpt(opts['filter-id'], '--filter-id');
      return client.boards.create({
        name: requireOpt(opts['name'], '--name'),
        type: requireBoardType(opts['type']),
        filterId: parsePositiveIntArg(filterIdRaw, '--filter-id'),
      });
    }
    case 'delete': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      await client.boards.delete(boardId);
      return { deleted: true };
    }
    case 'backlog': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.getBacklog(boardId, {
        jql: asString(opts['jql']),
        fields: csvFlag(opts['fields']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'configuration': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.getConfiguration(boardId);
    }
    case 'list-epics': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.listEpics(boardId, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        done: asBoolFlag(opts['done']),
      });
    }
    case 'epic-issues': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      const epicId = parsePositiveIntArg(requireArg(cmd.positionalArgs[1], 'epicId'), 'epicId');
      return client.boards.getEpicIssues(boardId, epicId, {
        jql: asString(opts['jql']),
        fields: csvFlag(opts['fields']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'issues-without-epic': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.getIssuesWithoutEpic(boardId, {
        jql: asString(opts['jql']),
        fields: csvFlag(opts['fields']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'get-features': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.getFeatures(boardId);
    }
    case 'toggle-feature': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      const feature = requireOpt(opts['feature'], '--feature');
      const enablingRaw = requireOpt(opts['enabling'], '--enabling');
      if (enablingRaw !== 'true' && enablingRaw !== 'false') {
        throw new Error(`expected 'true' or 'false', got: ${enablingRaw}`);
      }
      return client.boards.toggleFeature(boardId, { feature, enabling: enablingRaw === 'true' });
    }
    case 'get-issues': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.getIssues(boardId, {
        jql: asString(opts['jql']),
        fields: csvFlag(opts['fields']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'move-issues': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      const issuesRaw = requireOpt(opts['issues'], '--issues');
      const issues = issuesRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await client.boards.moveIssues(boardId, issues);
      return { moved: true };
    }
    case 'list-projects': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.listProjects(boardId, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'list-projects-full': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.listProjectsFull(boardId, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'list-sprints': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.listSprints(boardId, {
        state: asString(opts['state']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'list-versions': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.listVersions(boardId, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        released: asBoolFlag(opts['released']),
      });
    }
    case 'sprint-issues': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      const sprintId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[1], 'sprintId'),
        'sprintId',
      );
      return client.boards.getSprintIssues(boardId, sprintId, {
        jql: asString(opts['jql']),
        fields: csvFlag(opts['fields']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'list-properties': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.listProperties(boardId);
    }
    case 'delete-property': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      const propertyKey = requireArg(cmd.positionalArgs[1], 'propertyKey');
      await client.boards.deleteProperty(boardId, propertyKey);
      return { deleted: true };
    }
    case 'get-property': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      const propertyKey = requireArg(cmd.positionalArgs[1], 'propertyKey');
      return client.boards.getProperty(boardId, propertyKey);
    }
    case 'set-property': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      const propertyKey = requireArg(cmd.positionalArgs[1], 'propertyKey');
      const valueRaw = requireOpt(opts['value'], '--value');
      let value: unknown;
      try {
        value = JSON.parse(valueRaw);
      } catch {
        throw new Error('--value must be valid JSON');
      }
      await client.boards.setProperty(boardId, propertyKey, value);
      return { set: true };
    }
    case 'list-quickfilters': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.listQuickFilters(boardId, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'get-quickfilter': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      const quickFilterId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[1], 'quickFilterId'),
        'quickFilterId',
      );
      return client.boards.getQuickFilter(boardId, quickFilterId);
    }
    case 'get-reports': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.getReports(boardId);
    }
    case 'list-by-filter': {
      const filterId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'filterId'),
        'filterId',
      );
      return client.boards.listByFilter(filterId, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'backlog-enhanced': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.getBacklogEnhanced(boardId, enhancedBoardParams(opts));
    }
    case 'get-issues-enhanced': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.getIssuesEnhanced(boardId, enhancedBoardParams(opts));
    }
    case 'issues-without-epic-enhanced': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.getIssuesWithoutEpicEnhanced(boardId, enhancedBoardParams(opts));
    }
    case 'epic-issues-enhanced': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      const epicId = parsePositiveIntArg(requireArg(cmd.positionalArgs[1], 'epicId'), 'epicId');
      return client.boards.getEpicIssuesEnhanced(boardId, epicId, enhancedBoardParams(opts));
    }
    case 'sprint-issues-enhanced': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      const sprintId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[1], 'sprintId'),
        'sprintId',
      );
      return client.boards.getSprintIssuesEnhanced(boardId, sprintId, enhancedBoardParams(opts));
    }
    default:
      throw new Error(
        `Unknown boards action: ${cmd.action}. Actions: list, get, create, delete, backlog, configuration, list-epics, epic-issues, issues-without-epic, get-features, toggle-feature, get-issues, move-issues, list-projects, list-projects-full, list-sprints, list-versions, sprint-issues, list-by-filter, list-properties, delete-property, get-property, set-property, list-quickfilters, get-quickfilter, get-reports, backlog-enhanced, get-issues-enhanced, issues-without-epic-enhanced, epic-issues-enhanced, sprint-issues-enhanced`,
      );
  }
}

/**
 * Build the shared param object for the enhanced (JSIS) board issue actions
 * (`backlog-enhanced`, `get-issues-enhanced`, etc.). These use token
 * pagination (`--next-page-token`), so there is no `--start-at`.
 * `--reconcile-issues` is a CSV of positive integer issue IDs.
 */
function enhancedBoardParams(opts: ParsedCommand['options']): ListSoftwareIssuesParams {
  const reconcileRaw = asString(opts['reconcile-issues']);
  return {
    jql: asString(opts['jql']),
    fields: csvFlag(opts['fields']),
    maxResults: asPositiveInt(opts['max-results'], '--max-results'),
    nextPageToken: asString(opts['next-page-token']),
    expand: asString(opts['expand']),
    validateQuery: asBoolFlag(opts['validate-query']),
    reconcileIssues:
      reconcileRaw === undefined
        ? undefined
        : splitCsvIds(reconcileRaw).map((s) => parsePositiveIntArg(s, '--reconcile-issues')),
  };
}

async function executeSprints(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get': {
      const sprintId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'sprintId'),
        'sprintId',
      );
      return client.sprints.get(sprintId);
    }
    case 'create':
      return client.sprints.create({
        name: requireOpt(opts['name'], '--name'),
        originBoardId: parsePositiveIntArg(
          requireOpt(opts['board-id'], '--board-id'),
          '--board-id',
        ),
        startDate: asString(opts['start-date']),
        endDate: asString(opts['end-date']),
        goal: asString(opts['goal']),
      });
    case 'update': {
      const sprintId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'sprintId'),
        'sprintId',
      );
      return client.sprints.update(sprintId, {
        name: asString(opts['name']),
        state: asSprintState(opts['state']),
        startDate: asString(opts['start-date']),
        endDate: asString(opts['end-date']),
        goal: asString(opts['goal']),
      });
    }
    case 'delete': {
      const sprintId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'sprintId'),
        'sprintId',
      );
      await client.sprints.delete(sprintId);
      return { deleted: true };
    }
    case 'get-issues': {
      const sprintId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'sprintId'),
        'sprintId',
      );
      return client.sprints.getIssues(sprintId, {
        jql: asString(opts['jql']),
        fields: csvFlag(opts['fields']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'partial-update': {
      const sprintId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'sprintId'),
        'sprintId',
      );
      return client.sprints.partialUpdate(sprintId, {
        name: asString(opts['name']),
        state: asSprintState(opts['state']),
        startDate: asString(opts['start-date']),
        endDate: asString(opts['end-date']),
        goal: asString(opts['goal']),
      });
    }
    case 'move-issues': {
      const sprintId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'sprintId'),
        'sprintId',
      );
      const issuesRaw = requireOpt(opts['issues'], '--issues');
      const issues = issuesRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await client.sprints.moveIssues(sprintId, issues);
      return { moved: true };
    }
    case 'list-properties': {
      const sprintId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'sprintId'),
        'sprintId',
      );
      return client.sprints.listProperties(sprintId);
    }
    case 'get-property': {
      const sprintId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'sprintId'),
        'sprintId',
      );
      const propertyKey = requireArg(cmd.positionalArgs[1], 'propertyKey');
      return client.sprints.getProperty(sprintId, propertyKey);
    }
    case 'set-property': {
      const sprintId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'sprintId'),
        'sprintId',
      );
      const propertyKey = requireArg(cmd.positionalArgs[1], 'propertyKey');
      const valueRaw = requireOpt(opts['value'], '--value');
      let value: unknown;
      try {
        value = JSON.parse(valueRaw);
      } catch {
        throw new Error('--value must be valid JSON');
      }
      await client.sprints.setProperty(sprintId, propertyKey, value);
      return { set: true };
    }
    case 'delete-property': {
      const sprintId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'sprintId'),
        'sprintId',
      );
      const propertyKey = requireArg(cmd.positionalArgs[1], 'propertyKey');
      await client.sprints.deleteProperty(sprintId, propertyKey);
      return { deleted: true };
    }
    case 'swap': {
      const sprintId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'sprintId'),
        'sprintId',
      );
      const withRaw = requireOpt(opts['with'], '--with');
      const sprintToSwapWith = parsePositiveIntArg(withRaw, '--with');
      await client.sprints.swap(sprintId, sprintToSwapWith);
      return { swapped: true };
    }
    default:
      throw new Error(
        `Unknown sprints action: ${cmd.action}. Actions: get, create, update, delete, get-issues, partial-update, move-issues, list-properties, get-property, set-property, delete-property, swap`,
      );
  }
}

async function executeEpic(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get':
      return client.epic.get(requireArg(cmd.positionalArgs[0], 'epicIdOrKey'));
    case 'update': {
      const epicIdOrKey = requireArg(cmd.positionalArgs[0], 'epicIdOrKey');
      const data: Record<string, unknown> = {};
      const name = asString(opts['name']);
      if (name !== undefined) data['name'] = name;
      const summary = asString(opts['summary']);
      if (summary !== undefined) data['summary'] = summary;
      const color = asString(opts['color']);
      if (color !== undefined) data['color'] = { key: color };
      if (opts['done'] === true) data['done'] = true;
      return client.epic.partialUpdate(epicIdOrKey, data);
    }
    case 'issues': {
      const epicIdOrKey = requireArg(cmd.positionalArgs[0], 'epicIdOrKey');
      return client.epic.getIssues(epicIdOrKey, {
        jql: asString(opts['jql']),
        fields: csvFlag(opts['fields']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'move-issues': {
      const epicIdOrKey = requireArg(cmd.positionalArgs[0], 'epicIdOrKey');
      const issuesRaw = requireOpt(opts['issues'], '--issues');
      const issues = issuesRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await client.epic.moveIssues(epicIdOrKey, issues);
      return { moved: true };
    }
    case 'rank': {
      const epicIdOrKey = requireArg(cmd.positionalArgs[0], 'epicIdOrKey');
      const before = asString(opts['before']);
      const after = asString(opts['after']);
      const customField = asPositiveInt(opts['custom-field'], '--custom-field');
      await client.epic.rank(epicIdOrKey, {
        rankBeforeEpic: before,
        rankAfterEpic: after,
        rankCustomFieldId: customField,
      });
      return { ranked: true };
    }
    case 'issues-none':
      return client.epic.getIssuesWithoutEpic({
        jql: asString(opts['jql']),
        fields: csvFlag(opts['fields']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    case 'remove-issues': {
      const issuesRaw = requireOpt(opts['issues'], '--issues');
      const issues = issuesRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await client.epic.removeIssuesFromEpic(issues);
      return { removed: true };
    }
    default:
      throw new Error(
        `Unknown epic action: ${cmd.action}. Actions: get, update, issues, move-issues, rank, issues-none, remove-issues`,
      );
  }
}

async function executeBacklog(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'move': {
      const issuesRaw = requireOpt(opts['issues'], '--issues');
      const issues = issuesRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const boardIdStr = asString(opts['board-id']);
      if (boardIdStr !== undefined) {
        const boardId = parsePositiveIntArg(boardIdStr, '--board-id');
        await client.backlog.moveIssuesToBoard(boardId, issues);
      } else {
        await client.backlog.moveIssues(issues);
      }
      return { moved: true };
    }
    default:
      throw new Error(`Unknown backlog action: ${cmd.action}. Actions: move`);
  }
}

async function executeAnnouncementBanner(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get':
      return client.announcementBanner.get();
    case 'update': {
      const message = asString(opts['message']);
      const visibility = asAnnouncementBannerVisibility(opts['visibility']);
      const isDismissible =
        opts['dismissible'] !== undefined ? asBoolFlag(opts['dismissible']) : undefined;
      const isEnabled = opts['enabled'] !== undefined ? asBoolFlag(opts['enabled']) : undefined;

      if (
        message === undefined &&
        visibility === undefined &&
        isDismissible === undefined &&
        isEnabled === undefined
      ) {
        throw new Error(
          'update requires at least one of: --message, --visibility, --dismissible, --enabled',
        );
      }

      const body = {
        ...(message !== undefined && { message }),
        ...(visibility !== undefined && { visibility }),
        ...(isDismissible !== undefined && { isDismissible }),
        ...(isEnabled !== undefined && { isEnabled }),
      };

      await client.announcementBanner.update(body);
      return { updated: true };
    }
    default:
      throw new Error(`Unknown announcement-banner action: ${cmd.action}. Actions: get, update`);
  }
}

async function executeDataPolicy(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get-workspace':
      return client.dataPolicy.getWorkspacePolicy();
    case 'list-projects': {
      const idsRaw = asString(opts['ids']);
      const ids = idsRaw
        ? idsRaw
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : undefined;
      return client.dataPolicy.listProjectPolicies({
        ids,
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    default:
      throw new Error(
        `Unknown data-policy action: ${cmd.action}. Actions: get-workspace, list-projects`,
      );
  }
}

async function executeWebhooks(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      return client.webhooks.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'register': {
      const url = asString(opts['url']);
      if (url === undefined) throw new Error('--url is required');
      const rawWebhooks = asString(opts['webhooks']);
      if (rawWebhooks === undefined) throw new Error('--webhooks is required');
      const webhooks = parseJsonArrayFlag(rawWebhooks, '--webhooks') as WebhookRegistration[];
      return client.webhooks.register({ url, webhooks });
    }
    case 'refresh': {
      const rawIds = asString(opts['webhook-ids']);
      if (rawIds === undefined) throw new Error('--webhook-ids is required');
      const webhookIds = parseJsonArrayFlag(rawIds, '--webhook-ids') as number[];
      return client.webhooks.refresh(webhookIds);
    }
    case 'list-failed': {
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      const afterStr = asString(opts['after']);
      const after = afterStr !== undefined ? parsePositiveIntArg(afterStr, '--after') : undefined;
      return client.webhooks.listFailed({
        ...(maxResults !== undefined && { maxResults }),
        ...(after !== undefined && { after }),
      });
    }
    case 'delete': {
      const rawIds = asString(opts['webhook-ids']);
      if (rawIds === undefined) throw new Error('--webhook-ids is required');
      const webhookIds = parseJsonArrayFlag(rawIds, '--webhook-ids') as number[];
      await client.webhooks.delete(webhookIds);
      return { deleted: true };
    }
    default:
      throw new Error(
        `Unknown webhooks action: ${cmd.action}. Actions: list, register, refresh, list-failed, delete`,
      );
  }
}

function asFeatureState(raw: string): 'ENABLED' | 'DISABLED' {
  if (raw !== 'ENABLED' && raw !== 'DISABLED') {
    throw new Error(`--state must be ENABLED or DISABLED, got: ${raw}`);
  }
  return raw;
}

function asAnnouncementBannerVisibility(
  value: string | boolean | undefined,
): 'PUBLIC' | 'PRIVATE' | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if (s === 'PUBLIC' || s === 'PRIVATE') return s;
  throw new Error(`--visibility must be one of: PUBLIC, PRIVATE. Got: ${s}`);
}

function asSprintState(
  value: string | boolean | undefined,
): 'active' | 'closed' | 'future' | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if (s === 'active' || s === 'closed' || s === 'future') return s;
  throw new Error(`--state must be one of: active, closed, future. Got: ${s}`);
}

function requireArg(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required argument: ${name}`);
  return value;
}

function requireOpt(value: string | boolean | undefined, name: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`Missing required option: ${name}`);
  return value;
}

function asString(value: string | boolean | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asPositiveInt(value: string | boolean | undefined, name: string): number | undefined {
  if (typeof value !== 'string') return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${value}`);
  }
  return n;
}

function asNonNegativeInt(value: string | boolean | undefined, name: string): number | undefined {
  if (typeof value !== 'string') return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${name} must be a non-negative integer, got: ${value}`);
  }
  return n;
}

function parsePositiveIntArg(value: string, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${value}`);
  }
  return n;
}

function asBoardType(
  value: string | boolean | undefined,
): 'scrum' | 'kanban' | 'simple' | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if (s === 'scrum' || s === 'kanban' || s === 'simple') return s;
  throw new Error(`--type must be one of: scrum, kanban, simple. Got: ${s}`);
}

function asAccessType(
  value: string | boolean | undefined,
): 'site-admin' | 'admin' | 'user' | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if (s === 'site-admin' || s === 'admin' || s === 'user') return s;
  throw new Error(`--access-type must be one of: site-admin, admin, user. Got: ${s}`);
}

function asExpressionCheck(
  value: string | boolean | undefined,
): 'syntax' | 'type' | 'complexity' | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if (s === 'syntax' || s === 'type' || s === 'complexity') return s;
  throw new Error(`Invalid --check value "${s}". Must be one of: syntax, type, complexity`);
}

function requireBoardType(value: string | boolean | undefined): 'scrum' | 'kanban' | 'simple' {
  const s = asString(value);
  if (!s) throw new Error('Missing required option: --type');
  if (s === 'scrum' || s === 'kanban' || s === 'simple') return s;
  throw new Error(`--type must be one of: scrum, kanban, simple. Got: ${s}`);
}

function asBoolFlag(value: string | boolean | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`expected 'true' or 'false', got: ${value}`);
}

function asWorkflowMode(value: string | boolean | undefined): 'live' | 'draft' | undefined {
  if (value === undefined) return undefined;
  if (value === 'live' || value === 'draft') return value;
  throw new Error(`--workflow-mode must be 'live' or 'draft'. Got: ${String(value)}`);
}

/** Require a positional arg that must be a positive integer; throws on missing or invalid input. */
function requirePositiveInt(value: string | undefined, name: string): number {
  const s = requireArg(value, name);
  const n = Number(s);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${s}`);
  }
  return n;
}

async function executeApplicationRole(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.applicationRole.list();
    case 'get':
      return client.applicationRole.get(requireOpt(opts['key'], '--key'));
    default:
      throw new Error(`Unknown application-role action: ${cmd.action}. Actions: list, get`);
  }
}

async function executeStatus(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'list':
      return client.status.list();
    case 'get':
      return client.status.get(requireArg(cmd.positionalArgs[0], 'idOrName'));
    default:
      throw new Error(`Unknown status action: ${cmd.action}. Actions: list, get`);
  }
}

async function executeStatusCategory(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'list':
      return client.statusCategory.list();
    case 'get':
      return client.statusCategory.get(requireArg(cmd.positionalArgs[0], 'idOrKey'));
    default:
      throw new Error(`Unknown status-category action: ${cmd.action}. Actions: list, get`);
  }
}

async function executeServerInfo(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'get':
      return client.serverInfo.get();
    default:
      throw new Error(`Unknown server-info action: ${cmd.action}. Actions: get`);
  }
}

async function executeInstance(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'get-license':
      return client.instance.getLicense();
    default:
      throw new Error(`Unknown instance action: ${cmd.action}. Actions: get-license`);
  }
}

async function executeMyPermissions(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get':
      return client.myPermissions.get({
        projectId: asString(opts['project-id']),
        projectKey: asString(opts['project-key']),
        issueId: asString(opts['issue-id']),
        issueKey: asString(opts['issue-key']),
        permissions: asString(opts['permissions']),
        projectUuid: asString(opts['project-uuid']),
        projectConfigurationUuid: asString(opts['project-configuration-uuid']),
        commentId: asString(opts['comment-id']),
      });
    default:
      throw new Error(`Unknown mypermissions action: ${cmd.action}. Actions: get`);
  }
}

async function executeMyPreferences(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get':
      return client.myPreferences.getPreference(requireOpt(opts['key'], '--key'));
    case 'set': {
      const key = requireOpt(opts['key'], '--key');
      const value = requireOpt(opts['value'], '--value');
      await client.myPreferences.setPreference(key, value);
      return;
    }
    case 'delete':
      await client.myPreferences.removePreference(requireOpt(opts['key'], '--key'));
      return;
    case 'get-locale':
      return client.myPreferences.getLocale();
    case 'set-locale': {
      const locale = requireOpt(opts['locale'], '--locale');
      await client.myPreferences.setLocale(locale);
      return;
    }
    default:
      throw new Error(
        `Unknown mypreferences action: ${cmd.action}. Actions: get, set, delete, get-locale, set-locale`,
      );
  }
}

async function executeAuditing(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.auditing.list({
        offset: asNonNegativeInt(opts['offset'], '--offset'),
        limit: asPositiveInt(opts['limit'], '--limit'),
        filter: asString(opts['filter']),
        from: asString(opts['from']),
        to: asString(opts['to']),
      });
    default:
      throw new Error(`Unknown auditing action: ${cmd.action}. Actions: list`);
  }
}

async function executeEvents(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'list':
      return client.events.list();
    default:
      throw new Error(`Unknown events action: ${cmd.action}. Actions: list`);
  }
}

async function executeChangelog(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'bulk-fetch': {
      const issuesRaw = requireOpt(opts['issues'], '--issues');
      const issueIdsOrKeys = issuesRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const authorIdsRaw = asString(opts['author-ids']);
      const filterByAuthorAccountId = authorIdsRaw
        ? authorIdsRaw
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : undefined;
      const fieldIdsRaw = asString(opts['field-ids']);
      const filterByFieldId = fieldIdsRaw
        ? fieldIdsRaw
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : undefined;
      return client.changelog.bulkFetch({
        issueIdsOrKeys,
        ...(filterByAuthorAccountId !== undefined && { filterByAuthorAccountId }),
        ...(filterByFieldId !== undefined && { filterByFieldId }),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    default:
      throw new Error(`Unknown changelog action: ${cmd.action}. Actions: bulk-fetch`);
  }
}

async function executeForge(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'bulk-panel-action': {
      const valueRaw = requireOpt(opts['value'], '--value');
      let actions: { issueId: string; moduleKey: string; payload?: Record<string, unknown> }[];
      try {
        actions = JSON.parse(valueRaw) as typeof actions;
      } catch {
        throw new Error('--value must be valid JSON (array of panel action objects)');
      }
      return client.forge.bulkPanelAction({ actions });
    }
    default:
      throw new Error(`Unknown forge action: ${cmd.action}. Actions: bulk-panel-action`);
  }
}

async function executeIncidents(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'get':
      return client.incidents.get(requireArg(cmd.positionalArgs[0], 'incidentId'));
    case 'delete':
      await client.incidents.delete(requireArg(cmd.positionalArgs[0], 'incidentId'));
      return { deleted: true };
    default:
      throw new Error(`Unknown incidents action: ${cmd.action}. Actions: get, delete`);
  }
}

async function executePostIncidentReviews(
  client: JiraClient,
  cmd: ParsedCommand,
): Promise<unknown> {
  switch (cmd.action) {
    case 'get':
      return client.postIncidentReviews.get(requireArg(cmd.positionalArgs[0], 'reviewId'));
    case 'delete':
      await client.postIncidentReviews.delete(requireArg(cmd.positionalArgs[0], 'reviewId'));
      return { deleted: true };
    default:
      throw new Error(`Unknown post-incident-reviews action: ${cmd.action}. Actions: get, delete`);
  }
}

async function executeVulnerability(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'get':
      return client.vulnerability.get(requireArg(cmd.positionalArgs[0], 'vulnerabilityId'));
    case 'delete':
      await client.vulnerability.delete(requireArg(cmd.positionalArgs[0], 'vulnerabilityId'));
      return { deleted: true };
    default:
      throw new Error(`Unknown vulnerability action: ${cmd.action}. Actions: get, delete`);
  }
}

async function executeDevopscomponents(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'get':
      return client.devopscomponents.get(requireArg(cmd.positionalArgs[0], 'componentId'));
    case 'delete':
      await client.devopscomponents.delete(requireArg(cmd.positionalArgs[0], 'componentId'));
      return { deleted: true };
    default:
      throw new Error(`Unknown devopscomponents action: ${cmd.action}. Actions: get, delete`);
  }
}

async function executeGroups(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;
  const groupName = asString(opts['group-name']);
  const groupId = asString(opts['group-id']);

  switch (cmd.action) {
    case 'picker': {
      const excludeRaw = asString(opts['exclude']);
      const exclude = excludeRaw
        ? excludeRaw
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : undefined;
      return client.groups.picker({
        query: asString(opts['query']),
        exclude,
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        userName: asString(opts['user-name']),
      });
    }
    case 'get': {
      const expand = asString(opts['expand']);
      return client.groups.get({
        ...(groupName !== undefined ? { groupname: groupName } : {}),
        ...(groupId !== undefined ? { groupId } : {}),
        ...(expand !== undefined ? { expand } : {}),
      });
    }
    case 'create': {
      const name = asString(opts['name']);
      if (!name) throw new Error('create requires --name');
      return client.groups.create({ name });
    }
    case 'delete': {
      const swapGroup = asString(opts['swap-group']);
      const swapGroupId = asString(opts['swap-group-id']);
      await client.groups.delete({
        ...(groupName !== undefined ? { groupname: groupName } : {}),
        ...(groupId !== undefined ? { groupId } : {}),
        ...(swapGroup !== undefined ? { swapGroup } : {}),
        ...(swapGroupId !== undefined ? { swapGroupId } : {}),
      });
      return { deleted: true };
    }
    case 'list-bulk': {
      const groupIds = parseCsv(opts['group-ids']);
      const groupNames = parseCsv(opts['group-names']);
      const accessType = asAccessType(opts['access-type']);
      const applicationKey = asString(opts['application-key']);
      return client.groups.listBulk({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(groupIds !== undefined ? { groupId: groupIds } : {}),
        ...(groupNames !== undefined ? { groupName: groupNames } : {}),
        ...(accessType !== undefined ? { accessType } : {}),
        ...(applicationKey !== undefined ? { applicationKey } : {}),
      });
    }
    case 'list-members': {
      return client.groups.listMembers({
        ...(groupName !== undefined ? { groupname: groupName } : {}),
        ...(groupId !== undefined ? { groupId } : {}),
        includeInactiveUsers: asBoolFlag(opts['include-inactive-users']),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'remove-user': {
      const accountId = asString(opts['account-id']);
      if (!accountId) throw new Error('remove-user requires --account-id');
      await client.groups.removeUser({
        accountId,
        ...(groupName !== undefined ? { groupname: groupName } : {}),
        ...(groupId !== undefined ? { groupId } : {}),
      });
      return { removed: true };
    }
    case 'add-user': {
      const accountId = asString(opts['account-id']);
      if (!accountId) throw new Error('add-user requires --account-id');
      return client.groups.addUser({
        accountId,
        ...(groupName !== undefined ? { groupname: groupName } : {}),
        ...(groupId !== undefined ? { groupId } : {}),
      });
    }
    default:
      throw new Error(
        `Unknown groups action: ${cmd.action}. Actions: picker, get, create, delete, list-bulk, list-members, remove-user, add-user`,
      );
  }
}

async function executeGroupUserPicker(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'pick': {
      const projectIdRaw = asString(opts['project-id']);
      const projectId = projectIdRaw
        ? projectIdRaw
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : undefined;
      return client.groupUserPicker.pick({
        query: asString(opts['query']),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        showAvatar: asBoolFlag(opts['show-avatar']),
        fieldId: asString(opts['field-id']),
        projectId,
        projectRole: asString(opts['project-role']),
        excludeConnectUsers: asBoolFlag(opts['exclude-connect-users']),
      });
    }
    default:
      throw new Error(`Unknown group-user-picker action: ${cmd.action}. Actions: pick`);
  }
}

async function executeSecurityLevel(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'get':
      return client.securityLevel.get(requireArg(cmd.positionalArgs[0], 'id'));
    default:
      throw new Error(`Unknown security-level action: ${cmd.action}. Actions: get`);
  }
}

async function executeLicense(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'get-approximate-count':
      return client.license.getApproximateCount();
    case 'get-approximate-count-for-product':
      return client.license.getApproximateCountForProduct(
        requireArg(cmd.positionalArgs[0], 'applicationKey'),
      );
    default:
      throw new Error(
        `Unknown license action: ${cmd.action}. Actions: get-approximate-count, get-approximate-count-for-product`,
      );
  }
}

async function executeSettings(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get-columns':
      return client.settings.getColumns();
    case 'set-columns': {
      const rawColumns = requireOpt(opts['columns'], '--columns');
      let columns: { label?: string; value?: string }[];
      try {
        columns = JSON.parse(rawColumns) as typeof columns;
      } catch {
        throw new Error('--columns must be valid JSON (array of {label, value} objects)');
      }
      await client.settings.setColumns({ columns });
      return { updated: true };
    }
    default:
      throw new Error(`Unknown settings action: ${cmd.action}. Actions: get-columns, set-columns`);
  }
}

async function executeRedact(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'start': {
      const fieldIdsRaw = asString(opts['field-ids']);
      const fieldIds = fieldIdsRaw
        ? fieldIdsRaw
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : undefined;
      return client.redact.start({
        jql: requireOpt(opts['jql'], '--jql'),
        ...(fieldIds !== undefined && { fieldIds }),
      });
    }
    case 'get-status':
      return client.redact.getStatus(requireArg(cmd.positionalArgs[0], 'jobId'));
    default:
      throw new Error(`Unknown redact action: ${cmd.action}. Actions: start, get-status`);
  }
}

async function executeFlag(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'get':
      return client.flag.get(requireArg(cmd.positionalArgs[0], 'featureFlagId'));
    case 'delete':
      await client.flag.delete(requireArg(cmd.positionalArgs[0], 'featureFlagId'));
      return { deleted: true };
    default:
      throw new Error(`Unknown flag action: ${cmd.action}. Actions: get, delete`);
  }
}

async function executeTask(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'get':
      return client.task.get(requireArg(cmd.positionalArgs[0], 'taskId'));
    case 'cancel':
      await client.task.cancel(requireArg(cmd.positionalArgs[0], 'taskId'));
      return { cancelled: true };
    default:
      throw new Error(`Unknown task action: ${cmd.action}. Actions: get, cancel`);
  }
}

async function executeAvatar(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'list-system':
      return client.avatar.listSystem(requireArg(cmd.positionalArgs[0], 'type'));
    default:
      throw new Error(`Unknown avatar action: ${cmd.action}. Actions: list-system`);
  }
}

async function executeCustomFieldOption(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'get':
      return client.customFieldOption.get(requireArg(cmd.positionalArgs[0], 'id'));
    default:
      throw new Error(`Unknown custom-field-option action: ${cmd.action}. Actions: get`);
  }
}

async function executeClassificationLevels(
  client: JiraClient,
  cmd: ParsedCommand,
): Promise<unknown> {
  switch (cmd.action) {
    case 'list':
      return client.classificationLevels.list();
    default:
      throw new Error(`Unknown classification-levels action: ${cmd.action}. Actions: list`);
  }
}

async function executeLatest(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'bulk-worklog': {
      const valueRaw = requireOpt(opts['value'], '--value');
      let worklogs: {
        issueIdOrKey: string;
        timeSpentSeconds: number;
        started: string;
        comment?: string;
        authorAccountId?: string;
      }[];
      try {
        worklogs = JSON.parse(valueRaw) as typeof worklogs;
      } catch {
        throw new Error('--value must be valid JSON (array of worklog objects)');
      }
      return client.latest.bulkWorklog({ worklogs });
    }
    default:
      throw new Error(`Unknown latest action: ${cmd.action}. Actions: bulk-worklog`);
  }
}

async function executeRemoteLink(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'get':
      return client.remoteLink.get(requireArg(cmd.positionalArgs[0], 'remoteLinkId'));
    case 'delete':
      await client.remoteLink.delete(requireArg(cmd.positionalArgs[0], 'remoteLinkId'));
      return { deleted: true };
    default:
      throw new Error(`Unknown remote-link action: ${cmd.action}. Actions: get, delete`);
  }
}

async function executeServiceRegistry(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'get':
      return client.serviceRegistry.get();
    default:
      throw new Error(`Unknown service-registry action: ${cmd.action}. Actions: get`);
  }
}

async function executeAddons(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list-properties':
      return client.addons.listProperties(requireArg(cmd.positionalArgs[0], 'addonKey'));
    case 'get-property':
      return client.addons.getProperty(
        requireArg(cmd.positionalArgs[0], 'addonKey'),
        requireArg(cmd.positionalArgs[1], 'propertyKey'),
      );
    case 'set-property':
      return client.addons.setProperty(
        requireArg(cmd.positionalArgs[0], 'addonKey'),
        requireArg(cmd.positionalArgs[1], 'propertyKey'),
        parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value'),
      );
    case 'delete-property':
      await client.addons.deleteProperty(
        requireArg(cmd.positionalArgs[0], 'addonKey'),
        requireArg(cmd.positionalArgs[1], 'propertyKey'),
      );
      return { deleted: true };
    default:
      throw new Error(
        `Unknown addons action: ${cmd.action}. Actions: list-properties, get-property, set-property, delete-property`,
      );
  }
}

async function executeExistsByProperties(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get':
      return client.existsByProperties.get({
        entityType: asString(opts['entity-type']),
        entityId: asString(opts['entity-id']),
      });
    default:
      throw new Error(`Unknown exists-by-properties action: ${cmd.action}. Actions: get`);
  }
}

async function executeIssueType(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      const type = asIssueTypeKind(opts['type']);
      const hierarchyLevelRaw = asString(opts['hierarchy-level']);
      const hierarchyLevel =
        hierarchyLevelRaw !== undefined
          ? parseIntArg(hierarchyLevelRaw, '--hierarchy-level')
          : undefined;
      const body = {
        name,
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(hierarchyLevel !== undefined && { hierarchyLevel }),
      };
      return client.issueType.create(body);
    }
    case 'delete': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const alternativeIssueTypeId = asString(opts['alternative-id']);
      await client.issueType.delete(id, alternativeIssueTypeId);
      return { deleted: true };
    }
    case 'update': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      const avatarIdRaw = asString(opts['avatar-id']);
      const avatarId =
        avatarIdRaw !== undefined ? parsePositiveIntArg(avatarIdRaw, '--avatar-id') : undefined;

      if (name === undefined && description === undefined && avatarId === undefined) {
        throw new Error('update requires at least one of: --name, --description, --avatar-id');
      }

      const body = {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(avatarId !== undefined && { avatarId }),
      };
      return client.issueType.update(id, body);
    }
    case 'list-alternatives': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      return client.issueType.listAlternatives(id);
    }
    case 'load-avatar': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const filePath = requireOpt(opts['file'], '--file');
      const size = parsePositiveIntArg(requireOpt(opts['size'], '--size'), '--size');
      const xRaw = asString(opts['x']);
      const yRaw = asString(opts['y']);
      const x = xRaw !== undefined ? parseNonNegativeIntArg(xRaw, '--x') : undefined;
      const y = yRaw !== undefined ? parseNonNegativeIntArg(yRaw, '--y') : undefined;
      const { readFile } = await import('node:fs/promises');
      const buffer = await readFile(filePath);
      const blob = new Blob([new Uint8Array(buffer)]);
      return client.issueType.loadAvatar(id, blob, {
        size,
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
      });
    }
    case 'list-properties': {
      const issueTypeId = requireArg(cmd.positionalArgs[0], 'issueTypeId');
      return client.issueType.listProperties(issueTypeId);
    }
    case 'delete-property': {
      const issueTypeId = requireArg(cmd.positionalArgs[0], 'issueTypeId');
      const propertyKey = requireArg(cmd.positionalArgs[1], 'propertyKey');
      await client.issueType.deleteProperty(issueTypeId, propertyKey);
      return { deleted: true };
    }
    case 'get-property': {
      const issueTypeId = requireArg(cmd.positionalArgs[0], 'issueTypeId');
      const propertyKey = requireArg(cmd.positionalArgs[1], 'propertyKey');
      return client.issueType.getProperty(issueTypeId, propertyKey);
    }
    case 'set-property': {
      const issueTypeId = requireArg(cmd.positionalArgs[0], 'issueTypeId');
      const propertyKey = requireArg(cmd.positionalArgs[1], 'propertyKey');
      const valueRaw = requireOpt(opts['value'], '--value');
      let value: unknown;
      try {
        value = JSON.parse(valueRaw);
      } catch {
        throw new Error('--value must be valid JSON');
      }
      await client.issueType.setProperty(issueTypeId, propertyKey, value);
      return { set: true };
    }
    case 'list-for-project': {
      const projectId = parsePositiveIntArg(
        requireOpt(opts['project-id'], '--project-id'),
        '--project-id',
      );
      return client.issueType.listForProject(projectId);
    }
    default:
      throw new Error(
        `Unknown issuetype action: ${cmd.action}. Actions: create, delete, update, list-alternatives, load-avatar, list-properties, delete-property, get-property, set-property, list-for-project`,
      );
  }
}

function asIssueTypeKind(value: string | boolean | undefined): 'subtask' | 'standard' | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if (s === 'subtask' || s === 'standard') return s;
  throw new Error(`--type must be one of: subtask, standard. Got: ${s}`);
}

async function executeApp(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get-field-context-configuration':
      return client.app.getFieldContextConfiguration(
        requireArg(cmd.positionalArgs[0], 'fieldIdOrKey'),
      );
    case 'update-field-context-configuration': {
      const fieldIdOrKey = requireArg(cmd.positionalArgs[0], 'fieldIdOrKey');
      const data: { configuration?: unknown; schema?: unknown } = {};
      const configurationRaw = asString(opts['configuration']);
      const schemaRaw = asString(opts['schema']);
      if (configurationRaw !== undefined) {
        try {
          data.configuration = JSON.parse(configurationRaw);
        } catch {
          throw new Error('--configuration must be valid JSON');
        }
      }
      if (schemaRaw !== undefined) {
        try {
          data.schema = JSON.parse(schemaRaw);
        } catch {
          throw new Error('--schema must be valid JSON');
        }
      }
      if (Object.keys(data).length === 0) {
        throw new Error(
          'update-field-context-configuration requires at least one of: --configuration, --schema',
        );
      }
      await client.app.updateFieldContextConfiguration(fieldIdOrKey, data);
      return { updated: true };
    }
    case 'update-field-value': {
      const fieldIdOrKey = requireArg(cmd.positionalArgs[0], 'fieldIdOrKey');
      const valueRaw = requireOpt(opts['value'], '--value');
      let updates: { value: unknown }[];
      try {
        updates = JSON.parse(valueRaw) as typeof updates;
      } catch {
        throw new Error('--value must be valid JSON (array of update objects)');
      }
      await client.app.updateFieldValue(fieldIdOrKey, { updates });
      return { updated: true };
    }
    case 'list-field-context-configurations': {
      const fieldIdsOrKeys = parseCsv(opts['field-ids-or-keys']);
      const contextIds = parseCsv(opts['context-ids']);
      if (fieldIdsOrKeys === undefined && contextIds === undefined) {
        throw new Error(
          'list-field-context-configurations requires at least one of: --field-ids-or-keys, --context-ids',
        );
      }
      const body: { fieldIdsOrKeys?: string[]; contextIds?: string[] } = {};
      if (fieldIdsOrKeys !== undefined) body.fieldIdsOrKeys = fieldIdsOrKeys;
      if (contextIds !== undefined) body.contextIds = contextIds;
      return client.app.listFieldContextConfigurations(body);
    }
    case 'bulk-update-field-value': {
      const valueRaw = requireOpt(opts['value'], '--value');
      let updates: { fieldIdOrKey: string; updates: { value: unknown }[] }[];
      try {
        updates = JSON.parse(valueRaw) as typeof updates;
      } catch {
        throw new Error('--value must be valid JSON (array of per-field update objects)');
      }
      await client.app.bulkUpdateFieldValue({ updates });
      return { updated: true };
    }
    case 'get-dynamic-modules':
      return client.app.getDynamicModules();
    case 'register-dynamic-modules': {
      const valueRaw = requireOpt(opts['value'], '--value');
      let modules: { key: string }[];
      try {
        modules = JSON.parse(valueRaw) as typeof modules;
      } catch {
        throw new Error('--value must be valid JSON (array of module objects)');
      }
      await client.app.registerDynamicModules({ modules });
      return { registered: true };
    }
    case 'delete-dynamic-modules': {
      const moduleKey = parseCsv(opts['module-keys']);
      await client.app.deleteDynamicModules(moduleKey ? { moduleKey } : undefined);
      return { deleted: true };
    }
    case 'list-forge-properties':
      return client.app.listForgeProperties();
    case 'get-forge-property':
      return client.app.getForgeProperty(requireArg(cmd.positionalArgs[0], 'propertyKey'));
    case 'set-forge-property': {
      const propertyKey = requireArg(cmd.positionalArgs[0], 'propertyKey');
      const valueRaw = requireOpt(opts['value'], '--value');
      let parsed: unknown;
      try {
        parsed = JSON.parse(valueRaw);
      } catch {
        throw new Error('--value must be valid JSON');
      }
      await client.app.setForgeProperty(propertyKey, parsed);
      return { updated: true };
    }
    case 'delete-forge-property':
      await client.app.deleteForgeProperty(requireArg(cmd.positionalArgs[0], 'propertyKey'));
      return { deleted: true };
    default:
      throw new Error(
        `Unknown app action: ${cmd.action}. Actions: get-field-context-configuration, update-field-context-configuration, update-field-value, list-field-context-configurations, bulk-update-field-value, get-dynamic-modules, register-dynamic-modules, delete-dynamic-modules, list-forge-properties, get-forge-property, set-forge-property, delete-forge-property`,
      );
  }
}

function parseCsv(value: string | boolean | undefined): string[] | undefined {
  const s = asString(value);
  if (!s) return undefined;
  const arr = s
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  return arr.length > 0 ? arr : undefined;
}

function parseIntArg(value: string, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new Error(`${name} must be an integer, got: ${value}`);
  }
  return n;
}

function parseNonNegativeIntArg(value: string, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${name} must be a non-negative integer, got: ${value}`);
  }
  return n;
}

const BULK_ACTIONS = [
  'create-issues',
  'delete-issues',
  'get-fields',
  'edit-fields',
  'move-issues',
  'get-transitions',
  'transition-issues',
  'unwatch-issues',
  'watch-issues',
  'get-status',
  'set-property',
  'delete-property',
  'submit-builds',
  'submit-deployments',
  'submit-devinfo',
  'submit-devops-components',
  'submit-feature-flags',
  'submit-operations',
  'submit-remote-links',
  'submit-security',
] as const;

function splitCsvIds(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Split a `--fields`/`--expand`-style CSV flag into trimmed, non-empty tokens.
 * Returns `undefined` when the flag was not supplied, or when it contains no
 * non-empty tokens (e.g. `--fields ,`), so callers can omit it rather than
 * sending an empty `fields=` query param (which Jira reads as a filter, not as
 * "all fields"). Trimming matters: an untrimmed ` status` token is sent
 * verbatim as a leading-space field name (`fields=summary,%20status`) that
 * Jira does not recognise and silently drops from the response.
 */
function csvFlag(value: string | boolean | undefined): string[] | undefined {
  const raw = asString(value);
  if (raw === undefined) return undefined;
  const tokens = splitCsvIds(raw);
  return tokens.length > 0 ? tokens : undefined;
}

function parseJsonValueFlag(raw: string, flag: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${flag} must be valid JSON`);
  }
}

function parseJsonObjectFlag(raw: string, flag: string): Record<string, unknown> {
  const parsed = parseJsonValueFlag(raw, flag);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${flag} must be a JSON object (not array/null/primitive)`);
  }
  return parsed as Record<string, unknown>;
}

function parseJsonArrayFlag(raw: string, flag: string): unknown[] {
  const parsed = parseJsonValueFlag(raw, flag);
  if (!Array.isArray(parsed)) {
    throw new Error(`${flag} must be a JSON array`);
  }
  return parsed;
}

async function executeBulk(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'create-issues': {
      // B518 POST /rest/api/3/issue/bulk
      const issueUpdatesRaw = parseJsonArrayFlag(
        requireOpt(opts['issues'], '--issues'),
        '--issues (array of issueUpdates)',
      );
      return client.bulk.createBulk({
        issueUpdates: issueUpdatesRaw as Parameters<
          typeof client.bulk.createBulk
        >[0]['issueUpdates'],
      });
    }
    case 'delete-issues': {
      const selectedIssueIdsOrKeys = splitCsvIds(requireOpt(opts['issues'], '--issues'));
      const sendBulkNotification = asBoolFlag(opts['send-notification']);
      return client.bulk.deleteIssuesBulk({
        selectedIssueIdsOrKeys,
        ...(sendBulkNotification !== undefined && { sendBulkNotification }),
      });
    }
    case 'get-fields': {
      const issueIdsOrKeys = requireOpt(opts['issues'], '--issues');
      return client.bulk.getIssueFieldsBulk({
        issueIdsOrKeys,
        searchText: asString(opts['search-text']),
        endingBefore: asString(opts['ending-before']),
        startingAfter: asString(opts['starting-after']),
      });
    }
    case 'edit-fields': {
      const selectedIssueIdsOrKeys = splitCsvIds(requireOpt(opts['issues'], '--issues'));
      const selectedActions = splitCsvIds(requireOpt(opts['actions'], '--actions'));
      const editedFieldsInput = parseJsonObjectFlag(
        requireOpt(opts['value'], '--value'),
        '--value (editedFieldsInput object)',
      );
      const sendBulkNotification = asBoolFlag(opts['send-notification']);
      return client.bulk.editIssueFieldsBulk({
        editedFieldsInput,
        selectedActions,
        selectedIssueIdsOrKeys,
        ...(sendBulkNotification !== undefined && { sendBulkNotification }),
      });
    }
    case 'move-issues': {
      const targetToSourcesMapping = parseJsonObjectFlag(
        requireOpt(opts['value'], '--value'),
        '--value (targetToSourcesMapping object)',
      );
      const sendBulkNotification = asBoolFlag(opts['send-notification']);
      return client.bulk.moveIssuesBulk({
        targetToSourcesMapping,
        ...(sendBulkNotification !== undefined && { sendBulkNotification }),
      });
    }
    case 'get-transitions': {
      const issueIdsOrKeys = requireOpt(opts['issues'], '--issues');
      return client.bulk.getAvailableTransitionsBulk({ issueIdsOrKeys });
    }
    case 'transition-issues': {
      const bulkTransitionInputs = parseJsonArrayFlag(
        requireOpt(opts['value'], '--value'),
        '--value (array of bulkTransitionInputs)',
      ) as { selectedIssueIdsOrKeys: string[]; transitionId: string }[];
      const sendBulkNotification = asBoolFlag(opts['send-notification']);
      return client.bulk.transitionIssuesBulk({
        bulkTransitionInputs,
        ...(sendBulkNotification !== undefined && { sendBulkNotification }),
      });
    }
    case 'unwatch-issues': {
      const selectedIssueIdsOrKeys = splitCsvIds(requireOpt(opts['issues'], '--issues'));
      return client.bulk.unwatchIssuesBulk({ selectedIssueIdsOrKeys });
    }
    case 'watch-issues': {
      const selectedIssueIdsOrKeys = splitCsvIds(requireOpt(opts['issues'], '--issues'));
      return client.bulk.watchIssuesBulk({ selectedIssueIdsOrKeys });
    }
    case 'get-status': {
      return client.bulk.getBulkOperationStatus(requireArg(cmd.positionalArgs[0], 'taskId'));
    }
    case 'set-property': {
      // B526 PUT /rest/api/3/issue/properties/{propertyKey}
      const propertyKey = requireArg(cmd.positionalArgs[0], 'propertyKey');
      const value = parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value');
      const filterRaw = opts['filter'];
      const filter =
        filterRaw !== undefined
          ? (parseJsonObjectFlag(
              String(filterRaw),
              '--filter',
            ) as BulkSetIssuePropertyData['filter'])
          : undefined;
      await client.bulk.setPropertyBulk(propertyKey, {
        value,
        ...(filter !== undefined && { filter }),
      });
      return undefined;
    }
    case 'delete-property': {
      // B525 DELETE /rest/api/3/issue/properties/{propertyKey}
      const propertyKey = requireArg(cmd.positionalArgs[0], 'propertyKey');
      const filterRaw = opts['filter'];
      const filter =
        filterRaw !== undefined
          ? (parseJsonObjectFlag(
              String(filterRaw),
              '--filter',
            ) as BulkDeleteIssuePropertyData['filter'])
          : undefined;
      await client.bulk.deletePropertyBulk(propertyKey, {
        ...(filter !== undefined && { filter }),
      });
      return undefined;
    }
    case 'submit-builds':
      return client.bulk.submitBuilds(
        parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value (builds payload)'),
      );
    case 'submit-deployments':
      return client.bulk.submitDeployments(
        parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value (deployments payload)'),
      );
    case 'submit-devinfo':
      return client.bulk.submitDevInfo(
        parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value (devinfo payload)'),
      );
    case 'submit-devops-components':
      return client.bulk.submitDevopsComponents(
        parseJsonValueFlag(
          requireOpt(opts['value'], '--value'),
          '--value (devops-components payload)',
        ),
      );
    case 'submit-feature-flags':
      return client.bulk.submitFeatureFlags(
        parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value (feature-flags payload)'),
      );
    case 'submit-operations':
      return client.bulk.submitOperations(
        parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value (operations payload)'),
      );
    case 'submit-remote-links':
      return client.bulk.submitRemoteLinks(
        parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value (remote-links payload)'),
      );
    case 'submit-security':
      return client.bulk.submitSecurity(
        parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value (security payload)'),
      );
    default:
      throw new Error(`Unknown bulk action: ${cmd.action}. Actions: ${BULK_ACTIONS.join(', ')}`);
  }
}

async function executeIssueAttachments(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.issueAttachments.list(requireArg(cmd.positionalArgs[0], 'issueIdOrKey'));
    case 'get':
      return client.issueAttachments.get(requireArg(cmd.positionalArgs[0], 'attachmentId'));
    case 'delete': {
      const attachmentId = requireArg(cmd.positionalArgs[0], 'attachmentId');
      await client.issueAttachments.delete(attachmentId);
      return { deleted: true };
    }
    case 'expand-human':
      return client.issueAttachments.expandHuman(requireArg(cmd.positionalArgs[0], 'attachmentId'));
    case 'expand-raw':
      return client.issueAttachments.expandRaw(requireArg(cmd.positionalArgs[0], 'attachmentId'));
    case 'download-content': {
      const attachmentId = requireArg(cmd.positionalArgs[0], 'attachmentId');
      const redirect = asBoolFlag(opts['redirect']);
      const buffer = await client.issueAttachments.downloadContent(attachmentId, {
        ...(redirect !== undefined && { redirect }),
      });
      return { bytes: buffer.byteLength };
    }
    case 'get-meta':
      return client.issueAttachments.getMeta();
    case 'download-thumbnail': {
      const attachmentId = requireArg(cmd.positionalArgs[0], 'attachmentId');
      const redirect = asBoolFlag(opts['redirect']);
      const fallbackToDefault = asBoolFlag(opts['fallback-to-default']);
      const width = asPositiveInt(opts['width'], '--width');
      const height = asPositiveInt(opts['height'], '--height');
      const buffer = await client.issueAttachments.downloadThumbnail(attachmentId, {
        ...(redirect !== undefined && { redirect }),
        ...(fallbackToDefault !== undefined && { fallbackToDefault }),
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
      });
      return { bytes: buffer.byteLength };
    }
    case 'upload': {
      const issueIdOrKey = requireArg(cmd.positionalArgs[0], 'issueIdOrKey');
      const filePath = requireOpt(opts['file'], '--file');
      const filename = asString(opts['filename']);
      const mimeType = asString(opts['media-type']);
      const { readFile } = await import('node:fs/promises');
      const { basename } = await import('node:path');
      const buffer = await readFile(filePath);
      const blob = new Blob([buffer]);
      return client.issueAttachments.upload(
        issueIdOrKey,
        filename ?? basename(filePath),
        blob,
        mimeType,
      );
    }
    default:
      throw new Error(
        `Unknown issue-attachments action: ${cmd.action}. Actions: list, get, delete, expand-human, expand-raw, download-content, get-meta, download-thumbnail, upload`,
      );
  }
}

async function executeUniversalAvatar(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const type = requireArg(cmd.positionalArgs[0], 'type');
      const entityId = requireArg(cmd.positionalArgs[1], 'entityId');
      return client.universalAvatar.getAvatars(type as AvatarEntityType, entityId);
    }
    case 'store': {
      const type = requireArg(cmd.positionalArgs[0], 'type');
      const entityId = requireArg(cmd.positionalArgs[1], 'entityId');
      const filePath = requireOpt(opts['file'], '--file');
      const sizeRaw = requireOpt(opts['size'], '--size');
      const size = parsePositiveIntArg(sizeRaw, '--size');
      const xRaw = asString(opts['x']);
      const yRaw = asString(opts['y']);
      const x = xRaw !== undefined ? parseNonNegativeIntArg(xRaw, '--x') : undefined;
      const y = yRaw !== undefined ? parseNonNegativeIntArg(yRaw, '--y') : undefined;
      const { readFile } = await import('node:fs/promises');
      const buffer = await readFile(filePath);
      const blob = new Blob([new Uint8Array(buffer)]);
      return client.universalAvatar.storeAvatar(type as AvatarEntityType, entityId, blob, {
        size,
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
      });
    }
    case 'delete': {
      const type = requireArg(cmd.positionalArgs[0], 'type');
      const owningObjectId = requireArg(cmd.positionalArgs[1], 'owningObjectId');
      const idRaw = requireArg(cmd.positionalArgs[2], 'id');
      const id = parsePositiveIntArg(idRaw, 'id');
      await client.universalAvatar.deleteAvatar(type as AvatarEntityType, owningObjectId, id);
      return { deleted: true };
    }
    case 'view-by-type': {
      const type = requireArg(cmd.positionalArgs[0], 'type');
      const size = asString(opts['size']);
      const format = asString(opts['image-format']);
      const buffer = await client.universalAvatar.getAvatarImageByType(type as AvatarEntityType, {
        ...(size !== undefined && { size: size as AvatarViewSize }),
        ...(format !== undefined && { format: format as AvatarViewFormat }),
      });
      return { bytes: buffer.byteLength };
    }
    case 'view-by-id': {
      const type = requireArg(cmd.positionalArgs[0], 'type');
      const idRaw = requireArg(cmd.positionalArgs[1], 'id');
      const id = parsePositiveIntArg(idRaw, 'id');
      const size = asString(opts['size']);
      const format = asString(opts['image-format']);
      const buffer = await client.universalAvatar.getAvatarImageByID(type as AvatarEntityType, id, {
        ...(size !== undefined && { size: size as AvatarViewSize }),
        ...(format !== undefined && { format: format as AvatarViewFormat }),
      });
      return { bytes: buffer.byteLength };
    }
    case 'view-by-owner': {
      const type = requireArg(cmd.positionalArgs[0], 'type');
      const entityId = requireArg(cmd.positionalArgs[1], 'entityId');
      const size = asString(opts['size']);
      const format = asString(opts['image-format']);
      const buffer = await client.universalAvatar.getAvatarImageByOwner(
        type as AvatarEntityType,
        entityId,
        {
          ...(size !== undefined && { size: size as AvatarViewSize }),
          ...(format !== undefined && { format: format as AvatarViewFormat }),
        },
      );
      return { bytes: buffer.byteLength };
    }
    default:
      throw new Error(
        `Unknown universal-avatar action: ${cmd.action}. Actions: list, store, delete, view-by-type, view-by-id, view-by-owner`,
      );
  }
}

async function executeComponent(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const projectIdsOrKeys = parseCsv(opts['project-ids-or-keys']);
      const orderBy = asString(opts['order-by']);
      const query = asString(opts['query']);
      return client.component.list({
        ...(projectIdsOrKeys !== undefined && { projectIdsOrKeys }),
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(orderBy !== undefined && { orderBy }),
        ...(query !== undefined && { query }),
      });
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      const leadAccountId = asString(opts['lead-account-id']);
      const leadUserName = asString(opts['lead-user-name']);
      const assigneeType = asComponentAssigneeType(opts['assignee-type']);
      const isAssigneeTypeValid =
        opts['is-assignee-type-valid'] !== undefined
          ? asBoolFlag(opts['is-assignee-type-valid'])
          : undefined;
      const project = asString(opts['project']);
      const projectIdStr = asString(opts['project-id']);
      const projectId =
        projectIdStr !== undefined ? parsePositiveIntArg(projectIdStr, '--project-id') : undefined;
      if (project === undefined && projectId === undefined) {
        throw new Error('component create requires --project or --project-id');
      }
      return client.component.create({
        name,
        ...(description !== undefined && { description }),
        ...(leadAccountId !== undefined && { leadAccountId }),
        ...(leadUserName !== undefined && { leadUserName }),
        ...(assigneeType !== undefined && { assigneeType }),
        ...(isAssigneeTypeValid !== undefined && { isAssigneeTypeValid }),
        ...(project !== undefined && { project }),
        ...(projectId !== undefined && { projectId }),
      });
    }
    case 'get':
      return client.component.get(requireArg(cmd.positionalArgs[0], 'component id'));
    case 'update': {
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      const leadAccountId = asString(opts['lead-account-id']);
      const leadUserName = asString(opts['lead-user-name']);
      const assigneeType = asComponentAssigneeType(opts['assignee-type']);
      if (
        name === undefined &&
        description === undefined &&
        leadAccountId === undefined &&
        leadUserName === undefined &&
        assigneeType === undefined
      ) {
        throw new Error(
          'update requires at least one of: --name, --description, --lead-account-id, --lead-user-name, --assignee-type',
        );
      }
      return client.component.update(requireArg(cmd.positionalArgs[0], 'component id'), {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(leadAccountId !== undefined && { leadAccountId }),
        ...(leadUserName !== undefined && { leadUserName }),
        ...(assigneeType !== undefined && { assigneeType }),
      });
    }
    case 'delete': {
      const moveIssuesTo = asString(opts['move-issues-to']);
      await client.component.delete(requireArg(cmd.positionalArgs[0], 'component id'), {
        ...(moveIssuesTo !== undefined && { moveIssuesTo }),
      });
      return { deleted: true };
    }
    case 'related-issue-counts':
      return client.component.getRelatedIssueCounts(
        requireArg(cmd.positionalArgs[0], 'component id'),
      );
    default:
      throw new Error(
        `Unknown component action: ${cmd.action}. Actions: list, create, get, update, delete, related-issue-counts`,
      );
  }
}

const COMPONENT_ASSIGNEE_TYPES = [
  'PROJECT_DEFAULT',
  'COMPONENT_LEAD',
  'PROJECT_LEAD',
  'UNASSIGNED',
] as const;

function asComponentAssigneeType(
  value: string | boolean | undefined,
): 'PROJECT_DEFAULT' | 'COMPONENT_LEAD' | 'PROJECT_LEAD' | 'UNASSIGNED' | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if ((COMPONENT_ASSIGNEE_TYPES as readonly string[]).includes(s)) {
    return s as (typeof COMPONENT_ASSIGNEE_TYPES)[number];
  }
  throw new Error(
    `--assignee-type must be one of: ${COMPONENT_ASSIGNEE_TYPES.join(', ')}. Got: ${s}`,
  );
}

const TIME_FORMATS = ['pretty', 'days', 'hours'] as const;
const DEFAULT_UNITS = ['minute', 'hour', 'day', 'week'] as const;
type TimeFormat = (typeof TIME_FORMATS)[number];
type DefaultUnit = (typeof DEFAULT_UNITS)[number];

function asTimeFormat(value: string | boolean | undefined): TimeFormat | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if ((TIME_FORMATS as readonly string[]).includes(s)) return s as TimeFormat;
  throw new Error(`--time-format must be one of: ${TIME_FORMATS.join(', ')}. Got: ${s}`);
}

function asDefaultUnit(value: string | boolean | undefined): DefaultUnit | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if ((DEFAULT_UNITS as readonly string[]).includes(s)) return s as DefaultUnit;
  throw new Error(`--default-unit must be one of: ${DEFAULT_UNITS.join(', ')}. Got: ${s}`);
}

function asPositiveNumber(value: string | boolean | undefined, name: string): number | undefined {
  if (typeof value !== 'string') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${name} must be a positive number, got: ${value}`);
  }
  return n;
}

async function executeApplicationProperties(
  client: JiraClient,
  cmd: ParsedCommand,
): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      // Positional id (if any) is treated as `--key` shorthand — matches the
      // server semantic where `key=<id>` returns the single matching entry.
      const positionalKey = cmd.positionalArgs[0];
      const key = positionalKey ?? asString(opts['key']);
      const permissionLevel = asString(opts['permission-level']);
      const keyFilter = asString(opts['key-filter']);
      return client.applicationProperties.list({
        ...(key !== undefined && { key }),
        ...(permissionLevel !== undefined && { permissionLevel }),
        ...(keyFilter !== undefined && { keyFilter }),
      });
    }
    case 'set': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const value = requireOpt(opts['value'], '--value');
      return client.applicationProperties.update(id, { id, value });
    }
    case 'list-advanced-settings':
      return client.applicationProperties.listAdvancedSettings();
    default:
      throw new Error(
        `Unknown application-properties action: ${cmd.action}. Actions: list, set, list-advanced-settings`,
      );
  }
}

async function executeConfiguration(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get':
      return client.configuration.get();
    case 'get-timetracking':
      return client.configuration.getTimeTracking();
    case 'select-timetracking': {
      const key = requireOpt(opts['key'], '--key');
      const name = asString(opts['name']);
      const url = asString(opts['url']);
      await client.configuration.selectTimeTracking({
        key,
        ...(name !== undefined && { name }),
        ...(url !== undefined && { url }),
      });
      return { selected: true };
    }
    case 'list-timetracking-providers':
      return client.configuration.listTimeTrackingProviders();
    case 'get-timetracking-options':
      return client.configuration.getTimeTrackingOptions();
    case 'update-timetracking-options': {
      const workingHoursPerDay = asPositiveNumber(
        opts['working-hours-per-day'],
        '--working-hours-per-day',
      );
      const workingDaysPerWeek = asPositiveNumber(
        opts['working-days-per-week'],
        '--working-days-per-week',
      );
      const timeFormat = asTimeFormat(opts['time-format']);
      const defaultUnit = asDefaultUnit(opts['default-unit']);

      if (
        workingHoursPerDay === undefined &&
        workingDaysPerWeek === undefined &&
        timeFormat === undefined &&
        defaultUnit === undefined
      ) {
        throw new Error(
          'update-timetracking-options requires at least one of: --working-hours-per-day, --working-days-per-week, --time-format, --default-unit',
        );
      }

      return client.configuration.updateTimeTrackingOptions({
        ...(workingHoursPerDay !== undefined && { workingHoursPerDay }),
        ...(workingDaysPerWeek !== undefined && { workingDaysPerWeek }),
        ...(timeFormat !== undefined && { timeFormat }),
        ...(defaultUnit !== undefined && { defaultUnit }),
      });
    }
    default:
      throw new Error(
        `Unknown configuration action: ${cmd.action}. Actions: get, get-timetracking, select-timetracking, list-timetracking-providers, get-timetracking-options, update-timetracking-options`,
      );
  }
}

// ── statuses / resolutions helpers ──────────────────────────────────────────

function asStatusCategory(
  value: string | boolean | undefined,
): 'TODO' | 'IN_PROGRESS' | 'DONE' | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if (s === 'TODO' || s === 'IN_PROGRESS' || s === 'DONE') return s;
  throw new Error(`--status-category must be one of: TODO, IN_PROGRESS, DONE. Got: ${s}`);
}

// ── resolutions (B931, B712-B718) ────────────────────────────────────────────

async function executeResolutions(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.resolutions.list();
    case 'get':
      return client.resolutions.get(requireArg(cmd.positionalArgs[0], 'id'));
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      return client.resolutions.create({
        name,
        ...(description !== undefined && { description }),
      });
    }
    case 'update': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      await client.resolutions.update(id, {
        name,
        ...(description !== undefined && { description }),
      });
      return { updated: true };
    }
    case 'delete': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const replaceWith = asString(opts['replace-with']);
      await client.resolutions.delete(id, {
        ...(replaceWith !== undefined && { replaceWith }),
      });
      return { deleted: true };
    }
    case 'set-default': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      await client.resolutions.setDefault({ id });
      return { updated: true };
    }
    case 'move': {
      const idsRaw = requireOpt(opts['ids'], '--ids');
      const ids = splitCsvIds(idsRaw);
      const after = asString(opts['after']);
      const before = asString(opts['before']);
      if (after !== undefined && before !== undefined) {
        throw new Error('resolutions move accepts either --after or --before, not both');
      }
      await client.resolutions.moveResolutions({
        ids,
        ...(after !== undefined && { after }),
        ...(before !== undefined && { before }),
      });
      return { moved: true };
    }
    case 'search': {
      const idsRaw = asString(opts['ids']);
      const id = idsRaw ? splitCsvIds(idsRaw) : undefined;
      return client.resolutions.search({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(id !== undefined && { id }),
        onlyDefault: asBoolFlag(opts['only-default']),
        queryString: asString(opts['query-string']),
      });
    }
    default:
      throw new Error(
        `Unknown resolutions action: ${cmd.action}. Actions: list, get, create, update, delete, set-default, move, search`,
      );
  }
}

// ── filters (B452-B466) ──────────────────────────────────────────────────────

const FILTERS_ACTIONS = [
  'search',
  'get',
  'create',
  'update',
  'delete',
  'list-favourites',
  'list-my',
  'add-favourite',
  'remove-favourite',
  'change-owner',
  'get-columns',
  'set-columns',
  'reset-columns',
  'list-permissions',
  'add-permission',
  'get-permission',
  'delete-permission',
  'get-default-share-scope',
  'set-default-share-scope',
];

function asFilterShareScope(
  value: string | boolean | undefined,
): 'GLOBAL' | 'AUTHENTICATED' | 'PRIVATE' | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if (s === 'GLOBAL' || s === 'AUTHENTICATED' || s === 'PRIVATE') return s;
  throw new Error(`--share-scope must be one of: GLOBAL, AUTHENTICATED, PRIVATE. Got: ${s}`);
}

function requireFilterShareScope(
  value: string | boolean | undefined,
): 'GLOBAL' | 'AUTHENTICATED' | 'PRIVATE' {
  const s = asFilterShareScope(value);
  if (s === undefined) throw new Error('Missing required option: --share-scope');
  return s;
}

function asFilterShareType(
  value: string | boolean | undefined,
):
  | 'user'
  | 'group'
  | 'project'
  | 'projectRole'
  | 'global'
  | 'loggedin'
  | 'authenticated'
  | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if (
    s === 'user' ||
    s === 'group' ||
    s === 'project' ||
    s === 'projectRole' ||
    s === 'global' ||
    s === 'loggedin' ||
    s === 'authenticated'
  ) {
    return s;
  }
  throw new Error(
    `--share-type must be one of: user, group, project, projectRole, global, loggedin, authenticated. Got: ${s}`,
  );
}

function requireFilterShareType(
  value: string | boolean | undefined,
): 'user' | 'group' | 'project' | 'projectRole' | 'global' | 'loggedin' | 'authenticated' {
  const t = asFilterShareType(value);
  if (t === undefined) throw new Error('Missing required option: --share-type');
  return t;
}

async function executeFilters(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'search': {
      const idsRaw = asString(opts['ids']);
      const ids = idsRaw
        ? idsRaw
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .map((s) => parsePositiveIntArg(s, '--ids'))
        : undefined;
      return client.filters.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(asString(opts['expand']) !== undefined && { expand: asString(opts['expand']) }),
        ...(ids !== undefined && { id: ids }),
        ...(asString(opts['order-by']) !== undefined && { orderBy: asString(opts['order-by']) }),
      });
    }
    case 'get': {
      const id = requireArg(cmd.positionalArgs[0], 'filterId');
      return client.filters.get(id);
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      const jql = asString(opts['jql']);
      const favourite = asBoolFlag(opts['favourite']);
      const sharePermissionsRaw = asString(opts['share-permissions']);
      const editPermissionsRaw = asString(opts['edit-permissions']);
      const sharePermissions =
        sharePermissionsRaw !== undefined
          ? (parseJsonArrayFlag(
              sharePermissionsRaw,
              '--share-permissions',
            ) as AddFilterSharePermissionData[])
          : undefined;
      const editPermissions =
        editPermissionsRaw !== undefined
          ? (parseJsonArrayFlag(
              editPermissionsRaw,
              '--edit-permissions',
            ) as AddFilterSharePermissionData[])
          : undefined;
      return client.filters.create({
        name,
        ...(description !== undefined && { description }),
        ...(jql !== undefined && { jql }),
        ...(favourite !== undefined && { favourite }),
        ...(sharePermissions !== undefined && { sharePermissions }),
        ...(editPermissions !== undefined && { editPermissions }),
      });
    }
    case 'update': {
      const id = requireArg(cmd.positionalArgs[0], 'filterId');
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      const jql = asString(opts['jql']);
      const favourite = asBoolFlag(opts['favourite']);
      const sharePermissionsRaw = asString(opts['share-permissions']);
      const editPermissionsRaw = asString(opts['edit-permissions']);
      const sharePermissions =
        sharePermissionsRaw !== undefined
          ? (parseJsonArrayFlag(
              sharePermissionsRaw,
              '--share-permissions',
            ) as AddFilterSharePermissionData[])
          : undefined;
      const editPermissions =
        editPermissionsRaw !== undefined
          ? (parseJsonArrayFlag(
              editPermissionsRaw,
              '--edit-permissions',
            ) as AddFilterSharePermissionData[])
          : undefined;
      if (
        name === undefined &&
        description === undefined &&
        jql === undefined &&
        favourite === undefined &&
        sharePermissions === undefined &&
        editPermissions === undefined
      ) {
        throw new Error(
          'update requires at least one of: --name, --description, --jql, --favourite, --share-permissions, --edit-permissions',
        );
      }
      return client.filters.update(id, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(jql !== undefined && { jql }),
        ...(favourite !== undefined && { favourite }),
        ...(sharePermissions !== undefined && { sharePermissions }),
        ...(editPermissions !== undefined && { editPermissions }),
      });
    }
    case 'delete': {
      const id = requireArg(cmd.positionalArgs[0], 'filterId');
      await client.filters.delete(id);
      return { deleted: true };
    }
    case 'list-favourites': {
      const expand = asString(opts['expand']);
      return client.filters.listFavourites(expand !== undefined ? { expand } : undefined);
    }
    case 'list-my': {
      const expand = asString(opts['expand']);
      const includeFavourites = asBoolFlag(opts['include-favourites']);
      return client.filters.listMy({
        ...(expand !== undefined && { expand }),
        ...(includeFavourites !== undefined && { includeFavourites }),
      });
    }
    case 'add-favourite': {
      const id = requireArg(cmd.positionalArgs[0], 'filterId');
      const expand = asString(opts['expand']);
      return client.filters.addFavourite(id, expand !== undefined ? { expand } : undefined);
    }
    case 'remove-favourite': {
      const id = requireArg(cmd.positionalArgs[0], 'filterId');
      const expand = asString(opts['expand']);
      return client.filters.removeFavourite(id, expand !== undefined ? { expand } : undefined);
    }
    case 'change-owner': {
      const id = requireArg(cmd.positionalArgs[0], 'filterId');
      const accountId = requireOpt(opts['account-id'], '--account-id');
      await client.filters.changeOwner(id, accountId);
      return { ownerChanged: true };
    }
    case 'get-columns': {
      const id = requireArg(cmd.positionalArgs[0], 'filterId');
      return client.filters.getColumns(id);
    }
    case 'set-columns': {
      const id = requireArg(cmd.positionalArgs[0], 'filterId');
      const columnsRaw = requireOpt(opts['columns'], '--columns');
      const columns = columnsRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (columns.length === 0) {
        throw new Error('--columns must contain at least one column key');
      }
      await client.filters.setColumns(id, columns);
      return { updated: true };
    }
    case 'reset-columns': {
      const id = requireArg(cmd.positionalArgs[0], 'filterId');
      await client.filters.resetColumns(id);
      return { reset: true };
    }
    case 'list-permissions': {
      const id = requireArg(cmd.positionalArgs[0], 'filterId');
      return client.filters.listPermissions(id);
    }
    case 'add-permission': {
      const id = requireArg(cmd.positionalArgs[0], 'filterId');
      const type = requireFilterShareType(opts['share-type']);
      const projectId = asString(opts['project-id']);
      const groupname = asString(opts['group-name']);
      const groupId = asString(opts['group-id']);
      const projectRoleId = asString(opts['role-id']);
      const accountId = asString(opts['account-id']);
      const rightsRaw = asString(opts['rights']);
      const rights =
        rightsRaw !== undefined ? parsePositiveIntArg(rightsRaw, '--rights') : undefined;
      return client.filters.addPermission(id, {
        type,
        ...(projectId !== undefined && { projectId }),
        ...(groupname !== undefined && { groupname }),
        ...(groupId !== undefined && { groupId }),
        ...(projectRoleId !== undefined && { projectRoleId }),
        ...(accountId !== undefined && { accountId }),
        ...(rights !== undefined && { rights }),
      });
    }
    case 'get-permission': {
      const id = requireArg(cmd.positionalArgs[0], 'filterId');
      const permissionId = requireArg(cmd.positionalArgs[1], 'permissionId');
      return client.filters.getPermission(id, permissionId);
    }
    case 'delete-permission': {
      const id = requireArg(cmd.positionalArgs[0], 'filterId');
      const permissionId = requireArg(cmd.positionalArgs[1], 'permissionId');
      await client.filters.deletePermission(id, permissionId);
      return { deleted: true };
    }
    case 'get-default-share-scope': {
      return client.filters.getDefaultShareScope();
    }
    case 'set-default-share-scope': {
      const scope = requireFilterShareScope(opts['share-scope']);
      return client.filters.setDefaultShareScope(scope);
    }
    default:
      throw new Error(
        `Unknown filters action: ${cmd.action}. Actions: ${FILTERS_ACTIONS.join(', ')}`,
      );
  }
}

// ── issue-type-screen-schemes (B576-B586) ─────────────────────────────────────

const ISSUE_TYPE_SCREEN_SCHEMES_ACTIONS = [
  'list',
  'create',
  'update',
  'delete',
  'update-mapping',
  'update-default-mapping',
  'remove-mappings',
  'get-project',
  'list-mapping',
  'list-project-mappings',
  'assign-to-project',
];

async function executeIssueTypeScreenSchemes(
  client: JiraClient,
  cmd: ParsedCommand,
): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const idsRaw = parseCsv(opts['ids']);
      const ids =
        idsRaw !== undefined ? idsRaw.map((s) => parsePositiveIntArg(s, '--ids')) : undefined;
      return client.issueTypeScreenSchemes.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        id: ids,
        queryString: asString(opts['query']),
        orderBy: asString(opts['order-by']),
        expand: asString(opts['expand']),
      });
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      const mappingsRaw = requireOpt(opts['mappings'], '--mappings');
      const issueTypeMappings = parseJsonArrayFlag(mappingsRaw, '--mappings') as {
        issueTypeId: string;
        screenSchemeId: string;
      }[];
      return client.issueTypeScreenSchemes.create({
        name,
        ...(description !== undefined && { description }),
        issueTypeMappings,
      });
    }
    case 'update': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'issueTypeScreenSchemeId');
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      if (name === undefined && description === undefined) {
        throw new Error('update requires at least one of: --name, --description');
      }
      await client.issueTypeScreenSchemes.update(schemeId, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      });
      return { updated: true };
    }
    case 'delete': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'issueTypeScreenSchemeId');
      await client.issueTypeScreenSchemes.delete(schemeId);
      return { deleted: true };
    }
    case 'update-mapping': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'issueTypeScreenSchemeId');
      const mappingsRaw = requireOpt(opts['mappings'], '--mappings');
      const issueTypeMappings = parseJsonArrayFlag(mappingsRaw, '--mappings') as {
        issueTypeId: string;
        screenSchemeId: string;
      }[];
      await client.issueTypeScreenSchemes.updateMapping(schemeId, { issueTypeMappings });
      return { updated: true };
    }
    case 'update-default-mapping': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'issueTypeScreenSchemeId');
      const screenSchemeId = requireOpt(opts['screen-scheme-id'], '--screen-scheme-id');
      await client.issueTypeScreenSchemes.updateDefaultMapping(schemeId, { screenSchemeId });
      return { updated: true };
    }
    case 'remove-mappings': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'issueTypeScreenSchemeId');
      const issueTypeIdsRaw = parseCsv(opts['issue-type-ids']);
      if (issueTypeIdsRaw === undefined || issueTypeIdsRaw.length === 0) {
        throw new Error('remove-mappings requires --issue-type-ids');
      }
      await client.issueTypeScreenSchemes.removeMappings(schemeId, {
        issueTypeIds: issueTypeIdsRaw,
      });
      return { removed: true };
    }
    case 'get-project': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'issueTypeScreenSchemeId');
      return client.issueTypeScreenSchemes.listProject(schemeId, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'list-mapping': {
      const schemeIdsRaw = parseCsv(opts['scheme-ids']);
      const issueTypeScreenSchemeId =
        schemeIdsRaw !== undefined
          ? schemeIdsRaw.map((s) => parsePositiveIntArg(s, '--scheme-ids'))
          : undefined;
      return client.issueTypeScreenSchemes.listMapping({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        issueTypeScreenSchemeId,
      });
    }
    case 'list-project-mappings': {
      const projectIdsRaw = parseCsv(opts['project-ids']);
      if (projectIdsRaw === undefined || projectIdsRaw.length === 0) {
        throw new Error('list-project-mappings requires --project-ids');
      }
      return client.issueTypeScreenSchemes.listProjectMappings({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        projectId: projectIdsRaw,
      });
    }
    case 'assign-to-project': {
      const issueTypeScreenSchemeId = requireOpt(opts['scheme-id'], '--scheme-id');
      const projectId = requireOpt(opts['project-id'], '--project-id');
      await client.issueTypeScreenSchemes.assignToProject({
        issueTypeScreenSchemeId,
        projectId,
      });
      return { assigned: true };
    }
    default:
      throw new Error(
        `Unknown issue-type-screen-schemes action: ${cmd.action}. Actions: ${ISSUE_TYPE_SCREEN_SCHEMES_ACTIONS.join(', ')}`,
      );
  }
}

// ── permission-schemes (B616-B624) ───────────────────────────────────────────

const PERMISSION_SCHEMES_ACTIONS = [
  'list',
  'get',
  'create',
  'update',
  'delete',
  'list-permissions',
  'create-permission',
  'get-permission',
  'delete-permission',
] as const;

async function executePermissionSchemes(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const expand = asString(opts['expand']);
      return client.permissionSchemes.list(expand !== undefined ? { expand } : undefined);
    }
    case 'get': {
      const schemeId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'schemeId'),
        'schemeId',
      );
      const expand = asString(opts['expand']);
      return client.permissionSchemes.get(schemeId, expand !== undefined ? { expand } : undefined);
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      const permissionsRaw = asString(opts['permissions']);
      const permissions =
        permissionsRaw !== undefined
          ? (parseJsonArrayFlag(permissionsRaw, '--permissions') as {
              holder?: { type: string; parameter?: string };
              permission?: string;
            }[])
          : undefined;
      const expand = asString(opts['expand']);
      return client.permissionSchemes.create(
        {
          name,
          ...(description !== undefined && { description }),
          ...(permissions !== undefined && { permissions }),
        },
        expand !== undefined ? { expand } : undefined,
      );
    }
    case 'update': {
      const schemeId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'schemeId'),
        'schemeId',
      );
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      const permissionsRaw = asString(opts['permissions']);
      const permissions =
        permissionsRaw !== undefined
          ? (parseJsonArrayFlag(permissionsRaw, '--permissions') as {
              holder?: { type: string; parameter?: string };
              permission?: string;
            }[])
          : undefined;
      if (name === undefined && description === undefined && permissions === undefined) {
        throw new Error('update requires at least one of: --name, --description, --permissions');
      }
      const expand = asString(opts['expand']);
      return client.permissionSchemes.update(
        schemeId,
        {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(permissions !== undefined && { permissions }),
        },
        expand !== undefined ? { expand } : undefined,
      );
    }
    case 'delete': {
      const schemeId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'schemeId'),
        'schemeId',
      );
      await client.permissionSchemes.delete(schemeId);
      return { deleted: true };
    }
    case 'list-permissions': {
      const schemeId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'schemeId'),
        'schemeId',
      );
      const expand = asString(opts['expand']);
      return client.permissionSchemes.listPermissions(
        schemeId,
        expand !== undefined ? { expand } : undefined,
      );
    }
    case 'create-permission': {
      const schemeId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'schemeId'),
        'schemeId',
      );
      const holderType = asString(opts['holder-type']);
      const holderParameter = asString(opts['holder-parameter']);
      const holderValue = asString(opts['holder-value']);
      const permission = asString(opts['permission']);
      const expand = asString(opts['expand']);
      const holder =
        holderType !== undefined
          ? {
              type: holderType,
              ...(holderParameter !== undefined && { parameter: holderParameter }),
              ...(holderValue !== undefined && { value: holderValue }),
            }
          : undefined;
      return client.permissionSchemes.createPermission(
        schemeId,
        {
          ...(holder !== undefined && { holder }),
          ...(permission !== undefined && { permission }),
        },
        expand !== undefined ? { expand } : undefined,
      );
    }
    case 'get-permission': {
      const schemeId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'schemeId'),
        'schemeId',
      );
      const permissionId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[1], 'permissionId'),
        'permissionId',
      );
      const expand = asString(opts['expand']);
      return client.permissionSchemes.getPermission(
        schemeId,
        permissionId,
        expand !== undefined ? { expand } : undefined,
      );
    }
    case 'delete-permission': {
      const schemeId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'schemeId'),
        'schemeId',
      );
      const permissionId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[1], 'permissionId'),
        'permissionId',
      );
      await client.permissionSchemes.deletePermission(schemeId, permissionId);
      return { deleted: true };
    }
    default:
      throw new Error(
        `Unknown permission-schemes action: ${cmd.action}. Actions: ${PERMISSION_SCHEMES_ACTIONS.join(', ')}`,
      );
  }
}

// ── issue-type-schemes (B566-B575) ───────────────────────────────────────────

const ISSUE_TYPE_SCHEMES_ACTIONS = [
  'list',
  'list-mapping',
  'list-project',
  'create',
  'update',
  'delete',
  'add-issue-types',
  'remove-issue-type',
  'move-issue-types',
  'assign-to-project',
] as const;

async function executeIssueTypeSchemes(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const ids = parseCsv(opts['ids']);
      return client.issueTypeSchemes.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(ids !== undefined && { id: ids }),
      });
    }
    case 'list-mapping': {
      const issueTypeSchemeId = parseCsv(opts['scheme-ids']);
      return client.issueTypeSchemes.listMapping({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(issueTypeSchemeId !== undefined && { issueTypeSchemeId }),
      });
    }
    case 'list-project': {
      const projectId = parseCsv(opts['project-ids']);
      return client.issueTypeSchemes.listProject({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(projectId !== undefined && { projectId }),
      });
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      const defaultIssueTypeId = asString(opts['default-issue-type-id']);
      const issueTypeIds = parseCsv(opts['issue-type-ids']);
      if (opts['issue-type-ids'] !== undefined && issueTypeIds === undefined) {
        throw new Error('--issue-type-ids must contain at least one issue type ID');
      }
      return client.issueTypeSchemes.create({
        name,
        ...(description !== undefined && { description }),
        ...(defaultIssueTypeId !== undefined && { defaultIssueTypeId }),
        ...(issueTypeIds !== undefined && { issueTypeIds }),
      });
    }
    case 'update': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'issueTypeSchemeId');
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      const defaultIssueTypeId = asString(opts['default-issue-type-id']);
      if (name === undefined && description === undefined && defaultIssueTypeId === undefined) {
        throw new Error(
          'update requires at least one of: --name, --description, --default-issue-type-id',
        );
      }
      await client.issueTypeSchemes.update(schemeId, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(defaultIssueTypeId !== undefined && { defaultIssueTypeId }),
      });
      return { updated: true };
    }
    case 'delete': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'issueTypeSchemeId');
      await client.issueTypeSchemes.delete(schemeId);
      return { deleted: true };
    }
    case 'add-issue-types': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'issueTypeSchemeId');
      requireOpt(opts['issue-type-ids'], '--issue-type-ids');
      const issueTypeIds = parseCsv(opts['issue-type-ids']);
      if (!issueTypeIds) {
        throw new Error('--issue-type-ids must contain at least one ID');
      }
      await client.issueTypeSchemes.addIssueTypes(schemeId, { issueTypeIds });
      return { updated: true };
    }
    case 'remove-issue-type': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'issueTypeSchemeId');
      const issueTypeId = requireArg(cmd.positionalArgs[1], 'issueTypeId');
      await client.issueTypeSchemes.removeIssueType(schemeId, issueTypeId);
      return { deleted: true };
    }
    case 'move-issue-types': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'issueTypeSchemeId');
      requireOpt(opts['issue-type-ids'], '--issue-type-ids');
      const issueTypeIds = parseCsv(opts['issue-type-ids']);
      if (!issueTypeIds) {
        throw new Error('--issue-type-ids must contain at least one ID');
      }
      const after = asString(opts['after']);
      const positionRaw = asString(opts['position']);
      const position = positionRaw !== undefined ? asMovePosition(positionRaw) : undefined;
      await client.issueTypeSchemes.moveIssueTypes(schemeId, {
        issueTypeIds,
        ...(after !== undefined && { after }),
        ...(position !== undefined && { position }),
      });
      return { updated: true };
    }
    case 'assign-to-project': {
      const issueTypeSchemeId = requireOpt(opts['scheme-id'], '--scheme-id');
      const projectId = requireOpt(opts['project-id'], '--project-id');
      await client.issueTypeSchemes.assignToProject({ issueTypeSchemeId, projectId });
      return { assigned: true };
    }
    default:
      throw new Error(
        `Unknown issue-type-schemes action: ${cmd.action}. Actions: ${ISSUE_TYPE_SCHEMES_ACTIONS.join(', ')}`,
      );
  }
}

function asMovePosition(value: string): 'First' | 'Last' {
  if (value === 'First' || value === 'Last') return value;
  throw new Error(`--position must be one of: First, Last. Got: ${value}`);
}

function asVersionMovePosition(value: string): 'Earlier' | 'Later' | 'First' | 'Last' {
  if (value === 'Earlier' || value === 'Later' || value === 'First' || value === 'Last') {
    return value;
  }
  throw new Error(`--position must be one of: Earlier, Later, First, Last. Got: ${value}`);
}

// ── roles (B737-B745) ────────────────────────────────────────────────────────

const ROLES_ACTIONS = [
  'list',
  'get',
  'create',
  'update',
  'partial-update',
  'delete',
  'get-actors',
  'add-actors',
  'delete-actors',
] as const;

async function executeRoles(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.roles.list();
    case 'get': {
      const roleId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'roleId'), 'roleId');
      return client.roles.get(roleId);
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      const body: { name: string; description?: string } = { name };
      if (description !== undefined) body.description = description;
      return client.roles.create(body);
    }
    case 'update': {
      const roleId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'roleId'), 'roleId');
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      if (name === undefined && description === undefined) {
        throw new Error('update requires at least one of: --name, --description');
      }
      const body: { name?: string; description?: string } = {};
      if (name !== undefined) body.name = name;
      if (description !== undefined) body.description = description;
      return client.roles.update(roleId, body);
    }
    case 'partial-update': {
      const roleId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'roleId'), 'roleId');
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      if (name === undefined && description === undefined) {
        throw new Error('partial-update requires at least one of: --name, --description');
      }
      const body: { name?: string; description?: string } = {};
      if (name !== undefined) body.name = name;
      if (description !== undefined) body.description = description;
      return client.roles.partialUpdate(roleId, body);
    }
    case 'delete': {
      const roleId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'roleId'), 'roleId');
      const swap = asPositiveInt(opts['swap'], '--swap');
      await client.roles.delete(roleId, swap !== undefined ? { swap } : undefined);
      return { deleted: true };
    }
    case 'get-actors': {
      const roleId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'roleId'), 'roleId');
      return client.roles.getWithActors(roleId);
    }
    case 'add-actors': {
      const roleId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'roleId'), 'roleId');
      const userRaw = asString(opts['user']);
      const groupRaw = asString(opts['group']);
      const groupIdRaw = asString(opts['group-id']);
      if (userRaw === undefined && groupRaw === undefined && groupIdRaw === undefined) {
        throw new Error('add-actors requires at least one of: --user, --group, --group-id');
      }
      const data: { user?: string[]; group?: string[]; groupId?: string[] } = {};
      if (userRaw !== undefined)
        data.user = userRaw
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      if (groupRaw !== undefined)
        data.group = groupRaw
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      if (groupIdRaw !== undefined)
        data.groupId = groupIdRaw
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      return client.roles.addActors(roleId, data);
    }
    case 'delete-actors': {
      const roleId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'roleId'), 'roleId');
      const accountId = asString(opts['account-id']);
      const groupName = asString(opts['group-name']);
      const groupId = asString(opts['group-id']);
      const params: { user?: string; group?: string; groupId?: string } = {};
      if (accountId !== undefined) params.user = accountId;
      if (groupName !== undefined) params.group = groupName;
      if (groupId !== undefined) params.groupId = groupId;
      await client.roles.deleteActors(roleId, Object.keys(params).length > 0 ? params : undefined);
      return { deleted: true };
    }
    default:
      throw new Error(`Unknown roles action: ${cmd.action}. Actions: ${ROLES_ACTIONS.join(', ')}`);
  }
}

// ── expression (B409, B410, B904) ────────────────────────────────────────────

const EXPRESSION_ACTIONS = ['analyse', 'eval', 'evaluate'] as const;

async function executeExpression(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'analyse': {
      const expressionsRaw = requireOpt(opts['expressions'], '--expressions');
      const expressions = parseJsonArrayFlag(expressionsRaw, '--expressions') as string[];
      if (expressions.length === 0) {
        throw new Error('--expressions must contain at least one expression');
      }
      const contextVariablesRaw = asString(opts['context-variables']);
      const contextVariables =
        contextVariablesRaw !== undefined
          ? (parseJsonObjectFlag(contextVariablesRaw, '--context-variables') as Record<
              string,
              string
            >)
          : undefined;
      const check = asExpressionCheck(opts['check']);
      return client.expression.analyse(
        {
          expressions,
          ...(contextVariables !== undefined && { contextVariables }),
        },
        check !== undefined ? { check } : undefined,
      );
    }
    case 'eval': {
      const expression = requireOpt(opts['expression'], '--expression');
      const contextRaw = asString(opts['context']);
      const context =
        contextRaw !== undefined
          ? (parseJsonObjectFlag(contextRaw, '--context') as Record<string, unknown>)
          : undefined;
      const expand = asString(opts['expand']);
      return client.expression.eval(
        {
          expression,
          ...(context !== undefined && { context }),
        },
        expand !== undefined ? { expand } : undefined,
      );
    }
    case 'evaluate': {
      const expression = requireOpt(opts['expression'], '--expression');
      const contextRaw = asString(opts['context']);
      const context =
        contextRaw !== undefined
          ? (parseJsonObjectFlag(contextRaw, '--context') as Record<string, unknown>)
          : undefined;
      const expand = asString(opts['expand']);
      return client.expression.evaluate(
        {
          expression,
          ...(context !== undefined && { context }),
        },
        expand !== undefined ? { expand } : undefined,
      );
    }
    default:
      throw new Error(
        `Unknown expression action: ${cmd.action}. Actions: ${EXPRESSION_ACTIONS.join(', ')}`,
      );
  }
}

// ── issue-comments (B1012, B356-B360) ────────────────────────────────────────

const ISSUE_COMMENTS_ACTIONS = [
  'list',
  'get',
  'create',
  'update',
  'delete',
  'list-properties',
  'get-property',
  'set-property',
  'delete-property',
  'bulk-fetch',
] as const;

async function executeIssueComments(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const issueIdOrKey = requireArg(cmd.positionalArgs[0], 'issueIdOrKey');
      return client.issueComments.list(issueIdOrKey, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        orderBy: asString(opts['order-by']),
        expand: asString(opts['expand']),
      });
    }
    case 'get': {
      const issueIdOrKey = requireArg(cmd.positionalArgs[0], 'issueIdOrKey');
      const commentId = requireArg(cmd.positionalArgs[1], 'commentId');
      return client.issueComments.get(issueIdOrKey, commentId);
    }
    case 'create': {
      const issueIdOrKey = requireArg(cmd.positionalArgs[0], 'issueIdOrKey');
      const data = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.issueComments.create(
        issueIdOrKey,
        data as unknown as Parameters<typeof client.issueComments.create>[1],
      );
    }
    case 'update': {
      const issueIdOrKey = requireArg(cmd.positionalArgs[0], 'issueIdOrKey');
      const commentId = requireArg(cmd.positionalArgs[1], 'commentId');
      const data = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.issueComments.update(
        issueIdOrKey,
        commentId,
        data as unknown as Parameters<typeof client.issueComments.update>[2],
      );
    }
    case 'delete': {
      const issueIdOrKey = requireArg(cmd.positionalArgs[0], 'issueIdOrKey');
      const commentId = requireArg(cmd.positionalArgs[1], 'commentId');
      await client.issueComments.delete(issueIdOrKey, commentId);
      return { deleted: true };
    }
    case 'list-properties': {
      const commentId = requireArg(cmd.positionalArgs[0], 'commentId');
      return client.issueComments.listProperties(commentId);
    }
    case 'get-property': {
      const commentId = requireArg(cmd.positionalArgs[0], 'commentId');
      const propertyKey = requireArg(cmd.positionalArgs[1], 'propertyKey');
      return client.issueComments.getProperty(commentId, propertyKey);
    }
    case 'set-property': {
      const commentId = requireArg(cmd.positionalArgs[0], 'commentId');
      const propertyKey = requireArg(cmd.positionalArgs[1], 'propertyKey');
      const value = parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value');
      await client.issueComments.setProperty(commentId, propertyKey, value);
      return { set: true };
    }
    case 'delete-property': {
      const commentId = requireArg(cmd.positionalArgs[0], 'commentId');
      const propertyKey = requireArg(cmd.positionalArgs[1], 'propertyKey');
      await client.issueComments.deleteProperty(commentId, propertyKey);
      return { deleted: true };
    }
    case 'bulk-fetch': {
      const idsRaw = requireOpt(opts['ids'], '--ids');
      const ids = splitCsvIds(idsRaw).map((s) => parsePositiveIntArg(s, '--ids'));
      if (ids.length === 0) {
        throw new Error('--ids must contain at least one ID');
      }
      if (ids.length > 1000) {
        throw new Error('--ids cannot exceed 1000 (Atlassian API limit)');
      }
      const expand = asString(opts['expand']);
      return client.issueComments.bulkFetch({ ids }, { ...(expand !== undefined && { expand }) });
    }
    default:
      throw new Error(
        `Unknown issue-comments action: ${cmd.action}. Actions: ${ISSUE_COMMENTS_ACTIONS.join(', ')}`,
      );
  }
}

// ── labels (B1013) ───────────────────────────────────────────────────────────

async function executeLabels(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      return client.labels.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    default:
      throw new Error(`Unknown labels action: ${cmd.action}. Actions: list`);
  }
}

// ── fieldconfiguration (B908-B913) ───────────────────────────────────────────

const FIELD_CONFIGURATION_ACTIONS = [
  'list',
  'create',
  'delete',
  'update',
  'list-fields',
  'update-fields',
] as const;

async function executeFieldConfiguration(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const idsRaw = parseCsv(opts['ids']);
      const ids = idsRaw?.map((s) => parsePositiveIntArg(s, '--ids'));
      const isDefault = asBoolFlag(opts['is-default']);
      const query = asString(opts['query']);
      return client.fieldConfigurations.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(ids !== undefined && { id: ids }),
        ...(isDefault !== undefined && { isDefault }),
        ...(query !== undefined && { query }),
      });
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      return client.fieldConfigurations.create({
        name,
        ...(description !== undefined && { description }),
      });
    }
    case 'delete': {
      const id = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'id'), 'id');
      await client.fieldConfigurations.delete(id);
      return { deleted: true };
    }
    case 'update': {
      const id = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'id'), 'id');
      // The Jira API treats `name` as required on the PUT body, so we mirror
      // that contract at the CLI layer rather than fail with an opaque 400.
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      await client.fieldConfigurations.update(id, {
        name,
        ...(description !== undefined && { description }),
      });
      return { updated: true };
    }
    case 'list-fields': {
      const id = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'id'), 'id');
      return client.fieldConfigurations.listFields(id, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'update-fields': {
      const id = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'id'), 'id');
      const raw = requireOpt(opts['field-configuration-items'], '--field-configuration-items');
      const items = parseJsonArrayFlag(raw, '--field-configuration-items');
      await client.fieldConfigurations.updateFields(id, {
        fieldConfigurationItems: items as FieldConfigurationItem[],
      });
      return { updated: true };
    }
    default:
      throw new Error(
        `Unknown fieldconfiguration action: ${cmd.action}. Actions: ${FIELD_CONFIGURATION_ACTIONS.join(', ')}`,
      );
  }
}

// ── notification-schemes (B605-B612) ─────────────────────────────────────────

const NOTIFICATION_SCHEMES_ACTIONS = [
  'list',
  'create',
  'get',
  'update',
  'add-notifications',
  'delete',
  'remove-notification',
  'list-projects',
] as const;

async function executeNotificationSchemes(
  client: JiraClient,
  cmd: ParsedCommand,
): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const ids = parseCsv(opts['ids']);
      const projectIds = parseCsv(opts['project-ids']);
      const expand = asString(opts['expand']);
      const onlyDefault =
        opts['only-default'] !== undefined ? asBoolFlag(opts['only-default']) : undefined;
      return client.notificationSchemes.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(ids !== undefined && { id: ids }),
        ...(projectIds !== undefined && { projectId: projectIds }),
        ...(expand !== undefined && { expand }),
        ...(onlyDefault !== undefined && { onlyDefault }),
      });
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      const eventsRaw = asString(opts['notification-scheme-events']);
      const notificationSchemeEvents =
        eventsRaw !== undefined
          ? (parseJsonArrayFlag(
              eventsRaw,
              '--notification-scheme-events',
            ) as NotificationSchemeEvent[])
          : undefined;
      return client.notificationSchemes.create({
        name,
        ...(description !== undefined && { description }),
        ...(notificationSchemeEvents !== undefined && { notificationSchemeEvents }),
      });
    }
    case 'get': {
      const id = requireArg(cmd.positionalArgs[0], 'notificationSchemeId');
      const expand = asString(opts['expand']);
      return client.notificationSchemes.get(id, expand !== undefined ? { expand } : undefined);
    }
    case 'update': {
      const id = requireArg(cmd.positionalArgs[0], 'notificationSchemeId');
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      if (name === undefined && description === undefined) {
        throw new Error('update requires at least one of: --name, --description');
      }
      await client.notificationSchemes.update(id, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      });
      return { updated: true };
    }
    case 'add-notifications': {
      const id = requireArg(cmd.positionalArgs[0], 'notificationSchemeId');
      const eventsRaw = requireOpt(
        opts['notification-scheme-events'],
        '--notification-scheme-events',
      );
      const notificationSchemeEvents = parseJsonArrayFlag(
        eventsRaw,
        '--notification-scheme-events',
      ) as NotificationSchemeEvent[];
      await client.notificationSchemes.addNotifications(id, { notificationSchemeEvents });
      return { updated: true };
    }
    case 'delete': {
      const id = requireArg(cmd.positionalArgs[0], 'notificationSchemeId');
      await client.notificationSchemes.delete(id);
      return { deleted: true };
    }
    case 'remove-notification': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'notificationSchemeId');
      const notificationId = requireArg(cmd.positionalArgs[1], 'notificationId');
      await client.notificationSchemes.removeNotification(schemeId, notificationId);
      return { deleted: true };
    }
    case 'list-projects': {
      const projectIds = parseCsv(opts['project-ids']);
      return client.notificationSchemes.listProjects({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(projectIds !== undefined && { projectId: projectIds }),
      });
    }
    default:
      throw new Error(
        `Unknown notification-schemes action: ${cmd.action}. Actions: ${NOTIFICATION_SCHEMES_ACTIONS.join(', ')}`,
      );
  }
}

// ── priorityscheme (B644-B651) ───────────────────────────────────────────────

const PRIORITYSCHEME_ACTIONS = [
  'list',
  'create',
  'delete',
  'update',
  'list-priorities',
  'list-projects',
  'suggested-mappings',
  'available-priorities',
] as const;

function asOrderBy(value: string | boolean | undefined): 'name' | '+name' | '-name' | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if (s === 'name' || s === '+name' || s === '-name') return s;
  throw new Error(`--order-by must be one of: name, +name, -name. Got: ${s}`);
}

function asScreensOrderBy(
  value: string | boolean | undefined,
): 'name' | '-name' | '+name' | 'id' | '-id' | '+id' | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if (s === 'name' || s === '-name' || s === '+name' || s === 'id' || s === '-id' || s === '+id') {
    return s;
  }
  throw new Error(`--order-by must be one of: name, -name, +name, id, -id, +id. Got: ${s}`);
}

function parseIntCsv(value: string | boolean | undefined, flag: string): number[] | undefined {
  const arr = parseCsv(value);
  if (arr === undefined) return undefined;
  return arr.map((s) => {
    const n = Number(s);
    if (!Number.isInteger(n)) {
      throw new Error(`${flag} must contain integers, got: ${s}`);
    }
    return n;
  });
}

async function executePrioritySchemeResource(
  client: JiraClient,
  cmd: ParsedCommand,
): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const priorityId = parseIntCsv(opts['priority-ids'], '--priority-ids');
      const schemeId = parseIntCsv(opts['scheme-ids'], '--scheme-ids');
      const schemeName = asString(opts['scheme-name']);
      const onlyDefault = asBoolFlag(opts['only-default']);
      const orderBy = asOrderBy(opts['order-by']);
      const expand = asString(opts['expand']);
      return client.prioritySchemes.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(priorityId !== undefined && { priorityId }),
        ...(schemeId !== undefined && { schemeId }),
        ...(schemeName !== undefined && { schemeName }),
        ...(onlyDefault !== undefined && { onlyDefault }),
        ...(orderBy !== undefined && { orderBy }),
        ...(expand !== undefined && { expand }),
      });
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const defaultPriorityIdStr = requireOpt(opts['default-priority-id'], '--default-priority-id');
      const defaultPriorityId = parsePositiveIntArg(defaultPriorityIdStr, '--default-priority-id');
      requireOpt(opts['priority-ids'], '--priority-ids');
      const priorityIds = parseIntCsv(opts['priority-ids'], '--priority-ids');
      if (priorityIds === undefined || priorityIds.length === 0) {
        throw new Error('--priority-ids must contain at least one priority ID');
      }
      const description = asString(opts['description']);
      const projectIds = parseIntCsv(opts['project-ids'], '--project-ids');
      const mappingsRaw = asString(opts['mappings']);
      const mappings =
        mappingsRaw !== undefined
          ? (parseJsonObjectFlag(mappingsRaw, '--mappings') as {
              in?: Record<string, number>;
              out?: Record<string, number>;
            })
          : undefined;
      return client.prioritySchemes.create({
        name,
        defaultPriorityId,
        priorityIds,
        ...(description !== undefined && { description }),
        ...(projectIds !== undefined && { projectIds }),
        ...(mappings !== undefined && { mappings }),
      });
    }
    case 'delete': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'schemeId');
      await client.prioritySchemes.delete(schemeId);
      return { deleted: true };
    }
    case 'update': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'schemeId');
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      const defaultPriorityId = asPositiveInt(opts['default-priority-id'], '--default-priority-id');
      const prioritiesRaw = asString(opts['priorities']);
      const priorities =
        prioritiesRaw !== undefined
          ? (parseJsonObjectFlag(prioritiesRaw, '--priorities') as {
              add?: { ids: number[] };
              remove?: { ids: number[] };
            })
          : undefined;
      const projectsRaw = asString(opts['projects']);
      const projects =
        projectsRaw !== undefined
          ? (parseJsonObjectFlag(projectsRaw, '--projects') as {
              add?: { ids: number[] };
              remove?: { ids: number[] };
            })
          : undefined;
      const mappingsRaw = asString(opts['mappings']);
      const mappings =
        mappingsRaw !== undefined
          ? (parseJsonObjectFlag(mappingsRaw, '--mappings') as {
              in?: Record<string, number>;
              out?: Record<string, number>;
            })
          : undefined;
      if (
        name === undefined &&
        description === undefined &&
        defaultPriorityId === undefined &&
        priorities === undefined &&
        projects === undefined &&
        mappings === undefined
      ) {
        throw new Error(
          'update requires at least one of: --name, --description, --default-priority-id, --priorities, --projects, --mappings',
        );
      }
      return client.prioritySchemes.update(schemeId, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(defaultPriorityId !== undefined && { defaultPriorityId }),
        ...(priorities !== undefined && { priorities }),
        ...(projects !== undefined && { projects }),
        ...(mappings !== undefined && { mappings }),
      });
    }
    case 'list-priorities': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'schemeId');
      return client.prioritySchemes.listPriorities(schemeId, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'list-projects': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'schemeId');
      const projectId = parseIntCsv(opts['project-ids'], '--project-ids');
      const query = asString(opts['query']);
      return client.prioritySchemes.listProjects(schemeId, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(projectId !== undefined && { projectId }),
        ...(query !== undefined && { query }),
      });
    }
    case 'suggested-mappings': {
      const schemeId = asPositiveInt(opts['scheme-id'], '--scheme-id');
      const prioritiesRaw = asString(opts['priorities']);
      const priorities =
        prioritiesRaw !== undefined
          ? (parseJsonObjectFlag(prioritiesRaw, '--priorities') as {
              add?: number[];
              remove?: number[];
            })
          : undefined;
      const projectsRaw = asString(opts['projects']);
      const projects =
        projectsRaw !== undefined
          ? (parseJsonObjectFlag(projectsRaw, '--projects') as { add?: number[] })
          : undefined;
      const data: {
        schemeId?: number;
        priorities?: { add?: number[]; remove?: number[] };
        projects?: { add?: number[] };
        startAt?: number;
        maxResults?: number;
      } = {};
      if (schemeId !== undefined) data.schemeId = schemeId;
      if (priorities !== undefined) data.priorities = priorities;
      if (projects !== undefined) data.projects = projects;
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      if (startAt !== undefined) data.startAt = startAt;
      if (maxResults !== undefined) data.maxResults = maxResults;
      return client.prioritySchemes.suggestedMappings(
        Object.keys(data).length > 0 ? data : undefined,
      );
    }
    case 'available-priorities': {
      const schemeId = requireOpt(opts['scheme-id'], '--scheme-id');
      const query = asString(opts['query']);
      const exclude = parseCsv(opts['exclude']);
      return client.prioritySchemes.listAvailablePriorities({
        schemeId,
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(query !== undefined && { query }),
        ...(exclude !== undefined && { exclude }),
      });
    }
    default:
      throw new Error(
        `Unknown priority-schemes action: ${cmd.action}. Actions: ${PRIORITYSCHEME_ACTIONS.join(', ')}`,
      );
  }
}

function asExportType(raw: string | undefined): 'CSV' | 'XLSX' | undefined {
  if (raw === undefined) return undefined;
  if (raw !== 'CSV' && raw !== 'XLSX') throw new Error('--export-type must be CSV or XLSX');
  return raw;
}

// ── version (B820-B831, B933) ────────────────────────────────────────────────

const VERSION_ACTIONS = [
  'create',
  'get',
  'update',
  'delete',
  'merge',
  'move',
  'related-issue-counts',
  'list-related-work',
  'create-related-work',
  'update-related-work',
  'delete-and-replace',
  'unresolved-issue-count',
  'delete-related-work',
] as const;

async function executeVersionResource(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'create': {
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      const archived = asBoolFlag(opts['archived']);
      const released = asBoolFlag(opts['released']);
      const startDate = asString(opts['start-date']);
      const releaseDate = asString(opts['release-date']);
      const project = asString(opts['project']);
      const projectId = asPositiveInt(opts['project-id'], '--project-id');
      const moveUnfixedIssuesTo = asString(opts['move-unfixed-issues-to']);
      const driver = asString(opts['driver']);
      return client.version.create({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(archived !== undefined && { archived }),
        ...(released !== undefined && { released }),
        ...(startDate !== undefined && { startDate }),
        ...(releaseDate !== undefined && { releaseDate }),
        ...(project !== undefined && { project }),
        ...(projectId !== undefined && { projectId }),
        ...(moveUnfixedIssuesTo !== undefined && { moveUnfixedIssuesTo }),
        ...(driver !== undefined && { driver }),
      });
    }
    case 'get': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const expand = asString(opts['expand']);
      return client.version.get(id, expand !== undefined ? { expand } : undefined);
    }
    case 'update': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      const archived = asBoolFlag(opts['archived']);
      const released = asBoolFlag(opts['released']);
      const startDate = asString(opts['start-date']);
      const releaseDate = asString(opts['release-date']);
      const project = asString(opts['project']);
      const projectId = asPositiveInt(opts['project-id'], '--project-id');
      const moveUnfixedIssuesTo = asString(opts['move-unfixed-issues-to']);
      const driver = asString(opts['driver']);
      if (
        name === undefined &&
        description === undefined &&
        archived === undefined &&
        released === undefined &&
        startDate === undefined &&
        releaseDate === undefined &&
        project === undefined &&
        projectId === undefined &&
        moveUnfixedIssuesTo === undefined &&
        driver === undefined
      ) {
        throw new Error(
          'update requires at least one of: --name, --description, --archived, --released, --start-date, --release-date, --project, --project-id, --move-unfixed-issues-to, --driver',
        );
      }
      return client.version.update(id, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(archived !== undefined && { archived }),
        ...(released !== undefined && { released }),
        ...(startDate !== undefined && { startDate }),
        ...(releaseDate !== undefined && { releaseDate }),
        ...(project !== undefined && { project }),
        ...(projectId !== undefined && { projectId }),
        ...(moveUnfixedIssuesTo !== undefined && { moveUnfixedIssuesTo }),
        ...(driver !== undefined && { driver }),
      });
    }
    case 'delete': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const moveFixIssuesTo = asString(opts['move-fix-issues-to']);
      const moveAffectedIssuesTo = asString(opts['move-affected-issues-to']);
      await client.version.delete(id, {
        ...(moveFixIssuesTo !== undefined && { moveFixIssuesTo }),
        ...(moveAffectedIssuesTo !== undefined && { moveAffectedIssuesTo }),
      });
      return { deleted: true };
    }
    case 'merge': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const moveIssuesTo = requireArg(cmd.positionalArgs[1], 'moveIssuesTo');
      await client.version.merge(id, moveIssuesTo);
      return { merged: true };
    }
    case 'move': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const after = asString(opts['after']);
      const posRaw = asString(opts['position']);
      const pos = posRaw !== undefined ? asVersionMovePosition(posRaw) : undefined;
      if (after === undefined && pos === undefined) {
        throw new Error('move requires at least one of: --after, --position');
      }
      return client.version.move(id, {
        ...(after !== undefined && { after }),
        ...(pos !== undefined && { position: pos }),
      });
    }
    case 'related-issue-counts': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      return client.version.relatedIssueCounts(id);
    }
    case 'list-related-work': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      return client.version.listRelatedWork(id);
    }
    case 'create-related-work': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const category = requireOpt(opts['category'], '--category');
      const issueId = asPositiveInt(opts['issue-id'], '--issue-id');
      const title = asString(opts['title']);
      const url = asString(opts['url']);
      return client.version.createRelatedWork(id, {
        category,
        ...(issueId !== undefined && { issueId }),
        ...(title !== undefined && { title }),
        ...(url !== undefined && { url }),
      });
    }
    case 'update-related-work': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const category = requireOpt(opts['category'], '--category');
      const issueId = asPositiveInt(opts['issue-id'], '--issue-id');
      const title = asString(opts['title']);
      const url = asString(opts['url']);
      const relatedWorkId = asString(opts['related-work-id']);
      return client.version.updateRelatedWork(id, {
        category,
        ...(issueId !== undefined && { issueId }),
        ...(title !== undefined && { title }),
        ...(url !== undefined && { url }),
        ...(relatedWorkId !== undefined && { relatedWorkId }),
      });
    }
    case 'delete-and-replace': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const moveFixIssuesTo = asPositiveInt(opts['move-fix-issues-to'], '--move-fix-issues-to');
      const moveAffectedIssuesTo = asPositiveInt(
        opts['move-affected-issues-to'],
        '--move-affected-issues-to',
      );
      await client.version.deleteAndReplace(id, {
        ...(moveFixIssuesTo !== undefined && { moveFixIssuesTo }),
        ...(moveAffectedIssuesTo !== undefined && { moveAffectedIssuesTo }),
      });
      return { deleted: true };
    }
    case 'unresolved-issue-count': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      return client.version.unresolvedIssueCount(id);
    }
    case 'delete-related-work': {
      const versionId = requireArg(cmd.positionalArgs[0], 'versionId');
      const relatedWorkId = requireArg(cmd.positionalArgs[1], 'relatedWorkId');
      await client.version.deleteRelatedWork(versionId, relatedWorkId);
      return { deleted: true };
    }
    default:
      throw new Error(
        `Unknown version action: ${cmd.action}. Actions: ${VERSION_ACTIONS.join(', ')}`,
      );
  }
}

// ── config (B367-B381) ────────────────────────────────────────────────────────

const CONFIG_ACTIONS = [
  'list',
  'create',
  'delete',
  'get',
  'update',
  'clone',
  'list-fields',
  'get-field-parameters',
  'list-projects',
  'remove-field-associations',
  'update-field-associations',
  'remove-field-parameters',
  'update-field-parameters',
  'get-projects-with-schemes',
  'associate-projects',
] as const;

async function executeConfig(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const projectIds = parseIntCsv(opts['project-ids'], '--project-ids');
      const query = asString(opts['query']);
      return client.config.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(projectIds !== undefined && { projectId: projectIds }),
        ...(query !== undefined && { query }),
      });
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      return client.config.create({
        name,
        ...(description !== undefined && { description }),
      });
    }
    case 'delete': {
      const id = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'id'), 'id');
      return client.config.delete(id);
    }
    case 'get': {
      const id = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'id'), 'id');
      return client.config.get(id);
    }
    case 'update': {
      const id = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'id'), 'id');
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      if (name === undefined && description === undefined) {
        throw new Error('update requires at least one of: --name, --description');
      }
      return client.config.update(id, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      });
    }
    case 'clone': {
      const id = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'id'), 'id');
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      return client.config.clone(id, {
        name,
        ...(description !== undefined && { description }),
      });
    }
    case 'list-fields': {
      const id = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'id'), 'id');
      const fieldIds = parseCsv(opts['field-id']);
      return client.config.listFields(id, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(fieldIds !== undefined && { fieldId: fieldIds }),
      });
    }
    case 'get-field-parameters': {
      const id = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'id'), 'id');
      const fieldId = requireArg(cmd.positionalArgs[1], 'fieldId');
      return client.config.getFieldParameters(id, fieldId);
    }
    case 'list-projects': {
      const id = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'id'), 'id');
      const projectIds = parseIntCsv(opts['project-ids'], '--project-ids');
      return client.config.listProjects(id, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(projectIds !== undefined && { projectId: projectIds }),
      });
    }
    case 'remove-field-associations': {
      const raw = requireOpt(opts['body'], '--body');
      const body = parseJsonObjectFlag(raw, '--body') as RemoveFieldAssociationsBody;
      await client.config.removeFieldAssociations(body);
      return { deleted: true };
    }
    case 'update-field-associations': {
      const raw = requireOpt(opts['body'], '--body');
      const body = parseJsonObjectFlag(raw, '--body') as UpdateFieldAssociationsBody;
      await client.config.updateFieldAssociations(body);
      return { updated: true };
    }
    case 'remove-field-parameters': {
      const raw = requireOpt(opts['body'], '--body');
      const body = parseJsonObjectFlag(raw, '--body') as RemoveFieldParametersBody;
      await client.config.removeFieldParameters(body);
      return { deleted: true };
    }
    case 'update-field-parameters': {
      const raw = requireOpt(opts['body'], '--body');
      const body = parseJsonObjectFlag(raw, '--body') as UpdateFieldParametersBody;
      await client.config.updateFieldParameters(body);
      return { updated: true };
    }
    case 'get-projects-with-schemes': {
      const projectIds = parseIntCsv(opts['project-ids'], '--project-ids');
      if (projectIds === undefined || projectIds.length === 0) {
        throw new Error('get-projects-with-schemes requires --project-ids');
      }
      return client.config.getProjectsWithSchemes({
        projectId: projectIds,
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'associate-projects': {
      const raw = requireOpt(opts['body'], '--body');
      const body = parseJsonObjectFlag(raw, '--body') as AssociateProjectsBody;
      await client.config.associateProjects(body);
      return { updated: true };
    }
    default:
      throw new Error(
        `Unknown config action: ${cmd.action}. Actions: ${CONFIG_ACTIONS.join(', ')}`,
      );
  }
}

// ── issuesecurityschemes (B539-B555) ─────────────────────────────────────────

const ISSUE_SECURITY_SCHEMES_ACTIONS = [
  'get-all',
  'create',
  'get',
  'update',
  'list-members',
  'delete',
  'add-levels',
  'remove-level',
  'update-level',
  'add-level-members',
  'remove-level-member',
  'list-levels',
  'set-default-levels',
  'list-level-members',
  'list-projects',
  'associate-to-project',
  'search',
] as const;

async function executeIssueSecuritySchemes(
  client: JiraClient,
  cmd: ParsedCommand,
): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get-all': {
      return client.issueSecuritySchemes.getAll();
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      const levelsRaw = asString(opts['levels']);
      let levels: unknown[] | undefined;
      if (levelsRaw !== undefined) {
        levels = parseJsonArrayFlag(levelsRaw, '--levels');
      }
      return client.issueSecuritySchemes.create({
        name,
        ...(description !== undefined && { description }),
        ...(levels !== undefined && { levels: levels as SecuritySchemeLevelBean[] }),
      });
    }
    case 'get': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      return client.issueSecuritySchemes.get(id);
    }
    case 'update': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      if (name === undefined && description === undefined) {
        throw new Error('update requires at least one of: --name, --description');
      }
      await client.issueSecuritySchemes.update(id, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      });
      return { updated: true };
    }
    case 'list-members': {
      const id = requireArg(cmd.positionalArgs[0], 'issueSecuritySchemeId');
      const levelIds = parseCsv(opts['issue-security-level-id']);
      return client.issueSecuritySchemes.listMembers(id, {
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(levelIds !== undefined && { issueSecurityLevelId: levelIds }),
        ...(asString(opts['expand']) !== undefined && { expand: asString(opts['expand']) }),
      });
    }
    case 'delete': {
      const id = requireArg(cmd.positionalArgs[0], 'schemeId');
      await client.issueSecuritySchemes.delete(id);
      return { deleted: true };
    }
    case 'add-levels': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'schemeId');
      const levelsRaw = asString(opts['levels']);
      let levels: unknown[] | undefined;
      if (levelsRaw !== undefined) {
        levels = parseJsonArrayFlag(levelsRaw, '--levels');
      }
      await client.issueSecuritySchemes.addLevels(schemeId, {
        ...(levels !== undefined && { levels: levels as SecuritySchemeLevelBean[] }),
      });
      return { updated: true };
    }
    case 'remove-level': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'schemeId');
      const levelId = requireArg(cmd.positionalArgs[1], 'levelId');
      const replaceWith = asString(opts['replace-with']);
      await client.issueSecuritySchemes.removeLevel(schemeId, levelId, {
        ...(replaceWith !== undefined && { replaceWith }),
      });
      return { deleted: true };
    }
    case 'update-level': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'schemeId');
      const levelId = requireArg(cmd.positionalArgs[1], 'levelId');
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      if (name === undefined && description === undefined) {
        throw new Error('update-level requires at least one of: --name, --description');
      }
      await client.issueSecuritySchemes.updateLevel(schemeId, levelId, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      });
      return { updated: true };
    }
    case 'add-level-members': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'schemeId');
      const levelId = requireArg(cmd.positionalArgs[1], 'levelId');
      const membersRaw = asString(opts['members']);
      let members: unknown[] | undefined;
      if (membersRaw !== undefined) {
        members = parseJsonArrayFlag(membersRaw, '--members');
      }
      await client.issueSecuritySchemes.addLevelMembers(schemeId, levelId, {
        ...(members !== undefined && { members: members as SecuritySchemeLevelMemberBean[] }),
      });
      return { updated: true };
    }
    case 'remove-level-member': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'schemeId');
      const levelId = requireArg(cmd.positionalArgs[1], 'levelId');
      const memberId = requireArg(cmd.positionalArgs[2], 'memberId');
      await client.issueSecuritySchemes.removeLevelMember(schemeId, levelId, memberId);
      return { deleted: true };
    }
    case 'list-levels': {
      const ids = parseCsv(opts['id']);
      const schemeIds = parseCsv(opts['scheme-id']);
      return client.issueSecuritySchemes.listLevels({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(ids !== undefined && { id: ids }),
        ...(schemeIds !== undefined && { schemeId: schemeIds }),
        ...(opts['only-default'] !== undefined && {
          onlyDefault: asBoolFlag(opts['only-default']),
        }),
      });
    }
    case 'set-default-levels': {
      const raw = requireOpt(opts['default-values'], '--default-values');
      const defaultValues = parseJsonArrayFlag(raw, '--default-values') as DefaultLevelValue[];
      await client.issueSecuritySchemes.setDefaultLevels({ defaultValues });
      return { updated: true };
    }
    case 'list-level-members': {
      const ids = parseCsv(opts['id']);
      const schemeIds = parseCsv(opts['scheme-id']);
      const levelIds = parseCsv(opts['level-id']);
      return client.issueSecuritySchemes.listLevelMembers({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(ids !== undefined && { id: ids }),
        ...(schemeIds !== undefined && { schemeId: schemeIds }),
        ...(levelIds !== undefined && { levelId: levelIds }),
        ...(asString(opts['expand']) !== undefined && { expand: asString(opts['expand']) }),
      });
    }
    case 'list-projects': {
      const issueSecuritySchemeIds = parseCsv(opts['issue-security-scheme-id']);
      const projectIds = parseCsv(opts['project-ids']);
      return client.issueSecuritySchemes.listProjects({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(issueSecuritySchemeIds !== undefined && {
          issueSecuritySchemeId: issueSecuritySchemeIds,
        }),
        ...(projectIds !== undefined && { projectId: projectIds }),
      });
    }
    case 'associate-to-project': {
      const projectId = requireOpt(opts['project-id'], '--project-id');
      const schemeId = requireOpt(opts['scheme-id'], '--scheme-id');
      const mappingsRaw = asString(opts['old-to-new-mappings']);
      const data: AssociateSchemesToProjectsData = {
        projectId,
        schemeId,
        ...(mappingsRaw !== undefined && {
          oldToNewSecurityLevelMappings: parseJsonArrayFlag(
            mappingsRaw,
            '--old-to-new-mappings',
          ) as OldToNewSecurityLevelMapping[],
        }),
      };
      await client.issueSecuritySchemes.associateToProject(data);
      return { updated: true };
    }
    case 'search': {
      const ids = parseCsv(opts['id']);
      const projectIds = parseCsv(opts['project-ids']);
      return client.issueSecuritySchemes.search({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(ids !== undefined && { id: ids }),
        ...(projectIds !== undefined && { projectId: projectIds }),
      });
    }
    default:
      throw new Error(
        `Unknown issuesecurityschemes action: ${cmd.action}. Actions: ${ISSUE_SECURITY_SCHEMES_ACTIONS.join(', ')}`,
      );
  }
}

// ── screens (B746-B761) ──────────────────────────────────────────────────────

const MOVE_FIELD_POSITIONS = ['Earlier', 'Later', 'First', 'Last'] as const;

function asMoveFieldPosition(
  value: string | boolean | undefined,
): 'Earlier' | 'Later' | 'First' | 'Last' | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if (s === 'Earlier' || s === 'Later' || s === 'First' || s === 'Last') {
    return s;
  }
  throw new Error(`--position must be one of: ${MOVE_FIELD_POSITIONS.join(', ')}. Got: ${s}`);
}

const SCREENS_ACTIONS = [
  'list',
  'create',
  'delete',
  'update',
  'list-available-fields',
  'list-tabs',
  'create-tab',
  'delete-tab',
  'update-tab',
  'list-tab-fields',
  'add-field-to-tab',
  'remove-field-from-tab',
  'move-field',
  'move-tab',
  'add-to-default',
  'list-all-tabs',
] as const;

async function executeScreens(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const ids = parseCsv(opts['ids']);
      const scope = parseCsv(opts['scope']);
      const orderBy = asScreensOrderBy(opts['order-by']);
      return client.screens.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(ids !== undefined && { id: ids.map(Number) }),
        ...(opts['query-string'] !== undefined && { queryString: asString(opts['query-string']) }),
        ...(scope !== undefined && { scope }),
        ...(orderBy !== undefined && { orderBy }),
      });
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      return client.screens.create({
        name,
        ...(description !== undefined && { description }),
      });
    }
    case 'delete': {
      const screenId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'screenId'),
        'screenId',
      );
      await client.screens.delete(screenId);
      return { deleted: true };
    }
    case 'update': {
      const screenId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'screenId'),
        'screenId',
      );
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      if (name === undefined && description === undefined) {
        throw new Error('update requires at least one of: --name, --description');
      }
      return client.screens.update(screenId, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      });
    }
    case 'list-available-fields': {
      const screenId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'screenId'),
        'screenId',
      );
      return client.screens.listAvailableFields(screenId);
    }
    case 'list-tabs': {
      const screenId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'screenId'),
        'screenId',
      );
      const projectKey = asString(opts['project-key']);
      return client.screens.listTabs(screenId, projectKey);
    }
    case 'create-tab': {
      const screenId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'screenId'),
        'screenId',
      );
      const name = requireOpt(opts['name'], '--name');
      return client.screens.createTab(screenId, { name });
    }
    case 'delete-tab': {
      const screenId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'screenId'),
        'screenId',
      );
      const tabId = parsePositiveIntArg(requireArg(cmd.positionalArgs[1], 'tabId'), 'tabId');
      await client.screens.deleteTab(screenId, tabId);
      return { deleted: true };
    }
    case 'update-tab': {
      const screenId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'screenId'),
        'screenId',
      );
      const tabId = parsePositiveIntArg(requireArg(cmd.positionalArgs[1], 'tabId'), 'tabId');
      const name = requireOpt(opts['name'], '--name');
      return client.screens.updateTab(screenId, tabId, { name });
    }
    case 'list-tab-fields': {
      const screenId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'screenId'),
        'screenId',
      );
      const tabId = parsePositiveIntArg(requireArg(cmd.positionalArgs[1], 'tabId'), 'tabId');
      const projectKey = asString(opts['project-key']);
      return client.screens.listTabFields(screenId, tabId, {
        ...(projectKey !== undefined && { projectKey }),
      });
    }
    case 'add-field-to-tab': {
      const screenId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'screenId'),
        'screenId',
      );
      const tabId = parsePositiveIntArg(requireArg(cmd.positionalArgs[1], 'tabId'), 'tabId');
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const skipFieldAssociation =
        typeof opts['skip-field-association'] === 'boolean'
          ? opts['skip-field-association']
          : undefined;
      return client.screens.addFieldToTab(screenId, tabId, { fieldId }, skipFieldAssociation);
    }
    case 'remove-field-from-tab': {
      const screenId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'screenId'),
        'screenId',
      );
      const tabId = parsePositiveIntArg(requireArg(cmd.positionalArgs[1], 'tabId'), 'tabId');
      const id = requireArg(cmd.positionalArgs[2], 'id');
      await client.screens.removeFieldFromTab(screenId, tabId, id);
      return { deleted: true };
    }
    case 'move-field': {
      const screenId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'screenId'),
        'screenId',
      );
      const tabId = parsePositiveIntArg(requireArg(cmd.positionalArgs[1], 'tabId'), 'tabId');
      const id = requireArg(cmd.positionalArgs[2], 'id');
      const position = asMoveFieldPosition(opts['position']);
      const after = asString(opts['after']);
      await client.screens.moveField(screenId, tabId, id, {
        ...(position !== undefined && { position }),
        ...(after !== undefined && { after }),
      });
      return { moved: true };
    }
    case 'move-tab': {
      const screenId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[0], 'screenId'),
        'screenId',
      );
      const tabId = parsePositiveIntArg(requireArg(cmd.positionalArgs[1], 'tabId'), 'tabId');
      const posStr = requireArg(cmd.positionalArgs[2], 'pos');
      const posNum = Number(posStr);
      if (!Number.isInteger(posNum) || posNum < 0) {
        throw new Error(`pos must be a non-negative integer, got: ${posStr}`);
      }
      await client.screens.moveTab(screenId, tabId, posNum);
      return { moved: true };
    }
    case 'add-to-default': {
      const fieldId = requireArg(cmd.positionalArgs[0], 'fieldId');
      return client.screens.addToDefault(fieldId);
    }
    case 'list-all-tabs': {
      const screenIds = parseCsv(opts['ids']);
      const tabIds = parseCsv(opts['tab-ids']);
      return client.screens.listScreenTabs({
        ...(screenIds !== undefined && { screenId: screenIds.map(Number) }),
        ...(tabIds !== undefined && { tabId: tabIds.map(Number) }),
        ...(opts['start-at'] !== undefined && {
          startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        }),
        ...(opts['max-results'] !== undefined && {
          maxResult: asPositiveInt(opts['max-results'], '--max-results'),
        }),
      });
    }
    default:
      throw new Error(
        `Unknown screens action: ${cmd.action}. Actions: ${SCREENS_ACTIONS.join(', ')}`,
      );
  }
}

// ─── Screen Schemes (B762-B765) ────────────────────────────────────────────

const SCREENSCHEME_ACTIONS = ['list', 'list-all', 'create', 'update', 'delete'];

async function executeScreenScheme(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const ids = parseIntCsv(opts['ids'], '--ids');
      const orderBy = asScreenSchemeOrderBy(opts['order-by']);
      return client.screenScheme.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(ids !== undefined && { id: ids }),
        ...(opts['expand'] !== undefined && { expand: asString(opts['expand']) }),
        ...(opts['query-string'] !== undefined && {
          queryString: asString(opts['query-string']),
        }),
        ...(orderBy !== undefined && { orderBy }),
      });
    }
    case 'list-all': {
      const ids = parseIntCsv(opts['ids'], '--ids');
      const orderBy = asScreenSchemeOrderBy(opts['order-by']);
      const results: unknown[] = [];
      for await (const item of client.screenScheme.listAll({
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(ids !== undefined && { id: ids }),
        ...(opts['expand'] !== undefined && { expand: asString(opts['expand']) }),
        ...(opts['query-string'] !== undefined && {
          queryString: asString(opts['query-string']),
        }),
        ...(orderBy !== undefined && { orderBy }),
      })) {
        results.push(item);
      }
      return results;
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const defaultScreen = requireIntOpt(opts['default-screen'], '--default-screen');
      const viewScreen = asNonNegativeInt(opts['view-screen'], '--view-screen');
      const editScreen = asNonNegativeInt(opts['edit-screen'], '--edit-screen');
      const createScreen = asNonNegativeInt(opts['create-screen'], '--create-screen');
      const description = asString(opts['description']);
      return client.screenScheme.create({
        name,
        ...(description !== undefined && { description }),
        screens: {
          default: defaultScreen,
          ...(viewScreen !== undefined && { view: viewScreen }),
          ...(editScreen !== undefined && { edit: editScreen }),
          ...(createScreen !== undefined && { create: createScreen }),
        },
      });
    }
    case 'update': {
      const screenSchemeId = requireArg(cmd.positionalArgs[0], 'screenSchemeId');
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      const defaultScreen = asNonNegativeInt(opts['default-screen'], '--default-screen');
      const viewScreen = asNonNegativeInt(opts['view-screen'], '--view-screen');
      const editScreen = asNonNegativeInt(opts['edit-screen'], '--edit-screen');
      const createScreen = asNonNegativeInt(opts['create-screen'], '--create-screen');
      const hasScreens =
        defaultScreen !== undefined ||
        viewScreen !== undefined ||
        editScreen !== undefined ||
        createScreen !== undefined;
      if (name === undefined && description === undefined && !hasScreens) {
        throw new Error(
          'update requires at least one of: --name, --description, --default-screen, --view-screen, --edit-screen, --create-screen',
        );
      }
      // Spec: UpdateScreenTypes uses string IDs (not integers like create).
      // --default-screen is optional on update; a partial screens object is valid.
      // Note: null removal (to disassociate a screen) is not yet supported here.
      let screens: { default?: string; view?: string; edit?: string; create?: string } | undefined;
      if (hasScreens) {
        screens = {
          ...(defaultScreen !== undefined && { default: String(defaultScreen) }),
          ...(viewScreen !== undefined && { view: String(viewScreen) }),
          ...(editScreen !== undefined && { edit: String(editScreen) }),
          ...(createScreen !== undefined && { create: String(createScreen) }),
        };
      }
      await client.screenScheme.update(screenSchemeId, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(screens !== undefined && { screens }),
      });
      return { updated: true };
    }
    case 'delete': {
      const screenSchemeId = requireArg(cmd.positionalArgs[0], 'screenSchemeId');
      await client.screenScheme.delete(screenSchemeId);
      return { deleted: true };
    }
    default:
      throw new Error(
        `Unknown screenscheme action: ${cmd.action}. Actions: ${SCREENSCHEME_ACTIONS.join(', ')}`,
      );
  }
}

function asScreenSchemeOrderBy(
  value: string | boolean | undefined,
): 'name' | '-name' | '+name' | 'id' | '-id' | '+id' | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  if (s === 'name' || s === '-name' || s === '+name' || s === 'id' || s === '-id' || s === '+id') {
    return s;
  }
  throw new Error(`--order-by must be one of: name, -name, +name, id, -id, +id. Got: ${s}`);
}

function requireIntOpt(value: string | boolean | undefined, name: string): number {
  const s = asString(value);
  if (s === undefined) throw new Error(`${name} is required`);
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${name} must be a non-negative integer, got: ${s}`);
  }
  return n;
}

// ─── Plans (B625-B640) ─────────────────────────────────────────────────────

const PLANS_ACTIONS = [
  'list',
  'create',
  'get',
  'update',
  'archive',
  'duplicate',
  'list-teams',
  'add-atlassian-team',
  'delete-atlassian-team',
  'get-atlassian-team',
  'update-atlassian-team',
  'create-plan-only-team',
  'delete-plan-only-team',
  'get-plan-only-team',
  'update-plan-only-team',
  'trash',
] as const;

const PLANNING_STYLES: readonly PlanningStyle[] = ['Scrum', 'Kanban'];

function asEnumPlans<T extends string>(
  value: string | boolean | undefined,
  allowed: readonly T[],
  flagName: string,
): T | undefined {
  if (typeof value !== 'string') return undefined;
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`--${flagName} must be one of: ${allowed.join(', ')}, got: ${value}`);
  }
  return value as T;
}

function asFiniteNumber(value: string | boolean | undefined, name: string): number | undefined {
  if (typeof value !== 'string') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a finite number, got: ${value}`);
  return n;
}

async function executePlans(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      return client.plans.list({
        cursor: asString(opts['cursor']),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(opts['include-trashed'] !== undefined && {
          includeTrashed: opts['include-trashed'] === true,
        }),
        ...(opts['include-archived'] !== undefined && {
          includeArchived: opts['include-archived'] === true,
        }),
      });
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const issueSourcesRaw = requireOpt(opts['issue-sources'], '--issue-sources');
      const issueSourcesParsed = parseJsonArrayFlag(issueSourcesRaw, '--issue-sources') as {
        type: IssueSourceType;
        value: number;
      }[];
      const schedulingRaw = requireOpt(opts['scheduling'], '--scheduling');
      const scheduling = parseJsonObjectFlag(
        schedulingRaw,
        '--scheduling',
      ) as unknown as CreatePlanData['scheduling'];
      const createBody: Record<string, unknown> = {
        name,
        issueSources: issueSourcesParsed,
        scheduling,
      };
      const crossProjectReleasesRaw = asString(opts['cross-project-releases']);
      if (crossProjectReleasesRaw !== undefined) {
        createBody['crossProjectReleases'] = parseJsonArrayFlag(
          crossProjectReleasesRaw,
          '--cross-project-releases',
        );
      }
      const customFieldsRaw = asString(opts['custom-fields']);
      if (customFieldsRaw !== undefined) {
        createBody['customFields'] = parseJsonArrayFlag(customFieldsRaw, '--custom-fields');
      }
      const exclusionRulesRaw = asString(opts['exclusion-rules']);
      if (exclusionRulesRaw !== undefined) {
        createBody['exclusionRules'] = parseJsonObjectFlag(exclusionRulesRaw, '--exclusion-rules');
      }
      const leadAccountId = asString(opts['lead-account-id']);
      if (leadAccountId !== undefined) createBody['leadAccountId'] = leadAccountId;
      const permissionsRaw = asString(opts['plan-permissions']);
      if (permissionsRaw !== undefined) {
        createBody['permissions'] = parseJsonArrayFlag(permissionsRaw, '--plan-permissions');
      }
      const useGroupId =
        opts['use-group-id'] !== undefined ? (opts['use-group-id'] as boolean) : undefined;
      return client.plans.create(createBody as unknown as CreatePlanData, useGroupId);
    }
    case 'get': {
      const planId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'planId'), 'planId');
      const useGroupId =
        opts['use-group-id'] !== undefined ? (opts['use-group-id'] as boolean) : undefined;
      return client.plans.get(planId, { ...(useGroupId !== undefined && { useGroupId }) });
    }
    case 'update': {
      const planId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'planId'), 'planId');
      const raw = requireOpt(opts['body'], '--body');
      const patch = parseJsonObjectFlag(raw, '--body');
      const useGroupId =
        opts['use-group-id'] !== undefined ? (opts['use-group-id'] as boolean) : undefined;
      await client.plans.update(planId, patch, useGroupId);
      return { updated: true };
    }
    case 'archive': {
      const planId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'planId'), 'planId');
      await client.plans.archive(planId);
      return { archived: true };
    }
    case 'duplicate': {
      const planId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'planId'), 'planId');
      const name = requireOpt(opts['name'], '--name');
      return client.plans.duplicate(planId, { name });
    }
    case 'list-teams': {
      const planId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'planId'), 'planId');
      return client.plans.listTeams(planId, {
        cursor: asString(opts['cursor']),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'add-atlassian-team': {
      const planId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'planId'), 'planId');
      const id = requireOpt(opts['atlassian-team-id'], '--atlassian-team-id');
      const planningStyle = asEnumPlans(opts['planning-style'], PLANNING_STYLES, 'planning-style');
      if (planningStyle === undefined) {
        throw new Error('add-atlassian-team requires --planning-style (Scrum or Kanban)');
      }
      const addTeamBody: Record<string, unknown> = { id, planningStyle };
      const capacity = asFiniteNumber(opts['capacity'], '--capacity');
      if (capacity !== undefined) addTeamBody['capacity'] = capacity;
      const issueSourceId = asPositiveInt(opts['issue-source-id'], '--issue-source-id');
      if (issueSourceId !== undefined) addTeamBody['issueSourceId'] = issueSourceId;
      const sprintLength = asPositiveInt(opts['sprint-length'], '--sprint-length');
      if (sprintLength !== undefined) addTeamBody['sprintLength'] = sprintLength;
      await client.plans.addAtlassianTeam(planId, addTeamBody as unknown as AddAtlassianTeamData);
      return { added: true };
    }
    case 'delete-atlassian-team': {
      const planId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'planId'), 'planId');
      const atlassianTeamId = requireArg(cmd.positionalArgs[1], 'atlassianTeamId');
      await client.plans.deleteAtlassianTeam(planId, atlassianTeamId);
      return { deleted: true };
    }
    case 'get-atlassian-team': {
      const planId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'planId'), 'planId');
      const atlassianTeamId = requireArg(cmd.positionalArgs[1], 'atlassianTeamId');
      return client.plans.getAtlassianTeam(planId, atlassianTeamId);
    }
    case 'update-atlassian-team': {
      const planId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'planId'), 'planId');
      const atlassianTeamId = requireArg(cmd.positionalArgs[1], 'atlassianTeamId');
      const raw = requireOpt(opts['body'], '--body');
      const patch = parseJsonObjectFlag(raw, '--body');
      await client.plans.updateAtlassianTeam(planId, atlassianTeamId, patch);
      return { updated: true };
    }
    case 'create-plan-only-team': {
      const planId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'planId'), 'planId');
      const name = requireOpt(opts['name'], '--name');
      const planningStyle = asEnumPlans(opts['planning-style'], PLANNING_STYLES, 'planning-style');
      if (planningStyle === undefined) {
        throw new Error('create-plan-only-team requires --planning-style (Scrum or Kanban)');
      }
      const planOnlyBody: Record<string, unknown> = { name, planningStyle };
      const capacity = asFiniteNumber(opts['capacity'], '--capacity');
      if (capacity !== undefined) planOnlyBody['capacity'] = capacity;
      const issueSourceId = asPositiveInt(opts['issue-source-id'], '--issue-source-id');
      if (issueSourceId !== undefined) planOnlyBody['issueSourceId'] = issueSourceId;
      const memberAccountIds = parseCsv(opts['member-account-ids']);
      if (memberAccountIds !== undefined) planOnlyBody['memberAccountIds'] = memberAccountIds;
      const sprintLength = asPositiveInt(opts['sprint-length'], '--sprint-length');
      if (sprintLength !== undefined) planOnlyBody['sprintLength'] = sprintLength;
      return client.plans.createPlanOnlyTeam(
        planId,
        planOnlyBody as unknown as CreatePlanOnlyTeamData,
      );
    }
    case 'delete-plan-only-team': {
      const planId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'planId'), 'planId');
      const planOnlyTeamId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[1], 'planOnlyTeamId'),
        'planOnlyTeamId',
      );
      await client.plans.deletePlanOnlyTeam(planId, planOnlyTeamId);
      return { deleted: true };
    }
    case 'get-plan-only-team': {
      const planId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'planId'), 'planId');
      const planOnlyTeamId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[1], 'planOnlyTeamId'),
        'planOnlyTeamId',
      );
      return client.plans.getPlanOnlyTeam(planId, planOnlyTeamId);
    }
    case 'update-plan-only-team': {
      const planId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'planId'), 'planId');
      const planOnlyTeamId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[1], 'planOnlyTeamId'),
        'planOnlyTeamId',
      );
      const raw = requireOpt(opts['body'], '--body');
      const patch = parseJsonObjectFlag(raw, '--body');
      await client.plans.updatePlanOnlyTeam(planId, planOnlyTeamId, patch);
      return { updated: true };
    }
    case 'trash': {
      const planId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'planId'), 'planId');
      await client.plans.trash(planId);
      return { trashed: true };
    }
    default:
      throw new Error(`Unknown plans action: ${cmd.action}. Actions: ${PLANS_ACTIONS.join(', ')}`);
  }
}

// ─── workflows (B837-B840, B841-B845, B846-B850, B935-B938) ──────────────────

const WORKFLOWS_ACTIONS = [
  'list',
  'get',
  'delete',
  'issue-type-usages',
  'project-usages',
  'workflow-scheme-usages',
  'bulk-get',
  'capabilities',
  'bulk-create',
  'validate-create',
  'default-editor',
  'read-history',
  'list-history',
  'get-rule-config',
  'update-rule-config',
  'delete-rule-config',
  'delete-transition-property',
  'get-transition-properties',
  'create-transition-property',
  'update-transition-property',
  'preview',
  'search',
  'update',
  'validate-update',
];

async function executeWorkflows(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    // B934 (already-covered by existing list()): GET /rest/api/3/workflow/search
    case 'list':
      return client.workflows.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        expand: asString(opts['expand']),
        queryString: asString(opts['query-string']),
        orderBy: asString(opts['order-by']),
        isActive: asBoolFlag(opts['is-active']),
      });

    // Existing get() – not a new endpoint, kept for CLI completeness
    case 'get': {
      const workflowName = requireArg(cmd.positionalArgs[0], 'workflowName');
      return client.workflows.get(workflowName);
    }

    // B837: DELETE /rest/api/3/workflow/{entityId}
    case 'delete': {
      const entityId = requireArg(cmd.positionalArgs[0], 'entityId');
      await client.workflows.deleteWorkflow(entityId);
      return { deleted: true };
    }

    // B838: GET /rest/api/3/workflow/{workflowId}/project/{projectId}/issueTypeUsages
    case 'issue-type-usages': {
      const workflowId = requireArg(cmd.positionalArgs[0], 'workflowId');
      const projectId = requireArg(cmd.positionalArgs[1], 'projectId');
      return client.workflows.getIssueTypeUsages(workflowId, projectId, {
        nextPageToken: asString(opts['next-page-token']),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }

    // B839: GET /rest/api/3/workflow/{workflowId}/projectUsages
    case 'project-usages': {
      const workflowId = requireArg(cmd.positionalArgs[0], 'workflowId');
      return client.workflows.getProjectUsages(workflowId, {
        nextPageToken: asString(opts['next-page-token']),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }

    // B840: GET /rest/api/3/workflow/{workflowId}/workflowSchemes
    case 'workflow-scheme-usages': {
      const workflowId = requireArg(cmd.positionalArgs[0], 'workflowId');
      return client.workflows.getWorkflowSchemeUsages(workflowId, {
        nextPageToken: asString(opts['next-page-token']),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }

    // B846: POST /rest/api/3/workflows
    case 'bulk-get': {
      const bodyRaw = requireOpt(opts['body'], '--body');
      return client.workflows.bulkGet(
        parseJsonObjectFlag(bodyRaw, '--body') as Parameters<typeof client.workflows.bulkGet>[0],
      );
    }

    // B847: GET /rest/api/3/workflows/capabilities
    case 'capabilities':
      return client.workflows.getCapabilities({
        workflowId: asString(opts['workflow-id']),
        projectId: asString(opts['project-id']),
        issueTypeId: asString(opts['issue-type-id']),
      });

    // B848: POST /rest/api/3/workflows/create
    case 'bulk-create': {
      const bodyRaw = requireOpt(opts['body'], '--body');
      return client.workflows.bulkCreate(
        parseJsonObjectFlag(bodyRaw, '--body') as Parameters<typeof client.workflows.bulkCreate>[0],
      );
    }

    // B849: POST /rest/api/3/workflows/create/validation
    case 'validate-create': {
      const bodyRaw = requireOpt(opts['body'], '--body');
      return client.workflows.validateCreate(
        parseJsonObjectFlag(bodyRaw, '--body') as unknown as Parameters<
          typeof client.workflows.validateCreate
        >[0],
      );
    }

    // B850: GET /rest/api/3/workflows/defaultEditor
    case 'default-editor':
      return client.workflows.getDefaultEditor();

    // B841: POST /rest/api/3/workflow/history
    case 'read-history': {
      const workflowId = requireOpt(opts['workflow-id'], '--workflow-id');
      const versionNumber = asPositiveInt(opts['version-number'], '--version-number');
      return client.workflows.readWorkflowFromHistory({
        workflowId,
        ...(versionNumber !== undefined && { version: versionNumber }),
      });
    }

    // B842: POST /rest/api/3/workflow/history/list
    case 'list-history': {
      const workflowId = requireOpt(opts['workflow-id'], '--workflow-id');
      return client.workflows.listWorkflowHistory(
        { workflowId },
        { expand: asString(opts['expand']) },
      );
    }

    // B843: GET /rest/api/3/workflow/rule/config
    case 'get-rule-config': {
      const typesRaw = requireOpt(opts['types'], '--types');
      const types = typesRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean) as ('postfunction' | 'condition' | 'validator')[];
      const keysRaw = asString(opts['keys']);
      const workflowNamesRaw = asString(opts['workflow-names']);
      const withTagsRaw = asString(opts['with-tags']);
      return client.workflows.getTransitionRuleConfigs({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        types,
        keys: keysRaw ? keysRaw.split(',').map((k) => k.trim()) : undefined,
        workflowNames: workflowNamesRaw
          ? workflowNamesRaw.split(',').map((n) => n.trim())
          : undefined,
        withTags: withTagsRaw ? withTagsRaw.split(',').map((t) => t.trim()) : undefined,
        draft: asBoolFlag(opts['draft']),
        expand: asString(opts['expand']),
      });
    }

    // B844: PUT /rest/api/3/workflow/rule/config
    case 'update-rule-config': {
      const workflowsRaw = requireOpt(opts['workflows'], '--workflows');
      const workflows = parseJsonArrayFlag(
        workflowsRaw,
        '--workflows',
      ) as WorkflowTransitionRulesUpdateEntry[];
      return client.workflows.updateTransitionRuleConfigs({ workflows });
    }

    // B845: PUT /rest/api/3/workflow/rule/config/delete
    case 'delete-rule-config': {
      const workflowsRaw = requireOpt(opts['workflows'], '--workflows');
      const workflows = parseJsonArrayFlag(
        workflowsRaw,
        '--workflows',
      ) as WorkflowTransitionRulesDeleteEntry[];
      return client.workflows.deleteTransitionRuleConfigs({ workflows });
    }

    // B935: DELETE /rest/api/3/workflow/transitions/{transitionId}/properties
    case 'delete-transition-property': {
      const transitionId = requirePositiveInt(cmd.positionalArgs[0], 'transitionId');
      const key = requireOpt(opts['key'], '--key');
      const workflowName = requireOpt(opts['workflow-name'], '--workflow-name');
      const workflowMode = asWorkflowMode(opts['workflow-mode']);
      await client.workflows.deleteTransitionProperty(
        transitionId,
        key,
        workflowName,
        workflowMode,
      );
      return { deleted: true };
    }

    // B936: GET /rest/api/3/workflow/transitions/{transitionId}/properties
    case 'get-transition-properties': {
      const transitionId = requirePositiveInt(cmd.positionalArgs[0], 'transitionId');
      const workflowName = requireOpt(opts['workflow-name'], '--workflow-name');
      return client.workflows.getTransitionProperties(transitionId, workflowName, {
        includeReservedKeys:
          opts['include-reserved-keys'] !== undefined
            ? Boolean(opts['include-reserved-keys'])
            : undefined,
        key: asString(opts['key']),
        workflowMode: asWorkflowMode(opts['workflow-mode']),
      });
    }

    // B937: POST /rest/api/3/workflow/transitions/{transitionId}/properties
    case 'create-transition-property': {
      const transitionId = requirePositiveInt(cmd.positionalArgs[0], 'transitionId');
      const key = requireOpt(opts['key'], '--key');
      const workflowName = requireOpt(opts['workflow-name'], '--workflow-name');
      const value = requireOpt(opts['value'], '--value');
      const workflowMode = asWorkflowMode(opts['workflow-mode']);
      return client.workflows.createTransitionProperty(
        transitionId,
        key,
        workflowName,
        value,
        workflowMode,
      );
    }

    // B938: PUT /rest/api/3/workflow/transitions/{transitionId}/properties
    case 'update-transition-property': {
      const transitionId = requirePositiveInt(cmd.positionalArgs[0], 'transitionId');
      const key = requireOpt(opts['key'], '--key');
      const workflowName = requireOpt(opts['workflow-name'], '--workflow-name');
      const value = requireOpt(opts['value'], '--value');
      const workflowMode = asWorkflowMode(opts['workflow-mode']);
      return client.workflows.updateTransitionProperty(
        transitionId,
        key,
        workflowName,
        value,
        workflowMode,
      );
    }

    // B851: POST /rest/api/3/workflows/preview
    case 'preview':
      return client.workflows.previewWorkflows(
        parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body') as unknown as Parameters<
          typeof client.workflows.previewWorkflows
        >[0],
      );

    // B852: GET /rest/api/3/workflows/search
    case 'search':
      return client.workflows.searchWorkflows({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        expand: asString(opts['expand']),
        queryString: asString(opts['query-string']),
        orderBy: asString(opts['order-by']),
        scope: asString(opts['scope']),
        isActive: asBoolFlag(opts['is-active']),
      });

    // B853: POST /rest/api/3/workflows/update
    case 'update':
      return client.workflows.updateWorkflows(
        parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body') as Parameters<
          typeof client.workflows.updateWorkflows
        >[0],
      );

    // B854: POST /rest/api/3/workflows/update/validation
    case 'validate-update':
      return client.workflows.validateWorkflowUpdate(
        parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body') as unknown as Parameters<
          typeof client.workflows.validateWorkflowUpdate
        >[0],
      );

    default:
      throw new Error(
        `Unknown workflows action: ${cmd.action}. Actions: ${WORKFLOWS_ACTIONS.join(', ')}`,
      );
  }
}

// ─── workflowscheme (B855-B889) ────────────────────────────────────────────

const WORKFLOWSCHEME_ACTIONS = [
  'list',
  'create',
  'delete',
  'get',
  'update',
  'delete-default',
  'get-default',
  'set-default',
  'delete-issuetype',
  'get-issuetype',
  'set-issuetype',
  'delete-workflow',
  'get-workflow',
  'set-workflow',
  'project-usages',
  'list-by-project',
  'assign-project',
  'switch-project',
  'create-draft',
  'delete-draft',
  'get-draft',
  'update-draft',
  'delete-draft-default',
  'get-draft-default',
  'set-draft-default',
  'delete-draft-issuetype',
  'get-draft-issuetype',
  'set-draft-issuetype',
  'publish-draft',
  'delete-draft-workflow',
  'get-draft-workflow',
  'set-draft-workflow',
  'bulk-read',
  'bulk-update',
  'bulk-mappings',
] as const;

async function drainWorkflowSchemes(iter: AsyncGenerator<unknown>): Promise<unknown[]> {
  const out: unknown[] = [];
  for await (const item of iter) out.push(item);
  return out;
}

async function executeWorkflowScheme(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      if (opts['all'] === true) {
        return drainWorkflowSchemes(
          client.workflowScheme.listAll({
            ...(maxResults !== undefined && { maxResults }),
          }),
        );
      }
      return client.workflowScheme.list({
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
      });
    }
    case 'create': {
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.workflowScheme.create(
        body as unknown as Parameters<typeof client.workflowScheme.create>[0],
      );
    }
    case 'delete': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      await client.workflowScheme.delete(id);
      return { deleted: true };
    }
    case 'get': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const returnDraftIfExists = asBoolFlag(opts['return-draft-if-exists']);
      return client.workflowScheme.get(id, {
        ...(returnDraftIfExists !== undefined && { returnDraftIfExists }),
      });
    }
    case 'update': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.workflowScheme.update(
        id,
        body as Parameters<typeof client.workflowScheme.update>[1],
      );
    }
    case 'delete-default': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const updateDraftIfNeeded = asBoolFlag(opts['update-draft-if-needed']);
      return client.workflowScheme.deleteDefault(id, {
        ...(updateDraftIfNeeded !== undefined && { updateDraftIfNeeded }),
      });
    }
    case 'get-default': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const returnDraftIfExists = asBoolFlag(opts['return-draft-if-exists']);
      return client.workflowScheme.getDefault(id, {
        ...(returnDraftIfExists !== undefined && { returnDraftIfExists }),
      });
    }
    case 'set-default': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.workflowScheme.setDefault(
        id,
        body as unknown as Parameters<typeof client.workflowScheme.setDefault>[1],
      );
    }
    case 'delete-issuetype': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const issueType = requireArg(cmd.positionalArgs[1], 'issueType');
      const updateDraftIfNeeded = asBoolFlag(opts['update-draft-if-needed']);
      return client.workflowScheme.deleteIssueTypeMapping(id, issueType, {
        ...(updateDraftIfNeeded !== undefined && { updateDraftIfNeeded }),
      });
    }
    case 'get-issuetype': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const issueType = requireArg(cmd.positionalArgs[1], 'issueType');
      const returnDraftIfExists = asBoolFlag(opts['return-draft-if-exists']);
      return client.workflowScheme.getIssueTypeMapping(id, issueType, {
        ...(returnDraftIfExists !== undefined && { returnDraftIfExists }),
      });
    }
    case 'set-issuetype': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const issueType = requireArg(cmd.positionalArgs[1], 'issueType');
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.workflowScheme.setIssueTypeMapping(
        id,
        issueType,
        body as Parameters<typeof client.workflowScheme.setIssueTypeMapping>[2],
      );
    }
    case 'delete-workflow': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const workflowName = requireOpt(opts['workflow-name'], '--workflow-name');
      const updateDraftIfNeeded = asBoolFlag(opts['update-draft-if-needed']);
      await client.workflowScheme.deleteWorkflowMapping(id, {
        workflowName,
        ...(updateDraftIfNeeded !== undefined && { updateDraftIfNeeded }),
      });
      return { deleted: true };
    }
    case 'get-workflow': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const workflowName = asString(opts['workflow-name']);
      const returnDraftIfExists = asBoolFlag(opts['return-draft-if-exists']);
      return client.workflowScheme.getWorkflowMapping(id, {
        ...(workflowName !== undefined && { workflowName }),
        ...(returnDraftIfExists !== undefined && { returnDraftIfExists }),
      });
    }
    case 'set-workflow': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const workflowName = requireOpt(opts['workflow-name'], '--workflow-name');
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.workflowScheme.setWorkflowMapping(
        id,
        workflowName,
        body as Parameters<typeof client.workflowScheme.setWorkflowMapping>[2],
      );
    }
    case 'project-usages': {
      const schemeId = requireArg(cmd.positionalArgs[0], 'workflowSchemeId');
      const nextPageToken = asString(opts['next-page-token']);
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      return client.workflowScheme.getProjectUsages(schemeId, {
        ...(nextPageToken !== undefined && { nextPageToken }),
        ...(maxResults !== undefined && { maxResults }),
      });
    }
    case 'list-by-project': {
      const projectIds = parseCsv(opts['project-id']);
      if (projectIds === undefined || projectIds.length === 0) {
        throw new Error('Missing required option: --project-id');
      }
      return client.workflowScheme.getProjectAssociations({ projectId: projectIds });
    }
    case 'assign-project': {
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      await client.workflowScheme.assignToProject(
        body as unknown as Parameters<typeof client.workflowScheme.assignToProject>[0],
      );
      return { updated: true };
    }
    case 'switch-project': {
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.workflowScheme.switchProject(
        body as Parameters<typeof client.workflowScheme.switchProject>[0],
      );
    }
    case 'create-draft': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      return client.workflowScheme.createDraft(id);
    }
    case 'delete-draft': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      await client.workflowScheme.deleteDraft(id);
      return { deleted: true };
    }
    case 'get-draft': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      return client.workflowScheme.getDraft(id);
    }
    case 'update-draft': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.workflowScheme.updateDraft(
        id,
        body as Parameters<typeof client.workflowScheme.updateDraft>[1],
      );
    }
    case 'delete-draft-default': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      return client.workflowScheme.deleteDraftDefault(id);
    }
    case 'get-draft-default': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      return client.workflowScheme.getDraftDefault(id);
    }
    case 'set-draft-default': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.workflowScheme.setDraftDefault(
        id,
        body as unknown as Parameters<typeof client.workflowScheme.setDraftDefault>[1],
      );
    }
    case 'delete-draft-issuetype': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const issueType = requireArg(cmd.positionalArgs[1], 'issueType');
      return client.workflowScheme.deleteDraftIssueTypeMapping(id, issueType);
    }
    case 'get-draft-issuetype': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const issueType = requireArg(cmd.positionalArgs[1], 'issueType');
      return client.workflowScheme.getDraftIssueTypeMapping(id, issueType);
    }
    case 'set-draft-issuetype': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const issueType = requireArg(cmd.positionalArgs[1], 'issueType');
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.workflowScheme.setDraftIssueTypeMapping(
        id,
        issueType,
        body as Parameters<typeof client.workflowScheme.setDraftIssueTypeMapping>[2],
      );
    }
    case 'publish-draft': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const validateOnly = asBoolFlag(opts['validate-only']);
      const bodyRaw = asString(opts['body']);
      const data =
        bodyRaw !== undefined
          ? (parseJsonObjectFlag(bodyRaw, '--body') as Parameters<
              typeof client.workflowScheme.publishDraft
            >[1])
          : undefined;
      return client.workflowScheme.publishDraft(id, data, {
        ...(validateOnly !== undefined && { validateOnly }),
      });
    }
    case 'delete-draft-workflow': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const workflowName = requireOpt(opts['workflow-name'], '--workflow-name');
      await client.workflowScheme.deleteDraftWorkflowMapping(id, { workflowName });
      return { deleted: true };
    }
    case 'get-draft-workflow': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const workflowName = asString(opts['workflow-name']);
      return client.workflowScheme.getDraftWorkflowMapping(id, {
        ...(workflowName !== undefined && { workflowName }),
      });
    }
    case 'set-draft-workflow': {
      const id = requireArg(cmd.positionalArgs[0], 'id');
      const workflowName = requireOpt(opts['workflow-name'], '--workflow-name');
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.workflowScheme.setDraftWorkflowMapping(
        id,
        workflowName,
        body as Parameters<typeof client.workflowScheme.setDraftWorkflowMapping>[2],
      );
    }
    case 'bulk-read': {
      const bodyRaw = asString(opts['body']);
      const data =
        bodyRaw !== undefined
          ? (parseJsonObjectFlag(bodyRaw, '--body') as Parameters<
              typeof client.workflowScheme.bulkRead
            >[0])
          : undefined;
      return client.workflowScheme.bulkRead(data);
    }
    case 'bulk-update': {
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.workflowScheme.bulkUpdate(
        body as unknown as Parameters<typeof client.workflowScheme.bulkUpdate>[0],
      );
    }
    case 'bulk-mappings': {
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.workflowScheme.bulkRequiredMappings(
        body as unknown as Parameters<typeof client.workflowScheme.bulkRequiredMappings>[0],
      );
    }
    default:
      throw new Error(
        `Unknown workflowscheme action: ${cmd.action}. Actions: ${WORKFLOWSCHEME_ACTIONS.join(', ')}`,
      );
  }
}

const FIELDS_ACTIONS = [
  'field-list',
  'field-list-all',
  'field-create',
  'field-update',
  'field-delete',
  'context-list',
  'context-create',
  'context-update',
  'context-delete',
  'context-option-list',
  'context-option-create',
  'context-option-update',
  'context-option-delete',
  'context-option-replace-issues',
  'context-option-move',
  'context-issuetype-set',
  'context-issuetype-remove',
  'context-issuetype-mapping',
  'context-default-list',
  'context-default-set',
  'context-project-set',
  'context-project-remove',
  'context-mapping',
  'context-project-mapping',
  'field-option-list',
  'field-option-create',
  'field-option-delete',
  'field-option-get',
  'field-option-update',
  'field-option-replace-issues',
  'field-option-suggestions-edit',
  'field-option-suggestions-search',
  'field-project-associations',
  'field-screens',
  'field-restore',
  'field-trash',
  'field-remove-associations',
  'field-create-associations',
  'field-trash-list',
] as const;

async function executeFields(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'field-list': {
      // B446: GET /rest/api/3/field/search
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      const typeRaw = asString(opts['type']);
      const type =
        typeRaw !== undefined
          ? typeRaw.split(',').map((s) => {
              const t = s.trim();
              if (t !== 'custom' && t !== 'system') {
                throw new Error(`--type must contain only 'custom' or 'system', got: ${t}`);
              }
              return t;
            })
          : undefined;
      const idRaw = asString(opts['id']);
      const id = idRaw !== undefined ? idRaw.split(',').map((s) => s.trim()) : undefined;
      const query = asString(opts['query']);
      const orderBy = asString(opts['order-by']);
      const expand = asString(opts['expand']);
      const projectIds = parseIntCsv(opts['project-ids'], '--project-ids');
      return client.fields.list({
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
        ...(type !== undefined && { type }),
        ...(id !== undefined && { id }),
        ...(query !== undefined && { query }),
        ...(orderBy !== undefined && { orderBy }),
        ...(expand !== undefined && { expand }),
        ...(projectIds !== undefined && { projectIds }),
      });
    }
    case 'field-list-all':
      return client.fields.listAll();
    case 'field-create': {
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.fields.create(body as unknown as Parameters<typeof client.fields.create>[0]);
    }
    case 'field-update': {
      const fieldId = requireArg(cmd.positionalArgs[0], 'fieldId');
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.fields.update(fieldId, body as Parameters<typeof client.fields.update>[1]);
    }
    case 'field-delete': {
      const fieldId = requireArg(cmd.positionalArgs[0], 'fieldId');
      await client.fields.delete(fieldId);
      return { deleted: true };
    }
    case 'context-list': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      const isAnyIssueType = asBoolFlag(opts['is-any-issue-type']);
      const isGlobalContext = asBoolFlag(opts['is-global-context']);
      const contextIdRaw = asString(opts['context-id']);
      const contextId = contextIdRaw
        ? contextIdRaw.split(',').map((s) => Number(s.trim()))
        : undefined;
      return client.fields.listContexts(fieldId, {
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
        ...(isAnyIssueType !== undefined && { isAnyIssueType }),
        ...(isGlobalContext !== undefined && { isGlobalContext }),
        ...(contextId !== undefined && { contextId }),
      });
    }
    case 'context-create': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const name = requireOpt(opts['name'], '--name');
      const description = asString(opts['description']);
      const projectIdsRaw = asString(opts['project-ids']);
      const issueTypeIdsRaw = asString(opts['issue-type-ids']);
      const data: CreateFieldContextData = {
        name,
        ...(description !== undefined && { description }),
        ...(projectIdsRaw !== undefined && {
          projectIds: projectIdsRaw.split(',').map((s) => s.trim()),
        }),
        ...(issueTypeIdsRaw !== undefined && {
          issueTypeIds: issueTypeIdsRaw.split(',').map((s) => s.trim()),
        }),
      };
      return client.fields.createContext(fieldId, data);
    }
    case 'context-update': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const contextIdStr = requireOpt(opts['context-id'], '--context-id');
      const contextId = Number(contextIdStr);
      const name = asString(opts['name']);
      const description = asString(opts['description']);
      const data: UpdateFieldContextData = {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      };
      await client.fields.updateContext(fieldId, contextId, data);
      return { updated: true };
    }
    case 'context-delete': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const contextIdStr = requireOpt(opts['context-id'], '--context-id');
      const contextId = Number(contextIdStr);
      await client.fields.deleteContext(fieldId, contextId);
      return { deleted: true };
    }
    case 'context-option-list': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const contextIdStr = requireOpt(opts['context-id'], '--context-id');
      const contextId = Number(contextIdStr);
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      const optionIdStr = asString(opts['option-id']);
      const optionId = optionIdStr !== undefined ? Number(optionIdStr) : undefined;
      const onlyOptions = asBoolFlag(opts['only-options']);
      return client.fields.listContextOptions(fieldId, contextId, {
        ...(optionId !== undefined && { optionId }),
        ...(onlyOptions !== undefined && { onlyOptions }),
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
      });
    }
    case 'context-option-create': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const contextIdStr = requireOpt(opts['context-id'], '--context-id');
      const contextId = Number(contextIdStr);
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.fields.createContextOptions(
        fieldId,
        contextId,
        body as unknown as BulkCreateFieldContextOptionData,
      );
    }
    case 'context-option-update': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const contextIdStr = requireOpt(opts['context-id'], '--context-id');
      const contextId = Number(contextIdStr);
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.fields.updateContextOptions(
        fieldId,
        contextId,
        body as unknown as BulkUpdateFieldContextOptionData,
      );
    }
    case 'context-option-delete': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const contextIdStr = requireOpt(opts['context-id'], '--context-id');
      const contextId = Number(contextIdStr);
      const optionIdStr = requireOpt(opts['option-id'], '--option-id');
      const optionId = Number(optionIdStr);
      await client.fields.deleteContextOption(fieldId, contextId, optionId);
      return { deleted: true };
    }
    case 'context-option-replace-issues': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const contextIdStr = requireOpt(opts['context-id'], '--context-id');
      const contextId = Number(contextIdStr);
      const optionIdStr = requireOpt(opts['option-id'], '--option-id');
      const optionId = Number(optionIdStr);
      const replaceWithStr = asString(opts['replace-with']);
      const replaceWith = replaceWithStr !== undefined ? Number(replaceWithStr) : undefined;
      const jql = asString(opts['jql']);
      return client.fields.replaceContextOptionOnIssues(fieldId, contextId, optionId, {
        ...(replaceWith !== undefined && { replaceWith }),
        ...(jql !== undefined && { jql }),
      });
    }
    case 'context-option-move': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const contextIdStr = requireOpt(opts['context-id'], '--context-id');
      const contextId = Number(contextIdStr);
      const idsRaw = requireOpt(opts['option-ids'], '--option-ids');
      const customFieldOptionIds = idsRaw.split(',').map((s) => s.trim());
      const positionRaw = asString(opts['position']);
      const position = positionRaw !== undefined ? asMovePosition(positionRaw) : undefined;
      const after = asString(opts['after']);
      const data: OrderFieldContextOptionsData = {
        customFieldOptionIds,
        ...(position !== undefined && { position }),
        ...(after !== undefined && { after }),
      };
      await client.fields.reorderContextOptions(fieldId, contextId, data);
      return { moved: true };
    }
    case 'context-issuetype-set': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const contextIdStr = requireOpt(opts['context-id'], '--context-id');
      const contextId = Number(contextIdStr);
      const issueTypeIdsRaw = requireOpt(opts['issue-type-ids'], '--issue-type-ids');
      const issueTypeIds = issueTypeIdsRaw.split(',').map((s) => s.trim());
      const data: FieldContextIssueTypeIdsBody = { issueTypeIds };
      await client.fields.setContextIssueTypes(fieldId, contextId, data);
      return { updated: true };
    }
    case 'context-issuetype-remove': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const contextIdStr = requireOpt(opts['context-id'], '--context-id');
      const contextId = Number(contextIdStr);
      const issueTypeIdsRaw = requireOpt(opts['issue-type-ids'], '--issue-type-ids');
      const issueTypeIds = issueTypeIdsRaw.split(',').map((s) => s.trim());
      const data: FieldContextIssueTypeIdsBody = { issueTypeIds };
      await client.fields.removeContextIssueTypes(fieldId, contextId, data);
      return { removed: true };
    }
    case 'context-issuetype-mapping': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      const contextIdRaw = asString(opts['context-id']);
      const contextId = contextIdRaw
        ? contextIdRaw.split(',').map((s) => Number(s.trim()))
        : undefined;
      return client.fields.listContextIssueTypeMappings(fieldId, {
        ...(contextId !== undefined && { contextId }),
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
      });
    }
    case 'context-default-list': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      const contextIdRaw = asString(opts['context-id']);
      const contextId = contextIdRaw
        ? contextIdRaw.split(',').map((s) => Number(s.trim()))
        : undefined;
      return client.fields.listContextDefaultValues(fieldId, {
        ...(contextId !== undefined && { contextId }),
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
      });
    }
    case 'context-default-set': {
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const defaultValuesJson = requireOpt(opts['default-values-json'], '--default-values-json');
      const defaultValues = parseJsonArrayFlag(
        defaultValuesJson,
        '--default-values-json',
      ) as FieldContextDefaultValue[];
      await client.fields.setContextDefaultValues(fieldId, { defaultValues });
      return { updated: true };
    }
    case 'context-project-set': {
      // B427: PUT /field/{fieldId}/context/{contextId}/project
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const contextIdStr = requireOpt(opts['context-id'], '--context-id');
      const contextId = Number(contextIdStr);
      const projectIdsRaw = requireOpt(opts['project-ids'], '--project-ids');
      const projectIds = projectIdsRaw.split(',').map((s) => s.trim());
      const data: FieldContextProjectIdsBody = { projectIds };
      await client.fields.setContextProjects(fieldId, contextId, data);
      return { updated: true };
    }
    case 'context-project-remove': {
      // B428: POST /field/{fieldId}/context/{contextId}/project/remove
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const contextIdStr = requireOpt(opts['context-id'], '--context-id');
      const contextId = Number(contextIdStr);
      const projectIdsRaw = requireOpt(opts['project-ids'], '--project-ids');
      const projectIds = projectIdsRaw.split(',').map((s) => s.trim());
      const data: FieldContextProjectIdsBody = { projectIds };
      await client.fields.removeContextProjects(fieldId, contextId, data);
      return { updated: true };
    }
    case 'context-mapping': {
      // B430: POST /field/{fieldId}/context/mapping
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const mappingsJson = requireOpt(opts['mappings-json'], '--mappings-json');
      const mappings = parseJsonArrayFlag(
        mappingsJson,
        '--mappings-json',
      ) as FieldContextMappingBulkBody['mappings'];
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      const data: FieldContextMappingBulkBody = { mappings };
      return client.fields.getContextMappings(fieldId, data, {
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
      });
    }
    case 'context-project-mapping': {
      // B431: GET /field/{fieldId}/context/projectmapping
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      const contextIdRaw = asString(opts['context-id']);
      const contextId = contextIdRaw
        ? contextIdRaw.split(',').map((s) => Number(s.trim()))
        : undefined;
      return client.fields.listContextProjectMappings(fieldId, {
        ...(contextId !== undefined && { contextId }),
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
      });
    }
    case 'field-option-list': {
      // B433: GET /rest/api/3/field/{fieldKey}/option
      const fieldKey = requireOpt(opts['field-key'], '--field-key');
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      return client.fields.listFieldOptions(fieldKey, {
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
      });
    }
    case 'field-option-create': {
      // B434: POST /rest/api/3/field/{fieldKey}/option
      const fieldKey = requireOpt(opts['field-key'], '--field-key');
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.fields.createFieldOption(
        fieldKey,
        body as unknown as CreateIssueFieldOptionData,
      );
    }
    case 'field-option-delete': {
      // B435: DELETE /rest/api/3/field/{fieldKey}/option/{optionId}
      const fieldKey = requireOpt(opts['field-key'], '--field-key');
      const optionId = parsePositiveIntArg(
        requireOpt(opts['option-id'], '--option-id'),
        '--option-id',
      );
      await client.fields.deleteFieldOption(fieldKey, optionId);
      return { deleted: true };
    }
    case 'field-option-get': {
      // B436: GET /rest/api/3/field/{fieldKey}/option/{optionId}
      const fieldKey = requireOpt(opts['field-key'], '--field-key');
      const optionId = parsePositiveIntArg(
        requireOpt(opts['option-id'], '--option-id'),
        '--option-id',
      );
      return client.fields.getFieldOption(fieldKey, optionId);
    }
    case 'field-option-update': {
      // B437: PUT /rest/api/3/field/{fieldKey}/option/{optionId}
      const fieldKey = requireOpt(opts['field-key'], '--field-key');
      const optionId = parsePositiveIntArg(
        requireOpt(opts['option-id'], '--option-id'),
        '--option-id',
      );
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      return client.fields.updateFieldOption(
        fieldKey,
        optionId,
        body as unknown as IssueFieldOption,
      );
    }
    case 'field-option-replace-issues': {
      // B438: DELETE /rest/api/3/field/{fieldKey}/option/{optionId}/issue
      const fieldKey = requireOpt(opts['field-key'], '--field-key');
      const optionId = parsePositiveIntArg(
        requireOpt(opts['option-id'], '--option-id'),
        '--option-id',
      );
      const replaceWith = asPositiveInt(opts['replace-with'], '--replace-with');
      const jql = asString(opts['jql']);
      const overrideScreenSecurity = asBoolFlag(opts['override-screen-security']);
      const overrideEditableFlag = asBoolFlag(opts['override-editable-flag']);
      const params: ReplaceIssueFieldOptionOnIssuesParams = {
        ...(replaceWith !== undefined && { replaceWith }),
        ...(jql !== undefined && { jql }),
        ...(overrideScreenSecurity !== undefined && { overrideScreenSecurity }),
        ...(overrideEditableFlag !== undefined && { overrideEditableFlag }),
      };
      return client.fields.replaceFieldOptionOnIssues(fieldKey, optionId, params);
    }
    case 'field-option-suggestions-edit': {
      // B439: GET /rest/api/3/field/{fieldKey}/option/suggestions/edit
      const fieldKey = requireOpt(opts['field-key'], '--field-key');
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      const projectIdStr = asString(opts['project-id']);
      const projectId =
        projectIdStr !== undefined ? parsePositiveIntArg(projectIdStr, '--project-id') : undefined;
      const params: ListIssueFieldOptionSuggestionsParams = {
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
        ...(projectId !== undefined && { projectId }),
      };
      return client.fields.listFieldOptionSuggestionsEdit(fieldKey, params);
    }
    case 'field-option-suggestions-search': {
      // B440: GET /rest/api/3/field/{fieldKey}/option/suggestions/search
      const fieldKey = requireOpt(opts['field-key'], '--field-key');
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      const projectIdStr = asString(opts['project-id']);
      const projectId =
        projectIdStr !== undefined ? parsePositiveIntArg(projectIdStr, '--project-id') : undefined;
      const params: ListIssueFieldOptionSuggestionsParams = {
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
        ...(projectId !== undefined && { projectId }),
      };
      return client.fields.listFieldOptionSuggestionsSearch(fieldKey, params);
    }
    case 'field-project-associations': {
      // B414: GET /rest/api/3/field/{fieldId}/association/project
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      return client.fields.listFieldProjectAssociations(fieldId, {
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
      });
    }
    case 'field-screens': {
      // B432: GET /rest/api/3/field/{fieldId}/screens
      const fieldId = requireOpt(opts['field-id'], '--field-id');
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      const expand = asString(opts['expand']);
      return client.fields.listFieldScreens(fieldId, {
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
        ...(expand !== undefined && { expand }),
      });
    }
    case 'field-restore': {
      // B442: POST /rest/api/3/field/{id}/restore
      const id = requireOpt(opts['field-id'], '--field-id');
      await client.fields.restoreField(id);
      return { restored: true };
    }
    case 'field-trash': {
      // B443: POST /rest/api/3/field/{id}/trash
      const id = requireOpt(opts['field-id'], '--field-id');
      await client.fields.trashField(id);
      return { trashed: true };
    }
    case 'field-remove-associations': {
      // B444: DELETE /rest/api/3/field/association
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      await client.fields.removeAssociations(body as unknown as FieldAssociationsRequest);
      return { removed: true };
    }
    case 'field-create-associations': {
      // B445: PUT /rest/api/3/field/association
      const body = parseJsonObjectFlag(requireOpt(opts['body'], '--body'), '--body');
      await client.fields.createAssociations(body as unknown as FieldAssociationsRequest);
      return { created: true };
    }
    case 'field-trash-list': {
      // B447: GET /rest/api/3/field/search/trashed
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      const idRaw = asString(opts['id']);
      const id = idRaw !== undefined ? idRaw.split(',').map((s) => s.trim()) : undefined;
      const query = asString(opts['query']);
      const expand = asString(opts['expand']);
      const orderBy = asString(opts['order-by']);
      return client.fields.listTrashedFields({
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
        ...(id !== undefined && { id }),
        ...(query !== undefined && { query }),
        ...(expand !== undefined && { expand }),
        ...(orderBy !== undefined && { orderBy }),
      });
    }
    default:
      throw new Error(
        `Unknown fields action: ${cmd.action}. Actions: ${FIELDS_ACTIONS.join(', ')}`,
      );
  }
}

const JQL_ACTIONS = [
  'autocomplete-data',
  'autocomplete-data-post',
  'autocomplete-suggestions',
  'get-precomputations',
  'update-precomputations',
  'get-precomputations-by-id',
  'match-issues',
  'parse',
  'migrate-queries',
  'sanitize',
] as const;

async function executeJql(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    // B587: GET /jql/autocompletedata
    case 'autocomplete-data': {
      return client.jql.getAutocompleteData();
    }

    // B588: POST /jql/autocompletedata
    case 'autocomplete-data-post': {
      const projectIdsRaw = asString(opts['project-ids']);
      const projectIds = projectIdsRaw
        ? projectIdsRaw.split(',').map((s) => Number(s.trim()))
        : undefined;
      const includeCollapsedFieldsRaw = opts['include-collapsed-fields'];
      const includeCollapsedFields =
        typeof includeCollapsedFieldsRaw === 'boolean' ? includeCollapsedFieldsRaw : undefined;
      return client.jql.getAutocompleteDataPost({
        ...(projectIds !== undefined && { projectIds }),
        ...(includeCollapsedFields !== undefined && { includeCollapsedFields }),
      });
    }

    // B589: GET /jql/autocompletedata/suggestions
    case 'autocomplete-suggestions': {
      const fieldName = requireOpt(opts['field-name'], '--field-name');
      const fieldValue = asString(opts['field-value']);
      const predicateName = asString(opts['predicate-name']);
      const predicateValue = asString(opts['predicate-value']);
      return client.jql.getFieldReferenceSuggestions({
        fieldName,
        ...(fieldValue !== undefined && { fieldValue }),
        ...(predicateName !== undefined && { predicateName }),
        ...(predicateValue !== undefined && { predicateValue }),
      });
    }

    // B590: GET /jql/function/computation
    case 'get-precomputations': {
      const functionKeyRaw = asString(opts['function-key']);
      const functionKey = functionKeyRaw
        ? functionKeyRaw.split(',').map((s) => s.trim())
        : undefined;
      const startAt = asNonNegativeInt(opts['start-at'], '--start-at');
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      const orderBy = asString(opts['order-by']);
      return client.jql.getPrecomputations({
        ...(functionKey !== undefined && { functionKey }),
        ...(startAt !== undefined && { startAt }),
        ...(maxResults !== undefined && { maxResults }),
        ...(orderBy !== undefined && { orderBy }),
      });
    }

    // B591: POST /jql/function/computation
    case 'update-precomputations': {
      const valuesRaw = requireOpt(opts['values'], '--values');
      const values = parseJsonArrayFlag(valuesRaw, '--values') as {
        id: string;
        value?: string;
        error?: string;
      }[];
      const skipNotFoundRaw = opts['skip-not-found'];
      const skipNotFoundPrecomputations =
        typeof skipNotFoundRaw === 'boolean' ? skipNotFoundRaw : undefined;
      return client.jql.updatePrecomputations(
        { values },
        {
          ...(skipNotFoundPrecomputations !== undefined && { skipNotFoundPrecomputations }),
        },
      );
    }

    // B592: POST /jql/function/computation/search
    case 'get-precomputations-by-id': {
      const precomputationIDsRaw = asString(opts['precomputation-ids']);
      const precomputationIDs = precomputationIDsRaw
        ? precomputationIDsRaw.split(',').map((s) => s.trim())
        : undefined;
      const orderBy = asString(opts['order-by']);
      return client.jql.getPrecomputationsById(
        { ...(precomputationIDs !== undefined && { precomputationIDs }) },
        { ...(orderBy !== undefined && { orderBy }) },
      );
    }

    // B593: POST /jql/match
    case 'match-issues': {
      const issueIdsRaw = requireOpt(opts['issue-ids'], '--issue-ids');
      const issueIds = issueIdsRaw.split(',').map((s) => Number(s.trim()));
      const jqlsRaw = requireOpt(opts['jqls'], '--jqls');
      const jqls = parseJsonArrayFlag(jqlsRaw, '--jqls') as string[];
      return client.jql.matchIssues({ issueIds, jqls });
    }

    // B594: POST /jql/parse
    case 'parse': {
      const queriesRaw = requireOpt(opts['queries'], '--queries');
      const queries = parseJsonArrayFlag(queriesRaw, '--queries') as string[];
      const validation = asString(opts['validation']) as 'strict' | 'warn' | 'none' | undefined;
      return client.jql.parse({
        queries,
        ...(validation !== undefined && { validation }),
      });
    }

    // B595: POST /jql/pdcleaner
    case 'migrate-queries': {
      const queryStringsRaw = asString(opts['query-strings']);
      const queryStrings = queryStringsRaw
        ? (parseJsonArrayFlag(queryStringsRaw, '--query-strings') as string[])
        : undefined;
      return client.jql.migrateQueries({
        ...(queryStrings !== undefined && { queryStrings }),
      });
    }

    // B596: POST /jql/sanitize
    case 'sanitize': {
      const queriesRaw = requireOpt(opts['queries'], '--queries');
      const queries = parseJsonArrayFlag(queriesRaw, '--queries') as {
        query: string;
        accountId?: string;
      }[];
      return client.jql.sanitize({ queries });
    }

    default:
      throw new Error(`Unknown jql action: ${cmd.action}. Actions: ${JQL_ACTIONS.join(', ')}`);
  }
}

// ── issuelinktype (B533-B537) ────────────────────────────────────────────────

async function executeIssueLinkType(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.issueLinkType.list();
    case 'get':
      return client.issueLinkType.get(requireArg(cmd.positionalArgs[0], 'issueLinkTypeId'));
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const inward = requireOpt(opts['inward'], '--inward');
      const outward = requireOpt(opts['outward'], '--outward');
      return client.issueLinkType.create({ name, inward, outward });
    }
    case 'update': {
      const id = requireArg(cmd.positionalArgs[0], 'issueLinkTypeId');
      const name = asString(opts['name']);
      const inward = asString(opts['inward']);
      const outward = asString(opts['outward']);
      if (name === undefined && inward === undefined && outward === undefined) {
        throw new Error('update requires at least one of: --name, --inward, --outward');
      }
      return client.issueLinkType.update(id, {
        ...(name !== undefined && { name }),
        ...(inward !== undefined && { inward }),
        ...(outward !== undefined && { outward }),
      });
    }
    case 'delete': {
      const id = requireArg(cmd.positionalArgs[0], 'issueLinkTypeId');
      await client.issueLinkType.delete(id);
      return { deleted: true };
    }
    default:
      throw new Error(
        `Unknown issuelinktype action: ${cmd.action}. Actions: list, get, create, update, delete`,
      );
  }
}

// ─── Project template (B653-B657) ────────────────────────────────────────────

const ACCESS_LEVELS = ['open', 'limited', 'private', 'free'] as const;
const ASSIGNEE_TYPES = ['PROJECT_DEFAULT', 'COMPONENT_LEAD', 'PROJECT_LEAD', 'UNASSIGNED'] as const;
const SAVE_TEMPLATE_TYPES = ['LIVE', 'SNAPSHOT'] as const;

const PROJECT_TEMPLATE_ACTIONS = [
  'create',
  'edit-template',
  'live-template',
  'remove-template',
  'save-template',
] as const;

async function executeProjectTemplate(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    // B653 POST /rest/api/3/project-template
    case 'create': {
      const templateRaw = requireOpt(opts['template'], '--template');
      const template = parseJsonObjectFlag(templateRaw, '--template');

      // Build details from scalar flags (all optional)
      const name = asString(opts['name']);
      const key = asString(opts['key']);
      const description = asString(opts['description']);
      const url = asString(opts['url']);
      const language = asString(opts['language']);
      const leadAccountId = asString(opts['lead-account-id']);
      const accessLevelRaw = asString(opts['access-level']);
      const assigneeTypeRaw = asString(opts['assignee-type']);
      const avatarIdRaw = asString(opts['avatar-id']);
      const categoryIdRaw = asString(opts['category-id']);
      const enableComponents = asBoolFlag(opts['enable-components']);
      const additionalPropertiesRaw = asString(opts['additional-properties']);

      if (
        accessLevelRaw !== undefined &&
        !(ACCESS_LEVELS as readonly string[]).includes(accessLevelRaw)
      ) {
        throw new Error(`--access-level must be one of: ${ACCESS_LEVELS.join(', ')}`);
      }
      if (
        assigneeTypeRaw !== undefined &&
        !(ASSIGNEE_TYPES as readonly string[]).includes(assigneeTypeRaw)
      ) {
        throw new Error(`--assignee-type must be one of: ${ASSIGNEE_TYPES.join(', ')}`);
      }

      const avatarId =
        avatarIdRaw !== undefined ? parsePositiveIntArg(avatarIdRaw, '--avatar-id') : undefined;
      const categoryId =
        categoryIdRaw !== undefined
          ? parsePositiveIntArg(categoryIdRaw, '--category-id')
          : undefined;
      const additionalProperties =
        additionalPropertiesRaw !== undefined
          ? (parseJsonObjectFlag(additionalPropertiesRaw, '--additional-properties') as Record<
              string,
              string
            >)
          : undefined;

      const details = {
        ...(name !== undefined && { name }),
        ...(key !== undefined && { key }),
        ...(description !== undefined && { description }),
        ...(url !== undefined && { url }),
        ...(language !== undefined && { language }),
        ...(leadAccountId !== undefined && { leadAccountId }),
        ...(accessLevelRaw !== undefined && { accessLevel: accessLevelRaw as ProjectAccessLevel }),
        ...(assigneeTypeRaw !== undefined && {
          assigneeType: assigneeTypeRaw as ProjectAssigneeType,
        }),
        ...(avatarId !== undefined && { avatarId }),
        ...(categoryId !== undefined && { categoryId }),
        ...(enableComponents !== undefined && { enableComponents }),
        ...(additionalProperties !== undefined && { additionalProperties }),
      };

      await client.projectTemplate.createWithCustomTemplate({
        details,
        template,
      });
      return { queued: true };
    }

    // B654 PUT /rest/api/3/project-template/edit-template
    case 'edit-template': {
      const templateKey = asString(opts['template-key']);
      const templateName = asString(opts['template-name']);
      const templateDescription = asString(opts['template-description']);
      const enableScreenDelegatedAdmin = asBoolFlag(opts['enable-screen-delegated-admin']);
      const enableWorkflowDelegatedAdmin = asBoolFlag(opts['enable-workflow-delegated-admin']);

      if (
        templateKey === undefined &&
        templateName === undefined &&
        templateDescription === undefined &&
        enableScreenDelegatedAdmin === undefined &&
        enableWorkflowDelegatedAdmin === undefined
      ) {
        throw new Error(
          'edit-template requires at least one of: --template-key, --template-name, --template-description, --enable-screen-delegated-admin, --enable-workflow-delegated-admin',
        );
      }

      const templateGenerationOptions =
        enableScreenDelegatedAdmin !== undefined || enableWorkflowDelegatedAdmin !== undefined
          ? {
              ...(enableScreenDelegatedAdmin !== undefined && {
                enableScreenDelegatedAdminSupport: enableScreenDelegatedAdmin,
              }),
              ...(enableWorkflowDelegatedAdmin !== undefined && {
                enableWorkflowDelegatedAdminSupport: enableWorkflowDelegatedAdmin,
              }),
            }
          : undefined;

      await client.projectTemplate.editTemplate({
        ...(templateKey !== undefined && { templateKey }),
        ...(templateName !== undefined && { templateName }),
        ...(templateDescription !== undefined && { templateDescription }),
        ...(templateGenerationOptions !== undefined && { templateGenerationOptions }),
      });
      return { updated: true };
    }

    // B655 GET /rest/api/3/project-template/live-template
    case 'live-template': {
      const projectId = asString(opts['project-id']);
      const templateKey = asString(opts['template-key']);
      return client.projectTemplate.getLiveTemplate({
        ...(projectId !== undefined && { projectId }),
        ...(templateKey !== undefined && { templateKey }),
      });
    }

    // B656 DELETE /rest/api/3/project-template/remove-template
    case 'remove-template': {
      const templateKey = requireOpt(opts['template-key'], '--template-key');
      await client.projectTemplate.removeTemplate(templateKey);
      return { deleted: true };
    }

    // B657 POST /rest/api/3/project-template/save-template
    case 'save-template': {
      const templateName = asString(opts['template-name']);
      const templateDescription = asString(opts['template-description']);
      const projectIdRaw = asString(opts['project-id']);
      const templateTypeRaw = asString(opts['template-type']);
      const enableScreenDelegatedAdmin = asBoolFlag(opts['enable-screen-delegated-admin']);
      const enableWorkflowDelegatedAdmin = asBoolFlag(opts['enable-workflow-delegated-admin']);

      if (
        templateName === undefined &&
        templateDescription === undefined &&
        projectIdRaw === undefined &&
        templateTypeRaw === undefined &&
        enableScreenDelegatedAdmin === undefined &&
        enableWorkflowDelegatedAdmin === undefined
      ) {
        throw new Error(
          'save-template requires at least one of: --template-name, --template-description, --project-id, --template-type, --enable-screen-delegated-admin, --enable-workflow-delegated-admin',
        );
      }

      if (
        templateTypeRaw !== undefined &&
        !(SAVE_TEMPLATE_TYPES as readonly string[]).includes(templateTypeRaw)
      ) {
        throw new Error(`--template-type must be one of: ${SAVE_TEMPLATE_TYPES.join(', ')}`);
      }

      const projectId =
        projectIdRaw !== undefined ? parsePositiveIntArg(projectIdRaw, '--project-id') : undefined;

      const templateGenerationOptions =
        enableScreenDelegatedAdmin !== undefined || enableWorkflowDelegatedAdmin !== undefined
          ? {
              ...(enableScreenDelegatedAdmin !== undefined && {
                enableScreenDelegatedAdminSupport: enableScreenDelegatedAdmin,
              }),
              ...(enableWorkflowDelegatedAdmin !== undefined && {
                enableWorkflowDelegatedAdminSupport: enableWorkflowDelegatedAdmin,
              }),
            }
          : undefined;

      const templateFromProjectRequest =
        projectId !== undefined ||
        templateTypeRaw !== undefined ||
        templateGenerationOptions !== undefined
          ? {
              ...(projectId !== undefined && { projectId }),
              ...(templateTypeRaw !== undefined && {
                templateType: templateTypeRaw as SaveTemplateType,
              }),
              ...(templateGenerationOptions !== undefined && { templateGenerationOptions }),
            }
          : undefined;

      return client.projectTemplate.saveTemplate({
        ...(templateName !== undefined && { templateName }),
        ...(templateDescription !== undefined && { templateDescription }),
        ...(templateFromProjectRequest !== undefined && { templateFromProjectRequest }),
      });
    }

    default:
      throw new Error(
        `Unknown project-template action: ${cmd.action}. Actions: ${PROJECT_TEMPLATE_ACTIONS.join(', ')}`,
      );
  }
}

// ── worklog (B890-B892) ───────────────────────────────────────────────────────

const WORKLOG_ACTIONS = ['deleted', 'list', 'updated'] as const;

async function executeWorklog(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    // B890: GET /rest/api/3/worklog/deleted
    case 'deleted': {
      const since = asNonNegativeInt(opts['since'], '--since');
      return client.worklog.getDeleted(since);
    }

    // B891: POST /rest/api/3/worklog/list
    case 'list': {
      const idsRaw = requireOpt(opts['ids'], '--ids');
      const ids = splitCsvIds(idsRaw).map((s) => parsePositiveIntArg(s, '--ids'));
      if (ids.length === 0) {
        throw new Error('--ids must contain at least one ID');
      }
      if (ids.length > 1000) {
        throw new Error('--ids cannot exceed 1000 (Atlassian API limit)');
      }
      const expand = asString(opts['expand']);
      return client.worklog.getList(ids, expand);
    }

    // B892: GET /rest/api/3/worklog/updated
    case 'updated': {
      const since = asNonNegativeInt(opts['since'], '--since');
      const expand = asString(opts['expand']);
      return client.worklog.getUpdated({
        ...(since !== undefined && { since }),
        ...(expand !== undefined && { expand }),
      });
    }
    default:
      throw new Error(
        `Unknown worklog action: ${cmd.action}. Actions: ${WORKLOG_ACTIONS.join(', ')}`,
      );
  }
}

// ─── UI Modifications (B787-B790) ─────────────────────────────────────────

const UI_MODIFICATIONS_ACTIONS = ['list', 'list-all', 'create', 'update', 'delete'];

async function executeUiModifications(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      return client.uiModifications.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(opts['expand'] !== undefined && { expand: asString(opts['expand']) }),
      });
    }
    case 'list-all': {
      const results: unknown[] = [];
      for await (const item of client.uiModifications.listAll({
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        ...(opts['expand'] !== undefined && { expand: asString(opts['expand']) }),
      })) {
        results.push(item);
      }
      return results;
    }
    case 'create': {
      const name = requireOpt(opts['name'], '--name');
      const data = asString(opts['data']);
      const description = asString(opts['description']);
      const contextsRaw = asString(opts['contexts']);
      const contexts =
        contextsRaw !== undefined
          ? (JSON.parse(contextsRaw) as Record<string, unknown>[])
          : undefined;
      return client.uiModifications.create({
        name,
        ...(data !== undefined && { data }),
        ...(description !== undefined && { description }),
        ...(contexts !== undefined && { contexts }),
      });
    }
    case 'update': {
      const uiModificationId = requireArg(cmd.positionalArgs[0], 'uiModificationId');
      const name = asString(opts['name']);
      const data = asString(opts['data']);
      const description = asString(opts['description']);
      const contextsRaw = asString(opts['contexts']);
      const contexts =
        contextsRaw !== undefined
          ? (JSON.parse(contextsRaw) as Record<string, unknown>[])
          : undefined;
      if (
        name === undefined &&
        data === undefined &&
        description === undefined &&
        contexts === undefined
      ) {
        throw new Error(
          'update requires at least one of: --name, --data, --description, --contexts',
        );
      }
      await client.uiModifications.update(uiModificationId, {
        ...(name !== undefined && { name }),
        ...(data !== undefined && { data }),
        ...(description !== undefined && { description }),
        ...(contexts !== undefined && { contexts }),
      });
      return { updated: true };
    }
    case 'delete': {
      const uiModificationId = requireArg(cmd.positionalArgs[0], 'uiModificationId');
      await client.uiModifications.delete(uiModificationId);
      return { deleted: true };
    }
    default:
      throw new Error(
        `Unknown ui-modifications action: ${cmd.action}. Actions: ${UI_MODIFICATIONS_ACTIONS.join(', ')}`,
      );
  }
}

// ── permissions (B613-B615) ───────────────────────────────────────────────────

async function executePermissions(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get-all':
      return client.permissions.getAll();

    case 'check': {
      const accountId = asString(opts['account-id']);
      const globalPermissionsRaw = asString(opts['global-permissions']);
      const projectPermissionsRaw = asString(opts['project-permissions']);

      const body: Record<string, unknown> = {};
      if (accountId !== undefined) body['accountId'] = accountId;
      if (globalPermissionsRaw !== undefined)
        body['globalPermissions'] = parseJsonArrayFlag(
          globalPermissionsRaw,
          '--global-permissions',
        ) as string[];
      if (projectPermissionsRaw !== undefined)
        body['projectPermissions'] = parseJsonArrayFlag(
          projectPermissionsRaw,
          '--project-permissions',
        );

      return client.permissions.check(body as Parameters<typeof client.permissions.check>[0]);
    }

    case 'permitted-projects': {
      const permissionsRaw = requireOpt(opts['permissions'], '--permissions');
      const permissions = parseJsonArrayFlag(permissionsRaw, '--permissions') as string[];
      return client.permissions.getPermittedProjects({ permissions });
    }

    default:
      throw new Error(
        `Unknown permissions action: ${cmd.action}. Actions: get-all, check, permitted-projects`,
      );
  }
}

// ── repository (B964-B966) ───────────────────────────────────────────────────

async function executeRepository(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get':
      return client.repository.get(requireArg(cmd.positionalArgs[0], 'repositoryId'));
    case 'delete': {
      const repositoryId = requireArg(cmd.positionalArgs[0], 'repositoryId');
      const updateSequenceIdRaw = asString(opts['update-sequence-id']);
      await client.repository.delete(
        repositoryId,
        updateSequenceIdRaw !== undefined
          ? { updateSequenceId: Number(updateSequenceIdRaw) }
          : undefined,
      );
      return { deleted: true };
    }
    case 'delete-entity': {
      const repositoryId = requireArg(cmd.positionalArgs[0], 'repositoryId');
      const entityType = requireArg(cmd.positionalArgs[1], 'entityType');
      const entityId = requireArg(cmd.positionalArgs[2], 'entityId');
      const updateSequenceIdRaw = asString(opts['update-sequence-id']);
      await client.repository.deleteEntity(
        repositoryId,
        entityType,
        entityId,
        updateSequenceIdRaw !== undefined
          ? { updateSequenceId: Number(updateSequenceIdRaw) }
          : undefined,
      );
      return { deleted: true };
    }
    default:
      throw new Error(
        `Unknown repository action: ${cmd.action}. Actions: get, delete, delete-entity`,
      );
  }
}

// ── issue-link (B530-B532) ───────────────────────────────────────────────────

const ISSUE_LINK_ACTIONS = ['create', 'get', 'delete'] as const;

async function executeIssueLink(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'create': {
      const linkType = requireOpt(opts['link-type'], '--link-type');
      const inwardIssue = requireOpt(opts['inward-issue'], '--inward-issue');
      const outwardIssue = requireOpt(opts['outward-issue'], '--outward-issue');
      await client.issueLink.create({
        type: { name: linkType },
        inwardIssue: { key: inwardIssue },
        outwardIssue: { key: outwardIssue },
      });
      return { created: true };
    }
    case 'get':
      return client.issueLink.get(requireArg(cmd.positionalArgs[0], 'linkId'));
    case 'delete': {
      const id = requireArg(cmd.positionalArgs[0], 'linkId');
      await client.issueLink.delete(id);
      return { deleted: true };
    }
    default:
      throw new Error(
        `Unknown issue-link action: ${cmd.action}. Actions: ${ISSUE_LINK_ACTIONS.join(', ')}`,
      );
  }
}

// ── pipelines (B954, B955, B958, B959, B960) ─────────────────────────────────

const PIPELINES_ACTIONS = [
  'get-build',
  'delete-build',
  'get-deployment',
  'delete-deployment',
  'get-deployment-gating-status',
] as const;

async function executePipelines(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'get-build': {
      const pipelineId = requireArg(cmd.positionalArgs[0], 'pipelineId');
      const buildNumberStr = requireArg(cmd.positionalArgs[1], 'buildNumber');
      const buildNumber = parseIntArg(buildNumberStr, 'buildNumber');
      return client.pipelines.getBuild(pipelineId, buildNumber);
    }
    case 'delete-build': {
      const pipelineId = requireArg(cmd.positionalArgs[0], 'pipelineId');
      const buildNumberStr = requireArg(cmd.positionalArgs[1], 'buildNumber');
      const buildNumber = parseIntArg(buildNumberStr, 'buildNumber');
      await client.pipelines.deleteBuild(pipelineId, buildNumber);
      return { deleted: true };
    }
    case 'get-deployment': {
      const pipelineId = requireArg(cmd.positionalArgs[0], 'pipelineId');
      const environmentId = requireArg(cmd.positionalArgs[1], 'environmentId');
      const dsnStr = requireArg(cmd.positionalArgs[2], 'deploymentSequenceNumber');
      const deploymentSequenceNumber = parseIntArg(dsnStr, 'deploymentSequenceNumber');
      return client.pipelines.getDeployment(pipelineId, environmentId, deploymentSequenceNumber);
    }
    case 'delete-deployment': {
      const pipelineId = requireArg(cmd.positionalArgs[0], 'pipelineId');
      const environmentId = requireArg(cmd.positionalArgs[1], 'environmentId');
      const dsnStr = requireArg(cmd.positionalArgs[2], 'deploymentSequenceNumber');
      const deploymentSequenceNumber = parseIntArg(dsnStr, 'deploymentSequenceNumber');
      await client.pipelines.deleteDeployment(pipelineId, environmentId, deploymentSequenceNumber);
      return { deleted: true };
    }
    case 'get-deployment-gating-status': {
      const pipelineId = requireArg(cmd.positionalArgs[0], 'pipelineId');
      const environmentId = requireArg(cmd.positionalArgs[1], 'environmentId');
      const dsnStr = requireArg(cmd.positionalArgs[2], 'deploymentSequenceNumber');
      const deploymentSequenceNumber = parseIntArg(dsnStr, 'deploymentSequenceNumber');
      return client.pipelines.getDeploymentGatingStatus(
        pipelineId,
        environmentId,
        deploymentSequenceNumber,
      );
    }
    default:
      throw new Error(
        `Unknown pipelines action: ${cmd.action}. Actions: ${PIPELINES_ACTIONS.join(', ')}`,
      );
  }
}

const LINKED_WORKSPACES_ACTIONS = [
  'list-operations',
  'bulk-delete-operations',
  'bulk-create-operations',
  'list-security',
  'get-security',
  'bulk-delete-security',
  'bulk-create-security',
] as const;

async function executeLinkedWorkspaces(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list-operations':
      return client.linkedWorkspaces.listOperations();
    case 'bulk-delete-operations': {
      const workspaceIds = requireOpt(opts['workspace-ids'], '--workspace-ids');
      await client.linkedWorkspaces.bulkDeleteOperations(workspaceIds);
      return { deleted: true };
    }
    case 'bulk-create-operations': {
      const workspaceIds = splitCsvIds(requireOpt(opts['workspace-ids'], '--workspace-ids'));
      return client.linkedWorkspaces.bulkCreateOperations({ workspaceIds });
    }
    case 'list-security':
      return client.linkedWorkspaces.listSecurity();
    case 'get-security':
      return client.linkedWorkspaces.getSecurity(requireArg(cmd.positionalArgs[0], 'workspaceId'));
    case 'bulk-delete-security': {
      const workspaceIds = requireOpt(opts['workspace-ids'], '--workspace-ids');
      await client.linkedWorkspaces.bulkDeleteSecurity(workspaceIds);
      return { deleted: true };
    }
    case 'bulk-create-security': {
      const workspaceIds = splitCsvIds(requireOpt(opts['workspace-ids'], '--workspace-ids'));
      await client.linkedWorkspaces.bulkCreateSecurity({ workspaceIds });
      return { created: true };
    }
    default:
      throw new Error(
        `Unknown linked-workspaces action: ${cmd.action}. Actions: ${LINKED_WORKSPACES_ACTIONS.join(', ')}`,
      );
  }
}

// ── bulk-by-properties (B953,B957,B962,B968,B972,B981,B990,B994) ─────────────

const BULK_BY_PROPERTIES_ACTIONS = [
  'delete-builds',
  'delete-deployments',
  'delete-devinfo',
  'delete-devops-components',
  'delete-feature-flags',
  'delete-operations',
  'delete-remote-links',
  'delete-security',
] as const;

async function executeBulkByProperties(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  /**
   * Build the properties Record<string,string|number> from --properties flag.
   * The CLI accepts `--properties key=value[,key2=value2]`; they are
   * collected into the record. At least one property must be provided.
   */
  function buildParams(): Parameters<typeof client.bulkByProperties.deleteBuildsByProperties>[0] {
    const propertiesRaw = asString(opts['properties']);
    if (!propertiesRaw) {
      throw new Error(
        'bulk-by-properties requires --properties in the form key=value[,key2=value2]',
      );
    }
    const properties: Record<string, string> = {};
    for (const pair of propertiesRaw.split(',')) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx === -1) {
        throw new Error(
          `bulk-by-properties --properties: invalid pair "${pair}", expected key=value`,
        );
      }
      const k = pair.slice(0, eqIdx).trim();
      const v = pair.slice(eqIdx + 1).trim();
      if (!k) {
        throw new Error(`bulk-by-properties --properties: empty key in pair "${pair}"`);
      }
      properties[k] = v;
    }
    return { properties };
  }

  switch (cmd.action) {
    case 'delete-builds': {
      await client.bulkByProperties.deleteBuildsByProperties(buildParams());
      return { deleted: true };
    }
    case 'delete-deployments': {
      await client.bulkByProperties.deleteDeploymentsByProperties(buildParams());
      return { deleted: true };
    }
    case 'delete-devinfo': {
      await client.bulkByProperties.deleteDevInfoByProperties(buildParams());
      return { deleted: true };
    }
    case 'delete-devops-components': {
      await client.bulkByProperties.deleteDevOpsComponentsByProperties(buildParams());
      return { deleted: true };
    }
    case 'delete-feature-flags': {
      await client.bulkByProperties.deleteFeatureFlagsByProperties(buildParams());
      return { deleted: true };
    }
    case 'delete-operations': {
      await client.bulkByProperties.deleteOperationsByProperties(buildParams());
      return { deleted: true };
    }
    case 'delete-remote-links': {
      await client.bulkByProperties.deleteRemoteLinksByProperties(buildParams());
      return { deleted: true };
    }
    case 'delete-security': {
      await client.bulkByProperties.deleteSecurityByProperties(buildParams());
      return { deleted: true };
    }
    default:
      throw new Error(
        `Unknown bulk-by-properties action: ${cmd.action}. Actions: ${BULK_BY_PROPERTIES_ACTIONS.join(', ')}`,
      );
  }
}

// ── dashboards (B391–B405) ────────────────────────────────────────────────────

const DASHBOARDS_ACTIONS = [
  'list',
  'get',
  'create',
  'update',
  'delete',
  'list-gadgets',
  'add-gadget',
  'update-gadget',
  'remove-gadget',
  'list-item-properties',
  'get-item-property',
  'set-item-property',
  'delete-item-property',
  'copy',
  'bulk-edit',
  'list-available-gadgets',
  'search',
  'search-all',
] as const;

async function executeDashboards(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    // ── basic CRUD ──────────────────────────────────────────────────────────
    case 'list':
      return client.dashboards.list({
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        filter: asString(opts['filter']) as 'my' | 'favourite' | undefined,
        orderBy: asString(opts['order-by']),
        expand: asString(opts['expand']),
      });

    case 'get':
      return client.dashboards.get(requireArg(cmd.positionalArgs[0], 'dashboardId'));

    case 'create': {
      const sharePermsRaw = requireOpt(opts['share-permissions'], '--share-permissions');
      const editPermsRaw = asString(opts['edit-permissions']);
      return client.dashboards.create({
        name: requireOpt(opts['name'], '--name'),
        description: asString(opts['description']),
        sharePermissions: parseJsonArrayFlag(sharePermsRaw, '--share-permissions') as ReturnType<
          typeof parseJsonArrayFlag
        >,
        ...(editPermsRaw !== undefined && {
          editPermissions: parseJsonArrayFlag(editPermsRaw, '--edit-permissions') as ReturnType<
            typeof parseJsonArrayFlag
          >,
        }),
      } as Parameters<typeof client.dashboards.create>[0]);
    }

    case 'update': {
      const dashId = requireArg(cmd.positionalArgs[0], 'dashboardId');
      const sharePermsRaw = requireOpt(opts['share-permissions'], '--share-permissions');
      const editPermsRaw = asString(opts['edit-permissions']);
      return client.dashboards.update(dashId, {
        name: requireOpt(opts['name'], '--name'),
        description: asString(opts['description']),
        sharePermissions: parseJsonArrayFlag(sharePermsRaw, '--share-permissions') as ReturnType<
          typeof parseJsonArrayFlag
        >,
        ...(editPermsRaw !== undefined && {
          editPermissions: parseJsonArrayFlag(editPermsRaw, '--edit-permissions') as ReturnType<
            typeof parseJsonArrayFlag
          >,
        }),
      } as Parameters<typeof client.dashboards.update>[1]);
    }

    case 'delete': {
      await client.dashboards.delete(requireArg(cmd.positionalArgs[0], 'dashboardId'));
      return { deleted: true };
    }

    // ── gadgets ─────────────────────────────────────────────────────────────
    case 'list-gadgets':
      return client.dashboards.listGadgets(requireArg(cmd.positionalArgs[0], 'dashboardId'));

    case 'add-gadget': {
      const dashboardId = requireArg(cmd.positionalArgs[0], 'dashboardId');
      const rowRaw = opts['row'];
      const colRaw = opts['column'];
      if ((rowRaw === undefined) !== (colRaw === undefined)) {
        throw new Error('--row and --column must be supplied together');
      }
      let position: { row: number; column: number } | undefined;
      if (rowRaw !== undefined && colRaw !== undefined) {
        position = {
          row: asPositiveInt(rowRaw, '--row') as number,
          column: asPositiveInt(colRaw, '--column') as number,
        };
      }
      return client.dashboards.addGadget(dashboardId, {
        moduleKey: asString(opts['module-key']),
        uri: asString(opts['uri']),
        color: asString(opts['color']),
        title: asString(opts['title']),
        position,
        ignoreUriAndModuleKeyValidation: asBoolFlag(opts['ignore-uri-and-module-key-validation']),
      });
    }

    case 'update-gadget': {
      const dashboardId = requireArg(cmd.positionalArgs[0], 'dashboardId');
      const gadgetId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[1], 'gadgetId'),
        'gadgetId',
      );
      const rowRaw = opts['row'];
      const colRaw = opts['column'];
      if ((rowRaw === undefined) !== (colRaw === undefined)) {
        throw new Error('--row and --column must be supplied together');
      }
      let position: { row: number; column: number } | undefined;
      if (rowRaw !== undefined && colRaw !== undefined) {
        position = {
          row: asPositiveInt(rowRaw, '--row') as number,
          column: asPositiveInt(colRaw, '--column') as number,
        };
      }
      await client.dashboards.updateGadget(dashboardId, gadgetId, {
        title: asString(opts['title']),
        color: asString(opts['color']),
        position,
      });
      return { updated: true };
    }

    case 'remove-gadget': {
      const dashboardId = requireArg(cmd.positionalArgs[0], 'dashboardId');
      const gadgetId = parsePositiveIntArg(
        requireArg(cmd.positionalArgs[1], 'gadgetId'),
        'gadgetId',
      );
      await client.dashboards.removeGadget(dashboardId, gadgetId);
      return { removed: true };
    }

    // ── item properties ──────────────────────────────────────────────────────
    case 'list-item-properties':
      return client.dashboards.listItemProperties(
        requireArg(cmd.positionalArgs[0], 'dashboardId'),
        requireArg(cmd.positionalArgs[1], 'itemId'),
      );

    case 'get-item-property':
      return client.dashboards.getItemProperty(
        requireArg(cmd.positionalArgs[0], 'dashboardId'),
        requireArg(cmd.positionalArgs[1], 'itemId'),
        requireArg(cmd.positionalArgs[2], 'propertyKey'),
      );

    case 'set-item-property': {
      await client.dashboards.setItemProperty(
        requireArg(cmd.positionalArgs[0], 'dashboardId'),
        requireArg(cmd.positionalArgs[1], 'itemId'),
        requireArg(cmd.positionalArgs[2], 'propertyKey'),
        parseJsonValueFlag(requireOpt(opts['value'], '--value'), '--value'),
      );
      return { updated: true };
    }

    case 'delete-item-property': {
      await client.dashboards.deleteItemProperty(
        requireArg(cmd.positionalArgs[0], 'dashboardId'),
        requireArg(cmd.positionalArgs[1], 'itemId'),
        requireArg(cmd.positionalArgs[2], 'propertyKey'),
      );
      return { deleted: true };
    }

    // ── copy ─────────────────────────────────────────────────────────────────
    case 'copy': {
      const dashboardId = requireArg(cmd.positionalArgs[0], 'dashboardId');
      const nameRaw = asString(opts['name']);
      const descRaw = asString(opts['description']);
      const sharePermsRaw = asString(opts['share-permissions']);
      const editPermsRaw = asString(opts['edit-permissions']);
      return client.dashboards.copy(dashboardId, {
        ...(nameRaw !== undefined && { name: nameRaw }),
        ...(descRaw !== undefined && { description: descRaw }),
        ...(sharePermsRaw !== undefined && {
          sharePermissions: parseJsonArrayFlag(sharePermsRaw, '--share-permissions') as ReturnType<
            typeof parseJsonArrayFlag
          >,
        }),
        ...(editPermsRaw !== undefined && {
          editPermissions: parseJsonArrayFlag(editPermsRaw, '--edit-permissions') as ReturnType<
            typeof parseJsonArrayFlag
          >,
        }),
      } as Parameters<typeof client.dashboards.copy>[1]);
    }

    // ── bulk-edit ────────────────────────────────────────────────────────────
    case 'bulk-edit': {
      const entityIds = csvFlag(requireOpt(opts['entity-ids'], '--entity-ids')) as string[];
      const action = requireOpt(opts['action'], '--action');
      const newOwnerRaw = asString(opts['new-owner']);
      const autofixNameRaw = asBoolFlag(opts['autofix-name']);
      const extendAdminRaw = asBoolFlag(opts['extend-admin-permissions']);
      const sharePermsRaw = asString(opts['share-permissions']);
      const editPermsRaw = asString(opts['edit-permissions']);
      const data: BulkEditDashboardsData = {
        entityIds,
        action: action as BulkEditDashboardsData['action'],
        ...(newOwnerRaw !== undefined || autofixNameRaw !== undefined
          ? {
              changeOwnerDetails: {
                ...(newOwnerRaw !== undefined && { newOwner: newOwnerRaw }),
                ...(autofixNameRaw !== undefined && { autofixName: autofixNameRaw }),
              } as BulkEditDashboardsData['changeOwnerDetails'],
            }
          : {}),
        ...(extendAdminRaw !== undefined && { extendAdminPermissions: extendAdminRaw }),
        ...((sharePermsRaw !== undefined || editPermsRaw !== undefined) && {
          permissionDetails: {
            ...(sharePermsRaw !== undefined && {
              sharePermissions: parseJsonArrayFlag(
                sharePermsRaw,
                '--share-permissions',
              ) as ReturnType<typeof parseJsonArrayFlag>,
            }),
            ...(editPermsRaw !== undefined && {
              editPermissions: parseJsonArrayFlag(editPermsRaw, '--edit-permissions') as ReturnType<
                typeof parseJsonArrayFlag
              >,
            }),
          } as BulkEditDashboardsData['permissionDetails'],
        }),
      };
      return client.dashboards.bulkEdit(data);
    }

    // ── list-available-gadgets ───────────────────────────────────────────────
    // GET /dashboard/gadgets takes no query params — it is the global catalogue.
    case 'list-available-gadgets':
      return client.dashboards.listAvailableGadgets();

    // ── search / search-all ──────────────────────────────────────────────────
    case 'search':
      return client.dashboards.search({
        dashboardName: asString(opts['dashboard-name']),
        accountId: asString(opts['account-id']),
        owner: asString(opts['owner']),
        groupname: asString(opts['group-name']),
        groupId: asString(opts['group-id']),
        projectId: asPositiveInt(opts['project-id'], '--project-id'),
        orderBy: asString(opts['order-by']) as SearchDashboardsOrderBy | undefined,
        startAt: asNonNegativeInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        status: asString(opts['status']) as 'active' | 'archived' | 'deleted' | undefined,
        expand: asString(opts['expand']),
      });

    case 'search-all': {
      const maxPages = asPositiveInt(opts['max-pages'], '--max-pages');
      const results: unknown[] = [];
      for await (const item of client.dashboards.searchAll(
        {
          dashboardName: asString(opts['dashboard-name']),
          accountId: asString(opts['account-id']),
          owner: asString(opts['owner']),
          groupname: asString(opts['group-name']),
          groupId: asString(opts['group-id']),
          projectId: asPositiveInt(opts['project-id'], '--project-id'),
          orderBy: asString(opts['order-by']) as SearchDashboardsOrderBy | undefined,
          maxResults: asPositiveInt(opts['max-results'], '--max-results'),
          status: asString(opts['status']) as 'active' | 'archived' | 'deleted' | undefined,
          expand: asString(opts['expand']),
        },
        { maxPages },
      )) {
        results.push(item);
      }
      return results;
    }

    default:
      throw new Error(
        `Unknown dashboards action: ${cmd.action}. Actions: ${DASHBOARDS_ACTIONS.join(', ')}`,
      );
  }
}

const MIGRATION_ACTIONS = [
  'get-task',
  'submit-task',
  'update-fields',
  'update-properties',
  'search-workflow-rules',
] as const;

async function executeMigration(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get-task': {
      // B946: GET /migration/{connectKey}/{jiraIssueFieldsKey}/task
      const connectKey = requireArg(cmd.positionalArgs[0], 'connectKey');
      const jiraIssueFieldsKey = requireArg(cmd.positionalArgs[1], 'jiraIssueFieldsKey');
      return client.migration.getMigrationTask(connectKey, jiraIssueFieldsKey);
    }
    case 'submit-task': {
      // B947: POST /migration/{connectKey}/{jiraIssueFieldsKey}/task
      const connectKey = requireArg(cmd.positionalArgs[0], 'connectKey');
      const jiraIssueFieldsKey = requireArg(cmd.positionalArgs[1], 'jiraIssueFieldsKey');
      await client.migration.submitMigrationTask(connectKey, jiraIssueFieldsKey);
      return { submitted: true };
    }
    case 'update-fields': {
      // B948: PUT /migration/field — requires --transfer-id and --update-value-list
      const transferId = requireOpt(opts['transfer-id'], '--transfer-id');
      const updateValueListRaw = requireOpt(opts['update-value-list'], '--update-value-list');
      const updateValueList = parseJsonArrayFlag(
        updateValueListRaw,
        '--update-value-list',
      ) as ConnectCustomFieldValue[];
      return client.migration.updateIssueFields(transferId, { updateValueList });
    }
    case 'update-properties': {
      // B949: PUT /migration/properties/{entityType} — requires --transfer-id, positional entityType, and --value (JSON array)
      const transferId = requireOpt(opts['transfer-id'], '--transfer-id');
      const entityType = requireArg(cmd.positionalArgs[0], 'entityType') as MigrationEntityType;
      const valueRaw = requireOpt(opts['value'], '--value');
      const properties = parseJsonArrayFlag(valueRaw, '--value') as EntityPropertyDetails[];
      await client.migration.updateEntityProperties(transferId, entityType, properties);
      return { updated: true };
    }
    case 'search-workflow-rules': {
      // B950: POST /migration/workflow/rule/search — requires --transfer-id, --workflow-entity-id, --rule-ids
      const transferId = requireOpt(opts['transfer-id'], '--transfer-id');
      const workflowEntityId = requireOpt(opts['workflow-entity-id'], '--workflow-entity-id');
      const ruleIdsRaw = requireOpt(opts['rule-ids'], '--rule-ids');
      const ruleIds = splitCsvIds(ruleIdsRaw);
      const expand = asString(opts['expand']);
      return client.migration.searchWorkflowRules(transferId, {
        workflowEntityId,
        ruleIds,
        ...(expand !== undefined ? { expand } : {}),
      });
    }
    default:
      throw new Error(
        `Unknown migration action: ${cmd.action}. Actions: ${MIGRATION_ACTIONS.join(', ')}`,
      );
  }
}
