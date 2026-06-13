/**
 * Atlassian Cloud OAuth 2.0 scope detection.
 *
 * Maps operation names (e.g. `'jira.issues.get'`) to the minimal set of
 * OAuth 2.0 scopes required to perform them.
 *
 * Scope strings are taken directly from each operation's `security` block in the
 * pinned spec snapshots:
 *  - `spec/confluence-v2.json`   → `oAuthDefinitions` array (granular scopes)
 *  - `spec/jira-software.json`   → `OAuth2` array (granular scopes)
 *  - `spec/jira-platform-v3.json`→ `OAuth2` array (classic scopes — the pinned
 *    platform spec does not yet list granular equivalents for all operations)
 */

/** Well-known Atlassian Cloud OAuth 2.0 scopes. */
export type AtlassianScope =
  // ── Confluence granular scopes (spec/confluence-v2.json oAuthDefinitions) ──
  | 'read:page:confluence'
  | 'write:page:confluence'
  | 'delete:page:confluence'
  | 'read:space:confluence'
  | 'read:comment:confluence'
  | 'write:comment:confluence'
  | 'delete:comment:confluence'
  | 'read:attachment:confluence'
  | 'write:attachment:confluence'
  | 'delete:attachment:confluence'
  | 'read:label:confluence'
  | 'read:custom-content:confluence'
  | 'write:custom-content:confluence'
  | 'delete:custom-content:confluence'
  | 'read:whiteboard:confluence'
  | 'write:whiteboard:confluence'
  | 'delete:whiteboard:confluence'
  | 'read:task:confluence'
  | 'write:task:confluence'
  // ── Jira Software granular scopes (spec/jira-software.json OAuth2) ──────────
  | 'read:board-scope:jira-software'
  | 'read:issue-details:jira'
  | 'read:project:jira'
  | 'read:sprint:jira-software'
  | 'write:sprint:jira-software'
  | 'delete:sprint:jira-software'
  | 'read:jql:jira'
  // ── Jira Platform classic scopes (spec/jira-platform-v3.json OAuth2) ────────
  | 'read:jira-work'
  | 'write:jira-work'
  | 'manage:jira-project'
  | 'manage:jira-configuration'
  | 'read:jira-user'
  | 'manage:jira-webhook'
  | 'manage:jira-data-provider';

