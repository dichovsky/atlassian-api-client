# Jira — Admin, config, and DevOps surfaces

> Part of the `atlas` Jira skill reference. Resource×action matrix and routing in [`../jira.md`](../jira.md).

## On-premises OAuth proxy routing

Atlassian exposes Development Information, Builds, Deployments, and Feature
Flag ingestion to on-premises integrations using its system-to-system OAuth
proxy. Opt in with
`--software-cloud-id <cloudId>` or `ATLASSIAN_SOFTWARE_CLOUD_ID` and bearer
auth. Bearer auth by itself does not change routing.

- Builds: `https://api.atlassian.com/jira/builds/0.1/cloud/{cloudId}`
- Deployments: `https://api.atlassian.com/jira/deployments/0.1/cloud/{cloudId}`
- Development Information: `https://api.atlassian.com/jira/devinfo/0.1/cloud/{cloudId}` (proxy version `0.1`, site version `0.10`)
- Feature Flag ingestion: `https://api.atlassian.com/jira/featureflags/0.1/cloud/{cloudId}/bulk`

For Builds, Deployments, and Development Information, this affects the
corresponding `bulk`, `bulk-by-properties`, `repository`,
`exists-by-properties`, and `pipelines` actions. It also affects
`bulk submit-feature-flags`. The `pipelines get-deployment-gating-status`
action is the exception: Atlassian does not expose it through the proxy, so it
always uses the tenant `/rest/deployments/0.1` base. Feature Flag `flag` actions
and `bulk-by-properties delete-feature-flags` remain on the tenant
`/rest/featureflags/0.1` base. Other DevOps families remain on their site bases.
Obtain the cloud ID from
`https://your-domain.atlassian.net/_edge/tenant_info`.

## `app`

App-scoped resource grouping three distinct API surfaces used by Forge and Atlassian Connect apps:

- **`/rest/api/3/app/field/...`** — app-defined custom field context/value (B326–B330).
- **`/rest/atlassian-connect/1/app/module/dynamic`** — Connect dynamic modules (B943–B945).
- **`/rest/forge/1/app/properties`** — Forge app-scoped property storage (B975–B978).

Most actions require Forge/Connect-issued credentials (OAuth 2.0 3LO scopes or Connect JWT). Basic auth with an API token will return `401`/`403` on every action.

| Action                               | Positional       | Required flags        | Optional flags                                  |
| ------------------------------------ | ---------------- | --------------------- | ----------------------------------------------- |
| `get-field-context-configuration`    | `<fieldIdOrKey>` | —                     | filters (below), `--start-at`, `--max-results`  |
| `update-field-context-configuration` | `<fieldIdOrKey>` | `--id` or `--body`    | `--configuration`, `--schema`                   |
| `update-field-value`                 | `<fieldIdOrKey>` | `--value`             | `--generate-changelog`, `--generate-app-events` |
| `list-field-context-configurations`  | —                | `--field-ids-or-keys` | filters (below), `--start-at`, `--max-results`  |
| `bulk-update-field-value`            | —                | `--value`             | `--generate-changelog`, `--generate-app-events` |
| `get-dynamic-modules`                | —                | —                     | —                                               |
| `register-dynamic-modules`           | —                | `--value`             | —                                               |
| `delete-dynamic-modules`             | —                | —                     | `--module-keys`                                 |
| `list-forge-properties`              | —                | —                     | —                                               |
| `get-forge-property`                 | `<propertyKey>`  | —                     | —                                               |
| `set-forge-property`                 | `<propertyKey>`  | `--value`             | —                                               |
| `delete-forge-property`              | `<propertyKey>`  | —                     | —                                               |

- `update-field-context-configuration` sends the spec body `{ configurations: [{ id, configuration?, schema? }] }`. For one entry pass `--id` (the configuration ID) plus `--configuration` and/or `--schema` (opaque JSON, stored verbatim). For several entries (1–1000) pass the whole body instead: `--body '{"configurations":[{"id":"10000","configuration":{...}},{"id":"10001","schema":{...}}]}'`. `--body` cannot be combined with `--id`/`--configuration`/`--schema`.
- `get-field-context-configuration` and `list-field-context-configurations` return a page (`{ startAt, maxResults, total, isLast, values }`). Page with `--start-at` (0-based) and `--max-results` (server default 100). Filter with **one** of these groups (the CLI rejects mixed groups, and `--project` without `--issue-type-id` or with either one empty, before sending): `--ids` (configuration IDs, comma-separated), `--context-ids` (field-context IDs, comma-separated), `--issue-id` (one issue ID), or `--project <idOrKey>` together with `--issue-type-id <id>`. `--ids` and `--context-ids` go on the wire as repeated `id=` / `fieldContextId=` params; a value that names no ID (`''`, `','`) is rejected rather than sent unfiltered. Without a filter every configuration is returned.
- `--value` for `update-field-value` is a JSON array of `{ issueIds, value }` entries (spec `CustomFieldValueUpdate`; `issueIds` is required). Pass the array itself, not `{"updates":[...]}`; any non-array is rejected before the request.
- `--value` for `bulk-update-field-value` is a JSON array of flat `{ customField, issueIds, value }` entries (spec `MultipleCustomFieldValuesUpdate`); a non-array is rejected.
- `--generate-changelog true|false` and `--generate-app-events true|false` (`update-field-value`, `bulk-update-field-value`) are tri-state: both default to `true` on the server, so pass `false` to skip the issue changelog entry or to suppress app events and webhooks (no other app then sees an "issue updated" event); omit for the default. The value is required.
- `--value` for `register-dynamic-modules` is a JSON array of Connect module descriptors (each `{ key, type, ... }`), not `{"modules":[...]}`; a non-array is rejected.
- `--value` for `set-forge-property` is any JSON value (stored verbatim and returned as-is by `get-forge-property`).
- `--module-keys` is comma-separated. When omitted, `delete-dynamic-modules` removes every dynamic module registered by the calling app.
- `--field-ids-or-keys` is comma-separated and required for `list-field-context-configurations` (sent in the request body).

```sh
# Read the configuration the app stored for one of its custom fields
atlas jira app get-field-context-configuration customfield_10042

# Second page of the configurations that apply to one issue
atlas jira app get-field-context-configuration customfield_10042 --issue-id 10001 --start-at 50 --max-results 50

# Configurations for a project + issue type pair
atlas jira app get-field-context-configuration customfield_10042 --project PROJ --issue-type-id 10002

# Update a configuration (by its id) with new JSON (and optionally the schema)
atlas jira app update-field-context-configuration customfield_10042 \
  --id 10000 --configuration '{"foo":true}' --schema '{"type":"object"}'

# Update several configurations in one request
atlas jira app update-field-context-configuration customfield_10042 \
  --body '{"configurations":[{"id":"10000","configuration":{"maxValue":10}},{"id":"10001","schema":{"type":"number"}}]}'

# Set a single field on a batch of issues
atlas jira app update-field-value customfield_10042 \
  --value '[{"issueIds":[10001,10002],"value":"hello"}]'

# Fetch configurations for a set of (field, context) pairs
atlas jira app list-field-context-configurations \
  --field-ids-or-keys customfield_10042 --context-ids 10100,10101

# Fetch specific configurations by ID, 25 per page
atlas jira app list-field-context-configurations \
  --field-ids-or-keys customfield_10042,customfield_10043 --ids 10000,10001 --max-results 25

# Bulk-update many fields in one request
atlas jira app bulk-update-field-value \
  --value '[{"customField":"customfield_10042","issueIds":[10001],"value":"hi"}]'

# Update a field without a changelog entry or app events
atlas jira app update-field-value customfield_10042 \
  --value '[{"issueIds":[10001],"value":"quiet"}]' \
  --generate-changelog false --generate-app-events false

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

- OAuth granular scopes: `get` requires `read:security:jira`; `delete` requires `delete:security:jira`.

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

| Action          | Positional | Required flags | Optional flags |
| --------------- | ---------- | -------------- | -------------- |
| `get-workspace` | —          | —              | —              |
| `list-projects` | —          | —              | `--ids`        |

- `get-workspace` returns `{ anyContentBlocked: boolean }` for the entire Jira workspace.
- `list-projects` returns a **non-paginated** list of project data policies (`{ projectDataPolicies: [...] }`). The spec endpoint (`getPolicies`) has no pagination; all matching projects are returned in one response.
- `--ids` is a **comma-separated** list of up to 50 project IDs to filter by. Omit to return all projects.

```sh
# Check whether any content is blocked at workspace level
atlas jira data-policy get-workspace

# List data policies for all projects (non-paginated)
atlas jira data-policy list-projects

# List data policies for specific projects
atlas jira data-policy list-projects --ids 10001,10002
```

## `announcement-banner`

| Action   | Positional | Required flags | Optional flags                                            |
| -------- | ---------- | -------------- | --------------------------------------------------------- |
| `get`    | —          | —              | —                                                         |
| `update` | —          | —              | `--message`, `--visibility`, `--dismissible`, `--enabled` |

- `--visibility` is `public` or `private` (case-insensitive; sent lowercase, as the spec defines it).
- `--dismissible [true|false]` — whether users can dismiss the banner. `--dismissible` or `--dismissible true` sends `isDismissible: true`; `--dismissible false` (or `--no-dismissible`) sends `false`.
- `--enabled [true|false]` — whether the banner is displayed. `--enabled false` (or `--no-enabled`) turns the banner off.
- All `update` fields are optional — supply only the fields you want to change; at least one is required.

```sh
# Get the current announcement banner
atlas jira announcement-banner get

# Update the banner message
atlas jira announcement-banner update --message "Scheduled maintenance tonight at 22:00 UTC"

# Set the banner to private and change message
atlas jira announcement-banner update --message "Internal notice" --visibility private

