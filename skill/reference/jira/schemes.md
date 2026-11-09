# Jira — Fields, screens, schemes, workflows, security

> Part of the `atlas` Jira skill reference. Resource×action matrix and routing in [`../jira.md`](../jira.md).

## `issue-type-schemes`

Issue type scheme management (B566–B575). Covers the full `/rest/api/3/issuetypescheme` surface.

| Action              | Positional                          | Required flags                                                                             | Optional flags                                                                                                                                                                                                       |
| ------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`              | —                                   | —                                                                                          | `--start-at`, `--max-results`, `--ids` (CSV scheme IDs), `--query-string` (name contains, case-insensitive), `--order-by` (`name`\|`-name`\|`+name`\|`id`\|`-id`\|`+id`), `--expand` (CSV: `projects`, `issueTypes`) |
| `list-mapping`      | —                                   | —                                                                                          | `--start-at`, `--max-results`, `--scheme-ids` (CSV scheme IDs)                                                                                                                                                       |
| `list-project`      | —                                   | `--project-ids` (CSV)                                                                      | `--start-at`, `--max-results`                                                                                                                                                                                        |
| `create`            | —                                   | `--name`, `--issue-type-ids` (CSV, at least one)                                           | `--description`, `--default-issue-type-id`                                                                                                                                                                           |
| `update`            | `<issueTypeSchemeId>`               | at least one of `--name`, `--description`, `--default-issue-type-id`                       | —                                                                                                                                                                                                                    |
| `delete`            | `<issueTypeSchemeId>`               | —                                                                                          | —                                                                                                                                                                                                                    |
| `add-issue-types`   | `<issueTypeSchemeId>`               | `--issue-type-ids` (CSV)                                                                   | —                                                                                                                                                                                                                    |
| `remove-issue-type` | `<issueTypeSchemeId> <issueTypeId>` | —                                                                                          | —                                                                                                                                                                                                                    |
| `move-issue-types`  | `<issueTypeSchemeId>`               | `--issue-type-ids` (CSV), and one of `--position` (First\|Last) or `--after` (issueTypeId) | —                                                                                                                                                                                                                    |
| `assign-to-project` | —                                   | `--scheme-id`, `--project-id`                                                              | —                                                                                                                                                                                                                    |

- `create` returns `{ issueTypeSchemeId }` (spec `IssueTypeSchemeID`), not `{ id }` — chain the returned `issueTypeSchemeId` into subsequent calls.
- `list --order-by` sorts by name or ID; a leading `-` sorts descending and must use the `=` form (`--order-by=-name`), because a separate `-name` argument reads as a flag. Default order is `id`.
- `move-issue-types` needs `--position` or `--after`; every ID in `--issue-type-ids` must already be in the scheme, and the `--after` issue type must not be one of them.

```bash
# List all schemes (paginated)
atlas jira issue-type-schemes list --start-at 0 --max-results 50

# List specific schemes by ID
atlas jira issue-type-schemes list --ids 10000,10001

# Find schemes by name, newest ID first, with their projects and issue types
atlas jira issue-type-schemes list --query-string Dev --order-by=-id --expand projects,issueTypes

# Create a scheme
atlas jira issue-type-schemes create --name "Software Development" --description "Default for dev" --default-issue-type-id 10001 --issue-type-ids 10001,10002,10003

# Update a scheme
atlas jira issue-type-schemes update 10000 --name "Updated Scheme" --description "New description"

# Delete a scheme
atlas jira issue-type-schemes delete 10000

# Add issue types to a scheme
atlas jira issue-type-schemes add-issue-types 10000 --issue-type-ids 10005,10006

# Remove an issue type from a scheme
atlas jira issue-type-schemes remove-issue-type 10000 10005

# Move issue types to the top
atlas jira issue-type-schemes move-issue-types 10000 --issue-type-ids 10001,10002 --position First

# Move issue types after another
atlas jira issue-type-schemes move-issue-types 10000 --issue-type-ids 10003 --after 10002

# Get scheme-to-issue-type mapping
atlas jira issue-type-schemes list-mapping --scheme-ids 10000,10001

# One page of the mapping for one scheme
atlas jira issue-type-schemes list-mapping --scheme-ids 10000 --start-at 0 --max-results 5

# Get project-to-scheme mapping
atlas jira issue-type-schemes list-project --project-ids 10100,10101

# Assign a scheme to a project
atlas jira issue-type-schemes assign-to-project --scheme-id 10000 --project-id 10100
```

## `fieldconfiguration`

Issue field configuration management (B908–B913). Covers the flat `/rest/api/3/fieldconfiguration` surface.

> **Deprecated:** Atlassian deprecates every `/rest/api/3/fieldconfiguration` operation in favour of field schemes — use the [`config`](admin-devops.md#config) resource (`/rest/api/3/config/fieldschemes`) for new work. These actions still work on Jira Cloud.

| Action          | Positional | Required flags                             | Optional flags                                                          |
| --------------- | ---------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| `list`          | —          | —                                          | `--start-at`, `--max-results`, `--ids` (CSV), `--is-default`, `--query` |
| `create`        | —          | `--name`                                   | `--description`                                                         |
| `update`        | `<id>`     | `--name`                                   | `--description`                                                         |
| `delete`        | `<id>`     | —                                          | —                                                                       |
| `list-fields`   | `<id>`     | —                                          | `--start-at`, `--max-results`                                           |
| `update-fields` | `<id>`     | `--field-configuration-items` (JSON array) | —                                                                       |

```bash
# Paginate all field configurations
atlas jira fieldconfiguration list --start-at 0 --max-results 50

# Filter by IDs, default-flag, or substring
atlas jira fieldconfiguration list --ids 10000,10001 --is-default
atlas jira fieldconfiguration list --query "default"

# Create a configuration
atlas jira fieldconfiguration create --name "My Configuration" --description "A new field configuration"

# Update a configuration (API requires both name and id)
atlas jira fieldconfiguration update 10001 --name "Renamed" --description "Updated description"

# Delete a configuration
atlas jira fieldconfiguration delete 10001

# Paginate field items inside a configuration
atlas jira fieldconfiguration list-fields 10001 --start-at 0 --max-results 50

# Bulk-update field items (JSON array of {id, description?, isHidden?, isRequired?, renderer?})
atlas jira fieldconfiguration update-fields 10001 --field-configuration-items '[{"id":"customfield_10010","isHidden":false,"isRequired":true}]'
```

## `notification-schemes`

Notification scheme management (B605–B612). Covers the full `/rest/api/3/notificationscheme` surface: paginated listing, CRUD, notification membership management, and project-association queries.

> **Experimental:** Atlassian marks `create`, `update` and `delete` `x-experimental`; their shapes may change without notice.

| Action                | Positional                                | Required flags                            | Optional flags                                                                                     |
| --------------------- | ----------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `list`                | —                                         | —                                         | `--start-at`, `--max-results`, `--ids` (CSV), `--project-ids` (CSV), `--expand`, `--only-default`  |
| `create`              | —                                         | `--name`                                  | `--description`, `--notification-scheme-events` (JSON)                                             |
| `get`                 | `<notificationSchemeId>`                  | —                                         | `--expand`                                                                                         |
| `update`              | `<notificationSchemeId>`                  | at least one of `--name`, `--description` | —                                                                                                  |
| `add-notifications`   | `<notificationSchemeId>`                  | `--notification-scheme-events` (JSON)     | —                                                                                                  |
| `delete`              | `<notificationSchemeId>`                  | —                                         | —                                                                                                  |
| `remove-notification` | `<notificationSchemeId> <notificationId>` | —                                         | —                                                                                                  |
| `list-projects`       | —                                         | —                                         | `--start-at`, `--max-results`, `--scheme-ids` (CSV notification scheme IDs), `--project-ids` (CSV) |

- `--notification-scheme-events` is a **JSON array** of `{ event: { id }, notifications: [ ... ] }` entries. Each notification has a `notificationType` (e.g. `CurrentAssignee`, `Reporter`, `Group`, `User`, `ProjectRole`, `ProjectLead`) and an optional `parameter` (group name, account ID, project role ID, etc.). Jira Cloud no longer supports the `EmailAddress` type. `create` and `add-notifications` accept up to 1000 notifications per request.
- `--expand` accepts the standard server-side expander keys, most commonly `notificationSchemeEvents`, `user`, `group`, `projectRole`, `field`, `all`.
- `--only-default` (boolean) restricts the list to default schemes.
- `update` is `PUT` 204 No Content — only `name` and `description` are mutable.
- `add-notifications` is `PUT` 204 — appends events/notifications to an existing scheme without replacing existing entries.
- `remove-notification` deletes a single notification entry by its server-assigned `notificationId`.
- `list-projects` returns the per-project `{ notificationSchemeId, projectId }` mapping; filter with `--scheme-ids` and/or `--project-ids` (each sent as repeated query params).

```bash
# List notification schemes (paginated)
atlas jira notification-schemes list --start-at 0 --max-results 50

# List specific schemes with their events expanded
atlas jira notification-schemes list --ids 10000,10001 --expand notificationSchemeEvents

# Only the default schemes of two projects
atlas jira notification-schemes list --project-ids 10100,10101 --only-default

# Get one scheme by ID
atlas jira notification-schemes get 10000 --expand notificationSchemeEvents

# Create a scheme with initial events
atlas jira notification-schemes create --name "Default" --description "Default scheme" \
  --notification-scheme-events '[{"event":{"id":"1"},"notifications":[{"notificationType":"CurrentAssignee"},{"notificationType":"Group","parameter":"jira-users"}]}]'

# Rename a scheme
atlas jira notification-schemes update 10000 --name "Renamed"

# Append more event notifications
atlas jira notification-schemes add-notifications 10000 \
  --notification-scheme-events '[{"event":{"id":"2"},"notifications":[{"notificationType":"Reporter"}]}]'

# Remove a single notification entry
atlas jira notification-schemes remove-notification 10000 5

# Delete a scheme
atlas jira notification-schemes delete 10000

# List scheme-to-project associations
atlas jira notification-schemes list-projects --project-ids 10100,10101

# Which projects use notification schemes 10000 and 10001
atlas jira notification-schemes list-projects --scheme-ids 10000,10001
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

## `custom-field-option`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `get`  | `<id>`     | —              | —              |

```sh
# Get a custom field option by ID
atlas jira custom-field-option get 10001
```

## `issue-type-screen-schemes`

Issue Type Screen Schemes control which screens are shown for each issue type
within a project. They map issue type IDs to screen scheme IDs and can be
assigned to projects.

**Actions:** `list`, `create`, `update`, `delete`, `update-mapping`,
`update-default-mapping`, `remove-mappings`, `get-project`, `list-mapping`,
`list-project-mappings`, `assign-to-project`

| Action                   | Positional arg            | Key flags                                                                   | Returns                    |
| ------------------------ | ------------------------- | --------------------------------------------------------------------------- | -------------------------- |
| `list`                   | —                         | `--ids`, `--query`, `--order-by`, `--expand`, `--start-at`, `--max-results` | paginated schemes          |
| `create`                 | —                         | `--name` (req), `--mappings` (req JSON array), `--description`              | `{ id }`                   |
| `update`                 | `issueTypeScreenSchemeId` | `--name`, `--description`                                                   | `{ updated: true }`        |
| `delete`                 | `issueTypeScreenSchemeId` | —                                                                           | `{ deleted: true }`        |
| `update-mapping`         | `issueTypeScreenSchemeId` | `--mappings` (req JSON array)                                               | `{ updated: true }`        |
| `update-default-mapping` | `issueTypeScreenSchemeId` | `--screen-scheme-id` (req)                                                  | `{ updated: true }`        |
| `remove-mappings`        | `issueTypeScreenSchemeId` | `--issue-type-ids` (req, CSV)                                               | `{ removed: true }`        |
| `get-project`            | `issueTypeScreenSchemeId` | `--query`, `--start-at`, `--max-results`                                    | paginated projects         |
| `list-mapping`           | —                         | `--scheme-ids` (CSV), `--start-at`, `--max-results`                         | paginated mappings         |
| `list-project-mappings`  | —                         | `--project-ids` (req, CSV), `--start-at`, `--max-results`                   | paginated project mappings |
| `assign-to-project`      | —                         | `--scheme-id` (req), `--project-id` (req)                                   | `{ assigned: true }`       |

