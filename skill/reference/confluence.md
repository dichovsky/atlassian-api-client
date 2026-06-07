# Confluence reference — `atlas confluence`

Confluence Cloud REST API v2 surface. Load this file when you need a flag or action the canonical examples in `SKILL.md` don't cover.

## Resource × action matrix

| Resource                | Actions                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages`                 | `list`, `get`, `create`, `update`, `delete`, `ancestors`, `descendants`, `direct-children`, `children`, `get-classification-level`, `update-classification-level`, `reset-classification-level`, `custom-content`, `likes-count`, `likes-users`, `operations`, `redact`, `update-title`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`, `version`, `versions`, `footer-comments`, `inline-comments`, `upload-attachment` |
| `spaces`                | `list`, `get`, `create`, `blog-posts`, `get-default-classification-level`, `update-default-classification-level`, `delete-default-classification-level`, `content-labels`, `custom-content`, `labels`, `operations`, `pages`, `permissions`, `role-assignments`, `set-role-assignments`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`                                                                                   |
| `blog-posts`            | `list`, `get`, `create`, `update`, `delete`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`, `attachments`, `get-classification-level`, `update-classification-level`, `reset-classification-level`, `custom-content`, `footer-comments`, `inline-comments`, `labels`, `likes-count`, `likes-users`, `operations`, `redact`, `versions`, `version`                                                                        |
| `comments`              | `list`, `get`, `create`, `update`, `delete`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`                                                                                                                                                                                                                                                                                                                               |
| `attachments`           | `list`, `list-all`, `get`, `delete`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`, `versions`, `get-version`, `footer-comments`, `labels`, `operations`, `thumbnail`                                                                                                                                                                                                                                                    |
| `labels`                | `list`, `list-all`, `attachments`, `blog-posts`, `pages`, `list-for-space`, `list-for-blog-post`                                                                                                                                                                                                                                                                                                                                                                      |
| `admin-key`             | `get`, `create`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `app`                   | `list-properties`, `get-property`, `upsert-property`, `delete-property`                                                                                                                                                                                                                                                                                                                                                                                               |
| `classification-levels` | `list`                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `content`               | `convert-ids-to-types`                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `custom-content`        | `list`, `get`, `create`, `update`, `delete`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`, `versions`, `version`, `attachments`, `children`, `footer-comments`, `labels`, `operations`                                                                                                                                                                                                                                  |
| `data-policies`         | `get-metadata`, `list-spaces`                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `databases`             | `create`, `get`, `delete`, `ancestors`, `descendants`, `direct-children`, `operations`, `get-classification-level`, `update-classification-level`, `reset-classification-level`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`                                                                                                                                                                                           |
| `embeds`                | `create`, `get`, `delete`, `ancestors`, `descendants`, `direct-children`, `operations`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`                                                                                                                                                                                                                                                                                    |
| `folders`               | `create`, `get`, `delete`, `ancestors`, `descendants`, `direct-children`, `operations`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`                                                                                                                                                                                                                                                                                    |
| `footer-comments`       | `list`, `get`, `update`, `children`, `likes-count`, `likes-users`, `operations`, `versions`, `version`                                                                                                                                                                                                                                                                                                                                                                |
| `inline-comments`       | `list`, `children`, `likes-count`, `likes-users`, `operations`, `versions`, `version`                                                                                                                                                                                                                                                                                                                                                                                 |
| `space-permissions`     | `list`                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `space-role-mode`       | `get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `space-roles`           | `list`, `get`, `create`, `update`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `tasks`                 | `list`, `get`, `update`                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `users`                 | `check-access-by-email`, `invite-by-email`                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `users-bulk`            | `lookup`                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `whiteboards`           | `create`, `get`, `delete`, `ancestors`, `descendants`, `direct-children`, `operations`, `get-classification-level`, `update-classification-level`, `reset-classification-level`, `list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`                                                                                                                                                                                           |

## `pages`

Lifecycle (`list` / `get` / `create` / `update` / `delete`) plus the full `/pages/{id}/…` sub-resource family — hierarchy (`ancestors`, `descendants`, `direct-children`, `children`), classification level (read / write / reset), custom-content children, likes (count + users), permitted operations, the redaction verb, the targeted title update, content-property collections, single-version fetch, and attachment upload.

| Action                        | Positional | Required flags                                          | Optional flags                                                                      |
| ----------------------------- | ---------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `list`                        | —          | —                                                       | `--space-id`, `--title`, `--status`, `--limit`, `--cursor`, `--body-format`         |
| `get`                         | `<pageId>` | —                                                       | —                                                                                   |
| `create`                      | —          | `--space-id`, `--title`, `--body`                       | —                                                                                   |
| `update`                      | `<pageId>` | `--version-number`, `--title`, `--body`                 | —                                                                                   |
| `delete`                      | `<pageId>` | —                                                       | `--purge`                                                                           |
| `ancestors`                   | `<pageId>` | —                                                       | `--limit`                                                                           |
| `descendants`                 | `<pageId>` | —                                                       | `--limit`, `--depth`, `--cursor`                                                    |
| `direct-children`             | `<pageId>` | —                                                       | `--limit`, `--cursor`, `--sort`                                                     |
| `children`                    | `<pageId>` | —                                                       | `--limit`, `--cursor`, `--sort`                                                     |
| `get-classification-level`    | `<pageId>` | —                                                       | `--status`                                                                          |
| `update-classification-level` | `<pageId>` | `--level-id`                                            | `--status` (defaults to `current`)                                                  |
| `reset-classification-level`  | `<pageId>` | —                                                       | `--status` (defaults to `current`)                                                  |
| `custom-content`              | `<pageId>` | `--type`                                                | `--sort`, `--cursor`, `--limit`, `--body-format`                                    |
| `likes-count`                 | `<pageId>` | —                                                       | —                                                                                   |
| `likes-users`                 | `<pageId>` | —                                                       | `--cursor`, `--limit`                                                               |
| `operations`                  | `<pageId>` | —                                                       | —                                                                                   |
| `redact`                      | `<pageId>` | `--value` (must include `createdAt`, or `--created-at`) | `--created-at`, `--clean-history`                                                   |
| `update-title`                | `<pageId>` | `--title`                                               | `--status` (defaults to `current`)                                                  |
| `list-properties`             | `<pageId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`                                            |
| `create-property`             | `<pageId>` | `--key`, `--value`                                      | —                                                                                   |
| `get-property`                | `<pageId>` | `--property-id`                                         | —                                                                                   |
| `update-property`             | `<pageId>` | `--property-id`, `--key`, `--value`, `--version-number` | —                                                                                   |
| `delete-property`             | `<pageId>` | `--property-id`                                         | —                                                                                   |
| `version`                     | `<pageId>` | `--version-number`                                      | —                                                                                   |
| `versions`                    | `<pageId>` | —                                                       | `--cursor`, `--limit`                                                               |
| `footer-comments`             | `<pageId>` | —                                                       | `--body-format`, `--status`, `--sort`, `--cursor`, `--limit`                        |
| `inline-comments`             | `<pageId>` | —                                                       | `--body-format`, `--status`, `--resolution-status`, `--sort`, `--cursor`, `--limit` |
| `upload-attachment`           | `<pageId>` | `--file`                                                | `--filename` (override), `--media-type` (override MIME)                             |

- `--body-format` on `list` / `custom-content` accepts `storage` (default Confluence storage XML); `custom-content` additionally accepts `raw` / `atlas_doc_format`.
- `--version-number` for `update` and `update-property` must be a positive integer exactly one greater than the current version (Confluence enforces optimistic concurrency; mismatches return 409). `update-title` does **not** require optimistic concurrency — no `version.number` field.
- `--purge` on `delete` permanently removes the page; without it the page goes to trash.
- `ancestors` returns a bare `{ results }` object without a `_links.next` cursor — paginate by re-calling with the highest ancestor's id (same convention as `folders ancestors`, `databases ancestors`).
- `descendants --depth` accepts integers 1–10 per spec (server-enforced).
- `direct-children --sort` accepts `ContentSortOrder`: `created-date`, `-created-date`, `id`, `-id`, `modified-date`, `-modified-date`, `child-position`, `-child-position`, `title`, `-title`. `children --sort` is narrower — `ChildPageSortOrder`: `created-date`, `-created-date`, `id`, `-id`, `child-position`, `-child-position`, `modified-date`, `-modified-date` (no `title`). `/children` returns only child pages; `/direct-children` returns any content type rooted at the page.
- `get-classification-level --status` accepts `current` (default), `draft`, or `archived`. `update-classification-level` / `reset-classification-level` `--status` accepts `current` (default) or `draft` — page classification can be updated per-revision-stream (unlike blog-post classification which is locked to `current`). `--level-id` on update sends the chosen classification id.
- `custom-content --type` is required (Confluence resolves the custom-content namespace from this value). `--sort` accepts `CustomContentSortOrder`: `id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`, `title`, `-title`.
- `likes-count` returns the bare `{ count }` envelope and is not paginated.
- `redact --value` accepts the full `RedactPageData` payload as JSON (same shape as the blog-post `RedactionRequest`: `createdAt`, optional `cleanHistory` / `versionNumber`, `body.redactions[]` / `title.redactions[]` JSON-pointer arrays). `createdAt` is required by the spec; the CLI fast-fails when it is missing instead of round-tripping to a 400. Convenience overrides `--created-at` (ISO-8601 timestamp) and `--clean-history` (boolean) merge into the parsed `--value` payload and win over its matching top-level keys. Requires Atlassian Guard Premium on the target tenant.
- `update-title` targets the `/title` sub-resource (separate from full `update`). Use when you only want to rename the page without touching the body or bumping the page version — handy for bulk renames.
- Content-property `--value` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property`).
- `version --version-number` fetches a single past version by number; the response includes the body and audit metadata. (Dispatched to `client.versions.getForPage` since the SDK already exposes the route there.)
- `versions` lists the full version history of a page (`GET /pages/{id}/versions`). Accepts `--limit` / `--cursor` only (`ListVersionsParams` — no sort or body-format). Dispatched to `client.versions.listForPage`.
- `footer-comments` lists footer (top-level) comments on a page (`GET /pages/{id}/footer-comments`). `--status` accepts `current` or `deleted`. `--sort` is `CommentSortOrder`: `created-date`, `-created-date`, `modified-date`, `-modified-date`. Mirrors `blog-posts footer-comments` exactly.
- `inline-comments` lists inline (anchored) comments on a page (`GET /pages/{id}/inline-comments`). Extends `footer-comments` params with `--resolution-status` (`open` or `resolved`). Mirrors `blog-posts inline-comments` exactly.
- `upload-attachment --file` reads a local file and POSTs it as multipart form-data to `/pages/{id}/attachments`. `--filename` overrides the on-disk name; `--media-type` overrides server-side MIME sniffing. Dispatched to `client.attachments.upload(pageId, filename, blob, mime?)`.
- All list endpoints (except `ancestors`) are cursor-paginated — extract `cursor=…` from `_links.next` and pass it back as `--cursor`.

