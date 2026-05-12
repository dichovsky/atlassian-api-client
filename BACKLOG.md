# BACKLOG

> Generated from deep code review — 2026-04-24.
> All items are atomic, testable, and ordered by implementation sequence.
> Status: `[ ]` pending · `[~]` in progress · `[x]` done

---

## Implementation Sequence

The items are grouped into **phases**. Each phase should be completed before the next begins due to dependencies.

| Phase | Name                             | Items            | Why This Order                                                                                                                                                                                                                                                                                                                             |
| ----- | -------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | Documentation                    | B001             | No code changes; unblocks consumers immediately                                                                                                                                                                                                                                                                                            |
| 1     | Type correctness                 | B002, B003       | Low-risk, high-impact; no behavioral changes                                                                                                                                                                                                                                                                                               |
| 2     | Transport refactor               | B004, B005, B006 | High-risk; needs its own focus; unblocks later items                                                                                                                                                                                                                                                                                       |
| 3     | Type organization                | B007, B008       | Mechanical split; benefits from transport refactor being stable                                                                                                                                                                                                                                                                            |
| 4     | Reliability                      | B009, B010, B011 | Builds on refactor; adds runtime behavior                                                                                                                                                                                                                                                                                                  |
| 5     | Testing                          | B012, B013, B014 | Depends on all code changes being stable                                                                                                                                                                                                                                                                                                   |
| 6     | Security & advanced              | B015, B016, B017 | Lower urgency; requires design discussion                                                                                                                                                                                                                                                                                                  |
| 7     | Automation                       | B018, B019, B020 | CI/CD; can be done incrementally                                                                                                                                                                                                                                                                                                           |
| 8     | Confluence v2 spec compliance    | B021–B062        | Aligns Confluence client with official OpenAPI v2 spec (`_v=1.8494.0`, 213 ops, 29 tags). Foundation → schema → endpoint additions → new resources → migration                                                                                                                                                                             |
| 9     | Jira Platform v3 spec compliance | B069–B187        | Aligns Jira client with official Jira Platform v3 OpenAPI spec (~600 ops, ~80 tags). Cross-cutting → schema → endpoint additions → new resources → migration. Independent of Phase 8 except for explicit per-item shared-prereq gates. Out of scope: experimental ops (Phase 9b), CLI parity (Phase 9c), Agile (Phase 10), JSM (Phase 11). |

---

## Phase 0 — Documentation (no code changes)

### [ ] B001: Add JSDoc to all public exports

- **Priority:** P1 — High
- **Description:** Add JSDoc documentation to every exported type, interface, class, and function in `src/index.ts` and `src/core/index.ts`. Each public API needs: description, parameter descriptions for multi-param functions, return type description, and usage example where non-obvious.
- **Acceptance criteria:**
  - [ ] All 80+ exported symbols in `src/index.ts` have JSDoc
  - [ ] `npx tsc` passes with no type errors
  - [ ] `npx typedoc` generates complete documentation without missing symbols
  - [ ] `ClientConfig`, `AuthProvider`, `HttpTransport`, `RetryConfig` have usage examples
- **Files:** `src/index.ts`, `src/core/index.ts`, all referenced type files
- **Dependencies:** None

---

## Phase 1 — Type Correctness (low-risk, high-impact)

### [ ] B002: Fix `ApiResponse<T>.error` to preserve structured error data

- **Priority:** P0 — Critical
- **Description:** Change `error?: string` to `error?: string | Record<string, unknown>` in `ApiResponse<T>` and `SerializableApiResponse<T>`. Atlassian APIs return structured errors like `{ error: '...', errorSummary: '...', errorContext: [...] }`. The current `string` typing discards this data. Update `toJSON()` in `SerializableApiResponse` to handle the union type.
- **Acceptance criteria:**
  - [ ] `ApiResponse.error` type is `string | Record<string, unknown> | undefined`
  - [ ] `toJSON()` serializes both string and object error values correctly
  - [ ] All existing tests pass (update any that assert `error` is string)
  - [ ] Breaking change noted in changelog; migration guide for consumers
- **Files:** `src/core/types.ts`, `src/core/response.ts`, affected test files
- **Dependencies:** None

### [ ] B003: Add `retryAfter` property to `RateLimitError`

- **Priority:** P1 — High
- **Description:** `RateLimitError` currently doesn't carry the parsed `retryAfter` value. Add `retryAfter?: number` (seconds) to the class and include it in the constructor. Update `createHttpError` factory to pass it. Consumers can then display "Please retry after X seconds" to users.
- **Acceptance criteria:**
  - [ ] `RateLimitError` has optional `retryAfter: number` property (seconds)
  - [ ] `createHttpError` passes `retryAfter` when status is 429
  - [ ] `RateLimitError` constructor accepts and stores `retryAfter`
  - [ ] Unit test: creating `RateLimitError` with `retryAfter` preserves value
  - [ ] Unit test: creating `RateLimitError` without `retryAfter` is `undefined`
- **Files:** `src/core/errors.ts`, `test/core/errors.test.ts`
- **Dependencies:** None

---

## Phase 2 — Transport Refactor (high-risk, needs own focus)

### [ ] B004: Extract retry loop into `src/core/retry-logic.ts`

- **Priority:** P0 — Critical
- **Description:** The retry loop in `transport.ts` (~90 lines, roughly lines 170-260) handles: attempt counting, exponential backoff calculation, jitter application, network error detection, status code checking, and delay waiting. Extract this into a standalone `executeWithRetry(config, operation)` function. The function should accept the request context and an async operation, returning the result or throwing the final error.
- **Acceptance criteria:**
  - [ ] `executeWithRetry` function exists in `src/core/retry-logic.ts`
  - [ ] Behavior is identical: same retryable status codes (429, 500, 502, 503, 504), same delay calculation, same jitter
  - [ ] `transport.ts` calls `executeWithRetry` instead of inline loop
  - [ ] `transport.ts` reduced by at least 60 lines
  - [ ] All existing retry tests pass
  - [ ] New tests for edge cases: max retries exhausted, all retries network errors, mix of retryable + non-retryable
- **Files:** `src/core/retry-logic.ts` (new), `src/core/transport.ts`, `test/core/retry*.test.ts`
- **Dependencies:** None

### [ ] B005: Extract middleware builder into `src/core/middleware.ts`

- **Priority:** P0 — Critical
- **Description:** Middleware application in `transport.ts` uses `reduceRight` to compose middlewares. Extract the middleware chain builder into its own module: `createMiddlewareChain(middlewares, handler)`. This makes the chain composable and testable independently.
- **Acceptance criteria:**
  - [ ] `createMiddlewareChain` exists in `src/core/middleware.ts`
  - [ ] Middleware execution order is identical (outermost-first via reduceRight)
  - [ ] `transport.ts` uses `createMiddlewareChain` instead of inline reduceRight
  - [ ] Tests verify middleware order with a tracing middleware
  - [ ] Empty middleware array returns identity handler
- **Files:** `src/core/middleware.ts` (new), `src/core/transport.ts`, `test/core/middleware.test.ts` (new)
- **Dependencies:** B004 (do both in same PR to minimize breakage surface)

### [ ] B006: Reduce `transport.ts` to under 200 lines

- **Priority:** P0 — Critical
- **Description:** After B004 and B005, `transport.ts` should be reduced from 361 to under 200 lines. The remaining file should only contain: `HttpTransport` class definition, request building, response parsing dispatch (json/arrayBuffer/stream), and the `execute` method as a thin orchestrator. Any remaining large functions (e.g., request building, response type dispatch) should be extracted to `src/core/request.ts` and `src/core/response.ts`.
- **Acceptance criteria:**
  - [ ] `transport.ts` is <= 200 lines
  - [ ] `HttpTransport` class still has the same public API (no breaking changes)
  - [ ] All tests pass
  - [ ] `npx tsc` passes with no type errors
  - [ ] Code review confirms each remaining function is <50 lines
- **Files:** `src/core/transport.ts`, `src/core/request.ts` (possibly new), `src/core/response.ts` (possibly new)
- **Dependencies:** B004, B005

---

## Phase 3 — Type Organization (mechanical splits)

### [x] B007: Split `src/confluence/types.ts` into domain files

- **Priority:** P1 — High
- **Description:** `src/confluence/types.ts` is 433 lines. Split by domain: `page.ts` (Page, CreatePageParams, UpdatePageParams), `space.ts` (Space, CreateSpaceParams), `attachment.ts` (Attachment), `blogPost.ts` (BlogPost), `comment.ts` (FooterComment, InlineComment), `contentProperty.ts` (ContentProperty), `customContent.ts` (CustomContent), `whiteboard.ts` (Whiteboard), `task.ts` (ConfluenceTask), `version.ts` (ContentVersion). Each file exports its types and re-exports from others as needed. Update `src/confluence/index.ts` barrel.
- **Acceptance criteria:**
  - [ ] Each new type file is <= 100 lines
  - [ ] `src/confluence/types.ts` either removed or reduced to <= 20 lines (re-exports only)
  - [ ] All imports of confluence types resolve correctly
  - [ ] `npx tsc` passes with no type errors
  - [ ] All tests pass
  - [ ] No breaking changes to public API (type names and exports unchanged)
- **Files:** `src/confluence/types/page.ts`, `src/confluence/types/space.ts`, `src/confluence/types/attachment.ts`, `src/confluence/types/blogPost.ts`, `src/confluence/types/comment.ts`, `src/confluence/types/contentProperty.ts`, `src/confluence/types/customContent.ts`, `src/confluence/types/whiteboard.ts`, `src/confluence/types/task.ts`, `src/confluence/types/version.ts`, `src/confluence/types/index.ts`, `src/confluence/index.ts`
- **Dependencies:** B006 (stable base)

### [ ] B008: Split `src/jira/types.ts` into domain files

- **Priority:** P1 — High
- **Description:** `src/jira/types.ts` is 228 lines. Split by domain: `issue.ts` (Issue, CreatedIssue, CreateIssueData, UpdateIssueData, Transition, TransitionData), `project.ts` (Project), `user.ts` (User, UserRef), `issueType.ts` (IssueType), `priority.ts` (Priority), `status.ts` (Status, StatusCategory), `search.ts` (SearchResult), `label.ts` (Label), `board.ts`/`sprint.ts` (Boards/Sprints types), `workflow.ts` (Workflow), `dashboard.ts` (Dashboard), `filter.ts` (Filter), `field.ts` (Field), `webhook.ts` (Webhook). Each file exports its types. Update barrel.
- **Acceptance criteria:**
  - [ ] Each new type file is <= 80 lines
  - [ ] `src/jira/types.ts` either removed or reduced to <= 20 lines (re-exports only)
  - [ ] All imports of Jira types resolve correctly
  - [ ] `npx tsc` passes with no type errors
  - [ ] All tests pass
  - [ ] No breaking changes to public API
- **Files:** Multiple under `src/jira/types/` (new directory), `src/jira/types/index.ts`, `src/jira/index.ts`
- **Dependencies:** B007 (do both type splits in same PR)

---

## Phase 4 — Reliability (adds runtime behavior)

### [x] B009: Add LRU eviction to cache middleware

- **Priority:** P1 — High
- **Description:** Current `createCacheMiddleware` uses FIFO eviction for `maxSize` enforcement. Replace with LRU: entries accessed most recently are protected from eviction. Use a `Map` (which preserves insertion order) and move accessed entries to the end on read. Sweep expired entries before checking size.
- **Acceptance criteria:**
  - [ ] Cache uses `Map` with LRU semantics (accessed entries move to end)
  - [ ] `maxSize` enforcement evicts least-recently-used entries first
  - [ ] Expired entry sweep still runs and evicts stale entries before LRU check
  - [ ] TTL behavior is unchanged
  - [ ] Tests verify LRU order: access entry A, add N+1 entries, evict — entry A is still present
  - [ ] All existing cache tests pass
- **Files:** `src/core/cache.ts`, `test/core/cache.test.ts`
- **Dependencies:** None

### [ ] B010: Add circuit breaker pattern

- **Priority:** P2 — Medium
- **Description:** Add a circuit breaker that monitors consecutive 5xx responses. After `threshold` consecutive failures (default 5), the circuit opens and immediately throws `ServiceUnavailableError` without making the request. After `recoveryTimeout` ms (default 30s), transition to half-open: allow one probe request. If it succeeds, close the circuit; if it fails, reopen.
- **Acceptance criteria:**
  - [ ] Circuit breaker tracks consecutive 5xx responses per base URL
  - [ ] Opens after configurable threshold (default 5)
  - [ ] Throws `ServiceUnavailableError` with circuit state when open
  - [ ] Transitions to half-open after configurable timeout (default 30s)
  - [ ] Successful probe in half-open closes the circuit
  - [ ] Failing probe in half-open reopens the circuit
  - [ ] Configurable via `ClientConfig` (e.g., `circuitBreaker: { threshold, recoveryTimeout }`)
  - [ ] Unit tests: all state transitions (closed→open→half-open→closed, closed→open→half-open→open)
  - [ ] Integration test: circuit opens after N consecutive 5xx
- **Files:** `src/core/circuit-breaker.ts` (new), `src/core/config.ts`, `src/core/transport.ts`, `test/core/circuit-breaker.test.ts` (new)
- **Dependencies:** B006 (transport refactor makes this easier to integrate)

### [ ] B011: Add request ID propagation

- **Priority:** P2 — Medium
- **Description:** Generate a UUID for each request, send it as `X-Request-Id` header, and extract the response's `X-Request-Id` header. Include the request ID in error logs and in error objects so users can correlate logs with Atlassian's side.
- **Acceptance criteria:**
  - [ ] Each request gets a unique UUID v4 via `crypto.randomUUID()`
  - [ ] Request ID sent as `X-Request-Id` header
  - [ ] Response `X-Request-Id` is captured and attached to `ApiResponse.meta.requestId`
  - [ ] Error objects include `requestId` property
  - [ ] Error logger includes request ID in log context
  - [ ] Tests verify request ID is unique per request
  - [ ] Tests verify request ID appears in error context
- **Files:** `src/core/types.ts`, `src/core/transport.ts`, `src/core/errors.ts`, `test/core/transport.test.ts`
- **Dependencies:** B006 (transport refactor)

---

## Phase 5 — Testing (depends on all code changes being stable)

### [ ] B012: Add mock-server transport tests

- **Priority:** P1 — High
- **Description:** Create a minimal HTTP mock server (using `node:http` or `undici.MockAgent`) that simulates Atlassian API behavior: rate limit headers, retry-after, 5xx failures, structured error responses, pagination links. Write mock-server tests that verify: header formatting, URL encoding, retry behavior against real HTTP responses, pagination state machine, streaming response handling.
- **Acceptance criteria:**
  - [ ] Mock server simulates rate limiting with `retry-after` header
  - [ ] Mock-server test: client retries correctly on 429 with retry-after
  - [ ] Mock-server test: client retries correctly on 5xx
  - [ ] Mock-server test: structured error response is parsed correctly
  - [ ] Mock-server test: cursor pagination advances correctly
  - [ ] Mock-server test: offset pagination works for Jira search
  - [ ] Mock-server test: streaming response returns correct data
  - [ ] Mock-server test: URL encoding handles special characters in space/key/page titles
- **Files:** `test/mock-server/` (new directory), `test/mock-server/server.ts`, `test/mock-server/transport.test.ts`, `test/mock-server/pagination.test.ts`
- **Dependencies:** B006 (stable transport)

