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