```sh
# Lifecycle
atlas confluence pages list --space-id 654321 --limit 25
atlas confluence pages get 12345
atlas confluence pages update 12345 --title "Renamed" --version-number 2 --body "<p>v2</p>"
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
atlas confluence pages redact 12345 --value '{"body":{"redactions":[{"pointer":"/body/0/0","from":0,"to":4,"reason":"PII"}]}}' --created-at 2026-05-22T12:00:00Z --clean-history
atlas confluence pages update-title 12345 --title "Renamed" --status current

# Content properties
atlas confluence pages list-properties 12345 --sort key
atlas confluence pages create-property 12345 --key reviewed --value true
atlas confluence pages get-property 12345 --property-id prop-1
atlas confluence pages update-property 12345 --property-id prop-1 --key reviewed --value false --version-number 2
atlas confluence pages delete-property 12345 --property-id prop-1

# Versions + attachments upload
atlas confluence pages version 12345 --version-number 2
atlas confluence pages versions 12345 --limit 25
atlas confluence pages footer-comments 12345 --sort -created-date --limit 25
atlas confluence pages inline-comments 12345 --body-format storage --resolution-status open
atlas confluence pages upload-attachment 12345 --file ./screenshot.png --media-type image/png
```

## `spaces`

Lifecycle (`list` / `get` / `create`) plus the full `/spaces/{id}/…` sub-resource family: per-space blog posts and pages, custom content of a given type, content labels (on contained content) vs. labels (on the space entity itself), default classification level (read / write / clear), permitted operations, permission assignments, role assignments (read + bulk overwrite), and space-property CRUD.

| Action                                | Positional  | Required flags                                          | Optional flags                                                                                          |
| ------------------------------------- | ----------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `list`                                | —           | —                                                       | `--limit`, `--cursor`                                                                                   |
| `get`                                 | `<spaceId>` | —                                                       | —                                                                                                       |
| `create`                              | —           | `--name`                                                | `--key`, `--alias`, `--description`, `--private`, `--template-key`, `--copy-space-access-configuration` |
| `blog-posts`                          | `<spaceId>` | —                                                       | `--sort`, `--status`, `--title`, `--body-format`, `--cursor`, `--limit`                                 |
| `get-default-classification-level`    | `<spaceId>` | —                                                       | —                                                                                                       |
| `update-default-classification-level` | `<spaceId>` | `--level-id`                                            | —                                                                                                       |
| `delete-default-classification-level` | `<spaceId>` | —                                                       | —                                                                                                       |
| `content-labels`                      | `<spaceId>` | —                                                       | `--prefix`, `--sort`, `--cursor`, `--limit`                                                             |
| `custom-content`                      | `<spaceId>` | `--type`                                                | `--cursor`, `--limit`, `--body-format`                                                                  |
| `labels`                              | `<spaceId>` | —                                                       | `--prefix`, `--sort`, `--cursor`, `--limit`                                                             |
| `operations`                          | `<spaceId>` | —                                                       | —                                                                                                       |
| `pages`                               | `<spaceId>` | —                                                       | `--depth`, `--sort`, `--status`, `--title`, `--body-format`, `--cursor`, `--limit`                      |
| `permissions`                         | `<spaceId>` | —                                                       | `--cursor`, `--limit`                                                                                   |
| `role-assignments`                    | `<spaceId>` | —                                                       | `--role-id`, `--role-type`, `--principal-id`, `--principal-type`, `--cursor`, `--limit`                 |
| `set-role-assignments`                | `<spaceId>` | `--value` (JSON array)                                  | —                                                                                                       |
| `list-properties`                     | `<spaceId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`                                                                |
| `create-property`                     | `<spaceId>` | `--key`, `--value`                                      | —                                                                                                       |
| `get-property`                        | `<spaceId>` | `--property-id`                                         | —                                                                                                       |
| `update-property`                     | `<spaceId>` | `--property-id`, `--key`, `--value`, `--version-number` | —                                                                                                       |
| `delete-property`                     | `<spaceId>` | `--property-id`                                         | —                                                                                                       |

