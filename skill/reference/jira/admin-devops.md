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
| `get-field-context-configuration`    | `<fieldIdOrKey>` | —                     | —                                               |
| `update-field-context-configuration` | `<fieldIdOrKey>` | `--id`                | `--configuration`, `--schema`                   |
| `update-field-value`                 | `<fieldIdOrKey>` | `--value`             | `--generate-changelog`, `--generate-app-events` |
| `list-field-context-configurations`  | —                | `--field-ids-or-keys` | `--context-ids`                                 |
| `bulk-update-field-value`            | —                | `--value`             | `--generate-changelog`, `--generate-app-events` |
| `get-dynamic-modules`                | —                | —                     | —                                               |
| `register-dynamic-modules`           | —                | `--value`             | —                                               |
| `delete-dynamic-modules`             | —                | —                     | `--module-keys`                                 |
| `list-forge-properties`              | —                | —                     | —                                               |
| `get-forge-property`                 | `<propertyKey>`  | —                     | —                                               |
| `set-forge-property`                 | `<propertyKey>`  | `--value`             | —                                               |
| `delete-forge-property`              | `<propertyKey>`  | —                     | —                                               |

- `update-field-context-configuration` sends the spec body `{ configurations: [{ id, configuration?, schema? }] }`; `--id` is the required configuration ID. `--configuration` and `--schema` accept opaque JSON (stored verbatim).
- `--value` for `update-field-value` is a JSON array of `{ issueIds, value }` entries (spec `CustomFieldValueUpdate`; `issueIds` is required).
- `--value` for `bulk-update-field-value` is a JSON array of flat `{ customField, issueIds, value }` entries (spec `MultipleCustomFieldValuesUpdate`).
- `--generate-changelog true|false` and `--generate-app-events true|false` (`update-field-value`, `bulk-update-field-value`) are tri-state: both default to `true` on the server, so pass `false` to skip the issue changelog entry or to suppress app events and webhooks (no other app then sees an "issue updated" event); omit for the default. The value is required.
- `--value` for `register-dynamic-modules` is a JSON array of Connect module descriptors (each `{ key, type, ... }`).
- `--value` for `set-forge-property` is any JSON value (stored verbatim and returned as-is by `get-forge-property`).
- `--module-keys` is comma-separated. When omitted, `delete-dynamic-modules` removes every dynamic module registered by the calling app.
- `--field-ids-or-keys` and `--context-ids` are comma-separated. `--field-ids-or-keys` is required for `list-field-context-configurations`; `--context-ids` is an optional filter that maps to the spec `fieldContextId` query param.

