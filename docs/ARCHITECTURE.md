# Architecture

## Overview

`atlassian-api-client` is a Node.js and TypeScript SDK for the Atlassian Cloud APIs. The SDK has TypeScript types. It gives two client classes: `ConfluenceClient` (REST API v2) and `JiraClient` (REST API v3). The two client classes use the same core layer.

```
┌──────────────────────────────────────────────────────────────┐
│                        CLI (atlas)                            │
│        atlas confluence ...        atlas jira ...             │
├──────────────────────────────────────────────────────────────┤
│                        Public API                            │
│        ConfluenceClient              JiraClient              │
├──────────────────────────────────────────────────────────────┤
│               Resource Modules (selected)                    │
│  pages, spaces, blogPosts,    issues, projects, search,      │
│  comments, attachments,       users, issueTypes, priorities, │
│  labels,                      statuses, issueComments,       │
│  customContent, whiteboards,  issueAttachments, labels,      │
│  tasks, versions              boards, sprints, workflows,    │
│                               dashboards, filters, fields,   │
│                               webhooks, jql, bulk            │
├──────────────────────────────────────────────────────────────┤
│                      Middleware Chain                        │
│  CircuitBreaker │ RateLimiter │ OAuthRefresh │ ConnectJwt    │
│  Cache │ Batch │ (custom)                                    │
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

1. **Composition over inheritance** — A client contains a set of resources. The SDK does not use deep class hierarchies.
2. **Dependency injection** — A test can supply a different transport through `config.transport`.
3. **Zero runtime dependencies** — The SDK uses only Node.js built-ins (for example, `fetch`, `AbortController`, `Buffer`, and `URL`).
4. **Immutability** — The SDK does not change a configuration object or an options object. It makes a new object.
5. **Fail fast** — When you construct a client, the client rejects an incorrect configuration.
6. **Explicit over magic** — The documentation gives the defaults. The transport does not automatically retry an error that is not retryable.
7. **Small, focused modules** — Each file does only one task.

---

## Package Structure

This tree shows only some of the files. The resource directories contain more resource files. To see all files, examine `src/**` or the generated list in `CODEMAP.md`.

```
src/
├── core/                        # Shared infrastructure
│   ├── types.ts                 # Shared type definitions (Transport, Middleware, etc.)
│   ├── errors.ts                # Error class hierarchy
│   ├── config.ts                # Config validation & defaults
│   ├── auth.ts                  # Auth strategy factory
│   ├── auth-identity.ts         # One-way auth identity for cache/batch partitioning
│   ├── atlassian-hosts.ts       # Shared host allowlist policy
│   ├── transport.ts             # HTTP transport orchestrator (thin)
│   ├── request.ts               # URL building, header merging, body serialisation, path sanitisation
│   ├── response.ts              # Body parsing, ApiResponse assembly, toJSON helper
│   ├── middleware.ts            # createMiddlewareChain (outermost-first composition)
│   ├── retry.ts                 # executeWithRetry + retry primitives (status, backoff, network errors)
│   ├── circuit-breaker.ts       # Circuit-breaker middleware (B010)
│   ├── rate-limiter.ts          # Rate-limit header parsing (Retry-After, x-ratelimit-*) + proactive token-bucket limiter (B017); reactive 429 backoff lives in retry.ts
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
│   ├── types/                   # Per-domain type modules (pages, spaces, blog-posts, …)
│   ├── resources/
│   │   ├── pages.ts             # /wiki/api/v2/pages
│   │   ├── spaces.ts            # /wiki/api/v2/spaces
│   │   ├── blog-posts.ts        # /wiki/api/v2/blogposts
│   │   ├── comments.ts          # footer + inline comment CRUD + comment properties
│   │   ├── footer-comments.ts   # /wiki/api/v2/footer-comments extended reads (children, likes, versions)
│   │   ├── inline-comments.ts   # /wiki/api/v2/inline-comments extended reads (children, likes, versions)
│   │   ├── attachments.ts       # /wiki/api/v2/attachments (incl. multipart upload)
│   │   ├── labels.ts            # /wiki/api/v2/labels
│   │   ├── custom-content.ts    # /wiki/api/v2/custom-content
│   │   ├── whiteboards.ts       # /wiki/api/v2/whiteboards
│   │   ├── tasks.ts             # /wiki/api/v2/tasks
│   │   └── versions.ts          # /wiki/api/v2/pages|blogposts/*/versions
│   ├── client.ts                # ConfluenceClient class
│   └── index.ts                 # Confluence barrel export
├── jira/                        # Jira Cloud Platform REST API v3
│   ├── types.ts                 # Jira-specific types
│   ├── resources/
│   │   ├── issues.ts            # /rest/api/3/issue
│   │   ├── projects.ts          # /rest/api/3/project
│   │   ├── search.ts            # /rest/api/3/search/jql (current) + deprecated /rest/api/3/search
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
│   │   └── bulk.ts              # /rest/api/3/issue/bulk, issue/properties/{key}, bulk/issues/*, bulk/queue/{id}, and the DevOps */bulk submit routes
│   ├── client.ts                # JiraClient class
│   └── index.ts                 # Jira barrel export
└── index.ts                     # Package entry point

