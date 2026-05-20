# Jira reference — `atlas jira`

Jira Cloud Platform REST API v3 surface. Load this file when you need a flag or action the canonical examples in `SKILL.md` don't cover.

## Resource × action matrix

| Resource      | Actions                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `issues`      | `get`, `create`, `update`, `delete`, `transition`, `transitions`                                                                                                 |
| `projects`    | `list`, `get`                                                                                                                                                    |
| `search`      | (no sub-action; uses `--jql`)                                                                                                                                    |
| `users`       | `get`, `me`, `search`                                                                                                                                            |
| `issue-types` | `list`, `get`                                                                                                                                                    |
| `priorities`  | `list`, `get`                                                                                                                                                    |
| `statuses`    | `list`                                                                                                                                                           |
| `boards`      | `list-sprints`, `sprint-issues`                                                                                                                                  |
| `sprints`     | `get`, `create`, `update`, `delete`, `get-issues`, `partial-update`, `move-issues`, `list-properties`, `get-property`, `set-property`, `delete-property`, `swap` |

## `issues`

| Action        | Positional   | Required flags                     | Optional flags         |
| ------------- | ------------ | ---------------------------------- | ---------------------- |
| `get`         | `<issueKey>` | —                                  | `--fields`, `--expand` |
| `create`      | —            | `--project`, `--type`, `--summary` | —                      |
| `update`      | `<issueKey>` | —                                  | `--summary`            |
| `delete`      | `<issueKey>` | —                                  | —                      |
| `transitions` | `<issueKey>` | —                                  | —                      |
| `transition`  | `<issueKey>` | `--transition-id`                  | —                      |

- `--fields` and `--expand` are **comma-separated**, single flag. Example: `--fields summary,status,assignee --expand changelog,renderedFields`.
- `--project` takes the project key (e.g. `PROJ`), not the numeric ID.
- `--type` takes the issue type name (e.g. `Bug`, `Story`, `Task`). Names are case-sensitive and tenant-specific; list with `atlas jira issue-types list`.
- `update` via the CLI is intentionally narrow — only `--summary` is wired. Use the SDK for description, assignee, custom fields, ADF body content.
- Transition workflow: call `transitions` to list valid transitions for an issue's current status, then `transition` with the chosen `--transition-id`.

## `projects`

| Action | Positional         | Optional flags             |
| ------ | ------------------ | -------------------------- |
| `list` | —                  | `--query`, `--max-results` |
| `get`  | `<projectKeyOrId>` | —                          |

## `search`

```sh
atlas jira search --jql "<JQL>" [--max-results <n>] [--fields <csv>] [--expand <csv>]
```

No positional or action argument; the resource itself takes the JQL.

## `users`

| Action   | Positional    | Required flags | Optional flags  |
| -------- | ------------- | -------------- | --------------- |
| `get`    | `<accountId>` | —              | —               |
| `me`     | —             | —              | —               |
| `search` | —             | `--query`      | `--max-results` |

- `users me` returns the caller's profile — a fast way to verify auth env vars are working without touching tenant data.

## `issue-types` / `priorities` / `statuses`

All three are read-only lookups:

```sh
atlas jira issue-types list
atlas jira issue-types get <id>
atlas jira priorities list
atlas jira priorities get <id>
atlas jira statuses list
```

Use them to translate human-readable names into IDs when constructing issue create/update calls.

## JQL tips

- **Quoting in the shell**: `--jql "project = PROJ"` works. When the JQL itself contains double quotes, switch outer to single: `--jql 'project = PROJ AND status = "In Progress"'`.
- **Date ranges**: `created >= -7d` (last 7 days), `created >= "2026-01-01"`.
- **Empty assignee**: `assignee is EMPTY` (not `assignee = null`).
- **Order**: append `ORDER BY <field> DESC` at the end of the JQL string, not as a separate flag.
- **Reserved characters in values**: escape with backslash inside double-quoted values, e.g. `summary ~ "won\\'t fix"`.

## Pagination

Jira `search` uses offset-based pagination via `startAt` + `maxResults`. The CLI exposes `--max-results` for page size but not `--start-at`; for paging past the first batch, drop to the SDK:

```ts
import { JiraClient, paginateSearch } from 'atlassian-api-client';
const client = new JiraClient(config);
for await (const issue of paginateSearch(client, { jql: 'project = PROJ' })) {
  // ...
}
```

## Output shape notes

- `issues get` returns the full Jira issue including `fields.summary`, `fields.status.name`, etc. With `--format minimal` you get the issue key (`PROJ-123`).
- `search` returns `{ issues: [...], total, startAt, maxResults }`. Check `total > startAt + maxResults` to know if more pages exist.
- `transitions` returns `{ transitions: [{ id, name, to: { name } }, ...] }`. The `id` is what you pass to `--transition-id`.
- `users me` returns the caller's `accountId`, `emailAddress` (if visible to caller), and `displayName`.

## `boards`

List sprints and sprint issues scoped to a specific Agile board.

| Action          | Positionals            | Required | Optional flags                                     |
| --------------- | ---------------------- | -------- | -------------------------------------------------- |
| `list-sprints`  | `<boardId>`            | —        | `--state`, `--start-at`, `--max-results`           |
| `sprint-issues` | `<boardId> <sprintId>` | —        | `--jql`, `--fields`, `--start-at`, `--max-results` |

- `--state` accepts a comma-separated list of sprint states: `future`, `active`, `closed`. Example: `--state active,closed`.
- `--fields` is comma-separated, e.g. `--fields summary,status,assignee`.
- Both `boardId` and `sprintId` are numeric IDs (not names).
- `--start-at` is the 0-based offset for pagination.

