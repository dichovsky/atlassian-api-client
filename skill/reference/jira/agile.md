# Jira Software — Boards, sprints, epics, backlog

> Part of the `atlas` Jira skill reference. Resource×action matrix and routing in [`../jira.md`](../jira.md).

## `boards`

Full Agile board management: list, create, delete, and query board details, issues, epics, features, projects, versions, sprints, properties, quick filters, and reports.

| Action                | Positionals                 | Required flags                    | Optional flags                                                 |
| --------------------- | --------------------------- | --------------------------------- | -------------------------------------------------------------- |
| `list`                | —                           | —                                 | `--type`, `--name`, `--project`, `--start-at`, `--max-results` |
| `get`                 | `<boardId>`                 | —                                 | —                                                              |
| `create`              | —                           | `--name`, `--type`, `--filter-id` | —                                                              |
| `delete`              | `<boardId>`                 | —                                 | —                                                              |
| `backlog`             | `<boardId>`                 | —                                 | `--jql`, `--fields`, `--start-at`, `--max-results`             |
| `configuration`       | `<boardId>`                 | —                                 | —                                                              |
| `list-epics`          | `<boardId>`                 | —                                 | `--done`, `--start-at`, `--max-results`                        |
| `epic-issues`         | `<boardId> <epicId>`        | —                                 | `--jql`, `--fields`, `--start-at`, `--max-results`             |
| `issues-without-epic` | `<boardId>`                 | —                                 | `--jql`, `--fields`, `--start-at`, `--max-results`             |
| `get-features`        | `<boardId>`                 | —                                 | —                                                              |
| `toggle-feature`      | `<boardId>`                 | `--feature`, `--enabling`         | —                                                              |
| `get-issues`          | `<boardId>`                 | —                                 | `--jql`, `--fields`, `--start-at`, `--max-results`             |
| `move-issues`         | `<boardId>`                 | `--issues`                        | —                                                              |
| `list-projects`       | `<boardId>`                 | —                                 | `--start-at`, `--max-results`                                  |
| `list-projects-full`  | `<boardId>`                 | —                                 | `--start-at`, `--max-results`                                  |
| `list-sprints`        | `<boardId>`                 | —                                 | `--state`, `--start-at`, `--max-results`                       |
| `list-versions`       | `<boardId>`                 | —                                 | `--released`, `--start-at`, `--max-results`                    |
| `sprint-issues`       | `<boardId> <sprintId>`      | —                                 | `--jql`, `--fields`, `--start-at`, `--max-results`             |
| `list-by-filter`      | `<filterId>`                | —                                 | `--start-at`, `--max-results`                                  |
| `list-properties`     | `<boardId>`                 | —                                 | —                                                              |
| `delete-property`     | `<boardId> <propertyKey>`   | —                                 | —                                                              |
| `get-property`        | `<boardId> <propertyKey>`   | —                                 | —                                                              |
| `set-property`        | `<boardId> <propertyKey>`   | `--value`                         | —                                                              |
| `list-quickfilters`   | `<boardId>`                 | —                                 | `--start-at`, `--max-results`                                  |
| `get-quickfilter`     | `<boardId> <quickFilterId>` | —                                 | —                                                              |
| `get-reports`         | `<boardId>`                 | —                                 | —                                                              |

### Enhanced (JSIS) board issue actions

Non-deprecated, **token-paginated** replacements for the agile board issue listings (`backlog`, `get-issues`, `issues-without-epic`, `epic-issues`, `sprint-issues`). They hit Jira Software's `/rest/software/1.0` endpoints and return a single page shaped `{ issues, nextPageToken?, isLast?, ... }`. There is **no `--start-at`**: pass the previous response's `nextPageToken` back via `--next-page-token` to fetch the next page; stop when `isLast` is `true` (or `nextPageToken` is absent).

| Action                         | Positionals            | Required flags | Optional flags                                                                                                  |
| ------------------------------ | ---------------------- | -------------- | --------------------------------------------------------------------------------------------------------------- |
| `backlog-enhanced`             | `<boardId>`            | —              | `--jql`, `--fields`, `--max-results`, `--next-page-token`, `--reconcile-issues`, `--expand`, `--validate-query` |
| `get-issues-enhanced`          | `<boardId>`            | —              | `--jql`, `--fields`, `--max-results`, `--next-page-token`, `--reconcile-issues`, `--expand`, `--validate-query` |
| `issues-without-epic-enhanced` | `<boardId>`            | —              | `--jql`, `--fields`, `--max-results`, `--next-page-token`, `--reconcile-issues`, `--expand`, `--validate-query` |
| `epic-issues-enhanced`         | `<boardId> <epicId>`   | —              | `--jql`, `--fields`, `--max-results`, `--next-page-token`, `--reconcile-issues`, `--expand`, `--validate-query` |
| `sprint-issues-enhanced`       | `<boardId> <sprintId>` | —              | `--jql`, `--fields`, `--max-results`, `--next-page-token`, `--reconcile-issues`, `--expand`, `--validate-query` |

