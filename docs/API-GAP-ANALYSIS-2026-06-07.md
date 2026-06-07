# API Coverage Gap Analysis — 2026-06-07

> Re-verification of this client's coverage of the three official Atlassian OpenAPI specs, with a deterministic path-diff (auto-extracted SDK request paths vs spec operations) followed by multi-agent adversarial verification. Supersedes the informal "coverage complete" status asserted 2026-06-02.

## Method

1. **Denominator** — fetched the three live OpenAPI JSON specs and extracted every `(path, HTTP verb)` operation:

   | Spec | Version (fetched 2026-06-07) | Source | Operations | Deprecated |
   | --- | --- | --- | --- | --- |
   | Jira Platform v3 | `1001.0.0-SNAPSHOT` | `dac-static.atlassian.com/cloud/jira/platform/swagger-v3.v3.json` | 619 | 36 |
   | Jira Software (Agile) | `1001.0.0` | `dac-static.atlassian.com/cloud/jira/software/swagger.v3.json` | 105 | 8 |
   | Confluence v2 | `2.0.0` | `dac-static.atlassian.com/cloud/confluence/openapi-v2.v3.json` | 218 | 1 |
   | **Total** | | | **942** | 45 |

2. **Numerator** — statically extracted all **934** `transport.request({ method, path })` call sites across `src/{jira,confluence}/resources/*.ts` (709 Jira + 225 Confluence), resolving each resource's base-URL prefix from the client wiring (`src/{jira,confluence}/client.ts`) and normalizing path params positionally. Extraction reconciled to **100%** of call sites (zero unresolved tokens).

3. **Match** — a spec operation counts as implemented iff some SDK call has the same normalized `(path, verb)`, across **all** prefixes the SDK targets (Atlassian bundles ~9 surfaces — `/rest/builds`, `/rest/devinfo`, `/rest/operations`, etc. — into the Jira Software spec; the SDK implements those as separate resources).

4. **Verify** — every candidate gap was adjudicated by an independent agent (classify real-gap vs duplicate/deprecated/already-queued), real gaps were **adversarially refuted** (a skeptic tried to prove each was already reachable), and SDK paths matching no spec op were investigated. Cross-checked against `BACKLOG.md` + `BACKLOG-ARCHIVE.md` (1,074 archived items).

> Scope is **strictly** the three named specs. The SDK additionally covers ~10 other Atlassian surfaces (DevOps, JSM Operations, Forge, Connect, internal) — see the appendix; those are bonus coverage, not gaps.

## Headline

Coverage of the three specs is **strong but not complete**. Of 942 operations, **14 non-deprecated operations are genuinely unimplemented** (~98.4% effective coverage of live, non-blocked endpoints), plus **one implemented method calls an endpoint absent from the current spec** (a correctness defect).

| Spec | Ops | Implemented | Real gaps | Deprecated-skip | Already queued |
| --- | --- | --- | --- | --- | --- |
| Jira Platform v3 | 619 | 608 | **1** | 10 (B907, B914–B922) | 0 |
| Jira Software (Agile) | 105 | 95 | **8** | 0 | 2 (B1002, B1006 — BLOCKED) |
| Confluence v2 | 218 | 213 | **5** | 0 | 0 |
| **Total** | **942** | **916** | **14** | **10** | **2** |

The most significant finding: **8 of the 14 gaps were previously marked done** (B1001/B1003/B1004/B1005/B1007/B1008/B1009/B1010) under a rationale that spec evidence falsifies.

---

## 1. Real coverage gaps (14) — queued as B1022–B1035

### 1a. Jira Platform v3 (1)

| B# | Verb | Path | operationId | Sev | Notes |
| --- | --- | --- | --- | --- | --- |
| B1022 | POST | `/rest/api/3/issue/watching` | `getIsWatchingIssueBulk` | med | Read-only bulk "is the current user watching these issues?" check. **Not** the same as the implemented `watchIssuesBulk` (`issues.ts:1235`), which targets the write endpoint `POST /bulk/issues/watch` (`submitBulkWatch`). Archived **B529** is mislabeled "expose POST /issue/watching" but shipped the write path; the read-check was never implemented. |

### 1b. Jira Software — JSIS "enhanced" issue endpoints (8) — reverses prior closures