test/
├── core/                        # Core module tests
├── confluence/                  # Confluence client tests
├── jira/                        # Jira client tests
├── cli/                         # CLI unit/help tests
├── docs/                        # Package-documentation regression tests
├── e2e/                         # CLI → config → client → transport tests
├── helpers/                     # Test utilities
│   └── mock-transport.ts        # Mock transport for testing
└── smoke/                       # Public API smoke tests
```

---

## Core Layer

### Transport (`src/core/transport.ts`)

Each resource gives its requests to the transport through the `Transport` interface:

```typescript
interface Transport {
  request<T>(options: RequestOptions): Promise<ApiResponse<T>>;
}
```

- `HttpTransport` is the default transport. It uses the built-in `fetch` of Node.js.
- Tests use a `MockTransport` (in `test/helpers/`) as the transport.
- The transport makes the URL, puts all request headers into one set, serializes the request body, and parses the response. It uses `AbortController` for the timeout.
- **Auth always wins:** The transport removes each caller-supplied `Authorization` header. Then it adds the header of the `AuthProvider`. Thus, a middleware cannot accidentally replace the authentication.
- **Safe debug logging:** Debug logs record only `method + path`. The transport does not add the query parameters to the logged path, because query parameters can contain cursors or sensitive filter values.
- **Caller-driven cancellation:** The transport uses `AbortSignal.any` to make one signal from `RequestOptions.signal?: AbortSignal` and the internal timeout signal. If the caller aborts the request, the transport throws `AbortError`. If the timeout occurs, the transport throws `TimeoutError`. Thus, callers can see the difference between the two conditions.
- **Rate-limit visibility:** Each `ApiResponse<T>` for a 2xx response has a `rateLimit?: RateLimitInfo` field. The transport parses this field from the `x-ratelimit-*` response headers. If `nearLimit === true`, the configured `logger` writes a `warn` message. Thus, callers can decrease their request rate before they get a 429 response.
- **Retry wraps middleware:** The retry and backoff loop contains the middleware chain. Thus, the transport uses the same retry logic for errors from a middleware (for example, an `OAuthError` with a 5xx `refreshStatus`) and for the errors that the transport throws.

**URL construction — one source for the API URL:**

`HttpTransport` uses only `config.baseUrl` when it makes the request URLs. Before a client gives the configuration to the transport, the client sets `config.baseUrl` to the URL of its API (for example, `https://host/wiki/api/v2`):

```typescript
// ConfluenceClient (simplified)
const resolved = resolveConfig(config); // resolved.baseUrl = 'https://host'
const baseUrl = `${resolved.baseUrl}/wiki/api/v2`;
const transport = new HttpTransport({ ...resolved, baseUrl }); // config.baseUrl = API URL
```

The resources get the same `baseUrl`. They always give fully-qualified URLs to the transport (for example, `${this.baseUrl}/pages/123`). If a path starts with `https://`, the transport uses the path without a change. If a path is relative (for example, `/pages/123`), the transport puts `config.baseUrl` before the path.

> **Deprecated:** `HttpTransport` accepts an optional second `baseUrl` argument. This argument lets code from v0.x continue to operate. If you give this argument, the transport uses it and not `config.baseUrl` to make the request URLs. For new code, we recommend that you put the URL of the API in `config.baseUrl`. We also recommend that you do not give the second argument.

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

An `AuthProvider` supplies the `Authorization` header for each request:

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

An `AuthProvider` does not show raw credentials in `toString()`, `toJSON()`, or error messages.

### Config (`src/core/config.ts`)

When you construct a client, the client validates the configuration:

