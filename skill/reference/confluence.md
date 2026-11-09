# Confluence reference — `atlas confluence`

Confluence Cloud REST API v2 surface. Load this file when you need a flag or action the canonical examples in `SKILL.md` don't cover.

API lifecycle notes: `pages children` is deprecated by Atlassian; prefer
`direct-children` for immediate children or `descendants` for recursive
traversal. The space-permission `transition-*`, `users` access, `data-policies`,
and Forge `app` property operations are experimental. Forge app properties
additionally require Forge `asApp()`; the CLI's basic/bearer authentication
cannot provide that context.

## Resource × action matrix

| Resource                | Actions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages`                 | `list`, `get`, `create`, `update`, `delete`, `ancestors`, `descendants`, `direct-children`, `children`, `get-classification-level`, `update-classification-level`, `reset-classification-level`, `custom-content`, `likes-count`, `likes-users`, `operations`, `redact`, `update-title`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`, `version`, `versions`, `footer-comments`, `inline-comments`, `upload-attachment`, `get-restriction-state`, `set-restriction-state`, `list-permissions`, `add-permissions`, `set-permissions`, `delete-permissions` |
| `spaces`                | `list`, `get`, `create`, `blog-posts`, `get-default-classification-level`, `update-default-classification-level`, `delete-default-classification-level`, `content-labels`, `custom-content`, `labels`, `operations`, `pages`, `permissions`, `role-assignments`, `set-role-assignments`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`                                                                                                                                                                                                                     |
| `blog-posts`            | `list`, `get`, `create`, `update`, `delete`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`, `attachments`, `get-classification-level`, `update-classification-level`, `reset-classification-level`, `custom-content`, `footer-comments`, `inline-comments`, `labels`, `likes-count`, `likes-users`, `operations`, `redact`, `versions`, `version`, `get-restriction-state`, `set-restriction-state`, `list-permissions`, `add-permissions`, `set-permissions`, `delete-permissions`                                                                        |
| `comments`              | `list`, `get`, `create`, `update`, `delete`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `attachments`           | `list`, `list-all`, `get`, `delete`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`, `versions`, `get-version`, `footer-comments`, `labels`, `operations`, `thumbnail`                                                                                                                                                                                                                                                                                                                                                                                      |
| `labels`                | `list`, `list-all`, `attachments`, `blog-posts`, `pages`, `list-for-space`, `list-for-blog-post`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `admin-key`             | `get`, `create`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `app`                   | `list-properties`, `get-property`, `upsert-property`, `delete-property`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `classification-levels` | `list`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `content`               | `convert-ids-to-types`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `custom-content`        | `list`, `get`, `create`, `update`, `delete`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`, `versions`, `version`, `attachments`, `children`, `footer-comments`, `labels`, `operations`                                                                                                                                                                                                                                                                                                                                                                    |
| `data-policies`         | `get-metadata`, `list-spaces`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `databases`             | `create`, `get`, `delete`, `ancestors`, `descendants`, `direct-children`, `operations`, `get-classification-level`, `update-classification-level`, `reset-classification-level`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`, `get-restriction-state`, `set-restriction-state`, `list-permissions`, `add-permissions`, `set-permissions`, `delete-permissions`, `fields`, `views`, `entries`, `get-entry`                                                                                                                                                |
| `embeds`                | `create`, `get`, `delete`, `ancestors`, `descendants`, `direct-children`, `operations`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `folders`               | `create`, `get`, `delete`, `ancestors`, `descendants`, `direct-children`, `operations`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`, `get-restriction-state`, `set-restriction-state`, `list-permissions`, `add-permissions`, `set-permissions`, `delete-permissions`                                                                                                                                                                                                                                                                                    |
| `footer-comments`       | `list`, `get`, `update`, `children`, `likes-count`, `likes-users`, `operations`, `versions`, `version`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `inline-comments`       | `list`, `children`, `likes-count`, `likes-users`, `operations`, `versions`, `version`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `space-permissions`     | `list`, `transition-remove-access`, `transition-list-combinations`, `transition-generate-combinations`, `transition-assign-roles`, `transition-task-status`                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `space-role-mode`       | `get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `space-roles`           | `list`, `get`, `create`, `update`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `tasks`                 | `list`, `get`, `update`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `users`                 | `check-access-by-email`, `invite-by-email`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `users-bulk`            | `lookup`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `whiteboards`           | `create`, `get`, `delete`, `ancestors`, `descendants`, `direct-children`, `operations`, `get-classification-level`, `update-classification-level`, `reset-classification-level`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`, `get-restriction-state`, `set-restriction-state`, `list-permissions`, `add-permissions`, `set-permissions`, `delete-permissions`                                                                                                                                                                                           |

## `pages`

Lifecycle (`list` / `get` / `create` / `update` / `delete`) plus the full `/pages/{id}/…` sub-resource family — hierarchy (`ancestors`, `descendants`, `direct-children`, `children`), classification level (read / write / reset), custom-content children, likes (count + users), permitted operations, the redaction verb, the targeted title update, content-property collections, single-version fetch, and attachment upload.

| Action                        | Positional | Required flags                                          | Optional flags                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `list`                        | —          | —                                                       | `--space-id`, `--id`, `--title`, `--status`, `--subtype`, `--sort`, `--body-format`, `--limit`, `--cursor`                                                                                                                                                                                                                                                   |
| `get`                         | `<pageId>` | —                                                       | `--body-format`, `--get-draft`, `--status`, `--historical-version`, `--include-labels`, `--include-properties`, `--include-operations`, `--include-likes`, `--include-versions`, `--include-version`, `--no-include-version`, `--include-favorited-by-current-user-status`, `--include-webresources`, `--include-collaborators`, `--include-direct-children` |
| `create`                      | —          | `--space-id`                                            | `--title`, `--parent-id`, `--status`, `--subtype`, `--body`, `--body-representation`, `--body-json`, `--embedded`, `--private`, `--root-level`                                                                                                                                                                                                               |
| `update`                      | `<pageId>` | `--version-number`, `--title`, `--body`                 | `--status`, `--body-representation`, `--message`, `--parent-id`, `--owner-id`                                                                                                                                                                                                                                                                                |
| `delete`                      | `<pageId>` | —                                                       | `--purge`, `--draft`                                                                                                                                                                                                                                                                                                                                         |
| `ancestors`                   | `<pageId>` | —                                                       | `--limit`                                                                                                                                                                                                                                                                                                                                                    |
| `descendants`                 | `<pageId>` | —                                                       | `--limit`, `--depth`, `--cursor`                                                                                                                                                                                                                                                                                                                             |
| `direct-children`             | `<pageId>` | —                                                       | `--limit`, `--cursor`, `--sort`                                                                                                                                                                                                                                                                                                                              |
| `children` (deprecated)       | `<pageId>` | —                                                       | `--limit`, `--cursor`, `--sort`                                                                                                                                                                                                                                                                                                                              |
| `get-classification-level`    | `<pageId>` | —                                                       | `--status`                                                                                                                                                                                                                                                                                                                                                   |
| `update-classification-level` | `<pageId>` | `--level-id`                                            | `--status` (defaults to `current`)                                                                                                                                                                                                                                                                                                                           |
| `reset-classification-level`  | `<pageId>` | —                                                       | `--status` (defaults to `current`)                                                                                                                                                                                                                                                                                                                           |
| `custom-content`              | `<pageId>` | `--type`                                                | `--sort`, `--cursor`, `--limit`, `--body-format`                                                                                                                                                                                                                                                                                                             |
| `likes-count`                 | `<pageId>` | —                                                       | —                                                                                                                                                                                                                                                                                                                                                            |
| `likes-users`                 | `<pageId>` | —                                                       | `--cursor`, `--limit`                                                                                                                                                                                                                                                                                                                                        |
| `operations`                  | `<pageId>` | —                                                       | —                                                                                                                                                                                                                                                                                                                                                            |
| `redact`                      | `<pageId>` | `--value` (must include `createdAt`, or `--created-at`) | `--created-at`, `--clean-history`                                                                                                                                                                                                                                                                                                                            |
| `update-title`                | `<pageId>` | `--title`                                               | `--status` (defaults to `current`)                                                                                                                                                                                                                                                                                                                           |
| `list-properties`             | `<pageId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`                                                                                                                                                                                                                                                                                                                     |
| `create-property`             | `<pageId>` | `--key`, `--value`                                      | —                                                                                                                                                                                                                                                                                                                                                            |
| `get-property`                | `<pageId>` | `--property-id`                                         | —                                                                                                                                                                                                                                                                                                                                                            |
| `update-property`             | `<pageId>` | `--property-id`, `--key`, `--value`, `--version-number` | `--message`                                                                                                                                                                                                                                                                                                                                                  |
| `delete-property`             | `<pageId>` | `--property-id`                                         | —                                                                                                                                                                                                                                                                                                                                                            |
| `version`                     | `<pageId>` | `--version-number`                                      | —                                                                                                                                                                                                                                                                                                                                                            |
| `versions`                    | `<pageId>` | —                                                       | `--body-format`, `--sort`, `--cursor`, `--limit`                                                                                                                                                                                                                                                                                                             |
| `footer-comments`             | `<pageId>` | —                                                       | `--body-format`, `--status`, `--sort`, `--cursor`, `--limit`                                                                                                                                                                                                                                                                                                 |
| `inline-comments`             | `<pageId>` | —                                                       | `--body-format`, `--status`, `--resolution-status`, `--sort`, `--cursor`, `--limit`                                                                                                                                                                                                                                                                          |
| `upload-attachment`           | `<pageId>` | `--file`                                                | `--filename` (override), `--media-type` (override MIME)                                                                                                                                                                                                                                                                                                      |
| `get-restriction-state`       | `<pageId>` | —                                                       | —                                                                                                                                                                                                                                                                                                                                                            |
| `set-restriction-state`       | `<pageId>` | `--state`                                               | `--allow-self-lockout`                                                                                                                                                                                                                                                                                                                                       |
| `list-permissions`            | `<pageId>` | —                                                       | `--operation`, `--principal-type`, `--principal-id`, `--cursor`, `--limit`                                                                                                                                                                                                                                                                                   |
| `add-permissions`             | `<pageId>` | `--body`                                                | `--allow-self-lockout`                                                                                                                                                                                                                                                                                                                                       |
| `set-permissions`             | `<pageId>` | `--body`                                                | `--allow-self-lockout`                                                                                                                                                                                                                                                                                                                                       |
| `delete-permissions`          | `<pageId>` | —                                                       | `--operation`, `--principal-type`, `--principal-id`, `--allow-self-lockout`                                                                                                                                                                                                                                                                                  |

- `list` filters: `--space-id` (one space ID; a comma-separated list such as `1,2` is rejected before any request), `--id` (comma-separated decimal integer page IDs; `abc` or `0x10` is rejected before any request), `--title` (exact title), `--status` (comma-separated subset of `current`, `archived`, `deleted`, `trashed`), `--subtype` (`live` or `page`), `--sort` (`id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`, `title`, `-title`) and `--body-format` (`storage` or `atlas_doc_format`). `--id` and `--status` are sent as repeated query parameters. Unknown values are rejected before any request.
- `get --body-format` accepts `storage`, `atlas_doc_format`, `view`, `export_view`, `anonymous_export_view`, `styled_view`, or `editor`. `--status` accepts a comma-separated subset of `current`, `archived`, `trashed`, `deleted`, `historical`, `draft`; `--historical-version` selects a positive version number. The `--include-*` flags inline the named optional response block. `--no-include-version` (or `--include-version false`) is the meaningful override for the version block because Atlassian includes it by default; it is mutually exclusive with `--include-version`.
- `create --status` accepts `current` or `draft` (omission means current). `--title` is required for current/default creation but optional with `--status draft`. `--parent-id` maps to the request body's `parentId`; `--subtype` accepts only `live`.
- For a simple body, pass `--body '<p>Storage XML</p>'`; it defaults to `storage`, or choose `--body-representation storage|atlas_doc_format|wiki`. To construct either exact OpenAPI body shape, use `--body-json` with a flat `PageBodyWrite` object or a nested `PageNestedBodyWrite` object, for example `--body-json '{"atlas_doc_format":{"representation":"atlas_doc_format","value":"{\"type\":\"doc\"}"}}'`. Do not combine `--body-json` with `--body` or `--body-representation`.
- `create --embedded` tags the page for NCS, `--private` restricts it to the creator, and `--root-level` creates it outside the space homepage tree. Do not combine a root-level request with `--parent-id`.
- `--body-format` on `custom-content` accepts `raw`, `storage`, or `atlas_doc_format`.
- `--version-number` for `update` and `update-property` must be a positive integer exactly one greater than the current version (Confluence enforces optimistic concurrency; mismatches return 409). `--message` on either sets the new version's message. `update-title` does **not** require optimistic concurrency — no `version.number` field.
- `update` sends `--body` (an empty string is allowed) as `--body-representation` `storage` (default), `atlas_doc_format`, or `wiki`, and `--status` `current` (default) or `draft`. Changing a current page to `draft` replaces any existing draft; `--status current` on a trashed or deleted page restores it (only the status changes). `--body-json` is not accepted on `update`.
- `update --parent-id` moves the page under another parent in the same space (moving between spaces is not supported by the API); `update --owner-id <accountId>` transfers page ownership. Both are optional; omit them to keep the current parent and owner.
- `--purge` on `delete` permanently removes the page; without it the page goes to trash. Pass `--draft` to delete a page that is still a draft (never published). **Draft deletion is permanent even without `--purge`:** Confluence does not send discarded drafts to the trash, so they cannot be restored.
- `ancestors` returns a bare `{ results }` object without a `_links.next` cursor — paginate by re-calling with the highest ancestor's id (same convention as `folders ancestors`, `databases ancestors`).
- `descendants --depth` accepts integers 1–10 per spec (server-enforced).
- `direct-children --sort` accepts `ContentSortOrder`: `created-date`, `-created-date`, `id`, `-id`, `modified-date`, `-modified-date`, `child-position`, `-child-position`, `title`, `-title`. `children --sort` is narrower — `ChildPageSortOrder`: `created-date`, `-created-date`, `id`, `-id`, `child-position`, `-child-position`, `modified-date`, `-modified-date` (no `title`). Atlassian now marks `/children` deprecated; use `/direct-children` for immediate children or `/descendants` for recursive traversal.
- `get-classification-level --status` accepts `current` (default), `draft`, or `archived`. `update-classification-level` / `reset-classification-level` `--status` accepts `current` (default) or `draft` — page classification can be updated per-revision-stream (unlike blog-post classification which is locked to `current`). `--level-id` on update sends the chosen classification id.
- `custom-content --type` is required (Confluence resolves the custom-content namespace from this value). `--sort` accepts `CustomContentSortOrder`: `id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`, `title`, `-title`.
- `likes-count` returns the bare `{ count }` envelope and is not paginated.
- `redact --value` accepts the full `RedactPageData` payload as JSON: `createdAt` (required), optional `versionNumber` (redact a historical version instead of the current one) and `cleanHistory`, and `body.redactions[]` / `title.redactions[]`, each `{ "pointer", "from", "to", "reason"? }` where `pointer` is a JSON pointer to the text node and `from`/`to` are zero-based character offsets (`to` exclusive). `createdAt` must be the timestamp of the version being redacted — read it first with `pages get <pageId>` (`version.createdAt`); a stale value returns 400. The CLI fast-fails when `createdAt` is missing. `--created-at` (ISO-8601) and `--clean-history` override the same keys in `--value`, including an explicit `--clean-history false`; omit the flag to keep the `--value` setting. Requires Atlassian Guard Premium on the target tenant.
- `update-title` targets the `/title` sub-resource (separate from full `update`). Use when you only want to rename the page without touching the body or bumping the page version — handy for bulk renames.
- Content-property `--value` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property`).
- `version --version-number` fetches a single past version by number; the response includes the body and audit metadata. (Dispatched to `client.versions.getForPage` since the SDK already exposes the route there.)
- `versions` lists the full version history of a page (`GET /pages/{id}/versions`). `--body-format` accepts `storage` or `atlas_doc_format`; `--sort` accepts `modified-date` or `-modified-date`. Dispatched to `client.versions.listForPage`.
- `footer-comments` lists footer (top-level) comments on a page (`GET /pages/{id}/footer-comments`). `--status` is a comma-separated subset of `current`, `archived`, `trashed`, `deleted`, `historical`, `draft` (sent as repeated params). `--sort` is `CommentSortOrder`: `created-date`, `-created-date`, `modified-date`, `-modified-date`. The `blog-posts` variant does not accept `archived`.
- `inline-comments` lists inline (anchored) comments on a page (`GET /pages/{id}/inline-comments`). It takes the `footer-comments` flags plus `--resolution-status`, a comma-separated subset of `resolved`, `open`, `dangling`, `reopened`.
- `upload-attachment --file` reads a local file and POSTs it as multipart form-data to the Confluence **REST v1** endpoint `POST /wiki/rest/api/content/{pageId}/child/attachment` (the Confluence v2 API has no write path for attachments). The request includes the required `X-Atlassian-Token: nocheck` header. `--filename` overrides the on-disk name; `--media-type` overrides server-side MIME sniffing. Dispatched to `client.attachments.upload(pageId, filename, blob, mime?)`; returns a `UploadAttachmentResult` with a `results` array of uploaded attachment entries.
- All list endpoints (except `ancestors`) are cursor-paginated — extract `cursor=…` from `_links.next` and pass it back as `--cursor`.
- Descending `--sort` values start with `-`, so attach them with `=` (`--sort=-created-date`); `--sort -created-date` is rejected as an ambiguous option.

- `get-restriction-state`, `set-restriction-state`, `list-permissions`, `add-permissions`, `set-permissions`, and `delete-permissions` follow the shared contract in the "Content permissions and restriction state" section below. `set-restriction-state` needs `--state` (`OPEN`, `EDIT_RESTRICTED`, or `VIEW_RESTRICTED`); `add-permissions` / `set-permissions` need `--body` (JSON `{"permissions":[...]}`).

```sh
# Lifecycle
atlas confluence pages list --space-id 654321 --limit 25
atlas confluence pages list --space-id 654321 --status current,archived --subtype live --sort=-modified-date
atlas confluence pages get 12345
atlas confluence pages update 12345 --title "Renamed" --version-number 2 --body "<p>v2</p>"
atlas confluence pages update 12345 --title "Renamed" --version-number 3 --body "<p>v3</p>" --parent-id 67890 --owner-id 5b10a2844c20165700ede21g
atlas confluence pages update 12345 --title "Draft" --version-number 4 --body "h1. Draft" --body-representation wiki --status draft --message "Reworked intro"
atlas confluence pages delete 12345 --purge

