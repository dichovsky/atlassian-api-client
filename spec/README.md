# OpenAPI Specs

Pinned snapshots of upstream Atlassian REST API specifications. Used by implementers and reviewers as the single source of truth for endpoint verb/path/body/query shapes during API-coverage work (see `CLAUDE.md` → PR Review HARD).

## Files

### `jira-platform-v3.json`

- **Source:** https://developer.atlassian.com/cloud/jira/platform/swagger-v3.v3.json
- **Pinned:** 2026-05-30
- **OpenAPI:** 3.0.1
- **Upstream version:** `1001.0.0-SNAPSHOT-500abd49de29b046db51cf0460caa503167075c0`
- **Paths:** 420
- **SHA-256:** `d3934096d68f3ee316c9af46e1c6091d8313af2306d7dbdc28d940eb9872f766`

## How to use

During implementation or review of a Jira v3 endpoint, grep the spec for the path or operation:

```bash
jq '.paths["/rest/api/3/workflowscheme/{id}"]' spec/jira-platform-v3.json
jq '.paths["/rest/api/3/workflowscheme/{id}"].put.requestBody' spec/jira-platform-v3.json
```

When citing the spec in a PR description, reference the SHA-256 above so reviewers know which snapshot was checked.

## Re-pinning

To refresh the snapshot:

```bash
curl -fsSL -o spec/jira-platform-v3.json https://developer.atlassian.com/cloud/jira/platform/swagger-v3.v3.json
shasum -a 256 spec/jira-platform-v3.json
jq -r '.info.version' spec/jira-platform-v3.json
```

Then update the SHA-256, pinned date, and upstream version above and open a `chore(spec):` PR.