```sh
# Read the configuration the app stored for one of its custom fields
atlas jira app get-field-context-configuration customfield_10042

# Update a configuration (by its id) with new JSON (and optionally the schema)
atlas jira app update-field-context-configuration customfield_10042 \
  --id 10000 --configuration '{"foo":true}' --schema '{"type":"object"}'

# Set a single field on a batch of issues
atlas jira app update-field-value customfield_10042 \
  --value '[{"issueIds":[10001,10002],"value":"hello"}]'

# Fetch configurations for a set of (field, context) pairs
atlas jira app list-field-context-configurations \
  --field-ids-or-keys customfield_10042 --context-ids 10100,10101

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
- `--ids` is a **comma-separated** list of project IDs to filter by. Omit to return all projects.

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
- `select-timetracking --key <key>` switches the active provider; `--name` may be supplied for third-party providers. The provider's `url` is read-only (returned by `get-timetracking`), so it is not sent.
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

- **App-only:** Jira accepts `list`, `register`, `refresh` and `delete` only from Connect and OAuth 2.0 apps, and `list-failed` only from Connect apps. A user API token (the default `basic` auth) is rejected; use `ATLASSIAN_AUTH_TYPE=bearer` with the OAuth 2.0 app's access token. `list-failed` needs Connect JWT auth, which the CLI does not provide (SDK only).
- Webhooks registered through the REST API expire after 30 days; `refresh` them before then. For non-public OAuth apps, Jira delivers a webhook only if the user who registered it owns the app.
- `list` calls `GET /rest/api/3/webhook` and returns a paginated list of registered webhooks for the calling app.
- `register` calls `POST /rest/api/3/webhook`. `--webhooks` is a JSON array of `{ jqlFilter, events, fieldIdsFilter?, issuePropertyKeysFilter? }` objects.
  `events` values: `jira:issue_created`, `jira:issue_updated`, `jira:issue_deleted`, `comment_created`, `comment_updated`, `comment_deleted`, `issue_property_set`, `issue_property_deleted`, `sprint_created`, `sprint_updated`, `sprint_closed`, `sprint_deleted`, `sprint_started`, `jira:version_released`, `jira:version_unreleased`, `jira:version_created`, `jira:version_moved`, `jira:version_updated`, `jira:version_merged`, `jira:version_deleted`.
  Each `--webhooks` entry must be a JSON object whose `events` is an array of these values; anything else is refused before sending.
- `refresh` calls `PUT /rest/api/3/webhook/refresh`. `--webhook-ids` is a JSON array of integer webhook IDs (e.g. `[10000,10001]`; other element types are refused before sending, on `delete` too). Extends webhook expiry and returns `{ expirationDate }` (milliseconds since epoch, int64).
- `list-failed` calls `GET /rest/api/3/webhook/failed` and returns a page of failed webhook deliveries.
- `delete` calls `DELETE /rest/api/3/webhook`. `--webhook-ids` is a JSON array of numeric webhook IDs to remove permanently.
- `--after` accepts a Unix timestamp in **milliseconds** (e.g. `--after 1700000000000`). Only deliveries with a failure time after this value are returned.
- `--max-results` caps the number of results in a single page.
- The SDK exposes `listFailed()` (single page) and `listAllFailed()` (async generator) on `client.webhooks`.
- `list-failed` returns a `FailedWebhooks` page `{ maxResults, next?, values }`, oldest failure first, and keeps failures for about 72 hours. For the next page pass the last entry's `failureTime` as `--after` (the CLI cannot follow the `next` URL); there is no `startAt`/`isLast`/`total`.

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
| `bulk-pin-status`   | —          | `--module-id`, `--value` | —              |

`bulk-panel-action` details:

- Pins or unpins a Forge issue panel across a batch of projects. This is a **project-level** operation, not a per-issue one.
- `--module-id` — the moduleId of the Forge panel, in the format `ari:cloud:ecosystem::extension/{app-id}/{environment-id}/static/{module-key}`. Required.
- `--value` — JSON array of project pin action objects; each must have `action` (`"PIN"` or `"UNPIN"`) and `projectIdOrKey` (string).
- **Auth:** Requires OAuth 2.0 (3LO) with `manage:jira-configuration` scope. Basic auth (API token) is NOT accepted. Set `ATLASSIAN_AUTH_TYPE=bearer` and provide the OAuth access token through `ATLASSIAN_API_TOKEN`; never pass the token in a CLI flag.
- **URL base:** `POST /rest/api/3/forge/panel/action/bulk/async` — uses the standard REST API base, not a Forge tunnel.
- Returns a `taskId` that can be used to poll for task completion.
- The Forge app must be installed on the Jira site before this endpoint is usable.

`bulk-pin-status` details:

- Reads whether a Forge issue panel is pinned to each of up to 1000 projects (`POST /rest/api/3/forge/panel/action/bulk/status`). Read-only and synchronous (no task to poll); needs the **Administer Jira** global permission.
- `--module-id` — same moduleId format as above. Required.
- `--value` — JSON array of project IDs or keys, **strings only**: `'["PROJ","10001"]'`. Required.
- Returns `{ moduleId, statuses: [{ projectIdOrKey, pinned, pinnedAt, error }] }`, one entry per requested project; `pinnedAt` is epoch milliseconds. An unknown or inaccessible project comes back with `pinned: false` and the reason in `error` — the request itself still succeeds.

```sh
# Pin a Forge panel to one project and unpin it from another
atlas jira forge bulk-panel-action --module-id 'ari:cloud:ecosystem::extension/app-id/env-id/static/my-panel' --value '[{"action":"PIN","projectIdOrKey":"PROJ"},{"action":"UNPIN","projectIdOrKey":"OTHER"}]'

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
- `set-project-policies` calls `PUT /rest/api/3/policies/project/{projectIdOrKey}/policies` and **replaces** the project's complete policy set (a project can hold at most one policy). `--body` is `'{"policyIds":["<policyId>"]}'`; `'{"policyIds":[]}'` clears the set. Prints `{"updated":true}`.
- `validate-project` calls `POST /rest/api/3/policies/project/{projectIdOrKey}/validate` with the same `--body` shape and checks whether the policies could be applied, without applying them. Prints `{"valid":true}` on success.
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

