# Jira — Projects, components, versions, roles, templates

> Part of the `atlas` Jira skill reference. Resource×action matrix and routing in [`../jira.md`](../jira.md).

## `component`

Jira project components — flat `/rest/api/3/component` surface (B361–B366).

| Action                 | Positional      | Required flags                                                                                        | Optional flags                                                                  |
| ---------------------- | --------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `list`                 | —               | —                                                                                                     | `--project-ids-or-keys`, `--start-at`, `--max-results`, `--order-by`, `--query` |
| `create`               | —               | `--name`, `--project`                                                                                 | `--description`, `--lead-account-id`, `--lead-user-name`, `--assignee-type`     |
| `get`                  | `<componentId>` | —                                                                                                     | —                                                                               |
| `update`               | `<componentId>` | at least one of `--name`, `--description`, `--lead-account-id`, `--lead-user-name`, `--assignee-type` | —                                                                               |
| `delete`               | `<componentId>` | —                                                                                                     | `--move-issues-to`                                                              |
| `related-issue-counts` | `<componentId>` | —                                                                                                     | —                                                                               |

- `--project-ids-or-keys` is comma-separated (e.g. `--project-ids-or-keys HSP,PROJ`).
- `--assignee-type` must be one of: `PROJECT_DEFAULT`, `COMPONENT_LEAD`, `PROJECT_LEAD`, `UNASSIGNED`.
- `--lead-user-name` was removed by Atlassian ("no longer available"); Jira ignores it. Use `--lead-account-id`.
- `create` requires `--project` with the owning project's **key** (Jira cannot change it later; there is no numeric-ID alternative).
- `--order-by` (`list`) is one of `name`, `+name`, `-name`, `description`, `+description`, `-description`. Write the descending forms with `=`: `--order-by=-name`.
- `delete --move-issues-to <id>` reassigns issues currently using the deleted component to another component instead of leaving them component-less.