- `create` requires either `--key` or `--alias` for the space URL identifier (the OpenAPI spec encodes this constraint in prose); `--description` is sent as `{ value, representation: 'plain' }` since the v2 API only accepts the plain representation. `--private` mints a private space (the calling user becomes the sole admin). `--copy-space-access-configuration` clones the access configuration from the named space id. Available on tenants with Role-Based Access Control.
- `blog-posts --sort` accepts `BlogPostSortOrder` (`id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`). `--status` is comma-separated `current,deleted,trashed` (narrower than the standalone `/blogposts` collection — `historical` / `draft` are not legal here). `--body-format` is `storage` or `atlas_doc_format`.
- `pages --depth` accepts `all` (default — full subtree) or `root` (top-level pages only). `--status` is comma-separated `current,archived,deleted,trashed`. `--sort` is `PageSortOrder` (`id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`, `title`, `-title`). `--body-format` is `storage` or `atlas_doc_format`.
- `content-labels` returns labels applied to **content within the space** (pages, blog posts, attachments). `labels` returns labels applied to the **space entity itself**. Both accept `--prefix` (`my` or `team` only — narrower than the tenant-wide `/labels` collection which also accepts `global` and `system`) and `--sort` from `LabelSortOrder` (`created-date`, `-created-date`, `id`, `-id`, `name`, `-name`).
- `custom-content --type` is required (Confluence resolves the custom-content namespace from this value). `--body-format` accepts `raw`, `storage`, or `atlas_doc_format`. Unlike the blog-post variant this endpoint does not accept a `--sort` parameter.
- `update-default-classification-level --level-id` sends `{ id: <level-id> }` and returns 204. `delete-default-classification-level` clears the override so content falls back to the tenant-wide default.
- `permissions` returns per-space permission assignments (the `{ principal, operation }` grants actually issued on this space). Distinct from `space-permissions list`, which lists the available permission _definitions_.
- `role-assignments` lists current grants; filter by `--role-id`, `--role-type` (`SYSTEM` / `CUSTOM`), `--principal-id`, `--principal-type` (`USER` / `GROUP` / `ACCESS_CLASS`).
- `set-role-assignments --value` accepts a JSON array of `{ principal: { principalType, principalId }, roleId }` entries; the server replaces the space's role assignments wholesale with the provided list. Returns the `MultiEntityResult<SpaceRoleAssignment>` envelope from the server (200 response) — `results` is the canonicalised assignment set after the replace (principals and role ids may be normalised), so treat it as the authoritative post-write state rather than re-echoing the request.
- The `*-property` actions wrap `/spaces/{space-id}/properties`. `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string. `--sort` on `list-properties` accepts `key` or `-key`. `update-property --version-number` must be exactly one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409).
- All list endpoints are cursor-paginated — extract `cursor=…` from `_links.next` and pass it back as `--cursor`.

```sh
# Lifecycle
atlas confluence spaces list --limit 25
atlas confluence spaces get 654321
atlas confluence spaces create --name "Engineering" --key ENG --description "Eng wiki"
atlas confluence spaces create --name "Private Inbox" --alias inbox --private

# Sub-collections
atlas confluence spaces blog-posts 654321 --sort=-created-date --status current --limit 25
atlas confluence spaces pages 654321 --depth root --title "Quarterly" --sort=-modified-date
atlas confluence spaces custom-content 654321 --type ai.atlassian.collection
atlas confluence spaces content-labels 654321 --prefix team
atlas confluence spaces labels 654321 --prefix team --sort -name
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
atlas confluence spaces list-properties 654321 --sort key
atlas confluence spaces create-property 654321 --key feature-flags --value '{"beta":true}'
atlas confluence spaces get-property 654321 --property-id prop-1
atlas confluence spaces update-property 654321 --property-id prop-1 --key feature-flags --value '{"beta":false}' --version-number 2
atlas confluence spaces delete-property 654321 --property-id prop-1
```

## `blog-posts`

Lifecycle (`list` / `get` / `create` / `update` / `delete`) mirrors `pages`: `create --space-id --title --body`, `update <id> --version-number --title --body`, `delete <id> [--purge]`.

The remaining actions wrap the `/blogposts/{id}/…` sub-resource family — content properties, attachments, classification level, custom content children, footer + inline comments, labels, likes, operations, redaction, and version history.

| Action                        | Positional     | Required flags                                               | Optional flags                                                                                                                                                                                                                                                                                          |
| ----------------------------- | -------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`                        | —              | —                                                            | `--space-id`, `--limit`, `--cursor`                                                                                                                                                                                                                                                                     |
| `get`                         | `<blogPostId>` | —                                                            | `--body-format`, `--get-draft`, `--status`, `--historical-version`, `--include-labels`, `--include-properties`, `--include-operations`, `--include-likes`, `--include-versions`, `--include-version`, `--include-favorited-by-current-user-status`, `--include-webresources`, `--include-collaborators` |
| `create`                      | —              | `--space-id`, `--title`                                      | `--body`                                                                                                                                                                                                                                                                                                |
| `update`                      | `<blogPostId>` | `--version-number`, `--title`                                | `--body`                                                                                                                                                                                                                                                                                                |
| `delete`                      | `<blogPostId>` | —                                                            | —                                                                                                                                                                                                                                                                                                       |
| `list-properties`             | `<blogPostId>` | —                                                            | `--key`, `--sort`, `--cursor`, `--limit`                                                                                                                                                                                                                                                                |
| `create-property`             | `<blogPostId>` | `--key`, `--value`                                           | —                                                                                                                                                                                                                                                                                                       |
| `get-property`                | `<blogPostId>` | `--property-id`                                              | —                                                                                                                                                                                                                                                                                                       |
| `update-property`             | `<blogPostId>` | `--property-id`, `--key`, `--value`, `--version-number`      | —                                                                                                                                                                                                                                                                                                       |
| `delete-property`             | `<blogPostId>` | `--property-id`                                              | —                                                                                                                                                                                                                                                                                                       |
| `attachments`                 | `<blogPostId>` | —                                                            | `--sort`, `--status`, `--cursor`, `--media-type`, `--filename`, `--limit`                                                                                                                                                                                                                               |
| `get-classification-level`    | `<blogPostId>` | —                                                            | `--status`                                                                                                                                                                                                                                                                                              |
| `update-classification-level` | `<blogPostId>` | `--level-id`                                                 | —                                                                                                                                                                                                                                                                                                       |
| `reset-classification-level`  | `<blogPostId>` | —                                                            | —                                                                                                                                                                                                                                                                                                       |
| `custom-content`              | `<blogPostId>` | `--type`                                                     | `--sort`, `--cursor`, `--limit`, `--body-format`                                                                                                                                                                                                                                                        |
| `footer-comments`             | `<blogPostId>` | —                                                            | `--body-format`, `--status`, `--sort`, `--cursor`, `--limit`                                                                                                                                                                                                                                            |
| `inline-comments`             | `<blogPostId>` | —                                                            | `--body-format`, `--status`, `--resolution-status`, `--sort`, `--cursor`, `--limit`                                                                                                                                                                                                                     |
| `labels`                      | `<blogPostId>` | —                                                            | `--prefix`, `--sort`, `--cursor`, `--limit`                                                                                                                                                                                                                                                             |
| `likes-count`                 | `<blogPostId>` | —                                                            | —                                                                                                                                                                                                                                                                                                       |
| `likes-users`                 | `<blogPostId>` | —                                                            | `--cursor`, `--limit`                                                                                                                                                                                                                                                                                   |
| `operations`                  | `<blogPostId>` | —                                                            | —                                                                                                                                                                                                                                                                                                       |
| `redact`                      | `<blogPostId>` | `--value` (must include `createdAt`, or pass `--created-at`) | `--created-at`, `--clean-history`                                                                                                                                                                                                                                                                       |
| `versions`                    | `<blogPostId>` | —                                                            | `--body-format`, `--sort`, `--cursor`, `--limit`                                                                                                                                                                                                                                                        |
| `version`                     | `<blogPostId>` | `--version-number`                                           | —                                                                                                                                                                                                                                                                                                       |