# Hierarchy
atlas confluence pages ancestors 12345 --limit 50
atlas confluence pages descendants 12345 --depth 3 --limit 50
atlas confluence pages direct-children 12345 --sort=-modified-date
atlas confluence pages children 12345 --sort=-child-position

# Classification
atlas confluence pages get-classification-level 12345
atlas confluence pages update-classification-level 12345 --level-id cl-restricted
atlas confluence pages reset-classification-level 12345 --status draft

# Sub-collections
atlas confluence pages custom-content 12345 --type ai.atlassian.collection
atlas confluence pages likes-count 12345
atlas confluence pages likes-users 12345 --limit 50
atlas confluence pages operations 12345

# Redaction / title
atlas confluence pages get 12345 --include-version
atlas confluence pages redact 12345 --value '{"body":{"redactions":[{"pointer":"/body/0/0","from":0,"to":4,"reason":"PII"}]}}' --created-at 2026-05-22T12:00:00Z --clean-history
atlas confluence pages update-title 12345 --title "Renamed" --status current

# Content properties
atlas confluence pages list-properties 12345 --sort key
atlas confluence pages create-property 12345 --key reviewed --value true
atlas confluence pages get-property 12345 --property-id prop-1
atlas confluence pages update-property 12345 --property-id prop-1 --key reviewed --value false --version-number 2 --message "Reviewed again"
atlas confluence pages delete-property 12345 --property-id prop-1

# Versions + attachments upload
atlas confluence pages version 12345 --version-number 2
atlas confluence pages versions 12345 --limit 25
atlas confluence pages footer-comments 12345 --sort=-created-date --limit 25
atlas confluence pages footer-comments 12345 --status current,archived
atlas confluence pages inline-comments 12345 --body-format storage --resolution-status open
atlas confluence pages upload-attachment 12345 --file ./screenshot.png --media-type image/png

# Restriction state and direct permissions
atlas confluence pages get-restriction-state 12345
atlas confluence pages set-restriction-state 12345 --state EDIT_RESTRICTED
atlas confluence pages list-permissions 12345 --principal-type user --principal-id <accountId>
atlas confluence pages add-permissions 12345 --body '{"permissions":[{"operation":"read","principals":[{"principalType":"user","principalId":"<accountId>"}]}]}'
atlas confluence pages delete-permissions 12345 --operation read --principal-type user --principal-id <accountId>
```

## `spaces`

Lifecycle (`list` / `get` / `create`) plus the full `/spaces/{id}/…` sub-resource family: per-space blog posts and pages, custom content of a given type, content labels (on contained content) vs. labels (on the space entity itself), default classification level (read / write / clear), permitted operations, permission assignments, role assignments (read + bulk overwrite), and space-property CRUD.

| Action                                | Positional  | Required flags                                          | Optional flags                                                                                                                                                         |
| ------------------------------------- | ----------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`                                | —           | —                                                       | `--ids`, `--keys`, `--type`, `--status`, `--labels`, `--favorited-by`, `--not-favorited-by`, `--sort`, `--description-format`, `--include-icon`, `--limit`, `--cursor` |
| `get`                                 | `<spaceId>` | —                                                       | `--description-format`, `--include-icon`, `--include-operations`, `--include-properties`, `--include-permissions`, `--include-role-assignments`, `--include-labels`    |
| `create`                              | —           | `--name`                                                | `--key`, `--alias`, `--description`, `--private`, `--template-key`, `--copy-space-access-configuration`, `--value` (role assignments, JSON array)                      |
| `blog-posts`                          | `<spaceId>` | —                                                       | `--sort`, `--status`, `--title`, `--body-format`, `--cursor`, `--limit`                                                                                                |
| `get-default-classification-level`    | `<spaceId>` | —                                                       | —                                                                                                                                                                      |
| `update-default-classification-level` | `<spaceId>` | `--level-id`                                            | —                                                                                                                                                                      |
| `delete-default-classification-level` | `<spaceId>` | —                                                       | —                                                                                                                                                                      |
| `content-labels`                      | `<spaceId>` | —                                                       | `--prefix`, `--sort`, `--cursor`, `--limit`                                                                                                                            |
| `custom-content`                      | `<spaceId>` | `--type`                                                | `--cursor`, `--limit`, `--body-format`                                                                                                                                 |
| `labels`                              | `<spaceId>` | —                                                       | `--prefix`, `--sort`, `--cursor`, `--limit`                                                                                                                            |
| `operations`                          | `<spaceId>` | —                                                       | —                                                                                                                                                                      |
| `pages`                               | `<spaceId>` | —                                                       | `--depth`, `--sort`, `--status`, `--title`, `--body-format`, `--cursor`, `--limit`                                                                                     |
| `permissions`                         | `<spaceId>` | —                                                       | `--cursor`, `--limit`                                                                                                                                                  |
| `role-assignments`                    | `<spaceId>` | —                                                       | `--role-id`, `--role-type`, `--principal-id`, `--principal-type`, `--cursor`, `--limit`                                                                                |
| `set-role-assignments`                | `<spaceId>` | `--value` (JSON array)                                  | —                                                                                                                                                                      |
| `list-properties`                     | `<spaceId>` | —                                                       | `--key`, `--cursor`, `--limit`                                                                                                                                         |
| `create-property`                     | `<spaceId>` | `--key`, `--value`                                      | —                                                                                                                                                                      |
| `get-property`                        | `<spaceId>` | `--property-id`                                         | —                                                                                                                                                                      |
| `update-property`                     | `<spaceId>` | `--property-id`, `--key`, `--value`, `--version-number` | `--message`                                                                                                                                                            |
| `delete-property`                     | `<spaceId>` | `--property-id`                                         | —                                                                                                                                                                      |

- `create` requires either `--key` or `--alias` for the space URL identifier (the OpenAPI spec encodes this constraint in prose); `--description` is sent as `{ value, representation: 'plain' }` since the v2 API only accepts the plain representation. `--private` mints a private space (the calling user becomes the sole admin). `--copy-space-access-configuration` clones the access configuration from the named space id. Available on tenants with Role-Based Access Control. `--value` sends an explicit role-assignment grant set (`roleAssignments`): the same JSON array of `{ principal: { principalType, principalId }, roleId }` entries as `set-role-assignments --value`.
- `list --ids`, `--keys`, and `--labels` accept comma-separated values. Every `--ids` entry must be a decimal integer; the CLI preserves it as a string so int64 values above JavaScript's safe-integer limit (for example, `9007199254740993`) remain exact. `--type` accepts `global`, `collaboration`, `knowledge_base`, `personal`, `system`, `onboarding`, or `xflow_sample_space`; `--status` accepts `current`, `archived`, or `trashed`. `--sort` accepts `id`, `key`, or `name`, optionally prefixed with `-`. `--description-format` is `plain` or `view`; `--include-icon` fetches the icon.
- `get` can inline labels, properties, operations, permissions, and the space icon. `--include-role-assignments` is currently EAP-only. Both `list` and `get` return the current `spaceOwnerId` field when Atlassian exposes it.
- `blog-posts --sort` accepts `BlogPostSortOrder` (`id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`). `--status` is comma-separated `current,deleted,trashed` (narrower than the standalone `/blogposts` collection — `historical` / `draft` are not legal here). `--body-format` is `storage` or `atlas_doc_format`.
- `pages --depth` accepts `all` (default — full subtree) or `root` (top-level pages only). `--status` is comma-separated `current,archived,deleted,trashed`. `--sort` is `PageSortOrder` (`id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`, `title`, `-title`). `--body-format` is `storage` or `atlas_doc_format`.
- `content-labels` returns labels applied to **content within the space** (pages, blog posts, attachments). `labels` returns labels applied to the **space entity itself**. Both accept `--prefix` (`my` or `team` only — narrower than the tenant-wide `/labels` collection which also accepts `global` and `system`) and `--sort` from `LabelSortOrder` (`created-date`, `-created-date`, `id`, `-id`, `name`, `-name`).
- `custom-content --type` is required (Confluence resolves the custom-content namespace from this value). `--body-format` accepts `raw`, `storage`, or `atlas_doc_format`. Unlike the blog-post variant this endpoint does not accept a `--sort` parameter.
- `update-default-classification-level --level-id` sends `{ id: <level-id> }` and returns 204. `delete-default-classification-level` clears the override so content falls back to the tenant-wide default.
- `permissions` returns per-space permission assignments (the `{ principal, operation }` grants actually issued on this space). Distinct from `space-permissions list`, which lists the available permission _definitions_.
- `role-assignments` lists current grants; filter by `--role-id`, `--role-type` (usually `SYSTEM` or `CUSTOM`; the spec types it as an open string, so a tenant-defined type also passes through; sent trimmed, and an empty value is rejected before any request), `--principal-id`, `--principal-type` (`USER` / `GROUP` / `ACCESS_CLASS`).
- `set-role-assignments --value` accepts a JSON array of `{ principal: { principalType, principalId }, roleId }` entries; the server replaces the space's role assignments wholesale with the provided list. Returns the `MultiEntityResult<SpaceRoleAssignment>` envelope from the server (200 response) — `results` is the canonicalised assignment set after the replace (principals and role ids may be normalised), so treat it as the authoritative post-write state rather than re-echoing the request.
- The `*-property` actions wrap `/spaces/{space-id}/properties`. `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string. `list-properties` has no `--sort` (the API defines none, so the CLI rejects it). `update-property --version-number` must be exactly one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409); `--message` sets the version message.
- All list endpoints are cursor-paginated — extract `cursor=…` from `_links.next` and pass it back as `--cursor`.
- Descending `--sort` values start with `-`, so attach them with `=` (`--sort=-created-date`); `--sort -created-date` is rejected as an ambiguous option.

```sh
# Lifecycle
atlas confluence spaces list --status trashed --sort=-name --include-icon --limit 25
atlas confluence spaces get 654321 --description-format view --include-labels --include-permissions
atlas confluence spaces create --name "Engineering" --key ENG --description "Eng wiki"
atlas confluence spaces create --name "Private Inbox" --alias inbox --private
atlas confluence spaces create --name "Design" --key DES --value '[{"principal":{"principalType":"USER","principalId":"acc-1"},"roleId":"role-1"}]'

# Sub-collections
atlas confluence spaces blog-posts 654321 --sort=-created-date --status current --limit 25
atlas confluence spaces pages 654321 --depth root --title "Quarterly" --sort=-modified-date
atlas confluence spaces custom-content 654321 --type ai.atlassian.collection
atlas confluence spaces content-labels 654321 --prefix team
atlas confluence spaces labels 654321 --prefix team --sort=-name
atlas confluence spaces operations 654321

# Classification
atlas confluence spaces get-default-classification-level 654321
atlas confluence spaces update-default-classification-level 654321 --level-id cl-restricted
atlas confluence spaces delete-default-classification-level 654321

# Permissions + roles
atlas confluence spaces permissions 654321 --limit 50
atlas confluence spaces role-assignments 654321 --role-type CUSTOM --principal-type USER
atlas confluence spaces set-role-assignments 654321 --value '[{"principal":{"principalType":"USER","principalId":"acc-1"},"roleId":"role-1"}]'