**URL base:** `/rest/featureflags/0.1` (Jira Software DevInfo Feature Flags API — not `/rest/api/3`). This tenant base is used for lookup/deletion; system-to-system `bulk submit-feature-flags` ingestion uses `/jira/featureflags/0.1/cloud/{cloudId}/bulk` when proxy routing is enabled.

| Action   | Positional        | Required flags | Optional flags |
| -------- | ----------------- | -------------- | -------------- |
| `get`    | `<featureFlagId>` | —              | —              |
| `delete` | `<featureFlagId>` | —              | —              |

- Feature flag entities are stored via the Jira DevInfo API when CI/CD tools push flag state to Jira.
- Requires an app credential accepted by this integration API. Current granular OAuth scopes are `read:feature-flag-info:jira` for `get` and `delete:feature-flag-info:jira` for `delete`.

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

This resource exposes the internal bulk worklog **lookup** endpoint (`getWorklogsByIssueIdAndWorklogId`) — it resolves worklogs by `(issueId, worklogId)` pairs, it does not create them. Stability is not guaranteed by Atlassian.

| Action         | Positional | Required flags | Optional flags |
| -------------- | ---------- | -------------- | -------------- |
| `bulk-worklog` | —          | `--value`      | —              |

- `--value` must be a JSON array of `{ issueId, worklogId }` integer pairs to look up.

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

- OAuth granular scopes: `get` requires `read:dev-info:jira`; both delete actions require `delete:dev-info:jira`.

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

`list` accepts only `--filter` (`my` or `favourite`), `--start-at`, and `--max-results`; the removed `--order-by` and `--expand` flags are rejected with migration guidance because sorting and expansion belong to `search`. `get` and `delete` take `<dashboardId>`. `create`, `update <dashboardId>` and `copy <dashboardId>` send the spec `DashboardDetails` body, which requires all three of `--name`, `--share-permissions` and `--edit-permissions` (JSON arrays of share-permission objects; `'[]'` grants nobody beyond the owner); the CLI refuses a missing one before sending anything. `update` replaces the name, description and both permission lists, so pass the current values you want to keep. `--extend-admin-permissions true|false` on `create`/`update`/`copy` is sent as the `extendAdminPermissions` query param: `true` lets a user with the _Administer Jira_ global permission edit dashboards they do not own; omit it for the default (`false`). The actions below add the rest of the platform's dashboard surface (B391–B405).

