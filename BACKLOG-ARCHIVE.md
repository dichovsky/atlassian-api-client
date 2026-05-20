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
- [x] 🟡 ♻️ Core: B035 Expand log-path credential redaction
  - **Impl:** Branch `feat/b035-log-path-credential-redaction` (2026-05-18); `sanitizePathForLogging` expanded marker list (password, pwd, apikey, api_key, access_token, refresh_token, bearer, jwt, assertion, client_secret, signature, sig, jsessionid, sid, session); added JWT compact-serialization shape redaction (`eyJ…` → `***.jwt.***`); userinfo `user:pass@host` stripped in fallback branch; matrix-param coverage (`;jsessionid=…`) inherited from expanded `name=` regex.
  - **Rat:** Shrink the credential-in-debug-log attack surface without changing public API; close userinfo gap in the URL-parse-failure fallback; catch raw JWTs that bypass marker-based redaction.

## 🧩 Confluence

- [x] 🔴 🧩 Confluence: B047 expose DELETE /admin-key
  - **Impl:** Branch `feat/api-admin-key`; new `AdminKeyResource.delete()` in `src/confluence/resources/admin-key.ts`, wired on `ConfluenceClient.adminKey`. CLI: `atlas confluence admin-key delete`.
  - **Rat:** Admin-key revocation lets tenant admins close the privileged window without waiting for auto-expiry.
- [x] 🔴 🧩 Confluence: B048 expose GET /admin-key
  - **Impl:** Branch `feat/api-admin-key`; new `AdminKeyResource.get()` returning the `AdminKey` shape (`createdAt`, `expireAt`, `durationInHours`). CLI: `atlas confluence admin-key get`.
  - **Rat:** Lets admins inspect whether an admin key is active and when it will expire before invoking privileged operations.
- [x] 🔴 🧩 Confluence: B049 expose POST /admin-key
  - **Impl:** Branch `feat/api-admin-key`; new `AdminKeyResource.create(data?)` supporting optional `durationInHours` (server validates 1-24). CLI: `atlas confluence admin-key create [--duration-hours <N>]`.
  - **Rat:** Enables programmatic enable / rotate of the admin key for privileged automation flows.
- [x] 🔴 🧩 Confluence: B050 expose GET /app/properties
  - **Impl:** Branch `feat/api-app` (2026-05-20); new `AppResource.listProperties()` + `listPropertiesAll()` async-generator on `src/confluence/resources/app.ts`, wired as `client.app` on `ConfluenceClient`. CLI: `atlas confluence app list-properties [--limit] [--cursor]`. Uses cursor pagination via `paginateCursor`; reuses `validatePageSize` so invalid `--limit` short-circuits before the request.
  - **Rat:** Forge/Connect apps store per-app configuration via `/wiki/api/v2/app/properties`; listing was the only missing read primitive.
- [x] 🔴 🧩 Confluence: B051 expose DELETE /app/properties/{propertyKey}
  - **Impl:** Branch `feat/api-app` (2026-05-20); `AppResource.deleteProperty(key)` issues `DELETE /app/properties/{key}` with `encodePathSegment`-protected key. CLI: `atlas confluence app delete-property <key>` returns `{ deleted: true }`.
  - **Rat:** Mirror the parity between create/update/delete already established by the other Confluence resources so callers can roll back app state.
- [x] 🔴 🧩 Confluence: B052 expose GET /app/properties/{propertyKey}
  - **Impl:** Branch `feat/api-app` (2026-05-20); `AppResource.getProperty(key)` issues `GET /app/properties/{key}`. CLI: `atlas confluence app get-property <key>`.
  - **Rat:** Point-reads are needed by tooling that already knows the property key and wants to avoid paginating.
- [x] 🔴 🧩 Confluence: B053 expose PUT /app/properties/{propertyKey}
  - **Impl:** Branch `feat/api-app` (2026-05-20); `AppResource.upsertProperty(key, { value })` issues `PUT /app/properties/{key}` with the raw JSON value as the request body (Confluence wraps it server-side; there is no `key`/`version` field on the wire). CLI: `atlas confluence app upsert-property <key> --value <json>`; `--value` is parsed as JSON when possible and falls back to the literal string otherwise.
  - **Rat:** Confluence treats this PUT as an idempotent upsert, so a single `upsertProperty` covers both the "create new" and "update existing" backlog intents without forcing callers to inspect existence first.
