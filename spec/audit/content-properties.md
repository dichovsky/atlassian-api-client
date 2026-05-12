# Audit — Content Properties

Auto-generated. Do not edit by hand. Regenerate with `npm run audit:spec`.

Target backlog item(s): **B029, B044**

Spec tag: `Content Properties` | Spec snapshot: `spec/confluence-v2.openapi.json`

## Operations matrix

**Implemented:** 5 / 45

### Matched

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/pages/{page-id}/properties` | `getPageContentProperties` | Content Properties | `content-properties` (src/confluence/resources/content-properties.ts) |
| POST | `/pages/{page-id}/properties` | `createPageProperty` | Content Properties | `content-properties` (src/confluence/resources/content-properties.ts) |
| DELETE | `/pages/{page-id}/properties/{property-id}` | `deletePagePropertyById` | Content Properties | `content-properties` (src/confluence/resources/content-properties.ts) |
| GET | `/pages/{page-id}/properties/{property-id}` | `getPageContentPropertiesById` | Content Properties | `content-properties` (src/confluence/resources/content-properties.ts) |
| PUT | `/pages/{page-id}/properties/{property-id}` | `updatePagePropertyById` | Content Properties | `content-properties` (src/confluence/resources/content-properties.ts) |

### Missing in code

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/attachments/{attachment-id}/properties` | `getAttachmentContentProperties` | Content Properties | — |
| POST | `/attachments/{attachment-id}/properties` | `createAttachmentProperty` | Content Properties | — |
| DELETE | `/attachments/{attachment-id}/properties/{property-id}` | `deleteAttachmentPropertyById` | Content Properties | — |
| GET | `/attachments/{attachment-id}/properties/{property-id}` | `getAttachmentContentPropertiesById` | Content Properties | — |
| PUT | `/attachments/{attachment-id}/properties/{property-id}` | `updateAttachmentPropertyById` | Content Properties | — |
| GET | `/blogposts/{blogpost-id}/properties` | `getBlogpostContentProperties` | Content Properties | — |
| POST | `/blogposts/{blogpost-id}/properties` | `createBlogpostProperty` | Content Properties | — |
| DELETE | `/blogposts/{blogpost-id}/properties/{property-id}` | `deleteBlogpostPropertyById` | Content Properties | — |
| GET | `/blogposts/{blogpost-id}/properties/{property-id}` | `getBlogpostContentPropertiesById` | Content Properties | — |
| PUT | `/blogposts/{blogpost-id}/properties/{property-id}` | `updateBlogpostPropertyById` | Content Properties | — |
| GET | `/comments/{comment-id}/properties` | `getCommentContentProperties` | Content Properties | — |
| POST | `/comments/{comment-id}/properties` | `createCommentProperty` | Content Properties | — |
| DELETE | `/comments/{comment-id}/properties/{property-id}` | `deleteCommentPropertyById` | Content Properties | — |
| GET | `/comments/{comment-id}/properties/{property-id}` | `getCommentContentPropertiesById` | Content Properties | — |
| PUT | `/comments/{comment-id}/properties/{property-id}` | `updateCommentPropertyById` | Content Properties | — |
| GET | `/custom-content/{custom-content-id}/properties` | `getCustomContentContentProperties` | Content Properties | — |
| POST | `/custom-content/{custom-content-id}/properties` | `createCustomContentProperty` | Content Properties | — |
| DELETE | `/custom-content/{custom-content-id}/properties/{property-id}` | `deleteCustomContentPropertyById` | Content Properties | — |
| GET | `/custom-content/{custom-content-id}/properties/{property-id}` | `getCustomContentContentPropertiesById` | Content Properties | — |
| PUT | `/custom-content/{custom-content-id}/properties/{property-id}` | `updateCustomContentPropertyById` | Content Properties | — |
| GET | `/databases/{id}/properties` | `getDatabaseContentProperties` | Content Properties | — |
| POST | `/databases/{id}/properties` | `createDatabaseProperty` | Content Properties | — |
| DELETE | `/databases/{database-id}/properties/{property-id}` | `deleteDatabasePropertyById` | Content Properties | — |
| GET | `/databases/{database-id}/properties/{property-id}` | `getDatabaseContentPropertiesById` | Content Properties | — |
| PUT | `/databases/{database-id}/properties/{property-id}` | `updateDatabasePropertyById` | Content Properties | — |
| GET | `/embeds/{id}/properties` | `getSmartLinkContentProperties` | Content Properties | — |
| POST | `/embeds/{id}/properties` | `createSmartLinkProperty` | Content Properties | — |
| DELETE | `/embeds/{embed-id}/properties/{property-id}` | `deleteSmartLinkPropertyById` | Content Properties | — |
| GET | `/embeds/{embed-id}/properties/{property-id}` | `getSmartLinkContentPropertiesById` | Content Properties | — |
| PUT | `/embeds/{embed-id}/properties/{property-id}` | `updateSmartLinkPropertyById` | Content Properties | — |
| GET | `/folders/{id}/properties` | `getFolderContentProperties` | Content Properties | — |
| POST | `/folders/{id}/properties` | `createFolderProperty` | Content Properties | — |
| DELETE | `/folders/{folder-id}/properties/{property-id}` | `deleteFolderPropertyById` | Content Properties | — |
| GET | `/folders/{folder-id}/properties/{property-id}` | `getFolderContentPropertiesById` | Content Properties | — |
| PUT | `/folders/{folder-id}/properties/{property-id}` | `updateFolderPropertyById` | Content Properties | — |
| GET | `/whiteboards/{id}/properties` | `getWhiteboardContentProperties` | Content Properties | — |
| POST | `/whiteboards/{id}/properties` | `createWhiteboardProperty` | Content Properties | — |
| DELETE | `/whiteboards/{whiteboard-id}/properties/{property-id}` | `deleteWhiteboardPropertyById` | Content Properties | — |
| GET | `/whiteboards/{whiteboard-id}/properties/{property-id}` | `getWhiteboardContentPropertiesById` | Content Properties | — |
| PUT | `/whiteboards/{whiteboard-id}/properties/{property-id}` | `updateWhiteboardPropertyById` | Content Properties | — |

### Deprecated in spec

_(none)_