```sh
# List all components across two projects, paginated
atlas jira component list --project-ids-or-keys HSP,PROJ --max-results 25

# Components named like "auth", sorted by name descending
atlas jira component list --project-ids-or-keys HSP --query auth --order-by=-name

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

## `projects`

| Action                        | Positional                         | Required flags                                                                                                    | Optional flags                                                                                                                                                                                                         |
| ----------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`                        | —                                  | —                                                                                                                 | `--start-at`, `--max-results`, `--order-by`, `--expand` (CSV), `--status` (CSV), `--type-key`, `--action`, `--id` (CSV integers), `--keys` (CSV), `--query`, `--category-id`, `--property-query`, `--properties` (CSV) |
| `get`                         | `<projectKeyOrId>`                 | —                                                                                                                 | `--expand` (CSV), `--properties` (CSV)                                                                                                                                                                                 |
| `list-legacy`                 | —                                  | —                                                                                                                 | `--expand` (CSV string), `--recent` (0–20), `--properties` (CSV)                                                                                                                                                       |
| `create`                      | —                                  | `--key`, `--name`, `--lead-account-id`, `--project-type-key` (not needed when `--body` sets `projectTemplateKey`) | `--description`, `--url`, `--assignee-type`, `--avatar-id`, `--permission-scheme`, `--notification-scheme`, `--category-id`, `--body` (JSON)                                                                           |
| `update`                      | `<projectIdOrKey>`                 | at least one field flag or `--body` key                                                                           | `--key`, `--name`, `--description`, `--lead-account-id`, `--url`, `--assignee-type`, `--avatar-id`, `--category-id`, `--permission-scheme`, `--notification-scheme`, `--body` (JSON), `--expand` (CSV)                 |
| `delete`                      | `<projectIdOrKey>`                 | —                                                                                                                 | `--enable-undo true\|false`                                                                                                                                                                                            |
| `recent`                      | —                                  | —                                                                                                                 | `--expand` (CSV), `--properties` (CSV)                                                                                                                                                                                 |
| `list-types`                  | —                                  | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `get-type`                    | `<typeKey>`                        | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `get-accessible-type`         | `<typeKey>`                        | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `list-accessible-types`       | —                                  | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `get-email`                   | `<projectId>`                      | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `set-email`                   | `<projectId>`                      | `--email-address` (`--email-address=""` restores the default)                                                     | —                                                                                                                                                                                                                      |
| `get-hierarchy`               | `<projectId>`                      | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `archive`                     | `<projectIdOrKey>`                 | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `set-avatar`                  | `<projectIdOrKey>`                 | `--avatar-id`                                                                                                     | —                                                                                                                                                                                                                      |
| `delete-avatar`               | `<projectIdOrKey>` `<avatarId>`    | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `load-avatar`                 | `<projectIdOrKey>`                 | `--file` (`.png`, `.jpg`, `.jpeg`, `.gif`)                                                                        | `--x`, `--y`, `--size`, `--media-type` (`image/png`, `image/jpeg`, `image/gif`)                                                                                                                                        |
| `get-avatars`                 | `<projectIdOrKey>`                 | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `get-classification-config`   | `<projectIdOrKey>`                 | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `delete-classification-level` | `<projectIdOrKey>`                 | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `get-classification-level`    | `<projectIdOrKey>`                 | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `set-classification-level`    | `<projectIdOrKey>`                 | `--classification-id`                                                                                             | —                                                                                                                                                                                                                      |
| `list-components`             | `<projectIdOrKey>`                 | —                                                                                                                 | `--start-at`, `--max-results`, `--order-by`, `--component-source`, `--query`                                                                                                                                           |
| `list-all-components`         | `<projectIdOrKey>`                 | —                                                                                                                 | `--component-source`                                                                                                                                                                                                   |
| `delete-async`                | `<projectIdOrKey>`                 | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `get-features`                | `<projectIdOrKey>`                 | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `set-feature-state`           | `<projectIdOrKey>` `<featureKey>`  | `--state`                                                                                                         | —                                                                                                                                                                                                                      |
| `list-properties`             | `<projectIdOrKey>`                 | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `delete-property`             | `<projectIdOrKey>` `<propertyKey>` | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `get-property`                | `<projectIdOrKey>` `<propertyKey>` | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `set-property`                | `<projectIdOrKey>` `<propertyKey>` | `--value` (JSON)                                                                                                  | —                                                                                                                                                                                                                      |
| `restore`                     | `<projectIdOrKey>`                 | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `list-roles`                  | `<projectIdOrKey>`                 | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `get-role`                    | `<projectIdOrKey>` `<roleId>`      | —                                                                                                                 | `--exclude-inactive-users`                                                                                                                                                                                             |
| `delete-role-actors`          | `<projectIdOrKey>` `<roleId>`      | —                                                                                                                 | `--user`, `--group-id`, `--group`                                                                                                                                                                                      |
| `add-role-actors`             | `<projectIdOrKey>` `<roleId>`      | `--body` (JSON)                                                                                                   | —                                                                                                                                                                                                                      |
| `set-role-actors`             | `<projectIdOrKey>` `<roleId>`      | `--body` (JSON)                                                                                                   | —                                                                                                                                                                                                                      |
| `get-role-details`            | `<projectIdOrKey>`                 | —                                                                                                                 | `--current-member`, `--exclude-connect-addons`, `--exclude-other-service-roles`                                                                                                                                        |
| `get-statuses`                | `<projectIdOrKey>`                 | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `list-versions`               | `<projectIdOrKey>`                 | —                                                                                                                 | `--start-at`, `--max-results`, `--order-by`, `--query`, `--status`, `--expand`                                                                                                                                         |
| `list-all-versions`           | `<projectIdOrKey>`                 | —                                                                                                                 | `--expand`                                                                                                                                                                                                             |
| `get-issue-security-scheme`   | `<projectKeyOrId>`                 | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `get-notification-scheme`     | `<projectKeyOrId>`                 | —                                                                                                                 | `--expand`                                                                                                                                                                                                             |
| `get-permission-scheme`       | `<projectKeyOrId>`                 | —                                                                                                                 | `--expand`                                                                                                                                                                                                             |
| `set-permission-scheme`       | `<projectKeyOrId>`                 | `--permission-scheme`                                                                                             | `--expand`                                                                                                                                                                                                             |
| `get-security-levels`         | `<projectKeyOrId>`                 | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `list-categories`             | —                                  | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `create-category`             | —                                  | `--name`                                                                                                          | `--description`                                                                                                                                                                                                        |
| `delete-category`             | `<categoryId>`                     | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `get-category`                | `<categoryId>`                     | —                                                                                                                 | —                                                                                                                                                                                                                      |
| `update-category`             | `<categoryId>`                     | —                                                                                                                 | `--name`, `--description`                                                                                                                                                                                              |
| `get-projects-fields`         | —                                  | `--project-ids` (CSV), `--work-type-ids` (CSV)                                                                    | `--field-ids` (CSV), `--start-at`, `--max-results`                                                                                                                                                                     |
| `validate-project-key`        | —                                  | `--key`                                                                                                           | —                                                                                                                                                                                                                      |
| `get-valid-project-key`       | —                                  | `--key`                                                                                                           | —                                                                                                                                                                                                                      |
| `get-valid-project-name`      | —                                  | `--name`                                                                                                          | —                                                                                                                                                                                                                      |