### [ ] B013: Add CLI E2E tests

- **Priority:** P1 — High
- **Description:** Test the `atlas` CLI binary with argument parsing, command routing, and output formatting. Use a mock server for API calls. Test: help output, subcommand routing, error messages for invalid commands, output formatting for different resource types.
- **Acceptance criteria:**
  - [ ] `atlas --help` output is tested
  - [ ] `atlas jira issues get --help` shows correct flags
  - [ ] Invalid subcommand shows appropriate error
  - [ ] `atlas jira issues get AC-1` with mock server returns formatted output
  - [ ] `atlas confluence pages list --space-key TEST` with mock server returns formatted output
  - [ ] Auth error displays user-friendly message
  - [ ] Tests run in CI
- **Files:** `test/e2e/cli.test.ts` (new), `test/e2e/helpers/` (new)
- **Dependencies:** None

### [ ] B014: Add property-based tests for critical functions

- **Priority:** P2 — Medium
- **Description:** Add property-based tests (using `fast-check` or `jest-fast-check`) for: URL encoding (round-trip test: encode → decode → original), JWT signing (key round-trip: sign → verify → payload matches), pagination state machine (any sequence of API responses produces valid state), exponential backoff (delays are monotonically increasing within bounds).
- **Acceptance criteria:**
  - [ ] URL encoding: 100 random strings encode and decode to original
  - [ ] JWT signing: sign with key K, verify with key K → payload matches
  - [ ] JWT signing: sign with key K, verify with key K' → verification fails
  - [ ] Pagination: any sequence of valid API responses produces valid cursor/offset state
  - [ ] Backoff: delays are monotonically increasing and within [baseDelay, maxDelay]
  - [ ] Each property test runs 100+ iterations
  - [ ] Tests run in CI
- **Files:** `test/property/` (new directory), `test/property/url-encoding.test.ts`, `test/property/jwt.test.ts`, `test/property/pagination.test.ts`, `test/property/backoff.test.ts`
- **Dependencies:** B006 (stable retry logic)

---

## Phase 6 — Security & Advanced

### [ ] B015: Add RS256 support for Connect JWT

- **Priority:** P2 — Medium
- **Description:** Atlassian Connect production apps require RS256 JWT signing. Add `createConnectJwtMiddlewareRS256(config: { privateKey: string; publicKey: string })` and `signConnectJwtRS256` function. HS256 remains for development. Document when to use each.
- **Acceptance criteria:**
  - [ ] `signConnectJwtRS256` produces valid RS256 JWTs
  - [ ] `createConnectJwtMiddlewareRS256` creates middleware identically to HS256 version
  - [ ] Both middlewares produce compatible JWTs (Atlassian can verify with public key)
  - [ ] JSDoc explains when to use HS256 vs RS256
  - [ ] Exported from `src/core/index.ts`
  - [ ] Unit test: RS256 JWT can be decoded and verified with public key
  - [ ] Unit test: HS256 and RS256 middlewares produce different alg headers
- **Files:** `src/core/connect-jwt.ts` (add RS256 functions), `src/core/index.ts`
- **Dependencies:** None

### [ ] B016: Add OAuth concurrent refresh retry queue

- **Priority:** P2 — Medium
- **Description:** Current OAuth refresh uses a single `refreshPromise` for deduplication. If two refreshes fail simultaneously, both callers retry, creating a thundering herd. Replace with a bounded retry queue: track `inFlightRefreshes: Set<Promise>` with a max of 1 concurrent refresh. Additional callers wait for the single in-flight refresh; if it fails, they all retry but with a staggered delay (jitter) to prevent another herd.
- **Acceptance criteria:**
  - [ ] Only one refresh request is in-flight at a time per OAuth config
  - [ ] Additional callers wait for the in-flight refresh
  - [ ] If refresh fails, retry queue retries with staggered delays
  - [ ] Max retry attempts configurable (default 3)
  - [ ] After max retries, throw `AuthenticationError` with refresh failure details
  - [ ] Tests: concurrent callers all get same refreshed tokens
  - [ ] Tests: refresh failure propagates to all waiters
  - [ ] Tests: staggered retry delays prevent thundering herd
- **Files:** `src/core/oauth.ts`, `test/core/oauth.test.ts`
- **Dependencies:** None

### [ ] B017: Add rate limit awareness (token bucket)

- **Priority:** P3 — Low
- **Description:** Add proactive token-bucket rate limiting instead of reactive (wait-after-hit). Track `x-ratelimit-remaining` and `x-ratelimit-reset` headers, maintain a local token bucket, and pause before making requests when the bucket is empty. This reduces latency spikes from repeated 429s.
- **Acceptance criteria:**
  - [ ] Token bucket initialized from `x-ratelimit-remaining` header
  - [ ] Tokens replenished based on `x-ratelimit-reset` and known rate
  - [ ] Requests wait when bucket is empty (before making the request)
  - [ ] Bucket resets on successful response
  - [ ] Falls back to reactive (current behavior) when rate limit headers are absent
  - [ ] Configurable via `ClientConfig` (e.g., `rateLimit: { proactive: true }`)
  - [ ] Tests: bucket drains correctly, replenishes correctly, proactive wait occurs
- **Files:** `src/core/rate-limiter.ts` (extend), `src/core/config.ts`, `src/core/transport.ts`, `test/core/rate-limiter.test.ts`
- **Dependencies:** B010 (circuit breaker — both deal with rate limiting but circuit breaker is higher priority)

---

## Phase 7 — Automation (CI/CD)

### [ ] B018: Add OpenAPI type regeneration to CI

- **Priority:** P2 — Medium
- **Description:** Add a script `scripts/regenerate-types.ts` that fetches Atlassian's OpenAPI specs and regenerates TypeScript types via `generateTypes()`. Add a CI check that runs the script and fails if the generated types differ from checked-in types. This prevents type rot in hand-written types.
- **Acceptance criteria:**
  - [ ] `scripts/regenerate-types.ts` fetches specs and regenerates types
  - [ ] Script is idempotent (running twice produces identical output)
  - [ ] CI step runs regeneration and diffs against committed types
  - [ ] CI fails on diff with instructions to run `npm run regenerate-types`
  - [ ] Generated types compile without errors
  - [ ] README documents how to update types
- **Files:** `scripts/regenerate-types.ts` (new), `.github/workflows/` (CI config), `package.json` (script)
- **Dependencies:** None

### [ ] B019: Add `validateScopes` CLI command

- **Priority:** P3 — Low
- **Description:** Add `atlas scopes validate --operations jira:issues:get,confluence:pages:list` command that checks required scopes against known operations in `OPERATION_SCOPES`. Reports missing scopes and suggests which operations will fail. Useful for pre-flight checks before running CLI commands.
- **Acceptance criteria:**
  - [ ] `atlas scopes validate --operations op1,op2` runs successfully
  - [ ] Reports required scopes for each operation
  - [ ] Reports when required scopes are unknown (not in `OPERATION_SCOPES`)
  - [ ] Exit code 0 if all scopes known, 1 if any unknown
  - [ ] `--help` shows usage
  - [ ] Unit tests for `detectRequiredScopes` with various operation sets
- **Files:** `src/cli/commands/scopes.ts` (new), `src/cli/router.ts`, `src/core/scopes.ts`
- **Dependencies:** None

### [x] B020: Add pagination cursor validation

- **Priority:** P3 — Low
- **Description:** Detect infinite loops in cursor-based pagination: if the cursor value doesn't change between consecutive API responses, stop and throw `PaginationError('cursor not advancing')`. Also add a `maxPages` option (default 10000) to prevent runaway pagination. Log a warning when approaching the limit.
- **Acceptance criteria:**
  - [ ] `paginateCursor` throws `PaginationError` when cursor doesn't advance
  - [ ] `maxPages` option stops pagination after N pages
  - [ ] Warning logged at 80% of maxPages
  - [ ] Default maxPages is 10000
  - [ ] Tests: cursor not advancing → error thrown
  - [ ] Tests: maxPages reached → iteration stops cleanly
  - [ ] Tests: cursor advances normally → no interference
- **Files:** `src/core/pagination.ts`, `test/core/pagination.test.ts`
- **Dependencies:** None

---

## Phase 8 — Confluence v2 OpenAPI Spec Compliance

> Source of truth: `https://dac-static.atlassian.com/cloud/confluence/openapi-v2.v3.json?_v=1.8494.0`
> Spec inventory at audit time: **213 operations, 29 tags**. Current implementation covers ~38 operations.
> All findings from the audit are in scope. Items below are atomic and PR-sized.
> Default policy: **add new methods alongside existing ones; deprecate before remove.** Breaking changes (renames, type tightening) are gated behind B062 (1.0.0 release).
> Pagination, transport, retry, error taxonomy are governed by Phases 2/4 and **must not** be modified by Phase 8 items unless explicitly noted.

### Foundation

#### [ ] B021: Pin Confluence v2 OpenAPI spec snapshot

- **Priority:** P0 — Critical (gates B022–B062)
- **Description:** Download the upstream OpenAPI document, normalize JSON key order (`jq -S`), commit a versioned snapshot at `spec/confluence-v2.v1.8494.0.openapi.json`, and write a stable alias `spec/confluence-v2.openapi.json` (copy or symlink). Add `scripts/audit/refresh-spec.mjs` that re-downloads, re-normalizes, writes a sibling `.sha256` checksum, and prints a diff summary. Add `spec/README.md` documenting refresh + audit process.
- **Acceptance criteria:**
  - [ ] `spec/confluence-v2.v1.8494.0.openapi.json` exists, normalized, byte-stable on re-run
  - [ ] `spec/confluence-v2.openapi.json` resolves to the same content
  - [ ] `scripts/audit/refresh-spec.mjs` exits 0 on success, writes `.sha256`, emits diff line count
  - [ ] `spec/README.md` documents refresh + audit workflow
  - [ ] `npm run audit:refresh` script added to `package.json`
  - [ ] No production code under `src/` is changed
- **Files:** `spec/`, `scripts/audit/refresh-spec.mjs`, `package.json`
- **Dependencies:** None

#### [ ] B022: Spec-vs-implementation coverage matrix generator

- **Priority:** P0 — Critical
- **Description:** Write `scripts/audit/extract-operations.mjs` (walks `spec.paths[*][verb]` → normalized operation list), `scripts/audit/extract-implementation.mjs` (TypeScript Compiler API parse of `src/confluence/resources/*.ts`, extracts `{resource, method, httpVerb, pathTemplate}` from `this.transport.request({...})` literal `${this.baseUrl}/...` paths), and `scripts/audit/render-matrix.mjs` (joins on `{method, normalizedPath}`, emits `spec/coverage-matrix.md` with four sections: **matched**, **missing-in-code**, **extra-in-code**, **deprecated-in-spec**). Wire `npm run audit:spec` and `npm run audit:spec -- --check` (exits non-zero on drift).
- **Acceptance criteria:**
  - [ ] `npm run audit:spec` regenerates `spec/coverage-matrix.md` deterministically
  - [ ] Matrix contains all 213 spec operations with implemented?/Resource.method/notes
  - [ ] Extra-in-code section is empty OR documents the discrepancy
  - [ ] `--check` flag exits 1 if generated matrix differs from committed
  - [ ] Snapshot test on rendered matrix output under `test/audit/`
  - [ ] Coverage stays at project target (100%) for the new audit scripts
- **Files:** `scripts/audit/{extract-operations,extract-implementation,render-matrix}.mjs`, `spec/coverage-matrix.md`, `test/audit/`, `package.json`
- **Dependencies:** B021

#### [ ] B023: Per-resource conformance audit reports

- **Priority:** P1 — High
- **Description:** For every Confluence resource (existing + missing), generate a structured report at `spec/audit/<resource>.md` with sections: **Operations matrix** (filtered subset of B022), **Per-operation conformance** (verb/path/query/body/response checks), **Pagination conformance**, **Error mapping**, **Severity ranking** (BLOCK/HIGH/MEDIUM/LOW), **Fix proposal**. Reports are checked into the repo; they drive B024–B059.
- **Acceptance criteria:**
  - [ ] One markdown report per resource tag (29 tags from spec)
  - [ ] Each finding is tagged with severity and a target backlog item (B024–B059)
  - [ ] Reports cite the exact spec `operationId`, path, and verb
  - [ ] No `src/` changes
- **Files:** `spec/audit/*.md` (29 files)
- **Dependencies:** B022

---

### Schema / type alignment for existing resources

> Non-breaking type widening (adding optional fields, adding enum values) ships immediately.
> Breaking tightening (`field?: T` → `field: T`, renames, signature changes) is **gated by B062**.

#### [x] B024: Align `Page` type + page request params with spec schema

- **Priority:** P1 — High
- **Description:** Audit `Page`, `ListPagesParams`, `GetPageParams`, `CreatePageData`, `UpdatePageData`, `DeletePageParams` against spec schemas `Page`, `PageBulk`, `PageSingle`, plus query-param sets on `getPages`, `getPageById`, `createPage`, `updatePage`, `deletePage`. Add missing fields: `ownerId`, `lastOwnerId`, `parentType`, `position`, `subType`, `authorId`, `createdAt`, `version` shape, `body.atlas_doc_format`/`view`/`raw`/`export_view`/`anonymous_export_view`/`styled_view`/`editor`, `_links` shape. Add missing query params: `serialize-ids-as-strings`, `body-format`, `get-draft`, `version`, `status[]`, `space-id[]`, `sort`, `cursor`, `limit`. Fix any `unknown`/loose types found.
- **Acceptance criteria:**
  - [ ] Every field in spec `Page` schema is present in TS type (with correct optionality)
  - [ ] Every query parameter on `getPages`/`getPageById` is present in `ListPagesParams`/`GetPageParams`
  - [ ] Body create/update payload matches spec request body schemas
  - [ ] No widening of `unknown` where the spec defines a concrete type
  - [ ] Existing tests pass; new tests assert presence of newly added fields when MockTransport returns spec-shaped responses
- **Files:** `src/confluence/types.ts` (or `src/confluence/types/page.ts` if B007 done), `test/confluence/pages.test.ts`
- **Dependencies:** B023

#### [x] B025: Align `Space` type + space request params with spec schema

- **Priority:** P1 — High
- **Description:** Same exercise for `Space`, `ListSpacesParams`. Add missing query params: `ids[]`, `keys[]`, `type`, `status`, `labels[]`, `favorited-by`, `not-favorited-by`, `sort`, `description-format`, `include-icon`, `serialize-ids-as-strings`. Add missing fields: `authorId`, `createdAt`, `homepageId`, `description.{view,plain}`, `icon`.
- **Acceptance criteria:**
  - [ ] Every field/param matches spec
  - [ ] `description-format` enum values match spec (`plain` | `view`)
  - [ ] Tests assert new fields are exposed
- **Files:** `src/confluence/types.ts`, `test/confluence/spaces.test.ts`
- **Dependencies:** B023

#### [x] B026: Align `BlogPost` type + blog-post request params with spec schema

- **Priority:** P1 — High
- **Description:** Same exercise for `BlogPost`, `ListBlogPostsParams`, `CreateBlogPostData`, `UpdateBlogPostData`. Mirror missing fields/params from B024 (most blog-post endpoints share page parameter shapes per spec).
- **Acceptance criteria:**
  - [ ] BlogPost fields/params parity with spec
  - [ ] Tests updated
