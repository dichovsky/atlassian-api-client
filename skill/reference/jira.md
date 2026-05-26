# Jira reference — `atlas jira`

Jira Cloud Platform REST API v3 surface. Load this file when you need a flag or action the canonical examples in `SKILL.md` don't cover.

## Resource × action matrix

| Resource                 | Actions                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `issues`                 | `get`, `create`, `update`, `delete`, `transition`, `transitions`, `get-agile`, `get-estimation`, `set-estimation`, `rank`                                                                                                                                                                                                                                                                                                |
| `projects`               | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `search`                 | (no sub-action; uses `--jql`)                                                                                                                                                                                                                                                                                                                                                                                            |
| `users`                  | `get`, `me`, `search`                                                                                                                                                                                                                                                                                                                                                                                                    |
| `issue-types`            | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `priorities`             | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `statuses`               | `list`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `boards`                 | `list`, `get`, `create`, `delete`, `backlog`, `configuration`, `list-epics`, `epic-issues`, `issues-without-epic`, `get-features`, `toggle-feature`, `get-issues`, `move-issues`, `list-projects`, `list-projects-full`, `list-sprints`, `list-versions`, `sprint-issues`, `list-by-filter`, `list-properties`, `delete-property`, `get-property`, `set-property`, `list-quickfilters`, `get-quickfilter`, `get-reports` |
| `sprints`                | `get`, `create`, `update`, `delete`, `get-issues`, `partial-update`, `move-issues`, `list-properties`, `get-property`, `set-property`, `delete-property`, `swap`                                                                                                                                                                                                                                                         |
| `epic`                   | `get`, `update`, `issues`, `move-issues`, `rank`, `issues-none`, `remove-issues`                                                                                                                                                                                                                                                                                                                                         |
| `backlog`                | `move`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `announcement-banner`    | `get`, `update`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `application-properties` | `list`, `set`, `list-advanced-settings`                                                                                                                                                                                                                                                                                                                                                                                  |
| `application-role`       | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `configuration`          | `get`, `get-timetracking`, `select-timetracking`, `list-timetracking-providers`, `get-timetracking-options`, `update-timetracking-options`                                                                                                                                                                                                                                                                               |
| `data-policy`            | `get-workspace`, `list-projects`                                                                                                                                                                                                                                                                                                                                                                                         |
| `webhooks`               | `list-failed`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `status`                 | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `status-category`        | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `server-info`            | `get`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `instance`               | `get-license`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `mypermissions`          | `get`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `auditing`               | `list`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `events`                 | `list`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `changelog`              | `bulk-fetch`                                                                                                                                                                                                                                                                                                                                                                                                             |
| `forge`                  | `bulk-panel-action`                                                                                                                                                                                                                                                                                                                                                                                                      |
| `incidents`              | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `post-incident-reviews`  | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `vulnerability`          | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `devopscomponents`       | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `groups`                 | `picker`, `get`, `create`, `delete`, `list-bulk`, `list-members`, `add-user`, `remove-user`                                                                                                                                                                                                                                                                                                                              |
| `group-user-picker`      | `pick`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `security-level`         | `get`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `license`                | `get-approximate-count`, `get-approximate-count-for-product`                                                                                                                                                                                                                                                                                                                                                             |
| `settings`               | `get-columns`, `set-columns`                                                                                                                                                                                                                                                                                                                                                                                             |
| `redact`                 | `start`, `get-status`                                                                                                                                                                                                                                                                                                                                                                                                    |
| `flag`                   | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `task`                   | `get`, `cancel`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `avatar`                 | `list-system`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `custom-field-option`    | `get`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `classification-levels`  | `list`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `latest`                 | `bulk-worklog`                                                                                                                                                                                                                                                                                                                                                                                                           |
| `remote-link`            | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `service-registry`       | `get`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `exists-by-properties`   | `get`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `app`                    | `get-field-context-configuration`, `update-field-context-configuration`, `update-field-value`, `list-field-context-configurations`, `bulk-update-field-value`, `get-dynamic-modules`, `register-dynamic-modules`, `delete-dynamic-modules`, `list-forge-properties`, `get-forge-property`, `set-forge-property`, `delete-forge-property`                                                                                 |
| `dashboards`             | `list`, `get`, `create`, `update`, `delete`, `list-gadgets`, `add-gadget`, `update-gadget`, `remove-gadget`, `list-item-properties`, `get-item-property`, `set-item-property`, `delete-item-property`, `copy`, `bulk-edit`, `list-available-gadgets`, `search`, `search-all`                                                                                                                                             |
| `issue-attachments`      | `list`, `get`, `delete`, `expand-human`, `expand-raw`, `download-content`, `get-meta`, `download-thumbnail`, `upload`                                                                                                                                                                                                                                                                                                    |
| `component`              | `list`, `create`, `get`, `update`, `delete`, `related-issue-counts`                                                                                                                                                                                                                                                                                                                                                      |
| `filters`                | `search`, `get`, `create`, `update`, `delete`, `list-favourites`, `list-my`, `add-favourite`, `remove-favourite`, `change-owner`, `get-columns`, `set-columns`, `reset-columns`, `list-permissions`, `add-permission`, `get-permission`, `delete-permission`, `get-default-share-scope`, `set-default-share-scope`                                                                                                       |
| `permission-schemes`     | `list`, `get`, `create`, `update`, `delete`, `list-permissions`, `create-permission`, `get-permission`, `delete-permission`                                                                                                                                                                                                                                                                                              |

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

