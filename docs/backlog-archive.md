# Backlog Archive

> Archived from `BACKLOG.md` during backlog compaction.
> This file keeps completed, obsolete, and shipped history out of the active agent-facing backlog.
> For the full pre-compaction prose, use git history before the compaction commit.

## Phase 1 — Type correctness

- `B002 [obsolete] | ApiResponse<T>.error structured-data preservation`
  - note: obsolete as of 2026-05-16. `ApiResponse<T>` has no `error` field; typed errors already preserve structured payload on `HttpError.responseBody`.

- `B003 [x] P1 | Add retryAfter to RateLimitError`
  - result: `RateLimitError.retryAfter` now preserves the parsed server value for 429 handling.

## Phase 2 — Transport refactor

- `B004 [x] P0 | Extract retry loop`
  - shipped: PR #15, commit `68fdf2a`
  - note: `executeWithRetry` lives in `src/core/retry.ts`; extraction happened without creating `retry-logic.ts`.

- `B005 [x] P0 | Extract middleware builder`
  - shipped: PR #15, commit `68fdf2a`
  - note: middleware composition moved into `src/core/middleware.ts`.

- `B006 [x] P0 | Reduce transport.ts to <=200 lines`
  - shipped: PR #15, commit `68fdf2a`
  - note: `transport.ts` ended at 160 lines; request/response helpers moved to `src/core/request.ts` and `src/core/response.ts`.

## Phase 4 — Reliability

- `B009 [x] P1 | Add LRU eviction to cache middleware`
  - result: cache eviction now protects recently used entries instead of using FIFO behavior.

## Phase 7 — Automation

- `B020 [x] P3 | Add pagination cursor validation`
  - result: cursor pagination now guards against non-advancing cursors and runaway page counts.

## Phase 8 — Security fixes shipped

- `B021 [x] P0 | Absolute URL auth-header exfiltration`
  - shipped: branch `fix/ctf-phase8-p0p1` (2026-05-16)
  - result: `buildUrl` rejects foreign absolute URLs via allowed-host checks; fixed alongside `B034`.

- `B022 [x] P0 | Cross-tenant cache leakage`
  - shipped: branch `fix/ctf-phase8-p0p1` (2026-05-16)
  - result: cache keys now include auth identity so different tokens never share entries.

- `B023 [x] P1 | Unbounded Retry-After remote DoS`
  - shipped: branch `fix/ctf-phase8-p0p1` (2026-05-16)
  - result: retry delay now clamps server `Retry-After` to configured bounds while preserving the raw value on the error.

- `B024 [x] P0 | Batch dedupe cross-identity coalescing`
  - shipped: branch `fix/ctf-phase8-p0p1` (2026-05-16)
  - result: request dedupe keys now include auth identity so different callers do not share in-flight responses.

- `B027 [x] P1 | Terminal escape injection in normal output`
  - shipped: branch `fix/ctf-phase8-p0p1` (2026-05-16)
  - result: `sanitizeForTerminal` now protects TTY output while preserving raw piped output.

- `B029 [x] P1 | Caller auth-bearing headers leaking through buildHeaders`
  - shipped: branch `fix/ctf-phase8-p0p1` (2026-05-16)
  - result: `buildHeaders` now strips `Authorization`, `Proxy-Authorization`, `Cookie`, `Set-Cookie`, and `X-Atlassian-WebSudo`.

- `B030 [x] P1 | install-skill symlink / TOCTOU overwrite`
  - shipped: branch `fix/ctf-phase8-p0p1` (2026-05-16)
  - result: install now checks for symlinks before writes and unlinks them safely under `--force`.

- `B032 [x] P1 | Terminal escape injection in error output`
  - shipped: branch `fix/ctf-phase8-p0p1` (2026-05-16)
  - result: `printError` sanitizes TTY stderr and caps assembled server error messages.

- `B033 [x] P1 | DashboardsResource.listAll infinite pagination`
  - shipped: branch `fix/ctf-phase8-p0p1` (2026-05-16)
  - result: dashboard pagination now uses a `maxPages` cap and warning path instead of looping forever.

- `B034 [x] P1 | baseUrl host allowlist`
  - shipped: branch `fix/ctf-phase8-p0p1` (2026-05-16)
  - result: default Atlassian host suffix validation now gates `baseUrl`, with `allowedHosts` as an explicit escape hatch.

- `B036 [x] P0 | OAuth tokenEndpoint host allowlist`
  - shipped: branch `fix/b036-oauth-token-endpoint-allowlist` (2026-05-18)
  - result: OAuth refresh now validates token endpoint hosts against Atlassian defaults or explicit overrides before any HTTP call.