- **Files:** `src/confluence/types.ts`, `test/confluence/blog-posts.test.ts`
- **Dependencies:** B023

#### [x] B027: Align `FooterComment` + `InlineComment` types and params with spec

- **Priority:** P1 — High
- **Description:** Reconcile `FooterComment`, `InlineComment`, `CreateFooterCommentData`, `CreateInlineCommentData`, `UpdateCommentData`, list params. Add: `InlineCommentProperties` schema (`inline-marker-ref`, `inline-original-selection`, `text-selection`, `text-selection-match-count`, `text-selection-match-index`, `resolution-status`, `resolution-last-modifier-id`, `resolution-last-modified-at`), `resolved` field, parent-comment relationships, `body-format` enum expansion. Add missing query params on listFooter/listInline.
- **Acceptance criteria:**
  - [ ] Comment types match spec schemas exactly
  - [ ] Tests assert structured `InlineCommentProperties`
- **Files:** `src/confluence/types.ts`, `test/confluence/comments.test.ts`
- **Dependencies:** B023

#### [x] B028: Align `Attachment` type + params with spec schema

- **Priority:** P1 — High
- **Description:** Add fields: `mediaTypeDescription`, `comment`, `fileId`, `fileSize`, `webuiLink`, `downloadLink`, `pageId`, `blogPostId`, `customContentId`, `status`, `version` shape, `_links`. Add params: `mediaType`, `filename`, `sort`, `serialize-ids-as-strings`.
- **Acceptance criteria:**
  - [ ] Type matches spec; existing tests pass; new field exposure verified via MockTransport
- **Files:** `src/confluence/types.ts`, `test/confluence/attachments.test.ts`
- **Dependencies:** B023

#### [x] B029: Tighten `ContentProperty.key` validation and widen `value` union per spec

- **Priority:** P1 — High
- **Description:** Spec restricts content-property `key` to a regex pattern (typically `^[a-zA-Z0-9_.-]+$` with length limits — confirm from spec). Add `validateContentPropertyKey(key: string): void` that throws `ValidationError` on mismatch. Widen `ContentProperty.value` from `unknown` to `JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }`. Apply across all content-property surfaces (B044 extends this to other content types).
- **Acceptance criteria:**
  - [ ] `validateContentPropertyKey` exported and called in `create*`/`update*` paths
  - [ ] Invalid keys throw `ValidationError` with the offending key in the message
  - [ ] `value` type is `JsonValue`, not `unknown`
  - [ ] Tests: valid keys pass, invalid keys throw; JsonValue type-checks for nested objects
- **Files:** `src/confluence/resources/content-properties.ts`, `src/confluence/types.ts`, `src/core/errors.ts` (re-use existing `ValidationError`), `test/confluence/content-properties.test.ts`
- **Dependencies:** B023

#### [x] B030: Align `CustomContent` type + params with spec schema

- **Priority:** P1 — High
- **Description:** Add fields: `authorId`, `createdAt`, `version`, `body` (multiple formats), `spaceId`, `pageId`, `blogPostId`, `customContentId`, `_links`. Add params: `type` (required for many endpoints), `body-format`, `sort`, `space-id[]`, `serialize-ids-as-strings`.
- **Acceptance criteria:** Type/param parity with spec; tests updated.
- **Files:** `src/confluence/types.ts`, `test/confluence/custom-content.test.ts`
- **Dependencies:** B023

#### [x] B031: Align `Whiteboard` type + params with spec schema

- **Priority:** P1 — High
- **Description:** Add fields: `parentId`, `parentType`, `ownerId`, `authorId`, `createdAt`, `position`, `_links`. Validate `CreateWhiteboardData` shape (spaceId, title, parentId).
- **Acceptance criteria:** Parity with spec; tests updated.
- **Files:** `src/confluence/types.ts`, `test/confluence/whiteboards.test.ts`
- **Dependencies:** B023

#### [x] B032: Align `ConfluenceTask` type + params with spec schema

- **Priority:** P2 — Medium
- **Description:** Verify `createdAtFrom`/`createdAtTo`/`dueAtFrom`/`dueAtTo` typing as ISO-8601 strings (not `Date`), assignee/creator account-id types, `status` enum (`complete` | `incomplete`), `body-format`, `include-blank-tasks`. Add any missing optional fields.
- **Acceptance criteria:** Param shape matches spec; tests cover ISO-8601 string format.
- **Files:** `src/confluence/types.ts`, `test/confluence/tasks.test.ts`
- **Dependencies:** B023

#### [x] B033: Align `ContentVersion` type and version params with spec schema

- **Priority:** P2 — Medium
- **Description:** Confirm fields: `createdAt`, `message`, `number`, `minorEdit`, `authorId`, `contentTypeModified`, `_links`. Add `body-format` query param on detail endpoints. Version path uses `{version-number}` (numeric).
- **Acceptance criteria:** Type parity; tests pass.
- **Files:** `src/confluence/types.ts`, `test/confluence/versions.test.ts`
- **Dependencies:** B023

#### [x] B034: Add full `BodyFormat` enum + body shape coverage

- **Priority:** P1 — High
- **Description:** Spec accepts body formats: `storage`, `atlas_doc_format`, `view`, `raw`, `export_view`, `anonymous_export_view`, `styled_view`, `editor`. Current types cover only `storage` + `atlas_doc_format`. Add `BodyFormat` enum and `Body` discriminated union (`{representation, value}`) supporting all spec representations. Apply to Page, BlogPost, CustomContent, Comment bodies.
- **Acceptance criteria:**
  - [ ] `BodyFormat` enum exported with all 8 values
  - [ ] `Body` union covers all representations
  - [ ] Tests parse a representative response per format
- **Files:** `src/confluence/types.ts`, related resources, tests
- **Dependencies:** B023

---

### Endpoint additions on existing resources

> Each item adds the listed missing endpoints from the spec as new methods. Naming follows the spec `operationId`, camel-cased, scoped to the resource. Existing methods are unchanged (B061 handles renames).

#### [ ] B035: Pages — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add to `PagesResource`:
  - `getPagesInSpace(spaceId, params)` → `GET /spaces/{id}/pages` + `listAllInSpace` generator
  - `getLabelPages(labelId, params)` → `GET /labels/{id}/pages` + `listAllForLabel`
  - `updateTitle(id, data)` → `PUT /pages/{id}/title`
  - `getAncestors(id, params)` → `GET /pages/{id}/ancestors`
  - `getDirectChildren(id, params)` → `GET /pages/{id}/direct-children` + generator
  - `getChildren(id, params)` → `GET /pages/{id}/children` (mark `@deprecated` per spec)
  - `getDescendants(id, params)` → `GET /pages/{id}/descendants` + generator
- **Acceptance criteria:**
  - [ ] All 7 methods exist with spec-aligned params/return types
  - [ ] Cursor pagination wired via `paginateCursor` for list endpoints
  - [ ] Deprecated `getChildren` carries `@deprecated` JSDoc citing the spec
  - [ ] One happy-path test per method using `MockTransport`
  - [ ] Coverage stays at 100%
- **Files:** `src/confluence/resources/pages.ts`, `src/confluence/types.ts`, `test/confluence/pages.test.ts`
- **Dependencies:** B024, B033

#### [ ] B036: Blog posts — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add to `BlogPostsResource`:
  - `getBlogPostsInSpace(spaceId, params)` → `GET /spaces/{id}/blogposts` + generator
  - `getLabelBlogPosts(labelId, params)` → `GET /labels/{id}/blogposts` + generator
- **Acceptance criteria:** Methods + pagination + tests; coverage maintained.
- **Files:** `src/confluence/resources/blog-posts.ts`, `src/confluence/types.ts`, `test/confluence/blog-posts.test.ts`
- **Dependencies:** B026

#### [ ] B037: Spaces — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add to `SpacesResource`:
  - `create(data)` → `POST /spaces` (currently missing)
- **Acceptance criteria:** Method present, payload matches spec, test covers it.
- **Files:** `src/confluence/resources/spaces.ts`, `src/confluence/types.ts`, `test/confluence/spaces.test.ts`
- **Dependencies:** B025
- **Note:** Other space-related endpoints (permissions, properties, roles, classification) are split into B053, B054, B055, B048 to keep PR scope minimal.

#### [ ] B038: Comments — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add to `CommentsResource` (or split into `FooterCommentsResource` + `InlineCommentsResource` — decide in B061):
  - `listFooterAll(params)` → `GET /footer-comments` (top-level)
  - `listInlineAll(params)` → `GET /inline-comments` (top-level)
  - `getFooterChildren(commentId, params)` → `GET /footer-comments/{id}/children`
  - `getInlineChildren(commentId, params)` → `GET /inline-comments/{id}/children`
  - `listFooterOnBlogPost(blogPostId, params)` → `GET /blogposts/{id}/footer-comments`
  - `listInlineOnBlogPost(blogPostId, params)` → `GET /blogposts/{id}/inline-comments`
  - `listFooterOnAttachment(attachmentId, params)` → `GET /attachments/{id}/footer-comments`
  - `listFooterOnCustomContent(customContentId, params)` → `GET /custom-content/{id}/footer-comments`
- **Acceptance criteria:** 8 new methods, pagination wired, tests for each, coverage maintained.
- **Files:** `src/confluence/resources/comments.ts`, `src/confluence/types.ts`, `test/confluence/comments.test.ts`
- **Dependencies:** B027

#### [ ] B039: Attachments — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add to `AttachmentsResource`:
  - `list(params)` → `GET /attachments` (top-level) + generator
  - `listForBlogPost(blogPostId, params)` → `GET /blogposts/{id}/attachments` + generator
  - `listForCustomContent(customContentId, params)` → `GET /custom-content/{id}/attachments` + generator
  - `listForLabel(labelId, params)` → `GET /labels/{id}/attachments` + generator
  - `getThumbnail(id)` → `GET /attachments/{id}/thumbnail/download` (returns binary `ArrayBuffer` or stream — match transport binary response handling)
- **Acceptance criteria:** 5 methods, binary thumbnail returns `ArrayBuffer` (or stream per transport contract), tests use MockTransport with binary body.
- **Files:** `src/confluence/resources/attachments.ts`, `src/confluence/types.ts`, `test/confluence/attachments.test.ts`
- **Dependencies:** B028

#### [ ] B040: Labels — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add to `LabelsResource`:
  - `list(params)` → `GET /labels` (top-level) + generator
  - `listForAttachment(attachmentId, params)` → `GET /attachments/{id}/labels`
  - `listForCustomContent(customContentId, params)` → `GET /custom-content/{id}/labels`
  - `listSpaceContentLabels(spaceId, params)` → `GET /spaces/{id}/content/labels`
- **Acceptance criteria:** 4 methods, pagination, tests, coverage.
- **Files:** `src/confluence/resources/labels.ts`, `src/confluence/types.ts`, `test/confluence/labels.test.ts`
- **Dependencies:** B023

#### [ ] B041: Custom content — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add to `CustomContentResource`:
  - `getByTypeInSpace(spaceId, params)` → `GET /spaces/{id}/custom-content`
  - `getByTypeInPage(pageId, params)` → `GET /pages/{id}/custom-content`
  - `getByTypeInBlogPost(blogPostId, params)` → `GET /blogposts/{id}/custom-content`
  - `getChildren(customContentId, params)` → `GET /custom-content/{id}/children`
- **Acceptance criteria:** 4 methods, pagination, tests, coverage.
- **Files:** `src/confluence/resources/custom-content.ts`, `src/confluence/types.ts`, `test/confluence/custom-content.test.ts`
- **Dependencies:** B030

#### [ ] B042: Whiteboards — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add to `WhiteboardsResource`:
  - `getAncestors(id, params)` → `GET /whiteboards/{id}/ancestors`
  - `getDirectChildren(id, params)` → `GET /whiteboards/{id}/direct-children`
  - `getDescendants(id, params)` → `GET /whiteboards/{id}/descendants`
- **Acceptance criteria:** 3 methods, pagination, tests, coverage.
- **Files:** `src/confluence/resources/whiteboards.ts`, `src/confluence/types.ts`, `test/confluence/whiteboards.test.ts`
- **Dependencies:** B031

#### [ ] B043: Versions — add missing per-content-type endpoints

- **Priority:** P1 — High
- **Description:** Extend `VersionsResource` with:
  - `listForAttachment(attachmentId, params)` / `getForAttachment(attachmentId, versionNumber)` → `/attachments/{id}/versions`, `/attachments/{attachment-id}/versions/{version-number}`
  - `listForCustomContent(customContentId, params)` / `getForCustomContent(customContentId, versionNumber)` → `/custom-content/{custom-content-id}/versions[/{version-number}]`
  - `listForFooterComment(commentId, params)` / `getForFooterComment(commentId, versionNumber)` → `/footer-comments/{id}/versions[/{version-number}]`
  - `listForInlineComment(commentId, params)` / `getForInlineComment(commentId, versionNumber)` → `/inline-comments/{id}/versions[/{version-number}]`
  - Plus `listAll*` generators.
- **Acceptance criteria:** 8 new methods + 4 generators, pagination, tests, coverage.
- **Files:** `src/confluence/resources/versions.ts`, `src/confluence/types.ts`, `test/confluence/versions.test.ts`
- **Dependencies:** B033

#### [ ] B044: Content properties — extend to all spec-covered content types

- **Priority:** P0 — Critical (large surface area; 45 spec operations)
- **Description:** Spec exposes content-property CRUD on 10 content types: page, blogpost, attachment, custom-content, whiteboard, database, embed (smart link), folder, comment (both footer + inline), space. Current code only handles pages. Refactor `ContentPropertiesResource` into a generic shape parameterized by content-type, or split into per-content-type sub-resources (decision in this PR). Cover:
  - `list*ContentProperties(sourceId, params)` GET
  - `create*Property(sourceId, data)` POST
  - `get*ContentPropertiesById(sourceId, propertyId)` GET
  - `update*PropertyById(sourceId, propertyId, data)` PUT
  - `delete*PropertyById(sourceId, propertyId)` DELETE
- **Acceptance criteria:**
  - [ ] All 45 content-property operations from the spec are reachable from the client
  - [ ] Public API is ergonomic (e.g., `client.confluence.contentProperties.forPages.list(pageId)` or `client.confluence.pages.properties.list(pageId)` — decide via spec audit B023)
  - [ ] Validation from B029 (key regex, JsonValue) applies uniformly
  - [ ] Tests cover at least one CRUD cycle per content-type variant
  - [ ] Coverage maintained
- **Files:** `src/confluence/resources/content-properties.ts` (major refactor), `src/confluence/types.ts`, `test/confluence/content-properties.test.ts`
- **Dependencies:** B029, B023

---

### New resources (entirely missing from current client)

#### [ ] B045: New resource — Databases

- **Priority:** P1 — High
- **Description:** Implement `DatabasesResource` covering all Database-related spec ops:
  - `create(data)` → `POST /databases`
  - `get(id)` → `GET /databases/{id}`
  - `delete(id)` → `DELETE /databases/{id}`
  - `getAncestors(id, params)` → `GET /databases/{id}/ancestors`
  - `getDirectChildren(id, params)` → `GET /databases/{id}/direct-children`
  - `getDescendants(id, params)` → `GET /databases/{id}/descendants`
  - Classification (3): see B048
  - Operations: see B059
  - Content properties (5): see B044
