import type { GlobalOptions, ParsedCommand } from '../types.js';
import { JiraClient } from '../../jira/client.js';
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
    default:
      throw new Error(`Unknown groups action: ${cmd.action}. Actions: picker`);
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
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get-approximate-count':
      return client.license.getApproximateCount();
    case 'get-approximate-count-for-product':
      return client.license.getApproximateCountForProduct(
        requireOpt(opts['application-key'], '--application-key'),
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
