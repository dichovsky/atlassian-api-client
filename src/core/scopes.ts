/**
 * Atlassian Cloud OAuth 2.0 scope detection.
 *
 * Maps operation names (e.g. `'jira.issues.get'`) to the minimal set of
 * OAuth 2.0 scopes required to perform them.
 *
 * The SDK now advises **granular scopes throughout** for all three surfaces:
 *  - `spec/confluence-v2.json`   → `oAuthDefinitions` array (granular GA)
 *  - `spec/jira-software.json`   → `OAuth2` array (granular, no classic fallback)
 *  - `spec/jira-platform-v3.json`→ `x-atlassian-oauth2-scopes[state=Beta]`
 *    (granular Beta scopes; Atlassian has annotated every platform v3 operation
 *    with its granular equivalents — see the Beta entries in the extension)
 *
 * Note: Jira Platform granular scopes are currently **Beta** per Atlassian.
 * They can be requested today but Atlassian may adjust them before GA.
 */

/**
 * Granular scopes advertised by the pinned Confluence v2 OpenAPI document's
 * `oAuthDefinitions` security requirements.
 */
const CONFLUENCE_GRANULAR_SCOPES = [
  'delete:attachment:confluence',
  'delete:comment:confluence',
  'delete:custom-content:confluence',
  'delete:database:confluence',
  'delete:embed:confluence',
  'delete:folder:confluence',
  'delete:page:confluence',
  'delete:whiteboard:confluence',
  'read:app-data:confluence',
  'read:attachment:confluence',
  'read:comment:confluence',
  'read:configuration:confluence',
  'read:content.metadata:confluence',
  'read:custom-content:confluence',
  'read:database:confluence',
  'read:embed:confluence',
  'read:folder:confluence',
  'read:hierarchical-content:confluence',
  'read:label:confluence',
  'read:page:confluence',
  'read:space.permission:confluence',
  'read:space:confluence',
  'read:task:confluence',
  'read:user:confluence',
  'read:whiteboard:confluence',
  'write:app-data:confluence',
  'write:attachment:confluence',
  'write:comment:confluence',
  'write:configuration:confluence',
  'write:custom-content:confluence',
  'write:database:confluence',
  'write:embed:confluence',
  'write:folder:confluence',
  'write:page:confluence',
  'write:space.permission:confluence',
  'write:space:confluence',
  'write:task:confluence',
  'write:whiteboard:confluence',
] as const;

/** Granular scopes advertised by the pinned Jira Software OpenAPI document. */
const JIRA_SOFTWARE_GRANULAR_SCOPES = [
  'delete:board-scope.admin:jira-software',
  'delete:build-info:jira',
  'delete:deployment-info:jira',
  'delete:dev-info:jira',
  'delete:feature-flag-info:jira',
  'delete:remote-link-info:jira',
  'delete:security:jira',
  'delete:sprint:jira-software',
  'read:board-scope.admin:jira-software',
  'read:board-scope:jira-software',
  'read:build-info:jira',
  'read:deployment-info:jira',
  'read:dev-info:jira',
  'read:epic:jira-software',
  'read:feature-flag-info:jira',
  'read:issue-details:jira',
  'read:issue:jira-software',
  'read:jql:jira',
  'read:project:jira',
  'read:remote-link-info:jira',
  'read:security:jira',
  'read:sprint:jira-software',
  'write:board-scope.admin:jira-software',
  'write:board-scope:jira-software',
  'write:build-info:jira',
  'write:deployment-info:jira',
  'write:dev-info:jira',
  'write:epic:jira-software',
  'write:feature-flag-info:jira',
  'write:issue:jira-software',
  'write:remote-link-info:jira',
  'write:security:jira',
  'write:sprint:jira-software',
] as const;

/**
 * Granular Jira Platform scopes from `x-atlassian-oauth2-scopes` entries whose
 * state is `Beta`. Classic scopes also present in `Current` entries are
 * intentionally excluded.
 */