| Action                   | Positional                             | Required flags                                                                                                                | Optional flags                                                                                                                                                   |
| ------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`                   | —                                      | —                                                                                                                             | `--filter`, `--start-at`, `--max-results`                                                                                                                        |
| `get`                    | `<dashboardId>`                        | —                                                                                                                             | —                                                                                                                                                                |
| `create`                 | —                                      | `--name`, `--share-permissions` (JSON), `--edit-permissions` (JSON)                                                           | `--description`, `--extend-admin-permissions`                                                                                                                    |
| `update`                 | `<dashboardId>`                        | `--name`, `--share-permissions` (JSON), `--edit-permissions` (JSON)                                                           | `--description`, `--extend-admin-permissions`                                                                                                                    |
| `delete`                 | `<dashboardId>`                        | —                                                                                                                             | —                                                                                                                                                                |
| `list-gadgets`           | `<dashboardId>`                        | —                                                                                                                             | `--module-key` (csv), `--uri` (csv), `--gadget-id` (csv ints)                                                                                                    |
| `add-gadget`             | `<dashboardId>`                        | —                                                                                                                             | `--module-key` or `--uri`, `--color`, `--row` + `--column`, `--title`, `--ignore-uri-and-module-key-validation`                                                  |
| `update-gadget`          | `<dashboardId> <gadgetId>`             | —                                                                                                                             | `--title`, `--color`, `--row` + `--column`                                                                                                                       |
| `remove-gadget`          | `<dashboardId> <gadgetId>`             | —                                                                                                                             | —                                                                                                                                                                |
| `list-item-properties`   | `<dashboardId> <itemId>`               | —                                                                                                                             | —                                                                                                                                                                |
| `get-item-property`      | `<dashboardId> <itemId> <propertyKey>` | —                                                                                                                             | —                                                                                                                                                                |
| `set-item-property`      | `<dashboardId> <itemId> <propertyKey>` | `--value` (JSON)                                                                                                              | —                                                                                                                                                                |
| `delete-item-property`   | `<dashboardId> <itemId> <propertyKey>` | —                                                                                                                             | —                                                                                                                                                                |
| `copy`                   | `<dashboardId>`                        | `--name`, `--share-permissions` (JSON), `--edit-permissions` (JSON)                                                           | `--description`, `--extend-admin-permissions`                                                                                                                    |
| `bulk-edit`              | —                                      | `--entity-ids` (csv ints), `--action`; plus `--new-owner` + `--autofix-name`, or `--share-permissions` + `--edit-permissions` | `--extend-admin-permissions`                                                                                                                                     |
| `list-available-gadgets` | —                                      | —                                                                                                                             | —                                                                                                                                                                |
| `search`                 | —                                      | —                                                                                                                             | `--dashboard-name`, `--account-id`, `--owner`, `--group-name`, `--group-id`, `--project-id`, `--order-by`, `--status`, `--start-at`, `--max-results`, `--expand` |
| `search-all`             | —                                      | —                                                                                                                             | (same as `search` minus `--start-at`) plus `--max-pages`                                                                                                         |

- `--share-permissions` / `--edit-permissions` are **JSON arrays** of nested `SharePermission` objects: `{"type":"global"}`, `{"type":"authenticated"}` (all logged-in users), `{"type":"user","user":{"accountId":"..."}}`, `{"type":"group","group":{"groupId":"..."}}` (or `"name"`), `{"type":"project","project":{"id":"10000"}}`, `{"type":"projectRole","project":{"id":"10000"},"role":{"id":10002}}`. In requests use `authenticated`, never `loggedin` (`loggedin` is how Jira reports it back).
- `bulk-edit` edits at most 100 dashboards per call (`--entity-ids`). `--action` is one of `changeOwner`, `changePermission`, `addPermission`, `removePermission`; anything else is refused before sending. `changeOwner` requires `--new-owner <accountId>` and `--autofix-name true|false` (rename the dashboard if the new owner already has one with that name) and refuses the permission flags; the three permission actions require both `--share-permissions` and `--edit-permissions` and refuse `--new-owner`/`--autofix-name`. `--extend-admin-permissions true|false` is sent in the body.
- `list-gadgets` filters are repeated query params: `--module-key a,b` → `moduleKey=a&moduleKey=b`; `--uri` and `--gadget-id` (positive integers) likewise. Without them every gadget on the dashboard is returned; a filter flag given with no value (`--uri ''`) is refused. Values are split on commas, so a gadget URI that contains a comma cannot be passed from the CLI (use `client.dashboards.listGadgets`).
- `add-gadget`: give `--module-key` **or** `--uri`, not both (Jira rejects the pair; `--ignore-uri-and-module-key-validation` skips Jira's check that the gadget exists, for apps that are not installed). `--color` is one of `blue`, `red`, `yellow`, `green`, `cyan`, `purple`, `gray`, `white`. `--row` and `--column` (0-based) must be supplied together.
- `--order-by` for `search`/`search-all` is one of `description`, `favorite_count`, `id`, `is_favorite`, `name`, `owner`, each optionally prefixed with `+` (ascending) or `-` (descending). Attach a value that starts with `-` with `=`: `--order-by=-favorite_count` (`--order-by -favorite_count` is a parse error).
- `--status` for `search`/`search-all` is one of: `active`, `archived`, `deleted`. `--filter` for `list` is `my` or `favourite`. Other values are refused before sending.
- `search` filters: `--account-id` (owner; not with the deprecated `--owner`), `--group-id` (shared with a group; not with `--group-name`), `--project-id` (positive integer). `--expand` is a CSV such as `description,owner,viewUrl,favourite,favouritedCount,sharePermissions,editPermissions`.
- `set-item-property` `--value` is parsed as JSON (strings must be quoted: `--value '"hello"'`).
- `search-all` collects every result into a single array; `--max-pages` (default 10 000) caps iteration on misbehaving servers.

```sh
# List your favourite dashboards
atlas jira dashboards list --filter favourite --max-results 25

