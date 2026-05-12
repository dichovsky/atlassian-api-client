---
name: atlassian-api-client-cli
description: |
  Use the atlas CLI (npm: atlassian-api-client) to read and write Confluence Cloud pages/spaces/comments and Jira Cloud issues/projects/searches from a shell. Covers auth setup, command shape, pagination, output formats, and the first-try gotchas that waste API calls.
  TRIGGER when: user wants to query, create, update, or delete Confluence or Jira Cloud data from the command line; agent needs to script Atlassian operations; user mentions `atlas`, `atlassian-api-client`, or asks "how do I CLI into Jira/Confluence".
  DO NOT TRIGGER when: user is asking about the TypeScript SDK API of this package (different surface, import from `atlassian-api-client` directly), Atlassian Server / Data Center (not Cloud), Bitbucket, Trello, or the Atlassian web UI.
version: 0.0.0-dev
source: atlassian-api-client npm package
---

# atlas CLI — Atlassian Confluence v2 + Jira v3 from the shell

This skill teaches you how to drive the `atlas` CLI shipped by the `atlassian-api-client` npm package. It covers Confluence Cloud REST API v2 (pages, spaces, blog-posts, comments, attachments, labels) and Jira Cloud Platform REST API v3 (issues, projects, search, users, issue-types, priorities, statuses).

Resource-by-resource flag matrices live in `reference/confluence.md` and `reference/jira.md`. Read those only when you need a flag or action that's not in the examples below.

## Auth — strict env-vars-only

Always read auth from environment variables. **Never** pass `--token` or `--email` on the command line: they get logged to shell history, agent transcripts, and CI logs.

| Env var               | Purpose                                       |
| --------------------- | --------------------------------------------- |
| `ATLASSIAN_BASE_URL`  | Tenant URL, e.g. `https://myco.atlassian.net` |
| `ATLASSIAN_AUTH_TYPE` | `basic` (default) or `bearer`                 |
| `ATLASSIAN_EMAIL`     | Email for basic auth; ignored for bearer      |
| `ATLASSIAN_API_TOKEN` | API token (basic) or bearer token             |

**Pre-flight check** before the first call in a session:

```sh
printenv ATLASSIAN_BASE_URL ATLASSIAN_API_TOKEN >/dev/null || echo "missing auth env"
```

If `ATLASSIAN_BASE_URL`, `ATLASSIAN_API_TOKEN`, or (for basic auth) `ATLASSIAN_EMAIL` is unset, **stop and ask the user**. Do not retry, do not invent a tenant URL, do not paste a token the user mentioned in chat into a flag.

## Command shape

```
atlas <api> <resource> <action> [positional-id] [--flags]
```

- `<api>` is `confluence` or `jira`.
- `<positional-id>` is the resource ID (page ID, issue key) when the action operates on a single entity.
- All other inputs are `--flag` options. Long form only — short flags `-u`/`-e`/`-t` exist but are reserved for auth and shouldn't be used.
- `--format json|table|minimal` controls output. Default `json`. Use `minimal` when you only need IDs for piping (`atlas jira search --jql "..." -f minimal`).
- `--help` works at every level: `atlas --help`, `atlas confluence --help`, `atlas jira --help`.

## First-try gotchas (read these before constructing a command)

