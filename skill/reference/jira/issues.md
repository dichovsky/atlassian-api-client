# Jira — Issues, comments, attachments, links, worklogs, changelog

> Part of the `atlas` Jira skill reference. Resource×action matrix and routing in [`../jira.md`](../jira.md).

## `issues`

### Standard (v3 API)

| Action        | Positional   | Required flags                                                                                  | Optional flags                                                                                                                     |
| ------------- | ------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `get`         | `<issueKey>` | —                                                                                               | `--fields`, `--expand`, `--properties`, `--fields-by-keys`, `--update-history`, `--fail-fast`                                      |
| `create`      | —            | `--summary`, `--project`, `--type` (unless `--body` sets `fields.project` / `fields.issuetype`) | `--parent`, `--body`, `--update-history`                                                                                           |
| `update`      | `<issueKey>` | one of `--summary` or `--body`                                                                  | `--notify-users`, `--no-notify-users`, `--override-screen-security`, `--override-editable-flag`, `--return-issue`, `--expand`      |
| `delete`      | `<issueKey>` | —                                                                                               | `--delete-subtasks`                                                                                                                |
| `transitions` | `<issueKey>` | —                                                                                               | `--expand`, `--transition-id`, `--include-unavailable-transitions`, `--skip-remote-only-condition`, `--sort-by-ops-bar-and-status` |
| `transition`  | `<issueKey>` | `--transition-id`                                                                               | `--resolution`, `--body`                                                                                                           |

- `--fields` and `--expand` are **comma-separated**, single flag. Example: `--fields summary,status,assignee --expand changelog,renderedFields`.
- `get --properties` is a **comma-separated** list of issue property keys to return with the issue (`*all` for every property; prefix a key with `-` to exclude it). `--fields-by-keys` says the `--fields` entries are field keys rather than IDs (Connect app fields). `--update-history` adds the issue's project to your _Recently viewed_ list. `--fail-fast` makes the request fail if any field fails to load (by default Jira returns the issue with that field missing).
- Boolean flags on `issues` actions (`--fields-by-keys`, `--update-history`, `--fail-fast`, `--override-*`, the `transitions` filters) are tri-state: the bare flag sends `true`, `--flag false` sends `false`, and omitting it leaves Jira's default. `--delete-subtasks` and `--return-issue` act only when true: `--flag false` is the same as omitting the flag (Jira's default is `false`).
- `--project` takes the project key (e.g. `PROJ`), not the numeric ID.
- `--type` takes the issue type name (e.g. `Bug`, `Story`, `Task`, `Sub-task`). Names are case-sensitive and tenant-specific; list with `atlas jira issue-types list`.
- To create by project ID or issue type ID (type names can repeat across team-managed projects), drop `--project`/`--type` and put `fields.project` / `fields.issuetype` in `--body`, e.g. `--body '{"fields":{"project":{"id":"10000"},"issuetype":{"id":"10001"}}}'`. `--project`/`--type` are required only when `--body` does not set them; when given they win.
- `--parent <issueKey>` sets `fields.parent` — required to create a sub-task. To give the parent by ID, use `--body '{"fields":{"parent":{"id":"10042"}}}'` instead.
- `create --update-history` adds the project, issue type and request type to your _Recently viewed_ history so they are preselected next time.
- `--body` (`create`, `update`, `transition`) is a JSON object in Jira's `IssueUpdateDetails` shape: `{"fields":{...},"update":{...},"transition":{...},"properties":[...],"historyMetadata":{...}}`. Use it for description (ADF), assignee, labels, components, custom fields, or any field a create/edit/transition screen requires. Discrete flags (`--summary`, `--project`, `--type`, `--parent`, `--resolution`, `--transition-id`) override the same keys in `--body`; because Jira rejects a field set in both `fields` and `update`, any `--body` `update` operations on a flag-set field are dropped (other operations are kept). `fields`, `update` and `transition` must be JSON objects when present.
- Discrete string flags must not be empty: `--summary ''`, `--resolution ''`, `--parent ''`, `--project ''` or `--type ''` is rejected before any request.
- `update` with neither `--summary` nor `--body` is rejected (it would be a no-op). List editable fields with `get-editmeta`.
- `update` sends the watcher notification email by default; `--no-notify-users` suppresses it (`notifyUsers=false`, needs _Administer Jira_ or _Administer project_), `--notify-users` sends `notifyUsers=true`; the two are mutually exclusive. `--override-screen-security` (edit hidden fields) and `--override-editable-flag` (edit uneditable fields) are bare boolean flags for Connect/Forge apps with _Administer Jira_. It prints `{ "updated": true }`; pass the bare boolean `--return-issue` to print the edited issue instead (same shape as `get`), and `--expand` (comma-separated, as on `get`, e.g. `--expand renderedFields,names`) to expand it. `--expand` without `--return-issue` is rejected before any request. If Jira answers `--return-issue` with an empty 204, it prints `{ "updated": true }`.
- `delete` fails with 400 for an issue that has sub-tasks unless `--delete-subtasks` is passed (deletes them too).
- Transition workflow: call `transitions <key> --expand transitions.fields` to list valid transitions and the fields each transition screen requires (`required: true`, with `allowedValues`), then `transition` with the chosen `--transition-id` and those fields.
- `transitions --transition-id <id>` returns only that transition. `--include-unavailable-transitions` also lists transitions whose conditions fail (useful to see why a transition is missing), `--skip-remote-only-condition` includes transitions hidden by the _Hide From User_ condition (Connect/Forge apps with _Administer Jira_), and `--sort-by-ops-bar-and-status` sorts by ops-bar sequence, then status category.
- `transition --transition-id` sets `transition.id`; other `--body` `transition` keys such as `"looped": true` are kept.
- `--resolution <name>` sets `fields.resolution` (`{"name":"Done"}`). A transition whose screen shows Resolution — typically closing an issue or sub-task — fails without it. Resolution names are tenant-specific; list with `atlas jira resolutions list`. To pass it by ID, use `--body '{"fields":{"resolution":{"id":"10000"}}}'`.