The `--mappings` flag accepts a JSON array of `{ issueTypeId, screenSchemeId }` objects.

- `list --query` is a case-insensitive partial match on the scheme name; `--ids` is comma-separated (repeated `id=` params).
- `list --order-by` is one of `name`, `+name`, `-name`, `id`, `+id`, `-id` (server default `id`); other values are rejected before the request. Write the descending forms with `=`: `--order-by=-name`.
- `list --expand projects` adds the projects each scheme is assigned to.
- `get-project --query` filters the returned projects by name.

```sh
# List all schemes
atlas jira issue-type-screen-schemes list --max-results 50

# Schemes named like "scrum", sorted by name descending, with their projects
atlas jira issue-type-screen-schemes list --query scrum --order-by=-name --expand projects

# Create a scheme
atlas jira issue-type-screen-schemes create --name "Default" --mappings '[{"issueTypeId":"10000","screenSchemeId":"10001"}]'

# Update scheme name
atlas jira issue-type-screen-schemes update 10001 --name "Renamed"

# Delete a scheme
atlas jira issue-type-screen-schemes delete 10001

# Update mappings (append/replace)
atlas jira issue-type-screen-schemes update-mapping 10001 --mappings '[{"issueTypeId":"10000","screenSchemeId":"10002"}]'

# Update the default mapping
atlas jira issue-type-screen-schemes update-default-mapping 10001 --screen-scheme-id 10002

# Remove specific issue type mappings
atlas jira issue-type-screen-schemes remove-mappings 10001 --issue-type-ids 10000,10001

# Get projects using a scheme
atlas jira issue-type-screen-schemes get-project 10001 --max-results 25

# Only the projects whose name matches "mobile"
atlas jira issue-type-screen-schemes get-project 10001 --query mobile

# List all issue-type-to-screen-scheme mappings
atlas jira issue-type-screen-schemes list-mapping --scheme-ids 10001,10002

# List project-to-scheme mappings
atlas jira issue-type-screen-schemes list-project-mappings --project-ids 10001,10002

# Assign a scheme to a project
atlas jira issue-type-screen-schemes assign-to-project --scheme-id 10001 --project-id 10002
```

## `permission-schemes`

Jira permission schemes and per-scheme permission grants under `/rest/api/3/permissionscheme` (B616–B624).

| Action              | Positional                  | Required flags                  | Optional flags                                     |
| ------------------- | --------------------------- | ------------------------------- | -------------------------------------------------- |
| `list`              | —                           | —                               | `--expand`                                         |
| `get`               | `<schemeId>`                | —                               | `--expand`                                         |
| `create`            | —                           | `--name`                        | `--description`, `--permissions`, `--expand`       |
| `update`            | `<schemeId>`                | `--name`                        | `--description`, `--permissions`, `--expand`       |
| `delete`            | `<schemeId>`                | —                               | —                                                  |
| `list-permissions`  | `<schemeId>`                | —                               | `--expand`                                         |
| `create-permission` | `<schemeId>`                | `--holder-type`, `--permission` | `--holder-parameter`, `--holder-value`, `--expand` |
| `get-permission`    | `<schemeId> <permissionId>` | —                               | `--expand`                                         |
| `delete-permission` | `<schemeId> <permissionId>` | —                               | —                                                  |

- `--expand` (CSV, every action that takes it) accepts `permissions`, `user`, `group`, `projectRole`, `field` and `all`: `permissions` inlines the grant list; the others add the holder details (user, group, project role, custom field) to each grant.
- **`update --permissions` replaces every grant in the scheme**: the array you send becomes the full grant list, and `--permissions '[]'` removes all grants. Omit `--permissions` to change only `--name` / `--description`. To add or remove a single grant use `create-permission` / `delete-permission` instead. Confirm with the user before sending `--permissions` on `update`.
- `--permissions` (on `create`/`update`) is a **JSON array** of `PermissionGrant` objects, e.g. `'[{"holder":{"type":"anyone"},"permission":"BROWSE_PROJECTS"}]'`.
- `--permission` (on `create-permission`) is a single permission key string, e.g. `BROWSE_PROJECTS`.
- `--holder-type` identifies the grantee category: `anyone`, `applicationRole`, `assignee`, `group`, `groupCustomField`, `projectLead`, `projectRole`, `reporter`, `sd.customer.portal.only`, `user`, `userCustomField`.
- `--holder-parameter` supplies the required qualifier for role/group/user holder types (role ID, group name, account ID, etc.).
- `--holder-value` is an optional secondary value used by some holder types.

```sh
# List all permission schemes
atlas jira permission-schemes list

# List schemes and inline their grants
atlas jira permission-schemes list --expand permissions

# Get a specific scheme by ID
atlas jira permission-schemes get 10000

# Get a scheme and expand its grants
atlas jira permission-schemes get 10000 --expand permissions

# Create a new scheme with a name
atlas jira permission-schemes create --name "Default Scheme"

# Create a scheme with an initial grant (browse access for everyone)
atlas jira permission-schemes create \
  --name "Open Scheme" \
  --description "Everyone can browse" \
  --permissions '[{"holder":{"type":"anyone"},"permission":"BROWSE_PROJECTS"}]'

# Create a scheme and print it with its grants
atlas jira permission-schemes create --name "Browse Scheme" --permissions '[{"holder":{"type":"anyone"},"permission":"BROWSE_PROJECTS"}]' --expand permissions

# Update a scheme's name and description
atlas jira permission-schemes update 10000 --name "Renamed Scheme" --description "Updated description"

# Delete a permission scheme
atlas jira permission-schemes delete 10000

# List all permission grants on a scheme
atlas jira permission-schemes list-permissions 10000

# Add a browse grant for all logged-in users
atlas jira permission-schemes create-permission 10000 \
  --holder-type anyone \
  --permission BROWSE_PROJECTS

# Add a grant scoped to a specific group
atlas jira permission-schemes create-permission 10000 \
  --holder-type group \
  --holder-parameter developers \
  --permission ADMINISTER_PROJECTS

# Get a single permission grant by ID
atlas jira permission-schemes get-permission 10000 10001

# The same grant with the user it is granted to
atlas jira permission-schemes get-permission 10000 10001 --expand user

# Delete a permission grant
atlas jira permission-schemes delete-permission 10000 10001
```

## `priority-schemes`

Priority scheme management (B644–B651). Covers the full `/rest/api/3/priorityscheme` surface: paginated listing, create/update/delete, scheme-scoped priority and project listings, and helper endpoints for suggested mappings and available priorities.

> **Experimental:** Atlassian marks every `priority-schemes` action `x-experimental`; their shapes may change without notice.

`create` returns either `{ id }` (synchronous, 201) or `{ id, task }` (asynchronous, 202). `update` always returns asynchronously with `{ task, priorityScheme }`. `delete` is `204 No Content` and is only available for schemes without associated projects.

| Action                 | Positional   | Required flags                                                                                                 | Optional flags                                                                                                                                     |
| ---------------------- | ------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`                 | —            | —                                                                                                              | `--start-at`, `--max-results`, `--priority-ids` (CSV ints), `--scheme-ids` (CSV ints), `--scheme-name`, `--only-default`, `--order-by`, `--expand` |
| `create`               | —            | `--name`, `--default-priority-id` (int), `--priority-ids` (CSV ints)                                           | `--description`, `--project-ids` (CSV ints), `--mappings` (JSON)                                                                                   |
| `delete`               | `<schemeId>` | —                                                                                                              | —                                                                                                                                                  |
| `update`               | `<schemeId>` | at least one of `--name`, `--description`, `--default-priority-id`, `--priorities`, `--projects`, `--mappings` | —                                                                                                                                                  |
| `list-priorities`      | `<schemeId>` | —                                                                                                              | `--start-at`, `--max-results`                                                                                                                      |
| `list-projects`        | `<schemeId>` | —                                                                                                              | `--start-at`, `--max-results`, `--project-ids` (CSV ints), `--query`                                                                               |
| `suggested-mappings`   | —            | —                                                                                                              | `--scheme-id` (int), `--priorities` (JSON `{add,remove}`), `--projects` (JSON `{add}`), `--start-at`, `--max-results`                              |
| `available-priorities` | —            | `--scheme-id` (string)                                                                                         | `--query`, `--exclude` (CSV ids), `--start-at`, `--max-results`                                                                                    |

- `--order-by` must be one of `name`, `+name`, `-name`.
- `--expand` accepts comma-separated tokens (`priorities`, `projects`); inlines those sub-pages in each scheme.
- `--mappings` for `create` and `update` is a JSON object with optional `in` and `out` keys, each mapping old priority ID → new priority ID. `out` is required when updating in a way that removes projects from the scheme.
- `--priorities` for `update` is a JSON object `{ "add": { "ids": [..] }, "remove": { "ids": [..] } }`; for `suggested-mappings` it is the simpler `{ "add": [..], "remove": [..] }`.
- `--projects` for `update` follows the same `{ add: { ids: [..] }, remove: { ids: [..] } }` shape; for `suggested-mappings` it is `{ "add": [..] }` only (add-only on this endpoint).
- `available-priorities` requires `--scheme-id` as a query parameter (string per the spec). It returns the priorities you could still add to the scheme.
- A returned scheme's "is this the default scheme" flag is the spec field `default` (boolean), not `isDefault` (which is write-only and never returned).

```sh
# List schemes (paginated, with priorities + projects inlined)
atlas jira priority-schemes list --start-at 0 --max-results 50 --expand priorities,projects

# Filter by IDs / name / default
atlas jira priority-schemes list --scheme-ids 10000,10001 --order-by=-name
atlas jira priority-schemes list --scheme-name "Critical" --only-default
atlas jira priority-schemes list --priority-ids 10001,10002

# Create a scheme
atlas jira priority-schemes create \
  --name "Critical Bugs" \
  --default-priority-id 10001 \
  --priority-ids 10001,10002,10003 \
  --description "Scheme for critical projects" \
  --project-ids 10100,10101

# Update a scheme (rename + add/remove priorities + mapping)
atlas jira priority-schemes update 10000 --name "Renamed Scheme" --description "Updated"
atlas jira priority-schemes update 10000 \
  --priorities '{"add":{"ids":[10003]},"remove":{"ids":[10004]}}' \
  --mappings '{"in":{"10004":10003}}'

# Delete a scheme (only if no projects use it)
atlas jira priority-schemes delete 10000

# Priorities and projects in a scheme
atlas jira priority-schemes list-priorities 10000 --start-at 0 --max-results 25
atlas jira priority-schemes list-projects 10000 --project-ids 10100,10101 --query example

# Get suggested priority mappings before applying a change
atlas jira priority-schemes suggested-mappings \
  --scheme-id 10000 \
  --priorities '{"add":[10003],"remove":[10004]}' \
  --projects '{"add":[10100]}'