```typescript
interface ClientConfig {
  baseUrl: string; // Required: Atlassian instance URL
  auth: AuthConfig; // Required: auth strategy config
  timeout?: number; // Default: 30000ms
  retries?: number; // Default: 3
  retryDelay?: number; // Default: 1000ms (base delay)
  maxRetryDelay?: number; // Default: 30000ms
  maxResponseBytes?: number; // Optional cap for buffered bodies
  allowedHosts?: readonly string[]; // Explicit self-hosted/proxy opt-in
  transport?: Transport; // Optional: injectable transport
  fetch?: typeof fetch; // Optional transport fetch implementation; must honour `RequestInit.redirect`
  logger?: Logger;
  middleware?: Middleware[];
  requestId?: RequestIdOptions; // X-Request-Id propagation (inbound capture is always on)
}
```

**Validation rules:**

- `baseUrl` must be a correct HTTPS URL on a default port. The client removes the slashes at the end of the URL.
- By default, the client accepts the hosts that have an Atlassian Cloud host suffix. For a self-hosted deployment or a proxy deployment, you must add the hosts to `allowedHosts`.
- Each `allowedHosts` entry is only a hostname, with no URL scheme, path, or port. The entries must include the hostname of `baseUrl`.
- `auth` must use the `basic` strategy or the `bearer` strategy.
- The client validates the values that are numbers: `retries` can be zero, the delays must be positive, and `maxResponseBytes` must be a positive integer.
- If the configuration is not correct, the client immediately throws `ValidationError`.

### Errors (`src/core/errors.ts`)

The error classes have this hierarchy. With these classes, a `catch` block can accurately identify the type of each error:

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
├── ValidationError (invalid config/params)
├── PaginationError (non-advancing or inconsistent pagination)
├── ResponseTooLargeError (buffered body exceeds maxResponseBytes)
├── CircuitBreakerOpenError (breaker open; request rejected without dispatch)
└── RateLimiterExhaustedError (client-side token-bucket wait exceeded maxWaitMs)
```

Each error has these properties:

- `message` — a description for a person to read
- `status` — the HTTP status code (for HTTP errors)
- `code` — an error code string for software to read
- `cause` — the initial error (if this error contains a different error)

An error message does not contain credentials.

**`HttpError.toJSON()`** does not include `responseBody`. Thus, the output of `JSON.stringify(error)` does not contain the response body of the API. A log aggregator that records this output does not get the response body. The serialized object includes only `name`, `code`, `status`, and `message`, plus `requestId` when the server returned one.

### Retry (`src/core/retry.ts`)

The transport uses exponential backoff with jitter:

```
delay = min(baseDelay * 2^attempt + random_jitter, maxDelay)
```

**Configuration:**

- `retries`: the maximum number of attempts after the first attempt (default: 3)
- `retryDelay`: the base delay in ms (default: 1000)
- `maxRetryDelay`: the maximum delay in ms (default: 30000)

**Retryable conditions:**

- HTTP 429 (Too Many Requests) — For a `RateLimitError` with a `Retry-After` delay in seconds, the transport uses `maxRetryDelay` as the maximum delay. If the delay from the server is shorter than this maximum, the transport adds a random jitter of not more than `retryDelay`. The total wait is not more than `maxRetryDelay`.
- HTTP 500, 502, 503, 504 (5xx responses).
- Transient network errors (connection reset or refused, DNS failure, connect timeout, socket closed). A response-headers timeout (`UND_ERR_HEADERS_TIMEOUT`) and a failure while the transport reads the body of a 2xx response are retried only for GET. The transport also retries a write request that gets a 500, 502, 503, or 504 response. The transport also retries a write request with a connection failure before a response. Thus, the server can possibly get the write request more than one time.
- `OAuthError` if the token endpoint returns 429, 500, 502, 503, or 504. The retries for these errors use exponential backoff.

**Non-retryable:**

- HTTP 400, 401, 403, 404, 409 (4xx responses).
- `TimeoutError` (the request timeout, because the client waited for a long time before this error).
- `OAuthError` with a `refreshStatus` that is not 429, 500, 502, 503, or 504, or with no `refreshStatus`.
- A write (POST, PUT, PATCH, DELETE) in these cases, because the server possibly processed the write request before the failure. These cases do not include a write request with a connection failure before a response, or with a 500, 502, 503, or 504 response. The transport retries these write requests (refer to the retryable conditions). The cases are:
  - A timeout occurred for the response headers of the write request.
  - A failure occurred while the transport read the body of the 2xx response to the write request.
  - A failure occurred on the GET that follows the 303 response to the write request (or a POST's 301/302). The failure can be a network error (`NetworkError`, `retryable: false`), an error response (5xx and 429 too), or a 401 with `createOAuthRefreshMiddleware`. For this 401, the middleware throws the error again and does not refresh the access token.
- A redirect the client refuses on a write. The client throws one of these errors: `HttpError` with the 3xx status for a 303 or a POST's 301/302, `ValidationError` for a 307/308 or a 301/302 on PUT, PATCH or DELETE. The client refuses a redirect of a write request in these conditions:
  - The host of the `Location` URL is not in `allowedHosts`.
  - The URL scheme is not `https:` (for example, `http://`).
  - The port is not the default port.
  - The `Location` is a URL with a username or password.
  - The client cannot parse the `Location`.
