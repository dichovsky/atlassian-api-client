/**
 * Atlassian Cloud OAuth 2.0 scope detection.
 *
 * Maps operation names (e.g. `'jira.issues.get'`) to the minimal set of
 * OAuth 2.0 scopes required to perform them.
 */

/** Well-known Atlassian Cloud OAuth 2.0 scopes. */
export type AtlassianScope =
  // Confluence
  | 'read:confluence-content.all'
  | 'read:confluence-content.summary'
  | 'write:confluence-content'
  | 'read:confluence-space.summary'
  | 'read:confluence-user'
  | 'read:confluence-props'
  | 'write:confluence-props'
  | 'read:confluence-content.permission'
  // Jira
  | 'read:jira-work'
  | 'write:jira-work'
  | 'manage:jira-project'
  | 'manage:jira-configuration'
  | 'read:jira-user'
  | 'manage:jira-webhook'
  | 'manage:jira-data-provider';

/** Registry mapping operation names to their required OAuth scopes. */
const OPERATION_SCOPES: Readonly<Record<string, readonly AtlassianScope[]>> = {
  // Confluence — Pages
  'confluence.pages.list': ['read:confluence-content.all'],
  'confluence.pages.get': ['read:confluence-content.all'],
  'confluence.pages.create': ['write:confluence-content'],
  'confluence.pages.update': ['write:confluence-content'],
  'confluence.pages.delete': ['write:confluence-content'],

  // Confluence — Spaces
  'confluence.spaces.list': ['read:confluence-space.summary'],
  'confluence.spaces.get': ['read:confluence-space.summary'],

  // Confluence — Blog posts
  'confluence.blogPosts.list': ['read:confluence-content.all'],
  'confluence.blogPosts.get': ['read:confluence-content.all'],
  'confluence.blogPosts.create': ['write:confluence-content'],
  'confluence.blogPosts.update': ['write:confluence-content'],
  'confluence.blogPosts.delete': ['write:confluence-content'],

  // Confluence — Comments
  'confluence.comments.list': ['read:confluence-content.all'],
  'confluence.comments.get': ['read:confluence-content.all'],
  'confluence.comments.create': ['write:confluence-content'],
  'confluence.comments.update': ['write:confluence-content'],
  'confluence.comments.delete': ['write:confluence-content'],

  // Confluence — Attachments
  'confluence.attachments.list': ['read:confluence-content.all'],
  'confluence.attachments.get': ['read:confluence-content.all'],
  'confluence.attachments.upload': ['write:confluence-content'],
  'confluence.attachments.delete': ['write:confluence-content'],

  // Confluence — Labels
  'confluence.labels.list': ['read:confluence-content.all'],

  // Confluence — Content properties
  'confluence.contentProperties.list': ['read:confluence-props'],
  'confluence.contentProperties.get': ['read:confluence-props'],
  'confluence.contentProperties.create': ['write:confluence-props'],
  'confluence.contentProperties.update': ['write:confluence-props'],
  'confluence.contentProperties.delete': ['write:confluence-props'],

  // Confluence — Custom content
  'confluence.customContent.list': ['read:confluence-content.all'],
  'confluence.customContent.get': ['read:confluence-content.all'],
  'confluence.customContent.create': ['write:confluence-content'],
  'confluence.customContent.update': ['write:confluence-content'],
  'confluence.customContent.delete': ['write:confluence-content'],

  // Confluence — Whiteboards
  'confluence.whiteboards.get': ['read:confluence-content.all'],
  'confluence.whiteboards.create': ['write:confluence-content'],
  'confluence.whiteboards.delete': ['write:confluence-content'],

  // Confluence — Tasks
  'confluence.tasks.list': ['read:confluence-content.all'],
  'confluence.tasks.get': ['read:confluence-content.all'],
  'confluence.tasks.update': ['write:confluence-content'],

  // Confluence — Versions
  'confluence.versions.list': ['read:confluence-content.all'],
  'confluence.versions.get': ['read:confluence-content.all'],

  // Jira — Issues
  'jira.issues.get': ['read:jira-work'],
  'jira.issues.create': ['write:jira-work'],
  'jira.issues.update': ['write:jira-work'],
  'jira.issues.delete': ['write:jira-work'],
  'jira.issues.transition': ['write:jira-work'],

  // Jira — Projects
  'jira.projects.list': ['read:jira-work'],
  'jira.projects.get': ['read:jira-work'],

  // Jira — Users
  'jira.users.get': ['read:jira-user'],
  'jira.users.getCurrentUser': ['read:jira-user'],
  'jira.users.search': ['read:jira-user'],

  // Jira — Search
  'jira.search.search': ['read:jira-work'],
  'jira.search.searchGet': ['read:jira-work'],

  // Jira — Issue comments
  'jira.issueComments.list': ['read:jira-work'],
  'jira.issueComments.get': ['read:jira-work'],
  'jira.issueComments.create': ['write:jira-work'],
  'jira.issueComments.update': ['write:jira-work'],
  'jira.issueComments.delete': ['write:jira-work'],

  // Jira — Issue attachments
  'jira.issueAttachments.list': ['read:jira-work'],
  'jira.issueAttachments.get': ['read:jira-work'],
  'jira.issueAttachments.upload': ['write:jira-work'],

  // Jira — Boards & Sprints
  'jira.boards.list': ['read:jira-work'],
  'jira.boards.get': ['read:jira-work'],
  'jira.boards.getIssues': ['read:jira-work'],
  'jira.sprints.list': ['read:jira-work'],
  'jira.sprints.get': ['read:jira-work'],
  'jira.sprints.create': ['manage:jira-project'],
  'jira.sprints.update': ['manage:jira-project'],
  'jira.sprints.delete': ['manage:jira-project'],

  // Jira — Dashboards
  'jira.dashboards.list': ['read:jira-work'],
  'jira.dashboards.get': ['read:jira-work'],
  'jira.dashboards.create': ['write:jira-work'],
  'jira.dashboards.update': ['write:jira-work'],
  'jira.dashboards.delete': ['write:jira-work'],

  // Jira — Filters
  'jira.filters.list': ['read:jira-work'],
  'jira.filters.get': ['read:jira-work'],
  'jira.filters.create': ['write:jira-work'],
  'jira.filters.update': ['write:jira-work'],
  'jira.filters.delete': ['write:jira-work'],

  // Jira — Fields
  'jira.fields.list': ['manage:jira-configuration'],
  'jira.fields.create': ['manage:jira-configuration'],
  'jira.fields.update': ['manage:jira-configuration'],
  'jira.fields.delete': ['manage:jira-configuration'],

  // Jira — Webhooks
  'jira.webhooks.list': ['manage:jira-webhook'],
  'jira.webhooks.register': ['manage:jira-webhook'],
  'jira.webhooks.delete': ['manage:jira-webhook'],

  // Jira — JQL
  'jira.jql.getAutocompleteData': ['read:jira-work'],
  'jira.jql.parse': ['read:jira-work'],
  'jira.jql.sanitize': ['read:jira-work'],
  'jira.jql.getSuggestions': ['read:jira-work'],

  // Jira — Bulk
  'jira.bulk.createBulk': ['write:jira-work'],
  'jira.bulk.setPropertyBulk': ['write:jira-work'],
  'jira.bulk.deletePropertyBulk': ['write:jira-work'],

  // Jira — Workflows
  'jira.workflows.list': ['manage:jira-configuration'],
  'jira.workflows.get': ['manage:jira-configuration'],

  // Jira — Labels
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
 * // → ['read:jira-work', 'write:confluence-content']
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
