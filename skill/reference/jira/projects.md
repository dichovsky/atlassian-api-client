# Jira — Projects, components, versions, roles, templates

> Part of the `atlas` Jira skill reference. Resource×action matrix and routing in [`../jira.md`](../jira.md).

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

## `projects`

| Action                        | Positional                         | Required flags                          | Optional flags                                                                                                                                   |
| ----------------------------- | ---------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `list`                        | —                                  | —                                       | `--max-results`                                                                                                                                  |
| `get`                         | `<projectKeyOrId>`                 | —                                       | —                                                                                                                                                |
| `list-legacy`                 | —                                  | —                                       | `--max-results`, `--order-by`, `--start-at`, `--expand` (CSV), `--type-key` (CSV), `--category-id`, `--action`, `--query`                        |
| `create`                      | —                                  | `--key`, `--name`, `--project-type-key` | `--description`, `--lead-account-id`, `--url`, `--assignee-type`, `--avatar-id`, `--permission-scheme`, `--notification-scheme`, `--category-id` |
| `update`                      | `<projectIdOrKey>`                 | —                                       | `--name`, `--description`, `--lead-account-id`, `--url`, `--assignee-type`                                                                       |
| `delete`                      | `<projectIdOrKey>`                 | —                                       | `--enable-undo`                                                                                                                                  |
| `recent`                      | —                                  | —                                       | `--max-results`, `--expand` (CSV)                                                                                                                |
| `list-types`                  | —                                  | —                                       | —                                                                                                                                                |
| `get-type`                    | `<typeKey>`                        | —                                       | —                                                                                                                                                |
| `get-accessible-type`         | `<typeKey>`                        | —                                       | —                                                                                                                                                |
| `list-accessible-types`       | —                                  | —                                       | —                                                                                                                                                |
| `get-email`                   | `<projectId>`                      | —                                       | —                                                                                                                                                |
| `set-email`                   | `<projectId>`                      | —                                       | `--email-address`                                                                                                                                |
| `get-hierarchy`               | `<projectId>`                      | —                                       | —                                                                                                                                                |
| `archive`                     | `<projectIdOrKey>`                 | —                                       | —                                                                                                                                                |
| `set-avatar`                  | `<projectIdOrKey>`                 | `--avatar-id`                           | —                                                                                                                                                |
| `delete-avatar`               | `<projectIdOrKey>` `<avatarId>`    | —                                       | —                                                                                                                                                |
| `load-avatar`                 | `<projectIdOrKey>`                 | `--value` (JSON)                        | —                                                                                                                                                |
| `get-avatars`                 | `<projectIdOrKey>`                 | —                                       | —                                                                                                                                                |
| `get-classification-config`   | `<projectIdOrKey>`                 | —                                       | —                                                                                                                                                |
| `delete-classification-level` | `<projectIdOrKey>`                 | —                                       | —                                                                                                                                                |
| `get-classification-level`    | `<projectIdOrKey>`                 | —                                       | —                                                                                                                                                |
| `set-classification-level`    | `<projectIdOrKey>`                 | —                                       | `--classification-id`                                                                                                                            |
| `list-components`             | `<projectIdOrKey>`                 | —                                       | `--start-at`, `--max-results`, `--order-by`, `--component-source`, `--query`                                                                     |
| `list-all-components`         | `<projectIdOrKey>`                 | —                                       | —                                                                                                                                                |
| `delete-async`                | `<projectIdOrKey>`                 | —                                       | —                                                                                                                                                |
| `get-features`                | `<projectIdOrKey>`                 | —                                       | —                                                                                                                                                |
| `set-feature-state`           | `<projectIdOrKey>` `<featureKey>`  | `--state`                               | —                                                                                                                                                |
| `list-properties`             | `<projectIdOrKey>`                 | —                                       | —                                                                                                                                                |
| `delete-property`             | `<projectIdOrKey>` `<propertyKey>` | —                                       | —                                                                                                                                                |
| `get-property`                | `<projectIdOrKey>` `<propertyKey>` | —                                       | —                                                                                                                                                |
| `set-property`                | `<projectIdOrKey>` `<propertyKey>` | `--value` (JSON)                        | —                                                                                                                                                |
| `restore`                     | `<projectIdOrKey>`                 | —                                       | —                                                                                                                                                |
| `list-roles`                  | `<projectIdOrKey>`                 | —                                       | —                                                                                                                                                |
| `get-role`                    | `<projectIdOrKey>` `<roleId>`      | —                                       | `--exclude-inactive-users`                                                                                                                       |
| `delete-role-actors`          | `<projectIdOrKey>` `<roleId>`      | —                                       | `--user`, `--group-id`, `--group`                                                                                                                |
| `add-role-actors`             | `<projectIdOrKey>` `<roleId>`      | `--body` (JSON)                         | —                                                                                                                                                |
| `set-role-actors`             | `<projectIdOrKey>` `<roleId>`      | `--body` (JSON)                         | —                                                                                                                                                |
| `get-role-details`            | `<projectIdOrKey>`                 | —                                       | `--current-member`, `--exclude-connect-addons`                                                                                                   |
| `get-statuses`                | `<projectIdOrKey>`                 | —                                       | —                                                                                                                                                |
| `list-versions`               | `<projectIdOrKey>`                 | —                                       | `--start-at`, `--max-results`, `--order-by`, `--query`, `--status`, `--expand`                                                                   |
| `list-all-versions`           | `<projectIdOrKey>`                 | —                                       | `--max-results`, `--order-by`, `--query`, `--status`, `--expand`                                                                                 |
| `get-issue-security-scheme`   | `<projectKeyOrId>`                 | —                                       | —                                                                                                                                                |
| `get-notification-scheme`     | `<projectKeyOrId>`                 | —                                       | `--expand`                                                                                                                                       |
| `get-permission-scheme`       | `<projectKeyOrId>`                 | —                                       | `--expand`                                                                                                                                       |
| `set-permission-scheme`       | `<projectKeyOrId>`                 | `--permission-scheme`                   | —                                                                                                                                                |
| `get-security-levels`         | `<projectKeyOrId>`                 | —                                       | —                                                                                                                                                |
| `list-categories`             | —                                  | —                                       | —                                                                                                                                                |
| `create-category`             | —                                  | `--name`                                | `--description`                                                                                                                                  |
| `delete-category`             | `<categoryId>`                     | —                                       | —                                                                                                                                                |
| `get-category`                | `<categoryId>`                     | —                                       | —                                                                                                                                                |
| `update-category`             | `<categoryId>`                     | —                                       | `--name`, `--description`                                                                                                                        |
| `get-projects-fields`         | —                                  | —                                       | —                                                                                                                                                |
| `validate-project-key`        | —                                  | `--key`                                 | —                                                                                                                                                |
| `get-valid-project-key`       | —                                  | `--key`                                 | —                                                                                                                                                |
| `get-valid-project-name`      | —                                  | `--name`                                | —                                                                                                                                                |

