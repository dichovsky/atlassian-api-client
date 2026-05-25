# Jira reference — `atlas jira`

Jira Cloud Platform REST API v3 surface. Load this file when you need a flag or action the canonical examples in `SKILL.md` don't cover.

## Resource × action matrix

| Resource                | Actions                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `issues`                | `get`, `create`, `update`, `delete`, `transition`, `transitions`, `get-agile`, `get-estimation`, `set-estimation`, `rank`                                                                                                                                                                                                                                                                                                |
| `projects`              | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `search`                | (no sub-action; uses `--jql`)                                                                                                                                                                                                                                                                                                                                                                                            |
| `users`                 | `get`, `me`, `search`                                                                                                                                                                                                                                                                                                                                                                                                    |
| `issue-types`           | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `issuetype`             | `create`, `delete`, `update`, `list-alternatives`, `load-avatar`, `list-properties`, `delete-property`, `get-property`, `set-property`, `list-for-project`                                                                                                                                                                                                                                                               |
| `priorities`            | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `statuses`              | `list`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `boards`                | `list`, `get`, `create`, `delete`, `backlog`, `configuration`, `list-epics`, `epic-issues`, `issues-without-epic`, `get-features`, `toggle-feature`, `get-issues`, `move-issues`, `list-projects`, `list-projects-full`, `list-sprints`, `list-versions`, `sprint-issues`, `list-by-filter`, `list-properties`, `delete-property`, `get-property`, `set-property`, `list-quickfilters`, `get-quickfilter`, `get-reports` |
| `sprints`               | `get`, `create`, `update`, `delete`, `get-issues`, `partial-update`, `move-issues`, `list-properties`, `get-property`, `set-property`, `delete-property`, `swap`                                                                                                                                                                                                                                                         |
| `epic`                  | `get`, `update`, `issues`, `move-issues`, `rank`, `issues-none`, `remove-issues`                                                                                                                                                                                                                                                                                                                                         |
| `backlog`               | `move`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `announcement-banner`   | `get`, `update`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `application-role`      | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `data-policy`           | `get-workspace`, `list-projects`                                                                                                                                                                                                                                                                                                                                                                                         |
| `webhooks`              | `list-failed`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `status`                | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `status-category`       | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `server-info`           | `get`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `instance`              | `get-license`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `mypermissions`         | `get`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `auditing`              | `list`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `events`                | `list`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `changelog`             | `bulk-fetch`                                                                                                                                                                                                                                                                                                                                                                                                             |
| `forge`                 | `bulk-panel-action`                                                                                                                                                                                                                                                                                                                                                                                                      |
| `incidents`             | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `post-incident-reviews` | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `vulnerability`         | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `devopscomponents`      | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `groups`                | `picker`                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `group-user-picker`     | `pick`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `security-level`        | `get`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `license`               | `get-approximate-count`, `get-approximate-count-for-product`                                                                                                                                                                                                                                                                                                                                                             |
| `settings`              | `get-columns`, `set-columns`                                                                                                                                                                                                                                                                                                                                                                                             |
| `redact`                | `start`, `get-status`                                                                                                                                                                                                                                                                                                                                                                                                    |
| `flag`                  | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `task`                  | `get`, `cancel`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `avatar`                | `list-system`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `custom-field-option`   | `get`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `classification-levels` | `list`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `latest`                | `bulk-worklog`                                                                                                                                                                                                                                                                                                                                                                                                           |
| `remote-link`           | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `service-registry`      | `get`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `exists-by-properties`  | `get`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `app`                   | `get-field-context-configuration`, `update-field-context-configuration`, `update-field-value`, `list-field-context-configurations`, `bulk-update-field-value`, `get-dynamic-modules`, `register-dynamic-modules`, `delete-dynamic-modules`, `list-forge-properties`, `get-forge-property`, `set-forge-property`, `delete-forge-property`                                                                                 |

## `incidents`

**URL base:** `/rest/operations/1.0` (Jira Operations / JSM Incident Management API — not `/rest/api/3`).

| Action   | Positional     | Required flags | Optional flags |
| -------- | -------------- | -------------- | -------------- |
| `get`    | `<incidentId>` | —              | —              |
| `delete` | `<incidentId>` | —              | —              |

```sh
# Get an incident by ID
atlas jira incidents get INC-123

# Delete an incident by ID
atlas jira incidents delete INC-123
```

## `post-incident-reviews`

**URL base:** `/rest/operations/1.0` (Jira Operations / JSM Incident Management API — not `/rest/api/3`).

| Action   | Positional   | Required flags | Optional flags |
| -------- | ------------ | -------------- | -------------- |
| `get`    | `<reviewId>` | —              | —              |
| `delete` | `<reviewId>` | —              | —              |

