# BACKLOG

> Active backlog only. Completed / obsolete / shipped history lives in `docs/backlog-archive.md`.
> Status: `[ ]` pending · `[~]` in progress
> Work in phase order unless item deps say otherwise.

## Phase 0 — Documentation

- `B001 [ ] P1 | JSDoc public exports`
  - files: `src/index.ts`, `src/core/index.ts`, referenced public type files | deps: none
  - do: add JSDoc to public exports; include examples for `ClientConfig`, `AuthProvider`, `HttpTransport`, `RetryConfig`; keep typedoc/tsc clean.

## Phase 3 — Type organization

- `B007 [ ] P1 | Split Confluence types by domain`
  - files: `src/confluence/types/*`, `src/confluence/index.ts` | deps: B006 archived
  - do: split `src/confluence/types.ts` into domain files capped at about 100 lines; preserve existing public exports.

- `B008 [ ] P1 | Split Jira types by domain`
  - files: `src/jira/types/*`, `src/jira/index.ts` | deps: B007
  - do: split `src/jira/types.ts` into domain files; preserve current public API and import surface.

## Phase 4 — Reliability

- `B010 [ ] P2 | Circuit breaker`
  - files: `src/core/circuit-breaker.ts`, `src/core/config.ts`, `src/core/transport.ts`, `test/core/circuit-breaker.test.ts` | deps: B006 archived
  - do: add per-`baseUrl` closed/open/half-open breaker with configurable threshold and recovery timeout plus transition coverage.

- `B011 [ ] P2 | Request ID propagation`
  - files: `src/core/types.ts`, `src/core/transport.ts`, `src/core/errors.ts`, `test/core/transport.test.ts` | deps: B006 archived
  - do: generate and send `X-Request-Id`, capture response request IDs, and surface them in response/error metadata and logs.

## Phase 5 — Testing

- `B012 [ ] P1 | Mock-server transport tests`
  - files: `test/mock-server/*` | deps: B006 archived
  - do: add real HTTP/mock-server coverage for retries, structured errors, pagination, streaming, and URL encoding.

- `B013 [ ] P1 | CLI E2E tests`
  - files: `test/e2e/cli.test.ts`, `test/e2e/helpers/*` | deps: none
  - do: exercise help, routing, invalid commands, formatted output, and auth-failure paths against a mock server.

- `B014 [ ] P2 | Property-based tests`
  - files: `test/property/*` | deps: B006 archived
  - do: cover URL encoding, JWT signing, pagination, and backoff invariants with 100+ iterations per property.

## Phase 6 — Security & advanced

- `B015 [ ] P2 | RS256 support for Connect JWT`
  - files: `src/core/connect-jwt.ts`, `src/core/index.ts` | deps: none
  - do: add RS256 signing + middleware alongside HS256, export it, and document when each mode should be used.

- `B016 [ ] P2 | OAuth concurrent refresh retry queue`
  - files: `src/core/oauth.ts`, `test/core/oauth.test.ts` | deps: none
  - do: replace herd-prone refresh retries with one in-flight refresh plus bounded staggered retries for waiters.

- `B017 [ ] P3 | Proactive rate-limit awareness`
  - files: `src/core/rate-limiter.ts`, `src/core/config.ts`, `src/core/transport.ts`, `test/core/rate-limiter.test.ts` | deps: B010
  - do: add token-bucket pre-waiting from rate-limit headers while preserving current reactive fallback.

## Phase 7 — Automation

- `B018 [ ] P2 | OpenAPI type regeneration in CI`
  - files: `scripts/regenerate-types.ts`, `.github/workflows/*`, `package.json`, `README.md` | deps: none
  - do: regenerate Atlassian types in CI, fail on drift, and document the update flow.

- `B019 [ ] P3 | \`atlas scopes validate\` CLI command`
  - files: `src/cli/commands/scopes.ts`, `src/cli/router.ts`, `src/core/scopes.ts` | deps: none
  - do: add scope validation for requested operations with useful exit codes and help text.

## Phase 8 — Open security findings

- `B025 [ ] P1 | OpenAPI $ref code injection hardening`
  - files: `src/core/openapi.ts`, `test/core/openapi.test.ts` | deps: none
  - do: validate `$ref` targets and emitted string literals so untrusted specs cannot inject executable TypeScript.

- `B026 [ ] P2 | Response body size cap`
  - files: `src/core/response.ts`, `src/core/config.ts`, `src/core/errors.ts`, `src/core/types.ts`, `test/core/response.test.ts` | deps: none
  - do: add `maxResponseBytes`, enforce it for buffered responses, and throw `ResponseTooLargeError` on overflow.

- `B028 [ ] P2 | OAuth error-body redaction hardening`
  - files: `src/core/oauth.ts`, `test/core/oauth.test.ts` | deps: none
  - do: replace fragile regex redaction with structured JSON redaction plus a safer fallback for non-JSON bodies.

- `B031 [ ] P2 | Real CLI version output`
  - files: `src/cli/index.ts`, `src/cli/commands/install-skill.ts`, `test/cli/version.test.ts` | deps: none
  - do: read version from `package.json` via shared helper, remove hardcoded `VERSION`, and add a smoke test.

- `B035 [ ] P2 | Expand log-path credential redaction`
  - files: `src/core/request.ts`, `test/core/request.test.ts` | deps: none
  - do: broaden sensitive marker coverage, handle encoded delimiters, and share one keyword list across redactors.
