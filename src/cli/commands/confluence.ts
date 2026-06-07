import type { GlobalOptions, ParsedCommand } from '../types.js';
import { ConfluenceClient } from '../../confluence/client.js';
import { buildClientConfig } from '../config.js';
import type {
  AttachmentSortOrder,
  AttachmentStatus,
  BlogPostBodyRepresentation,
  BlogPostLookupStatus,
  BlogPostSortOrder,
  ChildCustomContentSortOrder,
  ChildPageSortOrder,
  CommentSortOrder,
  CommentStatus,
  ContentSortOrder,
  CreateSpaceData,
  CustomContentSortOrder,
  DataPolicySpaceSortOrder,
  GetBlogPostParams,
  InlineCommentResolutionStatus,
  LabelPrefix,
  LabelSortOrder,
  PageSortOrder,
  SpaceRolePrincipalType,
  SpaceRoleType,
  VersionSortOrder,
  WhiteboardLocale,
  WhiteboardTemplateKey,
} from '../../confluence/index.js';

/** Execute a Confluence CLI command. Returns the data to be printed. */
export async function executeConfluenceCommand(
  cmd: ParsedCommand,
  globals: GlobalOptions,
): Promise<unknown> {
  const client = new ConfluenceClient(buildClientConfig(globals));

  switch (cmd.resource) {
    case 'pages':
      return executePages(client, cmd);
    case 'spaces':
      return executeSpaces(client, cmd);
    case 'blog-posts':
      return executeBlogPosts(client, cmd);
    case 'comments':
      return executeComments(client, cmd);
    case 'attachments':
      return executeAttachments(client, cmd);
    case 'labels':
      return executeLabels(client, cmd);
    case 'admin-key':
      return executeAdminKey(client, cmd);
    case 'app':
      return executeApp(client, cmd);
    case 'classification-levels':
      return executeClassificationLevels(client, cmd);
    case 'content':
      return executeContent(client, cmd);
    case 'custom-content':
      return executeCustomContent(client, cmd);
    case 'data-policies':
      return executeDataPolicies(client, cmd);
    case 'databases':
      return executeDatabases(client, cmd);
    case 'embeds':
      return executeEmbeds(client, cmd);
    case 'folders':
      return executeFolders(client, cmd);
    case 'footer-comments':
      return executeFooterComments(client, cmd);
    case 'inline-comments':
      return executeInlineComments(client, cmd);
    case 'space-permissions':
      return executeSpacePermissions(client, cmd);
    case 'space-role-mode':
      return executeSpaceRoleMode(client, cmd);
    case 'space-roles':
      return executeSpaceRoles(client, cmd);
    case 'tasks':
      return executeTasks(client, cmd);
    case 'users':
      return executeUsers(client, cmd);
    case 'users-bulk':
      return executeUsersBulk(client, cmd);
    case 'whiteboards':
      return executeWhiteboards(client, cmd);
    default:
      throw new Error(`Unknown Confluence resource: ${cmd.resource}. Use --help for usage.`);
  }
}

