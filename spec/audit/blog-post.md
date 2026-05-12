# Audit — Blog Post

Auto-generated. Do not edit by hand. Regenerate with `npm run audit:spec`.

Target backlog item(s): **B026, B036**

Spec tag: `Blog Post` | Spec snapshot: `spec/confluence-v2.openapi.json`

## Operations matrix

**Implemented:** 5 / 7

### Matched

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/blogposts` | `getBlogPosts` | Blog Post | `blog-posts` (src/confluence/resources/blog-posts.ts) |
| POST | `/blogposts` | `createBlogPost` | Blog Post | `blog-posts` (src/confluence/resources/blog-posts.ts) |
| DELETE | `/blogposts/{id}` | `deleteBlogPost` | Blog Post | `blog-posts` (src/confluence/resources/blog-posts.ts) |
| GET | `/blogposts/{id}` | `getBlogPostById` | Blog Post | `blog-posts` (src/confluence/resources/blog-posts.ts) |
| PUT | `/blogposts/{id}` | `updateBlogPost` | Blog Post | `blog-posts` (src/confluence/resources/blog-posts.ts) |

### Missing in code

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/labels/{id}/blogposts` | `getLabelBlogPosts` | Blog Post | — |
| GET | `/spaces/{id}/blogposts` | `getBlogPostsInSpace` | Blog Post | — |

### Deprecated in spec

_(none)_
