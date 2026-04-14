# Changelog

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
