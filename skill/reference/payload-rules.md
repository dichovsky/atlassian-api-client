# Payload minimization rules

## Output policy

- Default to the smallest payload that answers the user.
- Prefer IDs/keys/names over full objects.
- Use `--format minimal` when downstream steps only need identifiers.

## Output parsing

`--format minimal` emits one line per record. Field extraction order is **id → key → name**. Pipe through `awk` / `cut` with this order assumption; do not assume `name` is first. For Jira issues this yields the issue key (e.g. `PROJ-123`); for Confluence pages it yields the page ID.

## Request policy

- Use strict filters (`--fields`, narrow JQL, resource IDs).
- Use explicit limits (`--limit`, `--max-results`).
- Continue pagination only when user asks for more.

## Data-shaping policy

- Truncate long text in summaries; keep source ID for retrieval.
- Avoid repeating unchanged context between steps.
- OpenAPI specs are implementation references, not CLI output formats. The pinned Jira snapshot in this package is JSON (`spec/jira-platform-v3.json`). CLI flags use JSON values where structured input is needed (e.g. `--body '{"fields":{"description":...}}'` on `atlas jira issues update`).

## First-try gotchas (read before constructing a command)

### Confluence: `pages update` requires `--version-number`

Confluence uses optimistic concurrency. Always pass `--version-number N+1` where N is the current version. Fetch the current version first with `atlas confluence pages get <id>` (→ `version.number`). Omitting `--version-number` fails the call with a version-mismatch error.

### Confluence: `pages create --body` — do NOT JSON-encode

Pass `--body` as raw content (Confluence storage format / plain text / markdown). Do NOT pre-wrap it in `{"storage":{"value":...}}` — the CLI wraps it for you. Double-encoding produces payloads that render as literal text.

### Jira: `issues update|create|transition` — other fields go in `--body`

The only per-field flags are `--summary` (`create`, `update`), `--project`/`--type`/`--parent` (`create`) and `--resolution` (`transition`). Everything else — description (ADF), assignee, labels, custom fields, `update` operations — goes in `--body` as a JSON object in Jira's `IssueUpdateDetails` shape. `--fields` is NOT a body flag (it is the comma-separated field filter for `issues get`):

```sh
atlas jira issues update PROJ-123 --summary "New title"
atlas jira issues update PROJ-123 --body '{"fields":{"description":{"type":"doc","version":1,"content":[]},"assignee":{"accountId":"5b10..."}}}'
atlas jira issues transition PROJ-123 --transition-id 31 --resolution Done
```

There is no `--description` or `--assignee` flag for these actions — `--assignee` fails with `Unknown option` and `--description` is silently ignored, so always put those fields in `--body`. Discrete flags override the same keys inside `--body`, and any `update` operations on those fields are dropped (Jira rejects a field in both `fields` and `update`).

### JQL: always single-quote for the shell

JQL contains spaces, parentheses, and operators that the shell interprets as metacharacters. Always wrap JQL in single quotes:

```sh
atlas jira search --jql 'project = PROJ AND status != Done'
atlas jira search --jql 'project = PROJ AND assignee = "john.doe@example.com"'
```

Inner double-quotes inside JQL do not need escaping when wrapped in single quotes.

## Escalation

Use TypeScript SDK (`import { ConfluenceClient, JiraClient } from 'atlassian-api-client'`) for:

- bulk orchestration across many resources (avoid hundreds of CLI subprocesses),
- custom transport (proxy, mTLS, logging) or middleware composition,
- programmatic pagination: `paginateCursor` (Confluence cursor), `paginateOffset` (Jira offset), `paginateSearch` (Jira search-API).
