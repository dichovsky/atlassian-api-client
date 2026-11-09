# Payload minimization rules

## Output policy

- Default to the smallest payload that answers the user.
- Prefer IDs/keys/names over full objects.
- Use `--format minimal` when downstream steps only need identifiers.

## Output parsing

`--format minimal` emits one line per record. List and search results are unwrapped, so `pages list`, `projects list` and `jira search` print one line per item (`results`, `values` or `issues`); an empty list prints nothing. Field extraction order is **id → key → name → accountId** (Jira users print their account ID). Pipe through `awk` / `cut` with this order assumption; do not assume `name` is first. Jira issues carry an `id`, so they yield the numeric issue ID (e.g. `10123`), not the key; for the key use `--format json` and read `.key` (e.g. `| jq -r '.issues[].key'`). Confluence pages yield the page ID.

Exact rules, in order:

1. An array response prints one line per element.
2. An object with a string or number `id`, or a string `key`, `name` or `accountId`, is one record and prints one line. A field of another type (e.g. an object `name`) does not count.
3. Any other object is a list envelope: its `results`, `values` or `issues` array (checked in that order), else its only array property (e.g. `transitions` from `jira issues transitions`), prints one line per item.
4. Each line is the record's `id` (string or number), else string `key`, else string `name`, else string `accountId`, else an empty line. A primitive prints as is.

So an object with none of those fields and no single array (e.g. `{ "count": 5 }` from `likes-count`) prints an empty line: use `--format json` for it.

## Boolean flags

Every flag that works bare (`--flag` with no value) is tri-state: `--flag`, `--flag true` or `--flag=true` sends `true`; `--flag false`, `--flag=false` or `--no-flag` sends `false` (except the flags below that only act when true); omitting it keeps the server default. Use this to turn off a default-true option, e.g. `atlas jira issues picker --query bug --show-sub-tasks false`. Only `true`/`false` are accepted: `--purge no` and `--purge=yes` are rejected, never read as `true`. Write `true`/`false`, never `1`/`0`: a `1` or `0` after the flag is not its value: the flag is set to `true` and the digit becomes a stray positional, so `atlas confluence pages delete 123 --purge 0` purges the page and `atlas jira issues delete K-1 --delete-subtasks 0` deletes its subtasks. `--no-flag` takes no value (`--no-flag true` is rejected), and giving one flag both values (`--flag --no-flag`) is rejected. A `true`/`false` word right after such a flag is its value, so put a positional with that text after `--`. Flags documented with a value list (e.g. `--validate-query strict|warn|none|true|false`) always need the value.

Some flags only act when true and the server default is false. For these, `--flag false` sends nothing, which is the same as omitting the flag. For example: `--delete-subtasks` and `--return-issue` (Jira `issues delete` / `issues update`), `--purge` and `--draft` (Confluence `pages delete`), and on Confluence `get` actions such as `blog-posts get`, `--get-draft` and the `--include-*` flags other than `--include-version` (which defaults to true, so `--include-version false` is sent).

## Values that start with `-`

Write a flag value that starts with `-` with `=`: `--sort=-created-date`, `--order-by=-favorite_count`, `--value=-1`. The space form `--sort -created-date` fails before any request with `Option '--sort' argument is ambiguous`. This covers every descending sort value (`-created-date`, `-modified-date`, `-title`, `-key`, ...).

## Request policy

- Use strict filters (`--fields`, narrow JQL, resource IDs).
- Use explicit limits (`--limit`, `--max-results`).
- Continue pagination only when user asks for more.

## Data-shaping policy

- Truncate long text in summaries; keep source ID for retrieval.
- Avoid repeating unchanged context between steps.
- OpenAPI specs are implementation references, not CLI output formats. The pinned Jira snapshot in this package is JSON (`spec/jira-platform-v3.json`). CLI flags use JSON values where structured input is needed (e.g. `--body '{"fields":{"description":...}}'` on `atlas jira issues update`).

## First-try gotchas (read before constructing a command)

### Confluence: `pages update` requires `--version-number`, `--title` and `--body`

Confluence uses optimistic concurrency. Always pass `--version-number N+1` where N is the current version. Fetch the current version first with `atlas confluence pages get <id>` (→ `version.number`). An update replaces the whole page, so `--title` and `--body` are required too (`--body ''` is allowed). The CLI checks all three before sending anything: a missing one fails with `Missing required option: --version-number` (or `--title`, `--body`) and no request is made. A stale `--version-number` is sent, and Confluence rejects it with 409.

### Confluence: `pages create --body` — do NOT JSON-encode

Pass `--body` as raw content in Confluence storage format (XHTML such as `<p>Hello</p>`), or pick `--body-representation wiki` (wiki markup) or `atlas_doc_format` (ADF JSON as a string). Plain text is stored as is. Markdown is not converted: it is stored as text and renders literally. Do NOT pre-wrap the value in `{"storage":{"value":...}}` — the CLI wraps it for you. Double-encoding produces payloads that render as literal text.

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
- programmatic pagination: the resources' `listAll*` / `searchAll` async generators, e.g. `for await (const page of client.pages.listAll({ spaceId }))`. The low-level `paginateCursor`, `paginateOffset` and `paginateSearch` helpers take a transport and a path, so they are only for code that builds its own requests.
