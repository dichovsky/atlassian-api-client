# atlassian-api-client

Typed Node.js/TypeScript clients and CLI for Atlassian Cloud APIs.

- **Confluence Cloud REST API v2** — Pages, Spaces, Blog Posts, Comments, Attachments, Labels, Content Properties, Custom Content, Whiteboards, Tasks, Versions
- **Jira Cloud Platform REST API v3** — Issues, Projects, Search (JQL), Users, Issue Types, Priorities, Statuses, Issue Comments, Issue Attachments, Labels, Boards, Sprints, Workflows, Dashboards, Filters, Fields, Webhooks, JQL helpers, Bulk operations

Zero runtime dependencies. Uses native `fetch` (Node.js 24+).

## Install

```bash
npm install atlassian-api-client
```

## Supported Runtimes

- Node.js >= 24.0.0

## Use with coding agents

A Claude Code skill named **`atlassian-api-client-cli`** ships inside this package and teaches coding agents how to drive the `atlas` CLI safely (env-only auth, first-try gotchas, JQL quoting, pagination, output formats).

```bash
# User-wide install, into ~/.claude/skills/atlassian-api-client-cli
npx atlas install-skill

# Project-local install, into <cwd>/.claude/skills/atlassian-api-client-cli
npx atlas install-skill --local

# Print the bundled source path without copying (for symlinks / custom tooling)
npx atlas install-skill --print

# Preview what would be copied
npx atlas install-skill --dry-run
```

The skill source lives at [`skill/SKILL.md`](skill/SKILL.md) with deeper resource matrices in [`skill/reference/`](skill/reference). It's versioned alongside the npm package: every install stamps the destination `SKILL.md` with the package version it was copied from.

## Quick Start

### Confluence

```typescript
import { ConfluenceClient } from 'atlassian-api-client';

const confluence = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: {
    type: 'basic',
    email: 'user@example.com',
    apiToken: process.env.ATLASSIAN_API_TOKEN!,
  },
});

// List pages in a space
const pages = await confluence.pages.list({ spaceId: '123456' });
console.log(pages.results);

// Get a specific page
const page = await confluence.pages.get('789');
```

### Jira

```typescript
import { JiraClient } from 'atlassian-api-client';

const jira = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: {
    type: 'basic',
    email: 'user@example.com',
    apiToken: process.env.ATLASSIAN_API_TOKEN!,
  },
});

// Get an issue
const issue = await jira.issues.get('PROJ-123');
console.log(issue.fields);

// Search with JQL
const results = await jira.search.search({
  jql: 'project = PROJ AND status = "In Progress"',
});
console.log(results.issues);
```

## Authentication

### Basic Auth (Email + API Token)

```typescript
const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: {
    type: 'basic',
    email: 'user@example.com',
    apiToken: 'your-api-token',
  },
});
```

Generate an API token at: https://id.atlassian.com/manage-profile/security/api-tokens

### Bearer Auth (OAuth 2.0 / PAT)

```typescript
const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: {
    type: 'bearer',
    token: 'your-oauth-token',
  },
});
```

## Pagination

### Async Iteration

```typescript
// Confluence - cursor-based pagination
for await (const page of confluence.pages.listAll({ spaceId: '123' })) {
  console.log(page.title);
}

// Jira - offset-based pagination
for await (const project of jira.projects.listAll()) {
  console.log(project.name);
}

// Jira search
for await (const issue of jira.search.searchAll({ jql: 'project = PROJ' })) {
  console.log(issue.key);
}
```

### Manual Pagination

```typescript
// Confluence
const result = await confluence.pages.list({ spaceId: '123', limit: 25 });
console.log(result.results); // current page items
// result._links.next contains cursor for next page

// Jira
const projects = await jira.projects.list({ maxResults: 50 });
console.log(projects.values); // current page items
console.log(projects.total); // total available
```

## Error Handling

```typescript
import {
  AtlassianError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from 'atlassian-api-client';

try {
  await jira.issues.get('PROJ-999');
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof NotFoundError) {
    console.log('Issue not found');
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid credentials');
  } else if (error instanceof AtlassianError) {
    console.log(`API error: ${error.code} - ${error.message}`);
  }
}
```

## Retry & Timeout

```typescript
const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email: '...', apiToken: '...' },
  timeout: 15000, // 15s timeout (default: 30s)
  retries: 5, // max retry attempts (default: 3)
  retryDelay: 2000, // base delay for backoff (default: 1000ms)
  maxRetryDelay: 60000, // max delay cap (default: 30000ms)
});
```

Retries use exponential backoff with jitter. Retryable: 429, 500, 502, 503, 504, and network errors.

## Middleware

`HttpTransport` accepts an optional middleware chain for cross-cutting concerns.

### OAuth 2.0 Token Refresh

