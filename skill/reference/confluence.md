# Confluence reference — `atlas confluence`

Confluence Cloud REST API v2 surface. Load this file when you need a flag or action the canonical examples in `SKILL.md` don't cover.

## Resource × action matrix

| Resource                | Actions                                                                                                                                                                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages`                 | `list`, `get`, `create`, `update`, `delete`                                                                                                                                                                                                                                 |
| `spaces`                | `list`, `get`                                                                                                                                                                                                                                                               |
| `blog-posts`            | `list`, `get`, `create`, `update`, `delete`                                                                                                                                                                                                                                 |
| `comments`              | `list`, `get`, `create`, `delete`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`                                                                                                                                               |
| `attachments`           | `list`, `get`, `delete`                                                                                                                                                                                                                                                     |
| `labels`                | `list`, `list-all`, `attachments`, `blog-posts`, `pages`                                                                                                                                                                                                                    |
| `admin-key`             | `get`, `create`, `delete`                                                                                                                                                                                                                                                   |
| `app`                   | `list-properties`, `get-property`, `upsert-property`, `delete-property`                                                                                                                                                                                                     |
| `classification-levels` | `list`                                                                                                                                                                                                                                                                      |
| `content`               | `convert-ids-to-types`                                                                                                                                                                                                                                                      |
| `data-policies`         | `get-metadata`, `list-spaces`                                                                                                                                                                                                                                               |
| `databases`             | `create`, `get`, `delete`, `ancestors`, `descendants`, `direct-children`, `operations`, `get-classification-level`, `update-classification-level`, `reset-classification-level`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property` |
| `folders`               | `create`, `get`, `delete`, `ancestors`, `descendants`, `direct-children`, `operations`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`                                                                                          |
| `footer-comments`       | `list`, `get`, `update`, `children`, `likes-count`, `likes-users`, `operations`, `versions`, `version`                                                                                                                                                                      |
| `space-permissions`     | `list`                                                                                                                                                                                                                                                                      |
| `space-role-mode`       | `get`                                                                                                                                                                                                                                                                       |
| `space-roles`           | `list`, `get`, `create`, `update`, `delete`                                                                                                                                                                                                                                 |
| `tasks`                 | `list`, `get`, `update`                                                                                                                                                                                                                                                     |
| `users`                 | `check-access-by-email`, `invite-by-email`                                                                                                                                                                                                                                  |
| `users-bulk`            | `lookup`                                                                                                                                                                                                                                                                    |
| `whiteboards`           | `create`, `get`, `delete`, `ancestors`, `descendants`, `direct-children`, `operations`, `get-classification-level`, `update-classification-level`, `reset-classification-level`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property` |

## `pages`

| Action   | Positional | Required flags                          | Optional flags                                                              |
| -------- | ---------- | --------------------------------------- | --------------------------------------------------------------------------- |
| `list`   | —          | —                                       | `--space-id`, `--title`, `--status`, `--limit`, `--cursor`, `--body-format` |
| `get`    | `<pageId>` | —                                       | —                                                                           |
| `create` | —          | `--space-id`, `--title`, `--body`       | —                                                                           |
| `update` | `<pageId>` | `--version-number`, `--title`, `--body` | —                                                                           |
| `delete` | `<pageId>` | —                                       | `--purge`                                                                   |

- `--body-format` accepts `storage` (default Confluence storage XML).
- `--version-number` for `update` must be a positive integer equal to the current version (which you get from `pages get`). Confluence enforces optimistic concurrency; mismatches return 409.
- `--purge` on `delete` permanently removes the page; without it the page goes to trash.

## `spaces`

| Action | Positional  | Optional flags        |
| ------ | ----------- | --------------------- |
| `list` | —           | `--limit`, `--cursor` |
| `get`  | `<spaceId>` | —                     |

## `blog-posts`

Same shape as `pages`: `list`, `get <id>`, `create --space-id --title --body`, `update <id> --version-number --title --body`, `delete <id> [--purge]`.

## `comments`

| Action            | Positional    | Required flags                                          | Optional flags                           |
| ----------------- | ------------- | ------------------------------------------------------- | ---------------------------------------- |
| `list`            | —             | one of `--page-id` or `--blog-post-id`                  | `--limit`, `--cursor`, `--comment-type`  |
| `get`             | `<commentId>` | —                                                       | —                                        |
| `create`          | —             | one of `--page-id` or `--blog-post-id`, `--body`        | —                                        |
| `delete`          | `<commentId>` | —                                                       | —                                        |
| `list-properties` | `<commentId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit` |
| `create-property` | `<commentId>` | `--key`, `--value`                                      | —                                        |
| `get-property`    | `<commentId>` | `--property-id`                                         | —                                        |
| `update-property` | `<commentId>` | `--property-id`, `--key`, `--value`, `--version-number` | —                                        |
| `delete-property` | `<commentId>` | `--property-id`                                         | —                                        |

- `--comment-type` accepts `footer` (top-level) or `inline`. Default is `footer`.
- The `*-property` actions hit `/comments/{comment-id}/properties[/{property-id}]` and work for both footer and inline comments — Confluence resolves the comment by id regardless of type, so no `--comment-type` flag is needed.
- `--sort` on `list-properties` accepts `key` or `-key`.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409).

## `attachments`

| Action   | Positional       | Optional flags                     |
| -------- | ---------------- | ---------------------------------- |
| `list`   | —                | `--page-id`, `--limit`, `--cursor` |
| `get`    | `<attachmentId>` | —                                  |
| `delete` | `<attachmentId>` | —                                  |

Upload is not exposed via the CLI; use the SDK's `attachments.upload()` with a `Blob` or `ReadableStream`.

## `labels`

| Action        | Positional  | Required flags | Optional flags                                                 |
| ------------- | ----------- | -------------- | -------------------------------------------------------------- |
| `list`        | —           | `--page-id`    | `--limit`, `--cursor`                                          |
| `list-all`    | —           | —              | `--label-id`, `--prefix`, `--sort`, `--limit`, `--cursor`      |
| `attachments` | `<labelId>` | —              | `--sort`, `--limit`, `--cursor`                                |
| `blog-posts`  | `<labelId>` | —              | `--space-id`, `--body-format`, `--sort`, `--limit`, `--cursor` |
| `pages`       | `<labelId>` | —              | `--space-id`, `--body-format`, `--sort`, `--limit`, `--cursor` |

- `list-all` hits the tenant-wide `GET /labels`. `--label-id` and `--prefix` accept comma-separated values (the wire format expects a single CSV string).
- `attachments`, `blog-posts`, `pages` walk the inverse relations: given a label id, return the content tagged with it. They share `--limit` / `--cursor` cursor pagination.
- `--sort` enums per action:
  - `list-all`: `created-date`, `-created-date`, `id`, `-id`, `name`, `-name`
  - `attachments`: `created-date`, `-created-date`, `modified-date`, `-modified-date`
  - `blog-posts`: `id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`
  - `pages`: same as `blog-posts` plus `title` / `-title`
- `--body-format` (pages / blog-posts) accepts `storage` or `atlas_doc_format`.
- `--space-id` (pages / blog-posts) accepts a comma-separated list to filter results to specific spaces.

## `admin-key`

The admin key is a tenant-scoped, time-bound credential that lets an organisation admin perform privileged operations (e.g. permanently delete pages or spaces) without per-request elevation. Only one key may be active at a time — `create` rotates an existing key.

| Action   | Positional | Optional flags     |
| -------- | ---------- | ------------------ |
| `get`    | —          | —                  |
| `create` | —          | `--duration-hours` |
| `delete` | —          | —                  |

- `--duration-hours` must be a positive integer; the Confluence server currently accepts 1-24 (default 1). Omit the flag to use the server default.
- `delete` is idempotent; calling it when no key exists returns success.

```sh
# Inspect the active admin key (if any)
atlas confluence admin-key get

