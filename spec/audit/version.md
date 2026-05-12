# Audit — Version

Auto-generated. Do not edit by hand. Regenerate with `npm run audit:spec`.

Target backlog item(s): **B033, B043**

Spec tag: `Version` | Spec snapshot: `spec/confluence-v2.openapi.json`

## Operations matrix

**Implemented:** 4 / 12

### Matched

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/blogposts/{id}/versions` | `getBlogPostVersions` | Version | `versions` (src/confluence/resources/versions.ts) |
| GET | `/blogposts/{blogpost-id}/versions/{version-number}` | `getBlogPostVersionDetails` | Version | `versions` (src/confluence/resources/versions.ts) |
| GET | `/pages/{id}/versions` | `getPageVersions` | Version | `versions` (src/confluence/resources/versions.ts) |
| GET | `/pages/{page-id}/versions/{version-number}` | `getPageVersionDetails` | Version | `versions` (src/confluence/resources/versions.ts) |

### Missing in code

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/attachments/{id}/versions` | `getAttachmentVersions` | Version | — |
| GET | `/attachments/{attachment-id}/versions/{version-number}` | `getAttachmentVersionDetails` | Version | — |
| GET | `/custom-content/{custom-content-id}/versions` | `getCustomContentVersions` | Version | — |
| GET | `/custom-content/{custom-content-id}/versions/{version-number}` | `getCustomContentVersionDetails` | Version | — |
| GET | `/footer-comments/{id}/versions` | `getFooterCommentVersions` | Version | — |
| GET | `/footer-comments/{id}/versions/{version-number}` | `getFooterCommentVersionDetails` | Version | — |
| GET | `/inline-comments/{id}/versions` | `getInlineCommentVersions` | Version | — |
| GET | `/inline-comments/{id}/versions/{version-number}` | `getInlineCommentVersionDetails` | Version | — |

### Deprecated in spec

_(none)_
