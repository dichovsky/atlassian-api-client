# Architecture

## Overview

`atlassian-api-client` is a typed Node.js/TypeScript SDK for Atlassian Cloud APIs. It provides two client classes — `ConfluenceClient` (REST API v2) and `JiraClient` (REST API v3) — built on a shared core infrastructure layer.

```
┌─────────────────────────────────────────────────┐
│                  CLI (atlas)                      │
│  atlas confluence ...      atlas jira ...         │
├─────────────────────────────────────────────────┤
│                  Public API                      │
│  ConfluenceClient          JiraClient            │
├─────────────────────────────────────────────────┤
│              Resource Modules                    │
│  pages, spaces, blogPosts   issues, projects,   │
│  comments, attachments,     search, users,      │
│  labels                     issueTypes, ...     │
├─────────────────────────────────────────────────┤
│               Core Layer                         │
│  Transport │ Auth │ Retry │ RateLimit │ Errors  │
│  Config    │ Pagination   │ Types               │
├─────────────────────────────────────────────────┤
│           Node.js native fetch                   │
└─────────────────────────────────────────────────┘
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
├── core/                   # Shared infrastructure
│   ├── types.ts            # Shared type definitions
│   ├── errors.ts           # Error class hierarchy
│   ├── config.ts           # Config validation & defaults
│   ├── auth.ts             # Auth strategy factory
│   ├── transport.ts        # HTTP transport abstraction
│   ├── retry.ts            # Retry with exponential backoff
│   ├── rate-limiter.ts     # Rate-limit detection & backoff
│   ├── pagination.ts       # Pagination iterators
│   └── index.ts            # Core barrel export
├── confluence/             # Confluence Cloud REST API v2
│   ├── types.ts            # Confluence-specific types
│   ├── resources/
│   │   ├── pages.ts        # /wiki/api/v2/pages
│   │   ├── spaces.ts       # /wiki/api/v2/spaces
│   │   ├── blog-posts.ts   # /wiki/api/v2/blogposts
│   │   ├── comments.ts     # /wiki/api/v2/footer-comments, inline-comments
│   │   ├── attachments.ts  # /wiki/api/v2/attachments
│   │   ├── labels.ts       # /wiki/api/v2/labels
│   │   └── index.ts        # Resources barrel
│   ├── client.ts           # ConfluenceClient class
│   └── index.ts            # Confluence barrel export
├── jira/                   # Jira Cloud Platform REST API v3
│   ├── types.ts            # Jira-specific types
│   ├── resources/
│   │   ├── issues.ts       # /rest/api/3/issue
│   │   ├── projects.ts     # /rest/api/3/project
│   │   ├── search.ts       # /rest/api/3/search
│   │   ├── users.ts        # /rest/api/3/user, /rest/api/3/myself
│   │   ├── issue-types.ts  # /rest/api/3/issuetype
│   │   ├── priorities.ts   # /rest/api/3/priority
│   │   ├── statuses.ts     # /rest/api/3/statuses
│   │   └── index.ts        # Resources barrel
│   ├── client.ts           # JiraClient class
│   └── index.ts            # Jira barrel export
└── index.ts                # Package entry point

test/
├── core/                   # Core module tests
├── confluence/             # Confluence client tests
├── jira/                   # Jira client tests
├── helpers/                # Test utilities
│   └── mock-transport.ts   # Mock transport for testing
└── index.test.ts           # Public API export tests
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

**Data flow:**
```
Client method call
  → Resource module builds RequestOptions
    → Transport.request()
      → Auth adds Authorization header
        → Retry wraps the fetch call
          → Rate limiter checks/waits if needed
            → fetch() executes
              → Response parsed or error thrown
