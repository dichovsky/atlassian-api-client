# Jira — Users, groups, pickers

> Part of the `atlas` Jira skill reference. Resource×action matrix and routing in [`../jira.md`](../jira.md).

## `users`

| Action                     | Positional      | Required flags   | Optional flags                                                                                                     |
| -------------------------- | --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `get`                      | `<accountId>`   | —                | —                                                                                                                  |
| `me`                       | —               | —                | —                                                                                                                  |
| `search`                   | —               | `--query`        | `--max-results`                                                                                                    |
| `delete`                   | —               | `--account-id`   | —                                                                                                                  |
| `create`                   | —               | `--email`        | `--display-name`                                                                                                   |
| `assignable-multi-project` | —               | —                | `--query`, `--user-name`, `--account-id`, `--project-keys`, `--max-results`, `--start-at`                          |
| `assignable`               | —               | `--project`      | `--query`, `--user-name`, `--account-id`, `--start-at`, `--max-results`                                            |
| `bulk`                     | —               | `--account-ids`  | `--start-at`, `--max-results`                                                                                      |
| `bulk-migration`           | —               | —                | `--user-name`, `--key`, `--start-at`, `--max-results`                                                              |
| `reset-columns`            | —               | —                | `--account-id`                                                                                                     |
| `get-columns`              | —               | —                | `--account-id`                                                                                                     |
| `set-columns`              | —               | `--columns`      | `--account-id`                                                                                                     |
| `email`                    | —               | `--account-id`   | —                                                                                                                  |
| `bulk-emails`              | —               | `--account-ids`  | —                                                                                                                  |
| `groups`                   | —               | `--account-id`   | `--user-name`, `--key`                                                                                             |
| `permission-search`        | —               | —                | `--project-key`, `--issue-key`, `--query`, `--permissions`, `--account-id`, `--start-at`, `--max-results`          |
| `picker`                   | —               | `--query`        | `--max-results`, `--show-avatar`, `--exclude`, `--exclude-account-ids`, `--avatar-size`, `--exclude-connect-users` |
| `list-properties`          | —               | —                | `--user-key`, `--account-id`                                                                                       |
| `delete-property`          | `<propertyKey>` | —                | `--user-key`, `--account-id`                                                                                       |
| `get-property`             | `<propertyKey>` | —                | `--user-key`, `--account-id`                                                                                       |
| `set-property`             | `<propertyKey>` | `--value` (JSON) | `--user-key`, `--account-id`                                                                                       |
| `search-query`             | —               | —                | `--query`, `--start-at`, `--max-results`                                                                           |
| `search-query-key`         | —               | —                | `--query`, `--start-at`, `--max-results`                                                                           |
| `viewissue-search`         | —               | —                | `--issue-key`, `--query`, `--max-results`, `--account-id`, `--start-at`                                            |
| `list`                     | —               | —                | `--start-at`, `--max-results`                                                                                      |
| `list-search`              | —               | —                | `--query`, `--start-at`, `--max-results`                                                                           |

- `users me` returns the caller's profile — a fast way to verify auth env vars are working without touching tenant data.
- `users delete` requires `--account-id`. Returns `{ deleted: true }` on success.
- `users create` requires `--email`; `--display-name` is optional.
- `users assignable-multi-project` accepts `--project-keys` as a comma-separated list.
- `users bulk` and `users bulk-emails` accept `--account-ids` as a comma-separated list. `bulk-emails` returns a **single** `{ accountId, email }` object (spec `UnrestrictedUserEmail`), not a `{ values: [...] }` wrapper.
- `users bulk-migration` accepts `--user-name` and `--key` as comma-separated lists to translate legacy identifiers to account IDs.
- `users set-columns` accepts `--columns` as a comma-separated list of column names; `--account-id` scopes the update to a specific user (admin only).
- `permission-search` returns users who have the specified permissions; `--permissions` is a comma-separated list of permission names.
- `picker` is a typeahead search for user selection UIs; `--exclude` and `--exclude-account-ids` are comma-separated.
- `list-properties`, `get-property`, `delete-property`, `set-property` manage arbitrary key-value data stored on a user; scope with `--account-id` or `--user-key`.
- `search-query` and `search-query-key` translate a legacy username/key query to account IDs.
- `viewissue-search` returns users who can view a given issue (scoped by `--issue-key`).
- `list` returns all users (admin only, paginated).
- `list-search` searches users by display name substring (paginated).

```sh
# Find users with a specific permission in a project
atlas jira users permission-search --permissions BROWSE_PROJECTS --project-key PROJ

# Typeahead picker search
atlas jira users picker --query "Jane"

# User properties
atlas jira users list-properties --account-id 5b10a2844c20165700ede21g
atlas jira users get-property propKey --account-id 5b10a2844c20165700ede21g
atlas jira users set-property propKey --value '"hello"' --account-id 5b10a2844c20165700ede21g
atlas jira users delete-property propKey --account-id 5b10a2844c20165700ede21g

# Legacy query translation
atlas jira users search-query --query jsmith
atlas jira users search-query-key --query jsmith

# Find users who can view an issue
atlas jira users viewissue-search --issue-key PROJ-42

# List all users (admin)
atlas jira users list --start-at 0 --max-results 50

# Search users by display name
atlas jira users list-search --query "Jane" --max-results 20
```

