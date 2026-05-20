# Confluence reference — `atlas confluence`

Confluence Cloud REST API v2 surface. Load this file when you need a flag or action the canonical examples in `SKILL.md` don't cover.

## Resource × action matrix

| Resource                | Actions                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `pages`                 | `list`, `get`, `create`, `update`, `delete`                             |
| `spaces`                | `list`, `get`                                                           |
| `blog-posts`            | `list`, `get`, `create`, `update`, `delete`                             |
| `comments`              | `list`, `get`, `create`, `delete`                                       |
| `attachments`           | `list`, `get`, `delete`                                                 |
| `labels`                | `list`                                                                  |
| `admin-key`             | `get`, `create`, `delete`                                               |
| `app`                   | `list-properties`, `get-property`, `upsert-property`, `delete-property` |
| `classification-levels` | `list`                                                                  |
| `content`               | `convert-ids-to-types`                                                  |
| `space-permissions`     | `list`                                                                  |
| `space-role-mode`       | `get`                                                                   |
| `users-bulk`            | `lookup`                                                                |

## `pages`

| Action   | Positional | Required flags                          | Optional flags                                                              |
| -------- | ---------- | --------------------------------------- | --------------------------------------------------------------------------- |
| `list`   | —          | —                                       | `--space-id`, `--title`, `--status`, `--limit`, `--cursor`, `--body-format` |
| `get`    | `<pageId>` | —                                       | —                                                                           |
| `create` | —          | `--space-id`, `--title`, `--body`       | —                                                                           |
| `update` | `<pageId>` | `--version-number`, `--title`, `--body` | —                                                                           |
| `delete` | `<pageId>` | —                                       | `--purge`                                                                   |

- `--body-format` accepts `storage` (default Confluence storage XML).
- `--version-number` for `update` must be a positive integer equal to the current version (which you get from `pages get`). Confluence enforces optimistic concurrency; mismatches return 409.
- `--purge` on `delete` permanently removes the page; without it the page goes to trash.

## `spaces`

| Action | Positional  | Optional flags        |
| ------ | ----------- | --------------------- |
| `list` | —           | `--limit`, `--cursor` |
| `get`  | `<spaceId>` | —                     |

## `blog-posts`

Same shape as `pages`: `list`, `get <id>`, `create --space-id --title --body`, `update <id> --version-number --title --body`, `delete <id> [--purge]`.

## `comments`

| Action   | Positional    | Required flags                                   | Optional flags                          |
| -------- | ------------- | ------------------------------------------------ | --------------------------------------- |
| `list`   | —             | one of `--page-id` or `--blog-post-id`           | `--limit`, `--cursor`, `--comment-type` |
| `get`    | `<commentId>` | —                                                | —                                       |
| `create` | —             | one of `--page-id` or `--blog-post-id`, `--body` | —                                       |
| `delete` | `<commentId>` | —                                                | —                                       |

- `--comment-type` accepts `footer` (top-level) or `inline`. Default is `footer`.

## `attachments`

| Action   | Positional       | Optional flags                     |
| -------- | ---------------- | ---------------------------------- |
| `list`   | —                | `--page-id`, `--limit`, `--cursor` |
| `get`    | `<attachmentId>` | —                                  |
| `delete` | `<attachmentId>` | —                                  |

Upload is not exposed via the CLI; use the SDK's `attachments.upload()` with a `Blob` or `ReadableStream`.

## `labels`

| Action | Positional | Optional flags                     |
| ------ | ---------- | ---------------------------------- |
| `list` | —          | `--page-id`, `--limit`, `--cursor` |

## `admin-key`

The admin key is a tenant-scoped, time-bound credential that lets an organisation admin perform privileged operations (e.g. permanently delete pages or spaces) without per-request elevation. Only one key may be active at a time — `create` rotates an existing key.

| Action   | Positional | Optional flags     |
| -------- | ---------- | ------------------ |
| `get`    | —          | —                  |
| `create` | —          | `--duration-hours` |
| `delete` | —          | —                  |

- `--duration-hours` must be a positive integer; the Confluence server currently accepts 1-24 (default 1). Omit the flag to use the server default.
- `delete` is idempotent; calling it when no key exists returns success.

