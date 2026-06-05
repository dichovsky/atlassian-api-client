# BACKLOG

> **Agent Rules:** Keep descriptions brief. When a task is completed, REMOVE it from here and APPEND it to BACKLOG-ARCHIVE.md.

## ⚙️ Core

- [ ] 🔴 ♻️ Core: B025 OpenAPI $ref injection hardening
  - files: `src/core/openapi.ts`, `test/core/openapi.test.ts`
  - deps: none

## 🖥️ CLI

> SDK-implemented methods not exposed via `atlas` CLI/skill (audit 2026-06-05, code-verified 2026-06-05). SDK already covers these — tasks wire dispatch + router + help + skill docs + tests only; no `src/*/resources/*.ts` changes. `*All` pagination generators are excluded (their base `list`/`search` is already reachable).

## 🧩 Jira

## 🧩 Confluence

## 🧪 QA

## 🤖 Infra

## 🏛️ Architecture

> Deepening opportunities surfaced via `/improve-codebase-architecture` (2026-05-18). Each needs a grilling pass before implementation.

- [ ] 🟡 ♻️ Arch: B046 Declarative endpoint registry (resource pass-through collapse)
  - problem: ~30 resource modules in `src/{confluence,jira}/resources/*.ts` are pass-through adapters — interface complexity ≈ implementation complexity. Deletion test: inlining concentrates no complexity.
  - solution: define each endpoint as data (method + path template + types + pagination flavor); single `EndpointInvoker` turns declarations into typed calls.
  - benefits: path encoding, query serialization, pagination wiring enforced in one place; new endpoint = one declaration; collapses 30 near-duplicate test files.
  - files: `src/core/endpoint.ts` (new), `src/confluence/resources/*.ts`, `src/jira/resources/*.ts`, `test/core/endpoint.test.ts` (new)
  - deps: none
- [ ] 🟢 ♻️ Arch: B038 Table-driven CLI dispatch
  - problem: `src/cli/commands/{jira,confluence}.ts` contain ~41 `switch (action)` branches each — second hand-maintained registry of "what resources/actions exist," parallel to resource modules. Adding an action requires edits in 3 places.
  - solution: registry-of-handlers per resource keyed by action name; router enumerates available commands for help text. Collapses fully if B046 lands (CLI consumes same declarations).
  - benefits: single source of truth for exposed actions; `atlas --help` auto-generated; one dispatch test replaces N per-case tests.
  - files: `src/cli/router.ts`, `src/cli/commands/jira.ts`, `src/cli/commands/confluence.ts`, `src/cli/help.ts`
  - deps: B046 (optional — bigger win together)
- [ ] 🟢 ♻️ Arch: B039 Extract shared client builder
  - problem: `ConfluenceClient` and `JiraClient` constructors do identical 4-step wiring (resolveConfig → build baseUrl → build HttpTransport → instantiate N resources). Clients own no state, no methods. Also: when `config.transport` is omitted, `resolveConfig` runs twice (idempotent but invites drift).
  - solution: extract `buildClient(apiPaths, resourceFactories, config)` module owning config resolution + transport construction. Client classes become thin facades over it.
  - benefits: one "construct SDK instance" rule; adding a 3rd API surface (Bitbucket) becomes additive; one set of construction tests.
  - files: `src/core/client-builder.ts` (new), `src/confluence/client.ts`, `src/jira/client.ts`, `test/core/client-builder.test.ts` (new)
  - deps: none
- [ ] 🟡 ♻️ Arch: B040 Unify cache/batch request-identity keying
  - problem: `cache.ts` and `batch.ts` duplicate the `authIdentity + method + path + sorted-query + body-hash` key-encoding scheme. They diverge on one rule (batch includes non-auth headers; cache excludes them), documented only as a comment. Security fix to one keyer must be manually mirrored to the other.
  - solution: extract `src/core/request-identity.ts` owning the canonical key format with two variants (header-inclusive/exclusive). Both middlewares become callers of one keying authority; asymmetry becomes an explicit parameter.
  - benefits: keying rule + asymmetry in one short file; future middleware (idempotency-keys, per-key rate limits, metric labels) gets identity for free; fuzz the keyer once.
  - files: `src/core/request-identity.ts` (new), `src/core/cache.ts`, `src/core/batch.ts`, `test/core/request-identity.test.ts` (new)
  - deps: none
- [ ] 🟢 ♻️ Arch: B041 Trim error hierarchy ceremony (preserve public API)
  - problem: `src/core/errors.ts` (345 lines, ~10 subclasses) has ~6 load-bearing `instanceof` discriminations, all in `retry.ts`. Every subclass carries a redundant `code` string. Most internal callers neither catch nor discriminate.
  - caveat: error classes are **public API** exported from package entry; users likely write `catch (e) { if (e instanceof RateLimitError) ... }`. Do not collapse to one class — breaking change.
  - solution: needs grilling. Options: (a) delete redundant `code` field and unused subclass slots; (b) add discriminated-union `errorKind` so retry can `switch` on a string with exhaustiveness checking; keep the hierarchy.
  - benefits: retry decision matrix becomes a table; missed cases caught at compile time.
  - files: `src/core/errors.ts`, `src/core/retry.ts`, `src/index.ts`, `test/core/errors.test.ts`
  - deps: none