# Space properties
atlas confluence spaces list-properties 654321 --key feature-flags
atlas confluence spaces create-property 654321 --key feature-flags --value '{"beta":true}'
atlas confluence spaces get-property 654321 --property-id prop-1
atlas confluence spaces update-property 654321 --property-id prop-1 --key feature-flags --value '{"beta":false}' --version-number 2
atlas confluence spaces delete-property 654321 --property-id prop-1
```

## `blog-posts`

Lifecycle (`list` / `get` / `create` / `update` / `delete`) mirrors `pages`: `create --space-id [--title] [--body]`, `update <id> --version-number --title --body`, `delete <id> [--purge|--draft]`.

The remaining actions wrap the `/blogposts/{id}/…` sub-resource family — content properties, attachments, classification level, custom content children, footer + inline comments, labels, likes, operations, redaction, and version history.

| Action                        | Positional     | Required flags                                               | Optional flags                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | -------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`                        | —              | —                                                            | `--space-id`, `--id`, `--title`, `--status`, `--sort`, `--body-format`, `--limit`, `--cursor`                                                                                                                                                                                                                                   |
| `get`                         | `<blogPostId>` | —                                                            | `--body-format`, `--get-draft`, `--status`, `--historical-version`, `--include-labels`, `--include-properties`, `--include-operations`, `--include-likes`, `--include-versions`, `--include-version`, `--no-include-version`, `--include-favorited-by-current-user-status`, `--include-webresources`, `--include-collaborators` |
| `create`                      | —              | `--space-id`; `--title` unless `--status draft`              | `--title`, `--status`, `--body`, `--body-representation`, `--created-at`, `--private`                                                                                                                                                                                                                                           |
| `update`                      | `<blogPostId>` | `--version-number`, `--title`, `--body`                      | `--status`, `--body-representation`, `--message`, `--created-at`                                                                                                                                                                                                                                                                |
| `delete`                      | `<blogPostId>` | —                                                            | `--purge`, `--draft`                                                                                                                                                                                                                                                                                                            |
| `list-properties`             | `<blogPostId>` | —                                                            | `--key`, `--sort`, `--cursor`, `--limit`                                                                                                                                                                                                                                                                                        |
| `create-property`             | `<blogPostId>` | `--key`, `--value`                                           | —                                                                                                                                                                                                                                                                                                                               |
| `get-property`                | `<blogPostId>` | `--property-id`                                              | —                                                                                                                                                                                                                                                                                                                               |
| `update-property`             | `<blogPostId>` | `--property-id`, `--key`, `--value`, `--version-number`      | `--message`                                                                                                                                                                                                                                                                                                                     |
| `delete-property`             | `<blogPostId>` | `--property-id`                                              | —                                                                                                                                                                                                                                                                                                                               |
| `attachments`                 | `<blogPostId>` | —                                                            | `--sort`, `--status`, `--cursor`, `--media-type`, `--filename`, `--limit`                                                                                                                                                                                                                                                       |
| `get-classification-level`    | `<blogPostId>` | —                                                            | `--status`                                                                                                                                                                                                                                                                                                                      |
| `update-classification-level` | `<blogPostId>` | `--level-id`                                                 | `--status` (defaults to `current`)                                                                                                                                                                                                                                                                                              |
| `reset-classification-level`  | `<blogPostId>` | —                                                            | `--status` (defaults to `current`)                                                                                                                                                                                                                                                                                              |
| `custom-content`              | `<blogPostId>` | `--type`                                                     | `--sort`, `--cursor`, `--limit`, `--body-format`                                                                                                                                                                                                                                                                                |
| `footer-comments`             | `<blogPostId>` | —                                                            | `--body-format`, `--status`, `--sort`, `--cursor`, `--limit`                                                                                                                                                                                                                                                                    |
| `inline-comments`             | `<blogPostId>` | —                                                            | `--body-format`, `--status`, `--resolution-status`, `--sort`, `--cursor`, `--limit`                                                                                                                                                                                                                                             |
| `labels`                      | `<blogPostId>` | —                                                            | `--prefix`, `--sort`, `--cursor`, `--limit`                                                                                                                                                                                                                                                                                     |
| `likes-count`                 | `<blogPostId>` | —                                                            | —                                                                                                                                                                                                                                                                                                                               |
| `likes-users`                 | `<blogPostId>` | —                                                            | `--cursor`, `--limit`                                                                                                                                                                                                                                                                                                           |
| `operations`                  | `<blogPostId>` | —                                                            | —                                                                                                                                                                                                                                                                                                                               |
| `redact`                      | `<blogPostId>` | `--value` (must include `createdAt`, or pass `--created-at`) | `--created-at`, `--clean-history`                                                                                                                                                                                                                                                                                               |
| `versions`                    | `<blogPostId>` | —                                                            | `--body-format`, `--sort`, `--cursor`, `--limit`                                                                                                                                                                                                                                                                                |
| `version`                     | `<blogPostId>` | `--version-number`                                           | —                                                                                                                                                                                                                                                                                                                               |
| `get-restriction-state`       | `<blogPostId>` | —                                                            | —                                                                                                                                                                                                                                                                                                                               |
| `set-restriction-state`       | `<blogPostId>` | `--state`                                                    | `--allow-self-lockout`                                                                                                                                                                                                                                                                                                          |
| `list-permissions`            | `<blogPostId>` | —                                                            | `--operation`, `--principal-type`, `--principal-id`, `--cursor`, `--limit`                                                                                                                                                                                                                                                      |
| `add-permissions`             | `<blogPostId>` | `--body`                                                     | `--allow-self-lockout`                                                                                                                                                                                                                                                                                                          |
| `set-permissions`             | `<blogPostId>` | `--body`                                                     | `--allow-self-lockout`                                                                                                                                                                                                                                                                                                          |
| `delete-permissions`          | `<blogPostId>` | —                                                            | `--operation`, `--principal-type`, `--principal-id`, `--allow-self-lockout`                                                                                                                                                                                                                                                     |

- Property `--value` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property`). `update-property --version-number` must be exactly one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409); `--message` sets the version message.
- `create` publishes a current post unless `--status draft`; a draft may omit `--title`. `--body` is sent as `--body-representation` `storage` (default), `atlas_doc_format`, or `wiki` (`--body-json` is not accepted for blog posts). `--created-at` (`yyyy-MM-ddTHH:mm:ss.SSSZ`) back-dates the post; `--private` makes it visible only to you.
- `update` requires `--body` (may be empty) and accepts `--status current|draft` (default `current`; changing a current post to `draft` replaces any existing draft), `--body-representation`, `--message` (version message) and `--created-at`. `--version-number` is the current version + 1.
- `delete` moves a post to the trash. `--purge` permanently deletes a post that is already trashed; `--draft` deletes a draft (drafts are never trashed, so this is permanent).
- `list --sort` accepts `BlogPostSortOrder`: `id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`. `--status` is a comma-separated subset of `current`, `deleted`, `trashed` (the collection filter is narrower than the single-blog-post `get` lookup, which also accepts `draft`/`historical`); `--id` is a comma-separated list of decimal integer blog post IDs. Both are sent as repeated query parameters. `--space-id` takes one space ID; a comma-separated list such as `1,2` is rejected before any request. `--body-format` accepts `storage` or `atlas_doc_format`. `--title` filters by exact title.
- `get` `--body-format` accepts `storage`, `atlas_doc_format`, `view`, `export_view`, `anonymous_export_view`, `styled_view`, or `editor` (spec `PrimaryBodyRepresentationSingle`). `--status` is a comma-separated subset of `current,trashed,deleted,historical,draft`. `--historical-version` selects a specific past version (positive integer); omit for the latest. Boolean `--include-*` flags ask the server to inline an extra sub-resource block (each capped server-side at 50 with a `_links.next` pointer for the full collection); leaving them unset keeps the payload minimal. The version block is the exception: Atlassian includes it by default, so `--no-include-version` (or `--include-version false`) omits it. `--get-draft` retrieves the draft revision when present.
- `attachments --sort` accepts `AttachmentSortOrder`: `created-date`, `-created-date`, `modified-date`, `-modified-date`. `--status` is a comma-separated subset of `current,archived,trashed` (server default is `current,archived`). `--media-type` filters by MIME, `--filename` by exact name.
- `get-classification-level --status` accepts `current` (default), `draft`, or `archived`. `update-classification-level --level-id` sends the chosen classification id; `update-classification-level` and `reset-classification-level` (which falls back to the space default) take `--status current|draft` (default `current`) to target the published or draft version.
- `custom-content --type` is required (Confluence resolves the custom-content namespace from this value). `--body-format` accepts `raw`, `storage`, or `atlas_doc_format`. `--sort` accepts `CustomContentSortOrder`: `id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`, `title`, `-title`.
- `footer-comments` / `inline-comments` `--body-format` accepts `storage` or `atlas_doc_format`. `--status` is a comma-separated subset of `current`, `deleted`, `trashed`, `historical`, `draft` (no `archived`, unlike `pages`). Inline comments additionally accept `--resolution-status`, a comma-separated subset of `resolved`, `open`, `dangling`, `reopened`. Multi-value filters are sent as repeated params. `--sort` is `CommentSortOrder`: `created-date`, `-created-date`, `modified-date`, `-modified-date`.
- `labels --prefix` accepts `my`, `team`, `global`, `system`. `--sort` is `LabelSortOrder`: `created-date`, `-created-date`, `id`, `-id`, `name`, `-name`. The SDK shares this collection with `labels.listForBlogPost` — both call `GET /blogposts/{id}/labels`.
- `likes-count` returns the bare `{ count }` envelope and is not paginated.
- `redact --value` accepts the full `RedactBlogPostData` payload as JSON: `createdAt` (required), optional `versionNumber` (redact a historical version instead of the current one) and `cleanHistory` (squash historical versions that contain the redacted text), and `body.redactions[]` / `title.redactions[]`, each `{ "pointer", "from", "to", "reason"? }` where `pointer` is a JSON pointer to the text node and `from`/`to` are zero-based character offsets (`to` exclusive). `createdAt` must be the timestamp of the version being redacted: read it first with `blog-posts get <id> --include-version` (`version.createdAt`); a stale value returns 400 (`createdAt field is out of date`). The CLI fast-fails when `createdAt` is missing. `--created-at` (ISO-8601) and `--clean-history` override the same keys in `--value`, including an explicit `--clean-history false`; omit the flag to keep the `--value` setting. Requires Atlassian Guard Premium on the target tenant.
- `versions --sort` is the narrow `VersionSortOrder`: only `modified-date` / `-modified-date`. `version --version-number` fetches a single past version by number; the response includes the body and audit metadata.
- All list endpoints are cursor-paginated — extract `cursor=…` from `_links.next` and pass it back as `--cursor`.
- Descending `--sort` values start with `-`, so attach them with `=` (`--sort=-created-date`); `--sort -created-date` is rejected as an ambiguous option.

- `get-restriction-state`, `set-restriction-state`, `list-permissions`, `add-permissions`, `set-permissions`, and `delete-permissions` follow the shared contract in the "Content permissions and restriction state" section below. `set-restriction-state` needs `--state` (`OPEN`, `EDIT_RESTRICTED`, or `VIEW_RESTRICTED`); `add-permissions` / `set-permissions` need `--body` (JSON `{"permissions":[...]}`).

```sh
# Lifecycle
atlas confluence blog-posts list --space-id 654321 --limit 25
atlas confluence blog-posts list --space-id 654321 --sort=-created-date --status current --body-format storage
atlas confluence blog-posts get 99999
atlas confluence blog-posts get 99999 --include-labels --include-likes --body-format atlas_doc_format
atlas confluence blog-posts get 99999 --no-include-version
atlas confluence blog-posts list --id 99999,99998 --status current,trashed
atlas confluence blog-posts create --space-id 654321 --title "Release notes" --body "<p>Shipped</p>" --private
atlas confluence blog-posts create --space-id 654321 --status draft
atlas confluence blog-posts update 99999 --title "Release notes" --version-number 2 --body "h1. Shipped" --body-representation wiki --message "Typo fix"
atlas confluence blog-posts delete 99999 --purge
atlas confluence blog-posts delete 99998 --draft

# Redaction (read version.createdAt first)
atlas confluence blog-posts get 99999 --include-version
atlas confluence blog-posts redact 99999 --value '{"createdAt":"2026-05-01T00:00:00.000Z","title":{"redactions":[{"pointer":"/title","from":0,"to":4,"reason":"PII"}]}}' --clean-history

# Content properties
atlas confluence blog-posts list-properties 99999 --sort key
atlas confluence blog-posts create-property 99999 --key reviewed --value true
atlas confluence blog-posts update-property 99999 --property-id prop-1 --key reviewed --value false --version-number 2

# Attachments + classification
atlas confluence blog-posts attachments 99999 --media-type image/png --sort=-created-date
atlas confluence blog-posts attachments 99999 --status current,archived
atlas confluence blog-posts get-classification-level 99999
atlas confluence blog-posts update-classification-level 99999 --level-id cl-restricted
atlas confluence blog-posts reset-classification-level 99999
atlas confluence blog-posts reset-classification-level 99999 --status draft

# Sub-collections
atlas confluence blog-posts custom-content 99999 --type ai.atlassian.collection
atlas confluence blog-posts footer-comments 99999 --sort=-created-date
atlas confluence blog-posts inline-comments 99999 --resolution-status open,reopened
atlas confluence blog-posts labels 99999 --prefix global

# Likes + operations
atlas confluence blog-posts likes-count 99999
atlas confluence blog-posts likes-users 99999 --limit 50
atlas confluence blog-posts operations 99999

# Versions
atlas confluence blog-posts versions 99999 --sort=-modified-date
atlas confluence blog-posts version 99999 --version-number 2

# Restriction state and direct permissions
atlas confluence blog-posts get-restriction-state 67890
atlas confluence blog-posts set-restriction-state 67890 --state EDIT_RESTRICTED
atlas confluence blog-posts list-permissions 67890 --principal-type user --principal-id <accountId>
atlas confluence blog-posts add-permissions 67890 --body '{"permissions":[{"operation":"read","principals":[{"principalType":"user","principalId":"<accountId>"}]}]}'
atlas confluence blog-posts delete-permissions 67890 --operation read --principal-type user --principal-id <accountId>
```

## `comments`

| Action            | Positional    | Required flags                                                                                                    | Optional flags                                                                                                                                                                              |
| ----------------- | ------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`            | —             | `--page-id`                                                                                                       | `--comment-type`, `--status`, `--resolution-status` (inline), `--sort`, `--body-format`, `--limit`, `--cursor`                                                                              |
| `get`             | `<commentId>` | —                                                                                                                 | `--comment-type`, `--body-format`, `--version-number`, `--include-properties`, `--include-operations`, `--include-likes`, `--include-versions`, `--include-version`, `--no-include-version` |
| `create`          | —             | one of `--page-id`, `--blog-post-id`, `--attachment-id`, `--custom-content-id` or `--parent-comment-id`; `--body` | `--comment-type`, `--body-representation`, `--text-selection`, `--text-selection-match-count`, `--text-selection-match-index`                                                               |
| `update`          | `<commentId>` | `--body`, `--version-number`                                                                                      | `--comment-type`, `--body-representation`, `--message`, `--resolved`, `--no-resolved` (inline only)                                                                                         |
| `delete`          | `<commentId>` | —                                                                                                                 | `--comment-type`                                                                                                                                                                            |
| `list-properties` | `<commentId>` | —                                                                                                                 | `--key`, `--sort`, `--cursor`, `--limit`                                                                                                                                                    |
| `create-property` | `<commentId>` | `--key`, `--value`                                                                                                | —                                                                                                                                                                                           |
| `get-property`    | `<commentId>` | `--property-id`                                                                                                   | —                                                                                                                                                                                           |
| `update-property` | `<commentId>` | `--property-id`, `--key`, `--value`, `--version-number`                                                           | `--message`                                                                                                                                                                                 |
| `delete-property` | `<commentId>` | `--property-id`                                                                                                   | —                                                                                                                                                                                           |

- `--comment-type` accepts `footer` (top-level, the default) or `inline`; any other value is rejected (it never falls back to footer).
- `list` is page-scoped (`GET /pages/{id}/footer-comments` or `/pages/{id}/inline-comments`); it cannot list blog-post comments. To list comments on a blog post, use `atlas confluence blog-posts footer-comments <blogPostId>` or `blog-posts inline-comments <blogPostId>`. `--body-format` accepts `storage` or `atlas_doc_format`; `--status` is a comma-separated subset of `current`, `archived`, `trashed`, `deleted`, `historical`, `draft`; `--sort` is `created-date`, `-created-date`, `modified-date` or `-modified-date`. `--resolution-status` (comma-separated `resolved`, `open`, `dangling`, `reopened`) needs `--comment-type inline`.
- `get` reads `GET /footer-comments/{id}` or `/inline-comments/{id}`. `--body-format` accepts `storage`, `atlas_doc_format`, `view`, `export_view`, `anonymous_export_view`, `styled_view` or `editor`; `--version-number` fetches a past version; the `--include-*` flags inline properties, operations, likes, the version list, or (default on) the current version — `--no-include-version` (or `--include-version false`) omits it.
- `create` needs exactly one container for a top-level comment — `--page-id`, `--blog-post-id`, or (footer comments only) `--attachment-id` / `--custom-content-id` to comment on an attachment or a custom-content item — or `--parent-comment-id <commentId>` (alone — not with a container flag) to reply to an existing comment of the same `--comment-type`. `--attachment-id` and `--custom-content-id` are rejected with `--comment-type inline`. `--body` is the comment text, sent as `--body-representation` `storage` (default), `atlas_doc_format`, or `wiki`.
- A top-level **inline** comment is anchored to page text: pass `--text-selection "<exact text>"`, `--text-selection-match-count <n>` (how many times that text occurs on the page, ≥ 1) and `--text-selection-match-index <i>` (0-based occurrence to highlight). All three are required for a top-level inline comment, and the count must be greater than the index. They are sent as `inlineCommentProperties` and rejected on footer comments and replies.
- `update` issues `PUT /footer-comments/{id}` (footer) or `PUT /inline-comments/{id}` (inline) and always replaces the body: `--body` is sent as `--body-representation` `storage` (default), `atlas_doc_format`, or `wiki`, and `--message` sets the version message. `--version-number` must be exactly one greater than the comment's current version (Confluence enforces optimistic concurrency; mismatches return 409). For inline comments, `--resolved` (or `--resolved true`) marks the thread resolved and `--no-resolved` (or `--resolved false`) reopens it; omitting both leaves the resolution state untouched. `--resolved` / `--no-resolved` are rejected on footer comments. To resolve a thread without changing its text, read the body first (`comments get <id> --comment-type inline --body-format storage`) and re-send it with the next `--version-number`.
- The `*-property` actions hit `/comments/{comment-id}/properties[/{property-id}]` and work for both footer and inline comments — Confluence resolves the comment by id regardless of type, so no `--comment-type` flag is needed.
- `--sort` on `list-properties` accepts `key` or `-key`.
- Descending `--sort` values start with `-`, so attach them with `=` (`--sort=-created-date`); `--sort -created-date` is rejected as an ambiguous option.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409); `--message` sets the version message.