```sh
# Inspect the active admin key (if any)
atlas confluence admin-key get

# Enable an admin key for the server default duration
atlas confluence admin-key create

# Rotate / enable with an explicit duration (hours)
atlas confluence admin-key create --duration-hours 4

# Revoke
atlas confluence admin-key delete
```

## `app`

App properties are per-Forge / Connect-app key-value storage; they are scoped
to the calling app, **not** to any page, space, or user. The CLI exposes the
four v2 `/app/properties` endpoints.

| Action            | Positional      | Required flags | Optional flags        |
| ----------------- | --------------- | -------------- | --------------------- |
| `list-properties` | —               | —              | `--limit`, `--cursor` |
| `get-property`    | `<propertyKey>` | —              | —                     |
| `upsert-property` | `<propertyKey>` | `--value`      | —                     |
| `delete-property` | `<propertyKey>` | —              | —                     |

- `--value` accepts any JSON literal; pass it quoted, e.g.
  `--value '{"darkMode":true,"buildNumber":7}'` or `--value '"hello"'`. A bare
  string (e.g. `--value hello`) that does not parse as JSON is stored as the
  literal string `"hello"`.
- `upsert-property` is a single PUT — it creates the key if absent and replaces
  the existing value otherwise. There is no version field; Confluence does not
  enforce optimistic concurrency on app properties.
- The CLI authenticates as the calling user, so it can only see / mutate
  properties belonging to the app whose credentials you supply.

```sh
# List the first 25 properties this app has stored
atlas confluence app list-properties --limit 25

# Read a single property
atlas confluence app get-property my-feature-flags

# Create / replace a property with a JSON object value
atlas confluence app upsert-property my-feature-flags --value '{"beta":true}'

# Delete a property
atlas confluence app delete-property my-feature-flags
```

## `classification-levels`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `list` | —          | —              | —              |

Lists the data-classification levels defined for the Confluence Cloud organization (`GET /wiki/api/v2/classification-levels`). Requires the `read:configuration:confluence` OAuth scope (or `READ` Connect app scope) and the `Can use` global permission. Returns a JSON array of `ClassificationLevel` objects (`id`, `status`, `order`, `name`, `description`, `guideline`, `color`); responds 404 when the site edition has no data-classification entitlement.

```sh
atlas confluence classification-levels list
```

## `content`

Helpers that operate on raw v2 content identifiers without binding to one of the typed resources.

| Action                 | Positional | Required flags | Optional flags |
| ---------------------- | ---------- | -------------- | -------------- |
| `convert-ids-to-types` | —          | `--ids`        | —              |

`POST /wiki/api/v2/content/convert-ids-to-types` maps a batch of content ids
into their associated v2 content types. Useful when migrating from v1 (which
collapsed inline + footer comments under the single `comment` type) — v2
returns `inline-comment` / `footer-comment` distinctly, plus `page`,
`blogpost`, `attachment`, or a custom content type string. Ids the caller
cannot view or that do not exist appear in `results` with a `null` value.

- `--ids` accepts either a comma-separated list (`--ids 12345,67890`) or a
  JSON array (`--ids '["12345",67890]'`). JSON wins when the value parses as
  an array; otherwise the value is split on commas. The Confluence server
  caps each request at 100 ids and rejects oversize requests with a 400.
- Ids may be strings or numbers per the OpenAPI spec; this CLI preserves
  whatever form you pass — numeric ids are not silently coerced.

```sh
# Convert a small comma-separated batch
atlas confluence content convert-ids-to-types --ids 12345,67890,11111

# JSON form (mixed string / number)
atlas confluence content convert-ids-to-types --ids '["12345",67890]'
```

## `space-permissions`

| Action | Positional | Required flags | Optional flags        |
| ------ | ---------- | -------------- | --------------------- |
| `list` | —          | —              | `--limit`, `--cursor` |

