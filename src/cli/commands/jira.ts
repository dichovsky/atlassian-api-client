import type { GlobalOptions, ParsedCommand } from '../types.js';
import { JiraClient } from '../../jira/client.js';
import type { AddFilterSharePermissionData } from '../../jira/index.js';
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
    default:
      throw new Error(`Unknown Jira resource: ${cmd.resource}. Use --help for usage.`);
  }
}

async function executeIssues(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get':
      return client.issues.get(requireArg(cmd.positionalArgs[0], 'issue key'), {
        fields: asString(opts['fields'])?.split(','),
        expand: asString(opts['expand'])?.split(','),
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
    default:
      throw new Error(
        `Unknown issues action: ${cmd.action}. Actions: get, create, update, delete, transition, transitions, get-agile, get-estimation, set-estimation, rank`,
      );
  }
}

async function executeProjects(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'list':
      return client.projects.list({
        maxResults: asPositiveInt(cmd.options['max-results'], '--max-results'),
      });
    case 'get':
      return client.projects.get(requireArg(cmd.positionalArgs[0], 'project key'));
    default:
      throw new Error(`Unknown projects action: ${cmd.action}. Actions: list, get`);
  }
}

async function executeSearch(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const jql = asString(cmd.options['jql']);

  if (!jql) {
    throw new Error('Missing --jql option for search');
  }

  return client.search.search({
    jql,
    maxResults: asPositiveInt(cmd.options['max-results'], '--max-results'),
    fields: asString(cmd.options['fields'])?.split(','),
  });
}

async function executeUsers(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'get':
      return client.users.get(requireArg(cmd.positionalArgs[0], 'account ID'));
    case 'me':
      return client.users.getCurrentUser();
    case 'search':
      return client.users.search({
        query: requireOpt(cmd.options['query'], '--query'),
        maxResults: asPositiveInt(cmd.options['max-results'], '--max-results'),
      });
    default:
      throw new Error(`Unknown users action: ${cmd.action}. Actions: get, me, search`);
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
  switch (cmd.action) {
    case 'list':
      return client.priorities.list();
    case 'get':
      return client.priorities.get(requireArg(cmd.positionalArgs[0], 'priority ID'));
    default:
      throw new Error(`Unknown priorities action: ${cmd.action}. Actions: list, get`);
  }
}

async function executeStatuses(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'list':
      return client.statuses.list();
    default:
      throw new Error(`Unknown statuses action: ${cmd.action}. Actions: list`);
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
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
        fields: asString(opts['fields'])?.split(','),
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        done: asBoolFlag(opts['done']),
      });
    }
    case 'epic-issues': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      const epicId = parsePositiveIntArg(requireArg(cmd.positionalArgs[1], 'epicId'), 'epicId');
      return client.boards.getEpicIssues(boardId, epicId, {
        jql: asString(opts['jql']),
        fields: asString(opts['fields'])?.split(','),
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'issues-without-epic': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.getIssuesWithoutEpic(boardId, {
        jql: asString(opts['jql']),
        fields: asString(opts['fields'])?.split(','),
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
      const stateRaw = requireOpt(opts['state'], '--state');
      if (stateRaw !== 'ENABLED' && stateRaw !== 'DISABLED') {
        throw new Error('--state must be ENABLED or DISABLED');
      }
      return client.boards.toggleFeature(boardId, { feature, state: stateRaw });
    }
    case 'get-issues': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.getIssues(boardId, {
        jql: asString(opts['jql']),
        fields: asString(opts['fields'])?.split(','),
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'list-projects-full': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.listProjectsFull(boardId, {
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'list-sprints': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.listSprints(boardId, {
        state: asString(opts['state']),
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    case 'list-versions': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.listVersions(boardId, {
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
        fields: asString(opts['fields'])?.split(','),
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
      });
    }
    default:
      throw new Error(
        `Unknown boards action: ${cmd.action}. Actions: list, get, create, delete, backlog, configuration, list-epics, epic-issues, issues-without-epic, get-features, toggle-feature, get-issues, move-issues, list-projects, list-projects-full, list-sprints, list-versions, sprint-issues, list-by-filter, list-properties, delete-property, get-property, set-property, list-quickfilters, get-quickfilter, get-reports`,
      );
  }
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
        fields: asString(opts['fields'])?.split(','),
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
        fields: asString(opts['fields'])?.split(','),
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
        fields: asString(opts['fields'])?.split(','),
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
    case 'list-failed': {
      const maxResults = asPositiveInt(opts['max-results'], '--max-results');
      const afterStr = asString(opts['after']);
      const after = afterStr !== undefined ? parsePositiveIntArg(afterStr, '--after') : undefined;
      return client.webhooks.listFailed({
        ...(maxResults !== undefined && { maxResults }),
        ...(after !== undefined && { after }),
      });
    }
    default:
      throw new Error(`Unknown webhooks action: ${cmd.action}. Actions: list-failed`);
  }
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

async function executeAuditing(client: JiraClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.auditing.list({
        offset: asPositiveInt(opts['offset'], '--offset'),
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
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
        excludeInactive: asBoolFlag(opts['exclude-inactive']),
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
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
      const excludeAccountIdsRaw = asString(opts['exclude-account-ids']);
      const excludeAccountIds = excludeAccountIdsRaw
        ? excludeAccountIdsRaw
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : undefined;
      return client.groupUserPicker.pick({
        query: asString(opts['query']),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
        showAvatar: asBoolFlag(opts['show-avatar']),
        projectId,
        projectRole: asString(opts['project-role']),
        excludeAccountIds,
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
  'delete-issues',
  'get-fields',
  'edit-fields',
  'move-issues',
  'get-transitions',
  'transition-issues',
  'unwatch-issues',
  'watch-issues',
  'get-status',
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
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
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
      return client.roles.getActors(roleId);
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
      const user = asString(opts['user']);
      const group = asString(opts['group']);
      const groupId = asString(opts['group-id']);
      const params: { user?: string; group?: string; groupId?: string } = {};
      if (user !== undefined) params.user = user;
      if (group !== undefined) params.group = group;
      if (groupId !== undefined) params.groupId = groupId;
      await client.roles.deleteActors(roleId, Object.keys(params).length > 0 ? params : undefined);
      return { deleted: true };
    }
    default:
      throw new Error(`Unknown roles action: ${cmd.action}. Actions: ${ROLES_ACTIONS.join(', ')}`);
  }
}