```sh
# Get a post-incident review by ID
atlas jira post-incident-reviews get PIR-456

# Delete a post-incident review by ID
atlas jira post-incident-reviews delete PIR-456
```

## `vulnerability`

**URL base:** `/rest/security/1.0` (Jira Security API — not `/rest/api/3`).

| Action   | Positional          | Required flags | Optional flags |
| -------- | ------------------- | -------------- | -------------- |
| `get`    | `<vulnerabilityId>` | —              | —              |
| `delete` | `<vulnerabilityId>` | —              | —              |

```sh
# Get a vulnerability by ID
atlas jira vulnerability get VULN-789

# Delete a vulnerability by ID
atlas jira vulnerability delete VULN-789
```

## `devopscomponents`

**URL base:** `/rest/devopscomponents/1.0` (Jira DevOps Components API — not `/rest/api/3`).

| Action   | Positional      | Required flags | Optional flags |
| -------- | --------------- | -------------- | -------------- |
| `get`    | `<componentId>` | —              | —              |
| `delete` | `<componentId>` | —              | —              |

```sh
# Get a DevOps component by ID
atlas jira devopscomponents get COMP-101

# Delete a DevOps component by ID
atlas jira devopscomponents delete COMP-101
```

## `application-role`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `list` | —          | —              | —              |
| `get`  | —          | `--key`        | —              |

```sh
# List all application roles
atlas jira application-role list

# Get a specific application role by key
atlas jira application-role get --key jira-software
```

## `data-policy`

| Action          | Positional | Required flags | Optional flags                         |
| --------------- | ---------- | -------------- | -------------------------------------- |
| `get-workspace` | —          | —              | —                                      |
| `list-projects` | —          | —              | `--ids`, `--start-at`, `--max-results` |

- `get-workspace` returns `{ anyContentBlocked: boolean }` for the entire Jira workspace.
- `list-projects` returns a paginated list of per-project data policy entries. Each entry has `projectId` and `anyContentBlocked`.
- `--ids` is a **comma-separated** list of project IDs to filter by. Omit to return all projects.
- `--start-at` and `--max-results` control offset-based pagination.

```sh
# Check whether any content is blocked at workspace level
atlas jira data-policy get-workspace

# List data policies for all projects
atlas jira data-policy list-projects

# List data policies for specific projects
atlas jira data-policy list-projects --ids 10001,10002

# Paginate through project data policies
atlas jira data-policy list-projects --start-at 0 --max-results 50
```

## `announcement-banner`

| Action   | Positional | Required flags | Optional flags              |
| -------- | ---------- | -------------- | --------------------------- |
| `get`    | —          | —              | —                           |
| `update` | —          | —              | `--message`, `--visibility` |

- `--visibility` must be `PUBLIC` or `PRIVATE`.
- All `update` fields are optional — supply only the fields you want to change.

```sh
# Get the current announcement banner
atlas jira announcement-banner get

# Update the banner message
atlas jira announcement-banner update --message "Scheduled maintenance tonight at 22:00 UTC"

# Set the banner to private and change message
atlas jira announcement-banner update --message "Internal notice" --visibility PRIVATE
```

## `issues`

### Standard (v3 API)

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

### Agile (v1.0 API) — B265–B268

These actions hit `/rest/agile/1.0/issue/…` and return agile-enriched shapes (sprint membership, estimation fields).

| Action           | Positional   | Required flags | Optional flags                          |
| ---------------- | ------------ | -------------- | --------------------------------------- |
| `get-agile`      | `<issueKey>` | —              | —                                       |
| `get-estimation` | `<issueKey>` | —              | `--board-id`                            |
| `set-estimation` | `<issueKey>` | `--value`      | `--board-id`                            |
| `rank`           | —            | `--issues`     | `--before`, `--after`, `--custom-field` |

- `get-agile` returns the issue with agile fields (sprint, epic link, estimation) populated — a superset of `issues get` for boards context.
- `get-estimation` / `set-estimation`: `--board-id` selects which board's estimation field configuration to use. Required when multiple boards with different field configs share the same project.
- `--value` for `set-estimation` is a **string** (e.g. `--value 5`). Pass `--value null` to clear the estimate.
- `rank --issues` is **comma-separated** issue keys or IDs (e.g. `--issues PROJ-1,PROJ-2`).
- `--before` and `--after` are **mutually exclusive** — rank the issues immediately before or after the named reference issue.
- `--custom-field` is the numeric ID of the rank custom field when the board uses a non-default rank field.

