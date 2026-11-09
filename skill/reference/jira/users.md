# Jira — Users, groups, pickers

> Part of the `atlas` Jira skill reference. Resource×action matrix and routing in [`../jira.md`](../jira.md).

## `users`

> **Experimental:** Atlassian marks `bulk` and `bulk-migration` `x-experimental`; their shapes may change without notice.

| Action                     | Positional      | Required flags                                  | Optional flags                                                                                                                                                   |
| -------------------------- | --------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get`                      | `<accountId>`   | —                                               | `--expand`                                                                                                                                                       |
| `me`                       | —               | —                                               | `--expand`                                                                                                                                                       |
| `search`                   | —               | one of `--query`, `--account-id`, `--property`  | `--start-at`, `--max-results`                                                                                                                                    |
| `delete`                   | —               | `--account-id`                                  | —                                                                                                                                                                |
| `create`                   | —               | `--email-address`, `--products`                 | `--display-name`                                                                                                                                                 |
| `assignable-multi-project` | —               | `--project-keys`                                | `--query`, `--user-name`, `--account-id`, `--max-results`, `--start-at`                                                                                          |
| `assignable`               | —               | one of `--project`, `--issue-key`, `--issue-id` | `--query`, `--user-name`, `--account-id`, `--start-at`, `--max-results`, `--session-id`, `--action-descriptor-id`, `--recommend`, `--account-type`, `--app-type` |
| `bulk`                     | —               | `--account-ids`                                 | `--start-at`, `--max-results`                                                                                                                                    |
| `bulk-migration`           | —               | —                                               | `--user-name`, `--key`, `--start-at`, `--max-results`                                                                                                            |
| `reset-columns`            | —               | —                                               | `--account-id`                                                                                                                                                   |
| `get-columns`              | —               | —                                               | `--account-id`                                                                                                                                                   |
| `set-columns`              | —               | `--columns`                                     | `--account-id`                                                                                                                                                   |
| `email`                    | —               | `--account-id`                                  | —                                                                                                                                                                |
| `bulk-emails`              | —               | `--account-ids`                                 | —                                                                                                                                                                |
| `groups`                   | —               | `--account-id`                                  | `--user-name`, `--key`                                                                                                                                           |
| `permission-search`        | —               | `--permissions`                                 | `--project-key`, `--issue-key`, `--query`, `--account-id`, `--start-at`, `--max-results`                                                                         |
| `picker`                   | —               | `--query`                                       | `--max-results`, `--show-avatar`, `--exclude`, `--exclude-account-ids`, `--avatar-size`, `--exclude-connect-users`                                               |
| `list-properties`          | —               | —                                               | `--user-key`, `--account-id`                                                                                                                                     |
| `delete-property`          | `<propertyKey>` | —                                               | `--user-key`, `--account-id`                                                                                                                                     |
| `get-property`             | `<propertyKey>` | —                                               | `--user-key`, `--account-id`                                                                                                                                     |
| `set-property`             | `<propertyKey>` | `--value` (JSON)                                | `--user-key`, `--account-id`                                                                                                                                     |
| `search-query`             | —               | `--query`                                       | `--start-at`, `--max-results`                                                                                                                                    |
| `search-query-key`         | —               | `--query`                                       | `--start-at`, `--max-results`                                                                                                                                    |
| `viewissue-search`         | —               | one of `--issue-key`, `--project-key`           | `--query`, `--max-results`, `--account-id`, `--start-at`                                                                                                         |
| `list`                     | —               | —                                               | `--start-at`, `--max-results`, `--expand`                                                                                                                        |
| `list-search`              | —               | —                                               | `--start-at`, `--max-results`, `--expand`                                                                                                                        |

- `users me` returns the caller's profile — a fast way to verify auth env vars are working without touching tenant data.
- `users get` and `users me` accept `--expand groups,applicationRoles` (comma-separated) to include the user's groups (incl. nested) and application roles.
- `users search` needs at least one of `--query` (prefix match on display name and email), `--account-id` (exact match) or `--property` (a user-property path query `<propertyKey>.<path>=<value>`, e.g. `--property location.office.city=Sydney`; property keys containing `.` or `=` cannot be queried). It is offset-paginated: `--start-at` (0-based) and `--max-results` (default 50).
- `users delete` requires `--account-id`. Returns `{ deleted: true }` on success.
- `users create` requires `--email-address` (the new user's email) and `--products` (spec-required). Do not use `--email` for the new user: it is the global basic-auth login, so under basic auth the CLI rejects it here (it is still accepted as the new user's address under bearer auth). `--products` is comma-separated: `jira-core`, `jira-servicedesk`, `jira-product-discovery`, `jira-software`; pass `--products ""` to create a user with no product access. `--display-name` is optional.
- `users assignable-multi-project` requires `--project-keys`, a comma-separated list of case-sensitive project keys (sent as one CSV value). The spec also wants `--query` or `--account-id`.
- `users assignable` needs one of `--project` (ID or case-sensitive key), `--issue-key` or `--issue-id`; the issue-scoped form returns users assignable to that issue. `--action-descriptor-id` is a transition ID (non-negative integer), to find users assignable during that transition. `--session-id` stays the same until the assignee is set. `--recommend` (bare boolean) asks Jira to recommend assignees. `--account-type` and `--app-type` are comma-separated filters, sent as repeated query params.
- `users assignable` and `viewissue-search` also need a user selector: the spec requires `--query` (matched against display name and email prefixes) or `--account-id` (exact match) on top of the issue/project scope. The CLI does not check this; pass one of them, as in the examples below.
- `users bulk` and `users bulk-emails` accept `--account-ids` as a comma-separated list. `bulk-emails` returns a **single** `{ accountId, email }` object (spec `UnrestrictedUserEmail`), not a `{ values: [...] }` wrapper.
- `users bulk-migration` accepts `--user-name` and `--key` as comma-separated lists to translate legacy identifiers to account IDs.
- `users set-columns` accepts `--columns` as a comma-separated list of column names; `--account-id` scopes the update to a specific user (admin only).
- `permission-search` returns users who have **all** the given permissions; `--permissions` (required) is a comma-separated list of permission keys (e.g. `BROWSE_PROJECTS,EDIT_ISSUES`). Scope with `--project-key` or `--issue-key`. The spec contradicts itself on `--query` / `--account-id`: the parameters say one is required, the operation says that without a search string it returns all users with the permissions. Pass one of them if Jira answers 400.
- `picker` is a typeahead search for user selection UIs; `--exclude-account-ids` is comma-separated (sent as repeated params). `--exclude` (legacy usernames) is still sent but Atlassian says it is **no longer available**; use `--exclude-account-ids`.
- `list-properties`, `get-property`, `delete-property`, `set-property` manage arbitrary key-value data stored on a user; scope with `--account-id`.
- **Legacy identifiers are ignored:** Atlassian marks these parameters "no longer available", so the CLI still sends them but Jira ignores them and you get unfiltered or wrongly scoped results: `--user-name` on `assignable` and `assignable-multi-project`, `--user-name` and `--key` on `groups`, and `--user-key` on `list-properties`, `get-property`, `set-property` and `delete-property`. Use `--account-id` instead. The exception is `bulk-migration`, where `--user-name` and `--key` are the input that gets translated to account IDs.- `search-query` and `search-query-key` run a **structured user query**; `--query` is required. Statements: `is assignee of PROJ` (any issue in project PROJ), `is assignee of (PROJ-1, PROJ-2)`, and the same issue-list form for `is reporter of`, `is watcher of`, `is voter of`, `is commenter of` and `is transitioner of`; plus `[propertyKey].path is "value"` (e.g. `[location].office.city is "Sydney"`). Combine statements with `AND` / `OR`. Jira filters only the users in the `--start-at`/`--max-results` window, so a page usually holds fewer matches than `--max-results`. `search-query` returns a page of users; `search-query-key` returns a page of user keys. To translate legacy usernames or keys to account IDs use `bulk-migration`.
- `viewissue-search` returns users with browse permission for an issue (`--issue-key`) or a project (`--project-key`, case-sensitive); one of the two is required.
- `list` returns a page of all users (active, inactive and deleted with an Atlassian account; `--max-results` up to 1000). Needs the _Browse users and groups_ global permission. `--expand` is passed through as given (comma-separated); the spec does not list its values for this endpoint, so the `get` keys (`groups`, `applicationRoles`) are the likely ones, not a documented contract.
- `list-search` hits `GET /users/search`, which also returns a page of **all** users: it has no name or username filter, so the CLI rejects `--query` and `--user-name`. To find users by name or email use `users search --query` or `users picker --query`.

```sh
# Find users with a specific permission in a project
atlas jira users permission-search --permissions BROWSE_PROJECTS --project-key PROJ