# Get / delete a dashboard
atlas jira dashboards get 10001
atlas jira dashboards delete 10001

# Create a dashboard: name, share-permissions and edit-permissions are all required
atlas jira dashboards create --name "Team board" --description "Sprint health" --share-permissions '[{"type":"global"}]' --edit-permissions '[{"type":"user","user":{"accountId":"5b10a2844c20165700ede21g"}}]'

# Update (replaces name and both permission lists); as an admin, on someone else's dashboard
atlas jira dashboards update 10001 --name "Renamed" --share-permissions '[{"type":"authenticated"}]' --edit-permissions '[]' --extend-admin-permissions true

# Search for dashboards by name, most-favourited first
atlas jira dashboards search --dashboard-name "Sprint" --order-by=-favorite_count --status active --max-results 25

# Collect every dashboard owned by a user
atlas jira dashboards search-all --account-id 5b10a2844c20165700ede21g --order-by name --max-pages 5

# List gadgets on a dashboard, optionally filtered by module key or gadget ID
atlas jira dashboards list-gadgets 10001
atlas jira dashboards list-gadgets 10001 --module-key com.atlassian.jira.gadgets:filter-results-gadget
atlas jira dashboards list-gadgets 10001 --gadget-id 10050,10051

# Add a gadget at row 1, column 1
atlas jira dashboards add-gadget 10001 --module-key com.atlassian.jira.gadgets:filter-results-gadget --row 1 --column 1 --title "My Gadget" --color blue

# Rename / recolour a gadget
atlas jira dashboards update-gadget 10001 5 --title "Renamed" --color green

# Remove a gadget
atlas jira dashboards remove-gadget 10001 5

# Manage dashboard item properties
atlas jira dashboards list-item-properties 10001 itm-1
atlas jira dashboards get-item-property 10001 itm-1 my-key
atlas jira dashboards set-item-property 10001 itm-1 my-key --value '{"enabled":true}'
atlas jira dashboards delete-item-property 10001 itm-1 my-key

# Copy a dashboard: name, share-permissions, edit-permissions are required by the spec
atlas jira dashboards copy 10001 --name "Copy of Sprint" --share-permissions '[{"type":"global"}]' --edit-permissions '[{"type":"authenticated"}]'

# Bulk transfer ownership (changeOwner needs --new-owner and --autofix-name)
atlas jira dashboards bulk-edit --entity-ids 10001,10002 --action changeOwner --new-owner 5b10a2844c20165700ede21g --autofix-name true

# Bulk replace permissions (permission actions need both lists), as an admin
atlas jira dashboards bulk-edit --entity-ids 10001,10002 --action changePermission --share-permissions '[{"type":"authenticated"}]' --edit-permissions '[]' --extend-admin-permissions true

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
| `get-transitions`          | —               | `--issues`                         | —                                                      |
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

