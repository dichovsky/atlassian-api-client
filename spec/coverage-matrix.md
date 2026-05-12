# Confluence v2 — Coverage Matrix

Auto-generated. Do not edit by hand. Regenerate with `npm run audit:spec`.

Spec snapshot: `spec/confluence-v2.openapi.json` (213 operations, 29 tags).

**Implemented:** 48 / 213 (22.5%)

## Matched (implemented)

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| DELETE | `/attachments/{id}` | `deleteAttachment` | Attachment | `attachments` (src/confluence/resources/attachments.ts) |
| GET | `/attachments/{id}` | `getAttachmentById` | Attachment | `attachments` (src/confluence/resources/attachments.ts) |
| GET | `/blogposts` | `getBlogPosts` | Blog Post | `blog-posts` (src/confluence/resources/blog-posts.ts) |
| POST | `/blogposts` | `createBlogPost` | Blog Post | `blog-posts` (src/confluence/resources/blog-posts.ts) |
| DELETE | `/blogposts/{id}` | `deleteBlogPost` | Blog Post | `blog-posts` (src/confluence/resources/blog-posts.ts) |
| GET | `/blogposts/{id}` | `getBlogPostById` | Blog Post | `blog-posts` (src/confluence/resources/blog-posts.ts) |
| PUT | `/blogposts/{id}` | `updateBlogPost` | Blog Post | `blog-posts` (src/confluence/resources/blog-posts.ts) |
| GET | `/blogposts/{id}/labels` | `getBlogPostLabels` | Label | `labels` (src/confluence/resources/labels.ts) |
| GET | `/blogposts/{id}/versions` | `getBlogPostVersions` | Version | `versions` (src/confluence/resources/versions.ts) |
| GET | `/blogposts/{blogpost-id}/versions/{version-number}` | `getBlogPostVersionDetails` | Version | `versions` (src/confluence/resources/versions.ts) |
| GET | `/custom-content` | `getCustomContentByType` | Custom Content | `custom-content` (src/confluence/resources/custom-content.ts) |
| POST | `/custom-content` | `createCustomContent` | Custom Content | `custom-content` (src/confluence/resources/custom-content.ts) |
| DELETE | `/custom-content/{id}` | `deleteCustomContent` | Custom Content | `custom-content` (src/confluence/resources/custom-content.ts) |
| GET | `/custom-content/{id}` | `getCustomContentById` | Custom Content | `custom-content` (src/confluence/resources/custom-content.ts) |
| PUT | `/custom-content/{id}` | `updateCustomContent` | Custom Content | `custom-content` (src/confluence/resources/custom-content.ts) |
| POST | `/footer-comments` | `createFooterComment` | Comment | `comments` (src/confluence/resources/comments.ts) |
| DELETE | `/footer-comments/{comment-id}` | `deleteFooterComment` | Comment | `comments` (src/confluence/resources/comments.ts) |
| GET | `/footer-comments/{comment-id}` | `getFooterCommentById` | Comment | `comments` (src/confluence/resources/comments.ts) |
| PUT | `/footer-comments/{comment-id}` | `updateFooterComment` | Comment | `comments` (src/confluence/resources/comments.ts) |
| POST | `/inline-comments` | `createInlineComment` | Comment | `comments` (src/confluence/resources/comments.ts) |
| DELETE | `/inline-comments/{comment-id}` | `deleteInlineComment` | Comment | `comments` (src/confluence/resources/comments.ts) |
| GET | `/inline-comments/{comment-id}` | `getInlineCommentById` | Comment | `comments` (src/confluence/resources/comments.ts) |
| PUT | `/inline-comments/{comment-id}` | `updateInlineComment` | Comment | `comments` (src/confluence/resources/comments.ts) |
| GET | `/pages` | `getPages` | Page | `pages` (src/confluence/resources/pages.ts) |
| POST | `/pages` | `createPage` | Page | `pages` (src/confluence/resources/pages.ts) |
| DELETE | `/pages/{id}` | `deletePage` | Page | `pages` (src/confluence/resources/pages.ts) |
| GET | `/pages/{id}` | `getPageById` | Page | `pages` (src/confluence/resources/pages.ts) |
| PUT | `/pages/{id}` | `updatePage` | Page | `pages` (src/confluence/resources/pages.ts) |
| GET | `/pages/{id}/attachments` | `getPageAttachments` | Attachment | `attachments` (src/confluence/resources/attachments.ts) |
| GET | `/pages/{id}/footer-comments` | `getPageFooterComments` | Comment | `comments` (src/confluence/resources/comments.ts) |
| GET | `/pages/{id}/inline-comments` | `getPageInlineComments` | Comment | `comments` (src/confluence/resources/comments.ts) |
| GET | `/pages/{id}/labels` | `getPageLabels` | Label | `labels` (src/confluence/resources/labels.ts) |
| GET | `/pages/{page-id}/properties` | `getPageContentProperties` | Content Properties | `content-properties` (src/confluence/resources/content-properties.ts) |
| POST | `/pages/{page-id}/properties` | `createPageProperty` | Content Properties | `content-properties` (src/confluence/resources/content-properties.ts) |
| DELETE | `/pages/{page-id}/properties/{property-id}` | `deletePagePropertyById` | Content Properties | `content-properties` (src/confluence/resources/content-properties.ts) |
| GET | `/pages/{page-id}/properties/{property-id}` | `getPageContentPropertiesById` | Content Properties | `content-properties` (src/confluence/resources/content-properties.ts) |
| PUT | `/pages/{page-id}/properties/{property-id}` | `updatePagePropertyById` | Content Properties | `content-properties` (src/confluence/resources/content-properties.ts) |
| GET | `/pages/{id}/versions` | `getPageVersions` | Version | `versions` (src/confluence/resources/versions.ts) |
| GET | `/pages/{page-id}/versions/{version-number}` | `getPageVersionDetails` | Version | `versions` (src/confluence/resources/versions.ts) |
| GET | `/spaces` | `getSpaces` | Space | `spaces` (src/confluence/resources/spaces.ts) |
| GET | `/spaces/{id}` | `getSpaceById` | Space | `spaces` (src/confluence/resources/spaces.ts) |
| GET | `/spaces/{id}/labels` | `getSpaceLabels` | Label | `labels` (src/confluence/resources/labels.ts) |
| GET | `/tasks` | `getTasks` | Task | `tasks` (src/confluence/resources/tasks.ts) |
| GET | `/tasks/{id}` | `getTaskById` | Task | `tasks` (src/confluence/resources/tasks.ts) |
| PUT | `/tasks/{id}` | `updateTask` | Task | `tasks` (src/confluence/resources/tasks.ts) |
| POST | `/whiteboards` | `createWhiteboard` | Whiteboard | `whiteboards` (src/confluence/resources/whiteboards.ts) |
| DELETE | `/whiteboards/{id}` | `deleteWhiteboard` | Whiteboard | `whiteboards` (src/confluence/resources/whiteboards.ts) |
| GET | `/whiteboards/{id}` | `getWhiteboardById` | Whiteboard | `whiteboards` (src/confluence/resources/whiteboards.ts) |