1. **`pages update` requires `--version-number`.** Confluence uses optimistic concurrency. Get the current version first (`atlas confluence pages get <id>` → `version.number`), then update with `--version-number <n+1>`. Skipping it fails the call.
2. **`pages create --body` is wrapped server-side.** Pass plain markdown/storage content as a string. Do not pre-wrap it in `{"storage":{"value":...}}` — the CLI does that for you.
3. **`issues get --fields` and `--expand` are comma-separated.** `--fields summary,status,assignee`, not repeated `--fields` flags.
4. **`issues update` via the CLI only supports `--summary`.** For descriptions, custom fields, assignees, or anything else, use the TypeScript SDK directly (`import { JiraClient } from 'atlassian-api-client'`) — the CLI is intentionally narrow.
5. **JQL must be quoted for the shell.** `--jql "project = PROJ AND status = Open"`. Use single quotes outside, double inside, when the JQL contains shell metacharacters.
6. **Pagination differs by API.** Confluence returns a cursor in `_links.next` — pass it back as `--cursor`. Jira `search` uses `--max-results` and returns results inline; for large queries, narrow JQL or page through with `startAt`-aware SDK calls.
7. **`--format minimal` extracts `id`, then `key`, then `name`** in that order. For Jira issues that's the issue key (e.g. `PROJ-123`); for Confluence pages it's the page ID.

## Canonical examples

```sh
# Confluence: list pages in a space (paginated)
atlas confluence pages list --space-id 123456 --limit 25

# Confluence: get a page by ID
atlas confluence pages get 789012

# Confluence: create a page
atlas confluence pages create --space-id 123456 --title "Onboarding" --body "Welcome."

# Confluence: update a page (note --version-number)
atlas confluence pages update 789012 --version-number 3 --title "Onboarding v2" --body "..."

# Jira: get an issue with selected fields
atlas jira issues get PROJ-123 --fields summary,status,assignee

# Jira: create a bug
atlas jira issues create --project PROJ --type Bug --summary "Login button broken"

# Jira: search via JQL, minimal output for piping
atlas jira search --jql "project = PROJ AND status = 'In Progress'" --format minimal

# Jira: transition an issue (look up transition IDs first)
atlas jira issues transitions PROJ-123
atlas jira issues transition PROJ-123 --transition-id 31
```

## Errors and retries

- The CLI exits non-zero on any API error and prints `Error: <message>` to stderr.
- Transient network errors (`ECONNRESET`, `ECONNREFUSED`, `ENOTFOUND`, `EAI_AGAIN`) are retried internally with backoff before surfacing.
- 401 means auth env vars are wrong or expired — stop and ask the user; do not retry. 403 means the token lacks scope for that resource. 404 on a known-good ID often means the wrong tenant URL.
- Rate-limit (429) responses include `Retry-After` and are retried internally; if they keep failing, slow your call rate before retrying manually.

## When to drop down to the SDK

Use `import { ConfluenceClient, JiraClient } from 'atlassian-api-client'` instead of the CLI when you need:

- Bulk operations across many resources (avoid spawning hundreds of CLI subprocesses).
- Update fields the CLI doesn't expose (issue description, assignee, custom fields, ADF body authoring).
- Custom transport (proxy, mTLS, logging) or middleware composition.
- Programmatic pagination over Confluence cursors (`paginateCursor`) or Jira offset (`paginateOffset` / `paginateSearch`).

The CLI is a shell-friendly cover over the SDK; reach for the SDK when shell composition stops paying for itself.

## Reference

- `reference/confluence.md` — full Confluence resource × action × flags matrix.
- `reference/jira.md` — full Jira resource × action × flags matrix, JQL tips, transition workflow.

## Installing this skill yourself

Use the `--package` form below from a clean shell to avoid `npx` resolving an unrelated package named `atlas`. If `atlassian-api-client` is already in the current project's `node_modules`, the shorter `npx atlas …` form also works.

```sh
# User-wide install (default), into ~/.claude/skills/atlassian-api-client-cli
npx --package atlassian-api-client -- atlas install-skill

# Project-local install, into <cwd>/.claude/skills/atlassian-api-client-cli
npx --package atlassian-api-client -- atlas install-skill --local

# Print the bundled source path without copying (useful for symlinks)
npx --package atlassian-api-client -- atlas install-skill --print

# Preview what would be copied
npx --package atlassian-api-client -- atlas install-skill --dry-run

# Overwrite an existing install with a different version
npx --package atlassian-api-client -- atlas install-skill --force
```
