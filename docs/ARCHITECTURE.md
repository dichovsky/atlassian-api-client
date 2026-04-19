# Architecture

## Overview

`atlassian-api-client` is a typed Node.js/TypeScript SDK for Atlassian Cloud APIs. It provides two client classes — `ConfluenceClient` (REST API v2) and `JiraClient` (REST API v3) — built on a shared core infrastructure layer.

```
┌──────────────────────────────────────────────────────────────┐
│                        CLI (atlas)                            │
│        atlas confluence ...        atlas jira ...             │
├──────────────────────────────────────────────────────────────┤
│                        Public API                            │
│        ConfluenceClient              JiraClient              │
├──────────────────────────────────────────────────────────────┤
│                     Resource Modules                         │
│  pages, spaces, blogPosts,    issues, projects, search,      │
│  comments, attachments,       users, issueTypes, priorities, │
│  labels, contentProperties,   statuses, issueComments,       │
│  customContent, whiteboards,  issueAttachments, labels,      │
│  tasks, versions              boards, sprints, workflows,    │
│                               dashboards, filters, fields,   │
│                               webhooks, jql, bulk            │
├──────────────────────────────────────────────────────────────┤
│                      Middleware Chain                        │
│  OAuthRefresh │ ConnectJwt │ Cache │ Batch │ (custom)        │
├──────────────────────────────────────────────────────────────┤
│                       Core Layer                             │
│  Transport │ Auth │ Retry │ RateLimit │ Errors │ Path        │
│  Config    │ Pagination   │ Types    │ Scopes │ OpenAPI      │
├──────────────────────────────────────────────────────────────┤
│                   Node.js native fetch                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Design Principles

1. **Composition over inheritance** — clients compose resource modules; no deep class hierarchies
2. **Dependency injection** — transport is injectable for testing
3. **Zero runtime dependencies** — uses only Node.js built-ins (`fetch`, `AbortController`, `Buffer`, `URL`)
4. **Immutability** — config and options are never mutated; new objects are created
5. **Fail fast** — invalid config is rejected at construction time
6. **Explicit over magic** — no hidden defaults, no automatic retries on non-retryable errors
7. **Small, focused modules** — each file has a single responsibility

---

## Package Structure

```
src/
├── core/                        # Shared infrastructure
│   ├── types.ts                 # Shared type definitions (Transport, Middleware, etc.)
│   ├── errors.ts                # Error class hierarchy
│   ├── config.ts                # Config validation & defaults
│   ├── auth.ts                  # Auth strategy factory
│   ├── transport.ts             # HTTP transport + middleware chain
│   ├── retry.ts                 # Retry with exponential backoff
│   ├── rate-limiter.ts          # Rate-limit detection & backoff
│   ├── pagination.ts            # Pagination iterators
│   ├── path.ts                  # Path encoding & dot-segment rejection
│   ├── oauth.ts                 # OAuth 2.0 token refresh middleware
│   ├── connect-jwt.ts           # Atlassian Connect HS256 JWT middleware
│   ├── cache.ts                 # In-memory response caching middleware
│   ├── batch.ts                 # Request deduplication/batching middleware
│   ├── scopes.ts                # OAuth scope detection
│   ├── openapi.ts               # OpenAPI 3.x → TypeScript type generator
│   └── index.ts                 # Core barrel export
├── confluence/                  # Confluence Cloud REST API v2
│   ├── types.ts                 # Confluence-specific types
│   ├── resources/
│   │   ├── pages.ts             # /wiki/api/v2/pages
│   │   ├── spaces.ts            # /wiki/api/v2/spaces
│   │   ├── blog-posts.ts        # /wiki/api/v2/blogposts
│   │   ├── comments.ts          # /wiki/api/v2/footer-comments, inline-comments
│   │   ├── attachments.ts       # /wiki/api/v2/attachments (incl. multipart upload)
│   │   ├── labels.ts            # /wiki/api/v2/labels
│   │   ├── content-properties.ts # /wiki/api/v2/*/properties
│   │   ├── custom-content.ts    # /wiki/api/v2/custom-content
│   │   ├── whiteboards.ts       # /wiki/api/v2/whiteboards
│   │   ├── tasks.ts             # /wiki/api/v2/tasks
│   │   ├── versions.ts          # /wiki/api/v2/pages|blogposts/*/versions
│   │   └── index.ts             # Resources barrel
│   ├── client.ts                # ConfluenceClient class
│   └── index.ts                 # Confluence barrel export
├── jira/                        # Jira Cloud Platform REST API v3
│   ├── types.ts                 # Jira-specific types
│   ├── resources/
│   │   ├── issues.ts            # /rest/api/3/issue
│   │   ├── projects.ts          # /rest/api/3/project
│   │   ├── search.ts            # /rest/api/3/search
│   │   ├── users.ts             # /rest/api/3/user, /rest/api/3/myself
│   │   ├── issue-types.ts       # /rest/api/3/issuetype
│   │   ├── priorities.ts        # /rest/api/3/priority
│   │   ├── statuses.ts          # /rest/api/3/statuses
│   │   ├── issue-comments.ts    # /rest/api/3/issue/*/comment
│   │   ├── issue-attachments.ts # /rest/api/3/issue/*/attachments (incl. upload)
│   │   ├── labels.ts            # /rest/api/3/label
│   │   ├── boards.ts            # /rest/agile/1.0/board
│   │   ├── sprints.ts           # /rest/agile/1.0/sprint
│   │   ├── workflows.ts         # /rest/api/3/workflow
│   │   ├── dashboards.ts        # /rest/api/3/dashboard
│   │   ├── filters.ts           # /rest/api/3/filter
│   │   ├── fields.ts            # /rest/api/3/field
│   │   ├── webhooks.ts          # /rest/api/3/webhook
│   │   ├── jql.ts               # /rest/api/3/jql/*
│   │   ├── bulk.ts              # /rest/api/3/issue/bulk, issuetype/*/properties/bulk
│   │   └── index.ts             # Resources barrel
│   ├── client.ts                # JiraClient class
│   └── index.ts                 # Jira barrel export
└── index.ts                     # Package entry point