`--issues` accepts either a JSON array of issue-update objects (for `create-issues`, where each element is `{ fields: {...}, update?: {...} }`) or a comma-separated list of issue IDs/keys (for `delete-issues`, `get-fields`, `unwatch-issues`, `watch-issues`, `get-transitions`). `--actions` is a comma-separated list of bulk-edit actions. `--value` is a JSON string: an object for `edit-fields` (`editedFieldsInput`), `move-issues` (`targetToSourcesMapping`), and `set-property` (the property value); an array for `transition-issues` (`bulkTransitionInputs`); and the raw provider payload for every DevOps `submit-*` variant. `set-property` takes exactly one of `--value` (a constant JSON value) or `--expression` (EXPERIMENTAL: a Jira expression, string, evaluated per issue with `issue` and `user` in context). `--filter` for `set-property` / `delete-property` is a JSON object restricting which issues are affected (`entityIds`, `currentValue`, `hasProperty`). `--send-notification true|false` (for `delete-issues`, `edit-fields`, `move-issues`, `transition-issues`) controls the bulk-change notification email; the server default is `true`, so pass `--send-notification false` to suppress it, omit for the default. Tri-state — the value is required.

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

# DevOps ingest examples (payload shape is provider-specific)
atlas jira bulk submit-builds --value '{"providerMetadata":{"product":"my-ci"},"builds":[]}'
atlas jira bulk submit-deployments --value '{"deployments":[]}'
atlas jira bulk submit-feature-flags --value '{"flags":[]}'
```

## `filters`

Saved JQL filters, their owners, share permissions, favourites, and
per-user default share scope.

| Action                    | Positional                  | Required flags         | Optional flags                                                                                                                                                                                                     |
| ------------------------- | --------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `search`                  | —                           | —                      | `--filter-name`, `--is-substring-match`, `--account-id`, `--owner`, `--group-id`, `--group-name`, `--project-id`, `--ids`, `--order-by`, `--expand`, `--override-share-permissions`, `--start-at`, `--max-results` |
| `get`                     | `<filterId>`                | —                      | `--expand`, `--override-share-permissions`                                                                                                                                                                         |
| `create`                  | —                           | `--name`               | `--description`, `--jql`, `--favourite`, `--share-permissions`, `--edit-permissions`, `--expand`, `--override-share-permissions`                                                                                   |
| `update`                  | `<filterId>`                | at least one body flag | `--name`, `--description`, `--jql`, `--favourite`, `--share-permissions`, `--edit-permissions`, `--expand`, `--override-share-permissions`                                                                         |
| `delete`                  | `<filterId>`                | —                      | —                                                                                                                                                                                                                  |
| `list-favourites`         | —                           | —                      | `--expand`                                                                                                                                                                                                         |
| `list-my`                 | —                           | —                      | `--expand`, `--include-favourites`                                                                                                                                                                                 |
| `add-favourite`           | `<filterId>`                | —                      | `--expand`                                                                                                                                                                                                         |
| `remove-favourite`        | `<filterId>`                | —                      | `--expand`                                                                                                                                                                                                         |
| `change-owner`            | `<filterId>`                | `--account-id`         | —                                                                                                                                                                                                                  |
| `get-columns`             | `<filterId>`                | —                      | —                                                                                                                                                                                                                  |
| `set-columns`             | `<filterId>`                | `--columns`            | —                                                                                                                                                                                                                  |
| `reset-columns`           | `<filterId>`                | —                      | —                                                                                                                                                                                                                  |
| `list-permissions`        | `<filterId>`                | —                      | —                                                                                                                                                                                                                  |
| `add-permission`          | `<filterId>`                | `--share-type`         | `--project-id`, `--group-name`, `--group-id`, `--role-id`, `--account-id`, `--rights`                                                                                                                              |
| `get-permission`          | `<filterId> <permissionId>` | —                      | —                                                                                                                                                                                                                  |
| `delete-permission`       | `<filterId> <permissionId>` | —                      | —                                                                                                                                                                                                                  |
| `get-default-share-scope` | —                           | —                      | —                                                                                                                                                                                                                  |
| `set-default-share-scope` | —                           | `--share-scope`        | —                                                                                                                                                                                                                  |

- `search` (`GET /filter/search`) sends each filter flag as its query param: `--filter-name` (case-insensitive match on the name; `--is-substring-match true` makes it a plain substring match, `false` uses full-text syntax), `--account-id` (owner; not with the deprecated `--owner`), `--group-id` (shared with a group; not with `--group-name`), `--project-id` (positive integer; shared with a project), `--ids` (comma-separated numeric filter IDs, sent as repeated `id` params, at most 200). With no filter flags every filter you can see is returned.
- `--order-by` for `search` is one of `description`, `favourite_count`, `id`, `is_favourite`, `is_shared`, `name`, `owner`, each optionally prefixed with `+` or `-`; other values are refused before sending. Attach a value that starts with `-` with `=`: `--order-by=-name`.
- `--expand` is a CSV of response expansions, e.g. `description,favourite,favouritedCount,jql,owner,searchUrl,sharePermissions,editPermissions,isWritable,approximateLastUsed,subscriptions,viewUrl` for `search` and `sharedUsers,subscriptions` for `get`/`create`/`update`.
- `--override-share-permissions true|false` (experimental; _Administer Jira_ only) on `search`, `get`, `create` and `update` returns or edits filters regardless of their share permissions. Omit it for the default (`false`).
- `--favourite true|false` (`--favourite` alone means `true`) on `create`/`update` sets whether the filter is one of your favourites; `update 10001 --name "..." --favourite false` un-favourites it.
- `update` sends only the flags you give, but the spec's `Filter` body marks `name` as required, so include `--name` (the current name if unchanged).
- `--share-permissions` and `--edit-permissions` (on `create`/`update`) are **JSON arrays** of nested `SharePermission` objects — not the flat `add-permission` flags:

  | `type`          | Other keys                                      | Example                                                                       |
  | --------------- | ----------------------------------------------- | ----------------------------------------------------------------------------- |
  | `global`        | —                                               | `{"type":"global"}`                                                           |
  | `authenticated` | — (all logged-in users; reported as `loggedin`) | `{"type":"authenticated"}`                                                    |
  | `user`          | `user.accountId`                                | `{"type":"user","user":{"accountId":"5b10a2844c20165700ede21g"}}`             |
  | `group`         | `group.groupId` (or `group.name`)               | `{"type":"group","group":{"groupId":"276f955c-63d7-42c8-9520-92d01dca0625"}}` |
  | `project`       | `project.id`                                    | `{"type":"project","project":{"id":"10000"}}`                                 |
  | `projectRole`   | `project.id` + `role.id`                        | `{"type":"projectRole","project":{"id":"10000"},"role":{"id":10002}}`         |

  Pass `'[]'` to clear a list. The spec's prose for `projectRole` also mentions `projectId` + `projectRoleId`, but its schema has only the nested `project` / `role` objects used above (not verified against a live site); if Jira rejects a `projectRole` entry, add it with `add-permission --share-type projectRole --project-id <id> --role-id <id>` instead.

- `add-permission --share-type` ∈ `user`, `group`, `project`, `projectRole`, `global`, `authenticated`. Each kind expects additional flags: `project` → `--project-id`; `projectRole` → `--project-id` + `--role-id`; `group` → `--group-name` or `--group-id`; `user` → `--account-id`. `loggedin` is a response-only name: the CLI sends it as `authenticated`. `--rights` is a positive integer passed through as `rights`.
- `--share-scope` ∈ `GLOBAL`, `AUTHENTICATED`, `PRIVATE`.
- `--columns` (on `set-columns`) is a **comma-separated** list of navigable field keys (e.g. `issuekey,summary,assignee`); the CLI sends it as the JSON body `{"columns":[...]}` (at least one key; use `reset-columns` to go back to the defaults).
- `list-my --include-favourites true|false` adds your favourite filters to the ones you own.

```sh
# Search filters by name (substring match), sorted by name
atlas jira filters search --filter-name sprint --is-substring-match true --order-by name --max-results 50

