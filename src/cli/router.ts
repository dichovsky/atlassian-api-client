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
  // mypermissions options (B600)
  'project-id': { type: 'string' as const },
  'project-key': { type: 'string' as const },
  'issue-id': { type: 'string' as const },
  'issue-key': { type: 'string' as const },
  permissions: { type: 'string' as const },
  'project-uuid': { type: 'string' as const },
  'project-configuration-uuid': { type: 'string' as const },
  'comment-id': { type: 'string' as const },
  // auditing options (B343)
  offset: { type: 'string' as const },
  filter: { type: 'string' as const },
  from: { type: 'string' as const },
  to: { type: 'string' as const },
  // changelog options (B354)
  'author-ids': { type: 'string' as const },
  'field-ids': { type: 'string' as const },
  // groups/picker + groupuserpicker options (B474, B475)
  exclude: { type: 'string' as const },
  'exclude-account-ids': { type: 'string' as const },
  'exclude-connect-users': { type: 'boolean' as const },
  'exclude-inactive': { type: 'boolean' as const },
  'project-role': { type: 'string' as const },
  'show-avatar': { type: 'boolean' as const },
  'user-name': { type: 'string' as const },
  // groups CRUD options (B468-B473, B923)
  'group-name': { type: 'string' as const },
  'group-id': { type: 'string' as const },
  'group-names': { type: 'string' as const },
  'group-ids': { type: 'string' as const },
  'swap-group': { type: 'string' as const },
  'swap-group-id': { type: 'string' as const },
  'account-id': { type: 'string' as const },
  'access-type': { type: 'string' as const },
  'application-key': { type: 'string' as const },
  'include-inactive-users': { type: 'boolean' as const },
  // settings/columns options (B772)
  columns: { type: 'string' as const },
  // exists-by-properties options (B963)
  'entity-id': { type: 'string' as const },
  'entity-type': { type: 'string' as const },
  // app options (B326-B330, B943-B945, B975-B978)
  configuration: { type: 'string' as const },
  schema: { type: 'string' as const },
  'alternative-id': { type: 'string' as const },
  size: { type: 'string' as const },
  x: { type: 'string' as const },
  y: { type: 'string' as const },
  // bulk options (B345-B353 + DevOps bulk POST variants)
  'send-notification': { type: 'boolean' as const },
  'search-text': { type: 'string' as const },
  'ending-before': { type: 'string' as const },
  'starting-after': { type: 'string' as const },
  actions: { type: 'string' as const },
  // issue-attachments options (B336, B338-B342). `redirect` controls whether
  // the server replies with a 303 to a media-CDN URL (default) or the binary
  // body directly; `fallback-to-default` only applies to the thumbnail
  // endpoint and asks the server to return a generic placeholder instead of
  // 404 when no preview is renderable. `width`, `height`, `file`, `filename`,
  // and `media-type` reuse existing global flags above.
  redirect: { type: 'boolean' as const },
  'fallback-to-default': { type: 'boolean' as const },
  // component options (B361-B366)
  'project-ids-or-keys': { type: 'string' as const },
  'order-by': { type: 'string' as const },
  'lead-account-id': { type: 'string' as const },
  'lead-user-name': { type: 'string' as const },
  'assignee-type': { type: 'string' as const },
  'is-assignee-type-valid': { type: 'boolean' as const },
  'move-issues-to': { type: 'string' as const },
  // application-properties options (B331-B333)
  'permission-level': { type: 'string' as const },
  'key-filter': { type: 'string' as const },
  // configuration / timetracking options (B384, B387)
  url: { type: 'string' as const },
  'working-hours-per-day': { type: 'string' as const },
  'working-days-per-week': { type: 'string' as const },
  'time-format': { type: 'string' as const },
  'default-unit': { type: 'string' as const },
  // permissionscheme options (B616-B624)
  'holder-type': { type: 'string' as const },
  'holder-parameter': { type: 'string' as const },
  'holder-value': { type: 'string' as const },
  'permission-id': { type: 'string' as const },
  // filters options (B452-B466)
  'share-scope': { type: 'string' as const },
  'share-type': { type: 'string' as const },
  'include-favourites': { type: 'boolean' as const },
  rights: { type: 'string' as const },
  favourite: { type: 'boolean' as const },
  'edit-permissions': { type: 'string' as const },
  'share-permissions': { type: 'string' as const },
  // issue-type-screen-schemes options (B576-B586)
  mappings: { type: 'string' as const },
  'scheme-id': { type: 'string' as const },
  'screen-scheme-id': { type: 'string' as const },
  'scheme-ids': { type: 'string' as const },
  'issue-type-ids': { type: 'string' as const },
  'project-ids': { type: 'string' as const },
};

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