## Missing in code

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| DELETE | `/admin-key` | `disableAdminKey` | Admin Key | — |
| GET | `/admin-key` | `getAdminKey` | Admin Key | — |
| POST | `/admin-key` | `enableAdminKey` | Admin Key | — |
| GET | `/app/properties` | `getForgeAppProperties` | App Properties | — |
| DELETE | `/app/properties/{propertyKey}` | `deleteForgeAppProperty` | App Properties | — |
| GET | `/app/properties/{propertyKey}` | `getForgeAppProperty` | App Properties | — |
| PUT | `/app/properties/{propertyKey}` | `putForgeAppProperty` | App Properties | — |
| GET | `/attachments` | `getAttachments` | Attachment | — |
| GET | `/attachments/{id}/footer-comments` | `getAttachmentComments` | Comment | — |
| GET | `/attachments/{id}/labels` | `getAttachmentLabels` | Label | — |
| GET | `/attachments/{id}/operations` | `getAttachmentOperations` | Operation | — |
| GET | `/attachments/{attachment-id}/properties` | `getAttachmentContentProperties` | Content Properties | — |
| POST | `/attachments/{attachment-id}/properties` | `createAttachmentProperty` | Content Properties | — |
| DELETE | `/attachments/{attachment-id}/properties/{property-id}` | `deleteAttachmentPropertyById` | Content Properties | — |
| GET | `/attachments/{attachment-id}/properties/{property-id}` | `getAttachmentContentPropertiesById` | Content Properties | — |
| PUT | `/attachments/{attachment-id}/properties/{property-id}` | `updateAttachmentPropertyById` | Content Properties | — |
| GET | `/attachments/{id}/thumbnail/download` | `getAttachmentThumbnailById` | Attachment | — |
| GET | `/attachments/{id}/versions` | `getAttachmentVersions` | Version | — |
| GET | `/attachments/{attachment-id}/versions/{version-number}` | `getAttachmentVersionDetails` | Version | — |
| GET | `/blogposts/{id}/attachments` | `getBlogpostAttachments` | Attachment | — |
| GET | `/blogposts/{id}/classification-level` | `getBlogPostClassificationLevel` | Classification Level | — |
| PUT | `/blogposts/{id}/classification-level` | `putBlogPostClassificationLevel` | Classification Level | — |
| POST | `/blogposts/{id}/classification-level/reset` | `postBlogPostClassificationLevel` | Classification Level | — |
| GET | `/blogposts/{id}/custom-content` | `getCustomContentByTypeInBlogPost` | Custom Content | — |
| GET | `/blogposts/{id}/footer-comments` | `getBlogPostFooterComments` | Comment | — |
| GET | `/blogposts/{id}/inline-comments` | `getBlogPostInlineComments` | Comment | — |
| GET | `/blogposts/{id}/likes/count` | `getBlogPostLikeCount` | Like | — |
| GET | `/blogposts/{id}/likes/users` | `getBlogPostLikeUsers` | Like | — |
| GET | `/blogposts/{id}/operations` | `getBlogPostOperations` | Operation | — |
| GET | `/blogposts/{blogpost-id}/properties` | `getBlogpostContentProperties` | Content Properties | — |
| POST | `/blogposts/{blogpost-id}/properties` | `createBlogpostProperty` | Content Properties | — |
| DELETE | `/blogposts/{blogpost-id}/properties/{property-id}` | `deleteBlogpostPropertyById` | Content Properties | — |
| GET | `/blogposts/{blogpost-id}/properties/{property-id}` | `getBlogpostContentPropertiesById` | Content Properties | — |
| PUT | `/blogposts/{blogpost-id}/properties/{property-id}` | `updateBlogpostPropertyById` | Content Properties | — |
| POST | `/blogposts/{id}/redact` | `postRedactBlog` | Redactions | — |
| GET | `/classification-levels` | `getClassificationLevels` | Classification Level | — |
| GET | `/comments/{comment-id}/properties` | `getCommentContentProperties` | Content Properties | — |
| POST | `/comments/{comment-id}/properties` | `createCommentProperty` | Content Properties | — |
| DELETE | `/comments/{comment-id}/properties/{property-id}` | `deleteCommentPropertyById` | Content Properties | — |
| GET | `/comments/{comment-id}/properties/{property-id}` | `getCommentContentPropertiesById` | Content Properties | — |
| PUT | `/comments/{comment-id}/properties/{property-id}` | `updateCommentPropertyById` | Content Properties | — |
| POST | `/content/convert-ids-to-types` | `convertContentIdsToContentTypes` | Content | — |
| GET | `/custom-content/{id}/attachments` | `getCustomContentAttachments` | Attachment | — |
| GET | `/custom-content/{id}/children` | `getChildCustomContent` | Children | — |
| GET | `/custom-content/{id}/footer-comments` | `getCustomContentComments` | Comment | — |
| GET | `/custom-content/{id}/labels` | `getCustomContentLabels` | Label | — |
| GET | `/custom-content/{id}/operations` | `getCustomContentOperations` | Operation | — |
| GET | `/custom-content/{custom-content-id}/properties` | `getCustomContentContentProperties` | Content Properties | — |
| POST | `/custom-content/{custom-content-id}/properties` | `createCustomContentProperty` | Content Properties | — |
| DELETE | `/custom-content/{custom-content-id}/properties/{property-id}` | `deleteCustomContentPropertyById` | Content Properties | — |
| GET | `/custom-content/{custom-content-id}/properties/{property-id}` | `getCustomContentContentPropertiesById` | Content Properties | — |
| PUT | `/custom-content/{custom-content-id}/properties/{property-id}` | `updateCustomContentPropertyById` | Content Properties | — |
| GET | `/custom-content/{custom-content-id}/versions` | `getCustomContentVersions` | Version | — |
| GET | `/custom-content/{custom-content-id}/versions/{version-number}` | `getCustomContentVersionDetails` | Version | — |
| GET | `/data-policies/metadata` | `getDataPolicyMetadata` | Data Policies | — |
| GET | `/data-policies/spaces` | `getDataPolicySpaces` | Data Policies | — |
| POST | `/databases` | `createDatabase` | Database | — |
| DELETE | `/databases/{id}` | `deleteDatabase` | Database | — |
| GET | `/databases/{id}` | `getDatabaseById` | Database | — |
| GET | `/databases/{id}/ancestors` | `getDatabaseAncestors` | Ancestors | — |
| GET | `/databases/{id}/classification-level` | `getDatabaseClassificationLevel` | Classification Level | — |
| PUT | `/databases/{id}/classification-level` | `putDatabaseClassificationLevel` | Classification Level | — |
| POST | `/databases/{id}/classification-level/reset` | `postDatabaseClassificationLevel` | Classification Level | — |
| GET | `/databases/{id}/descendants` | `getDatabaseDescendants` | Descendants | — |
| GET | `/databases/{id}/direct-children` | `getDatabaseDirectChildren` | Children | — |
| GET | `/databases/{id}/operations` | `getDatabaseOperations` | Operation | — |
| GET | `/databases/{id}/properties` | `getDatabaseContentProperties` | Content Properties | — |
| POST | `/databases/{id}/properties` | `createDatabaseProperty` | Content Properties | — |
| DELETE | `/databases/{database-id}/properties/{property-id}` | `deleteDatabasePropertyById` | Content Properties | — |
| GET | `/databases/{database-id}/properties/{property-id}` | `getDatabaseContentPropertiesById` | Content Properties | — |
| PUT | `/databases/{database-id}/properties/{property-id}` | `updateDatabasePropertyById` | Content Properties | — |
| POST | `/embeds` | `createSmartLink` | Smart Link | — |
| DELETE | `/embeds/{id}` | `deleteSmartLink` | Smart Link | — |
| GET | `/embeds/{id}` | `getSmartLinkById` | Smart Link | — |
| GET | `/embeds/{id}/ancestors` | `getSmartLinkAncestors` | Ancestors | — |
| GET | `/embeds/{id}/descendants` | `getSmartLinkDescendants` | Descendants | — |
| GET | `/embeds/{id}/direct-children` | `getSmartLinkDirectChildren` | Children | — |
| GET | `/embeds/{id}/operations` | `getSmartLinkOperations` | Operation | — |
| GET | `/embeds/{id}/properties` | `getSmartLinkContentProperties` | Content Properties | — |
| POST | `/embeds/{id}/properties` | `createSmartLinkProperty` | Content Properties | — |
| DELETE | `/embeds/{embed-id}/properties/{property-id}` | `deleteSmartLinkPropertyById` | Content Properties | — |
| GET | `/embeds/{embed-id}/properties/{property-id}` | `getSmartLinkContentPropertiesById` | Content Properties | — |
| PUT | `/embeds/{embed-id}/properties/{property-id}` | `updateSmartLinkPropertyById` | Content Properties | — |
| POST | `/folders` | `createFolder` | Folder | — |
| DELETE | `/folders/{id}` | `deleteFolder` | Folder | — |
| GET | `/folders/{id}` | `getFolderById` | Folder | — |
| GET | `/folders/{id}/ancestors` | `getFolderAncestors` | Ancestors | — |
| GET | `/folders/{id}/descendants` | `getFolderDescendants` | Descendants | — |
| GET | `/folders/{id}/direct-children` | `getFolderDirectChildren` | Children | — |
| GET | `/folders/{id}/operations` | `getFolderOperations` | Operation | — |
| GET | `/folders/{id}/properties` | `getFolderContentProperties` | Content Properties | — |
| POST | `/folders/{id}/properties` | `createFolderProperty` | Content Properties | — |
| DELETE | `/folders/{folder-id}/properties/{property-id}` | `deleteFolderPropertyById` | Content Properties | — |
| GET | `/folders/{folder-id}/properties/{property-id}` | `getFolderContentPropertiesById` | Content Properties | — |
| PUT | `/folders/{folder-id}/properties/{property-id}` | `updateFolderPropertyById` | Content Properties | — |
| GET | `/footer-comments` | `getFooterComments` | Comment | — |
| GET | `/footer-comments/{id}/children` | `getFooterCommentChildren` | Comment | — |
| GET | `/footer-comments/{id}/likes/count` | `getFooterLikeCount` | Like | — |
| GET | `/footer-comments/{id}/likes/users` | `getFooterLikeUsers` | Like | — |
| GET | `/footer-comments/{id}/operations` | `getFooterCommentOperations` | Operation | — |
| GET | `/footer-comments/{id}/versions` | `getFooterCommentVersions` | Version | — |
| GET | `/footer-comments/{id}/versions/{version-number}` | `getFooterCommentVersionDetails` | Version | — |
| GET | `/inline-comments` | `getInlineComments` | Comment | — |
| GET | `/inline-comments/{id}/children` | `getInlineCommentChildren` | Comment | — |
| GET | `/inline-comments/{id}/likes/count` | `getInlineLikeCount` | Like | — |
| GET | `/inline-comments/{id}/likes/users` | `getInlineLikeUsers` | Like | — |
| GET | `/inline-comments/{id}/operations` | `getInlineCommentOperations` | Operation | — |
| GET | `/inline-comments/{id}/versions` | `getInlineCommentVersions` | Version | — |
| GET | `/inline-comments/{id}/versions/{version-number}` | `getInlineCommentVersionDetails` | Version | — |
| GET | `/labels` | `getLabels` | Label | — |
| GET | `/labels/{id}/attachments` | `getLabelAttachments` | Attachment | — |
| GET | `/labels/{id}/blogposts` | `getLabelBlogPosts` | Blog Post | — |
| GET | `/labels/{id}/pages` | `getLabelPages` | Page | — |
| GET | `/pages/{id}/ancestors` | `getPageAncestors` | Ancestors | — |
| GET | `/pages/{id}/children` | `getChildPages` | Children | — ⚠ deprecated |
| GET | `/pages/{id}/classification-level` | `getPageClassificationLevel` | Classification Level | — |
| PUT | `/pages/{id}/classification-level` | `putPageClassificationLevel` | Classification Level | — |
| POST | `/pages/{id}/classification-level/reset` | `postPageClassificationLevel` | Classification Level | — |
| GET | `/pages/{id}/custom-content` | `getCustomContentByTypeInPage` | Custom Content | — |
| GET | `/pages/{id}/descendants` | `getPageDescendants` | Descendants | — |
| GET | `/pages/{id}/direct-children` | `getPageDirectChildren` | Children | — |
| GET | `/pages/{id}/likes/count` | `getPageLikeCount` | Like | — |
| GET | `/pages/{id}/likes/users` | `getPageLikeUsers` | Like | — |
| GET | `/pages/{id}/operations` | `getPageOperations` | Operation | — |
| POST | `/pages/{id}/redact` | `postRedactPage` | Redactions | — |
| PUT | `/pages/{id}/title` | `updatePageTitle` | Page | — |
| GET | `/space-permissions` | `getAvailableSpacePermissions` | Space Permissions | — |
| GET | `/space-role-mode` | `getSpaceRoleMode` | Space Roles | — |
| GET | `/space-roles` | `getAvailableSpaceRoles` | Space Roles | — |
| POST | `/space-roles` | `createSpaceRole` | Space Roles | — |
| DELETE | `/space-roles/{id}` | `deleteSpaceRole` | Space Roles | — |
| GET | `/space-roles/{id}` | `getSpaceRolesById` | Space Roles | — |
| PUT | `/space-roles/{id}` | `updateSpaceRole` | Space Roles | — |
| POST | `/spaces` | `createSpace` | Space | — |
| GET | `/spaces/{id}/blogposts` | `getBlogPostsInSpace` | Blog Post | — |
| DELETE | `/spaces/{id}/classification-level/default` | `deleteSpaceDefaultClassificationLevel` | Classification Level | — |
| GET | `/spaces/{id}/classification-level/default` | `getSpaceDefaultClassificationLevel` | Classification Level | — |
| PUT | `/spaces/{id}/classification-level/default` | `putSpaceDefaultClassificationLevel` | Classification Level | — |
| GET | `/spaces/{id}/content/labels` | `getSpaceContentLabels` | Label | — |
| GET | `/spaces/{id}/custom-content` | `getCustomContentByTypeInSpace` | Custom Content | — |
| GET | `/spaces/{id}/operations` | `getSpaceOperations` | Operation | — |
| GET | `/spaces/{id}/pages` | `getPagesInSpace` | Page | — |
| GET | `/spaces/{id}/permissions` | `getSpacePermissionsAssignments` | Space Permissions | — |
| GET | `/spaces/{space-id}/properties` | `getSpaceProperties` | Space Properties | — |
| POST | `/spaces/{space-id}/properties` | `createSpaceProperty` | Space Properties | — |
| DELETE | `/spaces/{space-id}/properties/{property-id}` | `deleteSpacePropertyById` | Space Properties | — |
| GET | `/spaces/{space-id}/properties/{property-id}` | `getSpacePropertyById` | Space Properties | — |
| PUT | `/spaces/{space-id}/properties/{property-id}` | `updateSpacePropertyById` | Space Properties | — |
| GET | `/spaces/{id}/role-assignments` | `getSpaceRoleAssignments` | Space Roles | — |
| POST | `/spaces/{id}/role-assignments` | `setSpaceRoleAssignments` | Space Roles | — |
| POST | `/user/access/check-access-by-email` | `checkAccessByEmail` | User | — |
| POST | `/user/access/invite-by-email` | `inviteByEmail` | User | — |
| POST | `/users-bulk` | `createBulkUserLookup` | User | — |
| GET | `/whiteboards/{id}/ancestors` | `getWhiteboardAncestors` | Ancestors | — |
| GET | `/whiteboards/{id}/classification-level` | `getWhiteboardClassificationLevel` | Classification Level | — |
| PUT | `/whiteboards/{id}/classification-level` | `putWhiteboardClassificationLevel` | Classification Level | — |
| POST | `/whiteboards/{id}/classification-level/reset` | `postWhiteboardClassificationLevel` | Classification Level | — |
| GET | `/whiteboards/{id}/descendants` | `getWhiteboardDescendants` | Descendants | — |
| GET | `/whiteboards/{id}/direct-children` | `getWhiteboardDirectChildren` | Children | — |
| GET | `/whiteboards/{id}/operations` | `getWhiteboardOperations` | Operation | — |
| GET | `/whiteboards/{id}/properties` | `getWhiteboardContentProperties` | Content Properties | — |
| POST | `/whiteboards/{id}/properties` | `createWhiteboardProperty` | Content Properties | — |
| DELETE | `/whiteboards/{whiteboard-id}/properties/{property-id}` | `deleteWhiteboardPropertyById` | Content Properties | — |
| GET | `/whiteboards/{whiteboard-id}/properties/{property-id}` | `getWhiteboardContentPropertiesById` | Content Properties | — |
| PUT | `/whiteboards/{whiteboard-id}/properties/{property-id}` | `updateWhiteboardPropertyById` | Content Properties | — |

## Extra in code (implemented but not in spec)

| Method | Path | Implementation |
| --- | --- | --- |
| POST | `/pages/{}/attachments` | `attachments` (src/confluence/resources/attachments.ts) |

## Deprecated in spec

_(none)_
