import type { ClientConfig, Transport } from '../core/types.js';
import { resolveConfig } from '../core/config.js';
import { HttpTransport } from '../core/transport.js';
import { PagesResource } from './resources/pages.js';
import { SpacesResource } from './resources/spaces.js';
import { BlogPostsResource } from './resources/blog-posts.js';
import { CommentsResource } from './resources/comments.js';
import { AttachmentsResource } from './resources/attachments.js';
import { LabelsResource } from './resources/labels.js';
import { ContentPropertiesResource } from './resources/content-properties.js';
import { CustomContentResource } from './resources/custom-content.js';
import { WhiteboardsResource } from './resources/whiteboards.js';
import { TasksResource } from './resources/tasks.js';
import { VersionsResource } from './resources/versions.js';

/** Client for the Atlassian Confluence Cloud REST API v2. */
export class ConfluenceClient {
  readonly pages: PagesResource;
  readonly spaces: SpacesResource;
  readonly blogPosts: BlogPostsResource;
  readonly comments: CommentsResource;
  readonly attachments: AttachmentsResource;
  readonly labels: LabelsResource;
  /** Content properties resource. */
  readonly contentProperties: ContentPropertiesResource;
  /** Custom content resource. */
  readonly customContent: CustomContentResource;
  /** Whiteboards resource. */
  readonly whiteboards: WhiteboardsResource;
  /** Tasks resource. */
  readonly tasks: TasksResource;
  /** Versions resource. */
  readonly versions: VersionsResource;

  constructor(config: ClientConfig) {
    const resolved = resolveConfig(config);
    const baseUrl = `${resolved.baseUrl}/wiki/api/v2`;
    const transport: Transport = config.transport ?? new HttpTransport({ ...resolved, baseUrl });

    this.pages = new PagesResource(transport, baseUrl);
    this.spaces = new SpacesResource(transport, baseUrl);
    this.blogPosts = new BlogPostsResource(transport, baseUrl);
    this.comments = new CommentsResource(transport, baseUrl);
    this.attachments = new AttachmentsResource(transport, baseUrl);
    this.labels = new LabelsResource(transport, baseUrl);
    this.contentProperties = new ContentPropertiesResource(transport, baseUrl);
    this.customContent = new CustomContentResource(transport, baseUrl);
    this.whiteboards = new WhiteboardsResource(transport, baseUrl);
    this.tasks = new TasksResource(transport, baseUrl);
    this.versions = new VersionsResource(transport, baseUrl);
  }
}
