# Jira — Issue types, priorities, statuses, resolutions, labels, expression

> Part of the `atlas` Jira skill reference. Resource×action matrix and routing in [`../jira.md`](../jira.md).

## `issue-types` / `priorities` / `statuses`

`issue-types` and `statuses` are read-only lookups. `priorities` supports full CRUD and management. (To list **every** status, use `atlas jira status list`; `statuses list` fetches specific statuses by id via `--ids`.)

```sh
atlas jira issue-types list
atlas jira issue-types get <id>
atlas jira priorities list
atlas jira priorities get <id>
atlas jira priorities create --name "Critical" --description "Highest urgency" --status-color "#FF0000"
atlas jira priorities update <id> --name "Renamed" --description "Updated description"
atlas jira priorities delete <id>
atlas jira priorities delete <id> --replace-with <other-id>
atlas jira priorities set-default --id <id>
atlas jira priorities move --ids 10001,10002 --after 10000
atlas jira priorities move --ids 10001,10002 --position First
atlas jira priorities search --priority-name High
atlas jira priorities search --ids 10001,10002 --max-results 25
atlas jira statuses list --ids 10001,10002
```

Use them to translate human-readable names into IDs when constructing issue create/update calls.

## `issuetype`

Single issue-type management (distinct from the read-only `issue-types` plural resource). Covers `/rest/api/3/issuetype` CRUD, avatar management, property storage, and project-scoped listing.

| Action              | Positional                      | Required flags                                           | Optional flags                                                         |
| ------------------- | ------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `create`            | —                               | `--name`                                                 | `--description`, `--type` (`subtask`\|`standard`), `--hierarchy-level` |
| `delete`            | `<id>`                          | —                                                        | `--alternative-id`                                                     |
| `update`            | `<id>`                          | at least one of `--name`, `--description`, `--avatar-id` | —                                                                      |
| `list-alternatives` | `<id>`                          | —                                                        | —                                                                      |
| `load-avatar`       | `<id>`                          | `--file`, `--size`                                       | `--x`, `--y`                                                           |
| `list-properties`   | `<issueTypeId>`                 | —                                                        | —                                                                      |
| `delete-property`   | `<issueTypeId>` `<propertyKey>` | —                                                        | —                                                                      |
| `get-property`      | `<issueTypeId>` `<propertyKey>` | —                                                        | —                                                                      |
| `set-property`      | `<issueTypeId>` `<propertyKey>` | `--value` (JSON)                                         | —                                                                      |
| `list-for-project`  | —                               | `--project-id`                                           | —                                                                      |

- `--type` must be `subtask` or `standard` (only relevant when creating; controls hierarchy).
- `--hierarchy-level` is an integer; omit to use the server default for the chosen type.
- `--alternative-id` on `delete` reassigns issues from the deleted type to the specified alternative type.
- `load-avatar` reads the image from `--file` (local path), crops to `--size` × `--size` starting at `--x`,`--y` (default 0,0).
- `list-for-project` requires `--project-id` as a positive integer.
- Properties store arbitrary JSON; `--value` must be valid JSON.