const JIRA_PLATFORM_GRANULAR_SCOPES = [
  'delete:async-task:jira',
  'delete:attachment:jira',
  'delete:avatar:jira',
  'delete:comment.property:jira',
  'delete:comment:jira',
  'delete:dashboard.property:jira',
  'delete:dashboard:jira',
  'delete:field-configuration-scheme:jira',
  'delete:field-configuration:jira',
  'delete:field.option:jira',
  'delete:field:jira',
  'delete:filter.column:jira',
  'delete:filter:jira',
  'delete:group:jira',
  'delete:issue-link-type:jira',
  'delete:issue-link:jira',
  'delete:issue-type-scheme:jira',
  'delete:issue-type-screen-scheme:jira',
  'delete:issue-type.property:jira',
  'delete:issue-type:jira',
  'delete:issue-worklog.property:jira',
  'delete:issue-worklog:jira',
  'delete:issue.property:jira',
  'delete:issue.remote-link:jira',
  'delete:issue:jira',
  'delete:permission-scheme:jira',
  'delete:permission:jira',
  'delete:priority-scheme:jira',
  'delete:project-category:jira',
  'delete:project-role:jira',
  'delete:project-version:jira',
  'delete:project.avatar:jira',
  'delete:project.component:jira',
  'delete:project.property:jira',
  'delete:project:jira',
  'delete:screen-scheme:jira',
  'delete:screen-tab:jira',
  'delete:screen:jira',
  'delete:screenable-field:jira',
  'delete:user-configuration:jira',
  'delete:user.columns:jira',
  'delete:user.property:jira',
  'delete:webhook:jira',
  'delete:workflow-scheme:jira',
  'delete:workflow:jira',
  'read:app-data:jira',
  'read:application-role:jira',
  'read:attachment:jira',
  'read:audit-log:jira',
  'read:avatar:jira',
  'read:comment.property:jira',
  'read:comment:jira',
  'read:custom-field-contextual-configuration:jira',
  'read:dashboard.property:jira',
  'read:dashboard:jira',
  'read:email-address:jira',
  'read:epic:jira-software',
  'read:field-configuration-scheme:jira',
  'read:field-configuration:jira',
  'read:field.default-value:jira',
  'read:field.option:jira',
  'read:field:jira',
  'read:filter.column:jira',
  'read:filter.default-share-scope:jira',
  'read:filter:jira',
  'read:group:jira',
  'read:instance-configuration:jira',
  'read:issue-details:jira',
  'read:issue-event:jira',
  'read:issue-link-type:jira',
  'read:issue-meta:jira',
  'read:issue-security-level:jira',
  'read:issue-security-scheme:jira',
  'read:issue-status:jira',
  'read:issue-type-hierarchy:jira',
  'read:issue-type-scheme:jira',
  'read:issue-type-screen-scheme:jira',
  'read:issue-type.property:jira',
  'read:issue-type:jira',
  'read:issue-worklog.property:jira',
  'read:issue-worklog:jira',
  'read:issue.changelog:jira',
  'read:issue.property:jira',
  'read:issue.remote-link:jira',
  'read:issue.time-tracking:jira',
  'read:issue.transition:jira',
  'read:issue.vote:jira',
  'read:issue.watcher:jira',
  'read:issue:jira',
  'read:jira-expressions:jira',
  'read:jql:jira',
  'read:label:jira',
  'read:license:jira',
  'read:notification-scheme:jira',
  'read:permission-scheme:jira',
  'read:permission:jira',
  'read:priority-scheme:jira',
  'read:priority:jira',
  'read:project-category:jira',
  'read:project-role:jira',
  'read:project-type:jira',
  'read:project-version:jira',
  'read:project.avatar:jira',
  'read:project.component:jira',
  'read:project.email:jira',
  'read:project.feature:jira',
  'read:project.property:jira',
  'read:project:jira',
  'read:resolution:jira',
  'read:screen-field:jira',
  'read:screen-scheme:jira',
  'read:screen-tab:jira',
  'read:screen:jira',
  'read:screenable-field:jira',
  'read:status:jira',
  'read:user-configuration:jira',
  'read:user.columns:jira',
  'read:user.property:jira',
  'read:user:jira',
  'read:webhook:jira',
  'read:workflow-scheme:jira',
  'read:workflow:jira',
  'redact:issue:jira',
  'send:notification:jira',
  'validate:jql:jira',
  'write:app-data:jira',
  'write:attachment:jira',
  'write:avatar:jira',
  'write:comment.property:jira',
  'write:comment:jira',
  'write:custom-field-contextual-configuration:jira',
  'write:dashboard.property:jira',
  'write:dashboard:jira',
  'write:field-configuration-scheme:jira',
  'write:field-configuration:jira',
  'write:field.default-value:jira',
  'write:field.option:jira',
  'write:field:jira',
  'write:filter.column:jira',
  'write:filter.default-share-scope:jira',
  'write:filter:jira',
  'write:group:jira',
  'write:instance-configuration:jira',
  'write:issue-link-type:jira',
  'write:issue-link:jira',
  'write:issue-type-scheme:jira',
  'write:issue-type-screen-scheme:jira',
  'write:issue-type.property:jira',
  'write:issue-type:jira',
  'write:issue-worklog.property:jira',
  'write:issue-worklog:jira',
  'write:issue.property:jira',
  'write:issue.remote-link:jira',
  'write:issue.time-tracking:jira',
  'write:issue.vote:jira',
  'write:issue.watcher:jira',
  'write:issue:jira',
  'write:permission-scheme:jira',
  'write:permission:jira',
  'write:priority-scheme:jira',
  'write:project-category:jira',
  'write:project-role:jira',
  'write:project-version:jira',
  'write:project.avatar:jira',
  'write:project.component:jira',
  'write:project.email:jira',
  'write:project.feature:jira',
  'write:project.property:jira',
  'write:project:jira',
  'write:screen-scheme:jira',
  'write:screen-tab:jira',
  'write:screen:jira',
  'write:screenable-field:jira',
  'write:user-configuration:jira',
  'write:user.columns:jira',
  'write:user.property:jira',
  'write:user:jira',
  'write:webhook:jira',
  'write:workflow-scheme:jira',
  'write:workflow:jira',
] as const;

