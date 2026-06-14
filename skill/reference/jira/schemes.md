# Jira — Fields, screens, schemes, workflows, security

> Part of the `atlas` Jira skill reference. Resource×action matrix and routing in [`../jira.md`](../jira.md).

## `issue-type-schemes`

Issue type scheme management (B566–B575). Covers the full `/rest/api/3/issuetypescheme` surface.

| Action              | Positional                          | Required flags                                                       | Optional flags                                                       |
| ------------------- | ----------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `list`              | —                                   | —                                                                    | `--start-at`, `--max-results`, `--ids` (CSV scheme IDs)              |
| `list-mapping`      | —                                   | —                                                                    | `--start-at`, `--max-results`, `--scheme-ids` (CSV scheme IDs)       |
| `list-project`      | —                                   | —                                                                    | `--start-at`, `--max-results`, `--project-ids` (CSV)                 |
| `create`            | —                                   | `--name`                                                             | `--description`, `--default-issue-type-id`, `--issue-type-ids` (CSV) |
| `update`            | `<issueTypeSchemeId>`               | at least one of `--name`, `--description`, `--default-issue-type-id` | —                                                                    |
| `delete`            | `<issueTypeSchemeId>`               | —                                                                    | —                                                                    |
| `add-issue-types`   | `<issueTypeSchemeId>`               | `--issue-type-ids` (CSV)                                             | —                                                                    |
| `remove-issue-type` | `<issueTypeSchemeId> <issueTypeId>` | —                                                                    | —                                                                    |
| `move-issue-types`  | `<issueTypeSchemeId>`               | `--issue-type-ids` (CSV)                                             | `--position` (First\|Last), `--after` (issueTypeId)                  |
| `assign-to-project` | —                                   | `--scheme-id`, `--project-id`                                        | —                                                                    |

- `create` returns `{ issueTypeSchemeId }` (spec `IssueTypeSchemeID`), not `{ id }` — chain the returned `issueTypeSchemeId` into subsequent calls.

```bash
# List all schemes (paginated)
atlas jira issue-type-schemes list --start-at 0 --max-results 50

# List specific schemes by ID
atlas jira issue-type-schemes list --ids 10000,10001

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

# Get project-to-scheme mapping
atlas jira issue-type-schemes list-project --project-ids 10100,10101

# Assign a scheme to a project
atlas jira issue-type-schemes assign-to-project --scheme-id 10000 --project-id 10100
```

## `fieldconfiguration`

Issue field configuration management (B908–B913). Covers the flat `/rest/api/3/fieldconfiguration` surface. Marked deprecated by Atlassian but still operational on Jira Cloud.

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

| Action                | Positional                                | Required flags                            | Optional flags                                                                                    |
| --------------------- | ----------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `list`                | —                                         | —                                         | `--start-at`, `--max-results`, `--ids` (CSV), `--project-ids` (CSV), `--expand`, `--only-default` |
| `create`              | —                                         | `--name`                                  | `--description`, `--notification-scheme-events` (JSON)                                            |
| `get`                 | `<notificationSchemeId>`                  | —                                         | `--expand`                                                                                        |
| `update`              | `<notificationSchemeId>`                  | at least one of `--name`, `--description` | —                                                                                                 |
| `add-notifications`   | `<notificationSchemeId>`                  | `--notification-scheme-events` (JSON)     | —                                                                                                 |
| `delete`              | `<notificationSchemeId>`                  | —                                         | —                                                                                                 |
| `remove-notification` | `<notificationSchemeId> <notificationId>` | —                                         | —                                                                                                 |
| `list-projects`       | —                                         | —                                         | `--start-at`, `--max-results`, `--project-ids` (CSV)                                              |

- `--notification-scheme-events` is a **JSON array** of `{ event: { id }, notifications: [ ... ] }` entries. Each notification has a `notificationType` (e.g. `CurrentAssignee`, `Group`, `User`, `ProjectLead`, `EmailAddress`) and an optional `parameter` (group name, accountId, email, etc.).
- `--expand` accepts the standard server-side expander keys, most commonly `notificationSchemeEvents`, `user`, `group`, `projectRole`, `field`, `all`.
- `--only-default` (boolean) restricts the list to default schemes.
- `update` is `PUT` 204 No Content — only `name` and `description` are mutable.
- `add-notifications` is `PUT` 204 — appends events/notifications to an existing scheme without replacing existing entries.
- `remove-notification` deletes a single notification entry by its server-assigned `notificationId`.
- `list-projects` returns the per-project `{ notificationSchemeId, projectId }` mapping; combine with `--project-ids` to filter.