# Typeahead picker search
atlas jira users picker --query "Jane"

# Create a user (admin); auth stays on ATLASSIAN_EMAIL / ATLASSIAN_API_TOKEN
atlas jira users create --email-address new.hire@example.com --products jira-software --display-name "New Hire"

# User properties
atlas jira users list-properties --account-id 5b10a2844c20165700ede21g
atlas jira users get-property propKey --account-id 5b10a2844c20165700ede21g
atlas jira users set-property propKey --value '"hello"' --account-id 5b10a2844c20165700ede21g
atlas jira users delete-property propKey --account-id 5b10a2844c20165700ede21g

# Search by name/email prefix, page 2
atlas jira users search --query jane --start-at 50 --max-results 50

# Exact account ID lookup, or a user-property query
atlas jira users search --account-id 5b10a2844c20165700ede21g
atlas jira users search --property location.office.city=Sydney

# Get a user with groups and application roles
atlas jira users get 5b10a2844c20165700ede21g --expand groups,applicationRoles

# Users assignable in two projects
atlas jira users assignable-multi-project --project-keys PROJ,OPS --query jane

# Structured user queries (users / user keys)
atlas jira users search-query --query "is assignee of PROJ"
atlas jira users search-query-key --query "is watcher of (PROJ-42) OR is reporter of (PROJ-42)"

