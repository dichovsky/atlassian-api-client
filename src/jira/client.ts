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

  constructor(config: ClientConfig) {
    const resolved = resolveConfig(config);
    const baseUrl = `${resolved.baseUrl}/rest/api/3`;
    const transport: Transport = config.transport ?? new HttpTransport(resolved, baseUrl);

    this.issues = new IssuesResource(transport, baseUrl);
    this.projects = new ProjectsResource(transport, baseUrl);
    this.search = new SearchResource(transport, baseUrl);
    this.users = new UsersResource(transport, baseUrl);
    this.issueTypes = new IssueTypesResource(transport, baseUrl);
    this.priorities = new PrioritiesResource(transport, baseUrl);
    this.statuses = new StatusesResource(transport, baseUrl);
    this.issueComments = new IssueCommentsResource(transport, baseUrl);
    this.issueAttachments = new IssueAttachmentsResource(transport, baseUrl);
    this.labels = new LabelsResource(transport, baseUrl);
  }
}