```sh
# Create a standard issue type
atlas jira issuetype create --name "Feature" --description "A new product feature" --type standard

# Create a sub-task type
atlas jira issuetype create --name "Sub-task" --type subtask

# Get issue type details (use issues get or issue-types list to resolve IDs)
atlas jira issuetype update 10001 --name "Renamed Feature" --description "Updated description"

# Delete an issue type, reassigning its issues to another type
atlas jira issuetype delete 10001 --alternative-id 10002

# List alternative issue types for a given type
atlas jira issuetype list-alternatives 10001

# Load a custom avatar
atlas jira issuetype load-avatar 10001 --file /path/to/avatar.png --size 48

# Issue type properties
atlas jira issuetype list-properties 10001
atlas jira issuetype get-property 10001 myKey
atlas jira issuetype set-property 10001 myKey --value '"hello"'
atlas jira issuetype delete-property 10001 myKey

# List issue types for a specific project
atlas jira issuetype list-for-project --project-id 10100
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

## `resolutions`

Issue resolution management (B931, B712-B718). `list` is deprecated by Atlassian — prefer `search`.

| Action        | Positional | Required flags                            | Optional flags                                                             |
| ------------- | ---------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| `list`        | —          | —                                         | — (deprecated; no filtering)                                               |
| `get`         | `<id>`     | —                                         | —                                                                          |
| `create`      | —          | `--name`                                  | `--description`                                                            |
| `update`      | `<id>`     | at least one of `--name`, `--description` | —                                                                          |
| `delete`      | `<id>`     | —                                         | `--replace-with`                                                           |
| `set-default` | `<id>`     | —                                         | —                                                                          |
| `move`        | —          | `--ids`                                   | `--after` or `--position`                                                  |
| `search`      | —          | —                                         | `--only-default`, `--start-at`, `--max-results`, `--ids`                   |

- `--ids` is comma-separated (for `move` and `search`).
- `--replace-with` is the ID of the replacement resolution when deleting a resolution that is in use.
- `--after` / `--position` for `move`: use `--after <id>` to place after a specific resolution, or `--position <First|Last>` for a named position (mutually exclusive).
- `--only-default`: boolean flag; when set only the default resolution is returned.

```sh
atlas jira resolutions list
atlas jira resolutions get 10001
atlas jira resolutions create --name "Fixed"
atlas jira resolutions create --name "Won't Fix" --description "Not a bug"
atlas jira resolutions update 10001 --name "Fixed" --description "Issue was fixed"
atlas jira resolutions delete 10001 --replace-with 10000
atlas jira resolutions set-default 10001
atlas jira resolutions move --ids 10001,10002 --after 10000
atlas jira resolutions move --ids 10001,10002 --position First
atlas jira resolutions search --only-default
atlas jira resolutions search --max-results 10
```

## `statuses` (extended — B777-B784)

Bulk management, usage queries, and search for the `/rest/api/3/statuses` surface.

| Action                  | Positional                 | Required flags       | Optional flags                                                                        |
| ----------------------- | -------------------------- | -------------------- | ------------------------------------------------------------------------------------- |
| `list`                  | —                          | —                    | —                                                                                     |
| `bulk-delete`           | —                          | `--ids`              | —                                                                                     |
| `bulk-create`           | —                          | `--value`, `--scope` | —                                                                                     |
| `bulk-update`           | —                          | `--value`            | —                                                                                     |
| `get-issue-type-usages` | `<statusId>` `<projectId>` | —                    | `--next-page-token`, `--max-results`                                                  |
| `get-project-usages`    | `<statusId>`               | —                    | `--next-page-token`, `--max-results`                                                  |
| `get-workflow-usages`   | `<statusId>`               | —                    | `--next-page-token`, `--max-results`                                                  |
| `by-names`              | —                          | `--names`            | —                                                                                     |
| `search`                | —                          | —                    | `--project-id`, `--start-at`, `--max-results`, `--search-string`, `--status-category` |

- `--ids` for `bulk-delete`: comma-separated status IDs.
- `--value` for `bulk-create`: JSON array of `{ name, statusCategory, description? }` objects. `statusCategory` must be `TODO`, `IN_PROGRESS`, or `DONE`.
- `--scope` for `bulk-create` (**required**): JSON object describing the scope of the new statuses. `{"type":"GLOBAL"}` for company-managed projects, or `{"type":"PROJECT","project":{"id":"<projectId>"}}` for a team-managed project. The spec `StatusCreateRequest` requires this top-level scope; omitting it returns 400.
- `--value` for `bulk-update`: JSON array of `{ id, name?, description?, statusCategory? }` objects.
- `--next-page-token`: opaque token from previous page response (usages endpoints use cursor pagination, not offset).
- **Usage response shapes are nested DTOs**, not a flat page: `get-project-usages` → `{ statusId, projects: { values: [{id}], nextPageToken? } }`; `get-workflow-usages` → `{ statusId, workflows: { values: [{id}], nextPageToken? } }`; `get-issue-type-usages` → `{ statusId, projectId, issueTypes: { values: [{id}], nextPageToken? } }`. Read items from the nested `.values`, and the cursor from the nested `.nextPageToken`.
- `--names` for `by-names`: comma-separated status names.
- `--status-category`: one of `TODO`, `IN_PROGRESS`, `DONE`.

```sh
atlas jira statuses list --ids 10001,10002
atlas jira statuses bulk-delete --ids 10001,10002
atlas jira statuses bulk-create --scope '{"type":"GLOBAL"}' --value '[{"name":"Blocked","statusCategory":"IN_PROGRESS","description":"Awaiting external input"}]'
atlas jira statuses bulk-create --scope '{"type":"PROJECT","project":{"id":"10000"}}' --value '[{"name":"Triage","statusCategory":"TODO"}]'
atlas jira statuses bulk-update --value '[{"id":"10001","name":"Renamed Status"}]'
atlas jira statuses get-issue-type-usages 10001 10002
atlas jira statuses get-project-usages 10001 --next-page-token abc123
atlas jira statuses get-workflow-usages 10001
atlas jira statuses by-names --names "In Progress,Done"
atlas jira statuses search --project-id 10000 --search-string "In Progress" --status-category IN_PROGRESS
```

## `expression`

Jira expression validation and evaluation at `/rest/api/3/expression/{analyse,eval,evaluate}` (B409, B904, B410).

| Action     | Positional | Required flags  | Optional flags                   |
| ---------- | ---------- | --------------- | -------------------------------- |
| `analyse`  | —          | `--expressions` | `--context-variables`, `--check` |
| `eval`     | —          | `--expression`  | `--context`, `--expand`          |
| `evaluate` | —          | `--expression`  | `--context`, `--expand`          |

- `--expressions` (on `analyse`) is a **JSON array of strings**, e.g. `'["issue.key","issue.summary"]'`.
- `--context-variables` (on `analyse`) is a **JSON object** mapping variable names to type strings, e.g. `'{"value":"User","listOfStrings":"List<String>"}'`.
- `--check` (on `analyse`) enables type-checking; values per Atlassian docs include `syntax` (default), `type`, `complexity`.
- `--expression` (on `eval`/`evaluate`) is a single Jira expression string.
- `--context` (on `eval`/`evaluate`) is a **JSON object** matching the `JiraExpressionEvalContextBean` shape (board, custom, customerRequest, issue, issues.jql, project, serviceDesk, sprint).
- `--expand` (on `eval`/`evaluate`) is a comma-separated list of expansion keys (e.g. `meta.complexity`).
- `eval` uses the enhanced (scrolling, `nextPageToken`) JQL search and is eventually consistent.
- `evaluate` uses the legacy strongly-consistent paginated JQL search (`startAt`/`totalCount`).

```sh
# Validate two expressions
atlas jira expression analyse --expressions '["issue.key","issue.summary"]'