- Property `--value` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property`). `update-property --version-number` must be exactly one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409).
- `get` `--body-format` accepts `storage`, `atlas_doc_format`, `view`, `export_view`, `anonymous_export_view`, `styled_view`, or `editor` (spec `PrimaryBodyRepresentationSingle`). `--status` is a comma-separated subset of `current,trashed,deleted,historical,draft`. `--historical-version` selects a specific past version (positive integer); omit for the latest. Boolean `--include-*` flags ask the server to inline an extra sub-resource block (each capped server-side at 50 with a `_links.next` pointer for the full collection); leaving them unset keeps the payload minimal. `--get-draft` retrieves the draft revision when present.
- `attachments --sort` accepts `AttachmentSortOrder`: `created-date`, `-created-date`, `modified-date`, `-modified-date`. `--status` is a comma-separated subset of `current,archived,trashed` (server default is `current,archived`). `--media-type` filters by MIME, `--filename` by exact name.
- `get-classification-level --status` accepts `current` (default), `draft`, or `archived`. `update-classification-level --level-id` sends the chosen classification id; the server always treats the request as `status: current`. `reset-classification-level` falls back to the space default and accepts no flags.
- `custom-content --type` is required (Confluence resolves the custom-content namespace from this value). `--body-format` accepts `raw`, `storage`, or `atlas_doc_format`. `--sort` accepts `CustomContentSortOrder`: `id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`, `title`, `-title`.
- `footer-comments` / `inline-comments` `--body-format` accepts `storage` or `atlas_doc_format`. `--status` accepts `current`, `deleted`, `trashed`, `historical`, `draft`. Inline comments additionally accept `--resolution-status` from `resolved`, `open`, `dangling`, `reopened`. `--sort` is `CommentSortOrder`: `created-date`, `-created-date`, `modified-date`, `-modified-date`.
- `labels --prefix` accepts `my`, `team`, `global`, `system`. `--sort` is `LabelSortOrder`: `created-date`, `-created-date`, `id`, `-id`, `name`, `-name`. The SDK shares this collection with `labels.listForBlogPost` — both call `GET /blogposts/{id}/labels`.
- `likes-count` returns the bare `{ count }` envelope and is not paginated.
- `redact --value` accepts the full `RedactBlogPostData` payload as JSON (e.g. `--value '{"createdAt":"2026-05-01T00:00:00Z","body":{"redactions":[{"pointer":"/body/0/0","from":0,"to":4,"reason":"PII"}]}}'`). `createdAt` is required by the spec; the CLI fast-fails when it is missing instead of round-tripping to a 400. Convenience overrides `--created-at` (ISO-8601 timestamp) and `--clean-history` (boolean) merge into the parsed `--value` payload and win over its matching top-level keys, so you can shorten common invocations. Requires Atlassian Guard Premium on the target tenant.
- `versions --sort` is the narrow `VersionSortOrder`: only `modified-date` / `-modified-date`. `version --version-number` fetches a single past version by number; the response includes the body and audit metadata.
- All list endpoints are cursor-paginated — extract `cursor=…` from `_links.next` and pass it back as `--cursor`.

```sh
# Lifecycle
atlas confluence blog-posts list --space-id 654321 --limit 25
atlas confluence blog-posts get 99999
atlas confluence blog-posts get 99999 --include-labels --include-likes --body-format atlas_doc_format

# Content properties
atlas confluence blog-posts list-properties 99999 --sort key
atlas confluence blog-posts create-property 99999 --key reviewed --value true
atlas confluence blog-posts update-property 99999 --property-id prop-1 --key reviewed --value false --version-number 2

# Attachments + classification
atlas confluence blog-posts attachments 99999 --media-type image/png --sort -created-date
atlas confluence blog-posts attachments 99999 --status current,archived
atlas confluence blog-posts get-classification-level 99999
atlas confluence blog-posts update-classification-level 99999 --level-id cl-restricted
atlas confluence blog-posts reset-classification-level 99999

# Sub-collections
atlas confluence blog-posts custom-content 99999 --type ai.atlassian.collection
atlas confluence blog-posts footer-comments 99999 --sort -created-date
atlas confluence blog-posts inline-comments 99999 --resolution-status open
atlas confluence blog-posts labels 99999 --prefix global

# Likes + operations
atlas confluence blog-posts likes-count 99999
atlas confluence blog-posts likes-users 99999 --limit 50
atlas confluence blog-posts operations 99999

# Versions
atlas confluence blog-posts versions 99999 --sort -modified-date
atlas confluence blog-posts version 99999 --version-number 2
```

## `comments`

| Action            | Positional    | Required flags                                          | Optional flags                                  |
| ----------------- | ------------- | ------------------------------------------------------- | ----------------------------------------------- |
| `list`            | —             | one of `--page-id` or `--blog-post-id`                  | `--limit`, `--cursor`, `--comment-type`         |
| `get`             | `<commentId>` | —                                                       | `--comment-type`                                |
| `create`          | —             | one of `--page-id` or `--blog-post-id`, `--body`        | `--comment-type`                                |
| `update`          | `<commentId>` | `--body`, `--version-number`                            | `--comment-type`, `--resolved`, `--no-resolved` |
| `delete`          | `<commentId>` | —                                                       | `--comment-type`                                |
| `list-properties` | `<commentId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`        |
| `create-property` | `<commentId>` | `--key`, `--value`                                      | —                                               |
| `get-property`    | `<commentId>` | `--property-id`                                         | —                                               |
| `update-property` | `<commentId>` | `--property-id`, `--key`, `--value`, `--version-number` | —                                               |
| `delete-property` | `<commentId>` | `--property-id`                                         | —                                               |

- `--comment-type` accepts `footer` (top-level) or `inline`. Default is `footer`.
- `update` issues `PUT /footer-comments/{id}` (footer) or `PUT /inline-comments/{id}` (inline). `--body` is sent with `representation: "storage"`. `--version-number` must be exactly one greater than the comment's current version (Confluence enforces optimistic concurrency; mismatches return 409). For inline comments, `--resolved` marks the thread resolved (`resolved: true`) and `--no-resolved` reopens it (`resolved: false`); omitting both flags leaves the server-side resolution state untouched.
- The `*-property` actions hit `/comments/{comment-id}/properties[/{property-id}]` and work for both footer and inline comments — Confluence resolves the comment by id regardless of type, so no `--comment-type` flag is needed.
- `--sort` on `list-properties` accepts `key` or `-key`.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409).

## `attachments`

| Action            | Positional       | Required flags                                          | Optional flags                                                            |
| ----------------- | ---------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `list`            | —                | `--page-id`                                             | `--limit`, `--cursor`                                                     |
| `list-all`        | —                | —                                                       | `--status`, `--media-type`, `--filename`, `--sort`, `--limit`, `--cursor` |
| `get`             | `<attachmentId>` | —                                                       | `--version-number`, `--include-*` (see notes)                             |
| `delete`          | `<attachmentId>` | —                                                       | `--purge`                                                                 |
| `list-properties` | `<attachmentId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`                                  |
| `create-property` | `<attachmentId>` | `--key`, `--value`                                      | —                                                                         |
| `get-property`    | `<attachmentId>` | `--property-id`                                         | —                                                                         |
| `update-property` | `<attachmentId>` | `--property-id`, `--key`, `--value`, `--version-number` | —                                                                         |
| `delete-property` | `<attachmentId>` | `--property-id`                                         | —                                                                         |
| `versions`        | `<attachmentId>` | —                                                       | `--sort`, `--cursor`, `--limit`                                           |
| `get-version`     | `<attachmentId>` | `--version-number`                                      | —                                                                         |
| `footer-comments` | `<attachmentId>` | —                                                       | `--body-format`, `--sort`, `--cursor`, `--limit`, `--version-number`      |
| `labels`          | `<attachmentId>` | —                                                       | `--prefix`, `--sort`, `--cursor`, `--limit`                               |
| `operations`      | `<attachmentId>` | —                                                       | —                                                                         |
| `thumbnail`       | `<attachmentId>` | —                                                       | `--width`, `--height`, `--version-number`                                 |

- Upload is not exposed via the CLI; use the SDK's `attachments.upload()` and pass the file content as a `Blob`. Node ESM callers can wrap a `Buffer`, `Uint8Array`, or `fs.ReadStream`-derived buffer in a `Blob` first; raw `ReadableStream` is not accepted by the current signature.
- `list-all` hits the tenant-wide `GET /attachments`. `--status` accepts a single value or comma-separated list of `current`, `archived`, `trashed`.
- `--sort` enums per action:
  - `list-all`: `created-date`, `-created-date`, `modified-date`, `-modified-date`
  - `versions`: `modified-date`, `-modified-date`
  - `footer-comments`: `created-date`, `-created-date`, `modified-date`, `-modified-date`
  - `labels`: `created-date`, `-created-date`, `id`, `-id`, `name`, `-name`
  - `list-properties`: `key`, `-key`
- `get` accepts `--version-number` to pin the response to a specific version, plus these `--include-*` boolean flags that inline sub-resources on the response:
  - `--include-labels`
  - `--include-properties`
  - `--include-operations`
  - `--include-versions`
  - `--include-version` (on by default server-side; pass explicitly only to override)
  - `--include-collaborators`
- `delete` accepts `--purge` to permanently delete a previously-trashed attachment (default soft-delete moves it to trash).
- `--prefix` (labels) accepts `my`, `team`, `global`, or `system`.
- `--body-format` (footer-comments) accepts `storage` or `atlas_doc_format`.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `comments create-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409). On `get-version` it identifies the attachment version to fetch; on `footer-comments` it pins the listing to a specific attachment version; on `thumbnail` it pins the rendered thumbnail to a specific attachment version.
- `thumbnail` downloads the binary thumbnail; the CLI reports `{ "downloaded": true, "byteLength": N }` rather than echoing bytes. Use the SDK's `attachments.downloadThumbnail()` to get the raw `ArrayBuffer` for writing to disk.