## `dashboards`

`list`, `get`, `create`, `update`, `delete` cover `/rest/api/3/dashboard` plus `listAll()` generator pagination over `GET /dashboard`. The actions below add the platform's full dashboard surface (B391–B405).

| Action                   | Positional                             | Required flags                   | Optional flags                                                                                                                                                   |
| ------------------------ | -------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list-gadgets`           | `<dashboardId>`                        | —                                | —                                                                                                                                                                |
| `add-gadget`             | `<dashboardId>`                        | —                                | `--module-key`, `--uri`, `--color`, `--row` + `--column`, `--title`, `--ignore-uri-and-module-key-validation`                                                    |
| `update-gadget`          | `<dashboardId> <gadgetId>`             | —                                | `--title`, `--color`, `--row` + `--column`                                                                                                                       |
| `remove-gadget`          | `<dashboardId> <gadgetId>`             | —                                | —                                                                                                                                                                |
| `list-item-properties`   | `<dashboardId> <itemId>`               | —                                | —                                                                                                                                                                |
| `get-item-property`      | `<dashboardId> <itemId> <propertyKey>` | —                                | —                                                                                                                                                                |
| `set-item-property`      | `<dashboardId> <itemId> <propertyKey>` | `--value` (JSON)                 | —                                                                                                                                                                |
| `delete-item-property`   | `<dashboardId> <itemId> <propertyKey>` | —                                | —                                                                                                                                                                |
| `copy`                   | `<dashboardId>`                        | —                                | `--name`, `--description`, `--share-permissions` (JSON), `--edit-permissions` (JSON)                                                                             |
| `bulk-edit`              | —                                      | `--entity-ids` (csv), `--action` | `--new-owner`, `--autofix-name`, `--extend-admin-permissions`, `--share-permissions`, `--edit-permissions`                                                       |
| `list-available-gadgets` | —                                      | —                                | `--module-keys` (csv), `--uris` (csv), `--gadget-ids` (csv), `--dashboard-ids` (csv)                                                                             |
| `search`                 | —                                      | —                                | `--dashboard-name`, `--account-id`, `--owner`, `--group-name`, `--group-id`, `--project-id`, `--order-by`, `--status`, `--start-at`, `--max-results`, `--expand` |
| `search-all`             | —                                      | —                                | (same as `search` minus `--start-at`) plus `--max-pages`                                                                                                         |

- `--row` and `--column` must be supplied together (gadget position).
- `--action` for `bulk-edit` is one of: `changeOwner`, `changePermission`, `addPermission`, `removePermission`, `changePermissionAndAddPermission`, `delete`.
- `--order-by` for `search` accepts `description`, `favorite_count`, `id`, `is_favorite`, `name`, `owner` (each may be prefixed with `+` or `-`).
- `--status` for `search` is one of: `active`, `archived`, `deleted`.
- `--share-permissions` / `--edit-permissions` are **JSON arrays** of share-permission objects: `[{"type":"global"}]`, `[{"type":"user","user":{"accountId":"..."}}]`, etc.
- `set-item-property` `--value` is parsed as JSON (strings must be quoted: `--value '"hello"'`).
- `search-all` collects every result into a single array; `--max-pages` (default 10 000) caps iteration on misbehaving servers.

```sh
# Search for dashboards by name
atlas jira dashboards search --dashboard-name "Sprint" --order-by -favorite_count --max-results 25