```sh
# List, read
atlas confluence comments list --page-id 12345 --status current,archived --sort=-created-date
atlas confluence comments list --page-id 12345 --comment-type inline --resolution-status open,reopened
atlas confluence comments get 77777 --comment-type inline --body-format storage --include-likes

# Create: footer, reply, anchored inline
atlas confluence comments create --page-id 12345 --body "<p>Looks good</p>"
atlas confluence comments create --parent-comment-id 77777 --body "<p>Agreed</p>"
atlas confluence comments create --comment-type inline --page-id 12345 --body "<p>Typo?</p>" --text-selection "teh" --text-selection-match-count 1 --text-selection-match-index 0

# Update, resolve, delete
atlas confluence comments update 77777 --body "<p>Edited</p>" --version-number 2 --message "Clarified"
atlas confluence comments update 77778 --comment-type inline --body "<p>Typo?</p>" --version-number 2 --resolved
atlas confluence comments delete 77777
atlas confluence comments delete 77778 --comment-type inline

# Content properties
atlas confluence comments update-property 77777 --property-id prop-1 --key reviewed --value true --version-number 2
```

## `attachments`

| Action            | Positional       | Required flags                                          | Optional flags                                                            |
| ----------------- | ---------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `list`            | —                | `--page-id`                                             | `--sort`, `--status`, `--media-type`, `--filename`, `--limit`, `--cursor` |
| `list-all`        | —                | —                                                       | `--status`, `--media-type`, `--filename`, `--sort`, `--limit`, `--cursor` |
| `get`             | `<attachmentId>` | —                                                       | `--version-number`, `--include-*` (see notes), `--no-include-version`     |
| `delete`          | `<attachmentId>` | —                                                       | `--purge`                                                                 |
| `list-properties` | `<attachmentId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`                                  |
| `create-property` | `<attachmentId>` | `--key`, `--value`                                      | —                                                                         |
| `get-property`    | `<attachmentId>` | `--property-id`                                         | —                                                                         |
| `update-property` | `<attachmentId>` | `--property-id`, `--key`, `--value`, `--version-number` | `--message`                                                               |
| `delete-property` | `<attachmentId>` | `--property-id`                                         | —                                                                         |
| `versions`        | `<attachmentId>` | —                                                       | `--sort`, `--cursor`, `--limit`                                           |
| `get-version`     | `<attachmentId>` | `--version-number`                                      | —                                                                         |
| `footer-comments` | `<attachmentId>` | —                                                       | `--body-format`, `--sort`, `--cursor`, `--limit`, `--version-number`      |
| `labels`          | `<attachmentId>` | —                                                       | `--prefix`, `--sort`, `--cursor`, `--limit`                               |
| `operations`      | `<attachmentId>` | —                                                       | —                                                                         |
| `thumbnail`       | `<attachmentId>` | —                                                       | `--width`, `--height`, `--version-number`, `--file`, `--force`            |

- To upload an attachment via the CLI, use `atlas confluence pages upload-attachment <pageId> --file <path>` (optional: `--filename` to override the on-disk name, `--media-type` to override MIME sniffing). The handler reads the file from disk and dispatches to `client.attachments.upload(pageId, filename, blob, mime?)`. See the `pages` section for full flag details. To call the SDK directly, pass the file content as a `Blob`; Node ESM callers can wrap a `Buffer` or `Uint8Array` in a `Blob` first. **Note:** upload uses the Confluence REST v1 endpoint (`POST /wiki/rest/api/content/{pageId}/child/attachment`) because the v2 API has no write path for attachments; the `X-Atlassian-Token: nocheck` header is set automatically. The return type is `UploadAttachmentResult` (a `{ results: UploadAttachmentResultItem[] }` envelope), not the v2 cursor-paginated shape.
- `list` and `list-all` each return one page of results; pass the `cursor=…` value from `_links.next` back as `--cursor` for the next page.
- `list` hits `GET /pages/{pageId}/attachments`; it supports the same attachment `--sort`, comma-separated `--status`, `--media-type`, and `--filename` filters as the current v2 contract. `list-all` hits the tenant-wide `GET /attachments`. `--status` accepts a single value or comma-separated list of `current`, `archived`, `trashed`.
- Descending `--sort` values start with `-`, so attach them with `=` (`--sort=-created-date`); `--sort -created-date` is rejected as an ambiguous option.
- `--sort` enums per action:
  - `list`, `list-all`: `created-date`, `-created-date`, `modified-date`, `-modified-date`
  - `versions`: `modified-date`, `-modified-date`
  - `footer-comments`: `created-date`, `-created-date`, `modified-date`, `-modified-date`
  - `labels`: `created-date`, `-created-date`, `id`, `-id`, `name`, `-name`
  - `list-properties`: `key`, `-key`
- `get` accepts `--version-number` to pin the response to a specific version, plus these `--include-*` boolean flags that inline sub-resources on the response:
  - `--include-labels`
  - `--include-properties`
  - `--include-operations`
  - `--include-versions`
  - `--include-version` (on by default server-side; `--no-include-version` or `--include-version false` omits the version block)
  - `--include-collaborators`
- `delete` accepts `--purge` to permanently delete a previously-trashed attachment (default soft-delete moves it to trash).
- `--prefix` (labels) accepts `my`, `team`, `global`, or `system`.
- `--body-format` (footer-comments) accepts `storage` or `atlas_doc_format`.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `comments create-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409). On `get-version` it identifies the attachment version to fetch; on `footer-comments` it pins the listing to a specific attachment version; on `thumbnail` it pins the rendered thumbnail to a specific attachment version. `--message` on `update-property` sets the version message.
- `thumbnail` downloads the binary thumbnail. With `--file <path>` the bytes are written to that file (an existing file is refused before the download unless `--force`) and the CLI prints `{ "downloaded": true, "byteLength": N, "file": "<path>" }`; without `--file` it prints only `{ "downloaded": true, "byteLength": N }`.

```sh
atlas confluence attachments list --page-id 12345 --status current,archived --sort=-created-date
atlas confluence attachments list-all --media-type image/png --limit 50
atlas confluence attachments get att-1 --include-labels --no-include-version
atlas confluence attachments versions att-1 --sort=-modified-date
atlas confluence attachments update-property att-1 --property-id prop-1 --key reviewed --value true --version-number 2 --message "Checked"
atlas confluence attachments thumbnail att-1 --width 200 --height 200 --file ./att-1-thumb.png
atlas confluence attachments delete att-1 --purge
```

## `labels`

| Action               | Positional     | Required flags | Optional flags                                                 |
| -------------------- | -------------- | -------------- | -------------------------------------------------------------- |
| `list`               | —              | `--page-id`    | `--prefix`, `--sort`, `--limit`, `--cursor`                    |
| `list-all`           | —              | —              | `--label-id`, `--prefix`, `--sort`, `--limit`, `--cursor`      |
| `attachments`        | `<labelId>`    | —              | `--sort`, `--limit`, `--cursor`                                |
| `blog-posts`         | `<labelId>`    | —              | `--space-id`, `--body-format`, `--sort`, `--limit`, `--cursor` |
| `pages`              | `<labelId>`    | —              | `--space-id`, `--body-format`, `--sort`, `--limit`, `--cursor` |
| `list-for-space`     | `<spaceId>`    | —              | `--prefix`, `--sort`, `--limit`, `--cursor`                    |
| `list-for-blog-post` | `<blogPostId>` | —              | `--prefix`, `--sort`, `--limit`, `--cursor`                    |

- `list` returns labels for a page and accepts `--prefix` (`my`, `team`, `global`, `system`) plus `--sort` from `LabelSortOrder`. `list-all` hits the tenant-wide `GET /labels` and returns one page. `--label-id` and `--prefix` accept comma-separated values and are emitted as repeated query parameters (`label-id=1&label-id=2`); every `--label-id` entry must be a decimal integer (`abc` is rejected before any request).
- `attachments`, `blog-posts`, `pages` walk the inverse relations: given a label id, return the content tagged with it. They share `--limit` / `--cursor` cursor pagination.
- `list-for-space` returns labels applied to a **space entity** (`GET /spaces/{id}/labels`) and accepts `--prefix` `my` or `team` only. `list-for-blog-post` returns labels on a **blog post** (`GET /blogposts/{id}/labels`) and accepts `--prefix` `my`, `team`, `global`, or `system`. Both take `--sort` from `LabelSortOrder`.
- Descending `--sort` values start with `-`, so attach them with `=` (`--sort=-created-date`); `--sort -created-date` is rejected as an ambiguous option.
- `--sort` enums per action:
  - `list-all`, `list-for-space`, `list-for-blog-post`: `created-date`, `-created-date`, `id`, `-id`, `name`, `-name`
  - `attachments`: `created-date`, `-created-date`, `modified-date`, `-modified-date`
  - `blog-posts`: `id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`
  - `pages`: same as `blog-posts` plus `title` / `-title`
- `--body-format` (pages / blog-posts) accepts `storage` or `atlas_doc_format`.
- `--space-id` (pages / blog-posts) accepts a comma-separated list of decimal integer space IDs, sent as repeated `space-id` params; any other entry is rejected before any request.
- Every action returns one page; pass the `cursor=…` value from `_links.next` back as `--cursor` for the next page.

```sh
# Inverse relations: given a label, list content with that label
atlas confluence labels list-all --prefix global --limit 50
atlas confluence labels list-all --label-id 10,20 --prefix my,team
atlas confluence labels attachments 12345 --sort=-created-date
atlas confluence labels blog-posts 12345 --space-id 100,200 --limit 25
atlas confluence labels pages 12345 --sort=-modified-date

# Forward relations: given a resource, list labels on it (B1018)
atlas confluence labels list-for-space 654321 --prefix team --sort=-name
atlas confluence labels list-for-blog-post 99999 --prefix team --limit 25
```

## `admin-key`

The admin key is a time-bound grant **for the calling user within the site** that lets an organization or site admin perform privileged operations (e.g. permanently delete pages or spaces) without per-request elevation. Each admin has at most one key: `create` issues a new one with a fresh expiration time if the caller already has a key. It requires Confluence Cloud **Premium or Enterprise** and an organization or site admin; otherwise every action returns `404` (on `get`, `404` also means the caller currently has no key).

| Action   | Positional | Optional flags       |
| -------- | ---------- | -------------------- |
| `get`    | —          | —                    |
| `create` | —          | `--duration-minutes` |
| `delete` | —          | —                    |

- `--duration-minutes` must be a positive integer in the range 1–60 (server default 10). Omit the flag to use the server default.
- `delete` is idempotent; calling it when no key exists returns success.
- `get` and `create` return `{ accountId, expirationTime }` where `expirationTime` is an ISO 8601 UTC timestamp.

```sh
# Inspect the active admin key (if any)
atlas confluence admin-key get

# Enable an admin key for the server default duration (10 minutes)
atlas confluence admin-key create

# Rotate / enable with an explicit duration (minutes, max 60)
atlas confluence admin-key create --duration-minutes 30

# Revoke
atlas confluence admin-key delete
```

## `app`

App properties are an **experimental, Forge-only** key-value API scoped to the
calling Forge app, **not** to any page, space, user, or Connect app. Atlassian
requires Forge `asApp()` for all four `/app/properties` operations. The
standard `atlas` CLI only supports basic/bearer HTTP authentication and cannot
create that Forge execution context, so these commands will be rejected by
Atlassian. Use the SDK methods only with a Forge-aware injected transport.

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
- Do not substitute a user bearer token or Connect credential for `asApp()`;
  neither satisfies this API's authentication contract.

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

## `custom-content`

First-class v2 content for app-defined types (AI collections, embedded items, third-party app payloads). The CLI exposes the full surface: lifecycle (`list` / `get` / `create` / `update` / `delete`) and every per-item sub-resource — content properties (`list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`), version history (`versions` / `version`), `attachments`, `children`, `footer-comments`, `labels`, and permitted `operations`. Pagination is cursor-based across all list endpoints.

| Action            | Positional          | Required flags                                                       | Optional flags                                                                                                                                                                                        |
| ----------------- | ------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`            | —                   | `--type`                                                             | `--id`, `--space-id`, `--sort`, `--body-format`, `--cursor`, `--limit`                                                                                                                                |
| `get`             | `<customContentId>` | —                                                                    | `--body-format`, `--version-number`, `--include-labels`, `--include-properties`, `--include-operations`, `--include-versions`, `--include-version`, `--no-include-version`, `--include-collaborators` |
| `create`          | —                   | `--type`, `--title`, `--body` (or `--body-json`)                     | one container: `--space-id`, `--page-id`, `--blog-post-id`, or `--custom-content-id`; `--status`, `--body-representation`                                                                             |
| `update`          | `<customContentId>` | `--type`, `--version-number`, `--title`, `--body` (or `--body-json`) | `--space-id`, `--page-id`, `--blog-post-id`, `--custom-content-id`, `--body-representation`, `--message`, `--status` (`current` only)                                                                 |
| `delete`          | `<customContentId>` | —                                                                    | `--purge`                                                                                                                                                                                             |
| `list-properties` | `<customContentId>` | —                                                                    | `--key`, `--sort`, `--cursor`, `--limit`                                                                                                                                                              |
| `create-property` | `<customContentId>` | `--key`, `--value`                                                   | —                                                                                                                                                                                                     |
| `get-property`    | `<customContentId>` | `--property-id`                                                      | —                                                                                                                                                                                                     |
| `update-property` | `<customContentId>` | `--property-id`, `--key`, `--value`, `--version-number`              | `--message`                                                                                                                                                                                           |
| `delete-property` | `<customContentId>` | `--property-id`                                                      | —                                                                                                                                                                                                     |
| `versions`        | `<customContentId>` | —                                                                    | `--body-format`, `--sort`, `--cursor`, `--limit`                                                                                                                                                      |
| `version`         | `<customContentId>` | `--version-number`                                                   | —                                                                                                                                                                                                     |
| `attachments`     | `<customContentId>` | —                                                                    | `--sort`, `--status`, `--cursor`, `--media-type`, `--filename`, `--limit`                                                                                                                             |
| `children`        | `<customContentId>` | —                                                                    | `--sort`, `--cursor`, `--limit`                                                                                                                                                                       |
| `footer-comments` | `<customContentId>` | —                                                                    | `--body-format`, `--sort`, `--cursor`, `--limit`                                                                                                                                                      |
| `labels`          | `<customContentId>` | —                                                                    | `--prefix`, `--sort`, `--cursor`, `--limit`                                                                                                                                                           |
| `operations`      | `<customContentId>` | —                                                                    | —                                                                                                                                                                                                     |

