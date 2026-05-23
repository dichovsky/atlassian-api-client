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
  'custom-content-id': { type: 'string' as const },
  id: { type: 'string' as const },
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
  'label-id': { type: 'string' as const },
  prefix: { type: 'string' as const },
  'include-collaborators': { type: 'boolean' as const },
  'include-direct-children': { type: 'boolean' as const },
  'include-labels': { type: 'boolean' as const },
  'include-operations': { type: 'boolean' as const },
  'include-properties': { type: 'boolean' as const },
  // footer-comments include-* flags
  'include-likes': { type: 'boolean' as const },
  'include-versions': { type: 'boolean' as const },
  'include-version': { type: 'boolean' as const },
  'parent-id': { type: 'string' as const },
  // inline-comments resolve / unresolve (PUT /inline-comments/{id}). Boolean
  // flag-pair: `--resolved` marks the thread resolved, `--no-resolved` reopens
  // it. Omitting both leaves the server-side state untouched.
  resolved: { type: 'boolean' as const },
  'no-resolved': { type: 'boolean' as const },
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
  // sprint/epic options
  name: { type: 'string' as const },
  goal: { type: 'string' as const },
  'board-id': { type: 'string' as const },
  'start-date': { type: 'string' as const },
  'end-date': { type: 'string' as const },
  issues: { type: 'string' as const },
  with: { type: 'string' as const },
  // epic options
  color: { type: 'string' as const },
  done: { type: 'boolean' as const },
  before: { type: 'string' as const },
  after: { type: 'string' as const },
  'custom-field': { type: 'string' as const },
  // space-roles-specific options
  description: { type: 'string' as const },
  'space-permissions': { type: 'string' as const },
  'principal-id': { type: 'string' as const },
  'principal-type': { type: 'string' as const },
  'role-type': { type: 'string' as const },
  'anonymous-reassignment-role-id': { type: 'string' as const },
  'guest-reassignment-role-id': { type: 'string' as const },
  // whiteboards-specific options
  'template-key': { type: 'string' as const },
  locale: { type: 'string' as const },
  // embeds-specific options
  'embed-url': { type: 'string' as const },
  // boards-specific options
  'filter-id': { type: 'string' as const },
  feature: { type: 'string' as const },
  released: { type: 'boolean' as const },
  // blog-posts sub-resource flags (B066-B084)
  'resolution-status': { type: 'string' as const },
  // `redact` convenience overrides — when set, these merge into the
  // `--value` JSON payload before the request is dispatched. The full
  // payload may still be supplied entirely through `--value`; convenience
  // flags only override the matching top-level keys.
  'clean-history': { type: 'boolean' as const },
  'created-at': { type: 'string' as const },
  // `get` include-* flags — each asks the server to inline an extra
  // sub-resource block on the response. See `GetBlogPostParams` for the
  // full enumeration mirrored from the v2 OpenAPI spec.
  'get-draft': { type: 'boolean' as const },
  'include-favorited-by-current-user-status': { type: 'boolean' as const },
  'include-webresources': { type: 'boolean' as const },
  // Historical-version selector for `blog-posts get` (renamed from the
  // spec's `version` query parameter to avoid clobbering the global
  // `--version` boolean flag).
  'historical-version': { type: 'string' as const },
  // install-skill options
  local: { type: 'boolean' as const },
  path: { type: 'string' as const },
  force: { type: 'boolean' as const },
  'dry-run': { type: 'boolean' as const },
  print: { type: 'boolean' as const },
  // attachments-specific options
  'media-type': { type: 'string' as const },
  filename: { type: 'string' as const },
  width: { type: 'string' as const },
  height: { type: 'string' as const },
  // Upload-attachment file path (B893 — `atlas confluence pages upload-attachment`).
  // Local filesystem path read into a Blob before the multipart POST.
  file: { type: 'string' as const },
  // spaces sub-resource options (B196-B213)
  alias: { type: 'string' as const },
  'role-id': { type: 'string' as const },
  'copy-space-access-configuration': { type: 'string' as const },
  // announcement-banner options (B324-B325)
  message: { type: 'string' as const },
  visibility: { type: 'string' as const },
  dismissible: { type: 'boolean' as const },
  enabled: { type: 'boolean' as const },
  // status / status-category options (B773-B776)
  'id-or-name': { type: 'string' as const },
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