```sh
# Get an issue with two fields and one issue property; add it to Recently viewed
atlas jira issues get PROJ-42 --fields summary,status --properties my-key --update-history --fail-fast

# Get a Connect app field by its key instead of its ID
atlas jira issues get PROJ-42 --fields my-app-field-key --fields-by-keys

# Create a task
atlas jira issues create --project PROJ --type Task --summary "Fix login"

# Create a sub-task under PROJ-42 and add it to Recently viewed
atlas jira issues create --project PROJ --type Sub-task --summary "Write tests" --parent PROJ-42 --update-history

# Create by project ID and issue type ID (no --project/--type)
atlas jira issues create --summary "Fix login" --body '{"fields":{"project":{"id":"10000"},"issuetype":{"id":"10001"}}}'

# Rename and label an issue without emailing watchers, printing the edited issue
atlas jira issues update PROJ-42 --summary "New title" --body '{"update":{"labels":[{"add":"triaged"}]}}' --no-notify-users --return-issue --expand names

# Delete an issue and its sub-tasks
atlas jira issues delete PROJ-42 --delete-subtasks

# List transitions with the fields each screen needs
atlas jira issues transitions PROJ-42 --expand transitions.fields

# Show one transition even if its conditions fail
atlas jira issues transitions PROJ-42 --transition-id 31 --include-unavailable-transitions

# Close with a resolution
atlas jira issues transition PROJ-42 --transition-id 31 --resolution Done

# Run a looped transition (keeps "looped" from --body)
atlas jira issues transition PROJ-42 --transition-id 41 --body '{"transition":{"looped":true}}'
```

### Assignee (B478)

| Action   | Positional   | Required flags | Optional flags |
| -------- | ------------ | -------------- | -------------- |
| `assign` | `<issueKey>` | —              | `--account-id` |

- `assign` sets the assignee to the user identified by `--account-id`.
- **Omit `--account-id` to unassign** the issue (sends `accountId: null`).
- The account ID `-1` assigns the project's default assignee. Write it with `=` (`--account-id=-1`): `--account-id -1` is rejected because `-1` looks like an option.

```sh
# Assign an issue to a user
atlas jira issues assign PROJ-42 --account-id 5b10ac8d82e05b22cc7d4ef5

# Assign the project's default assignee
atlas jira issues assign PROJ-42 --account-id=-1

# Unassign an issue (omit --account-id)
atlas jira issues assign PROJ-42
```

### Changelog & Edit Metadata (B480, B481, B487)

| Action             | Positional   | Required flags | Optional flags                                           |
| ------------------ | ------------ | -------------- | -------------------------------------------------------- |
| `get-changelog`    | `<issueKey>` | —              | `--start-at`, `--max-results`                            |
| `filter-changelog` | `<issueKey>` | `--ids`        | —                                                        |
| `get-editmeta`     | `<issueKey>` | —              | `--override-screen-security`, `--override-editable-flag` |

- `get-changelog` is offset-paginated via `--start-at` / `--max-results`.
- `filter-changelog` `--ids` is a **comma-separated** list of positive-integer changelog entry IDs.
- `get-editmeta` returns the fields editable on the issue (with allowed values) — inspect before `update`. `--override-screen-security` also returns hidden fields and `--override-editable-flag` also returns non-editable fields (both for Connect/Forge apps with _Administer Jira_; Jira answers 403 otherwise). Use them before an `update` that passes the same override flags.

```sh
atlas jira issues get-changelog PROJ-42 --start-at 0 --max-results 50
atlas jira issues filter-changelog PROJ-42 --ids 10001,10002
atlas jira issues get-editmeta PROJ-42
atlas jira issues get-editmeta PROJ-42 --override-screen-security --override-editable-flag
```

### Notifications (B488)

| Action   | Positional   | Required flags  | Optional flags |
| -------- | ------------ | --------------- | -------------- |
| `notify` | `<issueKey>` | `--body` (JSON) | —              |

- `--body` is a JSON object matching `IssueNotifyData`: `{ subject?, textBody?, htmlBody?, to?, restrict? }`.
- `to` selects recipients: `{ "reporter"?: bool, "assignee"?: bool, "watchers"?: bool, "voters"?: bool, "users"?: [{ "accountId": "…" }], "groups"?: [{ "name": "…" }] or [{ "groupId": "…" }], "groupIds"?: ["…"] }`.
- `restrict` limits delivery to recipients who are also in the listed groups or hold the listed permissions: `{ "groups"?: [{ "name": "…" }], "groupIds"?: ["…"], "permissions"?: [{ "key": "BROWSE" }] or [{ "id": "10" }] }`.
- Jira returns 400 when the only recipient is the caller, and 403 when outgoing mail is off.

```sh
atlas jira issues notify PROJ-42 --body '{"subject":"Heads up","textBody":"Please review","to":{"assignee":true,"reporter":true}}'

# Notify watchers and voters, but only those in jira-developers who can browse the project
atlas jira issues notify PROJ-42 --body '{"subject":"Release note","textBody":"Shipped","to":{"watchers":true,"voters":true},"restrict":{"groups":[{"name":"jira-developers"}],"permissions":[{"key":"BROWSE"}]}}'
```

### Issue Properties (B489–B492)