- `--type` is a free-form string identifying the custom-content namespace (e.g. `ai.atlassian.collection`) and is required on `list`, `create`, and `update`. Confluence resolves the namespace from this value; mismatches against the parent space's installed apps return 400.
- `list` filters: `--id` and `--space-id` take comma-separated decimal integer IDs (sent as repeated params; any other entry is rejected before any request), `--sort` is `CustomContentSortOrder` (`id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`, `title`, `-title`). The collection has no page, blog-post or status filter — `--page-id`, `--blog-post-id` and `--status` are rejected; use `pages custom-content` / `blog-posts custom-content` for container-scoped listings.
- `--body-format` on `list` / `versions` accepts `raw`, `storage`, or `atlas_doc_format`; `get` additionally accepts `view`, `export_view`, and `anonymous_export_view`. `get --include-*` inlines labels, properties, operations, versions, collaborators, or (default on) the current version — `--no-include-version` (or `--include-version false`) omits it.
- `update --version-number` must be a positive integer exactly one greater than the item's current version — Confluence enforces optimistic concurrency and rejects mismatches with a 409. `--type`, `--title`, and `--body` must be re-sent on update (the server validates the type matches the stored value); `--message` sets the version message.
- `create --status` accepts `current` (default) or `draft`. `update` always sends `status: "current"` — the API accepts nothing else, so `--status` on update may only be `current`.
- `create` / `update` `--body` is sent as `--body-representation` `storage` (default), `atlas_doc_format`, or `raw`. For an exact body object use `--body-json` instead (a flat `{ "representation", "value" }` or a nested `{ "raw": { "representation": "raw", "value": "…" } }`); do not combine it with `--body` or `--body-representation`. Pass one container flag (`--space-id`, `--page-id`, `--blog-post-id`, or `--custom-content-id`) to place the item. `delete --purge` permanently deletes an item that is already trashed.
- Properties: `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property` / `databases create-property`). `--sort` on `list-properties` accepts `key` or `-key`. `update-property --version-number` follows the same optimistic-concurrency rule as `update` above.
- `versions --sort` is the narrow `VersionSortOrder`: only `modified-date` / `-modified-date`. `version --version-number` fetches a single past version by number and returns the body + audit metadata.
- `attachments --sort` accepts `AttachmentSortOrder`: `created-date`, `-created-date`, `modified-date`, `-modified-date`. `--status` is a comma-separated subset of `current,archived,trashed` (server default is `current,archived`). `--media-type` filters by MIME, `--filename` by exact name.
- `children` returns the lightweight `ChildCustomContent` shape (`id`, `status`, `title`, `type`, `spaceId`); `status` is restricted to `current` or `archived`. `--sort` is `ChildCustomContentSortOrder`: `id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`.
- `footer-comments --body-format` accepts `storage` or `atlas_doc_format`. `--sort` is `CommentSortOrder`: `created-date`, `-created-date`, `modified-date`, `-modified-date`.
- `labels --prefix` accepts `my`, `team`, `global`, `system`. `--sort` is `LabelSortOrder`: `created-date`, `-created-date`, `id`, `-id`, `name`, `-name`.
- `operations` returns `{ operations: [{ operation, targetType }] }` — useful for gating UI actions and permission-aware automation that wants to fail fast before issuing a 403-bound write.
- All list endpoints are cursor-paginated — extract `cursor=…` from `_links.next` and pass it back as `--cursor`.
- Descending `--sort` values start with `-`, so attach them with `=` (`--sort=-created-date`); `--sort -created-date` is rejected as an ambiguous option.

```sh
# Lifecycle
atlas confluence custom-content list --type ai.atlassian.collection --space-id 654321 --limit 25
atlas confluence custom-content get cc-1 --body-format storage
atlas confluence custom-content create --type ai.atlassian.collection --space-id 654321 --title "AI Notes" --body "<p>hi</p>"
atlas confluence custom-content create --type ai.atlassian.collection --page-id 12345 --title "Raw item" --body '{"k":1}' --body-representation raw --status draft
atlas confluence custom-content update cc-1 --type ai.atlassian.collection --version-number 2 --title "Renamed" --body "<p>v2</p>" --message "Renamed"
atlas confluence custom-content list --type ai.atlassian.collection --id 101,102 --sort=-modified-date
atlas confluence custom-content delete cc-1
atlas confluence custom-content delete cc-2 --purge

# Content properties
atlas confluence custom-content list-properties cc-1 --sort key
atlas confluence custom-content create-property cc-1 --key reviewed --value true
atlas confluence custom-content get-property cc-1 --property-id prop-1
atlas confluence custom-content update-property cc-1 --property-id prop-1 --key reviewed --value false --version-number 2
atlas confluence custom-content delete-property cc-1 --property-id prop-1

# Versions
atlas confluence custom-content versions cc-1 --sort=-modified-date
atlas confluence custom-content version cc-1 --version-number 2

# Sub-collections
atlas confluence custom-content attachments cc-1 --media-type image/png --sort=-created-date
atlas confluence custom-content children cc-1 --limit 50
atlas confluence custom-content footer-comments cc-1 --sort=-created-date
atlas confluence custom-content labels cc-1 --prefix global

# Permitted operations
atlas confluence custom-content operations cc-1
```

## `data-policies`

| Action         | Positional | Required flags | Optional flags                                     |
| -------------- | ---------- | -------------- | -------------------------------------------------- |
| `get-metadata` | —          | —              | —                                                  |
| `list-spaces`  | —          | —              | `--ids`, `--keys`, `--sort`, `--limit`, `--cursor` |

Surfaces the **experimental** Confluence v2 data-policies API. Both endpoints are **app-only**
(Forge / Connect) — user-token callers receive `403 Forbidden`, and the site
must have the data-policies entitlement enabled. The metadata endpoint also
requires the `read:configuration:confluence` OAuth scope (or `READ` Connect
app scope); the spaces endpoint additionally needs `read:space:confluence`.

- `get-metadata` → `GET /wiki/api/v2/data-policies/metadata` returns
  `{ anyContentBlocked?: boolean }` describing the workspace as a whole.
- `list-spaces` → `GET /wiki/api/v2/data-policies/spaces` returns the standard
  `{ results, _links }` cursor-paginated wrapper with `DataPolicySpace`
  entries (`id`, `key`, `name`, `dataPolicy.anyContentBlocked`, etc.). The
  server caps `--limit` at 1-250 (default 25); only spaces the app can view
  are returned.
- `--ids` and `--keys` accept comma-separated lists (e.g. `--ids 1,2,3` or
  `--keys ENG,OPS`). Whitespace per entry is trimmed; empty entries are
  dropped; an effectively-empty value (`--ids ,`, `--keys ""`) is rejected
  before any request. The server caps each list at 250 entries. Every
  `--ids` entry must be a decimal integer up to 9007199254740991 (space IDs
  are int64): `--ids abc` or `--ids 12abc` is rejected before any request, so
  a typo never turns into an unfiltered listing.
- `--sort` accepts `id`, `-id`, `key`, `-key`, `name`, `-name` (prefix `-`
  flips direction). Unknown values are rejected client-side. Write a
  descending sort with `=` (`--sort=-id`); the space form `--sort -id` is
  rejected as an ambiguous option.

```sh
# Workspace-wide flag indicating whether any content is blocked
atlas confluence data-policies get-metadata

# First page of spaces with data policies (server default 25 per page)
atlas confluence data-policies list-spaces

# Filter to specific space keys, sort by descending key, larger page
atlas confluence data-policies list-spaces --keys ENG,OPS --sort=-key --limit 50

# Filter by IDs
atlas confluence data-policies list-spaces --ids 100,200,300
```

## `space-permissions`

| Action                             | Positional | Required flags | Optional flags        |
| ---------------------------------- | ---------- | -------------- | --------------------- |
| `list`                             | —          | —              | `--limit`, `--cursor` |
| `transition-remove-access`         | —          | `--body`       | —                     |
| `transition-list-combinations`     | —          | —              | `--limit`, `--cursor` |
| `transition-generate-combinations` | —          | —              | —                     |
| `transition-assign-roles`          | —          | `--body`       | —                     |
| `transition-task-status`           | `<taskId>` | —              | —                     |

Lists the _available_ space-permission definitions for the Confluence Cloud organization (`GET /wiki/api/v2/space-permissions`). These describe the permissions the platform supports (`id`, `displayName`, `description`, `requiredPermissionIds`) — they are **not** per-space grants. Per-space assignments are exposed by the separate `/spaces/{id}/permissions` endpoint (not covered here). Requires the `read:space.permission:confluence` OAuth scope (or `READ` Connect app scope); available on tenants with Role-Based Access Control. Returns the standard `{ results, _links }` cursor-paginated wrapper; `--limit` accepts 1-250 (server default 25).

The **transition sub-commands** (`transition-*`) implement Atlassian's
**experimental** async bulk RBAC migration API
(`/wiki/api/v2/space-permissions/transition/*`). The non-transition `list`
operation is not experimental. Every `transition-*` action requires the caller
to be a **Confluence administrator** (otherwise `403`). The async flow is:

1. Generate the combinations table (once): `transition-generate-combinations`
2. Inspect the result: `transition-list-combinations`
3. Submit a bulk operation: `transition-remove-access` or `transition-assign-roles`
4. Poll until done: `transition-task-status <taskId>`

All three POST operations return a `BulkTransitionTaskResponse` with `taskId`, `status`, and `statusUrl`. Poll `transition-task-status` until `status` is `COMPLETED` or `FAILED`.

### `list` — list available permission definitions

```sh
# First page (server default 25 per page)
atlas confluence space-permissions list

# Larger page
atlas confluence space-permissions list --limit 100

# Next page using the cursor from _links.next
atlas confluence space-permissions list --cursor "<value-from-response>"
```

### `transition-generate-combinations` — generate the combinations table

No body required. Kicks off the audit that populates the combinations table.

```sh
atlas confluence space-permissions transition-generate-combinations
# Returns: { taskId, status, statusUrl }
```

### `transition-list-combinations` — list permission combinations

Lists the unique combinations of space permissions that exist across all spaces, sorted by `principalCount` descending. Cursor-paginated (`--limit` 1-250 per page), but **unlike the other list actions the cursor is in the response body, not `_links`**: the response is `{ results, generatedAt?, cursor? }`. Pass the top-level `cursor` value back as `--cursor` to fetch the next page; when `cursor` is absent there are no more pages. `generatedAt` is the ISO-8601 time of the last `transition-generate-combinations` run (absent if it has never run).

| Action                         | Positional | Required flags | Optional flags        |
| ------------------------------ | ---------- | -------------- | --------------------- |
| `transition-list-combinations` | —          | —              | `--limit`, `--cursor` |

```sh
# First page of combinations
atlas confluence space-permissions transition-list-combinations

# With pagination
atlas confluence space-permissions transition-list-combinations --limit 50
# Next page: the value of the response's top-level "cursor" field
atlas confluence space-permissions transition-list-combinations --limit 50 --cursor "<cursor>"
```

Response envelope:

```json
{ "results": [], "generatedAt": "2026-01-01T00:00:00Z", "cursor": "<next-page-cursor>" }
```

One entry in `results`:

```json
{
  "combinationId": "combo-abc",
  "spaceCount": 42,
  "principalCount": 128,
  "permissions": [{ "id": "VIEW_CONTENT", "displayName": "View" }],
  "principalTypes": ["USER", "GROUP"]
}
```

### `transition-remove-access` — bulk remove access

`--body` is a JSON object matching `BulkRemoveAccessRequest`:

| Field                           | Type                                                                          | Required                              | Description                             |
| ------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------- |
| `permissionCombinationIds`      | `string[]`                                                                    | yes                                   | IDs from `transition-list-combinations` |
| `spaceSelection.spaceType`      | `"ALL"\|"ALL_EXCEPT_PERSONAL"\|"ALL_EXCEPT_SPECIFIC"\|"PERSONAL"\|"SPECIFIC"` | yes                                   | Space scope                             |
| `spaceSelection.selectedSpaces` | `{id,key}[]`                                                                  | when `SPECIFIC`/`ALL_EXCEPT_SPECIFIC` | Target spaces                           |

```sh
# Remove a combination from all spaces
atlas confluence space-permissions transition-remove-access \
  --body '{"permissionCombinationIds":["combo-abc"],"spaceSelection":{"spaceType":"ALL"}}'

# Returns: { taskId, status, statusUrl }
# Poll the task:
atlas confluence space-permissions transition-task-status <taskId>
```

### `transition-assign-roles` — bulk assign roles

`--body` is a JSON object matching `BulkAssignRolesRequest`:

| Field                                                    | Type                                                                                                             | Required                   | Description                                |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------ |
| `assignments`                                            | `BulkTransitionRoleAssignment[]`                                                                                 | yes                        | Role assignments per combination           |
| `assignments[].permissionCombinationId`                  | `string`                                                                                                         | yes                        | Combination ID                             |
| `assignments[].principalTypeAssignments`                 | `BulkTransitionPrincipalTypeAssignment[]`                                                                        | yes                        | Per-principal-type targets                 |
| `assignments[].principalTypeAssignments[].principalType` | `"USER"\|"GROUP"\|"GUEST"\|"ANONYMOUS"\|"ALL_LICENSED_USERS_USER_CLASS"\|"ALL_PRODUCT_ADMINS_USER_CLASS"\|"APP"` | yes                        | Principal type                             |
| `assignments[].principalTypeAssignments[].removeAccess`  | `boolean`                                                                                                        | yes                        | `true` = remove, `false` = assign `roleId` |
| `assignments[].principalTypeAssignments[].roleId`        | `string`                                                                                                         | when `removeAccess: false` | Role UUID to assign                        |
| `spaceSelection`                                         | `BulkTransitionSpaceSelection`                                                                                   | yes                        | Same as remove-access                      |

```sh
# Assign a role to USER principals for a combination, across all spaces
atlas confluence space-permissions transition-assign-roles \
  --body '{
    "assignments": [{
      "permissionCombinationId": "combo-abc",
      "principalTypeAssignments": [{
        "principalType": "USER",
        "removeAccess": false,
        "roleId": "role-uuid-here"
      }]
    }],
    "spaceSelection": { "spaceType": "ALL" }
  }'

# Returns: { taskId, status, statusUrl }
```

### `transition-task-status` — poll task status

| Action                   | Positional | Required | Description                      |
| ------------------------ | ---------- | -------- | -------------------------------- |
| `transition-task-status` | `<taskId>` | yes      | Task ID from any transition POST |

```sh
atlas confluence space-permissions transition-task-status task-123

# Response: { taskId, status: "IN_PROGRESS"|"COMPLETED"|"FAILED", errorMessage? }
```

## `space-role-mode`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `get`  | —          | —              | —              |

Retrieves the tenant's space role mode (`GET /wiki/api/v2/space-role-mode`). Available on sites with [Role-Based Access Control](https://support.atlassian.com/confluence-cloud/docs/manage-user-roles/). Requires the `read:configuration:confluence` OAuth scope (or `READ` Connect app scope) and the `Can use` global permission. Returns a JSON object `{ "mode": "PRE_ROLES" | "ROLES_TRANSITION" | "ROLES" }`; the field is omitted on tenants that don't surface a mode, so callers should treat it as optional. Responds 404 when the calling user lacks permission to view the role mode.

```sh
atlas confluence space-role-mode get
```

## `space-roles`

Manages Confluence space roles (`/wiki/api/v2/space-roles`). Available on tenants with Role-Based Access Control. The list endpoint returns the standard `{ results, _links }` cursor-paginated wrapper; `create` returns the new role; `update` and `delete` return 202 with an async `taskId` callers can poll for the underlying permission-rewrite job.

| Action   | Positional | Required flags                                   | Optional flags                                                                           |
| -------- | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `list`   | —          | —                                                | `--space-id`, `--role-type`, `--principal-id`, `--principal-type`, `--limit`, `--cursor` |
| `get`    | `<roleId>` | —                                                | —                                                                                        |
| `create` | —          | `--name`, `--description`, `--space-permissions` | —                                                                                        |
| `update` | `<roleId>` | `--name`, `--description`, `--space-permissions` | `--anonymous-reassignment-role-id`, `--guest-reassignment-role-id`                       |
| `delete` | `<roleId>` | —                                                | —                                                                                        |

