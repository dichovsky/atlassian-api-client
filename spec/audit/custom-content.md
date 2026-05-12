# Audit — Custom Content

Auto-generated. Do not edit by hand. Regenerate with `npm run audit:spec`.

Target backlog item(s): **B030, B041**

Spec tag: `Custom Content` | Spec snapshot: `spec/confluence-v2.openapi.json`

## Operations matrix

**Implemented:** 5 / 8

### Matched

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/custom-content` | `getCustomContentByType` | Custom Content | `custom-content` (src/confluence/resources/custom-content.ts) |
| POST | `/custom-content` | `createCustomContent` | Custom Content | `custom-content` (src/confluence/resources/custom-content.ts) |
| DELETE | `/custom-content/{id}` | `deleteCustomContent` | Custom Content | `custom-content` (src/confluence/resources/custom-content.ts) |
| GET | `/custom-content/{id}` | `getCustomContentById` | Custom Content | `custom-content` (src/confluence/resources/custom-content.ts) |
| PUT | `/custom-content/{id}` | `updateCustomContent` | Custom Content | `custom-content` (src/confluence/resources/custom-content.ts) |

### Missing in code

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/blogposts/{id}/custom-content` | `getCustomContentByTypeInBlogPost` | Custom Content | — |
| GET | `/pages/{id}/custom-content` | `getCustomContentByTypeInPage` | Custom Content | — |
| GET | `/spaces/{id}/custom-content` | `getCustomContentByTypeInSpace` | Custom Content | — |

### Deprecated in spec

_(none)_