| Action            | Positional                   | Required flags   | Optional flags |
| ----------------- | ---------------------------- | ---------------- | -------------- |
| `list-properties` | `<issueKey>`                 | —                | —              |
| `get-property`    | `<issueKey>` `<propertyKey>` | —                | —              |
| `set-property`    | `<issueKey>` `<propertyKey>` | `--value` (JSON) | —              |
| `delete-property` | `<issueKey>` `<propertyKey>` | —                | —              |

- `--value` for `set-property` is arbitrary JSON (object, array, string, number, or boolean).

```sh
atlas jira issues list-properties PROJ-42
atlas jira issues get-property PROJ-42 my-key
atlas jira issues set-property PROJ-42 my-key --value '{"flagged":true}'
atlas jira issues delete-property PROJ-42 my-key
```

### Remote Links (B493–B498)

Issue-scoped remote links at `/rest/api/3/issue/{issueIdOrKey}/remotelink`. **Distinct** from the standalone `remote-link` resource (Remote Links integration API at `/rest/remotelinks/1.0`) documented later in this file.

| Action                   | Positional              | Required flags  | Optional flags |
| ------------------------ | ----------------------- | --------------- | -------------- |
| `list-remotelinks`       | `<issueKey>`            | —               | `--global-id`  |
| `get-remotelink`         | `<issueKey>` `<linkId>` | —               | —              |
| `create-remotelink`      | `<issueKey>`            | `--body` (JSON) | —              |
| `update-remotelink`      | `<issueKey>` `<linkId>` | `--body` (JSON) | —              |
| `delete-remotelink`      | `<issueKey>` `<linkId>` | —               | —              |
| `delete-all-remotelinks` | `<issueKey>`            | `--global-id`   | —              |

