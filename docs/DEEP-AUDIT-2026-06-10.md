# Deep Audit — 2026-06-10/11

> Full-repo audit: independent API-coverage re-run (3 layers), bidirectional spec-conformance diff, deep core/CLI review, useless-code adjudication, and documentation content audit. Findings are backlog-only (no code fixes in this wave); documentation reorganization ships separately (Phase 3). Every spec claim cites the pinned snapshots below.
>
> **Status: DRAFT — layers 1, 3, and adjudications are FINAL; conformance (layer 2), core review, dead code, and docs sections land as their workflows complete.**

## 0. Inputs and denominators

| Spec | Pinned (PR #251, merged 2026-06-10) | Ops | Deprecated | SHA-256 |
| --- | --- | --- | --- | --- |
| Jira Platform v3 | `1001.0.0-SNAPSHOT-32b43b28…` | 619 | 36 | `ae5e7e6d…25af1fa` |
| Jira Software (Agile) | `1001.0.0` | 105 | 8 | `2aaf7826…19fc599` |
| Confluence v2 | `2.0.0` | 218 | 1 | `21eac830…40e8c0a7` |
| **Total** | | **942** | **45** | |

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

| Raw claim | Verdict |
| --- | --- |
| `versions.listForBlogPost` not CLI-reachable | **False positive** — endpoint reachable via `blog-posts versions` → `blogPosts.listVersions` (functional parity, deliberate dual surface) |
| `blog-posts version` orphan CLI action | **False positive** — backed by `versions.getForBlogPost` (cross-resource) |
| `footer-comments update` orphan CLI action | **False positive** — backed by `comments.updateFooter`; dispatch comment explicitly marks the cross-resource call |
| `dashboards create/update` below construct-from-skill bar | **UPHELD (doc)** — only a prose one-liner + matrix row; JSON `--share-permissions`/`--edit-permissions` and `--name`/`--description` flags never tabled (unlike `copy`). → Phase 3 doc fix |

Side observation (not a violation): `VersionsResource.listForBlogPost/getForBlogPost` duplicate `BlogPostsResource` surfaces — intentional dual-surface pattern; do not unify without explicit decision.

## 4. Layer 2 — bidirectional spec conformance (IN PROGRESS)

Per-module field-level diff (wire params/serialization/path/verb/body, pagination, request & response types) of all 113 modules vs the pinned specs, with adversarial verification of CRITICAL/HIGH findings. Early confirmed findings beyond F1/F2:

- **`app.upsertProperty` (Confluence)** — CRITICAL (pending verification): spec PUT `/app/properties/{propertyKey}` responses 200/201 are **bodyless**; method declares and returns `Promise<AppProperty>` → `response.data` is `undefined` at runtime. Also MEDIUM: `AppProperty` declares fictional `id?`/`version?` (spec: `{key, value}` only).
- **`attachments` `status` filter (Confluence)** — HIGH: spec `status` is `type: array` (form/explode → repeated params); `statusParam()` joins CSV → multi-status filters silently return wrong sets. Same class as the Jira repeated-param holdouts (PR #222 lineage).
- Full module-by-module results land here when the conformance workflow completes.

## 5. Core/CLI deep review, useless code, documentation audit (IN PROGRESS)

Sections land when the core-review workflow completes: per-file review of `src/core/*` (23 files) and `src/cli/*` (incl. jira.ts in 3 chunks), ts-prune adjudication (1,257 hard candidates), test-scaffolding/dependency sweep, and 4-agent docs content audit (skill vs CLI, README/examples, ARCHITECTURE drift, docs inventory for the Phase-3 reorg).

## Appendix A — extraction artifacts

Extractor: `/tmp/audit/extract.mjs` (session artifact; reproducible). Outputs: `spec-ops.json` (942), `sdk-calls.json` (949 resolved calls), `gap-candidates.json` (12: 10 deprecated + B1002/B1006), `sdk-unmatched.json` (1: F1), `jsdoc-only.json` (0), `resource-map.json` (113-module fan-out map). Legacy-extractor cross-check: candidate sets agree modulo the legacy tool's 8 JSIS false positives.