Each spec path below exists in **two** forms: a `/rest/agile/1.0/…` variant (`deprecated: true`, offset pagination `startAt`/`maxResults`, returns `SearchResults`) and a `/rest/software/1.0/…` variant (`deprecated: false`, **token** pagination `nextPageToken` + new `reconcileIssues` param, returns `SoftwareIssueResults`). **The SDK implements only the deprecated agile variant**; the non-deprecated enhanced (`*JSIS`) replacement is unimplemented and unreachable (`/rest/software/1.0` is not even a wired base URL).

These were closed in the archive as *"spec-snapshot alias of the documented agile base"* — **a factually wrong rationale** (different operationId, opposite deprecation flag, different pagination contract, extra param, different response schema). Re-queued:

| B# | Verb | Path | operationId | Reverses |
| --- | --- | --- | --- | --- |
| B1023 | GET | `/rest/software/1.0/board/{boardId}/backlog` | `getIssuesForBacklogJSIS` | B1001 |
| B1024 | GET | `/rest/software/1.0/board/{boardId}/issue` | `getIssuesForBoardJSIS` | B1005 |
| B1025 | GET | `/rest/software/1.0/board/{boardId}/epic/none/issue` | `getIssuesWithoutEpicForBoardJSIS` | B1004 |
| B1026 | GET | `/rest/software/1.0/board/{boardId}/epic/{epicId}/issue` | `getBoardIssuesForEpicJSIS` | B1003 |
| B1027 | GET | `/rest/software/1.0/board/{boardId}/sprint/{sprintId}/issue` | `getBoardIssuesForSprintJSIS` | B1007 |
| B1028 | GET | `/rest/software/1.0/epic/{epicIdOrKey}/issue` | `getIssuesForEpicJSIS` | B1008 |
| B1029 | GET | `/rest/software/1.0/epic/none/issue` | `getIssuesWithoutEpicJSIS` | B1009 |
| B1030 | GET | `/rest/software/1.0/sprint/{sprintId}/issue` | `getIssuesForSprintJSIS` | B1010 |

> Implementation note: these need a new token-paginated response type (`SoftwareIssueResults`: `nextPageToken`/`isLast`) and the `reconcileIssues` param — a genuinely new pagination flavor, not a path rename. Decide whether to add a `softwareBaseUrl` (`/rest/software/1.0`) wiring or thread the prefix per-method. The archive `[x]` entries for B1001…B1010 are left intact (history); these new tasks document the correction.

### 1c. Confluence v2 — Space Permission Transition API (5)

The entire `Space Permission Transition` tag (async bulk RBAC migration) is unimplemented. Archived **B189** covered only the base `GET /space-permissions` (list). `space-permissions.ts` exposes only `list`/`listAll`.

| B# | Verb | Path | operationId | Sev |
| --- | --- | --- | --- | --- |
| B1031 | POST | `/space-permissions/transition/access-removals` | `bulkRemoveSpacePermissionAccess` | med |
| B1032 | GET | `/space-permissions/transition/combinations` | `listSpacePermissionCombinations` | low |
| B1033 | POST | `/space-permissions/transition/combinations` | `generateSpacePermissionCombinations` | low |
| B1034 | POST | `/space-permissions/transition/role-assignments` | `bulkAssignSpacePermissionRoles` | med |
| B1035 | GET | `/space-permissions/transition/tasks/{taskId}` | `getSpacePermissionTransitionTaskStatus` | med |

---

## 2. Correctness defect (1) — queued as B1036

| B# | Verb | Path | Sev | Detail |
| --- | --- | --- | --- | --- |
| B1036 | GET | `/rest/api/3/workflow` | **high**¹ | `WorkflowsResource.get(workflowName)` (`workflows.ts:176`) issues `GET ${baseUrl}/workflow?workflowName=…`. The bare `/rest/api/3/workflow` path is **absent from the current v3 spec** (the documented form is `GET /rest/api/3/workflow/search`, `getWorkflowsPaginated`, which accepts the same `workflowName` query param and returns the `{ values: [...] }` shape the code already reads). `test/jira/workflows.test.ts:129` asserts the bare path, so the dead path ships on the wire. Likely the removed legacy "Get all workflows" endpoint. Fix is a one-token path change; verify against a live tenant. |

> This is a **bug**, not a coverage gap — flagged here because the diff surfaced it. Separate fix PR.
>
> ¹ Severity is conditional on live-tenant confirmation: spec-absence is fact, but the bare endpoint may still resolve on live Jira (spec drift). High if the 404/405 is confirmed — a silently-dead `get()` is high-impact; verify before fixing.