```typescript
import { ConfluenceClient, createOAuthRefreshMiddleware } from 'atlassian-api-client';

const oauthMiddleware = createOAuthRefreshMiddleware({
  accessToken: process.env.ACCESS_TOKEN!,
  refreshToken: process.env.REFRESH_TOKEN!,
  clientId: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
  onTokenRefreshed: (tokens) => {
    // Persist the new tokens
    saveTokens(tokens.accessToken, tokens.refreshToken);
  },
});

const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'bearer', token: process.env.ACCESS_TOKEN! },
  middleware: [oauthMiddleware],
});
```

Automatically injects `Authorization: Bearer` and silently refreshes on 401 responses.

### Atlassian Connect JWT

```typescript
import { createConnectJwtMiddleware } from 'atlassian-api-client';

const connectMiddleware = createConnectJwtMiddleware({
  issuer: 'com.example.my-app',
  sharedSecret: process.env.CONNECT_SECRET!,
});

const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'bearer', token: '' },
  middleware: [connectMiddleware],
});
```

Signs every request with an HS256 JWT per the Atlassian Connect spec (QSH, iss, iat, exp claims).

### Response Caching

```typescript
import { createCacheMiddleware } from 'atlassian-api-client';

const cacheMiddleware = createCacheMiddleware({
  ttl: 30_000, // 30s TTL (default: 60s)
  maxSize: 200, // max entries (default: 100, FIFO eviction)
});

const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email: '...', apiToken: '...' },
  middleware: [cacheMiddleware],
});
```

Caches GET responses in memory. Keyed by method + path + query string. Lazily evicts expired entries.

### Request Batching / Deduplication

```typescript
import { createBatchMiddleware } from 'atlassian-api-client';

const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email: '...', apiToken: '...' },
  middleware: [createBatchMiddleware()],
});
```

Coalesces concurrent identical in-flight requests so only one HTTP call is made.

## OAuth Scope Detection

Map Atlassian operation names to the required Cloud OAuth 2.0 scopes:

```typescript
import { detectRequiredScopes, listKnownOperations } from 'atlassian-api-client';

const scopes = detectRequiredScopes(['jira.issues.create', 'confluence.pages.get']);
// → ['write:jira-work', 'read:confluence-content.all']

const allOps = listKnownOperations();
// → ['confluence.pages.create', 'confluence.pages.delete', ...]
```

## OpenAPI Type Generation

Generate TypeScript interfaces from an OpenAPI 3.x schema:

```typescript
import { generateTypes } from 'atlassian-api-client';

const spec = {
  components: {
    schemas: {
      Issue: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          summary: { type: 'string', nullable: true },
        },
      },
    },
  },
};

const { source } = generateTypes(spec);
// → 'export interface Issue { id?: string; summary?: string | null; }'
```

Supports `$ref`, `allOf`, `oneOf`, `anyOf`, enum, nullable, and `additionalProperties`.

## CLI

The `atlas` CLI provides command-line access to both APIs.

```bash
# Install globally
npm install -g atlassian-api-client

# Or use via npx
npx -p atlassian-api-client atlas --help
```

### Syntax

```
atlas <api> <resource> <action> [args] [options]
```

### Auth

Via flags or environment variables:

```bash
export ATLASSIAN_BASE_URL=https://yourcompany.atlassian.net
export ATLASSIAN_EMAIL=user@example.com
export ATLASSIAN_API_TOKEN=your-token

# Or pass inline
atlas --base-url https://... --email user@... --token ...
```

### Examples

```bash
# Confluence
atlas confluence pages list --space-id 123
atlas confluence pages get 456
atlas confluence spaces list

# Jira
atlas jira issues get PROJ-123
atlas jira projects list
atlas jira search --jql "project = PROJ AND status = Open"
atlas jira users me

# Output formats
atlas jira issues get PROJ-123 --format table
atlas jira projects list --format minimal
```

## API Reference

### ConfluenceClient