- `--assignee-type` accepts `PROJECT_LEAD` or `UNASSIGNED`.
- `list-legacy` calls the deprecated `GET /project` endpoint (returns a flat array, not paginated).
- `list` uses `GET /project/search` (paginated, preferred).
- `list-versions` returns a paginated response; `list-all-versions` returns a flat array.
- `add-role-actors` accepts `--body` as a flat `ActorsMap` JSON object with `user`, `group`, and/or `groupId` string arrays (e.g. `{"user":["acc-1"]}`).
- `set-role-actors` accepts `--body` as a JSON object.
- `delete-role-actors` removes actors by `--user` (accountId), `--group-id`, or `--group` (name).
- `set-email` updates the project email address; `--email-address` is optional (omit to clear).
- `archive` and `restore` move a project into/out of archived state.
- `load-avatar` accepts `--value` as a JSON object containing the crop coordinates and image data for the avatar upload.
- `set-classification-level` requires `--classification-id`; omit to clear the level.
- `list-components` is paginated; `list-all-components` returns all components as a flat array.
- `delete-async` triggers async project deletion (202 Accepted); poll the returned task URL for completion.
- `set-feature-state` toggles a named project feature; `--state` accepts `ENABLED` or `DISABLED`.
- `list-properties`, `get-property`, `delete-property` operate on arbitrary key-value storage attached to the project.
- `set-property` accepts `--value` as JSON (any valid JSON value).
- `create` returns **project identifiers** `{ id (number), key, self }` — not the full project object. Use the returned `key` with `get` to fetch full details. There is no `--priority-scheme` flag (the spec create body rejects it).
- `validate-project-key` returns an `ErrorCollection` `{ errorMessages?: string[], errors?: { param: message }, status? }`. The key is **valid when `errorMessages` is empty**; there is no `valid` boolean.
- `get-valid-project-key` and `get-valid-project-name` each return a **bare string** (the adjusted key/name), not an object.