```sh
# Get agile view of an issue (includes sprint, estimation, epic)
atlas jira issues get-agile PROJ-42

# Get the estimation for an issue (board-specific estimation field)
atlas jira issues get-estimation PROJ-42 --board-id 1

# Set estimation to 5 story points on board 1
atlas jira issues set-estimation PROJ-42 --value 5 --board-id 1

# Clear the estimation
atlas jira issues set-estimation PROJ-42 --value null

# Rank PROJ-1 and PROJ-2 immediately before PROJ-3
atlas jira issues rank --issues PROJ-1,PROJ-2 --before PROJ-3

# Rank PROJ-1 immediately after PROJ-5
atlas jira issues rank --issues PROJ-1 --after PROJ-5
```

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

## `issuetype`

Singular `issuetype` resource: covers create/update/delete and the related sub-resources
(alternatives, avatar upload, entity properties, project mapping). The read-only
`issue-types` list/get above continues to handle the GET-by-id and list-all endpoints.

| Action              | Positional                    | Required flags       | Optional flags                                                         |
| ------------------- | ----------------------------- | -------------------- | ---------------------------------------------------------------------- |
| `create`            | —                             | `--name`             | `--description`, `--type subtask\|standard`, `--hierarchy-level <int>` |
| `delete`            | `<id>`                        | —                    | `--alternative-id <id>`                                                |
| `update`            | `<id>`                        | one of below         | `--name`, `--description`, `--avatar-id <int>`                         |
| `list-alternatives` | `<id>`                        | —                    | —                                                                      |
| `load-avatar`       | `<id>`                        | `--file`, `--size`   | `--x <int>`, `--y <int>`                                               |
| `list-properties`   | `<issueTypeId>`               | —                    | —                                                                      |
| `delete-property`   | `<issueTypeId> <propertyKey>` | —                    | —                                                                      |
| `get-property`      | `<issueTypeId> <propertyKey>` | —                    | —                                                                      |
| `set-property`      | `<issueTypeId> <propertyKey>` | `--value <JSON>`     | —                                                                      |
| `list-for-project`  | —                             | `--project-id <int>` | —                                                                      |

```sh
# Create a new issue type (use --hierarchy-level 0 for standard, -1 for sub-task)
atlas jira issuetype create --name "Spike" --description "Investigation" --hierarchy-level 0

# Update name and/or avatar
atlas jira issuetype update 10001 --name "Spike v2" --avatar-id 10300

# Delete; --alternative-id is required when issues of this type exist
atlas jira issuetype delete 10001 --alternative-id 10000

# Valid replacement types when migrating issues off a type
atlas jira issuetype list-alternatives 10001

# Upload a new avatar image. `--size` is the side length of the (square) crop region.
atlas jira issuetype load-avatar 10001 --file ./icon.png --size 48 --x 0 --y 0

# Entity properties (arbitrary per-issue-type key/value JSON storage)
atlas jira issuetype list-properties 10001
atlas jira issuetype get-property 10001 reviewed
atlas jira issuetype set-property 10001 reviewed --value true
atlas jira issuetype delete-property 10001 reviewed

# List issue types assigned to a project (numeric --project-id, not key)
atlas jira issuetype list-for-project --project-id 10000
```

Notes:

- `load-avatar` reads `--file` from disk and POSTs the raw bytes as multipart form
  data with `X-Atlassian-Token: no-check`. The crop region (`--size`, optional `--x`/`--y`)
  is passed as query parameters.
- `set-property` accepts any valid JSON (`true`, `42`, `"text"`, `{"a":1}`).
- `list-for-project` requires a numeric `--project-id`; use `projects list` to map a
  key to its ID first.
- `delete` returns `{deleted: true}`; the server responds with 204 No Content.

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
| `toggle-feature`      | `<boardId>`                 | `--feature`, `--state`            | —                                                              |
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

**Notes:**

- `--type` accepts `scrum`, `kanban`, or `simple`.
- `--state` (for `list-sprints`) accepts comma-separated sprint states: `future`, `active`, `closed`.
- `--state` (for `toggle-feature`) accepts `ENABLED` or `DISABLED` (uppercase).
- `--feature` is the feature key string (e.g. `SIMPLE_ROADMAP`, `BACKLOG`, `SPRINTS`).
- `--issues` is comma-separated issue keys, e.g. `--issues PROJ-1,PROJ-2`.
- `--fields` is comma-separated field names, e.g. `--fields summary,status,assignee`.
- `--done` (boolean flag for `list-epics`) filters to only done or not-done epics.
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

# List all epics on a board (not done)
atlas jira boards list-epics 42 --done false

# List issues in a specific epic
atlas jira boards epic-issues 42 7

# List issues not in any epic
atlas jira boards issues-without-epic 42

# Get board features
atlas jira boards get-features 42

# Disable a feature on a board
atlas jira boards toggle-feature 42 --feature SIMPLE_ROADMAP --state DISABLED

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

## `epic`

Manage Agile epics. Supports get, partial update (POST patch semantics), issue assignment, ranking, and epic-less issue queries.

