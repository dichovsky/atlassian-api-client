# Audit — Label

Auto-generated. Do not edit by hand. Regenerate with `npm run audit:spec`.

Target backlog item(s): **B040**

Spec tag: `Label` | Spec snapshot: `spec/confluence-v2.openapi.json`

## Operations matrix

**Implemented:** 3 / 7

### Matched

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/blogposts/{id}/labels` | `getBlogPostLabels` | Label | `labels` (src/confluence/resources/labels.ts) |
| GET | `/pages/{id}/labels` | `getPageLabels` | Label | `labels` (src/confluence/resources/labels.ts) |
| GET | `/spaces/{id}/labels` | `getSpaceLabels` | Label | `labels` (src/confluence/resources/labels.ts) |

### Missing in code

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/attachments/{id}/labels` | `getAttachmentLabels` | Label | — |
| GET | `/custom-content/{id}/labels` | `getCustomContentLabels` | Label | — |
| GET | `/labels` | `getLabels` | Label | — |
| GET | `/spaces/{id}/content/labels` | `getSpaceContentLabels` | Label | — |

### Deprecated in spec

_(none)_
