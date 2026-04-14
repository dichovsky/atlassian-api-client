import type { GlobalOptions, ParsedCommand } from '../types.js';
import { ConfluenceClient } from '../../confluence/client.js';
import { buildClientConfig } from '../config.js';

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
        limit: asNumber(opts['limit']),
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
    case 'update':
      return client.pages.update(requireArg(cmd.positionalArgs[0], 'page ID'), {
        id: requireArg(cmd.positionalArgs[0], 'page ID'),
        title: requireOpt(opts['title'], '--title'),
        status: 'current',
        version: {
          number: Number(requireOpt(opts['version-number'], '--version-number')),
        },
        body: makeBody(asString(opts['body'])),
      });
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
        limit: asNumber(cmd.options['limit']),
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
        limit: asNumber(opts['limit']),
      });
    case 'get':
      return client.blogPosts.get(requireArg(cmd.positionalArgs[0], 'blog post ID'));
    case 'create':
      return client.blogPosts.create({
        spaceId: requireOpt(opts['space-id'], '--space-id'),
        title: requireOpt(opts['title'], '--title'),
        body: makeBody(asString(opts['body'])),
      });
    case 'update':
      return client.blogPosts.update(requireArg(cmd.positionalArgs[0], 'blog post ID'), {
        id: requireArg(cmd.positionalArgs[0], 'blog post ID'),
        title: requireOpt(opts['title'], '--title'),
        status: 'current',
        version: {
          number: Number(requireOpt(opts['version-number'], '--version-number')),
        },
      });
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
    default:
      throw new Error(`Unknown comments action: ${cmd.action}. Actions: list, get, create, delete`);
  }
}

async function executeAttachments(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'list':
      return client.attachments.listForPage(requireOpt(cmd.options['page-id'], '--page-id'), {
        limit: asNumber(cmd.options['limit']),
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

async function executeLabels(client: ConfluenceClient, cmd: ParsedCommand): Promise<unknown> {
  switch (cmd.action) {
    case 'list':
      return client.labels.listForPage(requireOpt(cmd.options['page-id'], '--page-id'), {
        limit: asNumber(cmd.options['limit']),
      });
    default:
      throw new Error(`Unknown labels action: ${cmd.action}. Actions: list`);
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

function asNumber(value: string | boolean | undefined): number | undefined {
  if (typeof value !== 'string') return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function makeBody(value: string | undefined) {
  if (!value) return undefined;
  return { representation: 'storage' as const, value };
}