# Enable an admin key for the server default duration
atlas confluence admin-key create

# Rotate / enable with an explicit duration (hours)
atlas confluence admin-key create --duration-hours 4

# Revoke
atlas confluence admin-key delete
```

## `app`

App properties are per-Forge / Connect-app key-value storage; they are scoped
to the calling app, **not** to any page, space, or user. The CLI exposes the
four v2 `/app/properties` endpoints.

| Action            | Positional      | Required flags | Optional flags        |
| ----------------- | --------------- | -------------- | --------------------- |
| `list-properties` | —               | —              | `--limit`, `--cursor` |
| `get-property`    | `<propertyKey>` | —              | —                     |
| `upsert-property` | `<propertyKey>` | `--value`      | —                     |
| `delete-property` | `<propertyKey>` | —              | —                     |

- `--value` accepts any JSON literal; pass it quoted, e.g.
  `--value '{"darkMode":true,"buildNumber":7}'` or `--value '"hello"'`. A bare
  string (e.g. `--value hello`) that does not parse as JSON is stored as the
  literal string `"hello"`.
- `upsert-property` is a single PUT — it creates the key if absent and replaces
  the existing value otherwise. There is no version field; Confluence does not
  enforce optimistic concurrency on app properties.
- The CLI authenticates as the calling user, so it can only see / mutate
  properties belonging to the app whose credentials you supply.

```sh
# List the first 25 properties this app has stored
atlas confluence app list-properties --limit 25

# Read a single property
atlas confluence app get-property my-feature-flags

# Create / replace a property with a JSON object value
atlas confluence app upsert-property my-feature-flags --value '{"beta":true}'