- `--next-page-token` is the opaque cursor echoed by the previous page's `nextPageToken`; omit it for the first page.
- `--reconcile-issues` is a comma-separated list of **positive integer issue IDs** to strongly reconcile (force-index) before searching, e.g. `--reconcile-issues 10001,10002`.
- `--validate-query true|false` controls server-side JQL validation. The server default is `true`, so pass `--validate-query false` to skip validation; omit the flag for the default. It is a tri-state filter — the value is required (`--validate-query` without a value is rejected).
- `--fields` is comma-separated field names (same as the non-enhanced actions); `--expand` is a single expand string.
- `--max-results` caps the page size; the server still controls the actual page boundary via `isLast`/`nextPageToken`.

**Notes:**

- `--type` accepts `scrum`, `kanban`, or `simple`.
- `--state` (for `list-sprints`) accepts comma-separated sprint states: `future`, `active`, `closed`.
- `--enabling` (for `toggle-feature`) accepts `true` or `false` — maps to the spec's boolean `enabling` field.
- `--feature` is the feature key string (e.g. `SIMPLE_ROADMAP`, `BACKLOG`, `SPRINTS`).
- `--issues` is comma-separated issue keys, e.g. `--issues PROJ-1,PROJ-2`.
- `--fields` is comma-separated field names, e.g. `--fields summary,status,assignee`.
- `--done true|false` (for `list-epics`) filters to only done or not-done epics; omit for all epics. Tri-state — the value is required.
- `--released` (boolean flag for `list-versions`) filters to released versions.
- `boardId`, `epicId`, `sprintId`, `filterId`, `--filter-id` are all numeric IDs.
- `--start-at` is the 0-based offset for pagination.
- `--value` accepts **any valid JSON**: objects, arrays, strings, numbers, booleans, and `null`. Examples: `--value '{"beta":true}'`, `--value '"hello"'`, `--value '42'`, `--value 'null'`.
- `propertyKey` is URL-encoded automatically — keys with spaces or special characters are safe to pass as-is.
- `get-property` response: `{ key: string, value: unknown }` — the caller must narrow `value` to the expected shape.
- Board properties are arbitrary key-value metadata stored on the board.