- `--role-type` filters by role type and is sent trimmed (`' SYSTEM '` goes out as `SYSTEM`): usually `SYSTEM` (platform-defined, not user-editable) or `CUSTOM` (tenant-created); the spec types it as an open string, so a tenant-defined type also passes through. An empty or blank value (`--role-type ""`) is rejected before any request.
- `--principal-type` accepts `USER`, `GROUP`, or `ACCESS_CLASS` and restricts the listing to roles available for the named principal class.
- `--principal-id` and `--principal-type` must be given **together** (the server returns 400 for either alone). With `--principal-type ACCESS_CLASS`, `--principal-id` is one of `anonymous-users`, `jsm-project-admins`, `authenticated-users`, `all-licensed-users`, `all-product-admins`; with `USER` it is an account ID, with `GROUP` a group ID.
- `--space-permissions` is a comma-separated list of space-permission ids (e.g. `read/space,write/space`). Retrieve valid ids from `atlas confluence space-permissions list`. The CLI trims whitespace per entry and rejects an all-empty payload before issuing the request.
- `update` and `delete` return `{ "taskId": "..." }` (HTTP 202). The task tears down or rewrites per-space permission assignments asynchronously — poll the task to confirm completion before relying on the new permission state.
- `--anonymous-reassignment-role-id` / `--guest-reassignment-role-id` on `update` migrate anonymous-access / guest assignments away from the role being modified. Leave unset to keep them in place.

```sh
# List custom roles (server default 25 per page)
atlas confluence space-roles list --role-type=CUSTOM

# Filter to roles available for a specific principal
atlas confluence space-roles list --principal-id acc-123 --principal-type=USER

# Roles available to every licensed user (access class)
atlas confluence space-roles list --principal-type ACCESS_CLASS --principal-id all-licensed-users

# Fetch a single role
atlas confluence space-roles get role-1

# Create a custom role
atlas confluence space-roles create --name "Editor" --description "Edit pages" --space-permissions read/space,write/space

# Update a role (returns a taskId — poll until done)
atlas confluence space-roles update role-1 --name "Editor v2" --description "Updated description" --space-permissions read/space,write/space

# Delete a role (returns a taskId — poll until done)
atlas confluence space-roles delete role-1
```

## `tasks`

Inline action items embedded in Confluence pages or blog posts. Each task is
identified by a server-assigned numeric (int64) ID, e.g. `123456`. The CLI
exposes the three v2 `/tasks` endpoints — list with rich filtering, fetch a
single task, and toggle its `status` between `incomplete` and `complete`.

| Action   | Positional | Required flags | Optional flags                                                                                                                                                                                                                                                                                               |
| -------- | ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `list`   | —          | —              | `--body-format`, `--include-blank-tasks`, `--status`, `--task-id`, `--space-id`, `--page-id`, `--blog-post-id`, `--created-by`, `--assigned-to`, `--completed-by`, `--created-at-from`, `--created-at-to`, `--due-at-from`, `--due-at-to`, `--completed-at-from`, `--completed-at-to`, `--limit`, `--cursor` |
| `get`    | `<taskId>` | —              | `--body-format`                                                                                                                                                                                                                                                                                              |
| `update` | `<taskId>` | `--status`     | `--body-format`                                                                                                                                                                                                                                                                                              |

- `--status` accepts `incomplete` or `complete` (the only two task states v2 surfaces). On `update` it's required and toggles the task. On `list` it filters results.
- `--task-id`, `--space-id`, `--page-id`, `--blog-post-id` each take one ID or a comma-separated list of up to 250 numeric IDs (`--task-id 5,6`); each value is sent as a repeated query parameter (`task-id=5&task-id=6`). Every token must be a decimal integer up to 9007199254740991: a value such as `abc` or `12abc` is rejected before any request is sent, and so is an empty value (`--page-id ,`, or `--page-id ""` from an unset shell variable), so a typo can never widen the listing to every task.
- `--created-by`, `--assigned-to`, `--completed-by` take one Atlassian account ID or a comma-separated list of up to 250 (`--assigned-to acc-1,acc-2`), also sent as repeated parameters. An empty value is rejected the same way.
- `--space-id`, `--page-id`, `--blog-post-id` scope the listing to tasks in those containers; page and blog-post filters can be used together.
- `--include-blank-tasks` controls tasks whose `body` is empty (e.g. checkboxes without inline text). The server includes them by default; pass `--include-blank-tasks false` (or `--no-include-blank-tasks`) to send `include-blank-tasks=false` and hide them. `--include-blank-tasks` alone (or `--include-blank-tasks true`) sends `true`; omitting it sends nothing.
- `--body-format` accepts `storage` or `atlas_doc_format` on `list`, `get` and `update` and controls the representation of the task body when present. Any other value is rejected before the request.
- All date-range filters (`--created-at-*`, `--due-at-*`, `--completed-at-*`) accept integer Unix epoch milliseconds, not ISO-8601 strings; ranges are inclusive on both ends.
- Pagination is cursor-based: `--limit` is 1–250 (server default 25). Extract `cursor=…` from `_links.next` and pass it as `--cursor` on the follow-up call; no `_links.next` means the last page.
- `update` only changes `status`; `--body-format` controls the representation returned in the response. The task body, assignee, due date, and container are immutable through this endpoint.

```sh
# All incomplete tasks across the site (first page)
atlas confluence tasks list --status incomplete --limit 25

# Tasks assigned to a particular user on a page
atlas confluence tasks list --page-id 12345 --assigned-to acc-123

# Several IDs per filter (comma-separated, repeated on the wire)
atlas confluence tasks list --space-id 1,2 --task-id 5,6 --created-by acc-1,acc-2

# Hide tasks with an empty body
atlas confluence tasks list --space-id 1 --include-blank-tasks false

# Tasks completed in a date window
atlas confluence tasks list --status complete --completed-by acc-123 \
  --completed-at-from 1767225600000 --completed-at-to 1769904000000

# Read a single task (with rendered body)
atlas confluence tasks get 123456 --body-format storage

# Mark a task complete
atlas confluence tasks update 123456 --status complete --body-format storage

# Reopen a task
atlas confluence tasks update 123456 --status incomplete
```

## `users`

Experimental single-user access controls. Atlassian marks both operations in
this resource experimental. Bulk account-ID resolution lives under the
separate `users-bulk` resource below.

| Action                  | Positional | Required flags | Optional flags |
| ----------------------- | ---------- | -------------- | -------------- |
| `check-access-by-email` | —          | `--emails`     | —              |
| `invite-by-email`       | —          | `--emails`     | —              |

- `check-access-by-email` (`POST /wiki/api/v2/user/access/check-access-by-email`)
  returns the subset of the input that does **not** have site access plus any
  syntactically invalid entries: `{ emailsWithoutAccess?, invalidEmails? }`.
  Either bucket may be omitted when empty. Requires the `Can use` Confluence
  global permission (and the `read:configuration:confluence` OAuth scope for
  app-authenticated callers).
- `invite-by-email` (`POST /wiki/api/v2/user/access/invite-by-email`) is
  asynchronous — a successful 200 means the invitations were accepted for
  processing, not that the accounts are provisioned. Invalid emails are
  silently dropped server-side and already-provisioned emails are no-ops.
  The CLI prints `{ "invited": true }` on success.
- `--emails` is a comma-separated list (`--emails a@example.com,b@example.com`).
  Surrounding whitespace per entry is trimmed; empty entries are dropped. The
  CLI rejects an empty effective list before issuing the request. Confluence
  caps the batch at 1-100 server-side.

```sh
# Find emails from a batch that do not currently have site access
atlas confluence users check-access-by-email \
  --emails member@example.com,outsider@example.com,not-an-email

# Invite a batch of new users (asynchronous on the server)
atlas confluence users invite-by-email \
  --emails new1@example.com,new2@example.com
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

## `databases`

Databases are first-class v2 content. The CLI exposes the full surface: lifecycle (`create`/`get`/`delete`), hierarchy navigation (`ancestors`/`descendants`/`direct-children`/`operations`), classification level (`get-`/`update-`/`reset-classification-level`), content properties (`list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`), restriction state and direct permissions (`get-`/`set-restriction-state`, `list-`/`add-`/`set-`/`delete-permissions`), and the experimental data endpoints (`fields`, `views`, `entries`, `get-entry`). Pagination is cursor-based for `descendants`, `direct-children`, `list-properties`, `list-permissions`, `fields`, `views`, and `entries`; `ancestors` returns a bare `{ results }` and is re-called with the highest ancestor's ID instead of a cursor.

| Action                        | Positional     | Required flags                                          | Optional flags                                                                                         |
| ----------------------------- | -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `create`                      | —              | `--space-id`                                            | `--title`, `--parent-id`, `--private`                                                                  |
| `get`                         | `<databaseId>` | —                                                       | `--include-collaborators`, `--include-direct-children`, `--include-operations`, `--include-properties` |
| `delete`                      | `<databaseId>` | —                                                       | —                                                                                                      |
| `ancestors`                   | `<databaseId>` | —                                                       | `--limit`                                                                                              |
| `descendants`                 | `<databaseId>` | —                                                       | `--limit`, `--depth`, `--cursor`                                                                       |
| `direct-children`             | `<databaseId>` | —                                                       | `--limit`, `--cursor`, `--sort`                                                                        |
| `operations`                  | `<databaseId>` | —                                                       | —                                                                                                      |
| `get-classification-level`    | `<databaseId>` | —                                                       | —                                                                                                      |
| `update-classification-level` | `<databaseId>` | `--level-id`                                            | —                                                                                                      |
| `reset-classification-level`  | `<databaseId>` | —                                                       | —                                                                                                      |
| `list-properties`             | `<databaseId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`                                                               |
| `create-property`             | `<databaseId>` | `--key`, `--value`                                      | —                                                                                                      |
| `get-property`                | `<databaseId>` | `--property-id`                                         | —                                                                                                      |
| `update-property`             | `<databaseId>` | `--property-id`, `--key`, `--value`, `--version-number` | `--message`                                                                                            |
| `delete-property`             | `<databaseId>` | `--property-id`                                         | —                                                                                                      |
| `get-restriction-state`       | `<databaseId>` | —                                                       | —                                                                                                      |
| `set-restriction-state`       | `<databaseId>` | `--state`                                               | `--allow-self-lockout`                                                                                 |
| `list-permissions`            | `<databaseId>` | —                                                       | `--operation`, `--principal-type`, `--principal-id`, `--cursor`, `--limit`                             |
| `add-permissions`             | `<databaseId>` | `--body`                                                | `--allow-self-lockout`                                                                                 |
| `set-permissions`             | `<databaseId>` | `--body`                                                | `--allow-self-lockout`                                                                                 |
| `delete-permissions`          | `<databaseId>` | —                                                       | `--operation`, `--principal-type`, `--principal-id`, `--allow-self-lockout`                            |
| `fields`                      | `<databaseId>` | —                                                       | `--limit`, `--cursor`, `--if-none-match`                                                               |
| `views`                       | `<databaseId>` | —                                                       | `--limit`, `--cursor`, `--if-none-match`                                                               |
| `entries`                     | `<databaseId>` | —                                                       | `--limit`, `--cursor`, `--sort`, `--filter`, `--if-none-match`                                         |
| `get-entry`                   | `<databaseId>` | `--entry-id`                                            | `--if-none-match`                                                                                      |

- `--private` on `create` creates a database visible only to the creator (sent as `?private=true`).
- Boolean flags (`--private`, `--include-*`, `--allow-self-lockout`) are on when given alone or as `--flag true`; `--flag false` (or `--no-flag`) and omitting the flag both send nothing, which leaves the server default (off).
- `--depth` on `descendants` accepts 1–10 (validated client-side before the request; server default 2).
- `--sort` on `direct-children` accepts the `ContentSortOrder` vocabulary: `created-date`, `id`, `modified-date`, `child-position`, `title`, each optionally prefixed with `-` for descending.
- `--sort` on `list-properties` accepts `key` or `-key`.
- A flag value that starts with `-` (a descending sort such as `-key` or `-modified-date`, or a negative JSON `--value` such as `-1`) must be written with `=`: `--sort=-key`, `--value=-1`. The space form `--sort -key` is rejected as an ambiguous option.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409). `--message` adds an optional message to that new version (`version: { number, message }`); without it only `version.number` is sent.
- `update-classification-level` always sends `status: "current"` (the only legal server value); the CLI hard-codes it so callers only need `--level-id`. Take the level ID from the `id` field of `atlas confluence classification-levels list`.
- `reset-classification-level` sends `{ status: "current" }` and falls back to the space default classification.
- `ancestors` returns `{ results }` without `_links.next`; iterate by calling again with the highest ancestor's ID as the new `<databaseId>`.
- `delete` trashes the database (recoverable from the space trash); there is no purge flag on this endpoint.

- `get-restriction-state`, `set-restriction-state`, `list-permissions`, `add-permissions`, `set-permissions`, and `delete-permissions` follow the shared contract in the "Content permissions and restriction state" section below. `set-restriction-state` needs `--state` (`OPEN`, `EDIT_RESTRICTED`, or `VIEW_RESTRICTED`); `add-permissions` / `set-permissions` need `--body` (JSON `{"permissions":[...]}`).
- `fields`, `views`, `entries`, and `get-entry` are **experimental** (`x-experimental`): they may change in backwards-incompatible ways without notice. List responses are `{ results, _links, meta: { pageSize, hasMore, cursor? } }`; `get-entry` returns one entry (`{ id, databaseId, values, _links }`) with no `results` wrapper. Paginate with `--cursor` taken from `_links.next` (a cursor is only valid for the same database, sort, filter, and `--limit`); `--limit` is 1–250 (default 50).
- `fields` returns field definitions `{ id, name, description, type, settings }` in column order; `type` is one of `text`, `aiSummary`, `number`, `checkbox`, `date`, `select`, `hyperlink`, `user`, `attachment`, `jiraIssue`, `pageLink`, `entryLink`, `entryDetails`, `backlink`, `pageDetails`, `pageLabels`, `pageStatus`, `jiraIssueDetails`. `views` returns `{ id, name, type }` (`table`, `gallery`, `board`, `calendar`, `timeline`); view configuration is not exposed.
- `entries` returns rows `{ id, databaseId, values }` where `values` maps field ID to a typed value (`{ type, ... }`); use `fields` to map field IDs to names. `--sort <fieldId>` sorts by one field (descending: `--sort=-<fieldId>`, with `=`, because a bare `-` value is read as a flag). `--filter` is a JSON object of field ID to condition: a string (`"Done"` or `"eq:Done"` equality, `"in:a,b"`, `"$empty"`) or a range object `{"gte"|"lte"|"gt"|"lt": value}` for date and number fields; multiple fields combine with AND. Example: `--filter '{"fld1":"eq:Done","fld2":{"gte":"2026-01-01"}}'`.
- `get-entry` takes the entry ID via `--entry-id` (`atlas confluence databases get-entry <databaseId> --entry-id <entryId>`).
- `--if-none-match <etag>` is sent as the `If-None-Match` header; a matching tag makes the server answer `304` with no body, which the CLI reports as an HTTP 304 error. The CLI does not print response headers, so use it only when you already hold an ETag.

```sh
# Create a database in a space
atlas confluence databases create --space-id 654321 --title "Inventory"

# Create a private database
atlas confluence databases create --space-id 654321 --title "Secret" --private

# Read a database with everything inlined
atlas confluence databases get db-1 --include-properties --include-operations

# Walk the descendant tree
atlas confluence databases descendants db-1 --depth 3 --limit 50

# Sort direct children by most-recently modified
atlas confluence databases direct-children db-1 --sort=-modified-date

# Classification level lifecycle
atlas confluence databases get-classification-level db-1
atlas confluence databases update-classification-level db-1 --level-id cl-restricted
atlas confluence databases reset-classification-level db-1

# Content properties
atlas confluence databases list-properties db-1
atlas confluence databases list-properties db-1 --sort=-key --limit 50
atlas confluence databases create-property db-1 --key feature-flags --value '{"beta":true}'
atlas confluence databases get-property db-1 --property-id prop-1
atlas confluence databases update-property db-1 --property-id prop-1 --key feature-flags --value '{"beta":false}' --version-number 4
atlas confluence databases update-property db-1 --property-id prop-1 --key feature-flags --value '{"beta":true}' --version-number 5 --message "Re-enable beta"
atlas confluence databases delete-property db-1 --property-id prop-1

