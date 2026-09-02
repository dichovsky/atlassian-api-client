# Atlassian API interface refresh — 2026-08-30

This report records the implementation refresh against the current official Cloud interfaces:

- Confluence REST API v2
- Jira Platform REST API v3
- Jira Software/Agile and bundled DevOps integration APIs

The removals and behavior corrections recorded here are release-breaking and must ship in the next major version; see the Unreleased migration notes in [`CHANGELOG.md`](../CHANGELOG.md).

The reviewed snapshots are pinned in [`spec/`](../spec/README.md). Their full SHA-256 values are:

| Interface        | Paths | Operations | SHA-256                                                            |
| ---------------- | ----: | ---------: | ------------------------------------------------------------------ |
| Jira Platform v3 |   421 |        617 | `9029bb1c5ebd513494660bf4c7520281701ed0c984f4a3a1bd0505db29ae7b7d` |
| Jira Software    |    78 |        105 | `4e108d54b99064475c6ba0f986cce46dcace81336e034b58a5400b93174b927a` |
| Confluence v2    |   151 |        218 | `451377c5a598ee8155acc11b611404f309bed4a4292ea87f88ed3bfed38fa0a8` |

## Result

Deterministic method/path extraction after this refresh reports:

| Interface        | Implemented | Missing current |                     Missing deprecated |
| ---------------- | ----------: | --------------: | -------------------------------------: |
| Jira Platform v3 |     607/617 |               0 | 10 intentionally superseded operations |
| Jira Software    |     105/105 |               0 |                                      0 |
| Confluence v2    |     218/218 |               0 |                                      0 |

Confluence attachment upload remains one documented REST v1 dependency because Confluence v2 has no upload operation. It is classified outside the reviewed v2 surface.

## Implemented changes

- Added the current Jira grouped field-context default reader and experimental ADF limit report.
- Added both Jira Software board approximate-count operations.
- Removed the four workflow-transition-property operations removed by Atlassian in July 2026.
- Moved the default CLI issue search to `/rest/api/3/search/jql`; retained the old routes only as explicitly deprecated compatibility actions.
- Re-pinned Jira Platform v3 on 2026-09-01 and added the live `includeArchivedProjects` option to both current GET and POST JQL search, including the scoped `--include-archived-projects` CLI switch. Jira's default remains `false` when omitted.
- Re-pinned Jira Platform v3 again on 2026-09-02 after Atlassian added optional `StatusPayload.scope: 'GLOBAL'` for statuses nested in custom project-template workflow capabilities. The existing open `workflow` capability payload already accepts this additive field; the bundled skill now documents how to construct it.
- Corrected archived-issue export, migration retrigger, workflow search, user/group picker, status search, field scheme, UI modification, project-role, and search-warning contracts.
- Completed current Jira Software scope recognition and operation mappings, including Security Information scopes.
- Added opt-in system-to-system OAuth proxy routing for Jira Software Development Information, Builds, Deployments, and Feature Flag ingestion, with bearer-only validation and a narrowly scoped `api.atlassian.com` credential boundary. Deployment-gating status and non-ingest Feature Flag operations remain tenant-routed because they are not part of the proxy contract.
- Made scope validation exhaustive for the pinned contracts: 247 unique granular scopes referenced by operations, 8 additional granular catalog entries, and 16 classic or Jira Software compatibility scopes (271 recognized strings total). Operation recommendations remain granular.
- Removed silently ignored dashboard/project query options and aligned those SDK, CLI, and skill contracts with the current operation-specific parameters. Obsolete CLI flags now fail with targeted migration guidance, while `atlas jira projects list` exposes the full current `/project/search` query surface as the replacement for deprecated legacy filters.
- Made archived-issue export reject the removed JQL filter before any request and preserve Atlassian's task response envelope; fixed cursor-token forwarding for all aliases of the default Jira search command.
- Completed CLI/skill parity for current and legacy Jira search parameters, including expansions, returned properties, field-key mode, reconciliation IDs, archived-project inclusion, GET fail-fast, legacy validation modes, and offsets.
- Completed current Confluence Space list/get contracts and response projections, plus missing Page, Attachment, Label, Version, and Task options.
- Corrected Confluence page creation to the current conditional contract through an additive `CreatePageRequest` method input while preserving the public `CreatePageData` interface: only `spaceId` is unconditional, draft pages may omit `title`, and both flat and representation-keyed nested bodies are supported through the SDK and CLI. All newly added Page and Space contract components are available from the package-root export.
- Marked deprecated and experimental methods consistently in SDK and skill documentation; documented Forge-only `asApp()` requirements for Confluence app properties.
- Replaced the former parsing-only drift smoke test with a canonical contract fingerprint comparison covering routes, parameters, bodies, responses, schemas, and security metadata.
- Promoted the route-gap analyzer to a scheduled CI gate: invalid/empty specs or operations, malformed response codes or response objects, dangling local response references, root/path/operation server-scope drift, unresolved or unexpected SDK routes, and uncovered non-deprecated operations now fail the job. Runtime prefixes, assigned resource wiring, lexically visible path states, semantically verified route-preserving helper returns, request properties, and actual live request calls are located in a code-token-only lexical view and resolved from aligned source literals. Comments, literals, regexes, dead branches/calls/wiring, runtime route transformations, shadowed base aliases or imported pagination/query helpers, unsafe direct or destructuring reassignments, computed properties, imported-factory or object-mutator rewiring, escaped identifiers, route-overriding spreads, nested or non-public request callables, and unwired or duplicate resource classes cannot produce a false-green report. Nested resource modules are scanned recursively, and each declared client resource must have exactly one recognized, unconditional constructor assignment. All eight OpenAPI HTTP operation keys are audited, unresolved Path Item references fail explicitly, and the Confluence REST v1 exception is scoped to the exact attachment-upload verb/path.

The route analyzer is intentionally lexical and fail-closed: introducing a new resource-file idiom may require teaching the analyzer that construct before CI accepts it. Moving this extraction to the TypeScript compiler AST remains a future maintainability improvement rather than part of this contract refresh.

## Verification

Use the following checks for this snapshot:

```bash
npm run api-coverage
npm run spec-drift
npm run validate
```

The gap analyzer is a static route verifier. It does not replace authenticated integration tests against a real Atlassian tenant. Existing broad response-type debt tracked as B1056/B1059 remains separate from the live-delta work recorded here.