# List priorities still available to add to a scheme
atlas jira priority-schemes available-priorities --scheme-id 10000 --query high --exclude 10005,10006
```

## `issuesecurityschemes`

Issue security scheme management (B539–B555). Covers the full `/rest/api/3/issuesecurityschemes` surface: listing, CRUD, security level management, level member management, and project association.

> **Experimental:** Atlassian marks every action except `get-all`, `get` and `list-members` `x-experimental`; their shapes may change without notice.

**Paginated endpoints** (support `--start-at`, `--max-results`):

- `list-members` — GET /issuesecurityschemes/{issueSecuritySchemeId}/members
- `list-levels` — GET /issuesecurityschemes/level
- `list-level-members` — GET /issuesecurityschemes/level/member
- `list-projects` — GET /issuesecurityschemes/project
- `search` — GET /issuesecurityschemes/search

| Action                 | Positional args                       | Key flags                                                                                                      | Returns                         |
| ---------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `get-all`              | —                                     | —                                                                                                              | SecuritySchemesResponse         |
| `create`               | —                                     | `--name` (req), `--description`, `--levels` (JSON array)                                                       | `{id}`                          |
| `get`                  | `<id>`                                | —                                                                                                              | IssueSecurityScheme             |
| `update`               | `<id>`                                | `--name`, `--description` (≥1 required)                                                                        | `{updated:true}`                |
| `list-members`         | `<issueSecuritySchemeId>`             | `--issue-security-level-id`, `--expand`, pagination                                                            | PageBean                        |
| `delete`               | `<schemeId>`                          | —                                                                                                              | `{deleted:true}`                |
| `add-levels`           | `<schemeId>`                          | `--levels` (req, JSON array of levels)                                                                         | `{updated:true}`                |
| `remove-level`         | `<schemeId>` `<levelId>`              | `--replace-with`                                                                                               | Task (`{deleted:true}` if none) |
| `update-level`         | `<schemeId>` `<levelId>`              | `--name`, `--description` (≥1 required)                                                                        | `{updated:true}`                |
| `add-level-members`    | `<schemeId>` `<levelId>`              | `--members` (req, JSON array of members)                                                                       | `{updated:true}`                |
| `remove-level-member`  | `<schemeId>` `<levelId>` `<memberId>` | —                                                                                                              | `{deleted:true}`                |
| `list-levels`          | —                                     | `--id`, `--scheme-id`, `--only-default`, pagination                                                            | PageBean                        |
| `set-default-levels`   | —                                     | `--default-values` (JSON array of `{defaultLevelId, issueSecuritySchemeId}`)                                   | `{updated:true}`                |
| `list-level-members`   | —                                     | `--id`, `--scheme-id`, `--level-id`, `--expand`, pagination                                                    | PageBean                        |
| `list-projects`        | —                                     | `--issue-security-scheme-id`, `--project-ids`, pagination                                                      | PageBean                        |
| `associate-to-project` | —                                     | `--project-id` (req), `--scheme-id` (req; `null` clears the association), `--old-to-new-mappings` (JSON array) | Task (`{updated:true}` if none) |
| `search`               | —                                     | `--id`, `--project-ids`, pagination                                                                            | PageBean                        |

- `get-all` takes no parameters and returns every scheme (`{ issueSecuritySchemes: [...] }`); Jira defines no filters for it. Use `search` (`--id`, `--project-ids`, pagination) to filter.
- **Level object** (`--levels` items, for `create` and `add-levels`): `{ "name": "<unique, ≤255 chars>", "description"?: "<≤4000 chars>", "isDefault"?: <boolean, default false>, "members"?: [<member>, ...] }`. Only `name` is required.
- **Member object** (`--members` items, and a level's `members`): `{ "type": "<member type>", "parameter"?: "<value>" }`. `type` is the member type, for example `reporter`, `group`, `user`, `projectrole` or `applicationRole` (the spec lists these as examples); `parameter` is the value for that type — the group name for `group`, the account ID for `user`, the project role ID for `projectrole`, the application key (e.g. `jira-software`) for `applicationRole`; omit it for `reporter`.
- `--old-to-new-mappings` (`associate-to-project`) is a JSON array of `{ "oldLevelId": "<id>|null", "newLevelId": "<id>|null" }`: both keys are required; `oldLevelId: null` remaps issues that have no level, `newLevelId: null` clears the old level from issues.
- `--default-values` (`set-default-levels`) is a JSON array of `{ "issueSecuritySchemeId": "<id>", "defaultLevelId": "<id>" }`.
- `--expand` (`list-members`, `list-level-members`) is a comma-separated list of `all`, `field`, `group`, `projectRole`, `user`: each adds the details of that kind of member (`all` adds every kind).
- On the list actions (`list-members`, `list-levels`, `list-level-members`, `list-projects`, `search`), `--id`, `--scheme-id`, `--level-id`, `--issue-security-level-id`, `--issue-security-scheme-id` and `--project-ids` are comma-separated and sent as repeated query params. (`associate-to-project --scheme-id` is one scheme ID, or `null`.)
- `associate-to-project` and `remove-level` are **asynchronous**: Jira answers with a task, and the CLI prints it (`{ "id", "self", "status", ... }`). Poll it with `atlas jira task get <id>` until `status` is `COMPLETE`. Both get HTTP 409 while a level-removal task is still running. If Jira answers with no task (a 204 or an empty 200), the CLI prints `{"updated": true}` (`associate-to-project`) or `{"deleted": true}` (`remove-level`).

```sh
# List all schemes
atlas jira issuesecurityschemes get-all

# CRUD
atlas jira issuesecurityschemes create --name "My Security Scheme" --description "Description"
atlas jira issuesecurityschemes create --name "Restricted" --levels '[{"name":"Staff","isDefault":true,"members":[{"type":"reporter"},{"type":"group","parameter":"jira-administrators"}]}]'
atlas jira issuesecurityschemes get 10001
atlas jira issuesecurityschemes update 10001 --name "Renamed Scheme"
atlas jira issuesecurityschemes delete 10001

# Members of a scheme (paginated)
atlas jira issuesecurityschemes list-members 10001
atlas jira issuesecurityschemes list-members 10001 --issue-security-level-id 10100,10101
atlas jira issuesecurityschemes list-members 10001 --expand all --start-at 0 --max-results 50

# Manage levels
atlas jira issuesecurityschemes add-levels 10001 --levels '[{"name":"Public","isDefault":true}]'
atlas jira issuesecurityschemes remove-level 10001 10100
atlas jira issuesecurityschemes remove-level 10001 10100 --replace-with 10101
atlas jira issuesecurityschemes update-level 10001 10100 --name "Renamed Level"

# Manage level members
atlas jira issuesecurityschemes add-level-members 10001 10100 --members '[{"type":"reporter"}]'
atlas jira issuesecurityschemes add-level-members 10001 10100 --members '[{"type":"user","parameter":"5b10ac8d82e05b22cc7d4ef5"},{"type":"projectrole","parameter":"10002"}]'
atlas jira issuesecurityschemes remove-level-member 10001 10100 10200

# List security levels (paginated)
atlas jira issuesecurityschemes list-levels
atlas jira issuesecurityschemes list-levels --scheme-id 10001,10002 --only-default

# Set default levels
atlas jira issuesecurityschemes set-default-levels --default-values '[{"issueSecuritySchemeId":"10001","defaultLevelId":"10100"}]'

# List level members (paginated)
atlas jira issuesecurityschemes list-level-members
atlas jira issuesecurityschemes list-level-members --scheme-id 10001 --level-id 10100
atlas jira issuesecurityschemes list-level-members --id 10300,10301 --scheme-id 10001 --level-id 10100 --expand user,group

# Project-to-scheme mappings (paginated)
atlas jira issuesecurityschemes list-projects
atlas jira issuesecurityschemes list-projects --issue-security-scheme-id 10001 --project-ids 10100

# Associate scheme to project
atlas jira issuesecurityschemes associate-to-project --project-id 10100 --scheme-id 10001
atlas jira issuesecurityschemes associate-to-project --project-id 10100 --scheme-id 10001 --old-to-new-mappings '[{"oldLevelId":"10100","newLevelId":"10101"}]'

# Remove the project's issue security scheme (clear the old level from its issues)
atlas jira issuesecurityschemes associate-to-project --project-id 10100 --scheme-id null --old-to-new-mappings '[{"oldLevelId":"10100","newLevelId":null}]'

# Poll the task that associate-to-project or remove-level printed
atlas jira task get 10641

# Search schemes (paginated)
atlas jira issuesecurityschemes search
atlas jira issuesecurityschemes search --id 10001,10002 --project-ids 10100
```

## `screens`

Screen management (B746–B761). Covers the `/rest/api/3/screens` surface: CRUD, tab and field management, field reordering.

> **Experimental:** Atlassian marks `create`, `update`, `delete` and `list-all-tabs` `x-experimental`; their shapes may change without notice.

- `move-field` needs `--position` or `--after` (the ID of the tab field to place it after).
- `list-all-tabs` returns **one page** (`{ isLast, startAt, maxResults, total, values: [{ screenId, tabId, tabName }] }`) for the screens in `--ids` and/or the tabs in `--tab-ids` (both sent as repeated `screenId` / `tabId` params). Page with `--start-at` (0-based) and `--max-results` until `isLast` is `true`.

| Action                  | Positional                     | Required flags                                                            | Optional flags                                                                                                                                                                                       |
| ----------------------- | ------------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`                  | —                              | —                                                                         | `--ids`, `--query-string`, `--scope` (GLOBAL/TEMPLATE/PROJECT), `--order-by` (`name`\|`-name`\|`+name`\|`id`\|`-id`\|`+id`; descending needs `=`: `--order-by=-name`), `--start-at`, `--max-results` |
| `create`                | —                              | `--name`                                                                  | `--description`                                                                                                                                                                                      |
| `delete`                | `<screenId>`                   | —                                                                         | —                                                                                                                                                                                                    |
| `update`                | `<screenId>`                   | at least one of `--name`, `--description`                                 | —                                                                                                                                                                                                    |
| `list-available-fields` | `<screenId>`                   | —                                                                         | —                                                                                                                                                                                                    |
| `list-tabs`             | `<screenId>`                   | —                                                                         | `--project-key`                                                                                                                                                                                      |
| `create-tab`            | `<screenId>`                   | `--name`                                                                  | —                                                                                                                                                                                                    |
| `delete-tab`            | `<screenId>` `<tabId>`         | —                                                                         | —                                                                                                                                                                                                    |
| `update-tab`            | `<screenId>` `<tabId>`         | `--name`                                                                  | —                                                                                                                                                                                                    |
| `list-tab-fields`       | `<screenId>` `<tabId>`         | —                                                                         | `--project-key`                                                                                                                                                                                      |
| `add-field-to-tab`      | `<screenId>` `<tabId>`         | `--field-id`                                                              | `--skip-field-association`                                                                                                                                                                           |
| `remove-field-from-tab` | `<screenId>` `<tabId>` `<id>`  | —                                                                         | —                                                                                                                                                                                                    |
| `move-field`            | `<screenId>` `<tabId>` `<id>`  | one of `--position` (Earlier\|Later\|First\|Last) or `--after` (field ID) | —                                                                                                                                                                                                    |
| `move-tab`              | `<screenId>` `<tabId>` `<pos>` | —                                                                         | —                                                                                                                                                                                                    |
| `add-to-default`        | `<fieldId>`                    | —                                                                         | —                                                                                                                                                                                                    |
| `list-all-tabs`         | —                              | —                                                                         | `--ids` (CSV screen IDs), `--tab-ids` (CSV tab IDs), `--start-at`, `--max-results` (≤100, default 100)                                                                                               |

```sh
# Paginate screens
atlas jira screens list --max-results 50

# Filter by IDs and search string
atlas jira screens list --ids 10001,10002 --query-string Default

# Global and project screens, sorted by name descending (CSV --scope is sent as repeated scope params)
atlas jira screens list --scope GLOBAL,PROJECT --order-by=-name --start-at 0

# Create a screen
atlas jira screens create --name "Default Screen" --description "Main screen"

# Update a screen
atlas jira screens update 10001 --name "Renamed Screen"

# Delete a screen
atlas jira screens delete 10001

# List fields available to add to a screen
atlas jira screens list-available-fields 10001

# List tabs on a screen
atlas jira screens list-tabs 10001

# List tabs visible to a specific project
atlas jira screens list-tabs 10001 --project-key PROJ

# Create a tab
atlas jira screens create-tab 10001 --name "Field Tab"

# Rename a tab
atlas jira screens update-tab 10001 1 --name "Renamed Tab"

# Delete a tab
atlas jira screens delete-tab 10001 1

# List fields on a tab
atlas jira screens list-tab-fields 10001 1 --project-key PROJ

# Add a field to a tab
atlas jira screens add-field-to-tab 10001 1 --field-id summary

# Add a field, skipping screen-to-field association
atlas jira screens add-field-to-tab 10001 1 --field-id summary --skip-field-association

# Remove a field from a tab
atlas jira screens remove-field-from-tab 10001 1 summary

# Move a field to the first position
atlas jira screens move-field 10001 1 summary --position First

# Move a field after another field
atlas jira screens move-field 10001 1 summary --after description

# Move a tab to position 0
atlas jira screens move-tab 10001 1 0

# Add a field to the default screen
atlas jira screens add-to-default summary

# List the tabs of two screens (one page; repeat with --start-at 100, 200, ...)
atlas jira screens list-all-tabs --ids 10001,10002 --start-at 0 --max-results 100
```

## `screenscheme`

Screen scheme management (B762–B765). Covers the `/rest/api/3/screenscheme` surface: paginated listing, create, update, and delete. Screen schemes define which screens are used for each issue operation (view, create, edit).