- `list-remotelinks` returns **all remote links on the issue**; pass `--global-id` to fetch only the link with that global ID.
- `--body` for `create-remotelink` / `update-remotelink` is a JSON object matching `CreateRemoteLinkData`: `{ object: { url, title, summary?, icon?, status? }, globalId?, relationship?, application? }`. `object.url` and `object.title` are the practical minimum.
- `delete-all-remotelinks` deletes the **one** remote link whose global ID is `--global-id` (Jira's `deleteRemoteIssueLinkByGlobalId`). Despite the name it does not delete every link: Jira has no such operation, and `--global-id` is required. To remove all links, `list-remotelinks` and `delete-remotelink` each `id`.

```sh
# Get (list) all remote links on an issue
atlas jira issues list-remotelinks PROJ-42

# Get only the remote link with a given global ID
atlas jira issues list-remotelinks PROJ-42 --global-id "system=https://example.com/123"

# Get a single remote link by its numeric link ID
atlas jira issues get-remotelink PROJ-42 10001

# Create a remote link (object.url + object.title are the minimum)
atlas jira issues create-remotelink PROJ-42 --body '{"object":{"url":"https://example.com/ticket/1","title":"Upstream ticket"}}'

# Update a remote link
atlas jira issues update-remotelink PROJ-42 10001 --body '{"object":{"url":"https://example.com/ticket/1","title":"Renamed"}}'

# Delete a remote link by its numeric link ID
atlas jira issues delete-remotelink PROJ-42 10001

# Delete the remote link with a given global ID
atlas jira issues delete-all-remotelinks PROJ-42 --global-id "system=https://example.com/123"
```

### Votes (B499–B501)

| Action        | Positional   | Required flags | Optional flags |
| ------------- | ------------ | -------------- | -------------- |
| `get-votes`   | `<issueKey>` | —              | —              |
| `add-vote`    | `<issueKey>` | —              | —              |
| `remove-vote` | `<issueKey>` | —              | —              |

- `add-vote` / `remove-vote` act as the **current (authenticated) user** — there is no account selector.

```sh
atlas jira issues get-votes PROJ-42
atlas jira issues add-vote PROJ-42
atlas jira issues remove-vote PROJ-42
```

### Watchers (B502–B504)

| Action           | Positional   | Required flags | Optional flags |
| ---------------- | ------------ | -------------- | -------------- |
| `get-watchers`   | `<issueKey>` | —              | —              |
| `add-watcher`    | `<issueKey>` | `--account-id` | —              |
| `remove-watcher` | `<issueKey>` | `--account-id` | —              |

- `add-watcher` requires `--account-id` — the user to start watching the issue.
- `remove-watcher` requires `--account-id` — the watcher to remove (Jira answers 400 without it). To stop watching yourself, pass your own account ID (`accountId` from `atlas jira users me`).

```sh
atlas jira issues get-watchers PROJ-42
atlas jira issues add-watcher PROJ-42 --account-id 5b10ac8d82e05b22cc7d4ef5
atlas jira issues remove-watcher PROJ-42 --account-id 5b10ac8d82e05b22cc7d4ef5
```

### Agile (v1.0 API) — B265–B268

These actions hit `/rest/agile/1.0/issue/…` and return agile-enriched shapes (sprint membership, estimation fields).

| Action           | Positional   | Required flags | Optional flags                             |
| ---------------- | ------------ | -------------- | ------------------------------------------ |
| `get-agile`      | `<issueKey>` | —              | `--fields`, `--expand`, `--update-history` |
| `get-estimation` | `<issueKey>` | —              | `--board-id`                               |
| `set-estimation` | `<issueKey>` | `--value`      | `--board-id`                               |
| `rank`           | —            | `--issues`     | `--before`, `--after`, `--custom-field`    |

- `get-agile` returns the issue with agile fields (sprint, epic link, estimation) populated — a superset of `issues get` for boards context. By default it returns every navigable and Agile field; `--fields` (**comma-separated**, sent as repeated `fields=` params) limits them, `--expand` is a comma-separated expand list (e.g. `changelog`), and `--update-history` adds the issue to your issue history.
- `get-estimation` / `set-estimation`: `--board-id` selects which board's estimation field configuration to use. Required when multiple boards with different field configs share the same project.
- `--value` for `set-estimation` is a **string** (e.g. `--value 5`). Pass `--value null` to clear the estimate.
- `rank --issues` is **comma-separated** issue keys or IDs (e.g. `--issues PROJ-1,PROJ-2`).
- `--before` and `--after` are **mutually exclusive** — rank the issues immediately before or after the named reference issue.
- `--custom-field` is the numeric ID of the rank custom field when the board uses a non-default rank field.

```sh
# Get agile view of an issue (includes sprint, estimation, epic)
atlas jira issues get-agile PROJ-42

# Only two fields plus the changelog, and record the view in issue history
atlas jira issues get-agile PROJ-42 --fields summary,status --expand changelog --update-history

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

### Worklog (B505–B515)

| Action                    | Positional                                 | Required flags | Optional flags                                                                                                                      |
| ------------------------- | ------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `delete-all-worklogs`     | `<issueIdOrKey>`                           | `--ids`        | `--adjust-estimate`, `--override-editable-flag`                                                                                     |
| `list-worklogs`           | `<issueIdOrKey>`                           | —              | `--start-at`, `--max-results`, `--started-after`, `--started-before`, `--expand`                                                    |
| `add-worklog`             | `<issueIdOrKey>`                           | `--body`       | `--notify-users`, `--no-notify-users`, `--adjust-estimate`, `--new-estimate`, `--reduce-by`, `--expand`, `--override-editable-flag` |
| `delete-worklog`          | `<issueIdOrKey>` `<worklogId>`             | —              | `--notify-users`, `--no-notify-users`, `--adjust-estimate`, `--new-estimate`, `--increase-by`, `--override-editable-flag`           |
| `get-worklog`             | `<issueIdOrKey>` `<worklogId>`             | —              | `--expand`                                                                                                                          |
| `update-worklog`          | `<issueIdOrKey>` `<worklogId>`             | `--body`       | `--notify-users`, `--no-notify-users`, `--adjust-estimate`, `--new-estimate`, `--expand`, `--override-editable-flag`                |
| `list-worklog-properties` | `<issueIdOrKey>` `<worklogId>`             | —              | —                                                                                                                                   |
| `delete-worklog-property` | `<issueIdOrKey>` `<worklogId>` `<propKey>` | —              | —                                                                                                                                   |
| `get-worklog-property`    | `<issueIdOrKey>` `<worklogId>` `<propKey>` | —              | —                                                                                                                                   |
| `set-worklog-property`    | `<issueIdOrKey>` `<worklogId>` `<propKey>` | `--value`      | —                                                                                                                                   |
| `move-worklog`            | `<issueIdOrKey>`                           | `--ids`        | `--target-issue`, `--adjust-estimate`, `--override-editable-flag`                                                                   |

- `delete-all-worklogs`: `--ids` is a comma-separated list of worklog IDs (integers) to delete in bulk (spec: `bulkDeleteWorklogs` requires `WorklogIdsRequestBean { ids }`).
- `--body` (`add-worklog`, `update-worklog`) is a JSON `Worklog` object:
  - `started` — when the work started, `yyyy-MM-dd'T'HH:mm:ss.SSSZ` (e.g. `2024-01-01T09:00:00.000+0000`). Required by `add-worklog`.
  - `timeSpentSeconds` (integer) **or** `timeSpent` (`"1h 30m"`, `"2d"`) — one is required by `add-worklog`; never send both.
  - `comment` — an [ADF](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/) document, **not** a plain string (Jira returns 400 for a string): `{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"…"}]}]}`.
  - `visibility` — restrict who sees the worklog: `{"type":"group","identifier":"<groupId>"}` (or `"value":"<group name>"`), or `{"type":"role","value":"Developers"}`.
  - `properties` — `[{"key":"…","value":…}]`.
- `--adjust-estimate` sets how the issue's remaining estimate changes. Values per action (anything else is rejected before any request):

  | Action                                | Values                                     | Companion flag                                                       |
  | ------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
  | `add-worklog`                         | `auto` (default), `leave`, `new`, `manual` | `new` → `--new-estimate 2d`; `manual` → `--reduce-by 1h`             |
  | `update-worklog`                      | `auto` (default), `leave`, `new`, `manual` | `new` → `--new-estimate 2d`; Jira defines no `manual` behaviour here |
  | `delete-worklog`                      | `auto` (default), `leave`, `new`, `manual` | `new` → `--new-estimate 2d`; `manual` → `--increase-by 1h`           |
  | `delete-all-worklogs`, `move-worklog` | `auto` (default), `leave`                  | —                                                                    |

  `auto` adjusts by the time logged, `leave` keeps the estimate, `new` replaces it with `--new-estimate`, `manual` changes it by `--reduce-by` (`add-worklog`) / `--increase-by` (`delete-worklog`). Estimates use `#d`, `#h` or `#m`. Jira returns 400 when `new`/`manual` lack their companion flag.

- `--notify-users`, `--override-editable-flag` are bare boolean flags. `notifyUsers` defaults to true on the wire, so pass `--no-notify-users` to suppress the notification (mutually exclusive with `--notify-users`). `--override-editable-flag` (Connect/Forge apps with _Administer Jira_) changes worklogs on an issue that is not editable, for example a closed one.
- `move-worklog`: `<issueIdOrKey>` = SOURCE issue (path); `--ids` = comma-separated worklog IDs (integers); `--target-issue` = DESTINATION issue key (body).
- `delete-all-worklogs` prints `{ "deleted": true }` and `move-worklog` prints `{ "moved": true }` when Jira processed every worklog (204). When Jira answers 200 because only some were processed, they print `{ "deleted": true, "partial": true, "details": … }` / `{ "moved": true, "partial": true, "details": … }`, where `details` is Jira's response body (omitted when empty). Check with `list-worklogs` which worklogs remain.

