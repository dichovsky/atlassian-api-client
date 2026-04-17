# Changelog

## Unreleased

### Added

- **transport** — `ApiResponse<T>` now exposes a `rateLimit?: RateLimitInfo` field populated from `x-ratelimit-*` response headers on every successful request. When `nearLimit === true` the configured `logger` emits a `warn` so callers can proactively slow down before a 429.
- **transport** — `RequestOptions.signal?: AbortSignal` lets callers cancel in-flight requests (e.g. React `useEffect` cleanup, CLI SIGINT). The caller signal is composed with the internal timeout signal via `AbortSignal.any`; external aborts surface as `AbortError` while timeouts still throw `TimeoutError`.
- **cli** — `--auth-type basic|bearer` flag (and `ATLASSIAN_AUTH_TYPE` env var) so the `atlas` CLI can call Atlassian APIs with an OAuth/PAT bearer token. `--email` is not required when `bearer` is selected; `--token` is still required. Unknown values fall back to `basic` to preserve the historical default for existing invocations.

### Changed

- **transport** — 429 `Retry-After` delays now receive `0..retryDelay` jitter on top of the server-advertised floor (still bounded by `maxRetryDelay`). Prevents synchronized retry stampedes from clients that share a rate-limit bucket.
- **transport** — the retry loop now wraps the middleware chain (previously middleware wrapped retry). Errors thrown from middleware — including `OAuthError` with a 5xx refresh status — are now eligible for the standard retry/backoff path.
- **oauth** — `OAuthError` now extends `HttpError` (previously `AtlassianError`) and sets `status = refreshStatus ?? 0`. Transient token-endpoint failures (5xx) are retried automatically via `shouldRetry`; 4xx stay fatal. Public error `code` remains `'OAUTH_ERROR'`.
- **pagination** — offset paginators (`paginateOffset`, `paginateSearch`) now terminate when the server returns a short page (`values.length < maxResults` / `issues.length < maxResults`), even if `isLast` and `total` are absent from the response. Prevents infinite loops against servers that clamp page size without populating those fields.

## 0.5.0 (2026-04-16)

### Fixed

- **transport** — `HttpTransport` previously held two distinct `baseUrl` values: `config.baseUrl` (the raw instance URL) and a separate constructor parameter (the API-specific URL). Only the constructor argument was ever used for URL construction, making `config.baseUrl` a silent dead field inside the transport class and creating a confusing dual-source of truth. The redundant private field has been removed; clients now pass `{ ...resolved, baseUrl: apiUrl }` so `config.baseUrl` is the sole source used for URL construction. The second constructor parameter is retained as an optional, deprecated overload for backwards compatibility — when supplied it overrides `config.baseUrl` exactly as before, so existing call sites are unaffected.

## 0.4.0 (2026-04-16)

### Security

- **oauth** — `tokenEndpoint` is now validated to require HTTPS, preventing credential exfiltration to non-encrypted endpoints (SSRF)
- **oauth** — concurrent 401 responses now trigger exactly one token refresh via a shared `refreshPromise`, eliminating the race condition that could rotate refresh tokens multiple times
- **transport** — caller-supplied `Authorization` headers are stripped before merging so the configured auth provider always wins; prevents auth bypass via middleware
- **transport** — debug logging now records `method + path` only; query strings (which may contain cursor tokens or filter values) are no longer written to logs
- **errors** — `HttpError.toJSON()` omits `responseBody` so raw API payloads do not leak into log aggregators via `JSON.stringify(error)`
- **openapi** — schema names are validated as legal TypeScript identifiers; `*/` sequences in descriptions are escaped; single quotes in enum string values are escaped — prevents code injection in generated source
- **cache / batch** — cache and deduplication keys now `encodeURIComponent`-encode each query key and value, eliminating key-collision attacks via crafted query parameters
- **boards / sprints** — `boardId` and `sprintId` are validated as positive integers before URL interpolation
- **versions** — `versionNumber` is validated as a positive integer before URL interpolation
- **cli router** — `strict: false` removed; unknown CLI flags now throw instead of being silently swallowed (typos in `--token` no longer fall back to env-var auth unnoticed)
- **cli jira search** — positional argument as raw JQL removed; `--jql` is now required explicitly

### Changed

- **cache** — `createCacheMiddleware` throws `ValidationError` for `maxSize < 1` or `ttl ≤ 0` at construction time
- **openapi** — property names that are not valid JS identifiers (e.g. `content-type`) are now emitted as quoted keys (`'content-type'`)
- **openapi** — `additionalProperties: { type: … }` in object schemas now emits a typed index signature (`[key: string]: T`) rather than being silently dropped
- **openapi** — `generateTypes` return field was already `source`; README and ARCHITECTURE docs corrected to match
- **tsconfig.cjs** — `moduleResolution` kept at `Node10` (required by `module: CommonJS`); `ignoreDeprecations: "6.0"` added to silence TypeScript 6.x deprecation warning

