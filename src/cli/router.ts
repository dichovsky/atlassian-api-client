import { parseArgs } from 'node:util';
import type { ParsedCommand } from './types.js';

const GLOBAL_OPTIONS = {
  'base-url': { type: 'string' as const, short: 'u' },
  'auth-type': { type: 'string' as const },
  email: { type: 'string' as const, short: 'e' },
  token: { type: 'string' as const, short: 't' },
  format: { type: 'string' as const, short: 'f' },
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
  fields: { type: 'string' as const },
  expand: { type: 'string' as const },
  'version-number': { type: 'string' as const },
  'comment-type': { type: 'string' as const },
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