## `labels`

| Action               | Positional     | Required flags | Optional flags                                                 |
| -------------------- | -------------- | -------------- | -------------------------------------------------------------- |
| `list`               | —              | `--page-id`    | `--limit`, `--cursor`                                          |
| `list-all`           | —              | —              | `--label-id`, `--prefix`, `--sort`, `--limit`, `--cursor`      |
| `attachments`        | `<labelId>`    | —              | `--sort`, `--limit`, `--cursor`                                |
| `blog-posts`         | `<labelId>`    | —              | `--space-id`, `--body-format`, `--sort`, `--limit`, `--cursor` |
| `pages`              | `<labelId>`    | —              | `--space-id`, `--body-format`, `--sort`, `--limit`, `--cursor` |
| `list-for-space`     | `<spaceId>`    | —              | `--prefix`, `--sort`, `--limit`, `--cursor`                    |
| `list-for-blog-post` | `<blogPostId>` | —              | `--prefix`, `--sort`, `--limit`, `--cursor`                    |

- `list-all` hits the tenant-wide `GET /labels`. `--label-id` and `--prefix` accept comma-separated values (the wire format expects a single CSV string).
- `attachments`, `blog-posts`, `pages` walk the inverse relations: given a label id, return the content tagged with it. They share `--limit` / `--cursor` cursor pagination.
- `list-for-space` returns labels applied to a **space entity** (`GET /spaces/{id}/labels`). `list-for-blog-post` returns labels on a **blog post** (`GET /blogposts/{id}/labels`). Both accept `--prefix` (`my`, `team`, `global`, `system`) and `--sort` from `LabelSortOrder`.
- `--sort` enums per action:
  - `list-all`, `list-for-space`, `list-for-blog-post`: `created-date`, `-created-date`, `id`, `-id`, `name`, `-name`
  - `attachments`: `created-date`, `-created-date`, `modified-date`, `-modified-date`
  - `blog-posts`: `id`, `-id`, `created-date`, `-created-date`, `modified-date`, `-modified-date`
  - `pages`: same as `blog-posts` plus `title` / `-title`
- `--body-format` (pages / blog-posts) accepts `storage` or `atlas_doc_format`.
- `--space-id` (pages / blog-posts) accepts a comma-separated list to filter results to specific spaces.

```sh
# Inverse relations: given a label, list content with that label
atlas confluence labels list-all --prefix global --limit 50
atlas confluence labels attachments 12345 --sort -created-date
atlas confluence labels blog-posts 12345 --space-id 100,200 --limit 25
atlas confluence labels pages 12345 --sort -modified-date

# Forward relations: given a resource, list labels on it (B1018)
atlas confluence labels list-for-space 654321 --prefix global --sort -name
atlas confluence labels list-for-blog-post 99999 --prefix team --limit 25
```

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

## `custom-content`

First-class v2 content for app-defined types (AI collections, embedded items, third-party app payloads). The CLI exposes the full surface: lifecycle (`list` / `get` / `create` / `update` / `delete`) and every per-item sub-resource — content properties (`list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`), version history (`versions` / `version`), `attachments`, `children`, `footer-comments`, `labels`, and permitted `operations`. Pagination is cursor-based across all list endpoints.

| Action            | Positional          | Required flags                                          | Optional flags                                                                                            |
| ----------------- | ------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `list`            | —                   | —                                                       | `--type`, `--space-id`, `--page-id`, `--blog-post-id`, `--status`, `--body-format`, `--cursor`, `--limit` |
| `get`             | `<customContentId>` | —                                                       | `--body-format`, `--version-number`                                                                       |
| `create`          | —                   | `--type`                                                | `--space-id`, `--page-id`, `--blog-post-id`, `--title`, `--body`                                          |
| `update`          | `<customContentId>` | `--type`, `--version-number`                            | `--title`, `--body`                                                                                       |
| `delete`          | `<customContentId>` | —                                                       | —                                                                                                         |
| `list-properties` | `<customContentId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`                                                                  |
| `create-property` | `<customContentId>` | `--key`, `--value`                                      | —                                                                                                         |
| `get-property`    | `<customContentId>` | `--property-id`                                         | —                                                                                                         |
| `update-property` | `<customContentId>` | `--property-id`, `--key`, `--value`, `--version-number` | —                                                                                                         |
| `delete-property` | `<customContentId>` | `--property-id`                                         | —                                                                                                         |
| `versions`        | `<customContentId>` | —                                                       | `--body-format`, `--sort`, `--cursor`, `--limit`                                                          |
| `version`         | `<customContentId>` | `--version-number`                                      | —                                                                                                         |
| `attachments`     | `<customContentId>` | —                                                       | `--sort`, `--status`, `--cursor`, `--media-type`, `--filename`, `--limit`                                 |
| `children`        | `<customContentId>` | —                                                       | `--sort`, `--cursor`, `--limit`                                                                           |
| `footer-comments` | `<customContentId>` | —                                                       | `--body-format`, `--sort`, `--cursor`, `--limit`                                                          |
| `labels`          | `<customContentId>` | —                                                       | `--prefix`, `--sort`, `--cursor`, `--limit`                                                               |
| `operations`      | `<customContentId>` | —                                                       | —                                                                                                         |