| Action     | Positional         | Required flags               | Optional flags                                                                                                                                                  |
| ---------- | ------------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`     | —                  | —                            | `--ids`, `--query-string`, `--expand`, `--order-by`, `--start-at`, `--max-results`                                                                              |
| `list-all` | —                  | —                            | `--ids`, `--query-string`, `--expand`, `--order-by`, `--max-results`                                                                                            |
| `create`   | —                  | `--name`, `--default-screen` | `--description`, `--view-screen`, `--edit-screen`, `--create-screen`                                                                                            |
| `update`   | `<screenSchemeId>` | at least one field flag      | `--name`, `--description`, `--default-screen`, `--view-screen`, `--edit-screen`, `--create-screen` (screen ID, or `null` to remove the view/edit/create screen) |
| `delete`   | `<screenSchemeId>` | —                            | —                                                                                                                                                               |

**`--order-by` values:** `name`, `-name`, `+name`, `id`, `-id`, `+id`. A leading `-` sorts descending and needs the `=` form: `--order-by=-name` (a separate `-name` argument reads as a flag).

- `--expand issueTypeScreenSchemes` adds, for each screen scheme, the issue type screen schemes that use it.
- `list` returns one page (`{ startAt, maxResults, total, isLast, values }`). `list-all` fetches every page itself and prints one flat array of screen schemes; `--max-results` is the page size (how many it asks for per request), not a cap on the total, and `--start-at` is refused. It takes the same filters as `list`.
- Screen flags take a screen ID (digits only, at most 9007199254740991). On `update`, `--view-screen null`, `--edit-screen null` or `--create-screen null` removes that screen so the default screen is used; `--default-screen` cannot be `null`.

```sh
# List screen schemes
atlas jira screenscheme list

# Filter by IDs
atlas jira screenscheme list --ids 1,2

# Filter by name substring
atlas jira screenscheme list --query-string Default

# Sort by name, descending, with the issue type screen schemes that use each
atlas jira screenscheme list --order-by=-name --expand issueTypeScreenSchemes

# Paginate
atlas jira screenscheme list --start-at 0 --max-results 50

# Every screen scheme named like "Default" in one array, 50 per request
atlas jira screenscheme list-all --max-results 50 --query-string Default --order-by=-name

# Create a screen scheme (default screen is required)
atlas jira screenscheme create --name "My Scheme" --default-screen 10001

# Create with all screen types
atlas jira screenscheme create --name "Full Scheme" --default-screen 10001 --create-screen 10002 --view-screen 10003 --edit-screen 10004

# Update name
atlas jira screenscheme update 1 --name "Renamed Scheme"

# Update description
atlas jira screenscheme update 1 --description "Updated description"

# Remove the view screen (falls back to the default screen)
atlas jira screenscheme update 1 --view-screen null

# Delete a screen scheme
atlas jira screenscheme delete 1
```

## `workflows`

Classic workflow management — `/rest/api/3/workflow` (B837–B845 + B934), and the current bulk workflow API — `/rest/api/3/workflows` (B846–B854).

**Pagination:** `list` is offset-paginated (`--start-at`, `--max-results`). The usage actions (`issue-type-usages`, `project-usages`, `workflow-scheme-usages`) use cursor pagination (`--next-page-token`, `--max-results`). `get-rule-config` and `search` (B852) are offset-paginated (`--start-at`, `--max-results`, max 50 per page for rule-config).

**Deprecated classic search:** `list` and `get` call deprecated `GET /rest/api/3/workflow/search`. Prefer `search`, which calls current `GET /rest/api/3/workflows/search` and can filter by `--project-id`. `list --workflow-names A,B` sends repeated `workflowName` params (exact names; blank entries are dropped, and a list that names nothing, such as `,`, is refused); `list --order-by` is one of `name`, `created`, `updated` (optionally `+`/`-` prefixed).

**`search` values:** `--order-by` is `name`, `created` or `updated`; `--scope` is `GLOBAL` (company-managed) or `PROJECT` (team-managed); `--is-active true|false`; `--project-id` is a positive integer; `--expand values.transitions` adds each workflow's transitions. Attach a descending sort with `=`: `--order-by=-updated`.

**Required body endpoints (`--body` JSON):** `bulk-get`, `bulk-create`, `validate-create`, `preview`, `update`, `validate-update`. See [payload-rules.md](../payload-rules.md) for JSON-flag tips.

- `bulk-get` (`WorkflowReadRequest`): any of `workflowIds` (array), `workflowNames` (array), or `projectAndIssueTypes` (array of `{"projectId":"…","issueTypeId":"…"}`, both required strings). The response's `workflows[]` entries carry `id`, `version` (`{id, versionNumber}`), `statuses` and `transitions` — the input for `update`.
- `bulk-create` (`WorkflowCreateRequest`): top-level `scope` (`{"type":"GLOBAL"}` or `{"type":"PROJECT","project":{"id":"…"}}`), `statuses[]` (`{name, statusCategory: TODO|IN_PROGRESS|DONE, statusReference, id?, description?}`) and `workflows[]` (`{name, statuses, transitions, description?}`). Each `workflows[].statuses[]` entry needs **both** `statusReference` and `properties` (use `{}` for none); a transition is normally `{id, name, type, toStatusReference}` with `type` one of `INITIAL`, `GLOBAL`, `DIRECTED` (`links`, `properties`, `actions`, `validators`, `conditions`, `triggers` optional).
- `preview` (`WorkflowPreviewRequest`): `projectId` (required) plus at least one of `workflowIds`, `workflowNames`, `issueTypeIds` — at most **25** entries in each list.

**`update` / `validate-update` (read-modify-write):** `POST /workflows/update` replaces each listed workflow with the definition you send, so build the body from the current one:

1. Read it: `atlas jira workflows bulk-get --body '{"workflowIds":["<id>"]}'`.
2. Copy `workflows[0]` and change what you need. Every `workflows[]` entry **requires** `id`, `version` (the `{id, versionNumber}` object exactly as read — a stale version is rejected), `statuses` (each `{statusReference, properties}`, plus optional `layout`) and `transitions` (the full list as read, each normally `{id, name, type, toStatusReference}` plus optional `links`, `properties`, `actions`, `validators`, `conditions`, `triggers`, `transitionScreen`); `description`, `statusMappings` and `defaultStatusMappings` are optional. Describe the statuses the workflows use in the top-level `statuses[]` (`{id?, name, statusCategory, statusReference}`).
3. Optionally check it: `validate-update` takes the same body wrapped as `{"payload": <update body>, "validationOptions": {"levels": ["ERROR","WARNING"]}}` (`levels` defaults to both) and returns `{errors: [...]}` without changing anything.
4. Send it with `update`. Transition properties are edited here (the old transition-property routes are gone).

**`copy`:** `POST /rest/api/3/workflows/copy` clones an existing workflow, and the statuses it uses, into a new workflow created in the **same scope** as the source. `--workflow-id` is the ID of the workflow to copy and `--workflow-name` the name of the new one (each 1-255 characters); `--description` (max 2048 characters) defaults to empty. It prints the new workflow in the `WorkflowCreateResponse` shape (`workflows`, `statuses`). Needs _Administer Jira_, or for a project-scoped workflow the _Edit workflows_ project permission (or _View workflow_ plus _Administer projects_); returns 404 if the source workflow is missing and 409 while another workflow configuration update task is running.

**Schema note:** `WorkflowReadResponse` (bulk-get response) and `WorkflowCreateResponse` (bulk-create response) share the same field names (`workflows`, `statuses`) but are distinct spec schema types. `WorkflowCreateValidateRequest` requires a `payload` field wrapping the `WorkflowCreateRequest`.

**History note:** Stored workflow data expires after 60 days; no data before October 30, 2025 is available. `read-history --version-number` is the version to read (`version.versionNumber` in `bulk-get` output); versions start at 0, the workflow as created.

**Connect/Forge apps only:** `get-rule-config` and `update-rule-config` are restricted to Connect or Forge apps (403 if called from basic/bearer auth directly). `get-rule-config --types` is a CSV of `postfunction`, `condition`, `validator` (other values are refused before sending); `--keys`, `--workflow-names` and `--with-tags` are CSVs sent as repeated params (blank entries are dropped; a flag that names nothing, such as `--keys ,`, is refused). `update-rule-config --workflows` is a JSON array of `{workflowId: {name}, postFunctions?, conditions?, validators?}`; every rule needs `id`, `key` (the rule key from the app descriptor, as returned by `get-rule-config`) and `configuration` (`{value: "<string>", disabled?, tag?}`). `delete-rule-config --workflows` is a JSON array of `{workflowId: {name}, workflowRuleIds: [...]}`. A non-object entry is refused before sending.

**Connect app (JWT) only** (`delete-rule-config`): only Connect apps can call this. The CLI only sends basic or bearer auth, which Jira rejects here (expect 401/403); do not retry from the CLI, use the SDK's `createConnectJwtMiddleware` (see [`../auth-and-safety.md`](../auth-and-safety.md)).

**Removed API:** Atlassian removed the four workflow transition-property endpoints in July 2026. They are intentionally absent from the SDK and CLI; use bulk workflow read/update operations instead.

**Removed parameter:** Atlassian removed the `draft` workflow-rule selector on November 2, 2026 (CHANGE-3147): requests that include it now fail with HTTP 400, and `workflowId` objects in responses no longer carry it. Only published workflows remain, so the SDK never sends it: `"draft": false` inside a `workflowId` given to `update-rule-config` / `delete-rule-config` is dropped, while `"draft": true` (or any other non-`false` value, such as the string `"true"`) is refused before sending. `get-rule-config --draft` is refused. Omit it.

### Actions

| Action                   | Positional args        | Key options                                                                                                         |
| ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `list`                   | —                      | `--start-at`, `--max-results`, `--workflow-names` (CSV), `--expand`, `--query-string`, `--order-by`, `--is-active`  |
| `get`                    | `workflowName`         | —                                                                                                                   |
| `delete`                 | `entityId`             | —                                                                                                                   |
| `issue-type-usages`      | `workflowId projectId` | `--next-page-token`, `--max-results`                                                                                |
| `project-usages`         | `workflowId`           | `--next-page-token`, `--max-results`                                                                                |
| `workflow-scheme-usages` | `workflowId`           | `--next-page-token`, `--max-results`                                                                                |
| `bulk-get`               | —                      | `--body` (required, JSON `WorkflowReadRequest`)                                                                     |
| `capabilities`           | —                      | `--workflow-id`, `--project-id`, `--issue-type-id`                                                                  |
| `bulk-create`            | —                      | `--body` (required, JSON `WorkflowCreateRequest`)                                                                   |
| `copy`                   | —                      | `--workflow-id` (required), `--workflow-name` (required), `--description`                                           |
| `validate-create`        | —                      | `--body` (required, JSON `WorkflowCreateValidateRequest`)                                                           |
| `default-editor`         | —                      | —                                                                                                                   |
| `read-history`           | —                      | `--workflow-id` (required), `--version-number`                                                                      |
| `list-history`           | —                      | `--workflow-id` (required), `--expand`                                                                              |
| `get-rule-config`        | —                      | `--types` (required, CSV), `--start-at`, `--max-results`, `--keys`, `--workflow-names`, `--with-tags`, `--expand`   |
| `update-rule-config`     | —                      | `--workflows` (required, JSON array)                                                                                |
| `delete-rule-config`     | —                      | `--workflows` (required, JSON array)                                                                                |
| `preview`                | —                      | `--body` (required: `WorkflowPreviewRequest` JSON)                                                                  |
| `search`                 | —                      | `--start-at`, `--max-results`, `--expand`, `--query-string`, `--order-by`, `--scope`, `--is-active`, `--project-id` |
| `update`                 | —                      | `--body` (required: `WorkflowUpdateRequest` JSON)                                                                   |
| `validate-update`        | —                      | `--body` (required: `WorkflowUpdateValidateRequest` JSON)                                                           |

```sh
# List paginated classic workflows — B934
atlas jira workflows list --max-results 50

# List specific classic workflows by exact name (repeated workflowName)
atlas jira workflows list --workflow-names "Default Workflow,Ops Workflow" --order-by name

