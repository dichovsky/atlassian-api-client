# Backlog

Priority levels:

- **P0** — Must-have for v1 release
- **P1** — Should-have for v1 (implement if time permits)
- **P2** — Nice-to-have (future versions)

---

## P0 — Must-Have

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

### Features

- [ ] Confluence attachment upload (multipart/form-data)
- [ ] Jira attachment upload (multipart/form-data + X-Atlassian-Token)
- [ ] Jira issue comments resource (list, get, create, update, delete)
- [ ] Jira issue attachments resource (list, get)
- [ ] Jira labels resource (list all labels)
- [ ] Confluence content properties support
- [ ] Request/response logging abstraction
- [ ] Custom middleware/interceptor hook on transport

### Quality

- [ ] TSDoc comments on all public types and methods
- [ ] Example smoke tests (compile verification)
- [ ] Performance benchmarks for pagination over large datasets

---

## P2 — Nice-to-Have (Future)

### Features

- [ ] Confluence Custom Content resource
- [ ] Confluence Whiteboard resource
- [ ] Confluence Tasks resource
- [ ] Confluence Versions resource
- [ ] Jira Agile board endpoints (boards, sprints, epics)
- [ ] Jira workflow management
- [ ] Jira dashboard and filter CRUD
- [ ] Jira fields and field configuration
- [ ] Jira webhook management
- [ ] Jira JQL autocomplete/parse/sanitize
- [ ] Jira bulk issue operations
- [ ] OAuth 2.0 token refresh flow
- [ ] Connect JWT authentication
- [ ] CJS dual output
- [ ] OpenAPI spec-based type generation
- [ ] Response caching layer
- [ ] Request batching
- [ ] Automatic scope detection for OAuth
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated npm publishing workflow
- [ ] Changelog generation from commits
