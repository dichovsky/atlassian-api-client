# Jira — Admin, config, and DevOps surfaces

> Part of the `atlas` Jira skill reference. Resource×action matrix and routing in [`../jira.md`](../jira.md).

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

| Action   | Positional | Required flags | Optional flags                                            |
| -------- | ---------- | -------------- | --------------------------------------------------------- |
| `get`    | —          | —              | —                                                         |
| `update` | —          | —              | `--message`, `--visibility`, `--dismissible`, `--enabled` |

- `--visibility` must be `PUBLIC` or `PRIVATE`.
- `--dismissible` (boolean flag) — whether users can dismiss the banner.
- `--enabled` (boolean flag) — whether the banner is currently displayed.
- All `update` fields are optional — supply only the fields you want to change.

```sh
# Get the current announcement banner
atlas jira announcement-banner get

# Update the banner message
atlas jira announcement-banner update --message "Scheduled maintenance tonight at 22:00 UTC"

# Set the banner to private and change message
atlas jira announcement-banner update --message "Internal notice" --visibility PRIVATE
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
- `refresh` calls `PUT /rest/api/3/webhook/refresh`. `--webhook-ids` is a JSON array of numeric webhook IDs (e.g. `[10000,10001]`). Extends webhook expiry by 30 days.
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

## `forge`

| Action              | Positional | Required flags           | Optional flags |
| ------------------- | ---------- | ------------------------ | -------------- |
| `bulk-panel-action` | —          | `--module-id`, `--value` | —              |

- Pins or unpins a Forge issue panel across a batch of projects. This is a **project-level** operation, not a per-issue one.
- `--module-id` — the moduleId of the Forge panel, in the format `ari:cloud:ecosystem::extension/{app-id}/{environment-id}/static/{module-key}`. Required.
- `--value` — JSON array of project pin action objects; each must have `action` (`"PIN"` or `"UNPIN"`) and `projectIdOrKey` (string).
- **Auth:** Requires OAuth 2.0 (3LO) with `manage:jira-configuration` scope. Basic auth (API token) is NOT accepted. Use `--auth-type bearer --token <OAUTH_TOKEN>`.
- **URL base:** `POST /rest/api/3/forge/panel/action/bulk/async` — uses the standard REST API base, not a Forge tunnel.
- Returns a `taskId` that can be used to poll for task completion.
- The Forge app must be installed on the Jira site before this endpoint is usable.

```sh
# Pin a Forge panel to one project and unpin it from another
atlas jira forge bulk-panel-action --module-id 'ari:cloud:ecosystem::extension/app-id/env-id/static/my-panel' --value '[{"action":"PIN","projectIdOrKey":"PROJ"},{"action":"UNPIN","projectIdOrKey":"OTHER"}]'
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
| `start`      | —          | `--value`      | —              |
| `get-status` | `<jobId>`  | —              | —              |

- `start` calls `POST /rest/api/3/redact` to begin an asynchronous issue redaction job. Returns the job ID as a **bare UUID string**. **Admin-only endpoint.**
- `get-status` calls `GET /rest/api/3/redact/status/{jobId}` to check progress. Returns `{ jobStatus, bulkRedactionResponse }` where `jobStatus` is `PENDING`, `IN_PROGRESS`, or `COMPLETED`.
- `--value` — JSON array of redaction objects. Each object requires:
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

## `repository`

**URL base:** `/rest/devinfo/0.10` (Jira Development Information API — not `/rest/api/3`).

| Action          | Positional                               | Required flags | Optional flags         |
| --------------- | ---------------------------------------- | -------------- | ---------------------- |
| `get`           | `<repositoryId>`                         | —              | —                      |
| `delete`        | `<repositoryId>`                         | —              | `--update-sequence-id` |
| `delete-entity` | `<repositoryId> <entityType> <entityId>` | —              | `--update-sequence-id` |

```sh
# Get a repository and its associated dev-info entities
atlas jira repository get my-repo-123

# Delete a repository and all its dev-info entities
atlas jira repository delete my-repo-123

# Delete with sequential update ordering
atlas jira repository delete my-repo-123 --update-sequence-id 42

# Delete a specific entity (commit, branch, pullRequest) from a repository
atlas jira repository delete-entity my-repo-123 commit abc123

# Delete a specific pull request entity with update sequence ID
atlas jira repository delete-entity my-repo-123 pullRequest pr-1 --update-sequence-id 42
```

## `dashboards`

`list`, `get`, `delete` take only `<dashboardId>` (plus `listAll()` generator pagination over `GET /dashboard`). `create` requires `--name` and `--share-permissions` (a JSON array of share-permission objects, e.g. `'[{"type":"global"}]'`), with optional `--description` and `--edit-permissions` (JSON); `update <dashboardId>` takes the same flags. The actions below add the rest of the platform's dashboard surface (B391–B405).

