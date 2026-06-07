# Changelog

## [2.0.0](https://github.com/dichovsky/atlassian-api-client/compare/v1.0.1...v2.0.0) (2026-06-07)

This major release builds the library out from the 1.0.x core into near-complete
API coverage for **Jira Cloud platform v3** and **Confluence Cloud v2**, adds
opt-in resilience and security middleware, hardens the transport and pagination
layers, completes the `atlas` CLI surface, and corrects a class of Jira
query-serialization bugs. It supersedes the never-published 1.1.0 — all of that
work is included here. **This release contains breaking changes** to a small
number of Jira methods and types; see **BREAKING CHANGES** below for migration
steps.

### Highlights

- **Resilience middleware (opt-in):** circuit breaker (B010) and token-bucket rate limiter (B017) that compose with the existing transport middleware chain.
- **Atlassian Connect security:** inbound asymmetric **RS256** JWT verification (`verifyConnectAsymmetricJwt`, B015) with strict algorithm pinning (`none`/`HS256` rejected).
- **Observability:** `X-Request-Id` propagation — captured from inbound responses and optionally generated for outbound requests.
- **Transport:** new `RequestOptions.binaryBody?: Blob` (B792) sends a raw binary request body with the `Blob`'s MIME type as `Content-Type` for endpoints that accept `*/*` (used by `JiraClient.universalAvatar.storeAvatar`); mutually exclusive with `body`/`formData`, strictly additive.
- **CLI:** completed `atlas` coverage — Jira dashboards + issue-comments/labels/webhook-delete, Confluence inline-comments + comment update, and Confluence space/blogpost labels + page comment/version listing (B1011–B1020) — plus the new `atlas scopes validate` command (B019).
- **Correctness:** Jira `type:array` query parameters are now sent as repeated params (`?id=1&id=2`) per the v3 spec instead of CSV, fixing silent filter failures across roughly ten resources.
- **Tooling:** OpenAPI spec drift-guard script + weekly CI (B018); Confluence `types.ts` split into per-domain modules (B007 — public types unchanged).

### ⚠ BREAKING CHANGES

These affect a small number of Jira methods/types. All other public APIs from 1.0.x are unchanged.