| Action          | Positionals     | Required flags          | Optional flags                                     |
| --------------- | --------------- | ----------------------- | -------------------------------------------------- |
| `get`           | `<epicIdOrKey>` | —                       | —                                                  |
| `update`        | `<epicIdOrKey>` | —                       | `--name`, `--summary`, `--color`, `--done`         |
| `issues`        | `<epicIdOrKey>` | —                       | `--jql`, `--fields`, `--start-at`, `--max-results` |
| `move-issues`   | `<epicIdOrKey>` | `--issues`              | —                                                  |
| `rank`          | `<epicIdOrKey>` | `--before` or `--after` | `--custom-field`                                   |
| `issues-none`   | —               | —                       | `--jql`, `--fields`, `--start-at`, `--max-results` |
| `remove-issues` | —               | `--issues`              | —                                                  |

**Notes:**

- `epicIdOrKey` accepts either a numeric ID (`42`) or an epic key (`PROJ-42`).
- `update` uses **POST** (Atlassian patch semantics) — only the supplied fields are changed. Safe for single-field edits.
- `--color` accepts the color key string, e.g. `color_1`, `color_2`. Check your Atlassian instance for valid values.
- `--done` is a boolean flag; passing it sets `done: true` on the epic.
- `--issues` is **comma-separated** issue keys or IDs, e.g. `--issues PROJ-1,PROJ-2`.
- `rank` requires exactly one of `--before` or `--after` (mutually exclusive).
- `--before` / `--after` accept an epic ID or key to rank the current epic before or after.
- `--custom-field` is an optional numeric ID of the rank custom field.
- `issues-none` returns all issues that are not assigned to any epic.
- `remove-issues` moves the specified issues out of their epics (sets epic link to none).

```sh
# Get an epic by ID
atlas jira epic get 42

# Get an epic by key
atlas jira epic get PROJ-42

# Rename an epic
atlas jira epic update 42 --name "New Epic Name"

# Mark an epic as done and set summary
atlas jira epic update PROJ-42 --summary "All done" --done

# List issues in an epic
atlas jira epic issues 42

# List issues in an epic with JQL filter
atlas jira epic issues 42 --jql "status != Done" --fields summary,status,assignee

# Move issues into an epic
atlas jira epic move-issues 42 --issues PROJ-1,PROJ-2,PROJ-3

# Rank epic 42 before epic 99
atlas jira epic rank 42 --before 99

# Rank epic 42 after epic PROJ-5
atlas jira epic rank 42 --after PROJ-5

# List all issues without an epic
atlas jira epic issues-none

# List issues without an epic with pagination
atlas jira epic issues-none --start-at 50 --max-results 50

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

## `webhooks`

| Action        | Positionals | Required flags | Optional flags             |
| ------------- | ----------- | -------------- | -------------------------- |
| `list-failed` | —           | —              | `--max-results`, `--after` |

**Notes:**

- `list-failed` calls `GET /rest/api/3/webhook/failed` and returns a page of failed webhook deliveries.
- `--after` accepts a Unix timestamp in **milliseconds** (e.g. `--after 1700000000000`). Only deliveries with a failure time after this value are returned.
- `--max-results` caps the number of results in a single page.
- The SDK exposes `listFailed()` (single page) and `listAllFailed()` (async generator) on `client.webhooks`.

```sh
# List failed webhook deliveries (default page size)
atlas jira webhooks list-failed

# List failed webhooks since a specific timestamp
atlas jira webhooks list-failed --after 1700000000000

# Limit the result set
atlas jira webhooks list-failed --max-results 20
```

## `status`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `list` | —          | —              | —              |
| `get`  | `idOrName` | —              | —              |

```sh
# List all workflow statuses
atlas jira status list

# Get a specific status by id or name
atlas jira status get 10001
atlas jira status get "In Progress"
```

## `status-category`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `list` | —          | —              | —              |
| `get`  | `idOrKey`  | —              | —              |

**Notes:**

- `idOrKey` accepts either the numeric id (e.g. `2`) or the category key (e.g. `new`, `indeterminate`, `done`).

```sh
# List all status categories
atlas jira status-category list

# Get a specific status category by id
atlas jira status-category get 2

