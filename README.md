# atlassian-api-client

Typed Node.js/TypeScript clients and CLI for Atlassian Cloud APIs.

- **Confluence Cloud REST API v2** — Pages, Spaces, Blog Posts, Comments, Attachments, Labels, Content Properties, Custom Content, Whiteboards, Tasks, Versions
- **Jira Cloud Platform REST API v3** — Issues, Projects, Search (JQL), Users, Issue Types, Priorities, Statuses, Issue Comments, Issue Attachments, Labels, Boards, Sprints, Workflows, Dashboards, Filters, Fields, Webhooks, JQL helpers, Bulk operations

Zero runtime dependencies. Uses native `fetch` (Node.js 24+).

## Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Pagination](#pagination)
- [Error Handling](#error-handling)
- [Middleware](#middleware)
- [CLI](#cli)
- [Selected Resource Map](#selected-resource-map)
- [Recipes](#recipes)
- [Project Links](#project-links)

## Install

```bash
npm install atlassian-api-client
```

## Supported Runtimes

- Node.js >= 24.0.0

## Use with coding agents

A Claude Code-compatible skill named **`atlassian-api-client-cli`** ships inside this package and teaches coding agents how to drive the `atlas` CLI safely (env-only auth, first-try gotchas, JQL quoting, pagination, output formats).

```bash
# User-wide install, into ~/.claude/skills/atlassian-api-client-cli
npx --package atlassian-api-client -- atlas install-skill

# Project-local install, into <cwd>/.claude/skills/atlassian-api-client-cli
npx --package atlassian-api-client -- atlas install-skill --local

# Print the bundled source path without copying (for symlinks / custom tooling)
npx --package atlassian-api-client -- atlas install-skill --print

# Preview what would be copied
npx --package atlassian-api-client -- atlas install-skill --dry-run
```

`install-skill` is a top-level utility command with an options-only shape: run it as `atlas install-skill [options]`.

If `atlassian-api-client` is already a dependency in your project, the shorter `npx atlas install-skill` form resolves to `node_modules/.bin/atlas` and works the same way. The explicit `--package` form is safer when calling from a clean shell because it pins the source package and won't accidentally resolve an unrelated `atlas` package from the registry.

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

### Self-hosted / non-Atlassian baseUrl

By default, only baseUrls whose host ends in `.atlassian.{net,com}`, `.jira-dev.com`, or `.jira.com` are accepted — the transport refuses to send the configured `Authorization` header to any other host. For self-hosted Jira / Confluence or a reverse proxy in front of Atlassian, pass `allowedHosts` (bare hostnames, no port) to opt in:

```typescript
const client = new JiraClient({
  baseUrl: 'https://jira.internal.example',
  auth: { type: 'bearer', token: process.env.PAT! },
  allowedHosts: ['jira.internal.example'],
});
```

The list must include the `baseUrl` host itself; resource paths that resolve to a host outside the list throw `ValidationError` before any HTTP call is made.

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

## Response Body Size Cap

`ClientConfig.maxResponseBytes` (default: unset, no cap) bounds the size of any single buffered response body the transport will materialise. When a body exceeds the cap, the request throws `ResponseTooLargeError` (`code: 'RESPONSE_TOO_LARGE_ERROR'`) instead of loading it into memory.

```typescript
import { ConfluenceClient, ResponseTooLargeError } from 'atlassian-api-client';

const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email: '...', apiToken: '...' },
  maxResponseBytes: 50 * 1024 * 1024, // 50 MB cap
});

try {
  await client.pages.get('123');
} catch (error) {
  if (error instanceof ResponseTooLargeError) {
    console.error(`Response exceeded ${error.limitBytes} bytes (status: ${error.status ?? 'n/a'})`);
  }
}
```

Enforcement applies to `responseType: 'json'` and `'arrayBuffer'` AND to the error-response body parsed for error-message extraction — so a misconfigured upstream returning a multi-gigabyte 5xx body cannot exhaust the Node heap on a single request. `responseType: 'stream'` is exempt by design: the caller owns drain/abort of the `ReadableStream`. Detection combines a `Content-Length` fast-fail with a running stream-read tally that cancels the body mid-read on overflow.

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

**Token endpoint allowlist (security):** `tokenEndpoint` defaults to `https://auth.atlassian.com/oauth/token`, and only that host is accepted by default. The validation happens at `createOAuthRefreshMiddleware` construction time — a misconfigured endpoint (typo, poisoned env var) throws `ValidationError` before any HTTP traffic, instead of POSTing `client_id` + `client_secret` + `refresh_token` to an attacker host on the first 401. For self-hosted IdPs, proxied auth, or staging endpoints, opt in explicitly:

```typescript
createOAuthRefreshMiddleware({
  accessToken: '...',
  refreshToken: '...',
  clientId: '...',
  clientSecret: '...',
  tokenEndpoint: 'https://idp.internal.example/oauth/token',
  // REPLACES the default — mirrors ClientConfig.allowedHosts semantics.
  allowedTokenEndpointHosts: ['idp.internal.example'],
});
```

This is a separate allowlist from `ClientConfig.allowedHosts` because the OAuth refresh code path calls `fetch` directly and bypasses the transport-side check by design.

**Herd protection (stability):** when many concurrent requests hit a 401 at the same time, the middleware already deduplicates the token exchange to a single in-flight refresh. Two additional knobs flatten the surrounding failure modes:

```typescript
createOAuthRefreshMiddleware({
  accessToken: '...',
  refreshToken: '...',
  clientId: '...',
  clientSecret: '...',
  retryJitterMs: 100, // default — spread post-refresh retries over 0..100ms
  failureCooldownMs: 1000, // default — replay a refresh failure for 1s instead of re-firing
});
```

- `retryJitterMs` (default `100`, `0` disables) staggers each waiter's retry after the shared refresh resolves, so N concurrent requests don't dispatch N simultaneous retried API calls and stampede a just-recovered backend or re-trigger upstream rate-limits.
- `failureCooldownMs` (default `1000`, `0` disables) caches the most recent **refresh failure** for the configured duration. Subsequent 401s during the window replay the cached error (preserving the original `OAuthError` for debugging) without firing a new token-endpoint call — so an auth-server outage no longer becomes an unbounded refresh loop.

Both are validated as non-negative finite numbers at construction; the jitter sleep honours `RequestOptions.signal` so an aborted caller doesn't pay the delay.

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
  maxSize: 200, // max entries (default: 100, LRU eviction)
});

const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email: '...', apiToken: '...' },
  middleware: [cacheMiddleware],
});
```

Caches GET responses in memory. Keys include auth identity, method, path, and query string so responses remain partitioned by caller. Expired entries are lazily evicted; capacity pressure evicts the least recently used entry.

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

# Or pass basic-auth credentials inline
atlas jira issues get PROJ-123 \
  --base-url https://yourcompany.atlassian.net \
  --email user@example.com \
  --token your-token

# Bearer auth: OAuth 2.0 access token or PAT
export ATLASSIAN_AUTH_TYPE=bearer
export ATLASSIAN_API_TOKEN=your-bearer-token

# Equivalent inline bearer-auth form
atlas jira issues get PROJ-123 --auth-type bearer --token your-bearer-token
```

`ATLASSIAN_AUTH_TYPE` defaults to `basic`. Bearer mode does not require `ATLASSIAN_EMAIL`.

### Self-hosted / non-Atlassian baseUrl

For security, the CLI's default host allowlist only accepts `*.atlassian.{net,com}`, `*.jira-dev.com`, and `*.jira.com` — calls outside that suffix list fail with `ValidationError`. Self-hosted or proxied deployments must opt in with `--allowed-hosts` (or the `ATLASSIAN_ALLOWED_HOSTS` env var). Entries are bare hostnames (no scheme, no port) and must include the `baseUrl` host itself:

```bash
atlas confluence spaces list \
  --base-url https://jira.internal.example \
  --allowed-hosts jira.internal.example
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

## Selected Resource Map

The clients expose a broad Atlassian API surface. The tables below highlight common entry points rather than every available resource and method. Use TypeScript autocomplete for the complete client API, or run `atlas confluence --help` and `atlas jira --help` for the complete CLI resource lists.

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

### X-Request-Id propagation

The client always captures the server-assigned request id from response headers (`X-AREQUESTID` first, then `X-Request-Id`) and exposes it as `response.requestId`. On error responses the id is available as `error.requestId` (also serialised by `error.toJSON()` for structured logging).

Outbound id generation is opt-in. Set `requestId: { generate: true }` to attach a UUID to every request. The **same id is reused across all retry attempts** so the server can correlate a logical request regardless of how many tries it took.

```typescript
import { ConfluenceClient, type RequestIdOptions } from 'atlassian-api-client';

const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email, apiToken },
  requestId: {
    generate: true, // attach X-Request-Id to every outbound request
    header: 'X-Request-Id', // default; override to match your gateway's expected name
    // generator: () => myIdGen(), // optional: replace crypto.randomUUID with your own factory
    // readResponseHeaders: ['X-AREQUESTID', 'X-Request-Id'], // default inbound header list
  },
});

