# Deep Audit — 2026-06-10/11

> Full-repo audit: independent API-coverage re-run (3 layers), bidirectional spec-conformance diff, deep core/CLI review, useless-code adjudication, and documentation content audit. Findings are backlog-only (no code fixes in this wave); documentation reorganization ships separately (Phase 3). Every spec claim cites the pinned snapshots below.
>
> **Status: FINAL — all layers complete.** Layer 1 (coverage), Layer 2 (conformance, 113/113 modules), Layer 3 (reachability, 113/113 modules), core/CLI deep review, useless-code, and documentation audit are done. CRITICAL/HIGH findings were adversarially verified (independent skeptic agents trying to refute each); refuted findings are excluded from the counts below.

## 0. Inputs and denominators

| Spec                  | Pinned (PR #251, merged 2026-06-10) | Ops     | Deprecated | SHA-256             |
| --------------------- | ----------------------------------- | ------- | ---------- | ------------------- |
| Jira Platform v3      | `1001.0.0-SNAPSHOT-32b43b28…`       | 619     | 36         | `ae5e7e6d…25af1fa`  |
| Jira Software (Agile) | `1001.0.0`                          | 105     | 8          | `2aaf7826…19fc599`  |
| Confluence v2         | `2.0.0`                             | 218     | 1          | `21eac830…40e8c0a7` |
| **Total**             |                                     | **942** | **45**     |                     |

Full hashes in [spec/README.md](../spec/README.md). Dedup corpus: open PRs #242, #246, #247, #248, #249, #250 (full diffs) and issues #240–#245, plus BACKLOG.md / BACKLOG-ARCHIVE.md (1,074 archived items). Every finding carries a `dedup` disposition against that corpus.

## 1. Layer 1 — operation-level coverage (FINAL)

**Method (independent of the 2026-06-07 analysis):** a fresh Node extractor (different language and parsing strategy from `scripts/api-gap-analysis.py`) token-scans every `transport.request` call in `src/{jira,confluence}/resources/*.ts`, resolves base URLs from client wiring (including ctor-JSDoc, `require*BaseUrl()` indirection, helper-param fan-in, and ternary paths), and adds a second signal the prior method lacked: JSDoc-declared `VERB /path` annotations reconciled against the resolved call paths.

**Reconciliation:** 949 calls resolved, **0 unresolved**, **0 unresolved bases**, **0 JSDoc↔code mismatches**. Cross-check vs the legacy extractor: my candidate set is a strict subset of its output; its 8 extra candidates are exactly its blind spot (the JSIS `/rest/software/1.0` helper fan-in shipped in PRs #235/#238), confirmed implemented.

**Result: zero new operation-level gaps.** Of 942 operations:

- 930 implemented (matched path+verb).
- 10 deprecated, intentionally skipped — **all verified `deprecated: true` in the pinned spec with recorded skip dispositions** (B907 `getContextsForFieldDeprecated`; B914–B922 the nine `fieldconfigurationscheme` CRUD ops).
- 2 non-deprecated unimplemented: `GET /rest/software/1.0/board/{boardId}/{backlog,issue}/approximate-count` — **correctly tracked as B1002/B1006 BLOCKED** in BACKLOG.md. ⚠️ The recorded blocker ("exists only under /rest/software/1.0/") is now stale: `softwareBaseUrl` infrastructure shipped with the JSIS endpoints (boards.ts derives it). Only the "needs orchestrator decision" part still holds → Phase 2 should explicitly unblock or re-affirm.

**One SDK call targets a spec-absent operation** → §2 finding F1.

## 2. Adjudicated findings (FINAL)

### F1 — Confluence attachment `upload()` calls a nonexistent v2 endpoint (HIGH, real-defect, NEW)

`src/confluence/resources/attachments.ts:131-147` POSTs multipart to `/wiki/api/v2/pages/{id}/attachments`; the pinned v2 spec defines **GET only** on that path and has **no attachment-write operation anywhere** (only `createAttachmentProperty`). Atlassian has no v2 upload endpoint at all (open request CONFCLOUD-77196); the official route is v1 `POST /wiki/rest/api/content/{id}/child/attachment` + `X-Atlassian-Token: nocheck` — the SDK also omits that header. Every real-site call 404/405s. History: added in 4400cb9, restored by PR #54; a prior "endpoint no longer in spec" removal marker was overridden with a non-sequitur (B893 records this). Tests are MockTransport-only, so the breakage is invisible to CI. Exposed via CLI `confluence pages upload-attachment` and 6 skill-doc references.

**Proposed fix (Phase 2 backlog item):** re-route to the v1 endpoint with `nocheck` header (mirroring Jira `issue-attachments.upload`, which does this correctly), inject a site-root/v1 base into the resource, correct the return type (v1 content-array shape, not `CursorPaginatedResponse<Attachment>`), red→green tests, CLI JSDoc + skill-doc updates. Signature change acceptable — the method has never worked against a real site.

### F2 — Confluence `admin-key` module written against a phantom contract (HIGH ×2, NEW)

- **Wire-body:** `create()` sends `durationInHours` (typed 1–24); spec `AdminKeyRequest` has exactly one field, `durationInMinutes` (max 60, default 10). The unknown field is ignored server-side → **custom durations silently no-op for every caller**. (`src/confluence/types/admin-key.ts:18`)
- **Response-type:** spec `AdminKeyResponse` = `{accountId, expirationTime}`. SDK `AdminKey` = `{createdAt, expireAt, durationInHours}` — zero overlap; every typed field reads `undefined` at runtime, real fields are inaccessible. (`src/confluence/types/admin-key.ts:2`)
- Plus LOW JSDoc drift (same root cause). Fix ripple per parity rule: types + resource JSDoc + CLI `--duration-hours` flag (`src/cli/commands/confluence.ts:1090-1093`) + skill docs change together.

### F3 — `scripts/regenerate-types.ts` drift-guard watches the old Confluence **v1** spec (MEDIUM, real-defect, NEW)

Line 23 fetches `confluence/swagger.v3.json` (v1, 89 paths) instead of the pinned `confluence/openapi-v2.v3.json` (v2, 151 paths) — the weekly spec-drift smoke test (`.github/workflows/spec-drift.yml`, schedule-only, commits nothing) exercises `generateTypes()` against a spec the SDK doesn't target. Jira URLs verified correct. **Fix:** one-line URL swap + tighten `test/scripts/regenerate-types.test.ts:41` to assert the exact v2 URL.

### F4 — Open PRs #242 vs #248 are duplicate fixes for issue #241 (housekeeping)

Identical source hunks (`asPositiveInt`→`asNonNegativeInt` for gadget `--row`/`--column`, jira.ts:8214/8242). **Keep #248** (green CI, fresh CODEMAP, additive #241-labeled regression tests preserving non-zero coverage); **close #242** (stale-CODEMAP CI failure, mutates existing tests losing coverage). Spec confirms row/column have no minimum and the spec example itself uses `row: 0`.

### F5 — Deprecated-skip policy: CONFIRMED

All 10 deprecated unimplemented ops re-verified against live flags in the pinned spec; all have archive dispositions. No unaccounted deprecated candidates.

## 3. Layer 3 — CLI/skill reachability (FINAL)

**Coverage: 113/113 resource modules** (run 1: 55 modules; batched remainder: 58 modules). **Zero code-level parity violations** — no orphan CLI actions, no CLI-unreachable methods, no orphan skill commands.

Four raw violations from run 1 were adjudicated in the main session:

| Raw claim                                                 | Verdict                                                                                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `versions.listForBlogPost` not CLI-reachable              | **False positive** — endpoint reachable via `blog-posts versions` → `blogPosts.listVersions` (functional parity, deliberate dual surface)                                                  |
| `blog-posts version` orphan CLI action                    | **False positive** — backed by `versions.getForBlogPost` (cross-resource)                                                                                                                  |
| `footer-comments update` orphan CLI action                | **False positive** — backed by `comments.updateFooter`; dispatch comment explicitly marks the cross-resource call                                                                          |
| `dashboards create/update` below construct-from-skill bar | **UPHELD (doc)** — only a prose one-liner + matrix row; JSON `--share-permissions`/`--edit-permissions` and `--name`/`--description` flags never tabled (unlike `copy`). → Phase 3 doc fix |

Side observation (not a violation): `VersionsResource.listForBlogPost/getForBlogPost` duplicate `BlogPostsResource` surfaces — intentional dual-surface pattern; do not unify without explicit decision.

## 4. Layer 2 — bidirectional spec conformance (FINAL)

Per-module field-level diff of all **113/113 modules** vs the pinned specs (wire params/serialization/path/verb/body, pagination flavor, request & response types), each CRITICAL/HIGH adversarially verified by independent skeptic agents.

**Totals: 707 findings — 10 CRITICAL, 139 HIGH, 471 MEDIUM, 87 LOW.** Of the 149 CRITICAL/HIGH, **146 verified, 3 refuted, 0 left unverified.** Dedup: 124 new, 25 already tracked by open PRs #249/#250 (return-shape + body conformance) or the backlog. The MEDIUM tier is dominated by response-type drift (declared interfaces vs spec schemas — fields that read `undefined` at runtime but don't corrupt requests); the CRITICAL/HIGH tier is where bytes on the wire are wrong.

The 3 refuted: `settings.setColumns` content-type (duplicate framing of the upheld body-shape finding); `status.untranslatedName` (verifier found the field is legitimately reachable); `workflows TransitionRuleUpdateItem.key` (spec marks `key` `readOnly:true` → correctly omitted from request bodies — a sharp catch).

### 4a. Verified CRITICAL (9 distinct — every call fails or data is corrupted)

| Module                        | Defect                                                                                                     | dedup   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- | ------- |
| `jira/app.ts:195`             | `updateFieldContextConfiguration` sends wrong body shape — every call fails                                | new     |
| `jira/forge.ts:20`            | request body shape entirely wrong — required `moduleId`/`projectList` never sent                           | PR #249 |
| `jira/latest.ts:19`           | request body sends worklog-create fields; spec expects `issueId`+`worklogId` lookup pairs                  | new     |
| `jira/latest.ts:24`           | response type `BulkWorklogResponse` ≠ spec `BulkWorklogKeyResponseBean` (wrong items, fabricated `errors`) | new     |
| `jira/redact.ts:5`            | `start()` sends fictional `{jql, fieldIds}`; spec requires `{redactions: SingleRedactionRequest[]}`        | PR #249 |
| `jira/service-registry.ts:38` | required query param `serviceIds` never sent → **every call 400s**                                         | new     |
| `jira/statuses.ts:102`        | `list()` sends no required `id` param → always 400 (wrong endpoint; bulk-list is `/status`)                | new     |
| `jira/statuses.ts:143`        | `bulkCreate()` omits required top-level `scope` → 400                                                      | PR #250 |
| `jira/statuses.ts:184`        | `get*Usages()` wrong envelope — `.values` nested one level deeper, always `undefined`                      | PR #250 |

Plus the two earlier-flagged Confluence CRITICALs are reclassified after verification: **`app.upsertProperty`** (bodyless PUT typed `Promise<AppProperty>` → `undefined` at runtime) verified at **HIGH** (typed-consumer impact, no data loss); **`admin-key`** request/response remain HIGH (F2).

### 4b. Verified HIGH that change bytes on the wire (36)

These break real calls on some inputs (not just type-layer drift). Highlights — full list in the workflow artifacts:

- **Repeated-array-param holdouts** (the recurring class, PR #222 lineage): `projects.list status` CSV-not-repeated; `service-registry.serviceIds`; `tasks` 7 array params serialized as scalars; `attachments.status` (Confluence, F-adjacent). These silently return wrong result sets.
- **Wrong content-type / body encoding:** `settings.setColumns` sends JSON object-array where spec requires form-data string array; `plans` JSON-patch endpoints send `application/json` not `application/json-patch+json`; `issuetype.loadAvatar` sends multipart where spec wants raw binary.
- **`readOnly` fields sent in request bodies:** `version` (`userStartDate`/`userReleaseDate`), `version.createRelatedWork`/`updateRelatedWork` (`issueId`).
- **Fictional params/fields silently dropped or rejected:** `priorities.delete replaceWith`, `priorities.move before` (spec: `position`), `resolution.moveResolutions before`, `exists-by-properties entityType/entityId`, `users.searchQueryKey maxResults` (spec: `maxResult`), `changelog` `filterByFieldId`/`startAt`/`filterByAuthorAccountId` against `additionalProperties:false` → 400.
- **Path-traversal guard bypass:** `epic.ts` (5 agile endpoints), `linked-workspaces.getSecurity`, `vulnerability` use `encodeURIComponent` instead of the house `encodePathSegment` (which blocks dot-segments).
- **Pagination flavor mismatch:** `changelog.bulkFetch` offset-wraps a cursor endpoint; `data-policy.getPolicies` offset-paginates a non-paginated endpoint.

### 4c. Per-module CRITICAL/HIGH distribution (58 modules carry ≥1)

The remaining 55 modules are clean or carry only MEDIUM/LOW type-drift.

| module                     | CRIT | HIGH     | MED | LOW |
| -------------------------- | ---- | -------- | --- | --- |
| `statuses.ts`              | 3    | 3        | 3   |     |
| `latest.ts`                | 2    | 1        | 1   |     |
| `app.ts`                   | 1    | 8        | 7   | 1   |
| `service-registry.ts`      | 1    | 4        | 1   |     |
| `redact.ts`                | 1    | 2        |     | 1   |
| `forge.ts`                 | 1    | 1        |     | 1   |
| `settings.ts`              | 1    | 1        |     |     |
| `projects.ts`              |      | 7        | 9   | 1   |
| `changelog.ts`             |      | 6        | 2   |     |
| `issues.ts`                |      | 6        | 10  | 2   |
| `expression.ts`            |      | 5        | 6   | 1   |
| `post-incident-reviews.ts` |      | 5        | 2   |     |
| `resolution.ts`            |      | 5        | 6   |     |
| `dashboards.ts`            |      | 4        | 10  | 2   |
| `data-policy.ts`           |      | 4        | 1   |     |
| `priorities.ts`            |      | 4        | 6   |     |
| `boards.ts`                |      | 3        | 12  | 2   |
| `classification-levels.ts` |      | 3        | 4   |     |
| `config.ts`                |      | 3        | 4   |     |
| `group-user-picker.ts`     |      | 3        | 7   |     |
| `remote-link.ts`           |      | 3        | 5   |     |
| `tasks.ts`                 |      | 3        | 4   |     |
| `webhooks.ts`              |      | 3        | 4   | 1   |
| `workflows.ts`             |      | 3        | 14  | 4   |
| … 34 more modules          |      | 1–2 each |     |     |

## 5. Core/CLI deep review, useless code, documentation audit (FINAL)

47 review scopes (per-file `src/core/*`, `src/cli/*` incl. jira.ts in 3 chunks, idiom sweeps over all resources, client wiring) + ts-prune adjudication + test/dep sweep + 4-agent docs audit. **293 findings — 16 CRITICAL, 56 HIGH, 112 MEDIUM, 109 LOW.** CRITICAL/HIGH adversarially verified: **64 upheld, 8 refuted** (refuted: a claimed Bearer-plaintext leak, a non-existent concurrent-401 race, a timeout-disambiguation race, a scopes-positional misparse — all shown unreachable).

### 5a. Two clusters independently reconfirm open PRs

- **Auth-middleware credentials never reach the wire** (`core/connect-jwt.ts`, `core/oauth.ts`, `core/request.ts`) — **~10 independent reviewers** converged on it: `buildHeaders`/`FORBIDDEN_CALLER_HEADERS` strips the `Authorization` the OAuth-refresh and Connect-JWT middlewares set, so a refreshed/JWT token is silently dropped and the original (or none) goes out. **Open [PR #246](https://github.com/dichovsky/atlassian-api-client/pull/246) fixes this; unfixed on HEAD.** Multiple CRITICAL verdicts.
- **Pagination short-page truncation** (`core/pagination.ts`) — `paginateOffset`/`paginateSearch` stop on a short page even when `total` says rows remain → silent data loss. **Open [PR #247](https://github.com/dichovsky/atlassian-api-client/pull/247) fixes this.** Multiple HIGH verdicts.

### 5b. Verified NEW core findings (not covered by any open PR)

- **`computeQsh` drops `appendRepeatedParams` query params** (`core/connect-jwt.ts`) — array params built into the _path_ by the house helper are invisible to QSH computation → Connect-JWT requests with repeated params get **server-rejected QSH**. Two house patterns interacting badly; HIGH.
- **Wrong Jira Software OAuth scope strings** (`core/scopes.ts`) — board scope `read:jira-work` ≠ `read:board-scope:jira-software`; sprint scope `manage:jira-project` ≠ `write/delete:sprint:jira-software`. HIGH.
- **`batch` middleware dedupes non-idempotent mutations** (`core/batch.ts`) — no method guard (POST/PUT/PATCH/DELETE coalesced); `formData`/`binaryBody`/`responseType` excluded from the dedup key → concurrent distinct requests collapse. HIGH.
- **`openapi.ts` `$ref` code-injection + invalid-TS edges** (partly B025) — newline in a `$ref` last segment escapes the type context; empty `allOf`/`oneOf`/`anyOf` emit `export type X = ;`. HIGH.
- **`circuit-breaker.ts`** — `ResponseTooLargeError` on a 5xx isn't a qualifying failure → breaker never trips for body-cap failures. HIGH.
- **`transport.ts`** — `getHeaders()` called twice per request; constructor-hashing path can diverge from the request path. HIGH.
- **`response.ts`** — malformed JSON on a 2xx throws a raw `SyntaxError` outside the error taxonomy. HIGH.
- **CLI cluster:** `screens --ids` / `context-*` actions pass `NaN` query params from unguarded `Number()`; `printOutput(undefined, 'json')` emits the bare word `undefined` (invalid JSON); `resolveAuthType` is case-sensitive (`Bearer`→basic fallback); `router` negative numeric flags throw `TypeError`; `runCli` never catches parseArgs/credential errors (unhandled rejection); **`blog-posts list` flags `cursor`/`title`/`status`/`sort`/`body-format` are unwired → pagination broken**.

### 5c. Useless code (minimal — codebase is lean)

- **1 dead-internal:** `src/confluence/resources/index.ts` — unreachable partial barrel, zero consumers (removable now, MEDIUM).
- **1 stale config ref:** `bench/` directory referenced in `tsconfig.json` + `vitest.config.ts` but absent.
- **7 unused-public exports** tagged `requires-v3` (won't remove pre-major): root-vs-core barrel asymmetries (`HttpMethod`, `ResolvedConfig`, `AuthProvider`, `appendRepeatedParams` core re-export) + all 26 Confluence resource classes exported from `confluence/index.ts` but absent from the root public surface. `ts-prune` had ~6 false positives (re-exported via domain barrels) — adjudicated, not filed.

### 5d. Documentation content errors (for the Phase-3 reorg)

13 HIGH/MEDIUM doc-vs-code mismatches to fold into the doc PRs: blog-posts `--cursor` documented but dropped; `comments --blog-post-id` documented but ignored; `labels --cursor` absent from handler; boolean flags (`--validate-query`, `--send-notification`, `--done`) documented with explicit `false` values they don't accept; README `contentProperties` wrong method names; ARCHITECTURE.md drift (footer/inline-comment handler attribution, rate-limiter reactive-429 description). **Rule:** where a doc matches today's (buggy-vs-spec) code, the doc is correct _for now_ — only doc-vs-code mismatches are filed here; doc-vs-spec corrections ride the code-fix B-items.

## 6. Headline numbers

| Layer            | Scope           | Result                                                                  |
| ---------------- | --------------- | ----------------------------------------------------------------------- |
| 1 — coverage     | 942 ops         | 0 new gaps; 2 blocked (B1002/B1006); 10 deprecated-skip confirmed       |
| 2 — conformance  | 113/113 modules | 707 findings (9 CRIT verified, 36 HIGH wire-affecting, rest type-drift) |
| 3 — reachability | 113/113 modules | 0 code parity violations; 1 doc gap (dashboards)                        |
| Core/CLI review  | 47 scopes       | 64 verified CRIT/HIGH; 2 reconfirm PRs #246/#247                        |
| Useless code     | full repo       | 1 dead-internal + 1 stale ref + 7 v3-tagged exports                     |
| Docs             | skill + human   | 13 doc-vs-code mismatches + dashboards table gap                        |

**The single most important finding is the auth-middleware credential-stripping cluster (§5a, PR #246):** OAuth-refresh and Connect-JWT auth modes are non-functional on HEAD. **Second: the 9 Layer-2 CRITICALs** (§4a) where every call to the method fails.

### Resolved during this wave (2026-06-13)

Four open PRs the audit reconfirmed were reviewed (independent Opus, each red→green + full validate + CI) and **merged**, clearing 34 verified findings:

- **#246** — auth-middleware credential cluster (§5a). The audit's review also caught a **P1 follow-on** the PR had introduced (caller-supplied `authorizationOverride` could bypass the B029 guard); fixed with a request-boundary strip + regression test before merge. Open follow-up: `computeQsh` repeated-param QSH → **B1037**.
- **#247** — pagination short-page truncation (§5a).
- **#249** — forge + redact body shapes (2 of the 9 §4a CRITICALs), classification, issuesecurity.
- **#250** — statuses `bulkCreate`/usages (2 §4a CRITICALs), webhooks/changelog/projects/role/fields return shapes. Deferred: webhooks `refresh()`/`self` → **B1054**. The audit fixed its coverage-gap CI failure (statuses scope guard + webhooks `?? []` fallback).

The four changed typed surfaces → flagged for a future **3.0.0** (**B1062**).

**Phase 2 backlog (this wave):** remaining findings are severity-gated into `BACKLOG.md` as **B1037–B1062** — CRITICAL/HIGH and adjudicated F1–F3 as individual items; MEDIUM/LOW + response-type drift as per-module rollups (**B1056** Jira, **B1059** Confluence) referencing this report. The 5 remaining §4a CRITICALs are **B1045–B1048**; the §2 adjudications are **B1057** (F1), **B1058** (F2), **B1060** (F3).

## Appendix A — extraction artifacts

Extractor: `/tmp/audit/extract.mjs` (session artifact; reproducible). Outputs: `spec-ops.json` (942), `sdk-calls.json` (949 resolved calls), `gap-candidates.json` (12: 10 deprecated + B1002/B1006), `sdk-unmatched.json` (1: F1), `jsdoc-only.json` (0), `resource-map.json` (113-module fan-out map). Legacy-extractor cross-check: candidate sets agree modulo the legacy tool's 8 JSIS false positives.

Audit workflow results (session artifacts): `conformance-final.json` (707 findings, verdicts merged), `core-review-full.json` (293 findings, 64 verified), `reachability-final.md`, `verify-tail.json` (36 tail verdicts). Verification method: each CRITICAL/HIGH finding handed to independent skeptic agent(s) instructed to refute it against the pinned spec + code + open-PR diffs; majority-refute drops the finding. 13 findings refuted across all layers.