```sh
# List all boards (scrum type)
atlas jira boards list --type scrum

# List boards for a project
atlas jira boards list --project PROJ

# Get board details
atlas jira boards get 42

# Create a board linked to filter 5
atlas jira boards create --name "My Team Board" --type scrum --filter-id 5

# Delete a board
atlas jira boards delete 42

# Get backlog issues with JQL filter
atlas jira boards backlog 42 --jql "priority = High" --fields summary,assignee

# Get board configuration
atlas jira boards configuration 42

# List epics on a board (omit --done for all epics; --done true for completed, --done false for not-done)
atlas jira boards list-epics 42 --done true

# List issues in a specific epic
atlas jira boards epic-issues 42 7

# List issues not in any epic
atlas jira boards issues-without-epic 42

# Get board features
atlas jira boards get-features 42

# Disable a feature on a board
atlas jira boards toggle-feature 42 --feature SIMPLE_ROADMAP --enabling false

# Enable a feature on a board
atlas jira boards toggle-feature 42 --feature SIMPLE_ROADMAP --enabling true

# Get all issues on a board
atlas jira boards get-issues 42 --jql "status != Done" --fields summary,status

# Move issues onto a board
atlas jira boards move-issues 42 --issues PROJ-1,PROJ-2,PROJ-3

# List projects associated with a board
atlas jira boards list-projects 42

# List projects (full details) associated with a board
atlas jira boards list-projects-full 42

# List all active sprints on board 1
atlas jira boards list-sprints 1 --state active

# List active and future sprints, page 2
atlas jira boards list-sprints 1 --state active,future --start-at 50 --max-results 50

# List released versions for a board
atlas jira boards list-versions 42 --released

# List issues in sprint 10 on board 1
atlas jira boards sprint-issues 1 10

# List issues with JQL filter and field selection
atlas jira boards sprint-issues 1 10 --jql "status = 'In Progress'" --fields summary,status,assignee

# List boards associated with a specific filter
atlas jira boards list-by-filter 5

# List all property keys for board 42
atlas jira boards list-properties 42

# Get a specific property value
atlas jira boards get-property 42 my-flag

# Set a property to a JSON object value
atlas jira boards set-property 42 feature-flags --value '{"betaEnabled":true,"threshold":5}'

# Set a property to a scalar string
atlas jira boards set-property 42 label --value '"in-progress"'

# Delete a property
atlas jira boards delete-property 42 my-flag

# List quick filters for board 42
atlas jira boards list-quickfilters 42

# Get a specific quick filter
atlas jira boards get-quickfilter 42 7

# Get reports for board 42
atlas jira boards get-reports 42

# Enhanced (token-paginated) backlog — first page
atlas jira boards backlog-enhanced 42 --jql "priority = High" --fields summary,assignee --max-results 50

# Enhanced backlog — next page using the returned nextPageToken
atlas jira boards backlog-enhanced 42 --next-page-token "eyJvIjoxMH0="

# Enhanced board issue listing with reconcile + expand
atlas jira boards get-issues-enhanced 42 --reconcile-issues 10001,10002 --expand names

# Enhanced issues without an epic
atlas jira boards issues-without-epic-enhanced 42 --fields summary,status

# Enhanced issues for a specific epic
atlas jira boards epic-issues-enhanced 42 7 --max-results 25

# Enhanced issues for a specific sprint
atlas jira boards sprint-issues-enhanced 1 10 --jql "status = 'In Progress'"
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

### Enhanced (JSIS) sprint issue action

Non-deprecated, **token-paginated** replacement for `get-issues`. Hits Jira Software's `/rest/software/1.0/sprint/{sprintId}/issue` and returns a single page shaped `{ issues, nextPageToken?, isLast?, ... }`. There is **no `--start-at`**: pass the previous response's `nextPageToken` back via `--next-page-token` to fetch the next page; stop when `isLast` is `true` (or `nextPageToken` is absent).

| Action                | Positionals  | Required flags | Optional flags                                                                                                  |
| --------------------- | ------------ | -------------- | --------------------------------------------------------------------------------------------------------------- |
| `get-issues-enhanced` | `<sprintId>` | —              | `--jql`, `--fields`, `--max-results`, `--next-page-token`, `--reconcile-issues`, `--expand`, `--validate-query` |

- `--next-page-token` is the opaque cursor from the previous page's `nextPageToken`; omit for the first page.
- `--reconcile-issues` is a comma-separated list of **positive integer issue IDs** to force-index before searching, e.g. `--reconcile-issues 10001,10002`.
- `--validate-query true|false` controls server-side JQL validation; pass `false` to skip it, omit for the server default (`true`). Tri-state — the value is required.
- `--fields` is comma-separated field names; `--expand` is a single expand string.
- `sprintId` is a numeric ID (not a name).

```sh
# First page of sprint issues (token-paginated, non-deprecated)
atlas jira sprints get-issues-enhanced 42

# Filter with JQL and select fields
atlas jira sprints get-issues-enhanced 42 --jql "status = 'In Progress'" --fields summary,status,assignee

# Next page using token from previous response
atlas jira sprints get-issues-enhanced 42 --next-page-token <token>

