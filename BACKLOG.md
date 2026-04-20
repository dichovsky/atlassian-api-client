# Backlog

Deep-review findings for `atlassian-api-client` — items for future implementation.
Severity: **P2** (enhancement), **P3** (polish / DX).

> The P1 findings from the initial deep review have all shipped on the
> `up/review` branch and are documented under the `Unreleased` section of
> `CHANGELOG.md`. The items below are the remaining P2/P3 backlog.

---

## Transport & HTTP

### [P2] Configurable `fetch` injection for proxies / custom agents

- **Where:** `src/core/transport.ts`, `src/core/oauth.ts`
- **Problem:** Both call sites use the global `fetch`. There is no supported path to
  plug in `undici.fetch` with a custom `Dispatcher` (proxy, keep-alive tuning, mTLS)
  or to intercept requests in tests without a full `Transport` replacement.
- **Action:** accept an optional `fetch?: typeof fetch` on `ClientConfig` (and pass
  through to `fetchRefreshedTokens`). Document the Node 20 `undici` proxy recipe in
  `docs/ARCHITECTURE.md`.

### [P2] `isNetworkError` matches only `TypeError`

- **Where:** `src/core/retry.ts`
- **Problem:** Node's `fetch` does wrap network errors as `TypeError`, but undici
  can surface `AbortError` with a non-timeout cause, and runtime-level failures
  (`SystemError` with `code: 'ECONNRESET'`) may reach user code unwrapped in some
  Node builds. We will miss retries in those cases.
- **Action:** inspect `error.cause?.code` for the known retryable set
  (`ECONNRESET`, `ECONNREFUSED`, `ENOTFOUND`, `EAI_AGAIN`, `UND_ERR_SOCKET`,
  `UND_ERR_CONNECT_TIMEOUT`). Add unit tests that construct these causes explicitly.

### [P2] Deprecated `HttpTransport(config, baseUrl)` constructor overload

- **Where:** `src/core/transport.ts`
- **Problem:** The v0.x-compatibility overload is already documented as deprecated
  in CHANGELOG 0.5.0 but has no removal target.
- **Action:** schedule removal for 0.7.0 (or 1.0.0). Emit a `logger.warn` on
  construction when the two-argument form is used so downstream consumers see it
  at runtime, not just in docs. Track with a `@deprecated` tag including the target
  version.

---

## Pagination

### [P3] `extractCursor` silently stops when next URL lacks `cursor` param

- **Where:** `src/core/pagination.ts`
- **Problem:** Confluence v2 always includes `cursor` in `_links.next`, but if the
  shape ever changes (e.g. opaque next URL), iteration stops with no diagnostic.
- **Action:** if `nextUrl` is defined but yields no cursor, log a `warn` via
  `config.logger` so the silent termination is observable.

---

## Cache & Batch middleware

### [P2] Cache FIFO eviction ignores TTL expiry

- **Where:** `src/core/cache.ts`
- **Problem:** Expired entries aren't reclaimed until the same key is re-read.
  When keys vary by query string (common for paginated reads), expired entries
  occupy slots until FIFO evicts them, which can push out still-valid entries.
- **Action:** sweep expired entries during eviction (scan before FIFO drop) or
  switch to an LRU with a max-age check. Benchmark both on a realistic access
  pattern before choosing.

### [P3] Batch dedupe key ignores headers

- **Where:** `src/core/batch.ts`
- **Problem:** Two concurrent requests to the same path/query/body with different
  `X-Atlassian-Token` or custom headers collapse into one. Safe today since
  `Authorization` is injected by the transport, but user-set headers can diverge.
- **Action:** include a hash of `headers` (excluding `Authorization`) in the key,
  or document the limitation with a clear warning.

---

## OAuth / Errors

### [P2] Token endpoint response: missing fields surface as a generic error

- **Where:** `src/core/oauth.ts`
- **Problem:** The "missing access_token" error does not include the HTTP status
  or a body hint. Debugging a misconfigured auth server is harder than it needs to
  be.
- **Action:** include `response.status` and a truncated body snippet (first 200
  chars, with secrets scrubbed) in the error message.

---

## CLI

### [P2] Help text has no end-to-end test

- **Where:** `src/cli/help.ts`, `test/cli/`
- **Problem:** Help text is emitted via a separate module; if a command is added
  and help forgets it, nothing fails. CLI smoke coverage exists but not for `-h`.
- **Action:** add a test that spawns `atlas <resource> --help` for every known
  resource and asserts the action list is non-empty and matches the command
  dispatcher.

---

## Types & public API

### [P2] Streaming response bodies are not supported

- **Where:** `src/core/transport.ts`
- **Problem:** `response.json()` buffers the entire body. Large attachment
  downloads (Confluence/Jira) can blow memory.
- **Action:** add `RequestOptions.responseType?: 'json' | 'arrayBuffer' | 'stream'`.
  For `'stream'` return the `ReadableStream` directly and skip parsing. Keep
  default as `'json'` for backwards compatibility.

### [P3] `ApiResponse.headers` is `Headers` — not JSON-serialisable

- **Where:** `src/core/types.ts`
- **Problem:** Callers who log or persist responses must manually convert the
  `Headers` instance. Minor DX paper-cut.
- **Action:** either expose `headers: Record<string, string>` or add a helper
  `toJSON(response: ApiResponse<T>)`.

---

## Tooling & release hygiene

### [P2] CI does not verify dual ESM/CJS exports

- **Where:** `package.json` (`exports`, `build:esm`, `build:cjs`)
- **Problem:** The package publishes both ESM and CJS builds but `npm run validate`
  only tsc-checks the ESM side. A broken CJS entry (e.g. missing `.cjs` extension)
  ships silently.
- **Action:** add a post-build smoke step that `require()`s `dist/cjs/index.js`
  and `import()`s `dist/index.js` in a scratch file. Run under `npm run validate`.

### [P3] No integration tests against a real Atlassian sandbox

- **Where:** `test/`
- **Problem:** 100% unit coverage proves the mock contracts — not that the library
  actually talks to Confluence v2 / Jira v3 correctly.
- **Action:** add an opt-in integration suite gated by
  `ATLASSIAN_INTEGRATION=1` that hits a dedicated sandbox workspace. Run in CI
  nightly against a service-account token stored in GitHub secrets.

### [P3] Bench suite exists but isn't wired to CI regression detection

- **Where:** `bench/`, `npm run bench`
- **Problem:** Vitest benches are runnable but there is no baseline / regression
  gate. Performance regressions land unnoticed.
- **Action:** capture baseline results in `bench/baseline.json`, compare in CI,
  fail on >20% regression. Start with transport retry/backoff microbench since
  that's the hottest code path.

---

## Docs

### [P3] `docs/ARCHITECTURE.md` does not describe the middleware chain ordering

- **Where:** `docs/ARCHITECTURE.md`, `src/core/transport.ts`
- **Problem:** The `reduceRight` composition order (outermost-first) is non-obvious
  and affects OAuth + cache + batch interaction semantics. Not documented.
- **Action:** add a short "middleware ordering" section with an example chain
  (`[oauth, cache, batch]` vs `[cache, oauth, batch]`) and when each is correct.

### [P3] `README.md` lacks a cookbook section

- **Where:** `README.md`
- **Problem:** Common recipes — custom logger, proxy setup, OAuth with token
  persistence, retry tuning — are spread across examples or missing.
- **Action:** add a "Recipes" H2 with copy-pasteable snippets linked from the TOC.
