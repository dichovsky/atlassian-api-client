# Audit — Comment

Auto-generated. Do not edit by hand. Regenerate with `npm run audit:spec`.

Spec tag: `Comment` | Spec snapshot: `spec/confluence-v2.openapi.json`

## Operations matrix

**Implemented:** 10 / 18

### Matched

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| POST | `/footer-comments` | `createFooterComment` | Comment | `comments` (src/confluence/resources/comments.ts) |
| DELETE | `/footer-comments/{comment-id}` | `deleteFooterComment` | Comment | `comments` (src/confluence/resources/comments.ts) |
| GET | `/footer-comments/{comment-id}` | `getFooterCommentById` | Comment | `comments` (src/confluence/resources/comments.ts) |
| PUT | `/footer-comments/{comment-id}` | `updateFooterComment` | Comment | `comments` (src/confluence/resources/comments.ts) |
| POST | `/inline-comments` | `createInlineComment` | Comment | `comments` (src/confluence/resources/comments.ts) |
| DELETE | `/inline-comments/{comment-id}` | `deleteInlineComment` | Comment | `comments` (src/confluence/resources/comments.ts) |
| GET | `/inline-comments/{comment-id}` | `getInlineCommentById` | Comment | `comments` (src/confluence/resources/comments.ts) |
| PUT | `/inline-comments/{comment-id}` | `updateInlineComment` | Comment | `comments` (src/confluence/resources/comments.ts) |
| GET | `/pages/{id}/footer-comments` | `getPageFooterComments` | Comment | `comments` (src/confluence/resources/comments.ts) |
| GET | `/pages/{id}/inline-comments` | `getPageInlineComments` | Comment | `comments` (src/confluence/resources/comments.ts) |

### Missing in code

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/attachments/{id}/footer-comments` | `getAttachmentComments` | Comment | — |
| GET | `/blogposts/{id}/footer-comments` | `getBlogPostFooterComments` | Comment | — |
| GET | `/blogposts/{id}/inline-comments` | `getBlogPostInlineComments` | Comment | — |
| GET | `/custom-content/{id}/footer-comments` | `getCustomContentComments` | Comment | — |
| GET | `/footer-comments` | `getFooterComments` | Comment | — |
| GET | `/footer-comments/{id}/children` | `getFooterCommentChildren` | Comment | — |
| GET | `/inline-comments` | `getInlineComments` | Comment | — |
| GET | `/inline-comments/{id}/children` | `getInlineCommentChildren` | Comment | — |

### Deprecated in spec

_(none)_