```sh
# Log 90 minutes with an ADF comment, visible only to the Developers role, without emailing watchers
atlas jira issues add-worklog PROJ-42 --body '{"started":"2024-01-01T09:00:00.000+0000","timeSpent":"1h 30m","comment":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Pairing on the login fix"}]}]},"visibility":{"type":"role","value":"Developers"}}' --no-notify-users

# Log 1 hour and set the remaining estimate to 2 days
atlas jira issues add-worklog PROJ-42 --body '{"started":"2024-01-01T09:00:00.000+0000","timeSpentSeconds":3600}' --adjust-estimate new --new-estimate 2d

# Change a worklog's time spent, keeping the remaining estimate as it is
atlas jira issues update-worklog PROJ-42 10001 --body '{"timeSpent":"2h"}' --adjust-estimate leave

# Delete a worklog and give back 1 hour to the remaining estimate
atlas jira issues delete-worklog PROJ-42 10001 --adjust-estimate manual --increase-by 1h

# Delete two worklogs without changing the remaining estimate
atlas jira issues delete-all-worklogs PROJ-42 --ids 10001,10002 --adjust-estimate leave

# Move two worklogs to PROJ-43, keeping both estimates, even on a closed issue
atlas jira issues move-worklog PROJ-42 --ids 10001,10002 --target-issue PROJ-43 --adjust-estimate leave --override-editable-flag
```

### Issue Archive/Unarchive (B516, B517, B528)

| Action               | Positional | Required flags | Optional flags |
| -------------------- | ---------- | -------------- | -------------- |
| `archive-issues`     | —          | `--ids`        | —              |
| `archive-issues-jql` | —          | `--jql`        | —              |
| `unarchive-issues`   | —          | `--ids`        | —              |

- `archive-issues` uses PUT (synchronous, by ID list); `archive-issues-jql` uses POST (async, by JQL).
- `archive-issues-jql` returns the task-status URL string (202 response), e.g. `"https://your-site.atlassian.net/rest/api/3/task/10641"`. Its last path segment is the task ID: poll it with `atlas jira task get 10641` until `status` is `COMPLETE` (or `FAILED`). Jira answers 412 while another archive request is still running.
- `--ids` is comma-separated issue IDs or keys for `archive-issues` and `unarchive-issues`.

### Bulk Fetch (B519)

| Action       | Positional | Required flags | Optional flags                                                               |
| ------------ | ---------- | -------------- | ---------------------------------------------------------------------------- |
| `bulk-fetch` | —          | `--issues`     | `--fields-by-keys`, `--fields` (CSV), `--properties` (CSV), `--expand` (CSV) |

### Create Meta (B924, B520, B521)

| Action                       | Positional                         | Required flags | Optional flags                                                                        |
| ---------------------------- | ---------------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `get-create-meta`            | —                                  | —              | `--project-ids`, `--project-keys`, `--issuetype-ids`, `--issuetype-names`, `--expand` |
| `get-create-meta-issuetypes` | `<projectIdOrKey>`                 | —              | `--start-at`, `--max-results`                                                         |
| `get-create-meta-issuetype`  | `<projectIdOrKey>` `<issueTypeId>` | —              | `--start-at`, `--max-results`                                                         |

- `get-create-meta` calls `GET /rest/api/3/issue/createmeta`, which Atlassian has **deprecated** (CHANGE-1304) and may remove. Prefer `get-create-meta-issuetypes <projectIdOrKey>` to list a project's issue types, then `get-create-meta-issuetype <projectIdOrKey> <issueTypeId>` for the create-screen fields of one type. List-valued flags of `get-create-meta` are comma-separated.

```sh
atlas jira issues get-create-meta-issuetypes PROJ --max-results 50
atlas jira issues get-create-meta-issuetype PROJ 10001 --start-at 0 --max-results 50
```

### Issue Limit Reports

| Action                 | Positional | Required flags | Optional flags                              |
| ---------------------- | ---------- | -------------- | ------------------------------------------- |
| `get-limit-report`     | —          | —              | `--is-returning-keys`                       |
| `get-adf-limit-report` | —          | —              | `--is-returning-keys`, `--field-type` (CSV) |

`get-limit-report` reports per-issue entity count limits. The experimental
`get-adf-limit-report` reports ADF byte-size breaches; `--field-type` accepts
`comment_adf`, `worklog_adf`, `customfield_adf`, `description_adf`, and
`environment_adf`. Use `--is-returning-keys` to key results by issue key instead
of numeric ID.

### Issue Picker (B523)

| Action   | Positional | Required flags | Optional flags                                                                                                          |
| -------- | ---------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `picker` | —          | —              | `--query`, `--current-jql`, `--current-issue-key`, `--current-project-id`, `--show-sub-tasks`, `--show-sub-task-parent` |

### Bulk Properties (B524, B527)

| Action                         | Positional | Required flags | Optional flags                                         |
| ------------------------------ | ---------- | -------------- | ------------------------------------------------------ |
| `set-properties-by-entity-ids` | —          | —              | `--entity-ids` (CSV int), `--properties` (JSON object) |
| `set-properties-multi`         | —          | `--issues`     | —                                                      |

- `set-properties-by-entity-ids`: sets properties on issues identified by numeric IDs. `--entity-ids` is CSV integers, `--properties` is a JSON object string.
- `set-properties-multi`: `--issues` is a JSON array of `{ issueID, properties }` objects.
- Both return `{ submitted: true }`.

