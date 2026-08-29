# Atlassian API interface refresh — 2026-08-30

This report records the implementation refresh against the current official Cloud interfaces:

- Confluence REST API v2
- Jira Platform REST API v3
- Jira Software/Agile and bundled DevOps integration APIs

The reviewed snapshots are pinned in [`spec/`](../spec/README.md). Their full SHA-256 values are:

| Interface        | Paths | Operations | SHA-256                                                            |
| ---------------- | ----: | ---------: | ------------------------------------------------------------------ |
| Jira Platform v3 |   421 |        617 | `7b92e6a64584be28d2222e38e8752db7b9f422aa91ed0d20995cfaf6168293d4` |
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
- Corrected archived-issue export, migration retrigger, workflow search, user/group picker, status search, field scheme, UI modification, project-role, and search-warning contracts.
- Completed current Jira Software scope recognition and operation mappings, including Security Information scopes.
- Added opt-in system-to-system OAuth proxy routing for Jira Software Development Information, Builds, and Deployments, with bearer-only validation and a narrowly scoped `api.atlassian.com` credential boundary.
- Made granular scope validation exhaustive for the pinned contracts: 38 Confluence, 33 Jira Software, and 180 Jira Platform Beta scopes (247 unique after overlap); classic Jira Platform `Current` scopes remain intentionally excluded.
- Removed silently ignored dashboard/project query options and aligned those SDK, CLI, and skill contracts with the current operation-specific parameters.
- Completed current Confluence Space list/get contracts and response projections, plus missing Page, Attachment, Label, Version, and Task options.
- Marked deprecated and experimental methods consistently in SDK and skill documentation; documented Forge-only `asApp()` requirements for Confluence app properties.
- Replaced the former parsing-only drift smoke test with a canonical contract fingerprint comparison covering routes, parameters, bodies, responses, schemas, and security metadata.
- Promoted the route-gap analyzer to a scheduled CI gate: unresolved SDK routes and uncovered non-deprecated operations now fail the job.

## Verification

Use the following checks for this snapshot:

```bash
npm run api-coverage
npm run spec-drift
npm run validate
```

The gap analyzer is a static route verifier. It does not replace authenticated integration tests against a real Atlassian tenant. Existing broad response-type debt tracked as B1056/B1059 remains separate from the live-delta work recorded here.