# Delete a property
atlas confluence app delete-property my-feature-flags
```

## `classification-levels`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `list` | —          | —              | —              |

Lists the data-classification levels defined for the Confluence Cloud organization (`GET /wiki/api/v2/classification-levels`). Requires the `read:configuration:confluence` OAuth scope (or `READ` Connect app scope) and the `Can use` global permission. Returns a JSON array of `ClassificationLevel` objects (`id`, `status`, `order`, `name`, `description`, `guideline`, `color`); responds 404 when the site edition has no data-classification entitlement.

```sh
atlas confluence classification-levels list
```

## `content`

Helpers that operate on raw v2 content identifiers without binding to one of the typed resources.

| Action                 | Positional | Required flags | Optional flags |
| ---------------------- | ---------- | -------------- | -------------- |
| `convert-ids-to-types` | —          | `--ids`        | —              |

`POST /wiki/api/v2/content/convert-ids-to-types` maps a batch of content ids
into their associated v2 content types. Useful when migrating from v1 (which
collapsed inline + footer comments under the single `comment` type) — v2
returns `inline-comment` / `footer-comment` distinctly, plus `page`,
`blogpost`, `attachment`, or a custom content type string. Ids the caller
cannot view or that do not exist appear in `results` with a `null` value.

- `--ids` accepts either a comma-separated list (`--ids 12345,67890`) or a
  JSON array (`--ids '["12345",67890]'`). JSON wins when the value parses as
  an array; otherwise the value is split on commas. The Confluence server
  caps each request at 100 ids and rejects oversize requests with a 400.
- Ids may be strings or numbers per the OpenAPI spec; this CLI preserves
  whatever form you pass — numeric ids are not silently coerced.

```sh
# Convert a small comma-separated batch
atlas confluence content convert-ids-to-types --ids 12345,67890,11111

# JSON form (mixed string / number)
atlas confluence content convert-ids-to-types --ids '["12345",67890]'
```

## `data-policies`

| Action         | Positional | Required flags | Optional flags                                     |
| -------------- | ---------- | -------------- | -------------------------------------------------- |
| `get-metadata` | —          | —              | —                                                  |
| `list-spaces`  | —          | —              | `--ids`, `--keys`, `--sort`, `--limit`, `--cursor` |

Surfaces the Confluence v2 data-policies API. Both endpoints are **app-only**
(Forge / Connect) — user-token callers receive `403 Forbidden`, and the site
must have the data-policies entitlement enabled. The metadata endpoint also
requires the `read:configuration:confluence` OAuth scope (or `READ` Connect
app scope); the spaces endpoint additionally needs `read:space:confluence`.

- `get-metadata` → `GET /wiki/api/v2/data-policies/metadata` returns
  `{ anyContentBlocked?: boolean }` describing the workspace as a whole.
- `list-spaces` → `GET /wiki/api/v2/data-policies/spaces` returns the standard
  `{ results, _links }` cursor-paginated wrapper with `DataPolicySpace`
  entries (`id`, `key`, `name`, `dataPolicy.anyContentBlocked`, etc.). The
  server caps `--limit` at 1-250 (default 25); only spaces the app can view
  are returned.
- `--ids` and `--keys` accept comma-separated lists (e.g. `--ids 1,2,3` or
  `--keys ENG,OPS`). Whitespace per entry is trimmed; empty entries are
  dropped; an effectively-empty value is omitted from the query rather than
  sent as a blank filter. The server caps each list at 250 entries.
- `--sort` accepts `id`, `-id`, `key`, `-key`, `name`, `-name` (prefix `-`
  flips direction). Unknown values are rejected client-side.

```sh
# Workspace-wide flag indicating whether any content is blocked
atlas confluence data-policies get-metadata

# First page of spaces with data policies (server default 25 per page)
atlas confluence data-policies list-spaces

# Filter to specific space keys, sort by descending key, larger page
atlas confluence data-policies list-spaces --keys ENG,OPS --sort -key --limit 50

# Filter by IDs
atlas confluence data-policies list-spaces --ids 100,200,300
```

## `space-permissions`

| Action | Positional | Required flags | Optional flags        |
| ------ | ---------- | -------------- | --------------------- |
| `list` | —          | —              | `--limit`, `--cursor` |

Lists the _available_ space-permission definitions for the Confluence Cloud organization (`GET /wiki/api/v2/space-permissions`). These describe the permissions the platform supports (`id`, `displayName`, `description`, `requiredPermissionIds`) — they are **not** per-space grants. Per-space assignments are exposed by the separate `/spaces/{id}/permissions` endpoint (not covered here). Requires the `read:space.permission:confluence` OAuth scope (or `READ` Connect app scope); available on tenants with Role-Based Access Control. Returns the standard `{ results, _links }` cursor-paginated wrapper; `--limit` accepts 1-250 (server default 25).

```sh
# First page (server default 25 per page)
atlas confluence space-permissions list

# Larger page
atlas confluence space-permissions list --limit 100