```sh
atlas jira dashboards create --name "Team board" --share-permissions '[{"type":"global"}]' --description "Sprint health"
atlas jira dashboards update 10001 --name "Renamed" --share-permissions '[{"type":"authenticated"}]'
```

| Action                   | Positional                             | Required flags                   | Optional flags                                                                                                                                                   |
| ------------------------ | -------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create`                 | —                                      | `--name`, `--share-permissions` (JSON) | `--description`, `--edit-permissions` (JSON)                                                                                                                     |
| `update`                 | `<dashboardId>`                        | `--name`, `--share-permissions` (JSON) | `--description`, `--edit-permissions` (JSON)                                                                                                                     |
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
| `list-available-gadgets` | —                                      | —                                | —                                                                                                                                                                |
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
- DevOps ingest endpoints use their own bases — `builds 0.1`, `deployments 0.1`, `devinfo 0.10`, `devopscomponents 1.0`, `featureflags 0.1`, `operations 1.0`, `remotelinks 1.0`, `security 1.0`.

| Action                     | Positional      | Required flags                     | Optional flags                                         |
| -------------------------- | --------------- | ---------------------------------- | ------------------------------------------------------ |
| `create-issues`            | —               | `--issues`                         | —                                                      |
| `delete-issues`            | —               | `--issues`                         | `--send-notification`                                  |
| `get-fields`               | —               | `--issues`                         | `--search-text`, `--ending-before`, `--starting-after` |
| `edit-fields`              | —               | `--issues`, `--actions`, `--value` | `--send-notification`                                  |
| `move-issues`              | —               | `--value`                          | `--send-notification`                                  |
| `get-transitions`          | —               | `--issues`                         | —                                                      |
| `transition-issues`        | —               | `--value`                          | `--send-notification`                                  |
| `unwatch-issues`           | —               | `--issues`                         | —                                                      |
| `watch-issues`             | —               | `--issues`                         | —                                                      |
| `get-status`               | `<taskId>`      | —                                  | —                                                      |
| `set-property`             | `<propertyKey>` | `--value`                          | `--filter`                                             |
| `delete-property`          | `<propertyKey>` | —                                  | `--filter`                                             |
| `submit-builds`            | —               | `--value`                          | —                                                      |
| `submit-deployments`       | —               | `--value`                          | —                                                      |
| `submit-devinfo`           | —               | `--value`                          | —                                                      |
| `submit-devops-components` | —               | `--value`                          | —                                                      |
| `submit-feature-flags`     | —               | `--value`                          | —                                                      |
| `submit-operations`        | —               | `--value`                          | —                                                      |
| `submit-remote-links`      | —               | `--value`                          | —                                                      |
| `submit-security`          | —               | `--value`                          | —                                                      |

`--issues` accepts either a JSON array of issue-update objects (for `create-issues`, where each element is `{ fields: {...}, update?: {...} }`) or a comma-separated list of issue IDs/keys (for `delete-issues`, `get-fields`, `unwatch-issues`, `watch-issues`, `get-transitions`). `--actions` is a comma-separated list of bulk-edit actions. `--value` is a JSON string: an object for `edit-fields` (`editedFieldsInput`), `move-issues` (`targetToSourcesMapping`), and `set-property` (the property value); an array for `transition-issues` (`bulkTransitionInputs`); and the raw provider payload for every DevOps `submit-*` variant. `--filter` for `set-property` / `delete-property` is a JSON object restricting which issues are affected (`entityIds`, `currentValue`, `hasProperty`).

```sh
# Bulk create two issues (B518)
atlas jira bulk create-issues \
  --issues '[{"fields":{"project":{"key":"PROJ"},"summary":"Issue 1","issuetype":{"name":"Bug"}}},{"fields":{"project":{"key":"PROJ"},"summary":"Issue 2","issuetype":{"name":"Task"}}}]'

# Bulk delete two issues (add --send-notification to force notifications; omit for the server default)
atlas jira bulk delete-issues --issues 10001,10002

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

# Bulk delete a property from issues matching a filter (B525)
atlas jira bulk delete-property my-flag \
  --filter '{"currentValue":"deprecated value"}'

# Bulk delete a property from ALL eligible issues (no filter)
atlas jira bulk delete-property my-flag

# DevOps ingest examples (payload shape is provider-specific)
atlas jira bulk submit-builds --value '{"providerMetadata":{"product":"my-ci"},"builds":[]}'
atlas jira bulk submit-deployments --value '{"deployments":[]}'
atlas jira bulk submit-feature-flags --value '{"flags":[]}'
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
- `list-projects` — GET /config/fieldschemes/{id}/projects
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

| Action          | Positional                     | Required flags     | Optional flags             |
| --------------- | ------------------------------ | ------------------ | -------------------------- |
| `list`          | `<type> <entityId>`            | —                  | —                          |
| `store`         | `<type> <entityId>`            | `--file`, `--size` | `--x`, `--y`               |
| `delete`        | `<type> <owningObjectId> <id>` | —                  | —                          |
| `view-by-type`  | `<type>`                       | —                  | `--size`, `--image-format` |
| `view-by-id`    | `<type> <id>`                  | —                  | `--size`, `--image-format` |
| `view-by-owner` | `<type> <entityId>`            | —                  | `--size`, `--image-format` |

