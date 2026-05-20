import { parseArgs } from 'node:util';
import type { ParsedCommand } from './types.js';

const GLOBAL_OPTIONS = {
  'base-url': { type: 'string' as const, short: 'u' },
  'auth-type': { type: 'string' as const },
  email: { type: 'string' as const, short: 'e' },
  token: { type: 'string' as const, short: 't' },
  format: { type: 'string' as const, short: 'f' },
  // PR review (round 3): self-hosted CLI users need an opt-in for hosts
  // outside the default `*.atlassian.{net,com}` / `*.jira.{com,-dev.com}`
  // suffix allowlist enforced by `resolveConfig`. The flag accepts a
  // comma-separated list of bare hostnames (no port — same policy as
  // `ClientConfig.allowedHosts`).
  'allowed-hosts': { type: 'string' as const },
  help: { type: 'boolean' as const, short: 'h' },
  version: { type: 'boolean' as const },
  // Resource-specific options
  'space-id': { type: 'string' as const },
  'page-id': { type: 'string' as const },
  'blog-post-id': { type: 'string' as const },
  limit: { type: 'string' as const },
  cursor: { type: 'string' as const },
  title: { type: 'string' as const },
  status: { type: 'string' as const },
  body: { type: 'string' as const },
  'body-format': { type: 'string' as const },
  purge: { type: 'boolean' as const },
  jql: { type: 'string' as const },
  project: { type: 'string' as const },
  type: { type: 'string' as const },
  summary: { type: 'string' as const },
  'transition-id': { type: 'string' as const },
  query: { type: 'string' as const },
  'max-results': { type: 'string' as const },
  'start-at': { type: 'string' as const },
  state: { type: 'string' as const },
  fields: { type: 'string' as const },
  expand: { type: 'string' as const },
  'version-number': { type: 'string' as const },
  'comment-type': { type: 'string' as const },
  'duration-hours': { type: 'string' as const },
  value: { type: 'string' as const },
  'account-ids': { type: 'string' as const },
  emails: { type: 'string' as const },
  ids: { type: 'string' as const },
  keys: { type: 'string' as const },
  // databases-specific options
  private: { type: 'boolean' as const },
  depth: { type: 'string' as const },
  sort: { type: 'string' as const },
  key: { type: 'string' as const },
  'database-id': { type: 'string' as const },
  'property-id': { type: 'string' as const },
  'level-id': { type: 'string' as const },
  'include-collaborators': { type: 'boolean' as const },
  'include-direct-children': { type: 'boolean' as const },
  'include-operations': { type: 'boolean' as const },
  'include-properties': { type: 'boolean' as const },
  'parent-id': { type: 'string' as const },
  // tasks-specific options
  'task-id': { type: 'string' as const },
  'include-blank-tasks': { type: 'boolean' as const },
  'assigned-to': { type: 'string' as const },
  'created-by': { type: 'string' as const },
  'completed-by': { type: 'string' as const },
  'created-at-from': { type: 'string' as const },
  'created-at-to': { type: 'string' as const },
  'due-at-from': { type: 'string' as const },
  'due-at-to': { type: 'string' as const },
  // install-skill options
  local: { type: 'boolean' as const },
  path: { type: 'string' as const },
  force: { type: 'boolean' as const },
  'dry-run': { type: 'boolean' as const },
  print: { type: 'boolean' as const },
};

/** Parse process.argv into a structured command. */
export function parseCommand(argv: string[]): ParsedCommand & {
  options: Record<string, string | boolean | undefined>;
} {
  const { values, positionals } = parseArgs({
    args: argv.slice(2),
    options: GLOBAL_OPTIONS,
    allowPositionals: true,
  });

  const api = positionals[0] ?? '';
  const resource = positionals[1] ?? '';
  const action = positionals[2] ?? '';
  const positionalArgs = positionals.slice(3);

  return {
    api,
    resource,
    action,
    positionalArgs,
    options: values as Record<string, string | boolean | undefined>,
  };
}