### Bulk Watching (B529, B1022)

| Action              | Positional | Required flags | Optional flags | Returns                                      |
| ------------------- | ---------- | -------------- | -------------- | -------------------------------------------- |
| `watch-issues-bulk` | —          | `--issue-ids`  | —              | `{ taskId }` (async WRITE — starts watching) |
| `is-watching-bulk`  | —          | `--issue-ids`  | —              | `{ issuesIsWatching: { [id]: boolean } }`    |

- `--issue-ids` is comma-separated issue IDs or keys (e.g. `PROJ-1,PROJ-2` or `10001,10002`).
- `watch-issues-bulk` — WRITE: starts bulk-watching; returns `{ taskId }` to poll with `atlas jira bulk get-status <taskId>`.
- `is-watching-bulk` — READ-ONLY (despite POST): checks whether the current user is watching each issue; returns a map of issue ID → boolean. Distinct from `watch-issues-bulk`.

### Archive Export (B538)

| Action            | Positional | Required flags | Optional flags                                                                                 |
| ----------------- | ---------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `export-archived` | —          | —              | `--archived-by`, `--date-after`, `--date-before`, `--issue-types`, `--projects`, `--reporters` |

- List-valued filters are comma-separated.
- `--date-after` and `--date-before` use `YYYY-MM-DD` and must be supplied together.
- The endpoint always produces a CSV download link sent by email; it has no JQL or format selector. Legacy `--jql` and `--export-type` are rejected so an old command cannot silently widen or misrepresent the export.
- This is async (202); the CLI returns the task envelope `{ taskId?, status?, progress?, submittedTime?, payload?, fileUrl? }`. Poll a returned task ID with `atlas jira task get <taskId>`.
- Endpoint: `PUT /rest/api/3/issues/archive/export` (plural `issues`).

```sh
# List worklogs for an issue
atlas jira issues list-worklogs PROJ-42

# Add a worklog
atlas jira issues add-worklog PROJ-42 --body '{"timeSpentSeconds":3600,"started":"2024-01-01T09:00:00.000+0000"}'

# Get a worklog
atlas jira issues get-worklog PROJ-42 10001

# Delete a worklog
atlas jira issues delete-worklog PROJ-42 10001

# Archive issues by ID list (PUT, synchronous)
atlas jira issues archive-issues --ids PROJ-1,PROJ-2

# Archive issues by JQL (POST, async)
atlas jira issues archive-issues-jql --jql "project = PROJ AND status = Done"

# Bulk fetch issues
atlas jira issues bulk-fetch --issues PROJ-1,PROJ-2,PROJ-3

# Bulk fetch with fieldsByKeys and properties
atlas jira issues bulk-fetch --issues PROJ-1 --fields-by-keys --properties prop1,prop2

# Get create metadata
atlas jira issues get-create-meta --project-keys PROJ

# Get issue suggestions
atlas jira issues picker --query "bug"

# Set issue properties by entity IDs
atlas jira issues set-properties-by-entity-ids --entity-ids 10001,10002 --properties '{"flagged":true}'

# Set properties on multiple issues (JSON array body)
atlas jira issues set-properties-multi --issues '[{"issueID":10001,"properties":{"flagged":true}}]'

# Watch issues in bulk (WRITE — starts watching; --issue-ids, not --issues)
atlas jira issues watch-issues-bulk --issue-ids PROJ-1,PROJ-2

# Check if the current user is watching issues (READ-ONLY — returns map of id→boolean)
atlas jira issues is-watching-bulk --issue-ids PROJ-1,PROJ-2,PROJ-5

# Move a worklog (source issue as positional, --ids = worklog IDs, --target-issue = destination)
atlas jira issues move-worklog PROJ-1 --ids 10001,10002 --target-issue PROJ-2

# Get the experimental ADF-size limit report for comments and worklogs
atlas jira issues get-adf-limit-report --field-type comment_adf,worklog_adf --is-returning-keys

# Export archived issues from a project and date range
atlas jira issues export-archived --projects PROJ --date-after 2026-01-01 --date-before 2026-01-31
```

## `changelog`

| Action       | Positional | Required flags | Optional flags                                      |
| ------------ | ---------- | -------------- | --------------------------------------------------- |
| `bulk-fetch` | —          | `--issues`     | `--field-ids`, `--max-results`, `--next-page-token` |

- `--issues` — **comma-separated** list of issue IDs or keys (e.g. `PROJ-1,PROJ-2,10001`). Required (1–1000).
- `--field-ids` — **comma-separated** field IDs (max 10); only entries containing changes to these fields are returned. Sent as the spec field `fieldIds`.
- `--max-results` — page size (1–10000, default 1000).
- `--next-page-token` — opaque cursor from a prior response; pagination is cursor-based, **not** offset (`--start-at`/`--author-ids` are not supported — the spec `BulkChangelogRequestBean` rejects them).
- Endpoint: `POST /rest/api/3/changelog/bulkfetch`.
- **Response shape:** `{ issueChangeLogs: [{ issueId, changeHistories: [...] }], nextPageToken? }` — changelogs are grouped per issue, and the next page is fetched with `nextPageToken` (there is no `.values`/`.total`).

```sh
# Fetch changelogs for two issues
atlas jira changelog bulk-fetch --issues PROJ-1,PROJ-2

# Filter to status changes only
atlas jira changelog bulk-fetch --issues PROJ-1,PROJ-2 --field-ids status

# Fetch the next page using the cursor from a prior response
atlas jira changelog bulk-fetch --issues PROJ-1 --max-results 50 --next-page-token <token>
```

## `issue-attachments`