# Get a workflow by name
atlas jira workflows get "Default Workflow"

# Delete an inactive workflow by entity ID — B837
atlas jira workflows delete fb759d53-a3a4-45ff-9de4-547c4b638dde

# Get issue types using a workflow in a project — B838
atlas jira workflows issue-type-usages fb759d53-a3a4-45ff-9de4-547c4b638dde 10001
atlas jira workflows issue-type-usages fb759d53-a3a4-45ff-9de4-547c4b638dde 10001 --max-results 25

# Get projects using a workflow — B839
atlas jira workflows project-usages fb759d53-a3a4-45ff-9de4-547c4b638dde
atlas jira workflows project-usages fb759d53-a3a4-45ff-9de4-547c4b638dde --next-page-token eyJvIjoyfQ==

# Get workflow schemes using a workflow — B840
atlas jira workflows workflow-scheme-usages fb759d53-a3a4-45ff-9de4-547c4b638dde

# Bulk get workflows by IDs/names/project+issueType — B846
atlas jira workflows bulk-get --body '{"workflowIds":["fb759d53-a3a4-45ff-9de4-547c4b638dde"]}'
atlas jira workflows bulk-get --body '{"workflowNames":["Default Workflow"]}'
atlas jira workflows bulk-get --body '{"projectAndIssueTypes":[{"projectId":"10001","issueTypeId":"10000"}]}'

# Get available workflow capabilities — B847
atlas jira workflows capabilities --workflow-id fb759d53-a3a4-45ff-9de4-547c4b638dde
atlas jira workflows capabilities --project-id 10001 --issue-type-id 10000

# Bulk create workflows — B848
atlas jira workflows bulk-create --body '{"scope":{"type":"GLOBAL"},"statuses":[{"name":"To Do","statusCategory":"TODO","statusReference":"f0b24de5-25e7-4fab-ab94-63d81db6c0c0"}],"workflows":[{"name":"My Workflow","statuses":[{"statusReference":"f0b24de5-25e7-4fab-ab94-63d81db6c0c0","properties":{}}],"transitions":[{"id":"1","name":"Create","type":"INITIAL","toStatusReference":"f0b24de5-25e7-4fab-ab94-63d81db6c0c0"}]}]}'

# Copy a workflow (and the statuses it uses) into a new workflow in the same scope — POST /workflows/copy
atlas jira workflows copy --workflow-id fb759d53-a3a4-45ff-9de4-547c4b638dde --workflow-name "Copy of Default Workflow" --description "Cloned for the pilot team"

# Validate bulk create payload — B849
atlas jira workflows validate-create --body '{"payload":{"scope":{"type":"GLOBAL"},"statuses":[],"workflows":[]},"validationOptions":{"levels":["ERROR","WARNING"]}}'

# Get the user's default workflow editor — B850
atlas jira workflows default-editor

# Read a specific workflow version from history — B841
atlas jira workflows read-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c --version-number 4

# Read the workflow as it was created (version 0)
atlas jira workflows read-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c --version-number 0

# List all history entries for a workflow — B842
atlas jira workflows list-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c
atlas jira workflows list-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c --expand includeIntermediateWorkflows

# Get transition rule configurations (Connect/Forge apps) — B843
atlas jira workflows get-rule-config --types postfunction,condition
atlas jira workflows get-rule-config --types postfunction --workflow-names "My Workflow" --max-results 10

# Update transition rule configurations (Connect/Forge apps) — B844
atlas jira workflows update-rule-config --workflows '[{"workflowId":{"name":"My Workflow"},"postFunctions":[{"id":"b4d6cbdc-59f5-11e9-8647-d663bd873d93","key":"my-app__my-post-function","configuration":{"value":"{\"color\":\"red\"}"}}]}]'

# Delete transition rule configurations (Connect apps only) — B845
atlas jira workflows delete-rule-config --workflows '[{"workflowId":{"name":"My Workflow"},"workflowRuleIds":["b4d6cbdc-59f5-11e9-8647-d663bd873d93"]}]'

# Preview workflows for a project (each list holds at most 25 entries) — B851
atlas jira workflows preview --body '{"projectId":"10001","workflowIds":["3215e5cd-f09f-4c8a-921b-dca92bd1e9aa"]}'

# Search workflows (offset-paginated) — B852
atlas jira workflows search --query-string "Default" --is-active true
atlas jira workflows search --start-at 0 --max-results 25 --scope GLOBAL --order-by=-updated
atlas jira workflows search --project-id 10001 --expand values.transitions

# Bulk update workflows: send the full definition read with bulk-get, with your edits — B853
atlas jira workflows update --body '{"statuses":[{"id":"10000","name":"To Do","statusCategory":"TODO","statusReference":"10000"},{"id":"10001","name":"Done","statusCategory":"DONE","statusReference":"10001"}],"workflows":[{"id":"3215e5cd-f09f-4c8a-921b-dca92bd1e9aa","description":"Updated","version":{"id":"6a7f4b1e-3c2d-4e5f-8a9b-0c1d2e3f4a5b","versionNumber":3},"statuses":[{"statusReference":"10000","properties":{}},{"statusReference":"10001","properties":{}}],"transitions":[{"id":"1","name":"Create","type":"INITIAL","toStatusReference":"10000"},{"id":"11","name":"Done","type":"GLOBAL","toStatusReference":"10001","properties":{"jira.issue.editable":"false"}}]}]}'

# Validate the same update without applying it — B854
atlas jira workflows validate-update --body '{"payload":{"statuses":[{"id":"10000","name":"To Do","statusCategory":"TODO","statusReference":"10000"}],"workflows":[{"id":"3215e5cd-f09f-4c8a-921b-dca92bd1e9aa","version":{"id":"6a7f4b1e-3c2d-4e5f-8a9b-0c1d2e3f4a5b","versionNumber":3},"statuses":[{"statusReference":"10000","properties":{}}],"transitions":[{"id":"1","name":"Create","type":"INITIAL","toStatusReference":"10000"}]}]},"validationOptions":{"levels":["ERROR","WARNING"]}}'
```

## `workflowscheme`

Workflow scheme management — full coverage of `/rest/api/3/workflowscheme` (B855–B889). Live half covers listing/CRUD, default-workflow mappings, issue-type mappings, workflow mappings, project usages, and project association/switch. Draft half covers the draft lifecycle (create/get/update/delete/publish), draft default workflow, draft issue-type and workflow mappings. Bulk half covers read, update, and required-mappings.

**Pagination:** `list` is offset-paginated (`--start-at`, `--max-results`). Pass `--all` to drain every page via the `listAll` async generator. `project-usages` uses cursor pagination (`--next-page-token`, `--max-results`).

**Required body endpoints (`--body` JSON):** `create`, `update`, `set-default`, `set-issuetype`, `set-workflow`, `assign-project`, `switch-project`, `update-draft`, `set-draft-default`, `set-draft-issuetype`, `set-draft-workflow`, `bulk-update`, `bulk-mappings`. Optional body: `publish-draft`, `bulk-read`. See [payload-rules.md](../payload-rules.md) for JSON-flag tips.

`list --all` drains every page itself, so it does not take `--start-at`. `list-by-project --project-id` takes positive integer project IDs up to 9007199254740991 (CSV, at most 100 IDs; more is rejected before any request), sent as repeated `projectId` params; duplicate IDs are sent once and count once toward the 100.

**Scheme bodies** (`create`, `update`, `update-draft`; spec `WorkflowScheme`): `name` (unique, at most 255 characters; required on `create`), `description`, `defaultWorkflow` (the workflow **name** for issue types with no mapping; `create` defaults it to `jira`) and `issueTypeMappings` (`{ "<issueTypeId>": "<workflow name>" }`; an issue type maps to one workflow).

**Mapping bodies:** `set-default` / `set-draft-default` take `{ "workflow": "<name>" }` (required). `set-issuetype` / `set-draft-issuetype` take `{ "workflow": "<name>" }` for the issue type in the positional (`issueType` in the body is optional). `set-workflow` / `set-draft-workflow` take `{ "issueTypes": ["<id>", ...], "defaultMapping"?: <bool>, "workflow"?: "<name>" }` for the workflow named by `--workflow-name`.

**Active schemes:** a scheme that at least one project uses cannot be edited directly. Jira rejects `update`, `set-default`, `set-issuetype` and `set-workflow` on it unless the body has `updateDraftIfNeeded: true`, which writes the change to the scheme's draft instead (creating the draft if needed); publish the draft with `publish-draft`. `delete-default`, `delete-issuetype` and `delete-workflow` take the same switch as `--update-draft-if-needed`. On a scheme no project uses, `updateDraftIfNeeded: true` changes the scheme itself.

**Migration payloads** (all IDs are strings):

- `assign-project` — `{ "projectId": "<id>", "workflowSchemeId"?: "<id>" }`; omit `workflowSchemeId` (or send `null`) to assign the default workflow scheme. Only for classic projects with no issues. Prints `{ "updated": true }`.
- `switch-project` — `{ "projectId": "<id>", "targetSchemeId": "<id>", "mappingsByIssueTypeOverride"?: [{ "issueTypeId": "<id>", "statusMappings": [{ "oldStatusId": "<id>", "newStatusId": "<id>" }] }] }`. The mappings are required when a status the project's issues use has no counterpart in the target scheme; get the statuses that need one from `bulk-mappings`.
- `publish-draft` — optional `{ "statusMappings": [{ "issueTypeId": "<id>", "statusId": "<current status>", "newStatusId": "<status in the draft workflow>" }] }`, needed when the draft drops a status an issue type uses. `--validate-only` checks the mappings without publishing.
- `bulk-update` — required `id`, `name`, `description` and `version` (`{ "id", "versionNumber" }`: copy it from the scheme's `bulk-read` output; a stale version is rejected). Optional `defaultWorkflowId`, `workflowsForIssueTypes` (`[{ "issueTypeIds": [...], "workflowId": "<id>" }]`), `statusMappingsByWorkflows` (`[{ "oldWorkflowId", "newWorkflowId", "statusMappings": [{ "oldStatusId", "newStatusId" }] }]`) and `statusMappingsByIssueTypeOverride` (same shape as `mappingsByIssueTypeOverride`, overriding the per-workflow mappings for those issue types).
- `bulk-mappings` — `{ "id": "<scheme id>", "workflowsForIssueTypes": [{ "issueTypeIds": [...], "workflowId": "<id>" }], "defaultWorkflowId"?: "<id>" }`: the planned change; it prints the status mappings that `bulk-update` will need.

**Asynchronous output:** `switch-project`, `publish-draft` and a `bulk-update` that migrates issues run as a Jira task: they print the task (`{ "id", "self", "status", ... }`); poll it with `atlas jira task get <id>` until `status` is `COMPLETE`. `publish-draft --validate-only` and a `bulk-update` with nothing to migrate start no task: the CLI prints `null` (or Jira's empty result).

### Schemes (CRUD)

| Action   | Positional | Required flags | Optional flags                         | BACKLOG |
| -------- | ---------- | -------------- | -------------------------------------- | ------- |
| `list`   | —          | —              | `--start-at`, `--max-results`, `--all` | B855    |
| `create` | —          | `--body`       | —                                      | B856    |
| `delete` | `<id>`     | —              | —                                      | B857    |
| `get`    | `<id>`     | —              | `--return-draft-if-exists`             | B858    |
| `update` | `<id>`     | `--body`       | —                                      | B859    |

### Default workflow

| Action           | Positional | Required flags | Optional flags             | BACKLOG |
| ---------------- | ---------- | -------------- | -------------------------- | ------- |
| `delete-default` | `<id>`     | —              | `--update-draft-if-needed` | B861    |
| `get-default`    | `<id>`     | —              | `--return-draft-if-exists` | B862    |
| `set-default`    | `<id>`     | `--body`       | —                          | B863    |

### Issue-type mappings

| Action             | Positional         | Required flags | Optional flags             | BACKLOG |
| ------------------ | ------------------ | -------------- | -------------------------- | ------- |
| `delete-issuetype` | `<id> <issueType>` | —              | `--update-draft-if-needed` | B877    |
| `get-issuetype`    | `<id> <issueType>` | —              | `--return-draft-if-exists` | B878    |
| `set-issuetype`    | `<id> <issueType>` | `--body`       | —                          | B879    |

### Workflow mappings

| Action            | Positional | Required flags              | Optional flags                                | BACKLOG |
| ----------------- | ---------- | --------------------------- | --------------------------------------------- | ------- |
| `delete-workflow` | `<id>`     | `--workflow-name`           | `--update-draft-if-needed`                    | B880    |
| `get-workflow`    | `<id>`     | —                           | `--workflow-name`, `--return-draft-if-exists` | B881    |
| `set-workflow`    | `<id>`     | `--workflow-name`, `--body` | —                                             | B882    |

### Project usages and associations

> **Experimental:** Atlassian marks `switch-project` `x-experimental`; its shape may change without notice.

| Action            | Positional           | Required flags | Optional flags                       | BACKLOG |
| ----------------- | -------------------- | -------------- | ------------------------------------ | ------- |
| `project-usages`  | `<workflowSchemeId>` | —              | `--next-page-token`, `--max-results` | B883    |
| `list-by-project` | —                    | `--project-id` | —                                    | B884    |
| `assign-project`  | —                    | `--body`       | —                                    | B885    |
| `switch-project`  | —                    | `--body`       | —                                    | B886    |

```sh
# Paginate live workflow schemes
atlas jira workflowscheme list --max-results 50