# Next page using the cursor from _links.next
atlas confluence space-permissions list --cursor "<value-from-response>"
```

## `space-role-mode`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `get`  | —          | —              | —              |

Retrieves the tenant's space role mode (`GET /wiki/api/v2/space-role-mode`). Available on sites with [Role-Based Access Control](https://support.atlassian.com/confluence-cloud/docs/manage-user-roles/). Requires the `read:configuration:confluence` OAuth scope (or `READ` Connect app scope) and the `Can use` global permission. Returns a JSON object `{ "mode": "PRE_ROLES" | "ROLES_TRANSITION" | "ROLES" }`; the field is omitted on tenants that don't surface a mode, so callers should treat it as optional. Responds 404 when the calling user lacks permission to view the role mode.

```sh
atlas confluence space-role-mode get
```

## `space-roles`

Manages Confluence space roles (`/wiki/api/v2/space-roles`). Available on tenants with Role-Based Access Control. The list endpoint returns the standard `{ results, _links }` cursor-paginated wrapper; `create` returns the new role; `update` and `delete` return 202 with an async `taskId` callers can poll for the underlying permission-rewrite job.

| Action   | Positional | Required flags                                   | Optional flags                                                                           |
| -------- | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `list`   | —          | —                                                | `--space-id`, `--role-type`, `--principal-id`, `--principal-type`, `--limit`, `--cursor` |
| `get`    | `<roleId>` | —                                                | —                                                                                        |
| `create` | —          | `--name`, `--description`, `--space-permissions` | —                                                                                        |
| `update` | `<roleId>` | `--name`, `--description`, `--space-permissions` | `--anonymous-reassignment-role-id`, `--guest-reassignment-role-id`                       |
| `delete` | `<roleId>` | —                                                | —                                                                                        |

- `--role-type` accepts `SYSTEM` or `CUSTOM`. `SYSTEM` roles are platform-defined and not user-editable; `CUSTOM` are tenant-created.
- `--principal-type` accepts `USER`, `GROUP`, or `ACCESS_CLASS` and restricts the listing to roles available for the named principal class.
- `--space-permissions` is a comma-separated list of space-permission ids (e.g. `read/space,write/space`). Retrieve valid ids from `atlas confluence space-permissions list`. The CLI trims whitespace per entry and rejects an all-empty payload before issuing the request.
- `update` and `delete` return `{ "taskId": "..." }` (HTTP 202). The task tears down or rewrites per-space permission assignments asynchronously — poll the task to confirm completion before relying on the new permission state.
- `--anonymous-reassignment-role-id` / `--guest-reassignment-role-id` on `update` migrate anonymous-access / guest assignments away from the role being modified. Leave unset to keep them in place.

```sh
# List custom roles (server default 25 per page)
atlas confluence space-roles list --role-type=CUSTOM

# Filter to roles available for a specific principal
atlas confluence space-roles list --principal-id acc-123 --principal-type=USER

# Fetch a single role
atlas confluence space-roles get role-1

# Create a custom role
atlas confluence space-roles create --name "Editor" --description "Edit pages" --space-permissions read/space,write/space

# Update a role (returns a taskId — poll until done)
atlas confluence space-roles update role-1 --name "Editor v2" --description "Updated description" --space-permissions read/space,write/space

# Delete a role (returns a taskId — poll until done)
atlas confluence space-roles delete role-1
```

## `tasks`

Inline action items embedded in Confluence pages or blog posts. Each task is
identified by a server-assigned string ID. The CLI exposes the three v2
`/tasks` endpoints — list with rich filtering, fetch a single task, and toggle
its `status` between `incomplete` and `complete`.

| Action   | Positional | Required flags | Optional flags                                                                                                                                                                                                                                                   |
| -------- | ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`   | —          | —              | `--body-format`, `--include-blank-tasks`, `--status`, `--task-id`, `--space-id`, `--page-id`, `--blog-post-id`, `--created-by`, `--assigned-to`, `--completed-by`, `--created-at-from`, `--created-at-to`, `--due-at-from`, `--due-at-to`, `--limit`, `--cursor` |
| `get`    | `<taskId>` | —              | `--body-format`                                                                                                                                                                                                                                                  |
| `update` | `<taskId>` | `--status`     | —                                                                                                                                                                                                                                                                |

- `--status` accepts `incomplete` or `complete` (the only two task states v2 surfaces). On `update` it's required and toggles the task. On `list` it filters results.
- `--task-id` filters to a single numeric platform task ID (distinct from the string task ID positional argument used by `get` / `update`).
- `--include-blank-tasks` includes tasks whose `body` is empty (e.g. checkboxes without inline text). Omit to hide them.
- `--body-format` accepts `storage` or `atlas_doc_format` and controls the representation of the task body when present.
- The date-range filters (`--created-at-from`, `--created-at-to`, `--due-at-from`, `--due-at-to`) accept ISO-8601 timestamps (e.g. `2026-01-01T00:00:00Z`); ranges are inclusive on both ends.
- `--space-id`, `--page-id`, `--blog-post-id` scope the listing to tasks within that container; combine to narrow further. The user-attribution filters (`--created-by`, `--assigned-to`, `--completed-by`) accept Atlassian account IDs.
- Pagination is cursor-based — extract `cursor=…` from `_links.next` and pass it as `--cursor` on the follow-up call.
- `update` only changes `status`; the task body, assignee, due date, and container are immutable through this endpoint.

```sh
# All incomplete tasks across the site (first page)
atlas confluence tasks list --status incomplete --limit 25

# Tasks assigned to a particular user on a page
atlas confluence tasks list --page-id 12345 --assigned-to acc-123

# Tasks completed in a date window
atlas confluence tasks list --status complete --completed-by acc-123 \
  --created-at-from 2026-01-01T00:00:00Z --created-at-to 2026-02-01T00:00:00Z

# Read a single task (with rendered body)
atlas confluence tasks get task-1 --body-format storage

# Mark a task complete
atlas confluence tasks update task-1 --status complete

# Reopen a task
atlas confluence tasks update task-1 --status incomplete
```