# Restriction state and direct permissions
atlas confluence databases get-restriction-state db-1
atlas confluence databases set-restriction-state db-1 --state EDIT_RESTRICTED
atlas confluence databases list-permissions db-1 --principal-type user --principal-id <accountId>
atlas confluence databases add-permissions db-1 --body '{"permissions":[{"operation":"read","principals":[{"principalType":"user","principalId":"<accountId>"}]}]}'
atlas confluence databases delete-permissions db-1 --operation read --principal-type user --principal-id <accountId>

# Fields, views and entries (experimental)
atlas confluence databases fields db-1 --limit 50
atlas confluence databases views db-1
atlas confluence databases entries db-1 --sort=-<fieldId> --filter '{"<fieldId>":"eq:Done"}'
atlas confluence databases get-entry db-1 --entry-id <entryId>
```

## `embeds`

Embeds (Smart Links in the content tree) wrap an external URL as a first-class v2 hierarchy node alongside pages, whiteboards, databases, and folders. The CLI exposes the full surface: lifecycle (`create`/`get`/`delete`), hierarchy navigation (`ancestors`/`descendants`/`direct-children`/`operations`), and content properties (`list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`). Pagination is cursor-based for `descendants`, `direct-children`, and `list-properties`; `ancestors` returns a bare `{ results }` and is re-called with the highest ancestor's ID instead of a cursor.

| Action            | Positional  | Required flags                                          | Optional flags                                                                                         |
| ----------------- | ----------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `create`          | —           | `--space-id`                                            | `--title`, `--parent-id`, `--embed-url`                                                                |
| `get`             | `<embedId>` | —                                                       | `--include-collaborators`, `--include-direct-children`, `--include-operations`, `--include-properties` |
| `delete`          | `<embedId>` | —                                                       | —                                                                                                      |
| `ancestors`       | `<embedId>` | —                                                       | `--limit`                                                                                              |
| `descendants`     | `<embedId>` | —                                                       | `--limit`, `--depth`, `--cursor`                                                                       |
| `direct-children` | `<embedId>` | —                                                       | `--limit`, `--cursor`, `--sort`                                                                        |
| `operations`      | `<embedId>` | —                                                       | —                                                                                                      |
| `list-properties` | `<embedId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`                                                               |
| `create-property` | `<embedId>` | `--key`, `--value`                                      | —                                                                                                      |
| `get-property`    | `<embedId>` | `--property-id`                                         | —                                                                                                      |
| `update-property` | `<embedId>` | `--property-id`, `--key`, `--value`, `--version-number` | `--message`                                                                                            |
| `delete-property` | `<embedId>` | `--property-id`                                         | —                                                                                                      |

- `--embed-url` on `create` is optional; omit it to create an embed without an attached URL. The v2 API has no embed update endpoint, so the URL cannot be added or changed after creation — set it on `create`.
- `create` does not take `--private` (`POST /embeds` has no such parameter); passing it is rejected rather than silently creating a visible embed.
- `--depth` on `descendants` accepts 1–10 (validated client-side before the request; server default 2).
- `--sort` on `direct-children` accepts the `ContentSortOrder` vocabulary: `created-date`, `id`, `modified-date`, `child-position`, `title`, each optionally prefixed with `-` for descending.
- `--sort` on `list-properties` accepts `key` or `-key`.
- A flag value that starts with `-` (a descending sort such as `-key` or `-modified-date`, or a negative JSON `--value` such as `-1`) must be written with `=`: `--sort=-key`, `--value=-1`. The space form `--sort -key` is rejected as an ambiguous option.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property`, `databases create-property`, and `folders create-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409). `--message` adds an optional message to that new version (`version: { number, message }`); without it only `version.number` is sent.
- `ancestors` returns `{ results }` without `_links.next`; iterate by calling again with the highest ancestor's ID as the new `<embedId>`.
- Embeds have no classification-level endpoints — unlike `databases` / `whiteboards`, the `/embeds` surface does not expose `get`/`update`/`reset-classification-level` (matches `folders`).
- `delete` removes the embed (recoverable from the space trash via standard Confluence recovery flow); there is no purge flag on this endpoint.

```sh
# Create an embed at the space root pointing at an external URL
atlas confluence embeds create --space-id 654321 --title "Demo Video" --embed-url https://example.com/video

# Create an embed nested under a parent page / folder
atlas confluence embeds create --space-id 654321 --title "Spec" --parent-id 789 --embed-url https://example.com/spec

# Read an embed with everything inlined
atlas confluence embeds get embed-1 --include-properties --include-operations

# Walk the descendant tree
atlas confluence embeds descendants embed-1 --depth 3 --limit 50

# Sort direct children by most-recently modified
atlas confluence embeds direct-children embed-1 --sort=-modified-date

# Permitted operations
atlas confluence embeds operations embed-1

# Content properties
atlas confluence embeds list-properties embed-1
atlas confluence embeds create-property embed-1 --key feature-flags --value '{"beta":true}'
atlas confluence embeds get-property embed-1 --property-id prop-1
atlas confluence embeds update-property embed-1 --property-id prop-1 --key feature-flags --value '{"beta":false}' --version-number 4
atlas confluence embeds update-property embed-1 --property-id prop-1 --key feature-flags --value '{"beta":true}' --version-number 5 --message "Re-enable beta"
atlas confluence embeds list-properties embed-1 --sort=-key --limit 50
atlas confluence embeds delete-property embed-1 --property-id prop-1
```

## `folders`

Folders are first-class v2 content for grouping pages, whiteboards, databases, and other folders inside a space. The CLI exposes the full surface: lifecycle (`create`/`get`/`delete`), hierarchy navigation (`ancestors`/`descendants`/`direct-children`/`operations`), content properties (`list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`), and restriction state and direct permissions (`get-`/`set-restriction-state`, `list-`/`add-`/`set-`/`delete-permissions`). Pagination is cursor-based for `descendants`, `direct-children`, `list-properties`, and `list-permissions`; `ancestors` returns a bare `{ results }` and is re-called with the highest ancestor's ID instead of a cursor.

| Action                  | Positional   | Required flags                                          | Optional flags                                                                                         |
| ----------------------- | ------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `create`                | —            | `--space-id`                                            | `--title`, `--parent-id`                                                                               |
| `get`                   | `<folderId>` | —                                                       | `--include-collaborators`, `--include-direct-children`, `--include-operations`, `--include-properties` |
| `delete`                | `<folderId>` | —                                                       | —                                                                                                      |
| `ancestors`             | `<folderId>` | —                                                       | `--limit`                                                                                              |
| `descendants`           | `<folderId>` | —                                                       | `--limit`, `--depth`, `--cursor`                                                                       |
| `direct-children`       | `<folderId>` | —                                                       | `--limit`, `--cursor`, `--sort`                                                                        |
| `operations`            | `<folderId>` | —                                                       | —                                                                                                      |
| `list-properties`       | `<folderId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`                                                               |
| `create-property`       | `<folderId>` | `--key`, `--value`                                      | —                                                                                                      |
| `get-property`          | `<folderId>` | `--property-id`                                         | —                                                                                                      |
| `update-property`       | `<folderId>` | `--property-id`, `--key`, `--value`, `--version-number` | `--message`                                                                                            |
| `delete-property`       | `<folderId>` | `--property-id`                                         | —                                                                                                      |
| `get-restriction-state` | `<folderId>` | —                                                       | —                                                                                                      |
| `set-restriction-state` | `<folderId>` | `--state`                                               | `--allow-self-lockout`                                                                                 |
| `list-permissions`      | `<folderId>` | —                                                       | `--operation`, `--principal-type`, `--principal-id`, `--cursor`, `--limit`                             |
| `add-permissions`       | `<folderId>` | `--body`                                                | `--allow-self-lockout`                                                                                 |
| `set-permissions`       | `<folderId>` | `--body`                                                | `--allow-self-lockout`                                                                                 |
| `delete-permissions`    | `<folderId>` | —                                                       | `--operation`, `--principal-type`, `--principal-id`, `--allow-self-lockout`                            |

- `create` does not take `--private` (`POST /folders` has no such parameter); passing it is rejected rather than silently creating a visible folder. Use `set-restriction-state` / `set-permissions` to restrict a folder after creating it.
- `--depth` on `descendants` accepts 1–10 (validated client-side before the request; server default 2).
- `--sort` on `direct-children` accepts the `ContentSortOrder` vocabulary: `created-date`, `id`, `modified-date`, `child-position`, `title`, each optionally prefixed with `-` for descending.
- `--sort` on `list-properties` accepts `key` or `-key`.
- A flag value that starts with `-` (a descending sort such as `-key` or `-modified-date`, or a negative JSON `--value` such as `-1`) must be written with `=`: `--sort=-key`, `--value=-1`. The space form `--sort -key` is rejected as an ambiguous option.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property` and `databases create-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409). `--message` adds an optional message to that new version (`version: { number, message }`); without it only `version.number` is sent.
- `ancestors` returns `{ results }` without `_links.next`; iterate by calling again with the highest ancestor's ID as the new `<folderId>`.
- Folders have no classification-level endpoints — unlike `databases`, the `/folders` surface does not expose `get`/`update`/`reset-classification-level`.
- `delete` removes the folder (recoverable from the space trash via standard Confluence recovery flow); there is no purge flag on this endpoint.

- `get-restriction-state`, `set-restriction-state`, `list-permissions`, `add-permissions`, `set-permissions`, and `delete-permissions` follow the shared contract in the "Content permissions and restriction state" section below. `set-restriction-state` needs `--state` (`OPEN`, `EDIT_RESTRICTED`, or `VIEW_RESTRICTED`); `add-permissions` / `set-permissions` need `--body` (JSON `{"permissions":[...]}`).

```sh
# Create a folder at the space root
atlas confluence folders create --space-id 654321 --title "Drafts"

# Create a folder nested under another folder / page
atlas confluence folders create --space-id 654321 --title "Q1 Drafts" --parent-id 789

# Read a folder with everything inlined
atlas confluence folders get folder-1 --include-properties --include-operations

# Walk the descendant tree
atlas confluence folders descendants folder-1 --depth 3 --limit 50

# Sort direct children by most-recently modified
atlas confluence folders direct-children folder-1 --sort=-modified-date

# Permitted operations
atlas confluence folders operations folder-1

# Content properties
atlas confluence folders list-properties folder-1
atlas confluence folders create-property folder-1 --key feature-flags --value '{"beta":true}'
atlas confluence folders get-property folder-1 --property-id prop-1
atlas confluence folders update-property folder-1 --property-id prop-1 --key feature-flags --value '{"beta":false}' --version-number 4
atlas confluence folders update-property folder-1 --property-id prop-1 --key feature-flags --value '{"beta":true}' --version-number 5 --message "Re-enable beta"
atlas confluence folders list-properties folder-1 --sort=-key --limit 50
atlas confluence folders delete-property folder-1 --property-id prop-1

# Restriction state and direct permissions
atlas confluence folders get-restriction-state folder-1
atlas confluence folders set-restriction-state folder-1 --state EDIT_RESTRICTED
atlas confluence folders list-permissions folder-1 --principal-type user --principal-id <accountId>
atlas confluence folders add-permissions folder-1 --body '{"permissions":[{"operation":"read","principals":[{"principalType":"user","principalId":"<accountId>"}]}]}'
atlas confluence folders delete-permissions folder-1 --operation read --principal-type user --principal-id <accountId>
```

## `footer-comments`

Top-level (page / blog-post) footer comments exposed through the tenant-wide `/wiki/api/v2/footer-comments` surface. The container-scoped CRUD (`list` by page, `create`, `delete`) lives on the `comments` resource above; this resource covers tenant-wide listing, single-comment fetch with inlinable sub-resources, in-place `update`, and the per-comment navigation collections (`children`, `likes`, `operations`, `versions`).

| Action        | Positional    | Required flags               | Optional flags                                                                                                                                    |
| ------------- | ------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`        | —             | —                            | `--body-format`, `--sort`, `--cursor`, `--limit`                                                                                                  |
| `get`         | `<commentId>` | —                            | `--body-format`, `--version-number`, `--include-properties`, `--include-operations`, `--include-likes`, `--include-versions`, `--include-version` |
| `update`      | `<commentId>` | `--body`, `--version-number` | `--message`                                                                                                                                       |
| `children`    | `<commentId>` | —                            | `--body-format`, `--sort`, `--cursor`, `--limit`                                                                                                  |
| `likes-count` | `<commentId>` | —                            | —                                                                                                                                                 |
| `likes-users` | `<commentId>` | —                            | `--cursor`, `--limit`                                                                                                                             |
| `operations`  | `<commentId>` | —                            | —                                                                                                                                                 |
| `versions`    | `<commentId>` | —                            | `--body-format`, `--sort`, `--cursor`, `--limit`                                                                                                  |
| `version`     | `<commentId>` | `--version-number`           | —                                                                                                                                                 |

- `--body-format` on `list`, `children` and `versions` accepts `storage` or `atlas_doc_format` (the v2 `PrimaryBodyRepresentation` enum). On `get` it also accepts the rendered and editor representations: `storage`, `atlas_doc_format`, `view`, `export_view`, `anonymous_export_view`, `styled_view`, `editor` (`PrimaryBodyRepresentationSingle`). Any other value is rejected before the request.
- `--sort` on `list` and `children` accepts the `CommentSortOrder` vocabulary: `created-date`, `-created-date`, `modified-date`, `-modified-date`.
- `--sort` on `versions` is the narrower `VersionSortOrder`: only `modified-date` / `-modified-date`.
- A descending sort starts with `-`, so write it with `=`: `--sort=-created-date`. The space form `--sort -created-date` is rejected as an ambiguous option.
- `--include-properties`, `--include-operations`, `--include-likes`, `--include-versions` on `get` ask the server to inline that sub-resource so callers can fetch the comment plus context in one round-trip. They default to off; `--include-likes false` sends nothing.
- `--include-version` (inline the current version) defaults to **true** on the server. To leave it out, pass `--no-include-version` or `--include-version false`; both send `include-version=false`. `--include-version` alone sends `true`; omitting both sends nothing (server default true). Passing both `--include-version` and `--no-include-version` is rejected.
- `--version-number <n>` on `get` sends `version=<n>` and returns that historical version of the comment instead of the current one.
- `update` issues `PUT /footer-comments/{id}` — Confluence enforces optimistic concurrency: `--version-number` must be exactly one greater than the comment's current version (mismatches return 409). `--body` is sent with `representation: "storage"`; SDK callers can opt into `atlas_doc_format` via the underlying `comments.updateFooter()` method. `--message` stores an optional message with the new version (`version: { number, message }`); without it only `version.number` is sent.
- `likes-count` returns the bare `{ count }` envelope and is not paginated.
- `likes-users --limit` takes a non-negative integer; 0 is the spec minimum, and the 250 maximum (server default 25) is enforced by the server, not the CLI. Other list actions require `--limit` of at least 1 (server max 250).
- `version` fetches a single past version by number; the response includes the body and audit metadata.
- All list endpoints are cursor-paginated — extract `cursor=…` from `_links.next` and pass it back as `--cursor`.

```sh
# Tenant-wide listing, newest first
atlas confluence footer-comments list --sort=-created-date --limit 25

# Read a single comment with everything inlined
atlas confluence footer-comments get 77777 --include-likes --include-versions

# Rendered HTML body, without the inlined current version
atlas confluence footer-comments get 77777 --body-format view --no-include-version

# A historical version of the comment
atlas confluence footer-comments get 77777 --version-number 2 --include-version false

# Update a footer comment (storage body)
atlas confluence footer-comments update 77777 --body "Updated reply" --version-number 2
atlas confluence footer-comments update 77777 --body "Fixed typo" --version-number 3 --message "Typo fix"

# Walk child replies
atlas confluence footer-comments children 77777 --sort created-date

# Like counts and likers
atlas confluence footer-comments likes-count 77777
atlas confluence footer-comments likes-users 77777 --limit 50

# Permitted operations
atlas confluence footer-comments operations 77777

# Version history
atlas confluence footer-comments versions 77777 --sort=-modified-date
atlas confluence footer-comments version 77777 --version-number 3
```