- Client-side `fetch` argument errors (a `TypeError`, not a `NetworkError`). These errors include undici's `UND_ERR_INVALID_ARG`, `UND_ERR_NOT_SUPPORTED` and `UND_ERR_REQ_CONTENT_LENGTH_MISMATCH`.
- A coded transport failure outside the transient list (`NetworkError`, `retryable: false`). Examples of these failures are:
  - A TLS error (`CERT_*`, `ERR_TLS_*`, `ERR_SSL_*`, `EPROTO`, `SELF_SIGNED_CERT_IN_CHAIN`, `UNABLE_TO_VERIFY_LEAF_SIGNATURE`).
  - A closed or destroyed dispatcher (`UND_ERR_CLOSED`, `UND_ERR_DESTROYED`).
  - `EMFILE`.

### Rate Limiting (`src/core/retry.ts`, `src/core/rate-limiter.ts`)

The SDK has two mechanisms for rate limits. The two mechanisms operate independently:

**Reactive (`retry.ts`)** — This mechanism operates on a 429 response after the server returns it:

1. If `Retry-After` gives a correct delay in seconds, `HttpTransport` puts that value in `RateLimitError.retryAfter`. This field keeps the full delay, also if the delay is more than `maxRetryDelay`.
2. `executeWithRetry` limits the wait before the next attempt to `maxRetryDelay`, jitter included.
3. If the header is missing, or if the transport cannot parse the header as a correct delay, `executeWithRetry` uses exponential backoff.