# Drain every page (uses the listAll async generator)
atlas jira workflowscheme list --all

# CRUD on schemes
atlas jira workflowscheme create --body '{"name":"My Scheme","description":"Example"}'
atlas jira workflowscheme create --body '{"name":"Dev Scheme","defaultWorkflow":"jira","issueTypeMappings":{"10000":"scrum"}}'
atlas jira workflowscheme get 10001
atlas jira workflowscheme get 10001 --return-draft-if-exists
atlas jira workflowscheme update 10001 --body '{"name":"Renamed","updateDraftIfNeeded":true}'
atlas jira workflowscheme delete 10001

# Default workflow
atlas jira workflowscheme get-default 10001
atlas jira workflowscheme set-default 10001 --body '{"workflow":"jira"}'
atlas jira workflowscheme delete-default 10001 --update-draft-if-needed

# On a scheme a project uses: change its draft instead (then run publish-draft)
atlas jira workflowscheme set-default 10001 --body '{"workflow":"jira","updateDraftIfNeeded":true}'

# Issue-type mappings
atlas jira workflowscheme get-issuetype 10001 10000
atlas jira workflowscheme set-issuetype 10001 10000 --body '{"workflow":"scrum"}'
atlas jira workflowscheme delete-issuetype 10001 10000

# Workflow mappings
atlas jira workflowscheme get-workflow 10001 --workflow-name jira
atlas jira workflowscheme set-workflow 10001 --workflow-name jira --body '{"issueTypes":["10000"],"defaultMapping":false}'
atlas jira workflowscheme delete-workflow 10001 --workflow-name jira

# Project usages (cursor pagination)
atlas jira workflowscheme project-usages 10001 --max-results 50
atlas jira workflowscheme project-usages 10001 --next-page-token eyJvIjoyfQ== --max-results 50

# Project associations
atlas jira workflowscheme list-by-project --project-id 10010,10020
atlas jira workflowscheme assign-project --body '{"projectId":"10010","workflowSchemeId":"10001"}'
atlas jira workflowscheme switch-project --body '{"projectId":"10010","targetSchemeId":"10002"}'

# Switch, migrating bug (10000) issues from status 3 to status 10003; then poll the task it prints
atlas jira workflowscheme switch-project --body '{"projectId":"10010","targetSchemeId":"10002","mappingsByIssueTypeOverride":[{"issueTypeId":"10000","statusMappings":[{"oldStatusId":"3","newStatusId":"10003"}]}]}'
atlas jira task get 10641
```

### Draft lifecycle

| Action          | Positional | Required flags | Optional flags              | BACKLOG |
| --------------- | ---------- | -------------- | --------------------------- | ------- |
| `create-draft`  | `<id>`     | —              | —                           | B860    |
| `delete-draft`  | `<id>`     | —              | —                           | B864    |
| `get-draft`     | `<id>`     | —              | —                           | B865    |
| `update-draft`  | `<id>`     | `--body`       | —                           | B866    |
| `publish-draft` | `<id>`     | —              | `--body`, `--validate-only` | B873    |

### Draft default workflow

| Action                 | Positional | Required flags | Optional flags | BACKLOG |
| ---------------------- | ---------- | -------------- | -------------- | ------- |
| `delete-draft-default` | `<id>`     | —              | —              | B867    |
| `get-draft-default`    | `<id>`     | —              | —              | B868    |
| `set-draft-default`    | `<id>`     | `--body`       | —              | B869    |

### Draft issue-type mappings

| Action                   | Positional         | Required flags | Optional flags | BACKLOG |
| ------------------------ | ------------------ | -------------- | -------------- | ------- |
| `delete-draft-issuetype` | `<id> <issueType>` | —              | —              | B870    |
| `get-draft-issuetype`    | `<id> <issueType>` | —              | —              | B871    |
| `set-draft-issuetype`    | `<id> <issueType>` | `--body`       | —              | B872    |

### Draft workflow mappings

| Action                  | Positional | Required flags              | Optional flags    | BACKLOG |
| ----------------------- | ---------- | --------------------------- | ----------------- | ------- |
| `delete-draft-workflow` | `<id>`     | `--workflow-name`           | —                 | B874    |
| `get-draft-workflow`    | `<id>`     | —                           | `--workflow-name` | B875    |
| `set-draft-workflow`    | `<id>`     | `--workflow-name`, `--body` | —                 | B876    |

### Bulk operations

| Action          | Positional | Required flags | Optional flags | BACKLOG |
| --------------- | ---------- | -------------- | -------------- | ------- |
| `bulk-read`     | —          | —              | `--body`       | B887    |
| `bulk-update`   | —          | `--body`       | —              | B888    |
| `bulk-mappings` | —          | `--body`       | —              | B889    |

```sh
# Draft lifecycle
atlas jira workflowscheme create-draft 10001
atlas jira workflowscheme get-draft 10001
atlas jira workflowscheme update-draft 10001 --body '{"name":"Renamed draft","defaultWorkflow":"jira"}'
atlas jira workflowscheme delete-draft 10001
atlas jira workflowscheme publish-draft 10001 --body '{"statusMappings":[]}' --validate-only
atlas jira workflowscheme publish-draft 10001 --body '{"statusMappings":[{"issueTypeId":"10001","statusId":"3","newStatusId":"1"}]}'

# Draft default workflow
atlas jira workflowscheme get-draft-default 10001
atlas jira workflowscheme set-draft-default 10001 --body '{"workflow":"jira"}'
atlas jira workflowscheme delete-draft-default 10001

# Draft issue-type mappings
atlas jira workflowscheme get-draft-issuetype 10001 10000
atlas jira workflowscheme set-draft-issuetype 10001 10000 --body '{"workflow":"scrum"}'
atlas jira workflowscheme delete-draft-issuetype 10001 10000

# Draft workflow mappings
atlas jira workflowscheme get-draft-workflow 10001 --workflow-name jira
atlas jira workflowscheme set-draft-workflow 10001 --workflow-name jira --body '{"issueTypes":["10000"],"workflow":"jira"}'
atlas jira workflowscheme delete-draft-workflow 10001 --workflow-name jira

# Bulk operations
atlas jira workflowscheme bulk-read --body '{"projectIds":["10010"],"workflowSchemeIds":["10001"]}'
atlas jira workflowscheme bulk-update --body '{"id":"10001","name":"x","description":"y","version":{"id":"v","versionNumber":1},"workflowsForIssueTypes":[]}'
atlas jira workflowscheme bulk-mappings --body '{"id":"10001","workflowsForIssueTypes":[{"issueTypeIds":["10000"],"workflowId":"wf-1"}]}'

# Move issue type 10000 to workflow wf-2, mapping status 1 to 2 (version from bulk-read)
atlas jira workflowscheme bulk-update --body '{"id":"10001","name":"Scheme","description":"Updated","version":{"id":"527213fc-bc72-400f-aae0-df8d88db2c8a","versionNumber":1},"defaultWorkflowId":"wf-1","workflowsForIssueTypes":[{"issueTypeIds":["10000"],"workflowId":"wf-2"}],"statusMappingsByWorkflows":[{"oldWorkflowId":"wf-1","newWorkflowId":"wf-2","statusMappings":[{"oldStatusId":"1","newStatusId":"2"}]}]}'
```

## `fields`

Custom field CRUD, field context management, and field admin/association operations.

Covers: B411 (field list-all), B414 (field project associations), B415–B418 (field contexts), B421–B426 (field context options), B419–B420 (context issue-type membership), B429 (context issue-type mappings), B432 (screens for field), B442–B445 (trash/restore/associate), B446 (field search paginated), B447 (trashed fields), the current grouped context default-value reader plus deprecated B905–B906, and field list/create/update/delete.

### Flags per action

No action takes a positional argument except `field-update <fieldId>` and `field-delete <fieldId>`; everything else is a flag. CSV flags drop blank entries (`--project-ids '10010,'` sends `["10010"]`); a CSV flag that is given but names no ID at all (`--issue-type-ids ','`) is refused. Boolean flags take `true|false` (a bare flag means `true`): `--only-options`, `--override-screen-security`, `--override-editable-flag`; `--is-global-context` and `--is-any-issue-type` need an explicit `true|false`.

| Action                            | Required flags                                                                          | Optional flags                                                                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field-list`                      | —                                                                                       | `--type` (CSV of `custom`, `system`), `--id` (CSV), `--query`, `--order-by`, `--expand`, `--project-ids` (CSV ints), `--start-at`, `--max-results` |
| `field-list-all`                  | —                                                                                       | —                                                                                                                                                  |
| `field-create`                    | `--body` (JSON)                                                                         | —                                                                                                                                                  |
| `field-update`                    | `<fieldId>`, `--body` (JSON)                                                            | —                                                                                                                                                  |
| `field-delete`                    | `<fieldId>`                                                                             | —                                                                                                                                                  |
| `context-list`                    | `--field-id`                                                                            | `--is-global-context`, `--is-any-issue-type`, `--context-id` (CSV ints), `--start-at`, `--max-results`                                             |
| `context-create`                  | `--field-id`, `--name`                                                                  | `--description`, `--project-ids` (CSV), `--issue-type-ids` (CSV)                                                                                   |
| `context-update`                  | `--field-id`, `--context-id`, and `--name` and/or `--description`                       | —                                                                                                                                                  |
| `context-delete`                  | `--field-id`, `--context-id`                                                            | —                                                                                                                                                  |
| `context-option-list`             | `--field-id`, `--context-id`                                                            | `--option-id`, `--only-options`, `--start-at`, `--max-results`                                                                                     |
| `context-option-create`           | `--field-id`, `--context-id`, `--body` (JSON)                                           | —                                                                                                                                                  |
| `context-option-update`           | `--field-id`, `--context-id`, `--body` (JSON)                                           | —                                                                                                                                                  |
| `context-option-delete`           | `--field-id`, `--context-id`, `--option-id`                                             | —                                                                                                                                                  |
| `context-option-replace-issues`   | `--field-id`, `--context-id`, `--option-id`                                             | `--replace-with`, `--jql`                                                                                                                          |
| `context-option-move`             | `--field-id`, `--context-id`, `--option-ids` (CSV), and `--position` or `--after`       | —                                                                                                                                                  |
| `context-issuetype-set`           | `--field-id`, `--context-id`, and `--issue-type-ids` (CSV) and/or `--is-any-issue-type` | `--default-value-json`                                                                                                                             |
| `context-issuetype-remove`        | `--field-id`, `--context-id`, `--issue-type-ids` (CSV)                                  | —                                                                                                                                                  |
| `context-issuetype-mapping`       | `--field-id`                                                                            | `--context-id` (CSV ints), `--start-at`, `--max-results`                                                                                           |
| `context-default-get`             | `--field-id`                                                                            | `--context-id` (CSV ints), `--issue-type-ids` (CSV), `--start-at`, `--max-results`                                                                 |
| `context-default-list`            | `--field-id`                                                                            | `--context-id` (CSV ints), `--start-at`, `--max-results`                                                                                           |
| `context-default-set`             | `--field-id`, `--default-values-json`                                                   | —                                                                                                                                                  |
| `context-default-update`          | `--field-id`, `--default-values-json`                                                   | —                                                                                                                                                  |
| `context-project-set`             | `--field-id`, `--context-id`, `--project-ids` (CSV)                                     | —                                                                                                                                                  |
| `context-project-remove`          | `--field-id`, `--context-id`, `--project-ids` (CSV)                                     | —                                                                                                                                                  |
| `context-mapping`                 | `--field-id`, `--mappings-json`                                                         | `--start-at`, `--max-results`                                                                                                                      |
| `context-project-mapping`         | `--field-id`                                                                            | `--context-id` (CSV ints), `--start-at`, `--max-results`                                                                                           |
| `field-option-list`               | `--field-key`                                                                           | `--start-at`, `--max-results`                                                                                                                      |
| `field-option-create`             | `--field-key`, `--body` (JSON)                                                          | —                                                                                                                                                  |
| `field-option-delete`             | `--field-key`, `--option-id`                                                            | —                                                                                                                                                  |
| `field-option-get`                | `--field-key`, `--option-id`                                                            | —                                                                                                                                                  |
| `field-option-update`             | `--field-key`, `--option-id`, `--body` (JSON)                                           | —                                                                                                                                                  |
| `field-option-replace-issues`     | `--field-key`, `--option-id`                                                            | `--replace-with`, `--jql`, `--override-screen-security`, `--override-editable-flag`                                                                |
| `field-option-suggestions-edit`   | `--field-key`                                                                           | `--project-id`, `--start-at`, `--max-results`                                                                                                      |
| `field-option-suggestions-search` | `--field-key`                                                                           | `--project-id`, `--start-at`, `--max-results`                                                                                                      |
| `field-project-associations`      | `--field-id`                                                                            | `--start-at`, `--max-results`                                                                                                                      |
| `field-screens`                   | `--field-id`                                                                            | `--expand`, `--start-at`, `--max-results`                                                                                                          |
| `field-restore`                   | `--field-id`                                                                            | —                                                                                                                                                  |
| `field-trash`                     | `--field-id`                                                                            | —                                                                                                                                                  |
| `field-remove-associations`       | `--body` (JSON)                                                                         | —                                                                                                                                                  |
| `field-create-associations`       | `--body` (JSON)                                                                         | —                                                                                                                                                  |
| `field-trash-list`                | —                                                                                       | `--id` (CSV), `--query`, `--expand`, `--order-by`, `--start-at`, `--max-results`                                                                   |

