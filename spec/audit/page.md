# Audit — Page

Auto-generated. Do not edit by hand. Regenerate with `npm run audit:spec`.

Target backlog item(s): **B024, B035**

Spec tag: `Page` | Spec snapshot: `spec/confluence-v2.openapi.json`

## Operations matrix

**Implemented:** 5 / 8

### Matched

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/pages` | `getPages` | Page | `pages` (src/confluence/resources/pages.ts) |
| POST | `/pages` | `createPage` | Page | `pages` (src/confluence/resources/pages.ts) |
| DELETE | `/pages/{id}` | `deletePage` | Page | `pages` (src/confluence/resources/pages.ts) |
| GET | `/pages/{id}` | `getPageById` | Page | `pages` (src/confluence/resources/pages.ts) |
| PUT | `/pages/{id}` | `updatePage` | Page | `pages` (src/confluence/resources/pages.ts) |

### Missing in code

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/labels/{id}/pages` | `getLabelPages` | Page | — |
| PUT | `/pages/{id}/title` | `updatePageTitle` | Page | — |
| GET | `/spaces/{id}/pages` | `getPagesInSpace` | Page | — |

### Deprecated in spec

_(none)_