# List gadgets on a dashboard
atlas jira dashboards list-gadgets 10001

# Add a gadget at row 1, column 1
atlas jira dashboards add-gadget 10001 --module-key com.atlassian.jira.gadgets:filter-results-gadget --row 1 --column 1 --title "My Gadget"

# Rename a gadget
atlas jira dashboards update-gadget 10001 5 --title "Renamed"

# Remove a gadget
atlas jira dashboards remove-gadget 10001 5

# Manage dashboard item properties
atlas jira dashboards list-item-properties 10001 itm-1
atlas jira dashboards get-item-property 10001 itm-1 my-key
atlas jira dashboards set-item-property 10001 itm-1 my-key --value '{"enabled":true}'
atlas jira dashboards delete-item-property 10001 itm-1 my-key

# Copy a dashboard with new metadata
atlas jira dashboards copy 10001 --name "Copy of Sprint" --share-permissions '[{"type":"global"}]'

# Bulk-delete dashboards
atlas jira dashboards bulk-edit --entity-ids 10001,10002 --action delete

# Bulk transfer ownership
atlas jira dashboards bulk-edit --entity-ids 10001 --action changeOwner --new-owner acc-1 --autofix-name

# List gadget catalogue
atlas jira dashboards list-available-gadgets --module-keys com.x:a,com.x:b
```

| `bulk` | `delete-issues`, `get-fields`, `edit-fields`, `move-issues`, `get-transitions`, `transition-issues`, `unwatch-issues`, `watch-issues`, `get-status`, `submit-builds`, `submit-deployments`, `submit-devinfo`, `submit-devops-components`, `submit-feature-flags`, `submit-operations`, `submit-remote-links`, `submit-security` |

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

## `component`

Jira project components — flat `/rest/api/3/component` surface (B361–B366).

| Action                 | Positional      | Required flags                                                                                        | Optional flags                                                                                                                       |
| ---------------------- | --------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `list`                 | —               | —                                                                                                     | `--project-ids-or-keys`, `--start-at`, `--max-results`, `--order-by`, `--query`                                                      |
| `create`               | —               | `--name`                                                                                              | `--description`, `--lead-account-id`, `--lead-user-name`, `--assignee-type`, `--is-assignee-type-valid`, `--project`, `--project-id` |
| `get`                  | `<componentId>` | —                                                                                                     | —                                                                                                                                    |
| `update`               | `<componentId>` | at least one of `--name`, `--description`, `--lead-account-id`, `--lead-user-name`, `--assignee-type` | —                                                                                                                                    |
| `delete`               | `<componentId>` | —                                                                                                     | `--move-issues-to`                                                                                                                   |
| `related-issue-counts` | `<componentId>` | —                                                                                                     | —                                                                                                                                    |

- `--project-ids-or-keys` is comma-separated (e.g. `--project-ids-or-keys HSP,PROJ`).
- `--assignee-type` must be one of: `PROJECT_DEFAULT`, `COMPONENT_LEAD`, `PROJECT_LEAD`, `UNASSIGNED`.
- `--lead-user-name` is deprecated by Atlassian — prefer `--lead-account-id`.
- `create` requires either `--project` (project key) or `--project-id` (numeric id) for the component owner.
- `delete --move-issues-to <id>` reassigns issues currently using the deleted component to another component instead of leaving them component-less.

```sh
# List all components across two projects, paginated
atlas jira component list --project-ids-or-keys HSP,PROJ --max-results 25