## `inline-comments`

Tenant-wide inline comment surface exposed through `/wiki/api/v2/inline-comments`. The per-page inline comment CRUD (`list` by page, `create`, `get`, `update`, `delete`) lives on the `comments` resource; this resource covers tenant-wide listing, per-comment threaded children, likes (count + users), permitted operations, and the version history.

| Action        | Positional    | Required flags     | Optional flags                                   |
| ------------- | ------------- | ------------------ | ------------------------------------------------ |
| `list`        | —             | —                  | `--body-format`, `--sort`, `--cursor`, `--limit` |
| `children`    | `<commentId>` | —                  | `--body-format`, `--sort`, `--cursor`, `--limit` |
| `likes-count` | `<commentId>` | —                  | —                                                |
| `likes-users` | `<commentId>` | —                  | `--cursor`, `--limit`                            |
| `operations`  | `<commentId>` | —                  | —                                                |
| `versions`    | `<commentId>` | —                  | `--body-format`, `--sort`, `--cursor`, `--limit` |
| `version`     | `<commentId>` | `--version-number` | —                                                |

- `--body-format` on `list`, `children` and `versions` accepts `storage` or `atlas_doc_format` (the v2 `PrimaryBodyRepresentation` enum); any other value is rejected before the request.
- `--sort` on `list` and `children` accepts the `CommentSortOrder` vocabulary: `created-date`, `-created-date`, `modified-date`, `-modified-date`.
- `--sort` on `versions` is the narrower `VersionSortOrder`: only `modified-date` / `-modified-date`.
- A descending sort starts with `-`, so write it with `=`: `--sort=-created-date`. The space form `--sort -created-date` is rejected as an ambiguous option.
- `likes-count` returns the bare `{ count }` envelope and is not paginated.
- `likes-users --limit` takes a non-negative integer; 0 is the spec minimum, and the 250 maximum (server default 25) is enforced by the server, not the CLI. Other list actions require `--limit` of at least 1 (server max 250).
- `version` fetches a single past version by number; the response includes the body and audit metadata.
- All list endpoints are cursor-paginated — extract `cursor=…` from `_links.next` and pass it back as `--cursor`.

```sh
# Tenant-wide listing, newest first
atlas confluence inline-comments list --sort=-created-date --limit 25

# Walk child replies on an inline thread
atlas confluence inline-comments children 77777 --sort created-date

# Like counts and likers
atlas confluence inline-comments likes-count 77777
atlas confluence inline-comments likes-users 77777 --limit 50

# Permitted operations
atlas confluence inline-comments operations 77777

# Version history
atlas confluence inline-comments versions 77777 --sort=-modified-date
atlas confluence inline-comments versions 77777 --body-format atlas_doc_format --limit 10
atlas confluence inline-comments version 77777 --version-number 3
```

## `whiteboards`

Whiteboards are first-class v2 content (drawings / Confluence whiteboards UI). The CLI exposes the full surface: lifecycle (`create`/`get`/`delete`), hierarchy navigation (`ancestors`/`descendants`/`direct-children`/`operations`), classification level (`get-`/`update-`/`reset-classification-level`), content properties (`list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`), and restriction state and direct permissions (`get-`/`set-restriction-state`, `list-`/`add-`/`set-`/`delete-permissions`). Shape is identical to `databases`: pagination is cursor-based for `descendants`, `direct-children`, `list-properties`, and `list-permissions`; `ancestors` returns a bare `{ results }` and is re-called with the highest ancestor's ID instead of a cursor.

| Action                        | Positional       | Required flags                                          | Optional flags                                                                                         |
| ----------------------------- | ---------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `create`                      | —                | `--space-id`                                            | `--title`, `--parent-id`, `--template-key`, `--locale`, `--private`                                    |
| `get`                         | `<whiteboardId>` | —                                                       | `--include-collaborators`, `--include-direct-children`, `--include-operations`, `--include-properties` |
| `delete`                      | `<whiteboardId>` | —                                                       | —                                                                                                      |
| `ancestors`                   | `<whiteboardId>` | —                                                       | `--limit`                                                                                              |
| `descendants`                 | `<whiteboardId>` | —                                                       | `--limit`, `--depth`, `--cursor`                                                                       |
| `direct-children`             | `<whiteboardId>` | —                                                       | `--limit`, `--cursor`, `--sort`                                                                        |
| `operations`                  | `<whiteboardId>` | —                                                       | —                                                                                                      |
| `get-classification-level`    | `<whiteboardId>` | —                                                       | —                                                                                                      |
| `update-classification-level` | `<whiteboardId>` | `--level-id`                                            | —                                                                                                      |
| `reset-classification-level`  | `<whiteboardId>` | —                                                       | —                                                                                                      |
| `list-properties`             | `<whiteboardId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`                                                               |
| `create-property`             | `<whiteboardId>` | `--key`, `--value`                                      | —                                                                                                      |
| `get-property`                | `<whiteboardId>` | `--property-id`                                         | —                                                                                                      |
| `update-property`             | `<whiteboardId>` | `--property-id`, `--key`, `--value`, `--version-number` | `--message`                                                                                            |
| `delete-property`             | `<whiteboardId>` | `--property-id`                                         | —                                                                                                      |
| `get-restriction-state`       | `<whiteboardId>` | —                                                       | —                                                                                                      |
| `set-restriction-state`       | `<whiteboardId>` | `--state`                                               | `--allow-self-lockout`                                                                                 |
| `list-permissions`            | `<whiteboardId>` | —                                                       | `--operation`, `--principal-type`, `--principal-id`, `--cursor`, `--limit`                             |
| `add-permissions`             | `<whiteboardId>` | `--body`                                                | `--allow-self-lockout`                                                                                 |
| `set-permissions`             | `<whiteboardId>` | `--body`                                                | `--allow-self-lockout`                                                                                 |
| `delete-permissions`          | `<whiteboardId>` | —                                                       | `--operation`, `--principal-type`, `--principal-id`, `--allow-self-lockout`                            |

- `--private` on `create` creates a whiteboard visible only to the creator.
- `--template-key` and `--locale` on `create` select an initial template and locale; both are optional and forwarded as body fields (`templateKey`, `locale`). **Both are closed enums** from the Confluence v2 OpenAPI spec, validated client-side: an invalid value is rejected with the full allowlist before any HTTP request is sent.
  - `--template-key` (53 values): `2x2-prioritization`, `4ls-retro`, `action-plan`, `annual-calendar`, `annual-calendar-2025-2026`, `bounded-context`, `brainwriting`, `concept-map`, `crazy-8s`, `daily-sync`, `disruptive-brainstorm`, `dot-voting`, `elevator-pitch`, `executive-summary`, `fishbone-diagram`, `flow-chart`, `gap-analysis`, `health-monitor`, `hopes-and-fears`, `ice-breakers`, `incident-postmortem`, `journey-mapping-kit`, `kanban-board`, `lean-coffee`, `network-of-teams`, `okr-planning`, `org-chart`, `pi-planning`, `poker-planning`, `prioritization`, `prioritization-experiment`, `product-roadmap`, `product-vision-board`, `rice`, `risk-assessment`, `root-cause-analysis`, `sailboat-retro`, `service-blueprint`, `simple-retrospective`, `sprint-planning`, `stakeholder-mapping`, `sticky-note-pack`, `storyboard`, `swimlane-vertical`, `swimlanes`, `swot-analysis`, `team-formation-guide`, `timeline`, `timeline-workflow`, `user-story-map`, `venn-diagram`, `vision-board`, `workflow`.
  - `--locale` (21 values): `cs-CZ`, `da-DK`, `de-DE`, `en-GB`, `en-US`, `es-ES`, `fi-FI`, `fr-FR`, `hu-HU`, `it-IT`, `ja-JP`, `ko-KR`, `nb-NO`, `nl-NL`, `pl-PL`, `pt-BR`, `ru-RU`, `sv-SE`, `tr-TR`, `zh-CN`, `zh-TW`.
- `get` returns the `WhiteboardSingle` shape: `id`, `type`, `status`, `title`, `parentId`, `parentType`, `position`, `authorId`, `ownerId`, `createdAt`, `spaceId`, `version` (`{ createdAt, message, number, minorEdit, authorId }`), and `_links` (`webui`, `editui`).
- `--depth` on `descendants` accepts 1–10 (validated client-side before the request; server default 2).
- `--sort` on `direct-children` accepts the `ContentSortOrder` vocabulary: `created-date`, `id`, `modified-date`, `child-position`, `title`, each optionally prefixed with `-` for descending.
- `--sort` on `list-properties` accepts `key` or `-key`.
- A flag value that starts with `-` (a descending sort such as `-key` or `-modified-date`, or a negative JSON `--value` such as `-1`) must be written with `=`: `--sort=-key`, `--value=-1`. The space form `--sort -key` is rejected as an ambiguous option.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property` and `databases create-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409). `--message` adds an optional message to that new version (`version: { number, message }`); without it only `version.number` is sent.
- `update-classification-level` always sends `status: "current"` (the only legal server value); the CLI hard-codes it so callers only need `--level-id`. Take the level ID from the `id` field of `atlas confluence classification-levels list`.
- `reset-classification-level` sends `{ status: "current" }` and falls back to the space default classification.
- `ancestors` returns `{ results }` without `_links.next`; iterate by calling again with the highest ancestor's ID as the new `<whiteboardId>`.
- `delete` trashes the whiteboard (recoverable from the space trash); there is no purge flag on this endpoint.

- `get-restriction-state`, `set-restriction-state`, `list-permissions`, `add-permissions`, `set-permissions`, and `delete-permissions` follow the shared contract in the "Content permissions and restriction state" section below. `set-restriction-state` needs `--state` (`OPEN`, `EDIT_RESTRICTED`, or `VIEW_RESTRICTED`); `add-permissions` / `set-permissions` need `--body` (JSON `{"permissions":[...]}`).

```sh
# Create a whiteboard in a space
atlas confluence whiteboards create --space-id 654321 --title "Roadmap"

# Create a private whiteboard with a template
atlas confluence whiteboards create --space-id 654321 --title "Secret" --template-key kanban-board --locale en-US --private

# A SWOT board in German
atlas confluence whiteboards create --space-id 654321 --title "SWOT" --template-key swot-analysis --locale de-DE

# Read a whiteboard (basic)
atlas confluence whiteboards get wb-1

# Read a whiteboard with additional details
atlas confluence whiteboards get wb-1 --include-collaborators --include-properties

# Walk the descendant tree
atlas confluence whiteboards descendants wb-1 --depth 3 --limit 50

# Sort direct children by most-recently modified
atlas confluence whiteboards direct-children wb-1 --sort=-modified-date

# Classification level lifecycle
atlas confluence whiteboards get-classification-level wb-1
atlas confluence whiteboards update-classification-level wb-1 --level-id cl-restricted
atlas confluence whiteboards reset-classification-level wb-1

# Content properties
atlas confluence whiteboards list-properties wb-1
atlas confluence whiteboards create-property wb-1 --key feature-flags --value '{"beta":true}'
atlas confluence whiteboards get-property wb-1 --property-id prop-1
atlas confluence whiteboards update-property wb-1 --property-id prop-1 --key feature-flags --value '{"beta":false}' --version-number 4
atlas confluence whiteboards update-property wb-1 --property-id prop-1 --key feature-flags --value '{"beta":true}' --version-number 5 --message "Re-enable beta"
atlas confluence whiteboards list-properties wb-1 --sort=-key --limit 50
atlas confluence whiteboards delete-property wb-1 --property-id prop-1

# Restriction state and direct permissions
atlas confluence whiteboards get-restriction-state wb-1
atlas confluence whiteboards set-restriction-state wb-1 --state EDIT_RESTRICTED
atlas confluence whiteboards list-permissions wb-1 --principal-type user --principal-id <accountId>
atlas confluence whiteboards add-permissions wb-1 --body '{"permissions":[{"operation":"read","principals":[{"principalType":"user","principalId":"<accountId>"}]}]}'
atlas confluence whiteboards delete-permissions wb-1 --operation read --principal-type user --principal-id <accountId>
```

## Content permissions and restriction state (`pages`, `blog-posts`, `databases`, `whiteboards`, `folders`)

These five content types expose the same six actions (`<id>` is the page / blog post / database / whiteboard / folder ID):

| Action                  | Command shape                                                                                                                                                    | Notes                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `get-restriction-state` | `atlas confluence <resource> get-restriction-state <id>`                                                                                                         | Returns `{ state, createdAt?, createdBy? }`; `createdAt` / `createdBy` are absent when `state` is `OPEN`.          |
| `set-restriction-state` | `atlas confluence <resource> set-restriction-state <id> --state <state> [--allow-self-lockout]`                                                                  | `--state` is `OPEN`, `EDIT_RESTRICTED`, or `VIEW_RESTRICTED`. Returns the new state.                               |
| `list-permissions`      | `atlas confluence <resource> list-permissions <id> [--operation read\|update] [--principal-type user\|group] [--principal-id <id>] [--cursor <c>] [--limit <n>]` | Returns `{ results: [{ operation, principal: { principalType, principalId }, createdAt?, createdBy? }], _links }`. |
| `add-permissions`       | `atlas confluence <resource> add-permissions <id> --body '<json>' [--allow-self-lockout]`                                                                        | Merges the given principals into the existing permissions.                                                         |
| `set-permissions`       | `atlas confluence <resource> set-permissions <id> --body '<json>' [--allow-self-lockout]`                                                                        | REPLACES all direct permissions; anything not in the body is removed.                                              |
| `delete-permissions`    | `atlas confluence <resource> delete-permissions <id> [--operation ...] [--principal-type ...] [--principal-id ...] [--allow-self-lockout]`                       | Prints `{ "deleted": true }`.                                                                                      |

- Restriction states: `OPEN` has no direct restriction (a parent may still restrict access); `EDIT_RESTRICTED` leaves viewing open but limits editing to granted principals; `VIEW_RESTRICTED` limits viewing and editing to granted principals. Inherited restrictions are not reported.
- `--body` for `add-permissions` / `set-permissions` is `{"permissions":[{"operation":"read"|"update","principals":[{"principalType":"user"|"group","principalId":"<accountId or groupId>"}]}]}`. `principalId` is the Atlassian account ID for users and the group ID for groups.
- A principal holds one permission, `read` or `update`. `add-permissions` of `read` downgrades an existing `update`; `update` upgrades; if one request lists both for a principal, `update` wins. Re-sending an existing permission is idempotent. The resulting direct-permission set is capped at 500 entries. The response carries only the first 250 resulting permissions; use `list-permissions` for the rest.
- `list-permissions` is cursor-paginated (`--limit` 1–250, default 100; pass the `cursor=` value from `_links.next` as `--cursor`). `--principal-id` must be combined with `--principal-type`; `--principal-type` alone returns every permission of that type.
- `delete-permissions` is destructive: with NO filter flags it deletes ALL direct permissions. Supported filters: `--principal-type` + `--principal-id` (deletes that principal's `read` or `update` permission) or `--operation` + `--principal-type` + `--principal-id` (deletes it only when the operation matches). `--operation` without both principal flags, or only one principal flag, returns 400.
- `--allow-self-lockout` is a boolean flag and is sent (as `allow-self-lockout=true`) ONLY when you pass it alone or as `--allow-self-lockout true`. `--allow-self-lockout false` and `--no-allow-self-lockout` send nothing, exactly like omitting it. Without it the server rejects a change that would remove the calling user's own edit access. Do not pass it unless the user explicitly wants to risk losing their own access.

```sh
atlas confluence pages set-restriction-state 12345 --state VIEW_RESTRICTED
atlas confluence pages set-permissions 12345 --body '{"permissions":[{"operation":"update","principals":[{"principalType":"user","principalId":"<accountId>"},{"principalType":"group","principalId":"<groupId>"}]}]}'
atlas confluence folders list-permissions folder-1 --operation update --limit 50
atlas confluence whiteboards delete-permissions wb-1 --principal-type group --principal-id <groupId>
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