```sh
# List projects (paginated, preferred)
atlas jira projects list --max-results 50

# List projects using legacy endpoint with filters
atlas jira projects list-legacy --query "example" --type-key software

# Create a project
atlas jira projects create --key EX --name "Example" --project-type-key software

# Update a project
atlas jira projects update EX --name "Updated Name" --description "New desc"

# Delete a project
atlas jira projects delete EX

# List recently viewed projects
atlas jira projects recent --max-results 10

# List all project types
atlas jira projects list-types

# Get a specific project type
atlas jira projects get-type software

# List accessible project types
atlas jira projects list-accessible-types

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

# Replace all actors for a project role
atlas jira projects set-role-actors PROJ 10001 --body '{"categorisedActors":{"atlassian-user-role-actor":["acc-1"]}}'

# Get all role details for a project
atlas jira projects get-role-details PROJ --current-member

# Get issue types and their statuses for a project
atlas jira projects get-statuses PROJ

# List project versions (paginated)
atlas jira projects list-versions PROJ --order-by name --status released

# List all project versions (flat array)
atlas jira projects list-all-versions PROJ --order-by -releaseDate

# Get scheme associations
atlas jira projects get-issue-security-scheme PROJ
atlas jira projects get-notification-scheme PROJ --expand all
atlas jira projects get-permission-scheme PROJ --expand permissions
atlas jira projects set-permission-scheme PROJ --permission-scheme 10001
atlas jira projects get-security-levels PROJ

# Project categories
atlas jira projects list-categories
atlas jira projects create-category --name "Infrastructure" --description "Infra projects"
atlas jira projects get-category 10001
atlas jira projects update-category 10001 --name "Renamed"
atlas jira projects delete-category 10001

# Projects fields and validation
atlas jira projects get-projects-fields
atlas jira projects validate-project-key --key MYPROJ
atlas jira projects get-valid-project-key --key myproj
atlas jira projects get-valid-project-name --name "My Project"

# Project email
atlas jira projects get-email 10001
atlas jira projects set-email 10001 --email-address jira@example.com

# Project hierarchy
atlas jira projects get-hierarchy 10001

# Archive and restore
atlas jira projects archive PROJ
atlas jira projects restore PROJ

# Avatars
atlas jira projects get-avatars PROJ
atlas jira projects set-avatar PROJ --avatar-id 10010
atlas jira projects delete-avatar PROJ 10010

# Data classification
atlas jira projects get-classification-config PROJ
atlas jira projects get-classification-level PROJ
atlas jira projects set-classification-level PROJ --classification-id cl-1
atlas jira projects delete-classification-level PROJ

# Components
atlas jira projects list-components PROJ --max-results 50 --order-by name
atlas jira projects list-all-components PROJ

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

| Action           | Positional | Required flags                                    | Optional flags                               |
| ---------------- | ---------- | ------------------------------------------------- | -------------------------------------------- |
| `list`           | —          | —                                                 | —                                            |
| `get`            | `<roleId>` | —                                                 | —                                            |
| `create`         | —          | `--name`                                          | `--description`                              |
| `update`         | `<roleId>` | at least one of `--name`, `--description`         | —                                            |
| `partial-update` | `<roleId>` | at least one of `--name`, `--description`         | —                                            |
| `delete`         | `<roleId>` | —                                                 | `--swap` (ID of role to reassign to)         |
| `get-actors`     | `<roleId>` | —                                                 | —                                            |
| `add-actors`     | `<roleId>` | at least one of `--user`, `--group`, `--group-id` | —                                            |
| `delete-actors`  | `<roleId>` | —                                                 | `--account-id`, `--group-name`, `--group-id` |

- `--user` and `--group-id` / `--group` for `add-actors` accept comma-separated values (multiple accounts/groups in one call).
- `--account-id` / `--group-name` / `--group-id` for `delete-actors` accept a single value each (use `--account-id` instead of `--user` to remove a single user).
- `update` (PUT) and `partial-update` (POST `/{id}`) are distinct Jira endpoints; Jira differentiates set-actors (POST) from full replace (PUT).
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

| Action                   | Positional                      | Required flags                          | Optional flags                                                                                                                                               |
| ------------------------ | ------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `create`                 | —                               | —                                       | `--name`, `--description`, `--archived`, `--released`, `--start-date`, `--release-date`, `--project`, `--project-id`, `--move-unfixed-issues-to`, `--driver` |
| `get`                    | `<id>`                          | —                                       | `--expand`                                                                                                                                                   |
| `update`                 | `<id>`                          | at least one body flag                  | `--name`, `--description`, `--archived`, `--released`, `--start-date`, `--release-date`, `--project`, `--project-id`, `--move-unfixed-issues-to`, `--driver` |
| `delete`                 | `<id>`                          | —                                       | `--move-fix-issues-to`, `--move-affected-issues-to`                                                                                                          |
| `merge`                  | `<id>` `<moveIssuesTo>`         | —                                       | —                                                                                                                                                            |
| `move`                   | `<id>`                          | at least one of `--after`, `--position` | —                                                                                                                                                            |
| `related-issue-counts`   | `<id>`                          | —                                       | —                                                                                                                                                            |
| `list-related-work`      | `<id>`                          | —                                       | —                                                                                                                                                            |
| `create-related-work`    | `<id>`                          | `--category`                            | `--issue-id` (int), `--title`, `--url`                                                                                                                       |
| `update-related-work`    | `<id>`                          | `--category`                            | `--issue-id` (int), `--title`, `--url`, `--related-work-id`                                                                                                  |
| `delete-and-replace`     | `<id>`                          | —                                       | `--move-fix-issues-to` (int version ID), `--move-affected-issues-to` (int version ID)                                                                        |
| `unresolved-issue-count` | `<id>`                          | —                                       | —                                                                                                                                                            |
| `delete-related-work`    | `<versionId>` `<relatedWorkId>` | —                                       | —                                                                                                                                                            |

- `--archived` and `--released` are bare boolean flags (e.g. `--archived`, `--released`).
- `--move-fix-issues-to` and `--move-affected-issues-to` take a version ID as a string on `delete`, or as an integer on `delete-and-replace`.
- `--position` for `move` accepts `First`, `Last`, `Earlier`, or `Later`.

`````sh
# Create a version
atlas jira version create --name "v1.0" --project PROJ --release-date 2026-06-01