| Resource            | Methods                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages`             | `list`, `get`, `create`, `update`, `delete`, `listAll`                                                                                               |
| `spaces`            | `list`, `get`, `listAll`                                                                                                                             |
| `blogPosts`         | `list`, `get`, `create`, `update`, `delete`, `listAll`                                                                                               |
| `comments`          | `listFooter`, `getFooter`, `createFooter`, `updateFooter`, `deleteFooter`, `listInline`, `getInline`, `createInline`, `updateInline`, `deleteInline` |
| `attachments`       | `listForPage`, `get`, `upload`, `delete`, `listAllForPage`                                                                                           |
| `labels`            | `listForPage`, `listForSpace`, `listForBlogPost`, `listAllForPage`                                                                                   |
| `contentProperties` | `list`, `get`, `create`, `update`, `delete`                                                                                                          |
| `customContent`     | `list`, `get`, `create`, `update`, `delete`                                                                                                          |
| `whiteboards`       | `get`, `create`, `delete`                                                                                                                            |
| `tasks`             | `list`, `get`, `update`                                                                                                                              |
| `versions`          | `listForPage`, `getForPage`, `listForBlogPost`, `getForBlogPost`                                                                                     |

### JiraClient

| Resource           | Methods                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| `issues`           | `get`, `create`, `update`, `delete`, `getTransitions`, `transition`        |
| `projects`         | `list`, `get`, `listAll`                                                   |
| `search`           | `search`, `searchGet`, `searchAll`                                         |
| `users`            | `get`, `getCurrentUser`, `search`                                          |
| `issueTypes`       | `list`, `get`                                                              |
| `priorities`       | `list`, `get`                                                              |
| `statuses`         | `list`                                                                     |
| `issueComments`    | `list`, `get`, `create`, `update`, `delete`                                |
| `issueAttachments` | `list`, `get`, `upload`                                                    |
| `labels`           | `list`                                                                     |
| `boards`           | `list`, `get`, `getIssues`                                                 |
| `sprints`          | `get`, `create`, `update`, `delete`, `getIssues`                           |
| `workflows`        | `list`, `get`                                                              |
| `dashboards`       | `list`, `get`, `create`, `update`, `delete`                                |
| `filters`          | `list`, `get`, `create`, `update`, `delete`                                |
| `fields`           | `list`, `listAll`, `create`, `update`, `delete`                            |
| `webhooks`         | `list`, `register`, `delete`                                               |
| `jql`              | `getAutocompleteData`, `parse`, `sanitize`, `getFieldReferenceSuggestions` |
| `bulk`             | `createBulk`, `setPropertyBulk`, `deletePropertyBulk`                      |

## Recipes

Copy-paste snippets for common setups. Each recipe is self-contained.

### Custom logger

Warnings the client emits through its configured logger, such as rate-limit proximity and deprecated constructor usage, are routed through the logger you provide.

```typescript
import { ConfluenceClient, type Logger } from 'atlassian-api-client';
import pino from 'pino';

const pinoLogger = pino();
const logger: Logger = {
  debug: (msg, ctx) => pinoLogger.debug(ctx, msg),
  info: (msg, ctx) => pinoLogger.info(ctx, msg),
  warn: (msg, ctx) => pinoLogger.warn(ctx, msg),
  error: (msg, ctx) => pinoLogger.error(ctx, msg),
};

const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email, apiToken },
  logger,
});
```

### Proxy / custom `fetch` dispatcher

Inject an `undici`-powered `fetch` to route every request through a proxy or tune keep-alive. The custom `fetch` is used by the transport _and_ by OAuth token-refresh calls.

```typescript
import { ConfluenceClient } from 'atlassian-api-client';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

const dispatcher = new ProxyAgent('http://proxy.internal:8080');
const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email, apiToken },
  fetch: ((url, init) => undiciFetch(url, { ...init, dispatcher })) as typeof fetch,
});
```

### OAuth 2.0 with token persistence

`createOAuthRefreshMiddleware` injects the access token on every request and refreshes automatically on a 401. A shared in-flight refresh promise prevents stampedes. Use `onTokenRefreshed` to persist new tokens so worker restarts don't lose them.

```typescript
import { JiraClient, createOAuthRefreshMiddleware } from 'atlassian-api-client';
import { readFile, writeFile } from 'node:fs/promises';

const tokens = JSON.parse(await readFile('.atlassian-tokens.json', 'utf8'));

const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'bearer', token: tokens.accessToken }, // initial header; middleware keeps it fresh
  middleware: [
    createOAuthRefreshMiddleware({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      clientId: process.env.ATLASSIAN_CLIENT_ID!,
      clientSecret: process.env.ATLASSIAN_CLIENT_SECRET!,
      // tokenEndpoint defaults to 'https://auth.atlassian.com/oauth/token'
      onTokenRefreshed: async (next) => {
        await writeFile(
          '.atlassian-tokens.json',
          JSON.stringify({ accessToken: next.accessToken, refreshToken: next.refreshToken }),
        );
      },
    }),
  ],
});
```

### Retry tuning

Override the defaults per client. Non-retryable statuses (4xx except 429) are never retried regardless of `retries`.

```typescript
const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'bearer', token },
  retries: 5, // default 3
  retryDelay: 500, // default 1000 ms (base for exponential backoff)
  maxRetryDelay: 15_000, // default 30_000 ms (ceiling)
  timeout: 20_000, // default 30_000 ms (per-request AbortController)
});
```

### Caching + batching

For a read-heavy dashboard, layer the cache outermost _under_ auth so every request still carries a fresh token, and batch innermost so concurrent identical requests collapse into one fetch. See [docs/ARCHITECTURE.md#middleware-ordering](docs/ARCHITECTURE.md) for the full ordering rationale.

```typescript
import {
  JiraClient,
  createCacheMiddleware,
  createBatchMiddleware,
  createOAuthRefreshMiddleware,
} from 'atlassian-api-client';

const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'bearer', token: accessToken },
  middleware: [
    createOAuthRefreshMiddleware({
      /* … */
    }),
    createCacheMiddleware({ ttl: 30_000, maxSize: 500 }),
    createBatchMiddleware(),
  ],
});
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a detailed description of the layered design, core infrastructure, and key design decisions.

## Development

```bash
# Install
npm install

# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint

# Test
npm run test

# Test with coverage
npm run test:coverage

# Full validation
npm run validate
```

## License

MIT