Lists the _available_ space-permission definitions for the Confluence Cloud organization (`GET /wiki/api/v2/space-permissions`). These describe the permissions the platform supports (`id`, `displayName`, `description`, `requiredPermissionIds`) — they are **not** per-space grants. Per-space assignments are exposed by the separate `/spaces/{id}/permissions` endpoint (not covered here). Requires the `read:space.permission:confluence` OAuth scope (or `READ` Connect app scope); available on tenants with Role-Based Access Control. Returns the standard `{ results, _links }` cursor-paginated wrapper; `--limit` accepts 1-250 (server default 25).

```sh
# First page (server default 25 per page)
atlas confluence space-permissions list

# Larger page
atlas confluence space-permissions list --limit 100

# Next page using the cursor from _links.next
atlas confluence space-permissions list --cursor "<value-from-response>"
```

## `space-role-mode`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `get`  | —          | —              | —              |

Retrieves the tenant's space role mode (`GET /wiki/api/v2/space-role-mode`). Available on sites with [Role-Based Access Control](https://support.atlassian.com/confluence-cloud/docs/manage-user-roles/). Requires the `read:configuration:confluence` OAuth scope (or `READ` Connect app scope) and the `Can use` global permission. Returns a JSON object `{ "mode": "PRE_ROLES" | "ROLES_TRANSITION" | "ROLES" }`; the field is omitted on tenants that don't surface a mode, so callers should treat it as optional. Responds 404 when the calling user lacks permission to view the role mode.

```sh
atlas confluence space-role-mode get
```

## `users-bulk`

| Action   | Positional | Required flags  | Optional flags |
| -------- | ---------- | --------------- | -------------- |
| `lookup` | —          | `--account-ids` | —              |

Resolves user details for a batch of `accountId`s in a single request
(`POST /wiki/api/v2/users-bulk`). The endpoint is single-shot (not paginated)
and Confluence caps the batch at 1-250 IDs server-side.

- `--account-ids` is a comma-separated list of Atlassian account IDs
  (e.g. `--account-ids acc-1,acc-2,acc-3`). Surrounding whitespace per entry
  is trimmed; empty entries are dropped. The CLI rejects an empty effective
  list before issuing the request.
- The response shape is `{ results: User[], _links?: { base?: string } }`.
  `results` may be empty if none of the IDs resolve; per-user fields such as
  `email`, `timeZone`, and `profilePicture` may be omitted depending on the
  target user's privacy settings.
- Requires the `Can use` Confluence global permission and the ability to
  view user profiles; a 404 is returned when those are absent.

```sh
# Look up two users by account ID
atlas confluence users-bulk lookup --account-ids acc-1,acc-2

# Pipe into jq to project just displayName / accountId
atlas confluence users-bulk lookup --account-ids acc-1,acc-2 \
  | jq '.results[] | { accountId, displayName }'
```

## Pagination

Confluence uses cursor-based pagination. Every `list` response has a `_links.next` URL containing a `cursor` query parameter. Extract that value and pass it back as `--cursor` on the next call:

```sh
# First page
atlas confluence pages list --space-id 123 --limit 50

# Look at _links.next in the JSON output, extract `cursor=…`, then:
atlas confluence pages list --space-id 123 --limit 50 --cursor "<value-from-response>"
```

When `_links.next` is absent, you've reached the end.

For programmatic iteration over all pages, prefer the SDK's `paginateCursor` helper:

```ts
import { ConfluenceClient, paginateCursor } from 'atlassian-api-client';
const client = new ConfluenceClient(config);
for await (const page of paginateCursor((cursor) => client.pages.list({ spaceId, cursor }))) {
  // ...
}
```

## Output shape notes

- `pages get` returns the full page object including `body.storage.value` (the raw storage XML). For just the body text, post-process with `jq`: `atlas confluence pages get 123 | jq -r '.body.storage.value'`.
- `pages list` returns `{ results: [...], _links: { next?: string } }`. Use `jq '.results[].id'` to extract IDs or pass `--format minimal` to get IDs one per line.
- `spaces` responses include `key` (human-readable, e.g. `ENG`) and `id` (numeric). The CLI accepts the numeric `id` everywhere; convert from `key` via `atlas confluence spaces list --format json | jq '.results[] | select(.key=="ENG") | .id'`.