- **Acceptance criteria:** Resource module + types + tests; wired into `ConfluenceClient`; coverage maintained.
- **Files:** `src/confluence/resources/databases.ts` (new), `src/confluence/types.ts` (add `Database`, `CreateDatabaseData`), `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/databases.test.ts` (new)
- **Dependencies:** B023, B044, B048, B059

#### [ ] B046: New resource — Folders

- **Priority:** P1 — High
- **Description:** Implement `FoldersResource`:
  - `create(data)` → `POST /folders`
  - `get(id)` → `GET /folders/{id}`
  - `delete(id)` → `DELETE /folders/{id}`
  - `getAncestors`, `getDirectChildren`, `getDescendants` (3 ops)
  - Operations: see B059
  - Content properties (5): see B044
- **Acceptance criteria:** Same pattern as B045.
- **Files:** `src/confluence/resources/folders.ts` (new), `src/confluence/types.ts`, `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/folders.test.ts`
- **Dependencies:** B023, B044, B059

#### [ ] B047: New resource — Smart Links (Embeds)

- **Priority:** P1 — High
- **Description:** Implement `SmartLinksResource` (spec path prefix `/embeds`):
  - `create(data)` → `POST /embeds`
  - `get(id)` → `GET /embeds/{id}`
  - `delete(id)` → `DELETE /embeds/{id}`
  - `getAncestors`, `getDirectChildren`, `getDescendants`
  - Operations: see B059
  - Content properties (5): see B044
- **Acceptance criteria:** Same pattern.
- **Files:** `src/confluence/resources/smart-links.ts` (new), `src/confluence/types.ts`, `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/smart-links.test.ts`
- **Dependencies:** B023, B044, B059

#### [ ] B048: New resource — Classification Levels

- **Priority:** P1 — High
- **Description:** Implement `ClassificationLevelsResource` covering all 16 Classification Level ops:
  - `list()` → `GET /classification-levels`
  - `getSpaceDefault(spaceId)` / `setSpaceDefault(spaceId, data)` / `deleteSpaceDefault(spaceId)`
  - For each of pages, blogposts, whiteboards, databases: `get(id)` / `set(id, data)` / `reset(id)` (3 ops × 4 content types = 12)
- **Acceptance criteria:** Module + types + tests for every endpoint; coverage maintained.
- **Files:** `src/confluence/resources/classification-levels.ts` (new), `src/confluence/types.ts`, `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/classification-levels.test.ts`
- **Dependencies:** B023

#### [ ] B049: New resource — Admin Key

- **Priority:** P2 — Medium
- **Description:** Implement `AdminKeyResource`:
  - `get()` → `GET /admin-key`
  - `enable(data)` → `POST /admin-key`
  - `disable()` → `DELETE /admin-key`
- **Acceptance criteria:** Module + types + tests.
- **Files:** `src/confluence/resources/admin-key.ts` (new), `src/confluence/types.ts`, `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/admin-key.test.ts`
- **Dependencies:** B023

#### [ ] B050: New resource — App Properties (Forge)

- **Priority:** P2 — Medium
- **Description:** Implement `AppPropertiesResource`:
  - `list()` → `GET /app/properties`
  - `get(propertyKey)` → `GET /app/properties/{propertyKey}`
  - `put(propertyKey, data)` → `PUT /app/properties/{propertyKey}`
  - `delete(propertyKey)` → `DELETE /app/properties/{propertyKey}`
- **Acceptance criteria:** Module + types + tests; key validation re-uses B029.
- **Files:** `src/confluence/resources/app-properties.ts` (new), `src/confluence/types.ts`, `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/app-properties.test.ts`
- **Dependencies:** B023, B029

#### [ ] B051: New resource — Data Policies

- **Priority:** P3 — Low
- **Description:** Implement `DataPoliciesResource`:
  - `getMetadata()` → `GET /data-policies/metadata`
  - `getSpaces(params)` → `GET /data-policies/spaces` + generator
- **Acceptance criteria:** Module + types + tests.
- **Files:** `src/confluence/resources/data-policies.ts` (new), `src/confluence/types.ts`, `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/data-policies.test.ts`
- **Dependencies:** B023

#### [ ] B052: New resource — Redactions

- **Priority:** P2 — Medium
- **Description:** Implement `RedactionsResource`:
  - `redactPage(pageId, data)` → `POST /pages/{id}/redact`
  - `redactBlogPost(blogPostId, data)` → `POST /blogposts/{id}/redact`
- **Acceptance criteria:** Module + types + tests covering redaction payload shape.
- **Files:** `src/confluence/resources/redactions.ts` (new), `src/confluence/types.ts`, `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/redactions.test.ts`
- **Dependencies:** B023

#### [ ] B053: New resource — Space Permissions

- **Priority:** P2 — Medium
- **Description:** Implement `SpacePermissionsResource`:
  - `getAssignments(spaceId, params)` → `GET /spaces/{id}/permissions` + generator
  - `listAvailable(params)` → `GET /space-permissions` + generator
- **Acceptance criteria:** Module + types + tests.
- **Files:** `src/confluence/resources/space-permissions.ts` (new), `src/confluence/types.ts`, `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/space-permissions.test.ts`
- **Dependencies:** B023

#### [ ] B054: New resource — Space Properties

- **Priority:** P2 — Medium
- **Description:** Implement `SpacePropertiesResource`:
  - `list(spaceId, params)` → `GET /spaces/{space-id}/properties` + generator
  - `create(spaceId, data)` → `POST /spaces/{space-id}/properties`
  - `get(spaceId, propertyId)` → `GET /spaces/{space-id}/properties/{property-id}`
  - `update(spaceId, propertyId, data)` → `PUT ...`
  - `delete(spaceId, propertyId)` → `DELETE ...`
- **Acceptance criteria:** Module + types + tests; key validation re-uses B029.
- **Files:** `src/confluence/resources/space-properties.ts` (new), `src/confluence/types.ts`, `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/space-properties.test.ts`
- **Dependencies:** B023, B029

#### [ ] B055: New resource — Space Roles

- **Priority:** P2 — Medium
- **Description:** Implement `SpaceRolesResource` covering all 8 Space Roles ops:
  - `listAvailable(params)` / `create(data)` / `get(id)` / `update(id, data)` / `delete(id)`
  - `getMode()` → `GET /space-role-mode`
  - `getAssignments(spaceId, params)` → `GET /spaces/{id}/role-assignments`
  - `setAssignments(spaceId, data)` → `POST /spaces/{id}/role-assignments`
- **Acceptance criteria:** Module + types + tests; pagination on list ops.
- **Files:** `src/confluence/resources/space-roles.ts` (new), `src/confluence/types.ts`, `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/space-roles.test.ts`
- **Dependencies:** B023

#### [ ] B056: New resource — Users

- **Priority:** P2 — Medium
- **Description:** Implement `UsersResource`:
  - `bulkLookup(data)` → `POST /users-bulk`
  - `checkAccessByEmail(data)` → `POST /user/access/check-access-by-email`
  - `inviteByEmail(data)` → `POST /user/access/invite-by-email`
- **Acceptance criteria:** Module + types + tests.
- **Files:** `src/confluence/resources/users.ts` (new), `src/confluence/types.ts`, `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/users.test.ts`
- **Dependencies:** B023

#### [ ] B057: New resource — Content (id-to-type conversion)

- **Priority:** P3 — Low
- **Description:** Implement `ContentResource`:
  - `convertIdsToTypes(data)` → `POST /content/convert-ids-to-types`
- **Acceptance criteria:** Module + types + tests.
- **Files:** `src/confluence/resources/content.ts` (new), `src/confluence/types.ts`, `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/content.test.ts`
- **Dependencies:** B023

#### [ ] B058: New resource — Likes

- **Priority:** P2 — Medium
- **Description:** Implement `LikesResource` covering all 8 Like ops across pages, blogposts, footer-comments, inline-comments:
  - `getCount(contentType, id)` → `GET /{contentType}/{id}/likes/count` (4 endpoints)
  - `getUsers(contentType, id, params)` → `GET /{contentType}/{id}/likes/users` + generator (4 endpoints)
- **Acceptance criteria:** Module + types + tests for all 8 endpoints. Discriminated union on `contentType` to ensure type-safe path construction.
- **Files:** `src/confluence/resources/likes.ts` (new), `src/confluence/types.ts`, `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/likes.test.ts`
- **Dependencies:** B023

#### [ ] B059: New resource — Operations (permissions)

- **Priority:** P2 — Medium
- **Description:** Implement `OperationsResource` covering all 11 Operation ops (permissions list per content type):
  - `forAttachment(id)`, `forBlogPost(id)`, `forCustomContent(id)`, `forPage(id)`, `forWhiteboard(id)`, `forDatabase(id)`, `forSmartLink(id)`, `forFolder(id)`, `forSpace(id)`, `forFooterComment(id)`, `forInlineComment(id)`
  - Each returns `OperationsResponse` per spec
- **Acceptance criteria:** Module + types + tests covering all 11 endpoints.
- **Files:** `src/confluence/resources/operations.ts` (new), `src/confluence/types.ts`, `src/confluence/client.ts`, `src/confluence/resources/index.ts`, `test/confluence/operations.test.ts`
- **Dependencies:** B023

---

### Infrastructure & migration

#### [ ] B060: Decide codegen strategy and set up `openapi-typescript` for response types

- **Priority:** P1 — High
- **Description:** Decision: hybrid — codegen for response types from spec via `openapi-typescript`; hand-author request `*Params`/`*Data` types for ergonomics. Generated output committed under `src/confluence/types/generated.ts`; barrel re-exports it. Add `npm run codegen:confluence` script. Document in `spec/README.md`. Open question Q1 from the audit plan resolved by this item.
- **Acceptance criteria:**
  - [ ] `openapi-typescript` added as devDependency
  - [ ] `npm run codegen:confluence` regenerates types deterministically
  - [ ] `src/confluence/types/generated.ts` committed and referenced by hand-authored types
  - [ ] CI step asserts the committed file is up-to-date with the pinned spec
  - [ ] No public re-exports change for downstream callers without B062
- **Files:** `package.json`, `scripts/audit/codegen-confluence.mjs`, `src/confluence/types/generated.ts`, `src/confluence/types.ts` (or `src/confluence/types/index.ts` if B007 applied), `spec/README.md`
- **Dependencies:** B021, B007 (helpful but not required)

#### [ ] B061: Add spec-aligned method names with deprecation aliases

- **Priority:** P2 — Medium
- **Description:** Several current method names diverge from spec operation IDs:
  - `comments.listFooter` (on page) → split surface: spec has `getPageFooterComments` + `getFooterComments` (top-level). Recommend renaming to `comments.listFooterOnPage` and keeping `listFooter` as `@deprecated` alias.
  - `comments.getFooter`/`createFooter`/`updateFooter`/`deleteFooter` → `comments.footer.get`/`create`/`update`/`delete` namespace or `comments.getFooterComment` (decide in PR).
  - Similar for inline counterparts.
  - `attachments.listForPage` → consistent with new `listForBlogPost`/etc. from B039; verify naming.
- **Acceptance criteria:**
  - [ ] Every divergent name has a new spec-aligned method
  - [ ] Old names exist as `@deprecated` JSDoc thin aliases
  - [ ] No runtime warnings (project style)
  - [ ] CHANGELOG entry lists deprecations
  - [ ] Tests cover both old and new names (the alias path)
- **Files:** `src/confluence/resources/*.ts`, `CHANGELOG.md`, `test/confluence/*.test.ts`
- **Dependencies:** B035–B059

#### [ ] B062: 1.0.0 release plan — remove deprecations, tighten types, migration guide

- **Priority:** P2 — Medium
- **Description:** Final phase: in a `1.0.0` major bump, remove all `@deprecated` aliases from B061, tighten currently-optional fields that the spec marks required, and consolidate. Write `MIGRATION.md` covering: renamed methods, removed methods, type tightening list (before/after table), how to detect & fix at the call site. Update `CHANGELOG.md` and `package.json` version.
- **Acceptance criteria:**
  - [ ] `MIGRATION.md` exists at repo root with before/after for every breaking change
  - [ ] All `@deprecated` aliases removed
  - [ ] Tightened types: list documented in MIGRATION
  - [ ] `CHANGELOG.md` has a `1.0.0` section
  - [ ] `package.json` bumped to `1.0.0`
  - [ ] `npm run validate` passes (typecheck, lint, tests, coverage 100%)
- **Files:** `src/confluence/**`, `MIGRATION.md` (new), `CHANGELOG.md`, `package.json`
- **Dependencies:** B024–B061 (everything in Phase 8 before the major bump)

---

## Phase 9 — Jira Platform v3 OpenAPI Spec Compliance

> Source of truth: `https://dac-static.atlassian.com/cloud/jira/platform/swagger-v3.v3.json?_v=1.8494.0`
> Spec inventory: **~600 operations, ~80 tags**. Current implementation covers ~30 operations across 20 resources.
> Scope: Jira **Platform v3 only**. Existing `/rest/agile/1.0` boards/sprints code is untouched by Phase 9 and tracked under a future Phase 10. Service Management is Phase 11.
> Default policy: **additive — new methods alongside existing ones; renames behind `@deprecated` aliases; breakers gated by B182 (Jira 1.0.0 cutover, independent of Confluence B062).**
> Test bar: happy-path MockTransport test per method; project coverage target (100%) preserved.
> Phase 8 ↔ Phase 9: independent in general; per-item shared-prereq gates listed under `Dependencies`.
> Out of scope (Phase 9): experimental/EAP ops (Phase 9b), CLI parity for new methods (Phase 9c).
> All design decisions documented in the plan session 2026-05-12; this section is the implementation contract.

### Cross-cutting infrastructure

#### [ ] B069: Elevate B008 — split `src/jira/types.ts` into per-domain files (Phase-9 hard gate)

- **Priority:** P1 — High (elevated from Phase 3)
- **Description:** Originally tracked as B008. Phase 9 hard-depends on this. Split `src/jira/types.ts` (~280 lines) into per-domain files under `src/jira/types/`: `issue.ts`, `created-issue.ts`, `project.ts`, `user.ts` (+ `UserRef`), `issue-type.ts`, `priority.ts`, `status.ts` (+ `StatusCategory`), `transition.ts`, `search.ts`, `issue-comment.ts`, `issue-attachment.ts`, `label.ts`, `params.ts` (or per-domain params co-located with each type), and a barrel `index.ts`. Update `src/jira/index.ts` to re-export from the barrel. No public type names change.
- **Acceptance criteria:**
  - [ ] Each new type file ≤ 100 lines
  - [ ] `src/jira/types.ts` either removed or reduced to a ≤ 20-line re-export
  - [ ] `npx tsc` passes
  - [ ] All tests pass
  - [ ] No breaking changes to public API
- **Files:** `src/jira/types/{issue,created-issue,project,user,issue-type,priority,status,transition,search,issue-comment,issue-attachment,label,index}.ts` (new), `src/jira/types.ts` (shrink/remove), `src/jira/index.ts`
- **Dependencies:** B006 (transport stable — already a prereq from Phase 3); none from Phase 9

#### [ ] B070: Add `paginateNextPageToken` core pagination primitive