# Filters owned by a user and shared with a project, with expansions
atlas jira filters search --account-id 5b10a2844c20165700ede21g --project-id 10000 --expand description,owner,jql

# Specific filters, as an admin ignoring share permissions
atlas jira filters search --ids 10001,10002 --override-share-permissions true

# Get a filter by ID, with the users it is shared with
atlas jira filters get 10001 --expand sharedUsers

# Create a filter shared with a group and editable by one user
atlas jira filters create --name "Open bugs" --jql "project = PROJ AND type = Bug" --favourite true --share-permissions '[{"type":"group","group":{"groupId":"276f955c-63d7-42c8-9520-92d01dca0625"}}]' --edit-permissions '[{"type":"user","user":{"accountId":"5b10a2844c20165700ede21g"}}]'

# Update a filter's JQL and sharing, and un-favourite it
atlas jira filters update 10001 --name "Open bugs" --jql "project = PROJ AND type = Bug AND resolution = Unresolved" --favourite false --share-permissions '[{"type":"projectRole","project":{"id":"10000"},"role":{"id":10002}}]'

# Delete a filter
atlas jira filters delete 10001

# Your filters (plus favourites) and your favourite filters
atlas jira filters list-my --include-favourites true --expand jql
atlas jira filters list-favourites --expand jql

