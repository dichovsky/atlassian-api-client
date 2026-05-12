# Audit — Space

Auto-generated. Do not edit by hand. Regenerate with `npm run audit:spec`.

Target backlog item(s): **B025, B037**

Spec tag: `Space` | Spec snapshot: `spec/confluence-v2.openapi.json`

## Operations matrix

**Implemented:** 2 / 3

### Matched

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| GET | `/spaces` | `getSpaces` | Space | `spaces` (src/confluence/resources/spaces.ts) |
| GET | `/spaces/{id}` | `getSpaceById` | Space | `spaces` (src/confluence/resources/spaces.ts) |

### Missing in code

| Method | Path | operationId | Tag | Implementation |
| --- | --- | --- | --- | --- |
| POST | `/spaces` | `createSpace` | Space | — |

### Deprecated in spec

_(none)_