Covers the platform's `/rest/api/3/attachment` surface (B336, B337, B338–B342) plus the issue-scoped `list` (via `GET /issue/{key}?fields=attachment`) and `upload` (`POST /issue/{key}/attachments`).

| Action               | Positional       | Required flags | Optional flags                                               |
| -------------------- | ---------------- | -------------- | ------------------------------------------------------------ |
| `list`               | `<issueIdOrKey>` | —              | —                                                            |
| `get`                | `<attachmentId>` | —              | —                                                            |
| `delete`             | `<attachmentId>` | —              | —                                                            |
| `expand-human`       | `<attachmentId>` | —              | —                                                            |
| `expand-raw`         | `<attachmentId>` | —              | —                                                            |
| `download-content`   | `<attachmentId>` | —              | `--redirect`                                                 |
| `get-meta`           | —                | —              | —                                                            |
| `download-thumbnail` | `<attachmentId>` | —              | `--redirect`, `--fallback-to-default`, `--width`, `--height` |
| `upload`             | `<issueIdOrKey>` | `--file`       | `--filename`, `--media-type`                                 |

- `expand-human` / `expand-raw` are only meaningful for archive-typed attachments (zip, tar, etc.). `human` returns each entry's `size` as a pre-formatted string (`"2.5 kB"`); `raw` returns it as a byte count.
- `download-content` and `download-thumbnail` buffer the binary response into memory. The CLI prints a `{ "bytes": N }` summary instead of the raw bytes — use the SDK (`client.issueAttachments.downloadContent`) when you need the actual `ArrayBuffer`.
- `--redirect false` asks the server to return the binary body inline instead of a `303` redirect to its media-CDN (server default `true`). The runtime `fetch` follows the redirect transparently either way, so the CLI behaviour is identical; the flag is exposed for API parity. Tri-state — pass a value.
- `--fallback-to-default true|false` (thumbnail only) controls whether the server returns a generic placeholder image when the attachment has no renderable preview (server default `true`); pass `false` to get a `404` instead. Tri-state — pass a value.
- `upload` reads the file from disk into a `Blob` and POSTs multipart form data with `X-Atlassian-Token: no-check` (Jira requires this to bypass XSRF validation). `--filename` defaults to the basename of `--file`.
- `get-meta` returns instance-level settings (`{ enabled, uploadLimit }`); no positional or flags.

```sh
# Get metadata for a specific attachment, then delete it
atlas jira issue-attachments get 10001
atlas jira issue-attachments delete 10001

# List attachments on an issue
atlas jira issue-attachments list PROJ-1

# Inspect a zip attachment's contents
atlas jira issue-attachments expand-human 10001
atlas jira issue-attachments expand-raw 10001

# Download the file bytes (CLI prints { bytes: N } — use the SDK for the buffer).
# `--redirect true|false` is a tri-state filter (server default true). Pass
# `false` to receive the binary body inline; omit for the default. Value required.
atlas jira issue-attachments download-content 10001
atlas jira issue-attachments download-content 10001 --redirect false

# Instance-level attachment settings
atlas jira issue-attachments get-meta

# Render a 200x200 thumbnail with a placeholder fallback.
# `--fallback-to-default true|false` is a tri-state filter (server default true).
# Pass `false` to get a 404 instead of a placeholder; omit for the default. Value required.
atlas jira issue-attachments download-thumbnail 10001 \
  --width 200 --height 200 --fallback-to-default true

# Upload a file from disk to an issue
atlas jira issue-attachments upload PROJ-1 --file ./screenshot.png --media-type image/png
```

## `issue-comments`

Full comment CRUD + property surface + bulk fetch (B1012, B356–B360). Wired via `client.issueComments.*`.

| Action            | Positional                   | Required flags    | Optional flags                                          |
| ----------------- | ---------------------------- | ----------------- | ------------------------------------------------------- |
| `list`            | `<issueIdOrKey>`             | —                 | `--start-at`, `--max-results`, `--order-by`, `--expand` |
| `get`             | `<issueIdOrKey> <commentId>` | —                 | —                                                       |
| `create`          | `<issueIdOrKey>`             | `--body` (JSON)   | —                                                       |
| `update`          | `<issueIdOrKey> <commentId>` | `--body` (JSON)   | —                                                       |
| `delete`          | `<issueIdOrKey> <commentId>` | —                 | —                                                       |
| `list-properties` | `<commentId>`                | —                 | —                                                       |
| `get-property`    | `<commentId> <propertyKey>`  | —                 | —                                                       |
| `set-property`    | `<commentId> <propertyKey>`  | `--value` (JSON)  | —                                                       |
| `delete-property` | `<commentId> <propertyKey>`  | —                 | —                                                       |
| `bulk-fetch`      | —                            | `--ids` (CSV int) | `--expand`                                              |

- `--body` for `create`/`update` must be a JSON object matching `CreateIssueCommentData` / `UpdateIssueCommentData`: `{ body: <ADF doc>, visibility?: { type, value } }`. The ADF body is Atlassian Document Format.
- `--value` is parsed as JSON; pass any scalar, object, or array (e.g. `--value '{"flag":true}'`, `--value 42`, `--value '"plain"'`).
- `--ids` is a comma-separated list of integer comment IDs. The Jira API caps the list at 1000 IDs.
- `--expand` accepts a comma-separated list (e.g. `renderedBody,properties`).