- `--type` is a free-form string identifying the custom-content namespace (e.g. `ai.atlassian.collection`). Confluence resolves the namespace from this value; mismatches against the parent space's installed apps return 400.
- `--body-format` on `list` / `get` / `versions` accepts `raw`, `storage`, or `atlas_doc_format` (`CustomContentBodyRepresentation`). The `get` endpoint additionally accepts the broader `CustomContentBodyRepresentationSingle` server-side (`view`, `export_view`, `anonymous_export_view`), but the CLI narrows to the three values shared by `list` and `versions` to keep the flag vocabulary consistent.
- `update --version-number` must be a positive integer exactly one greater than the item's current version — Confluence enforces optimistic concurrency and rejects mismatches with a 409. `--type` must also be re-sent on update (the server validates the type matches the stored value).
- `update` always sends `status: "current"`. The CLI does not expose `draft` status writes — use the SDK directly (`client.customContent.update(id, { …, status: 'draft' })`) if you need to manage drafts.
- `create` / `update` `--body` is wrapped in `{ representation: 'storage', value: … }`. SDK callers can opt into `atlas_doc_format` via the resource method directly.
- Properties: `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property` / `databases create-property`). `--sort` on `list-properties` accepts `key` or `-key`. `update-property --version-number` follows the same optimistic-concurrency rule as `update` above.
- `versions --sort` is the narrow `VersionSortOrder`: only `modified-date` / `-modified-date`. `version --version-number` fetches a single past version by number and returns the body + audit metadata.
- `attachments --sort` accepts `AttachmentSortOrder`: `created-date`, `-created-date`, `modified-date`, `-modified-date`. `--status` is a comma-separated subset of `current,archived,trashed` (server default is `current,archived`). `--media-type` filters by MIME, `--filename` by exact name.
- `children` returns the lightweight `ChildCustomContent` shape (`id`, `status`, `title`, `type`, `spaceId`); `status` is restricted to `current` or `archived`. `--sort` is intentionally free-form — the v2 OpenAPI spec leaves this enum open and the CLI does not narrow it client-side.
- `footer-comments --body-format` accepts `storage` or `atlas_doc_format`. `--sort` is `CommentSortOrder`: `created-date`, `-created-date`, `modified-date`, `-modified-date`.
- `labels --prefix` accepts `my`, `team`, `global`, `system`. `--sort` is `LabelSortOrder`: `created-date`, `-created-date`, `id`, `-id`, `name`, `-name`.
- `operations` returns `{ operations: [{ operation, targetType }] }` — useful for gating UI actions and permission-aware automation that wants to fail fast before issuing a 403-bound write.
- All list endpoints are cursor-paginated — extract `cursor=…` from `_links.next` and pass it back as `--cursor`.

```sh
# Lifecycle
atlas confluence custom-content list --type ai.atlassian.collection --space-id 654321 --limit 25
atlas confluence custom-content get cc-1 --body-format storage
atlas confluence custom-content create --type ai.atlassian.collection --space-id 654321 --title "AI Notes" --body "<p>hi</p>"
atlas confluence custom-content update cc-1 --type ai.atlassian.collection --version-number 2 --title "Renamed"
atlas confluence custom-content delete cc-1

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

Surfaces the Confluence v2 data-policies API. Both endpoints are **app-only**
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
  dropped; an effectively-empty value is omitted from the query rather than
  sent as a blank filter. The server caps each list at 250 entries.
- `--sort` accepts `id`, `-id`, `key`, `-key`, `name`, `-name` (prefix `-`
  flips direction). Unknown values are rejected client-side.

```sh
# Workspace-wide flag indicating whether any content is blocked
atlas confluence data-policies get-metadata

# First page of spaces with data policies (server default 25 per page)
atlas confluence data-policies list-spaces

# Filter to specific space keys, sort by descending key, larger page
atlas confluence data-policies list-spaces --keys ENG,OPS --sort -key --limit 50

# Filter by IDs
atlas confluence data-policies list-spaces --ids 100,200,300
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

## `space-roles`

Manages Confluence space roles (`/wiki/api/v2/space-roles`). Available on tenants with Role-Based Access Control. The list endpoint returns the standard `{ results, _links }` cursor-paginated wrapper; `create` returns the new role; `update` and `delete` return 202 with an async `taskId` callers can poll for the underlying permission-rewrite job.

| Action   | Positional | Required flags                                   | Optional flags                                                                           |
| -------- | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `list`   | —          | —                                                | `--space-id`, `--role-type`, `--principal-id`, `--principal-type`, `--limit`, `--cursor` |
| `get`    | `<roleId>` | —                                                | —                                                                                        |
| `create` | —          | `--name`, `--description`, `--space-permissions` | —                                                                                        |
| `update` | `<roleId>` | `--name`, `--description`, `--space-permissions` | `--anonymous-reassignment-role-id`, `--guest-reassignment-role-id`                       |
| `delete` | `<roleId>` | —                                                | —                                                                                        |

- `--role-type` accepts `SYSTEM` or `CUSTOM`. `SYSTEM` roles are platform-defined and not user-editable; `CUSTOM` are tenant-created.
- `--principal-type` accepts `USER`, `GROUP`, or `ACCESS_CLASS` and restricts the listing to roles available for the named principal class.
- `--space-permissions` is a comma-separated list of space-permission ids (e.g. `read/space,write/space`). Retrieve valid ids from `atlas confluence space-permissions list`. The CLI trims whitespace per entry and rejects an all-empty payload before issuing the request.
- `update` and `delete` return `{ "taskId": "..." }` (HTTP 202). The task tears down or rewrites per-space permission assignments asynchronously — poll the task to confirm completion before relying on the new permission state.
- `--anonymous-reassignment-role-id` / `--guest-reassignment-role-id` on `update` migrate anonymous-access / guest assignments away from the role being modified. Leave unset to keep them in place.

```sh
# List custom roles (server default 25 per page)
atlas confluence space-roles list --role-type=CUSTOM

# Filter to roles available for a specific principal
atlas confluence space-roles list --principal-id acc-123 --principal-type=USER

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
identified by a server-assigned string ID. The CLI exposes the three v2
`/tasks` endpoints — list with rich filtering, fetch a single task, and toggle
its `status` between `incomplete` and `complete`.

| Action   | Positional | Required flags | Optional flags                                                                                                                                                                                                                                                   |
| -------- | ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`   | —          | —              | `--body-format`, `--include-blank-tasks`, `--status`, `--task-id`, `--space-id`, `--page-id`, `--blog-post-id`, `--created-by`, `--assigned-to`, `--completed-by`, `--created-at-from`, `--created-at-to`, `--due-at-from`, `--due-at-to`, `--limit`, `--cursor` |
| `get`    | `<taskId>` | —              | `--body-format`                                                                                                                                                                                                                                                  |
| `update` | `<taskId>` | `--status`     | —                                                                                                                                                                                                                                                                |

