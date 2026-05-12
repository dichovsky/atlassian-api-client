# BACKLOG

> Generated from deep code review — 2026-04-24.
> All items are atomic, testable, and ordered by implementation sequence.
> Status: `[ ]` pending · `[~]` in progress · `[x]` done

---

## Implementation Sequence

The items are grouped into **phases**. Each phase should be completed before the next begins due to dependencies.

| Phase | Name                          | Items            | Why This Order                                                                                                                                                 |
| ----- | ----------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Documentation                 | B001             | No code changes; unblocks consumers immediately                                                                                                                |
| 1     | Type correctness              | B002, B003       | Low-risk, high-impact; no behavioral changes                                                                                                                   |
| 2     | Transport refactor            | B004, B005, B006 | High-risk; needs its own focus; unblocks later items                                                                                                           |
| 3     | Type organization             | B007, B008       | Mechanical split; benefits from transport refactor being stable                                                                                                |
| 4     | Reliability                   | B009, B010, B011 | Builds on refactor; adds runtime behavior                                                                                                                      |
| 5     | Testing                       | B012, B013, B014 | Depends on all code changes being stable                                                                                                                       |
| 6     | Security & advanced           | B015, B016, B017 | Lower urgency; requires design discussion                                                                                                                      |
| 7     | Automation                    | B018, B019, B020 | CI/CD; can be done incrementally                                                                                                                               |
| 8     | Confluence v2 spec compliance | B021–B062        | Aligns Confluence client with official OpenAPI v2 spec (`_v=1.8494.0`, 213 ops, 29 tags). Foundation → schema → endpoint additions → new resources → migration |

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

#### [x] B021: Pin Confluence v2 OpenAPI spec snapshot

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

#### [x] B022: Spec-vs-implementation coverage matrix generator

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

#### [x] B023: Per-resource conformance audit reports

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

#### [x] B060: Decide codegen strategy and set up `openapi-typescript` for response types

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

## Summary

| Phase                             | Items            | Est. Effort | Priority |
| --------------------------------- | ---------------- | ----------- | -------- |
| 0 — Documentation                 | B001             | 2h          | P1       |
| 1 — Type correctness              | B002, B003       | 3h          | P0+P1    |
| 2 — Transport refactor            | B004, B005, B006 | 8h          | P0       |
| 3 — Type organization             | B007, B008       | 4h          | P1       |
| 4 — Reliability                   | B009, B010, B011 | 10h         | P1+P2    |
| 5 — Testing                       | B012, B013, B014 | 12h         | P1+P2    |
| 6 — Security & advanced           | B015, B016, B017 | 12h         | P2+P3    |
| 7 — Automation                    | B018, B019, B020 | 6h          | P2+P3    |
| 8 — Confluence v2 spec compliance | B021–B062        | ~80h        | P0–P3    |
| **Total**                         | **62 items**     | **~137h**   |          |

**Recommended first PR:** B002 + B003 (type correctness, low risk, high impact, independent)
**Recommended second PR:** B004 + B005 + B006 (transport refactor — do together to minimize breakage)
**Recommended third PR:** B007 + B008 (type splits — mechanical, benefits from stable transport)
**Recommended Phase 8 starter PR:** B021 + B022 + B023 (foundation: pin spec, generate matrix, write per-resource reports — no `src/` changes; gates everything else in Phase 8)
**Recommended Phase 8 second PR:** B024–B034 (schema/type alignment in one batch — purely additive, low risk)
**Recommended Phase 8 endpoint sweep:** group B035–B043 by resource family across 4–6 PRs
**Recommended Phase 8 new-resource sweep:** B045–B059 split into PR-per-resource (15 PRs) or grouped by domain (content-types, governance, users — 3 PRs)
**Recommended Phase 8 final PR:** B061 + B062 → `1.0.0` cut