// Success path — the server's response id is on the ApiResponse
const response = await client.pages.get('123456');
console.log('server request id:', response.requestId); // e.g. 'arq-a1b2c3...'

// Error path — same field on HttpError, included in toJSON() for structured loggers
try {
  await client.pages.get('missing');
} catch (err) {
  if (err instanceof Error && 'requestId' in err) {
    console.error('failed request id:', (err as { requestId?: string }).requestId);
  }
}
```

### Proxy / custom `fetch` dispatcher

Install [`undici`](https://www.npmjs.com/package/undici), then inject an `undici`-powered `fetch` to route transport requests through a proxy or tune keep-alive. OAuth token refresh has a separate `fetch` option; pass the same function to `createOAuthRefreshMiddleware` when refresh calls should use the proxy too.

```typescript
import { ConfluenceClient } from 'atlassian-api-client';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

const dispatcher = new ProxyAgent('http://proxy.internal:8080');
const proxyFetch = ((url, init) => undiciFetch(url, { ...init, dispatcher })) as typeof fetch;

const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email, apiToken },
  fetch: proxyFetch,
});
```

For OAuth refresh, also pass `fetch: proxyFetch` inside `createOAuthRefreshMiddleware({ ... })`.

### OAuth 2.0 with token persistence

`createOAuthRefreshMiddleware` injects the access token on every request and refreshes automatically on a 401. A shared in-flight refresh promise prevents token-endpoint stampedes; the `retryJitterMs` and `failureCooldownMs` knobs (see the [OAuth 2.0 Token Refresh](#oauth-20-token-refresh) section) extend that protection to the post-refresh retry burst and the auth-server-outage loop. Use `onTokenRefreshed` to persist new tokens so worker restarts don't lose them.

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

For a read-heavy dashboard, layer the cache outermost _under_ auth so every request still carries a fresh token, and batch innermost so concurrent identical requests collapse into one fetch. See [docs/ARCHITECTURE.md#middleware-ordering](docs/ARCHITECTURE.md#middleware-ordering) for the full ordering rationale.

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

## Project Links

- [Changelog](CHANGELOG.md)
- [Security policy](SECURITY.md)
- [Issue tracker](https://github.com/dichovsky/atlassian-api-client/issues)
- [Source repository](https://github.com/dichovsky/atlassian-api-client)
- [Support development](https://buymeacoffee.com/dichovsky)

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
