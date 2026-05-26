# Payload minimization rules

## Output policy

- Default to the smallest payload that answers the user.
- Prefer IDs/keys/names over full objects.
- Use `--format minimal` when downstream steps only need identifiers.

## Request policy

- Use strict filters (`--fields`, narrow JQL, resource IDs).
- Use explicit limits (`--limit`, `--max-results`).
- Continue pagination only when user asks for more.

## Data-shaping policy

- Truncate long text in summaries; keep source ID for retrieval.
- Avoid repeating unchanged context between steps.
- YAML is the source-of-truth format for OpenAPI specs (NOT a CLI output flag). All CLI flags use JSON values where structured input is needed (e.g. `--fields '{"description":...}'`).

## First-try gotchas (read before constructing a command)

### Confluence: `pages update` requires `--version-number`

Confluence uses optimistic concurrency. Always pass `--version-number N+1` where N is the current version. Fetch the current version first with `atlas confluence pages get <id>` (→ `version.number`). Omitting `--version-number` fails the call with a version-mismatch error.

### Confluence: `pages create --body` — do NOT JSON-encode

Pass `--body` as raw content (Confluence storage format / plain text / markdown). Do NOT pre-wrap it in `{"storage":{"value":...}}` — the CLI wraps it for you. Double-encoding produces payloads that render as literal text.

### Jira: `issues update` only supports `--summary`

For `atlas jira issues update`, only `--summary` is a top-level flag. All other fields (description, assignee, custom fields) must go through `--fields` JSON:

```sh
atlas jira issues update PROJ-123 --summary "New title"
atlas jira issues update PROJ-123 --fields '{"description":{"type":"doc","version":1,"content":[]}}'
```

Attempting `--description` or `--assignee` as direct flags will fail; use the TypeScript SDK instead for complex updates.

### JQL: always single-quote for the shell

JQL contains spaces, parentheses, and operators that the shell interprets as metacharacters. Always wrap JQL in single quotes:

```sh
atlas jira search --jql 'project = PROJ AND status != Done'
atlas jira search --jql 'project = PROJ AND assignee = "john.doe@example.com"'
```

Inner double-quotes inside JQL do not need escaping when wrapped in single quotes.

## Escalation

Use TypeScript SDK for:

- bulk orchestration,
- unsupported CLI update fields,
- custom transport/middleware,
- programmatic pagination loops.