# Get a specific status category by key
atlas jira status-category get done
```

## `server-info`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `get`  | —          | —              | —              |

- Returns Jira version, build number, server time, deployment type, and optional health checks.

```sh
# Get Jira server info
atlas jira server-info get
```

## `instance`

| Action        | Positional | Required flags | Optional flags |
| ------------- | ---------- | -------------- | -------------- |
| `get-license` | —          | —              | —              |

- Returns the instance license with a list of licensed applications and their plans (`FREE`, `STANDARD`, `PREMIUM`, `ENTERPRISE`).

```sh
# Get instance license information
atlas jira instance get-license
```

## `mypermissions`

| Action | Positional | Required flags | Optional flags                                                                                                                                  |
| ------ | ---------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `get`  | —          | —              | `--project-id`, `--project-key`, `--issue-id`, `--issue-key`, `--permissions`, `--project-uuid`, `--project-configuration-uuid`, `--comment-id` |

- Without any scope flags, returns all permissions for the current user globally.
- Use `--permissions` with a **comma-separated** list of permission keys to filter results (e.g. `BROWSE_PROJECTS,CREATE_ISSUES`).
- Scope flags narrow the check to a specific project or issue context.

```sh
# Get all permissions for the current user
atlas jira mypermissions get

# Check permissions in a specific project by key
atlas jira mypermissions get --project-key PROJ

# Check specific permissions for an issue
atlas jira mypermissions get --issue-key PROJ-42 --permissions BROWSE_PROJECTS,EDIT_ISSUES
```

## `auditing`

| Action | Positional | Required flags | Optional flags                                      |
| ------ | ---------- | -------------- | --------------------------------------------------- |
| `list` | —          | —              | `--offset`, `--limit`, `--filter`, `--from`, `--to` |

- `--offset` — zero-based pagination offset (default 0).
- `--limit` — maximum records per page (1–1000; default 1000 per Jira).
- `--filter` — fuzzy-text filter applied to `summary` and `category`.
- `--from` / `--to` — ISO-8601 datetimes bounding the `created` timestamp range.
- Requires **Jira Administrator** global permission; 403 for non-admins.

```sh
# List recent audit records
atlas jira auditing list

# Filter by keyword and date range
atlas jira auditing list --filter "project" --from 2024-01-01T00:00:00+00:00 --to 2024-12-31T23:59:59+00:00

# Paginate
atlas jira auditing list --offset 100 --limit 50
```

## `events`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `list` | —          | —              | —              |

- Returns all Jira issue events — the named event types used in workflow conditions, validators, and post-functions.
- Each event has `id` (number) and `name` (string).

```sh
# List all Jira events
atlas jira events list
```

## `changelog`

| Action       | Positional | Required flags | Optional flags                                               |
| ------------ | ---------- | -------------- | ------------------------------------------------------------ |
| `bulk-fetch` | —          | `--issues`     | `--author-ids`, `--field-ids`, `--start-at`, `--max-results` |

- `--issues` — **comma-separated** list of issue IDs or keys (e.g. `PROJ-1,PROJ-2,10001`). Required.
- `--author-ids` — **comma-separated** account IDs to filter changelog entries by author.
- `--field-ids` — **comma-separated** field IDs; only entries containing changes to these fields are returned.
- `--start-at` / `--max-results` — standard offset pagination controls.
- Endpoint: `POST /rest/api/3/changelog/bulkfetch`.

```sh
# Fetch changelogs for two issues
atlas jira changelog bulk-fetch --issues PROJ-1,PROJ-2

# Filter to status changes only
atlas jira changelog bulk-fetch --issues PROJ-1,PROJ-2 --field-ids status

# Paginate through a large result set
atlas jira changelog bulk-fetch --issues PROJ-1 --start-at 0 --max-results 50
```

## `forge`

| Action              | Positional | Required flags | Optional flags |
| ------------------- | ---------- | -------------- | -------------- |
| `bulk-panel-action` | —          | `--value`      | —              |

- `--value` — JSON array of panel action objects; each must have `issueId` (string) and `moduleKey` (string), and optionally `payload` (object).
- **Auth:** Requires OAuth 2.0 (3LO) with `manage:jira-configuration` scope. Basic auth (API token) is NOT accepted. Use `--auth-type bearer --token <OAUTH_TOKEN>`.
- **URL base:** `POST /rest/api/3/forge/panel/action/bulk/async` — uses the standard REST API base, not a Forge tunnel.
- Returns a `taskId` that can be used to poll for task completion.
- The Forge app must be installed on the Jira site before this endpoint is usable.

```sh
# Trigger a Forge panel action asynchronously for two issues
atlas jira forge bulk-panel-action --value '[{"issueId":"10001","moduleKey":"my-app:my-panel"},{"issueId":"10002","moduleKey":"my-app:my-panel"}]'
```

## `groups`

| Action   | Positional | Required flags | Optional flags                                                               |
| -------- | ---------- | -------------- | ---------------------------------------------------------------------------- |
| `picker` | —          | —              | `--query`, `--exclude`, `--max-results`, `--exclude-inactive`, `--user-name` |

- `--query` — fuzzy string to match against group names.
- `--exclude` — **comma-separated** list of group IDs to exclude from results.
- `--max-results` — maximum number of groups returned (default 20).
- `--exclude-inactive` — when `true`, inactive groups are omitted.
- `--user-name` — account ID of a user whose groups should be excluded.
- Endpoint: `GET /rest/api/3/groups/picker`.

```sh
# Find groups matching "dev"
atlas jira groups picker --query dev

