# BACKLOG

> **Agent Rules:** Keep descriptions brief. When a task is completed, REMOVE it from here and APPEND it to BACKLOG-ARCHIVE.md.

## ⚙️ Core

> Deep-audit 2026-06-10 (`docs/DEEP-AUDIT-2026-06-10.md`) core/CLI findings below (B1037–). Adversarially verified; the auth-middleware (#246) and pagination (#247) clusters already shipped and are excluded.

- [ ] 🟡 🐛 Core: B1039 Batch middleware dedupes non-idempotent mutations + key gaps
  - problem: `src/core/batch.ts` has no method guard (POST/PUT/PATCH/DELETE coalesced like GETs); `formData`/`binaryBody`/`responseType` excluded from the dedup key → concurrent distinct multipart/binary/responseType requests collapse to one. See report §5b.
  - files: `src/core/batch.ts`, `test/core/batch.test.ts`
  - deps: none
- [ ] 🟡 🐛 Core: B1040 Circuit breaker ignores body-cap failures
  - problem: `ResponseTooLargeError` on a 5xx is not a qualifying failure (`src/core/circuit-breaker.ts`) → breaker never trips for response-too-large failures.
  - files: `src/core/circuit-breaker.ts`, `test/core/circuit-breaker.test.ts`
  - deps: none
- [ ] 🟢 🐛 Core: B1041 Core robustness rollup (deep-audit MED/LOW)
  - problem: `transport.getHeaders()` called twice per request (constructor hashing path can diverge); `response.ts` throws raw `SyntaxError` on malformed 2xx JSON (outside error taxonomy); `cache.ts` concurrent-miss stampede (no in-flight coalescing); `oauth.validateTokenEndpoint` echoes raw unparseable endpoint into a ValidationError; `onTokenRefreshed` throw poisons `refreshPromise`; `createAuthProvider` doesn't validate non-empty creds; `pagination.validatePageSize` throws native `RangeError`. Full list + file:line in report §5b.
  - files: `src/core/{transport,response,cache,oauth,auth,pagination}.ts` + tests
  - deps: none

## 🖥️ CLI

> SDK-implemented methods not exposed via `atlas` CLI/skill (audit 2026-06-05, code-verified 2026-06-05). SDK already covers these — tasks wire dispatch + router + help + skill docs + tests only; no `src/*/resources/*.ts` changes. `*All` pagination generators are excluded (their base `list`/`search` is already reachable).

- [ ] 🟡 🐛 CLI: B1063 Boolean filter flags cannot express `false`
  - problem: several CLI flags are registered `type: 'boolean'` in `src/cli/router.ts` (presence-only — parseArgs sets them `true` and pushes any following `true`/`false` token to positionals). For tri-state filters this loses the `false` case entirely: `--validate-query`, `--done` (boards list-epics), `--send-notification` (bulk ops), `--is-global-context`/`--is-any-issue-type` (fields context-list), `--only-options`, `--only-default`, `--redirect`, `--fallback-to-default`. The handlers read them via `asBoolFlag` which DOES accept the string `'false'`, but a boolean-typed flag never delivers a string — so `--flag false` silently sends `true`. Found during the Phase-3 skill doc reorg (the docs showed broken `--flag false` examples, now corrected to presence-only).
  - solution: decide per-flag — for genuine tri-state filters, register as `type: 'string'` (so `asBoolFlag` gets `'true'`/`'false'`) or add explicit `--no-<flag>` variants; for true on/off toggles, presence-only is correct and the docs already match. Update router + tests + skill docs together (parity rule).
  - files: `src/cli/router.ts`, `src/cli/commands/jira.ts`, `test/cli/router.test.ts`, `skill/reference/jira/*.md`
  - deps: none

## 🧩 Jira

> Deep-audit 2026-06-10 conformance findings (`docs/DEEP-AUDIT-2026-06-10.md` §4). CRITICAL/HIGH that change bytes on the wire below; per-module response-type/type-drift (84 HIGH + 358 MED + 72 LOW) rolled into B1056. Excludes the 30 findings shipped via #249/#250.

- [ ] 🔴 🐛 Jira: B1049 Repeated-array-param serialization holdouts (recurring class)
  - problem: array-type query params still CSV-joined where the spec needs repeated params (`appendRepeatedParams`): `projects.list status`, `tasks` 7 array params serialized as scalars, `service-registry.serviceIds` (see B1047). Silently returns wrong result sets. Same class as #167/#198/#200/#201/#222.
  - files: `src/jira/resources/{projects,tasks,service-registry}.ts` + tests — see [[project_jira_array_query_param_serialization]]
  - deps: none
- [ ] 🟡 🐛 Jira: B1050 `readOnly` fields sent in request bodies
  - problem: `version.ts` sends spec-`readOnly` `userStartDate`/`userReleaseDate` in create/update bodies (writable equivalents are `startDate`/`releaseDate`); `createRelatedWork`/`updateRelatedWork` send `readOnly` `issueId`. Server ignores or 400s.
  - files: `src/jira/resources/version.ts`, `test/jira/version.test.ts`
  - deps: none
- [ ] 🟡 🐛 Jira: B1051 Wrong content-type / body encoding
  - problem: `settings.setColumns` sends JSON object-array; spec requires form-data string array. `plans` JSON-patch endpoints send `application/json` not `application/json-patch+json`. `issuetype.loadAvatar` sends multipart; spec requires raw binary body.
  - files: `src/jira/resources/{settings,plans,issuetype}.ts` + tests
  - deps: none
- [ ] 🟡 🐛 Jira: B1053 Fictional / misnamed query params silently dropped or rejected
  - problem: `priorities.delete replaceWith`, `priorities.move before` (spec: `position`), `resolution.moveResolutions before`/`SearchResolutionsParams queryString`, `exists-by-properties entityType/entityId`, `users.searchQueryKey maxResults` (spec: `maxResult`), `users.getPermissionUsers projectUuid`, `classification-levels.list status`/`orderBy`. Each unknown param is dropped (or 400s against `additionalProperties:false`).
  - files: `src/jira/resources/{priorities,resolution,exists-by-properties,users,classification-levels}.ts` + tests
  - deps: none
- [ ] 🟡 🐛 Jira: B1054 `webhooks` refresh/response gaps (deferred from #250)
  - problem: `refresh()` discards the `WebhooksExpirationDate` 200 body (typed `void`); `Webhook` interface declares phantom `self` and is missing required `url`. Flagged non-blocking in #250 review.
  - files: `src/jira/resources/webhooks.ts`, `test/jira/webhooks.test.ts`
  - deps: none
- [ ] 🟢 🐛 Jira: B1055 Misc wire-body / pagination-flavor HIGH
  - problem: `configuration.UpdateTimeTrackingConfigurationData` all-optional vs spec all-required; `dashboards.bulkEdit entityIds` string[] vs spec integer[], `copy()` empty-body vs required `DashboardDetails`; `expression.custom` Record vs spec array; `pages.UpdatePageData.body` optional vs required; `data-policy.getPolicies` offset-paginates a non-paginated endpoint; `sprints.getIssues` envelope (`.values` vs `.issues`); `search.JqlSearchResult` missing `isLast`. Report §4b.
  - files: `src/jira/resources/{configuration,dashboards,expression,pages,data-policy,sprints,search}.ts` + tests
  - deps: none
- [ ] 🟢 ♻️ Jira: B1056 Response-type / type-drift rollup (85 modules — MED/LOW + non-wire HIGH)
  - problem: declared request/response interfaces drift from spec schemas (fields that read `undefined` at runtime, wrong optionality, enum subsets, fictional fields) — annoying but not request-corrupting. 79 HIGH + 358 MED + 72 LOW across 85 Jira modules. Full per-module inventory in report §4c + `conformance-final.json`. Heaviest: app, boards, bulk, dashboards, expression, issues, plans, post-incident-reviews, workflows. Fix opportunistically per module or fold into B046 endpoint-registry typing.
  - files: `src/jira/resources/*.ts`, `src/jira/types*.ts` + tests (per module)
  - deps: B046 (optional)

## 🧩 Confluence

- [ ] 🟢 ♻️ Confluence: B1059 Response-type / type-drift rollup (21 modules — MED/LOW + 5 HIGH)
  - problem: declared interfaces drift from spec schemas (5 HIGH + 109 MED + 14 LOW across 21 Confluence modules). Notable: `app.upsertProperty` typed `Promise<AppProperty>` but the spec PUT is bodyless → `undefined` at runtime (HIGH); `attachments.status` CSV-not-repeated (HIGH, see class B1049); `footer-comments`/`inline-comments`/`tasks` type drift. Full inventory in report §4c.
  - files: `src/confluence/resources/*.ts`, `src/confluence/types/*` + tests (per module)
  - deps: B046 (optional)

- [ ] 🟢 ♻️ Confluence: B1021 Add `sort` to `ListLabelsParams` (SDK type debt)
  - problem: `ListLabelsParams` (`src/confluence/types/labels.ts`) omits `sort?: LabelSortOrder`, though the live v2 `GET /spaces/{id}/labels` and `GET /blogposts/{id}/labels` accept it. CLI `labels list-for-space`/`list-for-blog-post` (PR #195) forward `--sort` via object spread — works at runtime, but the param type doesn't declare it. Surfaced in PR #195 review.
  - solution: add `sort?: LabelSortOrder` to `ListLabelsParams`; confirm `listForSpace`/`listForBlogPost` thread it through to the query (and `list`/`listForPage` if they share the type).
  - files: `src/confluence/types/labels.ts`, `src/confluence/resources/labels.ts`, `test/confluence/labels.test.ts`
  - deps: none

## 🧪 QA

- [ ] 🟡 🐛 QA: B1060 Type-regen drift-guard watches the old Confluence **v1** spec (report F3)
  - problem: `scripts/regenerate-types.ts` fetches `confluence/swagger.v3.json` (v1, 89 paths) instead of the pinned v2 `openapi-v2.v3.json` (151 paths) — the weekly `spec-drift` smoke test (B018) exercises `generateTypes()` against a spec the SDK doesn't target. Jira URLs verified correct.
  - solution: one-line URL swap + tighten `test/scripts/regenerate-types.test.ts:41` to assert the exact v2 URL.
  - files: `scripts/regenerate-types.ts`, `test/scripts/regenerate-types.test.ts`
  - deps: none
- [ ] 🟢 ♻️ QA: B1061 Dead-code cleanup (deep-audit, minimal)
  - problem: `src/confluence/resources/index.ts` is an unreachable partial barrel with zero consumers (removable now); `tsconfig.json`/`vitest.config.ts` reference a `bench/` dir that doesn't exist. Plus 7 unused-public exports (root-vs-core barrel asymmetry: `HttpMethod`, `ResolvedConfig`, `AuthProvider`, `appendRepeatedParams` core re-export; all 26 Confluence resource classes exported from `confluence/index.ts` but absent from root) — removal is semver-major, defer to 3.0.0.
  - files: `src/confluence/resources/index.ts`, `tsconfig.json`, `vitest.config.ts`, `src/core/index.ts`, `src/confluence/index.ts`
  - deps: 3.0.0 for the public-export trims

## 🤖 Infra

- [ ] 🟡 📝 Infra: B1062 CHANGELOG breaking changes for next major (3.0.0)
  - problem: #246/#249/#250 changed typed surfaces (auth `RequestOptions.authorizationOverride` boundary, forge/redact/statuses/role/priorityscheme return + body shapes) — each fixes a 100%-broken method (not a real runtime break) but the typed surface changed. Reviewers flagged 3.0.0. Record the breaking set in CHANGELOG when cutting the next major. Scope to last-published, per [[project_unreleased_breaking_changes]].
  - files: `CHANGELOG.md`
  - deps: none

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

> **Truly-missing Jira endpoints:** 0 non-blocked as of 2026-06-08. The 9 previously-open gaps (1 platform `getIsWatchingIssueBulk` + 8 software `*JSIS`) shipped as B1022–B1030 (PRs #235/#236/#238). Only 2 remain — both **BLOCKED** (B1002/B1006 approximate-count, software/1.0-only with no agile equivalent). Verified against live specs in `docs/archive/API-GAP-ANALYSIS-2026-06-07.md` (superseded by `docs/DEEP-AUDIT-2026-06-10.md`). (Prior "447 as of 2026-05-30" was stale — pre-dated the coverage wave.)

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
