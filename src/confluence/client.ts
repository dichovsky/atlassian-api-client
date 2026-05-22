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
import { AdminKeyResource } from './resources/admin-key.js';
import { AppResource } from './resources/app.js';
import { ClassificationLevelsResource } from './resources/classification-levels.js';
import { ContentResource } from './resources/content.js';
import { DataPoliciesResource } from './resources/data-policies.js';
import { DatabasesResource } from './resources/databases.js';
import { FoldersResource } from './resources/folders.js';
import { FooterCommentsResource } from './resources/footer-comments.js';
import { InlineCommentsResource } from './resources/inline-comments.js';
import { SpacePermissionsResource } from './resources/space-permissions.js';
import { SpaceRoleModeResource } from './resources/space-role-mode.js';
import { SpaceRolesResource } from './resources/space-roles.js';
import { UsersResource } from './resources/users.js';
import { UsersBulkResource } from './resources/users-bulk.js';

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
  /** Admin key resource. */
  readonly adminKey: AdminKeyResource;
  /** App properties resource (Forge / Connect app-scoped storage). */
  readonly app: AppResource;
  /** Classification levels resource. */
  readonly classificationLevels: ClassificationLevelsResource;
  /** Content resource (v1 → v2 id-to-type conversion). */
  readonly content: ContentResource;
  /** Data policies resource (`/data-policies/metadata` + `/data-policies/spaces`). */
  readonly dataPolicies: DataPoliciesResource;
  /** Databases resource (v2 `/databases` surface). */
  readonly databases: DatabasesResource;
  /** Folders resource (v2 `/folders` surface — lifecycle, hierarchy, properties). */
  readonly folders: FoldersResource;
  /**
   * Footer comments resource — tenant-wide listing plus per-comment
   * navigation (`/footer-comments`, `/footer-comments/{id}/{children,likes,operations,versions}`).
   */
  readonly footerComments: FooterCommentsResource;
  /**
   * Inline comments resource — tenant-wide list, children, likes, operations,
   * and version history (`/wiki/api/v2/inline-comments/…`). Per-page list and
   * the comment lifecycle (create / get / update / delete) live on
   * {@link CommentsResource}.
   */
  readonly inlineComments: InlineCommentsResource;
  /** Available space permissions resource. */
  readonly spacePermissions: SpacePermissionsResource;
  /** Space role mode resource. */
  readonly spaceRoleMode: SpaceRoleModeResource;
  /** Space roles resource (`/space-roles` CRUD surface). */
  readonly spaceRoles: SpaceRolesResource;
  /** Single-user access resource (check-access / invite by email). */
  readonly users: UsersResource;
  /** Users bulk lookup resource. */
  readonly usersBulk: UsersBulkResource;

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
    this.adminKey = new AdminKeyResource(transport, baseUrl);
    this.app = new AppResource(transport, baseUrl);
    this.classificationLevels = new ClassificationLevelsResource(transport, baseUrl);
    this.content = new ContentResource(transport, baseUrl);
    this.dataPolicies = new DataPoliciesResource(transport, baseUrl);
    this.databases = new DatabasesResource(transport, baseUrl);
    this.folders = new FoldersResource(transport, baseUrl);
    this.footerComments = new FooterCommentsResource(transport, baseUrl);
    this.inlineComments = new InlineCommentsResource(transport, baseUrl);
    this.spacePermissions = new SpacePermissionsResource(transport, baseUrl);
    this.spaceRoleMode = new SpaceRoleModeResource(transport, baseUrl);
    this.spaceRoles = new SpaceRolesResource(transport, baseUrl);
    this.users = new UsersResource(transport, baseUrl);
    this.usersBulk = new UsersBulkResource(transport, baseUrl);
  }
}
