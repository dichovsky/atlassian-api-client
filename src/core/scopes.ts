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
  | 'read:sprint:jira-software'
  | 'write:sprint:jira-software'
  | 'delete:sprint:jira-software'
  | 'read:jql:jira'
  // ── Jira Platform granular scopes (x-atlassian-oauth2-scopes state=Beta) ────
  // Issues
  | 'read:issue:jira'
  | 'read:issue-meta:jira'
  | 'read:issue-security-level:jira'
  | 'read:issue.vote:jira'
  | 'read:issue.changelog:jira'
  | 'read:field-configuration:jira'
  | 'write:issue:jira'
  | 'write:issue.property:jira'
  | 'delete:issue:jira'
  // Projects / common lookup
  | 'read:project:jira'
  | 'read:project.property:jira'
  | 'read:project-category:jira'
  | 'read:project-version:jira'
  | 'read:project.component:jira'
  | 'read:issue-type:jira'
  | 'read:issue-type-hierarchy:jira'
  | 'read:application-role:jira'
  | 'read:group:jira'
  | 'read:user:jira'
  | 'read:user.property:jira'
  | 'read:avatar:jira'
  | 'read:status:jira'
  // Search
  | 'read:audit-log:jira'
  | 'read:field:jira'
  | 'read:field.default-value:jira'
  | 'read:field.option:jira'
  // Comments
  | 'read:comment:jira'
  | 'read:comment.property:jira'
  | 'read:project-role:jira'
  | 'write:comment:jira'
  | 'write:comment.property:jira'
  | 'delete:comment:jira'
  | 'delete:comment.property:jira'
  // Attachments
  | 'read:attachment:jira'
  | 'write:attachment:jira'
  | 'delete:attachment:jira'
  // Dashboards
  | 'read:dashboard:jira'
  | 'write:dashboard:jira'
  | 'delete:dashboard:jira'
  // Filters
  | 'read:filter:jira'
  | 'write:filter:jira'
  | 'delete:filter:jira'
  // Fields
  | 'write:field:jira'
  | 'delete:field:jira'
  // Webhooks
  | 'read:webhook:jira'
  | 'write:webhook:jira'
  | 'delete:webhook:jira'
  // JQL
  | 'validate:jql:jira'
  | 'read:jira-expressions:jira'
  // Bulk issue properties
  | 'delete:issue.property:jira'
  // Workflows
  | 'read:workflow:jira'
  | 'read:screen:jira'
  // Labels
  | 'read:label:jira';

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
  //   x-atlassian-oauth2-scopes Beta: (all of the above) + write:filter:jira +
  //     read:issue-type:jira, read:project-category:jira, read:project-version:jira,
  //     read:project.component:jira
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
    'read:jql:jira',
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
  'read:sprint:jira-software': true,
  'write:sprint:jira-software': true,
  'delete:sprint:jira-software': true,
  'read:jql:jira': true,
  // Jira Platform granular (Beta) — Issues
  'read:issue:jira': true,
  'read:issue-meta:jira': true,
  'read:issue-security-level:jira': true,
  'read:issue.vote:jira': true,
  'read:issue.changelog:jira': true,
  'read:field-configuration:jira': true,
  'write:issue:jira': true,
  'write:issue.property:jira': true,
  'delete:issue:jira': true,
  // Jira Platform granular (Beta) — Projects / common lookup
  'read:project:jira': true,
  'read:project.property:jira': true,
  'read:project-category:jira': true,
  'read:project-version:jira': true,
  'read:project.component:jira': true,
  'read:issue-type:jira': true,
  'read:issue-type-hierarchy:jira': true,
  'read:application-role:jira': true,
  'read:group:jira': true,
  'read:user:jira': true,
  'read:user.property:jira': true,
  'read:avatar:jira': true,
  'read:status:jira': true,
  // Jira Platform granular (Beta) — Search
  'read:audit-log:jira': true,
  'read:field:jira': true,
  'read:field.default-value:jira': true,
  'read:field.option:jira': true,
  // Jira Platform granular (Beta) — Comments
  'read:comment:jira': true,
  'read:comment.property:jira': true,
  'read:project-role:jira': true,
  'write:comment:jira': true,
  'write:comment.property:jira': true,
  'delete:comment:jira': true,
  'delete:comment.property:jira': true,
  // Jira Platform granular (Beta) — Attachments
  'read:attachment:jira': true,
  'write:attachment:jira': true,
  'delete:attachment:jira': true,
  // Jira Platform granular (Beta) — Dashboards
  'read:dashboard:jira': true,
  'write:dashboard:jira': true,
  'delete:dashboard:jira': true,
  // Jira Platform granular (Beta) — Filters
  'read:filter:jira': true,
  'write:filter:jira': true,
  'delete:filter:jira': true,
  // Jira Platform granular (Beta) — Fields
  'write:field:jira': true,
  'delete:field:jira': true,
  // Jira Platform granular (Beta) — Webhooks
  'read:webhook:jira': true,
  'write:webhook:jira': true,
  'delete:webhook:jira': true,
  // Jira Platform granular (Beta) — JQL
  'validate:jql:jira': true,
  'read:jira-expressions:jira': true,
  // Jira Platform granular (Beta) — Bulk issue properties
  'delete:issue.property:jira': true,
  // Jira Platform granular (Beta) — Workflows
  'read:workflow:jira': true,
  'read:screen:jira': true,
  // Jira Platform granular (Beta) — Labels
  'read:label:jira': true,
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