/**
 * Additional scopes recognized by the pinned security-scheme catalogs.
 *
 * These stay separate from the operation-level granular catalogs above:
 * `validateScopes` accepts every scope Atlassian advertises, while
 * `detectRequiredScopes` continues to recommend only granular operation scopes.
 */
const ADDITIONAL_RECOGNIZED_SCOPES = [
  // Granular catalog entries not selected by current operation annotations.
  'delete:workflow.property:jira',
  'read:field.options:jira',
  'read:issue-field-values:jira',
  'read:issue-link:jira',
  'read:issue.votes:jira',
  'read:role:jira',
  'read:workflow.property:jira',
  'write:workflow.property:jira',

  // Classic and Jira Software compatibility scopes still advertised by Atlassian.
  'manage:jira-configuration',
  'manage:jira-project',
  'manage:jira-webhook',
  'read:build:jira-software',
  'read:deployment:jira-software',
  'read:feature-flag:jira-software',
  'read:jira-user',
  'read:jira-work',
  'read:remote-link:jira-software',
  'read:source-code:jira-software',
  'write:build:jira-software',
  'write:deployment:jira-software',
  'write:feature-flag:jira-software',
  'write:jira-work',
  'write:remote-link:jira-software',
  'write:source-code:jira-software',
] as const;

