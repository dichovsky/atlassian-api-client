/**
 * Shared CLI dispatcher metadata for tests that need to walk per-resource
 * action lists in `src/cli/commands/{confluence,jira}.ts`.
 *
 * `DISPATCHER_FN_BY_RESOURCE` maps each top-level CLI resource key (the
 * `case 'resource':` string in `executeConfluenceCommand`/`executeJiraCommand`)
 * to the name of its own per-resource dispatcher function (`executeXxx`).
 * It's a single flat map — safe today only because Confluence and Jira
 * happen to name their dispatcher functions identically for every resource
 * key they share (`app`, `classification-levels`, `labels`, `users`).
 */
export const DISPATCHER_FN_BY_RESOURCE: Record<string, string> = {
  pages: 'executePages',
  spaces: 'executeSpaces',
  'blog-posts': 'executeBlogPosts',
  comments: 'executeComments',
  attachments: 'executeAttachments',
  labels: 'executeLabels',
  'admin-key': 'executeAdminKey',
  app: 'executeApp',
  'classification-levels': 'executeClassificationLevels',
  content: 'executeContent',
  'custom-content': 'executeCustomContent',
  'data-policies': 'executeDataPolicies',
  databases: 'executeDatabases',
  embeds: 'executeEmbeds',
  folders: 'executeFolders',
  'footer-comments': 'executeFooterComments',
  'inline-comments': 'executeInlineComments',
  'space-permissions': 'executeSpacePermissions',
  'space-role-mode': 'executeSpaceRoleMode',
  'space-roles': 'executeSpaceRoles',
  tasks: 'executeTasks',
  'users-bulk': 'executeUsersBulk',
  whiteboards: 'executeWhiteboards',
  issues: 'executeIssues',
  projects: 'executeProjects',
  search: 'executeSearch',
  users: 'executeUsers',
  'issue-types': 'executeIssueTypes',
  issuetype: 'executeIssueType',
  priorities: 'executePriorities',
  statuses: 'executeStatuses',
  boards: 'executeBoards',
  sprints: 'executeSprints',
  epic: 'executeEpic',
  backlog: 'executeBacklog',
  'announcement-banner': 'executeAnnouncementBanner',
  'application-role': 'executeApplicationRole',
  'data-policy': 'executeDataPolicy',
  webhooks: 'executeWebhooks',
  status: 'executeStatus',
  'status-category': 'executeStatusCategory',
  'server-info': 'executeServerInfo',
  instance: 'executeInstance',
  mypermissions: 'executeMyPermissions',
  mypreferences: 'executeMyPreferences',
  auditing: 'executeAuditing',
  events: 'executeEvents',
  changelog: 'executeChangelog',
  forge: 'executeForge',
  incidents: 'executeIncidents',
  'post-incident-reviews': 'executePostIncidentReviews',
  vulnerability: 'executeVulnerability',
  devopscomponents: 'executeDevopscomponents',
  groups: 'executeGroups',
  'group-user-picker': 'executeGroupUserPicker',
  'security-level': 'executeSecurityLevel',
  license: 'executeLicense',
  settings: 'executeSettings',
  redact: 'executeRedact',
  flag: 'executeFlag',
  task: 'executeTask',
  avatar: 'executeAvatar',
  'custom-field-option': 'executeCustomFieldOption',
  latest: 'executeLatest',
  'remote-link': 'executeRemoteLink',
  'service-registry': 'executeServiceRegistry',
  addons: 'executeAddons',
  'exists-by-properties': 'executeExistsByProperties',
  repository: 'executeRepository',
  dashboards: 'executeDashboards',
  'application-properties': 'executeApplicationProperties',
  configuration: 'executeConfiguration',
  bulk: 'executeBulk',
  'issue-attachments': 'executeIssueAttachments',
  component: 'executeComponent',
  filters: 'executeFilters',
  'issue-type-screen-schemes': 'executeIssueTypeScreenSchemes',
  'permission-schemes': 'executePermissionSchemes',
  'issue-type-schemes': 'executeIssueTypeSchemes',
  'notification-schemes': 'executeNotificationSchemes',
  roles: 'executeRoles',
  resolutions: 'executeResolutions',
  expression: 'executeExpression',
  'issue-comments': 'executeIssueComments',
  fieldconfiguration: 'executeFieldConfiguration',
  'priority-schemes': 'executePrioritySchemeResource',
  version: 'executeVersionResource',
  config: 'executeConfig',
  issuesecurityschemes: 'executeIssueSecuritySchemes',
  screens: 'executeScreens',
  screenscheme: 'executeScreenScheme',
  plans: 'executePlans',
  workflows: 'executeWorkflows',
  workflowscheme: 'executeWorkflowScheme',
  fields: 'executeFields',
  jql: 'executeJql',
  issuelinktype: 'executeIssueLinkType',
  'issue-link': 'executeIssueLink',
  'project-template': 'executeProjectTemplate',
  'universal-avatar': 'executeUniversalAvatar',
  worklog: 'executeWorklog',
  'ui-modifications': 'executeUiModifications',
  permissions: 'executePermissions',
  pipelines: 'executePipelines',
  'linked-workspaces': 'executeLinkedWorkspaces',
  'bulk-by-properties': 'executeBulkByProperties',
  migration: 'executeMigration',
};

/**
 * Parse top-level `case 'xxx':` entries from a dispatcher function body.
 * Returns the resource/action names in source order.
 */
export function parseCases(source: string, functionName: string): string[] {
  const startRegex = new RegExp(
    String.raw`(?:export\s+)?(?:async\s+)?function\s+${functionName}\s*\(`,
  );
  const startMatch = startRegex.exec(source);
  if (!startMatch) throw new Error(`function ${functionName} not found`);
  const start = startMatch.index;

  const nextRegex = /\n(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(/g;
  nextRegex.lastIndex = start + startMatch[0].length;
  const nextMatch = nextRegex.exec(source);
  const end = nextMatch ? nextMatch.index : source.length;

  const body = source.slice(start, end);
  return [...body.matchAll(/case '([^']+)':/g)].map((m) => m[1] as string);
}

/** Extract one resource's action list via its dispatcher function name. */
export function actionsForResource(source: string, resource: string): string[] {
  const fn = DISPATCHER_FN_BY_RESOURCE[resource];
  if (!fn) throw new Error(`no dispatcher mapping for ${resource}`);
  return parseCases(source, fn);
}