## 0.3.0 (2026-04-15)

### Added

- **OAuth 2.0 token refresh** — `createOAuthRefreshMiddleware` automatically injects
  `Authorization: Bearer` and refreshes the access token on 401 responses, with an
  `onTokenRefreshed` callback for token persistence
- **Atlassian Connect JWT auth** — `createConnectJwtMiddleware` signs every request
  with HS256 JWT per the Atlassian Connect spec (QSH, iss, iat, exp claims); `computeQsh`
  and `signConnectJwt` exported for advanced use
- **Response caching** — `createCacheMiddleware` caches GET responses in memory with
  configurable TTL, max-size (FIFO eviction), and per-method opt-in
- **Request batching / deduplication** — `createBatchMiddleware` coalesces concurrent
  identical in-flight requests so only one HTTP call is made
- **OAuth scope detection** — `detectRequiredScopes` maps Atlassian operation names
  (e.g. `'jira.issues.create'`) to required Cloud OAuth 2.0 scopes; `listKnownOperations`
  for tooling and documentation
- **OpenAPI type generation** — `generateTypes` converts an OpenAPI 3.x
  `components.schemas` document into TypeScript `interface` and `type` declarations
  (supports `$ref`, `allOf`, `oneOf`, `anyOf`, enum, nullable, `additionalProperties`)
- `OAuthError` added to the public error hierarchy (code `'OAUTH_ERROR'`)

## 0.2.0 (2026-04-15)

### Added

- **Jira** — Issue comments resource (list, get, create, update, delete)
- **Jira** — Issue attachments resource (list, get, upload)
- **Jira** — Labels resource (list all labels)
- **Jira** — Agile boards resource (list, get, list issues)
- **Jira** — Sprints resource (get, create, update, delete, list issues)
- **Jira** — Workflows resource (list, get)
- **Jira** — Dashboards resource (list, get, create, update, delete)
- **Jira** — Filters resource (list, get, create, update, delete)
- **Jira** — Fields resource (list, listAll, create, update, delete)
- **Jira** — Webhooks resource (list, register, delete)
- **Jira** — JQL helpers (getAutocompleteData, parse, sanitize, getSuggestions)
- **Jira** — Bulk issue operations (createBulk, setPropertyBulk, deletePropertyBulk)
- **Confluence** — Attachment upload (multipart/form-data)
- **Confluence** — Content properties resource (list, get, create, update, delete)
- **Confluence** — Custom content resource (list, get, create, update, delete)
- **Confluence** — Whiteboards resource (get, create, delete)
- **Confluence** — Tasks resource (list, get, update)
- **Confluence** — Versions resource (list and get for pages and blog posts)
- Request/response logging abstraction via `Logger` interface
- Middleware / interceptor chain on `HttpTransport`
- TSDoc comments on all public types and methods
- CJS dual output (`dist/cjs/`) for CommonJS consumers
- GitHub Actions CI workflow enforcing build, type-check, lint, and 100% coverage
- Automated npm publish workflow

### Fixed

- Path traversal: all user-controlled path segments are now percent-encoded before
  URL construction; dot-segment sequences (`../`, `./`) are rejected with
  `ValidationError` across all Jira and Confluence resource methods
- CLI numeric options (`--limit`, `--max-results`, `--version-number`) validated and
  fail-fast on non-integer or out-of-range input
- Pagination sizes (`maxResults` / `pageSize`) reject zero, negative, and unbounded values
- Non-HTTPS `baseUrl` values are rejected at config resolution time

## 0.1.0 (2026-04-14)

### Added

- Confluence Cloud REST API v2 client
  - Pages, Spaces, Blog Posts, Comments (footer + inline), Attachments, Labels
  - Cursor-based pagination with async iterators
- Jira Cloud Platform REST API v3 client
  - Issues (CRUD + transitions), Projects, Search (JQL), Users, Issue Types, Priorities, Statuses
  - Offset-based pagination with async iterators
- Core infrastructure
  - Zero-dependency HTTP transport (native fetch)
  - Basic auth (email + API token) and Bearer auth (OAuth/PAT)
  - Retry with exponential backoff and jitter
  - Rate-limit handling (429 + Retry-After)
  - Timeout support via AbortController
  - Typed error hierarchy
- CLI (`atlas`) for both APIs
  - Command syntax: `atlas <api> <resource> <action> [options]`
  - JSON, table, and minimal output formats
  - Auth via flags or environment variables
