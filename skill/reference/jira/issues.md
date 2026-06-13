# Jira — Issues, comments, attachments, links, worklogs, changelog

> Part of the `atlas` Jira skill reference. Resource×action matrix and routing in [`../jira.md`](../jira.md).

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

### Assignee (B478)

| Action   | Positional   | Required flags | Optional flags |
| -------- | ------------ | -------------- | -------------- |
| `assign` | `<issueKey>` | —              | `--account-id` |

- `assign` sets the assignee to the user identified by `--account-id`.
- **Omit `--account-id` to unassign** the issue (sends `accountId: null`).

```sh
# Assign an issue to a user
atlas jira issues assign PROJ-42 --account-id 5b10ac8d82e05b22cc7d4ef5

# Unassign an issue (omit --account-id)
atlas jira issues assign PROJ-42
```

### Changelog & Edit Metadata (B480, B481, B487)

| Action             | Positional   | Required flags | Optional flags                |
| ------------------ | ------------ | -------------- | ----------------------------- |
| `get-changelog`    | `<issueKey>` | —              | `--start-at`, `--max-results` |
| `filter-changelog` | `<issueKey>` | `--ids`        | —                             |
| `get-editmeta`     | `<issueKey>` | —              | —                             |

- `get-changelog` is offset-paginated via `--start-at` / `--max-results`.
- `filter-changelog` `--ids` is a **comma-separated** list of positive-integer changelog entry IDs.
- `get-editmeta` returns the fields editable on the issue (with allowed values) — inspect before `update`.

```sh
atlas jira issues get-changelog PROJ-42 --start-at 0 --max-results 50
atlas jira issues filter-changelog PROJ-42 --ids 10001,10002
atlas jira issues get-editmeta PROJ-42
```

### Notifications (B488)

| Action   | Positional   | Required flags  | Optional flags |
| -------- | ------------ | --------------- | -------------- |
| `notify` | `<issueKey>` | `--body` (JSON) | —              |

- `--body` is a JSON object matching `IssueNotifyData`: `{ subject?, textBody?, htmlBody?, to?, restrict? }`. `to` selects recipients (e.g. `{ "reporter": true, "assignee": true, "users": [{ "accountId": "5b10..." }] }`); `restrict` limits delivery by group or permission.