# Turn the banner off and make it non-dismissible
atlas jira announcement-banner update --enabled false --dismissible false
```

## `application-properties`

Global key/value settings exposed under `/rest/api/3/application-properties` (B331–B333).

| Action                   | Positional | Required flags | Optional flags                                |
| ------------------------ | ---------- | -------------- | --------------------------------------------- |
| `list`                   | `[key]`    | —              | `--key`, `--permission-level`, `--key-filter` |
| `set`                    | `<id>`     | `--value`      | —                                             |
| `list-advanced-settings` | —          | —              | —                                             |

- `list` always returns an array, also for a single `--key` lookup (Jira may answer that one with a bare object; the client wraps it in a one-element array). Passing a positional `<key>` is equivalent to `--key <key>`.
- `--permission-level` accepts the server-defined permission tier string (passed through unchanged so the server can evolve the enum). Typical values include `SYSADMIN`.
- `--key-filter` is a regex applied server-side to property keys; Jira applies it only when `--key` is not given.
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

| Action                        | Positional | Required flags                                                                          | Optional flags |
| ----------------------------- | ---------- | --------------------------------------------------------------------------------------- | -------------- |
| `get`                         | —          | —                                                                                       | —              |
| `get-timetracking`            | —          | —                                                                                       | —              |
| `select-timetracking`         | —          | `--key`                                                                                 | `--name`       |
| `list-timetracking-providers` | —          | —                                                                                       | —              |
| `get-timetracking-options`    | —          | —                                                                                       | —              |
| `update-timetracking-options` | —          | `--working-hours-per-day`, `--working-days-per-week`, `--time-format`, `--default-unit` | —              |

- `get` returns the instance-level feature flags (voting, watching, sub-tasks, time tracking, attachments, issue linking) and the embedded `timeTrackingConfiguration` when time tracking is enabled.
- `get-timetracking` returns the currently selected provider; `list-timetracking-providers` returns every installed provider. The built-in provider key is `JIRA`.
- `select-timetracking --key <key>` switches the active provider; `--name` may be supplied for third-party providers. The provider's `url` is read-only (returned by `get-timetracking`), so `--url` is rejected before the request.
- `--time-format` accepts: `pretty`, `days`, `hours`.
- `--default-unit` accepts: `minute`, `hour`, `day`, `week`.
- `update-timetracking-options` requires ALL FOUR flags (spec mandates every field); the server returns the resulting `TimeTrackingConfiguration`.

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

# All four flags are required (spec mandates every field)
atlas jira configuration update-timetracking-options --working-hours-per-day 8 --working-days-per-week 5 --time-format pretty --default-unit hour
```

## `webhooks`

| Action        | Positionals | Required flags        | Optional flags                |
| ------------- | ----------- | --------------------- | ----------------------------- |
| `list`        | —           | —                     | `--start-at`, `--max-results` |
| `register`    | —           | `--url`, `--webhooks` | —                             |
| `refresh`     | —           | `--webhook-ids`       | —                             |
| `list-failed` | —           | —                     | `--max-results`, `--after`    |
| `delete`      | —           | `--webhook-ids`       | —                             |

**Notes:**

- `list` calls `GET /rest/api/3/webhook` and returns a paginated list of registered webhooks for the calling app.
- `register` calls `POST /rest/api/3/webhook`. `--webhooks` is a JSON array of `{ jqlFilter, events, fieldIdsFilter?, issuePropertyKeysFilter? }` objects.
- `refresh` calls `PUT /rest/api/3/webhook/refresh`. `--webhook-ids` is a JSON array of numeric webhook IDs (e.g. `[10000,10001]`). Extends webhook expiry and returns `{ expirationDate }` (milliseconds since epoch, int64).
- `list-failed` calls `GET /rest/api/3/webhook/failed` and returns a page of failed webhook deliveries.
- `delete` calls `DELETE /rest/api/3/webhook`. `--webhook-ids` is a JSON array of numeric webhook IDs to remove permanently.
- `--after` accepts a Unix timestamp in **milliseconds** (e.g. `--after 1700000000000`). Only deliveries with a failure time after this value are returned.
- `--max-results` caps the number of results in a single page.
- The SDK exposes `listFailed()` (single page) and `listAllFailed()` (async generator) on `client.webhooks`.
- `list-failed` returns a `FailedWebhooks` page `{ maxResults, next?, values }` — cursor pagination via the `next` URL; there is no `startAt`/`isLast`/`total`.

```sh
# List registered webhooks (paginated)
atlas jira webhooks list

# List with pagination
atlas jira webhooks list --start-at 0 --max-results 50

# Register a new webhook
atlas jira webhooks register \
  --url 'https://example.com/hook' \
  --webhooks '[{"jqlFilter":"project=MYPROJ","events":["jira:issue_created","jira:issue_updated"]}]'

# Refresh (extend) webhook expiry
atlas jira webhooks refresh --webhook-ids '[10000,10001]'

# List failed webhook deliveries (default page size)
atlas jira webhooks list-failed

# List failed webhooks since a specific timestamp
atlas jira webhooks list-failed --after 1700000000000

# Limit the result set
atlas jira webhooks list-failed --max-results 20

# Delete webhooks by ID
atlas jira webhooks delete --webhook-ids '[10000,10001]'
```

## `server-info`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `get`  | —          | —              | —              |

- Returns Jira version, build number, server time and deployment type. `healthChecks` is deprecated and no longer returned.

```sh
# Get Jira server info
atlas jira server-info get
```

## `instance`

| Action        | Positional | Required flags | Optional flags |
| ------------- | ---------- | -------------- | -------------- |
| `get-license` | —          | —              | —              |

- Returns the instance license with a list of licensed applications (`applications: [{ id, plan }]`); `plan` is `UNLICENSED`, `FREE` or `PAID`.

```sh
# Get instance license information
atlas jira instance get-license
```

## `mypermissions`

| Action | Positional | Required flags  | Optional flags                                                                                                                 |
| ------ | ---------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `get`  | —          | `--permissions` | `--project-id`, `--project-key`, `--issue-id`, `--issue-key`, `--project-uuid`, `--project-configuration-uuid`, `--comment-id` |

- `--permissions` is a **comma-separated** list of the permission keys to check (e.g. `BROWSE_PROJECTS,CREATE_ISSUES`). The spec marks it **(Required)**: always pass it (the CLI does not enforce it; Jira can answer 400 without it). List the available keys with `atlas jira permissions get-all`.
- Without scope flags the check is global for the current user; scope flags narrow it to a project, issue or comment.

```sh
# Check global permissions for the current user
atlas jira mypermissions get --permissions ADMINISTER,CREATE_SHARED_OBJECTS

# Check permissions in a specific project by key
atlas jira mypermissions get --project-key PROJ --permissions BROWSE_PROJECTS,CREATE_ISSUES

# Check specific permissions for an issue
atlas jira mypermissions get --issue-key PROJ-42 --permissions BROWSE_PROJECTS,EDIT_ISSUES
```

## `mypreferences`

| Action       | Positional | Required flags     | Optional flags |
| ------------ | ---------- | ------------------ | -------------- |
| `get`        | —          | `--key`            | —              |
| `set`        | —          | `--key`, `--value` | —              |
| `delete`     | —          | `--key`            | —              |
| `get-locale` | —          | —                  | —              |
| `set-locale` | —          | `--locale`         | —              |

- `--key` — preference key (required for `get`, `set`, `delete`).
- `--value` — preference value string (required for `set`); sent as a JSON-encoded string body.
- `--locale` — IETF locale tag, e.g. `en_US` (required for `set-locale`).
- `set-locale` is **deprecated** per the Jira platform v3 spec; prefer updating locale through account settings.

```sh
# Get a preference value
atlas jira mypreferences get --key jira.user.locale

# Set a preference value
atlas jira mypreferences set --key jira.user.locale --value en_US

# Delete a preference
atlas jira mypreferences delete --key jira.user.locale

# Get the current user's locale
atlas jira mypreferences get-locale

# Set the current user's locale (deprecated)
atlas jira mypreferences set-locale --locale en_US
```

## `auditing`

| Action | Positional | Required flags | Optional flags                                      |
| ------ | ---------- | -------------- | --------------------------------------------------- |
| `list` | —          | —              | `--offset`, `--limit`, `--filter`, `--from`, `--to` |

- `--offset` — zero-based pagination offset (default 0).
- `--limit` — maximum records per page (1–1000; default 1000 per Jira).
- `--filter` — space-separated strings matched against the audit record field content.
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

## `forge`

| Action              | Positional | Required flags           | Optional flags |
| ------------------- | ---------- | ------------------------ | -------------- |
| `bulk-panel-action` | —          | `--module-id`, `--value` | —              |
| `bulk-pin-status`   | —          | `--module-id`, `--value` | —              |

`bulk-panel-action` details:

- Pins or unpins a Forge issue panel across a batch of projects. This is a **project-level** operation, not a per-issue one.
- `--module-id` — the moduleId of the Forge panel, in the format `ari:cloud:ecosystem::extension/{app-id}/{environment-id}/static/{module-key}`. Required.
- `--value` — JSON array of project pin action objects; each must have `action` (`"PIN"` or `"UNPIN"`) and `projectIdOrKey` (string). Anything else is rejected before the request.
- **Auth:** basic auth with an admin's API token, or OAuth 2.0 (3LO) with the `manage:jira-project` scope (both operations); the **Administer Jira** global permission is required. For OAuth set `ATLASSIAN_AUTH_TYPE=bearer` and provide the access token through `ATLASSIAN_API_TOKEN`; never pass a token in a CLI flag.
- **URL base:** `POST /rest/api/3/forge/panel/action/bulk/async` — uses the standard REST API base, not a Forge tunnel.
- Runs asynchronously and returns `{ taskId }`; poll it with `atlas jira task get <taskId>`.
- The Forge app must be installed on the Jira site before this endpoint is usable.

`bulk-pin-status` details:

- Reads whether a Forge issue panel is pinned to each of up to 1000 projects (`POST /rest/api/3/forge/panel/action/bulk/status`). Read-only and synchronous (no task to poll); same auth and permission as `bulk-panel-action`.
- `--module-id` — same moduleId format as above. Required.
- `--value` — JSON array of project IDs or keys, **strings only**: `'["PROJ","10001"]'`. Required.
- Returns `{ moduleId, statuses: [{ projectIdOrKey, pinned, pinnedAt, error }] }`, one entry per requested project; `pinnedAt` is epoch milliseconds. An unknown or inaccessible project comes back with `pinned: false` and the reason in `error` — the request itself still succeeds.

```sh
# Pin a Forge panel to one project and unpin it from another
atlas jira forge bulk-panel-action --module-id 'ari:cloud:ecosystem::extension/app-id/env-id/static/my-panel' --value '[{"action":"PIN","projectIdOrKey":"PROJ"},{"action":"UNPIN","projectIdOrKey":"OTHER"}]'

# Follow the pin task from the returned taskId
atlas jira task get 10100

# Check whether the panel is pinned to two projects
atlas jira forge bulk-pin-status --module-id 'ari:cloud:ecosystem::extension/app-id/env-id/static/my-panel' --value '["PROJ","10001"]'
```

## `policies`

> **Experimental:** every operation is marked `x-experimental` by Atlassian; shapes may change without notice. Mutating actions need the **Administer Jira** global permission.

