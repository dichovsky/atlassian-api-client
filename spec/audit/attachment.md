# Audit — Attachment

Auto-generated. Do not edit by hand. Regenerate with `npm run audit:spec`.

Target backlog item(s): **B028, B039**

Spec tag: `Attachment` | Spec snapshot: `spec/confluence-v2.openapi.json`

## Operations matrix

**Implemented:** 3 / 8

### Matched

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| DELETE | `/attachments/{id}` | `deleteAttachment` | Attachment | `attachments` (src/confluence/resources/attachments.ts) |
| GET | `/attachments/{id}` | `getAttachmentById` | Attachment | `attachments` (src/confluence/resources/attachments.ts) |
| GET | `/pages/{id}/attachments` | `getPageAttachments` | Attachment | `attachments` (src/confluence/resources/attachments.ts) |

### Missing in code

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/attachments` | `getAttachments` | Attachment | — |
| GET | `/attachments/{id}/thumbnail/download` | `getAttachmentThumbnailById` | Attachment | — |
| GET | `/blogposts/{id}/attachments` | `getBlogpostAttachments` | Attachment | — |
| GET | `/custom-content/{id}/attachments` | `getCustomContentAttachments` | Attachment | — |
| GET | `/labels/{id}/attachments` | `getLabelAttachments` | Attachment | — |

### Deprecated in spec

_(none)_