- **Priority:** P1 — High
- **Description:** Add a third pagination primitive in `src/core/pagination.ts`: `async function* paginateNextPageToken<TItem, TParams, TResponse>({ initialParams, fetch, extractItems, extractNextToken, tokenLocation }): AsyncIterable<TItem>`. Loops while `extractNextToken(response)` is non-null/empty; advances by injecting the token into the next request (`tokenLocation: 'query' | 'body'`, key configurable, default `nextPageToken`). Inherits B020 safety: cursor no-advance detection (throws `PaginationError`), `maxPages` cap. Used by Jira `searchJql`, Jira bulk-fetch (Phase 9b), and any future Jira endpoint adopting the cursor model. Existing `paginateOffset`, `paginateSearch`, and `paginateCursor` (Confluence Link header) are unchanged.
- **Acceptance criteria:**
  - [ ] `paginateNextPageToken` exported from `src/core/pagination.ts`
  - [ ] Supports both query-param and body-field token placement
  - [ ] Detects no-advance and throws `PaginationError('next page token not advancing')`
  - [ ] Honors `maxPages` (default from existing constant) with 80% warning
  - [ ] 100% line coverage on the new helper
  - [ ] Tests cover: happy path with 3 pages, single page (no token in initial response), no-advance loop guard, maxPages reached
- **Files:** `src/core/pagination.ts`, `test/core/pagination.test.ts`
- **Dependencies:** B020 (cursor advancement validation — done)

#### [ ] B071: Add `AdfDocument` type module

- **Priority:** P1 — High
- **Description:** Define an exported minimal-but-open ADF type in `src/jira/types/adf.ts`: `AdfDocument = { version: 1; type: 'doc'; content?: AdfNode[] }`, `AdfNode = { type: string; attrs?: Record<string, unknown>; content?: AdfNode[]; text?: string; marks?: AdfMark[] }`, `AdfMark = { type: string; attrs?: Record<string, unknown> }`. Do NOT enumerate node types — the ADF spec evolves outside our control. Re-export `AdfDocument`, `AdfNode`, `AdfMark` from `src/jira/types/index.ts` and from `src/index.ts` so consumers building bodies can `import { AdfDocument } from 'atlassian-api-client'`. Application of this type to specific body fields happens in downstream items (B082, B084, etc.).
- **Acceptance criteria:**
  - [ ] `src/jira/types/adf.ts` exists with the three types
  - [ ] Re-exported from `src/jira/types/index.ts` and `src/index.ts`
  - [ ] Tests assert that representative ADF JSON (e.g., paragraph + text + bold mark; nested list) type-checks against `AdfDocument`
  - [ ] No runtime code added (types only)
  - [ ] JSDoc cites Atlassian ADF docs URL
- **Files:** `src/jira/types/adf.ts` (new), `src/jira/types/index.ts`, `src/index.ts`, `test/jira/adf.test.ts` (new)
- **Dependencies:** B069

#### [ ] B072: Add Jira-specific error parser

- **Priority:** P1 — High
- **Description:** Jira Platform v3 returns errors in shape `{ errorMessages: string[]; errors: Record<string, string>; warningMessages?: string[]; status?: number }`. Add `parseJiraErrorBody(body: unknown): { message: string; fieldErrors?: Record<string, string>; warnings?: string[] } | null` in `src/jira/errors.ts`. Wire via a Jira-only response middleware in `src/jira/client.ts` so the existing `ApiError`/`ValidationError`/`RateLimitError` taxonomy from `src/core/errors.ts` is preserved, but the parsed `error` payload now exposes structured `fieldErrors` (e.g., `{ assignee: "User does not exist" }`). Confluence error parsing is untouched.
- **Acceptance criteria:**
  - [ ] `parseJiraErrorBody` exported and unit-tested with 5+ representative Atlassian error shapes
  - [ ] Returns `null` when body doesn't match Jira's error shape (so callers fall back to generic parsing)
  - [ ] Middleware attaches structured payload to `ApiError`/`ValidationError` instance
  - [ ] `ApiResponse.error` carries the structured `Record<string, unknown>` value (this is the part that depends on B002)
  - [ ] Confluence error tests untouched and passing
  - [ ] 100% line coverage on new parser
- **Files:** `src/jira/errors.ts` (new), `src/jira/client.ts`, `test/jira/errors.test.ts` (new)
- **Dependencies:** **B002 (Phase 1 — required)**

#### [ ] B073: Add `Issue<TFields>` generic + comprehensive `SystemFields` interface

- **Priority:** P1 — High
- **Description:** Replace `Issue.fields: Record<string, unknown>` with a generic parameter while preserving the default: `interface Issue<TFields = Record<string, unknown>> { readonly fields: TFields; ... }`. Export a comprehensive `SystemFields` interface in `src/jira/types/system-fields.ts` enumerating every system field the spec defines on the `Fields`/`IssueBean` schemas: `summary`, `description` (`AdfDocument | null`), `status` (`Status`), `assignee` (`User | null`), `reporter` (`User | null`), `creator` (`User`), `priority` (`Priority | null`), `issuetype` (`IssueType`), `project` (`Project`), `parent` (`Issue | null`), `created` (`string`), `updated` (`string`), `resolutiondate` (`string | null`), `duedate` (`string | null`), `labels` (`string[]`), `components` (`Component[]`), `fixVersions` (`Version[]`), `versions` (`Version[]`), `resolution` (`Resolution | null`), `environment` (`AdfDocument | null`), `timetracking` (`TimeTracking`), `timeestimate`, `timeoriginalestimate`, `timespent`, `aggregateprogress`, `progress`, `workratio`, `worklog` (paginated `WorklogPage`), `attachment` (`IssueAttachment[]`), `comment` (paginated `CommentPage`), `subtasks` (`Issue[]`), `issuelinks` (`IssueLink[]`), `votes` (`Votes`), `watches` (`Watchers`), `security` (`SecurityLevel | null`). Consumers compose typed fields via intersection: `type MyFields = SystemFields & { customfield_10001?: string }`. The default `Record<string, unknown>` keeps every existing caller working.
- **Acceptance criteria:**
  - [ ] `Issue<TFields>` generic added; default preserves current behavior
  - [ ] `SystemFields` exported with every system field above, each typed against its spec schema
  - [ ] Companion types added under `src/jira/types/` as needed (`worklog.ts`, `component.ts`, `version.ts`, `resolution.ts`, `issue-link.ts`, `votes.ts`, `watchers.ts`, `security-level.ts`, `time-tracking.ts`)
  - [ ] Tests assert typed composition (`Issue<SystemFields & { customfield_X?: string }>`) and default (`Issue` with `Record<string, unknown>` fields) both type-check
  - [ ] Re-export from `src/jira/types/index.ts` and `src/index.ts`
  - [ ] No breaking change to existing callers
- **Files:** `src/jira/types/issue.ts`, `src/jira/types/system-fields.ts` (new), plus companion type files, `src/jira/types/index.ts`, `src/index.ts`, `test/jira/types.test.ts` (new or extended)
- **Dependencies:** B069, B071

---

### Schema / type alignment for existing resources

> Non-breaking type widening (adding optional fields, adding enum values) ships immediately.
> Breaking tightening (`field?: T` → `field: T`, renames, signature changes) is **gated by B182 (Jira 1.0.0 cutover)**.
> Each item: read corresponding `spec/jira-audit/<tag>.md`, align fields + query/body params, add ADF where applicable, add MockTransport tests asserting newly added fields appear.

#### [ ] B074: Align `Issue` type + issue request params with spec

- **Priority:** P1 — High
- **Description:** Reconcile `Issue`, `CreatedIssue`, `CreateIssueData`, `UpdateIssueData`, `GetIssueParams` against spec `IssueBean`, `CreateIssueDetails`, `IssueUpdateDetails`. Add missing fields/params: `expand` enum values, `properties[]`, `updateHistory`, `fieldsByKeys`, `notifyUsers`, `overrideScreenSecurity`, `overrideEditableFlag`, `returnIssue`, `_links`. Apply `Issue<TFields>` generic from B073.
- **Acceptance criteria:** Every field/param matches spec; tests assert newly added fields exposed via MockTransport responses.
- **Files:** `src/jira/types/issue.ts`, `src/jira/types/params.ts` (or co-located), `test/jira/issues.test.ts`
- **Dependencies:** B069, B073

#### [ ] B075: Align `Project` type + project request params with spec

- **Priority:** P1 — High
- **Description:** Reconcile `Project`, `ListProjectsParams` against spec `Project`, `ProjectIssueTypeHierarchy`. Add missing fields: `simplified`, `style`, `favourite`, `archived`, `deleted`, `retentionTillDate`, `archivedDate`, `deletedDate`, `archivedBy`, `deletedBy`, `entityId`, `uuid`, `projectKeys`, `insight`, `properties`, `roles`, `issueTypeHierarchy`. Add missing params: `searchBy`, `action`, `expand[]`, `properties[]`, `propertyQuery`.
- **Acceptance criteria:** Type/param parity with spec; tests updated.
- **Files:** `src/jira/types/project.ts`, `test/jira/projects.test.ts`
- **Dependencies:** B069

#### [ ] B076: Align `User`/`UserRef` types with spec

- **Priority:** P1 — High
- **Description:** Reconcile against spec `User`, `UserDetails`. Add missing fields: `key` (deprecated, ID-mode), `name` (deprecated), `applicationRoles` (paginated), `groups` (paginated), `expand`, `self`. Tighten `accountType` to `'atlassian' | 'app' | 'customer' | 'unknown'` union. Align `SearchUsersParams` with spec `getAllUsersDefault` query params.
- **Acceptance criteria:** Parity with spec; tests updated.
- **Files:** `src/jira/types/user.ts`, `test/jira/users.test.ts`
- **Dependencies:** B069

#### [ ] B077: Align `IssueType` type with spec

- **Priority:** P1 — High
- **Description:** Reconcile against spec `IssueTypeDetails`. Add `entityId`, `scope`, `avatarId`, `untranslatedName`. Confirm `hierarchyLevel` typing.
- **Files:** `src/jira/types/issue-type.ts`, `test/jira/issue-types.test.ts`
- **Dependencies:** B069

#### [ ] B078: Align `Priority` type with spec

- **Priority:** P1 — High
- **Description:** Reconcile against spec `Priority`. Add `isDefault`, `schemes` references where present.
- **Files:** `src/jira/types/priority.ts`, `test/jira/priorities.test.ts`
- **Dependencies:** B069

#### [ ] B079: Align `Status`/`StatusCategory` types with spec

- **Priority:** P1 — High
- **Description:** Reconcile against spec `StatusDetails`, `StatusCategory`. Confirm `usages[]` shape (project/issueType array). Add `workflowUsages`.
- **Files:** `src/jira/types/status.ts`, `test/jira/statuses.test.ts`
- **Dependencies:** B069

#### [ ] B080: Align `Transition` + `TransitionData` with spec

- **Priority:** P1 — High
- **Description:** Reconcile against spec `IssueTransition`, `IssueUpdateDetails`. Add `expand`, `looped`, `fields` per-screen shape, conditions. `TransitionData.update` becomes structured (`Record<string, FieldUpdateOperation[]>`).
- **Files:** `src/jira/types/transition.ts`, `test/jira/issues.test.ts` (transition flow)
- **Dependencies:** B069

#### [ ] B081: Align `SearchResult` + introduce `JqlSearchResult` for cursor model

- **Priority:** P1 — High
- **Description:** Existing `SearchResult` matches legacy `/search` offset shape (`startAt`/`maxResults`/`total`/`issues`). Add `JqlSearchResult` for the new `/search/jql` endpoint: `{ nextPageToken?: string; isLast?: boolean; issues: Issue<TFields>[] }`. Both exported. Wire `Issue<TFields>` generic through both result types. Legacy `SearchResult` marked `@deprecated Use JqlSearchResult; legacy /search has hard limits.`
- **Files:** `src/jira/types/search.ts`, `test/jira/search.test.ts`
- **Dependencies:** B069, B073

#### [ ] B082: Align `IssueComment` + comment params with spec (ADF body, visibility, properties)

- **Priority:** P1 — High
- **Description:** Reconcile `IssueComment`, `CreateIssueCommentData`, `UpdateIssueCommentData`, `ListIssueCommentsParams` against spec `Comment`. Replace `body: Record<string, unknown>` with `body: AdfDocument`. Add `jsdPublic`, `jsdAuthorCanSeeRequest`, `properties[]`, structured `visibility: { type: 'group' | 'role'; value?: string; identifier?: string }`. Add list params: `expand`, `properties[]`.
- **Files:** `src/jira/types/issue-comment.ts`, `test/jira/issue-comments.test.ts`
- **Dependencies:** B069, B071

#### [ ] B083: Align `IssueAttachment` + params with spec

- **Priority:** P1 — High
- **Description:** Reconcile against spec `Attachment`. Confirm fields; add `created`, `mimeType`, `content` URL, `thumbnail`, `self`, and any `_links` if present.
- **Files:** `src/jira/types/issue-attachment.ts`, `test/jira/issue-attachments.test.ts`
- **Dependencies:** B069

#### [ ] B084: Add `Worklog` domain type (new)

- **Priority:** P1 — High
- **Description:** No existing `Worklog` type. Add `src/jira/types/worklog.ts` modeling spec `Worklog`: `id`, `self`, `author`, `updateAuthor`, `comment: AdfDocument`, `created`, `updated`, `started`, `timeSpent`, `timeSpentSeconds`, `visibility`, `issueId`, `properties`. Add `CreateWorklogData`, `UpdateWorklogData`, `ListWorklogsParams` (offset paginated with `expand`, `startedAfter`, `startedBefore`).
- **Files:** `src/jira/types/worklog.ts` (new), `src/jira/types/index.ts`, `src/index.ts`, `test/jira/worklogs.test.ts` (new — gated by B112)
- **Dependencies:** B069, B071

#### [ ] B085: Align `Workflow` type with spec

- **Priority:** P1 — High
- **Description:** Reconcile against spec `Workflow`, `WorkflowReadResponse`. Add `id` (object form with `name`, `entityId`), `description`, `created`, `updated`, `transitions[]`, `statuses[]`, `isDefault`, `schemes[]`, `projects[]`, `hasDraftWorkflow`, `operations`.
- **Files:** `src/jira/types/workflow.ts`, `test/jira/workflows.test.ts`
- **Dependencies:** B069

#### [ ] B086: Align `Dashboard` type with spec

- **Priority:** P1 — High
- **Description:** Reconcile against spec `Dashboard`. Add `description`, `owner: User`, `popularity`, `rank`, `sharePermissions[]`, `editPermissions[]`, `view`, `isFavourite`, `isWritable`, `systemDashboard`, `automaticRefreshMs`.
- **Files:** `src/jira/types/dashboard.ts`, `test/jira/dashboards.test.ts`
- **Dependencies:** B069

#### [ ] B087: Align `Filter` type with spec

- **Priority:** P1 — High
- **Description:** Reconcile against spec `Filter`. Add `description`, `owner`, `jql`, `viewUrl`, `searchUrl`, `favourite`, `favouritedCount`, `sharePermissions[]`, `editPermissions[]`, `subscriptions[]`, `approximateLastUsed`.
- **Files:** `src/jira/types/filter.ts`, `test/jira/filters.test.ts`
- **Dependencies:** B069

#### [ ] B088: Align `Field` type with spec