| Action                 | Positional         | Required flags  | Optional flags                            |
| ---------------------- | ------------------ | --------------- | ----------------------------------------- |
| `list`                 | —                  | —               | `--start-at`, `--max-results`, `--cursor` |
| `get-project-state`    | `<projectIdOrKey>` | —               | —                                         |
| `get-project-rules`    | `<projectIdOrKey>` | —               | `--rule-type-ids`                         |
| `set-project-policies` | `<projectIdOrKey>` | `--body`        | —                                         |
| `validate-project`     | `<projectIdOrKey>` | `--body`        | —                                         |
| `apply`                | `<policyId>`       | `--project-ids` | —                                         |
| `remove`               | `<policyId>`       | `--project-ids` | —                                         |

- `list` calls `GET /rest/api/3/policies` and returns `{ values, startAt, maxResults, total, isLast, nextPageCursor }`; each value is a policy summary (`id`, `policyName`, `policyDescription`, `isDefault`, `version`, `appliedProjectIds`). In cursor mode `startAt` and `total` are null: omit `--cursor` for page one, then pass the previous response's `nextPageCursor` as `--cursor`. `--max-results` is capped at 50 in cursor mode.
- `get-project-state` calls `GET /rest/api/3/policies/project/{projectIdOrKey}` and returns the policies applied to the project, each with `rulesByDomain`.
- `get-project-rules` calls `GET /rest/api/3/policies/project/{projectIdOrKey}/rules` and returns only the **active** rules of the requested types (`ruleId`, `ruleTypeId`, `domain`, `description`, `properties`). `--rule-type-ids` is a comma-separated list sent as repeated `ruleTypeIds` params.
- `set-project-policies` calls `PUT /rest/api/3/policies/project/{projectIdOrKey}/policies` and **replaces** the project's complete policy set (a project can hold at most one policy). `--body` is `'{"policyIds":["<policyId>"]}'`; `'{"policyIds":[]}'` clears the set. A `--body` without a `policyIds` array of strings (for example a `policyId` typo) is rejected before the request. Prints `{"updated":true}`.
- `validate-project` calls `POST /rest/api/3/policies/project/{projectIdOrKey}/validate` with the same `--body` shape (same `policyIds` check) and checks whether the policies could be applied, without applying them. Prints `{"valid":true}` on success.
- For both, an HTTP 409 means the policies violate a rule: the command exits with a generic HTTP 409 error. The CLI prints only the error message, not the violation list (`entityId`, `entityName`, `entityType`, `ruleTypeId`, `remediationHint`); the SDK exposes it as `HttpError.responseBody`.
- `apply` / `remove` call `POST /rest/api/3/policies/{policyId}/apply` and `.../remove`. `--project-ids` is a comma-separated list of numeric project IDs. Each project is processed independently; returns `{ successful: [{ projectId, message, errors }], failed: [...] }`. A 409 means no project succeeded (the CLI prints only the generic HTTP error).

```sh
# List policies, then the next page
atlas jira policies list --max-results 50
atlas jira policies list --cursor '<nextPageCursor>'

# Inspect a project
atlas jira policies get-project-state PROJ
atlas jira policies get-project-rules PROJ --rule-type-ids rt-a,rt-b

# Check, then assign a policy to a project (replaces the project's policy set)
atlas jira policies validate-project PROJ --body '{"policyIds":["policy-1"]}'
atlas jira policies set-project-policies PROJ --body '{"policyIds":["policy-1"]}'

# Add / remove a policy across several projects
atlas jira policies apply policy-1 --project-ids 10000,10001
atlas jira policies remove policy-1 --project-ids 10000
```

## `agents`

> **Experimental:** both operations are marked `x-experimental` by Atlassian. They need the global **Bulk change** permission plus Browse Projects on every target issue, and can return HTTP 429 when rate limited.

| Action          | Positional | Required flags | Optional flags |
| --------------- | ---------- | -------------- | -------------- |
| `start-batch`   | —          | `--body`       | —              |
| `start-uniform` | —          | `--body`       | —              |

- Both start Rovo agent sessions on issues and return the **start** outcomes inline; the agent's work continues asynchronously. Item-level failures arrive inside an HTTP 200, so inspect `results`.
- `start-batch` calls `POST /rest/api/3/agents/bulk/invoke/batch`. `--body` is `{"clientMutationId":"<uuid>","invocations":[{"agentId":"<rovo agent id>","issueId":"<numeric issue id>","requestId":"<uuid>","userPrompt":"<optional>"}]}` with 1-50 invocations; each `requestId` must be unique within the request, and the same issue may appear more than once.
- `start-uniform` calls `POST /rest/api/3/agents/bulk/invoke/uniform`. `--body` is `{"agentId":"<rovo agent id>","clientMutationId":"<uuid>","issueIds":["<numeric issue id>"],"userPrompt":"<optional>"}` with 1-50 unique issue IDs.
- `issueId` / `issueIds` are numeric ID strings, not issue keys. `clientMutationId` is a caller-supplied UUID. The SDK and CLI reject 0 or more than 50 items before sending the request.
- Response: `{ startedCount, alreadyStartedCount, failedCount, rateLimitedCount, success, results }`. `success` is true when `startedCount` or `alreadyStartedCount` is above zero; it does not mean every item worked. Each `results[]` entry has `issueId`, `agentId`, `requestId`, `result` (`STARTED`, `ALREADY_STARTED`, `FAILED`, `RATE_LIMITED` or `IN_DOUBT`), `conversationId` (started items only) and `error` (`{ type, statusCode, message }`).

```sh
# Start one agent on three issues with a shared prompt
atlas jira agents start-uniform --body '{"agentId":"0010fa86-cd74-46eb-a2ee-229a98250b9c","clientMutationId":"f47ac10b-58cc-4372-a567-0e02b2c3d479","issueIds":["10001","10002","10003"],"userPrompt":"Summarize the next steps for this issue."}'

# Start an agent per issue, each with its own prompt
atlas jira agents start-batch --body '{"clientMutationId":"f47ac10b-58cc-4372-a567-0e02b2c3d479","invocations":[{"agentId":"0010fa86-cd74-46eb-a2ee-229a98250b9c","issueId":"10001","requestId":"64cbeead-43ee-4de6-a535-281417003efd","userPrompt":"Summarize the next steps."},{"agentId":"0010fa86-cd74-46eb-a2ee-229a98250b9c","issueId":"10002","requestId":"cf399ad9-9835-4fc5-b830-abae6c682f06"}]}'
```

## `license`

| Action                              | Positional         | Required flags | Optional flags |
| ----------------------------------- | ------------------ | -------------- | -------------- |
| `get-approximate-count`             | —                  | —              | —              |
| `get-approximate-count-for-product` | `<applicationKey>` | —              | —              |

- `get-approximate-count` calls `GET /rest/api/3/license/approximateLicenseCount` and returns the approximate user count across all Jira products.
- `get-approximate-count-for-product` calls `GET /rest/api/3/license/approximateLicenseCount/product/{applicationKey}` for a specific product. `<applicationKey>` is one of `jira-core`, `jira-product-discovery`, `jira-software`, `jira-servicedesk`; any other value is rejected before the request.
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
- `--columns` is a **comma-separated** list of column field keys (e.g. `issuekey,summary,assignee`). The endpoint accepts `multipart/form-data` with repeated `columns` fields.

```sh
# Get the current default issue navigator columns
atlas jira settings get-columns

# Set the default columns to Key and Summary
atlas jira settings set-columns --columns issuekey,summary
```

## `redact`

| Action       | Positional | Required flags | Optional flags |
| ------------ | ---------- | -------------- | -------------- |
| `start`      | —          | `--value`      | —              |
| `get-status` | `<jobId>`  | —              | —              |

- `start` calls `POST /rest/api/3/redact` to begin an asynchronous issue redaction job. Returns the job ID as a **bare UUID string**. **Admin-only endpoint.**
- `get-status` calls `GET /rest/api/3/redact/status/{jobId}` to check progress. Returns `{ jobStatus, bulkRedactionResponse }` where `jobStatus` is `PENDING`, `IN_PROGRESS`, or `COMPLETED`.
- `--value` — JSON array of redaction objects (the array itself, not `{"redactions":[...]}`; a non-array is rejected). Each object requires:
  - `contentItem`: `{ entityId, entityType, id }` where `entityType` is `issuefieldvalue`, `issue-comment`, or `issue-worklog`.
  - `externalId`: a unique UUID for the redaction request.
  - `reason`: why the content is being redacted.
  - `redactionPosition`: `{ expectedText, from, to }` (and optional `adfPointer` for rich-text/ADF fields). `expectedText` is the redacted text encoded as a SHA-256 hash with Base64 digest.

```sh
# Start a redaction job (single redaction on the summary field of issue 10000)
atlas jira redact start --value '[{"contentItem":{"entityId":"summary","entityType":"issuefieldvalue","id":"10000"},"externalId":"51101de6-d001-429d-a095-b2b96dd57fcb","reason":"PII data","redactionPosition":{"expectedText":"ODFiNjM3...","from":14,"to":20}}]'

# Check the status of a running redaction job
atlas jira redact get-status job-abc123
```

## `flag`

**URL base:** `/rest/featureflags/0.1` (Jira Software DevInfo Feature Flags API — not `/rest/api/3`). This tenant base is used for lookup/deletion; system-to-system `bulk submit-feature-flags` ingestion uses `/jira/featureflags/0.1/cloud/{cloudId}/bulk` when proxy routing is enabled.

| Action   | Positional        | Required flags | Optional flags |
| -------- | ----------------- | -------------- | -------------- |
| `get`    | `<featureFlagId>` | —              | —              |
| `delete` | `<featureFlagId>` | —              | —              |

- Feature flag entities are stored via the Jira DevInfo API when CI/CD tools push flag state to Jira.
- Requires an app credential accepted by this integration API. Current granular OAuth scopes are `read:feature-flag-info:jira` for `get` and `delete:feature-flag-info:jira` for `delete`.
- `delete` is asynchronous; confirm with `flag get`. Jira no longer supports its `_updateSequenceId` guard, so `delete` rejects `--update-sequence-id`.

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

- `<type>` is one of `issuetype`, `project`, `user` or `priority`; any other value is rejected before the request.
- Returns all system (built-in) avatars for the given type.

```sh
# List system avatars for issue types
atlas jira avatar list-system issuetype

# List system avatars for projects
atlas jira avatar list-system project
```

## `classification-levels`