test/
├── core/                        # Core module tests
├── confluence/                  # Confluence client tests
├── jira/                        # Jira client tests
├── helpers/                     # Test utilities
│   └── mock-transport.ts        # Mock transport for testing
└── index.test.ts                # Public API export tests
```

---

## Core Layer

### Transport (`src/core/transport.ts`)

The transport layer abstracts HTTP communication behind an interface:

```typescript
interface Transport {
  request<T>(options: RequestOptions): Promise<ApiResponse<T>>;
}
```

- `HttpTransport` implements this using native `fetch`
- Tests inject a `MockTransport` (defined in `test/helpers/`)
- The transport handles: URL construction, header merging, body serialisation, response parsing, timeout via AbortController
- **Auth always wins:** any caller-supplied `Authorization` header is stripped before the auth provider's header is applied, preventing accidental auth override via middleware
- **Safe debug logging:** debug logs record `method + path` only; query parameters (which may contain cursor tokens or sensitive filter values) are never appended to the logged path
- **Caller-driven cancellation:** `RequestOptions.signal?: AbortSignal` is composed with the internal timeout signal via `AbortSignal.any`. External aborts surface as `AbortError`; timeouts still throw `TimeoutError` so callers can distinguish the two
- **Rate-limit visibility:** every successful `ApiResponse<T>` exposes `rateLimit?: RateLimitInfo` parsed from `x-ratelimit-*` response headers. When `nearLimit === true` the configured `logger` emits a `warn` so callers can proactively slow down before a 429
- **Retry wraps middleware:** the retry/backoff loop sits outside the middleware chain, so errors thrown by middleware (e.g. `OAuthError` with a 5xx `refreshStatus`) are retried by the same logic as transport errors

**URL construction — single source of truth:**

`HttpTransport` uses `config.baseUrl` as the sole base URL for constructing request URLs. Clients set `config.baseUrl` to the API-specific endpoint (e.g. `https://host/wiki/api/v2`) before passing the config to the transport:

```typescript
// ConfluenceClient (simplified)
const resolved = resolveConfig(config); // resolved.baseUrl = 'https://host'
const baseUrl = `${resolved.baseUrl}/wiki/api/v2`;
const transport = new HttpTransport({ ...resolved, baseUrl }); // config.baseUrl = API URL
```

Resource modules receive the same `baseUrl` and always pass fully-qualified URLs to the transport (e.g. `${this.baseUrl}/pages/123`). The transport detects the `https://` prefix and uses the path verbatim; relative paths (e.g. `/pages/123`) fall back to prepending `config.baseUrl`.

> **Deprecated:** `HttpTransport` accepts an optional second `baseUrl` argument for backwards compatibility with v0.x call sites. When provided it overrides `config.baseUrl` for URL construction. New code should pass the API-specific URL in `config.baseUrl` and omit the second argument.

**Data flow:**

```
Client method call
  → Resource module builds RequestOptions
    → Transport.request()
      → Retry loop (wraps middleware + fetch; retries on 429/5xx/network/OAuth 5xx)
        → Middleware chain (pre-request: OAuth, Connect JWT, Cache, Batch…)
          → executeFetch
            → Auth adds Authorization header (caller `Authorization` stripped)
              → fetch() executes (with timeout + optional caller AbortSignal)
                → Response parsed; rate-limit headers surfaced on success,
                  HttpError thrown on non-2xx (RateLimitError includes Retry-After)
          → Middleware chain (post-response: Cache store, OAuth refresh on 401…)
```

### Auth (`src/core/auth.ts`)

Auth strategies produce headers for each request:

```typescript
interface AuthProvider {
  getHeaders(): Record<string, string>;
}
```

**Supported strategies:**

| Strategy | Config                                               | Header                                     |
| -------- | ---------------------------------------------------- | ------------------------------------------ |
| Basic    | `{ type: 'basic', email: string, apiToken: string }` | `Authorization: Basic base64(email:token)` |
| Bearer   | `{ type: 'bearer', token: string }`                  | `Authorization: Bearer <token>`            |

Auth providers never expose raw credentials in `toString()`, `toJSON()`, or error messages.

### Config (`src/core/config.ts`)

Configuration is validated at client construction time:

```typescript
interface ClientConfig {
  baseUrl: string; // Required: Atlassian instance URL
  auth: AuthConfig; // Required: auth strategy config
  timeout?: number; // Default: 30000ms
  retries?: number; // Default: 3
  retryDelay?: number; // Default: 1000ms (base delay)
  transport?: Transport; // Optional: injectable transport
}
```

**Validation rules:**

- `baseUrl` must be a valid URL, no trailing slash
- `auth` must match a supported strategy
- Numeric values must be positive
- Invalid config throws `ValidationError` immediately

### Errors (`src/core/errors.ts`)

Typed error hierarchy for precise catch handling:

```
AtlassianError (base)
├── HttpError (non-2xx responses)
│   ├── AuthenticationError (401)
│   ├── ForbiddenError (403)
│   ├── NotFoundError (404)
│   ├── RateLimitError (429, includes retryAfter)
│   └── OAuthError (token-endpoint failures; status = refreshStatus ?? 0)
├── TimeoutError (AbortController timeout)
├── NetworkError (fetch failures, DNS, connection)
└── ValidationError (invalid config/params)
```

Each error includes:

- `message` — human-readable description
- `status` — HTTP status code (for HTTP errors)
- `code` — machine-readable error code string
- `cause` — original error (for wrapping)

Errors never include auth credentials or tokens in their message.

**`HttpError.toJSON()`** omits `responseBody` so raw API payloads are not written to log aggregators via `JSON.stringify(error)`. The serialised form includes only `name`, `code`, `status`, and `message`.

### Retry (`src/core/retry.ts`)

Exponential backoff with jitter:

```
delay = min(baseDelay * 2^attempt + random_jitter, maxDelay)
```

**Configuration:**

- `retries`: max retry attempts (default: 3)
- `retryDelay`: base delay in ms (default: 1000)
- `maxRetryDelay`: ceiling in ms (default: 30000)