# Find up to 10 groups excluding a specific group
atlas jira groups picker --query dev --max-results 10 --exclude grp-99

# Exclude inactive groups
atlas jira groups picker --exclude-inactive
```

## `group-user-picker`

| Action | Positional | Required flags | Optional flags                                                                                                                    |
| ------ | ---------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pick` | —          | —              | `--query`, `--max-results`, `--show-avatar`, `--project-id`, `--project-role`, `--exclude-account-ids`, `--exclude-connect-users` |

- `--query` — string to match against both group names and user display names.
- `--max-results` — maximum results per section (default 50).
- `--show-avatar` — when `true`, avatar URLs are included in user results.
- `--project-id` — **comma-separated** project IDs to scope user results to project members.
- `--project-role` — case-sensitive project role name to filter user results.
- `--exclude-account-ids` — **comma-separated** account IDs to exclude from user suggestions.
- `--exclude-connect-users` — when `true`, Atlassian Connect users are excluded.
- Endpoint: `GET /rest/api/3/groupuserpicker`.

```sh
# Find groups and users matching "alice"
atlas jira group-user-picker pick --query alice

# Include avatar URLs and limit results
atlas jira group-user-picker pick --query dev --show-avatar --max-results 25

# Scope to a specific project
atlas jira group-user-picker pick --query eng --project-id 10001
```

## `security-level`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `get`  | `<id>`     | —              | —              |

- `<id>` — numeric ID of the issue security level (positional, not a flag).
- Endpoint: `GET /rest/api/3/securitylevel/{id}`.
- Returns `id`, `name`, `description`, `issueSecuritySchemeId`, and `self`.

```sh
# Get a security level by ID
atlas jira security-level get 10001
```

## `license`

| Action                              | Positional         | Required flags | Optional flags |
| ----------------------------------- | ------------------ | -------------- | -------------- |
| `get-approximate-count`             | —                  | —              | —              |
| `get-approximate-count-for-product` | `<applicationKey>` | —              | —              |

- `get-approximate-count` calls `GET /rest/api/3/license/approximateLicenseCount` and returns the approximate user count across all Jira products.
- `get-approximate-count-for-product` calls `GET /rest/api/3/license/approximateLicenseCount/product/{applicationKey}` for a specific product. Common application keys: `jira-software`, `jira-servicedesk`, `jira-core`.
- Requires **Jira administrator** global permission.

```sh
# Get approximate license count across all Jira products
atlas jira license get-approximate-count

# Get approximate count for Jira Software specifically
atlas jira license get-approximate-count-for-product jira-software
```

## `settings`

| Action        | Positional | Required flags | Optional flags |
| ------------- | ---------- | -------------- | -------------- |
| `get-columns` | —          | —              | —              |
| `set-columns` | —          | `--columns`    | —              |

- `get-columns` calls `GET /rest/api/3/settings/columns` and returns the default issue navigator columns.
- `set-columns` calls `PUT /rest/api/3/settings/columns` and replaces the default column configuration. Requires **Jira administrator** global permission.
- `--columns` is a **JSON array** of `{label, value}` objects where `value` is the column field key. Example: `[{"label":"Key","value":"issuekey"},{"label":"Summary","value":"summary"}]`.

```sh
# Get the current default issue navigator columns
atlas jira settings get-columns

# Set the default columns to Key and Summary
atlas jira settings set-columns --columns '[{"label":"Key","value":"issuekey"},{"label":"Summary","value":"summary"}]'
```

## `redact`

| Action       | Positional | Required flags | Optional flags |
| ------------ | ---------- | -------------- | -------------- |
| `start`      | —          | `--jql`        | `--field-ids`  |
| `get-status` | `<jobId>`  | —              | —              |

- `start` calls `POST /rest/api/3/redact` to begin an asynchronous issue redaction job. Returns a `jobId` for polling. **Admin-only endpoint.**
- `get-status` calls `GET /rest/api/3/redact/status/{jobId}` to check progress. Returns status: `IN_PROGRESS`, `COMPLETE`, or `FAILED`.
- `--jql` — JQL query identifying issues to redact. Required.
- `--field-ids` — **comma-separated** field IDs to redact. When omitted, all text fields are redacted.

```sh
# Start a redaction job for issues matching a JQL query
atlas jira redact start --jql "project = PROJ AND summary ~ secret"

# Redact specific fields only
atlas jira redact start --jql "project = PROJ" --field-ids summary,description

# Check the status of a running redaction job
atlas jira redact get-status job-abc123
```

