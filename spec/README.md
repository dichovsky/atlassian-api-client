# OpenAPI Specs

Pinned snapshots of upstream Atlassian REST API specifications. Used by implementers and reviewers as the single source of truth for endpoint verb/path/body/query shapes during API-coverage work (see `CLAUDE.md` → PR Review HARD).

## Files

### `jira-platform-v3.json`

- **Source:** https://developer.atlassian.com/cloud/jira/platform/swagger-v3.v3.json
- **Pinned:** 2026-09-02
- **OpenAPI:** 3.0.1
- **Upstream version:** `1001.0.0-SNAPSHOT-52c82d8ebf8c89ab7a9eb0805cd63b984e7a1d4e`
- **Paths:** 421 (617 operations, 29 deprecated)
- **SHA-256:** `9029bb1c5ebd513494660bf4c7520281701ed0c984f4a3a1bd0505db29ae7b7d`
- **Contract fingerprint:** `ecba06ea28d7`

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
- **Pinned:** 2026-08-29
- **OpenAPI:** 3.0.3
- **Upstream version:** `2.0.0`
- **Paths:** 151 (218 operations, 1 deprecated)
- **SHA-256:** `451377c5a598ee8155acc11b611404f309bed4a4292ea87f88ed3bfed38fa0a8`
- **Contract fingerprint:** `dbd7f3110251`

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