# Create a component owned by project HSP
atlas jira component create --name "Auth" --project HSP --lead-account-id 5b10a2844c20165700ede21g --assignee-type PROJECT_LEAD

# Get a single component
atlas jira component get 10000

# Rename a component
atlas jira component update 10000 --name "Authentication"

# Delete a component and reassign its issues to another component
atlas jira component delete 10000 --move-issues-to 10001

# Get the open-issue count for a component
atlas jira component related-issue-counts 10000
```

## `application-properties`

Global key/value settings exposed under `/rest/api/3/application-properties` (B331–B333).

| Action                   | Positional | Required flags | Optional flags                                |
| ------------------------ | ---------- | -------------- | --------------------------------------------- |
| `list`                   | `[key]`    | —              | `--key`, `--permission-level`, `--key-filter` |
| `set`                    | `<id>`     | `--value`      | —                                             |
| `list-advanced-settings` | —          | —              | —                                             |

- `list` returns an array even when filtered to a single property; passing a positional `<key>` is equivalent to `--key <key>`.
- `--permission-level` accepts the server-defined permission tier string (passed through unchanged so the server can evolve the enum). Typical values include `SYSADMIN`.
- `--key-filter` is a regex applied server-side to property keys.
- `set` updates the value of a single property; the server returns the updated property record.
- `list-advanced-settings` returns the administrator-only subset (matches the Jira admin "advanced settings" sub-page).

```sh
# Get a single property by key
atlas jira application-properties list --key jira.home

# Filter by regex
atlas jira application-properties list --key-filter "^jira\\.title$"

# Filter by permission level
atlas jira application-properties list --permission-level SYSADMIN

# Update a property value
atlas jira application-properties set jira.title --value "My Jira"

# List admin-only advanced settings
atlas jira application-properties list-advanced-settings
```

## `configuration`

Global Jira instance configuration and time-tracking settings under `/rest/api/3/configuration` (B382–B387).

| Action                        | Positional | Required flags | Optional flags                                                                          |
| ----------------------------- | ---------- | -------------- | --------------------------------------------------------------------------------------- |
| `get`                         | —          | —              | —                                                                                       |
| `get-timetracking`            | —          | —              | —                                                                                       |
| `select-timetracking`         | —          | `--key`        | `--name`, `--url`                                                                       |
| `list-timetracking-providers` | —          | —              | —                                                                                       |
| `get-timetracking-options`    | —          | —              | —                                                                                       |
| `update-timetracking-options` | —          | —              | `--working-hours-per-day`, `--working-days-per-week`, `--time-format`, `--default-unit` |

- `get` returns the instance-level feature flags (voting, watching, sub-tasks, time tracking, attachments, issue linking) and the embedded `timeTrackingConfiguration` when time tracking is enabled.
- `get-timetracking` returns the currently selected provider; `list-timetracking-providers` returns every installed provider. The built-in provider key is `JIRA`.
- `select-timetracking --key <key>` switches the active provider; `--name` and `--url` may be supplied for third-party providers that require them.
- `--time-format` accepts: `pretty`, `days`, `hours`.
- `--default-unit` accepts: `minute`, `hour`, `day`, `week`.
- `update-timetracking-options` requires at least one of the four optional flags; the server returns the resulting `TimeTrackingConfiguration`.

```sh
# Global instance configuration (feature flags + time tracking)
atlas jira configuration get