```bash
# List notification schemes (paginated)
atlas jira notification-schemes list --start-at 0 --max-results 50

# List specific schemes with their events expanded
atlas jira notification-schemes list --ids 10000,10001 --expand notificationSchemeEvents

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

| Action                   | Positional arg            | Key flags                                                      | Returns                    |
| ------------------------ | ------------------------- | -------------------------------------------------------------- | -------------------------- |
| `list`                   | —                         | `--ids`, `--query`, `--start-at`, `--max-results`              | paginated schemes          |
| `create`                 | —                         | `--name` (req), `--mappings` (req JSON array), `--description` | `{ id }`                   |
| `update`                 | `issueTypeScreenSchemeId` | `--name`, `--description`                                      | `{ updated: true }`        |
| `delete`                 | `issueTypeScreenSchemeId` | —                                                              | `{ deleted: true }`        |
| `update-mapping`         | `issueTypeScreenSchemeId` | `--mappings` (req JSON array)                                  | `{ updated: true }`        |
| `update-default-mapping` | `issueTypeScreenSchemeId` | `--screen-scheme-id` (req)                                     | `{ updated: true }`        |
| `remove-mappings`        | `issueTypeScreenSchemeId` | `--issue-type-ids` (req, CSV)                                  | `{ removed: true }`        |
| `get-project`            | `issueTypeScreenSchemeId` | `--start-at`, `--max-results`                                  | paginated projects         |
| `list-mapping`           | —                         | `--scheme-ids` (CSV), `--start-at`, `--max-results`            | paginated mappings         |
| `list-project-mappings`  | —                         | `--project-ids` (req, CSV), `--start-at`, `--max-results`      | paginated project mappings |
| `assign-to-project`      | —                         | `--scheme-id` (req), `--project-id` (req)                      | `{ assigned: true }`       |

The `--mappings` flag accepts a JSON array of `{ issueTypeId, screenSchemeId }` objects.

```sh
# List all schemes
atlas jira issue-type-screen-schemes list --max-results 50

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

# List all issue-type-to-screen-scheme mappings
atlas jira issue-type-screen-schemes list-mapping --scheme-ids 10001,10002

# List project-to-scheme mappings
atlas jira issue-type-screen-schemes list-project-mappings --project-ids 10001,10002

# Assign a scheme to a project
atlas jira issue-type-screen-schemes assign-to-project --scheme-id 10001 --project-id 10002
```

## `permission-schemes`

Jira permission schemes and per-scheme permission grants under `/rest/api/3/permissionscheme` (B616–B624).

| Action              | Positional                  | Required flags                                           | Optional flags                                                                      |
| ------------------- | --------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `list`              | —                           | —                                                        | `--expand`                                                                          |
| `get`               | `<schemeId>`                | —                                                        | `--expand`                                                                          |
| `create`            | —                           | `--name`                                                 | `--description`, `--permissions`, `--expand`                                        |
| `update`            | `<schemeId>`                | at least one of `--name`/`--description`/`--permissions` | `--expand`                                                                          |
| `delete`            | `<schemeId>`                | —                                                        | —                                                                                   |
| `list-permissions`  | `<schemeId>`                | —                                                        | `--expand`                                                                          |
| `create-permission` | `<schemeId>`                | —                                                        | `--permission`, `--holder-type`, `--holder-parameter`, `--holder-value`, `--expand` |
| `get-permission`    | `<schemeId> <permissionId>` | —                                                        | `--expand`                                                                          |
| `delete-permission` | `<schemeId> <permissionId>` | —                                                        | —                                                                                   |

- `--expand` on `list`/`get`/`create`/`update` accepts `permissions` to inline the grant list; on grant endpoints (`list-permissions`, `create-permission`, `get-permission`) accepts `all` or `field`.
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

# Delete a permission grant
atlas jira permission-schemes delete-permission 10000 10001
```

## `priority-schemes`

Priority scheme management (B644–B651). Covers the full `/rest/api/3/priorityscheme` surface: paginated listing, create/update/delete, scheme-scoped priority and project listings, and helper endpoints for suggested mappings and available priorities.

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
atlas jira priority-schemes list --scheme-ids 10000,10001 --order-by -name
atlas jira priority-schemes list --scheme-name "Critical" --only-default

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

**Paginated endpoints** (support `--start-at`, `--max-results`):

- `list-members` — GET /issuesecurityschemes/{issueSecuritySchemeId}/members
- `list-levels` — GET /issuesecurityschemes/level
- `list-level-members` — GET /issuesecurityschemes/level/member
- `list-projects` — GET /issuesecurityschemes/project
- `search` — GET /issuesecurityschemes/search