**Retryable conditions:**

- HTTP 429 (Too Many Requests) — uses `Retry-After` header if present, with `0..retryDelay` jitter added on top of the server-advertised floor. If `maxRetryDelay` leaves headroom above that floor, the added jitter is capped to stay within that headroom and prevent synchronized retry stampedes
- HTTP 500, 502, 503, 504 (server errors)
- Network errors (connection reset, DNS failure)
- `OAuthError` with `refreshStatus` in the 5xx range (transient token-endpoint failures)

**Non-retryable:**

- HTTP 400, 401, 403, 404, 409 (client errors)
- Timeout errors (already represents a long wait)
- `OAuthError` with `refreshStatus` in the 4xx range (misconfigured OAuth)

### Rate Limiter (`src/core/rate-limiter.ts`)

Handles 429 responses:

1. Reads `Retry-After` header (seconds)
2. Waits the specified duration before retry
3. Falls back to exponential backoff if no header
4. Exposes rate-limit state from `X-RateLimit-*` headers

### Pagination (`src/core/pagination.ts`)

Two pagination models:

**Confluence (cursor-based):**

```typescript
interface CursorPaginatedResponse<T> {
  results: T[];
  _links: {
    next?: string; // URL with cursor parameter
    base?: string;
  };
}
```

- Next page: extract `cursor` from `_links.next` URL
- Done: `_links.next` is absent or `results` is empty

**Jira (offset-based):**

```typescript
interface OffsetPaginatedResponse<T> {
  values: T[]; // or `issues` for search
  startAt: number;
  maxResults: number;
  total?: number;
  isLast?: boolean;
}
```

- Next page: `startAt += maxResults`
- Done: `isLast === true` OR `startAt >= total` OR empty results OR a short page (`values.length < maxResults`). The short-page fallback uses the server's response-level `maxResults` (not the caller-requested page size) so servers that clamp the page size terminate cleanly even when `isLast` / `total` are omitted

**Async iterators:**

Both clients provide `*All()` methods that return `AsyncIterable<T>`:

```typescript
for await (const page of confluence.pages.listAll({ spaceId: '123' })) {
  // yields individual items across all pages
}
```

### Path Safety (`src/core/path.ts`)

All user-controlled path segments (IDs, keys) are percent-encoded before URL construction. Dot-segment sequences (`../`, `./`) are rejected with `ValidationError`. This prevents path traversal vulnerabilities across all resource methods.

**Numeric ID validation:** `boardId` and `sprintId` (Jira agile resources) and `versionNumber` (Confluence versions) are validated as positive integers before URL interpolation. Non-integer or non-positive values throw `ValidationError` immediately rather than producing malformed URLs.

### Middleware Layer

`HttpTransport` accepts an optional `middleware` array on `ClientConfig`. Each middleware is a function `(req, next) => Promise<ApiResponse>` that can inspect/modify requests and responses.

Built-in middleware factories:

