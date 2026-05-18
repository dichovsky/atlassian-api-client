# BACKLOG ARCHIVE

> **Agent Rules:** Append completed tasks here. Add Impl: (Implementation details) and Rat: (Rationale/Why).

## ⚙️ Core

- [x] 🟢 ♻️ Core: B002 `ApiResponse<T>.error` structured-data preservation (obsolete)
  - **Impl:** No code change; marked obsolete 2026-05-16.
  - **Rat:** `ApiResponse<T>` has no `error` field; typed errors already preserve structured payload on `HttpError.responseBody`.
- [x] 🔴 ♻️ Core: B003 Add `retryAfter` to `RateLimitError`
  - **Impl:** `RateLimitError.retryAfter` now preserves the parsed server value.
  - **Rat:** Let callers honour 429 `Retry-After` for graceful backoff.
- [x] 🔴 ♻️ Core: B004 Extract retry loop
  - **Impl:** PR #15 / `68fdf2a`; `executeWithRetry` lives in `src/core/retry.ts` (no `retry-logic.ts`).
  - **Rat:** Shrink `transport.ts`; isolate retry concerns for testing.
- [x] 🔴 ♻️ Core: B005 Extract middleware builder
  - **Impl:** PR #15 / `68fdf2a`; composition moved to `src/core/middleware.ts`.
  - **Rat:** Decouple middleware composition from transport.
- [x] 🔴 ♻️ Core: B006 Reduce `transport.ts` ≤200 lines
  - **Impl:** PR #15 / `68fdf2a`; `transport.ts` → 160 lines; request/response helpers in `src/core/request.ts`, `src/core/response.ts`.
  - **Rat:** Enforce file-size invariant; split request/response concerns.
- [x] 🔴 📦 Core: B009 LRU eviction for cache middleware
  - **Impl:** Cache eviction now protects recently used entries instead of FIFO.
  - **Rat:** Avoid evicting hot entries under memory pressure.
- [x] 🟡 📦 Core: B016 OAuth concurrent refresh retry queue
  - **Impl:** `createOAuthRefreshMiddleware` adds `retryJitterMs` (default 100ms) and `failureCooldownMs` (default 1000ms); single-flight refresh dedup preserved; jitter sleep honours `RequestOptions.signal`; both knobs accept `0` to disable.
  - **Rat:** Bound post-success retry burst and auth-outage refresh storm.
- [x] 🟢 ♻️ Core: B020 Pagination cursor validation
  - **Impl:** Cursor pagination now guards against non-advancing cursors and runaway page counts.
  - **Rat:** Prevent infinite loops from misbehaving servers.
- [x] 🔴 🐛 Core: B021 Absolute URL auth-header exfiltration
  - **Impl:** Branch `fix/ctf-phase8-p0p1` (2026-05-16); `buildUrl` rejects foreign absolute URLs via allowed-host checks (paired with B034).
  - **Rat:** Prevent credential leak to attacker-controlled host.
- [x] 🔴 🐛 Core: B022 Cross-tenant cache leakage
  - **Impl:** Branch `fix/ctf-phase8-p0p1` (2026-05-16); cache keys now include auth identity.
  - **Rat:** Different tokens must never share cache entries.
- [x] 🔴 🐛 Core: B023 Unbounded `Retry-After` remote DoS
  - **Impl:** Branch `fix/ctf-phase8-p0p1` (2026-05-16); retry delay clamps server `Retry-After` to configured bounds; raw value preserved on error.
  - **Rat:** Block attacker-controlled long retry stalls.
- [x] 🔴 🐛 Core: B024 Batch dedupe cross-identity coalescing
  - **Impl:** Branch `fix/ctf-phase8-p0p1` (2026-05-16); dedupe keys now include auth identity.
  - **Rat:** Different callers must not share in-flight responses.
- [x] 🟡 ♻️ Core: B026 Response body size cap
  - **Impl:** PR #21 / `2864c52`; `maxResponseBytes` enforced for buffered responses; throws `ResponseTooLargeError` on overflow.
  - **Rat:** Prevent OOM from hostile or oversized server responses.
- [x] 🔴 🐛 Core: B029 Caller auth-bearing headers leak via `buildHeaders`
  - **Impl:** Branch `fix/ctf-phase8-p0p1` (2026-05-16); `buildHeaders` strips `Authorization`, `Proxy-Authorization`, `Cookie`, `Set-Cookie`, `X-Atlassian-WebSudo`.
  - **Rat:** Prevent caller from overriding or exfiltrating auth via headers.
- [x] 🔴 🐛 Core: B034 `baseUrl` host allowlist
  - **Impl:** Branch `fix/ctf-phase8-p0p1` (2026-05-16); default Atlassian host suffix validation gates `baseUrl`; `allowedHosts` is an explicit escape hatch.
  - **Rat:** Block redirection of auth-bearing requests to attacker hosts.
- [x] 🔴 🐛 Core: B036 OAuth `tokenEndpoint` host allowlist
  - **Impl:** Branch `fix/b036-oauth-token-endpoint-allowlist` (2026-05-18); OAuth refresh validates token endpoint hosts against Atlassian defaults or explicit overrides before any HTTP call.
  - **Rat:** Prevent OAuth token exfiltration to attacker-controlled endpoint.
- [x] 🔴 🐛 Core: B037 Offset/search pagination server-value hardening
  - **Impl:** Branch `fix/b037-pagination-server-value-hardening` (2026-05-18); `paginateOffset`/`paginateSearch` no longer trust server-echoed `maxResults`; advancement uses delivered row count; short-page detection uses `min(pageSize, serverMaxResults)`; empty mid-iteration page with `total`/`isLast` showing more data now throws `PaginationError`.
  - **Rat:** Stop silent truncation and infinite loops from server lies.

## 🧩 Jira

- [x] 🔴 🐛 Jira: B033 `DashboardsResource.listAll` infinite pagination
  - **Impl:** Branch `fix/ctf-phase8-p0p1` (2026-05-16); dashboard pagination now uses a `maxPages` cap plus warning path instead of looping forever.
  - **Rat:** Bound dashboard listing against pathological server responses.

## 🖥️ CLI

- [x] 🔴 🐛 CLI: B027 Terminal escape injection (normal output)
  - **Impl:** Branch `fix/ctf-phase8-p0p1` (2026-05-16); `sanitizeForTerminal` protects TTY output while preserving raw piped output.
  - **Rat:** Stop ANSI escape injection from server-controlled data.
- [x] 🔴 🐛 CLI: B030 `install-skill` symlink / TOCTOU overwrite
  - **Impl:** Branch `fix/ctf-phase8-p0p1` (2026-05-16); install now checks for symlinks before writes and unlinks them safely under `--force`.
  - **Rat:** Prevent file overwrite via attacker-placed symlinks.
- [x] 🔴 🐛 CLI: B032 Terminal escape injection (error output)
  - **Impl:** Branch `fix/ctf-phase8-p0p1` (2026-05-16); `printError` sanitizes TTY stderr and caps assembled server error messages.
  - **Rat:** Stop ANSI escape injection in the error path.