# Translate legacy usernames to account IDs
atlas jira users bulk-migration --user-name jsmith,adoe

# Fetch two users by account ID
atlas jira users bulk --account-ids 5b10a2844c20165700ede21g,5b10ac8d82e05b22cc7d4ef5

# Find users who can view an issue
atlas jira users viewissue-search --issue-key PROJ-42 --query jane

# Find users who can browse a project
atlas jira users viewissue-search --project-key PROJ --query jane

# Find users assignable to an issue during a transition
atlas jira users assignable --issue-key PROJ-42 --query jane --action-descriptor-id 31 --account-type atlassian

# List all users (Browse users and groups permission); --expand is passed through as given
atlas jira users list --start-at 0 --max-results 50 --expand groups

# Same listing via GET /users/search (no name filter)
atlas jira users list-search --start-at 50 --max-results 50
```

## `groups`

> **Experimental:** Atlassian marks `list-bulk` `x-experimental`; its shape may change without notice.

| Action         | Positional | Required flags | Optional flags                                                                                      |
| -------------- | ---------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `picker`       | —          | —              | `--query`, `--exclude` or `--exclude-id`, `--case-insensitive`, `--max-results`                     |
| `get`          | —          | —              | `--group-name`, `--group-id`, `--expand`                                                            |
| `create`       | —          | `--name`       | —                                                                                                   |
| `delete`       | —          | —              | `--group-name`, `--group-id`, `--swap-group`, `--swap-group-id`                                     |
| `list-bulk`    | —          | —              | `--start-at`, `--max-results`, `--group-ids`, `--group-names`, `--access-type`, `--application-key` |
| `list-members` | —          | —              | `--group-name`, `--group-id`, `--include-inactive-users`, `--start-at`, `--max-results`             |
| `add-user`     | —          | `--account-id` | `--group-name`, `--group-id`                                                                        |
| `remove-user`  | —          | `--account-id` | `--group-name`, `--group-id`                                                                        |

### `picker`

- `--query` — fuzzy string to match against group names.
- `--exclude` — **comma-separated** list of group **names** to exclude from results (sent as repeated `exclude=` params).
- `--exclude-id` — **comma-separated** list of group **IDs** to exclude (repeated `excludeId=` params). Preferred, because a group's name can change. Use either `--exclude` or `--exclude-id`, not both (the CLI rejects the pair, as Jira does). An `--exclude-id` that names no ID (`''`, `','`) is rejected rather than sent unfiltered.
- `--case-insensitive [true|false]` — match group names case-insensitively (server default `false`).
- `--max-results` — maximum number of groups returned (default 20).
- `--user-name` is rejected: Atlassian removed the `userName` filter and the server ignores it.
- Endpoint: `GET /rest/api/3/groups/picker`.

### `get`, `create`, `delete`

- `--group-name` — group name (Atlassian deprecates this in favour of `--group-id`).
- `--group-id` — stable group identifier; preferred over `--group-name`.
- `--expand` (`get` only) — comma-separated expand keys; `users` inlines the first member page.
- `get` (`GET /rest/api/3/group`) is **deprecated** by Atlassian; to list a group's users use `list-members`.
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
- `--include-inactive-users [true|false]` — `--include-inactive-users` (or `true`) includes deactivated users; omit it or pass `false` to leave them out.
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

# Case-insensitive match, excluding two groups by ID
atlas jira groups picker --query DEV --case-insensitive --exclude-id grp-1,grp-2

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

| Action | Positional | Required flags | Optional flags                                                                                                                                                             |
| ------ | ---------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pick` | —          | `--query`      | `--max-results`, `--show-avatar`, `--avatar-size`, `--field-id`, `--project-id`, `--issue-type-id`, `--case-insensitive`, `--include-ai-agents`, `--exclude-connect-users` |

