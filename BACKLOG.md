# Backlog

Priority levels:

- **P0** — Must-have for v1 release
- **P1** — Should-have for v1 (implement if time permits)
- **P2** — Nice-to-have (future versions)

---

## P0 — Must-Have

### Audit Remediation

- [x] Encode all user-controlled path segments before URL construction to prevent same-host path traversal across Jira and Confluence resource methods
- [x] Reject non-HTTPS `baseUrl` values before sending authenticated requests

### Core Infrastructure

- [x] HTTP transport abstraction (native fetch)
- [x] Configuration model with validation
- [x] Auth strategies: Basic (email + API token), Bearer (OAuth/PAT)
- [x] Typed error hierarchy (AtlassianError, HttpError, AuthError, RateLimitError, TimeoutError, NetworkError, ValidationError)
- [x] Retry with exponential backoff and jitter
- [x] Rate-limit handling (429 + Retry-After)
- [x] Timeout support via AbortController
- [x] Cursor-based pagination helper (Confluence)
- [x] Offset-based pagination helper (Jira)

### Confluence v2 Client

- [x] ConfluenceClient entry point
- [x] Pages resource (list, get, create, update, delete, listAll)
- [x] Spaces resource (list, get, listAll)
- [x] Blog Posts resource (list, get, create, update, delete, listAll)
- [x] Footer Comments resource (list, get, create, update, delete)
- [x] Inline Comments resource (list, get, create, update, delete)
- [x] Attachments resource (list, get, delete)
- [x] Labels resource (list for pages, spaces, blog posts)

### Jira v3 Client

- [x] JiraClient entry point
- [x] Issues resource (get, create, update, delete, getTransitions, transition)
- [x] Projects resource (list, get, listAll)
- [x] Search resource (search POST, searchGet GET, searchAll iterator)
- [x] Users resource (get, getCurrentUser, search)
- [x] Issue Types resource (list, get)
- [x] Priorities resource (list, get)
- [x] Statuses resource (list)

### CLI (`atlas`)

- [x] CLI entry point with `#!/usr/bin/env node`
- [x] Command router: `atlas <api> <resource> <action> [args] [options]`
- [x] Confluence commands: pages, spaces, blog-posts, comments, attachments, labels
- [x] Jira commands: issues, projects, search, users, issue-types, priorities, statuses
- [x] Auth resolution: CLI flags > env vars (ATLASSIAN_BASE_URL, ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN)
- [x] Output formatters: json (default), table, minimal
- [x] Help system (--help for global, per-api, per-resource)
- [x] Version flag (--version)
- [x] Error messages for invalid commands/missing auth

### Quality & Packaging

- [x] TypeScript strict mode, no implicit any
- [x] ESLint strict config, zero warnings/errors
- [x] Vitest with 100% coverage on all metrics
- [x] ESM build output with declarations
- [x] package.json with correct exports, types, engines, files
- [x] npm pack produces clean minimal package

### Documentation

- [x] README.md
- [x] CHANGELOG.md
- [x] SECURITY.md
- [x] CONTRIBUTING.md
- [x] docs/ARCHITECTURE.md
- [x] docs/IMPLEMENTATION_PLAN.md
- [x] docs/FINAL_REPORT.md
- [x] Examples (Confluence, Jira, pagination, error handling)

---

## P1 — Should-Have

### Audit Remediation

- [x] Validate CLI numeric options (`--version-number`, `--limit`, `--max-results`) and fail fast on invalid values
- [x] Validate public pagination sizes (`maxResults` / `pageSize`) to reject zero, negative, and unbounded values
- [x] Enforce `npm run validate` in GitHub Actions CI so coverage thresholds and build checks gate merges
- [x] Add negative-path tests for invalid identifiers, invalid page sizes, invalid numeric CLI flags, and non-HTTPS base URLs
- [x] Align README runtime requirements with `package.json`, `.nvmrc`, and CI
- [x] Move tests from `test/coverage-gaps.test.ts` into module-specific test files

### Features

- [x] Confluence attachment upload (multipart/form-data)
- [x] Jira attachment upload (multipart/form-data + X-Atlassian-Token)
- [x] Jira issue comments resource (list, get, create, update, delete)
- [x] Jira issue attachments resource (list, get)
- [x] Jira labels resource (list all labels)
- [x] Confluence content properties support
- [x] Request/response logging abstraction
- [x] Custom middleware/interceptor hook on transport

### Quality

- [x] TSDoc comments on all public types and methods
- [x] Example smoke tests (compile verification)
- [x] Performance benchmarks for pagination over large datasets

---

## P2 — Nice-to-Have (Future)

### Features

- [x] Confluence Custom Content resource
- [x] Confluence Whiteboard resource
- [x] Confluence Tasks resource
- [x] Confluence Versions resource
- [x] Jira Agile board endpoints (boards, sprints)
- [x] Jira workflow management
- [x] Jira dashboard and filter CRUD
- [x] Jira fields and field configuration
- [x] Jira webhook management
- [x] Jira JQL autocomplete/parse/sanitize
- [x] Jira bulk issue operations
- [x] OAuth 2.0 token refresh flow
- [x] Connect JWT authentication
- [x] CJS dual output
- [x] OpenAPI spec-based type generation
- [x] Response caching layer
- [x] Request batching
- [x] Automatic scope detection for OAuth
- [x] CI/CD pipeline (GitHub Actions)
- [x] Automated npm publishing workflow
- [x] Changelog generation from commits
