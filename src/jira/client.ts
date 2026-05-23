import type { ClientConfig, Transport } from '../core/types.js';
import { resolveConfig } from '../core/config.js';
import { HttpTransport } from '../core/transport.js';
import { IssuesResource } from './resources/issues.js';
import { ProjectsResource } from './resources/projects.js';
import { SearchResource } from './resources/search.js';
import { UsersResource } from './resources/users.js';
import { IssueTypesResource } from './resources/issue-types.js';
import { PrioritiesResource } from './resources/priorities.js';
import { StatusesResource } from './resources/statuses.js';
import { IssueCommentsResource } from './resources/issue-comments.js';
import { IssueAttachmentsResource } from './resources/issue-attachments.js';
import { LabelsResource } from './resources/labels.js';
import { BoardsResource } from './resources/boards.js';
import { SprintsResource } from './resources/sprints.js';
import { WorkflowsResource } from './resources/workflows.js';
import { DashboardsResource } from './resources/dashboards.js';
import { FiltersResource } from './resources/filters.js';
import { FieldsResource } from './resources/fields.js';
import { WebhooksResource } from './resources/webhooks.js';
import { JqlResource } from './resources/jql.js';
import { BulkResource } from './resources/bulk.js';
import { EpicResource } from './resources/epic.js';
import { BacklogResource } from './resources/backlog.js';
import { AnnouncementBannerResource } from './resources/announcement-banner.js';
import { ApplicationRoleResource } from './resources/application-role.js';
import { DataPolicyResource } from './resources/data-policy.js';
import { StatusResource } from './resources/status.js';
import { StatusCategoryResource } from './resources/status-category.js';
import { ServerInfoResource } from './resources/server-info.js';
import { InstanceResource } from './resources/instance.js';
import { MyPermissionsResource } from './resources/mypermissions.js';
import { AuditingResource } from './resources/auditing.js';
import { EventsResource } from './resources/events.js';
import { ChangelogResource } from './resources/changelog.js';
import { ForgeResource } from './resources/forge.js';

/** Client for the Atlassian Jira Cloud Platform REST API v3. */
export class JiraClient {
  readonly issues: IssuesResource;
  readonly projects: ProjectsResource;
  readonly search: SearchResource;
  readonly users: UsersResource;
  readonly issueTypes: IssueTypesResource;
  readonly priorities: PrioritiesResource;
  readonly statuses: StatusesResource;
  /** Issue comments resource. */
  readonly issueComments: IssueCommentsResource;
  /** Issue attachments resource. */
  readonly issueAttachments: IssueAttachmentsResource;
  /** Labels resource. */
  readonly labels: LabelsResource;
  /** Agile boards resource. */
  readonly boards: BoardsResource;
  /** Agile sprints resource. */
  readonly sprints: SprintsResource;
  /** Workflows resource. */
  readonly workflows: WorkflowsResource;
  /** Dashboards resource. */
  readonly dashboards: DashboardsResource;
  /** Filters resource. */
  readonly filters: FiltersResource;
  /** Fields resource. */
  readonly fields: FieldsResource;
  /** Webhooks resource. */
  readonly webhooks: WebhooksResource;
  /** JQL utilities resource. */
  readonly jql: JqlResource;
  /** Bulk issue operations resource. */
  readonly bulk: BulkResource;
  /** Agile epic resource. */
  readonly epic: EpicResource;
  /** Agile backlog resource. */
  readonly backlog: BacklogResource;
  /** Announcement banner resource. */
  readonly announcementBanner: AnnouncementBannerResource;
  /** Application role resource. */
  readonly applicationRole: ApplicationRoleResource;
  /** App data policies resource. */
  readonly dataPolicy: DataPolicyResource;
  /** Workflow status resource (GET /rest/api/3/status). */
  readonly status: StatusResource;
  /** Workflow status category resource (GET /rest/api/3/statuscategory). */
  readonly statusCategory: StatusCategoryResource;
  /** Server info resource. */
  readonly serverInfo: ServerInfoResource;
  /** Instance information resource. */
  readonly instance: InstanceResource;
  /** My permissions resource. */
  readonly myPermissions: MyPermissionsResource;
  /** Audit log records resource. */
  readonly auditing: AuditingResource;
  /** Jira events (issue events) resource. */
  readonly events: EventsResource;
  /** Issue changelog bulk-fetch resource. */
  readonly changelog: ChangelogResource;
  /** Forge panel actions resource. */
  readonly forge: ForgeResource;

  constructor(config: ClientConfig) {
    const resolved = resolveConfig(config);
    const baseUrl = `${resolved.baseUrl}/rest/api/3`;
    const agileBaseUrl = `${resolved.baseUrl}/rest/agile/1.0`;
    const transport: Transport = config.transport ?? new HttpTransport({ ...resolved, baseUrl });

    this.issues = new IssuesResource(transport, baseUrl, agileBaseUrl);
    this.projects = new ProjectsResource(transport, baseUrl);
    this.search = new SearchResource(transport, baseUrl);
    this.users = new UsersResource(transport, baseUrl);
    this.issueTypes = new IssueTypesResource(transport, baseUrl);
    this.priorities = new PrioritiesResource(transport, baseUrl);
    this.statuses = new StatusesResource(transport, baseUrl);
    this.issueComments = new IssueCommentsResource(transport, baseUrl);
    this.issueAttachments = new IssueAttachmentsResource(transport, baseUrl);
    this.labels = new LabelsResource(transport, baseUrl);
    this.boards = new BoardsResource(transport, agileBaseUrl);
    this.sprints = new SprintsResource(transport, agileBaseUrl);
    this.workflows = new WorkflowsResource(transport, baseUrl);
    this.dashboards = new DashboardsResource(transport, baseUrl);
    this.filters = new FiltersResource(transport, baseUrl);
    this.fields = new FieldsResource(transport, baseUrl);
    this.webhooks = new WebhooksResource(transport, baseUrl);
    this.jql = new JqlResource(transport, baseUrl);
    this.bulk = new BulkResource(transport, baseUrl);
    this.epic = new EpicResource(transport, agileBaseUrl);
    this.backlog = new BacklogResource(transport, agileBaseUrl);
    this.announcementBanner = new AnnouncementBannerResource(transport, baseUrl);
    this.applicationRole = new ApplicationRoleResource(transport, baseUrl);
    this.dataPolicy = new DataPolicyResource(transport, baseUrl);
    this.status = new StatusResource(transport, baseUrl);
    this.statusCategory = new StatusCategoryResource(transport, baseUrl);
    this.serverInfo = new ServerInfoResource(transport, baseUrl);
    this.instance = new InstanceResource(transport, baseUrl);
    this.myPermissions = new MyPermissionsResource(transport, baseUrl);
    this.auditing = new AuditingResource(transport, baseUrl);
    this.events = new EventsResource(transport, baseUrl);
    this.changelog = new ChangelogResource(transport, baseUrl);
    this.forge = new ForgeResource(transport, baseUrl);
  }
}
