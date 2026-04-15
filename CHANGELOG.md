# Changelog

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