| Export                         | File             | Description                                                                                                                                                                           |
| ------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createOAuthRefreshMiddleware` | `oauth.ts`       | Injects Bearer token; refreshes on 401 (HTTPS-only endpoint, single shared `refreshPromise` prevents concurrent refresh races)                                                        |
| `createConnectJwtMiddleware`   | `connect-jwt.ts` | Signs requests with HS256 JWT (QSH)                                                                                                                                                   |
| `createCacheMiddleware`        | `cache.ts`       | In-memory GET response cache (FIFO, TTL); `maxSize` and `ttl` validated at construction; cache keys `encodeURIComponent`-encode each query parameter to prevent key-collision attacks |
| `createBatchMiddleware`        | `batch.ts`       | Deduplicates concurrent identical in-flight requests; same `encodeURIComponent` key encoding as cache                                                                                 |

Helper utilities:

| Export                 | Description                                |
| ---------------------- | ------------------------------------------ |
| `signConnectJwt`       | Low-level JWT signing (iss, iat, exp, qsh) |
| `computeQsh`           | Canonical request hash for Connect JWT     |
| `fetchRefreshedTokens` | Low-level token endpoint call              |

### OAuth Scope Detection (`src/core/scopes.ts`)

`detectRequiredScopes(operations)` maps Atlassian operation strings (e.g. `'jira.issues.create'`) to the required Cloud OAuth 2.0 scope strings. `listKnownOperations()` returns all known operation names for tooling.

### OpenAPI Type Generator (`src/core/openapi.ts`)

`generateTypes(spec)` converts an OpenAPI 3.x `components.schemas` document into TypeScript interface/type declarations. Supported schema features: `$ref`, `allOf`, `oneOf`, `anyOf`, enum, nullable, `additionalProperties`. Returns `{ source: string, typeNames: string[] }`.

**Injection protection:**

- Schema names are validated as legal TypeScript identifiers; invalid names throw `ValidationError`
- `*/` sequences in JSDoc descriptions are escaped to `*\/` to prevent comment block breakout
- Single quotes in enum string values are escaped to `\'`
- Property names that are not valid JS identifiers (e.g. `content-type`) are emitted as quoted keys (`'content-type'`)
- `additionalProperties: { type: … }` emits a typed index signature (`[key: string]: T`) rather than being silently dropped

---

## Confluence Client

### ConfluenceClient (`src/confluence/client.ts`)

```typescript
class ConfluenceClient {
  readonly pages: PagesResource;
  readonly spaces: SpacesResource;
  readonly blogPosts: BlogPostsResource;
  readonly comments: CommentsResource;
  readonly attachments: AttachmentsResource;
  readonly labels: LabelsResource;
  readonly contentProperties: ContentPropertiesResource;
  readonly customContent: CustomContentResource;
  readonly whiteboards: WhiteboardsResource;
  readonly tasks: TasksResource;
  readonly versions: VersionsResource;
}
```

**Base URL:** `${config.baseUrl}/wiki/api/v2`

### Resource Pattern

Each resource module follows the same pattern:

```typescript
class PagesResource {
  constructor(private readonly transport: Transport, private readonly baseUrl: string) {}

  async list(params?: ListPagesParams): Promise<CursorPaginatedResponse<Page>> { ... }
  async get(id: string, params?: GetPageParams): Promise<Page> { ... }
  async create(data: CreatePageData): Promise<Page> { ... }
  async update(id: string, data: UpdatePageData): Promise<Page> { ... }
  async delete(id: string, params?: DeletePageParams): Promise<void> { ... }
  async *listAll(params?: ListPagesParams): AsyncIterable<Page> { ... }
}
```

Resources:

- Do not manage their own auth or retry (transport handles this)
- Build `RequestOptions` and delegate to transport
- Parse responses into typed objects
- Provide async iterators for paginated endpoints

### Confluence-Specific Patterns

- **Version handling:** Update operations require `version.number` (current + 1). The update types include this field.
- **Body format:** Query parameter `body-format` controls response body format (`storage`, `atlas_doc_format`, `view`).
- **IDs:** Typed as `string` in TypeScript (API returns them as strings in JSON bodies).
- **Soft delete:** Delete optionally accepts `purge: true` for permanent deletion.

---

## Jira Client

### JiraClient (`src/jira/client.ts`)

```typescript
class JiraClient {
  readonly issues: IssuesResource;
  readonly projects: ProjectsResource;
  readonly search: SearchResource;
  readonly users: UsersResource;
  readonly issueTypes: IssueTypesResource;
  readonly priorities: PrioritiesResource;
  readonly statuses: StatusesResource;
  readonly issueComments: IssueCommentsResource;
  readonly issueAttachments: IssueAttachmentsResource;
  readonly labels: LabelsResource;
  readonly boards: BoardsResource; // base: /rest/agile/1.0
  readonly sprints: SprintsResource; // base: /rest/agile/1.0
  readonly workflows: WorkflowsResource;
  readonly dashboards: DashboardsResource;
  readonly filters: FiltersResource;
  readonly fields: FieldsResource;
  readonly webhooks: WebhooksResource;
  readonly jql: JqlResource;
  readonly bulk: BulkResource;
}
```