# Force reconcile specific issues before search
atlas jira sprints get-issues-enhanced 42 --reconcile-issues 10001,10002 --jql "priority = High"
```

## `epic`

Manage Agile epics. Supports get, partial update (POST patch semantics), issue assignment, ranking, and epic-less issue queries.

| Action                 | Positionals     | Required flags          | Optional flags                                                                                                  |
| ---------------------- | --------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `get`                  | `<epicIdOrKey>` | —                       | —                                                                                                               |
| `update`               | `<epicIdOrKey>` | —                       | `--name`, `--summary`, `--color`, `--done`                                                                      |
| `issues`               | `<epicIdOrKey>` | —                       | `--jql`, `--fields`, `--start-at`, `--max-results`                                                              |
| `issues-enhanced`      | `<epicIdOrKey>` | —                       | `--jql`, `--fields`, `--max-results`, `--next-page-token`, `--reconcile-issues`, `--expand`, `--validate-query` |
| `move-issues`          | `<epicIdOrKey>` | `--issues`              | —                                                                                                               |
| `rank`                 | `<epicIdOrKey>` | `--before` or `--after` | `--custom-field`                                                                                                |
| `issues-none`          | —               | —                       | `--jql`, `--fields`, `--start-at`, `--max-results`                                                              |
| `issues-none-enhanced` | —               | —                       | `--jql`, `--fields`, `--max-results`, `--next-page-token`, `--reconcile-issues`, `--expand`, `--validate-query` |
| `remove-issues`        | —               | `--issues`              | —                                                                                                               |

**Notes:**

- `epicIdOrKey` accepts either a numeric ID (`42`) or an epic key (`PROJ-42`).
- `update` uses **POST** (Atlassian patch semantics) — only the supplied fields are changed. Safe for single-field edits.
- `--color` accepts the color key string, e.g. `color_1`, `color_2`. Check your Atlassian instance for valid values.
- `--done true|false` sets the epic's `done` field (`--done true` marks it done, `--done false` not-done); omit to leave it unchanged. Tri-state — the value is required.
- `--issues` is **comma-separated** issue keys or IDs, e.g. `--issues PROJ-1,PROJ-2`.
- `rank` requires exactly one of `--before` or `--after` (mutually exclusive).
- `--before` / `--after` accept an epic ID or key to rank the current epic before or after.
- `--custom-field` is an optional numeric ID of the rank custom field.
- `issues-none` returns all issues that are not assigned to any epic.
- `remove-issues` moves the specified issues out of their epics (sets epic link to none).
- `issues-enhanced` and `issues-none-enhanced` are the non-deprecated, **token-paginated** replacements for `issues` and `issues-none` — they hit `/rest/software/1.0` and do not accept `--start-at`.
- `epicIdOrKey` accepts either a numeric ID (`42`) or an epic key (`PROJ-42`); the value is path-encoded automatically.
- `--next-page-token` is the opaque cursor from the previous page's `nextPageToken`; omit for the first page.
- `--reconcile-issues` is a comma-separated list of **positive integer issue IDs** to force-index before searching, e.g. `--reconcile-issues 10001,10002`.
- `--validate-query true|false` controls server-side JQL validation; pass `false` to skip it, omit for the server default (`true`). Tri-state — the value is required.

```sh
# Get an epic by ID
atlas jira epic get 42

# Get an epic by key
atlas jira epic get PROJ-42

# Rename an epic
atlas jira epic update 42 --name "New Epic Name"

# Mark an epic as done and set summary
atlas jira epic update PROJ-42 --summary "All done" --done true

# List issues in an epic (deprecated agile, offset-paginated)
atlas jira epic issues 42

# List issues in an epic with JQL filter
atlas jira epic issues 42 --jql "status != Done" --fields summary,status,assignee

# List issues in an epic (token-paginated, non-deprecated)
atlas jira epic issues-enhanced 42

# List issues in an epic (token-paginated) with JQL filter and field selection
atlas jira epic issues-enhanced PROJ-42 --jql "status != Done" --fields summary,status,assignee

# Next page of epic issues using cursor from previous response
atlas jira epic issues-enhanced 42 --next-page-token <token>

# Force reconcile specific issues before searching
atlas jira epic issues-enhanced 42 --reconcile-issues 10001,10002

# Move issues into an epic
atlas jira epic move-issues 42 --issues PROJ-1,PROJ-2,PROJ-3

# Rank epic 42 before epic 99
atlas jira epic rank 42 --before 99

# Rank epic 42 after epic PROJ-5
atlas jira epic rank 42 --after PROJ-5

# List all issues without an epic (deprecated agile, offset-paginated)
atlas jira epic issues-none

# List issues without an epic with pagination
atlas jira epic issues-none --start-at 50 --max-results 50

# List all issues without an epic (token-paginated, non-deprecated)
atlas jira epic issues-none-enhanced

# List issues without an epic with JQL filter (token-paginated)
atlas jira epic issues-none-enhanced --jql "priority = High" --fields summary,status

# Remove issues from their epics
atlas jira epic remove-issues --issues PROJ-10,PROJ-11
```

## `backlog`

Move issues to the Agile backlog. Supports board-scoped (B235) and global (B236) variants via a single `move` action.

| Action | Positionals | Required flags | Optional flags |
| ------ | ----------- | -------------- | -------------- |
| `move` | —           | `--issues`     | `--board-id`   |

**Notes:**

- `--issues` is **comma-separated** issue keys or IDs, e.g. `--issues PROJ-1,PROJ-2`. Max **50** per call; the client validates this before sending.
- `--board-id` scopes the backlog operation to a specific board (calls `POST /rest/agile/1.0/backlog/{boardId}/issue`). Omit `--board-id` for the global backlog endpoint (`POST /rest/agile/1.0/backlog/issue`).
- Both variants return 204 No Content; the CLI returns `{ moved: true }`.

```sh
# Move issues to the backlog scoped to board 1 (B235)
atlas jira backlog move --board-id 1 --issues PROJ-1,PROJ-2

# Move issues to the global backlog (no board scope) (B236)
atlas jira backlog move --issues PROJ-3,PROJ-4
```
