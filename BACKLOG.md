# BACKLOG

> Generated from deep code review — 2026-04-24.
> All items are atomic, testable, and ordered by implementation sequence.
> Status: `[ ]` pending · `[~]` in progress · `[x]` done

---

## Implementation Sequence

The items are grouped into **phases**. Each phase should be completed before the next begins due to dependencies.

| Phase | Name                | Items            | Why This Order                                                  |
| ----- | ------------------- | ---------------- | --------------------------------------------------------------- |
| 0     | Documentation       | B001             | No code changes; unblocks consumers immediately                 |
| 1     | Type correctness    | B002, B003       | Low-risk, high-impact; no behavioral changes                    |
| 2     | Transport refactor  | B004, B005, B006 | High-risk; needs its own focus; unblocks later items            |
| 3     | Type organization   | B007, B008       | Mechanical split; benefits from transport refactor being stable |
| 4     | Reliability         | B009, B010, B011 | Builds on refactor; adds runtime behavior                       |
| 5     | Testing             | B012, B013, B014 | Depends on all code changes being stable                        |
| 6     | Security & advanced | B015, B016, B017 | Lower urgency; requires design discussion                       |
| 7     | Automation          | B018, B019, B020 | CI/CD; can be done incrementally                                |

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

### [ ] B007: Split `src/confluence/types.ts` into domain files

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

## Summary

| Phase                   | Items            | Est. Effort | Priority |
| ----------------------- | ---------------- | ----------- | -------- |
| 0 — Documentation       | B001             | 2h          | P1       |
| 1 — Type correctness    | B002, B003       | 3h          | P0+P1    |
| 2 — Transport refactor  | B004, B005, B006 | 8h          | P0       |
| 3 — Type organization   | B007, B008       | 4h          | P1       |
| 4 — Reliability         | B009, B010, B011 | 10h         | P1+P2    |
| 5 — Testing             | B012, B013, B014 | 12h         | P1+P2    |
| 6 — Security & advanced | B015, B016, B017 | 12h         | P2+P3    |
| 7 — Automation          | B018, B019, B020 | 6h          | P2+P3    |
| **Total**               | **20 items**     | **~57h**    |          |

**Recommended first PR:** B002 + B003 (type correctness, low risk, high impact, independent)
**Recommended second PR:** B004 + B005 + B006 (transport refactor — do together to minimize breakage)
**Recommended third PR:** B007 + B008 (type splits — mechanical, benefits from stable transport)