## `groups`

| Action         | Positional | Required flags | Optional flags                                                                                      |
| -------------- | ---------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `picker`       | —          | —              | `--query`, `--exclude`, `--max-results`, `--user-name`                                              |
| `get`          | —          | —              | `--group-name`, `--group-id`, `--expand`                                                            |
| `create`       | —          | `--name`       | —                                                                                                   |
| `delete`       | —          | —              | `--group-name`, `--group-id`, `--swap-group`, `--swap-group-id`                                     |
| `list-bulk`    | —          | —              | `--start-at`, `--max-results`, `--group-ids`, `--group-names`, `--access-type`, `--application-key` |
| `list-members` | —          | —              | `--group-name`, `--group-id`, `--include-inactive-users`, `--start-at`, `--max-results`             |
| `add-user`     | —          | `--account-id` | `--group-name`, `--group-id`                                                                        |
| `remove-user`  | —          | `--account-id` | `--group-name`, `--group-id`                                                                        |

### `picker`

- `--query` — fuzzy string to match against group names.
- `--exclude` — **comma-separated** list of group **names** to exclude from results (sent as repeated `exclude=` params). Note: to exclude by group ID, use the spec's `excludeId` parameter (not yet exposed by this client).
- `--max-results` — maximum number of groups returned (default 20).
- `--user-name` — account ID of a user whose groups should be excluded.
- Endpoint: `GET /rest/api/3/groups/picker`.

### `get`, `create`, `delete`

- `--group-name` — group name (Atlassian deprecates this in favour of `--group-id`).
- `--group-id` — stable group identifier; preferred over `--group-name`.
- `--expand` (`get` only) — comma-separated expand keys; `users` inlines the first member page.
- `--name` (`create` only) — name of the new group; **required**.
- `--swap-group` / `--swap-group-id` (`delete` only) — reassign deleted group's restrictions to the swap target.
- Endpoints: `GET /rest/api/3/group`, `POST /rest/api/3/group`, `DELETE /rest/api/3/group`.

### `list-bulk`

- `--group-ids` — **comma-separated** group IDs to filter the result set.
- `--group-names` — **comma-separated** group names to filter the result set.
- `--access-type` — restrict to groups providing a given access type. One of: `site-admin`, `admin`, `user`.
- `--application-key` — application key used with `--access-type`.
- `--start-at`, `--max-results` — offset pagination controls.
- Endpoint: `GET /rest/api/3/group/bulk`.

### `list-members`

- `--group-name` / `--group-id` — identify the group whose members are listed.
- `--include-inactive-users` — when `true`, deactivated users are included.
- `--start-at`, `--max-results` — offset pagination controls.
- Endpoint: `GET /rest/api/3/group/member`.

### `add-user`, `remove-user`

- `--account-id` — **required**; Atlassian account ID of the user to add or remove.
- `--group-name` / `--group-id` — identify the target group.
- Endpoints: `POST /rest/api/3/group/user`, `DELETE /rest/api/3/group/user`.

```sh
# Find groups matching "dev"
atlas jira groups picker --query dev

# Find up to 10 groups excluding a group by name
atlas jira groups picker --query dev --max-results 10 --exclude developers

# Fetch a group and inline its first page of users
atlas jira groups get --group-id grp-1 --expand users

# Create a new group
atlas jira groups create --name developers

# Delete a group and swap its restrictions onto another group
atlas jira groups delete --group-id grp-old --swap-group-id grp-new

# Bulk-list groups providing site-admin access
atlas jira groups list-bulk --access-type site-admin --application-key jira-software

# List members of a group, including deactivated users
atlas jira groups list-members --group-id grp-1 --include-inactive-users

# Add a user to a group
atlas jira groups add-user --group-id grp-1 --account-id 5b10ac8d82e05b22cc7d4ef5

# Remove a user from a group
atlas jira groups remove-user --group-id grp-1 --account-id 5b10ac8d82e05b22cc7d4ef5
```

## `group-user-picker`

| Action | Positional | Required flags | Optional flags                                                                                              |
| ------ | ---------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `pick` | —          | `--query`      | `--max-results`, `--show-avatar`, `--field-id`, `--project-id`, `--project-role`, `--exclude-connect-users` |

- `--query` — string to match against both group names and user display names.
- `--max-results` — maximum results per section (default 50).
- `--show-avatar` — when `true`, avatar URLs are included in user results.
- `--field-id` — the custom field ID this picker is for (e.g. `customfield_10050`). **Required for `--project-id` to have any effect** — without `--field-id` the server ignores `--project-id` entirely (spec constraint).
- `--project-id` — **comma-separated** project IDs to scope user results to project members (sent as repeated params on the wire: `?projectId=a&projectId=b`). **Only effective when `--field-id` is also provided.**
- `--project-role` — case-sensitive project role name to filter user results.
- `--exclude-connect-users` — when `true`, Atlassian Connect users are excluded.
- Endpoint: `GET /rest/api/3/groupuserpicker`.

```sh
# Find groups and users matching "alice"
atlas jira group-user-picker pick --query alice

# Include avatar URLs and limit results
atlas jira group-user-picker pick --query dev --show-avatar --max-results 25

# Scope to a specific project (field-id is required for project-id to take effect)
atlas jira group-user-picker pick --query eng --field-id customfield_10050 --project-id 10001
```