## `flag`

**URL base:** `/rest/featureflags/0.1` (Jira Software DevInfo Feature Flags API — not `/rest/api/3`).

| Action   | Positional        | Required flags | Optional flags |
| -------- | ----------------- | -------------- | -------------- |
| `get`    | `<featureFlagId>` | —              | —              |
| `delete` | `<featureFlagId>` | —              | —              |

- Feature flag entities are stored via the Jira DevInfo API when CI/CD tools push flag state to Jira.
- Requires a **Connect app** or **OAuth 2.0 (M2M)** token with the `FEATURE_FLAGS` scope; basic auth (API token) is typically not accepted.

```sh
# Get a feature flag entity by ID
atlas jira flag get flag-xyz

# Delete a feature flag entity by ID
atlas jira flag delete flag-xyz
```

## `task`

| Action   | Positional | Required flags | Optional flags |
| -------- | ---------- | -------------- | -------------- |
| `get`    | `<taskId>` | —              | —              |
| `cancel` | `<taskId>` | —              | —              |

- `get` calls `GET /rest/api/3/task/{taskId}` to retrieve the status of a long-running async Jira task. Tasks are created by operations such as bulk field updates.
- `cancel` calls `POST /rest/api/3/task/{taskId}/cancel` to request cancellation of a running task. Only tasks with status `RUNNING` or `ENQUEUED` can be cancelled.
- Task status values: `ENQUEUED`, `RUNNING`, `COMPLETE`, `FAILED`, `CANCEL_REQUESTED`, `CANCELLED`, `DEAD`.
- `progress` is a 0–100 percentage; `elapsedRuntime`, `submitted`, `started`, `finished`, and `lastUpdate` are Unix timestamps in milliseconds.

```sh
# Get the status of a long-running task
atlas jira task get task-123

# Cancel a running task
atlas jira task cancel task-123
```

## `avatar`

| Action        | Positional | Required flags | Optional flags |
| ------------- | ---------- | -------------- | -------------- |
| `list-system` | `<type>`   | —              | —              |

- `<type>` is one of `issuetype`, `project`, or `user`.
- Returns all system (built-in) avatars for the given type.

```sh
# List system avatars for issue types
atlas jira avatar list-system issuetype

# List system avatars for projects
atlas jira avatar list-system project
```

## `custom-field-option`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `get`  | `<id>`     | —              | —              |

```sh
# Get a custom field option by ID
atlas jira custom-field-option get 10001
```

## `classification-levels`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `list` | —          | —              | —              |

```sh
# List all data classification levels
atlas jira classification-levels list
```

## `latest`

**URL base:** `/rest/internal/api/latest` (Jira Internal API — not `/rest/api/3`).

This resource exposes the internal worklog bulk endpoint. Stability is not guaranteed by Atlassian.

| Action         | Positional | Required flags | Optional flags |
| -------------- | ---------- | -------------- | -------------- |
| `bulk-worklog` | —          | `--value`      | —              |

- `--value` must be a JSON array of worklog objects, each with `issueIdOrKey`, `timeSpentSeconds`, `started`, and optional `comment` / `authorAccountId`.

```sh
# Bulk-create worklogs via the internal API
atlas jira latest bulk-worklog --value '[{"issueIdOrKey":"PROJ-1","timeSpentSeconds":3600,"started":"2024-01-01T09:00:00.000+0000"}]'
```

## `remote-link`

**URL base:** `/rest/remotelinks/1.0` (Jira Remote Links integration API — not `/rest/api/3`).

This is distinct from issue-scoped remote links (`/rest/api/3/issue/{issueIdOrKey}/remotelink`).

| Action   | Positional       | Required flags | Optional flags |
| -------- | ---------------- | -------------- | -------------- |
| `get`    | `<remoteLinkId>` | —              | —              |
| `delete` | `<remoteLinkId>` | —              | —              |

```sh
# Get a remote link by ID
atlas jira remote-link get rl-123

# Delete a remote link by ID
atlas jira remote-link delete rl-123
```

## `service-registry`

**URL base:** `/rest/atlassian-connect/1` (Atlassian Connect API — not `/rest/api/3`).

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `get`  | —          | —              | —              |

```sh
# Get the Connect service registry (installed apps)
atlas jira service-registry get
```

## `exists-by-properties`

**URL base:** `/rest/devinfo/0.10` (Jira Development Information API — not `/rest/api/3`).

| Action | Positional | Required flags | Optional flags                 |
| ------ | ---------- | -------------- | ------------------------------ |
| `get`  | —          | —              | `--entity-type`, `--entity-id` |