**Proactive (`rate-limiter.ts`)** — `createRateLimiterMiddleware` is an optional client-side token bucket. Before the transport sends a request, the middleware removes one unit from the bucket. If the bucket is empty, the middleware waits. If the middleware must wait longer than `maxWaitMs`, it throws `RateLimiterExhaustedError`. For the position of this middleware in the chain, refer to [Middleware](#middleware-layer).

`rate-limiter.ts` also exports the header parsers `getRetryAfterMs` and `parseRateLimitHeaders`. These parsers are not part of the rate limiter. They supply data to the reactive path (`RateLimitError.retryAfter`) and to `ApiResponse.rateLimit`.

### Pagination (`src/core/pagination.ts`)

The SDK has two pagination methods:

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

- Next page: The SDK gets the `cursor` value from the `_links.next` URL.
- Done: `_links.next` is missing, or `results` is empty.

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

- Next page: `startAt += values.length` (the number of items that the server returned). To calculate the next `startAt`, the SDK does not use the `maxResults` value of the response, because Jira can decrease or increase this value.
- Done: `isLast === true` OR `startAt + values.length >= total` OR `values.length < min(pageSize, serverMaxResults)` (short-page fallback). The short-page condition uses two values: the number of items that the caller requests (`pageSize`) and the `maxResults` value of the response. A server can set a `maxResults` value that is less than `pageSize`, and the response can have no `isLast` or `total`. In this condition, the iteration stops on the first page that has fewer items than this `maxResults` value. The iteration does not stop on a page that has exactly this number of items.
- Forward-progress guard: If the server returns an empty page during the iteration, but `total` (or `isLast === false`) shows that more data is available, the SDK throws `PaginationError`. Thus, the caller sees that the upstream server truncated the data. The SDK does not return only a part of the results without an error.

**Async iterators:**

The two clients have `*All()` resource methods that return `AsyncIterable<T>`:

```typescript
for await (const page of confluence.pages.listAll({ spaceId: '123' })) {
  // yields individual items across all pages
}
```

### Path Safety (`src/core/path.ts`)

The SDK percent-encodes all caller-supplied path segments (IDs, keys) before it makes the URL. It rejects dot-segment sequences (`../`, `./`) with `ValidationError`. These rules prevent path traversal vulnerabilities in all resource methods.

**Numeric ID validation:** Before the SDK puts `boardId` and `sprintId` (Jira agile resources) and `versionNumber` (Confluence versions) into a URL, it validates them as positive integers. If a value is not an integer or is not positive, the SDK immediately throws `ValidationError`. Thus, the SDK does not make incorrect URLs.

### Middleware Layer

`HttpTransport` accepts an optional `middleware` array in `ClientConfig`. Each middleware is a function `(req, next) => Promise<ApiResponse>`. A middleware can examine and change requests and responses.

The SDK has these built-in middleware factories:

| Export                           | File                 | Description                                                                                                                                                                                                                                                                                                                 |
| -------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createOAuthRefreshMiddleware`   | `oauth.ts`           | It adds the OAuth access token to the `Authorization` header. After a 401 response, it refreshes the access token (the token endpoint must use HTTPS). All requests use one `refreshPromise`. Thus, when two or more requests get a 401 response at the same time, the middleware refreshes the access token only one time. |
| `createConnectJwtMiddleware`     | `connect-jwt.ts`     | It signs each request with an HS256 JWT (QSH).                                                                                                                                                                                                                                                                              |
| `createCacheMiddleware`          | `cache.ts`           | An in-memory cache for GET responses (LRU, TTL). It validates `maxSize` and `ttl` when you construct the middleware. The cache keys are different for each authentication identity. Each cache key encodes each query parameter with `encodeURIComponent` to prevent key-collision attacks.                                 |
| `createBatchMiddleware`          | `batch.ts`           | Only GET or HEAD requests that are the same can use one request in progress. Requests with `responseType: 'stream'`, an `AbortSignal`, `formData`, or `binaryBody` always run independently. The key encoding with `encodeURIComponent` is the same as in the cache middleware.                                             |
| `createCircuitBreakerMiddleware` | `circuit-breaker.ts` | The circuit breaker counts network errors, timeouts, 5xx HTTP errors, and `ResponseTooLargeError`. When the counter gets to `failureThreshold`, the circuit breaker opens. Then it rejects requests with `CircuitBreakerOpenError`. After `resetTimeoutMs`, the next request is a half-open trial (B010).                   |
| `createRateLimiterMiddleware`    | `rate-limiter.ts`    | A proactive client-side token-bucket rate limiter. If the bucket is empty, it waits. If it must wait longer than `maxWaitMs`, it throws `RateLimiterExhaustedError` (B017).                                                                                                                                                 |

The SDK also exports these functions:

| Export                       | Description                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `signConnectJwt`             | A function that signs a JWT (iss, iat, exp, qsh).                                                                                          |
| `computeQsh`                 | It calculates the canonical request hash for a Connect JWT.                                                                                |
| `fetchRefreshedTokens`       | A function that sends a request to the token endpoint.                                                                                     |
| `verifyConnectAsymmetricJwt` | It validates an RS256 JWT that Atlassian Connect sends to the app. It accepts only the RS256 algorithm, and it rejects `none` and `HS256`. |

#### Middleware ordering

`HttpTransport` makes the middleware chain from the `middleware` array with `reduceRight`. Thus, the **first entry is the outermost middleware**. A request goes through the entries in the sequence of the array. The response goes back through the entries in the opposite sequence. The retry loop is _external_ to the middleware chain. Thus, when the transport retries a request, the request goes through the full chain again.

```
config.middleware = [a, b, c]

request:   a → b → c → fetch
response:  a ← b ← c ← fetch
```

The sequence of the middleware is important:

- **Caching wins _inside_ of auth.** `[oauth, cache, batch]` is correct for most apps. The OAuth middleware operates before the cache lookup for each request. If the cache is first, a cache hit returns the cached response before the OAuth middleware operates.
- **Batching wins _innermost_ of the auth and cache layers.** The cache returns the response for a cache hit. For cache misses without an `AbortSignal` at the same time with the same cache key, the cache gives only one request to the next middleware. Only the requests that the cache gives to the next middleware get to the batch middleware.
- **Connect JWT replaces OAuth, not stacks with it.** The JWT signature uses the request URL and the HTTP method that the transport sends. Thus, the JWT middleware must be the innermost authentication middleware. For Connect apps, use `[connectJwt, cache, batch]`. Do _not_ use `oauth` and `connectJwt` together.

The recommended sequences are:

| Description            | Middleware array                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OAuth 2.0 + cache      | `[oauthRefresh, cache, batch]`                                                                                                                                                                                           |
| Atlassian Connect app  | `[connectJwt, cache, batch]`                                                                                                                                                                                             |
| Plain Basic/Bearer app | `[cache, batch]` (no authentication middleware)                                                                                                                                                                          |
| Custom logging shim    | Put your logger in the outermost position (`[logger, oauthRefresh, cache, batch]`). Thus, it sees each cache hit. The retry loop is external to the chain. Thus, the logger runs once per attempt, not once per request. |

### OAuth Scope Detection (`src/core/scopes.ts`)

`detectRequiredScopes(operations)` returns the recommended granular Cloud OAuth 2.0 scope strings for a set of Atlassian operation names (for example, `'jira.issues.create'`). Tools can use `listKnownOperations()` to get the operation names that `detectRequiredScopes` knows. To validate scopes, the SDK uses a larger catalog that comes from the pinned snapshots. The catalog contains 273 recognized strings total:

- 247 unique granular scopes that OpenAPI operations refer to.
- 10 granular catalog entries that no OpenAPI operation refers to. These entries include `read:bulk-job:jira` and `write:bulk-job:jira`, which occur only in the OAuth 2.0 security scheme.
- 16 classic or Jira Software compatibility scopes.

### OpenAPI Type Generator (`src/core/openapi.ts`)

`generateTypes(spec)` generates TypeScript interface and type declarations from the `components.schemas` of an OpenAPI 3.x document. It generates TypeScript for these schema keywords: `$ref`, `allOf`, `oneOf`, `anyOf`, enum, nullable, and `additionalProperties`. It returns `{ source: string, typeNames: string[] }`.

**Injection protection:**

- The generator validates each schema name as a correct TypeScript identifier. If a name is not correct, the generator throws `ValidationError`.
- The generator escapes each `*/` sequence in a JSDoc description to `*\/`. Thus, a description cannot close the comment block.
- The generator escapes each `'` character in enum string values to `\'`.
- If a property name is not a correct TypeScript identifier (for example, `content-type`), the generator writes the name as a string (`'content-type'`).
- For `additionalProperties: { type: … }`, the generator writes an index signature (`[key: string]: T`). The generator does not ignore `additionalProperties`.

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
  readonly customContent: CustomContentResource;
  readonly whiteboards: WhiteboardsResource;
  readonly tasks: TasksResource;
  readonly versions: VersionsResource;
  // Additional resources: adminKey, app, classificationLevels, content,
  // dataPolicies, databases, embeds, folders, footerComments, inlineComments,
  // spacePermissions, spaceRoleMode, spaceRoles, users, usersBulk
}
```

**Base URL:** `${config.baseUrl}/wiki/api/v2`

### Resource Pattern

Each resource uses the same pattern:

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

The resources have these properties:

- They do not manage authentication or retries. The transport does these tasks.
- They make the `RequestOptions` and give them to the transport.
- They parse the responses into objects that have TypeScript types.
- They supply async iterators for paginated endpoints.

### Confluence-Specific Patterns

- **Version handling:** An update request must include `version.number` (the last version number + 1). The update TypeScript types include this field.
- **Body format:** The query parameter `body-format` sets the format of the response body (`storage`, `atlas_doc_format`, `view`).
- **IDs:** IDs have the TypeScript type `string` (the API returns them as strings in the JSON response bodies).
- **Soft delete:** Some `delete` resource methods (for example, `pages.delete()`) accept an optional `purge: true`. With this option, the resource method deletes the item permanently.

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
  // Additional Jira v3, Agile, Operations, Security, DevOps, Forge, and
  // Connect resources are exposed on the client. See src/jira/client.ts.
}
```