/** Registry mapping operation names to their required OAuth scopes. */
const OPERATION_SCOPES: Readonly<Record<string, readonly AtlassianScope[]>> = {
  // ── Confluence — Pages ──────────────────────────────────────────────────────
  // GET  /pages        → oAuthDefinitions: ['read:page:confluence']
  // GET  /pages/{id}   → oAuthDefinitions: ['read:page:confluence']
  // POST /pages        → oAuthDefinitions: ['write:page:confluence']
  // PUT  /pages/{id}   → oAuthDefinitions: ['write:page:confluence']
  // DELETE /pages/{id} → oAuthDefinitions: ['delete:page:confluence']
  'confluence.pages.list': ['read:page:confluence'],
  'confluence.pages.get': ['read:page:confluence'],
  'confluence.pages.create': ['write:page:confluence'],
  'confluence.pages.update': ['write:page:confluence'],
  'confluence.pages.delete': ['delete:page:confluence'],

  // ── Confluence — Spaces ─────────────────────────────────────────────────────
  // GET /spaces      → oAuthDefinitions: ['read:space:confluence']
  // GET /spaces/{id} → oAuthDefinitions: ['read:space:confluence']
  'confluence.spaces.list': ['read:space:confluence'],
  'confluence.spaces.get': ['read:space:confluence'],

  // ── Confluence — Blog posts ─────────────────────────────────────────────────
  // GET    /blogposts        → oAuthDefinitions: ['read:page:confluence']
  // GET    /blogposts/{id}   → oAuthDefinitions: ['read:page:confluence']
  // POST   /blogposts        → oAuthDefinitions: ['write:page:confluence']
  // PUT    /blogposts/{id}   → oAuthDefinitions: ['write:page:confluence']
  // DELETE /blogposts/{id}   → oAuthDefinitions: ['delete:page:confluence']
  'confluence.blogPosts.list': ['read:page:confluence'],
  'confluence.blogPosts.get': ['read:page:confluence'],
  'confluence.blogPosts.create': ['write:page:confluence'],
  'confluence.blogPosts.update': ['write:page:confluence'],
  'confluence.blogPosts.delete': ['delete:page:confluence'],

  // ── Confluence — Comments ───────────────────────────────────────────────────
  // GET    /pages/{id}/footer-comments    → oAuthDefinitions: ['read:comment:confluence']
  // GET    /footer-comments/{id}          → oAuthDefinitions: ['read:comment:confluence']
  // POST   /footer-comments               → oAuthDefinitions: ['write:comment:confluence']
  // PUT    /footer-comments/{id}          → oAuthDefinitions: ['write:comment:confluence']
  // DELETE /footer-comments/{id}          → oAuthDefinitions: ['delete:comment:confluence']
  'confluence.comments.list': ['read:comment:confluence'],
  'confluence.comments.get': ['read:comment:confluence'],
  'confluence.comments.create': ['write:comment:confluence'],
  'confluence.comments.update': ['write:comment:confluence'],
  'confluence.comments.delete': ['delete:comment:confluence'],

  // ── Confluence — Attachments ────────────────────────────────────────────────
  // GET    /pages/{id}/attachments        → oAuthDefinitions: ['read:attachment:confluence']
  // GET    /attachments/{id}              → oAuthDefinitions: ['read:attachment:confluence']
  // POST   /pages/{id}/attachments        → not in spec; closest granular: write:attachment:confluence
  // DELETE /attachments/{id}              → oAuthDefinitions: ['delete:attachment:confluence']
  'confluence.attachments.list': ['read:attachment:confluence'],
  'confluence.attachments.get': ['read:attachment:confluence'],
  'confluence.attachments.upload': ['write:attachment:confluence'],
  'confluence.attachments.delete': ['delete:attachment:confluence'],

  // ── Confluence — Labels ─────────────────────────────────────────────────────
  // GET /labels → oAuthDefinitions: ['read:label:confluence']
  'confluence.labels.list': ['read:label:confluence'],

  // ── Confluence — Content properties ────────────────────────────────────────
  // GET    /pages/{page-id}/properties                       → ['read:page:confluence']
  // GET    /pages/{page-id}/properties/{property-id}         → ['read:page:confluence']
  // POST   /pages/{page-id}/properties                       → ['read:page:confluence','write:page:confluence']
  // PUT    /pages/{page-id}/properties/{property-id}         → ['read:page:confluence','write:page:confluence']
  // DELETE /pages/{page-id}/properties/{property-id}         → ['read:page:confluence','write:page:confluence']
  'confluence.contentProperties.list': ['read:page:confluence'],
  'confluence.contentProperties.get': ['read:page:confluence'],
  'confluence.contentProperties.create': ['read:page:confluence', 'write:page:confluence'],
  'confluence.contentProperties.update': ['read:page:confluence', 'write:page:confluence'],
  'confluence.contentProperties.delete': ['read:page:confluence', 'write:page:confluence'],

  // ── Confluence — Custom content ─────────────────────────────────────────────
  // GET    /custom-content        → oAuthDefinitions: ['read:custom-content:confluence']
  // GET    /custom-content/{id}   → oAuthDefinitions: ['read:custom-content:confluence']
  // POST   /custom-content        → oAuthDefinitions: ['write:custom-content:confluence']
  // PUT    /custom-content/{id}   → oAuthDefinitions: ['write:custom-content:confluence']
  // DELETE /custom-content/{id}   → oAuthDefinitions: ['delete:custom-content:confluence']
  'confluence.customContent.list': ['read:custom-content:confluence'],
  'confluence.customContent.get': ['read:custom-content:confluence'],
  'confluence.customContent.create': ['write:custom-content:confluence'],
  'confluence.customContent.update': ['write:custom-content:confluence'],
  'confluence.customContent.delete': ['delete:custom-content:confluence'],

  // ── Confluence — Whiteboards ────────────────────────────────────────────────
  // GET    /whiteboards/{id} → oAuthDefinitions: ['read:whiteboard:confluence']
  // POST   /whiteboards      → oAuthDefinitions: ['write:whiteboard:confluence']
  // DELETE /whiteboards/{id} → oAuthDefinitions: ['delete:whiteboard:confluence']
  'confluence.whiteboards.get': ['read:whiteboard:confluence'],
  'confluence.whiteboards.create': ['write:whiteboard:confluence'],
  'confluence.whiteboards.delete': ['delete:whiteboard:confluence'],

  // ── Confluence — Tasks ──────────────────────────────────────────────────────
  // GET /tasks       → oAuthDefinitions: ['read:task:confluence']
  // GET /tasks/{id}  → oAuthDefinitions: ['read:task:confluence']
  // PUT /tasks/{id}  → oAuthDefinitions: ['write:task:confluence']
  'confluence.tasks.list': ['read:task:confluence'],
  'confluence.tasks.get': ['read:task:confluence'],
  'confluence.tasks.update': ['write:task:confluence'],

  // ── Confluence — Versions ───────────────────────────────────────────────────
  // GET /pages/{id}/versions                              → ['read:page:confluence']
  // GET /pages/{page-id}/versions/{version-number}        → ['read:page:confluence']
  // GET /blogposts/{id}/versions                          → ['read:page:confluence']
  // GET /blogposts/{blogpost-id}/versions/{version-number}→ ['read:page:confluence']
  'confluence.versions.listForPage': ['read:page:confluence'],
  'confluence.versions.listForBlogPost': ['read:page:confluence'],
  'confluence.versions.getForPage': ['read:page:confluence'],
  'confluence.versions.getForBlogPost': ['read:page:confluence'],

  // ── Jira — Issues ───────────────────────────────────────────────────────────
  // GET    /rest/api/3/issue/{issueIdOrKey}            → OAuth2: ['read:jira-work']
  // POST   /rest/api/3/issue                           → OAuth2: ['write:jira-work']
  // PUT    /rest/api/3/issue/{issueIdOrKey}            → OAuth2: ['write:jira-work']
  // DELETE /rest/api/3/issue/{issueIdOrKey}            → OAuth2: ['write:jira-work']
  // POST   /rest/api/3/issue/{issueIdOrKey}/transitions → OAuth2: ['write:jira-work']
  'jira.issues.get': ['read:jira-work'],
  'jira.issues.create': ['write:jira-work'],
  'jira.issues.update': ['write:jira-work'],
  'jira.issues.delete': ['write:jira-work'],
  'jira.issues.transition': ['write:jira-work'],

  // ── Jira — Projects ─────────────────────────────────────────────────────────
  // GET /rest/api/3/project/search          → OAuth2: ['read:jira-work']
  // GET /rest/api/3/project/{projectIdOrKey}→ OAuth2: ['read:jira-work']
  'jira.projects.list': ['read:jira-work'],
  'jira.projects.get': ['read:jira-work'],

  // ── Jira — Users ────────────────────────────────────────────────────────────
  // GET /rest/api/3/user              → OAuth2: ['read:jira-user']
  // GET /rest/api/3/myself            → OAuth2: ['read:jira-user']
  // GET /rest/api/3/user/search       → OAuth2: ['read:jira-user']
  'jira.users.get': ['read:jira-user'],
  'jira.users.getCurrentUser': ['read:jira-user'],
  'jira.users.search': ['read:jira-user'],

  // ── Jira — Search ───────────────────────────────────────────────────────────
  // POST /rest/api/3/search      → OAuth2: ['read:jira-work']
  // GET  /rest/api/3/search      → OAuth2: ['read:jira-work']
  'jira.search.search': ['read:jira-work'],
  'jira.search.searchGet': ['read:jira-work'],

  // ── Jira — Issue comments ────────────────────────────────────────────────────
  // GET    /rest/api/3/issue/{issueIdOrKey}/comment       → OAuth2: ['read:jira-work']
  // GET    /rest/api/3/issue/{issueIdOrKey}/comment/{id}  → OAuth2: ['read:jira-work']
  // POST   /rest/api/3/issue/{issueIdOrKey}/comment       → OAuth2: ['write:jira-work']
  // PUT    /rest/api/3/issue/{issueIdOrKey}/comment/{id}  → OAuth2: ['write:jira-work']
  // DELETE /rest/api/3/issue/{issueIdOrKey}/comment/{id}  → OAuth2: ['write:jira-work']
  'jira.issueComments.list': ['read:jira-work'],
  'jira.issueComments.get': ['read:jira-work'],
  'jira.issueComments.create': ['write:jira-work'],
  'jira.issueComments.update': ['write:jira-work'],
  'jira.issueComments.delete': ['write:jira-work'],

  // ── Jira — Issue attachments ─────────────────────────────────────────────────
  // GET  /rest/api/3/issue/{issueIdOrKey}              → OAuth2: ['read:jira-work']
  // GET  /rest/api/3/attachment/{id}                   → OAuth2: ['read:jira-work']
  // POST /rest/api/3/issue/{issueIdOrKey}/attachments  → OAuth2: ['write:jira-work']
  'jira.issueAttachments.list': ['read:jira-work'],
  'jira.issueAttachments.get': ['read:jira-work'],
  'jira.issueAttachments.upload': ['write:jira-work'],

  // ── Jira — Boards & Sprints ──────────────────────────────────────────────────
  // GET /rest/agile/1.0/board              → OAuth2: ['read:board-scope:jira-software','read:project:jira']
  // GET /rest/agile/1.0/board/{boardId}    → OAuth2: ['read:board-scope:jira-software','read:issue-details:jira']
  // GET /rest/agile/1.0/board/{id}/issue   → OAuth2: ['read:board-scope:jira-software','read:issue-details:jira']
  // GET /rest/agile/1.0/sprint/{sprintId}  → OAuth2: ['read:sprint:jira-software']
  // GET /rest/agile/1.0/sprint/{id}/issue  → OAuth2: ['read:sprint:jira-software','read:issue-details:jira','read:jql:jira']
  // POST   /rest/agile/1.0/sprint          → OAuth2: ['write:sprint:jira-software']
  // PUT    /rest/agile/1.0/sprint/{id}     → OAuth2: ['write:sprint:jira-software']
  // DELETE /rest/agile/1.0/sprint/{id}     → OAuth2: ['delete:sprint:jira-software']
  'jira.boards.list': ['read:board-scope:jira-software', 'read:project:jira'],
  'jira.boards.get': ['read:board-scope:jira-software', 'read:issue-details:jira'],
  'jira.boards.getIssues': ['read:board-scope:jira-software', 'read:issue-details:jira'],
  'jira.sprints.get': ['read:sprint:jira-software'],
  'jira.sprints.getIssues': [
    'read:sprint:jira-software',
    'read:issue-details:jira',
    'read:jql:jira',
  ],
  'jira.sprints.create': ['write:sprint:jira-software'],
  'jira.sprints.update': ['write:sprint:jira-software'],
  'jira.sprints.delete': ['delete:sprint:jira-software'],

  // ── Jira — Dashboards ────────────────────────────────────────────────────────
  // GET    /rest/api/3/dashboard     → OAuth2: ['read:jira-work']
  // GET    /rest/api/3/dashboard/{id}→ OAuth2: ['read:jira-work']
  // POST   /rest/api/3/dashboard     → OAuth2: ['write:jira-work']
  // PUT    /rest/api/3/dashboard/{id}→ OAuth2: ['write:jira-work']
  // DELETE /rest/api/3/dashboard/{id}→ OAuth2: ['write:jira-work']
  'jira.dashboards.list': ['read:jira-work'],
  'jira.dashboards.get': ['read:jira-work'],
  'jira.dashboards.create': ['write:jira-work'],
  'jira.dashboards.update': ['write:jira-work'],
  'jira.dashboards.delete': ['write:jira-work'],

  // ── Jira — Filters ───────────────────────────────────────────────────────────
  // GET    /rest/api/3/filter/search → OAuth2: ['read:jira-work']
  // GET    /rest/api/3/filter/{id}   → OAuth2: ['read:jira-work']
  // POST   /rest/api/3/filter        → OAuth2: ['write:jira-work']
  // PUT    /rest/api/3/filter/{id}   → OAuth2: ['write:jira-work']
  // DELETE /rest/api/3/filter/{id}   → OAuth2: ['write:jira-work']
  'jira.filters.list': ['read:jira-work'],
  'jira.filters.get': ['read:jira-work'],
  'jira.filters.create': ['write:jira-work'],
  'jira.filters.update': ['write:jira-work'],
  'jira.filters.delete': ['write:jira-work'],

  // ── Jira — Fields ────────────────────────────────────────────────────────────
  // GET    /rest/api/3/field          → OAuth2: ['read:jira-work']
  // POST   /rest/api/3/field          → OAuth2: ['manage:jira-configuration']
  // PUT    /rest/api/3/field/{fieldId}→ OAuth2: ['manage:jira-configuration']
  // DELETE /rest/api/3/field/{id}     → OAuth2: ['manage:jira-configuration']
  'jira.fields.list': ['read:jira-work'],
  'jira.fields.create': ['manage:jira-configuration'],
  'jira.fields.update': ['manage:jira-configuration'],
  'jira.fields.delete': ['manage:jira-configuration'],

  // ── Jira — Webhooks ──────────────────────────────────────────────────────────
  // GET    /rest/api/3/webhook → OAuth2: ['read:jira-work','manage:jira-webhook']
  // POST   /rest/api/3/webhook → OAuth2: ['read:jira-work','manage:jira-webhook']
  // DELETE /rest/api/3/webhook → OAuth2: ['read:jira-work','manage:jira-webhook']
  'jira.webhooks.list': ['read:jira-work', 'manage:jira-webhook'],
  'jira.webhooks.register': ['read:jira-work', 'manage:jira-webhook'],
  'jira.webhooks.delete': ['read:jira-work', 'manage:jira-webhook'],

  // ── Jira — JQL ───────────────────────────────────────────────────────────────
  // GET  /rest/api/3/jql/autocompletedata            → OAuth2: ['read:jira-work']
  // POST /rest/api/3/jql/parse                       → OAuth2: ['read:jira-work']
  // POST /rest/api/3/jql/sanitize                    → OAuth2: ['manage:jira-configuration']
  // GET  /rest/api/3/jql/autocompletedata/suggestions→ OAuth2: ['read:jira-work']
  'jira.jql.getAutocompleteData': ['read:jira-work'],
  'jira.jql.parse': ['read:jira-work'],
  'jira.jql.sanitize': ['manage:jira-configuration'],
  'jira.jql.getFieldReferenceSuggestions': ['read:jira-work'],

  // ── Jira — Bulk ──────────────────────────────────────────────────────────────
  // POST   /rest/api/3/issue/bulk                       → OAuth2: ['write:jira-work']
  // PUT    /rest/api/3/issue/properties/{propertyKey}   → OAuth2: ['write:jira-work']
  // DELETE /rest/api/3/issue/properties/{propertyKey}   → OAuth2: ['write:jira-work']
  'jira.bulk.createBulk': ['write:jira-work'],
  'jira.bulk.setPropertyBulk': ['write:jira-work'],
  'jira.bulk.deletePropertyBulk': ['write:jira-work'],

  // ── Jira — Workflows ─────────────────────────────────────────────────────────
  // GET /rest/api/3/workflow/search → OAuth2: ['manage:jira-project']
  // GET /rest/api/3/workflow/search → OAuth2: ['manage:jira-project']
  'jira.workflows.list': ['manage:jira-project'],
  'jira.workflows.get': ['manage:jira-project'],

  // ── Jira — Labels ────────────────────────────────────────────────────────────
  // GET /rest/api/3/label → OAuth2: ['read:jira-work']
  'jira.labels.list': ['read:jira-work'],
};