## `users`

Single-user access controls. Bulk account-ID resolution lives under the
separate `users-bulk` resource below.

| Action                  | Positional | Required flags | Optional flags |
| ----------------------- | ---------- | -------------- | -------------- |
| `check-access-by-email` | —          | `--emails`     | —              |
| `invite-by-email`       | —          | `--emails`     | —              |

- `check-access-by-email` (`POST /wiki/api/v2/user/access/check-access-by-email`)
  returns the subset of the input that does **not** have site access plus any
  syntactically invalid entries: `{ emailsWithoutAccess?, invalidEmails? }`.
  Either bucket may be omitted when empty. Requires the `Can use` Confluence
  global permission (and the `read:configuration:confluence` OAuth scope for
  app-authenticated callers).
- `invite-by-email` (`POST /wiki/api/v2/user/access/invite-by-email`) is
  asynchronous — a successful 200 means the invitations were accepted for
  processing, not that the accounts are provisioned. Invalid emails are
  silently dropped server-side and already-provisioned emails are no-ops.
  The CLI prints `{ "invited": true }` on success.
- `--emails` is a comma-separated list (`--emails a@example.com,b@example.com`).
  Surrounding whitespace per entry is trimmed; empty entries are dropped. The
  CLI rejects an empty effective list before issuing the request. Confluence
  caps the batch at 1-100 server-side.

```sh
# Find emails from a batch that do not currently have site access
atlas confluence users check-access-by-email \
  --emails member@example.com,outsider@example.com,not-an-email

# Invite a batch of new users (asynchronous on the server)
atlas confluence users invite-by-email \
  --emails new1@example.com,new2@example.com
```

## `users-bulk`

| Action   | Positional | Required flags  | Optional flags |
| -------- | ---------- | --------------- | -------------- |
| `lookup` | —          | `--account-ids` | —              |

Resolves user details for a batch of `accountId`s in a single request
(`POST /wiki/api/v2/users-bulk`). The endpoint is single-shot (not paginated)
and Confluence caps the batch at 1-250 IDs server-side.

- `--account-ids` is a comma-separated list of Atlassian account IDs
  (e.g. `--account-ids acc-1,acc-2,acc-3`). Surrounding whitespace per entry
  is trimmed; empty entries are dropped. The CLI rejects an empty effective
  list before issuing the request.
- The response shape is `{ results: User[], _links?: { base?: string } }`.
  `results` may be empty if none of the IDs resolve; per-user fields such as
  `email`, `timeZone`, and `profilePicture` may be omitted depending on the
  target user's privacy settings.
- Requires the `Can use` Confluence global permission and the ability to
  view user profiles; a 404 is returned when those are absent.

```sh
# Look up two users by account ID
atlas confluence users-bulk lookup --account-ids acc-1,acc-2

# Pipe into jq to project just displayName / accountId
atlas confluence users-bulk lookup --account-ids acc-1,acc-2 \
  | jq '.results[] | { accountId, displayName }'
```

## `databases`

Databases are first-class v2 content. The CLI exposes the full surface: lifecycle (`create`/`get`/`delete`), hierarchy navigation (`ancestors`/`descendants`/`direct-children`/`operations`), classification level (`get-`/`update-`/`reset-classification-level`), and content properties (`list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`). Pagination is cursor-based for `descendants`, `direct-children`, and `list-properties`; `ancestors` returns a bare `{ results }` and is re-called with the highest ancestor's ID instead of a cursor.

| Action                        | Positional     | Required flags                                          | Optional flags                                                                                         |
| ----------------------------- | -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `create`                      | —              | `--space-id`                                            | `--title`, `--parent-id`, `--private`                                                                  |
| `get`                         | `<databaseId>` | —                                                       | `--include-collaborators`, `--include-direct-children`, `--include-operations`, `--include-properties` |
| `delete`                      | `<databaseId>` | —                                                       | —                                                                                                      |
| `ancestors`                   | `<databaseId>` | —                                                       | `--limit`                                                                                              |
| `descendants`                 | `<databaseId>` | —                                                       | `--limit`, `--depth`, `--cursor`                                                                       |
| `direct-children`             | `<databaseId>` | —                                                       | `--limit`, `--cursor`, `--sort`                                                                        |
| `operations`                  | `<databaseId>` | —                                                       | —                                                                                                      |
| `get-classification-level`    | `<databaseId>` | —                                                       | —                                                                                                      |
| `update-classification-level` | `<databaseId>` | `--level-id`                                            | —                                                                                                      |
| `reset-classification-level`  | `<databaseId>` | —                                                       | —                                                                                                      |
| `list-properties`             | `<databaseId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`                                                               |
| `create-property`             | `<databaseId>` | `--key`, `--value`                                      | —                                                                                                      |
| `get-property`                | `<databaseId>` | `--property-id`                                         | —                                                                                                      |
| `update-property`             | `<databaseId>` | `--property-id`, `--key`, `--value`, `--version-number` | —                                                                                                      |
| `delete-property`             | `<databaseId>` | `--property-id`                                         | —                                                                                                      |