```sh
# Check if any dev info entities exist
atlas jira exists-by-properties get

# Check by entity type
atlas jira exists-by-properties get --entity-type repository

# Check by entity type and ID
atlas jira exists-by-properties get --entity-type repository --entity-id repo-1
```

## `app`

App-scoped resource grouping three distinct API surfaces used by Forge and Atlassian Connect apps:

- **`/rest/api/3/app/field/...`** — app-defined custom field context/value (B326–B330).
- **`/rest/atlassian-connect/1/app/module/dynamic`** — Connect dynamic modules (B943–B945).
- **`/rest/forge/1/app/properties`** — Forge app-scoped property storage (B975–B978).

Most actions require Forge/Connect-issued credentials (OAuth 2.0 3LO scopes or Connect JWT). Basic auth with an API token will return `401`/`403` on every action.

| Action                               | Positional       | Required flags                                         | Optional flags  |
| ------------------------------------ | ---------------- | ------------------------------------------------------ | --------------- |
| `get-field-context-configuration`    | `<fieldIdOrKey>` | —                                                      | —               |
| `update-field-context-configuration` | `<fieldIdOrKey>` | at least one of `--configuration`, `--schema`          | —               |
| `update-field-value`                 | `<fieldIdOrKey>` | `--value`                                              | —               |
| `list-field-context-configurations`  | —                | at least one of `--field-ids-or-keys`, `--context-ids` | —               |
| `bulk-update-field-value`            | —                | `--value`                                              | —               |
| `get-dynamic-modules`                | —                | —                                                      | —               |
| `register-dynamic-modules`           | —                | `--value`                                              | —               |
| `delete-dynamic-modules`             | —                | —                                                      | `--module-keys` |
| `list-forge-properties`              | —                | —                                                      | —               |
| `get-forge-property`                 | `<propertyKey>`  | —                                                      | —               |
| `set-forge-property`                 | `<propertyKey>`  | `--value`                                              | —               |
| `delete-forge-property`              | `<propertyKey>`  | —                                                      | —               |

- `--configuration` and `--schema` accept opaque JSON; the server stores them verbatim. At least one of the two must be supplied.
- `--value` for `update-field-value` is a JSON array of `{ issueIds | issueIdsOrKeys | issueKeys, value }` entries.
- `--value` for `bulk-update-field-value` is a JSON array of `{ fieldIdOrKey, updates: [...] }` entries.
- `--value` for `register-dynamic-modules` is a JSON array of Connect module descriptors (each `{ key, type, ... }`).
- `--value` for `set-forge-property` is any JSON value (stored verbatim and returned as-is by `get-forge-property`).
- `--module-keys` is comma-separated. When omitted, `delete-dynamic-modules` removes every dynamic module registered by the calling app.
- `--field-ids-or-keys` and `--context-ids` are comma-separated. At least one must be supplied for `list-field-context-configurations`.

```sh
# Read the configuration the app stored for one of its custom fields
atlas jira app get-field-context-configuration customfield_10042

# Update the configuration JSON (and optionally the schema)
atlas jira app update-field-context-configuration customfield_10042 \
  --configuration '{"foo":true}' --schema '{"type":"object"}'

# Set a single field on a batch of issues
atlas jira app update-field-value customfield_10042 \
  --value '[{"issueIds":[10001,10002],"value":"hello"}]'

# Fetch configurations for a set of (field, context) pairs
atlas jira app list-field-context-configurations \
  --field-ids-or-keys customfield_10042 --context-ids 10100,10101

# Bulk-update many fields in one request
atlas jira app bulk-update-field-value \
  --value '[{"fieldIdOrKey":"customfield_10042","updates":[{"issueIds":[10001],"value":"hi"}]}]'

# List dynamic Connect modules registered by the calling app
atlas jira app get-dynamic-modules

# Register dynamic Connect modules
atlas jira app register-dynamic-modules \
  --value '[{"key":"my-module","type":"webhook"}]'

# Delete specific dynamic Connect modules (omit --module-keys to delete all)
atlas jira app delete-dynamic-modules --module-keys my-module,other-module

# Forge app property storage
atlas jira app list-forge-properties
atlas jira app get-forge-property my-key
atlas jira app set-forge-property my-key --value '{"on":true}'
atlas jira app delete-forge-property my-key
```

## Errors specific to Jira

- **401 with a known-good token** usually means the token is API-token (basic auth) but `ATLASSIAN_AUTH_TYPE=bearer` is set, or vice versa.
- **403 on `issues create`** typically means the token lacks "Create Issues" permission in the target project, not a global scope problem.
- **400 with `"errorMessages":["The value 'X' does not exist for the field 'project'."]`** — `--project` needs the project **key** (e.g. `PROJ`), not name or ID.
- **400 with custom-field errors** — the CLI can't set custom fields. Use the SDK with `fields: { customfield_10001: ... }`.