**Base URL:** `${config.baseUrl}/rest/api/3`
**Agile Base URL:** `${config.baseUrl}/rest/agile/1.0` (boards, sprints)

### Resource Pattern

Same composition pattern as Confluence, but with offset-based pagination:

```typescript
class IssuesResource {
  async get(issueIdOrKey: string, params?: GetIssueParams): Promise<Issue> { ... }
  async create(data: CreateIssueData): Promise<CreatedIssue> { ... }
  async update(issueIdOrKey: string, data: UpdateIssueData): Promise<void> { ... }
  async delete(issueIdOrKey: string): Promise<void> { ... }
  async getTransitions(issueIdOrKey: string): Promise<Transitions> { ... }
  async transition(issueIdOrKey: string, data: TransitionData): Promise<void> { ... }
}
```

### Jira-Specific Patterns

- **ADF format:** Issue descriptions and comments use Atlassian Document Format (JSON). Types reflect this.
- **Search endpoint:** `POST /rest/api/3/search` returns `{ issues: [...] }` (not `values`). The search helper handles this difference.
- **Expand parameter:** Optional `expand` query parameter for additional data. Typed as string array.
- **Issue keys:** Accept both numeric IDs and string keys (e.g., `PROJ-123`). Typed as `string`.

---

## Public API Design

### Entry Point (`src/index.ts`)

```typescript
// Clients
export { ConfluenceClient } from './confluence/index.js';
export { JiraClient } from './jira/index.js';

// Core types & errors
export {
  AtlassianError, HttpError, AuthenticationError, ForbiddenError,
  NotFoundError, RateLimitError, TimeoutError, NetworkError,
  ValidationError, OAuthError,
} from './core/index.js';

// Core infrastructure types
export type {
  ClientConfig, AuthConfig, BasicAuthConfig, BearerAuthConfig,
  RequestOptions, ApiResponse, Transport, Logger, Middleware,
} from './core/index.js';

// Middleware factories
export { createOAuthRefreshMiddleware, fetchRefreshedTokens } from './core/index.js';
export type { OAuthRefreshConfig, OAuthTokens } from './core/index.js';

export { createConnectJwtMiddleware, signConnectJwt, computeQsh } from './core/index.js';
export type { ConnectJwtConfig } from './core/index.js';

export { createCacheMiddleware } from './core/index.js';
export type { CacheOptions } from './core/index.js';

export { createBatchMiddleware } from './core/index.js';

// Utilities
export { detectRequiredScopes, listKnownOperations } from './core/index.js';
export type { AtlassianScope } from './core/index.js';

export { generateTypes } from './core/index.js';
export type { OpenApiSpec, OpenApiSchemaObject, GeneratedTypes } from './core/index.js';

// Confluence & Jira types (all resource types)
export type { Page, Space, BlogPost, ... } from './confluence/index.js';
export type { Issue, Project, User, ... } from './jira/index.js';
```

### Usage Example