**Base URL:** `${config.baseUrl}/rest/api/3`
**Agile Base URL:** `${config.baseUrl}/rest/agile/1.0` (boards, sprints)

### Resource Pattern

The Jira resources use the same composition pattern as the Confluence resources, but they use offset pagination:

```typescript
class IssuesResource {
  async get(issueIdOrKey: string, params?: GetIssueParams): Promise<Issue> { ... }
  async create(data: CreateIssueData): Promise<CreatedIssue> { ... }
  // Resolves the edited Issue when params.returnIssue is true (typed overload); otherwise void
  async update(issueIdOrKey: string, data: UpdateIssueData, params?: UpdateIssueParams): Promise<void> { ... }
  async delete(issueIdOrKey: string): Promise<void> { ... }
  async getTransitions(issueIdOrKey: string): Promise<Transition[]> { ... }
  async transition(issueIdOrKey: string, data: TransitionData): Promise<void> { ... }
}
```

### Jira-Specific Patterns

- **ADF format:** Issue descriptions and comments use the Atlassian Document Format (JSON). The TypeScript types show this format.
- **Search endpoints:** The search resource has resource methods for the deprecated offset pagination endpoints `GET`/`POST /rest/api/3/search`. It also has resource methods for the cursor pagination endpoints `GET`/`POST /rest/api/3/search/jql`. Search responses use `{ issues: [...] }`, not `{ values: [...] }`.
- **Expand parameter:** With the optional `expand` parameter, the response includes more data. On most parameter types, `expand` is a comma-separated `string` (for example, `GetIssueParams.expand`). Some parameter types (for example, the JQL search parameters) use a `string[]`. The SDK changes this array to the shape that is necessary for the endpoint.
- **Issue keys:** The resource methods accept issue IDs, which contain only digits, and issue keys (for example, `PROJ-123`). The TypeScript type of the two is `string`.