| Action | Positional | Required flags | Optional flags           |
| ------ | ---------- | -------------- | ------------------------ |
| `list` | —          | —              | `--status`, `--order-by` |

- Returns `{ id, status, name, rank, description, guideline, color }` entries.
- `--status` is a comma-separated subset of `PUBLISHED`, `ARCHIVED`, `DRAFT` (sent as repeated `status=` params). Omit for every status; a value that names no status (`''`, `','`) is rejected.
- `--order-by` is `rank`, `+rank` or `-rank`; write the descending form as `--order-by=-rank`. Omit for unsorted results.

```sh
# List all data classification levels
atlas jira classification-levels list

# Published and draft levels, highest rank first
atlas jira classification-levels list --status PUBLISHED,DRAFT --order-by=-rank
```

## `latest`

**URL base:** `/rest/internal/api/latest` (Jira Internal API — not `/rest/api/3`).

This resource exposes the internal bulk worklog **lookup** endpoint (`getWorklogsByIssueIdAndWorklogId`) — it resolves worklogs by `(issueId, worklogId)` pairs, it does not create them. Stability is not guaranteed by Atlassian.

| Action         | Positional | Required flags | Optional flags |
| -------------- | ---------- | -------------- | -------------- |
| `bulk-worklog` | —          | `--value`      | —              |

- `--value` must be a JSON array of `{ issueId, worklogId }` integer pairs to look up (not `{"requests":[...]}`; a non-array is rejected).

```sh
# Bulk-look up worklogs by (issueId, worklogId) pairs via the internal API
atlas jira latest bulk-worklog --value '[{"issueId":10001,"worklogId":20001},{"issueId":10001,"worklogId":20002}]'
```

## `remote-link`

**URL base:** `/rest/remotelinks/1.0` (Jira Remote Links integration API — not `/rest/api/3`).

This is distinct from issue-scoped remote links (`/rest/api/3/issue/{issueIdOrKey}/remotelink`).

| Action   | Positional       | Required flags | Optional flags |
| -------- | ---------------- | -------------- | -------------- |
| `get`    | `<remoteLinkId>` | —              | —              |
| `delete` | `<remoteLinkId>` | —              | —              |

- OAuth granular scopes: `get` requires `read:remote-link-info:jira`; `delete` requires `delete:remote-link-info:jira`.
- `delete` is asynchronous; confirm with `remote-link get`. Jira no longer supports its `_updateSequenceNumber` guard, so `delete` rejects `--update-sequence-id`.

```sh
# Get a remote link by ID
atlas jira remote-link get rl-123

# Delete a remote link by ID
atlas jira remote-link delete rl-123
```

## `service-registry`

**URL base:** `/rest/atlassian-connect/1` (Atlassian Connect API — not `/rest/api/3`).

Look up Atlassian Connect services by their service IDs. The `serviceIds` parameter is
**required** by the spec (min 1, max 20). Pass IDs as a comma-separated list via `--service-ids`;
they are sent as repeated query params (`?serviceIds=a&serviceIds=b`).

| Action | Positional | Required flags        | Optional flags |
| ------ | ---------- | --------------------- | -------------- |
| `get`  | —          | `--service-ids` (CSV) | —              |

```sh
# Get one or more Connect services by ID
atlas jira service-registry get --service-ids "ari:cloud:graph::service/ca075ed7/f51d7252"

# Look up multiple services
atlas jira service-registry get --service-ids "svc-id-1,svc-id-2,svc-id-3"
```

## `addons`

Manage app properties for Atlassian Connect apps (B939-B942).

**URL base:** `/rest/atlassian-connect/1` (Atlassian Connect API — not `/rest/api/3`).

Only a Connect app whose key matches `addonKey` can call these endpoints.
Forge apps with `app.connect.key` can also access Connect app properties.

| Action            | Positional                 | Required flags | Optional flags |
| ----------------- | -------------------------- | -------------- | -------------- |
| `list-properties` | `<addonKey>`               | —              | —              |
| `get-property`    | `<addonKey> <propertyKey>` | —              | —              |
| `set-property`    | `<addonKey> <propertyKey>` | `--value`      | —              |
| `delete-property` | `<addonKey> <propertyKey>` | —              | —              |

- `--value`: JSON value to store as the property value (must be valid non-empty JSON, max 32768 characters).

```sh
# List all property keys for a Connect app — B939
atlas jira addons list-properties my-connect-app

# Get a specific property value — B941
atlas jira addons get-property my-connect-app my-setting

# Set (create or update) a property — B942
atlas jira addons set-property my-connect-app my-setting --value '{"enabled":true}'
atlas jira addons set-property my-connect-app config --value '"simple-string-value"'

# Delete a property — B940
atlas jira addons delete-property my-connect-app my-setting
```

## `exists-by-properties`

**URL base:** `/rest/devinfo/0.10` (Jira Development Information API — not `/rest/api/3`).

| Action | Positional | Required flags | Optional flags         |
| ------ | ---------- | -------------- | ---------------------- |
| `get`  | —          | `--properties` | `--update-sequence-id` |

- Checks whether any repository (and its dev-info entities) carries **all** of the given properties — the arbitrary `properties` the provider attached when it submitted the data. Returns `{ hasDataMatchingProperties: boolean }`.
- `--properties` — the properties to match, sent as query params: `key=value[,key=value]` pairs, or a JSON object when a value contains a comma (`--properties '{"tags":"a,b"}'`; values are strings or numbers). At least one property is required (Jira answers 400 without one); a repeated key, an empty key or an empty value is rejected.
- `--update-sequence-id <n>` — positive integer, sent as `_updateSequenceId`: only entities with an `updateSequenceId` less than or equal to it are considered.
- The former `--entity-type` / `--entity-id` flags are rejected. They were only ever sent as the properties `entityType` / `entityId`; for the same query pass `--properties entityType=<type>,entityId=<id>`.

```sh
# Is there dev info tagged with this account and project?
atlas jira exists-by-properties get --properties accountId=123,projectId=ABC

# Only consider entities up to update sequence 42
atlas jira exists-by-properties get --properties accountId=123 --update-sequence-id 42
```

## `repository`

**URL base:** `/rest/devinfo/0.10` (Jira Development Information API — not `/rest/api/3`).

| Action          | Positional                               | Required flags | Optional flags         |
| --------------- | ---------------------------------------- | -------------- | ---------------------- |
| `get`           | `<repositoryId>`                         | —              | —                      |
| `delete`        | `<repositoryId>`                         | —              | `--update-sequence-id` |
| `delete-entity` | `<repositoryId> <entityType> <entityId>` | —              | `--update-sequence-id` |

- OAuth granular scopes: `get` requires `read:dev-info:jira`; both delete actions require `delete:dev-info:jira`.
- `--update-sequence-id` is a positive integer (sent as `_updateSequenceId`); only data with an `updateSequenceId` less than or equal to it is deleted. An empty, non-decimal (`0x10`, `1e3`) or above-2^53−1 value is rejected. `delete-entity`'s `<entityType>` is one of `commit`, `branch`, `pull_request`; anything else is rejected before the request.

```sh
# Get a repository and its associated dev-info entities
atlas jira repository get my-repo-123

# Delete a repository and all its dev-info entities
atlas jira repository delete my-repo-123

# Delete with sequential update ordering
atlas jira repository delete my-repo-123 --update-sequence-id 42

# Delete a specific entity (commit, branch, pull_request) from a repository
atlas jira repository delete-entity my-repo-123 commit abc123

# Delete a specific pull request entity with update sequence ID
atlas jira repository delete-entity my-repo-123 pull_request pr-1 --update-sequence-id 42
```

## `dashboards`

`list` accepts only `--filter` (`my` or `favourite`), `--start-at`, and `--max-results`; the removed `--order-by` and `--expand` flags are rejected with migration guidance because sorting and expansion belong to `search`. `get` and `delete` take `<dashboardId>`. `create` requires `--name` and `--share-permissions` (a JSON array of share-permission objects, e.g. `'[{"type":"global"}]'`), with optional `--description` and `--edit-permissions` (JSON); `update <dashboardId>` takes the same flags. The actions below add the rest of the platform's dashboard surface (B391–B405).

```sh
atlas jira dashboards create --name "Team board" --share-permissions '[{"type":"global"}]' --description "Sprint health"
atlas jira dashboards update 10001 --name "Renamed" --share-permissions '[{"type":"authenticated"}]'
```

| Action                   | Positional                             | Required flags                                                      | Optional flags                                                                                                                                                   |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`                   | —                                      | —                                                                   | `--filter`, `--start-at`, `--max-results`                                                                                                                        |
| `list-gadgets`           | `<dashboardId>`                        | —                                                                   | —                                                                                                                                                                |
| `add-gadget`             | `<dashboardId>`                        | —                                                                   | `--module-key`, `--uri`, `--color`, `--row` + `--column`, `--title`, `--ignore-uri-and-module-key-validation`                                                    |
| `update-gadget`          | `<dashboardId> <gadgetId>`             | —                                                                   | `--title`, `--color`, `--row` + `--column`                                                                                                                       |
| `remove-gadget`          | `<dashboardId> <gadgetId>`             | —                                                                   | —                                                                                                                                                                |
| `list-item-properties`   | `<dashboardId> <itemId>`               | —                                                                   | —                                                                                                                                                                |
| `get-item-property`      | `<dashboardId> <itemId> <propertyKey>` | —                                                                   | —                                                                                                                                                                |
| `set-item-property`      | `<dashboardId> <itemId> <propertyKey>` | `--value` (JSON)                                                    | —                                                                                                                                                                |
| `delete-item-property`   | `<dashboardId> <itemId> <propertyKey>` | —                                                                   | —                                                                                                                                                                |
| `copy`                   | `<dashboardId>`                        | `--name`, `--share-permissions` (JSON), `--edit-permissions` (JSON) | `--description`                                                                                                                                                  |
| `bulk-edit`              | —                                      | `--entity-ids` (csv ints), `--action`                               | `--new-owner`, `--autofix-name`, `--extend-admin-permissions`, `--share-permissions`, `--edit-permissions`                                                       |
| `list-available-gadgets` | —                                      | —                                                                   | —                                                                                                                                                                |
| `search`                 | —                                      | —                                                                   | `--dashboard-name`, `--account-id`, `--owner`, `--group-name`, `--group-id`, `--project-id`, `--order-by`, `--status`, `--start-at`, `--max-results`, `--expand` |
| `search-all`             | —                                      | —                                                                   | (same as `search` minus `--start-at`) plus `--max-pages`                                                                                                         |

- `--row` and `--column` must be supplied together (gadget position).
- `--action` for `bulk-edit` is one of: `changeOwner`, `changePermission`, `addPermission`, `removePermission`, `changePermissionAndAddPermission`, `delete`.
- `--order-by` for `search` accepts `description`, `favorite_count`, `id`, `is_favorite`, `name`, `owner` (each may be prefixed with `+` or `-`).
- `--status` for `search` is one of: `active`, `archived`, `deleted`.
- `--share-permissions` / `--edit-permissions` are **JSON arrays** of share-permission objects: `[{"type":"global"}]`, `[{"type":"user","user":{"accountId":"..."}}]`, etc.
- `set-item-property` `--value` is parsed as JSON (strings must be quoted: `--value '"hello"'`).
- `search-all` collects every result into a single array; `--max-pages` (default 10 000) caps iteration on misbehaving servers.

```sh
# Search for dashboards by name
atlas jira dashboards search --dashboard-name "Sprint" --order-by=-favorite_count --max-results 25

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