async function executePages(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.pages.list({
        spaceId: asString(opts['space-id']),
        title: asString(opts['title']),
        status: asString(opts['status']),
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
        'body-format': asString(opts['body-format']) as 'storage' | undefined,
      });
    case 'get':
      return client.pages.get(requireArg(cmd.positionalArgs[0], 'page ID'));
    case 'create':
      return client.pages.create({
        spaceId: requireOpt(opts['space-id'], '--space-id'),
        title: requireOpt(opts['title'], '--title'),
        body: makeBody(asString(opts['body'])),
      });
    case 'update': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.pages.update(requireArg(cmd.positionalArgs[0], 'page ID'), {
        id: requireArg(cmd.positionalArgs[0], 'page ID'),
        title: requireOpt(opts['title'], '--title'),
        status: 'current',
        version: {
          number: versionNum,
        },
        body: makeBody(asString(opts['body'])),
      });
    }
    case 'delete':
      await client.pages.delete(requireArg(cmd.positionalArgs[0], 'page ID'), {
        purge: opts['purge'] === true ? true : undefined,
      });
      return { deleted: true };

    // ── hierarchy (B170, B175, B176, B895) ────────────────────────────────
    case 'ancestors':
      return client.pages.listAncestors(requireArg(cmd.positionalArgs[0], 'page ID'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'descendants':
      return client.pages.listDescendants(requireArg(cmd.positionalArgs[0], 'page ID'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
        depth: asDepth(opts['depth']),
        cursor: asString(opts['cursor']),
      });
    case 'direct-children': {
      const sort = asEnum(opts['sort'], CONTENT_SORT_ORDERS, 'sort');
      return client.pages.listDirectChildren(requireArg(cmd.positionalArgs[0], 'page ID'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
        ...(sort !== undefined ? { sort } : {}),
      });
    }
    case 'children': {
      const sort = asEnum(opts['sort'], CHILD_PAGE_SORT_ORDERS, 'sort');
      return client.pages.listChildren(requireArg(cmd.positionalArgs[0], 'page ID'), {
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
        ...(sort !== undefined ? { sort } : {}),
      });
    }

    // ── classification level (B171-B173) ──────────────────────────────────
    case 'get-classification-level': {
      const clStatus = asEnum(opts['status'], CLASSIFICATION_STATUS, 'status');
      return client.pages.getClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'page ID'),
        clStatus !== undefined ? { status: clStatus } : undefined,
      );
    }
    case 'update-classification-level': {
      const pageStatus =
        asEnum(opts['status'], PAGE_CLASSIFICATION_STATUSES, 'status') ?? 'current';
      await client.pages.updateClassificationLevel(requireArg(cmd.positionalArgs[0], 'page ID'), {
        id: requireOpt(opts['level-id'], '--level-id'),
        status: pageStatus,
      });
      return { updated: true };
    }
    case 'reset-classification-level': {
      const pageStatus =
        asEnum(opts['status'], PAGE_CLASSIFICATION_STATUSES, 'status') ?? 'current';
      await client.pages.resetClassificationLevel(requireArg(cmd.positionalArgs[0], 'page ID'), {
        status: pageStatus,
      });
      return { reset: true };
    }

    // ── custom content (B174) ─────────────────────────────────────────────
    case 'custom-content': {
      const ccSort = asEnum(opts['sort'], CUSTOM_CONTENT_SORT_ORDERS, 'sort');
      const ccBodyFormat = asEnum(opts['body-format'], CUSTOM_CONTENT_BODY_FORMATS, 'body-format');
      return client.pages.listCustomContent(requireArg(cmd.positionalArgs[0], 'page ID'), {
        type: requireOpt(opts['type'], '--type'),
        ...(ccSort !== undefined ? { sort: ccSort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
        ...(ccBodyFormat !== undefined ? { 'body-format': ccBodyFormat } : {}),
      });
    }

    // ── likes (B177-B178) ─────────────────────────────────────────────────
    case 'likes-count':
      return client.pages.getLikeCount(requireArg(cmd.positionalArgs[0], 'page ID'));
    case 'likes-users':
      return client.pages.listLikeUsers(requireArg(cmd.positionalArgs[0], 'page ID'), {
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });

    // ── operations (B179) ─────────────────────────────────────────────────
    case 'operations':
      return client.pages.getOperations(requireArg(cmd.positionalArgs[0], 'page ID'));

    // ── redact (B180) ─────────────────────────────────────────────────────
    case 'redact': {
      // Body shape is non-trivial (`RedactPageData`), so the CLI accepts the
      // full payload as a single JSON value through `--value`. Mirrors the
      // blog-posts redact dispatch — convenience overrides `--created-at` /
      // `--clean-history` merge into the parsed `--value` payload and win
      // over its matching top-level keys.
      const rawPayload = requireOpt(opts['value'], '--value');
      const parsed = parseJsonValue(rawPayload);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('--value must be a JSON object describing the RedactPageData payload');
      }
      const payload: Record<string, unknown> = { ...(parsed as Record<string, unknown>) };
      if (typeof opts['created-at'] === 'string') {
        payload['createdAt'] = opts['created-at'];
      }
      if (opts['clean-history'] === true) {
        payload['cleanHistory'] = true;
      }
      if (typeof payload['createdAt'] !== 'string' || payload['createdAt'].length === 0) {
        throw new Error(
          '--value must include a "createdAt" timestamp (or supply --created-at on the command line)',
        );
      }
      return client.pages.redact(
        requireArg(cmd.positionalArgs[0], 'page ID'),
        payload as unknown as Parameters<typeof client.pages.redact>[1],
      );
    }

    // ── title (B181) ──────────────────────────────────────────────────────
    case 'update-title': {
      const titleStatus = asEnum(opts['status'], PAGE_TITLE_STATUSES, 'status') ?? 'current';
      return client.pages.updateTitle(requireArg(cmd.positionalArgs[0], 'page ID'), {
        status: titleStatus,
        title: requireOpt(opts['title'], '--title'),
      });
    }

    // ── content properties (B182-B187, CLI+skill for B184-B187) ────────────
    case 'list-properties':
      return client.pages.listProperties(requireArg(cmd.positionalArgs[0], 'page ID'), {
        key: asString(opts['key']),
        sort: asEnum(opts['sort'], PROPERTY_SORT_ORDERS, 'sort'),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'create-property':
      return client.pages.createProperty(requireArg(cmd.positionalArgs[0], 'page ID'), {
        key: requireOpt(opts['key'], '--key'),
        value: parseJsonValue(requireOpt(opts['value'], '--value')),
      });
    case 'get-property':
      return client.pages.getProperty(
        requireArg(cmd.positionalArgs[0], 'page ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
    case 'update-property': {
      const propVersionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.pages.updateProperty(
        requireArg(cmd.positionalArgs[0], 'page ID'),
        requireOpt(opts['property-id'], '--property-id'),
        {
          key: requireOpt(opts['key'], '--key'),
          value: parseJsonValue(requireOpt(opts['value'], '--value')),
          version: { number: propVersionNum },
        },
      );
    }
    case 'delete-property':
      await client.pages.deleteProperty(
        requireArg(cmd.positionalArgs[0], 'page ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
      return { deleted: true };

    // ── versions (B188 single version — CLI+skill only) ───────────────────
    case 'version': {
      const singleVerNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.versions.getForPage(requireArg(cmd.positionalArgs[0], 'page ID'), singleVerNum);
    }

    // ── B1020: versions list ──────────────────────────────────────────────
    // NOTE: ListVersionsParams only has limit+cursor (no sort/body-format)
    case 'versions':
      return client.versions.listForPage(requireArg(cmd.positionalArgs[0], 'page ID'), {
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });

    // ── B1019: footer / inline comments ──────────────────────────────────
    case 'footer-comments': {
      const fcSort = asEnum(opts['sort'], COMMENT_SORT_ORDERS, 'sort');
      const fcBodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      const fcStatus = asEnum(opts['status'], COMMENT_STATUSES, 'status');
      return client.pages.listFooterComments(requireArg(cmd.positionalArgs[0], 'page ID'), {
        ...(fcBodyFormat !== undefined ? { 'body-format': fcBodyFormat } : {}),
        ...(fcStatus !== undefined ? { status: fcStatus } : {}),
        ...(fcSort !== undefined ? { sort: fcSort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }
    case 'inline-comments': {
      const icSort = asEnum(opts['sort'], COMMENT_SORT_ORDERS, 'sort');
      const icBodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      const icStatus = asEnum(opts['status'], COMMENT_STATUSES, 'status');
      const icResolution = asEnum(
        opts['resolution-status'],
        INLINE_COMMENT_RESOLUTION_STATUSES,
        'resolution-status',
      );
      return client.pages.listInlineComments(requireArg(cmd.positionalArgs[0], 'page ID'), {
        ...(icBodyFormat !== undefined ? { 'body-format': icBodyFormat } : {}),
        ...(icStatus !== undefined ? { status: icStatus } : {}),
        ...(icResolution !== undefined ? { 'resolution-status': icResolution } : {}),
        ...(icSort !== undefined ? { sort: icSort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }

    // ── attachments upload (B893 — CLI+skill only) ────────────────────────
    case 'upload-attachment': {
      // Uses the existing `AttachmentsResource.upload(pageId, filename, blob, mime?)`
      // SDK method. The CLI reads the file from disk so callers don't have to
      // hand-roll a Blob — `--file <path>` is required, `--filename` overrides
      // the on-disk name when supplied, and `--media-type` overrides the
      // server-side MIME sniffing.
      const filePath = requireOpt(opts['file'], '--file');
      const { readFile } = await import('node:fs/promises');
      const { basename } = await import('node:path');
      const buffer = await readFile(filePath);
      const filename = asString(opts['filename']) ?? basename(filePath);
      const mimeType = asString(opts['media-type']);
      const blob = new Blob([new Uint8Array(buffer)]);
      return client.attachments.upload(
        requireArg(cmd.positionalArgs[0], 'page ID'),
        filename,
        blob,
        mimeType,
      );
    }

    default:
      throw new Error(
        `Unknown pages action: ${cmd.action}. Actions: list, get, create, update, delete, ancestors, descendants, direct-children, children, get-classification-level, update-classification-level, reset-classification-level, custom-content, likes-count, likes-users, operations, redact, update-title, list-properties, create-property, get-property, update-property, delete-property, version, versions, footer-comments, inline-comments, upload-attachment`,
      );
  }
}

async function executeSpaces(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.spaces.list({
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
      });
    case 'get':
      return client.spaces.get(requireArg(cmd.positionalArgs[0], 'space ID'));

    // ── lifecycle (B196) ──────────────────────────────────────────────────
    case 'create': {
      const description = asString(opts['description']);
      const copyFrom = asPositiveInt(
        opts['copy-space-access-configuration'],
        '--copy-space-access-configuration',
      );
      // The spec note on `description.representation` says: "only the 'plain'
      // representation is currently supported." We surface `--description` as
      // a plain string and fix `representation: 'plain'` here rather than
      // exposing an unsupported knob through the CLI surface.
      const data: Partial<CreateSpaceData> & { name: string } = {
        name: requireOpt(opts['name'], '--name'),
        ...(typeof opts['key'] === 'string' ? { key: opts['key'] } : {}),
        ...(typeof opts['alias'] === 'string' ? { alias: opts['alias'] } : {}),
        ...(description !== undefined
          ? { description: { value: description, representation: 'plain' } }
          : {}),
        ...(opts['private'] === true ? { createPrivateSpace: true } : {}),
        ...(typeof opts['template-key'] === 'string' ? { templateKey: opts['template-key'] } : {}),
        ...(copyFrom !== undefined ? { copySpaceAccessConfiguration: copyFrom } : {}),
      };
      return client.spaces.create(data);
    }

    // ── blog posts in space (B197) ────────────────────────────────────────
    case 'blog-posts': {
      const bpSort = asEnum(opts['sort'], BLOG_POST_SORT_ORDERS, 'sort');
      const bpStatus = asEnumArray(opts['status'], SPACE_BLOG_POST_STATUSES, 'status');
      const bpBodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      return client.spaces.listBlogPosts(requireArg(cmd.positionalArgs[0], 'space ID'), {
        ...(bpSort !== undefined ? { sort: bpSort } : {}),
        ...(bpStatus !== undefined ? { status: bpStatus } : {}),
        title: asString(opts['title']),
        ...(bpBodyFormat !== undefined ? { 'body-format': bpBodyFormat } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }

    // ── default classification level (B198-B200) ──────────────────────────
    case 'get-default-classification-level':
      return client.spaces.getDefaultClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'space ID'),
      );
    case 'update-default-classification-level':
      await client.spaces.updateDefaultClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'space ID'),
        { id: requireOpt(opts['level-id'], '--level-id') },
      );
      return { updated: true };
    case 'delete-default-classification-level':
      await client.spaces.deleteDefaultClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'space ID'),
      );
      return { deleted: true };

    // ── content labels (B201) ─────────────────────────────────────────────
    case 'content-labels': {
      const clSort = asEnum(opts['sort'], LABEL_SORT_ORDERS, 'sort');
      const clPrefix = asEnum(opts['prefix'], SPACE_CONTENT_LABEL_PREFIXES, 'prefix');
      return client.spaces.listContentLabels(requireArg(cmd.positionalArgs[0], 'space ID'), {
        ...(clPrefix !== undefined ? { prefix: clPrefix } : {}),
        ...(clSort !== undefined ? { sort: clSort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }

    // ── custom content in space (B202) ────────────────────────────────────
    case 'custom-content': {
      const ccBodyFormat = asEnum(opts['body-format'], CUSTOM_CONTENT_BODY_FORMATS, 'body-format');
      return client.spaces.listCustomContent(requireArg(cmd.positionalArgs[0], 'space ID'), {
        type: requireOpt(opts['type'], '--type'),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
        ...(ccBodyFormat !== undefined ? { 'body-format': ccBodyFormat } : {}),
      });
    }

    // ── labels on space entity (B203 — CLI+skill only) ────────────────────
    case 'labels': {
      const lblSort = asEnum(opts['sort'], LABEL_SORT_ORDERS, 'sort');
      const lblPrefix = asEnum(opts['prefix'], SPACE_CONTENT_LABEL_PREFIXES, 'prefix');
      return client.spaces.listLabels(requireArg(cmd.positionalArgs[0], 'space ID'), {
        ...(lblPrefix !== undefined ? { prefix: lblPrefix } : {}),
        ...(lblSort !== undefined ? { sort: lblSort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }

    // ── operations (B204) ─────────────────────────────────────────────────
    case 'operations':
      return client.spaces.getOperations(requireArg(cmd.positionalArgs[0], 'space ID'));

    // ── pages in space (B205) ─────────────────────────────────────────────
    case 'pages': {
      const pgSort = asEnum(opts['sort'], PAGE_SORT_ORDERS, 'sort');
      const pgDepth = asEnum(opts['depth'], SPACE_PAGE_DEPTHS, 'depth');
      const pgStatus = asEnumArray(opts['status'], SPACE_PAGE_STATUSES, 'status');
      const pgBodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      return client.spaces.listPages(requireArg(cmd.positionalArgs[0], 'space ID'), {
        ...(pgDepth !== undefined ? { depth: pgDepth } : {}),
        ...(pgSort !== undefined ? { sort: pgSort } : {}),
        ...(pgStatus !== undefined ? { status: pgStatus } : {}),
        title: asString(opts['title']),
        ...(pgBodyFormat !== undefined ? { 'body-format': pgBodyFormat } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }

    // ── permission assignments (B206) ─────────────────────────────────────
    case 'permissions':
      return client.spaces.listPermissions(requireArg(cmd.positionalArgs[0], 'space ID'), {
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });

    // ── role assignments (B207-B208) ──────────────────────────────────────
    case 'role-assignments': {
      const raRoleType = asEnum(opts['role-type'], SPACE_ROLE_TYPES, 'role-type');
      const raPrincipalType = asEnum(
        opts['principal-type'],
        SPACE_ROLE_PRINCIPAL_TYPES,
        'principal-type',
      );
      return client.spaces.listRoleAssignments(requireArg(cmd.positionalArgs[0], 'space ID'), {
        'role-id': asString(opts['role-id']),
        ...(raRoleType !== undefined ? { 'role-type': raRoleType } : {}),
        'principal-id': asString(opts['principal-id']),
        ...(raPrincipalType !== undefined ? { 'principal-type': raPrincipalType } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }
    case 'set-role-assignments': {
      // The wire format is a JSON array of `{ principal, roleId }` entries.
      // The CLI accepts the array verbatim through `--value` (same JSON-or-fall-back
      // semantics as `blog-posts redact` and `app upsert-property`).
      // The server returns 200 with a `MultiEntityResult<SpaceRoleAssignment>`
      // envelope — the confirmed, normalised assignment set after the replace.
      // We surface the body verbatim so callers can diff request vs response
      // and detect server-side principal/role canonicalisation.
      const raw = requireOpt(opts['value'], '--value');
      const parsed = parseJsonValue(raw);
      if (!Array.isArray(parsed)) {
        throw new Error(
          '--value must be a JSON array of `{ principal: { principalType, principalId }, roleId }` entries',
        );
      }
      return client.spaces.setRoleAssignments(
        requireArg(cmd.positionalArgs[0], 'space ID'),
        parsed as Parameters<typeof client.spaces.setRoleAssignments>[1],
      );
    }

    // ── space properties (B209-B213) ──────────────────────────────────────
    case 'list-properties': {
      const propSort = asEnum(opts['sort'], PROPERTY_SORT_ORDERS, 'sort');
      return client.spaces.listProperties(requireArg(cmd.positionalArgs[0], 'space ID'), {
        key: asString(opts['key']),
        ...(propSort !== undefined ? { sort: propSort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }
    case 'create-property':
      return client.spaces.createProperty(requireArg(cmd.positionalArgs[0], 'space ID'), {
        key: requireOpt(opts['key'], '--key'),
        value: parseJsonValue(requireOpt(opts['value'], '--value')),
      });
    case 'get-property':
      return client.spaces.getProperty(
        requireArg(cmd.positionalArgs[0], 'space ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
    case 'update-property': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.spaces.updateProperty(
        requireArg(cmd.positionalArgs[0], 'space ID'),
        requireOpt(opts['property-id'], '--property-id'),
        {
          key: requireOpt(opts['key'], '--key'),
          value: parseJsonValue(requireOpt(opts['value'], '--value')),
          version: { number: versionNum },
        },
      );
    }
    case 'delete-property':
      await client.spaces.deleteProperty(
        requireArg(cmd.positionalArgs[0], 'space ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
      return { deleted: true };

    default:
      throw new Error(
        `Unknown spaces action: ${cmd.action}. Actions: list, get, create, blog-posts, get-default-classification-level, update-default-classification-level, delete-default-classification-level, content-labels, custom-content, labels, operations, pages, permissions, role-assignments, set-role-assignments, list-properties, create-property, get-property, update-property, delete-property`,
      );
  }
}

async function executeBlogPosts(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.blogPosts.list({
        spaceId: asString(opts['space-id']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'get': {
      const getBlogId = requireArg(cmd.positionalArgs[0], 'blog post ID');
      const getParams = buildGetBlogPostParams(opts);
      return getParams !== undefined
        ? client.blogPosts.get(getBlogId, getParams)
        : client.blogPosts.get(getBlogId);
    }
    case 'create':
      return client.blogPosts.create({
        spaceId: requireOpt(opts['space-id'], '--space-id'),
        title: requireOpt(opts['title'], '--title'),
        body: makeBody(asString(opts['body'])),
      });
    case 'update': {
      const blogVersionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.blogPosts.update(requireArg(cmd.positionalArgs[0], 'blog post ID'), {
        id: requireArg(cmd.positionalArgs[0], 'blog post ID'),
        title: requireOpt(opts['title'], '--title'),
        status: 'current',
        version: {
          number: blogVersionNum,
        },
        body: makeBody(asString(opts['body'])),
      });
    }
    case 'delete':
      await client.blogPosts.delete(requireArg(cmd.positionalArgs[0], 'blog post ID'));
      return { deleted: true };

    // ── content properties (B066-B070) ────────────────────────────────────
    case 'list-properties':
      return client.blogPosts.listProperties(requireArg(cmd.positionalArgs[0], 'blog post ID'), {
        key: asString(opts['key']),
        sort: asEnum(opts['sort'], PROPERTY_SORT_ORDERS, 'sort'),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'create-property':
      return client.blogPosts.createProperty(requireArg(cmd.positionalArgs[0], 'blog post ID'), {
        key: requireOpt(opts['key'], '--key'),
        value: parseJsonValue(requireOpt(opts['value'], '--value')),
      });
    case 'get-property':
      return client.blogPosts.getProperty(
        requireArg(cmd.positionalArgs[0], 'blog post ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
    case 'update-property': {
      const propVersionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.blogPosts.updateProperty(
        requireArg(cmd.positionalArgs[0], 'blog post ID'),
        requireOpt(opts['property-id'], '--property-id'),
        {
          key: requireOpt(opts['key'], '--key'),
          value: parseJsonValue(requireOpt(opts['value'], '--value')),
          version: { number: propVersionNum },
        },
      );
    }
    case 'delete-property':
      await client.blogPosts.deleteProperty(
        requireArg(cmd.positionalArgs[0], 'blog post ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
      return { deleted: true };

    // ── attachments (B072) ────────────────────────────────────────────────
    case 'attachments': {
      const attSort = asEnum(opts['sort'], ATTACHMENT_SORT_ORDERS, 'sort');
      const attStatus = asEnumArray(opts['status'], ATTACHMENT_STATUSES, 'status');
      return client.blogPosts.listAttachments(requireArg(cmd.positionalArgs[0], 'blog post ID'), {
        ...(attSort !== undefined ? { sort: attSort } : {}),
        ...(attStatus !== undefined ? { status: attStatus } : {}),
        cursor: asString(opts['cursor']),
        mediaType: asString(opts['media-type']),
        filename: asString(opts['filename']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }

    // ── classification level (B073-B075) ──────────────────────────────────
    case 'get-classification-level': {
      const clStatus = asEnum(opts['status'], CLASSIFICATION_STATUS, 'status');
      return client.blogPosts.getClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'blog post ID'),
        clStatus !== undefined ? { status: clStatus } : undefined,
      );
    }
    case 'update-classification-level':
      await client.blogPosts.updateClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'blog post ID'),
        { id: requireOpt(opts['level-id'], '--level-id'), status: 'current' },
      );
      return { updated: true };
    case 'reset-classification-level':
      await client.blogPosts.resetClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'blog post ID'),
      );
      return { reset: true };

    // ── custom content (B076) ─────────────────────────────────────────────
    case 'custom-content': {
      const ccSort = asEnum(opts['sort'], CUSTOM_CONTENT_SORT_ORDERS, 'sort');
      const ccBodyFormat = asEnum(opts['body-format'], CUSTOM_CONTENT_BODY_FORMATS, 'body-format');
      return client.blogPosts.listCustomContent(requireArg(cmd.positionalArgs[0], 'blog post ID'), {
        type: requireOpt(opts['type'], '--type'),
        ...(ccSort !== undefined ? { sort: ccSort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
        ...(ccBodyFormat !== undefined ? { 'body-format': ccBodyFormat } : {}),
      });
    }

    // ── footer / inline comments (B077-B078) ──────────────────────────────
    case 'footer-comments': {
      const fcSort = asEnum(opts['sort'], COMMENT_SORT_ORDERS, 'sort');
      const fcBodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      const fcStatus = asEnum(opts['status'], COMMENT_STATUSES, 'status');
      return client.blogPosts.listFooterComments(
        requireArg(cmd.positionalArgs[0], 'blog post ID'),
        {
          ...(fcBodyFormat !== undefined ? { 'body-format': fcBodyFormat } : {}),
          ...(fcStatus !== undefined ? { status: fcStatus } : {}),
          ...(fcSort !== undefined ? { sort: fcSort } : {}),
          cursor: asString(opts['cursor']),
          limit: asPositiveInt(opts['limit'], '--limit'),
        },
      );
    }
    case 'inline-comments': {
      const icSort = asEnum(opts['sort'], COMMENT_SORT_ORDERS, 'sort');
      const icBodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      const icStatus = asEnum(opts['status'], COMMENT_STATUSES, 'status');
      const icResolution = asEnum(
        opts['resolution-status'],
        INLINE_COMMENT_RESOLUTION_STATUSES,
        'resolution-status',
      );
      return client.blogPosts.listInlineComments(
        requireArg(cmd.positionalArgs[0], 'blog post ID'),
        {
          ...(icBodyFormat !== undefined ? { 'body-format': icBodyFormat } : {}),
          ...(icStatus !== undefined ? { status: icStatus } : {}),
          ...(icResolution !== undefined ? { 'resolution-status': icResolution } : {}),
          ...(icSort !== undefined ? { sort: icSort } : {}),
          cursor: asString(opts['cursor']),
          limit: asPositiveInt(opts['limit'], '--limit'),
        },
      );
    }

    // ── labels (B079, CLI+skill only — SDK method already shipped) ────────
    case 'labels': {
      const lblSort = asEnum(opts['sort'], LABEL_SORT_ORDERS, 'sort');
      const lblPrefix = asEnum(opts['prefix'], LABEL_PREFIXES, 'prefix');
      return client.blogPosts.listLabels(requireArg(cmd.positionalArgs[0], 'blog post ID'), {
        ...(lblPrefix !== undefined ? { prefix: lblPrefix } : {}),
        ...(lblSort !== undefined ? { sort: lblSort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }

    // ── likes (B080-B081) ─────────────────────────────────────────────────
    case 'likes-count':
      return client.blogPosts.getLikeCount(requireArg(cmd.positionalArgs[0], 'blog post ID'));
    case 'likes-users':
      return client.blogPosts.listLikeUsers(requireArg(cmd.positionalArgs[0], 'blog post ID'), {
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });

    // ── operations (B082) ─────────────────────────────────────────────────
    case 'operations':
      return client.blogPosts.getOperations(requireArg(cmd.positionalArgs[0], 'blog post ID'));

    // ── redact (B083) ─────────────────────────────────────────────────────
    case 'redact': {
      // Body shape is non-trivial (`RedactBlogPostData`), so the CLI accepts
      // the full payload as a single JSON value through `--value`. The
      // parser falls back to a string if the input isn't valid JSON, mirroring
      // `app upsert-property` / `*-property` semantics.
      const rawPayload = requireOpt(opts['value'], '--value');
      const parsed = parseJsonValue(rawPayload);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('--value must be a JSON object describing the RedactBlogPostData payload');
      }
      // Merge convenience overrides BEFORE the required-field check so the
      // user can satisfy `createdAt` via either `--value` or `--created-at`.
      // The router declares both `--clean-history` (boolean) and `--created-at`
      // (string) — overrides win over `--value` when both are present, which
      // matches CLI norms ("more specific flag wins").
      const payload: Record<string, unknown> = { ...(parsed as Record<string, unknown>) };
      if (typeof opts['created-at'] === 'string') {
        payload['createdAt'] = opts['created-at'];
      }
      if (opts['clean-history'] === true) {
        payload['cleanHistory'] = true;
      }
      // `createdAt` is required by the spec; fail fast at the CLI boundary
      // with a clear message instead of round-tripping to the server.
      if (typeof payload['createdAt'] !== 'string' || payload['createdAt'].length === 0) {
        throw new Error(
          '--value must include a "createdAt" timestamp (or supply --created-at on the command line)',
        );
      }
      return client.blogPosts.redact(
        requireArg(cmd.positionalArgs[0], 'blog post ID'),
        payload as unknown as Parameters<typeof client.blogPosts.redact>[1],
      );
    }

    // ── versions (B084 list, B071 single — CLI+skill only) ────────────────
    case 'versions': {
      const verSort = asEnum(opts['sort'], VERSION_SORT_ORDERS, 'sort');
      const verBodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      return client.blogPosts.listVersions(requireArg(cmd.positionalArgs[0], 'blog post ID'), {
        ...(verBodyFormat !== undefined ? { 'body-format': verBodyFormat } : {}),
        ...(verSort !== undefined ? { sort: verSort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }
    case 'version': {
      const singleVerNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.versions.getForBlogPost(
        requireArg(cmd.positionalArgs[0], 'blog post ID'),
        singleVerNum,
      );
    }

    default:
      throw new Error(
        `Unknown blog-posts action: ${cmd.action}. Actions: list, get, create, update, delete, list-properties, create-property, get-property, update-property, delete-property, attachments, get-classification-level, update-classification-level, reset-classification-level, custom-content, footer-comments, inline-comments, labels, likes-count, likes-users, operations, redact, versions, version`,
      );
  }
}

async function executeComments(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;
  const commentType = asString(opts['comment-type']) ?? 'footer';

  switch (cmd.action) {
    case 'list':
      if (commentType === 'inline') {
        return client.comments.listInline(requireOpt(opts['page-id'], '--page-id'));
      }
      return client.comments.listFooter(requireOpt(opts['page-id'], '--page-id'));
    case 'get':
      if (commentType === 'inline') {
        return client.comments.getInline(requireArg(cmd.positionalArgs[0], 'comment ID'));
      }
      return client.comments.getFooter(requireArg(cmd.positionalArgs[0], 'comment ID'));
    case 'create': {
      const payload = {
        pageId: asString(opts['page-id']),
        body: {
          representation: 'storage' as const,
          value: requireOpt(opts['body'], '--body'),
        },
      };
      return commentType === 'inline'
        ? client.comments.createInline(payload)
        : client.comments.createFooter(payload);
    }
    case 'delete':
      if (commentType === 'inline') {
        await client.comments.deleteInline(requireArg(cmd.positionalArgs[0], 'comment ID'));
      } else {
        await client.comments.deleteFooter(requireArg(cmd.positionalArgs[0], 'comment ID'));
      }
      return { deleted: true };
    case 'update': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      const body = {
        representation: 'storage' as const,
        value: requireOpt(opts['body'], '--body'),
      };
      if (commentType === 'inline') {
        const resolved =
          opts['resolved'] === true ? true : opts['no-resolved'] === true ? false : undefined;
        return client.comments.updateInline(requireArg(cmd.positionalArgs[0], 'comment ID'), {
          version: { number: versionNum },
          body,
          ...(resolved !== undefined && { resolved }),
        });
      }
      return client.comments.updateFooter(requireArg(cmd.positionalArgs[0], 'comment ID'), {
        version: { number: versionNum },
        body,
      });
    }
    case 'list-properties':
      return client.comments.listProperties(requireArg(cmd.positionalArgs[0], 'comment ID'), {
        key: asString(opts['key']),
        sort: asEnum(opts['sort'], PROPERTY_SORT_ORDERS, 'sort'),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'create-property':
      return client.comments.createProperty(requireArg(cmd.positionalArgs[0], 'comment ID'), {
        key: requireOpt(opts['key'], '--key'),
        value: parseJsonValue(requireOpt(opts['value'], '--value')),
      });
    case 'get-property':
      return client.comments.getProperty(
        requireArg(cmd.positionalArgs[0], 'comment ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
    case 'update-property': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.comments.updateProperty(
        requireArg(cmd.positionalArgs[0], 'comment ID'),
        requireOpt(opts['property-id'], '--property-id'),
        {
          key: requireOpt(opts['key'], '--key'),
          value: parseJsonValue(requireOpt(opts['value'], '--value')),
          version: { number: versionNum },
        },
      );
    }
    case 'delete-property':
      await client.comments.deleteProperty(
        requireArg(cmd.positionalArgs[0], 'comment ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
      return { deleted: true };
    default:
      throw new Error(
        `Unknown comments action: ${cmd.action}. Actions: list, get, create, update, delete, list-properties, create-property, get-property, update-property, delete-property`,
      );
  }
}

async function executeAttachments(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.attachments.listForPage(requireOpt(opts['page-id'], '--page-id'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
      });
    case 'list-all': {
      const sort = asEnum(opts['sort'], ATTACHMENT_SORT_ORDERS, 'sort');
      const status = parseAttachmentStatuses(asString(opts['status']));
      return client.attachments.list({
        ...(sort !== undefined ? { sort } : {}),
        cursor: asString(opts['cursor']),
        ...(status !== undefined ? { status } : {}),
        mediaType: asString(opts['media-type']),
        filename: asString(opts['filename']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }
    case 'get':
      return client.attachments.get(requireArg(cmd.positionalArgs[0], 'attachment ID'), {
        version: asPositiveInt(opts['version-number'], '--version-number'),
        'include-labels': opts['include-labels'] === true ? true : undefined,
        'include-properties': opts['include-properties'] === true ? true : undefined,
        'include-operations': opts['include-operations'] === true ? true : undefined,
        'include-versions': opts['include-versions'] === true ? true : undefined,
        'include-version': opts['include-version'] === true ? true : undefined,
        'include-collaborators': opts['include-collaborators'] === true ? true : undefined,
      });
    case 'delete': {
      const purge = opts['purge'] === true ? true : undefined;
      await client.attachments.delete(
        requireArg(cmd.positionalArgs[0], 'attachment ID'),
        purge === undefined ? undefined : { purge },
      );
      return { deleted: true };
    }
    case 'list-properties':
      return client.attachments.listProperties(requireArg(cmd.positionalArgs[0], 'attachment ID'), {
        key: asString(opts['key']),
        sort: asEnum(opts['sort'], PROPERTY_SORT_ORDERS, 'sort'),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'create-property':
      return client.attachments.createProperty(requireArg(cmd.positionalArgs[0], 'attachment ID'), {
        key: requireOpt(opts['key'], '--key'),
        value: parseJsonValue(requireOpt(opts['value'], '--value')),
      });
    case 'get-property':
      return client.attachments.getProperty(
        requireArg(cmd.positionalArgs[0], 'attachment ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
    case 'update-property': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.attachments.updateProperty(
        requireArg(cmd.positionalArgs[0], 'attachment ID'),
        requireOpt(opts['property-id'], '--property-id'),
        {
          key: requireOpt(opts['key'], '--key'),
          value: parseJsonValue(requireOpt(opts['value'], '--value')),
          version: { number: versionNum },
        },
      );
    }
    case 'delete-property':
      await client.attachments.deleteProperty(
        requireArg(cmd.positionalArgs[0], 'attachment ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
      return { deleted: true };
    case 'versions': {
      const sort = asEnum(opts['sort'], VERSION_SORT_ORDERS, 'sort');
      return client.attachments.listVersions(requireArg(cmd.positionalArgs[0], 'attachment ID'), {
        ...(sort !== undefined ? { sort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }
    case 'get-version': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.attachments.getVersion(
        requireArg(cmd.positionalArgs[0], 'attachment ID'),
        versionNum,
      );
    }
    case 'footer-comments': {
      const sort = asEnum(opts['sort'], COMMENT_SORT_ORDERS, 'sort');
      const bodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      return client.attachments.listFooterComments(
        requireArg(cmd.positionalArgs[0], 'attachment ID'),
        {
          ...(bodyFormat !== undefined ? { 'body-format': bodyFormat } : {}),
          ...(sort !== undefined ? { sort } : {}),
          cursor: asString(opts['cursor']),
          limit: asPositiveInt(opts['limit'], '--limit'),
          version: asPositiveInt(opts['version-number'], '--version-number'),
        },
      );
    }
    case 'labels': {
      const sort = asEnum(opts['sort'], LABEL_SORT_ORDERS, 'sort');
      const prefix = asEnum(opts['prefix'], LABEL_PREFIXES, 'prefix');
      return client.attachments.listLabels(requireArg(cmd.positionalArgs[0], 'attachment ID'), {
        ...(prefix !== undefined ? { prefix } : {}),
        ...(sort !== undefined ? { sort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }
    case 'operations':
      return client.attachments.getOperations(requireArg(cmd.positionalArgs[0], 'attachment ID'));
    case 'thumbnail': {
      const buffer = await client.attachments.downloadThumbnail(
        requireArg(cmd.positionalArgs[0], 'attachment ID'),
        {
          version: asPositiveInt(opts['version-number'], '--version-number'),
          width: asPositiveInt(opts['width'], '--width'),
          height: asPositiveInt(opts['height'], '--height'),
        },
      );
      // The thumbnail body is binary; expose its byte length so the CLI's
      // JSON formatter renders a useful confirmation (the bytes themselves
      // belong on stdout/a file via the SDK, not in the structured CLI
      // output).
      return { downloaded: true, byteLength: buffer.byteLength };
    }
    default:
      throw new Error(
        `Unknown attachments action: ${cmd.action}. Actions: list, list-all, get, delete, list-properties, create-property, get-property, update-property, delete-property, versions, get-version, footer-comments, labels, operations, thumbnail`,
      );
  }
}

/**
 * Parse the `--status` CLI flag into a non-empty list of
 * {@link AttachmentStatus} values. Accepts a single value (`current`) or
 * comma-separated (`current,archived`); rejects unknown tokens with the
 * standard `must be one of` error to match other enum flags. Duplicate
 * tokens are collapsed so the wire format never carries `status=a,a`.
 */
function parseAttachmentStatuses(raw: string | undefined): readonly AttachmentStatus[] | undefined {
  if (raw === undefined) return undefined;
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length === 0) return undefined;
  for (const part of parts) {
    if (!(ATTACHMENT_STATUSES as readonly string[]).includes(part)) {
      throw new Error(`--status must be one of: ${ATTACHMENT_STATUSES.join(', ')}, got: ${part}`);
    }
  }
  const deduped = Array.from(new Set(parts));
  return deduped as readonly AttachmentStatus[];
}

async function executeAdminKey(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get':
      return client.adminKey.get();
    case 'create': {
      const durationRaw = opts['duration-hours'];
      const durationInHours = asPositiveInt(durationRaw, '--duration-hours');
      return client.adminKey.create(
        durationInHours !== undefined ? { durationInHours } : undefined,
      );
    }
    case 'delete':
      await client.adminKey.delete();
      return { deleted: true };
    default:
      throw new Error(`Unknown admin-key action: ${cmd.action}. Actions: get, create, delete`);
  }
}

async function executeLabels(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.labels.listForPage(requireOpt(opts['page-id'], '--page-id'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'list-all': {
      const sort = asEnum(opts['sort'], LABEL_SORT_ORDERS, 'sort');
      return client.labels.list({
        'label-id': normalizeOptionalString(asString(opts['label-id'])),
        prefix: normalizeOptionalString(asString(opts['prefix'])),
        ...(sort !== undefined ? { sort } : {}),
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
      });
    }
    case 'attachments': {
      const sort = asEnum(opts['sort'], ATTACHMENT_SORT_ORDERS, 'sort');
      return client.labels.listAttachments(requireArg(cmd.positionalArgs[0], 'label ID'), {
        ...(sort !== undefined ? { sort } : {}),
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
      });
    }
    case 'blog-posts': {
      const sort = asEnum(opts['sort'], BLOG_POST_SORT_ORDERS, 'sort');
      const bodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      return client.labels.listBlogPosts(requireArg(cmd.positionalArgs[0], 'label ID'), {
        'space-id': normalizeOptionalString(asString(opts['space-id'])),
        ...(bodyFormat !== undefined ? { 'body-format': bodyFormat } : {}),
        ...(sort !== undefined ? { sort } : {}),
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
      });
    }
    case 'pages': {
      const sort = asEnum(opts['sort'], PAGE_SORT_ORDERS, 'sort');
      const bodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      return client.labels.listPages(requireArg(cmd.positionalArgs[0], 'label ID'), {
        'space-id': normalizeOptionalString(asString(opts['space-id'])),
        ...(bodyFormat !== undefined ? { 'body-format': bodyFormat } : {}),
        ...(sort !== undefined ? { sort } : {}),
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
      });
    }

    // ── B1018: list labels FOR a space / blog post ────────────────────────
    case 'list-for-space': {
      const sort = asEnum(opts['sort'], LABEL_SORT_ORDERS, 'sort');
      const prefix = asEnum(opts['prefix'], LABEL_PREFIXES, 'prefix');
      return client.labels.listForSpace(requireArg(cmd.positionalArgs[0], 'space ID'), {
        ...(prefix !== undefined ? { prefix } : {}),
        ...(sort !== undefined ? { sort } : {}),
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
      });
    }
    case 'list-for-blog-post': {
      const sort = asEnum(opts['sort'], LABEL_SORT_ORDERS, 'sort');
      const prefix = asEnum(opts['prefix'], LABEL_PREFIXES, 'prefix');
      return client.labels.listForBlogPost(requireArg(cmd.positionalArgs[0], 'blog post ID'), {
        ...(prefix !== undefined ? { prefix } : {}),
        ...(sort !== undefined ? { sort } : {}),
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
      });
    }

    default:
      throw new Error(
        `Unknown labels action: ${cmd.action}. Actions: list, list-all, attachments, blog-posts, pages, list-for-space, list-for-blog-post`,
      );
  }
}

/**
 * Normalize an optional CLI string flag: trim whitespace and collapse the
 * empty case to `undefined`. The resource layer accepts the raw (possibly
 * comma-separated) string and forwards it as a single query value, so we
 * deliberately do not split — we only drop empties so callers can treat
 * "unset" and "blank" identically.
 */
function normalizeOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

async function executeApp(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list-properties':
      return client.app.listProperties({
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
      });
    case 'get-property':
      return client.app.getProperty(requireArg(cmd.positionalArgs[0], 'property key'));
    case 'upsert-property': {
      const propertyKey = requireArg(cmd.positionalArgs[0], 'property key');
      const rawValue = requireOpt(opts['value'], '--value');
      return client.app.upsertProperty(propertyKey, { value: parseJsonValue(rawValue) });
    }
    case 'delete-property':
      await client.app.deleteProperty(requireArg(cmd.positionalArgs[0], 'property key'));
      return { deleted: true };
    default:
      throw new Error(
        `Unknown app action: ${cmd.action}. Actions: list-properties, get-property, upsert-property, delete-property`,
      );
  }
}

/**
 * Parse `--value` from the CLI as JSON when possible, falling back to the raw
 * string. Confluence app properties accept arbitrary JSON values, so callers
 * should typically pass JSON (e.g. `--value '{"enabled":true}'`); a bare
 * unquoted string like `--value hello` is preserved as the string `"hello"`.
 */
function parseJsonValue(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

async function executeClassificationLevels(
  client: ConfluenceClient,
  cmd: ParsedCommand,
): Promise<unknown> {
  switch (cmd.action) {
    case 'list':
      return client.classificationLevels.list();
    default:
      throw new Error(`Unknown classification-levels action: ${cmd.action}. Actions: list`);
  }
}

async function executeContent(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'convert-ids-to-types': {
      const idsRaw = requireOpt(cmd.options['ids'], '--ids');
      const contentIds = parseContentIds(idsRaw);
      return client.content.convertIdsToTypes({ contentIds });
    }
    default:
      throw new Error(`Unknown content action: ${cmd.action}. Actions: convert-ids-to-types`);
  }
}

/**
 * Parse the `--ids` flag into a non-empty array of content ids. Accepts either
 * a JSON array (`'["1","2",3]'`) or a comma-separated string (`"1,2,3"`).
 * JSON wins when the raw value parses successfully; otherwise we fall back to
 * splitting on commas. Numeric strings stay strings — the server accepts both
 * forms and we don't want to silently coerce ids that happen to be all-digit.
 */
function parseContentIds(raw: string): readonly (string | number)[] {
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error(`--ids: invalid JSON array: ${raw}`);
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('--ids: expected a non-empty array of content ids');
    }
    for (const item of parsed) {
      if (typeof item !== 'string' && typeof item !== 'number') {
        throw new Error('--ids: array items must be strings or numbers');
      }
    }
    return parsed as readonly (string | number)[];
  }
  const parts = trimmed
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length === 0) {
    throw new Error('--ids: expected a non-empty list of content ids');
  }
  return parts;
}

async function executeCustomContent(
  client: ConfluenceClient,
  cmd: ParsedCommand,
): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    // ── lifecycle ─────────────────────────────────────────────────────────
    case 'list': {
      const bodyFormat = asEnum(opts['body-format'], CUSTOM_CONTENT_BODY_FORMATS, 'body-format');
      const sort = asEnum(opts['sort'], CUSTOM_CONTENT_SORT_ORDERS, 'sort');
      const spaceId = asString(opts['space-id']);
      return client.customContent.list({
        type: asString(opts['type']),
        id: asString(opts['id']),
        ...(spaceId !== undefined ? { 'space-id': spaceId } : {}),
        ...(sort !== undefined ? { sort } : {}),
        ...(bodyFormat !== undefined ? { 'body-format': bodyFormat } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }
    case 'get': {
      const bodyFormat = asEnum(
        opts['body-format'],
        CUSTOM_CONTENT_BODY_FORMATS_SINGLE,
        'body-format',
      );
      return client.customContent.get(requireArg(cmd.positionalArgs[0], 'custom content ID'), {
        ...(bodyFormat !== undefined ? { 'body-format': bodyFormat } : {}),
        version: asPositiveInt(opts['version-number'], '--version-number'),
        'include-labels': opts['include-labels'] === true ? true : undefined,
        'include-properties': opts['include-properties'] === true ? true : undefined,
        'include-operations': opts['include-operations'] === true ? true : undefined,
        'include-versions': opts['include-versions'] === true ? true : undefined,
        'include-version': opts['include-version'] === true ? true : undefined,
        'include-collaborators': opts['include-collaborators'] === true ? true : undefined,
      });
    }
    case 'create': {
      const body = makeCustomContentBody(requireOpt(opts['body'], '--body'));
      return client.customContent.create({
        type: requireOpt(opts['type'], '--type'),
        title: requireOpt(opts['title'], '--title'),
        body,
        spaceId: asString(opts['space-id']),
        pageId: asString(opts['page-id']),
        blogPostId: asString(opts['blog-post-id']),
        customContentId: asString(opts['custom-content-id']),
      });
    }
    case 'update': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      const id = requireArg(cmd.positionalArgs[0], 'custom content ID');
      const body = makeCustomContentBody(requireOpt(opts['body'], '--body'));
      return client.customContent.update(id, {
        id,
        type: requireOpt(opts['type'], '--type'),
        status: 'current',
        title: requireOpt(opts['title'], '--title'),
        body,
        version: { number: versionNum },
        spaceId: asString(opts['space-id']),
        pageId: asString(opts['page-id']),
        blogPostId: asString(opts['blog-post-id']),
        customContentId: asString(opts['custom-content-id']),
      });
    }
    case 'delete': {
      const purge = opts['purge'] === true ? true : undefined;
      await client.customContent.delete(
        requireArg(cmd.positionalArgs[0], 'custom content ID'),
        purge === undefined ? undefined : { purge },
      );
      return { deleted: true };
    }

    // ── content properties (B094-B098) ────────────────────────────────────
    case 'list-properties':
      return client.customContent.listProperties(
        requireArg(cmd.positionalArgs[0], 'custom content ID'),
        {
          key: asString(opts['key']),
          sort: asEnum(opts['sort'], PROPERTY_SORT_ORDERS, 'sort'),
          cursor: asString(opts['cursor']),
          limit: asPositiveInt(opts['limit'], '--limit'),
        },
      );
    case 'create-property':
      return client.customContent.createProperty(
        requireArg(cmd.positionalArgs[0], 'custom content ID'),
        {
          key: requireOpt(opts['key'], '--key'),
          value: parseJsonValue(requireOpt(opts['value'], '--value')),
        },
      );
    case 'get-property':
      return client.customContent.getProperty(
        requireArg(cmd.positionalArgs[0], 'custom content ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
    case 'update-property': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.customContent.updateProperty(
        requireArg(cmd.positionalArgs[0], 'custom content ID'),
        requireOpt(opts['property-id'], '--property-id'),
        {
          key: requireOpt(opts['key'], '--key'),
          value: parseJsonValue(requireOpt(opts['value'], '--value')),
          version: { number: versionNum },
        },
      );
    }
    case 'delete-property':
      await client.customContent.deleteProperty(
        requireArg(cmd.positionalArgs[0], 'custom content ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
      return { deleted: true };

    // ── versions (B099-B100) ──────────────────────────────────────────────
    case 'versions': {
      const sort = asEnum(opts['sort'], VERSION_SORT_ORDERS, 'sort');
      const bodyFormat = asEnum(opts['body-format'], CUSTOM_CONTENT_BODY_FORMATS, 'body-format');
      return client.customContent.listVersions(
        requireArg(cmd.positionalArgs[0], 'custom content ID'),
        {
          ...(bodyFormat !== undefined ? { 'body-format': bodyFormat } : {}),
          ...(sort !== undefined ? { sort } : {}),
          cursor: asString(opts['cursor']),
          limit: asPositiveInt(opts['limit'], '--limit'),
        },
      );
    }
    case 'version': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.customContent.getVersion(
        requireArg(cmd.positionalArgs[0], 'custom content ID'),
        versionNum,
      );
    }

    // ── attachments (B104) ────────────────────────────────────────────────
    case 'attachments': {
      const sort = asEnum(opts['sort'], ATTACHMENT_SORT_ORDERS, 'sort');
      const status = asEnumArray(opts['status'], ATTACHMENT_STATUSES, 'status');
      return client.customContent.listAttachments(
        requireArg(cmd.positionalArgs[0], 'custom content ID'),
        {
          ...(sort !== undefined ? { sort } : {}),
          ...(status !== undefined ? { status } : {}),
          cursor: asString(opts['cursor']),
          mediaType: asString(opts['media-type']),
          filename: asString(opts['filename']),
          limit: asPositiveInt(opts['limit'], '--limit'),
        },
      );
    }

    // ── children (B105) ───────────────────────────────────────────────────
    case 'children': {
      const sort = asEnum(opts['sort'], CHILD_CUSTOM_CONTENT_SORT_ORDERS, 'sort');
      return client.customContent.listChildren(
        requireArg(cmd.positionalArgs[0], 'custom content ID'),
        {
          ...(sort !== undefined ? { sort } : {}),
          cursor: asString(opts['cursor']),
          limit: asPositiveInt(opts['limit'], '--limit'),
        },
      );
    }

    // ── footer comments (B106) ────────────────────────────────────────────
    case 'footer-comments': {
      const sort = asEnum(opts['sort'], COMMENT_SORT_ORDERS, 'sort');
      const bodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      return client.customContent.listFooterComments(
        requireArg(cmd.positionalArgs[0], 'custom content ID'),
        {
          ...(bodyFormat !== undefined ? { 'body-format': bodyFormat } : {}),
          ...(sort !== undefined ? { sort } : {}),
          cursor: asString(opts['cursor']),
          limit: asPositiveInt(opts['limit'], '--limit'),
        },
      );
    }

    // ── labels (B107) ─────────────────────────────────────────────────────
    case 'labels': {
      const sort = asEnum(opts['sort'], LABEL_SORT_ORDERS, 'sort');
      const prefix = asEnum(opts['prefix'], LABEL_PREFIXES, 'prefix');
      return client.customContent.listLabels(
        requireArg(cmd.positionalArgs[0], 'custom content ID'),
        {
          ...(prefix !== undefined ? { prefix } : {}),
          ...(sort !== undefined ? { sort } : {}),
          cursor: asString(opts['cursor']),
          limit: asPositiveInt(opts['limit'], '--limit'),
        },
      );
    }

    // ── operations (B108) ─────────────────────────────────────────────────
    case 'operations':
      return client.customContent.getOperations(
        requireArg(cmd.positionalArgs[0], 'custom content ID'),
      );

    default:
      throw new Error(
        `Unknown custom-content action: ${cmd.action}. Actions: list, get, create, update, delete, list-properties, create-property, get-property, update-property, delete-property, versions, version, attachments, children, footer-comments, labels, operations`,
      );
  }
}

/** Build a custom-content body envelope from a raw storage-format string. */
function makeCustomContentBody(value: string) {
  return { representation: 'storage' as const, value };
}

async function executeDataPolicies(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'get-metadata':
      return client.dataPolicies.getMetadata();
    case 'list-spaces': {
      const sort = asEnum(opts['sort'], DATA_POLICY_SPACE_SORT_ORDERS, 'sort');
      return client.dataPolicies.listSpaces({
        ids: parseCsvList(asString(opts['ids'])),
        keys: parseCsvList(asString(opts['keys'])),
        ...(sort !== undefined ? { sort } : {}),
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
      });
    }
    default:
      throw new Error(
        `Unknown data-policies action: ${cmd.action}. Actions: get-metadata, list-spaces`,
      );
  }
}

/**
 * Split a comma-separated CLI flag into a trimmed, non-empty array. Returns
 * `undefined` when the input is unset so optional query params drop out
 * cleanly via spread-omit on the call site.
 */
function parseCsvList(raw: string | undefined): readonly string[] | undefined {
  if (raw === undefined) return undefined;
  const items = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return items.length > 0 ? items : undefined;
}

async function executeSpacePermissions(
  client: ConfluenceClient,
  cmd: ParsedCommand,
): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.spacePermissions.list({
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
      });
    default:
      throw new Error(`Unknown space-permissions action: ${cmd.action}. Actions: list`);
  }
}

async function executeSpaceRoleMode(
  client: ConfluenceClient,
  cmd: ParsedCommand,
): Promise<unknown> {
  switch (cmd.action) {
    case 'get':
      return client.spaceRoleMode.get();
    default:
      throw new Error(`Unknown space-role-mode action: ${cmd.action}. Actions: get`);
  }
}

async function executeSpaceRoles(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const roleType = asEnum(opts['role-type'], SPACE_ROLE_TYPES, 'role-type');
      const principalType = asEnum(
        opts['principal-type'],
        SPACE_ROLE_PRINCIPAL_TYPES,
        'principal-type',
      );
      return client.spaceRoles.list({
        'space-id': asString(opts['space-id']),
        ...(roleType !== undefined ? { 'role-type': roleType } : {}),
        'principal-id': asString(opts['principal-id']),
        ...(principalType !== undefined ? { 'principal-type': principalType } : {}),
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
      });
    }
    case 'get':
      return client.spaceRoles.get(requireArg(cmd.positionalArgs[0], 'role ID'));
    case 'create':
      return client.spaceRoles.create({
        name: requireOpt(opts['name'], '--name'),
        description: requireOpt(opts['description'], '--description'),
        spacePermissions: parseSpacePermissions(
          requireOpt(opts['space-permissions'], '--space-permissions'),
        ),
      });
    case 'update': {
      const anonId = asString(opts['anonymous-reassignment-role-id']);
      const guestId = asString(opts['guest-reassignment-role-id']);
      return client.spaceRoles.update(requireArg(cmd.positionalArgs[0], 'role ID'), {
        name: requireOpt(opts['name'], '--name'),
        description: requireOpt(opts['description'], '--description'),
        spacePermissions: parseSpacePermissions(
          requireOpt(opts['space-permissions'], '--space-permissions'),
        ),
        ...(anonId !== undefined ? { anonymousReassignmentRoleId: anonId } : {}),
        ...(guestId !== undefined ? { guestReassignmentRoleId: guestId } : {}),
      });
    }
    case 'delete':
      return client.spaceRoles.delete(requireArg(cmd.positionalArgs[0], 'role ID'));
    default:
      throw new Error(
        `Unknown space-roles action: ${cmd.action}. Actions: list, get, create, update, delete`,
      );
  }
}

const SPACE_ROLE_TYPES: readonly SpaceRoleType[] = ['SYSTEM', 'CUSTOM'];

const SPACE_ROLE_PRINCIPAL_TYPES: readonly SpaceRolePrincipalType[] = [
  'USER',
  'GROUP',
  'ACCESS_CLASS',
];

// ── spaces sub-resource enums (B196-B213) ─────────────────────────────────
//
// The OpenAPI spec narrows several enums on the `/spaces/{id}/…` collections
// compared with their tenant-wide counterparts — e.g. `GET /spaces/{id}/blogposts`
// only accepts `current,deleted,trashed` for `status`, whereas the standalone
// `/blogposts` collection also accepts `historical,draft`. We mirror the
// narrower enums here so the CLI fails fast on out-of-band values instead of
// round-tripping to a 400.

const SPACE_BLOG_POST_STATUSES = ['current', 'deleted', 'trashed'] as const;

const SPACE_CONTENT_LABEL_PREFIXES = ['my', 'team'] as const;

const SPACE_PAGE_DEPTHS = ['all', 'root'] as const;

const SPACE_PAGE_STATUSES = ['current', 'archived', 'deleted', 'trashed'] as const;

/**
 * Split `--space-permissions` from the CLI into a non-empty array. Accepts a
 * comma-separated list of permission ids (e.g. `read/space,write/space`);
 * surrounding whitespace per entry is trimmed and empty entries are dropped.
 * Rejects an all-empty payload with a clear error so callers fail fast before
 * the HTTP round trip.
 */
function parseSpacePermissions(raw: string): readonly string[] {
  const items = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (items.length === 0) {
    throw new Error('--space-permissions must contain at least one non-empty permission id');
  }
  return items;
}

async function executeTasks(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list':
      return client.tasks.list({
        'body-format': asString(opts['body-format']) as 'storage' | 'atlas_doc_format' | undefined,
        includeBlankTasks: opts['include-blank-tasks'] === true ? true : undefined,
        status: asEnum(opts['status'], TASK_STATUSES, 'status'),
        taskId: asPositiveInt(opts['task-id'], '--task-id'),
        spaceId: asString(opts['space-id']),
        pageId: asString(opts['page-id']),
        blogPostId: asString(opts['blog-post-id']),
        createdBy: asString(opts['created-by']),
        assignedTo: asString(opts['assigned-to']),
        completedBy: asString(opts['completed-by']),
        createdAtFrom: asString(opts['created-at-from']),
        createdAtTo: asString(opts['created-at-to']),
        dueAtFrom: asString(opts['due-at-from']),
        dueAtTo: asString(opts['due-at-to']),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'get':
      return client.tasks.get(requireArg(cmd.positionalArgs[0], 'task ID'), {
        'body-format': asString(opts['body-format']) as 'storage' | 'atlas_doc_format' | undefined,
      });
    case 'update':
      return client.tasks.update(requireArg(cmd.positionalArgs[0], 'task ID'), {
        status: requireEnum(opts['status'], TASK_STATUSES, '--status'),
      });
    default:
      throw new Error(`Unknown tasks action: ${cmd.action}. Actions: list, get, update`);
  }
}

const TASK_STATUSES = ['incomplete', 'complete'] as const;

async function executeUsers(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'check-access-by-email': {
      const emails = parseEmailList(requireOpt(cmd.options['emails'], '--emails'));
      return client.users.checkAccessByEmail({ emails });
    }
    case 'invite-by-email': {
      const emails = parseEmailList(requireOpt(cmd.options['emails'], '--emails'));
      await client.users.inviteByEmail({ emails });
      return { invited: true };
    }
    default:
      throw new Error(
        `Unknown users action: ${cmd.action}. Actions: check-access-by-email, invite-by-email`,
      );
  }
}

/**
 * Split a required comma-separated CLI flag into a non-empty, trimmed list.
 * Surrounding whitespace per entry is trimmed and empty entries are dropped;
 * an all-empty payload throws `emptyError` so callers fail fast before the
 * HTTP round trip. Shared by `--emails` (users) and `--account-ids`
 * (users-bulk) so both get identical comma-separated batch semantics.
 */
function parseRequiredCsvList(raw: string, emptyError: string): readonly string[] {
  const items = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (items.length === 0) {
    throw new Error(emptyError);
  }
  return items;
}

/**
 * Parse `--emails` from the CLI into a non-empty list. Mirrors the
 * `--account-ids` parsing used by `users-bulk` so callers get consistent
 * comma-separated batch semantics across both user resources: surrounding
 * whitespace per entry is trimmed and empty entries are dropped.
 */
function parseEmailList(raw: string): readonly string[] {
  return parseRequiredCsvList(raw, '--emails must contain at least one non-empty email address');
}

async function executeUsersBulk(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'lookup': {
      const raw = requireOpt(cmd.options['account-ids'], '--account-ids');
      const accountIds = parseRequiredCsvList(
        raw,
        '--account-ids must contain at least one non-empty account ID',
      );
      return client.usersBulk.lookup({ accountIds });
    }
    default:
      throw new Error(`Unknown users-bulk action: ${cmd.action}. Actions: lookup`);
  }
}

async function executeDatabases(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'create': {
      const params = opts['private'] === true ? { private: true } : undefined;
      return client.databases.create(
        {
          spaceId: requireOpt(opts['space-id'], '--space-id'),
          title: asString(opts['title']),
          parentId: asString(opts['parent-id']),
        },
        params,
      );
    }
    case 'get':
      return client.databases.get(requireArg(cmd.positionalArgs[0], 'database ID'), {
        'include-collaborators': opts['include-collaborators'] === true ? true : undefined,
        'include-direct-children': opts['include-direct-children'] === true ? true : undefined,
        'include-operations': opts['include-operations'] === true ? true : undefined,
        'include-properties': opts['include-properties'] === true ? true : undefined,
      });
    case 'delete':
      await client.databases.delete(requireArg(cmd.positionalArgs[0], 'database ID'));
      return { deleted: true };
    case 'ancestors':
      return client.databases.listAncestors(requireArg(cmd.positionalArgs[0], 'database ID'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'descendants':
      return client.databases.listDescendants(requireArg(cmd.positionalArgs[0], 'database ID'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
        depth: asDepth(opts['depth']),
        cursor: asString(opts['cursor']),
      });
    case 'direct-children': {
      const sort = asEnum(opts['sort'], CONTENT_SORT_ORDERS, 'sort');
      return client.databases.listDirectChildren(requireArg(cmd.positionalArgs[0], 'database ID'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
        ...(sort !== undefined ? { sort } : {}),
      });
    }
    case 'operations':
      return client.databases.getOperations(requireArg(cmd.positionalArgs[0], 'database ID'));
    case 'get-classification-level':
      return client.databases.getClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'database ID'),
      );
    case 'update-classification-level':
      await client.databases.updateClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'database ID'),
        { id: requireOpt(opts['level-id'], '--level-id'), status: 'current' },
      );
      return { updated: true };
    case 'reset-classification-level':
      await client.databases.resetClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'database ID'),
      );
      return { reset: true };
    case 'list-properties':
      return client.databases.listProperties(requireArg(cmd.positionalArgs[0], 'database ID'), {
        key: asString(opts['key']),
        sort: asEnum(opts['sort'], PROPERTY_SORT_ORDERS, 'sort'),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'create-property':
      return client.databases.createProperty(requireArg(cmd.positionalArgs[0], 'database ID'), {
        key: requireOpt(opts['key'], '--key'),
        value: parseJsonValue(requireOpt(opts['value'], '--value')),
      });
    case 'get-property':
      return client.databases.getProperty(
        requireArg(cmd.positionalArgs[0], 'database ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
    case 'update-property': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.databases.updateProperty(
        requireArg(cmd.positionalArgs[0], 'database ID'),
        requireOpt(opts['property-id'], '--property-id'),
        {
          key: requireOpt(opts['key'], '--key'),
          value: parseJsonValue(requireOpt(opts['value'], '--value')),
          version: { number: versionNum },
        },
      );
    }
    case 'delete-property':
      await client.databases.deleteProperty(
        requireArg(cmd.positionalArgs[0], 'database ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
      return { deleted: true };
    default:
      throw new Error(
        `Unknown databases action: ${cmd.action}. Actions: create, get, delete, ancestors, descendants, direct-children, operations, get-classification-level, update-classification-level, reset-classification-level, list-properties, create-property, get-property, update-property, delete-property`,
      );
  }
}

async function executeEmbeds(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'create':
      return client.embeds.create({
        spaceId: requireOpt(opts['space-id'], '--space-id'),
        title: asString(opts['title']),
        parentId: asString(opts['parent-id']),
        embedUrl: asString(opts['embed-url']),
      });
    case 'get':
      return client.embeds.get(requireArg(cmd.positionalArgs[0], 'embed ID'), {
        'include-collaborators': opts['include-collaborators'] === true ? true : undefined,
        'include-direct-children': opts['include-direct-children'] === true ? true : undefined,
        'include-operations': opts['include-operations'] === true ? true : undefined,
        'include-properties': opts['include-properties'] === true ? true : undefined,
      });
    case 'delete':
      await client.embeds.delete(requireArg(cmd.positionalArgs[0], 'embed ID'));
      return { deleted: true };
    case 'ancestors':
      return client.embeds.listAncestors(requireArg(cmd.positionalArgs[0], 'embed ID'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'descendants':
      return client.embeds.listDescendants(requireArg(cmd.positionalArgs[0], 'embed ID'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
        depth: asPositiveInt(opts['depth'], '--depth'),
        cursor: asString(opts['cursor']),
      });
    case 'direct-children': {
      const sort = asEnum(opts['sort'], CONTENT_SORT_ORDERS, 'sort');
      return client.embeds.listDirectChildren(requireArg(cmd.positionalArgs[0], 'embed ID'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
        ...(sort !== undefined ? { sort } : {}),
      });
    }
    case 'operations':
      return client.embeds.getOperations(requireArg(cmd.positionalArgs[0], 'embed ID'));
    case 'list-properties':
      return client.embeds.listProperties(requireArg(cmd.positionalArgs[0], 'embed ID'), {
        key: asString(opts['key']),
        sort: asEnum(opts['sort'], PROPERTY_SORT_ORDERS, 'sort'),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'create-property':
      return client.embeds.createProperty(requireArg(cmd.positionalArgs[0], 'embed ID'), {
        key: requireOpt(opts['key'], '--key'),
        value: parseJsonValue(requireOpt(opts['value'], '--value')),
      });
    case 'get-property':
      return client.embeds.getProperty(
        requireArg(cmd.positionalArgs[0], 'embed ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
    case 'update-property': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.embeds.updateProperty(
        requireArg(cmd.positionalArgs[0], 'embed ID'),
        requireOpt(opts['property-id'], '--property-id'),
        {
          key: requireOpt(opts['key'], '--key'),
          value: parseJsonValue(requireOpt(opts['value'], '--value')),
          version: { number: versionNum },
        },
      );
    }
    case 'delete-property':
      await client.embeds.deleteProperty(
        requireArg(cmd.positionalArgs[0], 'embed ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
      return { deleted: true };
    default:
      throw new Error(
        `Unknown embeds action: ${cmd.action}. Actions: create, get, delete, ancestors, descendants, direct-children, operations, list-properties, create-property, get-property, update-property, delete-property`,
      );
  }
}

async function executeFolders(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'create':
      return client.folders.create({
        spaceId: requireOpt(opts['space-id'], '--space-id'),
        title: asString(opts['title']),
        parentId: asString(opts['parent-id']),
      });
    case 'get':
      return client.folders.get(requireArg(cmd.positionalArgs[0], 'folder ID'), {
        'include-collaborators': opts['include-collaborators'] === true ? true : undefined,
        'include-direct-children': opts['include-direct-children'] === true ? true : undefined,
        'include-operations': opts['include-operations'] === true ? true : undefined,
        'include-properties': opts['include-properties'] === true ? true : undefined,
      });
    case 'delete':
      await client.folders.delete(requireArg(cmd.positionalArgs[0], 'folder ID'));
      return { deleted: true };
    case 'ancestors':
      return client.folders.listAncestors(requireArg(cmd.positionalArgs[0], 'folder ID'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'descendants':
      return client.folders.listDescendants(requireArg(cmd.positionalArgs[0], 'folder ID'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
        depth: asPositiveInt(opts['depth'], '--depth'),
        cursor: asString(opts['cursor']),
      });
    case 'direct-children': {
      const sort = asEnum(opts['sort'], CONTENT_SORT_ORDERS, 'sort');
      return client.folders.listDirectChildren(requireArg(cmd.positionalArgs[0], 'folder ID'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
        cursor: asString(opts['cursor']),
        ...(sort !== undefined ? { sort } : {}),
      });
    }
    case 'operations':
      return client.folders.getOperations(requireArg(cmd.positionalArgs[0], 'folder ID'));
    case 'list-properties':
      return client.folders.listProperties(requireArg(cmd.positionalArgs[0], 'folder ID'), {
        key: asString(opts['key']),
        sort: asEnum(opts['sort'], PROPERTY_SORT_ORDERS, 'sort'),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'create-property':
      return client.folders.createProperty(requireArg(cmd.positionalArgs[0], 'folder ID'), {
        key: requireOpt(opts['key'], '--key'),
        value: parseJsonValue(requireOpt(opts['value'], '--value')),
      });
    case 'get-property':
      return client.folders.getProperty(
        requireArg(cmd.positionalArgs[0], 'folder ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
    case 'update-property': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.folders.updateProperty(
        requireArg(cmd.positionalArgs[0], 'folder ID'),
        requireOpt(opts['property-id'], '--property-id'),
        {
          key: requireOpt(opts['key'], '--key'),
          value: parseJsonValue(requireOpt(opts['value'], '--value')),
          version: { number: versionNum },
        },
      );
    }
    case 'delete-property':
      await client.folders.deleteProperty(
        requireArg(cmd.positionalArgs[0], 'folder ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
      return { deleted: true };
    default:
      throw new Error(
        `Unknown folders action: ${cmd.action}. Actions: create, get, delete, ancestors, descendants, direct-children, operations, list-properties, create-property, get-property, update-property, delete-property`,
      );
  }
}

async function executeFooterComments(
  client: ConfluenceClient,
  cmd: ParsedCommand,
): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const sort = asEnum(opts['sort'], COMMENT_SORT_ORDERS, 'sort');
      const bodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      return client.footerComments.list({
        ...(bodyFormat !== undefined ? { 'body-format': bodyFormat } : {}),
        ...(sort !== undefined ? { sort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }
    case 'get': {
      const bodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      return client.footerComments.get(requireArg(cmd.positionalArgs[0], 'comment ID'), {
        ...(bodyFormat !== undefined ? { 'body-format': bodyFormat } : {}),
        version: asPositiveInt(opts['version-number'], '--version-number'),
        'include-properties': opts['include-properties'] === true ? true : undefined,
        'include-operations': opts['include-operations'] === true ? true : undefined,
        'include-likes': opts['include-likes'] === true ? true : undefined,
        'include-versions': opts['include-versions'] === true ? true : undefined,
        'include-version': opts['include-version'] === true ? true : undefined,
      });
    }
    case 'update': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      // NOTE: deliberate cross-resource call — see CommentsResource.updateFooter for single source of truth
      return client.comments.updateFooter(requireArg(cmd.positionalArgs[0], 'comment ID'), {
        version: { number: versionNum },
        body: {
          representation: 'storage',
          value: requireOpt(opts['body'], '--body'),
        },
      });
    }
    case 'children': {
      const sort = asEnum(opts['sort'], COMMENT_SORT_ORDERS, 'sort');
      const bodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      return client.footerComments.listChildren(requireArg(cmd.positionalArgs[0], 'comment ID'), {
        ...(bodyFormat !== undefined ? { 'body-format': bodyFormat } : {}),
        ...(sort !== undefined ? { sort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }
    case 'likes-count':
      return client.footerComments.getLikeCount(requireArg(cmd.positionalArgs[0], 'comment ID'));
    case 'likes-users':
      return client.footerComments.listLikeUsers(requireArg(cmd.positionalArgs[0], 'comment ID'), {
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'operations':
      return client.footerComments.getOperations(requireArg(cmd.positionalArgs[0], 'comment ID'));
    case 'versions': {
      const sort = asEnum(opts['sort'], VERSION_SORT_ORDERS, 'sort');
      const bodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      return client.footerComments.listVersions(requireArg(cmd.positionalArgs[0], 'comment ID'), {
        ...(bodyFormat !== undefined ? { 'body-format': bodyFormat } : {}),
        ...(sort !== undefined ? { sort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }
    case 'version': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.footerComments.getVersion(
        requireArg(cmd.positionalArgs[0], 'comment ID'),
        versionNum,
      );
    }
    default:
      throw new Error(
        `Unknown footer-comments action: ${cmd.action}. Actions: list, get, update, children, likes-count, likes-users, operations, versions, version`,
      );
  }
}

async function executeInlineComments(
  client: ConfluenceClient,
  cmd: ParsedCommand,
): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'list': {
      const sort = asEnum(opts['sort'], COMMENT_SORT_ORDERS, 'sort');
      const bodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      return client.inlineComments.list({
        ...(bodyFormat !== undefined ? { 'body-format': bodyFormat } : {}),
        ...(sort !== undefined ? { sort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }
    case 'children': {
      const sort = asEnum(opts['sort'], COMMENT_SORT_ORDERS, 'sort');
      const bodyFormat = asEnum(opts['body-format'], CONTENT_BODY_FORMATS, 'body-format');
      return client.inlineComments.listChildren(requireArg(cmd.positionalArgs[0], 'comment ID'), {
        ...(bodyFormat !== undefined ? { 'body-format': bodyFormat } : {}),
        ...(sort !== undefined ? { sort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }
    case 'likes-count':
      return client.inlineComments.getLikesCount(requireArg(cmd.positionalArgs[0], 'comment ID'));
    case 'likes-users':
      return client.inlineComments.listLikeUsers(requireArg(cmd.positionalArgs[0], 'comment ID'), {
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'operations':
      return client.inlineComments.getOperations(requireArg(cmd.positionalArgs[0], 'comment ID'));
    case 'versions': {
      const sort = asEnum(opts['sort'], VERSION_SORT_ORDERS, 'sort');
      return client.inlineComments.listVersions(requireArg(cmd.positionalArgs[0], 'comment ID'), {
        ...(sort !== undefined ? { sort } : {}),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    }
    case 'version': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.inlineComments.getVersion(
        requireArg(cmd.positionalArgs[0], 'comment ID'),
        versionNum,
      );
    }
    default:
      throw new Error(
        `Unknown inline-comments action: ${cmd.action}. Actions: list, children, likes-count, likes-users, operations, versions, version`,
      );
  }
}

async function executeWhiteboards(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  const opts = cmd.options;

  switch (cmd.action) {
    case 'create': {
      const params = opts['private'] === true ? { private: true } : undefined;
      const templateKey = asEnum(opts['template-key'], WHITEBOARD_TEMPLATE_KEYS, 'template-key');
      const locale = asEnum(opts['locale'], WHITEBOARD_LOCALES, 'locale');
      return client.whiteboards.create(
        {
          spaceId: requireOpt(opts['space-id'], '--space-id'),
          title: asString(opts['title']),
          parentId: asString(opts['parent-id']),
          ...(templateKey !== undefined ? { templateKey } : {}),
          ...(locale !== undefined ? { locale } : {}),
        },
        params,
      );
    }
    case 'get':
      return client.whiteboards.get(requireArg(cmd.positionalArgs[0], 'whiteboard ID'), {
        'include-collaborators': opts['include-collaborators'] === true ? true : undefined,
        'include-direct-children': opts['include-direct-children'] === true ? true : undefined,
        'include-operations': opts['include-operations'] === true ? true : undefined,
        'include-properties': opts['include-properties'] === true ? true : undefined,
      });
    case 'delete':
      await client.whiteboards.delete(requireArg(cmd.positionalArgs[0], 'whiteboard ID'));
      return { deleted: true };
    case 'ancestors':
      return client.whiteboards.listAncestors(requireArg(cmd.positionalArgs[0], 'whiteboard ID'), {
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'descendants':
      return client.whiteboards.listDescendants(
        requireArg(cmd.positionalArgs[0], 'whiteboard ID'),
        {
          limit: asPositiveInt(opts['limit'], '--limit'),
          depth: asDepth(opts['depth']),
          cursor: asString(opts['cursor']),
        },
      );
    case 'direct-children': {
      const sort = asEnum(opts['sort'], CONTENT_SORT_ORDERS, 'sort');
      return client.whiteboards.listDirectChildren(
        requireArg(cmd.positionalArgs[0], 'whiteboard ID'),
        {
          limit: asPositiveInt(opts['limit'], '--limit'),
          cursor: asString(opts['cursor']),
          ...(sort !== undefined ? { sort } : {}),
        },
      );
    }
    case 'operations':
      return client.whiteboards.getOperations(requireArg(cmd.positionalArgs[0], 'whiteboard ID'));
    case 'get-classification-level':
      return client.whiteboards.getClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'whiteboard ID'),
      );
    case 'update-classification-level':
      await client.whiteboards.updateClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'whiteboard ID'),
        { id: requireOpt(opts['level-id'], '--level-id'), status: 'current' },
      );
      return { updated: true };
    case 'reset-classification-level':
      await client.whiteboards.resetClassificationLevel(
        requireArg(cmd.positionalArgs[0], 'whiteboard ID'),
      );
      return { reset: true };
    case 'list-properties':
      return client.whiteboards.listProperties(requireArg(cmd.positionalArgs[0], 'whiteboard ID'), {
        key: asString(opts['key']),
        sort: asEnum(opts['sort'], PROPERTY_SORT_ORDERS, 'sort'),
        cursor: asString(opts['cursor']),
        limit: asPositiveInt(opts['limit'], '--limit'),
      });
    case 'create-property':
      return client.whiteboards.createProperty(requireArg(cmd.positionalArgs[0], 'whiteboard ID'), {
        key: requireOpt(opts['key'], '--key'),
        value: parseJsonValue(requireOpt(opts['value'], '--value')),
      });
    case 'get-property':
      return client.whiteboards.getProperty(
        requireArg(cmd.positionalArgs[0], 'whiteboard ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
    case 'update-property': {
      const versionNum = requirePositiveInt(opts['version-number'], '--version-number');
      return client.whiteboards.updateProperty(
        requireArg(cmd.positionalArgs[0], 'whiteboard ID'),
        requireOpt(opts['property-id'], '--property-id'),
        {
          key: requireOpt(opts['key'], '--key'),
          value: parseJsonValue(requireOpt(opts['value'], '--value')),
          version: { number: versionNum },
        },
      );
    }
    case 'delete-property':
      await client.whiteboards.deleteProperty(
        requireArg(cmd.positionalArgs[0], 'whiteboard ID'),
        requireOpt(opts['property-id'], '--property-id'),
      );
      return { deleted: true };
    default:
      throw new Error(
        `Unknown whiteboards action: ${cmd.action}. Actions: create, get, delete, ancestors, descendants, direct-children, operations, get-classification-level, update-classification-level, reset-classification-level, list-properties, create-property, get-property, update-property, delete-property`,
      );
  }
}

function requireArg(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required argument: ${name}`);
  return value;
}

function requireOpt(value: string | boolean | undefined, name: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`Missing required option: ${name}`);
  return value;
}

function asString(value: string | boolean | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asPositiveInt(value: string | boolean | undefined, name: string): number | undefined {
  if (typeof value !== 'string') return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${value}`);
  }
  return n;
}

/**
 * Like {@link asPositiveInt} but rejects missing values: requires the flag,
 * then validates it is a positive integer. Returns the parsed number. The
 * thrown message matches the hand-rolled sites it replaces
 * (`<name> must be a positive integer, got: <value>`).
 */
function requirePositiveInt(value: string | boolean | undefined, name: string): number {
  const raw = requireOpt(value, name);
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${raw}`);
  }
  return n;
}

/**
 * Validate depth parameter for descendant/child queries (must be 1–10 per spec).
 * Returns `undefined` when unset, otherwise validates and returns the integer.
 */
function asDepth(value: string | boolean | undefined): number | undefined {
  if (typeof value !== 'string') return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 10) {
    throw new Error(`--depth must be between 1 and 10 (per API spec), got: ${value}`);
  }
  return n;
}

/**
 * Narrow a free-form CLI string to a typed enum, rejecting anything outside the
 * allowlist with a user-facing error. Returns `undefined` when the flag is unset
 * so callers can use spread-omit on optional query keys.
 */
function asEnum<T extends string>(
  value: string | boolean | undefined,
  allowed: readonly T[],
  flagName: string,
): T | undefined {
  if (typeof value !== 'string') return undefined;
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`--${flagName} must be one of: ${allowed.join(', ')}, got: ${value}`);
  }
  return value as T;
}

/**
 * Parse a comma-separated CLI value into a typed enum array. Each comma-split
 * token is validated against the allowlist; an empty or missing input returns
 * `undefined` so callers can spread-omit the key. Use for query params that
 * the spec models as `array<enum>` (e.g. attachment `status`).
 */
function asEnumArray<T extends string>(
  value: string | boolean | undefined,
  allowed: readonly T[],
  flagName: string,
): readonly T[] | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  const tokens = value
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return undefined;
  const allowedList = allowed as readonly string[];
  for (const token of tokens) {
    if (!allowedList.includes(token)) {
      throw new Error(`--${flagName} must be one of: ${allowed.join(', ')}, got: ${token}`);
    }
  }
  return tokens as unknown as readonly T[];
}

/**
 * Like `asEnum` but rejects missing values. Use when the flag is required and
 * must come from a fixed allowlist (e.g. `tasks update --status`).
 */
function requireEnum<T extends string>(
  value: string | boolean | undefined,
  allowed: readonly T[],
  flagName: string,
): T {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required option: ${flagName} (one of: ${allowed.join(', ')})`);
  }
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`${flagName} must be one of: ${allowed.join(', ')}, got: ${value}`);
  }
  return value as T;
}

const CONTENT_SORT_ORDERS: readonly ContentSortOrder[] = [
  'created-date',
  '-created-date',
  'id',
  '-id',
  'modified-date',
  '-modified-date',
  'child-position',
  '-child-position',
  'title',
  '-title',
];

const PROPERTY_SORT_ORDERS = ['key', '-key'] as const;

const COMMENT_SORT_ORDERS: readonly CommentSortOrder[] = [
  'created-date',
  '-created-date',
  'modified-date',
  '-modified-date',
];

const VERSION_SORT_ORDERS: readonly VersionSortOrder[] = ['modified-date', '-modified-date'];

const DATA_POLICY_SPACE_SORT_ORDERS: readonly DataPolicySpaceSortOrder[] = [
  'id',
  '-id',
  'key',
  '-key',
  'name',
  '-name',
];

const LABEL_SORT_ORDERS: readonly LabelSortOrder[] = [
  'created-date',
  '-created-date',
  'id',
  '-id',
  'name',
  '-name',
];

const ATTACHMENT_SORT_ORDERS: readonly AttachmentSortOrder[] = [
  'created-date',
  '-created-date',
  'modified-date',
  '-modified-date',
];

const ATTACHMENT_STATUSES: readonly AttachmentStatus[] = ['current', 'archived', 'trashed'];

const LABEL_PREFIXES: readonly LabelPrefix[] = ['my', 'team', 'global', 'system'];

const BLOG_POST_SORT_ORDERS: readonly BlogPostSortOrder[] = [
  'id',
  '-id',
  'created-date',
  '-created-date',
  'modified-date',
  '-modified-date',
];

const PAGE_SORT_ORDERS: readonly PageSortOrder[] = [
  'id',
  '-id',
  'created-date',
  '-created-date',
  'modified-date',
  '-modified-date',
  'title',
  '-title',
];

const CONTENT_BODY_FORMATS = ['storage', 'atlas_doc_format'] as const;

const WHITEBOARD_TEMPLATE_KEYS: readonly WhiteboardTemplateKey[] = [
  '2x2-prioritization',
  '4ls-retro',
  'annual-calendar',
  'brainwriting',
  'concept-map',
  'crazy-8s',
  'daily-sync',
  'disruptive-brainstorm',
  'dot-voting',
  'elevator-pitch',
  'flow-chart',
  'gap-analysis',
  'ice-breakers',
  'incident-postmortem',
  'journey-mapping-kit',
  'kanban-board',
  'lean-coffee',
  'network-of-teams',
  'org-chart',
  'pi-planning',
  'prioritization',
  'prioritization-experiment',
  'product-roadmap',
  'product-vision-board',
  'rice',
  'sailboat-retro',
  'service-blueprint',
  'simple-retrospective',
  'sprint-planning',
  'sticky-note-pack',
  'swimlanes',
  'team-formation-guide',
  'timeline',
  'timeline-workflow',
  'user-story-map',
  'workflow',
  'vision-board',
  'venn-diagram',
  'storyboard',
  'action-plan',
  'root-cause-analysis',
  'executive-summary',
  'stakeholder-mapping',
  'annual-calendar-2025-2026',
  'health-monitor',
  'okr-planning',
  'swot-analysis',
  'poker-planning',
  'fishbone-diagram',
  'risk-assessment',
  'bounded-context',
  'hopes-and-fears',
  'swimlane-vertical',
];

const WHITEBOARD_LOCALES: readonly WhiteboardLocale[] = [
  'de-DE',
  'cs-CZ',
  'ko-KR',
  'fr-FR',
  'it-IT',
  'ja-JP',
  'nl-NL',
  'nb-NO',
  'da-DK',
  'sv-SE',
  'fi-FI',
  'ru-RU',
  'pl-PL',
  'tr-TR',
  'hu-HU',
  'en-GB',
  'en-US',
  'pt-BR',
  'zh-CN',
  'zh-TW',
  'es-ES',
];

const CUSTOM_CONTENT_BODY_FORMATS = ['raw', 'storage', 'atlas_doc_format'] as const;

/**
 * Extended body-format vocabulary accepted only by `GET /custom-content/{id}`
 * — adds the read-only `view`, `export_view`, and `anonymous_export_view`
 * projections from the spec's `CustomContentBodyRepresentationSingle` enum.
 */
const CUSTOM_CONTENT_BODY_FORMATS_SINGLE = [
  'raw',
  'storage',
  'atlas_doc_format',
  'view',
  'export_view',
  'anonymous_export_view',
] as const;

const CUSTOM_CONTENT_SORT_ORDERS: readonly CustomContentSortOrder[] = [
  'id',
  '-id',
  'created-date',
  '-created-date',
  'modified-date',
  '-modified-date',
  'title',
  '-title',
];

const CHILD_CUSTOM_CONTENT_SORT_ORDERS: readonly ChildCustomContentSortOrder[] = [
  'id',
  '-id',
  'created-date',
  '-created-date',
  'modified-date',
  '-modified-date',
];

const COMMENT_STATUSES: readonly CommentStatus[] = [
  'current',
  'deleted',
  'trashed',
  'historical',
  'draft',
];

const INLINE_COMMENT_RESOLUTION_STATUSES: readonly InlineCommentResolutionStatus[] = [
  'resolved',
  'open',
  'dangling',
  'reopened',
];

const CLASSIFICATION_STATUS = ['current', 'draft', 'archived'] as const;

/**
 * Status enum accepted by `PUT /pages/{id}/classification-level` and the
 * matching reset endpoint — page allows both `current` and `draft` (unlike
 * the blog-post variant which is locked to `current`).
 */
const PAGE_CLASSIFICATION_STATUSES = ['current', 'draft'] as const;

/**
 * Status enum accepted by `PUT /pages/{id}/title`. The endpoint targets
 * either the published (`current`) revision or the in-flight `draft`.
 */
const PAGE_TITLE_STATUSES = ['current', 'draft'] as const;

/**
 * Sort tokens accepted by `GET /pages/{id}/children`. Mirrors the OpenAPI
 * `ChildPageSortOrder` enum — narrower than `ContentSortOrder` (no `title`
 * sort because child-page rows don't reliably carry a title field).
 */
const CHILD_PAGE_SORT_ORDERS: readonly ChildPageSortOrder[] = [
  'created-date',
  '-created-date',
  'id',
  '-id',
  'child-position',
  '-child-position',
  'modified-date',
  '-modified-date',
];

const BLOG_POST_LOOKUP_STATUSES: readonly BlogPostLookupStatus[] = [
  'current',
  'trashed',
  'deleted',
  'historical',
  'draft',
];

const BLOG_POST_BODY_REPRESENTATIONS: readonly BlogPostBodyRepresentation[] = [
  'storage',
  'atlas_doc_format',
  'view',
  'export_view',
  'anonymous_export_view',
  'styled_view',
  'editor',
];

function makeBody(value: string | undefined) {
  if (!value) return undefined;
  return { representation: 'storage' as const, value };
}

/**
 * Project the CLI flag bag onto a `GetBlogPostParams` query bag. Returns
 * `undefined` when no spec-mapped flag is present so the caller can short-circuit
 * to the no-arg `blogPosts.get(id)` overload (avoids sending an empty `query={}`
 * object to the transport).
 *
 * Boolean include-* flags are only forwarded when explicitly set on the
 * command line — `node:util.parseArgs` returns `true` when the flag is
 * present and `undefined` when omitted, so absence maps cleanly to "leave
 * the server default in place".
 */
function buildGetBlogPostParams(
  opts: Record<string, string | boolean | undefined>,
): GetBlogPostParams | undefined {
  const params: Record<string, unknown> = {};
  const bodyFormat = asEnum(opts['body-format'], BLOG_POST_BODY_REPRESENTATIONS, 'body-format');
  if (bodyFormat !== undefined) params['body-format'] = bodyFormat;
  if (opts['get-draft'] === true) params['get-draft'] = true;
  const status = asEnumArray(opts['status'], BLOG_POST_LOOKUP_STATUSES, 'status');
  if (status !== undefined) params['status'] = status;
  const historicalVersion = asPositiveInt(opts['historical-version'], '--historical-version');
  if (historicalVersion !== undefined) params['version'] = historicalVersion;
  if (opts['include-labels'] === true) params['include-labels'] = true;
  if (opts['include-properties'] === true) params['include-properties'] = true;
  if (opts['include-operations'] === true) params['include-operations'] = true;
  if (opts['include-likes'] === true) params['include-likes'] = true;
  if (opts['include-versions'] === true) params['include-versions'] = true;
  if (opts['include-version'] === true) params['include-version'] = true;
  if (opts['include-favorited-by-current-user-status'] === true) {
    params['include-favorited-by-current-user-status'] = true;
  }
  if (opts['include-webresources'] === true) params['include-webresources'] = true;
  if (opts['include-collaborators'] === true) params['include-collaborators'] = true;
  return Object.keys(params).length === 0 ? undefined : (params as GetBlogPostParams);
}