| Action                 | Positional args                       | Key flags                                                                       | Returns                 |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------- | ----------------------- |
| `get-all`              | —                                     | —                                                                               | SecuritySchemesResponse |
| `create`               | —                                     | `--name` (req), `--description`, `--levels` (JSON array)                        | `{id}`                  |
| `get`                  | `<id>`                                | —                                                                               | IssueSecurityScheme     |
| `update`               | `<id>`                                | `--name`, `--description` (≥1 required)                                         | `{updated:true}`        |
| `list-members`         | `<issueSecuritySchemeId>`             | `--issue-security-level-id`, `--expand`, pagination                             | PageBean                |
| `delete`               | `<schemeId>`                          | —                                                                               | `{deleted:true}`        |
| `add-levels`           | `<schemeId>`                          | `--levels` (JSON array)                                                         | `{updated:true}`        |
| `remove-level`         | `<schemeId>` `<levelId>`              | `--replace-with`                                                                | `{deleted:true}`        |
| `update-level`         | `<schemeId>` `<levelId>`              | `--name`, `--description` (≥1 required)                                         | `{updated:true}`        |
| `add-level-members`    | `<schemeId>` `<levelId>`              | `--members` (JSON array)                                                        | `{updated:true}`        |
| `remove-level-member`  | `<schemeId>` `<levelId>` `<memberId>` | —                                                                               | `{deleted:true}`        |
| `list-levels`          | —                                     | `--id`, `--scheme-id`, `--only-default`, pagination                             | PageBean                |
| `set-default-levels`   | —                                     | `--default-values` (JSON array of `{defaultLevelId, issueSecuritySchemeId}`)    | `{updated:true}`        |
| `list-level-members`   | —                                     | `--id`, `--scheme-id`, `--level-id`, `--expand`, pagination                     | PageBean                |
| `list-projects`        | —                                     | `--issue-security-scheme-id`, `--project-ids`, pagination                       | PageBean                |
| `associate-to-project` | —                                     | `--project-id` (req), `--scheme-id` (req), `--old-to-new-mappings` (JSON array) | `{updated:true}`        |
| `search`               | —                                     | `--id`, `--project-ids`, pagination                                             | PageBean                |

- `get-all` takes no parameters (returns all schemes; spec-level filters `--id`, `--project-ids`, `--only-default`, `--expand` are not yet wired in the client — use `search` for filtered results).

```sh
# List all schemes
atlas jira issuesecurityschemes get-all

# CRUD
atlas jira issuesecurityschemes create --name "My Security Scheme" --description "Description"
atlas jira issuesecurityschemes get 10001
atlas jira issuesecurityschemes update 10001 --name "Renamed Scheme"
atlas jira issuesecurityschemes delete 10001

# Members of a scheme (paginated)
atlas jira issuesecurityschemes list-members 10001
atlas jira issuesecurityschemes list-members 10001 --issue-security-level-id 10100,10101

# Manage levels
atlas jira issuesecurityschemes add-levels 10001 --levels '[{"name":"Public","isDefault":true}]'
atlas jira issuesecurityschemes remove-level 10001 10100
atlas jira issuesecurityschemes remove-level 10001 10100 --replace-with 10101
atlas jira issuesecurityschemes update-level 10001 10100 --name "Renamed Level"

# Manage level members
atlas jira issuesecurityschemes add-level-members 10001 10100 --members '[{"type":"reporter"}]'
atlas jira issuesecurityschemes remove-level-member 10001 10100 10200

# List security levels (paginated)
atlas jira issuesecurityschemes list-levels
atlas jira issuesecurityschemes list-levels --scheme-id 10001,10002 --only-default

# Set default levels
atlas jira issuesecurityschemes set-default-levels --default-values '[{"issueSecuritySchemeId":"10001","defaultLevelId":"10100"}]'

# List level members (paginated)
atlas jira issuesecurityschemes list-level-members
atlas jira issuesecurityschemes list-level-members --scheme-id 10001 --level-id 10100

# Project-to-scheme mappings (paginated)
atlas jira issuesecurityschemes list-projects
atlas jira issuesecurityschemes list-projects --issue-security-scheme-id 10001 --project-ids 10100

# Associate scheme to project
atlas jira issuesecurityschemes associate-to-project --project-id 10100 --scheme-id 10001
atlas jira issuesecurityschemes associate-to-project --project-id 10100 --scheme-id 10001 --old-to-new-mappings '[{"oldLevelId":"10100","newLevelId":"10101"}]'

# Search schemes (paginated)
atlas jira issuesecurityschemes search
atlas jira issuesecurityschemes search --id 10001,10002 --project-ids 10100
```