# Copy a dashboard — name, share-permissions, edit-permissions are required by the spec
atlas jira dashboards copy 10001 --name "Copy of Sprint" --share-permissions '[{"type":"global"}]' --edit-permissions '[{"type":"loggedin"}]'

# Bulk-delete dashboards (entity-ids are integers, comma-separated)
atlas jira dashboards bulk-edit --entity-ids 10001,10002 --action delete

# Bulk transfer ownership
atlas jira dashboards bulk-edit --entity-ids 10001 --action changeOwner --new-owner acc-1 --autofix-name

# List gadget catalogue (no filters — returns all available gadgets)
atlas jira dashboards list-available-gadgets
```

## `bulk`

Atlassian bulk-operations API and DevOps `POST /bulk` ingest variants. Core
operations (`delete-issues`, `edit-fields`, `move-issues`,
`transition-issues`, `watch-issues`, `unwatch-issues`) return a
`{ taskId }` envelope. Poll progress with `bulk get-status <taskId>` —
the CLI does NOT auto-poll, callers drive the cadence.

**URL bases:**

- Core endpoints: `/rest/api/3/bulk/*`
- DevOps ingest endpoints use their own bases — `builds 0.1`, `deployments 0.1`, `devinfo 0.10`, `devopscomponents 1.0`, `featureflags 0.1`, `operations 1.0`, `remotelinks 1.0`, `security 1.0`. With `--software-cloud-id`, Builds, Deployments, Development Information, and Feature Flag ingestion use the proxy routes listed above.

| Action                     | Positional      | Required flags                     | Optional flags                                         |
| -------------------------- | --------------- | ---------------------------------- | ------------------------------------------------------ |
| `create-issues`            | —               | `--issues`                         | —                                                      |
| `delete-issues`            | —               | `--issues`                         | `--send-notification`                                  |
| `get-fields`               | —               | `--issues`                         | `--search-text`, `--ending-before`, `--starting-after` |
| `edit-fields`              | —               | `--issues`, `--actions`, `--value` | `--send-notification`                                  |
| `move-issues`              | —               | `--value`                          | `--send-notification`                                  |
| `get-transitions`          | —               | `--issues`                         | `--ending-before`, `--starting-after`                  |
| `transition-issues`        | —               | `--value`                          | `--send-notification`                                  |
| `unwatch-issues`           | —               | `--issues`                         | —                                                      |
| `watch-issues`             | —               | `--issues`                         | —                                                      |
| `get-status`               | `<taskId>`      | —                                  | —                                                      |
| `set-property`             | `<propertyKey>` | one of `--value`, `--expression`   | `--filter`                                             |
| `delete-property`          | `<propertyKey>` | —                                  | `--filter`                                             |
| `submit-builds`            | —               | `--value`                          | —                                                      |
| `submit-deployments`       | —               | `--value`                          | —                                                      |
| `submit-devinfo`           | —               | `--value`                          | —                                                      |
| `submit-devops-components` | —               | `--value`                          | —                                                      |
| `submit-feature-flags`     | —               | `--value`                          | —                                                      |
| `submit-operations`        | —               | `--value`                          | —                                                      |
| `submit-remote-links`      | —               | `--value`                          | —                                                      |
| `submit-security`          | —               | `--value`                          | —                                                      |

`--issues` accepts either a JSON array of issue-update objects (for `create-issues`, where each element is `{ fields: {...}, update?: {...} }`) or a comma-separated list of issue IDs/keys (for `delete-issues`, `get-fields`, `unwatch-issues`, `watch-issues`, `get-transitions`; spaces around the commas are trimmed). `get-fields` and `get-transitions` are cursor-paginated: pass the previous response's `endingBefore` / `startingAfter` cursor as `--ending-before` / `--starting-after` to page back or forward. `--actions` is a comma-separated list of bulk-edit actions. `--value` is a JSON string: an object for `edit-fields` (`editedFieldsInput`), `move-issues` (`targetToSourcesMapping`), and `set-property` (the property value); an array for `transition-issues` (`bulkTransitionInputs`); and the raw provider payload for every DevOps `submit-*` variant. `set-property` takes exactly one of `--value` (a constant JSON value) or `--expression` (EXPERIMENTAL: a Jira expression, string, evaluated per issue with `issue` and `user` in context). `--filter` for `set-property` / `delete-property` is a JSON object restricting which issues are affected (`entityIds`, `currentValue`, `hasProperty`). `--send-notification true|false` (for `delete-issues`, `edit-fields`, `move-issues`, `transition-issues`) controls the bulk-change notification email; the server default is `true`, so pass `--send-notification false` to suppress it, omit for the default. Tri-state — the value is required.

`set-property` and `delete-property` run as an asynchronous Jira task (transactional: all eligible issues change, or none). Jira answers `303 See Other` to the task, which the CLI follows, and the command prints the task progress (`{ id, status, progress, self, ... }`). Poll it with `atlas jira task get <id>` until `status` is terminal (`COMPLETE`, `FAILED`, `CANCELLED` or `DEAD`) — not `bulk get-status`, which only tracks the `{ taskId }` jobs above.

**DevOps ingest payloads (`submit-*`).** `--value` is the full request body. Every body may also carry an optional `properties` object (string keys/values that `bulk-by-properties` and `exists-by-properties` can later match) and `providerMetadata: { product }`. The required root key, its item limit and the required fields of each item (Jira Software spec schema title in brackets):

| Action                     | Root key (items)                           | Required item fields                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `submit-builds`            | `builds` (1–100)                           | `pipelineId`, `buildNumber`, `updateSequenceNumber`, `displayName`, `url`, `state` (`pending`, `in_progress`, `successful`, `failed`, `cancelled`, `unknown`), `lastUpdated` [BuildData]                                                                                                                                                                                         |
| `submit-deployments`       | `deployments` (1–100)                      | `deploymentSequenceNumber`, `updateSequenceNumber`, `displayName`, `url`, `description`, `lastUpdated`, `state`, `pipeline` `{ id, displayName, url }`, `environment` `{ id, displayName, type }` [DeploymentData]                                                                                                                                                               |
| `submit-devinfo`           | `repositories` (up to 100)                 | `id`, `name`, `url`, `updateSequenceId`; optional `commits`, `branches`, `pullRequests` [Repository]                                                                                                                                                                                                                                                                             |
| `submit-devops-components` | `devopsComponents` (1–1000)                | `schemaVersion` (`"1.0"`), `id`, `updateSequenceNumber`, `name`, `description`, `url`, `avatarUrl`, `tier` (`Tier 1`–`Tier 4`), `componentType`, `lastUpdated` [Component]                                                                                                                                                                                                       |
| `submit-feature-flags`     | `flags` (1–100)                            | `id`, `key`, `updateSequenceId`, `summary` `{ status: { enabled }, lastUpdated }`, `details` `[{ url, lastUpdated, environment: { name }, status: { enabled } }]` [FeatureFlagData]                                                                                                                                                                                              |
| `submit-operations`        | `incidents` and/or `reviews` (1–1000 each) | incidents: `schemaVersion`, `id`, `updateSequenceNumber`, `summary`, `affectedComponents`, `description`, `url`, `createdDate`, `lastUpdated`, `status` (`open`, `resolved`, `unknown`) [Incident]; reviews: the same fields with `reviews` (incident IDs) instead of `affectedComponents`, and `status` (`in progress`, `outstanding actions`, `completed`, `unknown`) [Review] |
| `submit-remote-links`      | `remoteLinks` (1–100)                      | `id`, `updateSequenceNumber`, `displayName`, `url`, `type` (`document`, `alert`, `test`, `security`, `logFile`, `prototype`, `coverage`, `bugReport`, `other`), `lastUpdated` [RemoteLinkData]                                                                                                                                                                                   |
| `submit-security`          | `vulnerabilities` (1–1000)                 | `schemaVersion` (`"1.0"`), `id`, `updateSequenceNumber`, `containerId`, `displayName`, `description`, `url`, `type` (`sca`, `sast`, `dast`, `unknown`), `introducedDate`, `lastUpdated`, `severity` `{ level }`, `status` (`open`, `closed`, `ignored`, `unknown`) [Vulnerability details]                                                                                       |

Timestamps are ISO-8601 date-times; `updateSequenceNumber` / `updateSequenceId` are integers that must grow with every update of the same entity (an epoch-millisecond timestamp works). Link builds and feature flags to Jira issues with `issueKeys: ["PROJ-1"]`, deployments with `associations: [{"associationType":"issueKeys","values":["PROJ-1"]}]`. Optional fields are listed under the schema title in the Jira Software OpenAPI spec. The response lists the accepted and rejected entities (for example `acceptedBuilds` / `rejectedBuilds`) and any `unknownIssueKeys`.

DevOps ingest granular scopes follow the entity family: `write:build-info:jira`, `write:deployment-info:jira`, `write:dev-info:jira`, `write:feature-flag-info:jira`, `write:remote-link-info:jira`, and `write:security:jira` for the corresponding `submit-*` actions.

```sh
# Bulk create two issues (B518)
atlas jira bulk create-issues \
  --issues '[{"fields":{"project":{"key":"PROJ"},"summary":"Issue 1","issuetype":{"name":"Bug"}}},{"fields":{"project":{"key":"PROJ"},"summary":"Issue 2","issuetype":{"name":"Task"}}}]'

# Bulk delete two issues (--send-notification false suppresses the bulk email; omit for the server default of true)
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

# Bulk set a property on issues matching a filter (B526)
atlas jira bulk set-property my-flag \
  --value '{"owner":"admin","weight":100}' \
  --filter '{"entityIds":[10100,10002]}'

# Bulk set a property computed per issue by a Jira expression
atlas jira bulk set-property summary-copy --expression 'issue.summary'

# Bulk delete a property from issues matching a filter (B525)
atlas jira bulk delete-property my-flag \
  --filter '{"currentValue":"deprecated value"}'

# Bulk delete a property from ALL eligible issues (no filter)
atlas jira bulk delete-property my-flag

# Page through the available transitions with the returned cursor
atlas jira bulk get-transitions --issues EPIC-1,TASK-1 --starting-after '<startingAfter cursor>'

# Follow the task a bulk property change returned
atlas jira task get 10010

# DevOps ingest: one minimal item per action (all required fields present)
atlas jira bulk submit-builds --value '{"providerMetadata":{"product":"my-ci"},"builds":[{"pipelineId":"pipe-1","buildNumber":42,"updateSequenceNumber":1700000000000,"displayName":"Build 42","url":"https://ci.example.com/pipe-1/42","state":"successful","lastUpdated":"2026-11-08T10:00:00Z","issueKeys":["PROJ-1"]}]}'
atlas jira bulk submit-deployments --value '{"deployments":[{"deploymentSequenceNumber":7,"updateSequenceNumber":1700000000000,"displayName":"Deploy 7","url":"https://ci.example.com/deploy/7","description":"Release 1.2","lastUpdated":"2026-11-08T10:00:00Z","state":"successful","pipeline":{"id":"pipe-1","displayName":"Main","url":"https://ci.example.com/pipe-1"},"environment":{"id":"prod","displayName":"Production","type":"production"},"associations":[{"associationType":"issueKeys","values":["PROJ-1"]}]}]}'
atlas jira bulk submit-devinfo --value '{"repositories":[{"id":"repo-1","name":"my-repo","url":"https://git.example.com/my-repo","updateSequenceId":1700000000000}]}'
atlas jira bulk submit-devops-components --value '{"devopsComponents":[{"schemaVersion":"1.0","id":"comp-1","updateSequenceNumber":1,"name":"Payments API","description":"Card payments","url":"https://ops.example.com/comp-1","avatarUrl":"https://ops.example.com/comp-1.png","tier":"Tier 1","componentType":"Service","lastUpdated":"2026-11-08T10:00:00Z"}]}'
atlas jira bulk submit-feature-flags --value '{"flags":[{"id":"flag-1","key":"new-checkout","updateSequenceId":1,"issueKeys":["PROJ-1"],"summary":{"status":{"enabled":true},"lastUpdated":"2026-11-08T10:00:00Z"},"details":[{"url":"https://flags.example.com/new-checkout","lastUpdated":"2026-11-08T10:00:00Z","environment":{"name":"prod"},"status":{"enabled":true}}]}]}'
atlas jira bulk submit-operations --value '{"incidents":[{"schemaVersion":"1.0","id":"inc-1","updateSequenceNumber":1,"summary":"Checkout down","affectedComponents":["comp-1"],"description":"5xx on checkout","url":"https://ops.example.com/inc-1","createdDate":"2026-11-08T09:00:00Z","lastUpdated":"2026-11-08T10:00:00Z","status":"open"}]}'
atlas jira bulk submit-remote-links --value '{"remoteLinks":[{"id":"rl-1","updateSequenceNumber":1,"displayName":"Runbook","url":"https://docs.example.com/runbook","type":"document","lastUpdated":"2026-11-08T10:00:00Z"}]}'
atlas jira bulk submit-security --value '{"vulnerabilities":[{"schemaVersion":"1.0","id":"vuln-1","updateSequenceNumber":1,"containerId":"repo-1","displayName":"Outdated TLS library","description":"CVE in libssl","url":"https://sec.example.com/vuln-1","type":"sca","introducedDate":"2026-11-01T00:00:00Z","lastUpdated":"2026-11-08T10:00:00Z","severity":{"level":"high"},"status":"open"}]}'
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

## `config`

Config field association scheme management (B367–B381). Covers the `/rest/api/3/config/fieldschemes` surface: paginated listing, CRUD, clone, per-scheme field associations, per-field parameter overrides, and project association management.

**Note:** This resource is distinct from `fieldconfiguration` (`/rest/api/3/fieldconfiguration`) and `fieldconfigurationscheme` (`/rest/api/3/fieldconfigurationscheme`). It implements the newer field _association_ scheme API under `/rest/api/3/config/fieldschemes`.

**Paginated endpoints** (support `--start-at`, `--max-results`):

- `list` — GET /config/fieldschemes
- `list-fields` — GET /config/fieldschemes/{id}/fields
- `list-projects` — GET /config/fieldschemes/{id}/projects (optional `--project-ids` CSV; `--query` keeps only projects whose name, key or ID contains the text, case-insensitive)
- `get-projects-with-schemes` — GET /config/fieldschemes/projects (requires `--project-ids`)

**Body endpoints** (supply full JSON via `--body`):

- `remove-field-associations` — DELETE /config/fieldschemes/fields: `Record<fieldId, {schemeIds: number[]}>`
- `update-field-associations` — PUT /config/fieldschemes/fields: `Record<fieldId, [{schemeIds: number[], restrictedToWorkTypes?: number[]}]>`
- `remove-field-parameters` — DELETE /config/fieldschemes/fields/parameters: `Record<fieldId, [{schemeId?, workTypeIds?, parameters?}]>`
- `update-field-parameters` — PUT /config/fieldschemes/fields/parameters: `Record<fieldId, [{schemeIds?, parameters?, workTypeParameters?}]>`
- `associate-projects` — PUT /config/fieldschemes/projects: `Record<schemeId, {projectIds: number[]}>`

```sh
# List all schemes (paginated)
atlas jira config list --start-at 0 --max-results 50
atlas jira config list --project-ids 10100,10101 --query "My Scheme"

# CRUD
atlas jira config create --name "My Field Scheme" --description "Description"
atlas jira config get 10001
atlas jira config update 10001 --name "Renamed Scheme" --description "Updated"
atlas jira config delete 10001

# Clone a scheme
atlas jira config clone 10001 --name "Clone of My Scheme"

# List fields in a scheme (paginated)
atlas jira config list-fields 10001 --start-at 0 --max-results 50
atlas jira config list-fields 10001 --field-id customfield_10001,customfield_10002

# Get parameter overrides for a specific field in a scheme
atlas jira config get-field-parameters 10001 customfield_10001

# List projects associated with a scheme
atlas jira config list-projects 10001 --project-ids 10100,10101
atlas jira config list-projects 10001 --query billing

# Remove fields from schemes (body: fieldId → schemeIds map)
atlas jira config remove-field-associations --body '{"customfield_10001":{"schemeIds":[10001,10002]}}'

# Update field→scheme associations (body: fieldId → [{schemeIds, restrictedToWorkTypes?}])
atlas jira config update-field-associations --body '{"customfield_10001":[{"schemeIds":[10001],"restrictedToWorkTypes":[1,2]}]}'

# Remove per-field parameters from schemes
atlas jira config remove-field-parameters --body '{"customfield_10001":[{"schemeId":10001,"parameters":["description"],"workTypeIds":[1]}]}'

# Update per-field parameter overrides
atlas jira config update-field-parameters --body '{"customfield_10001":[{"schemeIds":[10001],"parameters":{"isRequired":true}}]}'

# Get project→scheme mappings for given projects (projectId required)
atlas jira config get-projects-with-schemes --project-ids 10100,10101

# Associate projects to a scheme (body: schemeId → {projectIds} map)
atlas jira config associate-projects --body '{"10001":{"projectIds":[10100,10101]}}'
```

## `plans`

Advanced Roadmaps plans management (B625–B640). Covers the `/rest/api/3/plans/plan` surface: cursor-paginated plan listing, CRUD, archive/trash/duplicate, and team management (Atlassian teams and plan-only teams).

**Pagination:** `list` and `list-teams` use cursor pagination (`--cursor`, `--max-results`).

**Update/patch endpoints (B628, B635, B639):** accept a JSON-patch object via `--body`.

**Enum values:**

- `--planning-style`: `Scrum`, `Kanban`
- `--scheduling` estimation: `StoryPoints`, `Days`, `Hours`
- `--scheduling` dependencies: `Sequential`, `Concurrent`
- `--scheduling` inferredDates: `None`, `SprintDates`, `ReleaseDates`

| Action                  | Positional                  | Required flags                                                         | Optional flags                                                                                                                  |
| ----------------------- | --------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `list`                  | —                           | —                                                                      | `--cursor`, `--max-results`, `--include-trashed`, `--include-archived`                                                          |
| `create`                | —                           | `--name`, `--issue-sources` (JSON array), `--scheduling` (JSON object) | `--use-group-id`, `--cross-project-releases`, `--custom-fields`, `--exclusion-rules`, `--lead-account-id`, `--plan-permissions` |
| `get`                   | `planId`                    | —                                                                      | `--use-group-id`                                                                                                                |
| `update`                | `planId`                    | `--body` (JSON-patch object)                                           | `--use-group-id`                                                                                                                |
| `archive`               | `planId`                    | —                                                                      | —                                                                                                                               |
| `duplicate`             | `planId`                    | `--name`                                                               | —                                                                                                                               |
| `trash`                 | `planId`                    | —                                                                      | —                                                                                                                               |
| `list-teams`            | `planId`                    | —                                                                      | `--cursor`, `--max-results`                                                                                                     |
| `add-atlassian-team`    | `planId`                    | `--atlassian-team-id`, `--planning-style`                              | `--capacity`, `--issue-source-id`, `--sprint-length`                                                                            |
| `delete-atlassian-team` | `planId`, `atlassianTeamId` | —                                                                      | —                                                                                                                               |
| `get-atlassian-team`    | `planId`, `atlassianTeamId` | —                                                                      | —                                                                                                                               |
| `update-atlassian-team` | `planId`, `atlassianTeamId` | `--body` (JSON-patch object)                                           | —                                                                                                                               |
| `create-plan-only-team` | `planId`                    | `--name`, `--planning-style`                                           | `--capacity`, `--issue-source-id`, `--member-account-ids` (CSV), `--sprint-length`                                              |
| `delete-plan-only-team` | `planId`, `planOnlyTeamId`  | —                                                                      | —                                                                                                                               |
| `get-plan-only-team`    | `planId`, `planOnlyTeamId`  | —                                                                      | —                                                                                                                               |
| `update-plan-only-team` | `planId`, `planOnlyTeamId`  | `--body` (JSON-patch object)                                           | —                                                                                                                               |

```sh
# List all plans (cursor pagination)
atlas jira plans list --max-results 50
atlas jira plans list --include-trashed --include-archived

# Get a plan
atlas jira plans get 10001
atlas jira plans get 10001 --use-group-id

# Create a plan (issueSources and scheduling are required)
atlas jira plans create --name "Q3 Plan" --issue-sources '[{"type":"Board","value":1}]' --scheduling '{"estimation":"StoryPoints","dependencies":"Sequential","startDate":{"type":"TargetStartDate"},"endDate":{"type":"TargetEndDate"}}'

# Duplicate a plan
atlas jira plans duplicate 10001 --name "Copy of Q3 Plan"

# Archive and trash
atlas jira plans archive 10001
atlas jira plans trash 10001

# Update a plan (JSON-patch)
atlas jira plans update 10001 --body '{"op":"replace","path":"/name","value":"Renamed Plan"}'

# List teams for a plan
atlas jira plans list-teams 10001 --max-results 20

# Add an Atlassian team
atlas jira plans add-atlassian-team 10001 --atlassian-team-id team-abc-123 --planning-style Scrum --sprint-length 14

# Get and delete an Atlassian team
atlas jira plans get-atlassian-team 10001 team-abc-123
atlas jira plans delete-atlassian-team 10001 team-abc-123

# Update an Atlassian team (JSON-patch)
atlas jira plans update-atlassian-team 10001 team-abc-123 --body '{"op":"replace","path":"/sprintLength","value":21}'

# Create a plan-only team
atlas jira plans create-plan-only-team 10001 --name "My Team" --planning-style Kanban --member-account-ids acc-1,acc-2

# Get and delete a plan-only team
atlas jira plans get-plan-only-team 10001 2001
atlas jira plans delete-plan-only-team 10001 2001

# Update a plan-only team (JSON-patch)
atlas jira plans update-plan-only-team 10001 2001 --body '{"op":"replace","path":"/name","value":"Renamed Team"}'
```

## `universal-avatar`

Manage and view avatars for projects, issue types, and priorities via
`/rest/api/3/universal_avatar` (B791–B796).

`type` ∈ `project`, `issuetype`, `priority`.
`size` (view) ∈ `xsmall`, `small`, `medium`, `large`, `xlarge`.
`image-format` ∈ `png`, `svg`.

| Action          | Positional                     | Required flags     | Optional flags                         |
| --------------- | ------------------------------ | ------------------ | -------------------------------------- |
| `list`          | `<type> <entityId>`            | —                  | —                                      |
| `store`         | `<type> <entityId>`            | `--file`, `--size` | `--x`, `--y`, `--media-type`           |
| `delete`        | `<type> <owningObjectId> <id>` | —                  | —                                      |
| `view-by-type`  | `<type>`                       | —                  | `--size`, `--image-format`, `--output` |
| `view-by-id`    | `<type> <id>`                  | —                  | `--size`, `--image-format`, `--output` |
| `view-by-owner` | `<type> <entityId>`            | —                  | `--size`, `--image-format`, `--output` |

- `list` returns `{ system: Avatar[], custom: Avatar[] }`.
- `store` reads `--file` from disk and sends the raw bytes (not multipart) with `Content-Type: image/png`, `image/jpeg` or `image/gif` — the only types Jira accepts. The type comes from the file extension (`.png`, `.jpg`/`.jpeg`, `.gif`); for another file name pass `--media-type image/png|image/jpeg|image/gif`. Any other extension or media type is rejected before the upload. `--size` sets the crop side length in px; `--x`/`--y` offset the crop origin (default 0). Returns the created `Avatar`.
- `delete` removes a custom avatar; `id` is the numeric avatar ID.
- `view-by-type` / `view-by-id` / `view-by-owner` fetch the image. Without `--output` the CLI prints `{ "bytes": N }`; with `--output <path>` it writes the image to that file and prints `{ "bytes": N, "path": "<path>" }`. It never overwrites: an existing file, a blank path or a missing directory makes the command fail before the download. `--output` works only on these three actions; any other command (including `issue-attachments download-*`) rejects it.
- `--size` and `--image-format` on view commands are advisory; the server uses its default when omitted.

```sh
# List system + custom avatars for a project
atlas jira universal-avatar list project 10001

# Upload a custom avatar (crop to a 48×48 square from top-left)
atlas jira universal-avatar store project 10001 --file ./icon.png --size 48

# Upload with explicit crop coordinates
atlas jira universal-avatar store issuetype 10001 --file ./icon.png --size 32 --x 8 --y 8

# Delete a custom avatar
atlas jira universal-avatar delete project 10001 1010

# Get the default issue-type avatar image (CLI prints byte count)
atlas jira universal-avatar view-by-type issuetype --size medium --image-format png

# Get a specific avatar image by ID
atlas jira universal-avatar view-by-id project 1010 --size small

# Save an avatar image to a file
atlas jira universal-avatar view-by-id project 1010 --image-format png --output ./avatar-1010.png

# Upload a file whose name has no image extension
atlas jira universal-avatar store project 10001 --file ./avatar-upload --media-type image/jpeg --size 48

# Get the avatar for a specific project owner
atlas jira universal-avatar view-by-owner project 10001 --image-format svg
```

## `ui-modifications`

UI modification management (B787–B790). Covers the `/rest/api/3/uiModifications` surface.
UI modifications can only be created/modified by Forge apps.

| Action     | Positional         | Required flags | Optional flags                                                 |
| ---------- | ------------------ | -------------- | -------------------------------------------------------------- |
| `list`     |                    |                | `--start-at`, `--max-results`, `--expand`                      |
| `list-all` |                    |                | `--max-results`, `--expand`                                    |
| `create`   |                    | `--name`       | `--data`, `--description`, `--contexts` (JSON array)           |
| `update`   | `uiModificationId` |                | `--name`, `--data`, `--description`, `--contexts` (JSON array) |
| `delete`   | `uiModificationId` |                |                                                                |

`--expand` accepts `data` and/or `contexts` (comma-separated).
`--contexts` is a JSON array (up to 1000) of context objects, e.g. `'[{"projectId":"10000","issueTypeId":"10000","viewType":"GIC"}]'`; anything other than an array is rejected before the request. Context fields:

- `viewType` — one of `GIC` (global issue create), `IssueView`, `IssueTransition`, `JSMRequestCreate` (Jira Service Management request create portal), `GICAgentView`, `IssueViewAgentView`, `IssueTransitionAgentView`.
- `projectId`, `issueTypeId` — IDs as strings. For the Jira and agent view types, `null` for `projectId`, `issueTypeId` or `viewType` is a wildcard (applies to all); each context may contain at most one wildcard.
- `portalId`, `requestTypeId` — required for `JSMRequestCreate` (wildcards do not apply there). On agent view types `requestTypeId` is optional and narrows the context to that request type; agent contexts must not set `portalId`.

```sh
# List UI modifications (first page)
atlas jira ui-modifications list

# List with expand options
atlas jira ui-modifications list --expand data,contexts

# Iterate all UI modifications
atlas jira ui-modifications list-all

# Create a UI modification (name is required)
atlas jira ui-modifications create --name "Reveal Story Points"

# Create with all optional fields
atlas jira ui-modifications create \
  --name "Reveal Story Points" \
  --description "Reveals Story Points field when any Sprint is selected." \
  --data '{"field":"Story Points","config":{"hidden":false}}' \
  --contexts '[{"projectId":"10000","issueTypeId":"10000","viewType":"GIC"}]'

# Update a UI modification (at least one field required)
atlas jira ui-modifications update d7dbda8a-6239-4b63-8e13-a5ef975c8e61 --name "Updated Name"

# Create for all issue types of one project in the issue view (issueTypeId wildcard)
atlas jira ui-modifications create --name "Hide field" \
  --contexts '[{"projectId":"10000","issueTypeId":null,"viewType":"IssueView"}]'

# Create for a Jira Service Management portal request type
atlas jira ui-modifications create --name "Portal tweak" \
  --contexts '[{"viewType":"JSMRequestCreate","portalId":"1","requestTypeId":"12"}]'

# Update with new contexts (replaces all existing contexts)
atlas jira ui-modifications update d7dbda8a-6239-4b63-8e13-a5ef975c8e61 \
  --contexts '[{"projectId":"10000","issueTypeId":"10001","viewType":"IssueView"}]'

# Delete a UI modification
atlas jira ui-modifications delete d7dbda8a-6239-4b63-8e13-a5ef975c8e61
```

## `permissions`

Global Jira permissions (B613-B615). Covers the `/rest/api/3/permissions` surface — distinct from `mypermissions` (user-scoped) and `permission-schemes` (scheme management).

| Action               | Positional | Required flags  | Optional flags                                                  |
| -------------------- | ---------- | --------------- | --------------------------------------------------------------- |
| `get-all`            | —          | —               | —                                                               |
| `check`              | —          | —               | `--account-id`, `--global-permissions`, `--project-permissions` |
| `permitted-projects` | —          | `--permissions` | —                                                               |

- `--account-id`: check permissions for a specific user (default: current user).
- `--global-permissions`: JSON array of global permission keys, e.g. `'["ADMINISTER"]'`.
- `--project-permissions`: JSON array of `{ permissions: string[], projects?: number[], issues?: number[] }` objects.
- `--permissions`: JSON array of project permission keys for `permitted-projects`, e.g. `'["BROWSE_PROJECTS"]'`.

```sh
# Get all Jira permissions (global + project + plugin) — B613
atlas jira permissions get-all

# Check which global permissions the current user has — B614
atlas jira permissions check --global-permissions '["ADMINISTER","USE"]'

# Check project permissions for a specific user — B614
atlas jira permissions check --account-id 5b10a2844c20165700ede21g \
  --global-permissions '["ADMINISTER"]' \
  --project-permissions '[{"permissions":["EDIT_ISSUES","BROWSE"],"projects":[10001],"issues":[10010]}]'

# Check permissions with no body (returns permissions for current user) — B614
atlas jira permissions check

# Get all projects where current user has BROWSE_PROJECTS — B615
atlas jira permissions permitted-projects --permissions '["BROWSE_PROJECTS"]'

# Get projects where user has multiple permissions — B615
atlas jira permissions permitted-projects --permissions '["BROWSE_PROJECTS","EDIT_ISSUES"]'
```

## `pipelines`

Jira Software Pipelines resource — builds and deployments at pipeline/environment level (B954, B955, B958, B959, B960). Spans two integration APIs: `/rest/builds/0.1` and `/rest/deployments/0.1`.

| Action                         | Positional                                      | Required flags | Optional flags |
| ------------------------------ | ----------------------------------------------- | -------------- | -------------- |
| `get-build`                    | `<pipelineId> <buildNumber>`                    | —              | —              |
| `delete-build`                 | `<pipelineId> <buildNumber>`                    | —              | —              |
| `get-deployment`               | `<pipelineId> <environmentId> <sequenceNumber>` | —              | —              |
| `delete-deployment`            | `<pipelineId> <environmentId> <sequenceNumber>` | —              | —              |
| `get-deployment-gating-status` | `<pipelineId> <environmentId> <sequenceNumber>` | —              | —              |

- `pipelineId`: string identifier of the pipeline.
- `environmentId`: string identifier of the target environment (deployments only).
- `buildNumber` / `sequenceNumber`: integer.
- OAuth granular scopes are `read:build-info:jira` / `delete:build-info:jira` for build reads/deletes and `read:deployment-info:jira` / `delete:deployment-info:jira` for deployment reads/deletes.
- `delete-build` / `delete-deployment` are asynchronous; confirm with the matching `get-*`. Jira no longer supports their `_updateSequenceNumber` guard, so both reject `--update-sequence-id`.

```sh
# Get a build — B955
atlas jira pipelines get-build pipeline-abc 42

# Delete a build (async, 202 Accepted) — B954
atlas jira pipelines delete-build pipeline-abc 42

# Get a deployment — B959
atlas jira pipelines get-deployment pipeline-abc env-prod 7

# Delete a deployment (async, 202 Accepted) — B958
atlas jira pipelines delete-deployment pipeline-abc env-prod 7

# Get deployment gating status — B960
atlas jira pipelines get-deployment-gating-status pipeline-abc env-prod 7
```

## `linked-workspaces`

Linked Workspaces — spans Operations and Security APIs (B984-B986, B995-B998).

Operations endpoints use base `/rest/operations/1.0`; Security endpoints use `/rest/security/1.0`.

| Action                   | Positional args | Required flags    | Optional flags |
| ------------------------ | --------------- | ----------------- | -------------- |
| `list-operations`        | —               | —                 | —              |
| `bulk-delete-operations` | —               | `--workspace-ids` | —              |
| `bulk-create-operations` | —               | `--workspace-ids` | —              |
| `list-security`          | —               | —                 | —              |
| `get-security`           | `<workspaceId>` | —                 | —              |
| `bulk-delete-security`   | —               | `--workspace-ids` | —              |
| `bulk-create-security`   | —               | `--workspace-ids` | —              |

- `--workspace-ids`: Comma-separated list of workspace IDs, e.g. `ws-1,ws-2` (spaces around commas are trimmed). `bulk-create-*` accepts 1–100 IDs per call.
- Security API actions require `read:security:jira`, `write:security:jira`, or `delete:security:jira` according to the operation. These are distinct from the Operations linked-workspace authorization model.

```sh
# List linked workspaces (Operations API) — B984
atlas jira linked-workspaces list-operations

# Bulk delete linked workspaces (Operations API) — B985
atlas jira linked-workspaces bulk-delete-operations --workspace-ids ws-1,ws-2

# Bulk create/link workspaces (Operations API) — B986
atlas jira linked-workspaces bulk-create-operations --workspace-ids ws-1,ws-2

# List linked workspaces (Security API) — B995
atlas jira linked-workspaces list-security

# Get a specific linked workspace by ID (Security API) — B996
atlas jira linked-workspaces get-security ws-1

# Bulk delete linked workspaces (Security API) — B997
atlas jira linked-workspaces bulk-delete-security --workspace-ids ws-1,ws-2

# Bulk create/link workspaces (Security API) — B998
atlas jira linked-workspaces bulk-create-security --workspace-ids ws-3,ws-4
```

## `bulk-by-properties`

Delete DevOps integration entities matching arbitrary property criteria across eight product APIs (B953, B957, B962, B968, B972, B981, B990, B994).

All eight actions share the same contract: `DELETE <product-base>/bulkByProperties` — 202 Accepted, async deletion, no response body.

| Action                     | Positional | Required flags | Optional flags         |
| -------------------------- | ---------- | -------------- | ---------------------- |
| `delete-builds`            | —          | `--properties` | —                      |
| `delete-deployments`       | —          | `--properties` | —                      |
| `delete-devinfo`           | —          | `--properties` | `--update-sequence-id` |
| `delete-devops-components` | —          | `--properties` | —                      |
| `delete-feature-flags`     | —          | `--properties` | —                      |
| `delete-operations`        | —          | `--properties` | —                      |
| `delete-remote-links`      | —          | `--properties` | —                      |
| `delete-security`          | —          | `--properties` | —                      |

- `--properties`: the properties to match, sent as query params with AND logic (all must match): comma-separated `key=value` pairs (`accountId=account-123` or `accountId=acc-1,environment=prod`), or a JSON object when a value contains a comma (`--properties '{"tags":"a,b"}'`; values are strings or numbers). A repeated key is rejected rather than silently replacing the first; an empty key or an empty value is rejected too.
- `--update-sequence-id <n>` (`delete-devinfo` only) — positive integer, sent as `_updateSequenceId`: only dev-info data with an `updateSequenceId` less than or equal to it is deleted. Every other action rejects it: Jira no longer supports the guard on feature flags, builds, deployments and remote links, and the security, operations and DevOps-component deletes never had one.
- Granular delete scopes match the entity family. In particular, `delete-security` requires `delete:security:jira`; builds, deployments, dev info, feature flags, and remote links use their respective `delete:*` scope.

```sh
# Delete builds associated with a specific account — B953
atlas jira bulk-by-properties delete-builds --properties accountId=account-123

# Delete deployments matching two property criteria — B957
atlas jira bulk-by-properties delete-deployments --properties accountId=account-123,environment=prod

# Delete development information entities — B962
atlas jira bulk-by-properties delete-devinfo --properties accountId=account-123

# Delete dev info only up to update sequence 42
atlas jira bulk-by-properties delete-devinfo --properties accountId=account-123 --update-sequence-id 42

# Delete DevOps component entities — B968
atlas jira bulk-by-properties delete-devops-components --properties accountId=account-123

# Delete feature flag entities — B972
atlas jira bulk-by-properties delete-feature-flags --properties accountId=account-123

# Delete operations entities — B981
atlas jira bulk-by-properties delete-operations --properties accountId=account-123

# Delete remote link entities — B990
atlas jira bulk-by-properties delete-remote-links --properties accountId=account-123

# Delete security entities — B994
atlas jira bulk-by-properties delete-security --properties accountId=account-123

# Match a value that contains a comma (JSON object form)
atlas jira bulk-by-properties delete-builds --properties '{"accountId":"account-123","tags":"nightly,arm64"}'
```

## `migration`

Connect-to-Forge issue field migration and app migration helpers under `/rest/atlassian-connect/1/migration` (B946–B950).

**Important:** `update-fields` (B948), `update-properties` (B949), and `search-workflow-rules` (B950) require the `--transfer-id` flag (UUID) — the Atlassian migration transfer context identifier sent as the `Atlassian-Transfer-Id` request header.

| Action                  | Positional                            | Required flags                                                    | Optional flags                    |
| ----------------------- | ------------------------------------- | ----------------------------------------------------------------- | --------------------------------- |
| `get-task`              | `<connectKey>` `<jiraIssueFieldsKey>` | —                                                                 | —                                 |
| `submit-task`           | `<connectKey>` `<jiraIssueFieldsKey>` | —                                                                 | `--retrigger-completed-migration` |
| `update-fields`         | —                                     | `--transfer-id`, `--update-value-list` (JSON array)               | —                                 |
| `update-properties`     | `<entityType>`                        | `--transfer-id`, `--value` (JSON array)                           | —                                 |
| `search-workflow-rules` | —                                     | `--transfer-id`, `--workflow-entity-id`, `--rule-ids` (CSV UUIDs) | `--expand`                        |

- `<entityType>` for `update-properties`: one of `IssueProperty`, `CommentProperty`, `DashboardItemProperty`, `IssueTypeProperty`, `ProjectProperty`, `UserProperty`, `WorklogProperty`, `BoardProperty`, `SprintProperty`; any other value is rejected before the request.
- `--update-value-list`: JSON array (values of up to 200 custom fields per call) of `ConnectCustomFieldValue` objects. Each needs `_type`, `fieldID` (custom field ID, integer) and `issueID` (integer), plus the value field that matches `_type`:

  | `_type`                                           | Value field         |
  | ------------------------------------------------- | ------------------- |
  | `StringIssueField`                                | `string` (string)   |
  | `NumberIssueField`                                | `number` (number)   |
  | `RichTextIssueField`                              | `richText` (string) |
  | `TextIssueField`                                  | `text` (string)     |
  | `SingleSelectIssueField`, `MultiSelectIssueField` | `optionID` (string) |

- `--value` (for `update-properties`): JSON array of 1–50 `EntityPropertyDetails` objects — each with `entityId` (number), `key` (string), `value` (string).
- `search-workflow-rules`: `--rule-ids` takes 1–10 rule UUIDs (comma-separated; more than 10 is rejected); `--expand transition` adds each rule's transition to the response.

```sh
# Get Connect-to-Forge migration task status — B946
atlas jira migration get-task com.example.app my-custom-field

# Submit Connect-to-Forge migration task — B947
atlas jira migration submit-task com.example.app my-custom-field

# Run a completed migration again
atlas jira migration submit-task com.example.app my-custom-field --retrigger-completed-migration

# Bulk update custom field values on issues — B948
atlas jira migration update-fields \
  --transfer-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --update-value-list '[{"_type":"StringIssueField","issueID":10001,"fieldID":10076,"string":"new value"}]'

# Bulk update entity properties — B949
atlas jira migration update-properties IssueProperty \
  --transfer-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --value '[{"entityId":123,"key":"mykey","value":"newValue"}]'

# Update a number field and a single-select field in one call
atlas jira migration update-fields \
  --transfer-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --update-value-list '[{"_type":"NumberIssueField","issueID":10001,"fieldID":10077,"number":5},{"_type":"SingleSelectIssueField","issueID":10001,"fieldID":10078,"optionID":"10100"}]'

# Search workflow transition rule configurations — B950
atlas jira migration search-workflow-rules \
  --transfer-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --workflow-entity-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --rule-ids 55d44f1d-c859-42e5-9c27-2c5ec3f340b1,66e55f2e-d960-539f-9d38-3d6dd7541fc2 \
  --expand transition
```