```sh
# List all active sprints on board 1
atlas jira boards list-sprints 1 --state active

# List active and future sprints, page 2
atlas jira boards list-sprints 1 --state active,future --start-at 50 --max-results 50

# List issues in sprint 10 on board 1
atlas jira boards sprint-issues 1 10

# List issues with JQL filter and field selection
atlas jira boards sprint-issues 1 10 --jql "status = 'In Progress'" --fields summary,status,assignee
```

## `sprints`

Manage Agile sprints directly (not board-scoped). Supports full CRUD, partial patch, issue assignment.

| Action            | Positionals                | Required flags         | Optional flags                                              |
| ----------------- | -------------------------- | ---------------------- | ----------------------------------------------------------- |
| `get`             | `<sprintId>`               | —                      | —                                                           |
| `create`          | —                          | `--name`, `--board-id` | `--start-date`, `--end-date`, `--goal`                      |
| `update`          | `<sprintId>`               | —                      | `--name`, `--state`, `--start-date`, `--end-date`, `--goal` |
| `delete`          | `<sprintId>`               | —                      | —                                                           |
| `get-issues`      | `<sprintId>`               | —                      | `--jql`, `--fields`, `--start-at`, `--max-results`          |
| `partial-update`  | `<sprintId>`               | —                      | `--name`, `--state`, `--start-date`, `--end-date`, `--goal` |
| `move-issues`     | `<sprintId>`               | `--issues`             | —                                                           |
| `list-properties` | `<sprintId>`               | —                      | —                                                           |
| `get-property`    | `<sprintId> <propertyKey>` | —                      | —                                                           |
| `set-property`    | `<sprintId> <propertyKey>` | `--value`              | —                                                           |
| `delete-property` | `<sprintId> <propertyKey>` | —                      | —                                                           |
| `swap`            | `<sprintId>`               | `--with`               | —                                                           |

**Notes:**

- `update` uses **PUT** (full replace) — all current fields are overwritten. Supply every field you want to keep.
- `partial-update` uses **POST** (Atlassian patch semantics) — only the supplied fields are changed. Safe for single-field edits.
- `--state` accepts `active`, `closed`, or `future` only.
- `--issues` is **comma-separated** issue keys or IDs, e.g. `--issues PROJ-1,PROJ-2`. Max **50** per call; the client validates this before sending.
- `--fields` is comma-separated, e.g. `--fields summary,status,assignee`.
- `sprintId` and `--board-id` are numeric IDs (not names).
- Dates are ISO 8601: `--start-date 2026-06-01T00:00:00.000Z`.

**Properties notes (list-properties, get-property, set-property, delete-property):**

- `--value` accepts **any valid JSON**: objects, arrays, strings, numbers, booleans, and `null`. Examples: `--value '{"beta":true}'`, `--value '"hello"'`, `--value '42'`, `--value 'null'`.
- `propertyKey` is URL-encoded automatically — keys with spaces or special characters are safe to pass as-is.
- `get-property` response: `{ key: string, value: unknown }` — the caller must narrow `value` to the expected shape.
- Sprint properties are arbitrary key-value metadata; they do not affect sprint state or issue assignments.

**Swap notes (swap):**

- `--with` is the numeric ID of the sprint to swap rank with.
- Swapping a sprint with itself is rejected client-side before any network call.
- Swap operates on sprint **rank** (backlog ordering), not sprint state or dates.

```sh
# Get sprint details
atlas jira sprints get 42

# Create a new sprint on board 1
atlas jira sprints create --name "Sprint 5" --board-id 1 --start-date 2026-06-01T00:00:00.000Z --end-date 2026-06-14T00:00:00.000Z --goal "Ship billing module"

# Rename a sprint without touching other fields (partial-update, not update)
atlas jira sprints partial-update 42 --name "Sprint 5 (revised)"

# Close a sprint via partial-update
atlas jira sprints partial-update 42 --state closed

# Move issues into sprint 42 (comma-separated, max 50)
atlas jira sprints move-issues 42 --issues PROJ-1,PROJ-2,PROJ-3

# List sprint issues with JQL filter
atlas jira sprints get-issues 42 --jql "status != Done" --fields summary,status,assignee

# Full update (replaces all fields — use partial-update to patch)
atlas jira sprints update 42 --name "Sprint 5" --state active --start-date 2026-06-01T00:00:00.000Z --end-date 2026-06-14T00:00:00.000Z

# Delete a sprint
atlas jira sprints delete 42

# List all property keys for sprint 42
atlas jira sprints list-properties 42

# Get a specific property value
atlas jira sprints get-property 42 my-flag

# Set a property to a JSON object value
atlas jira sprints set-property 42 feature-flags --value '{"betaEnabled":true,"threshold":5}'

# Set a property to a scalar string
atlas jira sprints set-property 42 label --value '"in-progress"'

# Delete a property
atlas jira sprints delete-property 42 my-flag

# Swap the rank of sprint 42 with sprint 99
atlas jira sprints swap 42 --with 99
```

## Errors specific to Jira

- **401 with a known-good token** usually means the token is API-token (basic auth) but `ATLASSIAN_AUTH_TYPE=bearer` is set, or vice versa.
- **403 on `issues create`** typically means the token lacks "Create Issues" permission in the target project, not a global scope problem.
- **400 with `"errorMessages":["The value 'X' does not exist for the field 'project'."]`** — `--project` needs the project **key** (e.g. `PROJ`), not name or ID.
- **400 with custom-field errors** — the CLI can't set custom fields. Use the SDK with `fields: { customfield_10001: ... }`.