# Inspect the currently selected time-tracking provider
atlas jira configuration get-timetracking

# Select the built-in provider
atlas jira configuration select-timetracking --key JIRA

# List every installed time-tracking provider
atlas jira configuration list-timetracking-providers

# Current display/calculation options
atlas jira configuration get-timetracking-options

# Set the working day to 8 hours with the pretty time format
atlas jira configuration update-timetracking-options --working-hours-per-day 8 --time-format pretty

# Update working week and default unit
atlas jira configuration update-timetracking-options --working-days-per-week 5 --default-unit hour
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

| Action         | Positional | Required flags | Optional flags                                                                                      |
| -------------- | ---------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `picker`       | —          | —              | `--query`, `--exclude`, `--max-results`, `--exclude-inactive`, `--user-name`                        |
| `get`          | —          | —              | `--group-name`, `--group-id`, `--expand`                                                            |
| `create`       | —          | `--name`       | —                                                                                                   |
| `delete`       | —          | —              | `--group-name`, `--group-id`, `--swap-group`, `--swap-group-id`                                     |
| `list-bulk`    | —          | —              | `--start-at`, `--max-results`, `--group-ids`, `--group-names`, `--access-type`, `--application-key` |
| `list-members` | —          | —              | `--group-name`, `--group-id`, `--include-inactive-users`, `--start-at`, `--max-results`             |
| `add-user`     | —          | `--account-id` | `--group-name`, `--group-id`                                                                        |
| `remove-user`  | —          | `--account-id` | `--group-name`, `--group-id`                                                                        |

### `picker`

- `--query` — fuzzy string to match against group names.
- `--exclude` — **comma-separated** list of group IDs to exclude from results.
- `--max-results` — maximum number of groups returned (default 20).
- `--exclude-inactive` — when `true`, inactive groups are omitted.
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

# Find up to 10 groups excluding a specific group
atlas jira groups picker --query dev --max-results 10 --exclude grp-99

# Exclude inactive groups
atlas jira groups picker --exclude-inactive

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

## `dashboards`

`list`, `get`, `create`, `update`, `delete` cover `/rest/api/3/dashboard` plus `listAll()` generator pagination over `GET /dashboard`. The actions below add the platform's full dashboard surface (B391–B405).

| Action                   | Positional                             | Required flags                   | Optional flags                                                                                                                                                   |
| ------------------------ | -------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list-gadgets`           | `<dashboardId>`                        | —                                | —                                                                                                                                                                |
| `add-gadget`             | `<dashboardId>`                        | —                                | `--module-key`, `--uri`, `--color`, `--row` + `--column`, `--title`, `--ignore-uri-and-module-key-validation`                                                    |
| `update-gadget`          | `<dashboardId> <gadgetId>`             | —                                | `--title`, `--color`, `--row` + `--column`                                                                                                                       |
| `remove-gadget`          | `<dashboardId> <gadgetId>`             | —                                | —                                                                                                                                                                |
| `list-item-properties`   | `<dashboardId> <itemId>`               | —                                | —                                                                                                                                                                |
| `get-item-property`      | `<dashboardId> <itemId> <propertyKey>` | —                                | —                                                                                                                                                                |
| `set-item-property`      | `<dashboardId> <itemId> <propertyKey>` | `--value` (JSON)                 | —                                                                                                                                                                |
| `delete-item-property`   | `<dashboardId> <itemId> <propertyKey>` | —                                | —                                                                                                                                                                |
| `copy`                   | `<dashboardId>`                        | —                                | `--name`, `--description`, `--share-permissions` (JSON), `--edit-permissions` (JSON)                                                                             |
| `bulk-edit`              | —                                      | `--entity-ids` (csv), `--action` | `--new-owner`, `--autofix-name`, `--extend-admin-permissions`, `--share-permissions`, `--edit-permissions`                                                       |
| `list-available-gadgets` | —                                      | —                                | `--module-keys` (csv), `--uris` (csv), `--gadget-ids` (csv), `--dashboard-ids` (csv)                                                                             |
| `search`                 | —                                      | —                                | `--dashboard-name`, `--account-id`, `--owner`, `--group-name`, `--group-id`, `--project-id`, `--order-by`, `--status`, `--start-at`, `--max-results`, `--expand` |
| `search-all`             | —                                      | —                                | (same as `search` minus `--start-at`) plus `--max-pages`                                                                                                         |

- `--row` and `--column` must be supplied together (gadget position).
- `--action` for `bulk-edit` is one of: `changeOwner`, `changePermission`, `addPermission`, `removePermission`, `changePermissionAndAddPermission`, `delete`.
- `--order-by` for `search` accepts `description`, `favorite_count`, `id`, `is_favorite`, `name`, `owner` (each may be prefixed with `+` or `-`).
- `--status` for `search` is one of: `active`, `archived`, `deleted`.
- `--share-permissions` / `--edit-permissions` are **JSON arrays** of share-permission objects: `[{"type":"global"}]`, `[{"type":"user","user":{"accountId":"..."}}]`, etc.
- `set-item-property` `--value` is parsed as JSON (strings must be quoted: `--value '"hello"'`).
- `search-all` collects every result into a single array; `--max-pages` (default 10 000) caps iteration on misbehaving servers.

```sh
# Search for dashboards by name
atlas jira dashboards search --dashboard-name "Sprint" --order-by -favorite_count --max-results 25