- `--private` on `create` creates a database visible only to the creator.
- `--depth` on `descendants` accepts 1–10 (server-validated; default 2).
- `--sort` on `direct-children` accepts the `ContentSortOrder` vocabulary: `created-date`, `id`, `modified-date`, `child-position`, `title`, each optionally prefixed with `-` for descending.
- `--sort` on `list-properties` accepts `key` or `-key`.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409).
- `update-classification-level` always sends `status: "current"` (the only legal server value); the CLI hard-codes it so callers only need `--level-id`.
- `reset-classification-level` sends `{ status: "current" }` and falls back to the space default classification.
- `ancestors` returns `{ results }` without `_links.next`; iterate by calling again with the highest ancestor's ID as the new `<databaseId>`.
- `delete` trashes the database (recoverable from the space trash); there is no purge flag on this endpoint.

```sh
# Create a database in a space
atlas confluence databases create --space-id 654321 --title "Inventory"

# Create a private database
atlas confluence databases create --space-id 654321 --title "Secret" --private

# Read a database with everything inlined
atlas confluence databases get db-1 --include-properties --include-operations

# Walk the descendant tree
atlas confluence databases descendants db-1 --depth 3 --limit 50

# Sort direct children by most-recently modified
atlas confluence databases direct-children db-1 --sort -modified-date

# Classification level lifecycle
atlas confluence databases get-classification-level db-1
atlas confluence databases update-classification-level db-1 --level-id cl-restricted
atlas confluence databases reset-classification-level db-1

# Content properties
atlas confluence databases list-properties db-1
atlas confluence databases create-property db-1 --key feature-flags --value '{"beta":true}'
atlas confluence databases get-property db-1 --property-id prop-1
atlas confluence databases update-property db-1 --property-id prop-1 --key feature-flags --value '{"beta":false}' --version-number 4
atlas confluence databases delete-property db-1 --property-id prop-1
```

## `folders`

Folders are first-class v2 content for grouping pages, whiteboards, databases, and other folders inside a space. The CLI exposes the full surface: lifecycle (`create`/`get`/`delete`), hierarchy navigation (`ancestors`/`descendants`/`direct-children`/`operations`), and content properties (`list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`). Pagination is cursor-based for `descendants`, `direct-children`, and `list-properties`; `ancestors` returns a bare `{ results }` and is re-called with the highest ancestor's ID instead of a cursor.

| Action            | Positional   | Required flags                                          | Optional flags                                                                                         |
| ----------------- | ------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `create`          | —            | `--space-id`                                            | `--title`, `--parent-id`                                                                               |
| `get`             | `<folderId>` | —                                                       | `--include-collaborators`, `--include-direct-children`, `--include-operations`, `--include-properties` |
| `delete`          | `<folderId>` | —                                                       | —                                                                                                      |
| `ancestors`       | `<folderId>` | —                                                       | `--limit`                                                                                              |
| `descendants`     | `<folderId>` | —                                                       | `--limit`, `--depth`, `--cursor`                                                                       |
| `direct-children` | `<folderId>` | —                                                       | `--limit`, `--cursor`, `--sort`                                                                        |
| `operations`      | `<folderId>` | —                                                       | —                                                                                                      |
| `list-properties` | `<folderId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`                                                               |
| `create-property` | `<folderId>` | `--key`, `--value`                                      | —                                                                                                      |
| `get-property`    | `<folderId>` | `--property-id`                                         | —                                                                                                      |
| `update-property` | `<folderId>` | `--property-id`, `--key`, `--value`, `--version-number` | —                                                                                                      |
| `delete-property` | `<folderId>` | `--property-id`                                         | —                                                                                                      |

- `--depth` on `descendants` accepts 1–10 (server-validated; default 2).
- `--sort` on `direct-children` accepts the `ContentSortOrder` vocabulary: `created-date`, `id`, `modified-date`, `child-position`, `title`, each optionally prefixed with `-` for descending.
- `--sort` on `list-properties` accepts `key` or `-key`.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property` and `databases create-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409).
- `ancestors` returns `{ results }` without `_links.next`; iterate by calling again with the highest ancestor's ID as the new `<folderId>`.
- Folders have no classification-level endpoints — unlike `databases`, the `/folders` surface does not expose `get`/`update`/`reset-classification-level`.
- `delete` removes the folder (recoverable from the space trash via standard Confluence recovery flow); there is no purge flag on this endpoint.

```sh
# Create a folder at the space root
atlas confluence folders create --space-id 654321 --title "Drafts"

# Create a folder nested under another folder / page
atlas confluence folders create --space-id 654321 --title "Q1 Drafts" --parent-id 789

# Read a folder with everything inlined
atlas confluence folders get folder-1 --include-properties --include-operations

# Walk the descendant tree
atlas confluence folders descendants folder-1 --depth 3 --limit 50

# Sort direct children by most-recently modified
atlas confluence folders direct-children folder-1 --sort -modified-date

# Permitted operations
atlas confluence folders operations folder-1

# Content properties
atlas confluence folders list-properties folder-1
atlas confluence folders create-property folder-1 --key feature-flags --value '{"beta":true}'
atlas confluence folders get-property folder-1 --property-id prop-1
atlas confluence folders update-property folder-1 --property-id prop-1 --key feature-flags --value '{"beta":false}' --version-number 4
atlas confluence folders delete-property folder-1 --property-id prop-1
```