/**
 * Returns the deduplicated, sorted list of OAuth 2.0 scopes required for the given operations.
 *
 * Unknown operation names are silently ignored so callers can safely pass operation lists
 * that may contain names not yet in the registry.
 *
 * @param operations - Operation names such as `'jira.issues.get'` or `'confluence.pages.create'`.
 * @returns Sorted array of required {@link AtlassianScope} values with duplicates removed.
 *
 * @example
 * detectRequiredScopes(['jira.issues.get', 'confluence.pages.create'])
 * // → ['read:jira-work', 'write:page:confluence']
 */
export function detectRequiredScopes(operations: readonly string[]): AtlassianScope[] {
  const scopeSet = new Set<AtlassianScope>();

  for (const op of operations) {
    const scopes = OPERATION_SCOPES[op];
    if (scopes !== undefined) {
      for (const scope of scopes) {
        scopeSet.add(scope);
      }
    }
  }

  return [...scopeSet].sort();
}

/**
 * Returns all registered operation names in alphabetical order.
 * Useful for validation tooling and documentation generation.
 */
export function listKnownOperations(): readonly string[] {
  return Object.keys(OPERATION_SCOPES).sort();
}

/**
 * Exhaustive catalog of every {@link AtlassianScope}. Typed as
 * `Record<AtlassianScope, true>` so adding a member to the union WITHOUT adding
 * it here is a compile error — that is what actually keeps the two in sync.
 */