/** Well-known Atlassian Cloud OAuth 2.0 scopes. */
export type AtlassianScope =
  | (typeof CONFLUENCE_GRANULAR_SCOPES)[number]
  | (typeof JIRA_SOFTWARE_GRANULAR_SCOPES)[number]
  | (typeof JIRA_PLATFORM_GRANULAR_SCOPES)[number]
  | (typeof ADDITIONAL_RECOGNIZED_SCOPES)[number];

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
  // GET    /rest/api/3/issue/{issueIdOrKey}
  //   x-atlassian-oauth2-scopes Beta: read:issue-meta:jira, read:issue-security-level:jira,
  //     read:issue.vote:jira, read:issue.changelog:jira, read:avatar:jira, read:issue:jira,
  //     read:status:jira, read:user:jira, read:field-configuration:jira
  // POST   /rest/api/3/issue
  //   x-atlassian-oauth2-scopes Beta: write:issue:jira, write:comment:jira,
  //     write:comment.property:jira, write:attachment:jira, read:issue:jira
  // PUT    /rest/api/3/issue/{issueIdOrKey}
  //   x-atlassian-oauth2-scopes Beta: write:issue:jira
  // DELETE /rest/api/3/issue/{issueIdOrKey}
  //   x-atlassian-oauth2-scopes Beta: delete:issue:jira
  // POST   /rest/api/3/issue/{issueIdOrKey}/transitions
  //   x-atlassian-oauth2-scopes Beta: write:issue:jira, write:issue.property:jira
  'jira.issues.get': [
    'read:avatar:jira',
    'read:field-configuration:jira',
    'read:issue-meta:jira',
    'read:issue-security-level:jira',
    'read:issue.changelog:jira',
    'read:issue.vote:jira',
    'read:issue:jira',
    'read:status:jira',
    'read:user:jira',
  ],
  'jira.issues.create': [
    'read:issue:jira',
    'write:attachment:jira',
    'write:comment.property:jira',
    'write:comment:jira',
    'write:issue:jira',
  ],
  'jira.issues.update': ['write:issue:jira'],
  'jira.issues.delete': ['delete:issue:jira'],
  'jira.issues.transition': ['write:issue.property:jira', 'write:issue:jira'],

  // ── Jira — Projects ─────────────────────────────────────────────────────────
  // GET /rest/api/3/project/search
  //   x-atlassian-oauth2-scopes Beta: read:issue-type:jira, read:project:jira,
  //     read:project.property:jira, read:user:jira, read:application-role:jira,
  //     read:avatar:jira, read:group:jira, read:issue-type-hierarchy:jira,
  //     read:project-category:jira, read:project-version:jira, read:project.component:jira
  // GET /rest/api/3/project/{projectIdOrKey}  (same Beta scopes)
  'jira.projects.list': [
    'read:application-role:jira',
    'read:avatar:jira',
    'read:group:jira',
    'read:issue-type-hierarchy:jira',
    'read:issue-type:jira',
    'read:project-category:jira',
    'read:project-version:jira',
    'read:project.component:jira',
    'read:project.property:jira',
    'read:project:jira',
    'read:user:jira',
  ],
  'jira.projects.get': [
    'read:application-role:jira',
    'read:avatar:jira',
    'read:group:jira',
    'read:issue-type-hierarchy:jira',
    'read:issue-type:jira',
    'read:project-category:jira',
    'read:project-version:jira',
    'read:project.component:jira',
    'read:project.property:jira',
    'read:project:jira',
    'read:user:jira',
  ],

  // ── Jira — Users ────────────────────────────────────────────────────────────
  // GET /rest/api/3/user
  //   x-atlassian-oauth2-scopes Beta: read:application-role:jira, read:group:jira,
  //     read:user:jira, read:avatar:jira
  // GET /rest/api/3/myself  (same Beta scopes)
  // GET /rest/api/3/user/search
  //   x-atlassian-oauth2-scopes Beta: read:user:jira, read:user.property:jira,
  //     read:application-role:jira, read:avatar:jira, read:group:jira
  'jira.users.get': [
    'read:application-role:jira',
    'read:avatar:jira',
    'read:group:jira',
    'read:user:jira',
  ],
  'jira.users.getCurrentUser': [
    'read:application-role:jira',
    'read:avatar:jira',
    'read:group:jira',
    'read:user:jira',
  ],
  'jira.users.search': [
    'read:application-role:jira',
    'read:avatar:jira',
    'read:group:jira',
    'read:user.property:jira',
    'read:user:jira',
  ],

  // ── Jira — Search ───────────────────────────────────────────────────────────
  // POST /rest/api/3/search
  //   x-atlassian-oauth2-scopes Beta: read:issue-details:jira, read:field.default-value:jira,
  //     read:field.option:jira, read:field:jira, read:group:jira
  // GET  /rest/api/3/search
  //   x-atlassian-oauth2-scopes Beta: read:issue-details:jira, read:audit-log:jira,
  //     read:avatar:jira, read:field-configuration:jira, read:issue-meta:jira
  'jira.search.search': [
    'read:field.default-value:jira',
    'read:field.option:jira',
    'read:field:jira',
    'read:group:jira',
    'read:issue-details:jira',
  ],
  'jira.search.searchGet': [
    'read:audit-log:jira',
    'read:avatar:jira',
    'read:field-configuration:jira',
    'read:issue-details:jira',
    'read:issue-meta:jira',
  ],

  // ── Jira — Issue comments ────────────────────────────────────────────────────
  // GET  /rest/api/3/issue/{issueIdOrKey}/comment
  //   x-atlassian-oauth2-scopes Beta: read:comment:jira, read:comment.property:jira,
  //     read:group:jira, read:project:jira, read:project-role:jira, read:user:jira, read:avatar:jira
  // GET  /rest/api/3/issue/{issueIdOrKey}/comment/{id}  (same Beta scopes)
  // POST /rest/api/3/issue/{issueIdOrKey}/comment
  //   x-atlassian-oauth2-scopes Beta: read:comment:jira, read:comment.property:jira,
  //     read:group:jira, read:project:jira, read:project-role:jira, read:user:jira,
  //     write:comment:jira, read:avatar:jira
  // PUT  /rest/api/3/issue/{issueIdOrKey}/comment/{id}  (same as POST Beta scopes)
  // DELETE /rest/api/3/issue/{issueIdOrKey}/comment/{id}
  //   x-atlassian-oauth2-scopes Beta: delete:comment:jira, delete:comment.property:jira
  'jira.issueComments.list': [
    'read:avatar:jira',
    'read:comment.property:jira',
    'read:comment:jira',
    'read:group:jira',
    'read:project-role:jira',
    'read:project:jira',
    'read:user:jira',
  ],
  'jira.issueComments.get': [
    'read:avatar:jira',
    'read:comment.property:jira',
    'read:comment:jira',
    'read:group:jira',
    'read:project-role:jira',
    'read:project:jira',
    'read:user:jira',
  ],
  'jira.issueComments.create': [
    'read:avatar:jira',
    'read:comment.property:jira',
    'read:comment:jira',
    'read:group:jira',
    'read:project-role:jira',
    'read:project:jira',
    'read:user:jira',
    'write:comment:jira',
  ],
  'jira.issueComments.update': [
    'read:avatar:jira',
    'read:comment.property:jira',
    'read:comment:jira',
    'read:group:jira',
    'read:project-role:jira',
    'read:project:jira',
    'read:user:jira',
    'write:comment:jira',
  ],
  'jira.issueComments.delete': ['delete:comment.property:jira', 'delete:comment:jira'],

  // ── Jira — Issue attachments ─────────────────────────────────────────────────
  // issueAttachments.list uses GET /issue/{issueIdOrKey}?fields=attachment —
  //   same path + verb as issues.get → same Beta scopes
  // GET  /rest/api/3/attachment/{id}
  //   x-atlassian-oauth2-scopes Beta: read:attachment:jira, read:user:jira,
  //     read:application-role:jira, read:avatar:jira, read:group:jira
  // POST /rest/api/3/issue/{issueIdOrKey}/attachments
  //   x-atlassian-oauth2-scopes Beta: read:user:jira, write:attachment:jira,
  //     read:attachment:jira, read:avatar:jira
  // DELETE /rest/api/3/attachment/{id}
  //   x-atlassian-oauth2-scopes Beta: delete:attachment:jira
  'jira.issueAttachments.list': [
    'read:avatar:jira',
    'read:field-configuration:jira',
    'read:issue-meta:jira',
    'read:issue-security-level:jira',
    'read:issue.changelog:jira',
    'read:issue.vote:jira',
    'read:issue:jira',
    'read:status:jira',
    'read:user:jira',
  ],
  'jira.issueAttachments.get': [
    'read:application-role:jira',
    'read:attachment:jira',
    'read:avatar:jira',
    'read:group:jira',
    'read:user:jira',
  ],
  'jira.issueAttachments.upload': [
    'read:attachment:jira',
    'read:avatar:jira',
    'read:user:jira',
    'write:attachment:jira',
  ],
  'jira.issueAttachments.delete': ['delete:attachment:jira'],

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
    'read:issue-details:jira',
    'read:jql:jira',
    'read:sprint:jira-software',
  ],
  'jira.sprints.create': ['write:sprint:jira-software'],
  'jira.sprints.update': ['write:sprint:jira-software'],
  'jira.sprints.delete': ['delete:sprint:jira-software'],

  // Remaining Agile and enhanced `/rest/software/1.0` operations from the
  // live Jira Software OpenAPI scope annotations.
  'jira.boards.create': ['write:board-scope:jira-software'],
  'jira.boards.delete': ['write:board-scope:jira-software'],
  'jira.boards.getBacklog': ['read:board-scope:jira-software', 'read:issue-details:jira'],
  'jira.boards.getBacklogEnhanced': ['read:board-scope:jira-software', 'read:issue-details:jira'],
  'jira.boards.getBacklogApproximateCount': [
    'read:board-scope:jira-software',
    'read:issue-details:jira',
  ],
  'jira.boards.getConfiguration': ['read:board-scope.admin:jira-software', 'read:project:jira'],
  'jira.boards.listEpics': ['read:epic:jira-software'],
  'jira.boards.getEpicIssues': [
    'read:epic:jira-software',
    'read:issue-details:jira',
    'read:jql:jira',
  ],
  'jira.boards.getEpicIssuesEnhanced': [
    'read:epic:jira-software',
    'read:issue-details:jira',
    'read:jql:jira',
  ],
  'jira.boards.getIssuesWithoutEpic': [
    'read:epic:jira-software',
    'read:issue-details:jira',
    'read:jql:jira',
  ],
  'jira.boards.getIssuesWithoutEpicEnhanced': [
    'read:epic:jira-software',
    'read:issue-details:jira',
    'read:jql:jira',
  ],
  'jira.boards.getFeatures': ['read:board-scope.admin:jira-software'],
  'jira.boards.toggleFeature': ['write:board-scope.admin:jira-software'],
  'jira.boards.getIssuesEnhanced': ['read:board-scope:jira-software', 'read:issue-details:jira'],
  'jira.boards.getIssueApproximateCount': [
    'read:board-scope:jira-software',
    'read:issue-details:jira',
  ],
  'jira.boards.moveIssues': ['write:board-scope:jira-software'],
  'jira.boards.listProjects': ['read:board-scope.admin:jira-software', 'read:project:jira'],
  'jira.boards.listProjectsFull': ['read:board-scope.admin:jira-software', 'read:project:jira'],
  'jira.boards.listSprints': ['read:sprint:jira-software'],
  'jira.boards.listVersions': ['read:board-scope:jira-software'],
  'jira.boards.getSprintIssues': [
    'read:issue-details:jira',
    'read:jql:jira',
    'read:sprint:jira-software',
  ],
  'jira.boards.getSprintIssuesEnhanced': [
    'read:issue-details:jira',
    'read:jql:jira',
    'read:sprint:jira-software',
  ],
  'jira.boards.listProperties': ['read:board-scope.admin:jira-software'],
  'jira.boards.getProperty': ['read:board-scope.admin:jira-software'],
  'jira.boards.setProperty': ['write:board-scope.admin:jira-software'],
  'jira.boards.deleteProperty': ['delete:board-scope.admin:jira-software'],
  'jira.boards.listQuickFilters': ['read:board-scope.admin:jira-software', 'read:jql:jira'],
  'jira.boards.getQuickFilter': ['read:board-scope.admin:jira-software', 'read:jql:jira'],
  'jira.boards.getReports': ['read:board-scope:jira-software'],
  'jira.boards.listByFilter': ['read:board-scope.admin:jira-software'],
  'jira.sprints.getIssuesEnhanced': [
    'read:issue-details:jira',
    'read:jql:jira',
    'read:sprint:jira-software',
  ],
  'jira.sprints.partialUpdate': ['write:sprint:jira-software'],
  'jira.sprints.moveIssues': ['write:sprint:jira-software'],
  'jira.sprints.listProperties': ['read:sprint:jira-software'],
  'jira.sprints.getProperty': ['read:sprint:jira-software'],
  'jira.sprints.setProperty': ['write:sprint:jira-software'],
  'jira.sprints.deleteProperty': ['delete:sprint:jira-software'],
  'jira.sprints.swap': ['write:sprint:jira-software'],
  'jira.epic.get': ['read:epic:jira-software'],
  'jira.epic.partialUpdate': ['write:epic:jira-software'],
  'jira.epic.getIssues': ['read:epic:jira-software', 'read:issue-details:jira', 'read:jql:jira'],
  'jira.epic.getIssuesEnhanced': [
    'read:epic:jira-software',
    'read:issue-details:jira',
    'read:jql:jira',
  ],
  'jira.epic.moveIssues': ['write:epic:jira-software'],
  'jira.epic.rank': ['write:epic:jira-software'],
  'jira.epic.getIssuesWithoutEpic': [
    'read:epic:jira-software',
    'read:issue-details:jira',
    'read:jql:jira',
  ],
  'jira.epic.getIssuesWithoutEpicEnhanced': [
    'read:epic:jira-software',
    'read:issue-details:jira',
    'read:jql:jira',
  ],
  'jira.epic.removeIssuesFromEpic': ['write:epic:jira-software'],
  'jira.backlog.moveIssues': ['write:board-scope:jira-software'],
  'jira.backlog.moveIssuesToBoard': ['write:board-scope:jira-software'],
  'jira.issues.getAgile': ['read:issue:jira-software'],
  'jira.issues.getEstimation': ['read:issue-details:jira', 'read:issue:jira-software'],
  'jira.issues.setEstimation': ['read:issue-details:jira', 'write:issue:jira-software'],
  'jira.issues.rank': ['write:issue:jira-software'],

  // Jira Software DevOps integration operations with live granular scopes.
  'jira.bulk.submitBuilds': ['write:build-info:jira'],
  'jira.bulk.submitDeployments': ['write:deployment-info:jira'],
  'jira.bulk.submitDevInfo': ['write:dev-info:jira'],
  'jira.bulk.submitFeatureFlags': ['write:feature-flag-info:jira'],
  'jira.bulk.submitRemoteLinks': ['write:remote-link-info:jira'],
  'jira.bulk.submitSecurity': ['write:security:jira'],
  'jira.pipelines.getBuild': ['read:build-info:jira'],
  'jira.pipelines.deleteBuild': ['delete:build-info:jira'],
  'jira.pipelines.getDeployment': ['read:deployment-info:jira'],
  'jira.pipelines.getDeploymentGatingStatus': ['read:deployment-info:jira'],
  'jira.pipelines.deleteDeployment': ['delete:deployment-info:jira'],
  'jira.repository.get': ['read:dev-info:jira'],
  'jira.repository.delete': ['delete:dev-info:jira'],
  'jira.repository.deleteEntity': ['delete:dev-info:jira'],
  'jira.existsByProperties.get': ['read:dev-info:jira'],
  'jira.flag.get': ['read:feature-flag-info:jira'],
  'jira.flag.delete': ['delete:feature-flag-info:jira'],
  'jira.remoteLink.get': ['read:remote-link-info:jira'],
  'jira.remoteLink.delete': ['delete:remote-link-info:jira'],
  'jira.linkedWorkspaces.listSecurity': ['read:security:jira'],
  'jira.linkedWorkspaces.getSecurity': ['read:security:jira'],
  'jira.linkedWorkspaces.bulkCreateSecurity': ['write:security:jira'],
  'jira.linkedWorkspaces.bulkDeleteSecurity': ['delete:security:jira'],
  'jira.vulnerability.get': ['read:security:jira'],
  'jira.vulnerability.delete': ['delete:security:jira'],
  'jira.bulkByProperties.deleteBuildsByProperties': ['delete:build-info:jira'],
  'jira.bulkByProperties.deleteDeploymentsByProperties': ['delete:deployment-info:jira'],
  'jira.bulkByProperties.deleteDevInfoByProperties': ['delete:dev-info:jira'],
  'jira.bulkByProperties.deleteFeatureFlagsByProperties': ['delete:feature-flag-info:jira'],
  'jira.bulkByProperties.deleteRemoteLinksByProperties': ['delete:remote-link-info:jira'],
  'jira.bulkByProperties.deleteSecurityByProperties': ['delete:security:jira'],

  // ── Jira — Dashboards ────────────────────────────────────────────────────────
  // GET    /rest/api/3/dashboard
  //   x-atlassian-oauth2-scopes Beta: read:dashboard:jira, read:group:jira, read:project:jira,
  //     read:project-role:jira, read:user:jira, read:application-role:jira, read:avatar:jira,
  //     read:issue-type-hierarchy:jira, read:issue-type:jira, read:project-category:jira,
  //     read:project-version:jira, read:project.component:jira
  // GET    /rest/api/3/dashboard/{id}  (same Beta scopes)
  // POST   /rest/api/3/dashboard
  //   x-atlassian-oauth2-scopes Beta: (all of the above) + write:dashboard:jira
  // PUT    /rest/api/3/dashboard/{id}  (same as POST Beta scopes)
  // DELETE /rest/api/3/dashboard/{id}
  //   x-atlassian-oauth2-scopes Beta: delete:dashboard:jira
  'jira.dashboards.list': [
    'read:application-role:jira',
    'read:avatar:jira',
    'read:dashboard:jira',
    'read:group:jira',
    'read:issue-type-hierarchy:jira',
    'read:issue-type:jira',
    'read:project-category:jira',
    'read:project-role:jira',
    'read:project-version:jira',
    'read:project.component:jira',
    'read:project:jira',
    'read:user:jira',
  ],
  'jira.dashboards.get': [
    'read:application-role:jira',
    'read:avatar:jira',
    'read:dashboard:jira',
    'read:group:jira',
    'read:issue-type-hierarchy:jira',
    'read:issue-type:jira',
    'read:project-category:jira',
    'read:project-role:jira',
    'read:project-version:jira',
    'read:project.component:jira',
    'read:project:jira',
    'read:user:jira',
  ],
  'jira.dashboards.create': [
    'read:application-role:jira',
    'read:avatar:jira',
    'read:dashboard:jira',
    'read:group:jira',
    'read:issue-type-hierarchy:jira',
    'read:issue-type:jira',
    'read:project-category:jira',
    'read:project-role:jira',
    'read:project-version:jira',
    'read:project.component:jira',
    'read:project:jira',
    'read:user:jira',
    'write:dashboard:jira',
  ],
  'jira.dashboards.update': [
    'read:application-role:jira',
    'read:avatar:jira',
    'read:dashboard:jira',
    'read:group:jira',
    'read:issue-type-hierarchy:jira',
    'read:issue-type:jira',
    'read:project-category:jira',
    'read:project-role:jira',
    'read:project-version:jira',
    'read:project.component:jira',
    'read:project:jira',
    'read:user:jira',
    'write:dashboard:jira',
  ],
  'jira.dashboards.delete': ['delete:dashboard:jira'],

  // ── Jira — Filters ───────────────────────────────────────────────────────────
  // GET    /rest/api/3/filter/search
  //   x-atlassian-oauth2-scopes Beta: read:filter:jira, read:group:jira, read:project:jira,
  //     read:project-role:jira, read:user:jira, read:jql:jira, read:application-role:jira,
  //     read:avatar:jira, read:issue-type-hierarchy:jira
  // GET    /rest/api/3/filter/{id}  (same Beta scopes)
  // POST   /rest/api/3/filter
  //   x-atlassian-oauth2-scopes Beta: the read:filter:jira list above EXCEPT
  //     read:jql:jira, + write:filter:jira + read:issue-type:jira,
  //     read:project-category:jira, read:project-version:jira, read:project.component:jira
  // PUT    /rest/api/3/filter/{id}
  //   x-atlassian-oauth2-scopes Beta: write:filter:jira + the read:filter:jira list
  // DELETE /rest/api/3/filter/{id}
  //   x-atlassian-oauth2-scopes Beta: delete:filter:jira
  'jira.filters.list': [
    'read:application-role:jira',
    'read:avatar:jira',
    'read:filter:jira',
    'read:group:jira',
    'read:issue-type-hierarchy:jira',
    'read:jql:jira',
    'read:project-role:jira',
    'read:project:jira',
    'read:user:jira',
  ],
  'jira.filters.get': [
    'read:application-role:jira',
    'read:avatar:jira',
    'read:filter:jira',
    'read:group:jira',
    'read:issue-type-hierarchy:jira',
    'read:jql:jira',
    'read:project-role:jira',
    'read:project:jira',
    'read:user:jira',
  ],
  'jira.filters.create': [
    'read:application-role:jira',
    'read:avatar:jira',
    'read:filter:jira',
    'read:group:jira',
    'read:issue-type-hierarchy:jira',
    'read:issue-type:jira',
    'read:project-category:jira',
    'read:project-role:jira',
    'read:project-version:jira',
    'read:project.component:jira',
    'read:project:jira',
    'read:user:jira',
    'write:filter:jira',
  ],
  'jira.filters.update': [
    'read:application-role:jira',
    'read:avatar:jira',
    'read:filter:jira',
    'read:group:jira',
    'read:issue-type-hierarchy:jira',
    'read:jql:jira',
    'read:project-role:jira',
    'read:project:jira',
    'read:user:jira',
    'write:filter:jira',
  ],
  'jira.filters.delete': ['delete:filter:jira'],

  // ── Jira — Fields ────────────────────────────────────────────────────────────
  // GET    /rest/api/3/field
  //   x-atlassian-oauth2-scopes Beta: read:field:jira, read:avatar:jira,
  //     read:project-category:jira, read:project:jira, read:field-configuration:jira
  // POST   /rest/api/3/field
  //   x-atlassian-oauth2-scopes Beta: write:field:jira, read:avatar:jira, read:field:jira,
  //     read:project-category:jira, read:project:jira, read:field-configuration:jira
  // PUT    /rest/api/3/field/{fieldId}
  //   x-atlassian-oauth2-scopes Beta: write:field:jira
  // DELETE /rest/api/3/field/{id}
  //   x-atlassian-oauth2-scopes Beta: delete:field:jira
  'jira.fields.list': [
    'read:avatar:jira',
    'read:field-configuration:jira',
    'read:field:jira',
    'read:project-category:jira',
    'read:project:jira',
  ],
  'jira.fields.create': [
    'read:avatar:jira',
    'read:field-configuration:jira',
    'read:field:jira',
    'read:project-category:jira',
    'read:project:jira',
    'write:field:jira',
  ],
  'jira.fields.update': ['write:field:jira'],
  'jira.fields.delete': ['delete:field:jira'],

  // ── Jira — Webhooks ──────────────────────────────────────────────────────────
  // GET    /rest/api/3/webhook
  //   x-atlassian-oauth2-scopes Beta: read:webhook:jira, read:jql:jira
  // POST   /rest/api/3/webhook
  //   x-atlassian-oauth2-scopes Beta: read:field:jira, read:project:jira, write:webhook:jira
  // DELETE /rest/api/3/webhook
  //   x-atlassian-oauth2-scopes Beta: delete:webhook:jira
  'jira.webhooks.list': ['read:jql:jira', 'read:webhook:jira'],
  'jira.webhooks.register': ['read:field:jira', 'read:project:jira', 'write:webhook:jira'],
  'jira.webhooks.delete': ['delete:webhook:jira'],

  // ── Jira — JQL ───────────────────────────────────────────────────────────────
  // GET  /rest/api/3/jql/autocompletedata
  //   x-atlassian-oauth2-scopes Beta: read:field:jira
  // POST /rest/api/3/jql/parse
  //   x-atlassian-oauth2-scopes Beta: read:field:jira, validate:jql:jira, read:jql:jira
  // POST /rest/api/3/jql/sanitize
  //   x-atlassian-oauth2-scopes Beta: read:jql:jira
  // GET  /rest/api/3/jql/autocompletedata/suggestions
  //   x-atlassian-oauth2-scopes Beta: read:issue-details:jira
  'jira.jql.getAutocompleteData': ['read:field:jira'],
  'jira.jql.parse': ['read:field:jira', 'read:jql:jira', 'validate:jql:jira'],
  'jira.jql.sanitize': ['read:jql:jira'],
  'jira.jql.getFieldReferenceSuggestions': ['read:issue-details:jira'],

  // ── Jira — Bulk ──────────────────────────────────────────────────────────────
  // POST   /rest/api/3/issue/bulk
  //   x-atlassian-oauth2-scopes Beta: write:issue:jira, write:comment:jira,
  //     write:comment.property:jira, write:attachment:jira, read:issue:jira
  // PUT    /rest/api/3/issue/properties/{propertyKey}
  //   x-atlassian-oauth2-scopes Beta: read:jira-expressions:jira, write:issue.property:jira
  // DELETE /rest/api/3/issue/properties/{propertyKey}
  //   x-atlassian-oauth2-scopes Beta: delete:issue.property:jira
  'jira.bulk.createBulk': [
    'read:issue:jira',
    'write:attachment:jira',
    'write:comment.property:jira',
    'write:comment:jira',
    'write:issue:jira',
  ],
  'jira.bulk.setPropertyBulk': ['read:jira-expressions:jira', 'write:issue.property:jira'],
  'jira.bulk.deletePropertyBulk': ['delete:issue.property:jira'],

  // ── Jira — Workflows ─────────────────────────────────────────────────────────
  // GET /rest/api/3/workflow/search
  //   x-atlassian-oauth2-scopes Beta: read:group:jira, read:issue-security-level:jira,
  //     read:project-role:jira, read:screen:jira, read:status:jira, read:user:jira,
  //     read:workflow:jira, read:webhook:jira, read:avatar:jira, read:project-category:jira,
  //     read:project:jira
  'jira.workflows.list': [
    'read:avatar:jira',
    'read:group:jira',
    'read:issue-security-level:jira',
    'read:project-category:jira',
    'read:project-role:jira',
    'read:project:jira',
    'read:screen:jira',
    'read:status:jira',
    'read:user:jira',
    'read:webhook:jira',
    'read:workflow:jira',
  ],
  'jira.workflows.get': [
    'read:avatar:jira',
    'read:group:jira',
    'read:issue-security-level:jira',
    'read:project-category:jira',
    'read:project-role:jira',
    'read:project:jira',
    'read:screen:jira',
    'read:status:jira',
    'read:user:jira',
    'read:webhook:jira',
    'read:workflow:jira',
  ],

  // ── Jira — Labels ────────────────────────────────────────────────────────────
  // GET /rest/api/3/label
  //   x-atlassian-oauth2-scopes Beta: read:label:jira
  'jira.labels.list': ['read:label:jira'],
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
 * // → ['read:issue:jira', 'read:issue-meta:jira', ..., 'write:page:confluence']
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
 * Complete validator catalog. The scope type and runtime set share these
 * canonical arrays so a spec-derived scope cannot be added to one without the
 * other.
 */
const KNOWN_SCOPES: ReadonlySet<AtlassianScope> = new Set([
  ...CONFLUENCE_GRANULAR_SCOPES,
  ...JIRA_SOFTWARE_GRANULAR_SCOPES,
  ...JIRA_PLATFORM_GRANULAR_SCOPES,
  ...ADDITIONAL_RECOGNIZED_SCOPES,
]);

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
 * validateScopes(['read:issue:jira', 'write:made-up'])
 * // → { valid: ['read:issue:jira'], unknown: ['write:made-up'] }
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