# Mark / unmark favourite
atlas jira filters add-favourite 10001
atlas jira filters remove-favourite 10001

# Reassign filter owner
atlas jira filters change-owner 10001 --account-id 5b10a2844c20165700ede21g

# Read and replace the filter's saved column configuration
atlas jira filters get-columns 10001
atlas jira filters set-columns 10001 --columns issuekey,summary,assignee,status

# Reset to the system default columns
atlas jira filters reset-columns 10001

# Share with a project role (flat add-permission flags)
atlas jira filters add-permission 10001 --share-type projectRole --project-id 10000 --role-id 10100

# Share with all logged-in users
atlas jira filters add-permission 10001 --share-type authenticated

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
- OAuth granular scopes are `read:build-info:jira` / `delete:build-info:jira` for build reads/deletes and `read:deployment-info:jira` / `delete:deployment-info:jira` for deployment reads/deletes.

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
- Granular delete scopes match the entity family. In particular, `delete-security` requires `delete:security:jira`; builds, deployments, dev info, feature flags, and remote links use their respective `delete:*` scope.

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

| Action                  | Positional                            | Required flags                                                    | Optional flags                    |
| ----------------------- | ------------------------------------- | ----------------------------------------------------------------- | --------------------------------- |
| `get-task`              | `<connectKey>` `<jiraIssueFieldsKey>` | —                                                                 | —                                 |
| `submit-task`           | `<connectKey>` `<jiraIssueFieldsKey>` | —                                                                 | `--retrigger-completed-migration` |
| `update-fields`         | —                                     | `--transfer-id`, `--update-value-list` (JSON array)               | —                                 |
| `update-properties`     | `<entityType>`                        | `--transfer-id`, `--value` (JSON array)                           | —                                 |
| `search-workflow-rules` | —                                     | `--transfer-id`, `--workflow-entity-id`, `--rule-ids` (CSV UUIDs) | `--expand`                        |

- `<entityType>` for `update-properties`: one of `IssueProperty`, `CommentProperty`, `DashboardItemProperty`, `IssueTypeProperty`, `ProjectProperty`, `UserProperty`, `WorklogProperty`, `BoardProperty`, `SprintProperty`.
- `--update-value-list`: JSON array of `ConnectCustomFieldValue` objects (see spec schema `ConnectCustomFieldValue`).
- `--value` (for `update-properties`): JSON array of `EntityPropertyDetails` objects — each with `entityId` (number), `key` (string), `value` (string).

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

# Search workflow transition rule configurations — B950
atlas jira migration search-workflow-rules \
  --transfer-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --workflow-entity-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --rule-ids 55d44f1d-c859-42e5-9c27-2c5ec3f340b1,66e55f2e-d960-539f-9d38-3d6dd7541fc2
```