---

## 3. Not queued

### 3a. Deprecated & superseded (10) — prior decisions stand

| Verb | Path | Superseded by | Decision |
| --- | --- | --- | --- |
| GET | `/rest/api/3/field/{fieldId}/contexts` | `…/context` (singular) | B907 |
| GET/POST | `/rest/api/3/fieldconfigurationscheme` | `/config/fieldschemes` (`config.ts`) | B914, B915 |
| GET | `/rest/api/3/fieldconfigurationscheme/mapping` | `/config/fieldschemes/{id}/fields` | B920 |
| GET/PUT | `/rest/api/3/fieldconfigurationscheme/project` | `/config/fieldschemes/projects` | B921, B922 |
| DELETE/PUT | `/rest/api/3/fieldconfigurationscheme/{id}` | `/config/fieldschemes/{id}` | B916, B917 |
| PUT | `/rest/api/3/fieldconfigurationscheme/{id}/mapping` | `/config/fieldschemes/fields` | B918 |
| POST | `/rest/api/3/fieldconfigurationscheme/{id}/mapping/delete` | `/config/fieldschemes/fields` (DELETE) | B919 |

All are `deprecated: true` in the spec and functionally covered by the non-deprecated `/config/fieldschemes` namespace. No action.

### 3b. Already tracked (2)

`GET /rest/software/1.0/board/{boardId}/backlog/approximate-count` (**B1002**) and `…/issue/approximate-count` (**B1006**) — open + **BLOCKED** in `BACKLOG.md` (software/1.0-only, no agile equivalent). Unchanged.

### 3c. Anomaly note (1)

`POST /wiki/api/v2/pages/{id}/attachments` (`attachments.ts:143`, `upload()`) — Confluence v2 attachments are read-only; creation is served by the **v1** content API (the method's JSDoc cites the v1 group). The literal path emitted reuses the v2 base + v2 path shape. Treated as working (PR #230, `pages upload-attachment`), but recommend a follow-up verifying the emitted path matches the canonical v1 upload route rather than the v2 `/pages/{id}/attachments` shape.

---

## 4. Documentation hygiene

- `BACKLOG.md` line 87 — *"Truly-missing Jira endpoints: 447 as of 2026-05-30"* — is **stale**. Against the live specs the true unimplemented Jira count is **9** (1 platform + 8 software, excluding 2 blocked + deprecated). Updated in this PR.
- Archive entries B1001/B1003/B1004/B1005/B1007/B1008/B1009/B1010 record a falsified "alias" rationale. Left in place (historical record); B1023–B1030 supersede them.

---

## Appendix: bonus surfaces (out of scope)

The SDK targets these prefixes beyond the three named specs (counts = distinct in-SDK paths). These are additional coverage, not gaps in the three specs:

| Prefix | SDK paths | Surface |
| --- | --- | --- |
| `/rest/atlassian-connect/1` | 12 | Connect / service registry |
| `/rest/operations/1.0` | 9 | JSM Operations (incidents, PIRs, linked workspaces) |
| `/rest/security/1.0` | 8 | Security (vulnerabilities) |
| `/rest/devinfo/0.10` | 6 | Development information |
| `/rest/deployments/0.1` | 5 | Deployments |
| `/rest/forge/1` | 4 | Forge app properties |
| `/rest/builds/0.1` | 4 | Builds |
| `/rest/devopscomponents/1.0` | 4 | DevOps components |
| `/rest/featureflags/0.1` | 4 | Feature flags |
| `/rest/remotelinks/1.0` | 4 | Remote links |
| `/rest/internal/api/latest` | 1 | Internal |

## Reproduction

Extraction + diff: `scripts/api-gap-analysis.py` (deterministic, standalone — not wired into CI). Fetch the three specs (URLs above) to `/tmp/spec-{jira-platform,jira-software,confluence-v2}.json`, then `python3 scripts/api-gap-analysis.py`. It reconciles to 100% of `transport.request` call sites and writes the candidate list to `/tmp/gap_candidates.json`. Candidates are starting points — each was independently verified against the spec + `BACKLOG-ARCHIVE.md` (the diff alone cannot distinguish an alternate-prefix duplicate or deprecated-superseded alias from a true gap). Exact spec versions + fetch date recorded above.