```sh
atlas jira issues notify PROJ-42 --body '{"subject":"Heads up","textBody":"Please review","to":{"assignee":true,"reporter":true}}'
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
| `delete-all-remotelinks` | `<issueKey>`            | —               | `--global-id`  |

- `list-remotelinks` returns **all remote links on the issue**; pass `--global-id` to fetch only the link with that global ID.
- `--body` for `create-remotelink` / `update-remotelink` is a JSON object matching `CreateRemoteLinkData`: `{ object: { url, title, summary?, icon?, status? }, globalId?, relationship?, application? }`. `object.url` and `object.title` are the practical minimum.
- `delete-all-remotelinks` deletes every remote link on the issue, or only the one matching `--global-id`.

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

# Delete one remote link, or all of them
atlas jira issues delete-remotelink PROJ-42 10001
atlas jira issues delete-all-remotelinks PROJ-42
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
| `remove-watcher` | `<issueKey>` | —              | `--account-id` |

- `add-watcher` requires `--account-id` — the user to start watching the issue.
- `remove-watcher` without `--account-id` removes the **current user**; pass `--account-id` to remove a specific watcher.

```sh
atlas jira issues get-watchers PROJ-42
atlas jira issues add-watcher PROJ-42 --account-id 5b10ac8d82e05b22cc7d4ef5
atlas jira issues remove-watcher PROJ-42 --account-id 5b10ac8d82e05b22cc7d4ef5
```

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

### Worklog (B505–B515)

| Action                    | Positional                                 | Required flags | Optional flags                                                                                                 |
| ------------------------- | ------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------- |
| `delete-all-worklogs`     | `<issueIdOrKey>`                           | `--ids`        | —                                                                                                              |
| `list-worklogs`           | `<issueIdOrKey>`                           | —              | `--start-at`, `--max-results`, `--started-after`, `--started-before`, `--expand`                               |
| `add-worklog`             | `<issueIdOrKey>`                           | `--body`       | `--notify-users`, `--adjust-estimate`, `--new-estimate`, `--reduce-by`, `--expand`, `--override-editable-flag` |
| `delete-worklog`          | `<issueIdOrKey>` `<worklogId>`             | —              | `--notify-users`, `--adjust-estimate`, `--new-estimate`, `--increase-by`, `--override-editable-flag`           |
| `get-worklog`             | `<issueIdOrKey>` `<worklogId>`             | —              | `--expand`                                                                                                     |
| `update-worklog`          | `<issueIdOrKey>` `<worklogId>`             | `--body`       | `--notify-users`, `--adjust-estimate`, `--new-estimate`, `--expand`, `--override-editable-flag`                |
| `list-worklog-properties` | `<issueIdOrKey>` `<worklogId>`             | —              | —                                                                                                              |
| `delete-worklog-property` | `<issueIdOrKey>` `<worklogId>` `<propKey>` | —              | —                                                                                                              |
| `get-worklog-property`    | `<issueIdOrKey>` `<worklogId>` `<propKey>` | —              | —                                                                                                              |
| `set-worklog-property`    | `<issueIdOrKey>` `<worklogId>` `<propKey>` | `--value`      | —                                                                                                              |
| `move-worklog`            | `<issueIdOrKey>`                           | `--ids`        | `--target-issue`, `--adjust-estimate`, `--override-editable-flag`                                              |

- `delete-all-worklogs`: `--ids` is a comma-separated list of worklog IDs (integers) to delete in bulk (spec: `bulkDeleteWorklogs` requires `WorklogIdsRequestBean { ids }`).
- `--body` is a JSON object string, e.g. `--body '{"timeSpentSeconds":3600,"started":"2024-01-01T09:00:00.000+0000"}'`.
- `--adjust-estimate` accepts: `new`, `leave`, `manual`, `auto`.
- `--notify-users`, `--override-editable-flag` are bare boolean flags.
- `move-worklog`: `<issueIdOrKey>` = SOURCE issue (path); `--ids` = comma-separated worklog IDs (integers); `--target-issue` = DESTINATION issue key (body).

### Issue Archive/Unarchive (B516, B517, B528)

| Action               | Positional | Required flags | Optional flags |
| -------------------- | ---------- | -------------- | -------------- |
| `archive-issues`     | —          | `--ids`        | —              |
| `archive-issues-jql` | —          | `--jql`        | —              |
| `unarchive-issues`   | —          | `--ids`        | —              |

- `archive-issues` uses PUT (synchronous, by ID list); `archive-issues-jql` uses POST (async, by JQL).
- `archive-issues-jql` returns the task-status URL string (202 response) — poll it to track completion.
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

### Issue Limit Report (B522)

| Action             | Positional | Required flags | Optional flags |
| ------------------ | ---------- | -------------- | -------------- |
| `get-limit-report` | —          | —              | —              |

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

| Action            | Positional | Required flags | Optional flags           |
| ----------------- | ---------- | -------------- | ------------------------ |
| `export-archived` | —          | —              | `--jql`, `--export-type` |

- `--export-type` accepts `CSV` or `XLSX`.
- This is async (202); the CLI returns `{ submitted: true }`.
- **Note**: uses `/rest/api/3/issues/archive/export` (plural "issues").

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

# Export archived issues
atlas jira issues export-archived --jql "project = PROJ AND isArchived = true" --export-type CSV
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
- `--redirect=false` asks the server to return the binary body inline instead of a `303` redirect to its media-CDN. The runtime `fetch` follows the redirect transparently either way, so the CLI behaviour is identical; the flag is exposed for API parity.
- `--fallback-to-default=true` (thumbnail only) returns a generic placeholder image when the attachment has no renderable preview, instead of `404`.
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
# `--redirect` is a presence-only boolean flag (follow the redirect to the binary);
# omit it for the default. It takes no value.
atlas jira issue-attachments download-content 10001
atlas jira issue-attachments download-content 10001 --redirect

# Instance-level attachment settings
atlas jira issue-attachments get-meta

# Render a 200x200 thumbnail with a placeholder fallback.
# `--fallback-to-default` is a presence-only boolean flag (takes no value).
atlas jira issue-attachments download-thumbnail 10001 \
  --width 200 --height 200 --fallback-to-default

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
atlas jira issue-comments list PROJ-123 --start-at 0 --max-results 20 --order-by -created

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

| Action   | Positional | Required flags                                     | Optional flags |
| -------- | ---------- | -------------------------------------------------- | -------------- |
| `create` | —          | `--link-type`, `--inward-issue`, `--outward-issue` | —              |
| `get`    | `<linkId>` | —                                                  | —              |
| `delete` | `<linkId>` | —                                                  | —              |

- `--link-type`: name of the link type (e.g. "Blocks", "Duplicate").
- `--inward-issue`: key of the inward issue (e.g. "HSP-1").
- `--outward-issue`: key of the outward issue (e.g. "MKY-1").
- `create` returns `{ created: true }` — the spec 201 response has an empty body.
- `delete` returns `{ deleted: true }` (spec 204).

```sh
# Create an issue link — B530
atlas jira issue-link create --link-type "Blocks" --inward-issue "HSP-1" --outward-issue "MKY-1"

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
