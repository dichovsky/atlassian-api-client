---
name: atlassian-api-client-cli
description: |
  Operate Atlassian Cloud via `atlas` CLI with prompt-token-efficient, high-accuracy execution.
  TRIGGER when: user needs Jira/Confluence Cloud CLI operations or asks for `atlas` command construction.
  DO NOT TRIGGER when: request is for TypeScript SDK internals, Atlassian Server/Data Center, Bitbucket, Trello, or web UI workflows.
version: 0.0.0-dev
source: atlassian-api-client npm package
---

# atlas CLI router (Confluence v2 + Jira v3)

## Core objective

- Produce correct `atlas` commands for Atlassian Cloud.
- Minimize prompt+response tokens.
- Preserve execution safety and reliability.

## Routing

- If auth or host-validation is relevant: read `reference/auth-and-safety.md`.
- If shaping payloads/results is relevant: read `reference/payload-rules.md`.
- If user asks for command syntax/examples: read `reference/examples.md`.
- If Confluence action/flag mapping is needed: read `reference/confluence.md`.
- If Jira action/flag mapping is needed: read `reference/jira.md`.

## Always-on rules

- Use env-var auth only (`ATLASSIAN_BASE_URL`, `ATLASSIAN_API_TOKEN`, and `ATLASSIAN_EMAIL` for basic auth).
- Never place secrets in CLI flags.
- Ask user for missing auth env; do not guess.
- Return minimal output first (`--format minimal` when IDs/keys are sufficient).
- Prefer pagination limits and cursors over bulk dumps.
- Use SDK, not CLI, for unsupported complex updates.

## Command shape (compact schema)

```yaml
command: atlas <api> <resource> <action> [id] [--flags]
api: [confluence, jira]
format: [json, table, minimal]
help: atlas --help | atlas <api> --help
```

## Canonical quick checks

```sh
atlas confluence pages list --space-id 123456 --limit 25 --format minimal
atlas confluence pages get 789012
atlas jira issues get PROJ-123 --fields summary,status,assignee --format minimal
atlas jira search --jql "project = PROJ AND status = 'In Progress'" --max-results 25 --format minimal
atlas install-skill --local
atlas install-skill --print
```

`install-skill` is options-only: `atlas install-skill [--local|--path <dir>] [--print|--dry-run|--force]`.