const KNOWN_SCOPE_CATALOG: Record<AtlassianScope, true> = {
  // Confluence granular
  'read:page:confluence': true,
  'write:page:confluence': true,
  'delete:page:confluence': true,
  'read:space:confluence': true,
  'read:comment:confluence': true,
  'write:comment:confluence': true,
  'delete:comment:confluence': true,
  'read:attachment:confluence': true,
  'write:attachment:confluence': true,
  'delete:attachment:confluence': true,
  'read:label:confluence': true,
  'read:custom-content:confluence': true,
  'write:custom-content:confluence': true,
  'delete:custom-content:confluence': true,
  'read:whiteboard:confluence': true,
  'write:whiteboard:confluence': true,
  'delete:whiteboard:confluence': true,
  'read:task:confluence': true,
  'write:task:confluence': true,
  // Jira Software granular
  'read:board-scope:jira-software': true,
  'read:issue-details:jira': true,
  'read:project:jira': true,
  'read:sprint:jira-software': true,
  'write:sprint:jira-software': true,
  'delete:sprint:jira-software': true,
  'read:jql:jira': true,
  // Jira Platform classic
  'read:jira-work': true,
  'write:jira-work': true,
  'manage:jira-project': true,
  'manage:jira-configuration': true,
  'read:jira-user': true,
  'manage:jira-webhook': true,
  'manage:jira-data-provider': true,
};

