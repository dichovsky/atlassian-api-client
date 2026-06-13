---
name: atlassian-api-client-cli
description: |
  Use the atlas CLI (npm: atlassian-api-client) to read and write Confluence Cloud pages/spaces/comments and Jira Cloud issues/projects/searches from a shell.
  TRIGGER when: user wants to query, create, update, or delete Confluence or Jira Cloud data from the command line; agent needs to script Atlassian operations; user mentions `atlas`, `atlassian-api-client`, or asks "how do I CLI into Jira/Confluence".
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
- If Jira action/flag mapping is needed: read `reference/jira.md` for the resource×action matrix, then the one domain file it points to under `reference/jira/` (e.g. `jira/issues.md`, `jira/agile.md`) for that resource's flags and examples — avoids loading the full Jira reference.

## Always-on rules

- Use env-var auth only (`ATLASSIAN_BASE_URL`, `ATLASSIAN_API_TOKEN`, and `ATLASSIAN_EMAIL` for basic auth).
- Never place secrets in CLI flags. Specifically avoid `--token <secret>` or `--email <addr>` in shell history, transcripts, CI logs, or chat. Use environment variables (`ATLASSIAN_API_TOKEN`, `ATLASSIAN_EMAIL`) or a config file with restricted permissions.
- Ask user for missing auth env; do not guess.
- Return minimal output first (`--format minimal` when IDs/keys are sufficient).
- Prefer pagination limits and cursors over bulk dumps.
- Use JSON-valued flags (e.g. `--body '{...}'`) for complex payloads; all resource operations are CLI-reachable.

## Command shape (compact schema)

```text
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

## Installing this skill

Use the `--package` form to avoid `npx` resolving an unrelated package named `atlas`:

```sh
npx --package atlassian-api-client -- atlas install-skill
npx --package atlassian-api-client -- atlas install-skill --local
```

The `--package` flag is required because the binary name `atlas` is also used by other packages. If `atlassian-api-client` is already in the current project's `node_modules`, `npx atlas install-skill` also works.