## `screens`

Screen management (B746–B761). Covers the `/rest/api/3/screens` surface: CRUD, tab and field management, field reordering.

| Action                  | Positional                     | Required flags                            | Optional flags                                                                    |
| ----------------------- | ------------------------------ | ----------------------------------------- | --------------------------------------------------------------------------------- |
| `list`                  | —                              | —                                         | `--ids`, `--query-string`, `--scope`, `--order-by`, `--start-at`, `--max-results` |
| `create`                | —                              | `--name`                                  | `--description`                                                                   |
| `delete`                | `<screenId>`                   | —                                         | —                                                                                 |
| `update`                | `<screenId>`                   | at least one of `--name`, `--description` | —                                                                                 |
| `list-available-fields` | `<screenId>`                   | —                                         | —                                                                                 |
| `list-tabs`             | `<screenId>`                   | —                                         | `--project-key`                                                                   |
| `create-tab`            | `<screenId>`                   | `--name`                                  | —                                                                                 |
| `delete-tab`            | `<screenId>` `<tabId>`         | —                                         | —                                                                                 |
| `update-tab`            | `<screenId>` `<tabId>`         | `--name`                                  | —                                                                                 |
| `list-tab-fields`       | `<screenId>` `<tabId>`         | —                                         | `--project-key`                                                                   |
| `add-field-to-tab`      | `<screenId>` `<tabId>`         | `--field-id`                              | `--skip-field-association`                                                        |
| `remove-field-from-tab` | `<screenId>` `<tabId>` `<id>`  | —                                         | —                                                                                 |
| `move-field`            | `<screenId>` `<tabId>` `<id>`  | —                                         | `--position` (Earlier\|Later\|First\|Last), `--after`                             |
| `move-tab`              | `<screenId>` `<tabId>` `<pos>` | —                                         | —                                                                                 |
| `add-to-default`        | `<fieldId>`                    | —                                         | —                                                                                 |
| `list-all-tabs`         | —                              | —                                         | `--ids`, `--tab-ids`, `--start-at`, `--max-results`                               |

```sh
# Paginate screens
atlas jira screens list --max-results 50

# Filter by IDs and search string
atlas jira screens list --ids 10001,10002 --query-string Default

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

# List all screen-tab cross-references
atlas jira screens list-all-tabs --ids 10001,10002
```

## `screenscheme`

Screen scheme management (B762–B765). Covers the `/rest/api/3/screenscheme` surface: paginated listing, create, update, and delete. Screen schemes define which screens are used for each issue operation (view, create, edit).

| Action     | Positional         | Required flags               | Optional flags                                                                                     |
| ---------- | ------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `list`     | —                  | —                            | `--ids`, `--query-string`, `--expand`, `--order-by`, `--start-at`, `--max-results`                 |
| `list-all` | —                  | —                            | `--ids`, `--query-string`, `--expand`, `--order-by`, `--max-results`                               |
| `create`   | —                  | `--name`, `--default-screen` | `--description`, `--view-screen`, `--edit-screen`, `--create-screen`                               |
| `update`   | `<screenSchemeId>` | at least one field flag      | `--name`, `--description`, `--default-screen`, `--view-screen`, `--edit-screen`, `--create-screen` |
| `delete`   | `<screenSchemeId>` | —                            | —                                                                                                  |

**`--order-by` values:** `name`, `-name`, `+name`, `id`, `-id`, `+id`

```sh
# List screen schemes
atlas jira screenscheme list

# Filter by IDs
atlas jira screenscheme list --ids 1,2

# Filter by name substring
atlas jira screenscheme list --query-string Default

# Paginate
atlas jira screenscheme list --start-at 0 --max-results 50

# Create a screen scheme (default screen is required)
atlas jira screenscheme create --name "My Scheme" --default-screen 10001

# Create with all screen types
atlas jira screenscheme create --name "Full Scheme" --default-screen 10001 --create-screen 10002 --view-screen 10003 --edit-screen 10004

# Update name
atlas jira screenscheme update 1 --name "Renamed Scheme"

# Update description
atlas jira screenscheme update 1 --description "Updated description"

# Delete a screen scheme
atlas jira screenscheme delete 1
```

## `workflows`