## `footer-comments`

Top-level (page / blog-post) footer comments exposed through the tenant-wide `/wiki/api/v2/footer-comments` surface. The container-scoped CRUD (`list` by page, `create`, `delete`) lives on the `comments` resource above; this resource covers tenant-wide listing, single-comment fetch with inlinable sub-resources, in-place `update`, and the per-comment navigation collections (`children`, `likes`, `operations`, `versions`).

| Action        | Positional    | Required flags               | Optional flags                                                                                                                                    |
| ------------- | ------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`        | —             | —                            | `--body-format`, `--sort`, `--cursor`, `--limit`                                                                                                  |
| `get`         | `<commentId>` | —                            | `--body-format`, `--version-number`, `--include-properties`, `--include-operations`, `--include-likes`, `--include-versions`, `--include-version` |
| `update`      | `<commentId>` | `--body`, `--version-number` | —                                                                                                                                                 |
| `children`    | `<commentId>` | —                            | `--body-format`, `--sort`, `--cursor`, `--limit`                                                                                                  |
| `likes-count` | `<commentId>` | —                            | —                                                                                                                                                 |
| `likes-users` | `<commentId>` | —                            | `--cursor`, `--limit`                                                                                                                             |
| `operations`  | `<commentId>` | —                            | —                                                                                                                                                 |
| `versions`    | `<commentId>` | —                            | `--body-format`, `--sort`, `--cursor`, `--limit`                                                                                                  |
| `version`     | `<commentId>` | `--version-number`           | —                                                                                                                                                 |

- `--body-format` accepts `storage` or `atlas_doc_format` (the v2 `PrimaryBodyRepresentation` enum).
- `--sort` on `list` and `children` accepts the `CommentSortOrder` vocabulary: `created-date`, `-created-date`, `modified-date`, `-modified-date`.
- `--sort` on `versions` is the narrower `VersionSortOrder`: only `modified-date` / `-modified-date`.
- `--include-*` flags on `get` ask the server to inline the corresponding sub-resource (properties, operations, likes, versions, or a single version) so callers can fetch the comment plus context in one round-trip.
- `update` issues `PUT /footer-comments/{id}` — Confluence enforces optimistic concurrency: `--version-number` must be exactly one greater than the comment's current version (mismatches return 409). `--body` is sent with `representation: "storage"`; SDK callers can opt into `atlas_doc_format` via the underlying `comments.updateFooter()` method.
- `likes-count` returns the bare `{ count }` envelope and is not paginated.
- `version` fetches a single past version by number; the response includes the body and audit metadata.
- All list endpoints are cursor-paginated — extract `cursor=…` from `_links.next` and pass it back as `--cursor`.

```sh
# Tenant-wide listing, newest first
atlas confluence footer-comments list --sort -created-date --limit 25

# Read a single comment with everything inlined
atlas confluence footer-comments get 77777 --include-likes --include-versions

# Update a footer comment (storage body)
atlas confluence footer-comments update 77777 --body "Updated reply" --version-number 2

# Walk child replies
atlas confluence footer-comments children 77777 --sort created-date

# Like counts and likers
atlas confluence footer-comments likes-count 77777
atlas confluence footer-comments likes-users 77777 --limit 50

# Permitted operations
atlas confluence footer-comments operations 77777

