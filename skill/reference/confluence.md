# Confluence reference — `atlas confluence`

Confluence Cloud REST API v2 surface. Load this file when you need a flag or action the canonical examples in `SKILL.md` don't cover.

## Resource × action matrix

| Resource      | Actions                                     |
| ------------- | ------------------------------------------- |
| `pages`       | `list`, `get`, `create`, `update`, `delete` |
| `spaces`      | `list`, `get`                               |
| `blog-posts`  | `list`, `get`, `create`, `update`, `delete` |
| `comments`    | `list`, `get`, `create`, `delete`           |
| `attachments` | `list`, `get`, `delete`                     |
| `labels`      | `list`                                      |

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