Classic workflow management — `/rest/api/3/workflow` (B837–B845 + B934 archived as already-covered), bulk workflow API — `/rest/api/3/workflows` (B846–B850, B851–B854), and transition property management (B935–B938, deprecated).

**Pagination:** `list` is offset-paginated (`--start-at`, `--max-results`). The usage actions (`issue-type-usages`, `project-usages`, `workflow-scheme-usages`) use cursor pagination (`--next-page-token`, `--max-results`). `get-rule-config` and `search` (B852) are offset-paginated (`--start-at`, `--max-results`, max 50 per page for rule-config).

**Note:** `GET /rest/api/3/workflow/search` (B934) is implemented as `list` and was already present before this PR.

**Required body endpoints (`--body` JSON):** `bulk-get`, `bulk-create`, `validate-create`, `preview`, `update`, `validate-update`. See [payload-rules.md](payload-rules.md) for JSON-flag tips.

**Schema note:** `WorkflowReadResponse` (bulk-get response) and `WorkflowCreateResponse` (bulk-create response) share the same field names (`workflows`, `statuses`) but are distinct spec schema types. `WorkflowCreateValidateRequest` requires a `payload` field wrapping the `WorkflowCreateRequest`.

**History note:** Stored workflow data expires after 60 days; no data before October 30, 2025 is available.

**Connect/Forge apps only:** `get-rule-config`, `update-rule-config`, and `delete-rule-config` are restricted to Connect or Forge apps (403 if called from basic/bearer auth directly).

**Deprecated:** B935–B938 (`*-transition-property` actions) target endpoints scheduled for removal June 1, 2026. Use Bulk update workflows instead.

### Actions

| Action                       | Positional args        | Key options                                                                                                                  |
| ---------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `list`                       | —                      | `--start-at`, `--max-results`, `--expand`, `--query-string`, `--order-by`, `--is-active`                                     |
| `get`                        | `workflowName`         | —                                                                                                                            |
| `delete`                     | `entityId`             | —                                                                                                                            |
| `issue-type-usages`          | `workflowId projectId` | `--next-page-token`, `--max-results`                                                                                         |
| `project-usages`             | `workflowId`           | `--next-page-token`, `--max-results`                                                                                         |
| `workflow-scheme-usages`     | `workflowId`           | `--next-page-token`, `--max-results`                                                                                         |
| `bulk-get`                   | —                      | `--body` (required, JSON `WorkflowReadRequest`)                                                                              |
| `capabilities`               | —                      | `--workflow-id`, `--project-id`, `--issue-type-id`                                                                           |
| `bulk-create`                | —                      | `--body` (required, JSON `WorkflowCreateRequest`)                                                                            |
| `validate-create`            | —                      | `--body` (required, JSON `WorkflowCreateValidateRequest`)                                                                    |
| `default-editor`             | —                      | —                                                                                                                            |
| `read-history`               | —                      | `--workflow-id` (required), `--version-number`                                                                               |
| `list-history`               | —                      | `--workflow-id` (required), `--expand`                                                                                       |
| `get-rule-config`            | —                      | `--types` (required, CSV), `--start-at`, `--max-results`, `--keys`, `--workflow-names`, `--with-tags`, `--draft`, `--expand` |
| `update-rule-config`         | —                      | `--workflows` (required, JSON array)                                                                                         |
| `delete-rule-config`         | —                      | `--workflows` (required, JSON array)                                                                                         |
| `delete-transition-property` | `transitionId`         | `--key` (req), `--workflow-name` (req), `--workflow-mode`                                                                    |
| `get-transition-properties`  | `transitionId`         | `--workflow-name` (req), `--key`, `--workflow-mode`, `--include-reserved-keys`                                               |
| `create-transition-property` | `transitionId`         | `--key` (req), `--workflow-name` (req), `--value` (req), `--workflow-mode`                                                   |
| `update-transition-property` | `transitionId`         | `--key` (req), `--workflow-name` (req), `--value` (req), `--workflow-mode`                                                   |
| `preview`                    | —                      | `--body` (required: `WorkflowPreviewRequest` JSON)                                                                           |
| `search`                     | —                      | `--start-at`, `--max-results`, `--expand`, `--query-string`, `--order-by`, `--scope`, `--is-active`                          |
| `update`                     | —                      | `--body` (required: `WorkflowUpdateRequest` JSON)                                                                            |
| `validate-update`            | —                      | `--body` (required: `WorkflowUpdateValidateRequest` JSON)                                                                    |