# Validate with type-checking and context variable declarations
atlas jira expression analyse \
  --expressions '["value.accountId"]' \
  --context-variables '{"value":"User"}' \
  --check type

# Evaluate an expression against an issue (enhanced search)
atlas jira expression eval \
  --expression "issue.key" \
  --context '{"issue":{"key":"ACJIRA-1470"}}'

# Evaluate using a JQL scrolling view and expand complexity metadata
atlas jira expression eval \
  --expression "issues.map(i => i.key)" \
  --context '{"issues":{"jql":{"query":"project = ACJIRA","maxResults":100}}}' \
  --expand meta.complexity

# Evaluate against the legacy paginated JQL endpoint
atlas jira expression evaluate \
  --expression "issue.summary" \
  --context '{"issue":{"key":"ACJIRA-1470"}}' \
  --expand meta.complexity
```

## `labels`

Jira instance-wide label listing (B1013). Exposes all labels defined in the Jira instance via `GET /rest/api/3/label`.

| Action | Positionals | Required flags | Optional flags                |
| ------ | ----------- | -------------- | ----------------------------- |
| `list` | —           | —              | `--start-at`, `--max-results` |

```sh
# List all labels (default page)
atlas jira labels list

# List with pagination
atlas jira labels list --start-at 0 --max-results 50
```