# Get a version
atlas jira version get 10000 --expand issuesstatus

# Update a version
atlas jira version update 10000 --name "v1.1" --released

# Delete a version (swap issues to another version)
atlas jira version delete 10000 --move-fix-issues-to 10001

# Merge two versions
atlas jira version merge 10000 10001

# Move version to a position
atlas jira version move 10000 --position Last

# Related issue counts
atlas jira version related-issue-counts 10000

# List related work
atlas jira version list-related-work 10000

# Create related work
atlas jira version create-related-work 10000 --category "Confluence page" --url "https://example.com"

# Update related work
atlas jira version update-related-work 10000 --category "Design doc" --related-work-id rw-abc --title "Updated"

# Delete and replace version
atlas jira version delete-and-replace 10000 --move-fix-issues-to 10001 --move-affected-issues-to 10001

# Unresolved issue count
atlas jira version unresolved-issue-count 10000

# Delete a single related work entry
atlas jira version delete-related-work 10000 rw-abc

## `project-template`

Custom project template management (B653–B657). Covers the full `/rest/api/3/project-template` surface: create a project with a custom template, edit/save/remove templates, and retrieve live template details.

`create` is asynchronous (303 redirect); follow the `Location` header with `atlas jira task get <taskId>` to track progress. `edit-template`, `remove-template` return `void` (no JSON body). `live-template` returns `ProjectTemplateModel`. `save-template` returns `{ projectTemplateKey }`.

**Note: These endpoints are only available on Jira Enterprise edition.**

| Action            | Positional | Required flags                     | Optional flags                                                                                                                                                                                                                                   |
| ----------------- | ---------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `create`          | —          | `--template` (JSON)                | `--name`, `--key`, `--description`, `--url`, `--language`, `--lead-account-id`, `--access-level`, `--assignee-type`, `--avatar-id` (int), `--category-id` (int), `--enable-components`, `--additional-properties` (JSON `Record<string,string>`) |
| `edit-template`   | —          | at least one of the optional flags | `--template-key`, `--template-name`, `--template-description`, `--enable-screen-delegated-admin`, `--enable-workflow-delegated-admin`                                                                                                            |
| `live-template`   | —          | —                                  | `--project-id`, `--template-key`                                                                                                                                                                                                                 |
| `remove-template` | —          | `--template-key`                   | —                                                                                                                                                                                                                                                |
| `save-template`   | —          | at least one of the optional flags | `--template-name`, `--template-description`, `--project-id` (int), `--template-type` (`LIVE`\|`SNAPSHOT`), `--enable-screen-delegated-admin`, `--enable-workflow-delegated-admin`                                                                |

- `--template` for `create` is a JSON object with capability keys: `boardFeatures`, `boards`, `field`, `issueType`, `notification`, `permissionScheme`, `project`, `role`, `scope`, `security`, `workflow`.
- `--access-level` must be one of: `open`, `limited`, `private`, `free`.
- `--assignee-type` must be one of: `PROJECT_DEFAULT`, `COMPONENT_LEAD`, `PROJECT_LEAD`, `UNASSIGNED`.
- `--template-type` must be one of: `LIVE`, `SNAPSHOT`.
- `--enable-screen-delegated-admin` and `--enable-workflow-delegated-admin` are boolean flags (bare, no value).
- `--enable-components` is a boolean flag (bare, no value).

````sh
# Create a project with a custom template (async) — B653
atlas jira project-template create \
  --name "My Project" \
  --key "MP" \
  --description "Created from custom template" \
  --language "en" \
  --template '{"project":{"projectType":"software"}}'

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
`````