- **Priority:** P1 — High
- **Description:** Reconcile against spec `FieldDetails`. Add `key`, `custom`, `orderable`, `navigable`, `searchable`, `clauseNames[]`, `scope`, `schema: { type, items, system, custom, customId }`, `description`, `lastUsed`, `untranslatedName`.
- **Files:** `src/jira/types/field.ts`, `test/jira/fields.test.ts`
- **Dependencies:** B069

#### [ ] B089: Align `Webhook` type with spec

- **Priority:** P1 — High
- **Description:** Reconcile against spec `Webhook`, `WebhookDetails`. Add `expirationDate`, `fieldIdsFilter`, `issuePropertyKeysFilter`. Confirm `events[]` enum coverage.
- **Files:** `src/jira/types/webhook.ts`, `test/jira/webhooks.test.ts`
- **Dependencies:** B069

#### [ ] B090: Align labels params with spec

- **Priority:** P2 — Medium
- **Description:** Confirm `ListLabelsParams` matches spec `getAllLabels` query params. Add any missing.
- **Files:** `src/jira/types/label.ts`, `test/jira/labels.test.ts`
- **Dependencies:** B069

#### [ ] B091: Align JQL parse/autocomplete params with spec

- **Priority:** P2 — Medium
- **Description:** Reconcile `src/jira/resources/jql.ts` params against spec `parseJqlQueries`, `getAutoComplete`, `getAutoCompleteSuggestions`, `getFieldAutoCompleteForQueryString`. Add request body shape, `validation` enum.
- **Files:** `src/jira/types/jql.ts` (new domain file), `test/jira/jql.test.ts`
- **Dependencies:** B069

#### [ ] B092: Align bulk ops payload shapes with spec

- **Priority:** P2 — Medium
- **Description:** Reconcile `src/jira/resources/bulk.ts` against spec bulk ops (`bulkSetIssuesProperties`, etc.). Type request bodies precisely; align response shapes.
- **Files:** `src/jira/types/bulk.ts` (new domain file), `test/jira/bulk.test.ts`
- **Dependencies:** B069

---

### Endpoint additions on existing resources

> Each item adds the listed missing endpoints from the spec as new methods on the existing resource. Method names follow camel-cased spec `operationId`. Existing methods are unchanged in this tier (renames behind aliases handled per item; aliases removed at B182).

#### [ ] B093: Issues — add missing endpoints (split by sub-area)

Spec has >25 ops on the Issues tag; split into atomic sub-items.

##### [ ] B093a: Issues — lifecycle endpoints

- **Priority:** P1 — High
- **Description:** Add to `IssuesResource`: `getCreateIssueMeta` (`GET /issue/createmeta`), `getCreateIssueMetaProjectIssueTypes`, `getCreateIssueMetaIssueTypeFields`, `getEditIssueMeta` (`GET /issue/{issueIdOrKey}/editmeta`), `assignIssue` (`PUT /issue/{issueIdOrKey}/assignee`), `archiveIssues` (`PUT /issue/archive`), `unarchiveIssues` (`PUT /issue/unarchive`), `getIsWatchingIssueBulk` if present.
- **Acceptance criteria:** Methods present with spec-aligned params/return types; one MockTransport happy-path test per method; 100% coverage.
- **Files:** `src/jira/resources/issues.ts`, `src/jira/types/issue.ts`, `test/jira/issues.test.ts`
- **Dependencies:** B074

##### [ ] B093b: Issues — issue properties endpoints

- **Priority:** P1 — High
- **Description:** Add: `getIssuePropertyKeys` (`GET /issue/{issueIdOrKey}/properties`), `getIssueProperty`, `setIssueProperty` (`PUT`), `deleteIssueProperty` (`DELETE`), `bulkSetIssuesProperties`, `bulkSetIssuePropertiesByIssue`, `bulkDeleteIssueProperty`.
- **Files:** `src/jira/resources/issue-properties.ts` (new sub-module, or inline on issues), `test/jira/issue-properties.test.ts`
- **Dependencies:** B074

##### [ ] B093c: Issues — watchers + votes endpoints

- **Priority:** P1 — High
- **Description:** Add: `getIssueWatchers`, `addWatcher`, `removeWatcher`; `getVotes`, `addVote`, `removeVote`.
- **Files:** `src/jira/resources/issues.ts` (or new sub-resource files — decision at PR time)
- **Dependencies:** B074

##### [ ] B093d: Issues — worklog endpoints

- **Priority:** P1 — High
- **Description:** Add: `getIssueWorklog`, `addWorklog`, `getWorklog`, `updateWorklog`, `deleteWorklog`, `getWorklogsForIds`, `getIdsOfWorklogsDeletedSince`, `getIdsOfWorklogsModifiedSince`, `getWorklogPropertyKeys`, `getWorklogProperty`, `setWorklogProperty`, `deleteWorklogProperty`.
- **Files:** `src/jira/resources/worklogs.ts` (new, or under issues sub-namespace), `test/jira/worklogs.test.ts`
- **Dependencies:** B074, B084

##### [ ] B093e: Issues — remote links endpoints

- **Priority:** P1 — High
- **Description:** Add: `getRemoteIssueLinks`, `createOrUpdateRemoteIssueLink`, `getRemoteIssueLinkById`, `updateRemoteIssueLink`, `deleteRemoteIssueLinkById`, `deleteRemoteIssueLinkByGlobalId`.
- **Files:** `src/jira/resources/issue-remote-links.ts` (new), `test/jira/issue-remote-links.test.ts`
- **Dependencies:** B074

##### [ ] B093f: Issues — notifications endpoint

- **Priority:** P1 — High
- **Description:** Add: `notify` (`POST /issue/{issueIdOrKey}/notify`).
- **Files:** `src/jira/resources/issues.ts`, `test/jira/issues.test.ts`
- **Dependencies:** B074

##### [ ] B093g: Issues — issue links endpoints

- **Priority:** P1 — High
- **Description:** Add: `linkIssues` (`POST /issueLink`), `getIssueLink` (`GET /issueLink/{linkId}`), `deleteIssueLink` (`DELETE /issueLink/{linkId}`).
- **Files:** `src/jira/resources/issue-links.ts` (new), `test/jira/issue-links.test.ts`
- **Dependencies:** B074

#### [ ] B094: Projects — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add to `ProjectsResource`: `createProject`, `updateProject`, `deleteProject`, `archiveProject`, `restoreProject`, `getRecent`, `searchProjects` (`GET /project/search` with full param set), `updateProjectAvatar`, `deleteProjectAvatar`, `getProjectComponents`, `getProjectVersions`, `getProjectEmail`, `setProjectEmail`, `getFeaturesForProject`, `toggleFeatureForProject`, `getProjectProperties`/`getProjectProperty`/`setProjectProperty`/`deleteProjectProperty` (if not split into B140), `getHierarchy`, `getNotificationSchemeForProject`.
- **Acceptance criteria:** All methods present, one MockTransport test each, 100% coverage; pagination wired for list endpoints.
- **Files:** `src/jira/resources/projects.ts`, `src/jira/types/project.ts`, `test/jira/projects.test.ts`
- **Dependencies:** B075

#### [ ] B095: Users — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add to `UsersResource`: `getUser` (`GET /user`), `createUser`, `removeUser`, `bulkGetUsers` (`GET /user/bulk`), `findBulkAssignableUsers`, `findAssignableUsers`, `findUsersByQuery` (experimental, deferred to Phase 9b), `findUsersWithBrowsePermission`, `findUsersWithAllPermissions`, `findUsersForPicker`, `getAllUsersDefault`, `getAllUsers`, `getUserDefaultColumns`, `setUserColumns`, `resetUserColumns`.
- **Files:** `src/jira/resources/users.ts`, `src/jira/types/user.ts`, `test/jira/users.test.ts`
- **Dependencies:** B076

#### [ ] B096: Issue Types — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add: `createIssueType`, `updateIssueType`, `deleteIssueType`, `getAlternativeIssueTypes`, `getIssueTypesForProject` (`GET /issuetype/project`), `createIssueTypeAvatar`.
- **Files:** `src/jira/resources/issue-types.ts`, `test/jira/issue-types.test.ts`
- **Dependencies:** B077

#### [ ] B097: Priorities — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add: `createPriority`, `updatePriority`, `deletePriority`, `searchPriorities`, `movePriorities`, `getDefaultPriority`, `setDefaultPriority`.
- **Files:** `src/jira/resources/priorities.ts`, `test/jira/priorities.test.ts`
- **Dependencies:** B078

#### [ ] B098: Statuses — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add: `createStatuses`, `updateStatuses`, `deleteStatusesByIds`, `searchStatuses`, `getStatusesById`, `getProjectIssueTypeUsagesForStatus`, `getProjectUsagesForStatus`, `getWorkflowUsagesForStatus`.
- **Files:** `src/jira/resources/statuses.ts`, `test/jira/statuses.test.ts`
- **Dependencies:** B079

#### [ ] B099: Issue Comments — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add: `getCommentsByIds` (`POST /comment/list`), bulk-get patterns. Comment properties handled in B124.
- **Files:** `src/jira/resources/issue-comments.ts`, `test/jira/issue-comments.test.ts`
- **Dependencies:** B082

#### [ ] B100: Issue Attachments — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add: `getAttachmentMeta`, `getAttachmentSettings`, `getAttachmentThumbnail` (binary `ArrayBuffer` or stream), `getAttachmentHumanMetadata`, `expandAttachmentForHumans`, `expandAttachmentForMachines`, `removeAttachment` (DELETE).
- **Files:** `src/jira/resources/issue-attachments.ts`, `test/jira/issue-attachments.test.ts`
- **Dependencies:** B083

#### [ ] B101: Workflows — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add: `searchWorkflows`, `createWorkflows`, `updateWorkflows`, `validateCreateWorkflows`, `validateUpdateWorkflows`, `getWorkflowCapabilities`, `workflowSearchProjectUsages`, `workflowSearchIssueTypeUsages`, `getWorkflowProjectIssueTypeUsages`, `getWorkflowsPaginated` (deprecated — `@deprecated` JSDoc), `deleteInactiveWorkflow`, `getWorkflowTransitionRuleConfigurations`, `updateWorkflowTransitionRuleConfigurations`, `deleteWorkflowTransitionRuleConfigurations`.
- **Files:** `src/jira/resources/workflows.ts`, `test/jira/workflows.test.ts`
- **Dependencies:** B085

#### [ ] B102: Dashboards — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add: `getAllAvailableDashboardGadgets`, `createDashboard`, `updateDashboard`, `deleteDashboard`, `copyDashboard`, `getAllGadgets`, `addGadget`, `updateGadget`, `removeGadget`, `getDashboardItemProperty`, `setDashboardItemProperty`, `deleteDashboardItemProperty`, `getDashboardItemPropertyKeys`, `getDashboardsPaginated`.
- **Files:** `src/jira/resources/dashboards.ts`, `test/jira/dashboards.test.ts`
- **Dependencies:** B086

#### [ ] B103: Filters — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add: `createFilter`, `updateFilter`, `deleteFilter`, `getMyFilters`, `getFavouriteFilters`, `setFavouriteForFilter`, `deleteFavouriteForFilter`, `getColumns`, `setColumns`, `resetColumns`, `getDefaultShareScope`, `setDefaultShareScope`, `changeFilterOwner`, `getSharePermissions`, `addSharePermission`, `getSharePermission`, `deleteSharePermission`.
- **Files:** `src/jira/resources/filters.ts`, `test/jira/filters.test.ts`
- **Dependencies:** B087

#### [ ] B104: Fields — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add: `getFieldsPaginated`, `createCustomField`, `updateCustomField`, `deleteCustomField`, `restoreCustomField`, `getTrashedFieldsPaginated`, `getContextsForFieldDeprecated`, `getScreensForField` (paginated). Contexts/options/configurations handled in B131/B132/B130.
- **Files:** `src/jira/resources/fields.ts`, `test/jira/fields.test.ts`
- **Dependencies:** B088

#### [ ] B105: Webhooks — add missing endpoints

- **Priority:** P1 — High
- **Description:** Add: `registerDynamicWebhooks`, `deleteWebhookById`, `refreshWebhooks`, `getFailedWebhooks`.
- **Files:** `src/jira/resources/webhooks.ts`, `test/jira/webhooks.test.ts`
- **Dependencies:** B089

#### [ ] B106: JQL — add missing endpoints

- **Priority:** P2 — Medium
- **Description:** Add: `parseJqlQueries`, `getAutoComplete`, `getAutoCompleteSuggestions` (POST), `getFieldAutoCompleteForQueryString`, `getPrecomputations`, `updatePrecomputations`, `migrateQueries`, `sanitiseJqlQueries`, `getReferenceData`.
- **Files:** `src/jira/resources/jql.ts`, `test/jira/jql.test.ts`
- **Dependencies:** B091

#### [ ] B107: Bulk — add missing endpoints

- **Priority:** P2 — Medium
- **Description:** Cover remaining bulk operations from spec: `submitBulkEdit`, `submitBulkDelete`, `submitBulkMove`, `submitBulkTransition`, `submitBulkUnwatch`, `submitBulkWatch`, `getBulkOperationProgress`.
- **Files:** `src/jira/resources/bulk.ts`, `test/jira/bulk.test.ts`
- **Dependencies:** B092

#### [ ] B108: Search — add `searchJql` cursor method (replaces legacy at 1.0.0)

- **Priority:** P0 — Critical (legacy removal-track per Atlassian)
- **Description:** Add `client.jira.search.jql(params, options?)` against `POST /rest/api/3/search/jql` using `paginateNextPageToken` (B070). Return type `JqlSearchResult<TFields>` from B081. Also add `searchAll(params): AsyncIterable<Issue<TFields>>` generator. Mark existing `client.jira.search.search(...)` `@deprecated Use search.jql; legacy /search has 5000-issue hard limit and is on Atlassian's removal track.` Add `getApproximateCount` (`POST /rest/api/3/search/approximate-count`) under the same resource if marked stable; otherwise defer to Phase 9b.
- **Acceptance criteria:**
  - [ ] `searchJql` and `searchAll` exist with correct cursor pagination
  - [ ] Legacy `search()` carries `@deprecated` JSDoc
  - [ ] MockTransport tests cover 3-page pagination + single-page edge case
  - [ ] `JqlSearchResult<TFields>` correctly propagates through both methods
- **Files:** `src/jira/resources/search.ts`, `src/jira/types/search.ts`, `test/jira/search.test.ts`
- **Dependencies:** B070, B081

#### [ ] B109: Labels — add missing endpoints

- **Priority:** P2 — Medium
- **Description:** Reconcile against spec; add any missing list ops.
- **Files:** `src/jira/resources/labels.ts`, `test/jira/labels.test.ts`
- **Dependencies:** B090

#### [ ] B110: (reserved — Sprints/Boards untouched in Phase 9)

- **Priority:** N/A
- **Description:** Existing `src/jira/resources/{boards,sprints}.ts` against `/rest/agile/1.0` are explicitly out of scope. Phase 10 will pin the Jira Software (Agile) v1.0 spec and audit/extend those resources. No-op item; documented here so the numbering reflects the deliberate exclusion.
- **Dependencies:** —

#### [ ] B111: (reserved — spillover)

- **Priority:** N/A
- **Description:** Placeholder for endpoints discovered later that don't fit the prior items. Re-numbered or absorbed at PR time.
- **Dependencies:** None

---