- `--status` accepts `incomplete` or `complete` (the only two task states v2 surfaces). On `update` it's required and toggles the task. On `list` it filters results.
- `--task-id` filters to a single numeric platform task ID (distinct from the string task ID positional argument used by `get` / `update`).
- `--include-blank-tasks` includes tasks whose `body` is empty (e.g. checkboxes without inline text). Omit to hide them.
- `--body-format` accepts `storage` or `atlas_doc_format` and controls the representation of the task body when present.
- The date-range filters (`--created-at-from`, `--created-at-to`, `--due-at-from`, `--due-at-to`) accept ISO-8601 timestamps (e.g. `2026-01-01T00:00:00Z`); ranges are inclusive on both ends.
- `--space-id`, `--page-id`, `--blog-post-id` scope the listing to tasks within that container; combine to narrow further. The user-attribution filters (`--created-by`, `--assigned-to`, `--completed-by`) accept Atlassian account IDs.
- Pagination is cursor-based — extract `cursor=…` from `_links.next` and pass it as `--cursor` on the follow-up call.
- `update` only changes `status`; the task body, assignee, due date, and container are immutable through this endpoint.

```sh
# All incomplete tasks across the site (first page)
atlas confluence tasks list --status incomplete --limit 25

# Tasks assigned to a particular user on a page
atlas confluence tasks list --page-id 12345 --assigned-to acc-123

# Tasks completed in a date window
atlas confluence tasks list --status complete --completed-by acc-123 \
  --created-at-from 2026-01-01T00:00:00Z --created-at-to 2026-02-01T00:00:00Z

# Read a single task (with rendered body)
atlas confluence tasks get task-1 --body-format storage

# Mark a task complete
atlas confluence tasks update task-1 --status complete

# Reopen a task
atlas confluence tasks update task-1 --status incomplete
```

## `users`

Single-user access controls. Bulk account-ID resolution lives under the
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

Databases are first-class v2 content. The CLI exposes the full surface: lifecycle (`create`/`get`/`delete`), hierarchy navigation (`ancestors`/`descendants`/`direct-children`/`operations`), classification level (`get-`/`update-`/`reset-classification-level`), and content properties (`list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`). Pagination is cursor-based for `descendants`, `direct-children`, and `list-properties`; `ancestors` returns a bare `{ results }` and is re-called with the highest ancestor's ID instead of a cursor.

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
| `update-property`             | `<databaseId>` | `--property-id`, `--key`, `--value`, `--version-number` | —                                                                                                      |
| `delete-property`             | `<databaseId>` | `--property-id`                                         | —                                                                                                      |

- `--private` on `create` creates a database visible only to the creator.
- `--depth` on `descendants` accepts 1–10 (server-validated; default 2).
- `--sort` on `direct-children` accepts the `ContentSortOrder` vocabulary: `created-date`, `id`, `modified-date`, `child-position`, `title`, each optionally prefixed with `-` for descending.
- `--sort` on `list-properties` accepts `key` or `-key`.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409).
- `update-classification-level` always sends `status: "current"` (the only legal server value); the CLI hard-codes it so callers only need `--level-id`.
- `reset-classification-level` sends `{ status: "current" }` and falls back to the space default classification.
- `ancestors` returns `{ results }` without `_links.next`; iterate by calling again with the highest ancestor's ID as the new `<databaseId>`.
- `delete` trashes the database (recoverable from the space trash); there is no purge flag on this endpoint.

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
atlas confluence databases direct-children db-1 --sort -modified-date

# Classification level lifecycle
atlas confluence databases get-classification-level db-1
atlas confluence databases update-classification-level db-1 --level-id cl-restricted
atlas confluence databases reset-classification-level db-1

# Content properties
atlas confluence databases list-properties db-1
atlas confluence databases create-property db-1 --key feature-flags --value '{"beta":true}'
atlas confluence databases get-property db-1 --property-id prop-1
atlas confluence databases update-property db-1 --property-id prop-1 --key feature-flags --value '{"beta":false}' --version-number 4
atlas confluence databases delete-property db-1 --property-id prop-1
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
| `update-property` | `<embedId>` | `--property-id`, `--key`, `--value`, `--version-number` | —                                                                                                      |
| `delete-property` | `<embedId>` | `--property-id`                                         | —                                                                                                      |

- `--embed-url` on `create` is optional; omit it to create an embed without an attached URL (the server allows the URL to be set later via update flows on the broader content tree).
- `--depth` on `descendants` accepts positive integers (server-validated; default 2).
- `--sort` on `direct-children` accepts the `ContentSortOrder` vocabulary: `created-date`, `id`, `modified-date`, `child-position`, `title`, each optionally prefixed with `-` for descending.
- `--sort` on `list-properties` accepts `key` or `-key`.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property`, `databases create-property`, and `folders create-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409).
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
atlas confluence embeds delete-property embed-1 --property-id prop-1
```

## `folders`

Folders are first-class v2 content for grouping pages, whiteboards, databases, and other folders inside a space. The CLI exposes the full surface: lifecycle (`create`/`get`/`delete`), hierarchy navigation (`ancestors`/`descendants`/`direct-children`/`operations`), and content properties (`list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`). Pagination is cursor-based for `descendants`, `direct-children`, and `list-properties`; `ancestors` returns a bare `{ results }` and is re-called with the highest ancestor's ID instead of a cursor.

| Action            | Positional   | Required flags                                          | Optional flags                                                                                         |
| ----------------- | ------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `create`          | —            | `--space-id`                                            | `--title`, `--parent-id`                                                                               |
| `get`             | `<folderId>` | —                                                       | `--include-collaborators`, `--include-direct-children`, `--include-operations`, `--include-properties` |
| `delete`          | `<folderId>` | —                                                       | —                                                                                                      |
| `ancestors`       | `<folderId>` | —                                                       | `--limit`                                                                                              |
| `descendants`     | `<folderId>` | —                                                       | `--limit`, `--depth`, `--cursor`                                                                       |
| `direct-children` | `<folderId>` | —                                                       | `--limit`, `--cursor`, `--sort`                                                                        |
| `operations`      | `<folderId>` | —                                                       | —                                                                                                      |
| `list-properties` | `<folderId>` | —                                                       | `--key`, `--sort`, `--cursor`, `--limit`                                                               |
| `create-property` | `<folderId>` | `--key`, `--value`                                      | —                                                                                                      |
| `get-property`    | `<folderId>` | `--property-id`                                         | —                                                                                                      |
| `update-property` | `<folderId>` | `--property-id`, `--key`, `--value`, `--version-number` | —                                                                                                      |
| `delete-property` | `<folderId>` | `--property-id`                                         | —                                                                                                      |

- `--depth` on `descendants` accepts 1–10 (server-validated; default 2).
- `--sort` on `direct-children` accepts the `ContentSortOrder` vocabulary: `created-date`, `id`, `modified-date`, `child-position`, `title`, each optionally prefixed with `-` for descending.
- `--sort` on `list-properties` accepts `key` or `-key`.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property` and `databases create-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409).
- `ancestors` returns `{ results }` without `_links.next`; iterate by calling again with the highest ancestor's ID as the new `<folderId>`.
- Folders have no classification-level endpoints — unlike `databases`, the `/folders` surface does not expose `get`/`update`/`reset-classification-level`.
- `delete` removes the folder (recoverable from the space trash via standard Confluence recovery flow); there is no purge flag on this endpoint.

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
atlas confluence folders direct-children folder-1 --sort -modified-date

# Permitted operations
atlas confluence folders operations folder-1

# Content properties
atlas confluence folders list-properties folder-1
atlas confluence folders create-property folder-1 --key feature-flags --value '{"beta":true}'
atlas confluence folders get-property folder-1 --property-id prop-1
atlas confluence folders update-property folder-1 --property-id prop-1 --key feature-flags --value '{"beta":false}' --version-number 4
atlas confluence folders delete-property folder-1 --property-id prop-1
```

## `footer-comments`