- [ ] 🟡 ♻️ Arch: B043 Consolidate request-execution lifecycle
  - problem: `src/core/transport.ts` (298), `src/core/request.ts` (275), and `src/core/response.ts` (287) are split by size but the cross-file invariants ("auth always wins", "query never appears in debug logs", "rate-limit info attached on success") span all three. `executeFetch` calls `buildUrl`/`buildHeaders`/`buildFetchBody` from `request.ts` and then `parseResponseBody`/`buildApiResponse` from `response.ts` — no single module owns the request lifecycle.
  - solution: introduce an internal "request execution" module owning request assembly → fetch → response assembly as a deep module, with `request.ts`/`response.ts` as private helpers behind it. `transport.ts` becomes the public seam (Transport interface + HttpTransport) and orchestrates retry/middleware around one lifecycle call.
  - benefits: auth-stripping, debug-log sanitisation, and rate-limit attachment co-located with the code that uses them; middleware and test authors see one lifecycle interface instead of three helper bags; lifecycle becomes the natural unit-test surface (transport tests focus on retry orchestration).
  - files: `src/core/request-execution.ts` (new), `src/core/transport.ts`, `src/core/request.ts`, `src/core/response.ts`, `test/core/transport.test.ts`
  - deps: none
- [ ] 🟢 ♻️ Arch: B044 Split pagination cursor vs offset
  - problem: `src/core/pagination.ts` (422 LOC) holds two genuinely distinct contracts — Confluence cursor (extract `cursor` from `_links.next`) and Jira offset (track `startAt`, `isLast`, `total`, short-page fallback). They share only a `validatePageSize` helper and async-generator shape. The file is coherent today, but the two halves evolve independently and a maintainer reads both even when only one is relevant.
  - solution: split into `pagination-cursor.ts` and `pagination-offset.ts` (~150 LOC each), keep `validatePageSize` + shared types in `pagination.ts`. Cosmetic, not architectural.
  - benefits: clearer separation; one mode testable in isolation; less context to load when extending one paginator.
  - files: `src/core/pagination.ts`, `src/core/pagination-cursor.ts` (new), `src/core/pagination-offset.ts` (new), `test/core/pagination.test.ts`
  - deps: none
- [ ] 🟢 ♻️ Arch: B045 Drop `paginateSearch` v0.x duck-typing
  - problem: `resolvePaginateOptions` in `src/core/pagination.ts` (~lines 76–99) duck-types its argument to detect whether it received a `Logger` (v0.x signature) or a `PaginateOptions` object (current signature). Backwards-compat cruft; works but adds cognitive load to anyone reading the search paginator.
  - solution: remove duck-typing once v1 backwards-compat is dropped; collapse to a single `PaginateOptions`-only signature.
  - benefits: `paginateSearch` reads top-to-bottom without the type-narrow detour; one less footgun for new callers.
  - files: `src/core/pagination.ts`, `test/core/pagination.test.ts`, `CHANGELOG.md`
  - deps: blocked on next major-version bump

<!-- api-mapping:generated:start -->

## 🗺️ API Coverage

> **Truly-missing Jira endpoints:** 447 as of 2026-05-30. Updated by `chore/jira-backlog-reconcile` PR.

> Tracks every endpoint from the three Atlassian OpenAPI specs (sources below) against this client. Keep descriptions brief. When a task is completed, REMOVE it from here and APPEND it to BACKLOG-ARCHIVE.md.
>
> **Source-of-truth API specifications:**
>
> - Jira Software (Agile) REST API — https://developer.atlassian.com/cloud/jira/software/rest/intro/
> - Jira Cloud Platform REST API v3 — https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/#about
> - Confluence Cloud REST API v2 — https://developer.atlassian.com/cloud/confluence/rest/v2/intro/#about

- [ ] 🔴 🧩 API: B1002 Jira: expose GET /rest/software/1.0/board/{boardId}/backlog/approximate-count
  - files: `src/jira/resources/boards.ts`, `test/jira/boards.test.ts`, `src/cli/commands/jira.ts`, `src/cli/router.ts`, `skill/reference/jira.md`, `test/cli/commands.test.ts`, `test/cli/skill-content.test.ts`
  - deps: none
  - **BLOCKED:** endpoint exists only under /rest/software/1.0/, no /rest/agile/1.0/ equivalent. Needs orchestrator decision before implementing.
- [ ] 🔴 🧩 API: B1006 Jira: expose GET /rest/software/1.0/board/{boardId}/issue/approximate-count
  - files: `src/jira/resources/boards.ts`, `test/jira/boards.test.ts`, `src/cli/commands/jira.ts`, `src/cli/router.ts`, `skill/reference/jira.md`, `test/cli/commands.test.ts`, `test/cli/skill-content.test.ts`
  - deps: none
  - **BLOCKED:** endpoint exists only under /rest/software/1.0/, no /rest/agile/1.0/ equivalent. Needs orchestrator decision before implementing.

<!-- api-mapping:generated:end -->