---

## Public API Design

### Entry Point (`src/index.ts`)

This code shows some of the package-root exports:

```typescript
// Clients
export { ConfluenceClient } from './confluence/index.js';
export { JiraClient } from './jira/index.js';

// Core types & errors
export {
  AtlassianError, HttpError, AuthenticationError, ForbiddenError,
  NotFoundError, RateLimitError, TimeoutError, NetworkError,
  ValidationError, PaginationError, ResponseTooLargeError, OAuthError,
  CircuitBreakerOpenError, RateLimiterExhaustedError,
} from './core/index.js';

// Core infrastructure types
export type {
  ClientConfig, AuthConfig, BasicAuthConfig, BearerAuthConfig,
  RequestOptions, ApiResponse, RateLimitInfo, Transport, Logger, Middleware,
  RequestIdOptions,
} from './core/index.js';

export { resolveConfig, HttpTransport, executeWithRetry, createMiddlewareChain } from './core/index.js';
export type { RetryConfig } from './core/index.js';

export { extractCursor, paginateCursor, paginateOffset, paginateSearch } from './core/index.js';
export type { PaginateOptions, SearchPaginatedResponse } from './core/index.js';

export { toJSON } from './core/index.js';
export type { SerializableApiResponse } from './core/index.js';

// Middleware factories
export { createOAuthRefreshMiddleware, fetchRefreshedTokens } from './core/index.js';
export type { OAuthRefreshConfig, OAuthTokens } from './core/index.js';

export { createConnectJwtMiddleware, signConnectJwt, computeQsh, verifyConnectAsymmetricJwt } from './core/index.js';
export type { ConnectJwtConfig, AsymmetricJwtVerifyOptions } from './core/index.js';

export { createCacheMiddleware } from './core/index.js';
export type { CacheOptions } from './core/index.js';

export { createBatchMiddleware } from './core/index.js';

export { createCircuitBreakerMiddleware } from './core/index.js';
export type { CircuitBreakerOptions } from './core/index.js';

export { createRateLimiterMiddleware } from './core/index.js';
export type { RateLimiterOptions } from './core/index.js';

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

**None.** The package has no runtime dependencies.

The package uses only the Node.js built-ins of Node 24+:

- `fetch` (global, Node 24+)
- `AbortController` (global, Node 24+)
- `Buffer` (for the Base64 encoding of basic authentication)
- `URL` / `URLSearchParams` (to make URLs)

### Dev Dependencies

| Package                                      | Purpose                                                                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typescript`                                 | TypeScript 7. It builds the SDK and checks the source code and the documentation examples. It also supplies the compiler API for the codemap and for the source-analysis tests. |
| `@types/node`                                | The TypeScript type definitions for Node.js.                                                                                                                                    |
| `vitest`                                     | The test runner.                                                                                                                                                                |
| `@vitest/coverage-v8`                        | Test coverage with V8.                                                                                                                                                          |
| `oxlint`                                     | Linting for TypeScript and JavaScript.                                                                                                                                          |
| `oxfmt`                                      | Formatting for the source code, Markdown, and configuration files.                                                                                                              |
| `fast-check`                                 | Property-based testing.                                                                                                                                                         |
| `marked`                                     | It reads Markdown sections for the changelog check.                                                                                                                             |
| `conventional-changelog`                     | It generates the changelog entries (`npm run changelog`).                                                                                                                       |
| `conventional-changelog-conventionalcommits` | It parses Conventional Commits messages and formats their changelog entries.                                                                                                    |
| `undici`                                     | It supplies the HTTP dispatcher for the integration tests of the transport timeout.                                                                                             |
| `yaml`                                       | It parses the GitHub Actions workflow definitions for the CI tests and the release tests.                                                                                       |