- `--assignee-type` accepts `PROJECT_LEAD` or `UNASSIGNED`.
- `get --expand` accepts `description`, `issueTypes`, `lead`, `projectKeys`, `issueTypeHierarchy` (comma-separated, sent as one CSV value). `get --properties` names the project property keys to return in `properties` (comma-separated, sent as repeated query parameters; `properties` is empty without it).
- `create` needs a project lead: pass `--lead-account-id <accountId>` (find yours with `atlas jira users me`). `--project-type-key` is one of `software`, `service_desk`, `business`, `customer_service` (any other value is rejected before the request); it may be omitted when `--body` sets `projectTemplateKey`, because Jira takes the type from the template.
- `create --body` is a JSON object of extra `CreateProjectDetails` properties: `projectTemplateKey` (string; when `--project-type-key` is also given, the template must be of that type), `workflowScheme`, `issueTypeScheme`, `issueTypeScreenScheme`, `issueSecurityScheme`, `fieldScheme`, `fieldConfigurationScheme` (deprecated; use `fieldScheme`) (integer scheme IDs), plus any of `key`, `name`, `projectTypeKey`, `description`, `leadAccountId`, `url`, `assigneeType`, `avatarId`, `permissionScheme`, `notificationScheme`, `categoryId`. A discrete flag wins over the same `--body` key; required values may come from either. Jira rejects `projectTemplateKey` combined with `workflowScheme`, `issueTypeScheme`, `issueTypeScreenScheme`, `fieldScheme` or `fieldConfigurationScheme`. Any other key is rejected before the request.
- `update` sends only what you pass and fails before the request when nothing is given. `--key` renames the project key; `--category-id` moves it to a category, and `--category-id=-1` (with `=`, because the value starts with a dash) removes the category. `--body` is a JSON object of `UpdateProjectDetails` properties: `key`, `name`, `description`, `leadAccountId`, `url`, `assigneeType`, `avatarId`, `issueSecurityScheme`, `permissionScheme`, `notificationScheme`, `categoryId` and `releasedProjectKeys` (array of the project's previous keys to release); flags win over the same keys and other keys are rejected. `--expand` accepts `description`, `issueTypes`, `lead`, `projectKeys` (comma-separated) and shapes the returned project.
- `delete --enable-undo` takes a value: `true` (Jira's default when omitted) moves the project to the recycle bin, where `restore` can bring it back; `false` deletes it permanently. A bare `--enable-undo` is a parse error.
- `recent` returns up to 20 recently viewed projects; Jira does not page it. `--max-results` is deprecated: it still parses (it must be a positive integer) but is not sent, because the spec documents no such parameter for this endpoint; it no longer limits the result. `--expand` accepts `description`, `projectKeys`, `lead`, `issueTypes`, `url`, `permissions`, `insight`, or `*`; `--properties` is comma-separated and sent as repeated query parameters.
- `list` `--status` accepts `live` (default), `archived`, `deleted`; `--type-key` accepts `business`, `service_desk`, `software` (comma-separated).
- `list-legacy` calls the deprecated `GET /project` endpoint (returns a flat array, not paginated). Its only query flags are `--expand`, `--recent` (an integer from 0 through 20), and `--properties`; property keys are sent as repeated query parameters.
- `list-legacy` rejects the removed `--max-results`, `--order-by`, `--start-at`, `--type-key`, `--category-id`, `--action`, and `--query` flags. Use `projects list` for paginated/filterable discovery.
- `list` calls the current `/project/search` endpoint. `--status`, `--id`, `--keys`, and `--properties` are comma-separated and are sent as repeated query parameters; `--expand` stays a comma-separated expansion string on the wire. `--id` entries and `--category-id` are positive decimal int64 IDs and are preserved exactly, including values beyond JavaScript's safe-integer range. `--action` accepts `view` (default), `browse`, `edit`, or `create` and replaces the same filter removed from `list-legacy`. `--order-by` accepts `category`, `key`, `name`, `owner`, `issueCount`, `lastIssueUpdatedDate`, `archivedDate`, or `deletedDate`, optionally prefixed with `+` or `-`.
- `list-versions` returns a paginated response and accepts filtering/sorting flags. `list-all-versions` returns a flat array, accepts only `--expand`, and rejects the removed `--max-results`, `--order-by`, `--query`, and `--status` flags.
- `list-versions` `--order-by` accepts `description`, `name`, `releaseDate`, `sequence`, `startDate` (optionally prefixed with `+` or `-`); `--status` accepts `released`, `unreleased`, `archived` (comma-separated); `--expand` (also on `list-all-versions`) accepts `issuesstatus`, `operations`, `driver`, `approvers`.
- `add-role-actors` accepts `--body` as a flat `ActorsMap` JSON object with `user` (account IDs), `group` (group names) and/or `groupId` (group IDs, preferred over `group`) string arrays (e.g. `{"user":["acc-1"]}`). At least one non-empty array is required; `group` and `groupId` cannot be combined; any other key is rejected before the request. It adds to the existing actors.
- `set-role-actors` **replaces all actors** of the role. `--body` is `{"categorisedActors":{...}}` keyed by actor type: `atlassian-user-role-actor` (account IDs), `atlassian-group-role-actor-id` (group IDs, recommended because group names can change) and `atlassian-group-role-actor` (group names), each a string array.
- `delete-role-actors` removes actors by `--user` (accountId), `--group-id`, or `--group` (name).
- `get-role-details --exclude-other-service-roles` hides the other service's default roles (the default CSM roles on a JSM project, or the default JSM roles on a CSM project). `--current-member`, `--exclude-connect-addons` and `--exclude-other-service-roles` are booleans: bare or `true` sends `true`, `false` sends `false`, omitted sends nothing.
- `set-email` sets the project's sender address; `--email-address=""` (an empty string) restores the default address. The flag is required.
- `archive` moves a project into the archived state. `restore` brings an archived or recycle-bin project back and prints the restored project.
- `load-avatar` uploads a custom avatar image from `--file` (JPEG, GIF or PNG). The `Content-Type` is `--media-type` (`image/png`, `image/jpeg` or `image/gif`; any other value is rejected) when given, otherwise it comes from the `.jpg`/`.jpeg`, `.gif` or `.png` extension; a file with any other extension, or none, is rejected unless `--media-type` is passed. It prints the new avatar (`{ id, ... }`); select it with `set-avatar --avatar-id <id>`. `--x`, `--y` (top-left corner) and `--size` (side length) are the square crop region, sent as non-negative integer query params; with none of them, Jira crops from the top-left corner to the shorter image side. The former `--value` flag is rejected.
- `set-classification-level` requires `--classification-id`; to clear the default level use `delete-classification-level`.
- `list-components` is paginated; `list-all-components` returns all components as a flat array. On both, `--component-source` accepts `jira` (default), `compass` or `auto` (Compass components when the project uses Compass, otherwise Jira components). `list-components --order-by` accepts `description`, `issueCount`, `lead`, `name` (optionally prefixed with `+` or `-`; pass a `-` value with `=`, e.g. `--order-by=-issueCount`); any other value is rejected before the request.
- `delete-async` triggers async project deletion (202 Accepted); poll the returned task URL for completion.
- `set-feature-state` toggles a named project feature; `--state` accepts `ENABLED`, `DISABLED` or `COMING_SOON`.
- `set-permission-scheme --expand` shapes the returned scheme and accepts `all`, `field`, `group`, `permissions`, `projectRole`, `user` (the same values as `get-permission-scheme --expand`). `get-notification-scheme --expand` accepts `all`, `field`, `group`, `notificationSchemeEvents`, `projectRole`, `user`.
- `get-projects-fields` lists the fields of the given work types (issue types) in the given projects as a page `{ values: [{ projectId, workTypeId, fieldId, isRequired, description }], startAt, maxResults, total, isLast }`. `--project-ids` and `--work-type-ids` are required comma-separated positive integer IDs; `--field-ids` limits the fields. All three are sent as repeated query parameters. Page with `--start-at` (0-based) and `--max-results`.
- `list-properties`, `get-property`, `delete-property` operate on arbitrary key-value storage attached to the project.
- `set-property` accepts `--value` as JSON (any valid JSON value).
- `create` returns **project identifiers** `{ id (number), key, self }` — not the full project object. Use the returned `key` with `get` to fetch full details. There is no `--priority-scheme` flag (the spec create body rejects it).
- `validate-project-key` returns an `ErrorCollection` `{ errorMessages?: string[], errors?: { param: message }, status? }`. The key is **valid when `errorMessages` is empty**; there is no `valid` boolean.
- `get-valid-project-key` and `get-valid-project-name` each return a **bare string** (the adjusted key/name), not an object.

```sh
# List projects (paginated, preferred)
atlas jira projects list --type-key software --status live --action browse --query platform --order-by key --max-results 50

# List projects using the legacy endpoint
atlas jira projects list-legacy --expand description,lead --recent 10 --properties project.owner,project.region

# Get a project with extra expansions and selected project properties
atlas jira projects get PROJ --expand description,lead,issueTypes --properties project.owner,project.region

# Create a project (a project lead is required)
atlas jira projects create --key EX --name "Example" --project-type-key software --lead-account-id 5b10a2844c20165700ede21g

# Create a project from a template (extra CreateProjectDetails properties go in --body)
atlas jira projects create --key OPS --name "Ops" --project-type-key business --lead-account-id 5b10a2844c20165700ede21g --body '{"projectTemplateKey":"com.atlassian.jira-core-project-templates:jira-core-simplified-process-control"}'

# Create from a template alone (the project type comes from the template)
atlas jira projects create --key KAN --name "Kanban" --lead-account-id 5b10a2844c20165700ede21g --body '{"projectTemplateKey":"com.pyxis.greenhopper.jira:gh-simplified-kanban-classic"}'

# Create a project on existing schemes (cannot be combined with projectTemplateKey)
atlas jira projects create --key SCH --name "Schemed" --project-type-key software --lead-account-id 5b10a2844c20165700ede21g --permission-scheme 10011 --body '{"workflowScheme":10032,"issueTypeScheme":10020,"issueTypeScreenScheme":10010,"issueSecurityScheme":10001,"fieldScheme":10040}'

# Update a project
atlas jira projects update EX --name "Updated Name" --description "New desc"

# Rename the project key, move it to category 10000, and return the lead expanded
atlas jira projects update EX --key EXA --category-id 10000 --expand lead

# Remove the project category and release the old key
atlas jira projects update EXA --category-id=-1 --body '{"releasedProjectKeys":["EX"]}'

# Delete a project (moves it to the recycle bin; bring it back with restore)
atlas jira projects delete EX

# Delete a project permanently (skips the recycle bin)
atlas jira projects delete EX --enable-undo false

# List recently viewed projects with expansions and a project property
atlas jira projects recent --expand description,lead --properties project.owner

# List all project types
atlas jira projects list-types

# Get a specific project type
atlas jira projects get-type software

# List accessible project types, or get one
atlas jira projects list-accessible-types
atlas jira projects get-accessible-type business

# Restore a deleted project
atlas jira projects restore PROJ

# List all roles for a project (name -> URL map)
atlas jira projects list-roles PROJ

# Get a specific project role with its actors
atlas jira projects get-role PROJ 10001

# Delete a user actor from a project role
atlas jira projects delete-role-actors PROJ 10001 --user acc-1

# Add actors to a project role (flat ActorsMap: user, group, groupId)
atlas jira projects add-role-actors PROJ 10001 --body '{"user":["acc-1"]}'

# Replace all actors for a project role: one group (by ID) and one user
atlas jira projects set-role-actors PROJ 10001 --body '{"categorisedActors":{"atlassian-group-role-actor-id":["eef79f81-0b89-4fca-a736-4be531a10869"],"atlassian-user-role-actor":["acc-1"]}}'

# Get the roles you belong to, without the other service's default roles
atlas jira projects get-role-details PROJ --current-member --exclude-other-service-roles

# Get issue types and their statuses for a project
atlas jira projects get-statuses PROJ

# List project versions (paginated)
atlas jira projects list-versions PROJ --order-by name --status released

# List all project versions (flat array; only expand is supported)
atlas jira projects list-all-versions PROJ --expand operations

# Get scheme associations
atlas jira projects get-issue-security-scheme PROJ
atlas jira projects get-notification-scheme PROJ --expand all
atlas jira projects get-permission-scheme PROJ --expand permissions
atlas jira projects set-permission-scheme PROJ --permission-scheme 10001 --expand permissions
atlas jira projects get-security-levels PROJ

# Project categories
atlas jira projects list-categories
atlas jira projects create-category --name "Infrastructure" --description "Infra projects"
atlas jira projects get-category 10001
atlas jira projects update-category 10001 --name "Renamed"
atlas jira projects delete-category 10001

# Projects fields and validation
atlas jira projects get-projects-fields --project-ids 10000,10001 --work-type-ids 10002 --field-ids summary,description --max-results 50
atlas jira projects validate-project-key --key MYPROJ
atlas jira projects get-valid-project-key --key myproj
atlas jira projects get-valid-project-name --name "My Project"

# Project email
atlas jira projects get-email 10001
atlas jira projects set-email 10001 --email-address jira@example.com
# Restore the default sender address
atlas jira projects set-email 10001 --email-address=""

# Project hierarchy
atlas jira projects get-hierarchy 10001

# Archive and restore
atlas jira projects archive PROJ
atlas jira projects restore PROJ

# Avatars
atlas jira projects get-avatars PROJ
# Upload a custom avatar cropped to a 48px square at the top-left, then select it by the returned id
atlas jira projects load-avatar PROJ --file ./avatar.png --x 0 --y 0 --size 48
# A file without an image extension needs --media-type
atlas jira projects load-avatar PROJ --file ./avatar --media-type image/png
atlas jira projects set-avatar PROJ --avatar-id 10010
atlas jira projects delete-avatar PROJ 10010

# Data classification
atlas jira projects get-classification-config PROJ
atlas jira projects get-classification-level PROJ
atlas jira projects set-classification-level PROJ --classification-id cl-1
atlas jira projects delete-classification-level PROJ

# Components
atlas jira projects list-components PROJ --max-results 50 --order-by name
atlas jira projects list-all-components PROJ --component-source auto

# Async delete
atlas jira projects delete-async PROJ

# Features
atlas jira projects get-features PROJ
atlas jira projects set-feature-state PROJ jsw.classic.releases --state ENABLED

# Project properties
atlas jira projects list-properties PROJ
atlas jira projects get-property PROJ myKey
atlas jira projects set-property PROJ myKey --value '"hello"'
atlas jira projects delete-property PROJ myKey
```

## `roles`

Global project-role definitions at `/rest/api/3/role`. These are **top-level role definitions**, not per-project role assignments. Per-project assignments at `/rest/api/3/project/{key}/role/*` (B682–B687) are separate and belong to the `projects` resource.

| Action           | Positional | Required flags                               | Optional flags                                          |
| ---------------- | ---------- | -------------------------------------------- | ------------------------------------------------------- |
| `list`           | —          | —                                            | —                                                       |
| `get`            | `<roleId>` | —                                            | —                                                       |
| `create`         | —          | `--name`                                     | `--description`                                         |
| `update`         | `<roleId>` | `--name`, `--description`                    | —                                                       |
| `partial-update` | `<roleId>` | exactly one of `--name`, `--description`     | —                                                       |
| `delete`         | `<roleId>` | —                                            | `--swap` (ID of role to reassign to)                    |
| `get-actors`     | `<roleId>` | —                                            | —                                                       |
| `add-actors`     | `<roleId>` | `--user`, or one of `--group-id` / `--group` | —                                                       |
| `delete-actors`  | `<roleId>` | —                                            | `--account-id`, or one of `--group-id` / `--group-name` |

- `--user` and `--group-id` / `--group` for `add-actors` accept comma-separated values (multiple accounts/groups in one call).
- `--account-id` / `--group-name` / `--group-id` for `delete-actors` accept a single value each (use `--account-id` instead of `--user` to remove a single user).
- `update` (PUT) replaces the role and needs both `--name` and a non-empty `--description`, so it cannot clear the description; use `atlas jira roles partial-update 10001 --description ''` for that. `partial-update` (POST `/{id}`) changes exactly one of them per call (Jira ignores the description when both are sent, so the CLI rejects that).
- Jira cannot add or remove users and groups in the same request: `add-actors` takes `--user` **or** groups, `delete-actors` takes `--account-id` **or** a group. Identify a group by `--group-id` (preferred; names can change) or by name, not both.
- `add-actors` and `delete-actors` print the role with its resulting default actors.
- `--swap` for `delete` is a numeric role ID; Jira reassigns permissions to that role before deleting.
- Returned roles expose the spec's bare `admin` / `default` boolean flags (whether the role is the admin role / default for new projects), not `isAdmin` / `isDefault`.

```sh
# List all global project roles
atlas jira roles list

# Get a specific role
atlas jira roles get 10001

# Create a new role
atlas jira roles create --name "Developers" --description "Dev team role"

# Full update (PUT)
atlas jira roles update 10001 --name "Developers" --description "Updated description"

# Partial update (POST /{id})
atlas jira roles partial-update 10001 --description "Only updating description"

# Delete a role (optionally reassigning permissions)
atlas jira roles delete 10001
atlas jira roles delete 10001 --swap 10002

# Get actors (users/groups) assigned to the role by default
atlas jira roles get-actors 10001

# Add users and/or groups as default actors
atlas jira roles add-actors 10001 --user acc-1,acc-2
atlas jira roles add-actors 10001 --group-id grp-1,grp-2
atlas jira roles add-actors 10001 --group legacy-group-name

# Remove a default actor
atlas jira roles delete-actors 10001 --account-id acc-1
atlas jira roles delete-actors 10001 --group-name my-group
atlas jira roles delete-actors 10001 --group-id grp-1
```

## `version`

Project version management (B820–B831, B933). Covers the full `/rest/api/3/version` surface: create, get, update, delete, merge, move, related issue counts, related work (list/create/update/delete/delete-single), delete-and-replace, and unresolved issue count.

`delete` returns `204 No Content`. `merge`, `delete-and-replace`, and `delete-related-work` also return `204`. Path params `id`, `moveIssuesTo`, `versionId`, `relatedWorkId` are positional args (not flags).

| Action                   | Positional                      | Required flags                                             | Optional flags                                                                                                                                                                                                                   |
| ------------------------ | ------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create`                 | —                               | `--name`, `--project-id` (or deprecated `--project <key>`) | `--description`, `--archived true\|false`, `--released true\|false`, `--start-date`, `--release-date`, `--move-unfixed-issues-to` (version self URL), `--driver` (account ID), `--expand`                                        |
| `get`                    | `<id>`                          | —                                                          | `--expand`                                                                                                                                                                                                                       |
| `update`                 | `<id>`                          | at least one body flag                                     | `--name`, `--description`, `--archived true\|false`, `--released true\|false`, `--start-date`, `--release-date`, `--move-unfixed-issues-to` (version self URL), `--driver` (account ID), `--expand`, `--project-id`, `--project` |
| `delete` (deprecated)    | `<id>`                          | —                                                          | `--move-fix-issues-to`, `--move-affected-issues-to`                                                                                                                                                                              |
| `merge`                  | `<id>` `<moveIssuesTo>`         | —                                                          | —                                                                                                                                                                                                                                |
| `move`                   | `<id>`                          | one of `--after` (version self URL) or `--position`        | —                                                                                                                                                                                                                                |
| `related-issue-counts`   | `<id>`                          | —                                                          | —                                                                                                                                                                                                                                |
| `list-related-work`      | `<id>`                          | —                                                          | —                                                                                                                                                                                                                                |
| `create-related-work`    | `<id>`                          | `--category`                                               | `--title`, `--url`                                                                                                                                                                                                               |
| `update-related-work`    | `<id>`                          | `--related-work-id`, `--category`                          | `--title`, `--url`                                                                                                                                                                                                               |
| `delete-and-replace`     | `<id>`                          | —                                                          | `--move-fix-issues-to` (int version ID), `--move-affected-issues-to` (int version ID), `--custom-field-replacement-list` (JSON array)                                                                                            |
| `unresolved-issue-count` | `<id>`                          | —                                                          | —                                                                                                                                                                                                                                |
| `delete-related-work`    | `<versionId>` `<relatedWorkId>` | —                                                          | —                                                                                                                                                                                                                                |

- `--archived true|false` and `--released true|false` set the flag either way; bare `--archived` / `--released` mean `true`, and `--archived false` (or `--no-archived`) un-archives. Omit to leave unchanged.
- `create` needs `--name` and the project: `--project-id <numeric id>` (preferred; `--project <key>` is deprecated by Atlassian).
- `--after` (`move`) and `--move-unfixed-issues-to` (`create` / `update`) take the version's **self link URL**, e.g. `https://your-site.atlassian.net/rest/api/3/version/10001` (the `self` field of `version get`), not a bare ID. `move` takes `--after` or `--position`, not both.
- `--expand` on `create` / `update` adds response detail (`operations`, `issuesstatus`, `driver`, `approvers`; comma-separated).
- `update-related-work` updates the entry named by `--related-work-id` (the `relatedWorkId` from `list-related-work`); only generic link entries can be updated.
- `delete` is deprecated by Atlassian: use `delete-and-replace`, which also swaps the version in version-picker custom fields.
- `--move-fix-issues-to` and `--move-affected-issues-to` take a version ID as a string on `delete`, or as an integer on `delete-and-replace`.
- `--custom-field-replacement-list` (`delete-and-replace`) is a JSON array of `{"customFieldId": <int>, "moveTo": <int version ID>}` entries: for each version-picker custom field that holds the deleted version, the version to put in its place.
- `--position` for `move` accepts `First`, `Last`, `Earlier`, or `Later`.

```sh
# Create a version
atlas jira version create --name "v1.0" --project-id 10100 --release-date 2026-06-01

# Get a version
atlas jira version get 10000 --expand issuesstatus

# Update a version
atlas jira version update 10000 --name "v1.1" --released

# Un-release and un-archive a version
atlas jira version update 10000 --released false --archived false

# Delete a version (deprecated; prefer delete-and-replace)
atlas jira version delete 10000 --move-fix-issues-to 10001

# Merge two versions
atlas jira version merge 10000 10001

# Move version to a position
atlas jira version move 10000 --position Last

# Move version after another version (self link URL)
atlas jira version move 10000 --after https://your-site.atlassian.net/rest/api/3/version/10001

# Related issue counts
atlas jira version related-issue-counts 10000

# List related work
atlas jira version list-related-work 10000

# Create related work
atlas jira version create-related-work 10000 --category "Confluence page" --url "https://example.com"

# Update related work
atlas jira version update-related-work 10000 --related-work-id fabcdef6-7878-1234-beaf-43211234abcd --category "Design doc" --title "Updated" --url "https://example.com/design"

# Delete and replace version
atlas jira version delete-and-replace 10000 --move-fix-issues-to 10001 --move-affected-issues-to 10001
atlas jira version delete-and-replace 10000 --custom-field-replacement-list '[{"customFieldId":10050,"moveTo":10001}]'

# Unresolved issue count
atlas jira version unresolved-issue-count 10000

# Delete a single related work entry
atlas jira version delete-related-work 10000 rw-abc
```

## `project-template`

Custom project template management (B653–B657). Covers the full `/rest/api/3/project-template` surface: create a project with a custom template, edit/save/remove templates, and retrieve live template details.

`create` is asynchronous: it prints `{ "queued": true, "taskId": "<id>", "taskUrl": "<url>" }`; poll with `atlas jira task get <taskId>` until `status` is `COMPLETE`. `edit-template`, `remove-template` return `void` (no JSON body). `live-template` returns `ProjectTemplateModel`. `save-template` returns `{ projectTemplateKey }`.

**Note: These endpoints are only available on Jira Enterprise edition.**

> **Experimental:** Atlassian marks `edit-template`, `live-template`, `remove-template` and `save-template` `x-experimental`; their shapes may change without notice.

| Action            | Positional | Required flags                     | Optional flags                                                                                                                                                                                                                                   |
| ----------------- | ---------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `create`          | —          | `--template` (JSON)                | `--name`, `--key`, `--description`, `--url`, `--language`, `--lead-account-id`, `--access-level`, `--assignee-type`, `--avatar-id` (int), `--category-id` (int), `--enable-components`, `--additional-properties` (JSON `Record<string,string>`) |
| `edit-template`   | —          | at least one flag                  | `--template-key` (identifies the template; Jira needs it), `--template-name`, `--template-description`, `--enable-screen-delegated-admin`, `--enable-workflow-delegated-admin`                                                                   |
| `live-template`   | —          | —                                  | `--project-id` or `--template-key` (Jira needs one to find the template)                                                                                                                                                                         |
| `remove-template` | —          | `--template-key`                   | —                                                                                                                                                                                                                                                |
| `save-template`   | —          | at least one of the optional flags | `--template-name`, `--template-description`, `--project-id` (int), `--template-type` (`LIVE`\|`SNAPSHOT`), `--enable-screen-delegated-admin`, `--enable-workflow-delegated-admin`                                                                |

- `--template` for `create` is a JSON object with capability keys: `boardFeatures`, `boards`, `field`, `issueType`, `notification`, `permissionScheme`, `project`, `role`, `scope`, `security`, `workflow`. Its `project` capability accepts only `projectTypeKey` (`software`, `business`, `service_desk`, `product_discovery`), `pcri`, and the scheme references `fieldLayoutSchemeId`, `issueSecuritySchemeId`, `issueTypeSchemeId`, `issueTypeScreenSchemeId`, `notificationSchemeId`, `permissionSchemeId`, `workflowSchemeId` (each a `pcri:<type>:id:<id>` reference, e.g. `pcri:permissionScheme:id:10001`).
- Within `workflow.statuses[]`, the optional `scope` field accepts only `"GLOBAL"` to share that status across projects; omit it for Jira's default project-scoped behavior.
- `--access-level` must be one of: `open`, `limited`, `private`, `free`.
- `--assignee-type` must be one of: `PROJECT_DEFAULT`, `COMPONENT_LEAD`, `PROJECT_LEAD`, `UNASSIGNED`.
- `--template-type` must be one of: `LIVE`, `SNAPSHOT`.
- `--enable-screen-delegated-admin` and `--enable-workflow-delegated-admin` are boolean flags: bare or `true` sends `true`, `false` (or `--no-<flag>`) sends `false`, omitted sends nothing.
- `--enable-components` is a boolean flag with the same `true`/`false` forms.
- The `edit-template` and `live-template` selectors are required by Jira, which uses them to find the template. The CLI does not check them: `edit-template` only checks that some flag is set, and `live-template` sends no selector if you pass none. Pass them as in the examples below.

```sh
# Create a project with a custom template (async) — B653
atlas jira project-template create \
  --name "My Project" \
  --key "MP" \
  --description "Created from custom template" \
  --language "en" \
  --template '{"project":{"projectTypeKey":"software"}}'

# Create a project that reuses existing schemes — B653
atlas jira project-template create \
  --name "Ops" \
  --key "OPS" \
  --template '{"project":{"projectTypeKey":"business","permissionSchemeId":"pcri:permissionScheme:id:10001","workflowSchemeId":"pcri:workflowScheme:id:10002"}}'

# Edit an existing custom template — B654
atlas jira project-template edit-template \
  --template-key "my-template-key" \
  --template-name "Renamed Template" \
  --template-description "Updated description"

# Enable delegated admin support on a template — B654
atlas jira project-template edit-template \
  --template-key "my-template-key" \
  --enable-screen-delegated-admin \
  --enable-workflow-delegated-admin

# Get live template by project ID — B655
atlas jira project-template live-template --project-id "10001"

# Get live template by template key — B655
atlas jira project-template live-template --template-key "my-template-key"

# Remove a custom template — B656
atlas jira project-template remove-template --template-key "my-template-key"

# Save a template from a project (snapshot) — B657
atlas jira project-template save-template \
  --template-name "My Snapshot Template" \
  --template-description "Snapshot of project 10001" \
  --project-id 10001 \
  --template-type SNAPSHOT

# Save a live template from a project — B657
atlas jira project-template save-template \
  --template-name "My Live Template" \
  --project-id 10001 \
  --template-type LIVE \
  --enable-workflow-delegated-admin
```