```sh
# List paginated classic workflows — B934
atlas jira workflows list --max-results 50

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

# Get available workflow capabilities — B847
atlas jira workflows capabilities --workflow-id fb759d53-a3a4-45ff-9de4-547c4b638dde
atlas jira workflows capabilities --project-id 10001 --issue-type-id 10000

# Bulk create workflows — B848
atlas jira workflows bulk-create --body '{"scope":{"type":"GLOBAL"},"statuses":[{"name":"To Do","statusCategory":"TODO","statusReference":"f0b24de5-25e7-4fab-ab94-63d81db6c0c0"}],"workflows":[{"name":"My Workflow","statuses":[{"statusReference":"f0b24de5-25e7-4fab-ab94-63d81db6c0c0"}],"transitions":[{"id":"1","name":"Create","type":"INITIAL","toStatusReference":"f0b24de5-25e7-4fab-ab94-63d81db6c0c0"}]}]}'

# Validate bulk create payload — B849
atlas jira workflows validate-create --body '{"payload":{"scope":{"type":"GLOBAL"},"statuses":[],"workflows":[]},"validationOptions":{"levels":["ERROR","WARNING"]}}'

# Get the user's default workflow editor — B850
atlas jira workflows default-editor

# Read a specific workflow version from history — B841
atlas jira workflows read-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c --version-number 4

# List all history entries for a workflow — B842
atlas jira workflows list-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c
atlas jira workflows list-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c --expand includeIntermediateWorkflows

# Get transition rule configurations (Connect/Forge apps) — B843
atlas jira workflows get-rule-config --types postfunction,condition
atlas jira workflows get-rule-config --types postfunction --workflow-names "My Workflow" --max-results 10

# Update transition rule configurations (Connect/Forge apps) — B844
atlas jira workflows update-rule-config --workflows '[{"workflowId":{"name":"My Workflow"},"postFunctions":[{"id":"rule-id","configuration":{"value":"{}"}}]}]'

# Delete transition rule configurations (Connect apps only) — B845
atlas jira workflows delete-rule-config --workflows '[{"workflowId":{"name":"My Workflow"},"workflowRuleIds":["rule-id"]}]'

# Get transition properties — B936 (deprecated)
atlas jira workflows get-transition-properties 10000 --workflow-name "My Workflow"
atlas jira workflows get-transition-properties 10000 --workflow-name "My Workflow" --key jira.permission --workflow-mode live

# Delete a transition property — B935 (deprecated)
atlas jira workflows delete-transition-property 10000 --workflow-name "My Workflow" --key jira.permission

# Create a transition property — B937 (deprecated)
atlas jira workflows create-transition-property 10000 --workflow-name "My Workflow" --key jira.permission --value createissue

# Update a transition property — B938 (deprecated)
atlas jira workflows update-transition-property 10000 --workflow-name "My Workflow" --key jira.permission --value editissue

# Preview workflows for a project — B851
atlas jira workflows preview --body '{"projectId":"10001","workflowIds":["3215e5cd-f09f-4c8a-921b-dca92bd1e9aa"]}'

# Search workflows (offset-paginated) — B852
atlas jira workflows search --query-string "Default" --is-active true
atlas jira workflows search --start-at 0 --max-results 25 --scope GLOBAL

# Bulk update workflows — B853
atlas jira workflows update --body '{"workflows":[{"id":"3215e5cd-f09f-4c8a-921b-dca92bd1e9aa","description":"Updated"}]}'

# Validate a workflow update payload — B854
atlas jira workflows validate-update --body '{"payload":{"workflows":[{"id":"3215e5cd-f09f-4c8a-921b-dca92bd1e9aa","description":"Updated"}]}}'
```

## `workflowscheme`

Workflow scheme management — full coverage of `/rest/api/3/workflowscheme` (B855–B889). Live half covers listing/CRUD, default-workflow mappings, issue-type mappings, workflow mappings, project usages, and project association/switch. Draft half covers the draft lifecycle (create/get/update/delete/publish), draft default workflow, draft issue-type and workflow mappings. Bulk half covers read, update, and required-mappings.

**Pagination:** `list` is offset-paginated (`--start-at`, `--max-results`). Pass `--all` to drain every page via the `listAll` async generator. `project-usages` uses cursor pagination (`--next-page-token`, `--max-results`).

**Required body endpoints (`--body` JSON):** `create`, `update`, `set-default`, `set-issuetype`, `set-workflow`, `assign-project`, `switch-project`, `update-draft`, `set-draft-default`, `set-draft-issuetype`, `set-draft-workflow`, `bulk-update`, `bulk-mappings`. Optional body: `publish-draft`, `bulk-read`. See [payload-rules.md](payload-rules.md) for JSON-flag tips.

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
atlas jira workflowscheme get 10001
atlas jira workflowscheme get 10001 --return-draft-if-exists
atlas jira workflowscheme update 10001 --body '{"name":"Renamed","updateDraftIfNeeded":true}'
atlas jira workflowscheme delete 10001