```typescript
import { ConfluenceClient, JiraClient, RateLimitError } from 'atlassian-api-client';

const confluence = new ConfluenceClient({
  baseUrl: 'https://mycompany.atlassian.net',
  auth: { type: 'basic', email: 'user@example.com', apiToken: process.env.CONFLUENCE_TOKEN! },
});

const jira = new JiraClient({
  baseUrl: 'https://mycompany.atlassian.net',
  auth: { type: 'bearer', token: process.env.JIRA_OAUTH_TOKEN! },
  retries: 5,
  timeout: 15000,
});

// Paginated iteration
for await (const page of confluence.pages.listAll({ spaceId: '12345' })) {
  console.log(page.title);
}

// Error handling
try {
  await jira.issues.get('PROJ-999');
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Retry after ${error.retryAfter}s`);
  }
}
```

---

## Dependencies

### Runtime Dependencies

**None.** Zero runtime dependencies.

The package uses only Node.js built-ins available in the supported runtime (Node 24+):

- `fetch` (global, Node 24+)
- `AbortController` (global, Node 24+)
- `Buffer` (for Base64 encoding in Basic auth)
- `URL` / `URLSearchParams` (for URL construction)

### Dev Dependencies

| Package                            | Purpose                      |
| ---------------------------------- | ---------------------------- |
| `typescript`                       | TypeScript compiler          |
| `vitest`                           | Test framework               |
| `@vitest/coverage-v8`              | V8-based coverage            |
| `eslint`                           | Linting                      |
| `@typescript-eslint/eslint-plugin` | TypeScript lint rules        |
| `@typescript-eslint/parser`        | TypeScript parser for ESLint |
| `prettier`                         | Code formatting              |

---

## Extension Points

The architecture supports extensions without breaking changes:

1. **Custom transport:** Inject a custom `Transport` implementation (e.g., for logging, metrics, proxying) via `config.transport`
2. **Custom middleware:** Pass any `Middleware[]` via `config.middleware` — compose OAuth, caching, batching, or your own interceptors in any order
3. **New auth strategies:** Add new `AuthProvider` implementations without modifying existing code
4. **New resources:** Add resource modules to `confluence/resources/` or `jira/resources/` and wire them into the client constructor
5. **Custom retry logic:** Retry count, base delay, and max delay are all externally configurable

---

## CLI Layer

### Overview

The `atlas` CLI provides a command-line interface to both APIs. It reuses the library's client classes directly.

```
atlas <api> <resource> <action> [args] [options]
```

### Structure

```
src/cli/
├── index.ts          # #!/usr/bin/env node entry point
├── router.ts         # Positional arg → command dispatch
├── config.ts         # Auth/config resolution (flags → env vars)
├── output.ts         # Formatters: json, table, minimal
├── help.ts           # Help text for global, api, resource levels
├── types.ts          # CLI-specific types
└── commands/
    ├── confluence.ts # All Confluence resource handlers
    └── jira.ts       # All Jira resource handlers
```

### Auth Resolution

Order of precedence (first wins):

1. CLI flags: `--base-url`, `--auth-type`, `--email`, `--token`
2. Environment variables: `ATLASSIAN_BASE_URL`, `ATLASSIAN_AUTH_TYPE`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`
3. Error with helpful message

**Supported `--auth-type` values:**

| Value    | Required inputs                    | Produced `ClientConfig.auth`                |
| -------- | ---------------------------------- | ------------------------------------------- |
| `basic`  | `--base-url`, `--email`, `--token` | `{ type: 'basic', email, apiToken: token }` |
| `bearer` | `--base-url`, `--token`            | `{ type: 'bearer', token }`                 |

Default is `basic`. Unknown values fall back to `basic` so existing invocations keep working. Bearer mode skips the `--email` requirement; `--token` is still required for both modes.

### Output Formats

| Format    | Flag                      | Use Case                          |
| --------- | ------------------------- | --------------------------------- |
| `json`    | `--format json` (default) | Piping to `jq`, scripting         |
| `table`   | `--format table`          | Human-readable terminal output    |
| `minimal` | `--format minimal`        | IDs/keys only, for `xargs` chains |

### Design Decisions

- **Zero CLI dependencies** — uses Node.js built-in `util.parseArgs` (stable in the supported Node runtime)
- **Reuses library clients** — CLI commands instantiate `ConfluenceClient`/`JiraClient` and call resource methods
- **Pipe-friendly** — JSON default, errors to stderr, data to stdout
- **Stateless** — no config files or login sessions; auth per-invocation

---

## Build & Output

**Build tool:** `tsc` (TypeScript compiler, no bundler)

**Output:**

- `dist/` — compiled JavaScript (ESM) + declaration files (`.d.ts`) + source maps
- `dist/cjs/` — CommonJS output for legacy consumers

**Module format:** Dual ESM + CJS (`"type": "module"` in `package.json`; `exports` field maps both)

**Published files:**

- `dist/` — compiled output
- `README.md`
- `LICENSE`
- `CHANGELOG.md`

**Excluded from package:**

- `src/` (source TypeScript)
- `test/` (tests)
- `examples/` (dev examples)
- `docs/` (dev documentation)
- Config files (tsconfig, vitest, eslint, prettier)
