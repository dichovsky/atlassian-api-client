import type { GlobalOptions, ParsedCommand } from '../types.js';
import { ConfluenceClient } from '../../confluence/client.js';
import { buildClientConfig } from '../config.js';
import type { ContentSortOrder, DataPolicySpaceSortOrder } from '../../confluence/types.js';

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
    case 'data-policies':
      return executeDataPolicies(client, cmd);
    case 'databases':
      return executeDatabases(client, cmd);
    case 'space-permissions':
      return executeSpacePermissions(client, cmd);
    case 'space-role-mode':
      return executeSpaceRoleMode(client, cmd);
    case 'tasks':
      return executeTasks(client, cmd);
    case 'users-bulk':
      return executeUsersBulk(client, cmd);
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
      const versionStr = requireOpt(opts['version-number'], '--version-number');
      const versionNum = Number(versionStr);
      if (!Number.isInteger(versionNum) || versionNum <= 0) {
        throw new Error(`--version-number must be a positive integer, got: ${versionStr}`);
      }
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
    default:
      throw new Error(
        `Unknown pages action: ${cmd.action}. Actions: list, get, create, update, delete`,
      );
  }
}

async function executeSpaces(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'list':
      return client.spaces.list({
        limit: asPositiveInt(cmd.options['limit'], '--limit'),
        cursor: asString(cmd.options['cursor']),
      });
    case 'get':
      return client.spaces.get(requireArg(cmd.positionalArgs[0], 'space ID'));
    default:
      throw new Error(`Unknown spaces action: ${cmd.action}. Actions: list, get`);
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
    case 'get':
      return client.blogPosts.get(requireArg(cmd.positionalArgs[0], 'blog post ID'));
    case 'create':
      return client.blogPosts.create({
        spaceId: requireOpt(opts['space-id'], '--space-id'),
        title: requireOpt(opts['title'], '--title'),
        body: makeBody(asString(opts['body'])),
      });
    case 'update': {
      const blogVersionStr = requireOpt(opts['version-number'], '--version-number');
      const blogVersionNum = Number(blogVersionStr);
      if (!Number.isInteger(blogVersionNum) || blogVersionNum <= 0) {
        throw new Error(`--version-number must be a positive integer, got: ${blogVersionStr}`);
      }
      return client.blogPosts.update(requireArg(cmd.positionalArgs[0], 'blog post ID'), {
        id: requireArg(cmd.positionalArgs[0], 'blog post ID'),
        title: requireOpt(opts['title'], '--title'),
        status: 'current',
        version: {
          number: blogVersionNum,
        },
      });
    }
    case 'delete':
      await client.blogPosts.delete(requireArg(cmd.positionalArgs[0], 'blog post ID'));
      return { deleted: true };
    default:
      throw new Error(
        `Unknown blog-posts action: ${cmd.action}. Actions: list, get, create, update, delete`,
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
    case 'create':
      if (commentType === 'inline') {
        return client.comments.createInline({
          pageId: asString(opts['page-id']),
          body: {
            representation: 'storage',
            value: requireOpt(opts['body'], '--body'),
          },
        });
      }
      return client.comments.createFooter({
        pageId: asString(opts['page-id']),
        body: {
          representation: 'storage',
          value: requireOpt(opts['body'], '--body'),
        },
      });
    case 'delete':
      if (commentType === 'inline') {
        await client.comments.deleteInline(requireArg(cmd.positionalArgs[0], 'comment ID'));
      } else {
        await client.comments.deleteFooter(requireArg(cmd.positionalArgs[0], 'comment ID'));
      }
      return { deleted: true };
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
      const versionStr = requireOpt(opts['version-number'], '--version-number');
      const versionNum = Number(versionStr);
      if (!Number.isInteger(versionNum) || versionNum <= 0) {
        throw new Error(`--version-number must be a positive integer, got: ${versionStr}`);
      }
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
        `Unknown comments action: ${cmd.action}. Actions: list, get, create, delete, list-properties, create-property, get-property, update-property, delete-property`,
      );
  }
}

async function executeAttachments(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'list':
      return client.attachments.listForPage(requireOpt(cmd.options['page-id'], '--page-id'), {
        limit: asPositiveInt(cmd.options['limit'], '--limit'),
      });
    case 'get':
      return client.attachments.get(requireArg(cmd.positionalArgs[0], 'attachment ID'));
    case 'delete':
      await client.attachments.delete(requireArg(cmd.positionalArgs[0], 'attachment ID'));
      return { deleted: true };
    default:
      throw new Error(`Unknown attachments action: ${cmd.action}. Actions: list, get, delete`);
  }
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
  switch (cmd.action) {
    case 'list':
      return client.labels.listForPage(requireOpt(cmd.options['page-id'], '--page-id'), {
        limit: asPositiveInt(cmd.options['limit'], '--limit'),
      });
    default:
      throw new Error(`Unknown labels action: ${cmd.action}. Actions: list`);
  }
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

async function executeUsersBulk(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'lookup': {
      const raw = requireOpt(cmd.options['account-ids'], '--account-ids');
      const accountIds = raw
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      if (accountIds.length === 0) {
        throw new Error('--account-ids must contain at least one non-empty account ID');
      }
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
        depth: asPositiveInt(opts['depth'], '--depth'),
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
      const versionStr = requireOpt(opts['version-number'], '--version-number');
      const versionNum = Number(versionStr);
      if (!Number.isInteger(versionNum) || versionNum <= 0) {
        throw new Error(`--version-number must be a positive integer, got: ${versionStr}`);
      }
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

const DATA_POLICY_SPACE_SORT_ORDERS: readonly DataPolicySpaceSortOrder[] = [
  'id',
  '-id',
  'key',
  '-key',
  'name',
  '-name',
];

function makeBody(value: string | undefined) {
  if (!value) return undefined;
  return { representation: 'storage' as const, value };
}