`--option-id`, `--replace-with`, `--project-id` and `--context-id` values are positive integers; `--start-at` is 0-based. Every list action is offset-paginated (`--start-at`, `--max-results`) except `field-list-all`.

### Fields (CRUD)

`field-create --body` is a `CustomFieldDefinitionJsonBean`: `name` and `type` are required, `description` and `searcherKey` optional. `type` is a full custom-field type key such as `com.atlassian.jira.plugin.system.customfieldtypes:float` (built-ins: `cascadingselect`, `datepicker`, `datetime`, `float`, `grouppicker`, `importid`, `labels`, `multicheckboxes`, `multigrouppicker`, `multiselect`, `multiuserpicker`, `multiversion`, `project`, `radiobuttons`, `readonlyfield`, `select`, `textarea`, `textfield`, `url`, `userpicker`, `version`), or a Forge custom field type ID. `field-update --body` takes `name` (max 255), `description` (max 40000) and `searcherKey` (or `null`), all optional. `searcherKey` must match the type — use the full key `com.atlassian.jira.plugin.system.customfieldtypes:<searcher>`:

| Field type                                                                     | `<searcher>`                   |
| ------------------------------------------------------------------------------ | ------------------------------ |
| `cascadingselect`                                                              | `cascadingselectsearcher`      |
| `datepicker` / `datetime`                                                      | `daterange` / `datetimerange`  |
| `float`, `importid`                                                            | `exactnumber` or `numberrange` |
| `grouppicker`                                                                  | `grouppickersearcher`          |
| `labels`                                                                       | `labelsearcher`                |
| `multicheckboxes`, `multigrouppicker`, `multiselect`, `radiobuttons`, `select` | `multiselectsearcher`          |
| `multiuserpicker`, `userpicker`                                                | `userpickergroupsearcher`      |
| `multiversion`, `version`                                                      | `versionsearcher`              |
| `project`                                                                      | `projectsearcher`              |
| `readonlyfield`, `textarea`, `textfield`                                       | `textsearcher`                 |
| `url`                                                                          | `exacttextsearcher`            |

```sh
# List all fields (flat array)
atlas jira fields field-list-all

# List custom fields (paginated)
atlas jira fields field-list --start-at 0 --max-results 50

# Create a custom field
atlas jira fields field-create --body '{"name":"Sprint Story Points","type":"com.atlassian.jira.plugin.system.customfieldtypes:float","searcherKey":"com.atlassian.jira.plugin.system.customfieldtypes:exactnumber"}'

# Update a custom field (returns no body — 204 No Content)
atlas jira fields field-update customfield_10001 --body '{"name":"Renamed Field","description":"Updated description"}'

# Delete a custom field (asynchronous: prints the deletion task)
atlas jira fields field-delete customfield_10001
```

- `field-update` returns **no body** (the spec responds 204 No Content); the SDK `update()` resolves to `void`.
- `field-delete` is **asynchronous**: Jira answers 303 to a task, and the CLI prints that task (`{id, self, status, progress, …}`) rather than a confirmation — the field is gone only when the task finishes. Poll it with `atlas jira task get <taskId>` until `status` is `COMPLETE` (or `FAILED`, `CANCELLED`, `DEAD`). If Jira answers without a task (204 or an empty 200), the CLI prints `{"deleted": true}`. In the SDK, `client.fields.delete(id, { returnTask: true })` resolves the task; `client.fields.delete(id)` still resolves `void`.

### Field Contexts (B415–B418)

```sh
# List contexts for a custom field (B415), paginated
atlas jira fields context-list --field-id customfield_10001 --start-at 0 --max-results 50

# Filter contexts by type (tri-state filters — pass true|false; omit to not filter on that dimension)
atlas jira fields context-list --field-id customfield_10001 --is-global-context true --is-any-issue-type true

# Filter by specific context IDs (comma-separated)
atlas jira fields context-list --field-id customfield_10001 --context-id 10025,10026

# Create a context (global, all issue types) (B416)
atlas jira fields context-create --field-id customfield_10001 --name 'Bug fields context' --description 'Context for bugs'

# Create a context scoped to projects and issue types (B416)
atlas jira fields context-create --field-id customfield_10001 --name 'Scoped context' --project-ids '10010,10011' --issue-type-ids '10000'

# Update a context name/description (B418) — at least one of --name/--description
atlas jira fields context-update --field-id customfield_10001 --context-id 10025 --name 'Renamed context' --description 'New description'

# Delete a context (B417)
atlas jira fields context-delete --field-id customfield_10001 --context-id 10025
```

- `context-create` without `--project-ids` makes a global context; without `--issue-type-ids` it applies to all issue types.

### Field Context Options (B421–B426)

`context-option-create --body` is `{"options":[{"value":"…","disabled"?:bool,"optionId"?:"<parent option id for a cascading child>"}]}`; `context-option-update --body` is `{"options":[{"id":"…","value"?:"…","disabled"?:bool}]}`. `context-option-move` needs `--option-ids` (options or cascading options, not both; the list order is the order after the move) and exactly one placement: `--position First` / `--position Last`, or `--after <optionId>`; with neither it is refused before sending. `context-option-replace-issues` deselects `--option-id` on the issues matched by `--jql` (e.g. `project=10000`), replacing it with `--replace-with` if given; it only works for options created in Jira or through these context-option actions, not for options created by Connect or Forge apps, and prints the async task.

```sh
# List options for a field context (B421)
atlas jira fields context-option-list --field-id customfield_10001 --context-id 10025

# List options with pagination and filters (B421): --only-options skips cascading children, --option-id returns one option
atlas jira fields context-option-list --field-id customfield_10001 --context-id 10025 --start-at 0 --max-results 50 --only-options
atlas jira fields context-option-list --field-id customfield_10001 --context-id 10025 --option-id 10001

# Bulk-create options in a context (B422)
atlas jira fields context-option-create --field-id customfield_10001 --context-id 10025 --body '{"options":[{"value":"New York"},{"value":"Boston","disabled":false}]}'

# Bulk-update options in a context (B423)
atlas jira fields context-option-update --field-id customfield_10001 --context-id 10025 --body '{"options":[{"id":"10001","value":"New York Renamed","disabled":false}]}'

# Delete a single option from a context (B424)
atlas jira fields context-option-delete --field-id customfield_10001 --context-id 10025 --option-id 10001

# Replace an option on issues — starts async task (B425)
atlas jira fields context-option-replace-issues --field-id customfield_10001 --context-id 10025 --option-id 10001 --replace-with 10003 --jql project=PROJ

# Reorder options to the first / last position (B426)
atlas jira fields context-option-move --field-id customfield_10001 --context-id 10025 --option-ids 10001,10002 --position First
atlas jira fields context-option-move --field-id customfield_10001 --context-id 10025 --option-ids 10002 --position Last

# Reorder options after a specific option (B426)
atlas jira fields context-option-move --field-id customfield_10001 --context-id 10025 --option-ids 10001 --after 10005
```

### Field context issue-type mappings

Manage which issue types are associated with a custom field context (B419–B420, B429).

`context-issuetype-set` needs `--field-id` and `--context-id` plus **at least one of** `--issue-type-ids` (CSV) or `--is-any-issue-type true|false`; with neither it fails before sending a request. Optional `--default-value-json` is one default-value object (same `type`-discriminated shapes as below) applied to the newly added mappings; if omitted, Jira copies the default of the first existing mapping. Adding issue types replaces the any-issue-type mapping unless `--is-any-issue-type true` is set. `context-issuetype-remove` still requires `--issue-type-ids`.

```sh
# Add issue types to a context (B419) — PUT 204
atlas jira fields context-issuetype-set --field-id customfield_10001 --context-id 10025 --issue-type-ids 10001,10005,10006

# Keep/add the any-issue-type mapping, with a default for the new mapping
atlas jira fields context-issuetype-set --field-id customfield_10001 --context-id 10025 --is-any-issue-type true --default-value-json '{"type":"longtext","contextId":"10025","text":"Default text"}'

# Remove issue types from a context (B420) — POST 204
atlas jira fields context-issuetype-remove --field-id customfield_10001 --context-id 10025 --issue-type-ids 10001,10005

# List issue-type-to-context mappings for a field (B429) — paginated
atlas jira fields context-issuetype-mapping --field-id customfield_10001

# Filter mappings by specific contexts (B429)
atlas jira fields context-issuetype-mapping --field-id customfield_10001 --context-id 10025,10026 --start-at 0 --max-results 50
```

### Field context default values

Get and set default values for custom field contexts.

`context-default-get` uses the current grouped reader
`GET /field/{fieldId}/context/defaultValues`. It returns one item per context,
with nested defaults grouped by issue type. `context-default-list` and
`context-default-set` use the deprecated singular `/defaultValue` endpoints
(CHANGE-3082), scheduled for removal in October 2026.

`context-default-update` is the current writer, `PUT /field/{fieldId}/context/defaultValues`
(204). `--default-values-json` is a JSON array of
`{"contextId":<number>,"issueTypeId":"<id>","isAnyIssueType":<bool>,"value":<default value object or null>}`
entries. Each entry targets one issue type through `issueTypeId`, or the catch-all
through `"isAnyIssueType":true`; `contextId` is required and numeric; a `null` `value`
removes that target's default; entries not listed are left unchanged. Atlassian
currently restricts this endpoint to tenants in the early access program (CHANGE-3082):
others get HTTP 403.

Default-value objects (`context-default-set` array entries, `context-default-update` `value`, `context-issuetype-set --default-value-json`) are discriminated by `type`, which must match the field's type. Every object also needs `contextId` (a string). All IDs are strings unless noted.