# List gadgets on a dashboard
atlas jira dashboards list-gadgets 10001

# Add a gadget at row 1, column 1
atlas jira dashboards add-gadget 10001 --module-key com.atlassian.jira.gadgets:filter-results-gadget --row 1 --column 1 --title "My Gadget"

# Rename a gadget
atlas jira dashboards update-gadget 10001 5 --title "Renamed"

# Remove a gadget
atlas jira dashboards remove-gadget 10001 5

# Manage dashboard item properties
atlas jira dashboards list-item-properties 10001 itm-1
atlas jira dashboards get-item-property 10001 itm-1 my-key
atlas jira dashboards set-item-property 10001 itm-1 my-key --value '{"enabled":true}'
atlas jira dashboards delete-item-property 10001 itm-1 my-key

# Copy a dashboard with new metadata
atlas jira dashboards copy 10001 --name "Copy of Sprint" --share-permissions '[{"type":"global"}]'

# Bulk-delete dashboards
atlas jira dashboards bulk-edit --entity-ids 10001,10002 --action delete

# Bulk transfer ownership
atlas jira dashboards bulk-edit --entity-ids 10001 --action changeOwner --new-owner acc-1 --autofix-name

# List gadget catalogue
atlas jira dashboards list-available-gadgets --module-keys com.x:a,com.x:b
```

## `bulk`

Atlassian bulk-operations API and DevOps `POST /bulk` ingest variants. Core
operations (`delete-issues`, `edit-fields`, `move-issues`,
`transition-issues`, `watch-issues`, `unwatch-issues`) return a
`{ taskId }` envelope. Poll progress with `bulk get-status <taskId>` —
the CLI does NOT auto-poll, callers drive the cadence.

**URL bases:**

- Core endpoints: `/rest/api/3/bulk/*`
- DevOps ingest endpoints use their own bases — `builds 0.1`, `deployments 0.1`, `devinfo 0.10`, `devopscomponents 1.0`, `featureflags 0.1`, `operations 1.0`, `remotelinks 1.0`, `security 1.0`.

| Action                     | Positional | Required flags                     | Optional flags                                         |
| -------------------------- | ---------- | ---------------------------------- | ------------------------------------------------------ |
| `delete-issues`            | —          | `--issues`                         | `--send-notification`                                  |
| `get-fields`               | —          | `--issues`                         | `--search-text`, `--ending-before`, `--starting-after` |
| `edit-fields`              | —          | `--issues`, `--actions`, `--value` | `--send-notification`                                  |
| `move-issues`              | —          | `--value`                          | `--send-notification`                                  |
| `get-transitions`          | —          | `--issues`                         | —                                                      |
| `transition-issues`        | —          | `--value`                          | `--send-notification`                                  |
| `unwatch-issues`           | —          | `--issues`                         | —                                                      |
| `watch-issues`             | —          | `--issues`                         | —                                                      |
| `get-status`               | `<taskId>` | —                                  | —                                                      |
| `submit-builds`            | —          | `--value`                          | —                                                      |
| `submit-deployments`       | —          | `--value`                          | —                                                      |
| `submit-devinfo`           | —          | `--value`                          | —                                                      |
| `submit-devops-components` | —          | `--value`                          | —                                                      |
| `submit-feature-flags`     | —          | `--value`                          | —                                                      |
| `submit-operations`        | —          | `--value`                          | —                                                      |
| `submit-remote-links`      | —          | `--value`                          | —                                                      |
| `submit-security`          | —          | `--value`                          | —                                                      |

`--issues` is a comma-separated list of issue IDs or keys; `--actions`
is a comma-separated list of bulk-edit actions. `--value` is a JSON
string: an object for `edit-fields` (`editedFieldsInput`) and
`move-issues` (`targetToSourcesMapping`), an array for
`transition-issues` (`bulkTransitionInputs`), and the raw provider
payload for every DevOps `submit-*` variant.

```sh
# Bulk delete two issues, suppress notifications
atlas jira bulk delete-issues --issues 10001,10002 --send-notification false

# List fields available for bulk edit on two issues
atlas jira bulk get-fields --issues PROJ-1,PROJ-2 --search-text priority

# Bulk edit the priority on a single issue
atlas jira bulk edit-fields \
  --issues 10001 \
  --actions priority \
  --value '{"priority":{"priorityId":"3"}}'

# Bulk move issues to PROJ / issuetype 10001
atlas jira bulk move-issues --value '{"PROJ,10001":{"issueIdsOrKeys":["ISSUE-1"]}}'

# List available transitions for two issues
atlas jira bulk get-transitions --issues EPIC-1,TASK-1

# Bulk transition: two issues to transition 11
atlas jira bulk transition-issues \
  --value '[{"selectedIssueIdsOrKeys":["10001","10002"],"transitionId":"11"}]'

# Bulk watch / unwatch
atlas jira bulk watch-issues --issues 10001,10002
atlas jira bulk unwatch-issues --issues 10001,10002

# Poll a previously submitted task
atlas jira bulk get-status 10641

# DevOps ingest examples (payload shape is provider-specific)
atlas jira bulk submit-builds --value '{"providerMetadata":{"product":"my-ci"},"builds":[]}'
atlas jira bulk submit-deployments --value '{"deployments":[]}'
atlas jira bulk submit-feature-flags --value '{"flags":[]}'
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

# Download the file bytes (CLI prints { bytes: N } — use the SDK for the buffer)
atlas jira issue-attachments download-content 10001
atlas jira issue-attachments download-content 10001 --redirect false

# Instance-level attachment settings
atlas jira issue-attachments get-meta

# Render a 200x200 thumbnail with a placeholder fallback
atlas jira issue-attachments download-thumbnail 10001 \
  --width 200 --height 200 --fallback-to-default true

# Upload a file from disk to an issue
atlas jira issue-attachments upload PROJ-1 --file ./screenshot.png --media-type image/png
```

## `filters`

Saved JQL filters, their owners, share permissions, favourites, and
per-user default share scope.

| Action                    | Positional                  | Required flags         | Optional flags                                                                                 |
| ------------------------- | --------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| `search`                  | —                           | —                      | `--start-at`, `--max-results`, `--expand`, `--ids`, `--order-by`                               |
| `get`                     | `<filterId>`                | —                      | —                                                                                              |
| `create`                  | —                           | `--name`               | `--description`, `--jql`, `--favourite`, `--share-permissions`, `--edit-permissions`           |
| `update`                  | `<filterId>`                | at least one body flag | `--name`, `--description`, `--jql`, `--favourite`, `--share-permissions`, `--edit-permissions` |
| `delete`                  | `<filterId>`                | —                      | —                                                                                              |
| `list-favourites`         | —                           | —                      | `--expand`                                                                                     |
| `list-my`                 | —                           | —                      | `--expand`, `--include-favourites`                                                             |
| `add-favourite`           | `<filterId>`                | —                      | `--expand`                                                                                     |
| `remove-favourite`        | `<filterId>`                | —                      | `--expand`                                                                                     |
| `change-owner`            | `<filterId>`                | `--account-id`         | —                                                                                              |
| `get-columns`             | `<filterId>`                | —                      | —                                                                                              |
| `set-columns`             | `<filterId>`                | `--columns`            | —                                                                                              |
| `reset-columns`           | `<filterId>`                | —                      | —                                                                                              |
| `list-permissions`        | `<filterId>`                | —                      | —                                                                                              |
| `add-permission`          | `<filterId>`                | `--share-type`         | `--project-id`, `--group-name`, `--group-id`, `--role-id`, `--account-id`, `--rights`          |
| `get-permission`          | `<filterId> <permissionId>` | —                      | —                                                                                              |
| `delete-permission`       | `<filterId> <permissionId>` | —                      | —                                                                                              |
| `get-default-share-scope` | —                           | —                      | —                                                                                              |
| `set-default-share-scope` | —                           | `--share-scope`        | —                                                                                              |

- `--share-scope` ∈ `GLOBAL`, `AUTHENTICATED`, `PRIVATE`.
- `--share-type` ∈ `user`, `group`, `project`, `projectRole`, `global`, `loggedin`, `authenticated`. Each kind expects additional flags: `project` → `--project-id`; `projectRole` → `--project-id` + `--role-id`; `group` → `--group-name` or `--group-id`; `user` → `--account-id`.
- `--ids` (on `search`) is a **comma-separated** list of numeric filter IDs.
- `--columns` (on `set-columns`) is a **comma-separated** list of column field keys (e.g. `issuekey,summary,assignee`); the Jira endpoint expects repeated form fields, which the transport handles.
- `--share-permissions` and `--edit-permissions` (on `create`/`update`) are **JSON arrays** of `FilterSharePermission` objects.

```sh
# Search filters
atlas jira filters search --order-by name --max-results 50

# Get a filter by ID
atlas jira filters get 10001

# Mark / unmark favourite
atlas jira filters add-favourite 10001
atlas jira filters remove-favourite 10001

# Reassign filter owner
atlas jira filters change-owner 10001 --account-id 5b10a2844c20165700ede21g

# Replace the filter's saved column configuration
atlas jira filters set-columns 10001 --columns issuekey,summary,assignee,status

# Reset to the system default columns
atlas jira filters reset-columns 10001

# Share with a project role
atlas jira filters add-permission 10001 --share-type projectRole --project-id 10000 --role-id 10100

# List/get/delete a single permission
atlas jira filters list-permissions 10001
atlas jira filters get-permission 10001 20001
atlas jira filters delete-permission 10001 20001

# Default share scope
atlas jira filters get-default-share-scope
atlas jira filters set-default-share-scope --share-scope PRIVATE
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

## Errors specific to Jira

- **401 with a known-good token** usually means the token is API-token (basic auth) but `ATLASSIAN_AUTH_TYPE=bearer` is set, or vice versa.
- **403 on `issues create`** typically means the token lacks "Create Issues" permission in the target project, not a global scope problem.
- **400 with `"errorMessages":["The value 'X' does not exist for the field 'project'."]`** — `--project` needs the project **key** (e.g. `PROJ`), not name or ID.
- **400 with custom-field errors** — the CLI can't set custom fields. Use the SDK with `fields: { customfield_10001: ... }`.