- [x] 🔴 🧩 Confluence: B085 expose GET /classification-levels
  - **Impl:** Branch `feat/api-classification-levels` (2026-05-20); new `ClassificationLevelsResource` (`src/confluence/resources/classification-levels.ts`) exposes `list()` mapped to `GET /wiki/api/v2/classification-levels`, returning the bare `ClassificationLevel[]` array per the OpenAPI spec. Wired as `ConfluenceClient.classificationLevels`; new `ClassificationLevel` + `ListClassificationLevelsResponse` types exported from `src/confluence/types.ts` and re-exported through `src/confluence/index.ts` + `src/index.ts`. CLI dispatch added in `src/cli/commands/confluence.ts` (`case 'classification-levels' → executeClassificationLevels` with `list` action); help text and reference doc (`skill/reference/confluence.md`) updated. Coverage: 100% on the new resource + dispatch arms; unit test (`test/confluence/classification-levels.test.ts`) asserts exact GET path with no query/body; CLI command test covers the dispatch arm and unknown-action error; E2E matrix gains a `classification-levels list` row exercising the full `runCli` → `HttpTransport` pipeline.
  - **Rat:** Pilot for the bulk API-coverage backlog. Lists the org-wide data-classification levels needed to drive the per-content classification-level endpoints (B073/B118/B171/B198/B224) without each caller hand-rolling the lookup.

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
- [x] 🟡 🐛 CLI: B031 Real version from `package.json`
  - **Impl:** Branch `feat/b031-real-cli-version` (2026-05-18); new `src/cli/version.ts` exports shared `resolvePackageVersion(moduleUrl, fs?)` + `VersionResolutionError`; `src/cli/index.ts` drops the hardcoded `VERSION='0.1.0'` and exports a testable `runCli(argv, stdout, stderr, resolveVersion?)`; bin shim guarded by `import.meta.url`-vs-`realpath(argv[1])` so tests can import without triggering `main()`; `install-skill.ts` keeps its `resolvePackageVersion` export as a thin `InstallSkillError`-wrapping adapter over the shared helper; new `test/cli/version.test.ts` + `test/cli/index.test.ts` cover the resolver and `--version` wiring end-to-end without subprocess spawning.
  - **Rat:** CLI was printing `atlas v0.1.0` while the package shipped at `0.7.0` — `--version` was misleading users and skill installers reporting drift. Centralising the lookup eliminates the second source of truth and prevents the same drift from re-emerging on the next release.

## 🧪 QA

- [x] 🔴 🧪 QA: B013 CLI E2E tests
  - **Impl:** Branch `feat/b013-cli-e2e-tests` (2026-05-20); new `test/e2e/` suite (4 files, 69 tests) drives `runCli` end-to-end against a `vi.stubGlobal('fetch', …)` route-table mock. `test/e2e/helpers/fetch-mock.ts` matches method + pathname and captures every request (URL, query, headers, body) for assertion; `test/e2e/helpers/cli-runner.ts` spies `process.stdout`/`process.stderr` and mirrors the bin's top-level error-to-exit-1 translation so callers see one `{ stdout, stderr, code }` regardless of whether output went through the writer args or the `printOutput`/`printError` direct-write paths; `test/e2e/helpers/fixtures.ts` holds minimal Atlassian payloads. Matrix coverage: every shipped CLI verb (25 Confluence + 17 Jira = 42 actions) plus help/version/format/error/auth-variant edges. 100% coverage preserved.
  - **Rat:** Resource-level tests use `MockTransport` so the CLI → config-resolve → client → HttpTransport chain was previously untested as a single pipeline; B013 closes that gap, surfacing argv-parse, auth-resolution, host-allowlist, format-output and error-translation regressions in one suite that runs in ~500ms.