### New resources (entirely missing from current client)

> One backlog item per spec tag. Each item ships: types under `src/jira/types/<resource>.ts`, resource module under `src/jira/resources/<resource>.ts`, wiring in `src/jira/client.ts`, tests under `test/jira/<resource>.test.ts`, README mention, CHANGELOG entry. Method names follow camel-cased spec `operationId`. Pagination via `paginateOffset`/`paginateSearch`/`paginateNextPageToken` as the spec dictates per endpoint. Each item maintains 100% coverage.

#### Issues domain

##### [ ] B112: New resource — Issue Worklogs (`client.jira.worklogs`)

- **Priority:** P1 — High · **Description:** Promotes B093d into a top-level resource for ergonomics. CRUD + property ops + ids-since lists. · **Files:** `src/jira/resources/worklogs.ts`, `src/jira/types/worklog.ts`, `src/jira/client.ts`, `test/jira/worklogs.test.ts` · **Dependencies:** B084, B093d

##### [ ] B113: New resource — Issue Properties (`client.jira.issueProperties`)

- **Priority:** P1 — High · **Description:** Promotes B093b into top-level resource; bulk endpoints included. · **Files:** `src/jira/resources/issue-properties.ts`, `src/jira/client.ts`, `test/jira/issue-properties.test.ts` · **Dependencies:** B093b

##### [ ] B114: New resource — Issue Watchers (`client.jira.issueWatchers`)

- **Priority:** P1 — High · **Description:** Per-issue watcher CRUD. · **Files:** `src/jira/resources/issue-watchers.ts`, `src/jira/client.ts`, `test/jira/issue-watchers.test.ts` · **Dependencies:** B093c

##### [ ] B115: New resource — Issue Votes (`client.jira.issueVotes`)

- **Priority:** P2 — Medium · **Description:** Per-issue vote add/remove + getVotes. · **Files:** `src/jira/resources/issue-votes.ts`, `test/jira/issue-votes.test.ts` · **Dependencies:** B093c

##### [ ] B116: New resource — Issue Remote Links (`client.jira.issueRemoteLinks`)

- **Priority:** P1 — High · **Description:** Promotes B093e. · **Files:** `src/jira/resources/issue-remote-links.ts`, `test/jira/issue-remote-links.test.ts` · **Dependencies:** B093e

##### [ ] B117: New resource — Issue Notifications (`client.jira.issueNotifications`)

- **Priority:** P2 — Medium · **Description:** `notify` endpoint + notification scheme references. · **Files:** `src/jira/resources/issue-notifications.ts`, `test/jira/issue-notifications.test.ts` · **Dependencies:** B093f

##### [ ] B118: New resource — Issue Links (`client.jira.issueLinks`)

- **Priority:** P1 — High · **Description:** Promotes B093g. · **Files:** `src/jira/resources/issue-links.ts`, `test/jira/issue-links.test.ts` · **Dependencies:** B093g

##### [ ] B119: New resource — Issue Link Types (`client.jira.issueLinkTypes`)

- **Priority:** P1 — High · **Description:** CRUD for link types (`GET/POST /issueLinkType`, by id GET/PUT/DELETE). · **Files:** `src/jira/resources/issue-link-types.ts`, `src/jira/types/issue-link-type.ts`, `test/jira/issue-link-types.test.ts` · **Dependencies:** B069

##### [ ] B120: New resource — Issue Resolutions (`client.jira.resolutions`)

- **Priority:** P2 — Medium · **Description:** CRUD + search + move + default. · **Files:** `src/jira/resources/resolutions.ts`, `src/jira/types/resolution.ts`, `test/jira/resolutions.test.ts` · **Dependencies:** B069

##### [ ] B121: New resource — Issue Redactions (`client.jira.redactions`)

- **Priority:** P2 — Medium · **Description:** Redact issue content. · **Files:** `src/jira/resources/redactions.ts`, `test/jira/redactions.test.ts` · **Dependencies:** B069

##### [ ] B122: New resource — Issue Security Schemes (`client.jira.issueSecuritySchemes`)

- **Priority:** P2 — Medium · **Description:** Full CRUD + level + member ops. · **Files:** `src/jira/resources/issue-security-schemes.ts`, `src/jira/types/issue-security-scheme.ts`, `test/jira/issue-security-schemes.test.ts` · **Dependencies:** B069

##### [ ] B123: New resource — Issue Security Level (`client.jira.issueSecurityLevels`)

- **Priority:** P2 — Medium · **Description:** Level membership + member CRUD. · **Files:** `src/jira/resources/issue-security-levels.ts`, `test/jira/issue-security-levels.test.ts` · **Dependencies:** B122

##### [ ] B124: New resource — Issue Comment Properties (`client.jira.issueCommentProperties`)

- **Priority:** P2 — Medium · **Description:** Property CRUD on comments. · **Files:** `src/jira/resources/issue-comment-properties.ts`, `test/jira/issue-comment-properties.test.ts` · **Dependencies:** B082

##### [ ] B125: New resource — Issue Worklog Properties (`client.jira.issueWorklogProperties`)

- **Priority:** P2 — Medium · **Description:** Property CRUD on worklogs. · **Files:** `src/jira/resources/issue-worklog-properties.ts`, `test/jira/issue-worklog-properties.test.ts` · **Dependencies:** B084

##### [ ] B126: New resource — Issue Type Properties (`client.jira.issueTypeProperties`)

- **Priority:** P2 — Medium · **Description:** Property CRUD on issue types. · **Files:** `src/jira/resources/issue-type-properties.ts`, `test/jira/issue-type-properties.test.ts` · **Dependencies:** B077

##### [ ] B127: New resource — Issue Type Schemes (`client.jira.issueTypeSchemes`)

- **Priority:** P2 — Medium · **Description:** CRUD + project associations + issue-type mappings. · **Files:** `src/jira/resources/issue-type-schemes.ts`, `src/jira/types/issue-type-scheme.ts`, `test/jira/issue-type-schemes.test.ts` · **Dependencies:** B077

##### [ ] B128: New resource — Issue Type Screen Schemes (`client.jira.issueTypeScreenSchemes`)

- **Priority:** P2 — Medium · **Description:** CRUD + mappings. · **Files:** `src/jira/resources/issue-type-screen-schemes.ts`, `test/jira/issue-type-screen-schemes.test.ts` · **Dependencies:** B077

##### [ ] B129: New resource — Issue Notification Schemes (`client.jira.notificationSchemes`)

- **Priority:** P2 — Medium · **Description:** CRUD + event/notification membership. · **Files:** `src/jira/resources/notification-schemes.ts`, `src/jira/types/notification-scheme.ts`, `test/jira/notification-schemes.test.ts` · **Dependencies:** B069

##### [ ] B130: New resource — Issue Field Configurations (`client.jira.fieldConfigurations`)

- **Priority:** P2 — Medium · **Description:** Configurations + schemes + items CRUD. · **Files:** `src/jira/resources/field-configurations.ts`, `src/jira/types/field-configuration.ts`, `test/jira/field-configurations.test.ts` · **Dependencies:** B088

##### [ ] B131: New resource — Issue Custom Field Contexts (`client.jira.customFieldContexts`)

- **Priority:** P2 — Medium · **Description:** Context CRUD + default-value + project/issuetype mapping. · **Files:** `src/jira/resources/custom-field-contexts.ts`, `src/jira/types/custom-field-context.ts`, `test/jira/custom-field-contexts.test.ts` · **Dependencies:** B088

##### [ ] B132: New resource — Issue Custom Field Options (`client.jira.customFieldOptions`)

- **Priority:** P2 — Medium · **Description:** Option CRUD + reorder + cascading. · **Files:** `src/jira/resources/custom-field-options.ts`, `src/jira/types/custom-field-option.ts`, `test/jira/custom-field-options.test.ts` · **Dependencies:** B131

##### [ ] B133: New resource — Issue Navigator Settings (`client.jira.issueNavigatorSettings`)

- **Priority:** P3 — Low · **Description:** Default columns get/set. · **Files:** `src/jira/resources/issue-navigator-settings.ts`, `test/jira/issue-navigator-settings.test.ts` · **Dependencies:** None

##### [ ] B134: New resource — Avatars (`client.jira.avatars`)

- **Priority:** P2 — Medium · **Description:** System avatars + per-type CRUD. · **Files:** `src/jira/resources/avatars.ts`, `src/jira/types/avatar.ts`, `test/jira/avatars.test.ts` · **Dependencies:** None

#### Projects domain

##### [ ] B135: New resource — Project Avatars (`client.jira.projectAvatars`)

- **Priority:** P2 — Medium · **Description:** Per-project avatar CRUD. · **Files:** `src/jira/resources/project-avatars.ts`, `test/jira/project-avatars.test.ts` · **Dependencies:** B075

##### [ ] B136: New resource — Project Categories (`client.jira.projectCategories`)

- **Priority:** P2 — Medium · **Description:** CRUD. · **Files:** `src/jira/resources/project-categories.ts`, `src/jira/types/project-category.ts`, `test/jira/project-categories.test.ts` · **Dependencies:** B075

##### [ ] B137: New resource — Project Components (`client.jira.projectComponents`)

- **Priority:** P1 — High · **Description:** CRUD + count of issues per component + paginated list per project. · **Files:** `src/jira/resources/project-components.ts`, `src/jira/types/component.ts`, `test/jira/project-components.test.ts` · **Dependencies:** B075

##### [ ] B138: New resource — Project Versions (`client.jira.projectVersions`)

- **Priority:** P1 — High · **Description:** CRUD + related issue counts + move + merge + paginated list per project. · **Files:** `src/jira/resources/project-versions.ts`, `src/jira/types/version.ts`, `test/jira/project-versions.test.ts` · **Dependencies:** B075

##### [ ] B139: New resource — Project Properties (`client.jira.projectProperties`)

- **Priority:** P2 — Medium · **Description:** Property CRUD scoped to a project. · **Files:** `src/jira/resources/project-properties.ts`, `test/jira/project-properties.test.ts` · **Dependencies:** B075

##### [ ] B140: New resource — Project Features (`client.jira.projectFeatures`)

- **Priority:** P3 — Low · **Description:** Feature flags per project. · **Files:** `src/jira/resources/project-features.ts`, `test/jira/project-features.test.ts` · **Dependencies:** B075

##### [ ] B141: New resource — Project Email (`client.jira.projectEmail`)

- **Priority:** P3 — Low · **Description:** Get/set email config per project. · **Files:** `src/jira/resources/project-email.ts`, `test/jira/project-email.test.ts` · **Dependencies:** B075

##### [ ] B142: New resource — Project Permission Schemes (`client.jira.projectPermissionSchemes`)

- **Priority:** P2 — Medium · **Description:** Per-project permission scheme assignment + security level. · **Files:** `src/jira/resources/project-permission-schemes.ts`, `test/jira/project-permission-schemes.test.ts` · **Dependencies:** B075, B150

##### [ ] B143: New resource — Project Roles (`client.jira.projectRoles`)

- **Priority:** P2 — Medium · **Description:** Global role CRUD + project role details. · **Files:** `src/jira/resources/project-roles.ts`, `src/jira/types/project-role.ts`, `test/jira/project-roles.test.ts` · **Dependencies:** B069

##### [ ] B144: New resource — Project Role Actors (`client.jira.projectRoleActors`)

- **Priority:** P2 — Medium · **Description:** User/group actor membership in roles per project. · **Files:** `src/jira/resources/project-role-actors.ts`, `test/jira/project-role-actors.test.ts` · **Dependencies:** B143

##### [ ] B145: New resource — Project Templates (`client.jira.projectTemplates`)

- **Priority:** P3 — Low · **Description:** Template ops. · **Files:** `src/jira/resources/project-templates.ts`, `test/jira/project-templates.test.ts` · **Dependencies:** B075

##### [ ] B146: New resource — Project Types (`client.jira.projectTypes`)

- **Priority:** P2 — Medium · **Description:** Get all + by key + accessible. · **Files:** `src/jira/resources/project-types.ts`, `test/jira/project-types.test.ts` · **Dependencies:** None

##### [ ] B147: New resource — Project Key & Name Validation (`client.jira.projectValidation`)

- **Priority:** P3 — Low · **Description:** Validate uniqueness. · **Files:** `src/jira/resources/project-validation.ts`, `test/jira/project-validation.test.ts` · **Dependencies:** None

##### [ ] B148: New resource — Project Classification Levels (`client.jira.projectClassificationLevels`)

- **Priority:** P3 — Low · **Description:** Get/set/reset classification per project. (Note: experimental classification ops deferred to Phase 9b if marked so in spec.) · **Files:** `src/jira/resources/project-classification-levels.ts`, `test/jira/project-classification-levels.test.ts` · **Dependencies:** B075

#### Permissions / Security / Groups

##### [ ] B149: New resource — Permissions (`client.jira.permissions`)

- **Priority:** P2 — Medium · **Description:** Get permitted projects + my permissions + bulk permissions. · **Files:** `src/jira/resources/permissions.ts`, `src/jira/types/permission.ts`, `test/jira/permissions.test.ts` · **Dependencies:** B069

##### [ ] B150: New resource — Permission Schemes (`client.jira.permissionSchemes`)

- **Priority:** P2 — Medium · **Description:** CRUD + grants + grants by id. · **Files:** `src/jira/resources/permission-schemes.ts`, `src/jira/types/permission-scheme.ts`, `test/jira/permission-schemes.test.ts` · **Dependencies:** B149

##### [ ] B151: New resource — Application Roles (`client.jira.applicationRoles`)

- **Priority:** P3 — Low · **Description:** List + get by key. · **Files:** `src/jira/resources/application-roles.ts`, `test/jira/application-roles.test.ts` · **Dependencies:** None

##### [ ] B152: New resource — Groups (`client.jira.groups`)

- **Priority:** P2 — Medium · **Description:** CRUD + add/remove user + bulk get. · **Files:** `src/jira/resources/groups.ts`, `src/jira/types/group.ts`, `test/jira/groups.test.ts` · **Dependencies:** B069

##### [ ] B153: New resource — Group & User Picker (`client.jira.groupAndUserPicker`)

- **Priority:** P3 — Low · **Description:** Combined picker endpoint. · **Files:** `src/jira/resources/group-and-user-picker.ts`, `test/jira/group-and-user-picker.test.ts` · **Dependencies:** B152, B076

#### Workflows / Screens

##### [ ] B154: New resource — Workflow Schemes (`client.jira.workflowSchemes`)

- **Priority:** P2 — Medium · **Description:** CRUD + mappings + drafts surface. · **Files:** `src/jira/resources/workflow-schemes.ts`, `src/jira/types/workflow-scheme.ts`, `test/jira/workflow-schemes.test.ts` · **Dependencies:** B085

##### [ ] B155: New resource — Workflow Scheme Drafts (`client.jira.workflowSchemeDrafts`)

- **Priority:** P3 — Low · **Description:** Draft CRUD + publish. · **Files:** `src/jira/resources/workflow-scheme-drafts.ts`, `test/jira/workflow-scheme-drafts.test.ts` · **Dependencies:** B154

##### [ ] B156: New resource — Workflow Scheme Project Associations (`client.jira.workflowSchemeProjectAssociations`)

- **Priority:** P3 — Low · **Description:** Get/set/unset associations. · **Files:** `src/jira/resources/workflow-scheme-project-associations.ts`, `test/jira/workflow-scheme-project-associations.test.ts` · **Dependencies:** B154