# Version history
atlas confluence footer-comments versions 77777 --sort -modified-date
atlas confluence footer-comments version 77777 --version-number 3
```

## `whiteboards`

Whiteboards are first-class v2 content (drawings / Confluence whiteboards UI). The CLI exposes the full surface: lifecycle (`create`/`get`/`delete`), hierarchy navigation (`ancestors`/`descendants`/`direct-children`/`operations`), classification level (`get-`/`update-`/`reset-classification-level`), and content properties (`list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`). Shape is identical to `databases`: pagination is cursor-based for `descendants`, `direct-children`, and `list-properties`; `ancestors` returns a bare `{ results }` and is re-called with the highest ancestor's ID instead of a cursor.

| Action                        | Positional       | Required flags                                          | Optional flags                                                                                         |
| ----------------------------- | ---------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `create`                      | —                | `--space-id`                                            | `--title`, `--parent-id`, `--template-key`, `--locale`, `--private`                                    |
| `get`                         | `<whiteboardId>` | —                                                       | `--include-collaborators`, `--include-direct-children`, `--include-operations`, `--include-properties` |
| `delete`                      | `<whiteboardId>` | —                                                       | —                                                                                                      |
| `ancestors`                   | `<whiteboardId>` | —                                                       | `--limit`                                                                                              |
| `descendants`                 | `<whiteboardId>` | —                                                       | `--limit`, `--depth`, `--cursor`                                                                       |
| `direct-children`             | `<whiteboardId>` | —                                                       | `--limit`, `--cursor`, `--sort`                                                                        |
| `operations`                  | `<whiteboardId>` | —                                                       | —                                                                                                      |
| `get-classification-level`    | `<whiteboardId>` | —                                                       | —                                                                                                      |
| `update-classification-level` | `<whiteboardId>` | `--level-id`                                            | —                                                                                                      |
| `reset-classification-level`  | `<whiteboardId>` | —                                                       | —                                                                                                      |
| `list-properties`             | `<whiteboardId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`                                                               |
| `create-property`             | `<whiteboardId>` | `--key`, `--value`                                      | —                                                                                                      |
| `get-property`                | `<whiteboardId>` | `--property-id`                                         | —                                                                                                      |
| `update-property`             | `<whiteboardId>` | `--property-id`, `--key`, `--value`, `--version-number` | —                                                                                                      |
| `delete-property`             | `<whiteboardId>` | `--property-id`                                         | —                                                                                                      |

- `--private` on `create` creates a whiteboard visible only to the creator.
- `--template-key` and `--locale` on `create` select an initial template and locale; both are optional and forwarded as body fields. **Both are closed enums** validated client-side against the Confluence v2 OpenAPI spec (53 template keys, 21 locales — see `WhiteboardTemplateKey` / `WhiteboardLocale` in `src/confluence/types.ts`). Invalid values are rejected with the full allowlist before any HTTP request is sent.
- `get` returns the `WhiteboardSingle` shape: `id`, `type`, `status`, `title`, `parentId`, `parentType`, `position`, `authorId`, `ownerId`, `createdAt`, `spaceId`, `version` (`{ createdAt, message, number, minorEdit, authorId }`), and `_links` (`webui`, `editui`).
- `--depth` on `descendants` accepts positive integers (server-validated; default 2).
- `--sort` on `direct-children` accepts the `ContentSortOrder` vocabulary: `created-date`, `id`, `modified-date`, `child-position`, `title`, each optionally prefixed with `-` for descending.
- `--sort` on `list-properties` accepts `key` or `-key`.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property` and `databases create-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409).
- `update-classification-level` always sends `status: "current"` (the only legal server value); the CLI hard-codes it so callers only need `--level-id`.
- `reset-classification-level` sends `{ status: "current" }` and falls back to the space default classification.
- `ancestors` returns `{ results }` without `_links.next`; iterate by calling again with the highest ancestor's ID as the new `<whiteboardId>`.
- `delete` trashes the whiteboard (recoverable from the space trash); there is no purge flag on this endpoint.

```sh
# Create a whiteboard in a space
atlas confluence whiteboards create --space-id 654321 --title "Roadmap"

# Create a private whiteboard with a template
atlas confluence whiteboards create --space-id 654321 --title "Secret" --template-key kanban-board --locale en-US --private

# Read a whiteboard (basic)
atlas confluence whiteboards get wb-1

# Read a whiteboard with additional details
atlas confluence whiteboards get wb-1 --include-collaborators --include-properties

# Walk the descendant tree
atlas confluence whiteboards descendants wb-1 --depth 3 --limit 50

# Sort direct children by most-recently modified
atlas confluence whiteboards direct-children wb-1 --sort=-modified-date

# Classification level lifecycle
atlas confluence whiteboards get-classification-level wb-1
atlas confluence whiteboards update-classification-level wb-1 --level-id cl-restricted
atlas confluence whiteboards reset-classification-level wb-1

# Content properties
atlas confluence whiteboards list-properties wb-1
atlas confluence whiteboards create-property wb-1 --key feature-flags --value '{"beta":true}'
atlas confluence whiteboards get-property wb-1 --property-id prop-1
atlas confluence whiteboards update-property wb-1 --property-id prop-1 --key feature-flags --value '{"beta":false}' --version-number 4
atlas confluence whiteboards delete-property wb-1 --property-id prop-1
```

## Pagination

Confluence uses cursor-based pagination. Every `list` response has a `_links.next` URL containing a `cursor` query parameter. Extract that value and pass it back as `--cursor` on the next call:

```sh
# First page
atlas confluence pages list --space-id 123 --limit 50

# Look at _links.next in the JSON output, extract `cursor=…`, then:
atlas confluence pages list --space-id 123 --limit 50 --cursor "<value-from-response>"
```

When `_links.next` is absent, you've reached the end.

For programmatic iteration over all pages, prefer the SDK's `paginateCursor` helper:

```ts
import { ConfluenceClient, paginateCursor } from 'atlassian-api-client';
const client = new ConfluenceClient(config);
for await (const page of paginateCursor((cursor) => client.pages.list({ spaceId, cursor }))) {
  // ...
}
```

## Output shape notes

- `pages get` returns the full page object including `body.storage.value` (the raw storage XML). For just the body text, post-process with `jq`: `atlas confluence pages get 123 | jq -r '.body.storage.value'`.
- `pages list` returns `{ results: [...], _links: { next?: string } }`. Use `jq '.results[].id'` to extract IDs or pass `--format minimal` to get IDs one per line.
- `spaces` responses include `key` (human-readable, e.g. `ENG`) and `id` (numeric). The CLI accepts the numeric `id` everywhere; convert from `key` via `atlas confluence spaces list --format json | jq '.results[] | select(.key=="ENG") | .id'`.
