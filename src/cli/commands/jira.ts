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
    default:
      throw new Error(
        `Unknown issues action: ${cmd.action}. Actions: get, create, update, delete, transition, transitions`,
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
    case 'list-sprints': {
      const boardId = parsePositiveIntArg(requireArg(cmd.positionalArgs[0], 'boardId'), 'boardId');
      return client.boards.listSprints(boardId, {
        state: asString(opts['state']),
        startAt: asPositiveInt(opts['start-at'], '--start-at'),
        maxResults: asPositiveInt(opts['max-results'], '--max-results'),
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
    default:
      throw new Error(
        `Unknown boards action: ${cmd.action}. Actions: list-sprints, sprint-issues, list-properties, delete-property, get-property, set-property, list-quickfilters, get-quickfilter, get-reports`,
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