- **jira (`boards.toggleFeature`):** `ToggleFeatureData.state: 'ENABLED' | 'DISABLED'` is replaced by `enabling: boolean`, and the CLI flag `--state` becomes `--enabling`. The previous string field was never serialized to the shape Jira expects. _Migration:_ `toggleFeature(boardId, { feature, state: 'ENABLED' })` → `toggleFeature(boardId, { feature, enabling: true })`; CLI `--state ENABLED` → `--enabling` / `--state DISABLED` → omit `--enabling`. ([#209](https://github.com/dichovsky/atlassian-api-client/issues/209)) ([31f89af](https://github.com/dichovsky/atlassian-api-client/commit/31f89af))
- **jira (`issues.archiveIssuesByJql`):** return type `Promise<IssueArchiveResult>` → `Promise<string>`. The endpoint (`archiveIssuesAsync`) responds `202` with a plain task-status URL, not a result object; the previous typing was unusable. _Migration:_ the method now resolves to the status-URL string — stop reading `.archived` / `.failed` off the result and consume the returned URL. ([#206](https://github.com/dichovsky/atlassian-api-client/issues/206)) ([69c36c1](https://github.com/dichovsky/atlassian-api-client/commit/69c36c1))
- **jira (`issues.watchIssuesBulk`):** result type `IssueBulkWatchResult { watched?, failed? }` → `{ taskId: string }`, and the request now targets the correct `/bulk/issues/watch` endpoint sending `selectedIssueIdsOrKeys` (was `issueIds`). _Migration:_ read `result.taskId`; the input field rename is handled internally. ([#207](https://github.com/dichovsky/atlassian-api-client/issues/207)) ([69c36c1](https://github.com/dichovsky/atlassian-api-client/commit/69c36c1))
- **jira (`issues.deleteAllWorklogs`):** now requires an `ids: number[]` argument (`WorklogIdsRequestBean`). The previous no-argument form always returned `400` and was non-functional. _Migration:_ pass the worklog ids to delete: `deleteAllWorklogs(issueIdOrKey, [id1, id2])`. ([#204](https://github.com/dichovsky/atlassian-api-client/issues/204)) ([69c36c1](https://github.com/dichovsky/atlassian-api-client/commit/69c36c1))
- **jira (`projects.addRoleActors`):** request body changes from `SetProjectRoleData { actors: ProjectRoleActorInput[] }` to the flat `ActorsMap { user?, group?, groupId? }`; the exported types `SetProjectRoleData` and `ProjectRoleActorInput` are removed and replaced by `ActorsMap`. _Migration:_ `addRoleActors(projectIdOrKey, roleId, { actors: [{ user: ['acc-id'] }] })` → `addRoleActors(projectIdOrKey, roleId, { user: ['acc-id'] })`. ([#208](https://github.com/dichovsky/atlassian-api-client/issues/208)) ([eff78c7](https://github.com/dichovsky/atlassian-api-client/commit/eff78c7))
- **jira (`groups.picker`):** the non-existent `excludeInactive` parameter is removed from the picker params type — Jira's group picker never supported it, so it was always a silent no-op. _Migration:_ drop `excludeInactive` from any picker call (no behavior change). ([#212](https://github.com/dichovsky/atlassian-api-client/issues/212)) ([2c22517](https://github.com/dichovsky/atlassian-api-client/commit/2c22517))

### Changed

- **jira (query serialization):** `type:array` query parameters across many resources are now emitted as repeated params (`?id=1&id=2`) instead of CSV (`?id=1,2`), matching the Jira v3 spec — covers component `projectIdsOrKeys`, config/field-schemes ids, workflowscheme/project `projectId`, jql `functionKey`, `getCreateMeta` ids, and the group/user pickers. No public signature changes; only the wire format differs. ([#198](https://github.com/dichovsky/atlassian-api-client/issues/198), [#200](https://github.com/dichovsky/atlassian-api-client/issues/200), [#201](https://github.com/dichovsky/atlassian-api-client/issues/201), [#222](https://github.com/dichovsky/atlassian-api-client/issues/222), [#223](https://github.com/dichovsky/atlassian-api-client/issues/223), [#226](https://github.com/dichovsky/atlassian-api-client/issues/226), [#227](https://github.com/dichovsky/atlassian-api-client/issues/227), [#228](https://github.com/dichovsky/atlassian-api-client/issues/228), [#229](https://github.com/dichovsky/atlassian-api-client/issues/229))
- **jira (`groupUserPicker`):** `excludeAccountIds` is no longer serialized (the endpoint does not support it; the field is retained but ignored), and a new optional `fieldId` is forwarded. ([#224](https://github.com/dichovsky/atlassian-api-client/issues/224)) ([86ae877](https://github.com/dichovsky/atlassian-api-client/commit/86ae877))
- **jira (`issues.listAvailableGadgets`):** now calls the no-parameter gadgets catalogue endpoint; the previously-accepted filter params are ignored. ([#225](https://github.com/dichovsky/atlassian-api-client/issues/225)) ([66333ce](https://github.com/dichovsky/atlassian-api-client/commit/66333ce))

### Features

- add opt-in circuit breaker middleware (B010) ([#173](https://github.com/dichovsky/atlassian-api-client/issues/173)) ([3f8b699](https://github.com/dichovsky/atlassian-api-client/commit/3f8b699bb41ee5cce7f339ca521946e11be65071))
- add opt-in token-bucket rate limiter middleware (B017) ([#174](https://github.com/dichovsky/atlassian-api-client/issues/174)) ([b1bec2a](https://github.com/dichovsky/atlassian-api-client/commit/b1bec2acea3777e9fcbe7d9b0bffdc572b3edcdb))
- **cli:** add 'atlas scopes validate' command (B019) ([#147](https://github.com/dichovsky/atlassian-api-client/issues/147)) ([cb90b9c](https://github.com/dichovsky/atlassian-api-client/commit/cb90b9c9ef5bca7a77e4166ec55483084d633f30))
- **cli:** wire jira dashboards resource into CLI (B1011) ([#192](https://github.com/dichovsky/atlassian-api-client/issues/192)) ([1969fb6](https://github.com/dichovsky/atlassian-api-client/commit/1969fb6))
- **cli:** wire jira issue-comments CRUD, labels, webhooks delete (B1012, B1013, B1014) ([#193](https://github.com/dichovsky/atlassian-api-client/issues/193)) ([450958e](https://github.com/dichovsky/atlassian-api-client/commit/450958e))
- **cli:** wire confluence inline-comments + comments update (B1016, B1017) ([#194](https://github.com/dichovsky/atlassian-api-client/issues/194)) ([08fa00e](https://github.com/dichovsky/atlassian-api-client/commit/08fa00e))
- **cli:** wire confluence labels space/blogpost + pages comment/version listing (B1018, B1019, B1020) ([#195](https://github.com/dichovsky/atlassian-api-client/issues/195)) ([a27bb26](https://github.com/dichovsky/atlassian-api-client/commit/a27bb26))
- **confluence:** blog-posts API coverage (B066-B084) ([#57](https://github.com/dichovsky/atlassian-api-client/issues/57)) ([01f805e](https://github.com/dichovsky/atlassian-api-client/commit/01f805e113bc9a5717fa5d70b254e32e34c013c9))
- **confluence:** custom-content API coverage (B094-B108) ([#60](https://github.com/dichovsky/atlassian-api-client/issues/60)) ([cc11045](https://github.com/dichovsky/atlassian-api-client/commit/cc11045a7bbf1076977406397a80037487a9d9d7))
- **confluence:** embeds API coverage (B126-B137) ([#59](https://github.com/dichovsky/atlassian-api-client/issues/59)) ([90a86ee](https://github.com/dichovsky/atlassian-api-client/commit/90a86ee301c02242501b5f42017e0d9f6bdda08a))
- **confluence:** folders API coverage (B138-B149) ([#55](https://github.com/dichovsky/atlassian-api-client/issues/55)) ([9df9585](https://github.com/dichovsky/atlassian-api-client/commit/9df9585f744636b1fcc3e8f7ece1ae243783245c))
- **confluence:** pages API coverage (B170-B188) ([#61](https://github.com/dichovsky/atlassian-api-client/issues/61)) ([b5bd5a6](https://github.com/dichovsky/atlassian-api-client/commit/b5bd5a6b3d18841104ebbf0afe49c7f2a1fad2e9))
- **confluence:** spaces API coverage (B196-B213) ([#62](https://github.com/dichovsky/atlassian-api-client/issues/62)) ([cadb327](https://github.com/dichovsky/atlassian-api-client/commit/cadb3270c1046c960a9223230f58a220e0c4a466))
- **confluence:** split types.ts into per-domain modules (B007) ([#178](https://github.com/dichovsky/atlassian-api-client/issues/178)) ([ef94674](https://github.com/dichovsky/atlassian-api-client/commit/ef94674f2d42be02fffcc800f834360c6a3823e1))
- **confluence:** whiteboards API coverage (B220-B234) ([#56](https://github.com/dichovsky/atlassian-api-client/issues/56)) ([fd00092](https://github.com/dichovsky/atlassian-api-client/commit/fd0009248125a6e283691923bb6388d850c182a8))
- **infra:** OpenAPI spec drift-guard script + weekly CI (B018) ([#184](https://github.com/dichovsky/atlassian-api-client/issues/184)) ([277b6e9](https://github.com/dichovsky/atlassian-api-client/commit/277b6e9e0faae9374890248a4de77f87e336b9f8))
- **jira:** agile reconcile — archive 8 covered endpoints; B1002+B1006 blocked (software/1.0-only) ([#140](https://github.com/dichovsky/atlassian-api-client/issues/140)) ([711a2d6](https://github.com/dichovsky/atlassian-api-client/commit/711a2d6f77520f6cc05b65ebc29ce022288e05a4))
- **jira:** announcement-banner API coverage (B324-B325) ([#65](https://github.com/dichovsky/atlassian-api-client/issues/65)) ([d283605](https://github.com/dichovsky/atlassian-api-client/commit/d2836058a1945141b433e8eec745213eae5eb2b1)), closes [#1](https://github.com/dichovsky/atlassian-api-client/issues/1)
- **jira:** app API coverage (12 tasks) ([#77](https://github.com/dichovsky/atlassian-api-client/issues/77)) ([c0a10da](https://github.com/dichovsky/atlassian-api-client/commit/c0a10dae966ad53622a47eebd22526685bbdf7a1))
- **jira:** application-role API coverage (B334-B335) ([#66](https://github.com/dichovsky/atlassian-api-client/issues/66)) ([ad657b9](https://github.com/dichovsky/atlassian-api-client/commit/ad657b97be03115c771705a0c71bd0079e36b51f))
- **jira:** audit/events API coverage (B343, B354, B408, B467) ([#72](https://github.com/dichovsky/atlassian-api-client/issues/72)) ([efa828e](https://github.com/dichovsky/atlassian-api-client/commit/efa828ef16bc90c5dee2265fa6d350c250fb1bb8))
- **jira:** bulk API coverage (17 tasks) ([#80](https://github.com/dichovsky/atlassian-api-client/issues/80)) ([814420b](https://github.com/dichovsky/atlassian-api-client/commit/814420b2067985cab9921b18fef0095d13a48e19)), closes [#77](https://github.com/dichovsky/atlassian-api-client/issues/77)
- **jira:** bulk workflows read/create API coverage (5 endpoints B846-B850) ([#151](https://github.com/dichovsky/atlassian-api-client/issues/151)) ([203c2e3](https://github.com/dichovsky/atlassian-api-client/commit/203c2e37b81b5bfcfb1f6fa826da358e3b4fbbf2)), closes [#109](https://github.com/dichovsky/atlassian-api-client/issues/109)
- **jira:** bulk workflows update/preview/search API coverage (4 endpoints B851-B854) ([#152](https://github.com/dichovsky/atlassian-api-client/issues/152)) ([0e9413f](https://github.com/dichovsky/atlassian-api-client/commit/0e9413fd2f40261eda0df7da5286b005c9d07426))
- **jira:** bulk-by-properties DELETE across 8 DevOps bases API coverage (8 endpoints) ([#144](https://github.com/dichovsky/atlassian-api-client/issues/144)) ([c9a153c](https://github.com/dichovsky/atlassian-api-client/commit/c9a153cf3053aff84e09698faa756929f1389720))
- **jira:** comment-properties + comment/list API coverage (5 endpoints) ([#96](https://github.com/dichovsky/atlassian-api-client/issues/96)) ([f184323](https://github.com/dichovsky/atlassian-api-client/commit/f184323d42b593ad9af2588e7328244002d6351e))
- **jira:** component API coverage (6 endpoints) ([#81](https://github.com/dichovsky/atlassian-api-client/issues/81)) ([01dafbe](https://github.com/dichovsky/atlassian-api-client/commit/01dafbe91922529cdd496633b262a9915cf0f5ae))
- **jira:** config field-schemes API coverage (15 endpoints B367-B381) ([#112](https://github.com/dichovsky/atlassian-api-client/issues/112)) ([f46a30f](https://github.com/dichovsky/atlassian-api-client/commit/f46a30f43db9247c4202c930fbadae81309ff4fe))
- **jira:** configuration + application-properties API coverage (9 endpoints) ([#83](https://github.com/dichovsky/atlassian-api-client/issues/83)) ([6868049](https://github.com/dichovsky/atlassian-api-client/commit/6868049077ece6eb369f9d12b2a9fa6edff1afeb))
- **jira:** connect addons properties API coverage (4 endpoints B939-B942) ([#145](https://github.com/dichovsky/atlassian-api-client/issues/145)) ([f07f155](https://github.com/dichovsky/atlassian-api-client/commit/f07f15564ceddb024c096dd94600ab09d9026875))
- **jira:** connect migration API coverage (5 endpoints B946-B950) ([#146](https://github.com/dichovsky/atlassian-api-client/issues/146)) ([3f3e5d3](https://github.com/dichovsky/atlassian-api-client/commit/3f3e5d38a643fe8cf095817d3567ff6355d42d39))
- **jira:** dashboards API coverage (12 tasks) ([#79](https://github.com/dichovsky/atlassian-api-client/issues/79)) ([0e97b50](https://github.com/dichovsky/atlassian-api-client/commit/0e97b507bb85b48972b4895b3e8ced29e5130051)), closes [#1](https://github.com/dichovsky/atlassian-api-client/issues/1) [#2](https://github.com/dichovsky/atlassian-api-client/issues/2) [#3](https://github.com/dichovsky/atlassian-api-client/issues/3) [#4](https://github.com/dichovsky/atlassian-api-client/issues/4)
- **jira:** data-policy API coverage (B406-B407) ([#67](https://github.com/dichovsky/atlassian-api-client/issues/67)) ([7938859](https://github.com/dichovsky/atlassian-api-client/commit/7938859f70c433601e5f13da9e4682245be0ba27))
- **jira:** devinfo repository get/delete API coverage (3 endpoints B964-B966) ([#141](https://github.com/dichovsky/atlassian-api-client/issues/141)) ([b5357b8](https://github.com/dichovsky/atlassian-api-client/commit/b5357b83dfabcde61d952039bde475011dcca27f))
- **jira:** expose GET /webhook/failed (B835) ([#68](https://github.com/dichovsky/atlassian-api-client/issues/68)) ([c135490](https://github.com/dichovsky/atlassian-api-client/commit/c1354905d3e0833150288bddc8203e6b178ea36b))
- **jira:** expression API coverage (3 endpoints) ([#93](https://github.com/dichovsky/atlassian-api-client/issues/93)) ([729d9bd](https://github.com/dichovsky/atlassian-api-client/commit/729d9bd3fbbb906c5709d6ee4a8739299f578d77))
- **jira:** field admin/association API coverage (9 endpoints B414,B432,B442-B445,B447,B411,B446) ([#126](https://github.com/dichovsky/atlassian-api-client/issues/126)) ([f647c8a](https://github.com/dichovsky/atlassian-api-client/commit/f647c8ac2fd6e56e96e97be3a39231ac3874dafd))
- **jira:** field options API coverage (8 endpoints B433-B440) ([#124](https://github.com/dichovsky/atlassian-api-client/issues/124)) ([e64f8ee](https://github.com/dichovsky/atlassian-api-client/commit/e64f8ee6ed65b00922f6ffc41bfc215b93887852))
- **jira:** fieldconfiguration API coverage (6 endpoints) ([#94](https://github.com/dichovsky/atlassian-api-client/issues/94)) ([47bad39](https://github.com/dichovsky/atlassian-api-client/commit/47bad398b94cc5d0db5cca31f7c61a3823e0c183))
- **jira:** fields context CRUD API coverage (4 endpoints B415-B418) ([#120](https://github.com/dichovsky/atlassian-api-client/issues/120)) ([c625d93](https://github.com/dichovsky/atlassian-api-client/commit/c625d931497ab897b8a95e5a21c1a31b1cd461cf))
- **jira:** fields context issuetype+default API coverage (5 endpoints B419-B420, B429, B905-B906) ([#122](https://github.com/dichovsky/atlassian-api-client/issues/122)) ([bd7a0b9](https://github.com/dichovsky/atlassian-api-client/commit/bd7a0b9782bf61ee624104a09f81997517495a76))
- **jira:** fields context options API coverage (6 endpoints B421-B426) ([#121](https://github.com/dichovsky/atlassian-api-client/issues/121)) ([1002734](https://github.com/dichovsky/atlassian-api-client/commit/100273418b7dd7714b07084437ef90ae8a6541a5)), closes [#120](https://github.com/dichovsky/atlassian-api-client/issues/120)
- **jira:** fields context project mapping API coverage (4 endpoints B427-B428, B430-B431) ([#123](https://github.com/dichovsky/atlassian-api-client/issues/123)) ([31775f9](https://github.com/dichovsky/atlassian-api-client/commit/31775f989d415c4b136413cc0fd7e96f5c94f8da))
- **jira:** filters API coverage (B452-B466) ([#84](https://github.com/dichovsky/atlassian-api-client/issues/84)) ([989d4cc](https://github.com/dichovsky/atlassian-api-client/commit/989d4ccecf4a724f2999b578ff08365b04f87fd1))
- **jira:** group/security API coverage (B474, B475, B769) ([#73](https://github.com/dichovsky/atlassian-api-client/issues/73)) ([58f352f](https://github.com/dichovsky/atlassian-api-client/commit/58f352f1426ee961321c88956bb2689204e8f1ae))
- **jira:** groups API coverage (7 endpoints) ([#85](https://github.com/dichovsky/atlassian-api-client/issues/85)) ([0723142](https://github.com/dichovsky/atlassian-api-client/commit/072314273e019d6851d83b23a70be0e26db38f94))
- **jira:** incident/devops API coverage (B969-B1000) ([#71](https://github.com/dichovsky/atlassian-api-client/issues/71)) ([5e3f4af](https://github.com/dichovsky/atlassian-api-client/commit/5e3f4afe402c23887308b849b4c9edf502b94989))
- **jira:** instance singletons API coverage (B770, B476, B600) ([#70](https://github.com/dichovsky/atlassian-api-client/issues/70)) ([0b72f8e](https://github.com/dichovsky/atlassian-api-client/commit/0b72f8e9857e429f80b45e2b1b0e433d035ea238))
- **jira:** issue assignee, changelog, properties, remotelinks, votes, watchers (21 endpoints) ([4a1856d](https://github.com/dichovsky/atlassian-api-client/commit/4a1856dcfd5f400d6ac86fad00d4890c1e5f85fe))
- **jira:** issue attachment-upload + bulk create/property CLI (4 endpoints B479,B518,B525,B526) ([#129](https://github.com/dichovsky/atlassian-api-client/issues/129)) ([97fbbc1](https://github.com/dichovsky/atlassian-api-client/commit/97fbbc16e4472af37914cef9d8d4edef33918e3f))
- **jira:** issue worklog, archive, bulk-fetch, createmeta, picker, and watching (24 endpoints B505-B538) ([#109](https://github.com/dichovsky/atlassian-api-client/issues/109)) ([4b7a3b4](https://github.com/dichovsky/atlassian-api-client/commit/4b7a3b45073a692f2d18ebce9b8d75169f4cd569))
- **jira:** issue-attachments API coverage (6 endpoints) ([#82](https://github.com/dichovsky/atlassian-api-client/issues/82)) ([cf22c12](https://github.com/dichovsky/atlassian-api-client/commit/cf22c12de701cebd6c4accfca098cc44379a755a))
- **jira:** issuelink create/get/delete API coverage (3 endpoints B530-B532) ([#136](https://github.com/dichovsky/atlassian-api-client/issues/136)) ([ea76f7e](https://github.com/dichovsky/atlassian-api-client/commit/ea76f7e10586e558a3d655120cfe6a34b8b66eea))
- **jira:** issuelinktype list/get/create/update/delete API coverage (5 endpoints B533-B537) ([#132](https://github.com/dichovsky/atlassian-api-client/issues/132)) ([0e58bc6](https://github.com/dichovsky/atlassian-api-client/commit/0e58bc64142a8c07e84f0a3c87b035e9d1835802))
- **jira:** issuesecurityschemes API coverage (17 endpoints B539-B555) ([#115](https://github.com/dichovsky/atlassian-api-client/issues/115)) ([33a42c1](https://github.com/dichovsky/atlassian-api-client/commit/33a42c1a9ce7f1a5e1b63f5a4bc37181bd025fa5))
- **jira:** issuetype API coverage (B556-B565) ([#78](https://github.com/dichovsky/atlassian-api-client/issues/78)) ([741cf4d](https://github.com/dichovsky/atlassian-api-client/commit/741cf4d636b3085e023011b6c7841035da830cb5))
- **jira:** issuetypescheme API coverage (10 endpoints) ([#90](https://github.com/dichovsky/atlassian-api-client/issues/90)) ([0eb7bef](https://github.com/dichovsky/atlassian-api-client/commit/0eb7bef58ae18e5d083782aaf5772687fb03c568)), closes [#88](https://github.com/dichovsky/atlassian-api-client/issues/88) [#88](https://github.com/dichovsky/atlassian-api-client/issues/88) [#88](https://github.com/dichovsky/atlassian-api-client/issues/88)
- **jira:** issuetypescreenscheme API coverage (11 endpoints) ([#88](https://github.com/dichovsky/atlassian-api-client/issues/88)) ([d13df6b](https://github.com/dichovsky/atlassian-api-client/commit/d13df6b42373a6fc17f5981955da54e222dc5ef0)), closes [#3](https://github.com/dichovsky/atlassian-api-client/issues/3)
- **jira:** jql precomputation + autocomplete API coverage (10 endpoints B587-B596) ([#127](https://github.com/dichovsky/atlassian-api-client/issues/127)) ([5bb61f6](https://github.com/dichovsky/atlassian-api-client/commit/5bb61f663a9ec1f7cfb6ac35c995532e1ad8b84e))
- **jira:** license/settings/redact/flag/task API coverage ([#74](https://github.com/dichovsky/atlassian-api-client/issues/74)) ([00f1991](https://github.com/dichovsky/atlassian-api-client/commit/00f19910c948eafe3068f66cc2768b1a705044a3))
- **jira:** linked-workspaces operations/security API coverage (7 endpoints B984-B986,B995-B998) ([#143](https://github.com/dichovsky/atlassian-api-client/issues/143)) ([8e83196](https://github.com/dichovsky/atlassian-api-client/commit/8e8319622aaca22d6ca70bf3841aeb3183af6200))
- **jira:** misc singletons API coverage (8 tasks) ([#75](https://github.com/dichovsky/atlassian-api-client/issues/75)) ([15b97b4](https://github.com/dichovsky/atlassian-api-client/commit/15b97b4b1c322c3539b5c1c8dcbc1d2deea199f5))
- **jira:** mypreferences get/set/delete + locale API coverage (5 endpoints B601-B604,B925) ([#133](https://github.com/dichovsky/atlassian-api-client/issues/133)) ([ec6af87](https://github.com/dichovsky/atlassian-api-client/commit/ec6af87c35dc4bb1a7cf0dcdf5bf740a09b5690a))
- **jira:** notificationscheme API coverage (8 endpoints) ([#95](https://github.com/dichovsky/atlassian-api-client/issues/95)) ([d542981](https://github.com/dichovsky/atlassian-api-client/commit/d5429813389ab3c9e86e1c6409faf76765a3652e))
- **jira:** permissions get-all/check/permitted-projects API coverage (3 endpoints B613-B615) ([#137](https://github.com/dichovsky/atlassian-api-client/issues/137)) ([ceead8c](https://github.com/dichovsky/atlassian-api-client/commit/ceead8cf39a703bb0861869d51216daba5ced937))
- **jira:** permissionscheme API coverage (9 endpoints) ([#89](https://github.com/dichovsky/atlassian-api-client/issues/89)) ([aa8a9e3](https://github.com/dichovsky/atlassian-api-client/commit/aa8a9e367ebf79bf700f901ecda8519dffdff6a3))
- **jira:** pipelines builds/deployments API coverage (5 endpoints B954,B955,B958,B959,B960) ([#142](https://github.com/dichovsky/atlassian-api-client/issues/142)) ([e8247de](https://github.com/dichovsky/atlassian-api-client/commit/e8247de72fa700acec734ea26e187e638cf281f9))
- **jira:** plans (Advanced Roadmaps) API coverage (16 endpoints B625-B640) ([#114](https://github.com/dichovsky/atlassian-api-client/issues/114)) ([f327eb8](https://github.com/dichovsky/atlassian-api-client/commit/f327eb8a1615915fa17a7617937b7b3181c82443))
- **jira:** priority management API coverage (6 endpoints) ([#101](https://github.com/dichovsky/atlassian-api-client/issues/101)) ([7fa9f22](https://github.com/dichovsky/atlassian-api-client/commit/7fa9f226463c254290226cd95e159a597f83b1f5))
- **jira:** priorityscheme API coverage (8 endpoints) ([#97](https://github.com/dichovsky/atlassian-api-client/issues/97)) ([ce97204](https://github.com/dichovsky/atlassian-api-client/commit/ce97204d5ede411d61aacb9e9b9b048389224fb1))
- **jira:** project roles, categories, and meta API coverage (24 endpoints) ([6dbf975](https://github.com/dichovsky/atlassian-api-client/commit/6dbf97544ac7b26bf7f8a899b1fe147e73233f18))
- **jira:** project sub-resource API coverage (21 endpoints B658-B680) ([#106](https://github.com/dichovsky/atlassian-api-client/issues/106)) ([74d13ca](https://github.com/dichovsky/atlassian-api-client/commit/74d13ca830cd1af1ea81b8922548bf482c5899b2))
- **jira:** project-template create/edit/save/remove/live API coverage (5 endpoints B653-B657) ([#134](https://github.com/dichovsky/atlassian-api-client/issues/134)) ([0e8a641](https://github.com/dichovsky/atlassian-api-client/commit/0e8a6410fca8a5fe24e36e550c15ce362521e983))
- **jira:** projects CRUD + types API coverage (9 endpoints) ([#102](https://github.com/dichovsky/atlassian-api-client/issues/102)) ([fdfd261](https://github.com/dichovsky/atlassian-api-client/commit/fdfd2614ade251a055fad12c85bd4e7d5c11632d))
- **jira:** resolution + statuses API coverage (16 endpoints) ([#92](https://github.com/dichovsky/atlassian-api-client/issues/92)) ([8ded8ee](https://github.com/dichovsky/atlassian-api-client/commit/8ded8ee0f6c7e856a9e7405be47ae224d14e70eb)), closes [#1](https://github.com/dichovsky/atlassian-api-client/issues/1) [#1](https://github.com/dichovsky/atlassian-api-client/issues/1)
- **jira:** role (global project-role) API coverage (9 endpoints) ([#91](https://github.com/dichovsky/atlassian-api-client/issues/91)) ([56cb790](https://github.com/dichovsky/atlassian-api-client/commit/56cb7902105f8257f894abce53daa61b58f8e1a1)), closes [#4](https://github.com/dichovsky/atlassian-api-client/issues/4) [#5](https://github.com/dichovsky/atlassian-api-client/issues/5) [89/#90](https://github.com/89/atlassian-api-client/issues/90)
- **jira:** screens API coverage (16 endpoints B746-B761) ([#113](https://github.com/dichovsky/atlassian-api-client/issues/113)) ([8a79dd9](https://github.com/dichovsky/atlassian-api-client/commit/8a79dd900330f9ce0fd6eeae732698ac0a6dd49f))
- **jira:** screenscheme list/create/update/delete API coverage (4 endpoints B762-B765) ([#131](https://github.com/dichovsky/atlassian-api-client/issues/131)) ([0157a66](https://github.com/dichovsky/atlassian-api-client/commit/0157a665623686e296ef3b48cb276c395e022a41))
- **jira:** search JQL endpoints + CLI wiring (3 endpoints) ([#103](https://github.com/dichovsky/atlassian-api-client/issues/103)) ([6e7caf8](https://github.com/dichovsky/atlassian-api-client/commit/6e7caf88d4e5f7f0e528b9ca737efaa8ccb0ddbc))
- **jira:** status + status-category API coverage (B773-B776) ([#69](https://github.com/dichovsky/atlassian-api-client/issues/69)) ([ab18efa](https://github.com/dichovsky/atlassian-api-client/commit/ab18efa81080d4f72fee37fd8c45f7c3c43b6292))
- **jira:** uimodifications list/create/update/delete API coverage (4 endpoints B787-B790) ([#138](https://github.com/dichovsky/atlassian-api-client/issues/138)) ([dadc49f](https://github.com/dichovsky/atlassian-api-client/commit/dadc49f86fba441390a3667ef0ba782a2e65c752))
- **jira:** universal-avatar list/store/delete/view API coverage (6 endpoints B791-B796) ([#135](https://github.com/dichovsky/atlassian-api-client/issues/135)) ([cdf8b41](https://github.com/dichovsky/atlassian-api-client/commit/cdf8b41a81bad54d01a39642dee22f9d95e416e0))
- **jira:** users management endpoints (12 endpoints) (#B797-B808) ([#104](https://github.com/dichovsky/atlassian-api-client/issues/104)) ([221936d](https://github.com/dichovsky/atlassian-api-client/commit/221936d8b596a442d4d02501e0eb708cc26fd5e1)), closes [#B797-B808](https://github.com/dichovsky/atlassian-api-client/issues/B797-B808)
- **jira:** users properties + search API coverage (11 endpoints) ([#105](https://github.com/dichovsky/atlassian-api-client/issues/105)) ([d71f14c](https://github.com/dichovsky/atlassian-api-client/commit/d71f14c0054f1ae7d07cced3d04397201079222f)), closes [#B809-B819](https://github.com/dichovsky/atlassian-api-client/issues/B809-B819)
- **jira:** version (project versions) API coverage (13 endpoints B820-B831,B933) ([#111](https://github.com/dichovsky/atlassian-api-client/issues/111)) ([0804453](https://github.com/dichovsky/atlassian-api-client/commit/08044536a7992c1de1b498a78a93ca0a539ccae3))
- **jira:** webhooks list/register/refresh CLI (3 endpoints B833,B834,B836) ([#128](https://github.com/dichovsky/atlassian-api-client/issues/128)) ([b11036e](https://github.com/dichovsky/atlassian-api-client/commit/b11036eeb505d7944279a44a9db1ac19adf00ba2))
- **jira:** workflow history + transition-rule-config API coverage (5 endpoints B841-B845) ([#150](https://github.com/dichovsky/atlassian-api-client/issues/150)) ([8715279](https://github.com/dichovsky/atlassian-api-client/commit/8715279f7ded0aecf9e7f73db9423a72b2ab9210))
- **jira:** workflow transition properties API coverage (4 endpoints B935-B938) ([#149](https://github.com/dichovsky/atlassian-api-client/issues/149)) ([12c99ac](https://github.com/dichovsky/atlassian-api-client/commit/12c99ac47d04bb53896c643e28211f9798a34a96))
- **jira:** workflow usages/schemes/delete API coverage (B837-B840) ([#148](https://github.com/dichovsky/atlassian-api-client/issues/148)) ([67ae9c8](https://github.com/dichovsky/atlassian-api-client/commit/67ae9c83022e79e15eb4ddfd495cc0603227870e))
- **jira:** workflowscheme draft+bulk API coverage (17 endpoints B860, B864-B876, B887-B889) ([#119](https://github.com/dichovsky/atlassian-api-client/issues/119)) ([762f255](https://github.com/dichovsky/atlassian-api-client/commit/762f2559f3d08776ba879d76230f973602f41bd4)), closes [#118](https://github.com/dichovsky/atlassian-api-client/issues/118)
- **jira:** workflowscheme live API coverage (18 endpoints B855-B886) ([#118](https://github.com/dichovsky/atlassian-api-client/issues/118)) ([66a3a2a](https://github.com/dichovsky/atlassian-api-client/commit/66a3a2ad358ef0800cee29ed48cce86ac7eac4f6)), closes [#119](https://github.com/dichovsky/atlassian-api-client/issues/119)
- **jira:** worklog deleted/list/updated API coverage (3 endpoints B890-B892) ([#139](https://github.com/dichovsky/atlassian-api-client/issues/139)) ([79a9d52](https://github.com/dichovsky/atlassian-api-client/commit/79a9d5237d06ec4fbfe198fea829112480281830))
- propagate X-Request-Id (capture inbound, opt-in outbound) ([#176](https://github.com/dichovsky/atlassian-api-client/issues/176)) ([5a3abe5](https://github.com/dichovsky/atlassian-api-client/commit/5a3abe57c39d6c6f37189c6e2d3436e1cca354e9))
- verify Atlassian Connect asymmetric (RS256) JWTs (B015) ([#175](https://github.com/dichovsky/atlassian-api-client/issues/175)) ([5060b94](https://github.com/dichovsky/atlassian-api-client/commit/5060b94edbf70cb0309c2252b4dcdc486fcdad7f))

### Bug Fixes

- **cli:** register jira handler flags missing from the CLI parser ([#199](https://github.com/dichovsky/atlassian-api-client/issues/199)) ([2bf25e5](https://github.com/dichovsky/atlassian-api-client/commit/2bf25e5))
- **confluence:** CLI update forwards `--body` (blog-posts) and `--resolved` (comments) ([#202](https://github.com/dichovsky/atlassian-api-client/issues/202), [#203](https://github.com/dichovsky/atlassian-api-client/issues/203)) ([66c2bbd](https://github.com/dichovsky/atlassian-api-client/commit/66c2bbd))
- **core:** `joinWithCap` off-by-one corrupted the max-length first error message ([#205](https://github.com/dichovsky/atlassian-api-client/issues/205)) ([c3e5108](https://github.com/dichovsky/atlassian-api-client/commit/c3e5108))
- **jira:** `jql.parse` sends `validation` as a query param with body `{ queries }` only ([#210](https://github.com/dichovsky/atlassian-api-client/issues/210)) ([b4b4b60](https://github.com/dichovsky/atlassian-api-client/commit/b4b4b60))
- **jira:** `users.setColumns` wraps the body in `UserColumnRequestBody { columns }` ([#211](https://github.com/dichovsky/atlassian-api-client/issues/211)) ([639c3e7](https://github.com/dichovsky/atlassian-api-client/commit/639c3e7))
- **ci:** drop npm-only semver cooldown keys from github-actions ecosystem (B031) ([#185](https://github.com/dichovsky/atlassian-api-client/issues/185)) ([e71c440](https://github.com/dichovsky/atlassian-api-client/commit/e71c4405f725556ef75a6513a553772b40a7ce71)), closes [#180](https://github.com/dichovsky/atlassian-api-client/issues/180)
- **cli:** accept --start-at 0 for 0-based Jira pagination offset ([#159](https://github.com/dichovsky/atlassian-api-client/issues/159)) ([b37ff00](https://github.com/dichovsky/atlassian-api-client/commit/b37ff006cbcb0bed94252411deadfa91a734cfbe))
- **cli:** trim whitespace in Jira --fields/--expand CSV flags ([#169](https://github.com/dichovsky/atlassian-api-client/issues/169)) ([82ea6d5](https://github.com/dichovsky/atlassian-api-client/commit/82ea6d5b583f08cfaa444f8eac49c655ec4cb3f0))
- **cli:** validate Jira worklog --since as a non-negative integer ([#172](https://github.com/dichovsky/atlassian-api-client/issues/172)) ([2a93b7b](https://github.com/dichovsky/atlassian-api-client/commit/2a93b7b32256e476b931ff298ad7b60c4b1c13b8))
- **confluence:** restore attachments B054-B065 lost in [#51](https://github.com/dichovsky/atlassian-api-client/issues/51) rebase ([#54](https://github.com/dichovsky/atlassian-api-client/issues/54)) ([e8a7bc6](https://github.com/dichovsky/atlassian-api-client/commit/e8a7bc6afb4fd966c9002bbf04d33b5c2d3b8fc4))
- **confluence:** send kebab-case query params for tasks list filters ([#166](https://github.com/dichovsky/atlassian-api-client/issues/166)) ([65b1ab2](https://github.com/dichovsky/atlassian-api-client/commit/65b1ab22573c60e8c5b8d7e156c2ca76b2adf1e9))
- **confluence:** send space-id query param for pages/blogposts list filters ([#164](https://github.com/dichovsky/atlassian-api-client/issues/164)) ([37d04ce](https://github.com/dichovsky/atlassian-api-client/commit/37d04ce87585f7a310b5d8037c2b369581fd3d59))
- **connect-jwt:** RFC-3986 encode QSH query params (\* ! ' ( )) ([#156](https://github.com/dichovsky/atlassian-api-client/issues/156)) ([57c1031](https://github.com/dichovsky/atlassian-api-client/commit/57c1031ba3550a41bef70a1cd7a1d7edc26484b2))
- **jira:** accept --offset 0 in auditing list (0-based pagination) ([#160](https://github.com/dichovsky/atlassian-api-client/issues/160)) ([679eebe](https://github.com/dichovsky/atlassian-api-client/commit/679eebe3e09ec34de22b32180d478606f4b2b939))
- **jira:** map groupuserpicker exclusion to excludeConnectAddons wire param ([#177](https://github.com/dichovsky/atlassian-api-client/issues/177)) ([3ab94ff](https://github.com/dichovsky/atlassian-api-client/commit/3ab94ffd63437c46b901742bd436bae5b3b9855c))
- **jira:** send search/jql POST expand as a comma-delimited string ([#167](https://github.com/dichovsky/atlassian-api-client/issues/167)) ([d0890e5](https://github.com/dichovsky/atlassian-api-client/commit/d0890e5bc52787e9d82c96d2b32902939600da3d))
- **pagination:** honor explicit isLast=false on a short offset page ([#165](https://github.com/dichovsky/atlassian-api-client/issues/165)) ([2a8aa31](https://github.com/dichovsky/atlassian-api-client/commit/2a8aa3133671113501d91f50074b47c42a6f98e6))
- **rate-limiter:** reject non-finite Retry-After header values ([#157](https://github.com/dichovsky/atlassian-api-client/issues/157)) ([0f4615e](https://github.com/dichovsky/atlassian-api-client/commit/0f4615e52879c083109af0622821ce533bd25ed8))
- reject NaN cache ttl ([#161](https://github.com/dichovsky/atlassian-api-client/issues/161)) ([1c830b7](https://github.com/dichovsky/atlassian-api-client/commit/1c830b7de9cca38b963cfcf4a30b3c8b2298c79a))
- reject unknown API before credential checks ([#153](https://github.com/dichovsky/atlassian-api-client/issues/153)) ([66de78b](https://github.com/dichovsky/atlassian-api-client/commit/66de78bf0cc0902005dda57d2f11728cf3fbc63b))
- **transport:** drop caller header case-collisions so fetch keeps canonical values ([#163](https://github.com/dichovsky/atlassian-api-client/issues/163)) ([4b37099](https://github.com/dichovsky/atlassian-api-client/commit/4b3709963393723c547e30faa7c74c4b44abc776))
- **transport:** keep timeout active through body reads ([#168](https://github.com/dichovsky/atlassian-api-client/issues/168)) ([35779dc](https://github.com/dichovsky/atlassian-api-client/commit/35779dcba4ae8ec711f36aa1734adecbd3da96ca))
- update funding metadata structure in package.json and correspond… ([#170](https://github.com/dichovsky/atlassian-api-client/issues/170)) ([bd217f2](https://github.com/dichovsky/atlassian-api-client/commit/bd217f23ea11d8ad1abaac497f9881d235b1a18e))

### Documentation

- **skill:** the bundled `atlassian-api-client-cli` skill reference is brought to full CLI/skill parity — all Jira `issues` sub-resource actions are documented, the Confluence attachments upload note is corrected, and the parity matrix test is hardened. ([#197](https://github.com/dichovsky/atlassian-api-client/issues/197), [#213](https://github.com/dichovsky/atlassian-api-client/issues/213), [#230](https://github.com/dichovsky/atlassian-api-client/issues/230), [#231](https://github.com/dichovsky/atlassian-api-client/issues/231))

## 1.0.1 (2026-05-21)

### Fixed

- **package** — `PaginationError`, `ResponseTooLargeError`, `executeWithRetry`, `RetryConfig`, `createMiddlewareChain`, `paginateCursor`, `paginateOffset`, `paginateSearch`, `extractCursor`, `PaginateOptions`, and `SearchPaginatedResponse` are now re-exported from the package root (`atlassian-api-client`). The 1.0.0 CHANGELOG documented them as exported from `src/core/index.ts`, which was technically accurate but unreachable: `package.json` only exposes the `.` subpath, so `import { PaginationError } from 'atlassian-api-client'` failed at runtime (`SyntaxError: does not provide an export named 'PaginationError'`) and there was no supported deep-import alternative. Callers had to catch the base `AtlassianError` and string-match `.code` instead. Existing imports continue to work unchanged.

### Changed

- **publish** — `publishConfig.provenance` removed from `package.json`. The flag requires OIDC and only works under a CI publish; keeping it on caused local `npm publish` to fail. Re-introduce it (and gate the `npm publish` step) inside a GitHub Actions workflow when CI-driven releases land.

### Tests

- **smoke** — `test/smoke/api-surface.test.ts` extended with a `root re-exports documented core surface` block that imports every newly-re-exported name from the package root and asserts the class/function/type is present. Prevents recurrence of the 1.0.0 gap.

## 1.0.0 (2026-05-21)

### Added

- **oauth (B016)** — `OAuthRefreshConfig.retryJitterMs?: number` (default `100`) and `OAuthRefreshConfig.failureCooldownMs?: number` (default `1000`) protect `createOAuthRefreshMiddleware` against two herd patterns that previously slipped through the single in-flight refresh dedup. `retryJitterMs` spreads concurrent post-refresh retries across `[0, retryJitterMs)` so N waiters no longer dispatch their retried API calls in the same microtask the moment the shared refresh resolves — flattening the burst that could re-trigger upstream rate-limits or push a just-recovered backend back over capacity. `failureCooldownMs` caches the most recent refresh **failure** for the configured duration and replays it without re-firing the token endpoint, so an auth-server outage no longer drives one refresh attempt per incoming 401 (previous behaviour was an unbounded loop). Concurrent waiters at the moment of failure already shared one rejection; the cooldown protects the _next_ wave. Both knobs accept `0` to disable for callers who need the prior behaviour, and are validated as non-negative finite numbers at `createOAuthRefreshMiddleware` construction (`ValidationError` otherwise). The cooldown replays the original refresh error (typically `OAuthError`) so the root cause is preserved. The jitter sleep honours `RequestOptions.signal` — aborting a caller during the sleep rejects with `signal.reason` immediately and clears the pending timer.
- **transport (B026)** — `ClientConfig.maxResponseBytes?: number` caps the size of any single buffered response body the transport will materialise. When set, the transport throws the new `ResponseTooLargeError` (extends `AtlassianError`, code `RESPONSE_TOO_LARGE_ERROR`) instead of loading an oversized body into memory. Applies to `responseType: 'json'` and `'arrayBuffer'` on the success path AND to the error-response body parsed for error-message extraction — so a hostile or misconfigured upstream returning a multi-gigabyte 5xx body cannot exhaust the Node heap on a single request. `responseType: 'stream'` is exempt by design (caller owns drain/abort). Detection is twofold: a fast-fail on `content-length` when the header is present and exceeds the cap (no body bytes are read), plus a running stream-read tally that aborts mid-read via `reader.cancel()` when the byte total crosses the cap — handles chunked transfers, missing headers, and servers that lie about `content-length`. Default is `undefined` (no cap, preserves prior behaviour); recommended for any client consuming responses from a third-party or untrusted proxy. Must be a finite positive integer when supplied; rejected at `resolveConfig` time otherwise.
- **errors (B026)** — `ResponseTooLargeError` exported from `src/core/index.ts`. Carries `limitBytes` (the configured cap that was exceeded) and `status` (the HTTP status of the response whose body overflowed — populated by the transport on both the success and error paths so callers can classify the originating response). Not an `HttpError` — it preempts the would-be `HttpError` on the error path rather than being one.

### Breaking

- **oauth (B036)** — `createOAuthRefreshMiddleware` (and direct `fetchRefreshedTokens` callers) now throws `ValidationError` at construction time when `OAuthRefreshConfig.tokenEndpoint` resolves to a host other than `auth.atlassian.com`. Integrations that previously passed a custom `tokenEndpoint` (self-hosted IdP, proxied auth, staging) must opt in by also setting `OAuthRefreshConfig.allowedTokenEndpointHosts: readonly string[]` — the list REPLACES the default, mirroring `ClientConfig.allowedHosts` semantics. Migration: pass `allowedTokenEndpointHosts: ['<your-host>']` alongside the existing `tokenEndpoint`. The error message names the field, so existing code fails fast with an actionable diagnostic rather than silently leaking credentials. See `### Security` below for full rationale.

### Security

- **transport (B035)** — `sanitizePathForLogging` (the debug-log path sanitiser invoked once per request inside `HttpTransport.executeFetch`) now redacts a substantially wider set of credential markers and credential-shaped values. Segment-name markers grew from `{token, key, secret, auth}` to also include `password`, `pwd`, `apikey`, `api_key`, `access_token`, `refresh_token`, `bearer`, `jwt`, `assertion`, `client_secret`, `signature`, `sig`, `jsessionid`, `sid`, `session` — the next path segment after any of these (whole-segment, case-insensitive) is replaced with `***`. The same expanded set drives the `name=VALUE` marker regex, which now matches anywhere inside a segment and is terminated by `/&;?#` so matrix params (`;jsessionid=ABC`) are scrubbed alongside query-style markers smuggled into the path. A new JWT compact-serialisation regex (`eyJ[base64url].[base64url].[base64url]`) catches bearer JWTs accidentally embedded directly in a path with no preceding marker — replaced with `***.jwt.***`. The fallback branch (used when `new URL(...)` throws on malformed input) now strips `//user:pass@host` userinfo before redaction, closing a leak that previously echoed broken URLs with embedded credentials verbatim. Excluded by design (false-positive risk): `code`, `state`, `xdm_e`, `lic`, `cp` — Jira issue keys like `/issue/AC-1` and Atlassian Connect query params (already covered by the query-strip step) remain unchanged. No public API change; the redactor is internal to debug logging.
- **oauth (B036)** — `OAuthRefreshConfig.tokenEndpoint` is now validated against a host allowlist at `createOAuthRefreshMiddleware` construction time (and re-asserted inside `fetchRefreshedTokens` for direct callers). The default allowlist is `['auth.atlassian.com']` — the documented Atlassian Cloud OAuth 2.0 3LO token endpoint host, matching the default `tokenEndpoint`. Self-hosted IdPs, proxied auth, and staging endpoints must opt in via the new `OAuthRefreshConfig.allowedTokenEndpointHosts?: readonly string[]` field, which REPLACES (not augments) the default — mirroring `ClientConfig.allowedHosts` semantics. A misconfigured `tokenEndpoint` (typo, poisoned env var, social-engineered config PR) now throws `ValidationError` fail-fast at startup instead of POSTing `client_id` + `client_secret` + `refresh_token` to an attacker host on the very first 401. Defence-in-depth pair to the existing transport-side allowlist (B034); the OAuth refresh path is on a separate code path that bypasses `ClientConfig.allowedHosts` by design.

### Added

- **retry** — `executeWithRetry<T>(operation, config, signal?)` exported from `src/core/index.ts` runs any async operation under the same retry semantics as `HttpTransport` (exponential backoff with jitter, server-advertised `retry-after` honoured for `RateLimitError`, abort-aware between-attempts sleep). Useful for custom `Transport` implementations that want to reuse the retry policy. `RetryConfig` interface also exported.
- **middleware** — `createMiddlewareChain(middlewares, terminal)` exported from `src/core/index.ts` composes a middleware chain with outermost-first semantics (matches `HttpTransport`'s internal composition). Empty middleware array returns the terminal handler unchanged.
- **codemap** — `CODEMAP.md` machine-readable symbol index is generated by `scripts/generate-codemap.js` and committed at repo root. Captures the transitively-resolved public API surface, per-file symbol locations with line numbers, JSDoc summaries (with `@deprecated`/`@example`/`@since` preserved), and class member layouts. `npm run codemap` regenerates; `npm run codemap:check` (wired into `validate`) fails CI if the committed file drifts from source. Output is byte-identical across reruns, with staleness detected via `sourceHash` over sorted file paths + contents.
- **pagination** — `PaginateOptions { maxPages?, logger? }` parameter on `paginateCursor`, `paginateOffset`, `paginateSearch`. `maxPages` (default 10000) caps the number of pages requested and emits a single `warn` once the page count crosses 80% of the limit, making runaway iteration observable before it terminates. `paginateCursor` additionally throws the new `PaginationError` when the server returns the same cursor on consecutive responses, preventing infinite-loop failure modes from an upstream regression. The legacy positional `Logger` argument on `paginateCursor` is still accepted for backwards compatibility.
- **errors** — `PaginationError` (extends `AtlassianError`, code `PAGINATION_ERROR`) exported from `src/core/index.ts` for callers that want to catch pagination-specific failures distinctly from validation or transport errors.

### Fixed

- **cli (B031)** — `atlas --version` now reports the real package version read from `package.json` instead of the hardcoded `0.1.0` literal that had drifted six minor releases out of date (the published package was `0.7.0` while the CLI still printed `atlas v0.1.0`). Version resolution is centralised in a new `src/cli/version.ts` module exporting `resolvePackageVersion(moduleUrl, fs?)` and `VersionResolutionError`; the CLI entry and the `install-skill` command both consume it, so the skill-frontmatter stamp and the `--version` flag can no longer disagree. The CLI entry was also factored into a reusable `runCli(argv, stdout, stderr, resolveVersion?)` export with a stable bin-vs-import guard (matches `import.meta.url` against the entry script's `realpath`) so tests can assert the version output without spawning a subprocess. Output format is unchanged (`atlas v<version>`); behaviour on missing/invalid `package.json` is unchanged for `install-skill` (still throws `InstallSkillError` with exit code 1) and now produces an equivalent failure mode for the CLI entry's `--version` path.
- **pagination (B037)** — `paginateOffset` and `paginateSearch` no longer trust the server-echoed `maxResults` for cursor advancement or short-page detection. Advancement now uses `values.length` (rows actually delivered), and short-page detection uses `Math.min(pageSize, serverMaxResults ?? pageSize)`. This fixes two silent data-loss / duplication scenarios: (1) when Jira clamps `maxResults` below the requested `pageSize`, the old advancement (`startAt += response.maxResults`) over-advanced and skipped rows; (2) when the server echoed a `maxResults` larger than the caller's `pageSize`, the same code path skipped rows on the next request. A new forward-progress guard throws `PaginationError` when the server returns an empty page mid-iteration while `total` (or `isLast === false`) still indicates more data — previously this silently truncated the result set. Public API and existing terminal conditions (`isLast === true`, `total` exhausted, true short page) are unchanged.

### Tests

- **cli (B013)** — new `test/e2e/` suite (4 files, 69 tests, ~500ms) drives `runCli` end-to-end against a `vi.stubGlobal('fetch', …)` route-table mock for every shipped CLI verb. Coverage: 25 Confluence actions (pages, spaces, blog-posts, comments — footer + inline, attachments, labels) + 17 Jira actions (issues, projects, search, users, issue-types, priorities, statuses) + edges (help, version, missing-credential refusal, unknown command refusal, 400/401/403/404 propagation, `--format minimal`/`table`, `install-skill --print`, bearer-auth header variant). Three helpers under `test/e2e/helpers/`: `fetch-mock.ts` (method + pathname match, full request capture for assertion), `cli-runner.ts` (combines writer-arg output and direct `process.stdout`/`process.stderr` writes into one `{ stdout, stderr, code }` result; mirrors bin's top-level error-to-exit-1 translation), `fixtures.ts` (minimal Atlassian payloads per resource). Resource-level tests previously used `MockTransport` so the CLI → config-resolve → client → HttpTransport chain was untested end-to-end; the new suite closes that gap without subprocess spawning or new dependencies. 100% statement / branch / function / line coverage preserved.

### Changed

- **transport** — internal refactor splits `src/core/transport.ts` (was 384 LOC) into focused modules: `retry.ts` now owns `executeWithRetry` plus the retry-decision helpers; `middleware.ts` owns `createMiddlewareChain`; new `request.ts` owns `buildUrl`, `sanitizePathForLogging`, `buildHeaders`, and `buildFetchBody`; `response.ts` is extended with `safeParseBody`, `parseResponseBody`, and `buildApiResponse`. `HttpTransport` becomes a thin orchestrator (≤200 LOC) with identical observable behaviour. No public API changes to `HttpTransport`.
- **cache** — response cache eviction switched from FIFO to LRU. Cache hits now move the entry to the most-recently-used position, so frequently-read entries are protected from being evicted by churn on cold keys. TTL sweep still runs before eviction; for write-only workloads the behavior is identical to the old FIFO.
- **cli** — `atlas install-skill` now rejects extra subcommands / positional arguments instead of silently ignoring them during execution; help text and install docs now call out the options-only command shape explicitly.

## 0.7.0 (2026-05-12)

### Added

- **skill** — bundled Claude Code skill `atlassian-api-client-cli` ships at `skill/SKILL.md` + `skill/reference/{confluence,jira}.md`. New `atlas install-skill` subcommand copies it into `~/.claude/skills/` (default), `<cwd>/.claude/skills/` (`--local`), or a custom `--path`. Stamps the destination frontmatter `version:` with the package version at install time so installed skills correlate with `npm list atlassian-api-client`. Supports `--print`, `--dry-run`, `--force`; idempotent at the same version; exit codes 0/1/2/3 distinguish success / generic failure / version-mismatch-without-force / permission-denied. Adds `claude-code`, `agent`, `skill` to `keywords` and `skill` to the `files` whitelist.
- **transport** — `ClientConfig.fetch?: typeof fetch` injects a custom fetch implementation for both the main transport and OAuth token-refresh calls. Enables proxy support (`undici.ProxyAgent`), keep-alive tuning, mTLS, and request interception without replacing the whole `Transport`.
- **retry** — `isNetworkError` now walks `error.cause` for undici / Node error codes (`ECONNRESET`, `ECONNREFUSED`, `ENOTFOUND`, `EAI_AGAIN`, `UND_ERR_SOCKET`, `UND_ERR_CONNECT_TIMEOUT`) in addition to bare `TypeError`. Transient socket failures that used to slip through as fatal are now retried.
- **errors** — `OAuthError` messages now include the token-endpoint HTTP status and a scrubbed 200-char body snippet so misconfigured auth servers are debuggable without inspecting network captures.
- **transport** — `RequestOptions.responseType?: 'json' | 'arrayBuffer' | 'stream'` supports large attachment downloads without buffering the whole body. `'stream'` returns the raw `ReadableStream`; `'json'` remains the default.
- **transport** — standalone `toJSON(response)` helper converts the `Headers` instance to a plain `Record<string, string>` for logging/persistence, producing a `SerializableApiResponse`.
- **pagination** — Confluence cursor paginator logs a `warn` when `_links.next` is defined but yields no `cursor` parameter if a logger is explicitly supplied to the paginator, making silent iteration termination observable in those call paths.
- **cache** — FIFO eviction now sweeps expired entries before dropping the oldest slot, preventing expired entries from pushing out still-valid ones.
- **batch** — deduplication key now includes a hash of caller-supplied headers (excluding `Authorization`), so concurrent requests with different custom headers no longer alias to the same in-flight call.
- **cli** — end-to-end test suite exercises `--help` for every resource (`atlas`, `atlas <api> --help`, `atlas <api> <resource> --help`) and asserts help text stays in sync with the dispatcher's `case` statements, preventing silent drift when resources or actions are added.
- **docs** — `docs/ARCHITECTURE.md` gains a "Middleware ordering" section documenting the `reduceRight` composition order and when to put cache vs auth vs batch outermost. README gains a "Recipes" section with copy-paste snippets for custom logger, proxy, OAuth with token persistence, retry tuning, and cache+batch layering.

### Changed

- **transport** — the deprecated `new HttpTransport(config, baseUrl)` overload now emits a `logger.warn` on construction with an explicit removal target of v0.8.0; use `new HttpTransport({ ...config, baseUrl })` instead.

### Removed

- **package** — CommonJS build dropped. Package is now ESM-only: removed `build:cjs` script, `tsconfig.cjs.json`, `dist/cjs/` output, and the `require` condition from `exports`. Consumers on Node ≥ 22.12 can still `require()` the ESM entry directly via the runtime `require(esm)` support; older CJS-only consumers should upgrade Node or pin to `0.6.0`.

## 0.6.0 (2026-04-20)

### Added

- **transport** — `ApiResponse<T>` now exposes a `rateLimit?: RateLimitInfo` field populated from `x-ratelimit-*` response headers on every successful request. When `nearLimit === true` the configured `logger` emits a `warn` so callers can proactively slow down before a 429.
- **transport** — `RequestOptions.signal?: AbortSignal` lets callers cancel in-flight requests (e.g. React `useEffect` cleanup, CLI SIGINT). The caller signal is composed with the internal timeout signal via `AbortSignal.any`; external aborts surface as `AbortError` while timeouts still throw `TimeoutError`.
- **cli** — `--auth-type basic|bearer` flag (and `ATLASSIAN_AUTH_TYPE` env var) so the `atlas` CLI can call Atlassian APIs with an OAuth/PAT bearer token. `--email` is not required when `bearer` is selected; `--token` is still required. Unknown values fall back to `basic` to preserve the historical default for existing invocations.

### Changed

- **transport** — 429 `Retry-After` delays now receive `0..retryDelay` jitter on top of the server-advertised floor. If `maxRetryDelay` leaves headroom above that floor, only the added jitter is capped to stay within that headroom. Prevents synchronized retry stampedes from clients that share a rate-limit bucket.
- **transport** — the retry loop now wraps the middleware chain (previously middleware wrapped retry). Errors thrown from middleware — including `OAuthError` with a 5xx refresh status — are now eligible for the standard retry/backoff path.
- **oauth** — `OAuthError` now extends `HttpError` (previously `AtlassianError`) and sets `status = refreshStatus ?? 0`. Transient token-endpoint failures (5xx) are retried automatically via `shouldRetry`; 4xx stay fatal. Public error `code` remains `'OAUTH_ERROR'`.
- **pagination** — offset paginators (`paginateOffset`, `paginateSearch`) now terminate when the server returns a short page (`values.length < maxResults` / `issues.length < maxResults`), even if `isLast` and `total` are absent from the response. Prevents infinite loops against servers that clamp page size without populating those fields.

### Fixed

- **transport** — `request<T>()` now validates the shape of the response produced by the middleware chain before exposing it as `ApiResponse<T>`, throwing `ValidationError` on null, primitives, or objects missing `data`/`status`/`headers` (or with non-numeric `status` or non-`Headers` headers). A misbehaving middleware can no longer return a malformed value that crashes downstream consumers.
- **transport** — logged request paths are now passed through `sanitizePathForLogging`, which strips query/fragment parts and redacts path segments following sensitive markers (`token`, `key`, `secret`, `auth`). Applies to debug and near-limit warn logging. URL parsing is wrapped in a try/catch so a malformed input falls back to a best-effort pathname rather than crashing the request.
- **errors** — `extractErrorMessage` now filters non-string entries out of Jira-style `errorMessages` arrays before joining, so objects or `null` in the array no longer leak as `[object Object]` or `"null"` into error messages.
- **package** — removed dead `test:exports` script whose target file had been deleted in an earlier commit.

## 0.5.0 (2026-04-16)

### Fixed

- **transport** — `HttpTransport` previously held two distinct `baseUrl` values: `config.baseUrl` (the raw instance URL) and a separate constructor parameter (the API-specific URL). Only the constructor argument was ever used for URL construction, making `config.baseUrl` a silent dead field inside the transport class and creating a confusing dual-source of truth. The redundant private field has been removed; clients now pass `{ ...resolved, baseUrl: apiUrl }` so `config.baseUrl` is the sole source used for URL construction. The second constructor parameter is retained as an optional, deprecated overload for backwards compatibility — when supplied it overrides `config.baseUrl` exactly as before, so existing call sites are unaffected.

## 0.4.0 (2026-04-16)

### Security

- **oauth** — `tokenEndpoint` is now validated to require HTTPS, preventing credential exfiltration to non-encrypted endpoints (SSRF)
- **oauth** — concurrent 401 responses now trigger exactly one token refresh via a shared `refreshPromise`, eliminating the race condition that could rotate refresh tokens multiple times
- **transport** — caller-supplied `Authorization` headers are stripped before merging so the configured auth provider always wins; prevents auth bypass via middleware
- **transport** — debug logging now records `method + path` only; query strings (which may contain cursor tokens or filter values) are no longer written to logs
- **errors** — `HttpError.toJSON()` omits `responseBody` so raw API payloads do not leak into log aggregators via `JSON.stringify(error)`
- **openapi** — schema names are validated as legal TypeScript identifiers; `*/` sequences in descriptions are escaped; single quotes in enum string values are escaped — prevents code injection in generated source
- **cache / batch** — cache and deduplication keys now `encodeURIComponent`-encode each query key and value, eliminating key-collision attacks via crafted query parameters
- **boards / sprints** — `boardId` and `sprintId` are validated as positive integers before URL interpolation
- **versions** — `versionNumber` is validated as a positive integer before URL interpolation
- **cli router** — `strict: false` removed; unknown CLI flags now throw instead of being silently swallowed (typos in `--token` no longer fall back to env-var auth unnoticed)
- **cli jira search** — positional argument as raw JQL removed; `--jql` is now required explicitly

### Changed

- **cache** — `createCacheMiddleware` throws `ValidationError` for `maxSize < 1` or `ttl ≤ 0` at construction time
- **openapi** — property names that are not valid JS identifiers (e.g. `content-type`) are now emitted as quoted keys (`'content-type'`)
- **openapi** — `additionalProperties: { type: … }` in object schemas now emits a typed index signature (`[key: string]: T`) rather than being silently dropped
- **openapi** — `generateTypes` return field was already `source`; README and ARCHITECTURE docs corrected to match
- **tsconfig.cjs** — `moduleResolution` kept at `Node10` (required by `module: CommonJS`); `ignoreDeprecations: "6.0"` added to silence TypeScript 6.x deprecation warning

## 0.3.0 (2026-04-15)

### Added

- **OAuth 2.0 token refresh** — `createOAuthRefreshMiddleware` automatically injects
  `Authorization: Bearer` and refreshes the access token on 401 responses, with an
  `onTokenRefreshed` callback for token persistence
- **Atlassian Connect JWT auth** — `createConnectJwtMiddleware` signs every request
  with HS256 JWT per the Atlassian Connect spec (QSH, iss, iat, exp claims); `computeQsh`
  and `signConnectJwt` exported for advanced use
- **Response caching** — `createCacheMiddleware` caches GET responses in memory with
  configurable TTL, max-size (FIFO eviction), and per-method opt-in
- **Request batching / deduplication** — `createBatchMiddleware` coalesces concurrent
  identical in-flight requests so only one HTTP call is made
- **OAuth scope detection** — `detectRequiredScopes` maps Atlassian operation names
  (e.g. `'jira.issues.create'`) to required Cloud OAuth 2.0 scopes; `listKnownOperations`
  for tooling and documentation
- **OpenAPI type generation** — `generateTypes` converts an OpenAPI 3.x
  `components.schemas` document into TypeScript `interface` and `type` declarations
  (supports `$ref`, `allOf`, `oneOf`, `anyOf`, enum, nullable, `additionalProperties`)
- `OAuthError` added to the public error hierarchy (code `'OAUTH_ERROR'`)

## 0.2.0 (2026-04-15)

### Added

- **Jira** — Issue comments resource (list, get, create, update, delete)
- **Jira** — Issue attachments resource (list, get, upload)
- **Jira** — Labels resource (list all labels)
- **Jira** — Agile boards resource (list, get, list issues)
- **Jira** — Sprints resource (get, create, update, delete, list issues)
- **Jira** — Workflows resource (list, get)
- **Jira** — Dashboards resource (list, get, create, update, delete)
- **Jira** — Filters resource (list, get, create, update, delete)
- **Jira** — Fields resource (list, listAll, create, update, delete)
- **Jira** — Webhooks resource (list, register, delete)
- **Jira** — JQL helpers (getAutocompleteData, parse, sanitize, getSuggestions)
- **Jira** — Bulk issue operations (createBulk, setPropertyBulk, deletePropertyBulk)
- **Confluence** — Attachment upload (multipart/form-data)
- **Confluence** — Content properties resource (list, get, create, update, delete)
- **Confluence** — Custom content resource (list, get, create, update, delete)
- **Confluence** — Whiteboards resource (get, create, delete)
- **Confluence** — Tasks resource (list, get, update)
- **Confluence** — Versions resource (list and get for pages and blog posts)
- Request/response logging abstraction via `Logger` interface
- Middleware / interceptor chain on `HttpTransport`
- TSDoc comments on all public types and methods
- CJS dual output (`dist/cjs/`) for CommonJS consumers
- GitHub Actions CI workflow enforcing build, type-check, lint, and 100% coverage
- Automated npm publish workflow

### Fixed

- Path traversal: all user-controlled path segments are now percent-encoded before
  URL construction; dot-segment sequences (`../`, `./`) are rejected with
  `ValidationError` across all Jira and Confluence resource methods
- CLI numeric options (`--limit`, `--max-results`, `--version-number`) validated and
  fail-fast on non-integer or out-of-range input
- Pagination sizes (`maxResults` / `pageSize`) reject zero, negative, and unbounded values
- Non-HTTPS `baseUrl` values are rejected at config resolution time

## 0.1.0 (2026-04-14)

### Added

- Confluence Cloud REST API v2 client
  - Pages, Spaces, Blog Posts, Comments (footer + inline), Attachments, Labels
  - Cursor-based pagination with async iterators
- Jira Cloud Platform REST API v3 client
  - Issues (CRUD + transitions), Projects, Search (JQL), Users, Issue Types, Priorities, Statuses
  - Offset-based pagination with async iterators
- Core infrastructure
  - Zero-dependency HTTP transport (native fetch)
  - Basic auth (email + API token) and Bearer auth (OAuth/PAT)
  - Retry with exponential backoff and jitter
  - Rate-limit handling (429 + Retry-After)
  - Timeout support via AbortController
  - Typed error hierarchy
- CLI (`atlas`) for both APIs
  - Command syntax: `atlas <api> <resource> <action> [options]`
  - JSON, table, and minimal output formats
  - Auth via flags or environment variables