##### [ ] B157: New resource — Workflow Statuses (`client.jira.workflowStatuses`)

- **Priority:** P3 — Low · **Description:** Top-level status listing (distinct from per-project statuses already covered by B098). · **Files:** `src/jira/resources/workflow-statuses.ts`, `test/jira/workflow-statuses.test.ts` · **Dependencies:** B079

##### [ ] B158: New resource — Workflow Status Categories (`client.jira.workflowStatusCategories`)

- **Priority:** P3 — Low · **Description:** List + get. · **Files:** `src/jira/resources/workflow-status-categories.ts`, `test/jira/workflow-status-categories.test.ts` · **Dependencies:** B079

##### [ ] B159: New resource — Workflow Transition Rules (`client.jira.workflowTransitionRules`)

- **Priority:** P3 — Low · **Description:** Rule configs CRUD. · **Files:** `src/jira/resources/workflow-transition-rules.ts`, `test/jira/workflow-transition-rules.test.ts` · **Dependencies:** B085

##### [ ] B160: New resource — Workflow Transition Properties (`client.jira.workflowTransitionProperties`)

- **Priority:** P3 — Low · **Description:** Transition property CRUD. · **Files:** `src/jira/resources/workflow-transition-properties.ts`, `test/jira/workflow-transition-properties.test.ts` · **Dependencies:** B085

##### [ ] B161: New resource — Screens (`client.jira.screens`)

- **Priority:** P2 — Medium · **Description:** CRUD + available fields + add field to default. · **Files:** `src/jira/resources/screens.ts`, `src/jira/types/screen.ts`, `test/jira/screens.test.ts` · **Dependencies:** B069

##### [ ] B162: New resource — Screen Schemes (`client.jira.screenSchemes`)

- **Priority:** P3 — Low · **Description:** CRUD. · **Files:** `src/jira/resources/screen-schemes.ts`, `test/jira/screen-schemes.test.ts` · **Dependencies:** B161

##### [ ] B163: New resource — Screen Tabs (`client.jira.screenTabs`)

- **Priority:** P3 — Low · **Description:** Tab CRUD + reorder. · **Files:** `src/jira/resources/screen-tabs.ts`, `test/jira/screen-tabs.test.ts` · **Dependencies:** B161

##### [ ] B164: New resource — Screen Tab Fields (`client.jira.screenTabFields`)

- **Priority:** P3 — Low · **Description:** Field add/remove + reorder within tab. · **Files:** `src/jira/resources/screen-tab-fields.ts`, `test/jira/screen-tab-fields.test.ts` · **Dependencies:** B163

#### Users / Misc / Admin

##### [ ] B165: New resource — User Properties (`client.jira.userProperties`)

- **Priority:** P2 — Medium · **Description:** Property CRUD on users. · **Files:** `src/jira/resources/user-properties.ts`, `test/jira/user-properties.test.ts` · **Dependencies:** B076

##### [ ] B166: New resource — User Search (`client.jira.userSearch`)

- **Priority:** P1 — High · **Description:** Promotes B095 search endpoints into a focused resource. · **Files:** `src/jira/resources/user-search.ts`, `test/jira/user-search.test.ts` · **Dependencies:** B095

##### [ ] B167: New resource — Myself (`client.jira.myself`)

- **Priority:** P2 — Medium · **Description:** `getCurrentUser`, `getPreference`, `setPreference`, `removePreference`, `getLocale`, `setLocale`, `deleteLocale`. · **Files:** `src/jira/resources/myself.ts`, `test/jira/myself.test.ts` · **Dependencies:** B076

##### [ ] B168: New resource — Server Info (`client.jira.serverInfo`)

- **Priority:** P3 — Low · **Description:** Single GET. · **Files:** `src/jira/resources/server-info.ts`, `test/jira/server-info.test.ts` · **Dependencies:** None

##### [ ] B169: New resource — Jira Settings (`client.jira.settings`)

- **Priority:** P3 — Low · **Description:** Get global settings + advanced settings + columns. · **Files:** `src/jira/resources/settings.ts`, `test/jira/settings.test.ts` · **Dependencies:** None

##### [ ] B170: New resource — License Metrics (`client.jira.licenseMetrics`)

- **Priority:** P3 — Low · **Description:** Application license info. · **Files:** `src/jira/resources/license-metrics.ts`, `test/jira/license-metrics.test.ts` · **Dependencies:** None

##### [ ] B171: New resource — Audit Records (`client.jira.auditRecords`)

- **Priority:** P3 — Low · **Description:** Paginated audit log with filter/from/to. · **Files:** `src/jira/resources/audit-records.ts`, `src/jira/types/audit-record.ts`, `test/jira/audit-records.test.ts` · **Dependencies:** B069

##### [ ] B172: New resource — App Properties (`client.jira.appProperties`)

- **Priority:** P3 — Low · **Description:** Forge/Connect app property CRUD. · **Files:** `src/jira/resources/app-properties.ts`, `test/jira/app-properties.test.ts` · **Dependencies:** None

##### [ ] B173: New resource — App Migration (`client.jira.appMigration`)

- **Priority:** P3 — Low · **Description:** Migration endpoints for Connect/Forge apps. · **Files:** `src/jira/resources/app-migration.ts`, `test/jira/app-migration.test.ts` · **Dependencies:** None

##### [ ] B174: New resource — Jira Expressions (`client.jira.expressions`)

- **Priority:** P3 — Low · **Description:** `analyseExpression`, `evaluateJiraExpression` (stable variant only — experimental variants deferred to Phase 9b). · **Files:** `src/jira/resources/expressions.ts`, `test/jira/expressions.test.ts` · **Dependencies:** None

##### [ ] B175: New resource — Tasks (`client.jira.tasks`)

- **Priority:** P3 — Low · **Description:** Long-running task status (`GET /task/{taskId}`, `POST /task/{taskId}/cancel`). · **Files:** `src/jira/resources/tasks.ts`, `test/jira/tasks.test.ts` · **Dependencies:** None

##### [ ] B176: New resource — Time Tracking (`client.jira.timeTracking`)

- **Priority:** P3 — Low · **Description:** Provider list/select + global config. · **Files:** `src/jira/resources/time-tracking.ts`, `test/jira/time-tracking.test.ts` · **Dependencies:** None

##### [ ] B177: New resource — Priority Schemes (`client.jira.prioritySchemes`)

- **Priority:** P3 — Low · **Description:** Scheme CRUD + project associations. · **Files:** `src/jira/resources/priority-schemes.ts`, `test/jira/priority-schemes.test.ts` · **Dependencies:** B078

##### [ ] B178: New resource — Filter Sharing (`client.jira.filterSharing`)

- **Priority:** P3 — Low · **Description:** Standalone resource for share permissions if not covered by B103. · **Files:** `src/jira/resources/filter-sharing.ts`, `test/jira/filter-sharing.test.ts` · **Dependencies:** B103

##### [ ] B179: New resource — Plans (`client.jira.plans`)

- **Priority:** P3 — Low · **Description:** Plans Advanced Roadmaps endpoints. · **Files:** `src/jira/resources/plans.ts`, `src/jira/types/plan.ts`, `test/jira/plans.test.ts` · **Dependencies:** None

##### [ ] B180: New resource — Teams in Plan (`client.jira.teamsInPlan`)

- **Priority:** P3 — Low · **Description:** Team membership within plans. · **Files:** `src/jira/resources/teams-in-plan.ts`, `test/jira/teams-in-plan.test.ts` · **Dependencies:** B179

##### [ ] B181: New resource — Issue Custom Field Configurations (apps) (`client.jira.customFieldConfigurations`)

- **Priority:** P3 — Low · **Description:** Forge/Connect app-managed custom field configs. · **Files:** `src/jira/resources/custom-field-configurations.ts`, `test/jira/custom-field-configurations.test.ts` · **Dependencies:** B131

---

### Migration

#### [ ] B182: Jira 1.0.0 breaking-change cutover

- **Priority:** P0 — Critical (independent of Confluence B062)
- **Description:** Single PR that cuts the Jira 1.0.0 release, independent from Confluence's 1.0.0 cutover (B062). In one stroke: (1) remove every `@deprecated` legacy method name added across Phase 9 (each previously aliased to a spec-aligned name); (2) remove legacy `client.jira.search.search(...)` (replaced by `searchJql` from B108); (3) tighten optionality on fields where the spec marks them required (list compiled from per-resource audit reports under `spec/jira-audit/*.md`); (4) replace remaining `Record<string, unknown>` placeholders on fields that have concrete spec schemas, where doing so would change call sites; (5) consolidate type re-exports. Write `MIGRATION-jira.md` (sibling to Confluence's `MIGRATION.md`) covering every breaking change with before/after, sample diff at call sites, and detection guidance. Update `package.json` to `1.0.0` only when both Phase 8 (Confluence) and Phase 9 (Jira) cutovers are ready to release together OR cut a Jira-only major if Phase 8 isn't ready (the policy is independent per-product 1.0.0; semver bump for the package itself is a separate release-management decision).
- **Acceptance criteria:**
  - [ ] `MIGRATION-jira.md` exists with before/after for every breaking change
  - [ ] All Jira `@deprecated` aliases removed
  - [ ] Tightened types: complete list in MIGRATION-jira.md
  - [ ] `CHANGELOG.md` has the Jira 1.0.0 section
  - [ ] `npm run validate` passes (typecheck, lint, tests, coverage 100%)
  - [ ] No Confluence files touched (Confluence 1.0.0 is B062)
- **Files:** `src/jira/**`, `MIGRATION-jira.md` (new), `CHANGELOG.md`, `package.json` (version bump per release-management decision)
- **Dependencies:** All of B069–B181 (every Phase-9 item before the cutover)

---

### Documentation & skill bundle refresh

> Skill bundle `skill/SKILL.md` is consumed by Claude Code agents; refresh cadence is per-tier (3 times) rather than per-PR to avoid noise in `atlas install-skill` output. README + ARCHITECTURE.md follow the same cadence: one update per tier completion.

#### [ ] B184: Skill bundle refresh — Schema tier complete

- **Priority:** P3 — Low
- **Description:** When all schema-alignment items (B074–B092) ship, refresh `skill/SKILL.md` to reflect aligned types, new generic `Issue<TFields>`, `SystemFields`, `AdfDocument`. Also refresh README's "Type aliases" section.
- **Files:** `skill/SKILL.md`, `README.md`
- **Dependencies:** B074–B092

#### [ ] B185: Skill bundle refresh — Endpoint additions tier complete

- **Priority:** P3 — Low
- **Description:** When all endpoint-additions items (B093–B109) ship, refresh skill bundle with newly available methods on existing resources; update README method index.
- **Files:** `skill/SKILL.md`, `README.md`
- **Dependencies:** B093–B109

#### [ ] B186: Skill bundle refresh — New resources tier complete

- **Priority:** P3 — Low
- **Description:** When all new-resource items (B112–B181) ship, refresh skill bundle and README to enumerate every new top-level `client.jira.*` resource.
- **Files:** `skill/SKILL.md`, `README.md`
- **Dependencies:** B112–B181

#### [ ] B187: Skill bundle refresh — Phase 9 complete (post-1.0.0)

- **Priority:** P3 — Low
- **Description:** Final refresh after B182 lands: prune any leftover deprecated-method documentation, finalize migration guidance, ensure README reflects 1.0.0 surface.
- **Files:** `skill/SKILL.md`, `README.md`, `docs/ARCHITECTURE.md`
- **Dependencies:** B182

---

### Deferred (out of scope for Phase 9)

> Tracked here for traceability; backlog items will be created when these phases begin.

- **Phase 9b — Experimental Jira ops.** Backlog: `bulkfetch`, `approximate-count`, classification-levels-per-project, `findUsersByQuery`, evaluate-Jira-expression EAP variants, any other op the spec marks `x-experimental` (or equivalent). Implemented under `@experimental` JSDoc tag when promoted to stable.
- **Phase 9c — CLI parity.** Adds `atlas jira ...` subcommands for every Phase-9 SDK addition. Sequenced post-1.0.0 with its own UX design (flag naming, paginate-vs-fetch-all default, output formatting).
- **Phase 10 — Jira Software (Agile) v1.0.** Pins `swagger.v3.json` for Agile API; audits/extends existing `boards`/`sprints` against it.
- **Phase 11 — Jira Service Management v1.** Pins JSM spec; adds new resources (queues, requests, organizations, SLAs, etc.).

---

## Summary

| Phase                                | Items            | Est. Effort | Priority |
| ------------------------------------ | ---------------- | ----------- | -------- |
| 0 — Documentation                    | B001             | 2h          | P1       |
| 1 — Type correctness                 | B002, B003       | 3h          | P0+P1    |
| 2 — Transport refactor               | B004, B005, B006 | 8h          | P0       |
| 3 — Type organization                | B007, B008       | 4h          | P1       |
| 4 — Reliability                      | B009, B010, B011 | 10h         | P1+P2    |
| 5 — Testing                          | B012, B013, B014 | 12h         | P1+P2    |
| 6 — Security & advanced              | B015, B016, B017 | 12h         | P2+P3    |
| 7 — Automation                       | B018, B019, B020 | 6h          | P2+P3    |
| 8 — Confluence v2 spec compliance    | B021–B062        | ~80h        | P0–P3    |
| 9 — Jira Platform v3 spec compliance | B069–B187        | ~190h       | P0–P3    |
| **Total**                            | **181 items**    | **~327h**   |          |

**Recommended first PR:** B002 + B003 (type correctness, low risk, high impact, independent)
**Recommended second PR:** B004 + B005 + B006 (transport refactor — do together to minimize breakage)
**Recommended third PR:** B007 + B008 (type splits — mechanical, benefits from stable transport; B008 is also the Phase-9 hard gate as B069)
**Recommended Phase 8 starter PR:** B021 + B022 + B023 (foundation: pin spec, generate matrix, write per-resource reports — no `src/` changes; gates everything else in Phase 8)
**Recommended Phase 8 second PR:** B024–B034 (schema/type alignment in one batch — purely additive, low risk)
**Recommended Phase 8 endpoint sweep:** group B035–B043 by resource family across 4–6 PRs
**Recommended Phase 8 new-resource sweep:** B045–B059 split into PR-per-resource (15 PRs) or grouped by domain (content-types, governance, users — 3 PRs)
**Recommended Phase 8 final PR:** B061 + B062 → Confluence `1.0.0` cut
**Recommended Phase 9 starter PR:** B069 (= B008) — split `src/jira/types.ts`; hard prereq for all downstream Phase-9 work
**Recommended Phase 9 cross-cutting PR:** B070 + B071 + B072 + B073 (pagination primitive, ADF type, error parser, `Issue<TFields>` + `SystemFields`)
**Recommended Phase 9 schema sweep:** B074–B092 grouped by resource family across 5–7 PRs
**Recommended Phase 9 endpoint sweep:** B093 sub-items + B094–B109 split into PR-per-resource or PR-per-2-resources (~15 PRs)
**Recommended Phase 9 new-resource sweep:** B112–B181 grouped by domain (Issues / Projects / Permissions / Workflows-Screens / Users-Misc — 5 domain PRs) or PR-per-resource (~70 PRs)
**Recommended Phase 9 final PR:** B182 → Jira `1.0.0` cut + B187 doc/skill refresh