# Default workflow
atlas jira workflowscheme get-default 10001
atlas jira workflowscheme set-default 10001 --body '{"workflow":"jira"}'
atlas jira workflowscheme delete-default 10001 --update-draft-if-needed

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

# Project associations
atlas jira workflowscheme list-by-project --project-id 10010,10020
atlas jira workflowscheme assign-project --body '{"projectId":"10010","workflowSchemeId":"10001"}'
atlas jira workflowscheme switch-project --body '{"projectId":"10010","targetSchemeId":"10002"}'
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
```

## `fields`

Custom field CRUD, field context management, and field admin/association operations.

Covers: B411 (field list-all), B414 (field project associations), B415–B418 (field contexts), B421–B426 (field context options), B419–B420 (context issue-type membership), B429 (context issue-type mappings), B432 (screens for field), B442–B445 (trash/restore/associate), B446 (field search paginated), B447 (trashed fields), B905–B906 (context default values), field list/create/update/delete.

### Fields (CRUD)

```sh
# List all fields (flat array)
atlas jira fields field-list-all

# List custom fields (paginated)
atlas jira fields field-list --start-at 0 --max-results 50

# Create a custom field
atlas jira fields field-create --body '{"name":"Sprint Story Points","type":"com.atlassian.jira.plugin.system.customfieldtypes:float"}'

# Update a custom field (returns no body — 204 No Content)
atlas jira fields field-update customfield_10001 --body '{"name":"Renamed Field","description":"Updated description"}'

# Delete a custom field
atlas jira fields field-delete customfield_10001
```

- `field-update` returns **no body** (the spec responds 204 No Content); the SDK `update()` resolves to `void`.

### Field Contexts (B415–B418)

```sh
# List contexts for a custom field (B415)
atlas jira fields context-list --field-id customfield_10001

# Filter contexts by type (tri-state filters — pass true|false; omit to not filter on that dimension)
atlas jira fields context-list --field-id customfield_10001 --is-global-context true --is-any-issue-type true

# Filter by specific context IDs (comma-separated)
atlas jira fields context-list --field-id customfield_10001 --context-id 10025,10026

# Create a context (global, all issue types) (B416)
atlas jira fields context-create --field-id customfield_10001 --name 'Bug fields context' --description 'Context for bugs'

# Create a context scoped to projects and issue types (B416)
atlas jira fields context-create --field-id customfield_10001 --name 'Scoped context' --project-ids '10010,10011' --issue-type-ids '10000'

# Update a context name/description (B418)
atlas jira fields context-update --field-id customfield_10001 --context-id 10025 --name 'Renamed context' --description 'New description'

# Delete a context (B417)
atlas jira fields context-delete --field-id customfield_10001 --context-id 10025
```

### Field Context Options (B421–B426)

```sh
# List options for a field context (B421)
atlas jira fields context-option-list --field-id customfield_10001 --context-id 10025

# List options with pagination and filters (B421)
atlas jira fields context-option-list --field-id customfield_10001 --context-id 10025 --start-at 0 --max-results 50 --only-options

# Bulk-create options in a context (B422)
atlas jira fields context-option-create --field-id customfield_10001 --context-id 10025 --body '{"options":[{"value":"New York"},{"value":"Boston","disabled":false}]}'

# Bulk-update options in a context (B423)
atlas jira fields context-option-update --field-id customfield_10001 --context-id 10025 --body '{"options":[{"id":"10001","value":"New York Renamed","disabled":false}]}'

# Delete a single option from a context (B424)
atlas jira fields context-option-delete --field-id customfield_10001 --context-id 10025 --option-id 10001

# Replace an option on issues — starts async task (B425)
atlas jira fields context-option-replace-issues --field-id customfield_10001 --context-id 10025 --option-id 10001 --replace-with 10003 --jql project=PROJ

# Reorder options to first position (B426)
atlas jira fields context-option-move --field-id customfield_10001 --context-id 10025 --option-ids 10001,10002 --position First

# Reorder options after a specific option (B426)
atlas jira fields context-option-move --field-id customfield_10001 --context-id 10025 --option-ids 10001 --after 10005
```

### Field context issue-type mappings

Manage which issue types are associated with a custom field context (B419–B420, B429).

```sh
# Add issue types to a context (B419) — PUT 204
atlas jira fields context-issuetype-set --field-id customfield_10001 --context-id 10025 --issue-type-ids 10001,10005,10006