Top-level (page / blog-post) footer comments exposed through the tenant-wide `/wiki/api/v2/footer-comments` surface. The container-scoped CRUD (`list` by page, `create`, `delete`) lives on the `comments` resource above; this resource covers tenant-wide listing, single-comment fetch with inlinable sub-resources, in-place `update`, and the per-comment navigation collections (`children`, `likes`, `operations`, `versions`).

| Action        | Positional    | Required flags               | Optional flags                                                                                                                                    |
| ------------- | ------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`        | —             | —                            | `--body-format`, `--sort`, `--cursor`, `--limit`                                                                                                  |
| `get`         | `<commentId>` | —                            | `--body-format`, `--version-number`, `--include-properties`, `--include-operations`, `--include-likes`, `--include-versions`, `--include-version` |
| `update`      | `<commentId>` | `--body`, `--version-number` | —                                                                                                                                                 |
| `children`    | `<commentId>` | —                            | `--body-format`, `--sort`, `--cursor`, `--limit`                                                                                                  |
| `likes-count` | `<commentId>` | —                            | —                                                                                                                                                 |
| `likes-users` | `<commentId>` | —                            | `--cursor`, `--limit`                                                                                                                             |
| `operations`  | `<commentId>` | —                            | —                                                                                                                                                 |
| `versions`    | `<commentId>` | —                            | `--body-format`, `--sort`, `--cursor`, `--limit`                                                                                                  |
| `version`     | `<commentId>` | `--version-number`           | —                                                                                                                                                 |

- `--body-format` accepts `storage` or `atlas_doc_format` (the v2 `PrimaryBodyRepresentation` enum).
- `--sort` on `list` and `children` accepts the `CommentSortOrder` vocabulary: `created-date`, `-created-date`, `modified-date`, `-modified-date`.
- `--sort` on `versions` is the narrower `VersionSortOrder`: only `modified-date` / `-modified-date`.
- `--include-*` flags on `get` ask the server to inline the corresponding sub-resource (properties, operations, likes, versions, or a single version) so callers can fetch the comment plus context in one round-trip.
- `update` issues `PUT /footer-comments/{id}` — Confluence enforces optimistic concurrency: `--version-number` must be exactly one greater than the comment's current version (mismatches return 409). `--body` is sent with `representation: "storage"`; SDK callers can opt into `atlas_doc_format` via the underlying `comments.updateFooter()` method.
- `likes-count` returns the bare `{ count }` envelope and is not paginated.
- `version` fetches a single past version by number; the response includes the body and audit metadata.
- All list endpoints are cursor-paginated — extract `cursor=…` from `_links.next` and pass it back as `--cursor`.

```sh
# Tenant-wide listing, newest first
atlas confluence footer-comments list --sort -created-date --limit 25

# Read a single comment with everything inlined
atlas confluence footer-comments get 77777 --include-likes --include-versions

# Update a footer comment (storage body)
atlas confluence footer-comments update 77777 --body "Updated reply" --version-number 2

# Walk child replies
atlas confluence footer-comments children 77777 --sort created-date

# Like counts and likers
atlas confluence footer-comments likes-count 77777
atlas confluence footer-comments likes-users 77777 --limit 50

# Permitted operations
atlas confluence footer-comments operations 77777

# Version history
atlas confluence footer-comments versions 77777 --sort -modified-date
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
| `versions`    | `<commentId>` | —                  | `--sort`, `--cursor`, `--limit`                  |
| `version`     | `<commentId>` | `--version-number` | —                                                |

- `--body-format` accepts `storage` or `atlas_doc_format` (the v2 `PrimaryBodyRepresentation` enum).
- `--sort` on `list` and `children` accepts the `CommentSortOrder` vocabulary: `created-date`, `-created-date`, `modified-date`, `-modified-date`.
- `--sort` on `versions` is the narrower `VersionSortOrder`: only `modified-date` / `-modified-date`.
- `likes-count` returns the bare `{ count }` envelope and is not paginated.
- `version` fetches a single past version by number; the response includes the body and audit metadata.
- All list endpoints are cursor-paginated — extract `cursor=…` from `_links.next` and pass it back as `--cursor`.

```sh
# Tenant-wide listing, newest first
atlas confluence inline-comments list --sort -created-date --limit 25

# Walk child replies on an inline thread
atlas confluence inline-comments children 77777 --sort created-date

# Like counts and likers
atlas confluence inline-comments likes-count 77777
atlas confluence inline-comments likes-users 77777 --limit 50

# Permitted operations
atlas confluence inline-comments operations 77777

# Version history
atlas confluence inline-comments versions 77777 --sort -modified-date
atlas confluence inline-comments version 77777 --version-number 3
```

## `whiteboards`

Whiteboards are first-class v2 content (drawings / Confluence whiteboards UI). The CLI exposes the full surface: lifecycle (`create`/`get`/`delete`), hierarchy navigation (`ancestors`/`descendants`/`direct-children`/`operations`), classification level (`get-`/`update-`/`reset-classification-level`), and content properties (`list-properties`, `create-property`, `get-property`, `update-property`, `delete-property`). Shape is identical to `databases`: pagination is cursor-based for `descendants`, `direct-children`, and `list-properties`; `ancestors` returns a bare `{ results }` and is re-called with the highest ancestor's ID instead of a cursor.

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
| `update-property`             | `<whiteboardId>` | `--property-id`, `--key`, `--value`, `--version-number` | —                                                                                                      |
| `delete-property`             | `<whiteboardId>` | `--property-id`                                         | —                                                                                                      |

- `--private` on `create` creates a whiteboard visible only to the creator.
- `--template-key` and `--locale` on `create` select an initial template and locale; both are optional and forwarded as body fields. **Both are closed enums** validated client-side against the Confluence v2 OpenAPI spec (53 template keys, 21 locales — see `WhiteboardTemplateKey` / `WhiteboardLocale` in `src/confluence/types.ts`). Invalid values are rejected with the full allowlist before any HTTP request is sent.
- `get` returns the `WhiteboardSingle` shape: `id`, `type`, `status`, `title`, `parentId`, `parentType`, `position`, `authorId`, `ownerId`, `createdAt`, `spaceId`, `version` (`{ createdAt, message, number, minorEdit, authorId }`), and `_links` (`webui`, `editui`).
- `--depth` on `descendants` accepts positive integers (server-validated; default 2).
- `--sort` on `direct-children` accepts the `ContentSortOrder` vocabulary: `created-date`, `id`, `modified-date`, `child-position`, `title`, each optionally prefixed with `-` for descending.
- `--sort` on `list-properties` accepts `key` or `-key`.
- `--value` on `create-property` / `update-property` is parsed as JSON when possible, falling back to the raw string (same semantics as `app upsert-property` and `databases create-property`).
- `--version-number` on `update-property` must be a positive integer one greater than the property's current version (Confluence enforces optimistic concurrency; mismatches return 409).
- `update-classification-level` always sends `status: "current"` (the only legal server value); the CLI hard-codes it so callers only need `--level-id`.
- `reset-classification-level` sends `{ status: "current" }` and falls back to the space default classification.
- `ancestors` returns `{ results }` without `_links.next`; iterate by calling again with the highest ancestor's ID as the new `<whiteboardId>`.
- `delete` trashes the whiteboard (recoverable from the space trash); there is no purge flag on this endpoint.

```sh
# Create a whiteboard in a space
atlas confluence whiteboards create --space-id 654321 --title "Roadmap"

# Create a private whiteboard with a template
atlas confluence whiteboards create --space-id 654321 --title "Secret" --template-key kanban-board --locale en-US --private

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
atlas confluence whiteboards delete-property wb-1 --property-id prop-1
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
