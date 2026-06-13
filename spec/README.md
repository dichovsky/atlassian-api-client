# OpenAPI Specs

Pinned snapshots of upstream Atlassian REST API specifications. Used by implementers and reviewers as the single source of truth for endpoint verb/path/body/query shapes during API-coverage work (see `CLAUDE.md` → PR Review HARD).

## Files

### `jira-platform-v3.json`

- **Source:** https://developer.atlassian.com/cloud/jira/platform/swagger-v3.v3.json
- **Pinned:** 2026-06-10
- **OpenAPI:** 3.0.1
- **Upstream version:** `1001.0.0-SNAPSHOT-32b43b28d3f0c3ee7f2535b395e90b205ac3bc6f`
- **Paths:** 420 (619 operations, 36 deprecated)
- **SHA-256:** `ae5e7e6d5e8078c44055f28741e865bd99114d211180173922dec292a25af1fa`

### `jira-software.json`

- **Source:** https://developer.atlassian.com/cloud/jira/software/swagger.v3.json
- **Pinned:** 2026-06-10
- **OpenAPI:** 3.0.1
- **Upstream version:** `1001.0.0`
- **Paths:** 78 (105 operations, 8 deprecated)
- **SHA-256:** `2aaf78263730deea491ac6909620c74ef49478affae51e6fef2d68c819fc5f99`

### `confluence-v2.json`

- **Source:** https://developer.atlassian.com/cloud/confluence/openapi-v2.v3.json
- **Pinned:** 2026-06-10
- **OpenAPI:** 3.0.3
- **Upstream version:** `2.0.0`
- **Paths:** 151 (218 operations, 1 deprecated)
- **SHA-256:** `21eac8301cc359d792cdf229f2fcb4920bf6b4256c56f429da1ab940e8c0a7f2`

## How to use

During implementation or review of an endpoint, grep the spec for the path or operation:

```bash
jq '.paths["/rest/api/3/workflowscheme/{id}"]' spec/jira-platform-v3.json
jq '.paths["/rest/api/3/workflowscheme/{id}"].put.requestBody' spec/jira-platform-v3.json
jq '.paths["/rest/agile/1.0/board/{boardId}/sprint"]' spec/jira-software.json
jq '.paths["/spaces/{id}/labels"]' spec/confluence-v2.json
```

When citing the spec in a PR description, reference the SHA-256 above so reviewers know which snapshot was checked.

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
```

Then update the SHA-256, pinned date, and upstream version above and open a `chore(spec):` PR.