| `type`                                | Field type                    | Required keys               | Optional keys                              |
| ------------------------------------- | ----------------------------- | --------------------------- | ------------------------------------------ |
| `option.single`                       | select / radio buttons        | `optionId`                  | —                                          |
| `option.multiple`                     | multi-select / checkboxes     | `optionIds` (array)         | —                                          |
| `option.cascading`                    | cascading select              | `optionId`                  | `cascadingOptionId`                        |
| `single.user.select`                  | user picker                   | `accountId`, `userFilter`   | —                                          |
| `multi.user.select`                   | multi-user picker             | `accountIds` (array)        | —                                          |
| `grouppicker.single`                  | group picker                  | `groupId`                   | —                                          |
| `grouppicker.multiple`                | multi-group picker            | `groupIds` (array)          | —                                          |
| `datepicker`                          | date picker                   | —                           | `date` (ISO date), `useCurrent` (bool)     |
| `datetimepicker`                      | date-time picker              | —                           | `dateTime` (ISO 8601), `useCurrent` (bool) |
| `url`                                 | URL                           | `url`                       | —                                          |
| `project`                             | project picker                | `projectId`                 | —                                          |
| `float`                               | number                        | `number` (number)           | —                                          |
| `labels`                              | labels                        | `labels` (array of strings) | —                                          |
| `textfield` / `textarea` / `longtext` | single-line / multi-line text | —                           | `text`                                     |
| `readonly`                            | read-only text                | —                           | `text`                                     |
| `version.single`                      | version picker                | `versionId`                 | `versionOrder`                             |
| `version.multiple`                    | multi-version picker          | `versionIds` (array)        | `versionOrder`                             |
| `forge.string`                        | Forge string                  | —                           | `text`                                     |
| `forge.string.list`                   | Forge string list             | —                           | `values` (array of strings)                |
| `forge.number`                        | Forge number                  | `number` (number)           | —                                          |
| `forge.object`                        | Forge object                  | —                           | `object` (JSON object)                     |
| `forge.datetime`                      | Forge date-time               | —                           | `dateTime`, `useCurrent` (bool)            |
| `forge.group`                         | Forge group                   | `groupId`                   | —                                          |
| `forge.group.list`                    | Forge group list              | `groupIds` (array)          | —                                          |
| `forge.user`                          | Forge user                    | `accountId`, `userFilter`   | —                                          |
| `forge.user.list`                     | Forge user list               | `accountIds` (array)        | —                                          |

`userFilter` (for `single.user.select` and `forge.user`) is `{"enabled": <bool>, "groups"?: ["group name", …], "roleIds"?: [<int>, …]}` — `enabled` is required; at most 10 groups and 10 role IDs restrict which users the picker suggests.

```sh
# Get current defaults grouped by context and issue type (recommended)
atlas jira fields context-default-get --field-id customfield_10001

# Filter the grouped response; both filters are comma-separated lists
atlas jira fields context-default-get --field-id customfield_10001 --context-id 10025,10026 --issue-type-ids 10000,10001 --start-at 0 --max-results 50

# List default values for a custom field (B905) — paginated, deprecated
atlas jira fields context-default-list --field-id customfield_10001

# Filter by specific contexts (B905)
atlas jira fields context-default-list --field-id customfield_10001 --context-id 10025,10026 --start-at 0 --max-results 50

# Set defaults — option.single for one context (B906) — deprecated
atlas jira fields context-default-set --field-id customfield_10001 --default-values-json '[{"type":"option.single","contextId":"10100","optionId":"10001"}]'

# Set defaults — multiple variants in one request (B906)
atlas jira fields context-default-set --field-id customfield_10001 --default-values-json '[{"type":"option.single","contextId":"10100","optionId":"10001"},{"type":"forge.string","contextId":"10102","text":"Default text"}]'

# Set a cascading default with child option (B906)
atlas jira fields context-default-set --field-id customfield_10001 --default-values-json '[{"type":"option.cascading","contextId":"10101","optionId":"10002","cascadingOptionId":"10003"}]'

# Set a user-picker default limited to one group (B906)
atlas jira fields context-default-set --field-id customfield_10005 --default-values-json '[{"type":"single.user.select","contextId":"10103","accountId":"5b10a2844c20165700ede21g","userFilter":{"enabled":true,"groups":["jira-software-users"]}}]'

# Set labels and version-picker defaults (B906)
atlas jira fields context-default-set --field-id customfield_10006 --default-values-json '[{"type":"labels","contextId":"10104","labels":["triage"]},{"type":"version.single","contextId":"10105","versionId":"10200"}]'

# Update defaults per context and issue type (EAP): set one, remove the catch-all
atlas jira fields context-default-update --field-id customfield_10001 --default-values-json '[{"contextId":10100,"issueTypeId":"10001","value":{"type":"option.single","contextId":"10100","optionId":"10002"}},{"contextId":10100,"isAnyIssueType":true,"value":null}]'
```

### Field context project mappings

Assign/remove projects from a context and query context-to-project mappings (B427–B428, B431). Also includes bulk context lookup by project+issueType pairs (B430).

```sh
# Assign a context to projects (B427) — PUT 204
atlas jira fields context-project-set --field-id customfield_10001 --context-id 10025 --project-ids 10001,10005,10006

# Remove projects from a context (B428) — POST 204
atlas jira fields context-project-remove --field-id customfield_10001 --context-id 10025 --project-ids 10001,10005

# List context-to-project mappings for a field (B431) — paginated
atlas jira fields context-project-mapping --field-id customfield_10001

# Filter mappings by specific contexts (B431)
atlas jira fields context-project-mapping --field-id customfield_10001 --context-id 10025,10026 --start-at 0 --max-results 50

# Bulk lookup: find which context applies to each project+issueType pair (B430), paginated
# Body is a JSON array of {projectId, issueTypeId} objects
atlas jira fields context-mapping --field-id customfield_10001 --mappings-json '[{"projectId":"10000","issueTypeId":"10000"},{"projectId":"10000","issueTypeId":"10001"}]' --start-at 0 --max-results 50
```

### Field key option management (Connect-app-managed)

Manage options on Connect-app select list fields via `fieldKey` (B433–B440). These endpoints only work for options added by Connect apps, not options created in Jira directly.

`field-option-create --body` is `{"value": "…", "properties"?: {…}, "config"?: {…}}` (`value` required); `field-option-update --body` is the full option `{"id": <int, = --option-id>, "value": "…", "properties"?, "config"?}`. `config` controls where the option is available: `{"scope": {"projects2": [{"id": <projectId>, "attributes": ["notSelectable"|"defaultValue"]}], "global": {"attributes": [...]}}}` — `projects2` lists per-project behaviour, an empty `global` object makes it available everywhere, and with no `scope` the option is available in all projects (`config.attributes` and `scope.projects` are deprecated). `field-option-replace-issues` deselects the option on the issues matched by `--jql` (replacing it with `--replace-with` if given) and prints the async task; `--override-screen-security` (edit hidden fields) and `--override-editable-flag` (edit uneditable fields), each `true|false`, are for Connect and Forge app users with admin permission.

```sh
# List all options for a field (B433) — GET paginated
atlas jira fields field-option-list --field-key example-add-on__team-field
atlas jira fields field-option-list --field-key example-add-on__team-field --start-at 0 --max-results 50

# Create an option for a field (B434) — POST, available only in project 10000
atlas jira fields field-option-create --field-key example-add-on__team-field --body '{"value":"Team 1","properties":{"members":42},"config":{"scope":{"projects2":[{"id":10000,"attributes":["notSelectable"]}]}}}'

# Delete an option from a field (B435) — DELETE 204
atlas jira fields field-option-delete --field-key example-add-on__team-field --option-id 1

# Get a single option (B436) — GET
atlas jira fields field-option-get --field-key example-add-on__team-field --option-id 1

# Update (or create) an option — id in body must match --option-id (B437) — PUT
atlas jira fields field-option-update --field-key example-add-on__team-field --option-id 1 --body '{"id":1,"value":"Team 1 Updated"}'

# Deselect an option from all matching issues (async task) — returns task progress (B438) — DELETE 303
atlas jira fields field-option-replace-issues --field-key example-add-on__team-field --option-id 1 --replace-with 3 --jql 'project=PROJ'
atlas jira fields field-option-replace-issues --field-key example-add-on__team-field --option-id 1 --override-screen-security true --override-editable-flag true

# Get selectable options for a field (edit suggestions) (B439) — GET paginated
atlas jira fields field-option-suggestions-edit --field-key example-add-on__team-field
atlas jira fields field-option-suggestions-edit --field-key example-add-on__team-field --project-id 10001 --start-at 0 --max-results 50

# Get visible options for a field (search/view suggestions) (B440) — GET paginated
atlas jira fields field-option-suggestions-search --field-key example-add-on__team-field
atlas jira fields field-option-suggestions-search --field-key example-add-on__team-field --project-id 10001 --start-at 0 --max-results 50
```

### Field admin and association (B414, B432, B442–B445, B447)

Trash/restore custom fields, manage field-to-project associations, list screens a field appears on, and list trashed fields.

> **Experimental:** Atlassian marks `field-project-associations` `x-experimental`; its shape may change without notice.

`field-create-associations` / `field-remove-associations` take `--body` `{"associationContexts":[{"type":"PROJECT_ID","identifier":<projectId>}],"fields":[{"type":"FIELD_ID","identifier":"<fieldId>"}]}` (both lists required; `PROJECT_ID` and `FIELD_ID` are the identifier types the spec documents). One request handles up to 50 fields and 100 projects; the association also reaches every project that shares the same field configuration.

`field-trash-list --order-by` is `name`, `trashDate` or `plannedDeletionDate` (optionally `+`/`-` prefixed); `--id` is a CSV of field IDs.

```sh
# List project associations for a custom field (B414) — GET paginated
atlas jira fields field-project-associations --field-id customfield_10001
atlas jira fields field-project-associations --field-id customfield_10001 --start-at 0 --max-results 50

# List screens a field is used in (B432) — GET paginated
atlas jira fields field-screens --field-id customfield_10001
atlas jira fields field-screens --field-id customfield_10001 --expand tab --start-at 0 --max-results 50

# Restore a custom field from trash (B442) — POST
atlas jira fields field-restore --field-id customfield_10001

# Move a custom field to trash (B443) — POST
atlas jira fields field-trash --field-id customfield_10001

# Remove associations between fields and projects (B444) — DELETE with body
atlas jira fields field-remove-associations --body '{"associationContexts":[{"type":"PROJECT_ID","identifier":10000}],"fields":[{"type":"FIELD_ID","identifier":"customfield_10000"}]}'

# Create associations between fields and projects (B445) — PUT with body
atlas jira fields field-create-associations --body '{"associationContexts":[{"type":"PROJECT_ID","identifier":10000},{"type":"PROJECT_ID","identifier":10001}],"fields":[{"type":"FIELD_ID","identifier":"customfield_10000"}]}'

# List trashed custom fields (B447) — GET paginated; descending sort needs the = form
atlas jira fields field-trash-list
atlas jira fields field-trash-list --query approvers --start-at 0 --max-results 50
atlas jira fields field-trash-list --id customfield_10000,customfield_10001 --order-by=-trashDate
```

### Field search paginated (B411 + B446)

`field-list-all` returns the flat array from `GET /field` (B411). `field-list` returns the paginated search from `GET /field/search` (B446):

- `--type` is a CSV of `custom` and/or `system`; `--id` is a CSV of field IDs; `--project-ids` is a CSV of integer project IDs (fields used in those projects). Each list is sent as repeated query params.
- `--query` matches field names and descriptions (case-insensitive).
- `--order-by` is one of `contextsCount`, `lastUsed`, `name`, `screensCount`, `projectsCount`, each optionally prefixed with `+` (ascending) or `-` (descending). Attach a value that starts with `-` with `=`: `--order-by=-name` (`--order-by -name` is a parse error).
- `--expand` is a CSV of `key`, `stableId`, `lastUsed`, `screensCount`, `contextsCount`, `isLocked`, `searcherKey`.

```sh
# List all fields (flat, not paginated) — B411
atlas jira fields field-list-all

# Search fields (paginated) — B446
atlas jira fields field-list --max-results 50
atlas jira fields field-list --type custom --query approvers
atlas jira fields field-list --id customfield_10000,summary --project-ids 10000,10001 --type custom,system
atlas jira fields field-list --order-by screensCount --expand screensCount,contextsCount
atlas jira fields field-list --order-by=-name --start-at 50 --max-results 50
```