/** The complete set of well-known Atlassian Cloud OAuth 2.0 scope strings. */
const KNOWN_SCOPES: ReadonlySet<AtlassianScope> = new Set(
  Object.keys(KNOWN_SCOPE_CATALOG) as AtlassianScope[],
);

/** Result of validating a set of scope strings. */
export interface ScopeValidationResult {
  /** Scope strings that are present in the known-scope catalog. */
  readonly valid: readonly AtlassianScope[];
  /** Scope strings that are NOT in the known-scope catalog. */
  readonly unknown: readonly string[];
}

/**
 * Validates a list of scope strings against the known Atlassian OAuth 2.0
 * scope catalog. Returns two partitions: `valid` (recognised) and `unknown`
 * (not in the catalog). Order within each partition follows the input order.
 *
 * This is a read-only utility; it does not affect authorization state.
 *
 * @param scopes - Arbitrary strings to validate.
 * @returns {@link ScopeValidationResult} with `valid` and `unknown` partitions.
 *
 * @example
 * validateScopes(['read:jira-work', 'write:made-up'])
 * // → { valid: ['read:jira-work'], unknown: ['write:made-up'] }
 */
export function validateScopes(scopes: readonly string[]): ScopeValidationResult {
  const valid: AtlassianScope[] = [];
  const unknown: string[] = [];
  for (const scope of scopes) {
    if (KNOWN_SCOPES.has(scope as AtlassianScope)) {
      valid.push(scope as AtlassianScope);
    } else {
      unknown.push(scope);
    }
  }
  return { valid, unknown };
}

/**
 * Returns all known Atlassian OAuth 2.0 scope strings in alphabetical order.
 * Useful for listing available scopes in help output and validation tooling.
 */
export function listKnownScopes(): readonly AtlassianScope[] {
  return [...KNOWN_SCOPES].sort();
}