# Remove issue types from a context (B420) — POST 204
atlas jira fields context-issuetype-remove --field-id customfield_10001 --context-id 10025 --issue-type-ids 10001,10005

# List issue-type-to-context mappings for a field (B429) — paginated
atlas jira fields context-issuetype-mapping --field-id customfield_10001

# Filter mappings by specific contexts (B429)
atlas jira fields context-issuetype-mapping --field-id customfield_10001 --context-id 10025,10026 --start-at 0 --max-results 50
```

### Field context default values

Get and set default values for custom field contexts (B905–B906).

**Note:** Both endpoints are deprecated (CHANGE-3082) and will be removed in October 2026.

Default values are polymorphic — each entry is discriminated by a `type` field. Common types:

- `option.single` — single-select/radio: requires `optionId`
- `option.multiple` — multi-select/checkbox: requires `optionIds[]`
- `option.cascading` — cascading select: requires `optionId` + optional `cascadingOptionId`
- `forge.string` — Forge string field: optional `text`
- `forge.user` — Forge user field: requires `accountId` + `userFilter`
- `float` — number field: requires `number`
- `datepicker` — date field: optional `date`, `useCurrent`
- `url` — URL field: requires `url`

```sh
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

# Bulk lookup: find which context applies to each project+issueType pair (B430)
# Body is a JSON array of {projectId, issueTypeId} objects
atlas jira fields context-mapping --field-id customfield_10001 --mappings-json '[{"projectId":"10000","issueTypeId":"10000"},{"projectId":"10000","issueTypeId":"10001"}]'
```

### Field key option management (Connect-app-managed)

Manage options on Connect-app select list fields via `fieldKey` (B433–B440). These endpoints only work for options added by Connect apps, not options created in Jira directly.

```sh
# List all options for a field (B433) — GET paginated
atlas jira fields field-option-list --field-key example-add-on__team-field
atlas jira fields field-option-list --field-key example-add-on__team-field --start-at 0 --max-results 50

# Create an option for a field (B434) — POST
atlas jira fields field-option-create --field-key example-add-on__team-field --body '{"value":"Team 1","properties":{"members":42}}'

# Delete an option from a field (B435) — DELETE 204
atlas jira fields field-option-delete --field-key example-add-on__team-field --option-id 1

# Get a single option (B436) — GET
atlas jira fields field-option-get --field-key example-add-on__team-field --option-id 1

# Update (or create) an option — id in body must match --option-id (B437) — PUT
atlas jira fields field-option-update --field-key example-add-on__team-field --option-id 1 --body '{"id":1,"value":"Team 1 Updated"}'

# Deselect an option from all matching issues (async task) — returns task progress (B438) — DELETE 303
atlas jira fields field-option-replace-issues --field-key example-add-on__team-field --option-id 1 --replace-with 3 --jql 'project=PROJ'

# Get selectable options for a field (edit suggestions) (B439) — GET paginated
atlas jira fields field-option-suggestions-edit --field-key example-add-on__team-field
atlas jira fields field-option-suggestions-edit --field-key example-add-on__team-field --project-id 10001 --start-at 0 --max-results 50

# Get visible options for a field (search/view suggestions) (B440) — GET paginated
atlas jira fields field-option-suggestions-search --field-key example-add-on__team-field
atlas jira fields field-option-suggestions-search --field-key example-add-on__team-field --project-id 10001 --start-at 0 --max-results 50
```

### Field admin and association (B414, B432, B442–B445, B447)

Trash/restore custom fields, manage field-to-project associations, list screens a field appears on, and list trashed fields.

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

# List trashed custom fields (B447) — GET paginated
atlas jira fields field-trash-list
atlas jira fields field-trash-list --query approvers --max-results 50
atlas jira fields field-trash-list --id customfield_10000,customfield_10001 --order-by trashDate
```

### Field search paginated (B411 + B446)

`field-list-all` returns the flat array from `GET /field` (B411). `field-list` returns the paginated search from `GET /field/search` (B446), supporting filtering by type, id, query, orderBy, expand, and projectIds.

```sh
# List all fields (flat, not paginated) — B411
atlas jira fields field-list-all

# Search fields (paginated) — B446
atlas jira fields field-list --max-results 50
atlas jira fields field-list --type custom --query approvers
atlas jira fields field-list --order-by screensCount --expand screensCount,contextsCount
```