```

### Auth (`src/core/auth.ts`)

Auth strategies produce headers for each request:

```typescript
interface AuthProvider {
  getHeaders(): Record<string, string>;
}
```

**Supported strategies:**

| Strategy | Config | Header |
|---|---|---|
| Basic | `{ type: 'basic', email: string, apiToken: string }` | `Authorization: Basic base64(email:token)` |
| Bearer | `{ type: 'bearer', token: string }` | `Authorization: Bearer <token>` |

Auth providers never expose raw credentials in `toString()`, `toJSON()`, or error messages.

### Config (`src/core/config.ts`)

Configuration is validated at client construction time:

```typescript
interface ClientConfig {
  baseUrl: string;              // Required: Atlassian instance URL
  auth: AuthConfig;             // Required: auth strategy config
  timeout?: number;             // Default: 30000ms
  retries?: number;             // Default: 3
  retryDelay?: number;          // Default: 1000ms (base delay)
  transport?: Transport;        // Optional: injectable transport
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
│   └── RateLimitError (429, includes retryAfter)
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
- HTTP 429 (Too Many Requests) — uses `Retry-After` header if present
- HTTP 500, 502, 503, 504 (server errors)
- Network errors (connection reset, DNS failure)

**Non-retryable:**
- HTTP 400, 401, 403, 404, 409 (client errors)
- Timeout errors (already represents a long wait)

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
    next?: string;  // URL with cursor parameter
    base?: string;
  };
}
```
- Next page: extract `cursor` from `_links.next` URL
- Done: `_links.next` is absent or `results` is empty

**Jira (offset-based):**
```typescript
interface OffsetPaginatedResponse<T> {
  values: T[];       // or `issues` for search
  startAt: number;
  maxResults: number;
  total?: number;
  isLast?: boolean;
}
```
- Next page: `startAt += maxResults`
- Done: `isLast === true` OR `startAt >= total` OR empty results

**Async iterators:**

Both clients provide `*All()` methods that return `AsyncIterable<T>`:

```typescript
for await (const page of confluence.pages.listAll({ spaceId: '123' })) {
  // yields individual items across all pages
}
```

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
}
```

**Base URL:** `${config.baseUrl}/rest/api/3`

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

// Core types & errors (for catch blocks and config)
export {
  AtlassianError,
  HttpError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  ValidationError,
} from './core/index.js';

// Config types
export type {
  ClientConfig,
  AuthConfig,
  BasicAuthConfig,
  BearerAuthConfig,
} from './core/index.js';

// Confluence types
export type { Page, Space, BlogPost, ... } from './confluence/index.js';

// Jira types
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

The package uses only Node.js built-ins:
- `fetch` (global, Node 18+)
- `AbortController` (global, Node 18+)
- `Buffer` (for Base64 encoding in Basic auth)
- `URL` / `URLSearchParams` (for URL construction)

### Dev Dependencies

| Package | Purpose |
|---|---|
| `typescript` | TypeScript compiler |
| `vitest` | Test framework |
| `@vitest/coverage-v8` | V8-based coverage |
| `eslint` | Linting |
| `@typescript-eslint/eslint-plugin` | TypeScript lint rules |
| `@typescript-eslint/parser` | TypeScript parser for ESLint |
| `prettier` | Code formatting |

---

## Extension Points

The architecture supports future extensions without breaking changes:

1. **Custom transport:** Inject a custom `Transport` implementation (e.g., for logging, metrics, proxying)
2. **New auth strategies:** Add new `AuthProvider` implementations without modifying existing code
3. **New resources:** Add resource modules to `confluence/resources/` or `jira/resources/` and wire them into the client
4. **Custom retry logic:** The retry configuration is externally configurable
5. **Middleware pattern:** Transport wrapping enables before/after request hooks

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
1. CLI flags: `--base-url`, `--email`, `--token`
2. Environment variables: `ATLASSIAN_BASE_URL`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`
3. Error with helpful message

### Output Formats

| Format | Flag | Use Case |
|---|---|---|
| `json` | `--format json` (default) | Piping to `jq`, scripting |
| `table` | `--format table` | Human-readable terminal output |
| `minimal` | `--format minimal` | IDs/keys only, for `xargs` chains |

### Design Decisions

- **Zero CLI dependencies** — uses Node.js built-in `util.parseArgs` (stable since Node 18.3)
- **Reuses library clients** — CLI commands instantiate `ConfluenceClient`/`JiraClient` and call resource methods
- **Pipe-friendly** — JSON default, errors to stderr, data to stdout
- **Stateless** — no config files or login sessions; auth per-invocation

---

## Build & Output

**Build tool:** `tsc` (TypeScript compiler, no bundler)

**Output:**
- `dist/` — compiled JavaScript (ESM) + declaration files (`.d.ts`)
- Source maps included for debugging

**Module format:** ESM (`"type": "module"` in `package.json`)

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
