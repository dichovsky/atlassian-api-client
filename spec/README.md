# OpenAPI Specs

Pinned snapshots of upstream Atlassian REST API specifications. Used by implementers and reviewers as the single source of truth for endpoint verb/path/body/query shapes during API-coverage work (see `CLAUDE.md` → Required Workflow (step 6) and Critical Invariants).

## Files

### `jira-platform-v3.json`

- **Source:** https://developer.atlassian.com/cloud/jira/platform/swagger-v3.v3.json
- **Pinned:** 2026-11-08
- **OpenAPI:** 3.0.1
- **Upstream version:** `1001.0.0-SNAPSHOT-30f301faa123fbef7f33006c52a9db372ad7afa7`
- **Paths:** 433 (630 operations, 29 deprecated)
- **SHA-256:** `2a7438c5feaa1fab2e64699cf3ed1b45685af3da356dbb987b216cd98adc12d0`
- **Contract fingerprint:** `d2bfad62f84c`

### `jira-software.json`

- **Source:** https://developer.atlassian.com/cloud/jira/software/swagger.v3.json
- **Pinned:** 2026-08-29
- **OpenAPI:** 3.0.1
- **Upstream version:** `1001.0.0`
- **Paths:** 78 (105 operations, 8 deprecated)
- **SHA-256:** `4e108d54b99064475c6ba0f986cce46dcace81336e034b58a5400b93174b927a`
- **Contract fingerprint:** `1b3a0fd3f68e`

### `confluence-v2.json`

- **Source:** https://developer.atlassian.com/cloud/confluence/openapi-v2.v3.json
- **Pinned:** 2026-11-08
- **OpenAPI:** 3.0.3
- **Upstream version:** `2.0.0`
- **Paths:** 165 (252 operations, 1 deprecated)
- **SHA-256:** `40535e2a2c01547d53d824d68299098c9073e5bf7ed98a71634706759becfa31`
- **Contract fingerprint:** `ad6d0bc5ad1f`

## How to use

During implementation or review of an endpoint, grep the spec for the path or operation:

```bash
jq '.paths["/rest/api/3/workflowscheme/{id}"]' spec/jira-platform-v3.json
jq '.paths["/rest/api/3/workflowscheme/{id}"].put.requestBody' spec/jira-platform-v3.json
jq '.paths["/rest/agile/1.0/board/{boardId}/sprint"]' spec/jira-software.json
jq '.paths["/spaces/{id}/labels"]' spec/confluence-v2.json
```

When citing the spec in a PR description, reference the SHA-256 above so reviewers know which snapshot was checked. `npm run spec-drift` compares a canonical contract fingerprint (routes, parameters, bodies, responses, schemas, and security metadata) while ignoring prose-only documentation changes. `npm run api-coverage` fails closed when a snapshot lacks valid OpenAPI 3.x metadata, paths, operations, or its expected server scope. It audits `GET`, `PUT`, `POST`, `DELETE`, `OPTIONS`, `HEAD`, `PATCH`, and `TRACE`; an unresolved Path Item `$ref` is rejected explicitly. The check also fails when a current operation has no SDK route, route extraction is unresolved, or an in-scope SDK request matches no pinned operation; deprecated omissions and the documented Confluence REST v1 upload exception are reported without failing the check.

## Re-pinning

To refresh the snapshots:

```bash
curl -fsSL -o spec/jira-platform-v3.json https://developer.atlassian.com/cloud/jira/platform/swagger-v3.v3.json
curl -fsSL -o spec/jira-software.json https://developer.atlassian.com/cloud/jira/software/swagger.v3.json
curl -fsSL -o spec/confluence-v2.json https://developer.atlassian.com/cloud/confluence/openapi-v2.v3.json
for f in spec/jira-platform-v3.json spec/jira-software.json spec/confluence-v2.json; do
  shasum -a 256 "$f"
  jq -r '.info.version' "$f"
done
npm run spec-drift
npm run api-coverage
```

Then update the SHA-256, contract fingerprint printed by `spec-drift`, pinned date, and upstream
version above. Review the semantic diff and update SDK/CLI/skill parity before opening the PR.