---

## Extension Points

You can extend the architecture without breaking changes:

1. **Custom transport:** Through `config.transport`, supply a `Transport` object that you write (for example, for logging, metrics, or a proxy).
2. **Custom middleware:** Supply a `Middleware[]` through `config.middleware`. You can put the OAuth, cache, and batch middleware and the middleware that you write in the sequence that you select.
3. **New auth strategies:** Add new `AuthProvider` objects. It is not necessary to change other code.
4. **New resources:** Add resource files to `confluence/resources/` or `jira/resources/`. Then connect the new resources to the client constructor.
5. **Custom retry logic:** You can set the retry count, the base delay, and the maximum delay in the client configuration.

---

## CLI Layer

### Overview

The `atlas` CLI gives a command-line interface to the two APIs. It uses the client classes of the SDK directly.

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
├── version.ts        # Package-version resolution for atlas --version
├── types.ts          # CLI-specific types
└── commands/
    ├── confluence.ts # All Confluence resource handlers
    ├── jira.ts       # All Jira resource handlers
    ├── scopes.ts     # atlas scopes validate (OAuth scope checker)
    └── install-skill.ts # Thin delegate to src/skill-installer/ (installSkill, InstallSkillError)
```

The installer of the bundled skill is in a different module, `src/skill-installer/index.ts` (`installSkill`, `InstallSkillError`, `FilesystemDeps`). Thus, other code can use the install logic, and unit tests can examine it independently of the CLI command parser. The `commands/install-skill.ts` handler contains almost no logic. It rejects subcommands and positional arguments, calls `installSkill`, and shows the result or the error message.

### Auth Resolution

For each value, the CLI uses the first source in this sequence that has the value:

1. CLI flags: `--base-url`, `--auth-type`, `--email`, `--token`
2. Environment variables: `ATLASSIAN_BASE_URL`, `ATLASSIAN_AUTH_TYPE`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`
3. If no source has a necessary value, the CLI shows an error message. The message gives the names of the missing flag and of the environment variable.

**Supported `--auth-type` values:**

| Value    | Necessary inputs                   | `ClientConfig.auth` value                   |
| -------- | ---------------------------------- | ------------------------------------------- |
| `basic`  | `--base-url`, `--email`, `--token` | `{ type: 'basic', email, apiToken: token }` |
| `bearer` | `--base-url`, `--token`            | `{ type: 'bearer', token }`                 |

The default is `basic`. If the value is unknown, the CLI uses `basic`. Thus, the commands that operated before continue to operate. In bearer mode, `--email` is not necessary. In the two modes, `--token` is necessary.

### Output Formats

| Format    | Flag                      | Description                               |
| --------- | ------------------------- | ----------------------------------------- |
| `json`    | `--format json` (default) | Output for `jq` pipes and for scripts     |
| `table`   | `--format table`          | Output for a person to read in a terminal |
| `minimal` | `--format minimal`        | Only IDs or keys, for `xargs` commands    |

### Design Decisions

- **Zero CLI dependencies** — The CLI uses the built-in Node.js `util.parseArgs` (stable in Node 24+).
- **Reuses library clients** — The CLI commands construct a `ConfluenceClient` or a `JiraClient` and call its resource methods.
- **Pipe-friendly** — The default output is JSON. The CLI writes errors to stderr and data to stdout.
- **Stateless** — The CLI does not use configuration files or authentication sessions. It reads the authentication values again for each command.

---

## Build & Output

**Build tool:** `npm run build` runs the TypeScript 7 compiler (`tsc`).

**Output:**

- `dist/` — the compiled JavaScript (ESM), the declaration files (`.d.ts`), and the source maps

**Module format:** ESM-only (`"type": "module"` in `package.json`). On Node 24+, CommonJS callers can `require()` the ESM package root directly. Node 22.12 made `require(ESM)` available without a flag.

**Published files:**

- `dist/` — the compiled output
- `skill/` — bundled coding-agent skill and reference files
- `README.md`
- `LICENSE`
- `CHANGELOG.md`
- `SECURITY.md`
- `docs/ARCHITECTURE.md`

**Excluded from package:**

- `src/` (the TypeScript source)
- `test/` (the tests)
- `examples/` (the development examples)
- The other `docs/` files, which the `files` field of `package.json` does not include
- The configuration files for TypeScript, Vitest, Oxlint, and Oxfmt