```sh
# List comments on an issue
atlas jira issue-comments list PROJ-123

# List with pagination and sort order
atlas jira issue-comments list PROJ-123 --start-at 0 --max-results 20 --order-by=-created

# Get a single comment
atlas jira issue-comments get PROJ-123 10001

# Create a comment (ADF body)
atlas jira issue-comments create PROJ-123 --body '{"body":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}}'

# Update a comment
atlas jira issue-comments update PROJ-123 10001 --body '{"body":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Updated"}]}]}}'

# Delete a comment
atlas jira issue-comments delete PROJ-123 10001

# List property keys on a comment
atlas jira issue-comments list-properties 10001

# Get a single property
atlas jira issue-comments get-property 10001 my-key

# Set/overwrite a property with arbitrary JSON
atlas jira issue-comments set-property 10001 my-key --value '{"approved":true,"reviewer":"alice"}'

# Delete a property
atlas jira issue-comments delete-property 10001 my-key

# Bulk fetch comments by IDs
atlas jira issue-comments bulk-fetch --ids 10001,10002,10003

# Bulk fetch with rendered body
atlas jira issue-comments bulk-fetch --ids 10001,10002 --expand renderedBody,properties
```

## `issuelinktype`

Issue link type management (B533-B537). Covers the full `/rest/api/3/issueLinkType` surface.

| Action   | Positional          | Required flags                                    | Optional flags |
| -------- | ------------------- | ------------------------------------------------- | -------------- |
| `list`   | —                   | —                                                 | —              |
| `get`    | `<issueLinkTypeId>` | —                                                 | —              |
| `create` | —                   | `--name`, `--inward`, `--outward`                 | —              |
| `update` | `<issueLinkTypeId>` | at least one of `--name`, `--inward`, `--outward` | —              |
| `delete` | `<issueLinkTypeId>` | —                                                 | —              |

- `--name`: display name of the link type (e.g. "Blocks").
- `--inward`: label for the inward direction (e.g. "is blocked by").
- `--outward`: label for the outward direction (e.g. "blocks").
- `id` and `self` are server-assigned; never sent in create/update bodies.

```sh
# List all issue link types — B533
atlas jira issuelinktype list

# Get a specific issue link type — B536
atlas jira issuelinktype get 10001

# Create a new issue link type — B534
atlas jira issuelinktype create --name "Blocks" --inward "is blocked by" --outward "blocks"

# Update an issue link type — B537
atlas jira issuelinktype update 10001 --name "Clones" --inward "is cloned by" --outward "clones"

# Delete an issue link type — B535
atlas jira issuelinktype delete 10001
```

## `issue-link`

Issue link instance management (B530-B532). Covers create/get/delete of link instances under `/rest/api/3/issueLink`. Distinct from `issuelinktype` which manages link type definitions.

| Action   | Positional | Required flags                                                                    | Optional flags |
| -------- | ---------- | --------------------------------------------------------------------------------- | -------------- |
| `create` | —          | `--link-type` or `--link-type-id` (not both), `--inward-issue`, `--outward-issue` | `--comment`    |
| `get`    | `<linkId>` | —                                                                                 | —              |
| `delete` | `<linkId>` | —                                                                                 | —              |

- `--link-type`: name of the link type (e.g. "Blocks", "Duplicate"); sent as `{"name": ...}`.
- `--link-type-id`: ID of the link type (e.g. "10000", from `atlas jira issuelinktype list`); sent as `{"id": ...}`. Use it when names are renamed or duplicated.
- `--inward-issue` / `--outward-issue`: key (e.g. "HSP-1") or ID (e.g. "10001") of the inward / outward issue. A value of all digits is sent as `{"id": ...}`, anything else as `{"key": ...}`.
- `--comment`: JSON object added as a comment on the outward issue, in Jira's `Comment` shape: `{"body": <ADF doc>, "visibility"?: {"type": "group"|"role", "value"|"identifier": ...}}`.
- `create` returns `{ created: true }` — the spec 201 response has an empty body.
- `delete` returns `{ deleted: true }` (spec 204).

```sh
# Create an issue link — B530
atlas jira issue-link create --link-type "Blocks" --inward-issue "HSP-1" --outward-issue "MKY-1"

# Create a link and comment on the outward issue in the same call
atlas jira issue-link create --link-type "Blocks" --inward-issue "HSP-1" --outward-issue "MKY-1" \
  --comment '{"body":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Blocked by HSP-1"}]}]}}'

# Link by issue ID and link-type ID
atlas jira issue-link create --link-type-id 10000 --inward-issue 10001 --outward-issue 10002

# Get an issue link by ID — B532
atlas jira issue-link get 10001

# Delete an issue link — B531
atlas jira issue-link delete 10001
```

## `worklog`

Global worklog surface (B890–B892). Covers `/rest/api/3/worklog` — distinct
from the per-issue worklog endpoints on `issues`.

`ChangedWorklogs` uses a custom `since`/`until`/`lastPage` cursor; to iterate
all pages, check `lastPage` and call again with `since = until` from the prior
response.

| Action    | Required flags | Optional flags        |
| --------- | -------------- | --------------------- |
| `deleted` | —              | `--since`             |
| `list`    | `--ids`        | `--expand`            |
| `updated` | —              | `--since`, `--expand` |

- `deleted` — GET /rest/api/3/worklog/deleted. Returns `ChangedWorklogs`.
- `list` — POST /rest/api/3/worklog/list. `--ids` is a CSV of worklog IDs (1–1000). Returns a bare array of `Worklog` objects.
- `updated` — GET /rest/api/3/worklog/updated. Returns `ChangedWorklogs`.

```sh
# Get IDs of all worklogs deleted since a timestamp
atlas jira worklog deleted --since 1700000000000

# Get full worklog records by IDs
atlas jira worklog list --ids 1,2,5,10

# Get worklog records with expanded properties
atlas jira worklog list --ids 1,2,5 --expand properties

# Get IDs of worklogs updated since a timestamp
atlas jira worklog updated --since 1700000000000

# Get updated worklog IDs with field expansion
atlas jira worklog updated --since 1700000000000 --expand properties
```