- `list` returns `{ system: Avatar[], custom: Avatar[] }`.
- `store` reads `--file` from disk, sends raw binary bytes (`*/*`) — NOT multipart. `--size` sets the crop side length in px; `--x`/`--y` offset the crop origin (default 0). Returns the created `Avatar`.
- `delete` removes a custom avatar; `id` is the numeric avatar ID.
- `view-by-type` / `view-by-id` / `view-by-owner` return binary image bytes. The CLI prints `{ "bytes": N }` — use the SDK (`client.universalAvatar.getAvatarImageByType(...)`) when you need the actual `ArrayBuffer`.
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
`--contexts` accepts a JSON array of context objects, e.g. `'[{"projectId":"10000","issueTypeId":"10000","viewType":"GIC"}]'`.

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

- `--workspace-ids`: Comma-separated list of workspace IDs, e.g. `ws-1,ws-2`.

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

| Action                     | Positional | Required flags |
| -------------------------- | ---------- | -------------- |
| `delete-builds`            | —          | `--properties` |
| `delete-deployments`       | —          | `--properties` |
| `delete-devinfo`           | —          | `--properties` |
| `delete-devops-components` | —          | `--properties` |
| `delete-feature-flags`     | —          | `--properties` |
| `delete-operations`        | —          | `--properties` |
| `delete-remote-links`      | —          | `--properties` |
| `delete-security`          | —          | `--properties` |

- `--properties`: comma-separated `key=value` pairs sent as query params. Multiple pairs use AND logic (all must match). E.g. `accountId=account-123` or `accountId=acc-1,environment=prod`.

```sh
# Delete builds associated with a specific account — B953
atlas jira bulk-by-properties delete-builds --properties accountId=account-123

# Delete deployments matching two property criteria — B957
atlas jira bulk-by-properties delete-deployments --properties accountId=account-123,environment=prod

# Delete development information entities — B962
atlas jira bulk-by-properties delete-devinfo --properties accountId=account-123

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
```

## `migration`

Connect-to-Forge issue field migration and app migration helpers under `/rest/atlassian-connect/1/migration` (B946–B950).

**Important:** `update-fields` (B948), `update-properties` (B949), and `search-workflow-rules` (B950) require the `--transfer-id` flag (UUID) — the Atlassian migration transfer context identifier sent as the `Atlassian-Transfer-Id` request header.

| Action                  | Positional                            | Required flags                                                    | Optional flags |
| ----------------------- | ------------------------------------- | ----------------------------------------------------------------- | -------------- |
| `get-task`              | `<connectKey>` `<jiraIssueFieldsKey>` | —                                                                 | —              |
| `submit-task`           | `<connectKey>` `<jiraIssueFieldsKey>` | —                                                                 | —              |
| `update-fields`         | —                                     | `--transfer-id`, `--update-value-list` (JSON array)               | —              |
| `update-properties`     | `<entityType>`                        | `--transfer-id`, `--value` (JSON array)                           | —              |
| `search-workflow-rules` | —                                     | `--transfer-id`, `--workflow-entity-id`, `--rule-ids` (CSV UUIDs) | `--expand`     |

- `<entityType>` for `update-properties`: one of `IssueProperty`, `CommentProperty`, `DashboardItemProperty`, `IssueTypeProperty`, `ProjectProperty`, `UserProperty`, `WorklogProperty`, `BoardProperty`, `SprintProperty`.
- `--update-value-list`: JSON array of `ConnectCustomFieldValue` objects (see spec schema `ConnectCustomFieldValue`).
- `--value` (for `update-properties`): JSON array of `EntityPropertyDetails` objects — each with `entityId` (number), `key` (string), `value` (string).

```sh
# Get Connect-to-Forge migration task status — B946
atlas jira migration get-task com.example.app my-custom-field

# Submit Connect-to-Forge migration task — B947
atlas jira migration submit-task com.example.app my-custom-field

# Bulk update custom field values on issues — B948
atlas jira migration update-fields \
  --transfer-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --update-value-list '[{"_type":"StringIssueField","issueID":10001,"fieldID":10076,"string":"new value"}]'

# Bulk update entity properties — B949
atlas jira migration update-properties IssueProperty \
  --transfer-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --value '[{"entityId":123,"key":"mykey","value":"newValue"}]'

# Search workflow transition rule configurations — B950
atlas jira migration search-workflow-rules \
  --transfer-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --workflow-entity-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --rule-ids 55d44f1d-c859-42e5-9c27-2c5ec3f340b1,66e55f2e-d960-539f-9d38-3d6dd7541fc2
```