- `--query` — string to match against both group names and user display names.
- `--max-results` — maximum results per section (default 50).
- `--show-avatar [true|false]` — `--show-avatar` (or `true`) includes avatar URLs in user results; omit it or pass `false` to leave them out.
- `--field-id` — the custom field ID this picker is for (e.g. `customfield_10050`). **Required for both `--project-id` and `--issue-type-id` to have any effect**; the CLI rejects either scoped flag without it.
- `--project-id` — **comma-separated** project IDs to scope user results to project members (sent as repeated params on the wire: `?projectId=a&projectId=b`). **Only effective when `--field-id` is also provided.**
- `--issue-type-id` — comma-separated issue type IDs, also sent as repeated params. **Only effective when `--field-id` is also provided.**
- `--avatar-size` — one of `xsmall`, `small`, `medium`, `large`, `xlarge`, `xxlarge`, or `xxxlarge`, optionally suffixed with `@2x` or `@3x`.
- `--case-insensitive [true|false]` — use case-insensitive group matching.
- `--include-ai-agents [true|false]` — include AI agents in user results.
- `--exclude-connect-users [true|false]` — `true` excludes Atlassian Connect users.
- The boolean flags above take an optional `true`/`false` value; the bare flag means `true`.
- Removed `--project-role` is parsed only to return a migration error; Atlassian removed it from this endpoint. Use `--field-id` with `--project-id` for project-scoped user results. There is no direct role-name replacement.
- `--exclude-account-ids` belongs to `users picker` and is rejected here; the combined picker has no equivalent filter.
- Endpoint: `GET /rest/api/3/groupuserpicker`.

```sh
# Find groups and users matching "alice"
atlas jira group-user-picker pick --query alice

# Include avatar URLs and limit results
atlas jira group-user-picker pick --query dev --show-avatar --max-results 25

# Scope to a specific project (field-id is required for project-id to take effect)
atlas jira group-user-picker pick --query eng --field-id customfield_10050 --project-id 10001

# Include AI agents and scope to issue types
atlas jira group-user-picker pick --query agent --include-ai-agents --field-id customfield_10050 --issue-type-id 10000,10001

# Every option: two projects, retina avatars, case-insensitive groups, no AI agents, no Connect users
atlas jira group-user-picker pick --query eng --max-results 10 --show-avatar --avatar-size small@2x --field-id customfield_10050 --project-id 10001,10002 --issue-type-id 10000 --case-insensitive --include-ai-agents false --exclude-connect-users true
```
